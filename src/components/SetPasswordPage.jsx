import React from "react";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { supabase } from "../lib/supabase";
import { AppIcon, IconBubble } from "./Icon";

const tc = theme.colors;

function PasswordShell({ lbl, children }) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(26,107,58,.35), #060d1a)",
      padding: "24px",
    }}>
      {[160, 280, 420].map((s, i) => (
        <div key={i} style={{
          position: "fixed", top: "50%", left: "50%",
          width: s, height: s, borderRadius: "50%",
          border: "1px solid rgba(212,175,55,.06)",
          transform: "translate(-50%, -50%)", pointerEvents: "none",
        }} />
      ))}
      <div style={{
        width: "100%", maxWidth: 420,
        background: "rgba(10,22,45,.85)",
        border: "1px solid rgba(212,175,55,.2)",
        borderRadius: 20, padding: "40px 36px",
        backdropFilter: "blur(20px)",
        boxShadow: "0 24px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(212,175,55,.08)",
        position: "relative",
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <IconBubble name="shieldCheck" boxSize={64} size={30} style={{ borderRadius:18, margin:"0 auto 16px", animation:"float 4s ease-in-out infinite" }} />
          <h1 style={{
            fontSize: 20, fontWeight: 900, fontFamily: "'Amiri', serif",
            background: "linear-gradient(135deg,#f0d060,#d4af37)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            marginBottom: 6,
          }}>{lbl.title}</h1>
          <p style={{ fontSize: 12, color: tc.grey }}>{lbl.subtitle}</p>
        </div>
        {children}
        <p style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: "rgba(148,163,184,.3)" }}>
          RUKN — نظام إدارة المعتمرين
        </p>
      </div>
    </div>
  );
}

const Requirement = React.memo(function Requirement({ ok, label }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6, fontSize: 11,
      color: ok ? "#4ade80" : "rgba(148,163,184,.5)",
      transition: "color .25s",
    }}>
      <AppIcon name={ok ? "check" : "status"} size={13} color={ok ? "#4ade80" : "rgba(148,163,184,.5)"} />
      <span>{label}</span>
    </div>
  );
});

const LABELS = {
  ar: {
    title:       "تعيين كلمة المرور",
    subtitle:    "مرحباً بك — عيّن كلمة مرورك للدخول للنظام",
    newPass:     "كلمة المرور الجديدة",
    confirmPass: "تأكيد كلمة المرور",
    req8:        "8 أحرف على الأقل",
    reqUpper:    "حرف كبير واحد على الأقل (A-Z)",
    reqNum:      "رقم واحد على الأقل (0-9)",
    noMatch:     "كلمتا السر لا تتطابقان",
    submit:      "تفعيل الحساب",
    submitting:  "جاري الحفظ...",
    success:     "تم تعيين كلمة المرور بنجاح — جاري الدخول...",
    errGeneric:  "حدث خطأ — حاول مرة أخرى",
    expired:     "انتهت صلاحية الرابط — تواصل مع المسؤول لإعادة الدعوة",
    preparing:   "جاري التحقق من الرابط...",
    show:        "إظهار",
    hide:        "إخفاء",
  },
  fr: {
    title:       "Définir le mot de passe",
    subtitle:    "Bienvenue — définissez votre mot de passe pour accéder au système",
    newPass:     "Nouveau mot de passe",
    confirmPass: "Confirmer le mot de passe",
    req8:        "Au moins 8 caractères",
    reqUpper:    "Au moins une lettre majuscule (A-Z)",
    reqNum:      "Au moins un chiffre (0-9)",
    noMatch:     "Les mots de passe ne correspondent pas",
    submit:      "Activer le compte",
    submitting:  "Enregistrement...",
    success:     "Mot de passe défini — Connexion en cours...",
    errGeneric:  "Une erreur s'est produite — réessayez",
    expired:     "Lien expiré — contactez l'administrateur pour une nouvelle invitation",
    preparing:   "Vérification du lien...",
    show:        "Afficher",
    hide:        "Masquer",
  },
};
LABELS.en = LABELS.fr;

