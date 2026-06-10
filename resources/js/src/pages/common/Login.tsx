import { useState, useEffect, useRef } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  Eye, EyeOff, AlertCircle, Loader2,
  Building2, BarChart3, FileText, ShieldCheck,
  X, UserCircle2, Settings, ChevronRight,
} from "lucide-react";
import API from "../../services/api";
import { Input }                   from "@/src/components/ui/input";
import { Label }                   from "@/src/components/ui/label";
import { Button }                  from "@/src/components/ui/button";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Separator }               from "@/src/components/ui/separator";
import { toast }                   from "sonner";
import {
  getRememberedAccounts,
  rememberAccount,
  forgetAccount,
} from "../../utils/rememberedAccounts";
import { RememberedAccount } from "../../types/api";

const MAX_LOGIN_ATTEMPTS = 50;
const RATE_LIMIT_WINDOW  = 60000;
const RATE_LIMIT_KEY     = "login_attempts";
const BRAND_RED          = "#111";

interface LoginAttempt { count: number; timestamp: number; lastUsername?: string; }

const ROLE_LABEL: Record<string, string> = {
  'admin':           'Admin',
  'super-admin':     'Super Admin',
  'admin-hrmo':      'HRMO',
  'department-head': 'Dept. Head',
};

const FEATURES = [
  { icon: BarChart3,   label: "Real-time budget tracking",  iconBg: "rgba(219,234,254,0.18)", iconColor: "rgba(147,197,253,1)" },
  { icon: Building2,   label: "Department-wise allocation", iconBg: "rgba(209,250,229,0.18)", iconColor: "rgba(110,231,183,1)" },
  { icon: FileText,    label: "Automated reporting",        iconBg: "rgba(237,233,254,0.18)", iconColor: "rgba(196,181,253,1)" },
  { icon: ShieldCheck, label: "Role-based access control",  iconBg: "rgba(254,226,226,0.18)", iconColor: "rgba(252,165,165,1)" },
];

// ── Avatar helpers ─────────────────────────────────────────────────────────────
// We cache a base64 copy of the avatar in localStorage so it renders on the
// accounts list even before the server responds (no broken-image flash).
const AVATAR_CACHE_KEY = (userId: number) => `avatar_cache_${userId}`;

function saveAvatarToCache(userId: number, src: string) {
  // If already base64, just store it
  if (src.startsWith('data:')) {
    try { localStorage.setItem(AVATAR_CACHE_KEY(userId), src); } catch {}
    return;
  }
  // Fetch and convert to base64
  fetch(src)
    .then(r => r.blob())
    .then(blob => new Promise<string>((res, rej) => {
      const reader = new FileReader();
      reader.onloadend = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(blob);
    }))
    .then(b64 => {
      try { localStorage.setItem(AVATAR_CACHE_KEY(userId), b64); } catch {}
    })
    .catch(() => {});
}

function getCachedAvatar(userId: number): string | null {
  try { return localStorage.getItem(AVATAR_CACHE_KEY(userId)); } catch { return null; }
}

function AvatarImg({ acct, size = 40 }: { acct: RememberedAccount; size?: number }) {
  const cached = getCachedAvatar(acct.user_id);
  const [src, setSrc]     = useState<string | null>(cached);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!acct.avatar || cached) return;
    const url = `/storage/${acct.avatar}`;
    saveAvatarToCache(acct.user_id, url);
    setSrc(url);
  }, [acct.avatar, acct.user_id]);

  if (!src || error) {
    return (
      <div
        className="rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <UserCircle2 className="text-zinc-400" style={{ width: size * 0.55, height: size * 0.55 }} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }}
      onError={() => setError(true)}
    />
  );
}

// ── PIN digits component ───────────────────────────────────────────────────────
function PinInputRow({
  digits, refs, loading, onChange, onKeyDown,
}: {
  digits: string[];
  refs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  loading: boolean;
  onChange: (idx: number, val: string) => void;
  onKeyDown: (idx: number, e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex gap-2 justify-center my-4">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => onChange(i, e.target.value)}
          onKeyDown={e => onKeyDown(i, e)}
          disabled={loading}
          className="text-center font-bold border-2 rounded-lg focus:outline-none transition-colors disabled:opacity-50"
          style={{
            width: 44, height: 44,
            fontSize: 20,
            borderColor: d ? '#111' : '#d4d4d8',
            boxShadow: 'none',
          }}
        />
      ))}
    </div>
  );
}

