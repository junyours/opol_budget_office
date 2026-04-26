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
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Separator }          from "@/src/components/ui/separator";
import { Badge }              from "@/src/components/ui/badge";
import { toast }              from "sonner";

const MAX_LOGIN_ATTEMPTS = 50;
const RATE_LIMIT_WINDOW  = 60000;
const RATE_LIMIT_KEY     = "login_attempts";

const BRAND_RED = "#111";

interface LoginAttempt {
  count: number;
  timestamp: number;
  lastUsername?: string;
}

const FEATURES = [
  { icon: BarChart3,   label: "Real-time budget tracking",  iconBg: "rgba(219,234,254,0.18)", iconColor: "rgba(147,197,253,1)"  },
  { icon: Building2,   label: "Department-wise allocation", iconBg: "rgba(209,250,229,0.18)", iconColor: "rgba(110,231,183,1)"  },
  { icon: FileText,    label: "Automated reporting",        iconBg: "rgba(237,233,254,0.18)", iconColor: "rgba(196,181,253,1)"  },
  { icon: ShieldCheck, label: "Role-based access control",  iconBg: "rgba(254,226,226,0.18)", iconColor: "rgba(252,165,165,1)"  },
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
  const [mounted,        setMounted]        = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    checkRateLimit();
    return () => { clearTimeout(t); if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

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
      if (err.response?.status === 429 || (err as any).isRateLimit) {
        const retryAfterSec =
          err.response?.headers?.['retry-after'] ??
          err.response?.data?.retry_after;
        const waitMs = retryAfterSec ? parseInt(retryAfterSec, 10) * 1000 : 0;
        if (waitMs > 0) {
          localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({
            count: MAX_LOGIN_ATTEMPTS,
            timestamp: Date.now() - (RATE_LIMIT_WINDOW - waitMs),
          }));
          setRemainingTime(waitMs);
          setIsRateLimited(true);
          setRateLimitError("Too many attempts. Try again in ");
        } else {
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

  const sl = (dir: "left" | "right", delay: string) =>
    `login-anim login-slide-${dir} ${mounted ? "login-in" : ""} ${delay}`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');

        .login-wrap * { box-sizing: border-box; }
        .login-wrap { font-family: 'Geist', sans-serif; }
        .login-mono  { font-family: 'Geist Mono', monospace; }

        .login-anim {
          transition: opacity 0.48s cubic-bezier(.25,.8,.25,1), transform 0.48s cubic-bezier(.25,.8,.25,1);
        }
        .login-slide-left  { opacity: 0; transform: translateX(-22px); }
        .login-slide-right { opacity: 0; transform: translateX(22px);  }
        .login-in          { opacity: 1 !important; transform: translate(0,0) !important; }

        .d1 { transition-delay: 0.04s; }
        .d2 { transition-delay: 0.10s; }
        .d3 { transition-delay: 0.16s; }
        .d4 { transition-delay: 0.22s; }
        .d5 { transition-delay: 0.28s; }
        .d6 { transition-delay: 0.34s; }
        .d7 { transition-delay: 0.40s; }
        .d8 { transition-delay: 0.46s; }

        .feat-row {
          transition: background 0.14s ease, transform 0.14s ease;
          border-radius: 8px;
        }
        .feat-row:hover {
          background: rgba(255,255,255,0.08);
          transform: translateX(3px);
        }

        .login-input:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px hsl(240 5.9% 10%) !important;
        }
        .login-input.err {
          border-color: hsl(0 84.2% 60.2%) !important;
        }
        .login-input.err:focus-visible {
          box-shadow: 0 0 0 2px hsl(0 84.2% 60.2%) !important;
        }
      `}</style>

      <div className="login-wrap min-h-screen bg-zinc-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 lg:p-8">

          <div className="w-full max-w-5xl bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex flex-col lg:flex-row">

              {/* ══ LEFT PANEL — crimson with wave decorations ══ */}
              <div
                className="w-full lg:w-[42%] border-b lg:border-b-0 lg:border-r border-zinc-800 p-9 lg:p-12 flex flex-col justify-between min-h-[300px] lg:min-h-[600px] relative overflow-hidden"
                style={{ background: BRAND_RED }}
              >
                {/* ── Wave decorations ── */}
                {/* Top-left circles */}
                <div style={{ position:'absolute', top:-60, left:-60, width:220, height:220, borderRadius:'50%', background:'rgba(255,255,255,0.07)', pointerEvents:'none' }} />
                <div style={{ position:'absolute', top:-30, left:-30, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,0.06)', pointerEvents:'none' }} />
                {/* Bottom-right circles */}
                <div style={{ position:'absolute', bottom:-70, right:-70, width:240, height:240, borderRadius:'50%', background:'rgba(255,255,255,0.07)', pointerEvents:'none' }} />
                <div style={{ position:'absolute', bottom:-35, right:-35, width:155, height:155, borderRadius:'50%', background:'rgba(255,255,255,0.06)', pointerEvents:'none' }} />
                {/* Top + bottom accent bars */}
                <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:'rgba(255,255,255,0.2)', pointerEvents:'none' }} />
                <div style={{ position:'absolute', bottom:0, left:0, right:0, height:4, background:'rgba(255,255,255,0.12)', pointerEvents:'none' }} />

                {/* ── Logo ── */}
                <div className={`flex items-center gap-3 ${sl("left", "d1")}`} style={{ position:'relative', zIndex:2 }}>
                  <div className="flex-shrink-0" style={{ background:'rgba(255,255,255,0.12)', borderRadius:8, padding:4 }}>
                    <img
                      src="/images/opol.png"
                      alt="MBO"
                      className="w-8 h-8 object-contain"
                      onError={e => {
                        e.currentTarget.style.display = "none";
                        (e.currentTarget.parentElement as HTMLElement).innerHTML =
                          '<span class="login-mono" style="font-size:11px;font-weight:600;color:#fff">MBO</span>';
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight" style={{ color:'#fff' }}>
                      Municipal Budget Office
                    </p>
                    <p className="login-mono text-[11px] leading-tight tracking-wide mt-0.5" style={{ color:'rgba(255,255,255,0.5)' }}>
                      CY {new Date().getFullYear()} · MGMT SYSTEM
                    </p>
                  </div>
                </div>

                {/* ── Headline + features ── */}
                <div style={{ position:'relative', zIndex:2, flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'28px 0' }}>

                  {/* Badge */}
                  <div
                    className={`inline-block login-mono text-[9px] font-semibold tracking-widest uppercase mb-4 self-start px-2 py-1 rounded ${sl("left", "d2")}`}
                    style={{ color:'rgba(255,255,255,0.6)', border:'0.5px solid rgba(255,255,255,0.25)' }}
                  >
                    Budget Management
                  </div>

                  {/* Title */}
                  <div className={sl("left", "d2")}>
                    <h1 className="leading-snug tracking-tight font-bold" style={{ fontSize:26, color:'#fff' }}>
                      Budget planning,<br />made simple.
                    </h1>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color:'rgba(255,255,255,0.68)' }}>
                      Annual Budget Plan and <br/>Local Expenditure Program Preparation
                    </p>
                  </div>

                  {/* Divider */}
                  <div className={sl("left", "d3")} style={{ width:330, height:2, background:'rgba(255,255,255,0.3)', borderRadius:2, margin:'20px 0' }} />

                  {/* Features */}
                  <div className="hidden lg:block">
                    <div className="space-y-1">
                      {FEATURES.map(({ icon: Icon, label, iconBg, iconColor }, i) => (
                        <div key={label} className={`feat-row flex items-center gap-3 px-3 py-2.5 cursor-default ${sl("left", `d${i + 4}`)}`}>
                            <div
                            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                            style={{ background: iconBg, border: '0.5px solid rgba(255,255,255,0.18)' }}
                            >
                            <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
                            </div>
                            <span className="text-sm" style={{ color:'rgba(255,255,255,0.75)' }}>{label}</span>
                        </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* ── Footer ── */}
                <div className={`${sl("left", "d8")}`} style={{ position:'relative', zIndex:2 }}>
                  <div style={{ height:'0.5px', background:'rgba(255,255,255,0.15)', marginBottom:10 }} />
                  <p className="login-mono text-[10px] uppercase tracking-widest" style={{ color:'rgba(255,255,255,0.35)' }}>
                    Secure · Encrypted · Compliant
                  </p>
                </div>
              </div>

              {/* ══ RIGHT PANEL — pure white, form ══ */}
              <div className="w-full lg:w-[58%] bg-white p-8 lg:p-14 flex items-center">
                <div className="w-full max-w-sm mx-auto">

                  {/* Header */}
                  <div className={`mb-8 ${sl("right", "d1")}`}>
                    {/* <Badge variant="outline" className="login-mono text-[10px] tracking-widest mb-3">
                      SECURE LOGIN
                    </Badge> */}
                    <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Welcome back</h2>
                    <p className="text-sm text-zinc-500 mt-1">Sign in to your account to continue.</p>
                  </div>

                  {/* Error */}
                  {(rateLimitError || loginError) && (
                    <Alert variant="destructive" className="mb-5 login-anim login-in" role="alert" aria-live="assertive" id="login-error">
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
                        placeholder="e.g. mbo.office"
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
                          tabIndex={0}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute inset-y-0 right-0 px-3 flex items-center text-zinc-400 hover:text-zinc-700 transition-colors disabled:opacity-40"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Forgot */}
                    <div className={`flex items-center justify-end ${sl("right", "d4")}`}>
                      <a
                        href="#"
                        onClick={e => {
                          e.preventDefault();
                          toast("Password assistance", {
                            description: "Please contact your Budget Officer to reset your password.",
                            icon: <ShieldCheck className="w-4 h-4 text-blue-700" />,
                            duration: 5000,
                          });
                        }}
                        className="text-sm text-blue-500 hover:text-blue-700 transition-colors hover:underline underline-offset-4"
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
                        style={{ background: isLoading || isRateLimited ? undefined : BRAND_RED, borderColor: BRAND_RED }}
                      >
                        {isLoading
                          ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /><span>Signing in…</span></>
                          : isRateLimited ? "Please wait…" : "Sign in"
                        }
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
