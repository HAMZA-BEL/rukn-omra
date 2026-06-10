import React from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { useDropdownPosition } from "../hooks/useDropdownPosition";
import { AppIcon, IconBubble } from "./Icon";

const t = theme.colors;
const v = {
  bgCard: "var(--rukn-bg-card)",
  bgGlass: "var(--rukn-bg-glass)",
  bgSoft: "var(--rukn-bg-soft)",
  bgInput: "var(--rukn-bg-input)",
  bgSelect: "var(--rukn-bg-select)",
  bgModal: "var(--rukn-bg-modal)",
  border: "var(--rukn-border)",
  borderSoft: "var(--rukn-border-soft)",
  borderInput: "var(--rukn-border-input)",
  gold: "var(--rukn-gold)",
  goldLight: "var(--rukn-gold-light)",
  goldDim: "var(--rukn-gold-dim)",
  text: "var(--rukn-text)",
  textMuted: "var(--rukn-text-muted)",
  textStrong: "var(--rukn-text-strong)",
  shadowCard: "var(--rukn-shadow-card)",
  shadowCardHover: "var(--rukn-shadow-card-hover)",
  overlay: "var(--rukn-overlay)",
};

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
        background: v.bgCard,
        border: `1px solid ${hovered && hover ? t.borderHover : v.border}`,
        borderRadius: 16,
        backdropFilter: "blur(20px)",
        transition: "all .3s ease",
        transform: hovered && hover ? "translateY(-2px)" : "none",
        boxShadow: hovered && hover
          ? v.shadowCardHover
          : v.shadowCard,
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
          : v.bgSoft,
        border: `1px solid ${gold ? "rgba(212,175,55,.3)" : v.borderSoft}`,
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
      color: v.gold,
      border: `1px solid ${hov ? v.gold : "rgba(212,175,55,.3)"}`,
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
      color: v.textMuted,
      border: `1px solid ${hov ? v.border : v.borderSoft}`,
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
      {icon && (React.isValidElement(icon) ? icon : <AppIcon name={icon} size={16} />)}
      {children}
    </button>
  );
}

