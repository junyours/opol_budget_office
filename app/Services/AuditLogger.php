<?php

namespace App\Services;

use App\Models\BudgetPlan;
use App\Models\DepartmentBudgetPlan;
use App\Models\User;
use App\Models\AuditLog;
use App\Support\AuditLabeler;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Request-scoped audit recorder.
 *
 *  - Listens to EVERY Eloquent created / updated / deleted event (one wildcard listener).
 *  - Buffers entries in memory while the request runs (no DB work on the hot path).
 *  - After the response has been sent (AuditRequest::terminate) it resolves readable
 *    labels and writes everything with ONE batched INSERT.
 *  - Nothing is recorded when there is no active budget plan.
 *  - Failures here can NEVER break a request: everything is wrapped in try/catch.
 */
class AuditLogger
{
    /** Models whose events are never audited. */
    private const IGNORED_MODELS = [
        AuditLog::class,
        PersonalAccessToken::class,
        DatabaseNotification::class,
    ];

    /** Fields that are pure bookkeeping noise. (Anything ending in _at is skipped too.) */
    private const IGNORED_FIELDS = ['updated_by', 'created_by', 'remember_token', 'is_online', 'last_used_at'];

    /** Values are never stored for these — only the fact that they changed. */
    private const SENSITIVE_FIELDS = ['password', 'pin'];

    /** More than this many rows of the same model+action in ONE request → one summary row. */
    private const DETAIL_LIMIT = 8;

    /** Write requests to these paths are not "data changes" — never fall back to a generic entry. */
    private const EXCLUDED_PATHS = [
        'api/reports*', 'api/notifications*', 'api/tokens*', 'api/audit-logs*', 'api/auth/*',
    ];

    private const RESOURCES = [
        'form6'                   => 'Form 6',
        'form6-special'           => 'Form 6 (Special)',
        'ps-computation'          => 'PS Computation',
        'ps-settings'             => 'PS Settings',
        'income-fund'             => 'Income Fund',
        'mdf-funds'               => 'MDF Funds',
        'mdf-snapshots'           => 'MDF Snapshots',
        'debt-obligations'        => 'Debt Obligations',
        'gad-entries'             => 'GAD Entries',
        'ldrrmfip'                => 'LDRRMFIP',
        'plantilla-assignments'   => 'Plantilla Assignments',
        'plantilla-positions'     => 'Plantilla Positions',
        'salary-grade-steps'      => 'Salary Grade Steps',
        'department-budget-plans' => 'Department Budget Plans',
    ];

    /** @var array<string, array{class:string, action:string, verb:string, count:int, entries:array}> */
    private array $groups = [];
    /** @var array<string, int> dedupe map: repeated saves of the same record in one request */
    private array $index = [];
    /** @var array<int, array> pre-built rows (manual notes + generic fallbacks) */
    private array $rows = [];

    private bool $handled = false;
    private ?array $actor = null;
    private bool $planLoaded = false;
    private ?BudgetPlan $plan = null;

    // ═════════════════════════════════════════════════════════════════════════
    // Registration (called once from AppServiceProvider::boot)
    // ═════════════════════════════════════════════════════════════════════════

