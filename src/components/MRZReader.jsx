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
import { validateLatinName } from "../utils/passportMrzEngine";

const tc = theme.colors;
const MAX_BULK_FILES = 10;
const MRZ_DEV = process.env.NODE_ENV !== "production";
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
  INVALID_DATE: "invalid_date",
  PARTIAL_BIRTH_DATE: "partial_birth_date",
  INVALID_PASSPORT_NUMBER: "invalid_passport_number",
  NO_MRZ_TEXT: "no_mrz_text",
  PARSER_FAILED: "parser_failed",
  LOW_CONFIDENCE: "low_confidence",
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
    checksumAcceptHint: "بيانات MRZ غير مطابقة للتحقق الآلي، يمكنك قبولها بعد مراجعة الحقول.",
    requiredFieldsHardBlock: "لا يمكن الحفظ لأن بعض الحقول المطلوبة ناقصة.",
    manualAcceptToast: "تم قبول الصف بعد المراجعة اليدوية.",
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
      invalid_date: "تاريخ غير صالح ويحتاج مراجعة",
      partial_birth_date: "تاريخ الميلاد غير كامل في الجواز وتم اعتماده تقريبياً",
      invalid_passport_number: "رقم الجواز غير صالح ويحتاج مراجعة",
      no_mrz_text: "لم يتم العثور على نص MRZ في المنطقة المحددة",
      parser_failed: "تم العثور على نص، لكن لم يتم التعرف على صيغة MRZ",
      low_confidence: "نتيجة القراءة غير مؤكدة وتحتاج مراجعة",
    },
    ocrNotFound: "لم يتم العثور على نص في المنطقة المحددة. تأكد من وضوح الصورة ومن تحديد سطرَي MRZ فقط.",
    ocrNoText: "لم يتم العثور على نص في المنطقة المحددة. تأكد من وضوح الصورة ومن تحديد سطرَي MRZ فقط.",
    mrzFormatNotRecognized: "تم العثور على نص، لكن لم يتم التعرف على صيغة MRZ. جرّب تحديد السطرين فقط أسفل الجواز أو صحح الحقول في جدول المراجعة.",
    imageTooSmall: "جودة الصورة غير كافية لقراءة الجواز. جرّب صورة أوضح.",
    mrzLine1NotFound: "لم يتم العثور على السطر الأول من MRZ",
    mrzLine2NotFound: "لم يتم العثور على السطر الثاني من MRZ",
    mrzLengthError: "طول سطور MRZ غير صحيح",
    mrzParseFailed: "تم العثور على مرشح MRZ لكنه لم يمر التحقق",
    ocrFailed: "تعذرت قراءة الصورة",
    male: "ذكر",
    female: "أنثى",
    programContext: "سيتم إضافة المعتمرين إلى برنامج: {program}",
    programIncompleteNotice: "سيتم حفظ المعتمرين داخل هذا البرنامج دون مستوى أو غرفة. يرجى إكمال المعلومات لاحقًا.",
    unassignedImportNotice: "سيتم حفظ المعتمرين دون ربطهم بأي برنامج.",
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
    programRequired: "يمكن حفظ الجوازات دون برنامج عند فتح الاستيراد من تبويب المعتمرين.",
    packageRequired: "يرجى تحديد المستوى قبل الحفظ",
    roomTypeRequired: "يرجى تحديد نوع الغرفة قبل الحفظ",
    assignmentRequired: "يمكن إكمال معلومات المستوى والغرفة لاحقًا.",
    assignmentNotice: "سيتم حفظ المعتمرين دون مستوى أو غرفة.",
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
    checksumAcceptHint: "Les contrôles MRZ ne correspondent pas, vous pouvez accepter après vérification des champs.",
    requiredFieldsHardBlock: "Enregistrement impossible, des champs obligatoires sont manquants.",
    manualAcceptToast: "Ligne acceptée après vérification manuelle.",
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
      invalid_date: "Une date est invalide et doit être vérifiée",
      partial_birth_date: "Date de naissance incomplète dans le passeport, adoptée approximativement",
      invalid_passport_number: "Le numéro de passeport est invalide et doit être vérifié",
      no_mrz_text: "Aucun texte MRZ n’a été trouvé dans la zone sélectionnée",
      parser_failed: "Du texte a été trouvé, mais le format MRZ n’a pas été reconnu",
      low_confidence: "La lecture n’est pas certaine et doit être vérifiée",
    },
    ocrNotFound: "Aucun texte n’a été détecté dans la zone sélectionnée. Vérifiez la netteté de l’image et sélectionnez uniquement les deux lignes MRZ.",
    ocrNoText: "Aucun texte n’a été détecté dans la zone sélectionnée. Vérifiez la netteté de l’image et sélectionnez uniquement les deux lignes MRZ.",
    mrzFormatNotRecognized: "Du texte a été détecté, mais le format MRZ n’a pas été reconnu. Sélectionnez uniquement les deux lignes en bas du passeport ou corrigez les champs dans le tableau de vérification.",
    imageTooSmall: "La qualité de l’image est insuffisante pour lire le passeport. Essayez une image plus nette.",
    mrzLine1NotFound: "Première ligne MRZ introuvable",
    mrzLine2NotFound: "Deuxième ligne MRZ introuvable",
    mrzLengthError: "Longueur des lignes MRZ incorrecte",
    mrzParseFailed: "Une MRZ candidate a été trouvée mais n'a pas validé les contrôles",
    ocrFailed: "Lecture de l'image impossible",
    male: "Masculin",
    female: "Féminin",
    programContext: "Les pèlerins seront ajoutés au programme : {program}",
    programIncompleteNotice: "Les pèlerins seront enregistrés dans ce programme sans niveau ni chambre. Informations à compléter ensuite.",
    unassignedImportNotice: "Les pèlerins seront enregistrés sans affectation à un programme.",
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
    programRequired: "Les passeports peuvent être enregistrés sans programme depuis l’onglet pèlerins.",
    packageRequired: "Veuillez choisir le niveau avant l'enregistrement",
    roomTypeRequired: "Veuillez choisir le type de chambre avant l'enregistrement",
    assignmentRequired: "Les informations de niveau et de chambre peuvent être complétées ensuite.",
    assignmentNotice: "Les pèlerins seront enregistrés sans niveau ni chambre.",
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
    checksumAcceptHint: "The MRZ checks do not match; you can accept it after reviewing the fields.",
    requiredFieldsHardBlock: "Cannot save because some required fields are missing.",
    manualAcceptToast: "Row accepted after manual review.",
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
      invalid_date: "A date is invalid and needs review",
      partial_birth_date: "Birth date is incomplete in the passport and was approximated",
      invalid_passport_number: "The passport number is invalid and needs review",
      no_mrz_text: "No MRZ text was found in the selected area",
      parser_failed: "Text was found, but the MRZ format was not recognized",
      low_confidence: "The read result is uncertain and needs review",
    },
    ocrNotFound: "No text was detected in the selected area. Make sure the image is clear and select only the two MRZ lines.",
    ocrNoText: "No text was detected in the selected area. Make sure the image is clear and select only the two MRZ lines.",
    mrzFormatNotRecognized: "Text was detected, but the MRZ format was not recognized. Select only the two bottom MRZ lines or correct the fields in the review table.",
    imageTooSmall: "The image quality is not sufficient to read the passport. Try a clearer image.",
    mrzLine1NotFound: "MRZ first line was not found",
    mrzLine2NotFound: "MRZ second line was not found",
    mrzLengthError: "MRZ line length is not valid",
    mrzParseFailed: "An MRZ candidate was found but failed validation",
    ocrFailed: "Could not read image",
    male: "Male",
    female: "Female",
    programContext: "Pilgrims will be added to program: {program}",
    programIncompleteNotice: "Pilgrims will be saved in this program without package or room details. Complete the information later.",
    unassignedImportNotice: "Pilgrims will be saved without a program assignment.",
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
    programRequired: "Passports can be saved without a program from the pilgrims tab.",
    packageRequired: "Select a package before saving",
    roomTypeRequired: "Select a room type before saving",
    assignmentRequired: "Package and room information can be completed later.",
    assignmentNotice: "Pilgrims will be saved without package or room details.",
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
const labeledReviewReason = (reason) => Object.values(REVIEW_REASON).includes(reason);

const getSuspiciousLatinNameReason = (value = "") => {
  const validation = validateLatinName(value);
  if (!String(value || "").trim()) return "";
  return validation.ok ? "" : REVIEW_REASON.SUSPICIOUS_NAME;
};

const getExistingArabic = (client = {}) => ({
  arabicLastName: client.lastName || client.arabicLastName || client.last_name || "",
  arabicFirstName: client.firstName || client.arabicFirstName || client.first_name || "",
});

const normalizeLatinToken = (value = "") => String(value || "").toUpperCase().replace(/[^A-Z]/g, "");

const getLine1RawVariantsFromOutcome = (outcome = {}, parsed = {}) => {
  const attempts = outcome?.debug?.attempts || [];
  return Array.from(new Set([
    parsed?.raw?.line1,
    parsed?.engineResult?.raw?.line1,
    parsed?.engineResult?.diagnostics?.line1?.originalLine1,
    ...attempts.map((attempt) => attempt.detectedLine1),
    ...attempts
      .filter((attempt) => attempt.cropType === "line1")
      .flatMap((attempt) => attempt.normalizedOcrText || []),
  ].filter(Boolean)));
};

