import React from "react";
import { Button } from "./UI";
import { theme } from "./styles";
import { parseMRZDetailed } from "../utils/mrzReader";
import {
  convertDisplayedCropToNaturalRect,
  extractMRZFromImage,
  extractMRZFromImageRegion,
  normalizeMRZOCRText,
} from "../utils/ocrPassport";
import { useLang } from "../hooks/useLang";
import { AppIcon } from "./Icon";
import {
  getPackageRoomPrice,
  getRoomTypeLabel,
  getRoomTypeOptions,
  normalizeProgramPackages,
  normalizeRoomTypeKey,
} from "../utils/programPackages";
import { translateHotelLevel, translateRoomCategory, translateRoomType } from "../utils/i18nValues";

const tc = theme.colors;
const MAX_BULK_FILES = 10;
const ROW_STATUS = {
  READY: "ready",
  MANUALLY_ACCEPTED: "manually_accepted",
  NEEDS_REVIEW: "needs_review",
  FAILED: "failed",
};
const EXTRACTION_SOURCE = {
  AUTOMATIC_MRZ: "automatic_mrz",
  MANUAL_MRZ: "manual_mrz",
  FALLBACK_OCR: "fallback_ocr",
};
const REVIEW_REASON = {
  CHECKSUM_FAILED: "checksum_failed",
  PARTIAL_MRZ_READ: "partial_mrz_read",
  SUSPICIOUS_NAME: "suspicious_name",
  MISSING_REQUIRED_FIELD: "missing_required_field",
  DUPLICATE_EXISTING: "duplicate_existing",
};

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
    success: "جاهز",
    ready: "جاهز",
    manually_accepted: "مقبول يدويًا",
    review: "يحتاج مراجعة",
    needs_review: "يحتاج مراجعة",
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
    dataSource: "مصدر البيانات",
    automatic_mrz: "قراءة تلقائية",
    manual_mrz: "تحديد يدوي",
    fallback_ocr: "OCR احتياطي",
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
    accept: "قبول بعد المراجعة",
    duplicateAction: "التكرار",
    skip: "تجاهل",
    update: "تحديث البيانات",
    delete: "حذف",
    progress: "{done} / {total}",
    saved: "تم حفظ نتائج MRZ المقبولة",
    nothingToSave: "لا توجد نتائج مقبولة للحفظ",
    invalidMRZ: "MRZ غير مكتمل أو يحتاج مراجعة",
    saveBlockedRows: "بعض الصفوف تحتاج قبولًا يدويًا أو تنقصها حقول مطلوبة.",
    reviewNeedsCorrection: "بعض البيانات المستخرجة تحتاج مراجعة. صحح الحقول المظللة قبل الحفظ.",
    reviewReasonMessages: {
      suspicious_name: "الاسم المستخرج غير موثوق ويحتاج مراجعة",
      checksum_failed: "بيانات MRZ غير مطابقة للتحقق الآلي",
      partial_mrz_read: "تمت قراءة MRZ جزئيًا فقط",
      missing_required_field: "بعض الحقول المطلوبة ناقصة",
      duplicate_existing: "هذا الجواز يبدو موجودًا مسبقًا",
    },
    ocrNotFound: "لم يتم العثور على نص في المنطقة المحددة. تأكد من وضوح الصورة ومن تحديد سطرَي MRZ فقط.",
    ocrNoText: "لم يتم العثور على نص في المنطقة المحددة. تأكد من وضوح الصورة ومن تحديد سطرَي MRZ فقط.",
    mrzFormatNotRecognized: "تم العثور على نص، لكن لم يتم التعرف على صيغة MRZ. جرّب تحديد السطرين فقط أسفل الجواز أو أدخل البيانات يدويًا.",
    imageTooSmall: "جودة الصورة غير كافية لقراءة الجواز. جرّب صورة أوضح.",
    mrzLine1NotFound: "لم يتم العثور على السطر الأول من MRZ",
    mrzLine2NotFound: "لم يتم العثور على السطر الثاني من MRZ",
    mrzLengthError: "طول سطور MRZ غير صحيح",
    mrzParseFailed: "تم العثور على مرشح MRZ لكنه لم يمر التحقق",
    ocrFailed: "تعذرت قراءة الصورة",
    male: "ذكر",
    female: "أنثى",
    programContext: "سيتم إضافة المعتمرين إلى برنامج: {program}",
    packageLabel: "المستوى",
    roomType: "نوع الغرفة",
    roomCategory: "تصنيف الغرفة",
    phone: "الهاتف",
    applyToAll: "تطبيق على الكل",
    selectPackage: "اختر المستوى",
    selectRoomType: "اختر نوع الغرفة",
    selectRoomCategory: "اختر تصنيف الغرفة",
    maleOnly: "رجال فقط",
    femaleOnly: "نساء فقط",
    groupInRoom: "جمع في غرفة واحدة",
    groupHint: "اختر معتمرين من جدول المراجعة ثم اجمعهم في غرفة واحدة.",
    selectedRows: "المحددون",
    programRequired: "يجب اختيار البرنامج والمستوى ونوع الغرفة قبل حفظ الجوازات المستوردة.",
    packageRequired: "يرجى تحديد المستوى قبل الحفظ",
    roomTypeRequired: "يرجى تحديد نوع الغرفة قبل الحفظ",
    assignmentRequired: "يجب اختيار البرنامج والمستوى ونوع الغرفة قبل حفظ الجوازات المستوردة.",
    assignmentNotice: "سيتم حفظ جميع المعتمرين المستوردين بهذا المستوى ونوع الغرفة.",
    saveRowFailed: "فشل حفظ هذا الصف",
    savedRow: "تم حفظ هذا الصف",
    grouped: "تم إنشاء مجموعة غرفة واحدة للمعتمرين المحددين",
    family: "عائلة",
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
    success: "Prêt",
    ready: "Prêt",
    manually_accepted: "Accepté manuellement",
    review: "À vérifier",
    needs_review: "À vérifier",
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
    dataSource: "Source",
    automatic_mrz: "MRZ automatique",
    manual_mrz: "Sélection manuelle",
    fallback_ocr: "OCR secours",
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
    accept: "Accepter après vérification",
    duplicateAction: "Doublon",
    skip: "Ignorer",
    update: "Mettre à jour",
    delete: "Supprimer",
    progress: "{done} / {total}",
    saved: "Résultats MRZ acceptés enregistrés",
    nothingToSave: "Aucun résultat accepté à enregistrer",
    invalidMRZ: "MRZ incomplète ou à vérifier",
    saveBlockedRows: "Certaines lignes nécessitent une acceptation manuelle ou des champs obligatoires sont manquants.",
    reviewNeedsCorrection: "Certaines données extraites nécessitent une vérification. Corrigez les champs surlignés avant l’enregistrement.",
    reviewReasonMessages: {
      suspicious_name: "Le nom extrait n’est pas fiable et doit être vérifié",
      checksum_failed: "Les données MRZ ne correspondent pas au contrôle automatique",
      partial_mrz_read: "La MRZ n’a été lue que partiellement",
      missing_required_field: "Certains champs obligatoires sont manquants",
      duplicate_existing: "Ce passeport semble déjà exister",
    },
    ocrNotFound: "Aucun texte n’a été détecté dans la zone sélectionnée. Vérifiez la netteté de l’image et sélectionnez uniquement les deux lignes MRZ.",
    ocrNoText: "Aucun texte n’a été détecté dans la zone sélectionnée. Vérifiez la netteté de l’image et sélectionnez uniquement les deux lignes MRZ.",
    mrzFormatNotRecognized: "Du texte a été détecté, mais le format MRZ n’a pas été reconnu. Sélectionnez uniquement les deux lignes en bas du passeport ou saisissez les données manuellement.",
    imageTooSmall: "La qualité de l’image est insuffisante pour lire le passeport. Essayez une image plus nette.",
    mrzLine1NotFound: "Première ligne MRZ introuvable",
    mrzLine2NotFound: "Deuxième ligne MRZ introuvable",
    mrzLengthError: "Longueur des lignes MRZ incorrecte",
    mrzParseFailed: "Une MRZ candidate a été trouvée mais n'a pas validé les contrôles",
    ocrFailed: "Lecture de l'image impossible",
    male: "Masculin",
    female: "Féminin",
    programContext: "Les pèlerins seront ajoutés au programme : {program}",
    packageLabel: "Niveau",
    roomType: "Type chambre",
    roomCategory: "Classification chambre",
    phone: "Téléphone",
    applyToAll: "Appliquer à tous",
    selectPackage: "Choisir le niveau",
    selectRoomType: "Choisir le type",
    selectRoomCategory: "Choisir la classification",
    maleOnly: "Hommes uniquement",
    femaleOnly: "Femmes uniquement",
    groupInRoom: "Grouper dans la même chambre",
    groupHint: "Sélectionnez des pèlerins dans la revue puis groupez-les dans la même chambre.",
    selectedRows: "Sélectionnés",
    programRequired: "Vous devez choisir le programme, le niveau et le type de chambre avant d’enregistrer les passeports importés.",
    packageRequired: "Veuillez choisir le niveau avant l'enregistrement",
    roomTypeRequired: "Veuillez choisir le type de chambre avant l'enregistrement",
    assignmentRequired: "Vous devez choisir le programme, le niveau et le type de chambre avant d’enregistrer les passeports importés.",
    assignmentNotice: "Tous les pèlerins importés seront enregistrés avec ce niveau et ce type de chambre.",
    saveRowFailed: "Échec de l’enregistrement de cette ligne",
    savedRow: "Ligne enregistrée",
    grouped: "Groupe même chambre créé pour les pèlerins sélectionnés",
    family: "Famille",
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
    success: "Ready",
    ready: "Ready",
    manually_accepted: "Manually accepted",
    review: "Needs review",
    needs_review: "Needs review",
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
    dataSource: "Source",
    automatic_mrz: "Automatic MRZ",
    manual_mrz: "Manual MRZ selection",
    fallback_ocr: "Fallback OCR",
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
    accept: "Accept after review",
    duplicateAction: "Duplicate",
    skip: "Skip",
    update: "Update",
    delete: "Delete",
    progress: "{done} / {total}",
    saved: "Accepted MRZ results saved",
    nothingToSave: "No accepted results to save",
    invalidMRZ: "MRZ is incomplete or needs review",
    saveBlockedRows: "Some rows need manual acceptance or are missing required fields.",
    reviewNeedsCorrection: "Some extracted data needs review. Correct the highlighted fields before saving.",
    reviewReasonMessages: {
      suspicious_name: "The extracted name is not reliable and needs review",
      checksum_failed: "The MRZ data failed automatic checksum validation",
      partial_mrz_read: "The MRZ was only partially read",
      missing_required_field: "Some required fields are missing",
      duplicate_existing: "This passport appears to already exist",
    },
    ocrNotFound: "No text was detected in the selected area. Make sure the image is clear and select only the two MRZ lines.",
    ocrNoText: "No text was detected in the selected area. Make sure the image is clear and select only the two MRZ lines.",
    mrzFormatNotRecognized: "Text was detected, but the MRZ format was not recognized. Select only the two bottom MRZ lines or enter the data manually.",
    imageTooSmall: "The image quality is not sufficient to read the passport. Try a clearer image.",
    mrzLine1NotFound: "MRZ first line was not found",
    mrzLine2NotFound: "MRZ second line was not found",
    mrzLengthError: "MRZ line length is not valid",
    mrzParseFailed: "An MRZ candidate was found but failed validation",
    ocrFailed: "Could not read image",
    male: "Male",
    female: "Female",
    programContext: "Pilgrims will be added to program: {program}",
    packageLabel: "Package",
    roomType: "Room type",
    roomCategory: "Room classification",
    phone: "Phone",
    applyToAll: "Apply to all",
    selectPackage: "Select package",
    selectRoomType: "Select room type",
    selectRoomCategory: "Select room classification",
    maleOnly: "Men only",
    femaleOnly: "Women only",
    groupInRoom: "Group in one room",
    groupHint: "Select pilgrims in the review table, then group them in one room.",
    selectedRows: "Selected",
    programRequired: "You must select the program, level, and room type before saving imported passports.",
    packageRequired: "Select a package before saving",
    roomTypeRequired: "Select a room type before saving",
    assignmentRequired: "You must select the program, level, and room type before saving imported passports.",
    assignmentNotice: "All imported pilgrims will be saved with this level and room type.",
    saveRowFailed: "This row could not be saved",
    savedRow: "Row saved",
    grouped: "One-room group created for the selected pilgrims",
    family: "Family",
  },
};