// States: 'preparing' | 'ready' | 'expired' | 'done'
// authData = { type, accessToken, refreshToken } | null (from App.jsx URL detection)
export default function SetPasswordPage({ authData }) {
  const { lang } = useLang();
  const lbl = LABELS[lang] || LABELS.ar;

  const [status,  setStatus]  = React.useState("preparing");
  const [pass1,   setPass1]   = React.useState("");
  const [pass2,   setPass2]   = React.useState("");
  const [show1,   setShow1]   = React.useState(false);
  const [show2,   setShow2]   = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error,   setError]   = React.useState("");

  React.useEffect(() => {
    let cancelled = false;

    const initSession = async () => {
      try {
        // Prefer tokens passed from App.jsx (extracted before Supabase clears hash)
        const accessToken  = authData?.accessToken;
        const refreshToken = authData?.refreshToken;

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token:  accessToken,
            refresh_token: refreshToken,
          });
          if (cancelled) return;
          if (error || !data?.session) { setStatus("expired"); return; }
          setStatus("ready");
          return;
        }

        // Fallback: check if a session already exists
        // (handles onAuthStateChange PASSWORD_RECOVERY path via needsPasswordSet)
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session) { setStatus("ready"); return; }

        setStatus("expired");
      } catch {
        if (!cancelled) setStatus("expired");
      }
    };

    initSession();
    return () => { cancelled = true; };
  }, [authData]);

  const handlePass1Change = React.useCallback((e) => { setPass1(e.target.value); setError(""); }, []);
  const handlePass2Change = React.useCallback((e) => { setPass2(e.target.value); setError(""); }, []);

  const has8   = pass1.length >= 8;
  const hasUpp = /[A-Z]/.test(pass1);
  const hasNum = /[0-9]/.test(pass1);
  const strong = has8 && hasUpp && hasNum;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!strong) { setError(lbl.req8); return; }
    if (pass1 !== pass2) { setError(lbl.noMatch); return; }
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password: pass1 });
    setLoading(false);
    if (err) {
      setError(err.message || lbl.errGeneric);
    } else {
      setStatus("done");
      window.history.replaceState(null, "", window.location.pathname);
      // Give onAuthStateChange (USER_UPDATED) time to fire first.
      // If session exists after update, navigate cleanly; otherwise reload.
      setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          window.location.href = window.location.origin;
        } else {
          window.location.reload();
        }
      }, 1500);
    }
  };

  const inputWrap = { position: "relative" };
  const inputSt = (redBorder) => ({
    width: "100%", boxSizing: "border-box",
    padding: "11px 14px 11px 44px", borderRadius: 10,
    background: "rgba(255,255,255,.05)",
    border: redBorder ? "1px solid rgba(239,68,68,.5)" : "1px solid rgba(212,175,55,.2)",
    color: "#f8fafc", fontSize: 14,
    fontFamily: "'Cairo', sans-serif", direction: "ltr",
    outline: "none", transition: "border .2s",
  });
  const toggleBtn = (onClick, visible) => (
    <button type="button" onClick={onClick} style={{
      position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
      background: "none", border: "none", cursor: "pointer",
      color: "rgba(148,163,184,.5)", fontSize: 18,
      padding: "4px", lineHeight: 1,
    }}
    onMouseEnter={e => e.currentTarget.style.color = "#d4af37"}
    onMouseLeave={e => e.currentTarget.style.color = "rgba(148,163,184,.5)"}
    ><AppIcon name={visible ? "eyeOff" : "eye"} size={18} color="currentColor" /></button>
  );

  // ── Preparing (waiting for Supabase to process token) ─────────────────────
  if (status === "preparing") {
    return (
      <PasswordShell lbl={lbl}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0" }}>
          <div style={{
            width: 36, height: 36,
            border: "3px solid rgba(212,175,55,.2)",
            borderTop: "3px solid #d4af37",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }} />
          <p style={{ color: tc.grey, fontSize: 13 }}>{lbl.preparing}</p>
        </div>
      </PasswordShell>
    );
  }

  // ── Expired link ──────────────────────────────────────────────────────────
  if (status === "expired") {
    return (
      <PasswordShell lbl={lbl}>
        <div style={{
          textAlign: "center", padding: "20px 0",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26,
          }}><AppIcon name="clock" size={26} color={tc.danger} /></div>
          <p style={{ color: tc.danger, fontSize: 14, fontWeight: 700, lineHeight: 1.6 }}>
            {lbl.expired}
          </p>
          <button
            type="button"
            onClick={() => {
              window.history.replaceState(null, "", window.location.pathname);
              window.location.reload();
            }}
            style={{
              marginTop: 4, padding: "10px 24px",
              borderRadius: 10, border: "1px solid rgba(212,175,55,.3)",
              background: "rgba(212,175,55,.08)",
              color: "#d4af37", fontSize: 13, fontWeight: 700,
              fontFamily: "'Cairo', sans-serif", cursor: "pointer",
              transition: "all .2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(212,175,55,.18)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(212,175,55,.08)"}
          >
            {lang === "fr" ? "Retour à la connexion" : "← العودة لتسجيل الدخول"}
          </button>
        </div>
      </PasswordShell>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (status === "done") {
    return (
      <PasswordShell lbl={lbl}>
        <div style={{
          textAlign: "center", padding: "24px 0",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(74,222,128,.12)", border: "1px solid rgba(74,222,128,.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28,
          }}><AppIcon name="success" size={28} color="#4ade80" /></div>
          <p style={{ color: "#4ade80", fontSize: 14, fontWeight: 700 }}>{lbl.success}</p>
        </div>
      </PasswordShell>
    );
  }

  // ── Ready — show form ─────────────────────────────────────────────────────
  return (
    <PasswordShell lbl={lbl}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* New password */}
        <div>
          <label style={{ fontSize: 12, color: tc.grey, display: "block", marginBottom: 6 }}>
            {lbl.newPass}
          </label>
          <div style={inputWrap}>
            <input
              type={show1 ? "text" : "password"}
              value={pass1}
              onChange={handlePass1Change}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={loading}
              style={inputSt(false)}
              onFocus={e => e.target.style.border = "1px solid rgba(212,175,55,.5)"}
              onBlur={e  => e.target.style.border = "1px solid rgba(212,175,55,.2)"}
            />
            {toggleBtn(() => setShow1(v => !v), show1)}
          </div>
          {pass1.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4, paddingInlineStart: 4 }}>
              <Requirement ok={has8}   label={lbl.req8} />
              <Requirement ok={hasUpp} label={lbl.reqUpper} />
              <Requirement ok={hasNum} label={lbl.reqNum} />
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label style={{ fontSize: 12, color: tc.grey, display: "block", marginBottom: 6 }}>
            {lbl.confirmPass}
          </label>
          <div style={inputWrap}>
            <input
              type={show2 ? "text" : "password"}
              value={pass2}
              onChange={handlePass2Change}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={loading}
              style={inputSt(pass2.length > 0 && pass2 !== pass1)}
              onFocus={e => e.target.style.border = "1px solid rgba(212,175,55,.5)"}
              onBlur={e  => e.target.style.border = (pass2.length > 0 && pass2 !== pass1)
                ? "1px solid rgba(239,68,68,.5)"
                : "1px solid rgba(212,175,55,.2)"}
            />
            {toggleBtn(() => setShow2(v => !v), show2)}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
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
          disabled={loading || !strong}
          style={{
            marginTop: 4, padding: "13px",
            borderRadius: 12, border: "none",
            background: (loading || !strong)
              ? "rgba(212,175,55,.3)"
              : "linear-gradient(135deg,#d4af37,#b8941e)",
            color: (loading || !strong) ? tc.grey : "#060d1a",
            fontSize: 15, fontWeight: 800,
            fontFamily: "'Cairo', sans-serif",
            cursor: (loading || !strong) ? "not-allowed" : "pointer",
            boxShadow: (loading || !strong) ? "none" : "0 6px 20px rgba(212,175,55,.35)",
            transition: "all .2s",
          }}>
          {loading ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{
                width: 14, height: 14, border: "2px solid rgba(212,175,55,.3)",
                borderTop: "2px solid #d4af37", borderRadius: "50%",
                animation: "spin 1s linear infinite", display: "inline-block",
              }} />
              {lbl.submitting}
            </span>
          ) : lbl.submit}
        </button>
      </form>
    </PasswordShell>
  );
}
