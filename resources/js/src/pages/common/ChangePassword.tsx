import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/src/hooks/useAuth";
import API from "@/src/services/api";
import { Card, CardContent } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Button } from "@/src/components/ui/button";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Separator } from "@/src/components/ui/separator";
import {
  ShieldAlert, ShieldCheck, Eye, EyeOff,
  CheckCircle2, XCircle, Loader2, LogOut,
} from "lucide-react";
import { cn } from "@/src/lib/utils";

interface PasswordRule {
  label: string;
  test: (v: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: "8–16 characters",        test: v => v.length >= 8 && v.length <= 16 },
  { label: "Uppercase letter (A–Z)", test: v => /[A-Z]/.test(v) },
  { label: "Lowercase letter (a–z)", test: v => /[a-z]/.test(v) },
  { label: "Number (0–9)",           test: v => /[0-9]/.test(v) },
  { label: "Symbol (!@#$%^&*…)",     test: v => /[@$!%*?&\#^()\-_=+\[\]{};:'",./<>?\\|`~]/.test(v) },
];

const DEBOUNCE_MS = 300;
const BRAND_RED = "#111";

export default function ChangePassword() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Debounced value — the checklist / strength bar only recompute after
  // the user pauses typing, instead of on every keystroke.
  const [debouncedPassword, setDebouncedPassword] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedPassword(password), DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [password]);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const score = PASSWORD_RULES.filter(r => r.test(debouncedPassword)).length;
  const allPassed = score === PASSWORD_RULES.length;
  const strengthLabel = debouncedPassword.length === 0 ? "" : score <= 1 ? "Weak" : score <= 3 ? "Average" : "Strong";
  const strengthColor = score <= 1 ? "#ef4444" : score <= 3 ? "#f59e0b" : "#10b981";

  const passwordsMatch = password.length > 0 && password === confirm;
  const canSubmit = currentPassword.length > 0 && allPassed && passwordsMatch && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    if (!currentPassword) { setFieldErrors({ current_password: "Current password is required." }); return; }
    if (!allPassed) { setError("Your new password doesn't meet all requirements yet."); return; }
    if (!passwordsMatch) { setFieldErrors({ password_confirmation: "Passwords do not match." }); return; }

