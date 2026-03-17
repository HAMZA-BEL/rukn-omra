import React from "react";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";

const t = theme.colors;

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style, className = "", onClick, hover = false }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      className={className}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: t.bgCard,
        border: `1px solid ${hovered && hover ? t.borderHover : t.border}`,
        borderRadius: 16,
        backdropFilter: "blur(20px)",
        transition: "all .3s ease",
        transform: hovered && hover ? "translateY(-2px)" : "none",
        boxShadow: hovered && hover
          ? "0 20px 60px rgba(0,0,0,.4), 0 0 30px rgba(212,175,55,.1)"
          : "0 4px 24px rgba(0,0,0,.3)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── GlassCard ─────────────────────────────────────────────────────────────────
export function GlassCard({ children, style, gold = false, ...rest }) {
  return (
    <div
      {...rest}
      style={{
        background: gold
          ? "linear-gradient(135deg,rgba(212,175,55,.12),rgba(212,175,55,.04))"
          : "rgba(255,255,255,0.03)",
        border: `1px solid ${gold ? "rgba(212,175,55,.3)" : "rgba(255,255,255,.07)"}`,
        borderRadius: 16,
        backdropFilter: "blur(20px)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ children, onClick, variant = "primary", size = "md",
  disabled = false, style, icon }) {
  const [hov, setHov] = React.useState(false);

  const variants = {
    primary: {
      background: hov
        ? "linear-gradient(135deg,#e6c040,#d4af37)"
        : "linear-gradient(135deg,#d4af37,#b8941e)",
      color: "#060d1a",
      border: "none",
      boxShadow: hov ? "0 8px 24px rgba(212,175,55,.4)" : "0 4px 12px rgba(212,175,55,.2)",
    },
    secondary: {
      background: hov ? "rgba(212,175,55,.15)" : "rgba(212,175,55,.08)",
      color: t.gold,
      border: `1px solid ${hov ? t.gold : "rgba(212,175,55,.3)"}`,
      boxShadow: "none",
    },
    danger: {
      background: hov ? "rgba(239,68,68,.2)" : "rgba(239,68,68,.1)",
      color: t.danger,
      border: `1px solid ${hov ? t.danger : "rgba(239,68,68,.3)"}`,
      boxShadow: "none",
    },
    success: {
      background: hov ? "rgba(34,197,94,.2)" : "rgba(34,197,94,.1)",
      color: t.greenLight,
      border: `1px solid ${hov ? t.greenLight : "rgba(34,197,94,.3)"}`,
      boxShadow: "none",
    },
    ghost: {
      background: hov ? "rgba(255,255,255,.06)" : "transparent",
      color: t.grey,
      border: `1px solid ${hov ? "rgba(255,255,255,.15)" : "rgba(255,255,255,.07)"}`,
      boxShadow: "none",
    },
    warning: {
      background: hov ? "rgba(245,158,11,.2)" : "rgba(245,158,11,.1)",
      color: t.warning,
      border: `1px solid ${hov ? t.warning : "rgba(245,158,11,.3)"}`,
      boxShadow: "none",
    },
  };

  const sizes = {
    sm: { padding: "6px 14px", fontSize: 13, borderRadius: 8 },
    md: { padding: "10px 20px", fontSize: 14, borderRadius: 10 },
    lg: { padding: "14px 28px", fontSize: 16, borderRadius: 12 },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        fontFamily: "'Cairo',sans-serif", fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? .5 : 1,
        transition: "all .25s ease",
        transform: hov && !disabled ? "translateY(-1px)" : "none",
        ...variants[variant],
        ...sizes[size],
        ...style,
      }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, value, onChange, placeholder, type = "text",
  required, error, style, inputStyle }) {
  const { dir } = useLang();
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 600, color: focused ? t.gold : t.grey }}>
          {label} {required && <span style={{ color: t.danger }}>*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${error ? t.danger : focused ? t.gold : "rgba(255,255,255,.1)"}`,
          borderRadius: 10,
          padding: "10px 14px",
          color: t.white,
          fontSize: 14,
          fontFamily: "'Cairo',sans-serif",
          direction: dir,
          outline: "none",
          transition: "border-color .2s, box-shadow .2s",
          boxShadow: focused ? `0 0 0 3px ${error ? "rgba(239,68,68,.15)" : "rgba(212,175,55,.15)"}` : "none",
          ...inputStyle,
        }}
      />
      {error && <span style={{ fontSize: 12, color: t.danger }}>{error}</span>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ label, value, onChange, options, required, style }) {
  const [focused, setFocused] = React.useState(false);
  const { dir } = useLang();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 600, color: focused ? t.gold : t.grey }}>
          {label} {required && <span style={{ color: t.danger }}>*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          background: "#0d1f3c",
          border: `1px solid ${focused ? t.gold : "rgba(255,255,255,.1)"}`,
          borderRadius: 10,
          padding: "10px 14px",
          color: value ? t.white : t.grey,
          fontSize: 14,
          fontFamily: "'Cairo',sans-serif",
          direction: dir,
          outline: "none",
          transition: "border-color .2s",
          boxShadow: focused ? "0 0 0 3px rgba(212,175,55,.15)" : "none",
          cursor: "pointer",
        }}
      >
        {options.map((o) =>
          typeof o === "string"
            ? <option key={o} value={o}>{o}</option>
            : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const { t } = useLang();
  const statusKey = ["cleared", "partial", "unpaid"].includes(status) ? status : null;
  const label = statusKey ? t[`status_${statusKey}`] : status;

  const map = {
    cleared: { bg: "rgba(34,197,94,.15)", color: "#22c55e", dot: "#22c55e" },
    partial: { bg: "rgba(245,158,11,.15)", color: "#f59e0b", dot: "#f59e0b" },
    unpaid:  { bg: "rgba(239,68,68,.15)",  color: "#ef4444", dot: "#ef4444" },
  };
  const s = map[statusKey] || map.unpaid;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: s.bg, color: s.color,
      padding: "4px 12px", borderRadius: 20,
      fontSize: 12, fontWeight: 700,
      border: `1px solid ${s.color}33`,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: s.dot,
        boxShadow: `0 0 6px ${s.dot}`,
        animation: "pulse 2s infinite",
      }} />
      {label}
    </span>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon, color = t.gold, sub, delay = 0 }) {
  return (
    <div
      className="animate-fadeInUp"
      style={{ animationDelay: `${delay}s` }}
    >
      <GlassCard gold style={{ padding: "20px 24px", position: "relative", overflow: "hidden" }}>
        {/* bg glow */}
        <div style={{
          position: "absolute", top: -20, left: -20,
          width: 100, height: 100,
          background: `radial-gradient(circle,${color}22,transparent 70%)`,
          pointerEvents: "none",
        }} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 12, color: t.grey, fontWeight: 500, marginBottom: 8 }}>{label}</p>
            <p style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "'Amiri',serif", lineHeight: 1 }}>
              {value}
            </p>
            {sub && <p style={{ fontSize: 12, color: t.grey, marginTop: 6 }}>{sub}</p>}
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `${color}18`,
            border: `1px solid ${color}33`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22,
          }}>
            {icon}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 560 }) {
  React.useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="animate-fadeIn"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,.75)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        className="animate-scaleIn"
        style={{
          background: "linear-gradient(145deg,#0d1f3c,#060d1a)",
          border: "1px solid rgba(212,175,55,.3)",
          borderRadius: 20,
          width: "100%", maxWidth: width,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex", flexDirection: "column",
          boxShadow: "0 40px 80px rgba(0,0,0,.6), 0 0 60px rgba(212,175,55,.08)",
        }}
      >
        {/* header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 12,
          padding: "20px 24px",
          borderBottom: "1px solid rgba(212,175,55,.15)",
          background: "rgba(212,175,55,.05)",
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: t.gold }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,255,255,.1)",
              borderRadius: 8,
              width: 32, height: 32,
              color: t.grey,
              fontSize: 18,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              transition: "all .2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,.15)"; e.currentTarget.style.color = t.danger; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.05)"; e.currentTarget.style.color = t.grey; }}
          >
            ✕
          </button>
        </div>
        {/* body */}
        <div style={{
          overflowY: "auto",
          padding: "24px",
          paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))",
          flex: 1,
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Search Bar ────────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = "ابحث...", style, disabled = false, ...rest }) {
  const { dir } = useLang();
  const isRTL = dir === "rtl";
  return (
    <div style={{ position: "relative", ...style }}>
      <span style={{
        position: "absolute", top: "50%", right: isRTL ? 14 : "auto", left: isRTL ? "auto" : 14,
        transform: "translateY(-50%)",
        color: disabled ? "rgba(148,163,184,.4)" : "rgba(212,175,55,.6)",
        fontSize: 18, pointerEvents: "none",
      }}>🔍</span>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: "100%",
          background: "rgba(255,255,255,.04)",
          border: "1px solid rgba(212,175,55,.2)",
          borderRadius: 12,
          padding: isRTL ? "12px 46px 12px 16px" : "12px 16px 12px 46px",
          color: "#f8fafc",
          fontSize: 14,
          fontFamily: "'Cairo',sans-serif",
          direction: dir,
          outline: "none",
          transition: "border-color .2s, box-shadow .2s",
          opacity: disabled ? 0.55 : 1,
          cursor: disabled ? "not-allowed" : "text",
        }}
        onFocus={(e) => {
          if (disabled) return;
          e.target.style.borderColor = "rgba(212,175,55,.6)";
          e.target.style.boxShadow = "0 0 0 3px rgba(212,175,55,.1)";
        }}
        onBlur={(e) => {
          if (disabled) return;
          e.target.style.borderColor = "rgba(212,175,55,.2)";
          e.target.style.boxShadow = "none";
        }}
        {...rest}
      />
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = "🕌", title, sub }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "60px 20px", gap: 12,
    }}>
      <div style={{ fontSize: 48, animation: "float 3s ease-in-out infinite" }}>{icon}</div>
      <p style={{ fontSize: 16, fontWeight: 700, color: t.grey }}>{title}</p>
      {sub && <p style={{ fontSize: 13, color: "rgba(148,163,184,.6)", textAlign: "center" }}>{sub}</p>}
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ label, style }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0", ...style }}>
      <div style={{ flex: 1, height: 1, background: "rgba(212,175,55,.15)" }} />
      {label && <span style={{ fontSize: 12, color: t.grey, whiteSpace: "nowrap" }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: "rgba(212,175,55,.15)" }} />
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
export function Toast({ message, type = "success", onClose }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: { bg: "rgba(34,197,94,.15)", border: "#22c55e", icon: "✅" },
    error:   { bg: "rgba(239,68,68,.15)",  border: "#ef4444", icon: "❌" },
    info:    { bg: "rgba(212,175,55,.15)", border: "#d4af37", icon: "ℹ️" },
  };
  const c = colors[type] || colors.info;

  return (
    <div
      className="animate-slideIn"
      style={{
        position: "fixed", bottom: 24, left: 24, zIndex: 9999,
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        padding: "14px 20px",
        display: "flex", alignItems: "center", gap: 10,
        backdropFilter: "blur(20px)",
        boxShadow: "0 8px 32px rgba(0,0,0,.4)",
        minWidth: 240,
      }}
    >
      <span style={{ fontSize: 18 }}>{c.icon}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: "#f8fafc", flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 16 }}>✕</button>
    </div>
  );
}
