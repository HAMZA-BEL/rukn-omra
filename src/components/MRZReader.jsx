import React from "react";
import { Button } from "./UI";
import { theme } from "./styles";
import { parseMRZDetailed } from "../utils/mrzReader";
import { extractMRZFromImage } from "../utils/ocrPassport";
import { useLang } from "../hooks/useLang";
import { AppIcon } from "./Icon";

const tc = theme.colors;
const MAX_BULK_FILES = 10;

const LABELS = {
  ar: {
    title: "استيراد بيانات الجوازات",
    desc: "ارفع صورة جواز أو عدة صور جوازات، وسيتم استخراج بيانات MRZ تلقائيًا. كل نتيجة تمر عبر المراجعة قبل الحفظ.",
    image: "صورة الجواز",
    bulk: "استيراد من الجوازات",
    line1: "السطر الأول MRZ",
    line2: "السطر الثاني MRZ",
    uploadOne: "رفع صورة جواز",
    uploadBulk: "اختر صور الجوازات",
    processing: "قيد القراءة",
    success: "تم بنجاح",
    review: "يحتاج مراجعة",
    failed: "فشل",
    duplicate: "هذا الجواز موجود مسبقًا",
    saveAccepted: "حفظ المقبولين فقط",
    noRows: "لا توجد نتائج للمراجعة بعد",
    status: "الحالة",
    latinLast: "الاسم العائلي اللاتيني",
    latinFirst: "الاسم الشخصي اللاتيني",
    arabicLast: "الاسم العائلي بالعربية",
    arabicFirst: "الاسم الشخصي بالعربية",
    passportNo: "رقم الجواز",
    source: "الملف",
    nationality: "الجنسية",
    birthDate: "تاريخ الميلاد",
    gender: "الجنس",
    expiry: "تاريخ انتهاء الجواز",
    mrzLine1: "MRZ 1",
    mrzLine2: "MRZ 2",
    recheck: "إعادة التحقق",
    trimTo44: "قص إلى 44",
    lineTooLong: "السطر أطول من 44 حرفًا، احذف الحروف الزائدة",
    lineTooShort: "السطر ناقص",
    notes: "ملاحظات",
    accept: "قبول",
    duplicateAction: "التكرار",
    skip: "تجاهل",
    update: "تحديث البيانات",
    delete: "حذف",
    progress: "{done} / {total}",
    saved: "تم حفظ نتائج MRZ المقبولة",
    nothingToSave: "لا توجد نتائج مقبولة للحفظ",
    invalidMRZ: "MRZ غير مكتمل أو يحتاج مراجعة",
    ocrNotFound: "لم يتم العثور على MRZ في الصورة",
    ocrFailed: "تعذرت قراءة الصورة",
    male: "ذكر",
    female: "أنثى",
  },
  fr: {
    title: "Import des données passeport",
    desc: "Importez une photo de passeport ou plusieurs photos, puis les données MRZ seront extraites automatiquement. Chaque résultat passe par une revue avant l'enregistrement.",
    image: "Photo passeport",
    bulk: "Import depuis les passeports",
    line1: "Ligne MRZ 1",
    line2: "Ligne MRZ 2",
    uploadOne: "Importer une photo",
    uploadBulk: "Choisir les photos des passeports",
    processing: "Lecture en cours",
    success: "Réussi",
    review: "À vérifier",
    failed: "Échec",
    duplicate: "Ce passeport existe déjà",
    saveAccepted: "Enregistrer les acceptés",
    noRows: "Aucun résultat à vérifier",
    status: "Statut",
    latinLast: "Nom latin",
    latinFirst: "Prénom latin",
    arabicLast: "Nom arabe",
    arabicFirst: "Prénom arabe",
    passportNo: "N° passeport",
    source: "Fichier",
    nationality: "Nationalité",
    birthDate: "Naissance",
    gender: "Sexe",
    expiry: "Expiration",
    mrzLine1: "MRZ 1",
    mrzLine2: "MRZ 2",
    recheck: "Revalider",
    trimTo44: "Couper à 44",
    lineTooLong: "La ligne dépasse 44 caractères, supprimez les caractères en trop",
    lineTooShort: "Ligne incomplète",
    notes: "Notes",
    accept: "Accepter",
    duplicateAction: "Doublon",
    skip: "Ignorer",
    update: "Mettre à jour",
    delete: "Supprimer",
    progress: "{done} / {total}",
    saved: "Résultats MRZ acceptés enregistrés",
    nothingToSave: "Aucun résultat accepté à enregistrer",
    invalidMRZ: "MRZ incomplète ou à vérifier",
    ocrNotFound: "MRZ introuvable dans l'image",
    ocrFailed: "Lecture de l'image impossible",
    male: "Masculin",
    female: "Féminin",
  },
  en: {
    title: "Import Passport Data",
    desc: "Upload one passport image or several passport images and the MRZ data will be extracted automatically. Every result is reviewed before saving.",
    image: "Passport photo",
    bulk: "Import from passports",
    line1: "MRZ line 1",
    line2: "MRZ line 2",
    uploadOne: "Upload passport photo",
    uploadBulk: "Choose passport images",
    processing: "Reading",
    success: "Success",
    review: "Needs review",
    failed: "Failed",
    duplicate: "This passport already exists",
    saveAccepted: "Save accepted only",
    noRows: "No results to review yet",
    status: "Status",
    latinLast: "Latin last name",
    latinFirst: "Latin first name",
    arabicLast: "Arabic last name",
    arabicFirst: "Arabic first name",
    passportNo: "Passport No.",
    source: "File",
    nationality: "Nationality",
    birthDate: "Birth Date",
    gender: "Gender",
    expiry: "Passport Expiry",
    mrzLine1: "MRZ 1",
    mrzLine2: "MRZ 2",
    recheck: "Recheck",
    trimTo44: "Trim to 44",
    lineTooLong: "Line is longer than 44 characters, remove the extra characters",
    lineTooShort: "Line is incomplete",
    notes: "Notes",
    accept: "Accept",
    duplicateAction: "Duplicate",
    skip: "Skip",
    update: "Update",
    delete: "Delete",
    progress: "{done} / {total}",
    saved: "Accepted MRZ results saved",
    nothingToSave: "No accepted results to save",
    invalidMRZ: "MRZ is incomplete or needs review",
    ocrNotFound: "MRZ not found in image",
    ocrFailed: "Could not read image",
    male: "Male",
    female: "Female",
  },
};

