import React from "react";
import * as XLSX from "xlsx";
import { Button } from "./UI";
import { useLang } from "../hooks/useLang";
import { theme } from "./styles";

const tc = theme.colors;

// ── Field definitions ─────────────────────────────────────────────────────────
const FIELD_DEFS = [
  { key: "name",        label: { ar: "الاسم الكامل",       fr: "Nom complet",        en: "Full Name"       }, required: true,  patterns: /nom|name|اسم|معتمر|pilgrim|fullname/i },
  { key: "phone",       label: { ar: "الهاتف",             fr: "Téléphone",          en: "Phone"           }, required: false, patterns: /phone|tel|هاتف|جوال|رقم/i },
  { key: "city",        label: { ar: "المدينة",            fr: "Ville",              en: "City"            }, required: false, patterns: /city|ville|مدينة/i },
  { key: "salePrice",   label: { ar: "سعر البيع",          fr: "Prix de vente",      en: "Sale Price"      }, required: false, patterns: /price|prix|سعر|مبلغ|tarif/i },
  { key: "roomType",    label: { ar: "نوع الغرفة",         fr: "Type de chambre",    en: "Room Type"       }, required: false, patterns: /room|chambre|غرفة/i },
  { key: "ticketNo",    label: { ar: "رقم التذكرة",        fr: "N° Billet",          en: "Ticket No."      }, required: false, patterns: /ticket|billet|تذكرة/i },
  { key: "passportNo",  label: { ar: "رقم الجواز",         fr: "N° Passeport",       en: "Passport No."    }, required: false, patterns: /passport|passeport|جواز/i },
  { key: "nationality", label: { ar: "الجنسية",            fr: "Nationalité",        en: "Nationality"     }, required: false, patterns: /national|جنسية/i },
  { key: "gender",      label: { ar: "الجنس",              fr: "Sexe",               en: "Gender"          }, required: false, patterns: /gender|sexe|جنس/i },
  { key: "birthDate",   label: { ar: "تاريخ الميلاد",      fr: "Date de naissance",  en: "Birth Date"      }, required: false, patterns: /birth|naissance|ميلاد/i },
  { key: "expiryDate",  label: { ar: "تاريخ انتهاء الجواز", fr: "Expiration",        en: "Expiry Date"     }, required: false, patterns: /expir|انتهاء/i },
  { key: "notes",       label: { ar: "ملاحظات",            fr: "Notes",              en: "Notes"           }, required: false, patterns: /note|ملاحظ/i },
];

