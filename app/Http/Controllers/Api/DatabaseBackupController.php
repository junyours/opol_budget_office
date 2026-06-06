<?php

// namespace App\Http\Controllers\Api;

// use App\Http\Controllers\Controller;
// use Illuminate\Http\Request;
// use Illuminate\Support\Facades\Hash;
// use Illuminate\Support\Facades\Auth;
// use Illuminate\Validation\ValidationException;
// use Symfony\Component\HttpFoundation\StreamedResponse;

// class DatabaseBackupController extends Controller
// {
//     // ═══════════════════════════════════════════════════════════════════════════
//     // ENVIRONMENT DETECTION
//     // ═══════════════════════════════════════════════════════════════════════════

//     private function isWindows(): bool
//     {
//         return strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
//     }

//     /**
//      * Find a binary by trying (in order):
//      *  1. Explicit .env override  (MYSQLDUMP_PATH / MYSQL_BIN_PATH)
//      *  2. System PATH lookup      (`where` on Windows, `which` on Unix)
//      *  3. Hardcoded common dirs   (XAMPP, Laragon, MySQL, MariaDB, WAMP, cPanel…)
//      *
//      * Returns a shell-quoted absolute path, or null if not found.
//      */
//     private function findBinary(string $name, ?string $envKey = null): ?string
//     {
//         // 1. Explicit .env override always wins.
//         if ($envKey) {
//             $envPath = env($envKey);
//             if ($envPath && file_exists($envPath)) {
//                 return '"' . $envPath . '"';
//             }
//         }

//         // 2. Ask the OS via PATH.
//         $lookupCmd = $this->isWindows()
//             ? 'where ' . escapeshellarg($name) . ' 2>NUL'
//             : 'which ' . escapeshellarg($name) . ' 2>/dev/null';

//         exec($lookupCmd, $found, $code);

//         if ($code === 0 && ! empty($found[0]) && file_exists(trim($found[0]))) {
//             return '"' . trim($found[0]) . '"';
//         }

//         // 3. Hardcoded fallback paths.
//         $ext = $this->isWindows() ? '.exe' : '';
//         foreach ($this->commonPaths($name . $ext) as $path) {
//             if (file_exists($path)) {
//                 return '"' . $path . '"';
//             }
//         }

//         return null;
//     }

//     private function commonPaths(string $binary): array
//     {
//         $sep = $this->isWindows() ? '\\' : '/';

//         if ($this->isWindows()) {
//             $roots = [
//                 'C:\\xampp\\mysql\\bin',
//                 'C:\\xampp8\\mysql\\bin',
//                 'C:\\laragon\\bin\\mysql\\mysql-8.0\\bin',
//                 'C:\\laragon\\bin\\mysql\\mysql-8.4\\bin',
//                 'C:\\laragon\\bin\\mysql\\mysql-5.7\\bin',
//                 'C:\\laragon\\bin\\mariadb\\mariadb-10.6\\bin',
//                 'C:\\laragon\\bin\\mariadb\\mariadb-10.11\\bin',
//                 'C:\\laragon\\bin\\mariadb\\mariadb-11.4\\bin',
//                 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin',
//                 'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin',
//                 'C:\\Program Files\\MySQL\\MySQL Server 5.7\\bin',
//                 'C:\\Program Files\\MariaDB 10.6\\bin',
//                 'C:\\Program Files\\MariaDB 10.11\\bin',
//                 'C:\\Program Files\\MariaDB 11.4\\bin',
//                 'C:\\wamp64\\bin\\mysql\\mysql8.0\\bin',
//                 'C:\\wamp64\\bin\\mysql\\mysql8.2\\bin',
//                 'C:\\wamp64\\bin\\mariadb\\mariadb10.11\\bin',
//             ];
//         } else {
//             $roots = [
//                 '/usr/bin',
//                 '/usr/local/bin',
//                 '/usr/local/mysql/bin',
//                 '/usr/local/mariadb/bin',
//                 '/opt/mysql/bin',
//                 '/opt/mariadb/bin',
//                 '/opt/homebrew/bin',
//                 '/usr/local/Cellar/mysql/bin',
//                 '/usr/local/cpanel/3rdparty/bin',
//                 '/opt/plesk/mysql/bin',
//             ];
//         }

