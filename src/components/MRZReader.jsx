import React from "react";
import { GlassCard, Button } from "./UI";
import { theme } from "./styles";
import { parseMRZ, extractMRZFromText } from "../utils/mrzReader";
import { extractMRZFromImage } from "../utils/ocrPassport";
import { useLang } from "../hooks/useLang";
import { AppIcon, IconBubble } from "./Icon";

const tc = theme.colors;

/**
 * MRZ Reader Component
 * Three modes:
 * 1. Manual  — paste two MRZ lines directly
 * 2. Image   — upload photo, drag/resize green rectangle over the MRZ strip, click read
 * 3. Text    — paste raw OCR text
 */
export default function MRZReader({ onResult, onClose }) {
  const { t, tr } = useLang();

  const [mode,        setMode]        = React.useState("manual");
  const [line1,       setLine1]       = React.useState("");
  const [line2,       setLine2]       = React.useState("");
  const [textOCR,     setTextOCR]     = React.useState("");
  const [result,      setResult]      = React.useState(null);
  const [error,       setError]       = React.useState("");
  const [preview,     setPreview]     = React.useState(null);
  const [ocrProgress, setOcrProgress] = React.useState(0);
  const [ocrLoading,  setOcrLoading]  = React.useState(false);
  const [ocrError,    setOcrError]    = React.useState("");

  // Crop rectangle in % of the image container dimensions
  const [crop, setCrop] = React.useState({ x: 2, y: 74, w: 96, h: 22 });

  const fileRef          = React.useRef();
  const imgRef           = React.useRef();
  const cropContainerRef = React.useRef();
  const dragRef          = React.useRef(null); // { type, startX, startY, startCrop }

  const maxChars = 44;
  const HANDLE   = 12;
  const HALF     = HANDLE / 2;

  const modeButtons = [
    { id: "manual", label: t.mrzModeManual },
    { id: "image",  label: t.mrzModeImage  },
    { id: "text",   label: t.mrzModeText   },
  ];

  const cleanLength = (v) => v.replace(/[^A-Z0-9<]/gi, "").length;
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

  // ── Crop rectangle: global drag/resize listeners ────────────────────────
  const onCropMouseDown = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
    };
  };

  React.useEffect(() => {
    const MIN_W = 10, MIN_H = 5;

    const onMove = (e) => {
      if (!dragRef.current || !cropContainerRef.current) return;
      const rect = cropContainerRef.current.getBoundingClientRect();
      const dx   = (e.clientX - dragRef.current.startX) / rect.width  * 100;
      const dy   = (e.clientY - dragRef.current.startY) / rect.height * 100;
      const sc   = dragRef.current.startCrop;
      const type = dragRef.current.type;

      setCrop(() => {
        let { x, y, w, h } = sc;
        if (type === "move") {
          x = clamp(sc.x + dx, 0, 100 - sc.w);
          y = clamp(sc.y + dy, 0, 100 - sc.h);
        } else if (type === "br") {
          w = clamp(sc.w + dx, MIN_W, 100 - sc.x);
          h = clamp(sc.h + dy, MIN_H, 100 - sc.y);
        } else if (type === "bl") {
          const nx = clamp(sc.x + dx, 0, sc.x + sc.w - MIN_W);
          w = sc.w - (nx - sc.x); x = nx;
          h = clamp(sc.h + dy, MIN_H, 100 - sc.y);
        } else if (type === "tr") {
          w = clamp(sc.w + dx, MIN_W, 100 - sc.x);
          const ny = clamp(sc.y + dy, 0, sc.y + sc.h - MIN_H);
          h = sc.h - (ny - sc.y); y = ny;
        } else if (type === "tl") {
          const nx = clamp(sc.x + dx, 0, sc.x + sc.w - MIN_W);
          w = sc.w - (nx - sc.x); x = nx;
          const ny = clamp(sc.y + dy, 0, sc.y + sc.h - MIN_H);
          h = sc.h - (ny - sc.y); y = ny;
        }
        return { x, y, w, h };
      });
    };

    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, []);

  // ── Image upload ─────────────────────────────────────────────────────────
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target.result);
      setOcrError("");
      setResult(null);
      setCrop({ x: 2, y: 74, w: 96, h: 22 });
    };
    reader.readAsDataURL(file);
    // reset input so the same file can be re-uploaded
    e.target.value = "";
  };

  // ── Crop → Tesseract ─────────────────────────────────────────────────────
  const handleCropAndRead = async () => {
    const img = imgRef.current;
    if (!img) return;

    setOcrLoading(true);
    setOcrError("");
    setOcrProgress(0);
    setResult(null);
    setError("");

    // Natural pixel coordinates of the selected region
    const sx = Math.round((crop.x / 100) * img.naturalWidth);
    const sy = Math.round((crop.y / 100) * img.naturalHeight);
    const sw = Math.max(1, Math.round((crop.w / 100) * img.naturalWidth));
    const sh = Math.max(1, Math.round((crop.h / 100) * img.naturalHeight));

    const canvas = document.createElement("canvas");
    canvas.width  = sw;
    canvas.height = sh;
    canvas.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    const blob    = await new Promise((res) => canvas.toBlob(res, "image/png"));
    const outcome = await extractMRZFromImage(blob, setOcrProgress);

    setOcrLoading(false);

    if (outcome.success) {
      setResult(outcome.data);
    } else if (outcome.error === "MRZ_NOT_FOUND") {
      setOcrError("لم يتم العثور على MRZ — حرك المستطيل ليشمل السطرين السفليين بالكامل");
    } else if (outcome.error === "PARSE_FAILED") {
      setLine1(outcome.raw?.line1 || "");
      setLine2(outcome.raw?.line2 || "");
      setMode("manual");
      setOcrError("تم اكتشاف MRZ — تحقق من البيانات وعدّلها يدوياً");
    } else {
      setOcrError("خطأ في المعالجة — حاول مرة أخرى أو استخدم الإدخال اليدوي");
    }
  };

  // ── Manual / Text parse ───────────────────────────────────────────────────
  const handleParse = () => {
    setError("");
    let parsed = null;
    if (mode === "manual" && line1.trim() && line2.trim()) {
      const l1 = line1.trim().toUpperCase().replace(/[^A-Z0-9<]/g, "");
      const l2 = line2.trim().toUpperCase().replace(/[^A-Z0-9<]/g, "");
      parsed = parseMRZ(l1, l2);
    } else if (mode === "text" && textOCR.trim()) {
      parsed = extractMRZFromText(textOCR.toUpperCase());
    }
    if (parsed) setResult(parsed);
    else setError(t.mrzErrorParse);
  };

  const handleApply = () => { if (result) onResult(result); };

  const line1Count = cleanLength(line1);
  const line2Count = cleanLength(line2);

  const cornerStyle = (cursor, top, bottom, left, right) => ({
    position: "absolute",
    width: HANDLE, height: HANDLE,
    borderRadius: 2,
    background: "#22c55e",
    border: "2px solid #fff",
    cursor,
    zIndex: 3,
    ...(top    !== undefined && { top:    top    }),
    ...(bottom !== undefined && { bottom: bottom }),
    ...(left   !== undefined && { left:   left   }),
    ...(right  !== undefined && { right:  right  }),
  });

  return (
    <div style={{ maxWidth: 580 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: tc.gold, marginBottom: 6 }}>
          {t.mrzModalHeading}
        </h3>
        <p style={{ fontSize: 12, color: tc.grey, lineHeight: 1.6 }}>
          {t.mrzModalDesc}
        </p>
      </div>

      {/* Mode tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {modeButtons.map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{
            padding: "8px 16px", borderRadius: 10,
            background: mode === m.id ? "rgba(212,175,55,.15)" : "rgba(255,255,255,.04)",
            border: `1px solid ${mode === m.id ? tc.gold : "rgba(255,255,255,.1)"}`,
            color: mode === m.id ? tc.gold : tc.grey,
            fontSize: 12, fontWeight: mode === m.id ? 700 : 400,
            cursor: "pointer", fontFamily: "'Cairo',sans-serif",
          }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* ── Manual mode ── */}
      {mode === "manual" && (
        <GlassCard style={{ padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: tc.grey, marginBottom: 12 }}>
            {t.mrzManualHint}
          </p>
          <div style={{
            background: "rgba(0,0,0,.3)", borderRadius: 8, padding: "10px 12px",
            marginBottom: 14, fontFamily: "monospace", fontSize: 11,
          }}>
            <p style={{ color: "rgba(212,175,55,.5)", marginBottom: 4 }}>{t.mrzExampleLabel}</p>
            <p style={{ color: tc.greenLight }}>P{"<"}MARAARAB{"<"}{"<"}FATIMA{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}</p>
            <p style={{ color: tc.gold }}>MN67682040MAR7107216F2101218{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}{"<"}6</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: tc.grey, display: "block", marginBottom: 5 }}>
                {tr("mrzLine1Label", { max: maxChars })}
              </label>
              <input value={line1} onChange={e => setLine1(e.target.value)}
                placeholder="P<MARAARAB<<FATIMA<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
                style={{
                  width: "100%", background: "rgba(255,255,255,.04)",
                  border: `1px solid ${line1Count >= maxChars ? tc.greenLight : "rgba(255,255,255,.1)"}`,
                  borderRadius: 8, padding: "8px 12px",
                  color: tc.greenLight, fontSize: 12,
                  fontFamily: "monospace", direction: "ltr", outline: "none",
                }} />
              <span style={{ fontSize: 10, color: line1Count >= maxChars ? tc.greenLight : tc.grey }}>
                {tr("mrzLineCounter", { count: line1Count, max: maxChars })}
              </span>
            </div>
            <div>
              <label style={{ fontSize: 12, color: tc.grey, display: "block", marginBottom: 5 }}>
                {tr("mrzLine2Label", { max: maxChars })}
              </label>
              <input value={line2} onChange={e => setLine2(e.target.value)}
                placeholder="MN67682040MAR7107216F2101218<<<<<<<<<<<<6"
                style={{
                  width: "100%", background: "rgba(255,255,255,.04)",
                  border: `1px solid ${line2Count >= maxChars ? tc.gold : "rgba(255,255,255,.1)"}`,
                  borderRadius: 8, padding: "8px 12px",
                  color: tc.gold, fontSize: 12,
                  fontFamily: "monospace", direction: "ltr", outline: "none",
                }} />
              <span style={{ fontSize: 10, color: line2Count >= maxChars ? tc.gold : tc.grey }}>
                {tr("mrzLineCounter", { count: line2Count, max: maxChars })}
              </span>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ── Image mode ── */}
      {mode === "image" && (
        <GlassCard style={{ padding: 16, marginBottom: 16 }}>
          {!preview ? (
            /* Upload zone */
            <div>
              <p style={{ fontSize: 12, color: tc.grey, marginBottom: 12, lineHeight: 1.6 }}>
                {t.mrzImageHint}
              </p>
              <div
                onClick={() => fileRef.current.click()}
                style={{
                  border: "2px dashed rgba(212,175,55,.3)", borderRadius: 12,
                  padding: "30px 20px", textAlign: "center", cursor: "pointer",
                  transition: "border-color .2s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(212,175,55,.6)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(212,175,55,.3)"}
              >
                <IconBubble name="camera" size={22} boxSize={42} style={{ margin:"0 auto 8px" }} />
                <p style={{ fontSize: 14, color: tc.white, fontWeight: 600 }}>{t.mrzUploadPrompt}</p>
                <p style={{ fontSize: 11, color: tc.grey, marginTop: 4 }}>{t.mrzUploadSizeHint}</p>
              </div>
            </div>
          ) : (
            /* Crop interface */
            <div>
              <p style={{ fontSize: 11, color: tc.grey, marginBottom: 8, lineHeight: 1.6 }}>
                ضع المستطيل الأخضر فوق سطري MRZ في أسفل الجواز — اسحبه أو غيّر حجمه من الزوايا
              </p>

              {/* Image + crop overlay */}
              <div
                ref={cropContainerRef}
                style={{
                  position: "relative",
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid rgba(212,175,55,.2)",
                  userSelect: "none",
                }}
              >
                <img
                  ref={imgRef}
                  src={preview}
                  alt="passport"
                  draggable={false}
                  style={{ display: "block", width: "100%", height: "auto" }}
                />

                {/* Crop rectangle */}
                <div
                  onMouseDown={e => onCropMouseDown(e, "move")}
                  style={{
                    position: "absolute",
                    left:   crop.x + "%",
                    top:    crop.y + "%",
                    width:  crop.w + "%",
                    height: crop.h + "%",
                    border: "2px solid #22c55e",
                    /* darken everything outside the selection */
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                    cursor: "move",
                    zIndex: 2,
                    boxSizing: "border-box",
                  }}
                >
                  {/* Corner handles */}
                  <div onMouseDown={e => onCropMouseDown(e, "tl")}
                    style={cornerStyle("nwse-resize", -HALF, undefined, -HALF, undefined)} />
                  <div onMouseDown={e => onCropMouseDown(e, "tr")}
                    style={cornerStyle("nesw-resize", -HALF, undefined, undefined, -HALF)} />
                  <div onMouseDown={e => onCropMouseDown(e, "bl")}
                    style={cornerStyle("nesw-resize", undefined, -HALF, -HALF, undefined)} />
                  <div onMouseDown={e => onCropMouseDown(e, "br")}
                    style={cornerStyle("nwse-resize", undefined, -HALF, undefined, -HALF)} />
                </div>
              </div>

              {/* OCR progress */}
              {ocrLoading && (
                <div style={{ marginTop: 12 }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    fontSize: 12, color: tc.grey, marginBottom: 6,
                  }}>
                    <span>{t.mrzOcrProcessing || "جاري قراءة المنطقة المحددة..."}</span>
                    <span style={{ color: tc.gold }}>{ocrProgress}%</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,.08)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${ocrProgress}%`,
                      background: "linear-gradient(90deg,#22c55e,#d4af37)",
                      borderRadius: 3, transition: "width .3s ease",
                    }} />
                  </div>
                </div>
              )}

              {/* OCR error */}
              {ocrError && !ocrLoading && (
                <div style={{
                  marginTop: 10, padding: "8px 12px",
                  background: "rgba(245,158,11,.1)",
                  border: "1px solid rgba(245,158,11,.3)",
                  borderRadius: 8, fontSize: 12, color: tc.warning,
                }}>
                  <AppIcon name="alert" size={14} color={tc.warning} /> {ocrError}
                </div>
              )}

              {/* Change image */}
              <div style={{ marginTop: 10 }}>
                <Button variant="secondary" size="sm"
                  onClick={() => { setPreview(null); setResult(null); setOcrError(""); fileRef.current.click(); }}>
                  رفع صورة أخرى
                </Button>
              </div>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*"
            style={{ display: "none" }} onChange={handleImageUpload} />
        </GlassCard>
      )}

      {/* ── Text / paste mode ── */}
      {mode === "text" && (
        <GlassCard style={{ padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: tc.grey, marginBottom: 10 }}>
            {t.mrzTextHint}
          </p>
          <textarea
            value={textOCR}
            onChange={e => setTextOCR(e.target.value)}
            placeholder={"P<MARAARAB<<FATIMA<<<<<<<<<<<<<<<<<<<<<<<<\nMN67682040MAR7107216F2101218<<<<<<<<<<<<6"}
            rows={5}
            style={{
              width: "100%", background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.1)", borderRadius: 8,
              padding: "10px 12px", color: tc.greenLight, fontSize: 12,
              fontFamily: "monospace", direction: "ltr", outline: "none",
              resize: "vertical",
            }}
          />
        </GlassCard>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)",
          borderRadius: 10, padding: "10px 14px", marginBottom: 14,
          color: tc.danger, fontSize: 13,
        }}>
          <AppIcon name="error" size={14} color={tc.danger} /> {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <GlassCard gold style={{ padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: tc.greenLight, marginBottom: 12 }}>
            {t.mrzSuccess}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              [t.passportNo,  result.passportNo],
              [t.nationality, result.nationality],
              [t.gender,      result.gender],
              [t.birthDate,   result.birthDate],
              [t.expiry,      result.expiryDate],
              [t.latinName,   result.nameLatin],
            ].map(([k, v]) => (
              <div key={k}>
                <p style={{ fontSize: 10, color: tc.grey }}>{k}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: tc.white,
                  fontFamily: v && /^[A-Z]/.test(v) ? "monospace" : "inherit" }}>
                  {v || "—"}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Button variant="ghost" onClick={onClose}>{t.cancel}</Button>
        {result ? (
          <Button variant="success" icon="success" onClick={handleApply}>
            {t.mrzApplyData}
          </Button>
        ) : mode === "image" && preview ? (
          <Button variant="primary" icon="search" onClick={handleCropAndRead} disabled={ocrLoading}>
            {ocrLoading ? `${ocrProgress}%...` : "قراءة المنطقة المحددة"}
          </Button>
        ) : (
          <Button variant="primary" icon="search" onClick={handleParse}>
            {t.mrzReadData}
          </Button>
        )}
      </div>

    </div>
  );
}
