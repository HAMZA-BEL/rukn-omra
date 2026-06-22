import React from "react";
import { createPortal } from "react-dom";

const formatRemainingTime = (remainingMs) => {
  const safeSeconds = Math.max(0, Math.ceil(Number(remainingMs || 0) / 1000));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const getModalCopy = (lang = "ar") => {
  if (lang === "fr") {
    return {
      dir: "ltr",
      title: "Déconnexion imminente",
      body: "En raison de votre inactivité, vous serez déconnecté automatiquement dans",
      instruction: "Cliquez n’importe où dans Rukn pour continuer votre session",
      note: "Pour des raisons de sécurité, la session expirera automatiquement en cas d’inactivité",
    };
  }
  if (lang === "en") {
    return {
      dir: "ltr",
      title: "You will be signed out soon",
      body: "Due to inactivity, you will be signed out automatically in",
      instruction: "Click anywhere in Rukn to continue your session",
      note: "For security reasons, the session will expire automatically after inactivity",
    };
  }
  return {
    dir: "rtl",
    title: "سيتم تسجيل الخروج قريبا",
    body: "بسبب عدم النشاط، سيتم تسجيل خروجك تلقائيا بعد",
    instruction: "اضغط في أي مكان داخل ركن لمتابعة الجلسة",
    note: "لأسباب أمنية، ستنتهي الجلسة تلقائيا عند عدم النشاط",
  };
};

export default function InactivityLogoutModal({
  open,
  remainingMs,
  warningDurationMs,
  lang = "ar",
}) {
  if (!open || typeof document === "undefined") return null;

  const copy = getModalCopy(lang);
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, Number(remainingMs || 0) / Math.max(1, Number(warningDurationMs || 1))));
  const strokeDashoffset = circumference * (1 - progress);

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="rukn-inactivity-title"
      aria-describedby="rukn-inactivity-body"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(6,13,26,.46)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        direction: copy.dir,
        fontFamily: "'Cairo', sans-serif",
      }}
    >
      <div
        style={{
          width: "min(420px, 100%)",
          borderRadius: 26,
          border: "1px solid var(--rukn-border)",
          background: "var(--rukn-bg-modal)",
          color: "var(--rukn-text)",
          boxShadow: "0 28px 90px rgba(0,0,0,.32), 0 0 0 1px rgba(212,175,55,.08)",
          padding: "28px 26px 24px",
          textAlign: "center",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "-40% -20% auto",
            height: 170,
            background: "radial-gradient(circle, rgba(212,175,55,.18), transparent 62%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <h2
              id="rukn-inactivity-title"
              style={{
                color: "var(--rukn-text-strong)",
                fontSize: 21,
                fontWeight: 900,
                letterSpacing: "-.02em",
                margin: 0,
              }}
            >
              {copy.title}
            </h2>
            <p
              id="rukn-inactivity-body"
              style={{
                color: "var(--rukn-text-muted)",
                fontSize: 14,
                lineHeight: 1.8,
                margin: 0,
              }}
            >
              {copy.body}
            </p>
          </div>

          <div
            style={{
              width: 136,
              height: 136,
              margin: "0 auto",
              position: "relative",
              display: "grid",
              placeItems: "center",
            }}
          >
            <svg
              width="136"
              height="136"
              viewBox="0 0 136 136"
              aria-hidden="true"
              style={{ transform: "rotate(-90deg)", filter: "drop-shadow(0 10px 22px rgba(212,175,55,.18))" }}
            >
              <circle
                cx="68"
                cy="68"
                r={radius}
                fill="none"
                stroke="var(--rukn-progress-track)"
                strokeWidth="10"
              />
              <circle
                cx="68"
                cy="68"
                r={radius}
                fill="none"
                stroke="var(--rukn-gold)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: "stroke-dashoffset .3s linear" }}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
              }}
            >
              <span
                style={{
                  color: "var(--rukn-text-strong)",
                  fontSize: 27,
                  fontWeight: 900,
                  letterSpacing: ".04em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatRemainingTime(remainingMs)}
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <p style={{
              margin: 0,
              color: "var(--rukn-gold)",
              fontSize: 14,
              fontWeight: 800,
              lineHeight: 1.7,
            }}>
              {copy.instruction}
            </p>
            <p style={{
              margin: 0,
              color: "var(--rukn-text-muted)",
              fontSize: 12,
              lineHeight: 1.7,
            }}>
              {copy.note}
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
