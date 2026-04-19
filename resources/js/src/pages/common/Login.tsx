import { useState, useEffect, useRef } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  Eye, EyeOff, AlertCircle, Loader2,
  Building2, BarChart3, FileText, ShieldCheck,
} from "lucide-react";
import API from "../../services/api";
import { Input }              from "@/src/components/ui/input";
import { Label }              from "@/src/components/ui/label";
import { Button }             from "@/src/components/ui/button";
// import { Checkbox }           from "@/src/components/ui/checkbox";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Separator }          from "@/src/components/ui/separator";
import { Badge }              from "@/src/components/ui/badge";
import { toast }              from "sonner";

const MAX_LOGIN_ATTEMPTS = 50;
const RATE_LIMIT_WINDOW  = 60000;
const RATE_LIMIT_KEY     = "login_attempts";

interface LoginAttempt {
  count: number;
  timestamp: number;
  lastUsername?: string;
}

const FEATURES = [
  { icon: BarChart3,    label: "Real-time budget tracking"    },
  { icon: Building2,    label: "Department-wise allocation"   },
  { icon: FileText,     label: "Automated reporting"          },
  { icon: ShieldCheck,  label: "Role-based access control"    },
];

export default function Login() {
  const [username,       setUsername]       = useState("");
  const [password,       setPassword]       = useState("");
  const [showPassword,   setShowPassword]   = useState(false);
  const [loginError,     setLoginError]     = useState("");
  const [rateLimitError, setRateLimitError] = useState("");
  const [remainingTime,  setRemainingTime]  = useState(0);
  const [isRateLimited,  setIsRateLimited]  = useState(false);
  const [hasLoginError,  setHasLoginError]  = useState(false);
  const [isSubmitting,   setIsSubmitting]   = useState(false);
//   const [rememberMe,     setRememberMe]     = useState(false);
  const [mounted,        setMounted]        = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  /* ── mount trigger for animations ── */
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    checkRateLimit();
    return () => { clearTimeout(t); if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  /* ── countdown timer ── */
  useEffect(() => {
    if (remainingTime <= 0) return;
    timerRef.current = setTimeout(() => {
      setRemainingTime(p => {
        if (p <= 1000) { setIsRateLimited(false); setRateLimitError(""); return 0; }
        return p - 1000;
      });
    }, 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [remainingTime]);

  const checkRateLimit = (): boolean => {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return false;
    const a: LoginAttempt = JSON.parse(raw);
    const elapsed = Date.now() - a.timestamp;
    if (elapsed < RATE_LIMIT_WINDOW && a.count >= MAX_LOGIN_ATTEMPTS) {
      const rem = RATE_LIMIT_WINDOW - elapsed;
      setRemainingTime(rem); setIsRateLimited(true);
      setRateLimitError("Too many attempts. Try again in ");
      return true;
    }
    if (elapsed >= RATE_LIMIT_WINDOW) {
      localStorage.removeItem(RATE_LIMIT_KEY);
      setIsRateLimited(false); setRateLimitError("");
    }
    return false;
  };

  const updateRateLimit = () => {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const now = Date.now();
    let a: LoginAttempt = raw ? JSON.parse(raw) : { count: 0, timestamp: now };
    a = (now - a.timestamp < RATE_LIMIT_WINDOW)
      ? { ...a, count: a.count + 1, timestamp: now, lastUsername: username }
      : { count: 1, timestamp: now, lastUsername: username };
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(a));
    if (a.count >= MAX_LOGIN_ATTEMPTS) {
      const rem = RATE_LIMIT_WINDOW - (now - a.timestamp);
      setRemainingTime(rem); setIsRateLimited(true);
      setRateLimitError(`Too many attempts. Try again in ${Math.ceil(rem / 1000)}s.`);
    }
  };

  const resetRateLimit = () => {
    localStorage.removeItem(RATE_LIMIT_KEY);
    setIsRateLimited(false); setRateLimitError(""); setRemainingTime(0);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError(""); setHasLoginError(false); setRateLimitError("");
    if (checkRateLimit()) return;
    if (!username.trim()) { setLoginError("Enter your username."); setHasLoginError(true); return; }
    if (!password.trim()) { setLoginError("Enter your password."); setHasLoginError(true); return; }
    setIsSubmitting(true);
    try {
      const { data } = await API.post("/auth/login", {
        username: username.trim(), password: password.trim(),
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      login(data.user, data.token);
      resetRateLimit();
      navigate("/dashboard");
    } catch (err: any) {
  // Server-side 429 (throttle:login fired) — surface it directly,
  // skip local rate-limit counter so we don't double-penalise.
  if (err.response?.status === 429 || (err as any).isRateLimit) {
  // Prefer header, fall back to body, then 0 (show generic message without timer)
const retryAfterSec =
  err.response?.headers?.['retry-after'] ??
  err.response?.data?.retry_after;

const waitMs = retryAfterSec ? parseInt(retryAfterSec, 10) * 1000 : 0;

  // Persist so countdown survives a page refresh
  if (waitMs > 0) {
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({
    count: MAX_LOGIN_ATTEMPTS,
    timestamp: Date.now() - (RATE_LIMIT_WINDOW - waitMs),
  }));
  setRemainingTime(waitMs);
  setIsRateLimited(true);
  setRateLimitError("Too many attempts. Try again in ");
} else {
  // No timer info — just show the server's message
  setHasLoginError(true);
  setLoginError(err.response?.data?.message ?? "Too many login attempts. Please wait a moment.");
}
return;
}

  updateRateLimit();
  if (checkRateLimit()) return;
  setHasLoginError(true);
  setLoginError(err.response?.data?.message ?? "Invalid username or password.");
} finally {
      setIsSubmitting(false);
    }
  };

  const clearErr = () => { if (hasLoginError) { setHasLoginError(false); setLoginError(""); } };
  const fmt = (ms: number) => `${Math.ceil(ms / 1000)}s`;
  const isLoading = loading || isSubmitting;

  /* ── animation helpers ── */
  const sl = (dir: "left" | "right", delay: string) =>
    `login-anim login-slide-${dir} ${mounted ? "login-in" : ""} ${delay}`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');

        .login-wrap * { box-sizing: border-box; }
        .login-wrap { font-family: 'Geist', sans-serif; }
        .login-mono  { font-family: 'Geist Mono', monospace; }

        /* ── Slide animations ─────────────────────────────── */
        .login-anim {
          transition:
            opacity  0.48s cubic-bezier(.25,.8,.25,1),
            transform 0.48s cubic-bezier(.25,.8,.25,1);
        }
        .login-slide-left  { opacity: 0; transform: translateX(-22px); }
        .login-slide-right { opacity: 0; transform: translateX(22px);  }
        .login-slide-up    { opacity: 0; transform: translateY(14px);  }
        .login-in          { opacity: 1 !important; transform: translate(0,0) !important; }

        .d1 { transition-delay: 0.04s; }
        .d2 { transition-delay: 0.10s; }
        .d3 { transition-delay: 0.16s; }
        .d4 { transition-delay: 0.22s; }
        .d5 { transition-delay: 0.28s; }
        .d6 { transition-delay: 0.34s; }
        .d7 { transition-delay: 0.40s; }
        .d8 { transition-delay: 0.46s; }

        /* ── Feature row hover ────────────────────────────── */
        .feat-row {
          transition: background 0.14s ease, transform 0.14s ease;
          border-radius: 8px;
        }
        .feat-row:hover {
          background: hsl(240 4.8% 95.9%); /* zinc-100 */
          transform: translateX(3px);
        }

        /* ── Input focus ring — match shadcn ring ─────────── */
        .login-input:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px hsl(240 5.9% 10%) !important; /* shadcn ring = foreground */
        }
        .login-input.err {
          border-color: hsl(0 84.2% 60.2%) !important; /* destructive */
        }
        .login-input.err:focus-visible {
          box-shadow: 0 0 0 2px hsl(0 84.2% 60.2%) !important;
        }
      `}</style>

      <div className="login-wrap min-h-screen bg-zinc-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 lg:p-8">

          {/* ── Card ───────────────────────────────────────── */}
          <div className="w-full max-w-5xl bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex flex-col lg:flex-row">

              {/* ════════════════════════════════════════════
                  LEFT PANEL  — zinc-50, flat, no gradient
              ════════════════════════════════════════════ */}
              <div className="w-full lg:w-[42%] bg-zinc-50 border-b lg:border-b-0 lg:border-r border-zinc-200 p-9 lg:p-12 flex flex-col justify-between min-h-[300px] lg:min-h-[600px]">

                <div>
                  {/* Logo + name */}
                  <div className={`flex items-center gap-3 mb-10 ${sl("left", "d1")}`}>
                    {/* <div className="w-10 h-10 rounded-lg bg-white border border-zinc-200 shadow-xs flex items-center justify-center flex-shrink-0"> */}
                      <div className="flex-shrink-0">
                      <img
                        src="/images/opol.png"
                        alt="MBO"
                        className="w-8 h-8 object-contain"
                        onError={e => {
                          e.currentTarget.style.display = "none";
                          (e.currentTarget.parentElement as HTMLElement).innerHTML =
                            '<span class="login-mono" style="font-size:11px;font-weight:600;color:hsl(240 5.9% 10%)">MBO</span>';
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 leading-tight">Municipal Budget Office</p>
                      <p className="login-mono text-[11px] text-zinc-400 leading-tight tracking-wide mt-0.5">
                        CY {new Date().getFullYear()} · MGMT SYSTEM
                      </p>
                    </div>
                  </div>

                  {/* Headline */}
                  <div className={`mb-9 ${sl("left", "d2")}`}>
                    <h1 className="text-[26px] font-bold text-zinc-900 leading-snug tracking-tight">
                      Budget planning,<br />made simple.
                    </h1>
                    <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
                      A unified platform for municipal budget management, allocation, and transparent reporting.
                    </p>
                  </div>

                  {/* Features */}
                  <div className="hidden lg:block">
                    <div className="space-y-1">
                        {FEATURES.map(({ icon: Icon, label }, i) => (
                      <div
                        key={label}
                        className={`feat-row flex items-center gap-3 px-3 py-2.5 cursor-default ${sl("left", `d${i + 3}`)}`}
                      >
                        <div className="w-7 h-7 rounded-md bg-white border border-zinc-200 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-3.5 h-3.5 text-zinc-500" />
                        </div>
                        <span className="text-sm text-zinc-600">{label}</span>
                      </div>
                    ))}
                  </div>
                  </div>
                </div>

                {/* Bottom tag */}
                <div className={`mt-8 ${sl("left", "d8")}`}>
                  <Separator className="mb-4 bg-zinc-200" />
                  <p className="login-mono text-[10px] text-zinc-400 uppercase tracking-widest">
                    Secure · Encrypted · Compliant
                  </p>
                </div>
              </div>

              {/* ════════════════════════════════════════════
                  RIGHT PANEL — pure white, shadcn components
              ════════════════════════════════════════════ */}
              <div className="w-full lg:w-[58%] bg-white p-8 lg:p-14 flex items-center">
                <div className="w-full max-w-sm mx-auto">

                  {/* Header */}
                  <div className={`mb-8 ${sl("right", "d1")}`}>
                    <Badge variant="outline" className="login-mono text-[10px] tracking-widest mb-3">
                      SECURE LOGIN
                    </Badge>
                    <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Welcome back</h2>
                    <p className="text-sm text-zinc-500 mt-1">Sign in to your account to continue.</p>
                  </div>

                  {/* Error */}
                  {(rateLimitError || loginError) && (
                    // <Alert variant="destructive" className="mb-5 login-slide-up login-in login-anim">
                    <Alert variant="destructive" className="mb-5 login-slide-up login-in login-anim" role="alert" aria-live="assertive" id="login-error">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {rateLimitError
                          ? `${rateLimitError}${remainingTime > 0 ? fmt(remainingTime) : ""}`
                          : loginError}
                      </AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Username */}
                    <div className={sl("right", "d2")}>
                      <Label htmlFor="username" className="text-xs font-medium text-zinc-700 mb-1.5 block">
                        Username
                      </Label>
                      <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => { setUsername(e.target.value); clearErr(); if (rateLimitError) setRateLimitError(""); }}
                        placeholder="Enter your username"
                        disabled={isLoading || isRateLimited}
                        className={`login-input h-10 text-sm focus-visible:ring-0 ${hasLoginError ? "err" : ""}`}
                        autoComplete="username"
                        aria-invalid={hasLoginError}
                        aria-describedby="login-error"
                        required
                      />
                    </div>

                    {/* Password */}
                    <div className={sl("right", "d3")}>
                      <Label htmlFor="password" className="text-xs font-medium text-zinc-700 mb-1.5 block">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => { setPassword(e.target.value); clearErr(); if (rateLimitError) setRateLimitError(""); }}
                          placeholder="Enter your password"
                          disabled={isLoading || isRateLimited}
                          className={`login-input h-10 text-sm pr-10 focus-visible:ring-0 ${hasLoginError ? "err" : ""}`}
                          autoComplete="current-password"
                          aria-invalid={hasLoginError}
                          aria-describedby="login-error"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          disabled={isLoading || isRateLimited}
                        //   tabIndex={-1}
                        tabIndex={0}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute inset-y-0 right-0 px-3 flex items-center text-zinc-400 hover:text-zinc-700 transition-colors disabled:opacity-40"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Remember + Forgot */}
                    <div className={`flex items-center justify-between ${sl("right", "d4")}`}>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        {/* <Checkbox
                          id="remember"
                          checked={rememberMe}
                          onCheckedChange={v => setRememberMe(!!v)}
                          disabled={isLoading || isRateLimited}
                          className="h-4 w-4"
                        />
                        <span className="text-sm text-zinc-600">Remember me</span> */}
                      </label>
                      <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            toast("Password assistance", {
                            description: "Please contact your Budget Officer to reset your password.",
                            icon: <ShieldCheck className="w-4 h-4 text-zinc-700" />,
                            duration: 5000,
                            });
                        }}
                        className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors hover:underline underline-offset-4"
                        >
                        Forgot password?
                    </a>
                    </div>

                    {/* Submit */}
                    <div className={sl("right", "d5")}>
                      <Button
                        type="submit"
                        disabled={isLoading || isRateLimited}
                        className="w-full h-10 text-sm font-semibold"
                      >
                        {isLoading ? (
                        //   <><Loader2 className="h-4 w-4 animate-spin" /><span>Signing in…</span></>
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /><span>Signing in…</span></>
                        ) : isRateLimited ? "Please wait…" : "Sign in"}
                      </Button>
                    </div>
                  </form>

                  {/* Footer note */}
                  <div className={`mt-8 ${sl("right", "d6")}`}>
                    <Separator className="mb-5" />
                    <p className="text-xs text-zinc-400 text-center leading-relaxed">
                      Restricted to authorized personnel only.
                    </p>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>

        <footer className="py-4 text-center login-mono text-[11px] text-zinc-400 tracking-wide">
          © {new Date().getFullYear()} Municipal Budget Office Management System
        </footer>
      </div>
    </>
  );
}