    public static function register(): void
    {
        foreach (['created', 'updated', 'deleted'] as $event) {
            Event::listen("eloquent.{$event}: *", function (string $name, array $payload) use ($event) {
                $model = $payload[0] ?? null;
                if ($model instanceof Model) {
                    app(self::class)->onModelEvent($event, $model);
                }
            });
        }

        // A Sanctum token is only ever created on login → that IS the login event.
                Event::listen('eloquent.created: ' . PersonalAccessToken::class, function ($token) {
            if ($token instanceof PersonalAccessToken) {
                app(self::class)->onTokenCreated($token);
            }
        });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Public API
    // ═════════════════════════════════════════════════════════════════════════

    /** Eloquent created / updated / deleted. */
    public function onModelEvent(string $event, Model $model): void
    {
        try {
            if (!$this->requestIsAuditable() || $this->isIgnoredModel($model)) {
                return;
            }

            $this->handled = true;

            $this->actor ??= $this->actorFromUser(request()->user());
            if (empty($this->actor['user_id'])) {
                return;
            }

            [$action, $verb] = $this->classify($event, $model);
            $changes = $this->buildChanges($event, $model);

            // Nothing meaningful changed (e.g. only timestamps / bookkeeping columns).
            if ($event === 'updated' && !$changes) {
                return;
            }

            $groupKey = get_class($model) . '|' . $action;
            $this->groups[$groupKey] ??= [
                'class'   => get_class($model),
                'action'  => $action,
                'verb'    => $verb,
                'count'   => 0,
                'entries' => [],
            ];

            // Same record saved several times in one request → merge into one entry.
            $key = $model->getKey();
            $dedupeKey = $key !== null ? $groupKey . '|' . $key : null;
            if ($event === 'updated' && $dedupeKey && isset($this->index[$dedupeKey])) {
                $i = $this->index[$dedupeKey];
                $this->groups[$groupKey]['entries'][$i]['changes'] = $this->mergeChanges(
                    $this->groups[$groupKey]['entries'][$i]['changes'],
                    $changes
                );
                return;
            }

            $this->groups[$groupKey]['count']++;

            // Keep model instances only for the first few rows; the rest are just counted.
            if (count($this->groups[$groupKey]['entries']) < self::DETAIL_LIMIT) {
                $this->groups[$groupKey]['entries'][] = ['model' => $model, 'changes' => $changes];
                if ($event === 'updated' && $dedupeKey) {
                    $this->index[$dedupeKey] = count($this->groups[$groupKey]['entries']) - 1;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Audit capture failed: ' . $e->getMessage());
        }
    }

    /** Login: a Sanctum token has just been issued. Written immediately (login route has no audit middleware). */
    public function onTokenCreated(PersonalAccessToken $token): void
    {
        try {
            if (app()->runningInConsole()) {
                return;
            }
            $user = $token->tokenable;
            if ($user instanceof User) {
                $this->recordAuth('login', $user);
            }
        } catch (\Throwable $e) {
            Log::warning('Audit login capture failed: ' . $e->getMessage());
        }
    }

    /** Login / logout — written immediately. */
    public function recordAuth(string $action, User $user): void
    {
        try {
            $plan = $this->plan();
            if (!$plan) {
                return; // no active budget plan → nothing is recorded
            }

            DB::table('audit_logs')->insert($this->baseRow($plan, $this->actorFromUser($user), [
                'action'        => $action,
                'subject_type'  => 'Session',
                'subject_id'    => (string) $user->user_id,
                'subject_label' => $user->username,
                'description'   => $action === 'login' ? 'Signed in' : 'Signed out',
            ]));
        } catch (\Throwable $e) {
            Log::warning('Audit auth record failed: ' . $e->getMessage());
        }
    }

    /** Manual entry from a controller (e.g. "logs cleared"). Flushed with the rest at end of request. */
    public function record(string $action, string $description, ?string $subjectType = null, ?string $subjectLabel = null, ?array $changes = null): void
    {
        try {
            $this->handled = true;
            $this->actor ??= $this->actorFromUser(request()->user());

            $this->rows[] = [
                'action'        => $action,
                'subject_type'  => $subjectType,
                'subject_label' => $subjectLabel,
                'description'   => $description,
                'changes'       => $changes,
            ];
        } catch (\Throwable $e) {
            Log::warning('Audit manual record failed: ' . $e->getMessage());
        }
    }

    /** Called by AuditRequest::terminate() for successful write requests. */
    public function finalize(Request $request): void
    {
        try {
            // Raw DB::table()/upsert()/mass-update() writes bypass Eloquent events.
            // If the request wrote something but no model event was seen, log the endpoint itself.
            if (!$this->handled && !$request->is(...self::EXCLUDED_PATHS)) {
                $this->addEndpointFallback($request);
            }
        } catch (\Throwable $e) {
            Log::warning('Audit fallback failed: ' . $e->getMessage());
        }

        $this->flush();
    }

    /** Failed request (4xx/5xx) or read-only request: throw away anything buffered. */
    public function discard(): void
    {
        $this->reset();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Flush
    // ═════════════════════════════════════════════════════════════════════════

    private function flush(): void
    {
        $groups = $this->groups;
        $manual = $this->rows;
        $actor  = $this->actor;
        $this->reset();

        if ((!$groups && !$manual) || empty($actor['user_id'])) {
            return;
        }

        try {
            $plan = $this->plan();
            if (!$plan) {
                return; // no active budget plan → don't record
            }

            $rows = [];

            foreach ($groups as $g) {
                $sample = $g['entries'][0]['model'] ?? null;
                if (!$sample) {
                    continue;
                }
                $type = AuditLabeler::type($sample);

                if ($g['count'] <= self::DETAIL_LIMIT) {
                    foreach ($g['entries'] as $entry) {
                        $m     = $entry['model'];
                        $label = AuditLabeler::label($m);
                        $rowPlan = $m instanceof BudgetPlan && $m->year
                            ? (object) ['budget_plan_id' => $m->getKey(), 'year' => $m->year]
                            : $plan;

                        $rows[] = $this->baseRow($rowPlan, $actor, [
                            'action'        => $g['action'],
                            'subject_type'  => $type,
                            'subject_id'    => $m->getKey() !== null ? (string) $m->getKey() : null,
                            'subject_label' => $label,
                            'description'   => "{$g['verb']} {$type}: {$label}",
                            'changes'       => $entry['changes'] ?: null,
                        ]);
                    }
                } else {
                    $names = collect($g['entries'])->take(3)
                        ->map(fn ($e) => AuditLabeler::label($e['model']))->implode(', ');
                    $more = $g['count'] - 3;

                    $rows[] = $this->baseRow($plan, $actor, [
                        'action'        => $g['action'],
                        'subject_type'  => $type,
                        'subject_label' => "{$names} +{$more} more",
                        'description'   => "{$g['verb']} {$g['count']} {$type} records",
                    ]);
                }
            }

            foreach ($manual as $row) {
                $rows[] = $this->baseRow($plan, $actor, $row);
            }

            foreach (array_chunk($rows, 200) as $chunk) {
                DB::table('audit_logs')->insert($chunk);
            }
        } catch (\Throwable $e) {
            Log::warning('Audit flush failed: ' . $e->getMessage());
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Helpers
    // ═════════════════════════════════════════════════════════════════════════

    private function requestIsAuditable(): bool
    {
        if (app()->runningInConsole()) {
            return false;
        }
        $r = request();
        return $r && !$r->isMethodSafe() && $r->user() !== null;
    }

    private function isIgnoredModel(Model $m): bool
    {
        foreach (self::IGNORED_MODELS as $class) {
            if ($m instanceof $class) {
                return true;
            }
        }
        return false;
    }

    private function plan(): ?object
    {
        if (!$this->planLoaded) {
            $this->plan = BudgetPlan::where('is_active', true)
                ->orderByDesc('year')
                ->first(['budget_plan_id', 'year']);
            $this->planLoaded = true;
        }
        return $this->plan;
    }

    private function reset(): void
    {
        $this->groups = [];
        $this->index = [];
        $this->rows = [];
        $this->handled = false;
        $this->actor = null;
        $this->planLoaded = false;
        $this->plan = null;
    }

    private function actorFromUser(?User $u): array
    {
        return [
            'user_id'   => $u?->user_id,
            'username'  => $u?->username,
            'user_name' => $u ? trim(($u->fname ?? '') . ' ' . ($u->lname ?? '')) : null,
            'user_role' => $u?->role,
        ];
    }

    private function baseRow(object $plan, array $actor, array $fields): array
    {
        $r = request();
        $changes = $fields['changes'] ?? null;

        return [
            'budget_plan_id'   => $plan->budget_plan_id,
            'budget_plan_year' => $plan->year,
            'user_id'          => $actor['user_id'] ?? null,
            'username'         => $actor['username'] ?? null,
            'user_name'        => $actor['user_name'] ?? null,
            'user_role'        => $actor['user_role'] ?? null,
            'action'           => $fields['action'],
            'subject_type'     => isset($fields['subject_type']) ? Str::limit($fields['subject_type'], 80, '') : null,
            'subject_id'       => $fields['subject_id'] ?? null,
            'subject_label'    => isset($fields['subject_label']) ? Str::limit($fields['subject_label'], 250, '…') : null,
            'description'      => Str::limit($fields['description'], 495, '…'),
            'changes'          => $changes
                ? json_encode($changes, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR)
                : null,
            'ip_address'       => $r?->ip(),
            'device'           => $this->device($r?->userAgent()),
            'created_at'       => now(),
        ];
    }

    /** [action, verb] for an Eloquent event. */
    private function classify(string $event, Model $m): array
    {
        if ($event === 'created') {
            return AuditLabeler::isAddType($m) ? ['add', 'Added'] : ['create', 'Created'];
        }
        if ($event === 'deleted') {
            return ['delete', 'Deleted'];
        }

        $changed = $m->getChanges();

        if (array_key_exists('status', $changed)) {
            if ($m instanceof DepartmentBudgetPlan) {
                return match ($changed['status']) {
                    'submitted'    => ['submitted', 'Submitted'],
                    'under_review' => ['acknowledged', 'Acknowledged'],
                    'approved'     => ['approved', 'Approved'],
                    'draft'        => ['returned_to_draft', 'Returned to draft'],
                    default        => ['status_change', 'Changed status of'],
                };
            }
            return ['status_change', 'Changed status of'];
        }

        if ($m instanceof BudgetPlan) {
            if (array_key_exists('is_active', $changed)) {
                return $m->is_active ? ['activated', 'Activated'] : ['deactivated', 'Deactivated'];
            }
            if (array_key_exists('is_open', $changed)) {
                return $m->is_open ? ['opened', 'Reopened submissions for'] : ['closed', 'Closed submissions for'];
            }
        }

        return ['update', 'Updated'];
    }

    /** @return array<int, array{field:string, old:mixed, new:mixed}> */
    private function buildChanges(string $event, Model $m): array
    {
        $out = [];

        if ($event === 'updated') {
            $original = $m->getOriginal();
            foreach ($m->getChanges() as $field => $new) {
                if ($this->skipField($field)) {
                    continue;
                }
                if (in_array($field, self::SENSITIVE_FIELDS, true)) {
                    $out[] = ['field' => AuditLabeler::field($field), 'old' => null, 'new' => '(changed)'];
                    continue;
                }
                $out[] = [
                    'field' => AuditLabeler::field($field),
                    'old'   => $this->fmt($field, $original[$field] ?? null),
                    'new'   => $this->fmt($field, $new),
                ];
            }
        } elseif ($event === 'created') {
            // Keep the initial values that matter (amounts, status…), skip ids / nulls / secrets.
            foreach ($m->getAttributes() as $field => $value) {
                if ($this->skipField($field) || in_array($field, self::SENSITIVE_FIELDS, true)
                    || $field === $m->getKeyName() || str_ends_with($field, '_id')
                    || $value === null || $value === '' || $value === 0 || $value === '0' || $value === '0.00') {
                    continue;
                }
                $out[] = ['field' => AuditLabeler::field($field), 'old' => null, 'new' => $this->fmt($field, $value)];
                if (count($out) >= 8) {
                    break;
                }
            }
        }

        return $out;
    }

    private function skipField(string $field): bool
    {
        return in_array($field, self::IGNORED_FIELDS, true) || str_ends_with($field, '_at');
    }

    private function fmt(string $field, mixed $v): mixed
    {
        if ($v === null) {
            return null;
        }
        if (is_bool($v) || str_starts_with($field, 'is_') || str_starts_with($field, 'has_')) {
            return $v ? 'Yes' : 'No';
        }
        if ($field === 'status' && is_string($v)) {
            return Str::headline($v);
        }
        if (is_numeric($v) && preg_match('/amount|total|budget|salary|rate|mooe|income|cost/i', $field)) {
            return number_format((float) $v, 2);
        }
        if (is_array($v) || is_object($v)) {
            $v = json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        return Str::limit((string) $v, 150, '…');
    }

    private function mergeChanges(array $old, array $new): array
    {
        $by = [];
        foreach ($old as $c) {
            $by[$c['field']] = $c;
        }
        foreach ($new as $c) {
            if (isset($by[$c['field']])) {
                $by[$c['field']]['new'] = $c['new'];
            } else {
                $by[$c['field']] = $c;
            }
        }
        return array_values(array_filter($by, fn ($c) => $c['old'] !== $c['new']));
    }

    private function addEndpointFallback(Request $request): void
    {
        $this->actor ??= $this->actorFromUser($request->user());

        $uri = $request->route()?->uri() ?? $request->path();
        $uri = preg_replace('#^api/#', '', $uri);
        $segments = array_values(array_filter(
            explode('/', $uri),
            fn ($s) => $s !== '' && !str_starts_with($s, '{')
        ));

        $first    = $segments[0] ?? 'record';
        $resource = self::RESOURCES[$first] ?? Str::headline($first);
        $method   = $request->method();
        $tail     = count($segments) > 1 ? Str::headline(end($segments)) : null;

        $action = match (true) {
            $method === 'DELETE'                     => 'delete',
            in_array($method, ['PUT', 'PATCH'], true) => 'update',
            $tail !== null                            => 'bulk_update',
            default                                   => 'create',
        };

        $this->rows[] = [
            'action'       => $action,
            'subject_type' => $resource,
            'description'  => 'Saved changes in ' . $resource . ($tail ? " › {$tail}" : '')
                . " ({$method} /{$uri})",
        ];
    }

    /** "Chrome · Windows" / "Safari · iOS (Mobile)" */
    private function device(?string $ua): ?string
    {
        if (!$ua) {
            return null;
        }

        $browser = 'Unknown browser';
        foreach (['Edg/' => 'Edge', 'OPR/' => 'Opera', 'Firefox/' => 'Firefox', 'Chrome/' => 'Chrome', 'Safari/' => 'Safari'] as $needle => $name) {
            if (str_contains($ua, $needle)) {
                $browser = $name;
                break;
            }
        }

        $os = match (true) {
            str_contains($ua, 'Android')                                   => 'Android',
            str_contains($ua, 'iPhone') || str_contains($ua, 'iPad')       => 'iOS',
            str_contains($ua, 'Windows')                                   => 'Windows',
            str_contains($ua, 'Mac OS X') || str_contains($ua, 'Macintosh') => 'macOS',
            str_contains($ua, 'CrOS')                                      => 'ChromeOS',
            str_contains($ua, 'Linux')                                     => 'Linux',
            default                                                        => 'Unknown OS',
        };

        $mobile = str_contains($ua, 'Mobile') || str_contains($ua, 'Android') || str_contains($ua, 'iPhone');

        return Str::limit("{$browser} · {$os}" . ($mobile ? ' (Mobile)' : ''), 145, '');
    }
}
