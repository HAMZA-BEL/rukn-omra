import React from "react";
import { IconBubble } from "./Icon";
import {
  AGENCY_BLOCKED_COPY,
  AGENCY_LINK_MISSING_COPY,
} from "../utils/agencyAccess";

const screenStyle = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "#060d1a",
  color: "#f8fafc",
  padding: 24,
  textAlign: "center",
  fontFamily: "'Cairo', sans-serif",
};

const cardStyle = {
  width: "min(100%, 520px)",
  background: "rgba(10,22,45,.94)",
  border: "1px solid rgba(212,175,55,.3)",
  borderRadius: 20,
  padding: 40,
};

const buttonStyle = {
  minWidth: 138,
  padding: "10px 24px",
  borderRadius: 10,
  border: "1px solid rgba(212,175,55,.3)",
  background: "rgba(212,175,55,.1)",
  color: "#d4af37",
  fontFamily: "'Cairo', sans-serif",
};

function AgencyAccessCard({ title, message, children }) {
  return (
    <main dir="rtl" role="alert" style={screenStyle}>
      <style>{`
        .agency-access-action { cursor: pointer; }
        .agency-access-action:focus-visible { outline: 3px solid #f0d060; outline-offset: 3px; }
        .agency-access-action:disabled { cursor: not-allowed; opacity: .62; }
      `}</style>
      <section style={cardStyle} aria-labelledby="agency-access-title">
        <IconBubble name="alert" boxSize={56} size={26} color="#f59e0b" bg="rgba(245,158,11,.12)" border="rgba(245,158,11,.28)" style={{ margin: "0 auto 16px" }} />
        <h1 id="agency-access-title" style={{ color: "#d4af37", fontSize: 24, marginBottom: 12 }}>{title}</h1>
        <p style={{ color: "rgba(226,232,240,.86)", lineHeight: 1.9, marginBottom: 24 }}>{message}</p>
        {children}
      </section>
    </main>
  );
}

export function AgencyBlockedScreen({
  onRetry,
  onLogout,
  title = AGENCY_BLOCKED_COPY.title,
  message = AGENCY_BLOCKED_COPY.message,
}) {
  const [checking, setChecking] = React.useState(false);

  const retry = async () => {
    if (checking) return;
    setChecking(true);
    try {
      await onRetry?.();
    } finally {
      setChecking(false);
    }
  };

  return (
    <AgencyAccessCard title={title} message={message}>
      <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
        <button className="agency-access-action" type="button" onClick={retry} disabled={checking} aria-busy={checking} style={buttonStyle}>
          {checking ? "جار التحقق…" : "إعادة المحاولة"}
        </button>
        <button className="agency-access-action" type="button" onClick={onLogout} disabled={checking} style={{ ...buttonStyle, color: "#f8fafc", borderColor: "rgba(248,250,252,.2)", background: "rgba(248,250,252,.06)" }}>
          تسجيل الخروج
        </button>
      </div>
    </AgencyAccessCard>
  );
}

export function AgencyLinkMissingScreen({ onLogout }) {
  return (
    <AgencyAccessCard title={AGENCY_LINK_MISSING_COPY.title} message={AGENCY_LINK_MISSING_COPY.message}>
      <button className="agency-access-action" type="button" onClick={onLogout} style={buttonStyle}>
        تسجيل الخروج
      </button>
    </AgencyAccessCard>
  );
}

export function AgencyAccessUnavailableScreen({ onRetry, onLogout }) {
  return (
    <AgencyBlockedScreen
      onRetry={onRetry}
      onLogout={onLogout}
      title="تعذر التحقق من حالة الوكالة"
      message="تعذر التحقق من حالة الوكالة حاليا. يرجى إعادة المحاولة."
    />
  );
}