function autoDetect(hdrs) {
  const map = {};
  FIELD_DEFS.forEach(({ key, patterns }) => {
    const idx = hdrs.findIndex(h => patterns.test(String(h)));
    if (idx !== -1) map[key] = String(idx);
  });
  return map;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ImportClientsModal({ store, onClose, onToast }) {
  const { t, dir, lang } = useLang();
  const isRTL = dir === "rtl";

  const [stage,           setStage]           = React.useState(1);
  const [headers,         setHeaders]         = React.useState([]);
  const [rows,            setRows]            = React.useState([]);
  const [mapping,         setMapping]         = React.useState({});
  const [selectedProgram, setSelectedProgram] = React.useState("");
  const [report,          setReport]          = React.useState(null);
  const [dragging,        setDragging]        = React.useState(false);
  const [error,           setError]           = React.useState("");
  const fileRef = React.useRef();

  const fieldLabel = (key) => {
    const def = FIELD_DEFS.find(f => f.key === key);
    return def ? (def.label[lang] || def.label.ar) : key;
  };

  const parseFile = (file) => {
    setError("");
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      setError(t.importFileTypeError || "يجب أن يكون الملف بصيغة Excel أو CSV");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: "array" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (!data || data.length < 2) {
          setError(t.importEmptyFile || "الملف فارغ أو لا يحتوي على بيانات");
          return;
        }
        const hdrs = data[0].map(String);
        const rws  = data.slice(1).filter(r => r.some(v => String(v).trim() !== ""));
        setHeaders(hdrs);
        setRows(rws);
        setMapping(autoDetect(hdrs));
        setStage(2);
      } catch {
        setError(t.importParseError || "تعذّر قراءة الملف — تحقق من التنسيق");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const doImport = () => {
    let imported = 0;
    let skipped  = 0;
    const skippedReasons = [];

    rows.forEach((row, idx) => {
      let name = "";
      if (mapping.name !== undefined && mapping.name !== "") {
        name = String(row[Number(mapping.name)] || "").trim();
      }
      if (!name) {
        skipped++;
        skippedReasons.push(idx + 2); // +2 for 1-based + header row
        return;
      }

      const get = (key) => {
        const colIdx = mapping[key];
        if (colIdx === undefined || colIdx === "") return "";
        const val = row[Number(colIdx)];
        return val === undefined || val === null ? "" : String(val).trim();
      };
      const getNum = (key) => {
        const v = get(key);
        const n = parseFloat(v.replace(/[^\d.]/g, ""));
        return isNaN(n) ? 0 : n;
      };

      store.addClient({
        name,
        programId:   selectedProgram || null,
        phone:       get("phone"),
        city:        get("city"),
        salePrice:   getNum("salePrice"),
        officialPrice: getNum("salePrice"),
        roomType:    get("roomType"),
        ticketNo:    get("ticketNo"),
        notes:       get("notes"),
        passport: {
          number:      get("passportNo"),
          nationality: get("nationality") || "MAR",
          gender:      get("gender")      || "M",
          birthDate:   get("birthDate"),
          expiry:      get("expiryDate"),
          issueDate:   "",
        },
      });
      imported++;
    });

    setReport({ imported, skipped, skippedReasons });
    setStage(3);
    if (imported > 0) {
      onToast?.(
        (t.importClientsSuccess || "تم استيراد {n} معتمر").replace("{n}", imported),
        "success"
      );
    }
  };

  // ── Stage 1: Upload ──────────────────────────────────────────────────────────
  if (stage === 1) return (
    <div style={{ direction: dir, fontFamily: "'Cairo',sans-serif" }}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? tc.gold : "rgba(212,175,55,.3)"}`,
          borderRadius: 16,
          padding: "48px 24px",
          textAlign: "center",
          background: dragging ? "rgba(212,175,55,.06)" : "rgba(255,255,255,.02)",
          cursor: "pointer",
          transition: "all .2s",
          marginBottom: 16,
        }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>📊</div>
        <p style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc", marginBottom: 6 }}>
          {t.importDropHint || "اسحب ملف Excel أو CSV وأفلته هنا"}
        </p>
        <p style={{ fontSize: 12, color: tc.grey, marginBottom: 20 }}>
          {t.importDropOr || "أو اضغط لاختيار الملف"} — .xlsx, .xls, .csv
        </p>
        <Button variant="primary" icon="📂" onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>
          {t.importChooseFile || "اختيار ملف"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: "none" }}
          onChange={e => { if (e.target.files[0]) parseFile(e.target.files[0]); }}
        />
      </div>

      {error && (
        <div style={{
          padding: "10px 14px", borderRadius: 10,
          background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)",
          color: tc.danger, fontSize: 13,
        }}>{error}</div>
      )}

      {/* Instructions */}
      <div style={{
        padding: "14px 16px", borderRadius: 12,
        background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)",
        marginTop: 8,
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: tc.gold, marginBottom: 8 }}>
          {t.importTips || "💡 تلميح للاستيراد الأمثل:"}
        </p>
        <ul style={{ fontSize: 12, color: tc.grey, paddingInlineStart: 20, lineHeight: 2 }}>
          <li>{t.importTip1 || "يجب أن يحتوي الملف على صف عناوين (Header row) في الأعلى"}</li>
          <li>{t.importTip2 || "سيتم اكتشاف الأعمدة تلقائياً — يمكنك تعديلها في الخطوة التالية"}</li>
          <li>{t.importTip3 || "حقل الاسم الكامل مطلوب — السجلات بدون اسم ستُتخطى"}</li>
        </ul>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <Button variant="ghost" onClick={onClose}>{t.cancel}</Button>
      </div>
    </div>
  );

  // ── Stage 2: Column mapping ──────────────────────────────────────────────────
  if (stage === 2) {
    const NONE_VAL = "";
    const preview  = rows.slice(0, 4);

    return (
      <div style={{ direction: dir, fontFamily: "'Cairo',sans-serif" }}>
        {/* File stats */}
        <div style={{
          display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16,
        }}>
          <Chip icon="📄" label={`${rows.length} ${t.importRowsFound || "صف مكتشف"}`} />
          <Chip icon="🗂️" label={`${headers.length} ${t.importColsFound || "عمود"}`} />
        </div>

        {/* Program selector */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, color: tc.grey, display: "block", marginBottom: 6 }}>
            {t.importAssignProgram || "تعيين البرنامج (اختياري)"}
          </label>
          <select
            value={selectedProgram}
            onChange={e => setSelectedProgram(e.target.value)}
            style={selectStyle(dir)}>
            <option value="">{t.importNoProgram || "— بدون تعيين برنامج —"}</option>
            {store.programs.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Mapping grid */}
        <p style={{ fontSize: 12, fontWeight: 700, color: tc.gold, marginBottom: 10 }}>
          {t.importMapColumns || "ربط الأعمدة بالحقول"}
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 10,
          marginBottom: 20,
          maxHeight: 300,
          overflowY: "auto",
          paddingInlineEnd: 4,
        }}>
          {FIELD_DEFS.map(({ key, required }) => (
            <div key={key} style={{
              padding: "10px 12px", borderRadius: 10,
              background: "rgba(255,255,255,.03)",
              border: `1px solid ${mapping[key] !== undefined && mapping[key] !== "" ? "rgba(212,175,55,.3)" : "rgba(255,255,255,.08)"}`,
            }}>
              <label style={{
                fontSize: 11, color: mapping[key] !== undefined && mapping[key] !== "" ? tc.gold : tc.grey,
                display: "block", marginBottom: 5, fontWeight: 600,
              }}>
                {fieldLabel(key)}{required && <span style={{ color: tc.danger }}> *</span>}
              </label>
              <select
                value={mapping[key] !== undefined ? String(mapping[key]) : NONE_VAL}
                onChange={e => setMapping(prev => ({ ...prev, [key]: e.target.value }))}
                style={{ ...selectStyle(dir), padding: "5px 8px", fontSize: 11 }}>
                <option value={NONE_VAL}>{t.importIgnore || "— تجاهل —"}</option>
                {headers.map((h, i) => (
                  <option key={i} value={String(i)}>{h || `Col ${i + 1}`}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Preview table */}
        <p style={{ fontSize: 12, fontWeight: 700, color: tc.gold, marginBottom: 8 }}>
          {t.importPreview || "معاينة البيانات"} ({Math.min(rows.length, 4)} {t.importOf || "من"} {rows.length})
        </p>
        <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", marginBottom: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: "rgba(212,175,55,.08)" }}>
                {headers.map((h, i) => (
                  <th key={i} style={{
                    padding: "8px 10px", color: tc.gold, fontWeight: 700,
                    borderBottom: "1px solid rgba(255,255,255,.06)",
                    textAlign: isRTL ? "right" : "left", whiteSpace: "nowrap",
                  }}>{h || `Col ${i + 1}`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  {headers.map((_, ci) => (
                    <td key={ci} style={{
                      padding: "7px 10px", color: "#f8fafc",
                      textAlign: isRTL ? "right" : "left", maxWidth: 140,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{String(row[ci] ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <Button variant="ghost" onClick={() => setStage(1)}>
            {t.back || "رجوع"}
          </Button>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" onClick={onClose}>{t.cancel}</Button>
            <Button
              variant="primary"
              icon="✅"
              disabled={mapping.name === undefined || mapping.name === ""}
              onClick={doImport}>
              {t.importConfirm || "تأكيد الاستيراد"} ({rows.length})
            </Button>
          </div>
        </div>

        {(mapping.name === undefined || mapping.name === "") && (
          <p style={{ fontSize: 11, color: tc.danger, marginTop: 8, textAlign: "center" }}>
            {t.importNameRequired || "⚠️ يجب ربط حقل الاسم الكامل أولاً"}
          </p>
        )}
      </div>
    );
  }

  // ── Stage 3: Report ──────────────────────────────────────────────────────────
  return (
    <div style={{ direction: dir, fontFamily: "'Cairo',sans-serif", textAlign: "center", padding: "24px 0" }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>
        {report.imported > 0 ? "✅" : "⚠️"}
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc", marginBottom: 24 }}>
        {t.importDone || "اكتمل الاستيراد"}
      </h3>

      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 28 }}>
        <StatCard
          value={report.imported}
          label={t.importImported || "تم استيراده"}
          color={tc.greenLight}
          bg="rgba(34,197,94,.1)"
          border="rgba(34,197,94,.25)"
        />
        <StatCard
          value={report.skipped}
          label={t.importSkipped || "تم تخطيه"}
          color={tc.warning}
          bg="rgba(245,158,11,.08)"
          border="rgba(245,158,11,.2)"
        />
      </div>

      {report.skipped > 0 && (
        <p style={{ fontSize: 12, color: tc.grey, marginBottom: 20 }}>
          {t.importSkipReason || "السجلات المتخطاة: صفوف لا تحتوي على اسم"}
          {report.skippedReasons.length <= 8
            ? ` (${t.importRows || "الصفوف"} ${report.skippedReasons.join(", ")})`
            : ""}
        </p>
      )}

      <Button variant="primary" onClick={onClose}>
        {t.close || "إغلاق"}
      </Button>
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────
function Chip({ icon, label }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 12px", borderRadius: 20,
      background: "rgba(212,175,55,.1)", border: "1px solid rgba(212,175,55,.2)",
      fontSize: 12, color: tc.gold, fontWeight: 600,
      fontFamily: "'Cairo',sans-serif",
    }}>
      {icon} {label}
    </span>
  );
}

function StatCard({ value, label, color, bg, border }) {
  return (
    <div style={{
      padding: "18px 32px", borderRadius: 14,
      background: bg, border: `1px solid ${border}`,
      minWidth: 120,
    }}>
      <p style={{ fontSize: 32, fontWeight: 900, color, marginBottom: 4 }}>{value}</p>
      <p style={{ fontSize: 13, color: tc.grey }}>{label}</p>
    </div>
  );
}

function selectStyle(dir) {
  return {
    width: "100%",
    background: "rgba(255,255,255,.05)",
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 8,
    padding: "8px 10px",
    color: "#f8fafc",
    fontSize: 12,
    fontFamily: "'Cairo',sans-serif",
    cursor: "pointer",
    direction: dir,
  };
}