const fieldStyle = {
  width: "100%",
  minWidth: 120,
  background: "rgba(255,255,255,.05)",
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 8,
  color: "#f8fafc",
  padding: "7px 9px",
  fontSize: 12,
  outline: "none",
};

const cleanMRZLine = (value = "") => String(value).toUpperCase().replace(/[^A-Z0-9<]/g, "");
const hasOnlyMRZChars = (value = "") => /^[A-Z0-9<]*$/.test(String(value).toUpperCase());
const mrzCount = (value = "") => String(value || "").length;
const mrzLineOk = (value = "") => mrzCount(value) === 44 && hasOnlyMRZChars(value);
const formatMessage = (template, vars) => Object.entries(vars).reduce((text, [key, value]) => text.replace(`{${key}}`, value), template);
const normalizePassportNo = (value = "") => String(value).trim().toUpperCase().replace(/\s+/g, "");
const normalizeGender = (value) => value === "F" || value === "female" ? "female" : value === "M" || value === "male" ? "male" : "";

const getExistingArabic = (client = {}) => ({
  arabicLastName: client.lastName || client.arabicLastName || client.last_name || "",
  arabicFirstName: client.firstName || client.arabicFirstName || client.first_name || "",
});

const issueText = (issues = [], l, raw = {}) => {
  if (!issues.length) return "";
  return issues.map((issue) => {
    if (issue === "MRZ_MISSING") return l.ocrNotFound;
    if (issue === "LINE1_INVALID_CHARS") return "توجد أحرف غير مسموحة في السطر الأول";
    if (issue === "LINE2_INVALID_CHARS") return "توجد أحرف غير مسموحة في السطر الثاني";
    if (issue === "LINE1_LENGTH") return `السطر الأول ليس 44 حرفًا (${mrzCount(raw.line1)}/44)`;
    if (issue === "LINE2_LENGTH") return `السطر الثاني ليس 44 حرفًا (${mrzCount(raw.line2)}/44)`;
    if (issue === "PASSPORT_CHECK") return "رقم الجواز غير متوافق مع check digit";
    if (issue === "BIRTH_CHECK") return "تاريخ الميلاد غير متوافق";
    if (issue === "EXPIRY_CHECK") return "تاريخ الانتهاء غير متوافق";
    if (issue === "NOT_TD3_PASSPORT") return "السطر الأول لا يبدأ بـ P<";
    if (issue === "PARSE_ERROR") return "فشل OCR أو فشل التحليل";
    return `MRZ: ${issue}`;
  }).join(" · ");
};

