import { Button } from "../UI";
import { AppIcon } from "../Icon";
import { theme } from "../styles";

const tc = theme.colors;

export default function ProgramActionsMenu({
  actionMenuRef,
  lang,
  label,
  open,
  onToggle,
  actions,
  hoveredAction,
  onHoverAction,
}) {
  return (
    <div ref={actionMenuRef} style={{ position:"relative", direction: lang === "ar" ? "rtl" : "ltr" }}>
      <Button
        variant="secondary"
        icon="settings"
        onClick={onToggle}
      >
        {label}
      </Button>
      {open && (
        <div style={{
          position:"absolute",
          top:"calc(100% + 8px)",
          insetInlineEnd:0,
          minWidth:230,
          zIndex:40,
          padding:6,
          borderRadius:14,
          border:"1px solid var(--rukn-menu-border, rgba(212,175,55,.2))",
          background:"var(--rukn-menu-bg, linear-gradient(135deg, rgba(15,23,42,.98), rgba(17,24,39,.96)))",
          boxShadow:"var(--rukn-menu-shadow, 0 22px 55px rgba(0,0,0,.38))",
          backdropFilter:"blur(12px)",
        }}>
          {actions.map((action) => {
            const disabled = Boolean(action.disabled);
            const hovered = hoveredAction === action.key;
            return (
              <button
                key={action.key}
                type="button"
                disabled={disabled}
                onMouseEnter={() => !disabled && onHoverAction(action.key)}
                onMouseLeave={() => onHoverAction(current => current === action.key ? "" : current)}
                onClick={(event) => {
                  if (disabled) {
                    event.preventDefault();
                    return;
                  }
                  action.onClick?.(event);
                }}
                style={{
                  width:"100%",
                  border:0,
                  borderRadius:10,
                  background:hovered && !disabled ? "var(--rukn-gold-dim)" : "transparent",
                  color:disabled ? "var(--rukn-text-muted)" : hovered ? tc.gold : "var(--rukn-text-strong)",
                  display:"flex",
                  alignItems:"center",
                  gap:9,
                  padding:"10px 11px",
                  fontSize:12,
                  fontWeight:800,
                  cursor:disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.6 : 1,
                  textAlign:"start",
                  fontFamily:"'Cairo',sans-serif",
                  transition:"background .16s ease, color .16s ease",
                }}
              >
                <AppIcon name={action.icon} size={15} color={hovered && !disabled ? tc.gold : "var(--rukn-text-muted)"} />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
