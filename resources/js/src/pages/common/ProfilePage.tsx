// pages/ProfilePage.tsx
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/src/components/ui/card";
import { Input }     from "@/src/components/ui/input";
import { Label }     from "@/src/components/ui/label";
import { Button }    from "@/src/components/ui/button";
import { Separator } from "@/src/components/ui/separator";
import { Badge }     from "@/src/components/ui/badge";
import { cn }        from "@/src/lib/utils";
import {
  CheckCircleIcon, XCircleIcon, CameraIcon,
  UserIcon, KeyIcon, ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import API from "@/src/services/api";

// ─── types ────────────────────────────────────────────────────────────────────

interface ProfileForm {
  fname: string;
  mname: string;
  lname: string;
  username: string;
}

interface PasswordForm {
  current_password: string;
  password: string;
  password_confirmation: string;
}

interface PasswordRule {
  label: string;
  test: (v: string) => boolean;
}

// ─── password rules ───────────────────────────────────────────────────────────

const PASSWORD_RULES: PasswordRule[] = [
  { label: "8–16 characters",        test: v => v.length >= 8 && v.length <= 16 },
  { label: "Uppercase letter (A–Z)", test: v => /[A-Z]/.test(v) },
  { label: "Lowercase letter (a–z)", test: v => /[a-z]/.test(v) },
  { label: "Number (0–9)",           test: v => /[0-9]/.test(v) },
  { label: "Symbol (!@#$%^&*…)",     test: v => /[@$!%*?&\#^()\-_=+\[\]{};:'",./<>?\\|`~]/.test(v) },
];

// ─── role display ─────────────────────────────────────────────────────────────

const roleLabel: Record<string, string> = {
  "super-admin":     "Super Admin",
  "admin":           "Budget Officer",
  "department-head": "Department Head",
  "admin-hrmo":      "HRMO",
};

const roleBadge: Record<string, string> = {
  "super-admin":     "text-violet-700 bg-violet-50 border-violet-200",
  "admin":           "text-blue-700 bg-blue-50 border-blue-200",
  "department-head": "text-emerald-700 bg-emerald-50 border-emerald-200",
  "admin-hrmo":      "text-orange-700 bg-orange-50 border-orange-200",
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function getAvatarUrl(avatar?: string | null): string | null {
  if (!avatar) return null;
  if (avatar.startsWith("http")) return avatar;
  return `/storage/${avatar}`;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  // setUser is now properly typed from AuthContext — no "as any" needed
  const { user, setUser } = useAuth();

  // ── profile form ────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<ProfileForm>({
    fname:    user?.fname    ?? "",
    mname:    user?.mname    ?? "",
    lname:    user?.lname    ?? "",
    username: user?.username ?? "",
  });

  // Baseline of what is currently saved — used to detect unsaved changes
  const [savedProfile, setSavedProfile] = useState<ProfileForm>({
    fname:    user?.fname    ?? "",
    mname:    user?.mname    ?? "",
    lname:    user?.lname    ?? "",
    username: user?.username ?? "",
  });

  const [profileErrors, setProfileErrors]   = useState<Partial<ProfileForm>>({});
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // ── password form ───────────────────────────────────────────────────────────
  const [pwForm, setPwForm]       = useState<PasswordForm>({ current_password: "", password: "", password_confirmation: "" });
  const [pwErrors, setPwErrors]   = useState<Partial<PasswordForm & { general: string }>>({});
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  // ── avatar ──────────────────────────────────────────────────────────────────
  const fileRef                           = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(getAvatarUrl(user?.avatar));
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError,   setAvatarError]   = useState<string | null>(null);

  // Sync form + avatar when AuthContext finishes fetching fresh data from DB on mount
  useEffect(() => {
    if (!user) return;
    const fresh: ProfileForm = {
      fname:    user.fname    ?? "",
      mname:    user.mname    ?? "",
      lname:    user.lname    ?? "",
      username: user.username ?? "",
    };
    setProfile(fresh);
    setSavedProfile(fresh);
    setAvatarPreview(getAvatarUrl(user.avatar));
  }, [user]);

  // ── unsaved changes detection ────────────────────────────────────────────────
  const hasUnsavedChanges =
    profile.fname    !== savedProfile.fname    ||
    profile.mname    !== savedProfile.mname    ||
    profile.lname    !== savedProfile.lname    ||
    profile.username !== savedProfile.username;

  // ── profile save ────────────────────────────────────────────────────────────
  const handleProfileSave = async () => {
    setProfileErrors({});
    setProfileSuccess(false);

    const errs: Partial<ProfileForm> = {};
    if (!profile.fname.trim())    errs.fname    = "First name is required.";
    if (!profile.lname.trim())    errs.lname    = "Last name is required.";
    if (!profile.username.trim()) errs.username = "Username is required.";
    if (Object.keys(errs).length) { setProfileErrors(errs); return; }

    setProfileLoading(true);
    try {
      const { data } = await API.put("/profile", profile);
      const updated = data.data ?? data;

      // Update context (in-memory) so sidebar/header reflect changes immediately
      setUser(updated);

      // Advance the saved baseline so the "Unsaved changes" badge disappears
      setSavedProfile({
        fname:    updated.fname    ?? "",
        mname:    updated.mname    ?? "",
        lname:    updated.lname    ?? "",
        username: updated.username ?? "",
      });

      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      const laravel = err?.response?.data?.errors ?? {};
      setProfileErrors(laravel);
    } finally {
      setProfileLoading(false);
    }
  };

  // ── password save ───────────────────────────────────────────────────────────
  const handlePasswordSave = async () => {
    setPwErrors({});
    setPwSuccess(false);

    const errs: any = {};
    if (!pwForm.current_password)      errs.current_password      = "Current password is required.";
    if (!pwForm.password)              errs.password              = "New password is required.";
    if (!pwForm.password_confirmation) errs.password_confirmation = "Please confirm your new password.";
    if (
      pwForm.password &&
      pwForm.password_confirmation &&
      pwForm.password !== pwForm.password_confirmation
    ) errs.password_confirmation = "Passwords do not match.";
    if (Object.keys(errs).length) { setPwErrors(errs); return; }

    const failedRules = PASSWORD_RULES.filter(r => !r.test(pwForm.password));
    if (failedRules.length) { setPwErrors({ general: "Password does not meet all requirements." }); return; }

    setPwLoading(true);
    try {
      await API.put("/profile/password", pwForm);
      setPwSuccess(true);
      setPwForm({ current_password: "", password: "", password_confirmation: "" });
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (err: any) {
      const laravel = err?.response?.data?.errors ?? {};
      if (err?.response?.data?.message) laravel.general = err.response.data.message;
      setPwErrors(laravel);
    } finally {
      setPwLoading(false);
    }
  };

  // ── avatar upload ───────────────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);

    const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowed.includes(file.type)) { setAvatarError("Only JPEG, PNG, or WebP images are allowed."); return; }
    if (file.size > 2 * 1024 * 1024)  { setAvatarError("Image must be under 2 MB."); return; }

    setAvatarPreview(URL.createObjectURL(file));

    const form = new FormData();
    form.append("avatar", file);

    setAvatarLoading(true);
    try {
      // No Content-Type header here — api.ts interceptor removes it for FormData
      // so axios sets multipart/form-data + boundary automatically.
      const { data } = await API.post("/profile/avatar", form);
      const newAvatar = data.data?.avatar ?? null;

      // Update in-memory user so the avatar shows immediately.
      // On next refresh, AuthContext fetches fresh data from DB — avatar persists.
      setUser((prev) => (prev ? { ...prev, avatar: newAvatar } : prev));
    } catch {
      setAvatarError("Failed to upload avatar. Please try again.");
      setAvatarPreview(getAvatarUrl(user?.avatar));
    } finally {
      setAvatarLoading(false);
      // Reset so the same file can be re-selected if needed
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const initials = `${user?.fname?.charAt(0) ?? ""}${user?.lname?.charAt(0) ?? ""}`.toUpperCase() || "U";

  return (
    <div className="w-full px-6 py-8 space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">My Profile</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your personal information and account security.</p>
      </div>

      {/* ── Avatar + identity card ───────────────────────────────────────────── */}
      <Card className="border-zinc-200 shadow-sm">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-zinc-200 bg-zinc-100 flex items-center justify-center">
                {avatarPreview
                  ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="text-2xl font-bold text-zinc-500">{initials}</span>
                }
                {avatarLoading && (
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-zinc-900 border-2 border-white flex items-center justify-center hover:bg-zinc-700 transition-colors"
                title="Change photo"
              >
                <CameraIcon className="w-3.5 h-3.5 text-white" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Identity */}
            <div className="flex flex-col items-center sm:items-start gap-1.5 text-center sm:text-left">
              <p className="text-lg font-semibold text-zinc-900">
                {[user?.fname, user?.mname, user?.lname].filter(Boolean).join(" ")}
              </p>
              <p className="text-sm text-zinc-400 font-mono">@{user?.username}</p>
              <div className="flex flex-wrap gap-2 mt-1 justify-center sm:justify-start">
                <Badge
                  variant="outline"
                  className={cn("text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5", roleBadge[user?.role ?? ""] ?? "")}
                >
                  {roleLabel[user?.role ?? ""] ?? user?.role}
                </Badge>
                {user?.department?.dept_name && (
                  <Badge variant="outline" className="text-[11px] font-normal text-zinc-500 bg-zinc-50 border-zinc-200 px-2 py-0.5 normal-case">
                    {user.department.dept_name}
                  </Badge>
                )}
              </div>
              {avatarError && <p className="text-xs text-red-500 mt-1">{avatarError}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Personal information ─────────────────────────────────────────────── */}
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-100 flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-[15px] font-semibold text-zinc-900">Personal Information</CardTitle>
              <CardDescription className="text-xs text-zinc-400 mt-0.5">
                Role and department can only be changed by an administrator.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5 space-y-4">

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* fname */}
            <div className="space-y-1.5">
              <Label htmlFor="fname" className="text-xs font-medium text-zinc-700">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fname"
                value={profile.fname}
                onChange={e => setProfile(p => ({ ...p, fname: e.target.value }))}
                className={cn("h-9 text-sm", profileErrors.fname && "border-red-400 focus-visible:ring-red-300")}
              />
              {profileErrors.fname && <p className="text-[11px] text-red-500">{profileErrors.fname}</p>}
            </div>
            {/* mname */}
            <div className="space-y-1.5">
              <Label htmlFor="mname" className="text-xs font-medium text-zinc-700">Middle Name</Label>
              <Input
                id="mname"
                value={profile.mname}
                onChange={e => setProfile(p => ({ ...p, mname: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
            {/* lname */}
            <div className="space-y-1.5">
              <Label htmlFor="lname" className="text-xs font-medium text-zinc-700">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lname"
                value={profile.lname}
                onChange={e => setProfile(p => ({ ...p, lname: e.target.value }))}
                className={cn("h-9 text-sm", profileErrors.lname && "border-red-400 focus-visible:ring-red-300")}
              />
              {profileErrors.lname && <p className="text-[11px] text-red-500">{profileErrors.lname}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-medium text-zinc-700">
                Username <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                value={profile.username}
                onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
                className={cn("h-9 text-sm font-mono", profileErrors.username && "border-red-400 focus-visible:ring-red-300")}
              />
              {profileErrors.username && <p className="text-[11px] text-red-500">{profileErrors.username}</p>}
            </div>
            {/* role — read-only */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-700">Role</Label>
              <Input
                value={roleLabel[user?.role ?? ""] ?? user?.role ?? ""}
                readOnly
                className="h-9 text-sm bg-zinc-50 text-zinc-400 cursor-not-allowed select-none"
              />
              <p className="text-[10px] text-zinc-400">Managed by administrator</p>
            </div>
          </div>

          {/* department — read-only */}
          {user?.department && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-700">Department</Label>
              <Input
                value={user.department.dept_name ?? ""}
                readOnly
                className="h-9 text-sm bg-zinc-50 text-zinc-400 cursor-not-allowed select-none"
              />
              <p className="text-[10px] text-zinc-400">Managed by administrator</p>
            </div>
          )}

          {/* Footer row */}
          <div className="flex items-center justify-end gap-3 pt-2">

            {/* Unsaved changes badge — pulses amber when edits are pending */}
            {hasUnsavedChanges && !profileLoading && (
              <Badge
                variant="outline"
                className="text-[11px] font-medium text-amber-700 bg-amber-50 border-amber-300 px-2.5 py-1 animate-pulse"
              >
                Unsaved changes
              </Badge>
            )}

            {profileSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <CheckCircleSolid className="w-4 h-4" /> Profile updated successfully
              </span>
            )}

            <Button
              onClick={handleProfileSave}
              disabled={profileLoading || !hasUnsavedChanges}
              size="sm"
              className={cn(
                "rounded-lg h-8 px-4 text-xs font-semibold transition-colors",
                hasUnsavedChanges
                  ? "bg-zinc-900 hover:bg-zinc-800 text-white"
                  : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
              )}
            >
              {profileLoading ? "Saving…" : "Save Changes"}
            </Button>
          </div>

        </CardContent>
      </Card>

      {/* ── Change password ──────────────────────────────────────────────────── */}
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-amber-100 flex items-center justify-center">
              <KeyIcon className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-[15px] font-semibold text-zinc-900">Change Password</CardTitle>
              <CardDescription className="text-xs text-zinc-400 mt-0.5">
                Your current password is required to make changes.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5 space-y-4">

          {/* Current password */}
          <div className="space-y-1.5">
            <Label htmlFor="current_password" className="text-xs font-medium text-zinc-700">
              Current Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="current_password"
              type="password"
              value={pwForm.current_password}
              onChange={e => setPwForm(p => ({ ...p, current_password: e.target.value }))}
              className={cn("h-9 text-sm", pwErrors.current_password && "border-red-400 focus-visible:ring-red-300")}
            />
            {pwErrors.current_password && <p className="text-[11px] text-red-500">{pwErrors.current_password}</p>}
          </div>

          {/* New password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-zinc-700">
              New Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={pwForm.password}
              onChange={e => setPwForm(p => ({ ...p, password: e.target.value }))}
              className={cn("h-9 text-sm", pwErrors.password && "border-red-400 focus-visible:ring-red-300")}
            />
            {pwErrors.password && <p className="text-[11px] text-red-500">{pwErrors.password}</p>}

            {/* Password rules checklist */}
            {pwForm.password.length > 0 && (
              <div className="mt-2 p-3 rounded-lg bg-zinc-50 border border-zinc-100 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1">
                  <ShieldCheckIcon className="w-3 h-3" /> Password Requirements
                </p>
                {PASSWORD_RULES.map(rule => {
                  const ok = rule.test(pwForm.password);
                  return (
                    <div
                      key={rule.label}
                      className={cn(
                        "flex items-center gap-2 text-[12px] font-medium transition-colors",
                        ok ? "text-emerald-600" : "text-zinc-400"
                      )}
                    >
                      {ok
                        ? <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        : <XCircleIcon    className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0" />
                      }
                      {rule.label}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label htmlFor="password_confirmation" className="text-xs font-medium text-zinc-700">
              Confirm New Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password_confirmation"
              type="password"
              value={pwForm.password_confirmation}
              onChange={e => setPwForm(p => ({ ...p, password_confirmation: e.target.value }))}
              className={cn(
                "h-9 text-sm",
                pwErrors.password_confirmation && "border-red-400 focus-visible:ring-red-300",
                !pwErrors.password_confirmation &&
                  pwForm.password_confirmation &&
                  pwForm.password === pwForm.password_confirmation &&
                  "border-emerald-400 focus-visible:ring-emerald-300",
              )}
            />
            {pwErrors.password_confirmation && (
              <p className="text-[11px] text-red-500">{pwErrors.password_confirmation}</p>
            )}
            {!pwErrors.password_confirmation &&
              pwForm.password_confirmation &&
              pwForm.password === pwForm.password_confirmation && (
              <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                <CheckCircleSolid className="w-3.5 h-3.5" /> Passwords match
              </p>
            )}
          </div>

          {pwErrors.general && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
              {pwErrors.general}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            {pwSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <CheckCircleSolid className="w-4 h-4" /> Password changed successfully
              </span>
            )}
            <Button
              onClick={handlePasswordSave}
              disabled={pwLoading}
              size="sm"
              className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg h-8 px-4 text-xs font-semibold"
            >
              {pwLoading ? "Updating…" : "Update Password"}
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}