const getGivenNameCandidatesFromOutcome = (outcome = {}, parsed = {}) => {
  const attempts = outcome?.debug?.attempts || [];
  const line1Diag = parsed?.engineResult?.diagnostics?.line1 || {};
  return Array.from(new Set([
    parsed?.data?.latinFirstName,
    parsed?.data?.firstName,
    parsed?.engineResult?.fields?.firstNameLatin,
    line1Diag.finalGivenNames,
    line1Diag.cleanedGivenName,
    ...attempts.flatMap((attempt) => [
      attempt.parser?.fields?.firstNameLatin,
      attempt.parser?.fields?.latinFirstName,
      attempt.parser?.fields?.firstName,
      attempt.parser?.line1?.finalGivenNames,
      attempt.parser?.line1?.cleanedGivenName,
    ]),
  ].map((value) => String(value || "").trim()).filter(Boolean)));
};

const getGivenNameFillerContexts = ({ value = "", parsed = {}, outcome = {} } = {}) => {
  const token = normalizeLatinToken(value);
  const line1Diag = parsed?.engineResult?.diagnostics?.line1 || {};
  const contexts = [
    line1Diag.contextAfterGivenCandidate,
    line1Diag.rawGivenNameCandidate,
    ...getLine1RawVariantsFromOutcome(outcome, parsed),
  ].filter(Boolean);
  if (!token) return contexts;
  return contexts.flatMap((context) => {
    const clean = String(context || "").toUpperCase().replace(/[^A-Z0-9<]/g, "");
    const index = clean.indexOf(token);
    return index >= 0 ? [clean.slice(index + token.length, index + token.length + 16)] : [clean];
  });
};

const hasGivenNameFillerContext = ({ value = "", parsed = {}, outcome = {} } = {}) => (
  getGivenNameFillerContexts({ value, parsed, outcome }).some((context) => (
    /<{2,}/.test(context) || /[CLKI<]{4,}/.test(context)
  ))
);

export const resolveFinalMrzGivenName = ({
  parserGivenName = "",
  fallbackGivenName = "",
  oldGivenName = "",
  parsed = {},
  outcome = {},
} = {}) => {
  const rawParser = String(parserGivenName || "").trim().toUpperCase();
  const fallback = String(fallbackGivenName || "").trim().toUpperCase();
  const oldValue = String(oldGivenName || "").trim().toUpperCase();
  const candidateValues = getGivenNameCandidatesFromOutcome(outcome, parsed);
  const candidateSupport = candidateValues.reduce((acc, value) => {
    const token = normalizeLatinToken(value);
    if (token) acc[token] = (acc[token] || 0) + 1;
    return acc;
  }, {});
  const sourceBeforeCleanup = rawParser ? "mrz_parser" : fallback ? "fallback" : oldValue ? "old_row" : "empty";
  let finalValue = rawParser || fallback || oldValue || "";
  let finalSource = sourceBeforeCleanup;
  let overwrittenBy = "";
  let trailingNoiseRemoved = "";
  const currentToken = normalizeLatinToken(finalValue);
  const shorterSupported = Object.keys(candidateSupport)
    .filter((candidate) => currentToken.length === candidate.length + 1 && currentToken.startsWith(candidate))
    .sort((a, b) => (candidateSupport[b] || 0) - (candidateSupport[a] || 0) || b.length - a.length)[0] || "";

  if (rawParser && shorterSupported && /[CKLI]$/.test(currentToken)) {
    finalValue = shorterSupported;
    finalSource = "mrz_parser_consensus";
    trailingNoiseRemoved = currentToken.slice(-1);
    overwrittenBy = "cleaner_mrz_given_name_candidate";
  } else if (rawParser && currentToken && /[CKLI]$/.test(currentToken)) {
    const shortened = currentToken.slice(0, -1);
    const terminal = currentToken.slice(-1);
    const fillerContext = hasGivenNameFillerContext({ value: currentToken, parsed, outcome });
    const clearMoroccanGivenTail = /AN$/.test(shortened);
    const supportedShorter = Boolean(candidateSupport[shortened]);
    const canRemove = fillerContext && (
      (/[CKL]/.test(terminal) && (clearMoroccanGivenTail || supportedShorter))
      || (terminal === "I" && supportedShorter)
    );
    if (canRemove) {
      finalValue = shortened;
      finalSource = "mrz_parser_context_cleanup";
      trailingNoiseRemoved = terminal;
      overwrittenBy = "trailing_mrz_filler_noise";
    }
  }

  if (rawParser && finalValue !== fallback && fallback && normalizeLatinToken(fallback).startsWith(normalizeLatinToken(finalValue))) {
    overwrittenBy = overwrittenBy || "mrz_parser_over_fallback";
  }
  if (rawParser && finalValue !== oldValue && oldValue && normalizeLatinToken(oldValue).startsWith(normalizeLatinToken(finalValue))) {
    overwrittenBy = overwrittenBy || "mrz_parser_over_old_row";
  }

  return {
    finalValue,
    finalSource,
    parserGivenNameBeforeCleanup: rawParser,
    fallbackGivenName: fallback,
    oldRowGivenName: oldValue,
    candidateValues,
    candidateSupport,
    fillerContexts: getGivenNameFillerContexts({ value: currentToken, parsed, outcome }),
    trailingNoiseRemoved,
    overwrittenBy,
  };
};

const issueText = (issues = [], l, raw = {}) => {
  if (!issues.length) return "";
  return issues.map((issue) => {
    if (l.reviewReasonMessages?.[issue]) return getReviewReasonLabel(l, issue);
    if (issue === "MRZ_MISSING") return l.ocrNotFound;
    if (["LINE1_INVALID_CHARS", "LINE2_INVALID_CHARS", "LINE1_LENGTH", "LINE2_LENGTH", "LINE_LENGTH", "NOT_TD3_PASSPORT", "PARSE_ERROR"].includes(issue)) {
      const count = issue === "LINE1_LENGTH" ? ` (${mrzCount(raw.line1)}/44)` : issue === "LINE2_LENGTH" ? ` (${mrzCount(raw.line2)}/44)` : "";
      return `${getReviewReasonLabel(l, REVIEW_REASON.PARTIAL_MRZ_READ)}${count}`;
    }
    if (["PASSPORT_CHECK", "BIRTH_CHECK", "EXPIRY_CHECK"].includes(issue)) return getReviewReasonLabel(l, REVIEW_REASON.CHECKSUM_FAILED);
    if (issue === "NAME_FILLER_NOISE") return getReviewReasonLabel(l, REVIEW_REASON.SUSPICIOUS_NAME);
    if (issue === "INVALID_DATE") return getReviewReasonLabel(l, REVIEW_REASON.INVALID_DATE);
    if (issue === "LOW_CONFIDENCE") return getReviewReasonLabel(l, REVIEW_REASON.LOW_CONFIDENCE);
    if (["LAST_NAME_MISSING", "FIRST_NAME_MISSING", "NATIONALITY_MISSING", "GENDER_MISSING", "PASSPORT_MISSING"].includes(issue)) {
      return getReviewReasonLabel(l, REVIEW_REASON.MISSING_REQUIRED_FIELD);
    }
    return `MRZ: ${issue}`;
  }).join(" · ");
};

