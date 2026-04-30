import React from "react";
import { Button } from "./UI";
import { theme } from "./styles";
import { parseMRZDetailed } from "../utils/mrzReader";
import { extractMRZFromImage, extractMRZFromImageRegion } from "../utils/ocrPassport";
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
    uploadOne: "رفع صورة جواز",
    uploadBulk: "اختر صور الجوازات",
    readPassport: "قراءة الجواز",
    readPassports: "قراءة الجوازات",
    selectedFiles: "الصور المختارة",
    noImageSelected: "اختر صورة جواز أولًا",
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
    selectMRZ: "تحديد MRZ",
    cropTitle: "تصحيح من صورة الجواز",
    cropHint: "حدد سطرَي MRZ أسفل الجواز ثم أعد القراءة.",
    readCrop: "إعادة القراءة من المنطقة المحددة",
    cropFailed: "تعذر استخراج MRZ بشكل صحيح من المنطقة المحددة",
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
    ocrNoText: "OCR لم ينتج نصًا من منطقة MRZ",
    mrzLine1NotFound: "لم يتم العثور على السطر الأول من MRZ",
    mrzLine2NotFound: "لم يتم العثور على السطر الثاني من MRZ",
    mrzLengthError: "طول سطور MRZ غير صحيح",
    mrzParseFailed: "تم العثور على مرشح MRZ لكنه لم يمر التحقق",
    ocrFailed: "تعذرت قراءة الصورة",
    male: "ذكر",
    female: "أنثى",
  },
  fr: {
    title: "Import des données passeport",
    desc: "Importez une photo de passeport ou plusieurs photos, puis les données MRZ seront extraites automatiquement. Chaque résultat passe par une revue avant l'enregistrement.",
    image: "Photo passeport",
    bulk: "Import depuis les passeports",
    uploadOne: "Importer une photo",
    uploadBulk: "Choisir les photos des passeports",
    readPassport: "Lire le passeport",
    readPassports: "Lire les passeports",
    selectedFiles: "Photos sélectionnées",
    noImageSelected: "Choisissez d'abord une photo de passeport",
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
    selectMRZ: "Sélectionner MRZ",
    cropTitle: "Corriger depuis l'image",
    cropHint: "Sélectionnez les deux lignes MRZ en bas du passeport puis relancez la lecture.",
    readCrop: "Relire la zone sélectionnée",
    cropFailed: "Impossible d'extraire une MRZ valide depuis la zone sélectionnée",
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
    ocrNoText: "L'OCR n'a produit aucun texte depuis la zone MRZ",
    mrzLine1NotFound: "Première ligne MRZ introuvable",
    mrzLine2NotFound: "Deuxième ligne MRZ introuvable",
    mrzLengthError: "Longueur des lignes MRZ incorrecte",
    mrzParseFailed: "Une MRZ candidate a été trouvée mais n'a pas validé les contrôles",
    ocrFailed: "Lecture de l'image impossible",
    male: "Masculin",
    female: "Féminin",
  },
  en: {
    title: "Import Passport Data",
    desc: "Upload one passport image or several passport images and the MRZ data will be extracted automatically. Every result is reviewed before saving.",
    image: "Passport photo",
    bulk: "Import from passports",
    uploadOne: "Upload passport photo",
    uploadBulk: "Choose passport images",
    readPassport: "Read passport",
    readPassports: "Read passports",
    selectedFiles: "Selected images",
    noImageSelected: "Choose a passport image first",
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
    selectMRZ: "Select MRZ",
    cropTitle: "Correct from passport image",
    cropHint: "Select the two MRZ lines at the bottom of the passport, then read the selected area again.",
    readCrop: "Read selected area again",
    cropFailed: "Could not extract a valid MRZ from the selected area",
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
    ocrNoText: "OCR produced no text from the MRZ area",
    mrzLine1NotFound: "MRZ first line was not found",
    mrzLine2NotFound: "MRZ second line was not found",
    mrzLengthError: "MRZ line length is not valid",
    mrzParseFailed: "An MRZ candidate was found but failed validation",
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

const mrzCount = (value = "") => String(value || "").length;
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
    if (issue === "LAST_NAME_MISSING") return "تعذر استخراج الاسم العائلي من MRZ";
    if (issue === "FIRST_NAME_MISSING") return "تعذر استخراج الاسم الشخصي من MRZ";
    if (issue === "NAME_FILLER_NOISE") return "الاسم يحتوي على ضجيج filler من OCR";
    if (issue === "NATIONALITY_MISSING") return "تعذر استخراج الجنسية من MRZ";
    if (issue === "GENDER_MISSING") return "تعذر استخراج الجنس من MRZ";
    if (issue === "PASSPORT_MISSING") return "تعذر استخراج رقم الجواز من MRZ";
    if (issue === "PARSE_ERROR") return "فشل OCR أو فشل التحليل";
    return `MRZ: ${issue}`;
  }).join(" · ");
};

