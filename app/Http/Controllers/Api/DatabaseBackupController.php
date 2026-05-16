<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DatabaseBackupController extends Controller
{
    // ═══════════════════════════════════════════════════════════════════════════
    // ENVIRONMENT DETECTION
    // ═══════════════════════════════════════════════════════════════════════════

    private function isWindows(): bool
    {
        return strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
    }

    /**
     * Find a binary by trying (in order):
     *  1. Explicit .env override  (MYSQLDUMP_PATH / MYSQL_BIN_PATH)
     *  2. System PATH lookup      (`where` on Windows, `which` on Unix)
     *  3. Hardcoded common dirs   (XAMPP, Laragon, MySQL, MariaDB, WAMP, cPanel…)
     *
     * Returns a shell-quoted absolute path, or null if not found.
     */
    private function findBinary(string $name, ?string $envKey = null): ?string
    {
        // 1. Explicit .env override always wins.
        if ($envKey) {
            $envPath = env($envKey);
            if ($envPath && file_exists($envPath)) {
                return '"' . $envPath . '"';
            }
        }

        // 2. Ask the OS via PATH.
        $lookupCmd = $this->isWindows()
            ? 'where ' . escapeshellarg($name) . ' 2>NUL'
            : 'which ' . escapeshellarg($name) . ' 2>/dev/null';

        exec($lookupCmd, $found, $code);

        if ($code === 0 && ! empty($found[0]) && file_exists(trim($found[0]))) {
            return '"' . trim($found[0]) . '"';
        }

        // 3. Hardcoded fallback paths.
        $ext = $this->isWindows() ? '.exe' : '';
        foreach ($this->commonPaths($name . $ext) as $path) {
            if (file_exists($path)) {
                return '"' . $path . '"';
            }
        }

        return null;
    }

    private function commonPaths(string $binary): array
    {
        $sep = $this->isWindows() ? '\\' : '/';

        if ($this->isWindows()) {
            $roots = [
                'C:\\xampp\\mysql\\bin',
                'C:\\xampp8\\mysql\\bin',
                'C:\\laragon\\bin\\mysql\\mysql-8.0\\bin',
                'C:\\laragon\\bin\\mysql\\mysql-8.4\\bin',
                'C:\\laragon\\bin\\mysql\\mysql-5.7\\bin',
                'C:\\laragon\\bin\\mariadb\\mariadb-10.6\\bin',
                'C:\\laragon\\bin\\mariadb\\mariadb-10.11\\bin',
                'C:\\laragon\\bin\\mariadb\\mariadb-11.4\\bin',
                'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin',
                'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin',
                'C:\\Program Files\\MySQL\\MySQL Server 5.7\\bin',
                'C:\\Program Files\\MariaDB 10.6\\bin',
                'C:\\Program Files\\MariaDB 10.11\\bin',
                'C:\\Program Files\\MariaDB 11.4\\bin',
                'C:\\wamp64\\bin\\mysql\\mysql8.0\\bin',
                'C:\\wamp64\\bin\\mysql\\mysql8.2\\bin',
                'C:\\wamp64\\bin\\mariadb\\mariadb10.11\\bin',
            ];
        } else {
            $roots = [
                '/usr/bin',
                '/usr/local/bin',
                '/usr/local/mysql/bin',
                '/usr/local/mariadb/bin',
                '/opt/mysql/bin',
                '/opt/mariadb/bin',
                '/opt/homebrew/bin',
                '/usr/local/Cellar/mysql/bin',
                '/usr/local/cpanel/3rdparty/bin',
                '/opt/plesk/mysql/bin',
            ];
        }

        return array_map(fn($root) => $root . $sep . $binary, $roots);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BINARY GETTERS (abort with a clear message if not found)
    // ═══════════════════════════════════════════════════════════════════════════

    private function getMysqldumpBin(): string
    {
        $bin = $this->findBinary('mysqldump', 'MYSQLDUMP_PATH');
        if (! $bin) {
            abort(500, $this->isWindows()
                ? 'mysqldump not found. Add MYSQLDUMP_PATH="C:\\path\\to\\mysqldump.exe" to your .env.'
                : 'mysqldump not found. Run: apt install mysql-client  or set MYSQLDUMP_PATH in .env.');
        }
        return $bin;
    }

    private function getMysqlBin(): string
    {
        $bin = $this->findBinary('mysql', 'MYSQL_BIN_PATH');
        if (! $bin) {
            abort(500, $this->isWindows()
                ? 'mysql client not found. Add MYSQL_BIN_PATH="C:\\path\\to\\mysql.exe" to your .env.'
                : 'mysql client not found. Run: apt install mysql-client  or set MYSQL_BIN_PATH in .env.');
        }
        return $bin;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CREDENTIALS & COMMAND BUILDERS
    // ═══════════════════════════════════════════════════════════════════════════

    private function dbCreds(): array
    {
        return [
            'host'     => config('database.connections.mysql.host',     '127.0.0.1'),
            'port'     => config('database.connections.mysql.port',     '3306'),
            'database' => config('database.connections.mysql.database', 'municipal_budget_office_db'),
            'username' => config('database.connections.mysql.username', 'root'),
            'password' => config('database.connections.mysql.password', ''),
        ];
    }

    private function buildDumpCmd(): string
    {
        $bin  = $this->getMysqldumpBin();
        $c    = $this->dbCreds();
        $pass = $c['password'] !== '' ? '-p' . escapeshellarg($c['password']) : '';

        return implode(' ', array_filter([
            $bin, '--no-tablespaces',
            '-h', escapeshellarg($c['host']),
            '-P', escapeshellarg($c['port']),
            '-u', escapeshellarg($c['username']),
            $pass,
            escapeshellarg($c['database']),
        ]));
    }

    private function buildMysqlCmd(): string
    {
        $bin  = $this->getMysqlBin();
        $c    = $this->dbCreds();
        $pass = $c['password'] !== '' ? '-p' . escapeshellarg($c['password']) : '';

        return implode(' ', array_filter([
            $bin,
            '-h', escapeshellarg($c['host']),
            '-P', escapeshellarg($c['port']),
            '-u', escapeshellarg($c['username']),
            $pass,
            escapeshellarg($c['database']),
        ]));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PASSWORD GATE
    // ═══════════════════════════════════════════════════════════════════════════

    private function verifyAdminPassword(Request $request): void
    {
        $request->validate(['password' => ['required', 'string']]);

        if (! Hash::check($request->input('password'), Auth::user()->password)) {
            throw ValidationException::withMessages([
                'password' => ['The provided password is incorrect.'],
            ]);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GET /api/database/info  — diagnostic, no password required
    // ═══════════════════════════════════════════════════════════════════════════

    public function info(): \Illuminate\Http\JsonResponse
    {
        $mysqldumpBin = $this->findBinary('mysqldump', 'MYSQLDUMP_PATH');
        $mysqlBin     = $this->findBinary('mysql',     'MYSQL_BIN_PATH');
        $creds        = $this->dbCreds();

        return response()->json([
            'os'          => PHP_OS,
            'is_windows'  => $this->isWindows(),
            'php_version' => PHP_VERSION,
            'mysqldump'   => [
                'found'        => $mysqldumpBin !== null,
                'path'         => $mysqldumpBin ? trim($mysqldumpBin, '"') : null,
                'env_override' => env('MYSQLDUMP_PATH') ?: null,
            ],
            'mysql_client' => [
                'found'        => $mysqlBin !== null,
                'path'         => $mysqlBin ? trim($mysqlBin, '"') : null,
                'env_override' => env('MYSQL_BIN_PATH') ?: null,
            ],
            'database' => [
                'host'     => $creds['host'],
                'port'     => $creds['port'],
                'name'     => $creds['database'],
                'username' => $creds['username'],
                // password intentionally omitted
            ],
            'hint' => ($mysqldumpBin && $mysqlBin)
                ? 'All binaries detected. Ready for backup and restore.'
                : ($this->isWindows()
                    ? 'Binary not found. Add MYSQLDUMP_PATH / MYSQL_BIN_PATH to your .env.'
                    : 'Binary not found. Run: apt install mysql-client  or set paths in .env.'),
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // POST /api/database/backup
    //
    // Strategy (cross-platform):
    //   1. Run mysqldump and pipe stdout into a gzip temp file on disk.
    //      (gzopen('php://output') is NOT seekable on Windows — this avoids it.)
    //   2. Stream the temp file to the browser in 64 KB chunks.
    //   3. Delete the temp file.
    // ═══════════════════════════════════════════════════════════════════════════

    public function backup(Request $request): StreamedResponse
    {
        $this->verifyAdminPassword($request);

        $dbName  = config('database.connections.mysql.database', 'municipal_budget_office_db');
        $tmpFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . uniqid('db_backup_', true) . '.sql.gz';
        $dumpCmd = $this->buildDumpCmd();

        // ── Step 1: dump → gzip temp file ────────────────────────────────────

        $proc = popen($dumpCmd . ' 2>&1', 'r');
        if ($proc === false) {
            abort(500, 'Could not execute mysqldump.');
        }

        $gz = gzopen($tmpFile, 'wb9');
        if ($gz === false) {
            pclose($proc);
            abort(500, 'Could not create temporary backup file in: ' . sys_get_temp_dir());
        }

        $firstChunk    = true;
        $errorDetected = false;
        $errorMsg      = '';

        while (! feof($proc)) {
            $chunk = fread($proc, 65536);
            if ($chunk === false || $chunk === '') continue;

            // mysqldump errors appear on stdout (captured via 2>&1).
            // Detect them in the very first chunk before writing anything useful.
            if ($firstChunk) {
                $firstChunk = false;
                if (
                    str_contains($chunk, 'ERROR') ||
                    str_contains($chunk, 'Access denied') ||
                    str_contains($chunk, 'Unknown database')
                ) {
                    $errorDetected = true;
                    $errorMsg      = trim($chunk);
                    break;
                }
            }

            gzwrite($gz, $chunk);
        }

        pclose($proc);
        gzclose($gz);

        if ($errorDetected) {
            @unlink($tmpFile);
            abort(500, 'mysqldump error: ' . $errorMsg);
        }

        if (! file_exists($tmpFile) || filesize($tmpFile) === 0) {
            @unlink($tmpFile);
            abort(500, 'Backup file is empty — mysqldump may have failed silently.');
        }

        // ── Step 2: stream temp file → browser, then delete ──────────────────

        $filename = $dbName . '_' . now()->format('Y-m-d_His') . '.sql.gz';
        $fileSize = filesize($tmpFile);

        return response()->stream(function () use ($tmpFile) {
            $fh = fopen($tmpFile, 'rb');
            if ($fh) {
                while (! feof($fh)) {
                    echo fread($fh, 65536);
                    flush();
                }
                fclose($fh);
            }
            @unlink($tmpFile); // clean up after streaming
        }, 200, [
            'Content-Type'           => 'application/gzip',
            'Content-Disposition'    => "attachment; filename=\"{$filename}\"",
            'Content-Length'         => $fileSize,
            'Cache-Control'          => 'no-store, no-cache',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // POST /api/database/restore
    //
    // Accepts .sql or .sql.gz.
    // On Windows: decompresses .gz via PHP gzip functions (no zcat).
    // On Linux:   pipes through zcat (no temp file for plain .sql.gz).
    // ═══════════════════════════════════════════════════════════════════════════

    public function restore(Request $request): \Illuminate\Http\JsonResponse
    {
        $this->verifyAdminPassword($request);

        $request->validate([
            'file' => ['required', 'file', 'max:204800'], // 200 MB cap
        ]);

        $file     = $request->file('file');
        $origName = $file->getClientOriginalName();
        $isGzip   = str_ends_with(strtolower($origName), '.gz');
        $tmpPath  = $file->getRealPath();
        $mysqlCmd = $this->buildMysqlCmd();

        $output   = [];
        $exitCode = 0;

        if ($isGzip) {
            if ($this->isWindows()) {
                // Decompress to a temp .sql file, import, then delete.
                $decompressed = sys_get_temp_dir() . DIRECTORY_SEPARATOR . uniqid('restore_', true) . '.sql';

                $gz  = gzopen($tmpPath, 'rb');
                $out = fopen($decompressed, 'wb');

                if (! $gz || ! $out) {
                    return response()->json(['message' => 'Could not decompress the backup file.'], 500);
                }

                while (! gzeof($gz)) {
                    fwrite($out, gzread($gz, 65536));
                }

                gzclose($gz);
                fclose($out);

                exec($mysqlCmd . ' < ' . escapeshellarg($decompressed) . ' 2>&1', $output, $exitCode);
                @unlink($decompressed);

            } else {
                exec('zcat ' . escapeshellarg($tmpPath) . ' | ' . $mysqlCmd . ' 2>&1', $output, $exitCode);
            }
        } else {
            exec($mysqlCmd . ' < ' . escapeshellarg($tmpPath) . ' 2>&1', $output, $exitCode);
        }

        if ($exitCode !== 0) {
            return response()->json([
                'message' => 'Restore failed. MySQL returned an error.',
                'detail'  => implode("\n", array_slice($output, 0, 5)),
            ], 500);
        }

        return response()->json([
            'message' => "Database restored successfully from {$origName}.",
        ]);
    }
}
