import React from "react";
import { theme } from "./styles";
import { supabase } from "../lib/supabase";
import { AppIcon, IconBubble } from "./Icon";
import { useLang } from "../hooks/useLang";
import {
  AUTO_LOGOUT_REASON_INACTIVITY,
  AUTO_LOGOUT_REASON_STORAGE_KEY,
  LAST_ACTIVITY_STORAGE_KEY,
  getAutoLogoutMessage,
} from "./session/sessionTimeoutConfig";
import {
  clearAutoLogoutResumeContext,
  readAutoLogoutResumeContext,
  restoreResumeRoute,
} from "./session/sessionResumeStorage";

const tc = theme.colors;

const LOGIN_MOTION_STYLES = `
@keyframes loginGridDrift {
  0% { background-position: 0 0, 0 0; }
  100% { background-position: 180px 120px, -140px 160px; }
}
@keyframes loginDiamondParallax {
  0% { transform: translate3d(-1.5%, -1%, 0); opacity: 0.24; }
  50% { transform: translate3d(1%, 1.25%, 0); opacity: 0.32; }
  100% { transform: translate3d(-1%, 1.8%, 0); opacity: 0.24; }
}
@keyframes loginAccentPulse {
  0% { opacity: 0.05; }
  50% { opacity: 0.11; }
  100% { opacity: 0.05; }
}
@keyframes loginIconFloat {
  0% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0); }
}
@keyframes loginButtonGlow {
  0% { box-shadow: 0 8px 30px rgba(212,175,55,0.18); }
  50% { box-shadow: 0 10px 36px rgba(212,175,55,0.28); }
  100% { box-shadow: 0 8px 30px rgba(212,175,55,0.18); }
}
@keyframes loginFadeSlide {
  0% { opacity: 0; transform: translateY(-8px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes loginSubtleShake {
  0%, 100% { transform: translateX(0); }
  15% { transform: translateX(7px); }
  30% { transform: translateX(-7px); }
  45% { transform: translateX(4px); }
  60% { transform: translateX(-4px); }
  75% { transform: translateX(2px); }
}
@keyframes loginSpinner {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.login-page {
  position: relative;
  overflow: hidden;
  --login-bg: radial-gradient(ellipse 88% 58% at 50% -18%, rgba(212,175,55,0.12), #f8f3e7 62%);
  --login-card-bg: rgba(255,255,255,0.96);
  --login-card-border: rgba(128,91,11,0.16);
  --login-card-shadow: 0 24px 60px rgba(15,23,42,0.12), 0 0 0 1px rgba(128,91,11,0.06);
  --login-text: #142133;
  --login-muted: #5b6675;
  --login-input-bg: rgba(255,255,255,0.98);
  --login-input-border: rgba(15,23,42,0.16);
  --login-input-placeholder: #7a8698;
  --login-accent-soft: rgba(128,91,11,0.08);
  --login-accent-border: rgba(128,91,11,0.14);
}
html[data-theme="dark"] .login-page {
  --login-bg: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(26,107,58,.35), #060d1a);
  --login-card-bg: rgba(10,22,45,.85);
  --login-card-border: rgba(212,175,55,.2);
  --login-card-shadow: 0 24px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(212,175,55,.08);
  --login-text: #f8fafc;
  --login-muted: #94a3b8;
  --login-input-bg: rgba(255,255,255,.05);
  --login-input-border: rgba(212,175,55,.2);
  --login-input-placeholder: rgba(148,163,184,.72);
  --login-accent-soft: rgba(212,175,55,.05);
  --login-accent-border: rgba(212,175,55,.15);
}
.login-geometry {
  position: fixed;
  pointer-events: none;
  inset: -25%;
  z-index: 0;
}
.login-geometry--grid {
  background-image:
    linear-gradient(90deg, rgba(212,175,55,0.09) 1px, transparent 1px),
    linear-gradient(0deg, rgba(15,84,77,0.08) 1px, transparent 1px);
  background-size: 72px 72px, 72px 72px;
  background-position: 0 0, 0 0;
  mix-blend-mode: screen;
  animation: loginGridDrift 90s linear infinite;
  opacity: 0.28;
}
.login-geometry--diagonal {
  background-image:
    repeating-linear-gradient(45deg, transparent 0 27px, rgba(212,175,55,0.08) 27px 28px, transparent 28px 56px),
    repeating-linear-gradient(-45deg, transparent 0 27px, rgba(26,107,58,0.09) 27px 28px, transparent 28px 56px);
  background-size: 160px 160px, 160px 160px;
  mix-blend-mode: lighten;
  animation: loginDiamondParallax 60s ease-in-out infinite alternate;
}
.login-geometry--accent {
  background-image:
    linear-gradient(90deg, rgba(212,175,55,0.04) 1px, transparent 1px),
    linear-gradient(0deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 18px 18px, 18px 18px;
  background-position: 9px 9px, 0 0;
  animation: loginAccentPulse 45s ease-in-out infinite alternate;
  opacity: 0.07;
}
.login-card {
  transition: transform 0.5s ease, box-shadow 0.5s ease;
  z-index: 1;
}
.login-card--shake {
  animation: loginSubtleShake 0.55s ease;
}
.login-icon {
  animation: loginIconFloat 6s ease-in-out infinite;
}
.login-input {
  border: 1px solid var(--login-input-border);
  background: var(--login-input-bg);
  color: var(--login-text);
  transition: border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
}
.login-input::placeholder {
  color: var(--login-input-placeholder);
}
.login-input:focus,
.login-input:focus-visible {
  border-color: rgba(212,175,55,0.65);
  background: var(--login-input-bg);
  box-shadow: 0 0 0 3px rgba(212,175,55,0.15), 0 12px 30px rgba(0,0,0,0.12);
}
.login-input:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.login-password-wrap {
  position: relative;
}
.login-password-toggle {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--login-muted);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: color 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}
.login-password-toggle:hover:not(:disabled),
.login-password-toggle:focus-visible {
  color: #b8941e;
  background: rgba(212,175,55,0.1);
  border-color: rgba(212,175,55,0.22);
  outline: none;
}
.login-password-toggle:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.login-button {
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.35s ease, filter 0.35s ease;
}
.login-button:not(:disabled):hover {
  box-shadow: 0 12px 32px rgba(212,175,55,0.4);
  filter: brightness(1.05);
}
.login-button:not(:disabled):active {
  transform: translateY(1px) scale(0.995);
}
.login-button[data-loading="true"] {
  cursor: not-allowed;
  box-shadow: none;
  filter: saturate(0.8);
}
.login-button-glow {
  animation: loginButtonGlow 5s ease-in-out infinite;
}
.login-error {
  animation: loginFadeSlide 0.4s ease;
}
.login-spinner {
  animation: loginSpinner 0.9s linear infinite;
}
@media (max-width: 520px) {
  .login-card {
    padding: 32px 24px !important;
  }
}
@media (prefers-reduced-motion: reduce) {
  .login-geometry,
  .login-icon,
  .login-button-glow,
  .login-card--shake {
    animation: none !important;
  }
}
`