//         return array_map(fn($root) => $root . $sep . $binary, $roots);
//     }

//     // ═══════════════════════════════════════════════════════════════════════════
//     // BINARY GETTERS (abort with a clear message if not found)
//     // ═══════════════════════════════════════════════════════════════════════════

//     private function getMysqldumpBin(): string
//     {
//         $bin = $this->findBinary('mysqldump', 'MYSQLDUMP_PATH');
//         if (! $bin) {
//             abort(500, $this->isWindows()
//                 ? 'mysqldump not found. Add MYSQLDUMP_PATH="C:\\path\\to\\mysqldump.exe" to your .env.'
//                 : 'mysqldump not found. Run: apt install mysql-client  or set MYSQLDUMP_PATH in .env.');
//         }
//         return $bin;
//     }

//     private function getMysqlBin(): string
//     {
//         $bin = $this->findBinary('mysql', 'MYSQL_BIN_PATH');
//         if (! $bin) {
//             abort(500, $this->isWindows()
//                 ? 'mysql client not found. Add MYSQL_BIN_PATH="C:\\path\\to\\mysql.exe" to your .env.'
//                 : 'mysql client not found. Run: apt install mysql-client  or set MYSQL_BIN_PATH in .env.');
//         }
//         return $bin;
//     }

//     // ═══════════════════════════════════════════════════════════════════════════
//     // CREDENTIALS & COMMAND BUILDERS
//     // ═══════════════════════════════════════════════════════════════════════════

//     private function dbCreds(): array
//     {
//         return [
//             'host'     => config('database.connections.mysql.host',     '127.0.0.1'),
//             'port'     => config('database.connections.mysql.port',     '3306'),
//             'database' => config('database.connections.mysql.database', 'municipal_budget_office_db'),
//             'username' => config('database.connections.mysql.username', 'root'),
//             'password' => config('database.connections.mysql.password', ''),
//         ];
//     }

//     private function buildDumpCmd(): string
//     {
//         $bin  = $this->getMysqldumpBin();
//         $c    = $this->dbCreds();
//         $pass = $c['password'] !== '' ? '-p' . escapeshellarg($c['password']) : '';

//         return implode(' ', array_filter([
//             $bin, '--no-tablespaces',
//             '-h', escapeshellarg($c['host']),
//             '-P', escapeshellarg($c['port']),
//             '-u', escapeshellarg($c['username']),
//             $pass,
//             escapeshellarg($c['database']),
//         ]));
//     }

//     private function buildMysqlCmd(): string
//     {
//         $bin  = $this->getMysqlBin();
//         $c    = $this->dbCreds();
//         $pass = $c['password'] !== '' ? '-p' . escapeshellarg($c['password']) : '';

//         return implode(' ', array_filter([
//             $bin,
//             '-h', escapeshellarg($c['host']),
//             '-P', escapeshellarg($c['port']),
//             '-u', escapeshellarg($c['username']),
//             $pass,
//             escapeshellarg($c['database']),
//         ]));
//     }

//     // ═══════════════════════════════════════════════════════════════════════════
//     // PASSWORD GATE
//     // ═══════════════════════════════════════════════════════════════════════════

//     private function verifyAdminPassword(Request $request): void
//     {
//         $request->validate(['password' => ['required', 'string']]);

//         if (! Hash::check($request->input('password'), Auth::user()->password)) {
//             throw ValidationException::withMessages([
//                 'password' => ['The provided password is incorrect.'],
//             ]);
//         }
//     }

//     // ═══════════════════════════════════════════════════════════════════════════
//     // GET /api/database/info  — diagnostic, no password required
//     // ═══════════════════════════════════════════════════════════════════════════

//     public function info(): \Illuminate\Http\JsonResponse
//     {
//         $mysqldumpBin = $this->findBinary('mysqldump', 'MYSQLDUMP_PATH');
//         $mysqlBin     = $this->findBinary('mysql',     'MYSQL_BIN_PATH');
//         $creds        = $this->dbCreds();