export default function Login() {
  // ── Form state ───────────────────────────────────────────────────────────────
  const [username,       setUsername]       = useState("");
  const [password,       setPassword]       = useState("");
//   const [rememberMe,     setRememberMe]     = useState(false);
  const [showPassword,   setShowPassword]   = useState(false);
  const [loginError,     setLoginError]     = useState("");
  const [rateLimitError, setRateLimitError] = useState("");
  const [remainingTime,  setRemainingTime]  = useState(0);
  const [isRateLimited,  setIsRateLimited]  = useState(false);
  const [hasLoginError,  setHasLoginError]  = useState(false);
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [mounted,        setMounted]        = useState(false);

  // ── Saved accounts state ──────────────────────────────────────────────────────
  const [savedAccounts,  setSavedAccounts]  = useState<RememberedAccount[]>([]);
  const [showRemovePanel, setShowRemovePanel] = useState(false);
  const [showManualLogin, setShowManualLogin] = useState(false);

  // ── PIN panel (replaces right-panel form when an account is selected) ─────────
  const [pinAccount,   setPinAccount]   = useState<RememberedAccount | null>(null);
  const [pinPassword,  setPinPassword]  = useState('');
  const [showPinPw,    setShowPinPw]    = useState(false);
  const [pinError,     setPinError]     = useState('');
  const [pinLoading,   setPinLoading]   = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  // ── Init ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    checkRateLimit();
    setSavedAccounts(getRememberedAccounts());
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



  // ── Rate limit helpers ────────────────────────────────────────────────────────
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
    if (elapsed >= RATE_LIMIT_WINDOW) { localStorage.removeItem(RATE_LIMIT_KEY); setIsRateLimited(false); setRateLimitError(""); }
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

  // ── Username/password submit ──────────────────────────────────────────────────
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
      login(data.user, data.token);
      resetRateLimit();

      const avatarUrl = data.user.avatar ? `/storage/${data.user.avatar}` : null;
      if (avatarUrl) saveAvatarToCache(data.user.user_id, avatarUrl);
      rememberAccount({
        user_id:         data.user.user_id,
        username:        data.user.username,
        fname:           data.user.fname,
        lname:           data.user.lname,
        avatar:          data.user.avatar ?? null,
        role:            data.user.role,
        dept_id:         data.user.dept_id ?? null,
        department_name: data.user.department?.dept_name ?? null,
        saved_at:        Date.now(),
      });

      navigate('/dashboard');
    } catch (err: any) {
      if (err.response?.status === 429 || (err as any).isRateLimit) {
        const retryAfterSec = err.response?.headers?.['retry-after'] ?? err.response?.data?.retry_after;
        const waitMs = retryAfterSec ? parseInt(retryAfterSec, 10) * 1000 : 0;
        if (waitMs > 0) {
          localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ count: MAX_LOGIN_ATTEMPTS, timestamp: Date.now() - (RATE_LIMIT_WINDOW - waitMs) }));
          setRemainingTime(waitMs); setIsRateLimited(true); setRateLimitError("Too many attempts. Try again in ");
        } else {
          setHasLoginError(true); setLoginError(err.response?.data?.message ?? "Too many login attempts.");
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

  // ── PIN login ─────────────────────────────────────────────────────────────────
  // ── Password login (saved accounts) ──────────────────────────────────────────
  const submitPin = async () => {
    if (!pinAccount) return;
    if (!pinPassword.trim()) { setPinError('Enter your password.'); return; }
    setPinLoading(true);
    try {
      const { data } = await API.post('/auth/login-pin', { user_id: pinAccount.user_id, password: pinPassword });
      localStorage.setItem('token', data.token);
      login(data.user, data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setPinError(err.response?.data?.message ?? 'Incorrect password.');
      setPinPassword('');
    } finally {
      setPinLoading(false);
    }
  };

  const openPinPanel = (acct: RememberedAccount) => {
    setPinPassword('');
    setPinError('');
    setShowPinPw(false);
    setPinAccount(acct);
  };

  const closePinPanel = () => {
    setPinAccount(null);
    setPinPassword('');
    setPinError('');
    setShowPinPw(false);
  };

  const clearErr = () => { if (hasLoginError) { setHasLoginError(false); setLoginError(""); } };
  const fmt = (ms: number) => `${Math.ceil(ms / 1000)}s`;
  const isLoading = loading || isSubmitting;
  const hasSaved = savedAccounts.length > 0;

  const sl = (dir: "left" | "right", delay: string) =>
    `login-anim login-slide-${dir} ${mounted ? "login-in" : ""} ${delay}`;

  return (
    <>
      <style>{`
        .login-wrap * { box-sizing: border-box; }
.login-wrap { font-family: inherit; }
.login-mono  { font-family: ui-monospace, 'Cascadia Code', 'Segoe UI Mono', Menlo, monospace; }
        .login-anim { transition: opacity 0.48s cubic-bezier(.25,.8,.25,1), transform 0.48s cubic-bezier(.25,.8,.25,1); }
        .login-slide-left  { opacity: 0; transform: translateX(-22px); }
        .login-slide-right { opacity: 0; transform: translateX(22px);  }
        .login-in          { opacity: 1 !important; transform: translate(0,0) !important; }
        .d1 { transition-delay: 0.04s; } .d2 { transition-delay: 0.10s; }
        .d3 { transition-delay: 0.16s; } .d4 { transition-delay: 0.22s; }
        .d5 { transition-delay: 0.28s; } .d6 { transition-delay: 0.34s; }
        .d7 { transition-delay: 0.40s; } .d8 { transition-delay: 0.46s; }
        .feat-row { transition: background 0.14s ease, transform 0.14s ease; border-radius: 8px; }
        .feat-row:hover { background: rgba(255,255,255,0.08); transform: translateX(3px); }
        .login-input:focus-visible { outline: none; box-shadow: 0 0 0 2px hsl(240 5.9% 10%) !important; }
        .login-input.err { border-color: hsl(0 84.2% 60.2%) !important; }
        .login-input.err:focus-visible { box-shadow: 0 0 0 2px hsl(0 84.2% 60.2%) !important; }
        .acct-row { transition: background 0.12s ease; cursor: pointer; }
        .acct-row:hover { background: #f4f4f5; }
        .acct-row:active { background: #e4e4e7; }
        .remove-row { transition: background 0.12s ease; }
        .remove-row:hover { background: #fafafa; }
        .panel-fade { animation: panelFadeIn 0.22s cubic-bezier(.25,.8,.25,1) both; }
        @keyframes panelFadeIn { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: none; } }
      `}</style>

      <div className="login-wrap min-h-screen bg-zinc-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
          <div className="w-full max-w-5xl bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex flex-col lg:flex-row">

              {/* ══ LEFT PANEL ══ */}
              <div
                className="w-full lg:w-[42%] border-b lg:border-b-0 lg:border-r border-zinc-800 p-9 lg:p-12 flex flex-col justify-between min-h-[300px] lg:min-h-[600px] relative overflow-hidden"
                style={{ background: BRAND_RED }}
              >
                {/* Decorative circles */}
                <div style={{ position:'absolute', top:-60, left:-60, width:220, height:220, borderRadius:'50%', background:'rgba(255,255,255,0.07)', pointerEvents:'none' }} />
                <div style={{ position:'absolute', top:-30, left:-30, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,0.06)', pointerEvents:'none' }} />
                <div style={{ position:'absolute', bottom:-70, right:-70, width:240, height:240, borderRadius:'50%', background:'rgba(255,255,255,0.07)', pointerEvents:'none' }} />
                <div style={{ position:'absolute', bottom:-35, right:-35, width:155, height:155, borderRadius:'50%', background:'rgba(255,255,255,0.06)', pointerEvents:'none' }} />
                <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:'rgba(255,255,255,0.2)', pointerEvents:'none' }} />
                <div style={{ position:'absolute', bottom:0, left:0, right:0, height:4, background:'rgba(255,255,255,0.12)', pointerEvents:'none' }} />

                {/* Logo */}
                <div className={`flex items-center gap-3 ${sl("left","d1")}`} style={{ position:'relative', zIndex:2 }}>
                  <div className="flex-shrink-0" style={{ background:'rgba(255,255,255,0.12)', borderRadius:8, padding:4 }}>
                    <img src="/images/opol.png" alt="MBO" className="w-8 h-8 object-contain"
                      onError={e => { e.currentTarget.style.display="none"; (e.currentTarget.parentElement as HTMLElement).innerHTML='<span class="login-mono" style="font-size:11px;font-weight:600;color:#fff">MBO</span>'; }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight" style={{ color:'#fff' }}>Municipal Budget Office</p>
                    <p className="login-mono text-[11px] leading-tight tracking-wide mt-0.5" style={{ color:'rgba(255,255,255,0.5)' }}>CY {new Date().getFullYear()} · MGMT SYSTEM</p>
                  </div>
                </div>

                {/* Headline */}
                <div style={{ position:'relative', zIndex:2, flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'28px 0' }}>
                  <div className={`inline-block login-mono text-[9px] font-semibold tracking-widest uppercase mb-4 self-start px-2 py-1 rounded ${sl("left","d2")}`}
                       style={{ color:'rgba(255,255,255,0.6)', border:'0.5px solid rgba(255,255,255,0.25)' }}>
                    Budget Management
                  </div>
                  <div className={sl("left","d2")}>
                    <h1 className="leading-snug tracking-tight font-bold" style={{ fontSize:26, color:'#fff' }}>Budget planning,<br />made simple.</h1>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color:'rgba(255,255,255,0.68)' }}>Annual Budget Plan and <br/>Local Expenditure Program Preparation</p>
                  </div>
                  <div className={sl("left","d3")} style={{ width:330, height:2, background:'rgba(255,255,255,0.3)', borderRadius:2, margin:'20px 0' }} />
                  <div className="hidden lg:block">
                    <div className="space-y-1">
                      {FEATURES.map(({ icon: Icon, label, iconBg, iconColor }, i) => (
                        <div key={label} className={`feat-row flex items-center gap-3 px-3 py-2.5 cursor-default ${sl("left",`d${i+4}`)}`}>
                          <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background:iconBg, border:'0.5px solid rgba(255,255,255,0.18)' }}>
                            <Icon className="w-3.5 h-3.5" style={{ color:iconColor }} />
                          </div>
                          <span className="text-sm" style={{ color:'rgba(255,255,255,0.75)' }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className={sl("left","d8")} style={{ position:'relative', zIndex:2 }}>
                  <div style={{ height:'0.5px', background:'rgba(255,255,255,0.15)', marginBottom:10 }} />
                  <p className="login-mono text-[10px] uppercase tracking-widest" style={{ color:'rgba(255,255,255,0.35)' }}>Secure · Encrypted · Compliant</p>
                </div>
              </div>

              {/* ══ RIGHT PANEL ══ */}
              <div className="w-full lg:w-[58%] bg-white flex items-stretch">

                {/* ── REMOVE ACCOUNTS PANEL ── */}
                {showRemovePanel ? (
                  <div className="w-full p-8 lg:p-14 flex items-center panel-fade">
                    <div className="w-full max-w-sm mx-auto">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-base font-bold text-zinc-900">Remove saved accounts</h2>
                          <p className="text-xs text-zinc-400 mt-0.5">Accounts are saved on this device only.</p>
                        </div>
                        <button onClick={() => setShowRemovePanel(false)} className="text-zinc-400 hover:text-zinc-700 transition-colors p-1 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div
                        style={{
                          maxHeight: 'calc(3 * 64px + 2 * 4px)',
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          paddingRight: 2,
                        }}
                      >
                        {savedAccounts.map(acct => (
                          <div key={acct.user_id} className="remove-row flex items-center gap-3 p-3 rounded-lg border border-zinc-100">
                            <AvatarImg acct={acct} size={36} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-zinc-800 truncate">{acct.fname} {acct.lname}</p>
                              <p className="text-xs text-zinc-400 truncate">{acct.department_name ?? ROLE_LABEL[acct.role] ?? acct.role}</p>
                            </div>
                            <button
                              onClick={() => {
                                forgetAccount(acct.user_id);
                                const updated = getRememberedAccounts();
                                setSavedAccounts(updated);
                                if (updated.length === 0) setShowRemovePanel(false);
                              }}
                              className="text-xs font-medium px-3 py-1.5 rounded-md border border-zinc-200 text-zinc-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex-shrink-0"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>

                      <p className="text-xs text-zinc-400 mt-5 text-center leading-relaxed">
                        Removing an account only clears it from this device.
                      </p>
                    </div>
                  </div>

                /* ── PIN ENTRY PANEL (account selected) ── */
                // ) : pinAccount ? (
                //   <div className="w-full p-8 lg:p-14 flex items-center panel-fade">
                //     <div className="w-full max-w-sm mx-auto">
                //       {/* Back button */}
                //       <button
                //         onClick={closePinPanel}
                //         className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors mb-8"
                //       >
                //         <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                //         Back
                //       </button>

                //       {/* Account info */}
                //       <div className="flex flex-col items-center mb-6">
                //         <AvatarImg acct={pinAccount} size={72} />
                //         <p className="font-semibold text-zinc-900 text-base mt-3">{pinAccount.fname} {pinAccount.lname}</p>
                //         <p className="text-xs text-zinc-500 mt-0.5">{pinAccount.department_name ?? ROLE_LABEL[pinAccount.role] ?? pinAccount.role}</p>
                //       </div>

                //       <p className="text-center text-sm font-medium text-zinc-700 mb-1">Enter your 6-digit PIN</p>
                //       <p className="text-center text-xs text-zinc-400">to sign in to your account</p>

                //       {pinError && (
                //         <Alert variant="destructive" className="mt-4">
                //           <AlertCircle className="h-4 w-4" />
                //           <AlertDescription className="text-sm">{pinError}</AlertDescription>
                //         </Alert>
                //       )}

                //       <PinInputRow
                //         digits={pinDigits}
                //         refs={pinRefs}
                //         loading={pinLoading}
                //         onChange={handlePinDigit}
                //         onKeyDown={handlePinKey}
                //       />

                //       <Button
                //         className="w-full h-10 text-sm font-semibold"
                //         style={{ background: BRAND_RED }}
                //         onClick={() => submitPin()}
                //         disabled={pinLoading || pinDigits.join('').length < 6}
                //       >
                //         {pinLoading
                //           ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Verifying…</>
                //           : 'Sign in with PIN'}
                //       </Button>

                //       <Separator className="my-5" />
                //       <p className="text-xs text-zinc-400 text-center">Restricted to authorized personnel only.</p>
                //     </div>
                //   </div>

) : pinAccount ? (
  <div className="w-full p-8 lg:p-12 flex items-center panel-fade">
    <div className="w-full max-w-sm mx-auto">

      {/* Back */}
      <button
        onClick={closePinPanel}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12, color: '#a1a1aa', marginBottom: 28, padding: 0,
        }}
        className="hover:text-zinc-600 transition-colors"
      >
        <ChevronRight className="w-3.5 h-3.5 rotate-180" />
        Back
      </button>

      {/* Account card */}
      <div style={{
        background: '#F8F8F8',
        border: '1px solid #EBEBEB',
        borderRadius: 16,
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <AvatarImg acct={pinAccount} size={64} />
        <p style={{ fontWeight: 700, fontSize: 16, color: '#18181b', margin: '12px 0 2px' }}>
          {pinAccount.fname} {pinAccount.lname}
        </p>
        <p style={{ fontSize: 12, color: '#71717a', margin: 0 }}>
          {pinAccount.department_name ?? ROLE_LABEL[pinAccount.role] ?? pinAccount.role}
        </p>
      </div>

      {pinError && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{pinError}</AlertDescription>
        </Alert>
      )}

      <div className="mt-5 mb-4">
        <div className="relative">
          <Input
            id="pin-password"
            type={showPinPw ? 'text' : 'password'}
            value={pinPassword}
            onChange={e => { setPinPassword(e.target.value); setPinError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') submitPin(); }}
            placeholder="Enter your password"
            disabled={pinLoading}
            className="h-10 text-sm pr-10 focus-visible:ring-0"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPinPw(v => !v)}
            disabled={pinLoading}
            className="absolute inset-y-0 right-0 px-3 flex items-center text-zinc-400 hover:text-zinc-700 transition-colors disabled:opacity-40"
          >
            {showPinPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button
        className="w-full h-10 text-sm font-semibold"
        style={{ background: BRAND_RED }}
        onClick={() => submitPin()}
        disabled={pinLoading || !pinPassword.trim()}
      >
        {pinLoading
          ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Signing in…</>
          : 'Sign in'}
      </Button>

      <Separator className="my-5" />
      <p className="text-xs text-zinc-400 text-center">Restricted to authorized personnel only.</p>
    </div>
  </div>

                /* ── SAVED ACCOUNTS LIST (Facebook-style) ── */
                // ) : hasSaved ? (
                //   <div className="w-full p-8 lg:p-14 flex items-center panel-fade">
                //     <div className="w-full max-w-sm mx-auto">

                //       {/* Header with settings gear */}
                //       <div className={`flex items-start justify-between mb-6 ${sl("right","d1")}`}>
                //         <div>
                //           <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Welcome back</h2>
                //           <p className="text-sm text-zinc-500 mt-1">Choose your account to continue.</p>
                //         </div>
                //         <button
                //           onClick={() => setShowRemovePanel(true)}
                //           title="Manage saved accounts"
                //           className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors mt-0.5"
                //         >
                //           <Settings className="w-4 h-4" />
                //         </button>
                //       </div>

                //       {/* Account rows */}
                //       <div className={`space-y-1 ${sl("right","d2")}`}>
                //         {savedAccounts.map(acct => (
                //           <button
                //             key={acct.user_id}
                //             className="acct-row w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left"
                //             onClick={() => openPinPanel(acct)}
                //           >
                //             <AvatarImg acct={acct} size={44} />
                //             <div className="flex-1 min-w-0">
                //               <p className="text-sm font-semibold text-zinc-900 truncate leading-tight">{acct.fname} {acct.lname}</p>
                //               <p className="text-xs text-zinc-500 truncate mt-0.5">
                //                 {acct.department_name
                //                   ? `${acct.department_name} · ${ROLE_LABEL[acct.role] ?? acct.role}`
                //                   : ROLE_LABEL[acct.role] ?? acct.role}
                //               </p>
                //             </div>
                //             <ChevronRight className="w-4 h-4 text-zinc-300 flex-shrink-0" />
                //           </button>
                //         ))}
                //       </div>

                //       <div className={`mt-5 ${sl("right","d3")}`}>
                //         <Separator className="mb-4" />
                //         <button
                //           onClick={() => setSavedAccounts([])}
                //           className="w-full text-sm text-zinc-500 hover:text-zinc-800 transition-colors py-2 rounded-lg hover:bg-zinc-50 font-medium"
                //         >
                //           Use a different account
                //         </button>
                //       </div>

                //       <p className={`text-xs text-zinc-400 text-center mt-4 ${sl("right","d4")}`}>
                //         Restricted to authorized personnel only.
                //       </p>
                //     </div>
                //   </div>
                ) : hasSaved && !showManualLogin ? (
  <div className="w-full p-8 lg:p-12 flex items-center panel-fade">
    <div className="w-full max-w-sm mx-auto">

      {/* Header */}
      <div className={`flex items-start justify-between mb-5 ${sl("right","d1")}`}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#18181b', letterSpacing: '-0.3px', margin: 0 }}>
            Welcome back
          </h2>
          <p style={{ fontSize: 13, color: '#71717a', marginTop: 4, marginBottom: 0 }}>
            Choose your account to continue.
          </p>
        </div>
        <button
          onClick={() => setShowRemovePanel(true)}
          title="Manage saved accounts"
          style={{
            background: 'none', border: '1px solid #e4e4e7', borderRadius: 8,
            padding: '6px 8px', cursor: 'pointer', color: '#71717a', display: 'flex', alignItems: 'center',
          }}
          className="hover:bg-zinc-50 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

     {/* Account cards — max 3 visible, scrollable */}
      <div
        className={sl("right","d2")}
        style={{
  maxHeight: 'calc(3 * 72px + 2 * 8px + 4px)',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  paddingRight: 2,
  paddingTop: 4,
  paddingBottom: 4,
  marginTop: -4,
  marginBottom: -4,
}}
      >
        {savedAccounts.map((acct) => {
          return (
            <button
              key={acct.user_id}
              onClick={() => openPinPanel(acct)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                background: '#fff',
                border: '1px solid #e4e4e7',
                borderRadius: 14,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.12s, transform 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
            >
              <AvatarImg acct={acct} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#18181b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {acct.fname} {acct.lname}
                </p>
                <p style={{ fontSize: 12, color: '#71717a', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {acct.department_name
                    ? `${acct.department_name} · ${ROLE_LABEL[acct.role] ?? acct.role}`
                    : ROLE_LABEL[acct.role] ?? acct.role}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#d4d4d8' }} />
              {/* <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, flexShrink: 0 }} /> */}
            </button>
          );
       })}
      </div>

      <div className={`mt-4 ${sl("right","d3")}`}>
        <Separator className="mb-4" />
        <button
          onClick={() => setShowManualLogin(true)}
          style={{
            width: '100%', background: 'none', border: 'none',
            fontSize: 13, color: '#3b82f6', cursor: 'pointer',
            padding: '8px 0', borderRadius: 8, fontWeight: 500,
          }}
          className="hover:text-blue-700 hover:bg-blue-50 transition-colors"
        >
          Use a different account
        </button>
      </div>

      <p className={`text-xs text-zinc-400 text-center mt-3 ${sl("right","d4")}`}>
        Restricted to authorized personnel only.
      </p>
    </div>
  </div>

                /* ── NORMAL LOGIN FORM ── */
                ) : (
                  <div className="w-full p-8 lg:p-14 flex items-center">
                    <div className="w-full max-w-sm mx-auto">

                      {hasSaved && showManualLogin && (
                        <button
                          onClick={() => setShowManualLogin(false)}
                          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors mb-6"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                          Back to accounts
                        </button>
                      )}
                      <div className={`mb-8 ${sl("right","d1")}`}>
                        <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Welcome back</h2>
                        <p className="text-sm text-zinc-500 mt-1">Sign in to your account to continue.</p>
                      </div>

                      {(rateLimitError || loginError) && (
                        <Alert variant="destructive" className="mb-5" role="alert" aria-live="assertive" id="login-error">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            {rateLimitError ? `${rateLimitError}${remainingTime > 0 ? fmt(remainingTime) : ""}` : loginError}
                          </AlertDescription>
                        </Alert>
                      )}

                      <form onSubmit={handleSubmit} className="space-y-5">
                        <div className={sl("right","d2")}>
                          <Label htmlFor="username" className="text-xs font-medium text-zinc-700 mb-1.5 block">Username</Label>
                          <Input id="username" type="text" value={username}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => { setUsername(e.target.value); clearErr(); if (rateLimitError) setRateLimitError(""); }}
                            placeholder="e.g. mbo.office" disabled={isLoading || isRateLimited}
                            className={`login-input h-10 text-sm focus-visible:ring-0 ${hasLoginError ? "err" : ""}`}
                            autoComplete="username" aria-invalid={hasLoginError} aria-describedby="login-error" required />
                        </div>

                        <div className={sl("right","d3")}>
                          <Label htmlFor="password" className="text-xs font-medium text-zinc-700 mb-1.5 block">Password</Label>
                          <div className="relative">
                            <Input id="password" type={showPassword ? "text" : "password"} value={password}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => { setPassword(e.target.value); clearErr(); if (rateLimitError) setRateLimitError(""); }}
                              placeholder="Enter your password" disabled={isLoading || isRateLimited}
                              className={`login-input h-10 text-sm pr-10 focus-visible:ring-0 ${hasLoginError ? "err" : ""}`}
                              autoComplete="current-password" aria-invalid={hasLoginError} aria-describedby="login-error" required />
                            <button type="button" onClick={() => setShowPassword(v => !v)} disabled={isLoading || isRateLimited}
                              aria-label={showPassword ? "Hide password" : "Show password"}
                              className="absolute inset-y-0 right-0 px-3 flex items-center text-zinc-400 hover:text-zinc-700 transition-colors disabled:opacity-40">
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Forgot password */}
                        <div className={`flex items-center justify-end ${sl("right","d4")}`}>
                          <a href="#"
                            onClick={e => { e.preventDefault(); toast("Password assistance", { description: "Please contact your Budget Officer to reset your password.", icon: <ShieldCheck className="w-4 h-4 text-gray-900" />, duration: 5000 }); }}
                            className="text-sm text-blue-500 hover:text-blue-700 transition-colors hover:underline underline-offset-4">
                            Forgot password?
                          </a>
                        </div>

                        <div className={sl("right","d5")}>
                          <Button type="submit" disabled={isLoading || isRateLimited} className="w-full h-10 text-sm font-semibold"
                            style={{ background: isLoading || isRateLimited ? undefined : BRAND_RED, borderColor: BRAND_RED }}>
                            {isLoading
                              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /><span>Signing in…</span></>
                              : isRateLimited ? "Please wait…" : "Sign in"}
                          </Button>
                        </div>
                      </form>

                      <div className={`mt-8 ${sl("right","d6")}`}>
                        <Separator className="mb-5" />
                        <p className="text-xs text-zinc-400 text-center leading-relaxed">Restricted to authorized personnel only.</p>
                      </div>
                    </div>
                  </div>
                )}

              </div>{/* end RIGHT PANEL */}
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