const PASSWORD_TOGGLE_LABELS = {
  ar: {
    show: "إظهار كلمة السر",
    hide: "إخفاء كلمة السر",
  },
  fr: {
    show: "Afficher le mot de passe",
    hide: "Masquer le mot de passe",
  },
  en: {
    show: "Show password",
    hide: "Hide password",
  },
};

const RESUME_LABELS = {
  ar: {
    title: "استئناف الجلسة",
    message: "تم تسجيل خروجك تلقائيا بسبب عدم النشاط. أدخل كلمة المرور لمتابعة العمل من حيث توقفت.",
    emailLabel: "الحساب",
    passwordLabel: "كلمة المرور",
    primary: "متابعة العمل",
    loading: "جاري استئناف الجلسة...",
    switchAccount: "تسجيل الدخول بحساب آخر",
    invalidCredentials: "كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.",
    expired: "انتهت صلاحية استئناف الجلسة. يرجى تسجيل الدخول من جديد.",
    passwordRequired: "الرجاء إدخال كلمة المرور",
  },
  fr: {
    title: "Reprendre la session",
    message: "Votre session a expiré en raison de votre inactivité. Saisissez votre mot de passe pour reprendre votre travail là où vous vous êtes arrêté.",
    emailLabel: "Compte",
    passwordLabel: "Mot de passe",
    primary: "Reprendre le travail",
    loading: "Reprise de la session...",
    switchAccount: "Se connecter avec un autre compte",
    invalidCredentials: "Mot de passe incorrect. Veuillez réessayer.",
    expired: "La reprise de session a expiré. Veuillez vous reconnecter.",
    passwordRequired: "Veuillez saisir votre mot de passe",
  },
  en: {
    title: "Resume session",
    message: "You were automatically signed out due to inactivity. Enter your password to continue where you left off.",
    emailLabel: "Account",
    passwordLabel: "Password",
    primary: "Continue working",
    loading: "Resuming session...",
    switchAccount: "Sign in with another account",
    invalidCredentials: "Incorrect password. Please try again.",
    expired: "The resume session has expired. Please sign in again.",
    passwordRequired: "Please enter your password",
  },
};