const ocrFailureText = (error, l) => {
  if (error === REVIEW_REASON.NO_MRZ_TEXT || error === "no_mrz_text") return l.ocrNoText;
  if (error === REVIEW_REASON.PARSER_FAILED || error === "parser_failed") return l.mrzFormatNotRecognized;
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

const removeReasonFromFieldWarnings = (warnings = {}, reason) => {
  Object.keys(warnings).forEach((field) => {
    warnings[field] = (warnings[field] || []).filter((item) => item !== reason);
    if (!warnings[field].length) delete warnings[field];
  });
};

const PARTIAL_BIRTH_PRECISIONS = new Set(["year", "month"]);

const hasApproximatedBirthDate = (row = {}) => Boolean(
  row.birthDateApproximated
  && row.mrzBirthDateRaw
  && PARTIAL_BIRTH_PRECISIONS.has(row.birthDatePrecision)
);

const hasPartialBirthDateOnly = (row = {}) => Boolean(
  !String(row.birthDate || "").trim()
  && row.mrzBirthDateRaw
  && PARTIAL_BIRTH_PRECISIONS.has(row.birthDatePrecision)
);

const birthDateRequirementValue = (row = {}) => (
  String(row.birthDate || "").trim() || (hasPartialBirthDateOnly(row) ? row.mrzBirthDateRaw : "")
);

const normalizeOptionalNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const getMrzBirthDateMetaFromParsed = (parsed = {}) => {
  const data = parsed?.data || {};
  const engineFields = parsed?.engineResult?.fields || {};
  const line2Birth = parsed?.engineResult?.diagnostics?.line2?.birthDate || {};
  const fixedBirthRaw = parsed?.engineResult?.diagnostics?.line2?.fixedPositions?.birthDate?.value || "";
  return {
    mrzBirthDateRaw: data.birthDateRaw || engineFields.birthDateRaw || line2Birth.raw || fixedBirthRaw || "",
    birthDatePrecision: data.birthDatePrecision || engineFields.birthDatePrecision || line2Birth.precision || "",
    birthYear: normalizeOptionalNumber(data.birthYear ?? engineFields.birthYear ?? line2Birth.year),
    birthMonth: normalizeOptionalNumber(data.birthMonth ?? engineFields.birthMonth ?? line2Birth.month),
    birthDay: normalizeOptionalNumber(data.birthDay ?? engineFields.birthDay ?? line2Birth.day),
    birthDateApproximated: Boolean(data.birthDateApproximated ?? engineFields.birthDateApproximated ?? line2Birth.approximated),
    birthDateApproximationRule: data.birthDateApproximationRule || engineFields.birthDateApproximationRule || line2Birth.approximationRule || "",
  };
};

const getRequiredFieldsCheck = (row = {}, { programMode = false } = {}) => ({
  lastName: Boolean(String(row.latinLastName || row.arabicLastName || "").trim()),
  firstName: Boolean(String(row.latinFirstName || row.arabicFirstName || "").trim()),
  passportNumber: Boolean(normalizePassportNo(row.passportNo)),
  nationality: Boolean(String(row.nationality || "").trim()),
  birthDate: Boolean(birthDateRequirementValue(row)),
  expiryDate: Boolean(String(row.passportExpiry || "").trim()),
  gender: Boolean(String(row.gender || "").trim()),
  programLevelRoom: !programMode || Boolean(row.programId),
});

const requiredPassportFieldsPresent = (row = {}) => {
  const check = getRequiredFieldsCheck(row);
  return check.lastName
    && check.firstName
    && check.passportNumber
    && check.nationality
    && check.birthDate
    && check.expiryDate
    && check.gender;
};

const onlySoftMrzWarnings = (reasons = []) => reasons.every((reason) => [
  REVIEW_REASON.CHECKSUM_FAILED,
  REVIEW_REASON.PARTIAL_MRZ_READ,
  REVIEW_REASON.PARTIAL_BIRTH_DATE,
  REVIEW_REASON.LOW_CONFIDENCE,
].includes(reason));

const buildParsedReviewState = ({ parsed, duplicate = false } = {}) => {
  const reasons = new Set();
  const fieldWarnings = {};
  const fieldMap = {
    lastNameLatin: "latinLastName",
    firstNameLatin: "latinFirstName",
    passportNumber: "passportNo",
    expiryDate: "passportExpiry",
  };
  (parsed?.reviewReasons || []).forEach((reason) => {
    if (labeledReviewReason(reason)) reasons.add(reason);
  });
  Object.entries(parsed?.fieldWarnings || {}).forEach(([field, warningReasons]) => {
    const targetField = fieldMap[field] || field;
    (warningReasons || []).forEach((reason) => {
      if (labeledReviewReason(reason)) {
        reasons.add(reason);
        setFieldWarning(fieldWarnings, targetField, reason);
      }
    });
  });
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
  const birthDateMeta = getMrzBirthDateMetaFromParsed(parsed);
  [
    ["latinLastName", data.latinLastName || data.lastName || ""],
    ["latinFirstName", data.latinFirstName || data.firstName || ""],
  ].forEach(([field, value]) => {
    if (getSuspiciousLatinNameReason(value)) {
      reasons.add(REVIEW_REASON.SUSPICIOUS_NAME);
      setFieldWarning(fieldWarnings, field, REVIEW_REASON.SUSPICIOUS_NAME);
    }
  });
  const parsedRow = {
    latinLastName: data.latinLastName || data.lastName || "",
    latinFirstName: data.latinFirstName || data.firstName || "",
    passportNo: data.passportNo || "",
    nationality: data.nationality || "",
    birthDate: data.birthDate || "",
    passportExpiry: data.expiryDate || "",
    gender: normalizeGender(data.gender),
    ...birthDateMeta,
  };
  if (hasPartialBirthDateOnly(parsedRow) || hasApproximatedBirthDate(parsedRow)) {
    reasons.add(REVIEW_REASON.PARTIAL_BIRTH_DATE);
    setFieldWarning(fieldWarnings, "birthDate", REVIEW_REASON.PARTIAL_BIRTH_DATE);
  }
  if (requiredPassportFieldsPresent(parsedRow)) {
    reasons.delete(REVIEW_REASON.MISSING_REQUIRED_FIELD);
    removeReasonFromFieldWarnings(fieldWarnings, REVIEW_REASON.MISSING_REQUIRED_FIELD);
    if (onlySoftMrzWarnings(Array.from(reasons))) {
      reasons.delete(REVIEW_REASON.LOW_CONFIDENCE);
      removeReasonFromFieldWarnings(fieldWarnings, REVIEW_REASON.LOW_CONFIDENCE);
    }
  }
  if (!getSuspiciousLatinNameReason(parsedRow.latinLastName) && !getSuspiciousLatinNameReason(parsedRow.latinFirstName)) {
    reasons.delete(REVIEW_REASON.SUSPICIOUS_NAME);
    removeReasonFromFieldWarnings(fieldWarnings, REVIEW_REASON.SUSPICIOUS_NAME);
  }
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
    ["birthDate", birthDateRequirementValue(row)],
    ["passportExpiry", String(row.passportExpiry || "").trim()],
    ["gender", String(row.gender || "").trim()],
  ].forEach(([field, value]) => {
    if (!value) {
      reasons.add(REVIEW_REASON.MISSING_REQUIRED_FIELD);
      setFieldWarning(fieldWarnings, field, REVIEW_REASON.MISSING_REQUIRED_FIELD);
    }
  });
  if (hasPartialBirthDateOnly(row) || hasApproximatedBirthDate(row)) {
    reasons.add(REVIEW_REASON.PARTIAL_BIRTH_DATE);
    setFieldWarning(fieldWarnings, "birthDate", REVIEW_REASON.PARTIAL_BIRTH_DATE);
  }
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
      && reason !== REVIEW_REASON.PARTIAL_BIRTH_DATE
      && reason !== REVIEW_REASON.SUSPICIOUS_NAME
      && reason !== REVIEW_REASON.CHECKSUM_FAILED
      && reason !== REVIEW_REASON.INVALID_DATE
      && reason !== REVIEW_REASON.INVALID_PASSPORT_NUMBER
      && reason !== REVIEW_REASON.LOW_CONFIDENCE
    )),
  );

  Object.values(fieldWarnings).flat().forEach((reason) => reasons.add(reason));
  [
    ["passportNo", normalizePassportNo(row.passportNo)],
    ["latinLastName", String(row.latinLastName || "").trim()],
    ["latinFirstName", String(row.latinFirstName || "").trim()],
    ["nationality", String(row.nationality || "").trim()],
    ["birthDate", birthDateRequirementValue(row)],
    ["passportExpiry", String(row.passportExpiry || "").trim()],
    ["gender", String(row.gender || "").trim()],
  ].forEach(([field, value]) => {
    if (!value) {
      reasons.add(REVIEW_REASON.MISSING_REQUIRED_FIELD);
      setFieldWarning(fieldWarnings, field, REVIEW_REASON.MISSING_REQUIRED_FIELD);
    }
  });
  if (hasPartialBirthDateOnly(row) || hasApproximatedBirthDate(row)) {
    reasons.add(REVIEW_REASON.PARTIAL_BIRTH_DATE);
    setFieldWarning(fieldWarnings, "birthDate", REVIEW_REASON.PARTIAL_BIRTH_DATE);
  }
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

