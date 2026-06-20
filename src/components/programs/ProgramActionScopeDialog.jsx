import React from "react";
import { Button, Modal } from "../UI";
import { PROGRAM_ACTION_SCOPES } from "../../features/programs/utils/programActionScope";

export default function ProgramActionScopeDialog({
  open,
  title,
  options = [],
  initialScope,
  onClose,
  onConfirm,
  confirmLabel = "تصدير",
  cancelLabel = "إلغاء",
}) {
  const resolvedDefaultScope = React.useMemo(() => {
    if (initialScope && options.some((option) => option.scope === initialScope)) {
      return initialScope;
    }
    if (options.some((option) => option.scope === PROGRAM_ACTION_SCOPES.CURRENT_FILTERED)) {
      return PROGRAM_ACTION_SCOPES.CURRENT_FILTERED;
    }
    return options[0]?.scope || "";
  }, [initialScope, options]);
  const [selectedScope, setSelectedScope] = React.useState(resolvedDefaultScope);

  React.useEffect(() => {
    if (open) setSelectedScope(resolvedDefaultScope);
  }, [open, resolvedDefaultScope]);

  React.useEffect(() => {
    if (!open || !selectedScope) return;
    if (!options.some((option) => option.scope === selectedScope)) {
      setSelectedScope(resolvedDefaultScope);
    }
  }, [open, options, resolvedDefaultScope, selectedScope]);

  const selectedOption = options.find((option) => option.scope === selectedScope);

  return (
    <Modal open={open} onClose={onClose} title={title} width={440}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div role="radiogroup" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {options.map((option) => {
            const active = option.scope === selectedScope;
            return (
              <button
                key={option.scope}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelectedScope(option.scope)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "9px 11px",
                  borderRadius: 14,
                  border: `1px solid ${active ? "rgba(212,175,55,.72)" : "rgba(148,163,184,.18)"}`,
                  background: active
                    ? "linear-gradient(135deg, rgba(212,175,55,.15), rgba(212,175,55,.06))"
                    : "rgba(255,255,255,.035)",
                  boxShadow: active ? "0 10px 26px rgba(212,175,55,.08)" : "inset 0 1px 0 rgba(255,255,255,.04)",
                  color: active ? "var(--rukn-text-strong)" : "var(--rukn-text)",
                  cursor: "pointer",
                  fontFamily: "'Cairo',sans-serif",
                  textAlign: "start",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, flex: 1 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 999,
                      flex: "0 0 auto",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `1px solid ${active ? "var(--rukn-gold)" : "rgba(148,163,184,.42)"}`,
                      background: active ? "rgba(212,175,55,.18)" : "rgba(15,23,42,.18)",
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background: active ? "var(--rukn-gold)" : "transparent",
                      }}
                    />
                  </span>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 850 }}>
                    {option.label}
                  </span>
                </span>
                <span
                  style={{
                    flex: "0 0 auto",
                    minWidth: 34,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: active ? "rgba(212,175,55,.18)" : "rgba(148,163,184,.12)",
                    border: `1px solid ${active ? "rgba(212,175,55,.34)" : "rgba(148,163,184,.16)"}`,
                    color: active ? "var(--rukn-gold)" : "var(--rukn-text-muted)",
                    fontSize: 12,
                    fontWeight: 900,
                    lineHeight: 1.2,
                    textAlign: "center",
                  }}
                >
                  {Number.isFinite(option.count) ? option.count : "—"}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button onClick={() => selectedOption && onConfirm?.(selectedOption.scope)} disabled={!selectedOption}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