export default function LoginPage({ onLogin }) {
  const { lang, dir } = useLang();
  const [email,    setEmail]    = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading,  setLoading]  = React.useState(false);
  const [error,    setError]    = React.useState("");
  const [sessionNoticeReason, setSessionNoticeReason] = React.useState("");
  const [resumeContext, setResumeContext] = React.useState(null);
  const [resumeExpired, setResumeExpired] = React.useState(false);
  const styleInjected = React.useRef(false);
  const cardRef       = React.useRef(null);

  // Forgot password state
  const [showReset,    setShowReset]    = React.useState(false);
  const [resetEmail,   setResetEmail]   = React.useState("");
  const [resetLoading, setResetLoading] = React.useState(false);
  const [resetSent,    setResetSent]    = React.useState(false);
  const [resetError,   setResetError]   = React.useState("");

  React.useEffect(() => {
    if (styleInjected.current) return;
    const existing = document.getElementById("login-motion-styles");
    if (existing) {
      styleInjected.current = true;
      return;
    }
    const style = document.createElement("style");
    style.id = "login-motion-styles";
    style.innerHTML = LOGIN_MOTION_STYLES;
    document.head.appendChild(style);
    styleInjected.current = true;
  }, []);

  React.useEffect(() => {
    const { context, expired } = readAutoLogoutResumeContext();
    if (context?.email) {
      setResumeContext(context);
      setEmail(context.email);
    } else if (expired) {
      setResumeExpired(true);
    }

    try {
      const reason = window.sessionStorage.getItem(AUTO_LOGOUT_REASON_STORAGE_KEY);
      if (reason === AUTO_LOGOUT_REASON_INACTIVITY && !context?.email) setSessionNoticeReason(reason);
      window.sessionStorage.removeItem(AUTO_LOGOUT_REASON_STORAGE_KEY);
    } catch {
      /* Ignore sessionStorage errors on the login screen. */
    }
  }, []);

  React.useEffect(() => {
    if (!cardRef.current) return;
    if (!error) {
      cardRef.current.classList.remove("login-card--shake");
      return;
    }
    const el = cardRef.current;
    el.classList.remove("login-card--shake");
    void el.offsetWidth;
    el.classList.add("login-card--shake");
    const timer = setTimeout(() => el.classList.remove("login-card--shake"), 650);
    return () => clearTimeout(timer);
  }, [error]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) { setResetError("الرجاء إدخال بريدك الإلكتروني"); return; }
    setResetError("");
    setResetLoading(true);

    const { error: err } = await supabase.auth.resetPasswordForEmail(
      resetEmail.trim().toLowerCase(),
      { redirectTo: process.env.REACT_APP_SITE_URL || window.location.origin }
    );

    setResetLoading(false);

    if (err) {
      if (err.message?.includes("rate limit")) {
        setResetError("تجاوزت الحد المسموح — انتظر بضع دقائق وحاول مرة أخرى");
      } else {
        setResetError(err.message);
      }
    } else {
      setResetSent(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("الرجاء إدخال البريد الإلكتروني وكلمة السر"); return; }
    setError("");
    setSessionNoticeReason("");
    setResumeExpired(false);
    setLoading(true);
    try {
      await onLogin(email.trim().toLowerCase(), password);
      try {
        window.localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(Date.now()));
      } catch {
        /* Ignore activity persistence failure; authenticated guard will recover. */
      }
    } catch (err) {
      const code = err?.message || "";
      if (code.includes("Invalid login credentials"))
        setError("البريد الإلكتروني أو كلمة السر غير صحيحة");
      else if (code.includes("Email not confirmed"))
        setError("يرجى تأكيد البريد الإلكتروني أولاً");
      else
        setError(code || "حدث خطأ في تسجيل الدخول — تحقق من الاتصال بالإنترنت");
      setLoading(false);
    }
    // On success: useAuth sets user+agencyId → AuthGate re-renders automatically
    // setLoading(false) not needed here — the component will unmount
  };

  const handleResumeSubmit = async (e) => {
    e.preventDefault();
    const resumeEmail = String(resumeContext?.email || "").trim().toLowerCase();
    const resumeLabels = RESUME_LABELS[lang] || RESUME_LABELS.ar;
    if (!resumeEmail) {
      clearAutoLogoutResumeContext();
      setResumeContext(null);
      setResumeExpired(true);
      setError("");
      return;
    }
    if (!password) {
      setError(resumeLabels.passwordRequired);
      return;
    }

    setError("");
    setLoading(true);
    try {
      await onLogin(resumeEmail, password);
      try {
        window.localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(Date.now()));
      } catch {
        /* Ignore activity persistence failure; authenticated guard will recover. */
      }
      const route = resumeContext?.route || "";
      clearAutoLogoutResumeContext();
      setPassword("");
      restoreResumeRoute(route);
    } catch {
      setError(resumeLabels.invalidCredentials);
      setPassword("");
      setLoading(false);
    }
  };

  const handleSwitchAccount = () => {
    clearAutoLogoutResumeContext();
    setResumeContext(null);
    setResumeExpired(false);
    setSessionNoticeReason("");
    setError("");
    setPassword("");
    setEmail("");
    setShowReset(false);
    setResetSent(false);
    setResetError("");
  };

  const isRTL = dir === "rtl" || lang === "ar";
  const passwordLabels = PASSWORD_TOGGLE_LABELS[lang] || PASSWORD_TOGGLE_LABELS.ar;
  const resumeLabels = RESUME_LABELS[lang] || RESUME_LABELS.ar;
  const isResumeMode = Boolean(resumeContext?.email);
  const sessionNotice = resumeExpired
    ? resumeLabels.expired
    : sessionNoticeReason === AUTO_LOGOUT_REASON_INACTIVITY
      ? getAutoLogoutMessage(lang)
      : "";
  const inputBaseStyle = {
    width: "100%", boxSizing: "border-box",
    padding: "12px 14px", borderRadius: 12,
    color: "var(--login-text)", fontSize: 14,
    fontFamily: "'Cairo', sans-serif", direction: "ltr",
    outline: "none",
  };
  const passwordInputStyle = {
    ...inputBaseStyle,
    padding: isRTL ? "12px 14px 12px 48px" : "12px 48px 12px 14px",
  };
  const passwordToggleStyle = isRTL ? { left: 8 } : { right: 8 };

  const buttonStyle = {
    marginTop: 4, padding: "13px",
    borderRadius: 12, border: "none",
    background: loading
      ? "rgba(212,175,55,.3)"
      : "linear-gradient(135deg,#d4af37,#b8941e)",
    color: loading ? tc.grey : "#060d1a",
    fontSize: 15, fontWeight: 800,
    fontFamily: "'Cairo', sans-serif",
    cursor: loading ? "not-allowed" : "pointer",
    boxShadow: loading ? "none" : "0 6px 20px rgba(212,175,55,.35)",
  };

  return (
    <div className="login-page" style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--login-bg)",
      padding: "24px",
      }}>
      <div className="login-geometry login-geometry--grid" aria-hidden="true" />
      <div className="login-geometry login-geometry--diagonal" aria-hidden="true" />
      <div className="login-geometry login-geometry--accent" aria-hidden="true" />
      {/* Decorative rings */}
      {[160, 280, 420].map((s, i) => (
        <div key={i} style={{
          position: "fixed", top: "50%", left: "50%",
          width: s, height: s, borderRadius: "50%",
          border: "1px solid rgba(212,175,55,.06)",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }} />
      ))}

      <div ref={cardRef} className="login-card" style={{
        width: "100%", maxWidth: 420,
        background: "var(--login-card-bg)",
        border: "1px solid var(--login-card-border)",
        borderRadius: 20, padding: "40px 36px",
        backdropFilter: "blur(20px)",
        boxShadow: "var(--login-card-shadow)",
        position: "relative",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <IconBubble className="login-icon" name="brand" boxSize={72} size={72} style={{ margin:"0 auto 18px" }} />
          <h1 style={{
            fontSize: 22, fontWeight: 900, fontFamily: "'Amiri', serif",
            background: "linear-gradient(135deg,#f0d060,#d4af37)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            marginBottom: 6,
          }}>{isResumeMode ? resumeLabels.title : "نظام إدارة العمرة"}</h1>
          <p style={{
            fontSize: 12,
            color: "var(--login-muted)",
            lineHeight: 1.7,
            maxWidth: isResumeMode ? 330 : "none",
            margin: "0 auto",
          }}>
            {isResumeMode ? resumeLabels.message : "سجّل دخولك للمتابعة"}
          </p>
        </div>

        <form onSubmit={isResumeMode ? handleResumeSubmit : handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isResumeMode ? (
            <>
              <div>
                <label style={{ fontSize: 12, color: "var(--login-muted)", display: "block", marginBottom: 6 }}>
                  {resumeLabels.emailLabel}
                </label>
                <input
                  type="email"
                  value={resumeContext.email}
                  readOnly
                  autoComplete="username"
                  className="login-input"
                  style={{
                    ...inputBaseStyle,
                    background: "var(--login-accent-soft)",
                    borderColor: "var(--login-accent-border)",
                    fontWeight: 800,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--login-muted)", display: "block", marginBottom: 6 }}>
                  {resumeLabels.passwordLabel}
                </label>
                <div className="login-password-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={resumeLabels.passwordLabel}
                    autoComplete="current-password"
                    disabled={loading}
                    className="login-input"
                    style={passwordInputStyle}
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    style={passwordToggleStyle}
                    onClick={() => setShowPassword((visible) => !visible)}
                    disabled={loading}
                    aria-label={showPassword ? passwordLabels.hide : passwordLabels.show}
                    title={showPassword ? passwordLabels.hide : passwordLabels.show}
                    aria-pressed={showPassword}
                  >
                    <AppIcon name={showPassword ? "eyeOff" : "eye"} size={18} color="currentColor" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
          {/* Email */}
          <div>
            <label style={{ fontSize: 12, color: "var(--login-muted)", display: "block", marginBottom: 6 }}>
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
              disabled={loading}
              className="login-input"
              style={inputBaseStyle}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ fontSize: 12, color: "var(--login-muted)", display: "block", marginBottom: 6 }}>
              كلمة السر
            </label>
            <div className="login-password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                className="login-input"
                style={passwordInputStyle}
              />
              <button
                type="button"
                className="login-password-toggle"
                style={passwordToggleStyle}
                onClick={() => setShowPassword((visible) => !visible)}
                disabled={loading}
                aria-label={showPassword ? passwordLabels.hide : passwordLabels.show}
                title={showPassword ? passwordLabels.hide : passwordLabels.show}
                aria-pressed={showPassword}
              >
                <AppIcon name={showPassword ? "eyeOff" : "eye"} size={18} color="currentColor" />
              </button>
            </div>
          </div>
            </>
          )}

          {/* Error message */}
          {sessionNotice && (
            <div style={{
              padding: "10px 14px", borderRadius: 10, fontSize: 13,
              background: "rgba(212,175,55,.1)", border: "1px solid rgba(212,175,55,.28)",
              color: "var(--login-text)", fontWeight: 600, textAlign: "center",
              lineHeight: 1.6,
            }}>
              <AppIcon name="shieldCheck" size={14} color="#d4af37" /> {sessionNotice}
            </div>
          )}
          {error && (
            <div className="login-error" style={{
              padding: "10px 14px", borderRadius: 10, fontSize: 13,
              background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)",
              color: tc.danger, fontWeight: 600, textAlign: "center",
            }}>
              <AppIcon name="alert" size={14} color={tc.danger} /> {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="login-button login-button-glow"
            data-loading={loading}
            style={buttonStyle}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span className="login-spinner" style={{
                  width: 14, height: 14, border: "2px solid rgba(212,175,55,.3)",
                  borderTop: "2px solid #d4af37", borderRadius: "50%",
                  display: "inline-block",
                }} />
                {isResumeMode ? resumeLabels.loading : "جاري تسجيل الدخول..."}
              </span>
            ) : isResumeMode ? resumeLabels.primary : "تسجيل الدخول"}
          </button>
        </form>

        {/* Forgot password link */}
        {isResumeMode ? (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button
              type="button"
              onClick={handleSwitchAccount}
              disabled={loading}
              style={{
                background: "transparent", border: "none", color: "#d4af37",
                fontSize: 13, fontFamily: "'Cairo', sans-serif", cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.65 : 1,
              }}
            >
              {resumeLabels.switchAccount}
            </button>
          </div>
        ) : !showReset ? (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button
              type="button"
              onClick={() => { setShowReset(true); setResetEmail(email); setError(""); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--login-muted)", fontSize: 12,
                fontFamily: "'Cairo', sans-serif",
                transition: "color .2s",
              }}
              onMouseEnter={e => e.target.style.color = "#d4af37"}
              onMouseLeave={e => e.target.style.color = "var(--login-muted)"}
            >
              نسيت كلمة المرور؟
            </button>
          </div>
        ) : (
          <div style={{
            marginTop: 20, padding: "20px",
            background: "var(--login-accent-soft)",
            border: "1px solid var(--login-accent-border)",
            borderRadius: 12,
          }}>
            {resetSent ? (
              <div style={{ textAlign: "center" }}>
                <IconBubble name="mail" boxSize={44} size={22} style={{ margin:"0 auto 10px" }} />
                <p style={{ color: "#4ade80", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                  تم الإرسال بنجاح
                </p>
                <p style={{ color: "var(--login-muted)", fontSize: 12, marginBottom: 12 }}>
                  تم إرسال رابط إعادة التعيين لبريدك الإلكتروني
                </p>
                <button
                  type="button"
                  onClick={() => { setShowReset(false); setResetSent(false); setResetEmail(""); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--login-muted)", fontSize: 12,
                    fontFamily: "'Cairo', sans-serif",
                  }}
                >
                  ← العودة لتسجيل الدخول
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: 12, color: "var(--login-muted)", marginBottom: 4 }}>
                  أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين
                </p>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={e => { setResetEmail(e.target.value); setResetError(""); }}
                  placeholder="admin@example.com"
                  disabled={resetLoading}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "10px 14px", borderRadius: 10,
                    background: "var(--login-input-bg)",
                    border: "1px solid var(--login-input-border)",
                    color: "var(--login-text)", fontSize: 13,
                    fontFamily: "'Cairo', sans-serif", direction: "ltr",
                    outline: "none",
                  }}
                />
                {resetError && (
                  <p style={{ color: tc.danger, fontSize: 12, fontWeight: 600, display:"inline-flex", alignItems:"center", gap:6 }}><AppIcon name="alert" size={13} color={tc.danger} /> {resetError}</p>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    style={{
                      flex: 1, padding: "10px",
                      borderRadius: 10, border: "none",
                      background: resetLoading ? "rgba(212,175,55,.3)" : "linear-gradient(135deg,#d4af37,#b8941e)",
                      color: resetLoading ? tc.grey : "#060d1a",
                      fontSize: 13, fontWeight: 700,
                      fontFamily: "'Cairo', sans-serif",
                      cursor: resetLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    {resetLoading ? "جاري الإرسال..." : "إرسال الرابط"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowReset(false); setResetError(""); }}
                    style={{
                      padding: "10px 14px", borderRadius: 10,
                      border: "1px solid var(--login-input-border)",
                      background: "transparent",
                      color: "var(--login-muted)", fontSize: 13,
                      fontFamily: "'Cairo', sans-serif",
                      cursor: "pointer",
                    }}
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "var(--login-muted)", opacity: 0.7 }}>
          RUKN — نظام إدارة المعتمرين
        </p>
      </div>
    </div>
  );
}