const makeRowFromParsed = ({
  parsed,
  source,
  existing,
  l,
  statusOverride,
  noteOverride,
  hasImage = false,
  extractionSource = EXTRACTION_SOURCE.AUTOMATIC_MRZ,
  debugInfo = null,
}) => {
  const data = parsed?.data || {};
  const duplicate = Boolean(existing);
  const existingArabic = duplicate ? getExistingArabic(existing) : {};
  const hasParsedData = Boolean(parsed?.data);
  const isTrustedMRZ = Boolean(parsed?.ok && parsed?.data);
  const reviewState = buildParsedReviewState({ parsed, duplicate });
  const status = statusOverride || (!hasParsedData ? ROW_STATUS.FAILED : isTrustedMRZ && !reviewState.reviewRequiredGeneral ? ROW_STATUS.READY : ROW_STATUS.NEEDS_REVIEW);
  const parsedIssueNote = issueText(parsed?.issues || [], l, parsed?.raw);
  const birthDateMeta = getMrzBirthDateMetaFromParsed(parsed);
  const line2Mapping = buildMRZPriorityRowFields({
    parserFields: getMrzLine2FieldsFromParsed(parsed),
    fallbackFields: parsed?.fallbackFields || {},
  });
  const givenNameDecision = resolveFinalMrzGivenName({
    parserGivenName: hasParsedData ? (data.latinFirstName || data.firstName || "") : "",
    fallbackGivenName: parsed?.fallbackFields?.latinFirstName || parsed?.fallbackFields?.firstName || "",
    oldGivenName: debugInfo?.oldRow?.latinFirstName || "",
    parsed,
    outcome: debugInfo?.outcome || {},
  });
  const row = {
    id: `mrz-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    source,
    mrzLine1: parsed?.raw?.line1 || "",
    mrzLine2: parsed?.raw?.line2 || "",
    status,
    accepted: status === ROW_STATUS.READY && !duplicate,
    manualAccepted: false,
    extractionSource,
    confidence: typeof parsed?.confidence === "number"
      ? parsed.confidence
      : status === ROW_STATUS.READY
        ? (extractionSource === EXTRACTION_SOURCE.MANUAL_MRZ ? 0.98 : 0.9)
        : hasParsedData
          ? (extractionSource === EXTRACTION_SOURCE.MANUAL_MRZ ? 0.78 : 0.62)
          : 0,
    ...reviewState,
    duplicateAction: duplicate ? "skip" : "add",
    existingClientId: existing?.id || "",
    latinLastName: hasParsedData ? (data.latinLastName || data.lastName || "") : "",
    latinFirstName: hasParsedData ? givenNameDecision.finalValue : "",
    arabicLastName: existingArabic.arabicLastName || "",
    arabicFirstName: existingArabic.arabicFirstName || "",
    passportNo: hasParsedData ? line2Mapping.finalFields.passportNo : "",
    nationality: hasParsedData ? line2Mapping.finalFields.nationality : "",
    birthDate: hasParsedData ? line2Mapping.finalFields.birthDate : "",
    gender: hasParsedData ? line2Mapping.finalFields.gender : "",
    passportExpiry: hasParsedData ? line2Mapping.finalFields.passportExpiry : "",
    ...birthDateMeta,
    raw: data.raw || parsed?.raw || {},
    hasImage,
  };
  if (process.env.NODE_ENV !== "production") {
    const attempts = debugInfo?.outcome?.debug?.attempts || [];
    console.debug("[MRZ given final trace]", {
      allLine1OcrVariants: getLine1RawVariantsFromOutcome(debugInfo?.outcome || {}, parsed),
      selectedLine1Candidate: parsed?.engineResult?.raw?.line1 || parsed?.raw?.line1 || "",
      parsedGivenNameBeforeCleanup: givenNameDecision.parserGivenNameBeforeCleanup,
      givenNameAfterCleanup: givenNameDecision.finalValue,
      fullMrzParsedGivenName: attempts.find((attempt) => attempt.cropType === "full_mrz")?.parser?.fields?.firstNameLatin || "",
      line1CropParsedGivenName: attempts.find((attempt) => attempt.cropType === "line1")?.parser?.fields?.firstNameLatin || "",
      fallbackGivenName: givenNameDecision.fallbackGivenName,
      oldRowGivenName: givenNameDecision.oldRowGivenName,
      finalLatinFirstName: row.latinFirstName,
      finalSource: givenNameDecision.finalSource,
      overwrittenBy: givenNameDecision.overwrittenBy,
      trailingNoiseRemoved: givenNameDecision.trailingNoiseRemoved,
      fillerContexts: givenNameDecision.fillerContexts,
      consensusSupport: givenNameDecision.candidateSupport,
    });
    console.debug("[MRZ row mapping]", {
      source,
      extractionSource,
      rawOcrLine2: parsed?.engineResult?.raw?.inputLines?.[1] || parsed?.raw?.line2 || "",
      normalizedLine2: parsed?.engineResult?.diagnostics?.line2?.normalizedLine2 || "",
      selectedLine2Candidate: parsed?.engineResult?.diagnostics?.line2?.selected44CharLine || parsed?.raw?.line2 || "",
      parserFields: line2Mapping.parserFields,
      parserFieldSources: parsed?.engineResult?.diagnostics?.line2?.fieldSources || {},
      fallbackOcrFields: line2Mapping.fallbackFields,
      oldRowFieldsBeforeMerge: null,
      finalRowFieldsAfterMerge: {
        passportNo: row.passportNo,
        nationality: row.nationality,
        birthDate: row.birthDate,
        gender: row.gender,
        passportExpiry: row.passportExpiry,
      },
      ...line2Mapping.sources,
      checks: parsed?.checks || parsed?.engineResult?.checks || {},
      reviewReasons: parsed?.reviewReasons || parsed?.engineResult?.reviewReasons || [],
    });
  }
  const finalNote = noteOverride
    || [
      reviewState.reviewReasons.includes(REVIEW_REASON.MISSING_REQUIRED_FIELD)
        ? l.requiredFieldsHardBlock
        : onlySoftMrzWarnings(reviewState.reviewReasons) && reviewState.reviewReasons.includes(REVIEW_REASON.CHECKSUM_FAILED)
          ? l.checksumAcceptHint
          : parsedIssueNote,
      duplicate ? l.duplicate : "",
    ].filter(Boolean).join(" · ");
  const rowWithNote = { ...row, note: finalNote };
  if (MRZ_DEV && debugInfo) {
    rowWithNote.mrzDebug = buildMrzDebugInfo({
      parsed,
      outcome: debugInfo.outcome,
      row: rowWithNote,
      oldRow: debugInfo.oldRow,
      originalImageUrl: debugInfo.originalImageUrl,
      mode: debugInfo.mode,
      cropRect: debugInfo.cropRect,
    });
  }
  return rowWithNote;
};

const rowHasRequiredPassportData = (row = {}) => Boolean(
  requiredPassportFieldsPresent(row)
  && !getSuspiciousLatinNameReason(row.latinLastName)
  && !getSuspiciousLatinNameReason(row.latinFirstName)
);

const rowHasEssentialPassportData = (row = {}) => requiredPassportFieldsPresent(row);

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

const sanitizeDebugValue = (value) => {
  if (Array.isArray(value)) return value.map(sanitizeDebugValue);
  if (typeof value === "string") return value.startsWith("data:image/") || value.startsWith("blob:") ? "[image omitted]" : value;
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !["originalImageUrl", "fullMrz", "visualPassportNumber", "previews"].includes(key))
      .map(([key, item]) => [key, sanitizeDebugValue(item)]),
  );
};

const getMrzLine2FieldsFromParsed = (parsed = {}) => {
  const engineFields = parsed?.engineResult?.fields || {};
  const data = parsed?.data || {};
  const birthDateMeta = getMrzBirthDateMetaFromParsed(parsed);
  return {
    passportNo: engineFields.passportNumber || data.passportNo || data.passportNumber || "",
    nationality: engineFields.nationality || data.nationality || "",
    birthDate: engineFields.birthDate || data.birthDate || data.birth_date || data.dateOfBirth || "",
    ...birthDateMeta,
    gender: normalizeGender(engineFields.gender || data.gender || data.sex || ""),
    passportExpiry: engineFields.expiryDate || data.expiryDate || data.passportExpiry || data.expiry_date || "",
  };
};

const buildMrzFinalMapping = ({ row = {}, oldRow = {}, parserFields = {}, fallbackFields = {}, sources = {} } = {}) => {
  const map = [
    ["latinLastName", "lastNameSource", row.latinLastName, oldRow.latinLastName, parserFields.latinLastName, fallbackFields.latinLastName || fallbackFields.lastName],
    ["latinFirstName", "firstNameSource", row.latinFirstName, oldRow.latinFirstName, parserFields.latinFirstName, fallbackFields.latinFirstName || fallbackFields.firstName],
    ["passportNo", "passportNumberSource", row.passportNo, oldRow.passportNo, parserFields.passportNo || parserFields.passportNumber, fallbackFields.passportNo || fallbackFields.passportNumber],
    ["nationality", "nationalitySource", row.nationality, oldRow.nationality, parserFields.nationality, fallbackFields.nationality || fallbackFields.country],
    ["birthDate", "birthDateSource", row.birthDate, oldRow.birthDate, parserFields.birthDate, fallbackFields.birthDate || fallbackFields.dateOfBirth],
    ["gender", "genderSource", row.gender, oldRow.gender, parserFields.gender, fallbackFields.gender || fallbackFields.sex],
    ["passportExpiry", "expiryDateSource", row.passportExpiry, oldRow.passportExpiry, parserFields.passportExpiry || parserFields.expiryDate, fallbackFields.passportExpiry || fallbackFields.expiryDate],
  ];
  return map.map(([field, sourceField, finalValue, oldValue, parserValue, fallbackValue]) => ({
    field,
    finalValue: finalValue || "",
    source: sources[sourceField] || (parserValue && finalValue === parserValue ? "mrz_line1" : finalValue ? "row" : "empty"),
    confidence: row.confidence || 0,
    oldValue: oldValue || "",
    fallbackValue: fallbackValue || "",
    mrzParserValue: parserValue || "",
    overwritten: Boolean(oldValue && finalValue && oldValue !== finalValue),
    manuallyEdited: false,
  }));
};

const buildMrzDebugInfo = ({
  parsed = {},
  outcome = {},
  row = {},
  oldRow = {},
  originalImageUrl = "",
  mode = "automatic",
  cropRect = null,
} = {}) => {
  if (!MRZ_DEV) return null;
  const parserFields = {
    latinLastName: parsed?.data?.latinLastName || parsed?.data?.lastName || "",
    latinFirstName: parsed?.data?.latinFirstName || parsed?.data?.firstName || "",
    ...getMrzLine2FieldsFromParsed(parsed),
  };
  const line2Mapping = buildMRZPriorityRowFields({
    parserFields,
    fallbackFields: parsed?.fallbackFields || outcome?.fallbackFields || {},
    oldRow,
  });
  return {
    mode,
    sourceFile: row.source || "",
    originalImageUrl,
    cropRect,
    attempts: outcome?.debug?.attempts || [],
    selectedVariant: outcome?.debug?.variant || outcome?.variant || "",
    selectionScore: outcome?.debug?.selectionScore ?? outcome?.selectionScore ?? null,
    rawOcrText: outcome?.ocrText || parsed?.raw?.ocrText || "",
    normalizedOcrText: normalizeMRZOCRText(outcome?.ocrText || parsed?.raw?.ocrText || ""),
    parser: {
      line1: parsed?.engineResult?.diagnostics?.line1 || {},
      line2: parsed?.engineResult?.diagnostics?.line2 || {},
      fields: parsed?.engineResult?.fields || parsed?.data || {},
      checks: parsed?.engineResult?.checks || parsed?.checks || {},
      reviewReasons: parsed?.engineResult?.reviewReasons || parsed?.reviewReasons || [],
    },
    finalMapping: buildMrzFinalMapping({
      row,
      oldRow,
      parserFields,
      fallbackFields: line2Mapping.fallbackFields,
      sources: line2Mapping.sources,
    }),
    finalRow: {
      lastNameLatin: row.latinLastName || "",
      firstNameLatin: row.latinFirstName || "",
      passportNo: row.passportNo || "",
      nationality: row.nationality || "",
      birthDate: row.birthDate || "",
      mrzBirthDateRaw: row.mrzBirthDateRaw || "",
      birthDatePrecision: row.birthDatePrecision || "",
      birthYear: row.birthYear || null,
      birthMonth: row.birthMonth || null,
      birthDateApproximated: Boolean(row.birthDateApproximated),
      birthDateApproximationRule: row.birthDateApproximationRule || "",
      gender: row.gender || "",
      passportExpiry: row.passportExpiry || "",
      status: row.status || "",
      reviewReasons: row.reviewReasons || [],
    },
  };
};

export const buildMRZPriorityRowFields = ({ parserFields = {}, fallbackFields = {}, oldRow = {} } = {}) => {
  const normalizedParser = {
    passportNo: parserFields.passportNo || parserFields.passportNumber || "",
    nationality: parserFields.nationality || "",
    birthDate: parserFields.birthDate || "",
    gender: normalizeGender(parserFields.gender || parserFields.sex || ""),
    passportExpiry: parserFields.passportExpiry || parserFields.expiryDate || "",
  };
  const normalizedFallback = {
    passportNo: fallbackFields.passportNo || fallbackFields.passportNumber || fallbackFields.passport_number || fallbackFields.documentNumber || "",
    nationality: fallbackFields.nationality || fallbackFields.country || "",
    birthDate: fallbackFields.birthDate || fallbackFields.birth_date || fallbackFields.dateOfBirth || "",
    gender: normalizeGender(fallbackFields.gender || fallbackFields.sex || ""),
    passportExpiry: fallbackFields.passportExpiry || fallbackFields.expiryDate || fallbackFields.expiry_date || "",
  };
  const finalFields = {};
  const sources = {};
  [
    ["passportNo", "passportNumberSource"],
    ["nationality", "nationalitySource"],
    ["birthDate", "birthDateSource"],
    ["gender", "genderSource"],
    ["passportExpiry", "expiryDateSource"],
  ].forEach(([field, sourceField]) => {
    if (normalizedParser[field]) {
      finalFields[field] = normalizedParser[field];
      sources[sourceField] = "mrz_line2";
    } else if (normalizedFallback[field]) {
      finalFields[field] = normalizedFallback[field];
      sources[sourceField] = "fallback_ocr";
    } else {
      finalFields[field] = oldRow[field] || "";
      sources[sourceField] = finalFields[field] ? "old_row" : "empty";
    }
  });
  return {
    finalFields,
    sources,
    parserFields: normalizedParser,
    fallbackFields: normalizedFallback,
  };
};

export const runMRZRowMappingSelfTest = () => {
  const result = buildMRZPriorityRowFields({
    parserFields: {
      passportNumber: "D04379674",
      nationality: "MAR",
      birthDate: "1979-03-24",
      gender: "M",
      expiryDate: "2030-10-10",
    },
    fallbackFields: {
      passportNumber: "4L3796765",
      nationality: "ART",
      birthDate: "1971-03-24",
    },
  });
  const givenNameResult = resolveFinalMrzGivenName({
    parserGivenName: "HASSAN",
    fallbackGivenName: "HASSANK",
    oldGivenName: "HASSANK",
    parsed: {
      data: { latinFirstName: "HASSAN" },
      engineResult: {
        diagnostics: {
          line1: {
            finalGivenNames: "HASSAN",
            rawGivenNameCandidate: "HASSAN<<<LLLL",
            contextAfterGivenCandidate: "<<<LLLL",
          },
        },
      },
    },
  });
  const expected = {
    passportNo: "D04379674",
    nationality: "MAR",
    birthDate: "1979-03-24",
    gender: "male",
    passportExpiry: "2030-10-10",
  };
  const expectedGivenName = "HASSAN";
  return {
    ok: Object.entries(expected).every(([field, value]) => result.finalFields[field] === value)
      && givenNameResult.finalValue === expectedGivenName,
    expected,
    actual: result.finalFields,
    sources: result.sources,
    expectedGivenName,
    actualGivenName: givenNameResult.finalValue,
    givenNameDecision: givenNameResult,
  };
};

function ReviewRow({
  row,
  index,
  labels,
  onChange,
  onRemove,
  onSelectMRZ,
}) {
  const statusColor = row.status === ROW_STATUS.READY || row.status === ROW_STATUS.MANUALLY_ACCEPTED ? tc.greenLight : row.status === ROW_STATUS.FAILED ? "var(--rukn-danger)" : "var(--rukn-warning)";
  const canManuallyAccept = rowCanBeManuallyAccepted(row);
  return (
    <tr style={{ borderTop: "1px solid var(--rukn-border-soft)" }}>
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
      <td style={{ padding: 6 }}>
        <input
          value={row.phone || ""}
          onChange={(event) => onChange(row.id, { phone: event.target.value })}
          style={{ ...fieldStyle, minWidth: 110, direction: "ltr" }}
        />
      </td>
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

function DebugText({ children, maxHeight = 90 }) {
  return (
    <pre style={{
      margin: 0,
      maxHeight,
      overflow: "auto",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      direction: "ltr",
      textAlign: "left",
      color: "var(--rukn-text)",
      background: "var(--rukn-bg-soft)",
      border: "1px solid var(--rukn-border-soft)",
      borderRadius: 8,
      padding: 8,
      fontSize: 10,
      lineHeight: 1.45,
    }}>
      {typeof children === "string" ? children : JSON.stringify(children || null, null, 2)}
    </pre>
  );
}

function DebugKvTable({ rows = [] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label} style={{ borderTop: "1px solid var(--rukn-border-soft)" }}>
            <th style={{ width: 190, padding: 7, color: "var(--rukn-text-muted)", fontSize: 10, textAlign: "start", verticalAlign: "top" }}>{label}</th>
            <td style={{ padding: 7, color: "var(--rukn-text)", fontSize: 10, verticalAlign: "top" }}>
              {typeof value === "string" || typeof value === "number" ? String(value || "—") : <DebugText>{value}</DebugText>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CropPreview({ title, src, meta }) {
  return (
    <div style={{ border: "1px solid var(--rukn-border-soft)", borderRadius: 10, overflow: "hidden", background: "var(--rukn-bg-card)" }}>
      <div style={{ padding: "7px 9px", color: "var(--rukn-gold)", fontWeight: 900, fontSize: 11, borderBottom: "1px solid var(--rukn-border-soft)" }}>{title}</div>
      {src ? (
        <img src={src} alt="" style={{ display: "block", width: "100%", maxHeight: 160, objectFit: "contain", background: "#fff" }} />
      ) : (
        <div style={{ minHeight: 70, display: "grid", placeItems: "center", color: "var(--rukn-text-muted)", fontSize: 11 }}>Not generated by current pipeline</div>
      )}
      {meta && (
        <div style={{ padding: 8 }}>
          <DebugText maxHeight={70}>{meta}</DebugText>
        </div>
      )}
    </div>
  );
}

function MRZDiagnosticLab({ rows = [], onCopyDebug }) {
  if (!MRZ_DEV) return null;
  const debugRows = rows.filter((row) => row.mrzDebug);
  if (!debugRows.length) return null;
  return (
    <details style={{
      marginTop: 12,
      border: "1px solid rgba(96,165,250,.35)",
      borderRadius: 12,
      background: "rgba(37,99,235,.08)",
      overflow: "hidden",
    }}>
      <summary style={{ cursor: "pointer", padding: "10px 12px", color: "#93c5fd", fontWeight: 900, fontSize: 12 }}>
        MRZ Diagnostic Lab
      </summary>
      <div style={{ padding: 12, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ color: "var(--rukn-text-muted)", fontSize: 11 }}>
            Development-only OCR acquisition, parser, and row mapping diagnostics.
          </div>
          <button
            type="button"
            onClick={onCopyDebug}
            style={{
              border: "1px solid rgba(147,197,253,.45)",
              background: "rgba(37,99,235,.16)",
              color: "#bfdbfe",
              borderRadius: 9,
              padding: "7px 10px",
              fontSize: 11,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Copy MRZ Debug JSON
          </button>
        </div>

        {debugRows.map((row, rowIndex) => {
          const debug = row.mrzDebug || {};
          const attempts = debug.attempts || [];
          const selectedAttempt = attempts.find((attempt) => attempt.variant === debug.selectedVariant)
            || attempts.find((attempt) => attempt.accepted)
            || attempts[0]
            || {};
          const fullAttempt = attempts.find((attempt) => attempt.cropType === "full_mrz" && attempt.variant === debug.selectedVariant)
            || attempts.find((attempt) => attempt.cropType === "full_mrz" && attempt.accepted)
            || attempts.find((attempt) => attempt.cropType === "full_mrz")
            || selectedAttempt;
          const line1Attempt = attempts.find((attempt) => attempt.cropType === "line1" && attempt.variant?.includes(String(fullAttempt.variant || "").replace(/-line[12]$/, "")))
            || attempts.find((attempt) => attempt.cropType === "line1");
          const line2Attempt = attempts.find((attempt) => attempt.cropType === "line2" && attempt.variant?.includes(String(fullAttempt.variant || "").replace(/-line[12]$/, "")))
            || attempts.find((attempt) => attempt.cropType === "line2");
          const previews = fullAttempt.cropDebug?.previews || selectedAttempt.cropDebug?.previews || {};
          const cropMeta = {
            variant: selectedAttempt.variant || debug.selectedVariant || "",
            cropType: selectedAttempt.cropType || selectedAttempt.cropDebug?.cropType || "",
            width: selectedAttempt.cropDebug?.canvas?.width,
            height: selectedAttempt.cropDebug?.canvas?.height,
            scaleFactor: selectedAttempt.cropDebug?.scaleFactor,
            marginExpanded: selectedAttempt.cropDebug?.marginExpanded,
            marginPercent: selectedAttempt.cropDebug?.marginPercent,
            sourceCrop: selectedAttempt.cropDebug?.source,
          };
          const line1Diag = debug.parser?.line1 || {};
          const line2Diag = debug.parser?.line2 || {};
          return (
            <details key={row.id} open={rowIndex === 0} style={{ border: "1px solid var(--rukn-border-soft)", borderRadius: 12, background: "var(--rukn-bg-modal)", overflow: "hidden" }}>
              <summary style={{ padding: "9px 10px", cursor: "pointer", color: "var(--rukn-text)", fontWeight: 900, fontSize: 12 }}>
                {row.source || `passport-${rowIndex + 1}`} · {row.passportNo || "no passport no"} · {row.status}
              </summary>
              <div style={{ padding: 10, display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
                  <CropPreview title="Original image preview" src={debug.originalImageUrl} />
                  <CropPreview title="Full MRZ crop sent to OCR" src={previews.fullMrz} meta={{ ...cropMeta, sentToOcr: fullAttempt.cropDebug?.sentToOcr ?? true }} />
                  <CropPreview title="Line 1 crop sent to OCR" src={line1Attempt?.cropDebug?.previews?.fullMrz || previews.line1} meta={{ variant: line1Attempt?.variant || "", cropType: "line1", sentToOcr: Boolean(line1Attempt), rawOcrText: line1Attempt?.rawOcrText || "" }} />
                  <CropPreview title="Line 2 crop sent to OCR" src={line2Attempt?.cropDebug?.previews?.fullMrz || previews.line2} meta={{ variant: line2Attempt?.variant || "", cropType: "line2", sentToOcr: Boolean(line2Attempt), rawOcrText: line2Attempt?.rawOcrText || "", selectedCandidate: line2Attempt?.selected44CharCandidate || "" }} />
                  <CropPreview title="Visual passport number crop" src={previews.visualPassportNumber} meta={{ used: false, note: "visual number is extracted from OCR text candidates, no separate crop is currently OCRed" }} />
                </div>

                <div style={{ overflow: "auto", border: "1px solid var(--rukn-border-soft)", borderRadius: 10 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1180 }}>
                    <thead>
                      <tr>
                        {["variant", "crop type", "raw OCR text", "normalized OCR text", "detected line1", "detected line2", "selected 44-char candidate", "score", "reasons", "accepted"].map((head) => (
                          <th key={head} style={{ padding: 7, color: "var(--rukn-text-muted)", fontSize: 10, textAlign: "start", borderBottom: "1px solid var(--rukn-border-soft)" }}>{head}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {attempts.map((attempt, index) => (
                        <tr key={`${attempt.variant}-${index}`} style={{ borderTop: "1px solid var(--rukn-border-soft)" }}>
                          <td style={{ padding: 7, color: "var(--rukn-text)", fontSize: 10 }}>{attempt.variant || "—"}</td>
                          <td style={{ padding: 7, color: "var(--rukn-text)", fontSize: 10 }}>{attempt.cropType || "full_mrz"}</td>
                          <td style={{ padding: 7, minWidth: 210 }}><DebugText>{attempt.rawOcrText || ""}</DebugText></td>
                          <td style={{ padding: 7, minWidth: 170 }}><DebugText>{(attempt.normalizedOcrText || []).join("\n")}</DebugText></td>
                          <td style={{ padding: 7, color: "var(--rukn-text)", fontSize: 10, direction: "ltr" }}>{attempt.detectedLine1 || "—"}</td>
                          <td style={{ padding: 7, color: "var(--rukn-text)", fontSize: 10, direction: "ltr" }}>{attempt.detectedLine2 || "—"}</td>
                          <td style={{ padding: 7, color: "var(--rukn-text)", fontSize: 10, direction: "ltr" }}>{attempt.selected44CharCandidate || "—"}</td>
                          <td style={{ padding: 7, color: "var(--rukn-text)", fontSize: 10 }}>{attempt.score ?? "—"}</td>
                          <td style={{ padding: 7, minWidth: 160 }}><DebugText>{attempt.reasons || []}</DebugText></td>
                          <td style={{ padding: 7, color: attempt.accepted ? tc.greenLight : "var(--rukn-warning)", fontSize: 10, fontWeight: 900 }}>{attempt.accepted ? "accepted" : "rejected"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 10 }}>
                  <div style={{ border: "1px solid var(--rukn-border-soft)", borderRadius: 10, overflow: "auto" }}>
                    <div style={{ padding: 8, color: "var(--rukn-gold)", fontWeight: 900, fontSize: 11 }}>Parser output · Line 1</div>
                    <DebugKvTable rows={[
                      ["raw line1", line1Diag.originalLine1 || debug.parser?.line1?.rawLine1 || row.mrzLine1 || ""],
                      ["normalized line1", line1Diag.normalizedLine1 || ""],
                      ["surname", line1Diag.finalSurname || row.latinLastName || ""],
                      ["given name", line1Diag.finalGivenNames || row.latinFirstName || ""],
                      ["leading filler noise removed", line1Diag.leadingSeparatorNoiseRemoved || ""],
                      ["trailing filler noise removed", String(Boolean(line1Diag.trailingFillerNoiseRemoved))],
                      ["warnings", line1Diag.warnings || []],
                    ]} />
                  </div>
                  <div style={{ border: "1px solid var(--rukn-border-soft)", borderRadius: 10, overflow: "auto" }}>
                    <div style={{ padding: 8, color: "var(--rukn-gold)", fontWeight: 900, fontSize: 11 }}>Parser output · Line 2</div>
                    <DebugKvTable rows={[
                      ["raw line2", line2Diag.rawLine2 || row.mrzLine2 || ""],
                      ["selected 44-char line2", line2Diag.selected44CharLine || ""],
                      ["slice(0,9) passport field", line2Diag.fixedPositions?.passportNumberField?.value || ""],
                      ["line2[9] passport check digit", line2Diag.fixedPositions?.passportNumberCheckDigit?.value || ""],
                      ["slice(10,13) nationality", line2Diag.fixedPositions?.nationality?.value || ""],
                      ["slice(13,19) birth date", line2Diag.fixedPositions?.birthDate?.value || ""],
                      ["birth date raw", line2Diag.birthDate?.raw || line2Diag.fixedPositions?.birthDate?.value || ""],
                      ["birth date value", line2Diag.birthDate?.value || ""],
                      ["birth date precision", line2Diag.birthDate?.precision || ""],
                      ["birth year", line2Diag.birthDate?.year || ""],
                      ["birth date approximated", String(Boolean(line2Diag.birthDate?.approximated))],
                      ["birth date approximation rule", line2Diag.birthDate?.approximationRule || ""],
                      ["birth warning", line2Diag.birthDate?.warning || ""],
                      ["line2[20] gender", line2Diag.fixedPositions?.sex?.value || ""],
                      ["slice(21,27) expiry date", line2Diag.fixedPositions?.expiryDate?.value || ""],
                      ["check digit results", debug.parser?.checks || line2Diag.checkDigitResults || {}],
                      ["warnings", debug.parser?.reviewReasons || []],
                    ]} />
                  </div>
                </div>

                <div style={{ overflow: "auto", border: "1px solid var(--rukn-border-soft)", borderRadius: 10 }}>
                  <div style={{ padding: 8, color: "var(--rukn-gold)", fontWeight: 900, fontSize: 11 }}>Final row mapping</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                    <thead>
                      <tr>
                        {["field", "final value", "source", "confidence", "old value", "fallback value", "MRZ parser value", "overwritten", "manually edited"].map((head) => (
                          <th key={head} style={{ padding: 7, color: "var(--rukn-text-muted)", fontSize: 10, textAlign: "start", borderBottom: "1px solid var(--rukn-border-soft)" }}>{head}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(debug.finalMapping || []).map((item) => (
                        <tr key={item.field} style={{ borderTop: "1px solid var(--rukn-border-soft)" }}>
                          <td style={{ padding: 7, color: "var(--rukn-text)", fontSize: 10, fontWeight: 900 }}>{item.field}</td>
                          <td style={{ padding: 7, color: "var(--rukn-text)", fontSize: 10 }}>{item.finalValue || "—"}</td>
                          <td style={{ padding: 7, color: "var(--rukn-text)", fontSize: 10 }}>{item.source || "—"}</td>
                          <td style={{ padding: 7, color: "var(--rukn-text)", fontSize: 10 }}>{item.confidence ?? "—"}</td>
                          <td style={{ padding: 7, color: "var(--rukn-text-muted)", fontSize: 10 }}>{item.oldValue || "—"}</td>
                          <td style={{ padding: 7, color: "var(--rukn-text-muted)", fontSize: 10 }}>{item.fallbackValue || "—"}</td>
                          <td style={{ padding: 7, color: "var(--rukn-text)", fontSize: 10 }}>{item.mrzParserValue || "—"}</td>
                          <td style={{ padding: 7, color: item.overwritten ? "var(--rukn-warning)" : "var(--rukn-text-muted)", fontSize: 10 }}>{String(Boolean(item.overwritten))}</td>
                          <td style={{ padding: 7, color: "var(--rukn-text-muted)", fontSize: 10 }}>{String(Boolean(item.manuallyEdited))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </details>
  );
}

export default function MRZReader({ store, onToast, onResult, onClose, programContext = null }) {
  const { t, lang } = useLang();
  const l = LABELS[lang] || LABELS.ar;
  const importProgram = programContext?.program || programContext || null;
  const importProgramId = importProgram?.id || "";
  const importProgramName = importProgram?.name || "";
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
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef(null);
  const bulkRef = React.useRef(null);
  const rowFilesRef = React.useRef(new Map());
  const debugUrlsRef = React.useRef(new Set());
  const cropBoxRef = React.useRef(null);
  const cropImageRef = React.useRef(null);
  const cropDragRef = React.useRef(null);
  const clients = store?.clients || store?.activeClients || [];

  const createDebugOriginalImageUrl = React.useCallback((file) => {
    if (!MRZ_DEV || !file) return "";
    const url = URL.createObjectURL(file);
    debugUrlsRef.current.add(url);
    return url;
  }, []);

  const revokeDebugUrl = React.useCallback((url) => {
    if (!url || !debugUrlsRef.current.has(url)) return;
    URL.revokeObjectURL(url);
    debugUrlsRef.current.delete(url);
  }, []);

  const revokeAllDebugUrls = React.useCallback(() => {
    debugUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    debugUrlsRef.current.clear();
  }, []);

  React.useEffect(() => () => {
    revokeAllDebugUrls();
  }, [revokeAllDebugUrls]);

  const rowProgramDefaults = React.useCallback(() => importProgramId ? ({
    programId: importProgramId,
  }) : {}, [importProgramId]);

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
    const originalImageUrl = createDebugOriginalImageUrl(file);
    let row;
    if (outcome.success) {
      const parsed = outcome.parsed || parseMRZDetailed(
        outcome.raw?.line1 || outcome.data?.raw?.line1,
        outcome.raw?.line2 || outcome.data?.raw?.line2,
        { ocrText: outcome.ocrText || "" },
      );
      row = addParsedRow(parsed, file.name || `image-${index + 1}`, {
        hasImage: true,
        extractionSource: EXTRACTION_SOURCE.AUTOMATIC_MRZ,
        debugInfo: { outcome, originalImageUrl, mode: "automatic" },
      });
    } else if (outcome.raw?.line1 || outcome.raw?.line2) {
      const parsed = parseMRZDetailed(outcome.raw?.line1 || "", outcome.raw?.line2 || "", { ocrText: outcome.ocrText || "" });
      row = addParsedRow(parsed, file.name || `image-${index + 1}`, {
        statusOverride: parsed.data ? ROW_STATUS.NEEDS_REVIEW : ROW_STATUS.FAILED,
        noteOverride: issueText(parsed.issues || ["PARSE_ERROR"], l, parsed.raw),
        hasImage: true,
        extractionSource: EXTRACTION_SOURCE.FALLBACK_OCR,
        debugInfo: { outcome, originalImageUrl, mode: "automatic_failed" },
      });
    } else {
      row = addParsedRow({ ok: false, data: null, issues: [outcome.error || "OCR_FAILED"] }, file.name || `image-${index + 1}`, {
        statusOverride: ROW_STATUS.FAILED,
        noteOverride: ocrFailureText(outcome.error, l),
        hasImage: true,
        extractionSource: EXTRACTION_SOURCE.FALLBACK_OCR,
        debugInfo: { outcome, originalImageUrl, mode: "automatic_failed" },
      });
    }
    if (row?.id) rowFilesRef.current.set(row.id, file);
    return row;
  }, [addParsedRow, createDebugOriginalImageUrl, l]);

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
    revokeAllDebugUrls();
    setProgress({ done: 0, total: files.length, active: true });
    for (let index = 0; index < files.length; index += 1) {
      setProgress({ done: index, total: files.length, active: true });
      await processImageFile(files[index], index);
      await new Promise((resolve) => setTimeout(resolve, 40));
      setProgress({ done: index + 1, total: files.length, active: index + 1 < files.length });
    }
  }, [processImageFile, revokeAllDebugUrls]);

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
    const manualAcceptRequested = Boolean(patch.accepted && patch.manualAccepted);
    setRows((current) => current.map((row) => {
      if (row.id !== id) return row;
      const next = { ...row, ...patch };
      const reviewState = buildEditedRowReviewState(next, patch, row);
      const status = deriveRowStatus(next, row.status, reviewState);
      const manualAccepted = status === ROW_STATUS.MANUALLY_ACCEPTED ? true : status === ROW_STATUS.READY ? false : Boolean(next.manualAccepted) && rowHasEssentialPassportData(next);
      const accepted = (status === ROW_STATUS.READY || status === ROW_STATUS.MANUALLY_ACCEPTED) ? Boolean(next.accepted || next.duplicateAction === "update") : false;
      const updatedRow = { ...next, ...reviewState, status, accepted, manualAccepted };
      if (
        process.env.NODE_ENV !== "production"
        && (Object.prototype.hasOwnProperty.call(patch, "accepted") || Object.prototype.hasOwnProperty.call(patch, "duplicateAction"))
      ) {
        console.debug("[MRZ] row-acceptance-change", {
          rowId: id,
          statusBefore: row.status,
          statusAfter: status,
          reviewReasonsBefore: row.reviewReasons || [],
          reviewReasonsAfter: updatedRow.reviewReasons || [],
          manualAccepted,
          accepted,
          requiredFieldsCheck: getRequiredFieldsCheck(updatedRow, { programMode: Boolean(importProgramId) }),
          requiredFieldsValid: rowHasEssentialPassportData(updatedRow),
          cleanFieldsValid: rowHasRequiredPassportData(updatedRow),
          saveEligible: isRowSaveEligible(updatedRow),
        });
      }
      return updatedRow;
    }));
    if (manualAcceptRequested) onToast?.(l.manualAcceptToast, "success");
  }, [importProgramId, l.manualAcceptToast, onToast]);

  const removeRow = React.useCallback((id) => {
    rowFilesRef.current.delete(id);
    setRows((current) => {
      const removed = current.find((row) => row.id === id);
      revokeDebugUrl(removed?.mrzDebug?.originalImageUrl);
      return current.filter((row) => row.id !== id);
    });
  }, [revokeDebugUrl]);

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

  const applyParsedToCropRow = React.useCallback(({ parsed, raw = {}, outcome = {}, sourceType = EXTRACTION_SOURCE.MANUAL_MRZ, statusOverride, noteOverride }) => {
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
        statusOverride: statusOverride ?? (succeeded ? undefined : hasParsedData ? ROW_STATUS.NEEDS_REVIEW : ROW_STATUS.FAILED),
        noteOverride: noteOverride ?? (succeeded ? undefined : (!raw.line1 && !raw.line2 ? ocrFailureText(outcome.error, l) : undefined)),
        hasImage: true,
        extractionSource: sourceType,
        debugInfo: {
          outcome,
          oldRow: row,
          originalImageUrl: row.mrzDebug?.originalImageUrl || "",
          mode: sourceType,
          cropRect,
        },
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
      if (MRZ_DEV) {
        merged.mrzDebug = buildMrzDebugInfo({
          parsed,
          outcome,
          row: merged,
          oldRow: row,
          originalImageUrl: row.mrzDebug?.originalImageUrl || "",
          mode: sourceType,
          cropRect,
        });
      }
      const requiredFieldsCheck = getRequiredFieldsCheck(merged, {
        programMode: Boolean(importProgramId),
      });
      if (process.env.NODE_ENV !== "production") {
        const line2Mapping = buildMRZPriorityRowFields({
          parserFields: getMrzLine2FieldsFromParsed(parsed),
          fallbackFields: parsed?.fallbackFields || outcome?.fallbackFields || {},
          oldRow: row,
        });
        console.debug("[MRZ row mapping]", {
          rowId: row.id,
          sourceType,
          rawOcrLine2: raw.line2 || parsed.raw?.line2 || "",
          normalizedLine2: parsed?.engineResult?.diagnostics?.line2?.normalizedLine2 || "",
          selectedLine2Candidate: parsed?.engineResult?.diagnostics?.line2?.selected44CharLine || parsed.raw?.line2 || "",
          parserFields: line2Mapping.parserFields,
          parserFieldSources: parsed?.engineResult?.diagnostics?.line2?.fieldSources || {},
          fallbackOcrFields: line2Mapping.fallbackFields,
          oldRowFieldsBeforeMerge: {
            passportNo: row.passportNo,
            nationality: row.nationality,
            birthDate: row.birthDate,
            gender: row.gender,
            passportExpiry: row.passportExpiry,
          },
          finalRowFieldsAfterMerge: {
            passportNo: merged.passportNo,
            nationality: merged.nationality,
            birthDate: merged.birthDate,
            gender: merged.gender,
            passportExpiry: merged.passportExpiry,
          },
          ...line2Mapping.sources,
          checks: parsed?.checks || parsed?.engineResult?.checks || {},
          reviewReasons: parsed?.reviewReasons || parsed?.engineResult?.reviewReasons || [],
        });
        console.debug("[MRZ] manual-mrz-row-decision", {
          rowId: row.id,
          rowIndex: current.findIndex((item) => item.id === row.id),
          sourceType,
          crop: cropRect,
          cropImage: outcome.cropDebug || null,
          statusBefore: row.status,
          statusAfter: merged.status,
          rawOcrText: outcome.ocrText || "",
          normalizedOcrText: normalizeMRZOCRText(outcome.ocrText || ""),
          detectedMrzLine1: raw.line1 || parsed.raw?.line1 || "",
          detectedMrzLine2: raw.line2 || parsed.raw?.line2 || "",
          parsedFields: parsed.data ? {
            passportNo: parsed.data.passportNo,
            latinLastName: parsed.data.latinLastName,
            latinFirstName: parsed.data.latinFirstName,
            nationality: parsed.data.nationality,
            birthDate: parsed.data.birthDate,
            expiryDate: parsed.data.expiryDate,
            gender: parsed.data.gender,
          } : null,
          checkDigitResults: parsed.checks || parsed.engineResult?.checks || {},
          oldReviewReasons,
          newReviewReasons: merged.reviewReasons || [],
          fieldWarnings: merged.reviewWarningFieldLevel || {},
          requiredFieldsCheck,
          requiredFieldsValid: rowHasEssentialPassportData(merged),
          cleanFieldsValid: rowHasRequiredPassportData(merged),
          finalSaveEligibility: isRowSaveEligible(merged),
          parseIssues: parsed.issues || [],
          outcomeError: outcome.error || "",
        });
      }
      return merged;
    }));
    return { hasParsedData, succeeded };
  }, [cropModal.rowId, cropRect, findExisting, importProgramId, l]);

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
      ? outcome.parsed || parseMRZDetailed(
        raw.line1 || outcome.data?.raw?.line1,
        raw.line2 || outcome.data?.raw?.line2,
        { ocrText: outcome.ocrText || "" },
      )
      : parseMRZDetailed(raw.line1 || "", raw.line2 || "", { ocrText: outcome.ocrText || "" });
    const { hasParsedData, succeeded } = applyParsedToCropRow({ parsed, raw, outcome });
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
  }, [applyParsedToCropRow, closeCropModal, cropModal.rowId, cropRect, l, onToast]);

  const buildPartialBirthDateDocs = React.useCallback((row = {}) => {
    if (!hasPartialBirthDateOnly(row) && !hasApproximatedBirthDate(row)) return {};
    return {
      mrzBirthDateRaw: row.mrzBirthDateRaw || "",
      birthDatePrecision: row.birthDatePrecision || "",
      ...(row.birthYear ? { birthYear: row.birthYear } : {}),
      ...(row.birthMonth ? { birthMonth: row.birthMonth } : {}),
      birthDateApproximated: Boolean(row.birthDateApproximated),
      birthDateApproximationRule: row.birthDateApproximationRule || "",
    };
  }, []);

  const toClientPayload = React.useCallback((row) => {
    const roomType = row.roomType || "";
    const roomingData = row.roomingGroupId ? {
      groupId: row.roomingGroupId,
      groupName: row.roomingGroupName || l.groupInRoom,
      category: row.roomCategory || "",
      categoryLabel: row.roomCategoryLabel || "",
      size: row.roomingGroupSize || 0,
      seatIndex: row.roomingSeatIndex || 0,
    } : null;
    const partialBirthDateDocs = buildPartialBirthDateDocs(row);
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
      programId: importProgramId || row.programId || null,
      packageId: row.packageId || "",
      packageLevel: row.packageLevel || "",
      hotelLevel: row.hotelLevel || "",
      hotelMecca: row.hotelMecca || "",
      hotelMadina: row.hotelMadina || "",
      roomType,
      roomTypeLabel: row.roomTypeLabel || "",
      officialPrice: 0,
      salePrice: 0,
      price: 0,
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
      docs: {
        ...(roomingData ? { rooming: roomingData } : {}),
        ...partialBirthDateDocs,
      },
      notes: row.note || "",
    };
  }, [buildPartialBirthDateDocs, importProgramId, l.groupInRoom]);

  const saveAccepted = React.useCallback(async () => {
    const accepted = rows.filter(isRowSaveEligible);
    if (process.env.NODE_ENV !== "production") {
      console.debug("[MRZ] save-eligibility", rows.map((row) => ({
        rowId: row.id,
        status: row.status,
        accepted: Boolean(row.accepted),
        manualAccepted: Boolean(row.manualAccepted),
        duplicateAction: row.duplicateAction,
        reviewReasons: row.reviewReasons || [],
        requiredFieldsCheck: getRequiredFieldsCheck(row, { programMode: Boolean(importProgramId) }),
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
      onToast?.(l.requiredFieldsHardBlock, "error");
      return;
    }
    setSaving(true);
    const failures = [];
    for (const row of accepted) {
      const payload = toClientPayload(row);
      if (row.existingClientId && row.duplicateAction === "update") {
        const existing = clients.find((client) => client.id === row.existingClientId) || {};
        const nextPayload = {
          ...existing,
          ...payload,
          programId: importProgramId ? payload.programId : (existing.programId || payload.programId || null),
          packageId: payload.packageId || existing.packageId || "",
          packageLevel: payload.packageLevel || existing.packageLevel || "",
          hotelLevel: payload.hotelLevel || existing.hotelLevel || "",
          hotelMecca: payload.hotelMecca || existing.hotelMecca || "",
          hotelMadina: payload.hotelMadina || existing.hotelMadina || "",
          roomType: payload.roomType || existing.roomType || "",
          roomTypeLabel: payload.roomTypeLabel || existing.roomTypeLabel || "",
          officialPrice: payload.officialPrice || existing.officialPrice || 0,
          salePrice: payload.salePrice || existing.salePrice || existing.price || 0,
          price: payload.price || existing.price || existing.salePrice || 0,
          roomCategory: payload.roomCategory || existing.roomCategory || "",
          roomCategoryLabel: payload.roomCategoryLabel || existing.roomCategoryLabel || "",
          passport: { ...(existing.passport || {}), ...payload.passport },
          docs: { ...(existing.docs || {}), ...(payload.docs || {}) },
        };
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
  }, [clients, importProgramId, l, onClose, onToast, rows, store, toClientPayload]);

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

  const copyMrzDebugJson = React.useCallback(async () => {
    if (!MRZ_DEV) return;
    const payload = rows
      .filter((row) => row.mrzDebug)
      .map((row) => sanitizeDebugValue({
        rowId: row.id,
        source: row.source,
        status: row.status,
        debug: row.mrzDebug,
      }));
    const json = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      onToast?.("MRZ debug JSON copied", "success");
    } catch (error) {
      console.debug("[MRZ Diagnostic Lab] copy failed", error);
      onToast?.("Could not copy MRZ debug JSON", "error");
    }
  }, [onToast, rows]);

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
            <AppIcon name="program" size={15} color="var(--rukn-gold)" />
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

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          padding: "9px 11px",
          borderRadius: 12,
          border: "1px solid var(--rukn-border-soft)",
          background: importProgramId ? "rgba(245,158,11,.08)" : "rgba(148,163,184,.08)",
          color: importProgramId ? "var(--rukn-warning)" : "var(--rukn-text-muted)",
          fontSize: 12,
          fontWeight: 800,
          lineHeight: 1.6,
        }}>
          <AppIcon name={importProgramId ? "alert" : "program"} size={15} color={importProgramId ? "var(--rukn-warning)" : "var(--rukn-text-muted)"} />
          {importProgramId ? l.programIncompleteNotice : l.unassignedImportNotice}
        </div>

        <div style={{ border: "1px solid var(--rukn-border-soft)", borderRadius: 12, overflow: "auto", maxHeight: 360, background: "var(--rukn-bg-card)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1520 }}>
            <thead style={{ position: "sticky", top: 0, background: "var(--rukn-bg-card)", zIndex: 1 }}>
              <tr>
                {[
                  "#",
                  l.source,
                  l.dataSource,
                  l.status,
                  l.phone,
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
                />
              )) : (
                <tr><td colSpan={18} style={{ padding: 22, textAlign: "center", color: "var(--rukn-text-muted)", fontWeight: 800 }}>{l.noRows}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <MRZDiagnosticLab rows={rows} onCopyDebug={copyMrzDebugJson} />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
          <Button variant="ghost" onClick={onClose}>{t.cancel}</Button>
          {onResult && firstAccepted && <Button variant="secondary" icon="passport" onClick={applySingleToForm}>{t.mrzApplyData || l.saveAccepted}</Button>}
          <Button variant="success" icon="success" onClick={saveAccepted} disabled={progress.active || saving}>{saving ? l.processing : l.saveAccepted}</Button>
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