//         return response()->json([
//             'os'          => PHP_OS,
//             'is_windows'  => $this->isWindows(),
//             'php_version' => PHP_VERSION,
//             'mysqldump'   => [
//                 'found'        => $mysqldumpBin !== null,
//                 'path'         => $mysqldumpBin ? trim($mysqldumpBin, '"') : null,
//                 'env_override' => env('MYSQLDUMP_PATH') ?: null,
//             ],
//             'mysql_client' => [
//                 'found'        => $mysqlBin !== null,
//                 'path'         => $mysqlBin ? trim($mysqlBin, '"') : null,
//                 'env_override' => env('MYSQL_BIN_PATH') ?: null,
//             ],
//             'database' => [
//                 'host'     => $creds['host'],
//                 'port'     => $creds['port'],
//                 'name'     => $creds['database'],
//                 'username' => $creds['username'],
//                 // password intentionally omitted
//             ],
//             'hint' => ($mysqldumpBin && $mysqlBin)
//                 ? 'All binaries detected. Ready for backup and restore.'
//                 : ($this->isWindows()
//                     ? 'Binary not found. Add MYSQLDUMP_PATH / MYSQL_BIN_PATH to your .env.'
//                     : 'Binary not found. Run: apt install mysql-client  or set paths in .env.'),
//         ]);
//     }

//     // ═══════════════════════════════════════════════════════════════════════════
//     // POST /api/database/backup
//     //
//     // Strategy (cross-platform):
//     //   1. Run mysqldump and pipe stdout into a gzip temp file on disk.
//     //      (gzopen('php://output') is NOT seekable on Windows — this avoids it.)
//     //   2. Stream the temp file to the browser in 64 KB chunks.
//     //   3. Delete the temp file.
//     // ═══════════════════════════════════════════════════════════════════════════

//     public function backup(Request $request): StreamedResponse
//     {
//         $this->verifyAdminPassword($request);

//         $dbName  = config('database.connections.mysql.database', 'municipal_budget_office_db');
//         $tmpFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . uniqid('db_backup_', true) . '.sql.gz';
//         $dumpCmd = $this->buildDumpCmd();

//         // ── Step 1: dump → gzip temp file ────────────────────────────────────

//         $proc = popen($dumpCmd . ' 2>&1', 'r');
//         if ($proc === false) {
//             abort(500, 'Could not execute mysqldump.');
//         }

//         $gz = gzopen($tmpFile, 'wb9');
//         if ($gz === false) {
//             pclose($proc);
//             abort(500, 'Could not create temporary backup file in: ' . sys_get_temp_dir());
//         }

//         $firstChunk    = true;
//         $errorDetected = false;
//         $errorMsg      = '';

//         while (! feof($proc)) {
//             $chunk = fread($proc, 65536);
//             if ($chunk === false || $chunk === '') continue;

//             // mysqldump errors appear on stdout (captured via 2>&1).
//             // Detect them in the very first chunk before writing anything useful.
//             if ($firstChunk) {
//                 $firstChunk = false;
//                 if (
//                     str_contains($chunk, 'ERROR') ||
//                     str_contains($chunk, 'Access denied') ||
//                     str_contains($chunk, 'Unknown database')
//                 ) {
//                     $errorDetected = true;
//                     $errorMsg      = trim($chunk);
//                     break;
//                 }
//             }

//             gzwrite($gz, $chunk);
//         }

//         pclose($proc);
//         gzclose($gz);

//         if ($errorDetected) {
//             @unlink($tmpFile);
//             abort(500, 'mysqldump error: ' . $errorMsg);
//         }

//         if (! file_exists($tmpFile) || filesize($tmpFile) === 0) {
//             @unlink($tmpFile);
//             abort(500, 'Backup file is empty — mysqldump may have failed silently.');
//         }

//         // ── Step 2: stream temp file → browser, then delete ──────────────────

//         $filename = $dbName . '_' . now()->format('Y-m-d_His') . '.sql.gz';
//         $fileSize = filesize($tmpFile);

//         return response()->stream(function () use ($tmpFile) {
//             $fh = fopen($tmpFile, 'rb');
//             if ($fh) {
//                 while (! feof($fh)) {
//                     echo fread($fh, 65536);
//                     flush();
//                 }
//                 fclose($fh);
//             }
//             @unlink($tmpFile); // clean up after streaming
//         }, 200, [
//             'Content-Type'           => 'application/gzip',
//             'Content-Disposition'    => "attachment; filename=\"{$filename}\"",
//             'Content-Length'         => $fileSize,
//             'Cache-Control'          => 'no-store, no-cache',
//             'X-Content-Type-Options' => 'nosniff',
//         ]);
//     }

