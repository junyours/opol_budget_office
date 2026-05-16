import React, { useCallback, useEffect, useRef, useState } from 'react';
import API from '@/src/services/api';
import { toast } from 'sonner';
import { useNotificationStore } from '@/src/store/useNotificationStore';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Separator } from '@/src/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/src/components/ui/alert-dialog';
import {
  BellSlashIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline';

// ── Types ─────────────────────────────────────────────────────────────────────

type DialogMode = 'backup' | 'restore' | null;

interface DbInfo {
  os: string;
  is_windows: boolean;
  php_version: string;
  mysqldump: { found: boolean; path: string | null; env_override: string | null };
  mysql_client: { found: boolean; path: string | null; env_override: string | null };
  database: { host: string; port: string; name: string; username: string };
  hint: string;
}

// ── Environment info panel ─────────────────────────────────────────────────────

const EnvInfoPanel: React.FC = () => {
  const [info,    setInfo]    = useState<DbInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await API.get<DbInfo>('/database/info');
      setInfo(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-center gap-2 text-[12px] text-gray-400">
        <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
        Detecting environment…
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center justify-between gap-2">
        <span className="text-[12px] text-red-600">Could not load environment info.</span>
        <button onClick={fetch} className="text-[11px] text-red-500 underline">Retry</button>
      </div>
    );
  }

  const allOk = info.mysqldump.found && info.mysql_client.found;

  const Row: React.FC<{ label: string; value: string | null; ok?: boolean }> = ({ label, value, ok }) => (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-[11px] text-gray-500 flex-shrink-0 w-28">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        {ok !== undefined && (
          ok
            ? <CheckCircleIcon className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            : <XCircleIcon     className="w-3.5 h-3.5 text-red-500  flex-shrink-0" />
        )}
        <span className={`text-[11px] font-mono truncate ${ok === false ? 'text-red-500' : 'text-gray-700'}`}>
          {value ?? '—'}
        </span>
      </div>
    </div>
  );

  return (
    <div className={`rounded-xl border p-4 ${allOk ? 'border-gray-200 bg-white' : 'border-amber-200 bg-amber-50'}`}>

      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ServerStackIcon className="w-4 h-4 text-gray-400" />
          <span className="text-[12px] font-semibold text-gray-700">Detected Environment</span>
        </div>
        <button
          onClick={fetch}
          className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1"
        >
          <ArrowPathIcon className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* Rows */}
      <Row label="OS / Platform"  value={`${info.os} ${info.is_windows ? '(Windows)' : '(Unix)'}`} />
      <Row label="PHP version"    value={info.php_version} />
      <Row label="DB host"        value={`${info.database.host}:${info.database.port}`} />
      <Row label="DB name"        value={info.database.name} />
      <Row label="DB user"        value={info.database.username} />
      <Row
        label="mysqldump"
        value={info.mysqldump.env_override
          ? `${info.mysqldump.path}  (via .env)`
          : (info.mysqldump.path ?? 'Not found')}
        ok={info.mysqldump.found}
      />
      <Row
        label="mysql client"
        value={info.mysql_client.env_override
          ? `${info.mysql_client.path}  (via .env)`
          : (info.mysql_client.path ?? 'Not found')}
        ok={info.mysql_client.found}
      />

      {/* Hint */}
      {!allOk && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-100 border border-amber-200 p-2.5">
          <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 leading-snug">{info.hint}</p>
        </div>
      )}
    </div>
  );
};

// ── Password gate dialog ───────────────────────────────────────────────────────

interface PasswordDialogProps {
  mode: DialogMode;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
  busy: boolean;
}

