import React from "react";
import { createPortal } from "react-dom";
import { Button, GlassCard } from "../UI";
import { AppIcon } from "../Icon";
import { theme } from "../styles";

const tc = theme.colors;

function BulkMenuBtn({ icon, label, onClick, color, hoverBg, isRTL, border }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display:"flex", alignItems:"center", gap:10,
        flexDirection: isRTL ? "row" : "row-reverse",
        width:"100%", padding:"11px 16px",
        background: hov ? hoverBg : "transparent",
        border:"none",
        borderBottom: border ? "1px solid var(--rukn-menu-divider, rgba(255,255,255,.06))" : "none",
        color, fontSize:13, fontWeight:600,
        cursor:"pointer", fontFamily:"'Cairo',sans-serif",
        textAlign: isRTL ? "right" : "left",
        transition:"background .15s",
      }}>
      <AppIcon name={icon} size={15} color={color} />
      <span>{label}</span>
    </button>
  );
}

export default function BulkClientActionsBar({
  selectedCount,
  selectedCountLabel,
  bulkActionsOpen,
  bulkActionsBtnRef,
  bulkActionsMenuRef,
  bulkActionsMenuPos,
  onToggleBulkActions,
  onTransferSelected,
  onDeleteSelected,
  onExitSelectMode,
  t,
  isRTL,
}) {
  return (
    <GlassCard style={{ padding:"10px 14px", marginBottom:14 }}>
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:13, color:tc.gold, fontWeight:700 }}>
          {selectedCountLabel}
        </span>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center" }}>
          <div style={{ position:"relative" }}>
            <button
              ref={bulkActionsBtnRef}
              type="button"
              onClick={onToggleBulkActions}
              disabled={selectedCount === 0}
              title={t.bulkActions || "Actions"}
              style={{
                width:34,
                height:32,
                borderRadius:9,
                border:`1px solid ${bulkActionsOpen ? "var(--rukn-border-hover)" : "var(--rukn-border-soft)"}`,
                background:bulkActionsOpen ? "var(--rukn-gold-dim)" : "var(--rukn-bg-soft)",
                color:bulkActionsOpen ? tc.gold : tc.grey,
                cursor:selectedCount === 0 ? "not-allowed" : "pointer",
                opacity:selectedCount === 0 ? .55 : 1,
                display:"inline-flex",
                alignItems:"center",
                justifyContent:"center",
                fontSize:18,
                fontWeight:900,
                letterSpacing:1,
                transition:"all .15s",
              }}
              aria-label={t.bulkActions || "Actions"}
            >
              ···
            </button>
            {bulkActionsOpen && createPortal(
              <div
                ref={bulkActionsMenuRef}
                style={{
                  position:"fixed",
                  top:bulkActionsMenuPos.top,
                  left:bulkActionsMenuPos.left,
                  visibility:bulkActionsMenuPos.visibility,
                  zIndex:9999,
                  background:"var(--rukn-menu-bg, rgba(20,30,50,0.96))",
                  border:"1px solid var(--rukn-menu-border, rgba(212,175,55,.3))",
                  borderRadius:12,
                  boxShadow:"var(--rukn-menu-shadow, 0 10px 25px rgba(0,0,0,0.35))",
                  minWidth:220,
                  overflow:"hidden",
                }}
              >
                <BulkMenuBtn
                  icon="refresh"
                  label={t.transferSelected}
                  onClick={onTransferSelected}
                  color="var(--rukn-text-strong)"
                  hoverBg="var(--rukn-gold-dim)"
                  isRTL={isRTL}
                  border
                />
                <BulkMenuBtn
                  icon="trash"
                  label={t.deleteSelected}
                  onClick={onDeleteSelected}
                  color="var(--rukn-danger)"
                  hoverBg="var(--rukn-danger-dim)"
                  isRTL={isRTL}
                />
              </div>,
              document.body
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onExitSelectMode}
          >
            {t.cancel}
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}
