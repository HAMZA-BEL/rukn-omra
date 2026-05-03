import React from "react";
import { Button, Input, Modal } from "./UI";
import {
  addCustomAirline,
  formatAirlineLabel,
  getAirlineOptions,
  isValidAirlineCode,
  normalizeAirlineCode,
  resolveAirline,
} from "../utils/airlines";

export default function AirlineSelector({ label, value, onChange, error, required }) {
  const [airlines, setAirlines] = React.useState(() => getAirlineOptions());
  const [open, setOpen] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [validation, setValidation] = React.useState("");
  const wrapRef = React.useRef(null);
  const selected = resolveAirline(value, airlines);

  React.useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  const selectAirline = (airline) => {
    onChange?.(airline);
    setOpen(false);
  };

  const createAirline = () => {
    const cleanName = name.trim();
    const cleanCode = normalizeAirlineCode(code);
    if (!cleanName) {
      setValidation("يرجى إدخال اسم شركة الطيران");
      return;
    }
    if (!isValidAirlineCode(cleanCode)) {
      setValidation("الرمز يجب أن يتكون من حرفين فقط");
      return;
    }
    const result = addCustomAirline({ name: cleanName, code: cleanCode });
    if (result.error === "duplicate") {
      setValidation("هذا الرمز موجود مسبقاً");
      return;
    }
    if (result.error) {
      setValidation("تحقق من اسم الشركة والرمز");
      return;
    }
    setAirlines(result.airlines || getAirlineOptions());
    selectAirline(result.airline);
    setName("");
    setCode("");
    setValidation("");
    setModalOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "grid", gap: 6 }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 600, color: error ? "var(--rukn-danger)" : "var(--rukn-text-muted)" }}>
          {label} {required && <span style={{ color: "var(--rukn-danger)" }}>*</span>}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        style={{
          width: "100%",
          minHeight: 42,
          borderRadius: 10,
          border: `1px solid ${error ? "var(--rukn-danger)" : "var(--rukn-border-input)"}`,
          background: "var(--rukn-bg-input)",
          color: selected ? "var(--rukn-text)" : "var(--rukn-text-muted)",
          padding: "10px 14px",
          fontFamily: "'Cairo',sans-serif",
          fontSize: 14,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          textAlign: "start",
        }}
      >
        <span>{selected ? formatAirlineLabel(selected) : "اختر شركة الطيران"}</span>
        <span style={{ color: "var(--rukn-gold)", fontWeight: 900 }}>⌄</span>
      </button>
      {error && <span style={{ fontSize: 12, color: "var(--rukn-danger)" }}>{error}</span>}

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          insetInlineStart: 0,
          width: "100%",
          minWidth: 260,
          zIndex: 80,
          borderRadius: 14,
          border: "1px solid var(--rukn-menu-border, var(--rukn-border-soft))",
          background: "var(--rukn-menu-bg, var(--rukn-bg-card))",
          boxShadow: "var(--rukn-menu-shadow, 0 18px 40px rgba(0,0,0,.26))",
          padding: 6,
        }}>
          {airlines.map((airline) => (
            <button
              key={airline.code}
              type="button"
              onClick={() => selectAirline(airline)}
              style={{
                width: "100%",
                border: "none",
                borderRadius: 10,
                padding: "9px 10px",
                background: selected?.code === airline.code ? "var(--rukn-gold-dim)" : "transparent",
                color: "var(--rukn-text)",
                cursor: "pointer",
                fontFamily: "'Cairo',sans-serif",
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
                textAlign: "start",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800 }}>{airline.name}</span>
              <span style={{ color: "var(--rukn-gold)", fontSize: 12, fontWeight: 900 }}>{airline.code}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setModalOpen(true);
              setValidation("");
            }}
            style={{
              width: "100%",
              marginTop: 4,
              border: "1px dashed var(--rukn-border-soft)",
              borderRadius: 10,
              padding: "9px 10px",
              background: "var(--rukn-bg-soft)",
              color: "var(--rukn-gold)",
              cursor: "pointer",
              fontFamily: "'Cairo',sans-serif",
              fontSize: 12,
              fontWeight: 900,
              textAlign: "center",
            }}
          >
            + إضافة شركة طيران
          </button>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إضافة شركة طيران" width={440}>
        <div style={{ display: "grid", gap: 12 }}>
          <Input label="اسم شركة الطيران" value={name} onChange={(event) => setName(event.target.value)} />
          <Input
            label="الرمز"
            value={code}
            maxLength={2}
            onChange={(event) => setCode(normalizeAirlineCode(event.target.value))}
            placeholder="AT"
          />
          {validation && (
            <p style={{ fontSize: 12, color: "var(--rukn-danger)", fontWeight: 800 }}>{validation}</p>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button variant="primary" onClick={createAirline}>حفظ</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