const ocrFailureText = (error, l) => {
  if (error === "OCR_NO_TEXT") return l.ocrNoText;
  if (error === "MRZ_LINE1_NOT_FOUND") return l.mrzLine1NotFound;
  if (error === "MRZ_LINE2_NOT_FOUND") return l.mrzLine2NotFound;
  if (error === "MRZ_LENGTH") return l.mrzLengthError;
  if (error === "PARSE_FAILED") return l.mrzParseFailed;
  if (error === "MRZ_NOT_FOUND") return l.ocrNotFound;
  return l.ocrFailed;
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

function ReviewRow({ row, index, labels, onChange, onRemove, onSelectMRZ }) {
  const statusColor = row.status === "success" ? "#22c55e" : row.status === "failed" ? "#ef4444" : "#f59e0b";
  return (
    <tr style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
      <td style={{ padding: 8, color: "#94a3b8", fontWeight: 800 }}>{index + 1}</td>
      <td style={{ padding: 8, color: "#cbd5e1", fontSize: 11, maxWidth: 140, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.source || "—"}</td>
      <td style={{ padding: 8 }}>
        <span style={{ color: statusColor, fontSize: 11, fontWeight: 900 }}>
          {labels[row.status] || labels.review}
        </span>
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
        {row.hasImage && row.status !== "success" ? (
          <button
            type="button"
            onClick={() => onSelectMRZ(row.id)}
            style={{ border: "1px solid rgba(212,175,55,.3)", background: "rgba(212,175,55,.14)", color: "#fde68a", borderRadius: 8, padding: "7px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {labels.selectMRZ}
          </button>
        ) : (
          <span style={{ color: "#64748b", fontSize: 11 }}>—</span>
        )}
      </td>
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
  const [singleFile, setSingleFile] = React.useState(null);
  const [singlePreviewUrl, setSinglePreviewUrl] = React.useState("");
  const [bulkFiles, setBulkFiles] = React.useState([]);
  const [cropModal, setCropModal] = React.useState({ open: false, rowId: "", url: "", fileName: "" });
  const [cropRect, setCropRect] = React.useState({ x: 4, y: 68, width: 92, height: 24 });
  const [cropReading, setCropReading] = React.useState(false);
  const fileRef = React.useRef(null);
  const bulkRef = React.useRef(null);
  const rowFilesRef = React.useRef(new Map());
  const cropBoxRef = React.useRef(null);
  const cropImageRef = React.useRef(null);
  const cropDragRef = React.useRef(null);
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

  const selectSingleFile = React.useCallback((fileList) => {
    const file = Array.from(fileList || [])[0];
    setSingleFile(file || null);
    setSinglePreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : "";
    });
  }, []);

  const selectBulkFiles = React.useCallback((fileList) => {
    setBulkFiles(Array.from(fileList || []).slice(0, MAX_BULK_FILES));
  }, []);

  React.useEffect(() => () => {
    if (singlePreviewUrl) URL.revokeObjectURL(singlePreviewUrl);
  }, [singlePreviewUrl]);

  const processImageFile = React.useCallback(async (file, index = 0) => {
    const outcome = await extractMRZFromImage(file, () => {});
    let row;
    if (outcome.success) {
      const parsed = parseMRZDetailed(outcome.raw?.line1 || outcome.data?.raw?.line1, outcome.raw?.line2 || outcome.data?.raw?.line2);
      row = addParsedRow(parsed, file.name || `image-${index + 1}`, { hasImage: true });
    } else if (outcome.raw?.line1 || outcome.raw?.line2) {
      const parsed = parseMRZDetailed(outcome.raw?.line1 || "", outcome.raw?.line2 || "");
      row = addParsedRow(parsed, file.name || `image-${index + 1}`, {
        statusOverride: "review",
        noteOverride: issueText(parsed.issues || ["PARSE_ERROR"], l, parsed.raw),
        hasImage: true,
      });
    } else {
      row = addParsedRow({ ok: false, data: null, issues: [outcome.error || "OCR_FAILED"] }, file.name || `image-${index + 1}`, {
        statusOverride: "review",
        noteOverride: ocrFailureText(outcome.error, l),
        hasImage: true,
      });
    }
    if (row?.id) rowFilesRef.current.set(row.id, file);
    return row;
  }, [addParsedRow, l]);

  const openCropModal = React.useCallback((id) => {
    const file = rowFilesRef.current.get(id);
    if (!file) {
      onToast?.(l.ocrFailed, "error");
      return;
    }
    setCropModal((current) => {
      if (current.url) URL.revokeObjectURL(current.url);
      return {
        open: true,
        rowId: id,
        url: URL.createObjectURL(file),
        fileName: file.name || "",
      };
    });
    setCropRect({ x: 4, y: 68, width: 92, height: 24 });
  }, [l.ocrFailed, onToast]);

  const processFilesSequentially = React.useCallback(async (fileList) => {
    const files = Array.from(fileList || []).slice(0, MAX_BULK_FILES);
    if (!files.length) return;
    setError("");
    setRows([]);
    rowFilesRef.current.clear();
    setProgress({ done: 0, total: files.length, active: true });
    for (let index = 0; index < files.length; index += 1) {
      setProgress({ done: index, total: files.length, active: true });
      await processImageFile(files[index], index);
      await new Promise((resolve) => setTimeout(resolve, 40));
      setProgress({ done: index + 1, total: files.length, active: index + 1 < files.length });
    }
  }, [processImageFile]);

  const readSinglePassport = React.useCallback(() => {
    if (!singleFile) {
      setError(l.noImageSelected);
      return;
    }
    processFilesSequentially([singleFile]);
  }, [l.noImageSelected, processFilesSequentially, singleFile]);

  const readBulkPassports = React.useCallback(() => {
    if (!bulkFiles.length) {
      setError(l.noImageSelected);
      return;
    }
    processFilesSequentially(bulkFiles);
  }, [bulkFiles, l.noImageSelected, processFilesSequentially]);

  const updateRow = React.useCallback((id, patch) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }, []);

  const removeRow = React.useCallback((id) => {
    rowFilesRef.current.delete(id);
    setRows((current) => current.filter((row) => row.id !== id));
  }, []);

  const closeCropModal = React.useCallback(() => {
    setCropModal((current) => {
      if (current.url) URL.revokeObjectURL(current.url);
      return { open: false, rowId: "", url: "", fileName: "" };
    });
    setCropReading(false);
  }, []);

  React.useEffect(() => () => {
    if (cropModal.url) URL.revokeObjectURL(cropModal.url);
  }, [cropModal.url]);

  const getCropPoint = React.useCallback((event) => {
    const rect = cropImageRef.current?.getBoundingClientRect() || cropBoxRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  }, []);

  const startCropInteraction = React.useCallback((event, type = "draw") => {
    if (cropReading) return;
    const point = getCropPoint(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    cropDragRef.current = {
      type,
      start: point,
      rect: cropRect,
    };
    if (type === "draw") {
      setCropRect({ x: point.x, y: point.y, width: 1, height: 1 });
    }
  }, [cropReading, cropRect, getCropPoint]);

  React.useEffect(() => {
    const handleMove = (event) => {
      const drag = cropDragRef.current;
      if (!drag) return;
      const point = getCropPoint(event);
      if (!point) return;
      const minSize = 5;
      if (drag.type === "draw") {
        const x = Math.min(drag.start.x, point.x);
        const y = Math.min(drag.start.y, point.y);
        setCropRect({
          x,
          y,
          width: Math.max(minSize, Math.min(Math.abs(point.x - drag.start.x), 100 - x)),
          height: Math.max(minSize, Math.min(Math.abs(point.y - drag.start.y), 100 - y)),
        });
        return;
      }
      if (drag.type === "move") {
        const dx = point.x - drag.start.x;
        const dy = point.y - drag.start.y;
        setCropRect({
          ...drag.rect,
          x: Math.max(0, Math.min(100 - drag.rect.width, drag.rect.x + dx)),
          y: Math.max(0, Math.min(100 - drag.rect.height, drag.rect.y + dy)),
        });
        return;
      }
      const next = { ...drag.rect };
      if (drag.type.includes("e")) next.width = Math.max(minSize, Math.min(100 - next.x, drag.rect.width + (point.x - drag.start.x)));
      if (drag.type.includes("s")) next.height = Math.max(minSize, Math.min(100 - next.y, drag.rect.height + (point.y - drag.start.y)));
      if (drag.type.includes("w")) {
        const newX = Math.max(0, Math.min(drag.rect.x + drag.rect.width - minSize, drag.rect.x + (point.x - drag.start.x)));
        next.width = drag.rect.width + (drag.rect.x - newX);
        next.x = newX;
      }
      if (drag.type.includes("n")) {
        const newY = Math.max(0, Math.min(drag.rect.y + drag.rect.height - minSize, drag.rect.y + (point.y - drag.start.y)));
        next.height = drag.rect.height + (drag.rect.y - newY);
        next.y = newY;
      }
      setCropRect(next);
    };
    const handleUp = () => {
      cropDragRef.current = null;
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [getCropPoint]);

  const readSelectedCrop = React.useCallback(async () => {
    const file = rowFilesRef.current.get(cropModal.rowId);
    if (!file || cropRect.width < 5 || cropRect.height < 5) return;
    setCropReading(true);
    const outcome = await extractMRZFromImageRegion(file, cropRect, () => {});
    const raw = outcome.raw || {};
    const parsed = outcome.success
      ? parseMRZDetailed(raw.line1 || outcome.data?.raw?.line1, raw.line2 || outcome.data?.raw?.line2)
      : parseMRZDetailed(raw.line1 || "", raw.line2 || "");
    const succeeded = Boolean(parsed.ok && parsed.data);
    const existing = parsed?.data?.passportNo ? findExisting(parsed.data.passportNo) : null;
    setRows((current) => current.map((row) => {
      if (row.id !== cropModal.rowId) return row;
      const next = makeRowFromParsed({
        parsed,
        source: row.source,
        existing,
        l,
        statusOverride: succeeded ? undefined : "review",
        noteOverride: succeeded ? undefined : (!raw.line1 && !raw.line2 ? ocrFailureText(outcome.error, l) : issueText(parsed.issues || ["PARSE_ERROR"], l, parsed.raw || raw)),
        hasImage: true,
      });
      return {
        ...row,
        ...next,
        id: row.id,
        source: row.source,
        hasImage: true,
        arabicLastName: row.arabicLastName || next.arabicLastName,
        arabicFirstName: row.arabicFirstName || next.arabicFirstName,
      };
    }));
    setCropReading(false);
    if (succeeded) {
      onToast?.(l.success, "success");
      closeCropModal();
    } else {
      onToast?.(l.cropFailed, "error");
    }
  }, [closeCropModal, cropModal.rowId, cropRect, findExisting, l, onToast]);

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
          <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Button variant="secondary" icon="camera" onClick={() => fileRef.current?.click()} disabled={progress.active}>{l.uploadOne}</Button>
              <Button variant="primary" icon="scan" onClick={readSinglePassport} disabled={progress.active || !singleFile}>{l.readPassport}</Button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(event) => { selectSingleFile(event.target.files); event.target.value = ""; }} />
            </div>
            {singlePreviewUrl && (
              <div style={{ border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,.035)", maxHeight: 260 }}>
                <img src={singlePreviewUrl} alt="" style={{ display: "block", width: "100%", maxHeight: 260, objectFit: "contain" }} />
              </div>
            )}
          </div>
        )}

        {mode === "bulk" && (
          <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Button variant="secondary" icon="upload" onClick={() => bulkRef.current?.click()} disabled={progress.active}>{l.uploadBulk}</Button>
              <Button variant="primary" icon="scan" onClick={readBulkPassports} disabled={progress.active || !bulkFiles.length}>{l.readPassports}</Button>
              <input ref={bulkRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(event) => { selectBulkFiles(event.target.files); event.target.value = ""; }} />
            </div>
            {bulkFiles.length > 0 && (
              <div style={{ border: "1px solid rgba(255,255,255,.09)", borderRadius: 10, padding: 10, background: "rgba(255,255,255,.035)" }}>
                <p style={{ margin: "0 0 6px", color: "#cbd5e1", fontSize: 12, fontWeight: 800 }}>{l.selectedFiles}: {bulkFiles.length}</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {bulkFiles.map((file, index) => (
                    <span key={`${file.name}-${index}`} style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", border: "1px solid rgba(255,255,255,.08)", borderRadius: 999, padding: "4px 8px", color: "#94a3b8", fontSize: 11 }}>
                      {file.name || `image-${index + 1}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {progress.active && (
          <div style={{ height: 5, background: "rgba(255,255,255,.08)", borderRadius: 999, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ height: "100%", width: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%`, background: "linear-gradient(90deg,#2563eb,#d4af37)" }} />
          </div>
        )}

        {error && <div style={{ color: "#fecaca", border: "1px solid rgba(239,68,68,.28)", background: "rgba(239,68,68,.12)", borderRadius: 10, padding: 10, marginBottom: 12, fontSize: 12 }}>{error}</div>}

        <div style={{ border: "1px solid rgba(255,255,255,.09)", borderRadius: 12, overflow: "auto", maxHeight: 360 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1280 }}>
            <thead style={{ position: "sticky", top: 0, background: "#111827", zIndex: 1 }}>
              <tr>
                {["#", l.source, l.status, l.latinLast, l.latinFirst, l.arabicLast, l.arabicFirst, l.passportNo, l.nationality, l.birthDate, l.expiry, l.gender, l.notes, l.selectMRZ, l.duplicateAction, ""].map((head, idx) => (
                  <th key={`${idx}-${head || "blank"}`} style={{ padding: 8, color: "#94a3b8", fontSize: 11, textAlign: "start", whiteSpace: "nowrap" }}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row, index) => (
                <ReviewRow key={row.id} row={row} index={index} labels={l} onChange={updateRow} onRemove={removeRow} onSelectMRZ={openCropModal} />
              )) : (
                <tr><td colSpan={16} style={{ padding: 22, textAlign: "center", color: "#64748b", fontWeight: 800 }}>{l.noRows}</td></tr>
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
      {cropModal.open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: 18,
            background: "rgba(2,6,23,.72)",
            backdropFilter: "blur(8px)",
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCropModal();
          }}
        >
          <div style={{
            width: "min(940px, 96vw)",
            maxHeight: "92vh",
            overflow: "auto",
            borderRadius: 16,
            border: "1px solid rgba(212,175,55,.2)",
            background: "linear-gradient(135deg, rgba(15,23,42,.98), rgba(30,41,59,.96))",
            boxShadow: "0 24px 80px rgba(0,0,0,.45)",
            padding: 16,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, color: tc.gold, fontSize: 17, fontWeight: 900 }}>{l.cropTitle}</h3>
                <p style={{ margin: "5px 0 0", color: "#94a3b8", fontSize: 12, lineHeight: 1.6 }}>{l.cropHint}</p>
                {cropModal.fileName && <div style={{ marginTop: 4, color: "#cbd5e1", fontSize: 11 }}>{cropModal.fileName}</div>}
              </div>
              <button
                type="button"
                onClick={closeCropModal}
                style={{ border: 0, borderRadius: 10, width: 34, height: 34, cursor: "pointer", background: "rgba(255,255,255,.08)", color: "#e2e8f0" }}
              >
                <AppIcon name="x" size={16} />
              </button>
            </div>

            <div style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              maxHeight: "68vh",
              overflow: "auto",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,.12)",
              background: "#020617",
              padding: 8,
            }}>
              <div
                ref={cropBoxRef}
                onMouseDown={(event) => startCropInteraction(event, "draw")}
                style={{
                  position: "relative",
                  display: "inline-block",
                  lineHeight: 0,
                  cursor: cropReading ? "wait" : "crosshair",
                  userSelect: "none",
                }}
              >
                <img
                  ref={cropImageRef}
                  src={cropModal.url}
                  alt=""
                  draggable={false}
                  style={{ display: "block", maxWidth: "100%", maxHeight: "66vh", width: "auto", height: "auto", pointerEvents: "none" }}
                />
                <div
                  onMouseDown={(event) => startCropInteraction(event, "move")}
                  style={{
                    position: "absolute",
                    left: `${cropRect.x}%`,
                    top: `${cropRect.y}%`,
                    width: `${cropRect.width}%`,
                    height: `${cropRect.height}%`,
                    border: "2px solid #d4af37",
                    boxShadow: "0 0 0 9999px rgba(2,6,23,.42), 0 0 18px rgba(212,175,55,.42)",
                    borderRadius: 8,
                    cursor: cropReading ? "wait" : "move",
                    boxSizing: "border-box",
                  }}
                >
                  {["nw", "ne", "sw", "se"].map((handle) => (
                    <span
                      key={handle}
                      onMouseDown={(event) => startCropInteraction(event, handle)}
                      style={{
                        position: "absolute",
                        width: 12,
                        height: 12,
                        borderRadius: 999,
                        background: "#d4af37",
                        border: "2px solid #0f172a",
                        left: handle.includes("w") ? -7 : undefined,
                        right: handle.includes("e") ? -7 : undefined,
                        top: handle.includes("n") ? -7 : undefined,
                        bottom: handle.includes("s") ? -7 : undefined,
                        cursor: handle === "nw" || handle === "se" ? "nwse-resize" : "nesw-resize",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <Button variant="ghost" onClick={closeCropModal}>{t.cancel}</Button>
              <Button
                variant="primary"
                icon="scan"
                onClick={readSelectedCrop}
                disabled={cropReading || cropRect.width < 5 || cropRect.height < 5}
              >
                {cropReading ? l.processing : l.readCrop}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