const makeRowFromParsed = ({ parsed, source, existing, l, statusOverride, noteOverride, hasImage = false }) => {
  const data = parsed?.data || {};
  const duplicate = Boolean(existing);
  const existingArabic = duplicate ? getExistingArabic(existing) : {};
  const isTrustedMRZ = Boolean(parsed?.ok && parsed?.data);
  const status = statusOverride || (!parsed?.data ? "failed" : isTrustedMRZ && !duplicate ? "success" : "review");
  const note = noteOverride || [
    issueText(parsed?.issues || [], l, parsed?.raw),
    duplicate ? l.duplicate : "",
  ].filter(Boolean).join(" · ");
  return {
    id: `mrz-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    source,
    mrzLine1: parsed?.raw?.line1 || "",
    mrzLine2: parsed?.raw?.line2 || "",
    status,
    accepted: status === "success" && !duplicate,
    duplicateAction: duplicate ? "skip" : "add",
    existingClientId: existing?.id || "",
    note,
    latinLastName: isTrustedMRZ ? (data.latinLastName || data.lastName || "") : "",
    latinFirstName: isTrustedMRZ ? (data.latinFirstName || data.firstName || "") : "",
    arabicLastName: existingArabic.arabicLastName || "",
    arabicFirstName: existingArabic.arabicFirstName || "",
    passportNo: isTrustedMRZ ? (data.passportNo || "") : "",
    nationality: isTrustedMRZ ? (data.nationality || "") : "",
    birthDate: isTrustedMRZ ? (data.birthDate || "") : "",
    gender: isTrustedMRZ ? normalizeGender(data.gender) : "",
    passportExpiry: isTrustedMRZ ? (data.expiryDate || "") : "",
    raw: data.raw || parsed?.raw || {},
    hasImage,
  };
};

function ReviewRow({ row, index, labels, onChange, onRemove, onRecheck }) {
  const statusColor = row.status === "success" ? "#22c55e" : row.status === "failed" ? "#ef4444" : "#f59e0b";
  const renderMRZInput = (key) => {
    const value = row[key] || "";
    const count = mrzCount(value);
    const ok = mrzLineOk(value);
    const tooLong = count > 44;
    const tooShort = count > 0 && count < 44;
    const warning = tooLong ? labels.lineTooLong : tooShort ? labels.lineTooShort : "";
    return (
      <div style={{ minWidth: 240 }}>
        <input
          value={value}
          onChange={(event) => onChange(row.id, { [key]: cleanMRZLine(event.target.value) })}
          style={{
            ...fieldStyle,
            minWidth: 240,
            direction: "ltr",
            fontFamily: "monospace",
            borderColor: ok ? "rgba(34,197,94,.55)" : "rgba(245,158,11,.42)",
          }}
        />
        <div style={{ marginTop: 3, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ color: ok ? "#22c55e" : "#f59e0b", fontSize: 10, fontWeight: 800, direction: "ltr", textAlign: "left" }}>
            {count}/44
          </span>
          {tooLong && (
            <button
              type="button"
              onClick={() => onChange(row.id, { [key]: value.slice(0, 44) })}
              style={{ border: 0, background: "rgba(245,158,11,.16)", color: "#fde68a", borderRadius: 6, padding: "2px 6px", fontSize: 10, fontWeight: 800, cursor: "pointer" }}
            >
              {labels.trimTo44}
            </button>
          )}
        </div>
        {warning && <div style={{ marginTop: 2, color: "#fbbf24", fontSize: 10, lineHeight: 1.35 }}>{warning}</div>}
      </div>
    );
  };
  const canRecheck = mrzLineOk(row.mrzLine1 || "") && mrzLineOk(row.mrzLine2 || "");
  return (
    <tr style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
      <td style={{ padding: 8, color: "#94a3b8", fontWeight: 800 }}>{index + 1}</td>
      <td style={{ padding: 8, color: "#cbd5e1", fontSize: 11, maxWidth: 140, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.source || "—"}</td>
      <td style={{ padding: 8 }}>
        <span style={{ color: statusColor, fontSize: 11, fontWeight: 900 }}>
          {labels[row.status] || labels.review}
        </span>
      </td>
      {["mrzLine1", "mrzLine2"].map((key) => (
        <td key={key} style={{ padding: 6 }}>
          {renderMRZInput(key)}
        </td>
      ))}
      <td style={{ padding: 6 }}>
        <button
          type="button"
          disabled={!canRecheck}
          onClick={() => onRecheck(row.id)}
          style={{ border: 0, background: canRecheck ? "rgba(37,99,235,.14)" : "rgba(148,163,184,.12)", color: canRecheck ? "#bfdbfe" : "#64748b", borderRadius: 8, padding: "7px 10px", fontSize: 11, fontWeight: 800, cursor: canRecheck ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}
        >
          {labels.recheck}
        </button>
      </td>
      {["latinLastName", "latinFirstName", "arabicLastName", "arabicFirstName", "passportNo", "nationality", "birthDate", "passportExpiry"].map((key) => (
        <td key={key} style={{ padding: 6 }}>
          <input
            value={row[key] || ""}
            onChange={(event) => onChange(row.id, { [key]: event.target.value })}
            style={{ ...fieldStyle, minWidth: key.includes("Name") ? 140 : 105, direction: key.includes("latin") || key === "passportNo" ? "ltr" : undefined }}
          />
        </td>
      ))}
      <td style={{ padding: 6 }}>
        <select value={row.gender || ""} onChange={(event) => onChange(row.id, { gender: event.target.value })} style={{ ...fieldStyle, minWidth: 95 }}>
          <option value="" style={{ color: "#111827" }}>—</option>
          <option value="male" style={{ color: "#111827" }}>{labels.male}</option>
          <option value="female" style={{ color: "#111827" }}>{labels.female}</option>
        </select>
      </td>
      <td style={{ padding: 6, minWidth: 150, color: "#cbd5e1", fontSize: 11 }}>{row.note || "—"}</td>
      <td style={{ padding: 6 }}>
        {row.existingClientId ? (
          <select
            value={row.duplicateAction}
            disabled={row.status !== "success"}
            onChange={(event) => onChange(row.id, { duplicateAction: event.target.value, accepted: event.target.value === "update" })}
            style={{ ...fieldStyle, minWidth: 95, opacity: row.status === "success" ? 1 : .55 }}
          >
            <option value="skip" style={{ color: "#111827" }}>{labels.skip}</option>
            <option value="update" style={{ color: "#111827" }}>{labels.update}</option>
          </select>
        ) : (
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#e2e8f0", fontSize: 12 }}>
            <input type="checkbox" checked={Boolean(row.accepted)} disabled={row.status !== "success"} onChange={(event) => onChange(row.id, { accepted: event.target.checked })} />
            {labels.accept}
          </label>
        )}
      </td>
      <td style={{ padding: 6 }}>
        <button type="button" onClick={() => onRemove(row.id)} title={labels.delete} style={{ border: 0, background: "rgba(239,68,68,.12)", color: "#fecaca", borderRadius: 8, width: 30, height: 30, cursor: "pointer" }}>
          <AppIcon name="trash" size={14} />
        </button>
      </td>
    </tr>
  );
}

export default function MRZReader({ store, onToast, onResult, onClose }) {
  const { t, lang } = useLang();
  const l = LABELS[lang] || LABELS.ar;
  const [mode, setMode] = React.useState("image");
  const [rows, setRows] = React.useState([]);
  const [error, setError] = React.useState("");
  const [progress, setProgress] = React.useState({ done: 0, total: 0, active: false });
  const fileRef = React.useRef(null);
  const bulkRef = React.useRef(null);
  const clients = store?.clients || store?.activeClients || [];
  const clientByPassport = React.useMemo(() => {
    const map = new Map();
    clients.forEach((client) => {
      const key = normalizePassportNo(client.passport?.number || client.passportNumber);
      if (key) map.set(key, client);
    });
    return map;
  }, [clients]);

  const findExisting = React.useCallback((passportNo) => clientByPassport.get(normalizePassportNo(passportNo)), [clientByPassport]);
  const addParsedRow = React.useCallback((parsed, source, override = {}) => {
    const passportNo = parsed?.data?.passportNo || "";
    const existing = passportNo ? findExisting(passportNo) : null;
    const row = makeRowFromParsed({ parsed, source, existing, l, ...override });
    setRows((current) => [row, ...current]);
    return row;
  }, [findExisting, l]);

  const processImageFile = React.useCallback(async (file, index = 0) => {
    const outcome = await extractMRZFromImage(file, () => {});
    if (outcome.success) {
      const parsed = parseMRZDetailed(outcome.raw?.line1 || outcome.data?.raw?.line1, outcome.raw?.line2 || outcome.data?.raw?.line2);
      addParsedRow(parsed, file.name || `image-${index + 1}`, { hasImage: true });
    } else if (outcome.raw?.line1 || outcome.raw?.line2) {
      const parsed = parseMRZDetailed(outcome.raw?.line1 || "", outcome.raw?.line2 || "");
      addParsedRow(parsed, file.name || `image-${index + 1}`, {
        statusOverride: "review",
        noteOverride: issueText(parsed.issues || ["PARSE_ERROR"], l, parsed.raw),
        hasImage: true,
      });
    } else {
      addParsedRow({ ok: false, data: null, issues: [outcome.error || "OCR_FAILED"] }, file.name || `image-${index + 1}`, {
        statusOverride: "review",
        noteOverride: outcome.error === "MRZ_NOT_FOUND" ? l.ocrNotFound : l.ocrFailed,
        hasImage: true,
      });
    }
  }, [addParsedRow, l]);

  const processFilesSequentially = React.useCallback(async (fileList) => {
    const files = Array.from(fileList || []).slice(0, MAX_BULK_FILES);
    if (!files.length) return;
    setProgress({ done: 0, total: files.length, active: true });
    for (let index = 0; index < files.length; index += 1) {
      setProgress({ done: index, total: files.length, active: true });
      await processImageFile(files[index], index);
      await new Promise((resolve) => setTimeout(resolve, 40));
      setProgress({ done: index + 1, total: files.length, active: index + 1 < files.length });
    }
  }, [processImageFile]);

  const updateRow = React.useCallback((id, patch) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }, []);

  const recheckRow = React.useCallback((id) => {
    setRows((current) => current.map((row) => {
      if (row.id !== id) return row;
      const parsed = parseMRZDetailed(row.mrzLine1 || "", row.mrzLine2 || "");
      const existing = parsed?.data?.passportNo ? findExisting(parsed.data.passportNo) : null;
      const next = makeRowFromParsed({
        parsed,
        source: row.source,
        existing,
        l,
        statusOverride: parsed.ok && parsed.data ? undefined : "review",
        noteOverride: parsed.ok && parsed.data ? undefined : issueText(parsed.issues || ["PARSE_ERROR"], l, parsed.raw || { line1: row.mrzLine1, line2: row.mrzLine2 }),
      });
      return {
        ...row,
        ...next,
        id: row.id,
        source: row.source,
        hasImage: row.hasImage,
        arabicLastName: row.arabicLastName || next.arabicLastName,
        arabicFirstName: row.arabicFirstName || next.arabicFirstName,
      };
    }));
  }, [findExisting, l]);

  const removeRow = React.useCallback((id) => {
    setRows((current) => current.filter((row) => row.id !== id));
  }, []);

  const toClientPayload = React.useCallback((row) => ({
    firstName: row.arabicFirstName || "",
    lastName: row.arabicLastName || "",
    arabicFirstName: row.arabicFirstName || "",
    arabicLastName: row.arabicLastName || "",
    prenom: row.latinFirstName || "",
    nom: row.latinLastName || "",
    latinFirstName: row.latinFirstName || "",
    latinLastName: row.latinLastName || "",
    nameLatin: [row.latinLastName, row.latinFirstName].filter(Boolean).join(" "),
    gender: row.gender || "",
    passport: {
      number: normalizePassportNo(row.passportNo),
      nationality: row.nationality || "MAR",
      birthDate: row.birthDate || "",
      expiry: row.passportExpiry || "",
      gender: row.gender === "female" ? "F" : row.gender === "male" ? "M" : "",
    },
    notes: row.note || "",
  }), []);

  const saveAccepted = React.useCallback(() => {
    const accepted = rows.filter((row) => row.status === "success" && (row.accepted || row.duplicateAction === "update"));
    if (!accepted.length) {
      onToast?.(l.nothingToSave, "info");
      return;
    }
    accepted.forEach((row) => {
      const payload = toClientPayload(row);
      if (row.existingClientId && row.duplicateAction === "update") {
        const existing = clients.find((client) => client.id === row.existingClientId) || {};
        store?.updateClient?.(row.existingClientId, { ...existing, ...payload, passport: { ...(existing.passport || {}), ...payload.passport } });
      } else if (!row.existingClientId) {
        store?.addClient?.(payload);
      }
    });
    onToast?.(l.saved, "success");
    onClose?.();
  }, [rows, toClientPayload, clients, store, onToast, onClose, l]);

  const firstAccepted = rows.find((row) => row.accepted && !row.existingClientId);
  const applySingleToForm = React.useCallback(() => {
    if (!firstAccepted || !onResult) return;
    onResult({
      lastName: firstAccepted.latinLastName,
      firstName: firstAccepted.latinFirstName,
      passportNo: firstAccepted.passportNo,
      nationality: firstAccepted.nationality,
      birthDate: firstAccepted.birthDate,
      expiryDate: firstAccepted.passportExpiry,
      gender: firstAccepted.gender === "female" ? "F" : "M",
    });
  }, [firstAccepted, onResult]);

  const modeButtons = [
    ["image", l.image],
    ["bulk", l.bulk],
  ];

  return (
    <div style={{ maxWidth: 980, color: "#e2e8f0" }}>
      <div style={{
        padding: 16,
        borderRadius: 14,
        background: "linear-gradient(135deg, rgba(15,23,42,.98), rgba(15,23,42,.92))",
        border: "1px solid rgba(212,175,55,.18)",
        boxShadow: "0 18px 50px rgba(0,0,0,.25)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <h3 style={{ color: tc.gold, fontSize: 17, fontWeight: 900, margin: 0 }}>{l.title}</h3>
            <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 5, lineHeight: 1.6 }}>{l.desc}</p>
          </div>
          {progress.total > 0 && (
            <div style={{ minWidth: 90, textAlign: "center", border: "1px solid rgba(59,130,246,.28)", borderRadius: 12, padding: "8px 10px", color: "#bfdbfe", fontWeight: 900 }}>
              {formatMessage(l.progress, progress)}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
          {modeButtons.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              style={{
                border: `1px solid ${mode === key ? "rgba(212,175,55,.55)" : "rgba(255,255,255,.1)"}`,
                background: mode === key ? "rgba(212,175,55,.16)" : "rgba(255,255,255,.045)",
                color: mode === key ? tc.gold : "#cbd5e1",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "'Cairo',sans-serif",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "image" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <Button variant="secondary" icon="camera" onClick={() => fileRef.current?.click()} disabled={progress.active}>{l.uploadOne}</Button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(event) => processFilesSequentially(event.target.files).finally(() => { event.target.value = ""; })} />
          </div>
        )}

        {mode === "bulk" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <Button variant="secondary" icon="upload" onClick={() => bulkRef.current?.click()} disabled={progress.active}>{l.uploadBulk}</Button>
            <input ref={bulkRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(event) => processFilesSequentially(event.target.files).finally(() => { event.target.value = ""; })} />
          </div>
        )}

        {progress.active && (
          <div style={{ height: 5, background: "rgba(255,255,255,.08)", borderRadius: 999, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ height: "100%", width: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%`, background: "linear-gradient(90deg,#2563eb,#d4af37)" }} />
          </div>
        )}

        {error && <div style={{ color: "#fecaca", border: "1px solid rgba(239,68,68,.28)", background: "rgba(239,68,68,.12)", borderRadius: 10, padding: 10, marginBottom: 12, fontSize: 12 }}>{error}</div>}

        <div style={{ border: "1px solid rgba(255,255,255,.09)", borderRadius: 12, overflow: "auto", maxHeight: 360 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1420 }}>
            <thead style={{ position: "sticky", top: 0, background: "#111827", zIndex: 1 }}>
              <tr>
                {["#", l.source, l.status, l.mrzLine1, l.mrzLine2, "", l.latinLast, l.latinFirst, l.arabicLast, l.arabicFirst, l.passportNo, l.nationality, l.birthDate, l.expiry, l.gender, l.notes, l.duplicateAction, ""].map((head, idx) => (
                  <th key={`${idx}-${head || "blank"}`} style={{ padding: 8, color: "#94a3b8", fontSize: 11, textAlign: "start", whiteSpace: "nowrap" }}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row, index) => (
                <ReviewRow key={row.id} row={row} index={index} labels={l} onChange={updateRow} onRemove={removeRow} onRecheck={recheckRow} />
              )) : (
                <tr><td colSpan={18} style={{ padding: 22, textAlign: "center", color: "#64748b", fontWeight: 800 }}>{l.noRows}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
          <Button variant="ghost" onClick={onClose}>{t.cancel}</Button>
          {onResult && firstAccepted && <Button variant="secondary" icon="passport" onClick={applySingleToForm}>{t.mrzApplyData || l.saveAccepted}</Button>}
          <Button variant="success" icon="success" onClick={saveAccepted} disabled={progress.active}>{l.saveAccepted}</Button>
        </div>
      </div>
    </div>
  );
}