const fieldStyle = {
  width: "100%",
  minWidth: 120,
  background: "var(--rukn-bg-card)",
  border: "1px solid var(--rukn-border-soft)",
  borderRadius: 8,
  color: "var(--rukn-text)",
  padding: "7px 9px",
  fontSize: 12,
  outline: "none",
};

const mrzCount = (value = "") => String(value || "").length;
const formatMessage = (template, vars) => Object.entries(vars).reduce((text, [key, value]) => text.replace(`{${key}}`, value), template);
const normalizePassportNo = (value = "") => String(value).trim().toUpperCase().replace(/\s+/g, "");
const normalizeGender = (value) => value === "F" || value === "female" ? "female" : value === "M" || value === "male" ? "male" : "";
const getReviewReasonLabel = (l, reason) => l.reviewReasonMessages?.[reason] || reason;

const getSuspiciousLatinNameReason = (value = "") => {
  const clean = String(value || "").trim().toUpperCase().replace(/\s+/g, " ");
  if (!clean) return "";
  if (/[^A-Z\s'-]/.test(clean)) return REVIEW_REASON.SUSPICIOUS_NAME;
  if (/(.)\1{3,}/.test(clean.replace(/\s/g, ""))) return REVIEW_REASON.SUSPICIOUS_NAME;
  if (/\b[A-Z]\b/.test(clean)) return REVIEW_REASON.SUSPICIOUS_NAME;
  if (/\b[A-Z]{1,2}$/.test(clean) && clean.includes(" ")) return REVIEW_REASON.SUSPICIOUS_NAME;
  if (/(?:CL+|KL+|CI+|IC+|CC+|KK+|LL+)$/i.test(clean.replace(/\s/g, ""))) return REVIEW_REASON.SUSPICIOUS_NAME;
  return "";
};

const getExistingArabic = (client = {}) => ({
  arabicLastName: client.lastName || client.arabicLastName || client.last_name || "",
  arabicFirstName: client.firstName || client.arabicFirstName || client.first_name || "",
});

const issueText = (issues = [], l, raw = {}) => {
  if (!issues.length) return "";
  return issues.map((issue) => {
    if (issue === "MRZ_MISSING") return l.ocrNotFound;
    if (["LINE1_INVALID_CHARS", "LINE2_INVALID_CHARS", "LINE1_LENGTH", "LINE2_LENGTH", "NOT_TD3_PASSPORT", "PARSE_ERROR"].includes(issue)) {
      const count = issue === "LINE1_LENGTH" ? ` (${mrzCount(raw.line1)}/44)` : issue === "LINE2_LENGTH" ? ` (${mrzCount(raw.line2)}/44)` : "";
      return `${getReviewReasonLabel(l, REVIEW_REASON.PARTIAL_MRZ_READ)}${count}`;
    }
    if (["PASSPORT_CHECK", "BIRTH_CHECK", "EXPIRY_CHECK"].includes(issue)) return getReviewReasonLabel(l, REVIEW_REASON.CHECKSUM_FAILED);
    if (issue === "NAME_FILLER_NOISE") return getReviewReasonLabel(l, REVIEW_REASON.SUSPICIOUS_NAME);
    if (["LAST_NAME_MISSING", "FIRST_NAME_MISSING", "NATIONALITY_MISSING", "GENDER_MISSING", "PASSPORT_MISSING"].includes(issue)) {
      return getReviewReasonLabel(l, REVIEW_REASON.MISSING_REQUIRED_FIELD);
    }
    return `MRZ: ${issue}`;
  }).join(" · ");
};

const ocrFailureText = (error, l) => {
  if (error === "OCR_NO_TEXT") return l.ocrNoText;
  if (error === "IMAGE_TOO_SMALL") return l.imageTooSmall;
  if (error === "MRZ_LINE1_NOT_FOUND") return l.mrzFormatNotRecognized || l.mrzLine1NotFound;
  if (error === "MRZ_LINE2_NOT_FOUND") return l.mrzFormatNotRecognized || l.mrzLine2NotFound;
  if (error === "MRZ_LENGTH") return l.mrzFormatNotRecognized || l.mrzLengthError;
  if (error === "PARSE_FAILED") return l.mrzFormatNotRecognized || l.mrzParseFailed;
  if (error === "MRZ_NOT_FOUND") return l.ocrNotFound;
  return l.ocrFailed;
};

const setFieldWarning = (warnings, field, reason) => {
  if (!field) return;
  warnings[field] = Array.from(new Set([...(warnings[field] || []), reason]));
};

const buildParsedReviewState = ({ parsed, duplicate = false } = {}) => {
  const reasons = new Set();
  const fieldWarnings = {};
  const issues = parsed?.issues || [];
  issues.forEach((issue) => {
    if (issue === "PASSPORT_CHECK") {
      reasons.add(REVIEW_REASON.CHECKSUM_FAILED);
      setFieldWarning(fieldWarnings, "passportNo", REVIEW_REASON.CHECKSUM_FAILED);
    } else if (issue === "BIRTH_CHECK") {
      reasons.add(REVIEW_REASON.CHECKSUM_FAILED);
      setFieldWarning(fieldWarnings, "birthDate", REVIEW_REASON.CHECKSUM_FAILED);
    } else if (issue === "EXPIRY_CHECK") {
      reasons.add(REVIEW_REASON.CHECKSUM_FAILED);
      setFieldWarning(fieldWarnings, "passportExpiry", REVIEW_REASON.CHECKSUM_FAILED);
    } else if (issue === "NAME_FILLER_NOISE") {
      reasons.add(REVIEW_REASON.SUSPICIOUS_NAME);
      setFieldWarning(fieldWarnings, "latinLastName", REVIEW_REASON.SUSPICIOUS_NAME);
      setFieldWarning(fieldWarnings, "latinFirstName", REVIEW_REASON.SUSPICIOUS_NAME);
    } else if (["LINE1_INVALID_CHARS", "LINE2_INVALID_CHARS", "LINE1_LENGTH", "LINE2_LENGTH", "NOT_TD3_PASSPORT", "MRZ_MISSING", "PARSE_ERROR"].includes(issue)) {
      reasons.add(REVIEW_REASON.PARTIAL_MRZ_READ);
    } else if (issue === "PASSPORT_MISSING") {
      reasons.add(REVIEW_REASON.MISSING_REQUIRED_FIELD);
      setFieldWarning(fieldWarnings, "passportNo", REVIEW_REASON.MISSING_REQUIRED_FIELD);
    } else if (issue === "LAST_NAME_MISSING") {
      reasons.add(REVIEW_REASON.MISSING_REQUIRED_FIELD);
      setFieldWarning(fieldWarnings, "latinLastName", REVIEW_REASON.MISSING_REQUIRED_FIELD);
    } else if (issue === "FIRST_NAME_MISSING") {
      reasons.add(REVIEW_REASON.MISSING_REQUIRED_FIELD);
      setFieldWarning(fieldWarnings, "latinFirstName", REVIEW_REASON.MISSING_REQUIRED_FIELD);
    } else if (issue === "NATIONALITY_MISSING") {
      reasons.add(REVIEW_REASON.MISSING_REQUIRED_FIELD);
      setFieldWarning(fieldWarnings, "nationality", REVIEW_REASON.MISSING_REQUIRED_FIELD);
    } else if (issue === "GENDER_MISSING") {
      reasons.add(REVIEW_REASON.MISSING_REQUIRED_FIELD);
      setFieldWarning(fieldWarnings, "gender", REVIEW_REASON.MISSING_REQUIRED_FIELD);
    }
  });
  const data = parsed?.data || {};
  [
    ["latinLastName", data.latinLastName || data.lastName || ""],
    ["latinFirstName", data.latinFirstName || data.firstName || ""],
  ].forEach(([field, value]) => {
    if (getSuspiciousLatinNameReason(value)) {
      reasons.add(REVIEW_REASON.SUSPICIOUS_NAME);
      setFieldWarning(fieldWarnings, field, REVIEW_REASON.SUSPICIOUS_NAME);
    }
  });
  if (duplicate) reasons.add(REVIEW_REASON.DUPLICATE_EXISTING);
  return {
    reviewReasons: Array.from(reasons),
    reviewRequiredGeneral: reasons.size > 0,
    reviewWarningFieldLevel: fieldWarnings,
  };
};

const buildRowReviewState = (row = {}) => {
  const reasons = new Set();
  const fieldWarnings = {};
  [
    ["passportNo", normalizePassportNo(row.passportNo)],
    ["latinLastName", String(row.latinLastName || "").trim()],
    ["latinFirstName", String(row.latinFirstName || "").trim()],
    ["nationality", String(row.nationality || "").trim()],
    ["birthDate", String(row.birthDate || "").trim()],
    ["passportExpiry", String(row.passportExpiry || "").trim()],
    ["gender", String(row.gender || "").trim()],
  ].forEach(([field, value]) => {
    if (!value) {
      reasons.add(REVIEW_REASON.MISSING_REQUIRED_FIELD);
      setFieldWarning(fieldWarnings, field, REVIEW_REASON.MISSING_REQUIRED_FIELD);
    }
  });
  ["latinLastName", "latinFirstName"].forEach((field) => {
    if (getSuspiciousLatinNameReason(row[field])) {
      reasons.add(REVIEW_REASON.SUSPICIOUS_NAME);
      setFieldWarning(fieldWarnings, field, REVIEW_REASON.SUSPICIOUS_NAME);
    }
  });
  if (row.existingClientId && row.duplicateAction !== "update") {
    reasons.add(REVIEW_REASON.DUPLICATE_EXISTING);
  }
  return {
    reviewReasons: Array.from(reasons),
    reviewRequiredGeneral: reasons.size > 0,
    reviewWarningFieldLevel: fieldWarnings,
  };
};

const getFieldWarningReasons = (row = {}, field) => row.reviewWarningFieldLevel?.[field] || [];

const buildEditedRowReviewState = (row = {}, patch = {}, previousRow = {}) => {
  const editedFields = new Set(Object.keys(patch || {}));
  const previousWarnings = previousRow.reviewWarningFieldLevel || {};
  const fieldWarnings = Object.fromEntries(
    Object.entries(previousWarnings)
      .filter(([field]) => !editedFields.has(field))
      .map(([field, reasons]) => [field, [...(reasons || [])]]),
  );
  const reasons = new Set(
    (previousRow.reviewReasons || []).filter((reason) => (
      reason !== REVIEW_REASON.DUPLICATE_EXISTING
      && reason !== REVIEW_REASON.MISSING_REQUIRED_FIELD
      && reason !== REVIEW_REASON.PARTIAL_MRZ_READ
      && reason !== REVIEW_REASON.SUSPICIOUS_NAME
    )),
  );

  Object.values(fieldWarnings).flat().forEach((reason) => reasons.add(reason));
  [
    ["passportNo", normalizePassportNo(row.passportNo)],
    ["latinLastName", String(row.latinLastName || "").trim()],
    ["latinFirstName", String(row.latinFirstName || "").trim()],
    ["nationality", String(row.nationality || "").trim()],
    ["birthDate", String(row.birthDate || "").trim()],
    ["passportExpiry", String(row.passportExpiry || "").trim()],
    ["gender", String(row.gender || "").trim()],
  ].forEach(([field, value]) => {
    if (!value) {
      reasons.add(REVIEW_REASON.MISSING_REQUIRED_FIELD);
      setFieldWarning(fieldWarnings, field, REVIEW_REASON.MISSING_REQUIRED_FIELD);
    }
  });
  ["latinLastName", "latinFirstName"].forEach((field) => {
    if (getSuspiciousLatinNameReason(row[field])) {
      reasons.add(REVIEW_REASON.SUSPICIOUS_NAME);
      setFieldWarning(fieldWarnings, field, REVIEW_REASON.SUSPICIOUS_NAME);
    }
  });
  if (
    previousRow.reviewReasons?.includes(REVIEW_REASON.PARTIAL_MRZ_READ)
    && !rowHasRequiredPassportData(row)
  ) {
    reasons.add(REVIEW_REASON.PARTIAL_MRZ_READ);
  }
  if (row.existingClientId && row.duplicateAction !== "update") {
    reasons.add(REVIEW_REASON.DUPLICATE_EXISTING);
  }
  return {
    reviewReasons: Array.from(reasons),
    reviewRequiredGeneral: reasons.size > 0,
    reviewWarningFieldLevel: fieldWarnings,
  };
};

const makeRowFromParsed = ({ parsed, source, existing, l, statusOverride, noteOverride, hasImage = false, extractionSource = EXTRACTION_SOURCE.AUTOMATIC_MRZ }) => {
  const data = parsed?.data || {};
  const duplicate = Boolean(existing);
  const existingArabic = duplicate ? getExistingArabic(existing) : {};
  const hasParsedData = Boolean(parsed?.data);
  const isTrustedMRZ = Boolean(parsed?.ok && parsed?.data);
  const reviewState = buildParsedReviewState({ parsed, duplicate });
  const status = statusOverride || (!hasParsedData ? ROW_STATUS.FAILED : isTrustedMRZ && !reviewState.reviewRequiredGeneral ? ROW_STATUS.READY : ROW_STATUS.NEEDS_REVIEW);
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
    accepted: status === ROW_STATUS.READY && !duplicate,
    manualAccepted: false,
    extractionSource,
    confidence: status === ROW_STATUS.READY ? (extractionSource === EXTRACTION_SOURCE.MANUAL_MRZ ? 0.98 : 0.9) : hasParsedData ? (extractionSource === EXTRACTION_SOURCE.MANUAL_MRZ ? 0.78 : 0.62) : 0,
    ...reviewState,
    duplicateAction: duplicate ? "skip" : "add",
    existingClientId: existing?.id || "",
    note,
    latinLastName: hasParsedData ? (data.latinLastName || data.lastName || "") : "",
    latinFirstName: hasParsedData ? (data.latinFirstName || data.firstName || "") : "",
    arabicLastName: existingArabic.arabicLastName || "",
    arabicFirstName: existingArabic.arabicFirstName || "",
    passportNo: hasParsedData ? (data.passportNo || "") : "",
    nationality: hasParsedData ? (data.nationality || "") : "",
    birthDate: hasParsedData ? (data.birthDate || "") : "",
    gender: hasParsedData ? normalizeGender(data.gender) : "",
    passportExpiry: hasParsedData ? (data.expiryDate || "") : "",
    raw: data.raw || parsed?.raw || {},
    hasImage,
  };
};

const rowHasRequiredPassportData = (row = {}) => Boolean(
  normalizePassportNo(row.passportNo)
  && String(row.latinLastName || "").trim()
  && String(row.latinFirstName || "").trim()
  && !getSuspiciousLatinNameReason(row.latinLastName)
  && !getSuspiciousLatinNameReason(row.latinFirstName)
  && String(row.nationality || "").trim()
  && String(row.birthDate || "").trim()
  && String(row.passportExpiry || "").trim()
  && String(row.gender || "").trim()
);

const rowHasEssentialPassportData = (row = {}) => Boolean(
  normalizePassportNo(row.passportNo)
  && (String(row.latinLastName || "").trim() || String(row.arabicLastName || "").trim())
  && (String(row.latinFirstName || "").trim() || String(row.arabicFirstName || "").trim())
  && String(row.nationality || "").trim()
  && String(row.birthDate || "").trim()
  && String(row.passportExpiry || "").trim()
  && String(row.gender || "").trim()
);

const rowCanBeManuallyAccepted = (row = {}) => row.status !== ROW_STATUS.FAILED && rowHasEssentialPassportData(row);

const isRowSaveEligible = (row = {}) => {
  const selectedForSave = Boolean(row.accepted) || row.duplicateAction === "update";
  if (!selectedForSave) return false;
  if (row.status === ROW_STATUS.READY) return rowHasRequiredPassportData(row);
  if (row.status === ROW_STATUS.MANUALLY_ACCEPTED || row.manualAccepted) return rowHasEssentialPassportData(row);
  return false;
};

const deriveRowStatus = (row = {}, previousStatus = ROW_STATUS.NEEDS_REVIEW, reviewState = buildRowReviewState(row)) => {
  if (row.manualAccepted && rowHasEssentialPassportData(row)) return ROW_STATUS.MANUALLY_ACCEPTED;
  if (rowHasRequiredPassportData(row) && !reviewState.reviewRequiredGeneral) return ROW_STATUS.READY;
  if (previousStatus === ROW_STATUS.FAILED && !row.passportNo && !row.latinLastName && !row.latinFirstName) {
    return ROW_STATUS.FAILED;
  }
  return ROW_STATUS.NEEDS_REVIEW;
};

const appendNote = (current, addition) => [current, addition].filter(Boolean).join(" · ");

function ReviewRow({
  row,
  index,
  labels,
  onChange,
  onRemove,
  onSelectMRZ,
  programMode = false,
  packages = [],
  roomTypeOptions = [],
  roomCategoryOptions = [],
  selected = false,
  onToggleSelected,
}) {
  const statusColor = row.status === ROW_STATUS.READY || row.status === ROW_STATUS.MANUALLY_ACCEPTED ? tc.greenLight : row.status === ROW_STATUS.FAILED ? "var(--rukn-danger)" : "var(--rukn-warning)";
  const canManuallyAccept = rowCanBeManuallyAccepted(row);
  return (
    <tr style={{ borderTop: "1px solid var(--rukn-border-soft)" }}>
      {programMode && (
        <td style={{ padding: 8 }}>
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onToggleSelected?.(row.id, event.target.checked)}
            aria-label={labels.groupInRoom}
          />
        </td>
      )}
      <td style={{ padding: 8, color: "var(--rukn-text-muted)", fontWeight: 800 }}>{index + 1}</td>
      <td style={{ padding: 8, color: "var(--rukn-text)", fontSize: 11, maxWidth: 140, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.source || "—"}</td>
      <td style={{ padding: 8 }}>
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          border: "1px solid var(--rukn-border-soft)",
          background: row.extractionSource === EXTRACTION_SOURCE.MANUAL_MRZ ? "var(--rukn-gold-dim)" : "var(--rukn-bg-soft)",
          color: row.extractionSource === EXTRACTION_SOURCE.MANUAL_MRZ ? "var(--rukn-gold)" : "var(--rukn-text-muted)",
          borderRadius: 999,
          padding: "3px 8px",
          fontSize: 10.5,
          fontWeight: 900,
          whiteSpace: "nowrap",
        }}>
          {labels[row.extractionSource] || row.extractionSource || "—"}
        </span>
      </td>
      <td style={{ padding: 8 }}>
        <span style={{ color: statusColor, fontSize: 11, fontWeight: 900 }}>
          {labels[row.status] || labels.needs_review || labels.review}
        </span>
        {row.manualAccepted && (
          <span style={{
            display: "inline-flex",
            marginTop: 4,
            color: tc.greenLight,
            background: "rgba(34,197,94,.12)",
            border: "1px solid rgba(34,197,94,.35)",
            borderRadius: 999,
            padding: "2px 6px",
            fontSize: 10,
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}>
            {labels.manually_accepted}
          </span>
        )}
      </td>
      {programMode && (
        <>
          {packages.length > 0 && (
            <td style={{ padding: 6 }}>
              <select
                value={row.packageId || ""}
                onChange={(event) => onChange(row.id, { packageId: event.target.value })}
                style={{ ...fieldStyle, minWidth: 130 }}
              >
                <option value="" style={{ color: "#111827" }}>{labels.selectPackage}</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id} style={{ color: "#111827" }}>
                    {pkg.displayLabel || pkg.level || pkg.id}
                  </option>
                ))}
              </select>
            </td>
          )}
          <td style={{ padding: 6 }}>
            <select
              value={row.roomType || ""}
              onChange={(event) => onChange(row.id, { roomType: event.target.value })}
              style={{ ...fieldStyle, minWidth: 120 }}
            >
              <option value="" style={{ color: "#111827" }}>{labels.selectRoomType}</option>
              {roomTypeOptions.map((option) => (
                <option key={option.value} value={option.value} style={{ color: "#111827" }}>
                  {option.label}
                </option>
              ))}
            </select>
          </td>
          <td style={{ padding: 6 }}>
            <select
              value={row.roomCategory || ""}
              onChange={(event) => {
                const option = roomCategoryOptions.find((item) => item.value === event.target.value);
                onChange(row.id, { roomCategory: event.target.value, roomCategoryLabel: option?.label || "" });
              }}
              style={{ ...fieldStyle, minWidth: 130 }}
            >
              <option value="" style={{ color: "#111827" }}>{labels.selectRoomCategory}</option>
              {roomCategoryOptions.map((option) => (
                <option key={option.value} value={option.value} style={{ color: "#111827" }}>
                  {option.label}
                </option>
              ))}
            </select>
          </td>
          <td style={{ padding: 6 }}>
            <input
              value={row.phone || ""}
              onChange={(event) => onChange(row.id, { phone: event.target.value })}
              style={{ ...fieldStyle, minWidth: 110, direction: "ltr" }}
            />
          </td>
        </>
      )}
      {["latinLastName", "latinFirstName", "arabicLastName", "arabicFirstName", "passportNo", "nationality", "birthDate", "passportExpiry"].map((key) => (
        <td key={key} style={{ padding: 6 }}>
          {(() => {
            const warnings = getFieldWarningReasons(row, key);
            return (
          <input
            value={row[key] || ""}
            onChange={(event) => onChange(row.id, { [key]: event.target.value })}
                title={warnings.map((reason) => getReviewReasonLabel(labels, reason)).join(", ")}
                style={{
                  ...fieldStyle,
                  minWidth: key.includes("Name") ? 140 : 105,
                  direction: key.includes("latin") || key === "passportNo" ? "ltr" : undefined,
                  borderColor: warnings.length ? "var(--rukn-warning)" : fieldStyle.borderColor,
                  boxShadow: warnings.length ? "0 0 0 1px var(--rukn-warning-dim)" : "none",
                }}
          />
            );
          })()}
        </td>
      ))}
      <td style={{ padding: 6 }}>
        <select
          value={row.gender || ""}
          onChange={(event) => onChange(row.id, { gender: event.target.value })}
          title={getFieldWarningReasons(row, "gender").map((reason) => getReviewReasonLabel(labels, reason)).join(", ")}
          style={{
            ...fieldStyle,
            minWidth: 95,
            borderColor: getFieldWarningReasons(row, "gender").length ? "var(--rukn-warning)" : fieldStyle.borderColor,
          }}
        >
          <option value="" style={{ color: "#111827" }}>—</option>
          <option value="male" style={{ color: "#111827" }}>{labels.male}</option>
          <option value="female" style={{ color: "#111827" }}>{labels.female}</option>
        </select>
      </td>
      <td style={{ padding: 6, minWidth: 190, color: "var(--rukn-text-muted)", fontSize: 11 }}>
        {row.reviewReasons?.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: row.note ? 5 : 0 }}>
            {row.reviewReasons.map((reason) => (
              <span key={reason} style={{
                color: reason === REVIEW_REASON.DUPLICATE_EXISTING ? "var(--rukn-gold)" : "var(--rukn-warning)",
                background: "var(--rukn-bg-soft)",
                border: "1px solid var(--rukn-border-soft)",
                borderRadius: 999,
                padding: "2px 6px",
                fontSize: 10,
                fontWeight: 800,
              }}>
                {getReviewReasonLabel(labels, reason)}
              </span>
            ))}
          </div>
        ) : null}
        {row.note || "—"}
      </td>
      <td style={{ padding: 6 }}>
        {row.hasImage && row.status !== ROW_STATUS.READY ? (
          <button
            type="button"
            onClick={() => onSelectMRZ(row.id)}
            style={{ border: "1px solid rgba(212,175,55,.3)", background: "var(--rukn-gold-dim)", color: "var(--rukn-gold)", borderRadius: 8, padding: "7px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {labels.selectMRZ}
          </button>
        ) : (
          <span style={{ color: "var(--rukn-text-muted)", fontSize: 11 }}>—</span>
        )}
      </td>
      <td style={{ padding: 6 }}>
        {row.existingClientId ? (
          <select
            value={row.duplicateAction}
            disabled={row.status === ROW_STATUS.FAILED}
            onChange={(event) => onChange(row.id, { duplicateAction: event.target.value, accepted: event.target.value === "update", manualAccepted: event.target.value === "update" && canManuallyAccept })}
            style={{ ...fieldStyle, minWidth: 95, opacity: row.status === ROW_STATUS.FAILED ? .55 : 1 }}
          >
            <option value="skip" style={{ color: "#111827" }}>{labels.skip}</option>
            <option value="update" style={{ color: "#111827" }}>{labels.update}</option>
          </select>
        ) : (
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--rukn-text)", fontSize: 12 }}>
            <input
              type="checkbox"
              checked={Boolean(row.accepted)}
              disabled={!canManuallyAccept}
              onChange={(event) => onChange(row.id, {
                accepted: event.target.checked,
                manualAccepted: event.target.checked && row.status !== ROW_STATUS.READY,
              })}
            />
            {labels.accept}
          </label>
        )}
      </td>
      <td style={{ padding: 6 }}>
        <button type="button" onClick={() => onRemove(row.id)} title={labels.delete} style={{ border: 0, background: "rgba(239,68,68,.12)", color: "var(--rukn-danger)", borderRadius: 8, width: 30, height: 30, cursor: "pointer" }}>
          <AppIcon name="trash" size={14} />
        </button>
      </td>
    </tr>
  );
}