    setLoading(true);
    try {
      const { data } = await API.post("/auth/change-forced-password", {
        current_password: currentPassword,
        password,
        password_confirmation: confirm,
      });
      updateUser(data.user);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      const laravel = err?.response?.data?.errors ?? {};
      setFieldErrors(laravel);
      setError(err?.response?.data?.message ?? "Unable to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <style>{`
        /* ── Requirement rows: fade in/out with slight stagger ── */
        .req-row {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; font-weight: 500;
          transition: opacity 0.28s ease, transform 0.28s ease, color 0.2s ease;
        }
        .req-panel-enter {
          animation: reqFadeIn 0.32s cubic-bezier(.25,.8,.25,1) both;
        }
        @keyframes reqFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .req-row, .req-panel-enter { transition: none !important; animation: none !important; }
        }
      `}</style>

      <div className="h-dvh overflow-y-auto overscroll-auto bg-zinc-50 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl my-auto">
          <Card className="border-zinc-200 shadow-md overflow-hidden">
            <div className="flex flex-col lg:flex-row">

              {/* ══ LEFT COLUMN — logo + legal notice ══ */}
              <div className="w-full lg:w-[48%] border-b-2 lg:border-b-0 lg:border-r lg:border-b-0 border-zinc-100 p-6 pb-8 lg:p-12 flex flex-col items-center justify-center lg:min-h-[600px]">

                <div className="w-full flex flex-col items-center">

                  {/* Logo — bigger badge, image fills most of it */}
                  <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-28 h-28 rounded-full bg-white border-2 border-zinc-100 shadow-sm flex items-center justify-center mb-4 p-1.5">
                      <img
                        src="/images/opol.png"
                        alt="MBO"
                        className="w-full h-full object-contain"
                        onError={e => { e.currentTarget.style.display = "none"; (e.currentTarget.parentElement as HTMLElement).innerHTML = '<span style="font-size:16px;font-weight:700;color:#111">MBO</span>'; }}
                      />
                    </div>
                    <p className="text-base font-semibold text-zinc-900 leading-tight">Municipal Budget Office</p>
                    <p className="text-xs text-zinc-400 leading-tight mt-1">CY {new Date().getFullYear()} · MGMT SYSTEM</p>
                  </div>

                  {/* Notice */}
                  <Alert className="bg-amber-50 border-amber-200 w-full">
                    <ShieldCheck className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-[12px] leading-relaxed text-amber-800">
                      Your account is still using a default, system-issued password. Under{" "}
                      <strong>Republic Act No. 10173 (Data Privacy Act of 2012)</strong> and its
                      implementing rules, this office is required to protect personal data it
                      processes against unauthorized access. A shared or default password is a
                      known point of data leakage and access control failure. To comply with this
                      obligation and to protect the records in this system, you must set a unique
                      password before you can proceed.
                    </AlertDescription>
                  </Alert>

                </div>

                {/* Footer strip — desktop only; on mobile it would add a redundant divider
                    right before the form section starts */}
                <div className="hidden lg:block w-full mt-10 pt-5 border-t border-zinc-100">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-300 text-center font-medium">
                    Secure · Encrypted · Compliant
                  </p>
                </div>

              </div>

              {/* ══ RIGHT COLUMN — form ══ */}
              <div className="w-full lg:w-[52%]">
                <CardContent className="p-6 lg:p-8">

                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                      <ShieldAlert className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h1 className="text-base font-bold text-zinc-900">Password Change Required</h1>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {user?.fname ? `Hi ${user.fname}, ` : ""}you must set a new password before continuing.
                      </p>
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive" className="mb-5">
                      <AlertDescription className="text-sm">{error}</AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Current password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="current_password" className="text-xs font-medium text-zinc-700">
                        Current Password <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="current_password"
                          type={showCurrent ? "text" : "password"}
                          value={currentPassword}
                          onChange={e => { setCurrentPassword(e.target.value); setFieldErrors(f => ({ ...f, current_password: "" })); }}
                          className={cn("h-10 text-sm pr-10", fieldErrors.current_password && "border-red-400 focus-visible:ring-red-300")}
                          autoComplete="current-password"
                          disabled={loading}
                        />
                        <button type="button" onClick={() => setShowCurrent(v => !v)} tabIndex={-1}
                          className="absolute inset-y-0 right-0 px-3 flex items-center text-zinc-400 hover:text-zinc-700">
                          {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {fieldErrors.current_password && <p className="text-[11px] text-red-500">{fieldErrors.current_password}</p>}
                    </div>

                    {/* New password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-xs font-medium text-zinc-700">
                        New Password <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showNew ? "text" : "password"}
                          value={password}
                          onChange={e => { setPassword(e.target.value); setFieldErrors(f => ({ ...f, password: "" })); }}
                          className={cn("h-10 text-sm pr-10", fieldErrors.password && "border-red-400 focus-visible:ring-red-300")}
                          autoComplete="new-password"
                          disabled={loading}
                        />
                        <button type="button" onClick={() => setShowNew(v => !v)} tabIndex={-1}
                          className="absolute inset-y-0 right-0 px-3 flex items-center text-zinc-400 hover:text-zinc-700">
                          {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {fieldErrors.password && <p className="text-[11px] text-red-500">{fieldErrors.password}</p>}

                      <div className="mt-2 p-3 rounded-lg bg-zinc-50 border border-zinc-100 space-y-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Password Strength
                          </p>
                          {debouncedPassword.length > 0 && (
                            <span className="text-[10px] font-bold uppercase tracking-wide transition-colors duration-300" style={{ color: strengthColor }}>
                              {allPassed ? "Strong" : strengthLabel}
                            </span>
                          )}
                        </div>

                        {/* Segmented strength bars — always visible */}
                        <div className="flex gap-1">
                          {[0, 1, 2, 3, 4].map(i => (
                            <div
                              key={i}
                              className="h-1.5 flex-1 rounded-full bg-zinc-200 overflow-hidden transition-colors duration-300"
                              style={{ backgroundColor: i < score ? strengthColor : undefined }}
                            />
                          ))}
                        </div>

                        {allPassed ? (
                          // All requirements satisfied — collapse checklist into one confirmation line
                          <div key="success" className="req-panel-enter pt-1 flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            Valid password — all requirements met
                          </div>
                        ) : (
                          // Requirements checklist — visible from the start so the user
                          // knows the rules before they even type anything.
                          <div key="checklist" className="req-panel-enter pt-1 space-y-1.5">
                            {PASSWORD_RULES.map((rule, i) => {
                              const ok = rule.test(debouncedPassword);
                              return (
                                <div
                                  key={rule.label}
                                  className={cn("req-row", ok ? "text-emerald-600" : "text-zinc-400")}
                                  style={{ transitionDelay: `${i * 40}ms` }}
                                >
                                  {ok
                                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                    : <XCircle className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0" />}
                                  {rule.label}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Confirm password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="password_confirmation" className="text-xs font-medium text-zinc-700">
                        Confirm New Password <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="password_confirmation"
                          type={showConfirm ? "text" : "password"}
                          value={confirm}
                          onChange={e => { setConfirm(e.target.value); setFieldErrors(f => ({ ...f, password_confirmation: "" })); }}
                          className={cn(
                            "h-10 text-sm pr-10",
                            fieldErrors.password_confirmation && "border-red-400 focus-visible:ring-red-300",
                            !fieldErrors.password_confirmation && passwordsMatch && "border-emerald-400 focus-visible:ring-emerald-300",
                          )}
                          autoComplete="new-password"
                          disabled={loading}
                        />
                        <button type="button" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}
                          className="absolute inset-y-0 right-0 px-3 flex items-center text-zinc-400 hover:text-zinc-700">
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {fieldErrors.password_confirmation && <p className="text-[11px] text-red-500">{fieldErrors.password_confirmation}</p>}
                      {!fieldErrors.password_confirmation && confirm.length > 0 && passwordsMatch && (
                        <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={!canSubmit}
                      className="w-full h-10 text-sm font-semibold"
                      style={{ background: canSubmit ? BRAND_RED : undefined }}
                    >
                      {loading
                        ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Updating…</>
                        : "Set New Password & Continue"}
                    </Button>
                  </form>

                  <Separator className="my-5" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Not you? Sign out
                  </button>

                </CardContent>
              </div>

            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
