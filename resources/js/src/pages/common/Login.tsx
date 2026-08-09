import { useState, useEffect, useRef } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  Eye, EyeOff, AlertCircle, Loader2,
  Building2, BarChart3, FileText, ShieldCheck,
  X, Settings, ChevronRight,
} from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Card } from "@/src/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/src/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/src/components/ui/avatar";
import API from "../../services/api";
import LegalDialog, { type LegalTab } from "../../components/dialog/LegalDialog";
import { Input }                   from "@/src/components/ui/input";
import { Label }                   from "@/src/components/ui/label";
import { Button }                  from "@/src/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
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
const BRAND_RED          = "#151515";
const BRAND_BLUE          = "#1877F2";

// interface LoginAttempt { count: number; timestamp: number; lastUsername?: string; }
interface LoginAttempt { count: number; timestamp: number; lastUsername?: string; expiresAt?: number; }

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

function initials(fname?: string, lname?: string) {
  return `${fname?.[0] ?? ""}${lname?.[0] ?? ""}`.toUpperCase();
}

function AvatarImg({ acct, size = 40 }: { acct: RememberedAccount; size?: number }) {
  const cached = getCachedAvatar(acct.user_id);
  const [src, setSrc] = useState<string | null>(cached);

  useEffect(() => {
    if (!acct.avatar || cached) return;
    const url = `/storage/${acct.avatar}`;
    saveAvatarToCache(acct.user_id, url);
    setSrc(url);
  }, [acct.avatar, acct.user_id]);

  return (
    <Avatar style={{ width: size, height: size }} className="flex-shrink-0">
      {src && <AvatarImage src={src} alt="" className="object-cover" />}
      <AvatarFallback
        className="bg-zinc-100 text-zinc-500 font-semibold"
        style={{ fontSize: size * 0.34 }}
      >
        {initials(acct.fname, acct.lname)}
      </AvatarFallback>
    </Avatar>
  );
}

// ── Odometer digit-roll components ──────────────────────────────────────────────
function OdometerDigit({ digit }: { digit: number }) {
  return (
    <span style={{ display: 'inline-block', overflow: 'hidden', height: '1em', width: '0.62em', verticalAlign: 'bottom' }}>
      <span
        className="odometer-digit-track"
        style={{ display: 'block', transform: `translateY(-${digit * 10}%)` }}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} style={{ display: 'block', height: '1em', lineHeight: '1em', textAlign: 'center' }}>{i}</span>
        ))}
      </span>
    </span>
  );
}