const PasswordDialog: React.FC<PasswordDialogProps> = ({ mode, onClose, onConfirm, busy }) => {
  const [password, setPassword] = useState('');

  // Reset password when dialog opens.
  useEffect(() => { if (mode) setPassword(''); }, [mode]);

  const isBackup = mode === 'backup';

  const handleConfirm = async () => {
    if (!password.trim()) return;
    await onConfirm(password);
  };

  return (
    <AlertDialog open={mode !== null} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
        <AlertDialogHeader>

          {/* Warning banner */}
          <div className={`flex items-start gap-2 rounded-lg p-3 mb-1 text-[12px] leading-snug
            ${isBackup
              ? 'bg-amber-50 border border-amber-200 text-amber-800'
              : 'bg-red-50 border border-red-200 text-red-800'}`}>
            <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              {isBackup ? (
                <>
                  <strong>You are about to download a full database backup.</strong>{' '}
                  The file contains all system data — treat it as sensitive.
                  Store it securely and do not share it.
                </>
              ) : (
                <>
                  <strong>This will overwrite the entire current database.</strong>{' '}
                  All existing records will be replaced by the uploaded file.
                  This action <u>cannot be undone</u>. Make sure you have a fresh backup first.
                </>
              )}
            </div>
          </div>

          <AlertDialogTitle className="text-[15px] font-semibold text-gray-900 mt-2">
            {isBackup ? 'Confirm Backup Download' : 'Confirm Database Restore'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-gray-500">
            Enter your admin password to continue.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center gap-2 mt-1">
          <LockClosedIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <Input
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
            disabled={busy}
            className="h-8 text-sm"
            autoFocus
          />
        </div>

        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" size="sm" onClick={onClose} disabled={busy}
              className="h-8 text-xs border-gray-200">
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={busy || !password.trim()}
              className={`h-8 text-xs text-white ${isBackup
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-red-600 hover:bg-red-700'}`}
            >
              {busy ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                  {isBackup ? 'Preparing…' : 'Restoring…'}
                </>
              ) : (isBackup ? 'Download Backup' : 'Restore Database')}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const SystemPage: React.FC = () => {

  // ── Notifications ──────────────────────────────────────────────────────────
  const [clearing,    setClearing]    = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── Backup / restore ───────────────────────────────────────────────────────
  const [dialogMode,  setDialogMode]  = useState<DialogMode>(null);
  const [dbBusy,      setDbBusy]      = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleClearRead = async () => {
    setClearing(true);
    try {
      await API.delete('/notifications/clear-read');
      useNotificationStore.getState().fetch();
      toast.success('Read notifications cleared.');
    } catch {
      toast.error('Failed to clear read notifications.');
    } finally {
      setClearing(false);
      setConfirmOpen(false);
    }
  };

  const handleBackup = async (password: string) => {
    setDbBusy(true);
    try {
      const response = await API.post('/database/backup', { password }, { responseType: 'blob' });

      const disposition = response.headers?.['content-disposition'] ?? '';
      const match       = disposition.match(/filename="?([^";\n]+)"?/);
      const filename    = match?.[1] ?? `backup_${new Date().toISOString().slice(0, 10)}.sql.gz`;

      const url  = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url; link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success('Backup downloaded successfully.');
      setDialogMode(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Backup failed. Please try again.');
    } finally {
      setDbBusy(false);
    }
  };

  const handleRestore = async (password: string) => {
    if (!restoreFile) return;
    setDbBusy(true);

    const form = new FormData();
    form.append('password', password);
    form.append('file', restoreFile);

    try {
      await API.post('/database/restore', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Database restored successfully.');
      setDialogMode(null);
      setRestoreFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      const msg    = err?.response?.data?.message ?? 'Restore failed. Please try again.';
      const detail = err?.response?.data?.detail;
      toast.error(detail ? `${msg} — ${detail}` : msg);
    } finally {
      setDbBusy(false);
    }
  };

  const openRestoreDialog = () => {
    if (!restoreFile) {
      toast.warning('Please select a .sql or .sql.gz file first.');
      fileInputRef.current?.click();
      return;
    }
    setDialogMode('restore');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-2xl">

      {/* Page header */}
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-0.5">System</p>
      <h1 className="text-[18px] font-semibold text-gray-900 mb-1">System Management</h1>
      <p className="text-[13px] text-gray-500 mb-6">Manage system-level data and maintenance tasks.</p>

      <Separator className="mb-6" />

      {/* ── DATABASE ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Database</p>

        {/* Environment info — auto-detected */}
        <div className="mb-3">
          <EnvInfoPanel />
        </div>

        {/* Actions card */}
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">

          {/* Backup */}
          <div className="p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ArrowDownTrayIcon className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-800 leading-tight">Backup Database</p>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  Downloads a compressed <span className="font-mono text-gray-600">.sql.gz</span> snapshot.
                  Store the file in a safe, private location.
                </p>
              </div>
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => setDialogMode('backup')}
              disabled={dbBusy}
              className="flex-shrink-0 text-amber-700 border-amber-200 hover:bg-amber-50 hover:border-amber-300 text-xs h-8"
            >
              <ArrowDownTrayIcon className="w-3.5 h-3.5 mr-1.5" />
              Backup
            </Button>
          </div>

          {/* Restore */}
          <div className="p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ArrowUpTrayIcon className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-800 leading-tight">Restore Database</p>
                <p className="text-[12px] text-gray-500 mt-0.5 mb-2">
                  Overwrites the entire database with a backup file.{' '}
                  <span className="text-red-500 font-medium">All current data will be replaced.</span>
                </p>

                {/* File picker */}
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".sql,.gz"
                    onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                    id="restore-file-input"
                  />
                  <label
                    htmlFor="restore-file-input"
                    className="cursor-pointer inline-flex items-center gap-1.5 text-[11px] font-medium
                      px-2.5 py-1 rounded-md border border-gray-200 bg-gray-50 text-gray-600
                      hover:bg-gray-100 hover:border-gray-300 transition-colors"
                  >
                    Choose file
                  </label>
                  <span className="text-[11px] text-gray-400 truncate max-w-[180px]">
                    {restoreFile ? restoreFile.name : 'No file chosen (.sql or .sql.gz)'}
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="outline" size="sm"
              onClick={openRestoreDialog}
              disabled={dbBusy || !restoreFile}
              className="flex-shrink-0 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 text-xs h-8 self-start mt-0.5"
            >
              <ArrowUpTrayIcon className="w-3.5 h-3.5 mr-1.5" />
              Restore
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
          <LockClosedIcon className="w-3 h-3" />
          Admin password required for backup and restore.
        </p>
      </div>

      <Separator className="mb-6" />

      {/* ── NOTIFICATIONS ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Notifications</p>

        <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <BellSlashIcon className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-800 leading-tight">Clear Read Notifications</p>
              <p className="text-[12px] text-gray-500 mt-0.5">
                Permanently deletes all read notifications across all users. This cannot be undone.
              </p>
            </div>
          </div>
          <Button
            variant="outline" size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={clearing}
            className="flex-shrink-0 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 text-xs h-8"
          >
            {clearing ? (
              <>
                <span className="w-3 h-3 border-2 border-red-300 border-t-red-600 rounded-full animate-spin mr-1.5" />
                Clearing…
              </>
            ) : 'Clear Read'}
          </Button>
        </div>
      </div>

      {/* ── Confirm clear-read dialog ─────────────────────────────────────── */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold text-gray-900">
              Clear read notifications?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              All read notifications across all users will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button size="sm" onClick={handleClearRead} disabled={clearing}
                className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white">
                {clearing ? (
                  <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Clearing…</>
                ) : 'Yes, clear all'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Password gate dialog ──────────────────────────────────────────── */}
      <PasswordDialog
        mode={dialogMode}
        onClose={() => { if (!dbBusy) setDialogMode(null); }}
        onConfirm={dialogMode === 'backup' ? handleBackup : handleRestore}
        busy={dbBusy}
      />
    </div>
  );
};

export default SystemPage;