export function preventNumberInputWheelChange(event) {
  event.currentTarget.blur();
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  error,
  style,
  inputStyle,
  onWheel,
  ...rest
}) {
  const { dir } = useLang();
  const [focused, setFocused] = React.useState(false);
  const handleWheel = React.useCallback((event) => {
    if (type === "number") preventNumberInputWheelChange(event);
    onWheel?.(event);
  }, [onWheel, type]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 600, color: focused ? v.gold : v.textMuted }}>
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
        onWheel={handleWheel}
        {...rest}
        style={{
          background: v.bgInput,
          border: `1px solid ${error ? t.danger : focused ? v.gold : v.borderInput}`,
          borderRadius: 10,
          padding: "10px 14px",
          color: v.text,
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

const normalizeSelectOption = (option, index) => {
  if (typeof option === "string") {
    return { value: option, label: option, disabled: false, key: `${option}-${index}` };
  }
  const optionValue = option?.value ?? "";
  return {
    value: optionValue,
    label: option?.label ?? optionValue,
    disabled: Boolean(option?.disabled),
    key: `${String(optionValue)}-${index}`,
  };
};

const getSelectValueKey = (value) => String(value ?? "");

const getFirstEnabledIndex = (options) => options.findIndex((option) => !option.disabled);

const getNextEnabledIndex = (options, currentIndex, direction) => {
  if (!options.length) return -1;
  let nextIndex = currentIndex;
  for (let step = 0; step < options.length; step += 1) {
    nextIndex = (nextIndex + direction + options.length) % options.length;
    if (!options[nextIndex]?.disabled) return nextIndex;
  }
  return -1;
};

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ label, value, onChange, options = [], required, style, disabled = false, portalContainer = null }) {
  const triggerRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [focused, setFocused] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const { dir } = useLang();
  const isRTL = dir === "rtl";
  const listboxId = React.useId();
  const normalizedOptions = React.useMemo(
    () => options.map(normalizeSelectOption),
    [options]
  );
  const selectedIndex = normalizedOptions.findIndex(
    (option) => getSelectValueKey(option.value) === getSelectValueKey(value)
  );
  const selectedOption = selectedIndex >= 0 ? normalizedOptions[selectedIndex] : null;
  const firstEnabledIndex = React.useMemo(() => getFirstEnabledIndex(normalizedOptions), [normalizedOptions]);
  const menuPos = useDropdownPosition({
    anchorRef: triggerRef,
    menuRef,
    open,
    rtl: isRTL,
    offset: 7,
  });
  const triggerWidth = triggerRef.current?.getBoundingClientRect().width || 220;
  const hasDisplayValue = value !== "" && value !== null && value !== undefined;
  const displayLabel = selectedOption?.label ?? (hasDisplayValue ? String(value) : "");

  React.useEffect(() => {
    if (!open) return;
    setActiveIndex(selectedIndex >= 0 && !normalizedOptions[selectedIndex]?.disabled
      ? selectedIndex
      : firstEnabledIndex);
  }, [firstEnabledIndex, normalizedOptions, open, selectedIndex]);

  React.useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    const closeIfOutside = (event) => {
      if (triggerRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const closeOnScroll = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const closeOnResize = () => setOpen(false);

    document.addEventListener("mousedown", closeIfOutside, true);
    document.addEventListener("touchstart", closeIfOutside, true);
    window.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("resize", closeOnResize);
    return () => {
      document.removeEventListener("mousedown", closeIfOutside, true);
      document.removeEventListener("touchstart", closeIfOutside, true);
      window.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("resize", closeOnResize);
    };
  }, [open]);

  const emitChange = React.useCallback((nextValue) => {
    onChange?.({
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    });
  }, [onChange]);

  const selectOption = React.useCallback((option) => {
    if (!option || option.disabled || disabled) return;
    if (getSelectValueKey(option.value) === getSelectValueKey(value)) {
      setOpen(false);
      if (typeof window !== "undefined") window.requestAnimationFrame?.(() => triggerRef.current?.focus());
      return;
    }
    emitChange(option.value);
    setOpen(false);
    if (typeof window !== "undefined") window.requestAnimationFrame?.(() => triggerRef.current?.focus());
  }, [disabled, emitChange, value]);

  const openMenu = React.useCallback(() => {
    if (disabled || !normalizedOptions.length) return;
    setOpen(true);
  }, [disabled, normalizedOptions.length]);

  const handleKeyDown = React.useCallback((event) => {
    if (disabled) return;

    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
      return;
    }

    if (event.key === "Tab") {
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => getNextEnabledIndex(
        normalizedOptions,
        current >= 0 ? current : (selectedIndex >= 0 ? selectedIndex : firstEnabledIndex),
        direction
      ));
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      if (event.key === "Home") {
        setActiveIndex(firstEnabledIndex);
        return;
      }
      setActiveIndex(getNextEnabledIndex(normalizedOptions, 0, -1));
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      selectOption(normalizedOptions[activeIndex >= 0 ? activeIndex : selectedIndex]);
    }
  }, [activeIndex, disabled, firstEnabledIndex, normalizedOptions, open, openMenu, selectOption, selectedIndex]);

  const borderColor = disabled
    ? v.borderInput
    : focused
      ? v.gold
      : hovered
        ? "var(--rukn-border-hover)"
        : v.borderInput;
  const fullscreenPortalContainer = typeof document !== "undefined"
    ? (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement || null)
    : null;
  const menuPortalContainer = portalContainer || fullscreenPortalContainer || (typeof document !== "undefined" ? document.body : null);
  const menu = open && menuPortalContainer ? createPortal(
    <div
      ref={menuRef}
      id={listboxId}
      role="listbox"
      dir={dir}
      style={{
        position: "fixed",
        top: menuPos.top,
        left: menuPos.left,
        visibility: menuPos.visibility,
        zIndex: 13000,
        minWidth: triggerWidth,
        maxWidth: "min(360px, calc(100vw - 24px))",
        maxHeight: "min(270px, calc(100vh - 24px))",
        overflowY: "auto",
        padding: 6,
        borderRadius: 12,
        border: "1px solid var(--rukn-menu-border)",
        background: "var(--rukn-menu-bg)",
        boxShadow: "var(--rukn-menu-shadow)",
      }}
    >
      {normalizedOptions.map((option, index) => {
        const selected = getSelectValueKey(option.value) === getSelectValueKey(value);
        const active = activeIndex === index;
        return (
          <button
            key={option.key}
            id={`${listboxId}-${index}`}
            type="button"
            role="option"
            aria-selected={selected}
            disabled={option.disabled}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => !option.disabled && setActiveIndex(index)}
            onClick={() => selectOption(option)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              border: 0,
              borderRadius: 9,
              background: selected
                ? "var(--rukn-gold-dim)"
                : active
                  ? "rgba(212,175,55,.08)"
                  : "transparent",
              color: selected || active ? v.gold : v.text,
              padding: "8px 10px",
              fontSize: 13,
              fontWeight: selected ? 850 : 650,
              cursor: option.disabled ? "not-allowed" : "pointer",
              opacity: option.disabled ? 0.45 : 1,
              fontFamily: "'Cairo',sans-serif",
              textAlign: "start",
              whiteSpace: "nowrap",
              outline: "none",
            }}
          >
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
              {option.label}
            </span>
            {selected && <AppIcon name="check" size={14} color="currentColor" />}
          </button>
        );
      })}
    </div>,
    menuPortalContainer
  ) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 600, color: focused ? v.gold : v.textMuted }}>
          {label} {required && <span style={{ color: t.danger }}>*</span>}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        aria-required={required || undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setOpen((current) => (disabled ? false : !current))}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        style={{
          width: "100%",
          minHeight: 42,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          background: v.bgSelect,
          border: `1px solid ${borderColor}`,
          borderRadius: 10,
          padding: isRTL ? "10px 14px 10px 11px" : "10px 11px 10px 14px",
          color: hasDisplayValue ? v.text : v.textMuted,
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "'Cairo',sans-serif",
          direction: dir,
          outline: "none",
          transition: "border-color .2s, box-shadow .2s, background .2s",
          boxShadow: focused ? "0 0 0 3px rgba(212,175,55,.15)" : "none",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayLabel || "—"}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          style={{
            flexShrink: 0,
            color: focused || open ? v.gold : v.textMuted,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .18s ease, color .18s ease",
          }}
        />
      </button>
      {menu}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const { t } = useLang();
  const statusKey = ["cleared", "partial", "unpaid", "unassigned_program", "information_incomplete", "deleted_program"].includes(status) ? status : null;
  const label = statusKey === "unassigned_program"
    ? (t.unassignedProgramBadge || status)
    : statusKey === "deleted_program"
      ? (t.deletedProgramBadge || t.deletedProgram || status)
    : statusKey === "information_incomplete"
      ? (t.informationIncompleteStatusBadge || t.informationIncompleteBadge || status)
      : statusKey ? t[`status_${statusKey}`] : status;

  const map = {
    cleared: { bg: "rgba(34,197,94,.15)", color: "#22c55e", dot: "#22c55e" },
    partial: { bg: "rgba(245,158,11,.15)", color: "#f59e0b", dot: "#f59e0b" },
    unpaid:  { bg: "rgba(239,68,68,.15)",  color: "#ef4444", dot: "#ef4444" },
    unassigned_program: { bg: "rgba(148,163,184,.12)", color: "#94a3b8", dot: "#94a3b8" },
    deleted_program: { bg: "rgba(148,163,184,.12)", color: "#94a3b8", dot: "#94a3b8" },
    information_incomplete: { bg: "rgba(245,158,11,.13)", color: "#f59e0b", dot: "#f59e0b" },
  };
  const s = map[statusKey] || map.unpaid;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: s.bg, color: s.color,
      padding: "3px 8px", borderRadius: 999,
      fontSize: 11, fontWeight: 800,
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
export function Modal({
  open,
  onClose,
  title,
  children,
  width = 560,
  portalContainer = null,
  closeOnBackdrop = true,
  closeOnEscape = true,
}) {
  React.useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && closeOnEscape) onClose?.();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeOnEscape, open, onClose]);

  if (!open) return null;

  const modalContent = (
    <div
      className="animate-fadeIn"
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed", inset: 0, zIndex: 12000,
        background: v.overlay,
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px max(16px, env(safe-area-inset-right, 0px)) max(16px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px))",
        overflowY: "auto",
      }}
    >
      <div
        className="animate-scaleIn"
        style={{
          background: v.bgModal,
          border: "1px solid rgba(212,175,55,.3)",
          borderRadius: 20,
          width: "100%", maxWidth: width,
          margin: "auto",
          maxHeight: "min(90vh, 820px)",
          overflow: "hidden",
          display: "flex", flexDirection: "column",
          boxShadow: "0 40px 80px rgba(0,0,0,.6), 0 0 60px rgba(212,175,55,.08)",
          position: "relative",
          zIndex: 1,
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
            <AppIcon name="x" size={16} color="currentColor" />
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

  if (typeof document === "undefined") return modalContent;
  return createPortal(modalContent, portalContainer || document.body);
}

// ── Search Bar ────────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = "ابحث...", style, disabled = false, ...rest }) {
  const { dir } = useLang();
  const isRTL = dir === "rtl";
  return (
    <div style={{ position: "relative", ...style }}>
      <AppIcon name="search" size={18} style={{
        position: "absolute", top: "50%", right: isRTL ? 14 : "auto", left: isRTL ? "auto" : 14,
        transform: "translateY(-50%)",
        color: disabled ? "rgba(148,163,184,.4)" : "rgba(212,175,55,.6)",
        pointerEvents: "none",
      }} />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: "100%",
          background: v.bgInput,
          border: `1px solid ${v.border}`,
          borderRadius: 12,
          padding: isRTL ? "12px 46px 12px 16px" : "12px 16px 12px 46px",
          color: v.text,
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
export function EmptyState({ icon = "empty", title, sub }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "60px 20px", gap: 12,
    }}>
      <IconBubble
        name={typeof icon === "string" ? icon : undefined}
        icon={typeof icon === "function" ? icon : undefined}
        boxSize={54}
        size={24}
        color={t.gold}
        style={{ animation: "float 3s ease-in-out infinite" }}
      />
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
    success: { bg: "rgba(34,197,94,.15)", border: "#22c55e", icon: "success", text: "var(--rukn-text-strong)", close: "var(--rukn-text-muted)" },
    error:   { bg: "rgba(254,226,226,.96)", border: "#dc2626", icon: "error", text: "#111827", close: "#111827" },
    info:    { bg: "rgba(212,175,55,.15)", border: "var(--rukn-gold)", icon: "alert", text: "var(--rukn-text-strong)", close: "var(--rukn-text-muted)" },
  };
  const c = colors[type] || colors.info;

  return (
    <div
      className="animate-slideIn"
      style={{
        position: "fixed", bottom: 24, left: 24, zIndex: 20000,
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
      <AppIcon name={c.icon} size={18} color={c.border} />
      <span style={{ fontSize: 14, fontWeight: 700, color: c.text, flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: c.close, cursor: "pointer", display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
        <AppIcon name="x" size={16} color="currentColor" />
      </button>
    </div>
  );
}