function OdometerNumber({ value }: { value: string }) {
  return (
    <span style={{ display: 'inline-flex', fontVariantNumeric: 'tabular-nums' }}>
      {value.split('').map((ch, i) =>
        /\d/.test(ch)
          ? <OdometerDigit key={i} digit={parseInt(ch, 10)} />
          : <span key={i} style={{ display: 'inline-block', verticalAlign: 'bottom', transform: 'translateY(-0.28em)' }}>{ch}</span>
      )}
    </span>
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
  const [showRemoveInfo,  setShowRemoveInfo]  = useState(false);
 const [showManualLogin, setShowManualLogin] = useState(false);

  // ── Legal modal (Privacy Policy / Terms of Use) ───────────────────────────────
  const [legalModal, setLegalModal] = useState<LegalTab | null>(null);

  // ── PIN panel (replaces right-panel form when an account is selected) ─────────
  const [pinAccount,   setPinAccount]   = useState<RememberedAccount | null>(null);
  const [pinPassword,  setPinPassword]  = useState('');
  const [showPinPw,    setShowPinPw]    = useState(false);
  const [pinError,     setPinError]     = useState('');
  const [pinLoading,   setPinLoading]   = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  // ── Maintenance mode notice ────────────────────────────────────────────────────
  const [maintenanceNotice, setMaintenanceNotice] = useState<string | null>(null);

  // ── Floating budget card (decorative, column 2) ───────────────────────────────
  const BUDGET_CURRENT_YEAR = 1170428.28;
  const [budgetValue, setBudgetValue] = useState(1964225.05);

  useEffect(() => {
    const id = setInterval(() => {
      setBudgetValue(prev => {
        const delta = (Math.random() - 0.5) * 180000; // even chance up or down
        const next = prev + delta;
        const floor = BUDGET_CURRENT_YEAR * 1.05;
        const ceiling = BUDGET_CURRENT_YEAR * 1.3;
        if (next < floor) return floor;
        if (next > ceiling) return ceiling;
        return next;
      });
    }, 8000); // update every 8s
    return () => clearInterval(id);
  }, []);

  const budgetDiff = budgetValue - BUDGET_CURRENT_YEAR;
  const budgetPct  = (budgetDiff / BUDGET_CURRENT_YEAR) * 100;
  const budgetUp   = budgetDiff >= 0;
  const fmtPeso = (n: number) =>
    `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ── Init ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    checkRateLimit();
    setSavedAccounts(getRememberedAccounts());
    return () => { clearTimeout(t); if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Heads-up banner only — doesn't block anyone from attempting to sign in.
  // The backend (login endpoint) is the actual source of truth on who gets through.
  useEffect(() => {
    API.get('/maintenance/status')
      .then(({ data }) => {
        if (data?.maintenance_mode) {
          setMaintenanceNotice(
            data.maintenance_message ?? "We're currently performing scheduled maintenance. Some accounts may be temporarily unable to sign in. Please check back shortly."
          );
        }
      })
      .catch(() => {});
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

    // Server-issued lockout has its own expiry — use it directly instead of
    // re-deriving it from the 60s client window (that math breaks for any
    // lockout longer than RATE_LIMIT_WINDOW and can push timestamps into
    // the future, producing multi-day "remaining time" bugs).
    if (a.expiresAt) {
      const rem = a.expiresAt - Date.now();
      if (rem > 0) {
        setRemainingTime(rem); setIsRateLimited(true);
        setRateLimitError("Too many attempts. Try again in ");
        return true;
      }
      localStorage.removeItem(RATE_LIMIT_KEY); setIsRateLimited(false); setRateLimitError("");
      return false;
    }

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
      if (err.response?.status === 503 && err.response?.data?.maintenance_mode) {
        navigate('/maintenance');
        return;
      }
      if (err.response?.status === 429 || (err as any).isRateLimit) {
        const retryAfterSec = err.response?.headers?.['retry-after'] ?? err.response?.data?.retry_after;
        const waitMs = retryAfterSec ? parseInt(retryAfterSec, 10) * 1000 : 0;
        if (waitMs > 0) {
          localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ count: MAX_LOGIN_ATTEMPTS, timestamp: Date.now(), expiresAt: Date.now() + waitMs }));
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
      if (err.response?.status === 503 && err.response?.data?.maintenance_mode) {
        navigate('/maintenance');
        return;
      }
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

  const MIN_PASSWORD_LEN = 8;
  const MAX_FIELD_LEN = 32;
  const isFormValid =
    username.trim().length > 0 && username.trim().length <= MAX_FIELD_LEN &&
    password.trim().length >= MIN_PASSWORD_LEN && password.trim().length <= MAX_FIELD_LEN;

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
        .budget-float { animation: budgetFloat 5s ease-in-out infinite; will-change: transform; }
        @keyframes budgetFloat {
          0%, 100% { transform: translateY(-10px); }
          50% { transform: translateY(10px); }
        }
        .budget-float-2 { animation: budgetFloat2 6.5s ease-in-out infinite; animation-delay: 0.4s; will-change: transform; }
        @keyframes budgetFloat2 {
          0%, 100% { transform: translateY(8px); }
          50% { transform: translateY(-9px); }
        }
        .budget-float-3 { animation: budgetFloat3 4.2s ease-in-out infinite; animation-delay: 0.9s; will-change: transform; }
        @keyframes budgetFloat3 {
          0%, 100% { transform: translateY(-6px); }
          50% { transform: translateY(11px); }
        }
        .budget-float-4 { animation: budgetFloat4 7s ease-in-out infinite; animation-delay: 0.2s; will-change: transform; }
        @keyframes budgetFloat4 {
          0%, 100% { transform: translateY(9px); }
          50% { transform: translateY(-7px); }
        }
        .odometer-digit-track { transition: transform 0.7s cubic-bezier(.22,1,.36,1); }
      `}</style>

      <div className="login-wrap h-screen bg-white flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">

        {/* ══ COLUMN 1 — plain logo mark top, headline pinned to bottom, 20% width ══ */}
        <div className="hidden lg:flex flex-col justify-between px-10 py-10" style={{ width: '22%' }}>
          <div className={sl("left","d1")}>
            <img src="/images/opol.png" alt="MBO" className="w-14 h-14 object-contain"
              onError={e => { e.currentTarget.style.display="none"; (e.currentTarget.parentElement as HTMLElement).innerHTML='<span class="login-mono" style="font-size:11px;font-weight:600;color:#151515">MBO</span>'; }} />
          </div>

          <h1 className={`font-bold tracking-tight text-zinc-900 ${sl("left","d2")}`} style={{ fontSize: 52, lineHeight: 1.15 }}>
            Simplifying Municipal <span style={{ color: BRAND_BLUE }}>Budget Planning.</span>
          </h1>
        </div>

        {/* ══ COLUMN 2 — Lottie animation, 45% width ══ */}
        <div className="hidden lg:flex items-center justify-center px-8 py-10 relative" style={{ width: '43%' }}>
          <div className={`relative ${sl("right","d2")}`} style={{ width: '100%', maxWidth:800, zIndex: 3 }}>
            <DotLottieReact
              src="/animations/login.lottie"
              loop
              autoplay
              style={{ width: '100%', height: 'auto' }}
            />
          </div>

          {/* Floating animated budget card */}
          <div
            className={sl("right","d4")}
            style={{
              position: 'absolute',
              bottom: '8%',
              right: '4%',
              width: 260,
              zIndex: 5,
            }}
          >
            <div className="budget-float">
            <div
              style={{
                background: '#fff',
                border: '1px solid #e4e4e7',
                borderRadius: 16,
                padding: 16,
                boxShadow: '0 20px 40px -12px rgba(0,0,0,0.18)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ width: 32, height: 32, background: '#f4f4f5', fontSize: 14 }}
                >
                  🏛️
                </div>
                <span
                  className="flex items-center gap-1"
                  style={{
                    fontSize: 11, fontWeight: 600, color: '#71717a',
                    background: '#f4f4f5', borderRadius: 999,
                    padding: '3px 8px',
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: 999, background: '#71717a', display: 'inline-block' }} />
                  Draft
                </span>
              </div>

              <p style={{ fontSize: 11, color: '#a1a1aa', margin: 0 }}>Office of the Municipal Budget Office</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#18181b', margin: '2px 0 8px' }}>MBO</p>

              <span
                style={{
                  display: 'inline-block', fontSize: 11, fontWeight: 500, color: '#2563eb',
                  background: '#eff6ff', borderRadius: 999, padding: '3px 10px', marginBottom: 14,
                }}
              >
                General Public Services
              </span>

              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 11, color: '#f59e0b', fontWeight: 500, margin: 0 }}>Proposed</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: budgetUp ? '#ea580c' : '#dc2626', margin: '2px 0' }}>
                  <OdometerNumber value={fmtPeso(budgetValue)} />
                </p>
                <p
                  style={{
                    fontSize: 11, fontWeight: 600, margin: 0,
                    color: budgetUp ? '#059669' : '#dc2626',
                  }}
                >
                  {budgetUp ? '↑' : '↓'} {fmtPeso(Math.abs(budgetDiff))} ({Math.abs(budgetPct).toFixed(1)}%) vs. current year
                </p>
              </div>
            </div>
            </div>
          </div>

          {/* Draft — behind Lottie, top-left, small */}
          <div
            className={sl("right","d3")}
            style={{ position: 'absolute', top: '44%', left: '13%', width: 190, zIndex: 1 }}
          >
            <div className="budget-float-2">
              <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 14, padding: 14, boxShadow: '0 14px 30px -10px rgba(0,0,0,0.14)', opacity: 0.92 }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 26, height: 26, background: '#f4f4f5', fontSize: 12 }}>📝</div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#71717a', background: '#f4f4f5', borderRadius: 999, padding: '2px 7px' }}>Draft</span>
                </div>
                <p style={{ fontSize: 10, color: '#a1a1aa', margin: 0 }}>Office of the Municipal Accounting</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#18181b', margin: '2px 0 6px' }}>ACCOUNTING</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#52525b', margin: 0, filter: 'blur(4px)', userSelect: 'none' }}>₱1,340,000.00</p>
              </div>
            </div>
          </div>

          {/* Submitted — behind Lottie, top-right, medium */}
          <div
            className={sl("right","d5")}
            style={{ position: 'absolute', top: '25%', right: '16%', width: 215, zIndex: 2 }}
          >
            <div className="budget-float-3">
              <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 15, padding: 15, boxShadow: '0 16px 34px -10px rgba(0,0,0,0.15)', opacity: 0.95 }}>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 28, height: 28, background: '#eff6ff', fontSize: 13 }}>📤</div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#2563eb', background: '#eff6ff', borderRadius: 999, padding: '2px 8px' }}>Submitted</span>
                </div>
                <p style={{ fontSize: 10, color: '#a1a1aa', margin: 0 }}>Office of the Municipal Planning and Development Coordinator</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#18181b', margin: '2px 0 6px' }}>MPDC</p>
                <p style={{ fontSize: 17, fontWeight: 800, color: '#2563eb', margin: 0, filter: 'blur(4px)', userSelect: 'none' }}>₱2,905,600.00</p>
              </div>
            </div>
          </div>

          {/* Under Review — in front, bottom-left, large */}
          <div
            className={sl("right","d6")}
            style={{ position: 'absolute', bottom: '20%', left: '10%', width: 235, zIndex: 6 }}
          >
            <div className="budget-float-4">
              <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 16, padding: 16, boxShadow: '0 18px 38px -12px rgba(0,0,0,0.17)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 30, height: 30, background: '#fffbeb', fontSize: 14 }}>🔍</div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#b45309', background: '#fffbeb', borderRadius: 999, padding: '3px 9px' }}>Under Review</span>
                </div>
                <p style={{ fontSize: 10, color: '#a1a1aa', margin: 0 }}>Office of the Municipal Mayor</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#18181b', margin: '2px 0 6px' }}>M.O.</p>
                <p style={{ fontSize: 19, fontWeight: 800, color: '#b45309', margin: 0, filter: 'blur(4px)', userSelect: 'none' }}>₱4,178,900.00</p>
              </div>
            </div>
          </div>
        </div>

        {/* ══ COLUMN 3 — login, 40% width ══ */}
        <div className="w-full flex-shrink-0 lg:border-l border-zinc-200 flex flex-col overflow-y-auto" style={{ width: undefined }}
             data-col="login">
          <style>{`@media (min-width: 1024px) { [data-col="login"] { width: 35% !important; } }`}</style>

          {/* Mobile-only logo (desktop shows it in the left zone instead) */}
          <div className="lg:hidden flex items-center gap-3 p-6">
            <div className="flex-shrink-0 bg-zinc-100 rounded-lg p-1.5">
              <img src="/images/opol.png" alt="MBO" className="w-9 h-9 object-contain"
                onError={e => { e.currentTarget.style.display="none"; (e.currentTarget.parentElement as HTMLElement).innerHTML='<span class="login-mono" style="font-size:11px;font-weight:600;color:#151515">MBO</span>'; }} />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-zinc-900">Municipal Budget Office</p>
              <p className="login-mono text-[10px] leading-tight tracking-wide mt-0.5 text-zinc-400">CY {new Date().getFullYear()} · MGMT SYSTEM</p>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center px-6 py-6">
            <div className="w-full max-w-lg">

                {/* ── SAVED ACCOUNTS LIST (Facebook-style) ── */}
                {hasSaved && !showManualLogin ? (
  <div className="w-full py-8 flex items-center panel-fade">
    <div className="w-full max-w-lg mx-auto">

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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowRemovePanel(true)}
          title="Manage saved accounts"
          className="h-9 w-9 text-zinc-700 hover:bg-zinc-100 rounded-full"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {maintenanceNotice && (
        <Alert className="mb-5 border-amber-200 bg-amber-50 text-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-sm font-semibold text-amber-800">System Maintenance</AlertTitle>
          <AlertDescription className="text-sm text-amber-700">
            {maintenanceNotice}
          </AlertDescription>
        </Alert>
      )}

     {/* Account cards — max 3 visible, scrollable */}
      <div
        className={sl("right","d2")}
        style={{
  maxHeight: savedAccounts.length > 3 ? 'calc(3 * 80px + 2 * 4px)' : 'none',
  overflowY: savedAccounts.length > 3 ? 'auto' : 'visible',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  paddingRight: savedAccounts.length > 3 ? 6 : 0,
}}
      >
        {savedAccounts.map((acct) => (
          <button
            key={acct.user_id}
            onClick={() => openPinPanel(acct)}
            className="group w-full flex items-center gap-4 px-2 py-4 bg-white rounded-lg text-left transition-colors duration-150 hover:bg-zinc-100"
          >
            <AvatarImg acct={acct} size={48} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-900 truncate">
                {acct.fname} {acct.lname}
              </p>
              <p className="text-xs text-zinc-500 truncate mt-0.5">
                {acct.department_name
                  ? `${acct.department_name} · ${ROLE_LABEL[acct.role] ?? acct.role}`
                  : ROLE_LABEL[acct.role] ?? acct.role}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 flex-shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-500" />
          </button>
        ))}
      </div>

      <div className={`mt-6 ${sl("right","d3")}`}>
        <Button
          variant="outline"
          onClick={() => setShowManualLogin(true)}
          className="w-full h-10 text-sm font-semibold text-zinc-900 border-zinc-300 hover:bg-zinc-50"
        >
          Use a different account
        </Button>
      </div>

      <p className={`text-xs text-zinc-400 text-center mt-8 ${sl("right","d4")}`}>
        Restricted to authorized personnel only.
      </p>
    </div>
  </div>

                /* ── NORMAL LOGIN FORM ── */
                ) : (
                  <div className="w-full py-8 flex items-center">
                    <div className="w-full max-w-lg mx-auto">

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

                      {maintenanceNotice && (
                        <Alert className="mb-5 border-amber-200 bg-amber-50 text-amber-800">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <AlertTitle className="text-sm font-semibold text-amber-800">System Maintenance</AlertTitle>
                          <AlertDescription className="text-sm text-amber-700">
                            {maintenanceNotice}
                          </AlertDescription>
                        </Alert>
                      )}

                      {(rateLimitError || loginError) && (
                        <Alert variant="destructive" className="mb-5 flex items-center gap-2" role="alert" aria-live="assertive" id="login-error">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          <AlertDescription className="text-sm !mt-0 !translate-y-0">
                            {rateLimitError ? `${rateLimitError}${remainingTime > 0 ? fmt(remainingTime) : ""}` : loginError}
                          </AlertDescription>
                        </Alert>
                      )}

                      <form onSubmit={handleSubmit} className="space-y-5">
                        <div className={sl("right","d2")}>
                          <Label htmlFor="username" className="text-xs font-medium text-zinc-700 mb-1.5 block">Username</Label>
                          <Input id="username" type="text" value={username} maxLength={MAX_FIELD_LEN}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => { setUsername(e.target.value); clearErr(); if (rateLimitError) setRateLimitError(""); }}
                            placeholder="e.g. mbo.office" disabled={isLoading || isRateLimited}
                            className={`login-input h-10 text-sm focus-visible:ring-0 ${hasLoginError ? "err" : ""}`}
                            autoComplete="username" aria-invalid={hasLoginError} aria-describedby="login-error" required />
                        </div>

                        <div className={sl("right","d3")}>
                          <Label htmlFor="password" className="text-xs font-medium text-zinc-700 mb-1.5 block">Password</Label>
                          <div className="relative">
                            <Input id="password" type={showPassword ? "text" : "password"} value={password} maxLength={MAX_FIELD_LEN}
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
                          <Button type="submit" disabled={isLoading || isRateLimited || !isFormValid} className="w-full h-10 text-sm font-semibold"
                            style={{ background: (isLoading || isRateLimited || !isFormValid) ? undefined : BRAND_RED, borderColor: BRAND_RED }}>
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

              </div>{/* end max-w-xs */}
          </div>{/* end centered login content */}
        </div>{/* end right zone */}
        </div>{/* end content row */}

        <footer className="border-t border-zinc-200 py-4 text-center">
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            {" "}
            <button type="button" onClick={() => setLegalModal('terms')} className="text-blue-500 hover:underline underline-offset-2 font-medium">Terms of Use</button>
            {" "}and{" "}
            <button type="button" onClick={() => setLegalModal('privacy')} className="text-blue-500 hover:underline underline-offset-2 font-medium">Privacy Policy</button>.
          </p>
          <p className="login-mono text-[11px] text-zinc-500 tracking-wide mt-2">
            © {new Date().getFullYear()} Municipal Budget Office Management System
          </p>
        </footer>
      </div>

      <LegalDialog open={legalModal} onOpenChange={setLegalModal} />

      {/* ── PIN / Password login modal (Facebook-style) ── */}
      <Dialog open={!!pinAccount} onOpenChange={(open) => { if (!open) closePinPanel(); }}>
        <DialogContent className="max-w-[550px] rounded-2xl p-8 text-center">
          {pinAccount && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>Sign in as {pinAccount.fname} {pinAccount.lname}</DialogTitle>
                <DialogDescription>Enter your password to continue.</DialogDescription>
              </DialogHeader>

              <div className="flex flex-col items-center mt-10 mb-0">
                <AvatarImg acct={pinAccount} size={160} />
                <p className="font-bold text-xl text-zinc-900 mt-10 mb-0">
                  {pinAccount.fname} {pinAccount.lname}
                </p>
              </div>

              {pinError && (
                <Alert variant="destructive" className="mb-4 text-left">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{pinError}</AlertDescription>
                </Alert>
              )}

              <div className="relative mb-0">
                <Input
                  id="pin-password"
                  type={showPinPw ? 'text' : 'password'}
                  value={pinPassword}
                  onChange={e => { setPinPassword(e.target.value); setPinError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') submitPin(); }}
                  placeholder="Password"
                  disabled={pinLoading}
                  className="h-11 text-sm pr-10 focus-visible:ring-0"
                  autoComplete="current-password"
                  autoFocus
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

              <Button
                className="w-full h-11 text-sm font-semibold"
                style={{ background: BRAND_RED }}
                onClick={() => submitPin()}
                disabled={pinLoading || pinPassword.trim().length < MIN_PASSWORD_LEN}
              >
                {pinLoading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Signing in…</>
                  : 'Log in'}
              </Button>

              <button
                type="button"
                onClick={() => toast("Password assistance", { description: "Please contact your Budget Officer to reset your password.", icon: <ShieldCheck className="w-4 h-4 text-gray-900" />, duration: 5000 })}
                className="text-sm text-blue-500 hover:text-blue-700 hover:underline underline-offset-4 transition-colors mt-4"
              >
                Forgot password?
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Remove saved accounts modal ── */}
      <Dialog open={showRemovePanel} onOpenChange={(open) => { setShowRemovePanel(open); if (!open) setShowRemoveInfo(false); }}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold text-zinc-900">Remove saved accounts</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Accounts are saved on this device only.
            </DialogDescription>
          </DialogHeader>

          <div
            className="mt-2 rounded-lg border border-zinc-100 overflow-y-auto"
            style={{ maxHeight: 'calc(3 * 64px)' }}
          >
            {savedAccounts.map((acct, idx) => (
              <div
                key={acct.user_id}
                className={`remove-row flex items-center gap-3 p-3 ${idx > 0 ? 'border-t border-zinc-100' : ''}`}
              >
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
                  className="text-xs font-medium px-3 py-1.5 rounded-full border border-zinc-200 text-zinc-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <p className="text-xs text-zinc-500 leading-relaxed">
              <button
                type="button"
                onClick={() => setShowRemoveInfo(v => !v)}
                className="text-blue-500 hover:underline underline-offset-2 font-medium"
              >
                Learn more
              </button>
              {" "}about why you see accounts here and what removing them means.
            </p>

            {showRemoveInfo && (
              <p className="text-xs text-zinc-500 leading-relaxed mt-2 panel-fade">
                Signing in saves your name, avatar, and role in this browser's local storage so you can sign back in faster next time — no password is stored. Removing an account here only deletes that shortcut from this device; it doesn't deactivate, log out, or affect the account itself. You can always sign back in manually using "Use a different account."
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
