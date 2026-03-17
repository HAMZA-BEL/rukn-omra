import React from "react";
import { createPortal } from "react-dom";
import { Button, GlassCard, SearchBar } from "./UI";
import { useLang } from "../hooks/useLang";

export default function TransferSheet({
  open,
  onClose,
  clients = [],
  programs = [],
  occupancy = new Map(),
  onConfirm,
}) {
  const { t } = useLang();
  const [search, setSearch] = React.useState("");
  const [selectedProgramId, setSelectedProgramId] = React.useState(null);
  const dragStartRef = React.useRef(null);
  const dragOffsetRef = React.useRef(0);
  const [dragOffset, setDragOffset] = React.useState(0);
  const handleProgramPick = React.useCallback((programId, disabled) => {
    if (disabled) return;
    setSelectedProgramId(programId);
  }, [setSelectedProgramId]);

  const updateOffset = React.useCallback((value) => {
    dragOffsetRef.current = value;
    setDragOffset(value);
  }, []);

  React.useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedProgramId(null);
      updateOffset(0);
    }
  }, [open, updateOffset]);

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handlePointerMove = React.useCallback((event) => {
    if (dragStartRef.current === null) return;
    const delta = event.clientY - dragStartRef.current;
    updateOffset(delta > 0 ? delta : 0);
  }, [updateOffset]);

  const handlePointerUp = React.useCallback(() => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    if (dragOffsetRef.current > 140) {
      onClose();
    } else {
      updateOffset(0);
    }
    dragStartRef.current = null;
  }, [handlePointerMove, onClose, updateOffset]);

  const handlePointerDown = React.useCallback((event) => {
    dragStartRef.current = event.clientY;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }, [handlePointerMove, handlePointerUp]);

  React.useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  if (!open) return null;

  const q = search.trim().toLowerCase();
  const uniquePrograms = new Set(clients.map((c) => c?.programId).filter(Boolean));
  const excludedIds = uniquePrograms.size === 1 ? uniquePrograms : new Set();

  const filteredPrograms = programs
    .filter((program) => !excludedIds.has(program.id))
    .filter((program) => (program.name || "").toLowerCase().includes(q));

  const subtitle = t.transferSheetSubtitle
    ? t.transferSheetSubtitle.replace("{count}", clients.length)
    : `${clients.length} selected`;

  const handleConfirm = () => {
    if (!selectedProgramId) return;
    onConfirm?.(selectedProgramId);
  };

  return createPortal(
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 9998 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.transferSheetTitle || "اختر البرنامج"}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          transform: `translateY(${dragOffset}px)`,
          transition: dragStartRef.current ? "none" : "transform .25s ease",
        }}
      >
        <div
          style={{
            margin: "0 auto",
            background: "rgba(6,13,26,.96)",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            border: "1px solid rgba(212,175,55,.25)",
            padding: "16px 18px 24px",
            maxWidth: 640,
            width: "100%",
            maxHeight: "82vh",
            minHeight: "38vh",
            overflow: "hidden",
            boxShadow: "0 -24px 60px rgba(0,0,0,.55)",
          }}
        >
          <div
            onPointerDown={handlePointerDown}
            style={{
              width: 60,
              height: 5,
              borderRadius: 999,
              background: "rgba(255,255,255,.2)",
              margin: "0 auto 18px",
              cursor: "grab",
            }}
          />
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 16,
              right: 20,
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,.15)",
              background: "rgba(255,255,255,.04)",
              color: "#f8fafc",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ×
          </button>
          <div style={{ marginBottom: 16, paddingRight: 40 }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: "#f8fafc", marginBottom: 4 }}>
              {t.transferSheetTitle || "اختر البرنامج"}
            </p>
            <p style={{ fontSize: 12, color: "rgba(148,163,184,.8)" }}>{subtitle}</p>
          </div>
          {clients.length === 0 ? (
            <p style={{ color: "rgba(148,163,184,.8)", fontSize: 13 }}>
              {t.noClientsSelected || "يرجى اختيار معتمر واحد على الأقل"}
            </p>
          ) : (
            <>
              <SearchBar
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.transferSearchPlaceholder || "ابحث عن اسم البرنامج..."}
                style={{ marginBottom: 14 }}
              />
              <div
                style={{
                  maxHeight: "45vh",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  paddingInline: 4,
                }}
              >
                {filteredPrograms.length === 0 ? (
                  <p
                    style={{
                      textAlign: "center",
                      color: "rgba(148,163,184,.8)",
                      fontSize: 13,
                      padding: "24px 0",
                    }}
                  >
                    {t.noProgramsTitle || "لا توجد برامج متاحة"}
                  </p>
                ) : (
                  filteredPrograms.map((program) => {
                    const registered = occupancy.get(program.id) || 0;
                    const capacity = program.seats || 0;
                    const willOverflow =
                      capacity > 0 ? registered + clients.length > capacity : false;
                    const isDisabled = willOverflow;
                    const selected = selectedProgramId === program.id;
                    return (
                      <GlassCard
                        key={program.id}
                        role="button"
                        tabIndex={isDisabled ? -1 : 0}
                        aria-disabled={isDisabled}
                        aria-pressed={selected}
                        style={{
                          padding: 14,
                          cursor: isDisabled ? "not-allowed" : "pointer",
                          opacity: isDisabled ? 0.55 : 1,
                          border: selected
                            ? "1px solid rgba(212,175,55,.5)"
                            : "1px solid rgba(255,255,255,.08)",
                          transition: "border .2s, transform .2s",
                          transform: selected ? "translateY(-2px)" : "none",
                          outline: selected ? "2px solid rgba(212,175,55,.35)" : "none",
                        }}
                        onClick={() => handleProgramPick(program.id, isDisabled)}
                        onKeyDown={(event) => {
                          if (isDisabled) return;
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleProgramPick(program.id, false);
                          }
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <p
                              style={{
                                fontSize: 15,
                                fontWeight: 700,
                                color: "#f8fafc",
                                marginBottom: 4,
                              }}
                            >
                              {program.name}
                            </p>
                            <p style={{ fontSize: 11, color: "rgba(148,163,184,.8)" }}>
                              ✈️ {program.departure || "—"} • 🛬 {program.returnDate || "—"}
                            </p>
                          </div>
                          {selected && (
                            <span
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: "50%",
                                border: "1px solid rgba(212,175,55,.5)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#d4af37",
                                fontWeight: 800,
                                fontSize: 14,
                              }}
                            >
                              ✓
                            </span>
                          )}
                          <div style={{ textAlign: "right" }}>
                            <p style={{ fontSize: 11, color: "rgba(148,163,184,.7)" }}>
                              {t.registered || "Registered"}
                            </p>
                            <p style={{ fontSize: 15, fontWeight: 800, color: "#d4af37" }}>
                              {registered}/{capacity || "∞"}
                            </p>
                          </div>
                        </div>
                        {isDisabled && (
                          <p style={{ marginTop: 8, fontSize: 12, color: "rgba(239,68,68,.9)" }}>
                            {t.programFull || "البرنامج ممتلئ"}
                          </p>
                        )}
                      </GlassCard>
                    );
                  })
                )}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                <Button
                  variant="primary"
                  size="md"
                  style={{ flex: 1, minWidth: 160 }}
                  disabled={!selectedProgramId}
                  onClick={handleConfirm}
                >
                  {t.transferConfirm || "تأكيد النقل"}
                </Button>
                <Button variant="ghost" size="md" onClick={onClose}>
                  {t.cancel}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