export default function MRZReader({ store, onToast, onResult, onClose, programContext = null }) {
  const { t, lang } = useLang();
  const l = LABELS[lang] || LABELS.ar;
  const importProgram = programContext?.program || programContext || null;
  const importProgramId = importProgram?.id || "";
  const importProgramName = importProgram?.name || "";
  const importPackages = React.useMemo(() => {
    if (!importProgramId) return [];
    if (Array.isArray(programContext?.packages)) return programContext.packages;
    return normalizeProgramPackages(importProgram);
  }, [importProgram, importProgramId, programContext?.packages]);
  const packageOptions = React.useMemo(() => importPackages.map((pkg) => ({
    ...pkg,
    displayLabel: translateHotelLevel(pkg.level, lang) || pkg.level || pkg.id,
  })), [importPackages, lang]);
  const roomTypeOptions = React.useMemo(
    () => getRoomTypeOptions().map((option) => ({ ...option, label: translateRoomType(option.value, lang) || option.label })),
    [lang],
  );
  const roomCategoryOptions = React.useMemo(() => ([
    { value: "male_only", label: translateRoomCategory("male_only", lang) || l.maleOnly },
    { value: "female_only", label: translateRoomCategory("female_only", lang) || l.femaleOnly },
    { value: "family", label: translateRoomCategory("family", lang) || l.family },
  ]), [l.family, l.femaleOnly, l.maleOnly, lang]);
  const [mode, setMode] = React.useState("image");
  const [rows, setRows] = React.useState([]);
  const [error, setError] = React.useState("");
  const [progress, setProgress] = React.useState({ done: 0, total: 0, active: false });
  const [singleFile, setSingleFile] = React.useState(null);
  const [singlePreviewUrl, setSinglePreviewUrl] = React.useState("");
  const [bulkFiles, setBulkFiles] = React.useState([]);
  const [defaultPackageId, setDefaultPackageId] = React.useState("");
  const [defaultRoomType, setDefaultRoomType] = React.useState("");
  const [defaultRoomCategory, setDefaultRoomCategory] = React.useState("");
  const [defaultPhone, setDefaultPhone] = React.useState("");
  const [selectedRowIds, setSelectedRowIds] = React.useState(() => new Set());
  const [cropModal, setCropModal] = React.useState({ open: false, rowId: "", url: "", fileName: "" });
  const [cropRect, setCropRect] = React.useState({ x: 4, y: 68, width: 92, height: 24 });
  const [cropReading, setCropReading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef(null);
  const bulkRef = React.useRef(null);
  const rowFilesRef = React.useRef(new Map());
  const cropBoxRef = React.useRef(null);
  const cropImageRef = React.useRef(null);
  const cropDragRef = React.useRef(null);
  const clients = store?.clients || store?.activeClients || [];

  const rowProgramDefaults = React.useCallback(() => importProgramId ? ({
    programId: importProgramId,
    packageId: defaultPackageId || "",
    roomType: normalizeRoomTypeKey(defaultRoomType) || "",
    roomCategory: defaultRoomCategory || "",
    roomCategoryLabel: roomCategoryOptions.find((option) => option.value === defaultRoomCategory)?.label || "",
    phone: defaultPhone || "",
  }) : {}, [defaultPackageId, defaultPhone, defaultRoomType, defaultRoomCategory, importProgramId, roomCategoryOptions]);

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
    const row = { ...makeRowFromParsed({ parsed, source, existing, l, ...override }), ...rowProgramDefaults() };
    setRows((current) => [row, ...current]);
    return row;
  }, [findExisting, l, rowProgramDefaults]);

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
      row = addParsedRow(parsed, file.name || `image-${index + 1}`, {
        hasImage: true,
        extractionSource: EXTRACTION_SOURCE.AUTOMATIC_MRZ,
      });
    } else if (outcome.raw?.line1 || outcome.raw?.line2) {
      const parsed = parseMRZDetailed(outcome.raw?.line1 || "", outcome.raw?.line2 || "");
      row = addParsedRow(parsed, file.name || `image-${index + 1}`, {
        statusOverride: parsed.data ? ROW_STATUS.NEEDS_REVIEW : ROW_STATUS.FAILED,
        noteOverride: issueText(parsed.issues || ["PARSE_ERROR"], l, parsed.raw),
        hasImage: true,
        extractionSource: EXTRACTION_SOURCE.FALLBACK_OCR,
      });
    } else {
      row = addParsedRow({ ok: false, data: null, issues: [outcome.error || "OCR_FAILED"] }, file.name || `image-${index + 1}`, {
        statusOverride: ROW_STATUS.FAILED,
        noteOverride: ocrFailureText(outcome.error, l),
        hasImage: true,
        extractionSource: EXTRACTION_SOURCE.FALLBACK_OCR,
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
    setSelectedRowIds(new Set());
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
    setRows((current) => current.map((row) => {
      if (row.id !== id) return row;
      const next = { ...row, ...patch };
      const reviewState = buildEditedRowReviewState(next, patch, row);
      const status = deriveRowStatus(next, row.status, reviewState);
      const manualAccepted = status === ROW_STATUS.MANUALLY_ACCEPTED ? true : status === ROW_STATUS.READY ? false : Boolean(next.manualAccepted) && rowHasEssentialPassportData(next);
      const accepted = (status === ROW_STATUS.READY || status === ROW_STATUS.MANUALLY_ACCEPTED) ? Boolean(next.accepted || next.duplicateAction === "update") : false;
      if (
        process.env.NODE_ENV !== "production"
        && (Object.prototype.hasOwnProperty.call(patch, "accepted") || Object.prototype.hasOwnProperty.call(patch, "duplicateAction"))
      ) {
        console.debug("[MRZ] row-acceptance-change", {
          rowId: id,
          statusBefore: row.status,
          statusAfter: status,
          reviewReasons: next.reviewReasons || row.reviewReasons || [],
          manualAccepted,
          accepted,
          requiredFieldsValid: rowHasEssentialPassportData(next),
          cleanFieldsValid: rowHasRequiredPassportData(next),
        });
      }
      return { ...next, ...reviewState, status, accepted, manualAccepted };
    }));
  }, []);

  const toggleReviewSelection = React.useCallback((id, checked) => {
    setSelectedRowIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const applyProgramDefaultsToRows = React.useCallback(() => {
    if (!importProgramId) return;
    if ((packageOptions.length && !defaultPackageId) || !normalizeRoomTypeKey(defaultRoomType) || !defaultRoomCategory) {
      onToast?.(l.assignmentRequired, "error");
      return;
    }
    const roomCategoryLabel = roomCategoryOptions.find((option) => option.value === defaultRoomCategory)?.label || "";
    setRows((current) => current.map((row) => ({
      ...row,
      programId: importProgramId,
      packageId: defaultPackageId || row.packageId || "",
      roomType: normalizeRoomTypeKey(defaultRoomType || row.roomType) || row.roomType || "",
      roomCategory: defaultRoomCategory || row.roomCategory || "",
      roomCategoryLabel: roomCategoryLabel || row.roomCategoryLabel || "",
      phone: defaultPhone || row.phone || "",
    })));
    onToast?.(l.assignmentNotice, "info");
  }, [defaultPackageId, defaultPhone, defaultRoomType, defaultRoomCategory, importProgramId, l.assignmentNotice, l.assignmentRequired, onToast, packageOptions.length, roomCategoryOptions]);

  const groupSelectedRows = React.useCallback(() => {
    if (selectedRowIds.size < 2) return;
    const selectedIds = Array.from(selectedRowIds);
    const groupId = `import-room-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
    setRows((current) => {
      let seat = 0;
      return current.map((row) => {
        if (!selectedRowIds.has(row.id)) return row;
        seat += 1;
        return {
          ...row,
          roomingGroupId: groupId,
          familyGroupId: groupId,
          importGroupId: groupId,
          roomingGroupName: l.groupInRoom,
          roomingGroupSize: selectedIds.length,
          roomingSeatIndex: seat,
          roomCategory: "family",
          roomCategoryLabel: translateRoomCategory("family", lang) || l.family,
        };
      });
    });
    onToast?.(l.grouped, "success");
  }, [l, lang, onToast, selectedRowIds]);

  const removeRow = React.useCallback((id) => {
    rowFilesRef.current.delete(id);
    setRows((current) => current.filter((row) => row.id !== id));
    setSelectedRowIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
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
    if (process.env.NODE_ENV !== "production") {
      const imageRect = cropImageRef.current?.getBoundingClientRect();
      const image = cropImageRef.current;
      if (imageRect && image) {
        const displayedCrop = {
          x: (cropRect.x / 100) * imageRect.width,
          y: (cropRect.y / 100) * imageRect.height,
          width: (cropRect.width / 100) * imageRect.width,
          height: (cropRect.height / 100) * imageRect.height,
        };
        console.debug("[MRZ] crop-selection", {
          file: cropModal.fileName,
          natural: { width: image.naturalWidth, height: image.naturalHeight },
          displayed: { width: imageRect.width, height: imageRect.height },
          displayedCrop,
          naturalCrop: convertDisplayedCropToNaturalRect({
            selection: displayedCrop,
            displayed: { width: imageRect.width, height: imageRect.height },
            natural: { width: image.naturalWidth, height: image.naturalHeight },
          }),
          percentCrop: cropRect,
        });
      }
    }
    const outcome = await extractMRZFromImageRegion(file, cropRect, () => {});
    const raw = outcome.raw || {};
    const parsed = outcome.success
      ? parseMRZDetailed(raw.line1 || outcome.data?.raw?.line1, raw.line2 || outcome.data?.raw?.line2)
      : parseMRZDetailed(raw.line1 || "", raw.line2 || "");
    const hasParsedData = Boolean(parsed.data);
    const succeeded = Boolean(parsed.ok && parsed.data);
    const existing = parsed?.data?.passportNo ? findExisting(parsed.data.passportNo) : null;
    setRows((current) => current.map((row) => {
      if (row.id !== cropModal.rowId) return row;
      const oldReviewReasons = row.reviewReasons || [];
      const next = makeRowFromParsed({
        parsed,
        source: row.source,
        existing,
        l,
        statusOverride: succeeded ? undefined : hasParsedData ? ROW_STATUS.NEEDS_REVIEW : ROW_STATUS.FAILED,
        noteOverride: succeeded ? undefined : (!raw.line1 && !raw.line2 ? ocrFailureText(outcome.error, l) : issueText(parsed.issues || ["PARSE_ERROR"], l, parsed.raw || raw)),
        hasImage: true,
        extractionSource: EXTRACTION_SOURCE.MANUAL_MRZ,
      });
      const merged = {
        ...row,
        ...next,
        id: row.id,
        source: row.source,
        hasImage: true,
        arabicLastName: row.arabicLastName || next.arabicLastName,
        arabicFirstName: row.arabicFirstName || next.arabicFirstName,
      };
      if (process.env.NODE_ENV !== "production") {
        console.debug("[MRZ] manual-selection-row-update", {
          rowId: row.id,
          rowIndex: current.findIndex((item) => item.id === row.id),
          crop: cropRect,
          statusBefore: row.status,
          statusAfter: merged.status,
          oldReviewReasons,
          newReviewReasons: merged.reviewReasons || [],
          review_required_general: merged.reviewRequiredGeneral,
          review_warning_field_level: merged.reviewWarningFieldLevel,
          parseIssues: parsed.issues || [],
          parsedData: parsed.data ? {
            passportNo: parsed.data.passportNo,
            latinLastName: parsed.data.latinLastName,
            latinFirstName: parsed.data.latinFirstName,
            nationality: parsed.data.nationality,
            birthDate: parsed.data.birthDate,
            expiryDate: parsed.data.expiryDate,
            gender: parsed.data.gender,
          } : null,
          outcomeError: outcome.error || "",
          rawOcrText: outcome.ocrText || "",
          normalizedMrzLines: normalizeMRZOCRText(outcome.ocrText || ""),
          rawMrzLines: raw,
          rawLinesPresent: Boolean(raw.line1 || raw.line2),
          ocrTextLength: String(outcome.ocrText || "").length,
        });
      }
      return merged;
    }));
    setCropReading(false);
    if (succeeded) {
      onToast?.(l.success, "success");
      closeCropModal();
    } else if (hasParsedData) {
      onToast?.(l.needs_review || l.review, "info");
      closeCropModal();
    } else {
      onToast?.(ocrFailureText(outcome.error || (raw.line1 || raw.line2 ? "PARSE_FAILED" : "MRZ_NOT_FOUND"), l), "error");
    }
  }, [closeCropModal, cropModal.rowId, cropRect, findExisting, l, onToast]);

  const toClientPayload = React.useCallback((row) => {
    const selectedPackage = packageOptions.find((pkg) => pkg.id === row.packageId) || null;
    const roomType = normalizeRoomTypeKey(row.roomType || defaultRoomType) || "";
    const officialPrice = selectedPackage ? getPackageRoomPrice(selectedPackage, roomType) : 0;
    const roomingData = row.roomingGroupId ? {
      groupId: row.roomingGroupId,
      groupName: row.roomingGroupName || l.groupInRoom,
      category: row.roomCategory || "family",
      categoryLabel: row.roomCategoryLabel || translateRoomCategory("family", lang) || l.family,
      size: row.roomingGroupSize || 0,
      seatIndex: row.roomingSeatIndex || 0,
    } : null;
    return {
      firstName: row.arabicFirstName || "",
      lastName: row.arabicLastName || "",
      arabicFirstName: row.arabicFirstName || "",
      arabicLastName: row.arabicLastName || "",
      prenom: row.latinFirstName || "",
      nom: row.latinLastName || "",
      latinFirstName: row.latinFirstName || "",
      latinLastName: row.latinLastName || "",
      nameLatin: [row.latinLastName, row.latinFirstName].filter(Boolean).join(" "),
      phone: row.phone || "",
      gender: row.gender || "",
      programId: importProgramId || row.programId || "",
      packageId: row.packageId || "",
      packageLevel: selectedPackage?.level || row.packageLevel || "",
      hotelLevel: selectedPackage?.level || row.hotelLevel || "",
      hotelMecca: selectedPackage?.hotelMecca || row.hotelMecca || "",
      hotelMadina: selectedPackage?.hotelMadina || row.hotelMadina || "",
      roomType,
      roomTypeLabel: getRoomTypeLabel(roomType),
      officialPrice,
      salePrice: officialPrice || 0,
      price: officialPrice || 0,
      roomingGroupId: row.roomingGroupId || "",
      familyGroupId: row.familyGroupId || "",
      importGroupId: row.importGroupId || "",
      roomingGroupName: row.roomingGroupName || "",
      roomingGroupSize: row.roomingGroupSize || 0,
      roomingSeatIndex: row.roomingSeatIndex || 0,
      roomCategory: row.roomCategory || "",
      roomCategoryLabel: row.roomCategoryLabel || "",
      passport: {
        number: normalizePassportNo(row.passportNo),
        nationality: row.nationality || "MAR",
        birthDate: row.birthDate || "",
        expiry: row.passportExpiry || "",
        gender: row.gender === "female" ? "F" : row.gender === "male" ? "M" : "",
      },
      docs: roomingData ? { rooming: roomingData } : {},
      notes: row.note || "",
    };
  }, [defaultRoomType, importProgramId, l, lang, packageOptions]);

  const saveAccepted = React.useCallback(async () => {
    if (!importProgramId) {
      onToast?.(l.programRequired, "error");
      return;
    }
    const accepted = rows.filter(isRowSaveEligible);
    if (process.env.NODE_ENV !== "production") {
      console.debug("[MRZ] save-eligibility", rows.map((row) => ({
        rowId: row.id,
        status: row.status,
        accepted: Boolean(row.accepted),
        manualAccepted: Boolean(row.manualAccepted),
        duplicateAction: row.duplicateAction,
        reviewReasons: row.reviewReasons || [],
        requiredFieldsValid: rowHasEssentialPassportData(row),
        cleanFieldsValid: rowHasRequiredPassportData(row),
        saveEligible: isRowSaveEligible(row),
      })));
    }
    if (!accepted.length) {
      if (rows.some((row) => row.status === ROW_STATUS.NEEDS_REVIEW || row.reviewRequiredGeneral || row.reviewReasons?.length || row.status === ROW_STATUS.FAILED)) {
        onToast?.(l.saveBlockedRows, "error");
        return;
      }
      onToast?.(l.nothingToSave, "info");
      return;
    }
    if (accepted.some((row) => !rowHasEssentialPassportData(row))) {
      onToast?.(l.saveBlockedRows, "error");
      return;
    }
    if (
      (packageOptions.length && accepted.some((row) => !row.packageId))
      || accepted.some((row) => !normalizeRoomTypeKey(row.roomType))
      || accepted.some((row) => !row.roomCategory)
      || accepted.some((row) => !row.programId && !importProgramId)
    ) {
      onToast?.(l.assignmentRequired, "error");
      return;
    }
    setSaving(true);
    const failures = [];
    for (const row of accepted) {
      const payload = toClientPayload(row);
      if (row.existingClientId && row.duplicateAction === "update") {
        const existing = clients.find((client) => client.id === row.existingClientId) || {};
        const nextPayload = { ...existing, ...payload, passport: { ...(existing.passport || {}), ...payload.passport } };
        const result = store?.updateClientFromPassportImport
          ? await store.updateClientFromPassportImport(row.existingClientId, nextPayload)
          : (store?.updateClient?.(row.existingClientId, nextPayload), { error: null });
        if (result?.error) failures.push({ id: row.id, error: result.error });
      } else if (!row.existingClientId) {
        const result = store?.addClientFromPassportImport
          ? await store.addClientFromPassportImport(payload)
          : (store?.addClient?.(payload), { error: null });
        if (result?.error) failures.push({ id: row.id, error: result.error });
      }
    }
    setSaving(false);
    if (failures.length) {
      const failureById = new Map(failures.map((item) => [item.id, item.error]));
      setRows((current) => current.map((row) => (
        failureById.has(row.id)
          ? {
              ...row,
              status: ROW_STATUS.NEEDS_REVIEW,
              accepted: false,
              note: appendNote(row.note, [l.saveRowFailed, failureById.get(row.id)?.message].filter(Boolean).join(": ")),
            }
          : row
      )));
      onToast?.(`${l.saveRowFailed}: ${failures.length}`, "error");
      return;
    }
    onToast?.(l.saved, "success");
    onClose?.();
  }, [clients, importProgramId, l, onClose, onToast, packageOptions.length, rows, store, toClientPayload]);

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
    <div style={{ maxWidth: 980, color: "var(--rukn-text)" }}>
      <div style={{
        padding: 16,
        borderRadius: 14,
        background: "var(--rukn-bg-modal)",
        border: "1px solid var(--rukn-border-soft)",
        boxShadow: "var(--rukn-shadow-card)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <h3 style={{ color: tc.gold, fontSize: 17, fontWeight: 900, margin: 0 }}>{l.title}</h3>
            <p style={{ color: "var(--rukn-text-muted)", fontSize: 12, marginTop: 5, lineHeight: 1.6 }}>{l.desc}</p>
          </div>
          {progress.total > 0 && (
            <div style={{ minWidth: 90, textAlign: "center", border: "1px solid var(--rukn-border-soft)", borderRadius: 12, padding: "8px 10px", color: "var(--rukn-gold)", fontWeight: 900, background: "var(--rukn-bg-soft)" }}>
              {formatMessage(l.progress, progress)}
            </div>
          )}
        </div>

        {importProgramId && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
            padding: "9px 11px",
            borderRadius: 12,
            border: "1px solid var(--rukn-border)",
            background: "var(--rukn-gold-dim)",
            color: "var(--rukn-gold)",
            fontSize: 12,
            fontWeight: 800,
          }}>
            <AppIcon name="programs" size={15} color="var(--rukn-gold)" />
            {formatMessage(l.programContext, { program: importProgramName || "—" })}
          </div>
        )}

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
          {modeButtons.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              style={{
                border: `1px solid ${mode === key ? "var(--rukn-border-hover)" : "var(--rukn-border-soft)"}`,
                background: mode === key ? "var(--rukn-gold-dim)" : "var(--rukn-bg-soft)",
                color: mode === key ? tc.gold : "var(--rukn-text-muted)",
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
              <div style={{ border: "1px solid var(--rukn-border-soft)", borderRadius: 12, overflow: "hidden", background: "var(--rukn-bg-soft)", maxHeight: 260 }}>
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
              <div style={{ border: "1px solid var(--rukn-border-soft)", borderRadius: 10, padding: 10, background: "var(--rukn-bg-soft)" }}>
                <p style={{ margin: "0 0 6px", color: "var(--rukn-text)", fontSize: 12, fontWeight: 800 }}>{l.selectedFiles}: {bulkFiles.length}</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {bulkFiles.map((file, index) => (
                    <span key={`${file.name}-${index}`} style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", border: "1px solid var(--rukn-border-soft)", borderRadius: 999, padding: "4px 8px", color: "var(--rukn-text-muted)", fontSize: 11, background: "var(--rukn-bg-card)" }}>
                      {file.name || `image-${index + 1}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {progress.active && (
          <div style={{ height: 5, background: "var(--rukn-bg-soft)", borderRadius: 999, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ height: "100%", width: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%`, background: "linear-gradient(90deg,#2563eb,#d4af37)" }} />
          </div>
        )}

        {error && <div style={{ color: "var(--rukn-danger)", border: "1px solid var(--rukn-danger)", background: "var(--rukn-danger-dim)", borderRadius: 10, padding: 10, marginBottom: 12, fontSize: 12 }}>{error}</div>}

        {importProgramId && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr)) auto auto",
            gap: 8,
            alignItems: "end",
            marginBottom: 12,
            padding: 10,
            border: "1px solid var(--rukn-border-soft)",
            borderRadius: 12,
            background: "var(--rukn-bg-soft)",
          }}>
            {packageOptions.length > 0 && (
              <label style={{ display: "grid", gap: 5, color: "var(--rukn-text-muted)", fontSize: 11, fontWeight: 800 }}>
                {l.packageLabel}
                <select value={defaultPackageId} onChange={(event) => setDefaultPackageId(event.target.value)} style={fieldStyle}>
                  <option value="" style={{ color: "#111827" }}>{l.selectPackage}</option>
                  {packageOptions.map((pkg) => (
                    <option key={pkg.id} value={pkg.id} style={{ color: "#111827" }}>
                      {pkg.displayLabel || pkg.level || pkg.id}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label style={{ display: "grid", gap: 5, color: "var(--rukn-text-muted)", fontSize: 11, fontWeight: 800 }}>
              {l.roomType}
              <select value={defaultRoomType} onChange={(event) => setDefaultRoomType(event.target.value)} style={fieldStyle}>
                <option value="" style={{ color: "#111827" }}>{l.selectRoomType}</option>
                {roomTypeOptions.map((option) => (
                  <option key={option.value} value={option.value} style={{ color: "#111827" }}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: 5, color: "var(--rukn-text-muted)", fontSize: 11, fontWeight: 800 }}>
              {l.roomCategory}
              <select value={defaultRoomCategory} onChange={(event) => setDefaultRoomCategory(event.target.value)} style={fieldStyle}>
                <option value="" style={{ color: "#111827" }}>{l.selectRoomCategory}</option>
                {roomCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value} style={{ color: "#111827" }}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: 5, color: "var(--rukn-text-muted)", fontSize: 11, fontWeight: 800 }}>
              {l.phone}
              <input value={defaultPhone} onChange={(event) => setDefaultPhone(event.target.value)} style={{ ...fieldStyle, direction: "ltr" }} />
            </label>
            <button type="button" onClick={applyProgramDefaultsToRows} style={{ border: "1px solid var(--rukn-border)", background: "var(--rukn-gold-dim)", color: "var(--rukn-gold)", borderRadius: 10, padding: "8px 11px", fontSize: 11, fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" }}>
              {l.applyToAll}
            </button>
            <button type="button" onClick={groupSelectedRows} disabled={selectedRowIds.size < 2} title={l.groupHint} style={{ border: "1px solid var(--rukn-border-soft)", background: "var(--rukn-bg-card)", color: selectedRowIds.size < 2 ? "var(--rukn-text-muted)" : "var(--rukn-text)", borderRadius: 10, padding: "8px 11px", fontSize: 11, fontWeight: 900, cursor: selectedRowIds.size < 2 ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
              {l.groupInRoom} · {selectedRowIds.size}
            </button>
            <p style={{ gridColumn: "1 / -1", color: "var(--rukn-text-muted)", fontSize: 11, lineHeight: 1.6, margin: 0 }}>
              {l.assignmentNotice}
            </p>
          </div>
        )}

        <div style={{ border: "1px solid var(--rukn-border-soft)", borderRadius: 12, overflow: "auto", maxHeight: 360, background: "var(--rukn-bg-card)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: importProgramId ? 1920 : 1390 }}>
            <thead style={{ position: "sticky", top: 0, background: "var(--rukn-bg-card)", zIndex: 1 }}>
              <tr>
                {[
                  ...(importProgramId ? [""] : []),
                  "#",
                  l.source,
                  l.dataSource,
                  l.status,
                  ...(importProgramId ? [
                    ...(packageOptions.length ? [l.packageLabel] : []),
                    l.roomType,
                    l.roomCategory,
                    l.phone,
                  ] : []),
                  l.latinLast,
                  l.latinFirst,
                  l.arabicLast,
                  l.arabicFirst,
                  l.passportNo,
                  l.nationality,
                  l.birthDate,
                  l.expiry,
                  l.gender,
                  l.notes,
                  l.selectMRZ,
                  l.duplicateAction,
                  "",
                ].map((head, idx) => (
                  <th key={`${idx}-${head || "blank"}`} style={{ padding: 8, color: "var(--rukn-text-muted)", fontSize: 11, textAlign: "start", whiteSpace: "nowrap" }}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row, index) => (
                <ReviewRow
                  key={row.id}
                  row={row}
                  index={index}
                  labels={l}
                  onChange={updateRow}
                  onRemove={removeRow}
                  onSelectMRZ={openCropModal}
                  programMode={Boolean(importProgramId)}
                  packages={packageOptions}
                  roomTypeOptions={roomTypeOptions}
                  roomCategoryOptions={roomCategoryOptions}
                  selected={selectedRowIds.has(row.id)}
                  onToggleSelected={toggleReviewSelection}
                />
              )) : (
                <tr><td colSpan={importProgramId ? 22 : 17} style={{ padding: 22, textAlign: "center", color: "var(--rukn-text-muted)", fontWeight: 800 }}>{l.noRows}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
          <Button variant="ghost" onClick={onClose}>{t.cancel}</Button>
          {onResult && firstAccepted && <Button variant="secondary" icon="passport" onClick={applySingleToForm}>{t.mrzApplyData || l.saveAccepted}</Button>}
          <Button variant="success" icon="success" onClick={saveAccepted} disabled={progress.active || saving || !importProgramId}>{saving ? l.processing : l.saveAccepted}</Button>
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
            background: "var(--rukn-overlay)",
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
            border: "1px solid var(--rukn-border-soft)",
            background: "var(--rukn-bg-modal)",
            boxShadow: "var(--rukn-shadow-card-hover)",
            padding: 16,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, color: tc.gold, fontSize: 17, fontWeight: 900 }}>{l.cropTitle}</h3>
                <p style={{ margin: "5px 0 0", color: "var(--rukn-text-muted)", fontSize: 12, lineHeight: 1.6 }}>{l.cropHint}</p>
                {cropModal.fileName && <div style={{ marginTop: 4, color: "var(--rukn-text)", fontSize: 11 }}>{cropModal.fileName}</div>}
              </div>
              <button
                type="button"
                onClick={closeCropModal}
                style={{ border: 0, borderRadius: 10, width: 34, height: 34, cursor: "pointer", background: "var(--rukn-bg-card)", color: "var(--rukn-text)" }}
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
              border: "1px solid var(--rukn-border-soft)",
              background: "var(--rukn-bg-soft)",
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