//     // ═══════════════════════════════════════════════════════════════════════════
//     // POST /api/database/restore
//     //
//     // Accepts .sql or .sql.gz.
//     // On Windows: decompresses .gz via PHP gzip functions (no zcat).
//     // On Linux:   pipes through zcat (no temp file for plain .sql.gz).
//     // ═══════════════════════════════════════════════════════════════════════════

//     public function restore(Request $request): \Illuminate\Http\JsonResponse
//     {
//         $this->verifyAdminPassword($request);

//         $request->validate([
//             'file' => ['required', 'file', 'max:204800'], // 200 MB cap
//         ]);

//         $file     = $request->file('file');
//         $origName = $file->getClientOriginalName();
//         $isGzip   = str_ends_with(strtolower($origName), '.gz');
//         $tmpPath  = $file->getRealPath();
//         $mysqlCmd = $this->buildMysqlCmd();

//         $output   = [];
//         $exitCode = 0;

//         if ($isGzip) {
//             if ($this->isWindows()) {
//                 // Decompress to a temp .sql file, import, then delete.
//                 $decompressed = sys_get_temp_dir() . DIRECTORY_SEPARATOR . uniqid('restore_', true) . '.sql';

//                 $gz  = gzopen($tmpPath, 'rb');
//                 $out = fopen($decompressed, 'wb');

//                 if (! $gz || ! $out) {
//                     return response()->json(['message' => 'Could not decompress the backup file.'], 500);
//                 }

//                 while (! gzeof($gz)) {
//                     fwrite($out, gzread($gz, 65536));
//                 }

//                 gzclose($gz);
//                 fclose($out);

//                 exec($mysqlCmd . ' < ' . escapeshellarg($decompressed) . ' 2>&1', $output, $exitCode);
//                 @unlink($decompressed);

//             } else {
//                 exec('zcat ' . escapeshellarg($tmpPath) . ' | ' . $mysqlCmd . ' 2>&1', $output, $exitCode);
//             }
//         } else {
//             exec($mysqlCmd . ' < ' . escapeshellarg($tmpPath) . ' 2>&1', $output, $exitCode);
//         }

//         if ($exitCode !== 0) {
//             return response()->json([
//                 'message' => 'Restore failed. MySQL returned an error.',
//                 'detail'  => implode("\n", array_slice($output, 0, 5)),
//             ], 500);
//         }

//         return response()->json([
//             'message' => "Database restored successfully from {$origName}.",
//         ]);
//     }
// }


namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Ifsnop\Mysqldump\Mysqldump;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DatabaseBackupController extends Controller
{
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
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    private function isWindows(): bool
    {
        return strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
    }

    private function execAvailable(): bool
    {
        if (! function_exists('exec')) return false;
        $disabled = array_map('trim', explode(',', ini_get('disable_functions')));
        return ! in_array('exec', $disabled);
    }

    private function findBinary(string $name, ?string $envKey = null): ?string
    {
        if ($envKey) {
            $envPath = env($envKey);
            if ($envPath && file_exists($envPath)) return '"' . $envPath . '"';
        }

        if (! $this->execAvailable()) return null;

        $cmd = $this->isWindows()
            ? 'where ' . escapeshellarg($name) . ' 2>NUL'
            : 'which ' . escapeshellarg($name) . ' 2>/dev/null';

        exec($cmd, $found, $code);
        if ($code === 0 && ! empty($found[0]) && file_exists(trim($found[0]))) {
            return '"' . trim($found[0]) . '"';
        }

        $ext   = $this->isWindows() ? '.exe' : '';
        $roots = $this->isWindows() ? [
            'C:\\xampp\\mysql\\bin', 'C:\\laragon\\bin\\mysql\\mysql-8.0\\bin',
            'C:\\laragon\\bin\\mysql\\mysql-8.4\\bin', 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin',
        ] : [
            '/usr/bin', '/usr/local/bin', '/usr/local/mysql/bin',
            '/opt/homebrew/bin', '/usr/local/cpanel/3rdparty/bin',
        ];

        $sep = $this->isWindows() ? '\\' : '/';
        foreach ($roots as $root) {
            $path = $root . $sep . $name . $ext;
            if (file_exists($path)) return '"' . $path . '"';
        }

        return null;
    }

    private function dbCreds(Request $request): array
    {
        $target = $request->input('target', 'local'); // 'local' | 'server'

        if ($target === 'server') {
            return [
                'host'     => $request->input('db_host'),
                'port'     => $request->input('db_port', '3306'),
                'database' => $request->input('db_name'),
                'username' => $request->input('db_user'),
                'password' => $request->input('db_password', ''),
            ];
        }

        return [
            'host'     => config('database.connections.mysql.host',     '127.0.0.1'),
            'port'     => config('database.connections.mysql.port',     '3306'),
            'database' => config('database.connections.mysql.database'),
            'username' => config('database.connections.mysql.username'),
            'password' => config('database.connections.mysql.password', ''),
        ];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GET /api/database/info
    // ═══════════════════════════════════════════════════════════════════════════

    public function info(): \Illuminate\Http\JsonResponse
    {
        $execOk       = $this->execAvailable();
        $mysqldumpBin = $execOk ? $this->findBinary('mysqldump', 'MYSQLDUMP_PATH') : null;
        $mysqlBin     = $execOk ? $this->findBinary('mysql',     'MYSQL_BIN_PATH')  : null;
        $phpDumper    = class_exists(\Ifsnop\Mysqldump\Mysqldump::class);
        $creds        = [
            'host'     => config('database.connections.mysql.host',     '127.0.0.1'),
            'port'     => config('database.connections.mysql.port',     '3306'),
            'name'     => config('database.connections.mysql.database'),
            'username' => config('database.connections.mysql.username'),
        ];

        $disabled = array_map('trim', explode(',', ini_get('disable_functions')));

        return response()->json([
            'os'                 => PHP_OS,
            'is_windows'         => $this->isWindows(),
            'php_version'        => PHP_VERSION,
            'exec_available'     => $execOk,
            'disabled_functions' => $disabled,
            'mysqldump'          => [
                'found'        => $mysqldumpBin !== null,
                'path'         => $mysqldumpBin ? trim($mysqldumpBin, '"') : null,
                'env_override' => env('MYSQLDUMP_PATH') ?: null,
            ],
            'mysql_client'  => [
                'found'        => $mysqlBin !== null,
                'path'         => $mysqlBin ? trim($mysqlBin, '"') : null,
                'env_override' => env('MYSQL_BIN_PATH') ?: null,
            ],
            'php_dumper'    => [
                'available' => $phpDumper,
                'note'      => $phpDumper
                    ? 'ifsnop/mysqldump-php is installed — pure PHP fallback available.'
                    : 'Run: composer require ifsnop/mysqldump-php',
            ],
            'database'      => $creds,
            'backup_method' => $execOk && $mysqldumpBin
                ? 'shell (mysqldump binary)'
                : ($phpDumper ? 'pure PHP (ifsnop)' : 'unavailable'),
            'hint' => $execOk && $mysqldumpBin
                ? 'Shell mysqldump detected. Shell-based backup will be used for local.'
                : ($phpDumper
                    ? 'exec() disabled or mysqldump not found — pure PHP dumper will be used.'
                    : 'No backup method available. Install ifsnop/mysqldump-php.'),
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // POST /api/database/backup
    // Auto-selects method: shell mysqldump (local) or pure PHP (server/shared hosting)
    // ═══════════════════════════════════════════════════════════════════════════

    public function backup(Request $request): StreamedResponse
    {
        $this->verifyAdminPassword($request);

        $creds   = $this->dbCreds($request);
        $target  = $request->input('target', 'local');
        $dbName  = $creds['database'];
        $tmpFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . uniqid('db_backup_', true) . '.sql.gz';
        $filename = $dbName . '_' . now()->format('Y-m-d_His') . '.sql.gz';

        // Validate server creds if target=server
        if ($target === 'server') {
            $request->validate([
                'db_host' => ['required', 'string'],
                'db_name' => ['required', 'string'],
                'db_user' => ['required', 'string'],
            ]);
        }

        // Choose method: use shell if local + exec available + binary found
        $useShell = $target === 'local'
            && $this->execAvailable()
            && $this->findBinary('mysqldump', 'MYSQLDUMP_PATH') !== null;

        if ($useShell) {
            $this->backupViaShell($creds, $tmpFile);
        } else {
            $this->backupViaPHP($creds, $tmpFile);
        }

        $fileSize = filesize($tmpFile);

        return response()->stream(function () use ($tmpFile) {
            $fh = fopen($tmpFile, 'rb');
            if ($fh) {
                while (! feof($fh)) { echo fread($fh, 65536); flush(); }
                fclose($fh);
            }
            @unlink($tmpFile);
        }, 200, [
            'Content-Type'        => 'application/gzip',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Content-Length'      => $fileSize,
            'Cache-Control'       => 'no-store, no-cache',
        ]);
    }

    private function backupViaShell(array $c, string $tmpFile): void
    {
        $bin  = $this->findBinary('mysqldump', 'MYSQLDUMP_PATH');
        $pass = $c['password'] !== '' ? '-p' . escapeshellarg($c['password']) : '';
        $cmd  = implode(' ', array_filter([
            $bin, '--no-tablespaces',
            '-h', escapeshellarg($c['host']),
            '-P', escapeshellarg($c['port']),
            '-u', escapeshellarg($c['username']),
            $pass,
            escapeshellarg($c['database']),
            '2>&1',
        ]));

        $proc = popen($cmd, 'r');
        if ($proc === false) abort(500, 'Could not execute mysqldump.');

        $gz = gzopen($tmpFile, 'wb9');
        if ($gz === false) { pclose($proc); abort(500, 'Could not create temp file.'); }

        $firstChunk = true;
        while (! feof($proc)) {
            $chunk = fread($proc, 65536);
            if (! $chunk) continue;
            if ($firstChunk) {
                $firstChunk = false;
                if (str_contains($chunk, 'ERROR') || str_contains($chunk, 'Access denied')) {
                    gzclose($gz); pclose($proc); @unlink($tmpFile);
                    abort(500, 'mysqldump error: ' . trim($chunk));
                }
            }
            gzwrite($gz, $chunk);
        }
        pclose($proc);
        gzclose($gz);

        if (! file_exists($tmpFile) || filesize($tmpFile) === 0) {
            @unlink($tmpFile);
            abort(500, 'Backup file is empty.');
        }
    }

    private function backupViaPHP(array $c, string $tmpFile): void
    {
        if (! class_exists(\Ifsnop\Mysqldump\Mysqldump::class)) {
            abort(500, 'Pure PHP backup unavailable. Run: composer require ifsnop/mysqldump-php');
        }

        try {
            $dsn  = "mysql:host={$c['host']};port={$c['port']};dbname={$c['database']};charset=utf8mb4";
            $dump = new Mysqldump($dsn, $c['username'], $c['password'], [
                'compress'           => Mysqldump::GZIP,
                'add-drop-table'     => true,
                'single-transaction' => true,
                'lock-tables'        => false,
                'default-character-set' => 'utf8mb4',
            ]);
            $dump->start($tmpFile);
        } catch (\Exception $e) {
            @unlink($tmpFile);
            abort(500, 'Backup failed: ' . $e->getMessage());
        }

        if (! file_exists($tmpFile) || filesize($tmpFile) === 0) {
            @unlink($tmpFile);
            abort(500, 'Backup file is empty.');
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // POST /api/database/restore
    // ═══════════════════════════════════════════════════════════════════════════

    public function restore(Request $request): \Illuminate\Http\JsonResponse
    {
        $this->verifyAdminPassword($request);

        $request->validate([
            'file'    => ['required', 'file', 'max:204800'],
        ]);

        $target   = $request->input('target', 'local');
        $creds    = $this->dbCreds($request);
        $file     = $request->file('file');
        $origName = $file->getClientOriginalName();
        $isGzip   = str_ends_with(strtolower($origName), '.gz');
        $tmpPath  = $file->getRealPath();

        if ($target === 'server') {
            $request->validate([
                'db_host' => ['required', 'string'],
                'db_name' => ['required', 'string'],
                'db_user' => ['required', 'string'],
            ]);
        }

        $useShell = $target === 'local'
            && $this->execAvailable()
            && $this->findBinary('mysql', 'MYSQL_BIN_PATH') !== null;

        try {
            if ($useShell) {
                $this->restoreViaShell($creds, $tmpPath, $isGzip);
            } else {
                $this->restoreViaPHP($creds, $tmpPath, $isGzip);
            }
        } catch (\Exception $e) {
            return response()->json(['message' => 'Restore failed.', 'detail' => $e->getMessage()], 500);
        }

        return response()->json(['message' => "Database restored successfully from {$origName}."]);
    }

    private function restoreViaShell(array $c, string $tmpPath, bool $isGzip): void
    {
        $bin  = $this->findBinary('mysql', 'MYSQL_BIN_PATH');
        $pass = $c['password'] !== '' ? '-p' . escapeshellarg($c['password']) : '';
        $cmd  = implode(' ', array_filter([
            $bin,
            '-h', escapeshellarg($c['host']),
            '-P', escapeshellarg($c['port']),
            '-u', escapeshellarg($c['username']),
            $pass,
            escapeshellarg($c['database']),
        ]));

        $output = []; $exitCode = 0;

        if ($isGzip) {
            if ($this->isWindows()) {
                $dec = sys_get_temp_dir() . DIRECTORY_SEPARATOR . uniqid('restore_', true) . '.sql';
                $gz  = gzopen($tmpPath, 'rb');
                $out = fopen($dec, 'wb');
                if ($gz && $out) {
                    while (! gzeof($gz)) fwrite($out, gzread($gz, 65536));
                    gzclose($gz); fclose($out);
                }
                exec($cmd . ' < ' . escapeshellarg($dec) . ' 2>&1', $output, $exitCode);
                @unlink($dec);
            } else {
                exec('zcat ' . escapeshellarg($tmpPath) . ' | ' . $cmd . ' 2>&1', $output, $exitCode);
            }
        } else {
            exec($cmd . ' < ' . escapeshellarg($tmpPath) . ' 2>&1', $output, $exitCode);
        }

        if ($exitCode !== 0) {
            throw new \Exception(implode("\n", array_slice($output, 0, 5)));
        }
    }

    private function restoreViaPHP(array $c, string $tmpPath, bool $isGzip): void
    {
        $dsn = "mysql:host={$c['host']};port={$c['port']};dbname={$c['database']};charset=utf8mb4";
        $pdo = new \PDO($dsn, $c['username'], $c['password'], [
            \PDO::ATTR_ERRMODE          => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_EMULATE_PREPARES => true,
        ]);

        $sql = $isGzip ? $this->readGzFile($tmpPath) : file_get_contents($tmpPath);
        if (! $sql || trim($sql) === '') throw new \Exception('Could not read backup file.');

        $pdo->exec('SET foreign_key_checks = 0; SET sql_mode = "";');
        foreach ($this->splitSql($sql) as $stmt) {
            if (trim($stmt) !== '') $pdo->exec($stmt);
        }
        $pdo->exec('SET foreign_key_checks = 1;');
    }

    private function readGzFile(string $path): string|false
    {
        $gz = gzopen($path, 'rb');
        if (! $gz) return false;
        $out = '';
        while (! gzeof($gz)) { $chunk = gzread($gz, 65536); if ($chunk) $out .= $chunk; }
        gzclose($gz);
        return $out;
    }

    private function splitSql(string $sql): array
    {
        $statements = []; $current = ''; $delimiter = ';';
        $inString = false; $stringChar = ''; $len = strlen($sql);

        for ($i = 0; $i < $len; $i++) {
            $char = $sql[$i];
            if (! $inString && ($char === "'" || $char === '"' || $char === '`')) {
                $inString = true; $stringChar = $char; $current .= $char; continue;
            }
            if ($inString) {
                $current .= $char;
                if ($char === '\\') { $current .= $sql[++$i] ?? ''; }
                elseif ($char === $stringChar) { $inString = false; }
                continue;
            }
            if ($char === '-' && substr($sql, $i, 2) === '--') {
                $end = strpos($sql, "\n", $i);
                $i = $end !== false ? $end : $len; continue;
            }
            if ($char === '/' && substr($sql, $i, 2) === '/*') {
                $end = strpos($sql, '*/', $i + 2);
                if ($end !== false) $i = $end + 1; continue;
            }
            $current .= $char;
            if (str_ends_with($current, $delimiter)) {
                $statements[] = substr($current, 0, -strlen($delimiter));
                $current = '';
            }
        }
        if (trim($current)) $statements[] = $current;
        return $statements;
    }
}
