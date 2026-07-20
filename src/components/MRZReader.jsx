import React from "react";
import { Button } from "./UI";
import { theme } from "./styles";
import { parseMRZDetailed } from "../utils/mrzReader";
import {
  convertDisplayedCropToNaturalRect,
  createPassportOCRWorker,
  dedupePassportFiles,
  extractMRZFromImage,
  extractMRZFromImageRegion,
  normalizeMRZOCRText,
  terminatePassportOCRWorker,
} from "../utils/ocrPassport";
import { useLang } from "../hooks/useLang";
import { AppIcon, IconBubble } from "./Icon";
import { validateLatinName } from "../utils/passportMrzEngine";
import { normalizeProgramPackages } from "../utils/programPackages";
import { getParticipantTerminology } from "../utils/participantTerminology";
import {
  getProgramCapacityDeltaForClientChange,
  getProgramCapacityDatabaseErrorMessage,
  getProgramCapacityInfo,
  getProgramCapacityMessage,
} from "../utils/programCapacity";
import {
  extractTrustedMoroccanCin,
  filterClientsForCurrentAgency,
  getStoredClientCin,
} from "../utils/passportImportIdentity";
import "./MRZReader.css";

const tc = theme.colors;
const MAX_BULK_FILES = 10;
const MRZ_DEV = process.env.NODE_ENV !== "production";
const MRZ_DIAGNOSTIC_LAB_ENABLED = MRZ_DEV && process.env.REACT_APP_MRZ_DIAGNOSTIC_LAB === "true";
const PASSPORT_PERF_PREFIX = "[passport-import:perf]";

const performanceNow = () => (
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : 0
);

const passportDuration = (startedAt) => Math.round((performanceNow() - startedAt) * 10) / 10;

const logPassportPerformance = (event, payload = {}) => {
  if (!MRZ_DEV) return;
  console.info(PASSPORT_PERF_PREFIX, event, payload);
};

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
    desc: "أضف الجوازات إلى البرنامج بخطوات بسيطة وسريعة",
    stepPassports: "الجوازات",
    stepReview: "المراجعة",
    stepSave: "الحفظ",
    uploadTitle: "ارفع صور الجوازات",
    uploadDescription: "اسحب الصور إلى هنا أو اخترها من جهازك",
    supportedFormats: "JPG أو PNG · حتى 10 صور",
    chooseImages: "اختيار الصور",
    continueReview: "متابعة إلى المراجعة",
    advancedOptions: "خيارات الربط المتقدمة",
    optional: "اختياري",
    advancedHint: "يمكنك ربط الجوازات ببرنامج أو فندق الآن، أو إكمال ذلك لاحقًا.",
    readingTitle: "جارٍ قراءة الجوازات",
    readingHint: "ستظهر النتائج للمراجعة فور اكتمال القراءة.",
    fileRead: "تمت القراءة",
    fileReading: "قيد القراءة",
    fileWaiting: "في الانتظار",
    fileError: "تعذرت القراءة",
    showDetails: "مراجعة التفاصيل",
    hideDetails: "إخفاء التفاصيل",
    addPhotos: "إضافة صور",
    savePilgrims: "حفظ المعتمرين",
    noNameYet: "الاسم يحتاج مراجعة",
    workflow: "اختر الطريقة، ارفع الصور، استخرج البيانات، ثم راجع النتائج قبل الحفظ.",
    methodSection: "طريقة الاستيراد",
    methodHint: "اختر قراءة جواز واحد أو معالجة عدة جوازات دفعة واحدة.",
    uploadSection: "رفع وقراءة الجواز",
    uploadHint: "ارفع صورة واضحة يظهر فيها شريط MRZ أسفل الجواز بشكل كامل.",
    bulkUploadHint: "اختر حتى 10 صور جوازات واضحة لمعالجتها دفعة واحدة.",
    reviewSection: "مراجعة النتائج",
    reviewHint: "صحح الحقول التي تحتاج مراجعة، ثم احفظ الصفوف المقبولة فقط.",
    emptyReviewTitle: "النتائج ستظهر هنا",
    emptyReviewDesc: "بعد قراءة الجوازات ستظهر بيانات MRZ في جدول مراجعة قابل للتعديل قبل الحفظ.",
    workflowChoose: "الطريقة",
    workflowUpload: "الرفع",
    workflowExtract: "القراءة",
    workflowReview: "المراجعة",
    importConfigSection: "إعدادات الربط الاختيارية",
    importConfigHint: "إذا اخترت برنامجا وحزمة، سيتم ربط الجوازات بالبرنامج وملء الفنادق والمستوى فقط. نوع الغرفة والأسعار تحدد لاحقا من التسكين أو التعديل اليدوي.",
    chooseProgram: "اختر البرنامج لهذا الاستيراد",
    importWithoutProgram: "استيراد بدون تحديد برنامج",
    choosePackage: "اختر الفندق لهذا الاستيراد",
    importWithoutHotel: "استيراد بدون تحديد فندق",
    noPackageOptions: "لا توجد فنادق محددة في باقات هذا البرنامج.",
    selectedNoProgramInfo: "سيتم حفظ المعتمرين دون ربطهم بأي برنامج.",
    selectedProgramOnlyInfo: "سيتم ربط المعتمرين بالبرنامج فقط دون تحديد الفنادق أو المستوى.",
    selectedProgramPackageInfo: "سيتم ربط المعتمرين بالبرنامج وملء الفنادق والمستوى فقط، دون تحديد نوع الغرفة أو الأسعار.",
    image: "صورة الجواز",
    bulk: "عدة صور جوازات",
    uploadOne: "رفع صورة جواز",
    uploadBulk: "اختر صور الجوازات",
    readPassport: "قراءة الجواز",
    readPassports: "قراءة الجوازات",
    selectedFiles: "الصور المختارة",
    noImageSelected: "اختر صورة جواز أولًا",
    processing: "قيد القراءة",
    progressPreparing: "جاري تجهيز صورة الجواز…",
    progressReading: "جاري قراءة بيانات الجواز…",
    progressValidating: "جاري التحقق من البيانات…",
    progressConfirming: "تم العثور على نتيجة، نؤكدها الآن…",
    progressSlow: "ما زلنا نقرأ الجواز، قد تستغرق الصور غير الواضحة وقتا أطول…",
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
    basicPassportData: "بيانات الجواز الأساسية",
    additionalData: "بيانات إضافية",
    arabicLast: "الاسم العائلي بالعربية",
    arabicFirst: "الاسم الشخصي بالعربية",
    passportNo: "رقم الجواز",
    nationalId: "رقم البطاقة الوطنية",
    source: "الملف",
    dataSource: "مصدر البيانات",
    automatic_mrz: "قراءة تلقائية",
    manual_mrz: "تحديد يدوي",
    fallback_ocr: "OCR احتياطي",
    nationality: "الجنسية",
    birthDate: "تاريخ الميلاد",
    gender: "الجنس",
    expiry: "تاريخ انتهاء الجواز",
    selectMRZ: "إعادة القراءة من الصورة",
    cropTitle: "تصحيح من صورة الجواز",
    cropHint: "حدد السطرين أسفل الجواز ثم أعد القراءة.",
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
      invalid_passport_number: "تعذر التحقق من رقم الجواز",
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
    manualCropInvalid: "تعذر استخدام المنطقة المحددة. حدد السطرين كاملين مع هامش صغير.",
    lineSplitFailed: "تعذر فصل سطري القراءة من المنطقة المحددة.",
    partialOcr: "تمت قراءة الجواز جزئيا، لكن بعض البيانات تحتاج إلى مراجعة.",
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
    desc: "Ajoutez les passeports au programme en quelques étapes simples et rapides.",
    stepPassports: "Passeports",
    stepReview: "Vérification",
    stepSave: "Enregistrement",
    uploadTitle: "Importer les photos des passeports",
    uploadDescription: "Glissez les photos ici ou choisissez-les depuis votre appareil.",
    supportedFormats: "JPG ou PNG · jusqu’à 10 photos",
    chooseImages: "Choisir les photos",
    continueReview: "Continuer vers la vérification",
    advancedOptions: "Options de liaison avancées",
    optional: "Facultatif",
    advancedHint: "Associez les passeports à un programme ou un hôtel maintenant, ou complétez cela plus tard.",
    readingTitle: "Lecture des passeports en cours",
    readingHint: "Les résultats apparaîtront pour vérification dès la fin de la lecture.",
    fileRead: "Lu",
    fileReading: "Lecture",
    fileWaiting: "En attente",
    fileError: "Échec de lecture",
    showDetails: "Vérifier les détails",
    hideDetails: "Masquer les détails",
    addPhotos: "Ajouter des photos",
    savePilgrims: "Enregistrer les pèlerins",
    noNameYet: "Nom à vérifier",
    workflow: "Choisissez la méthode, importez les images, extrayez les données, puis vérifiez les résultats avant l’enregistrement.",
    methodSection: "Méthode d’import",
    methodHint: "Choisissez un passeport unique ou le traitement de plusieurs passeports.",
    uploadSection: "Import et lecture",
    uploadHint: "Importez une photo nette où la zone MRZ en bas du passeport est entièrement visible.",
    bulkUploadHint: "Choisissez jusqu’à 10 photos nettes de passeports pour un traitement groupé.",
    reviewSection: "Vérification des résultats",
    reviewHint: "Corrigez les champs à vérifier, puis enregistrez uniquement les lignes acceptées.",
    emptyReviewTitle: "Les résultats apparaîtront ici",
    emptyReviewDesc: "Après lecture, les données MRZ apparaîtront dans un tableau de vérification modifiable.",
    workflowChoose: "Méthode",
    workflowUpload: "Import",
    workflowExtract: "Lecture",
    workflowReview: "Vérification",
    importConfigSection: "Options de liaison",
    importConfigHint: "Si vous sélectionnez un programme et un forfait, les passeports seront liés au programme avec les hôtels et le niveau uniquement. Le type de chambre et les prix seront définis plus tard depuis l’hébergement ou la modification manuelle.",
    chooseProgram: "Choisir le programme pour cet import",
    importWithoutProgram: "Importer sans sélectionner un programme",
    choosePackage: "Choisir l’hôtel pour cet import",
    importWithoutHotel: "Importer sans sélectionner d’hôtel",
    noPackageOptions: "Aucun hôtel n’est défini dans les packages de ce programme.",
    selectedNoProgramInfo: "Les pèlerins seront enregistrés sans être liés à un programme.",
    selectedProgramOnlyInfo: "Les pèlerins seront liés au programme uniquement, sans hôtels ni niveau.",
    selectedProgramPackageInfo: "Les pèlerins seront liés au programme avec les hôtels et le niveau uniquement, sans type de chambre ni prix.",
    image: "Photo passeport",
    bulk: "Plusieurs photos de passeports",
    uploadOne: "Importer une photo",
    uploadBulk: "Choisir les photos des passeports",
    readPassport: "Lire le passeport",
    readPassports: "Lire les passeports",
    selectedFiles: "Photos sélectionnées",
    noImageSelected: "Choisissez d'abord une photo de passeport",
    processing: "Lecture en cours",
    progressPreparing: "Préparation de l’image du passeport…",
    progressReading: "Lecture des données du passeport…",
    progressValidating: "Vérification des données…",
    progressConfirming: "Résultat trouvé, confirmation en cours…",
    progressSlow: "Lecture toujours en cours, les images peu nettes peuvent prendre plus de temps…",
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
    basicPassportData: "Données principales du passeport",
    additionalData: "Données supplémentaires",
    arabicLast: "Nom arabe",
    arabicFirst: "Prénom arabe",
    passportNo: "N° passeport",
    nationalId: "N° CIN",
    source: "Fichier",
    dataSource: "Source",
    automatic_mrz: "MRZ automatique",
    manual_mrz: "Sélection manuelle",
    fallback_ocr: "OCR secours",
    nationality: "Nationalité",
    birthDate: "Naissance",
    gender: "Sexe",
    expiry: "Expiration",
    selectMRZ: "Relire depuis l’image",
    cropTitle: "Corriger depuis l'image",
    cropHint: "Sélectionnez les deux lignes en bas du passeport puis relancez la lecture.",
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
    manualCropInvalid: "Impossible d’utiliser la zone sélectionnée. Sélectionnez les deux lignes complètes avec une petite marge.",
    lineSplitFailed: "Impossible de séparer les deux lignes de lecture dans la zone sélectionnée.",
    partialOcr: "Le passeport a été lu partiellement. Certaines données doivent être vérifiées.",
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
    desc: "Add passports to the program in a few simple, quick steps.",
    stepPassports: "Passports",
    stepReview: "Review",
    stepSave: "Save",
    uploadTitle: "Upload passport photos",
    uploadDescription: "Drag photos here or choose them from your device.",
    supportedFormats: "JPG or PNG · up to 10 photos",
    chooseImages: "Choose photos",
    continueReview: "Continue to review",
    advancedOptions: "Advanced linking options",
    optional: "Optional",
    advancedHint: "Link passports to a program or hotel now, or complete this later.",
    readingTitle: "Reading passports",
    readingHint: "Results will appear for review as soon as reading is complete.",
    fileRead: "Read",
    fileReading: "Reading",
    fileWaiting: "Waiting",
    fileError: "Could not read",
    showDetails: "Review details",
    hideDetails: "Hide details",
    addPhotos: "Add photos",
    savePilgrims: "Save pilgrims",
    noNameYet: "Name needs review",
    workflow: "Choose a method, upload images, extract the data, then review results before saving.",
    methodSection: "Import method",
    methodHint: "Choose a single passport or bulk passport processing.",
    uploadSection: "Upload and read",
    uploadHint: "Upload a clear passport photo with the bottom MRZ strip fully visible.",
    bulkUploadHint: "Choose up to 10 clear passport photos for batch processing.",
    reviewSection: "Review results",
    reviewHint: "Correct fields that need review, then save accepted rows only.",
    emptyReviewTitle: "Results will appear here",
    emptyReviewDesc: "After reading passports, MRZ data will appear in an editable review table.",
    workflowChoose: "Method",
    workflowUpload: "Upload",
    workflowExtract: "Read",
    workflowReview: "Review",
    importConfigSection: "Optional linking",
    importConfigHint: "If you select a program and package, passports will be linked to the program with hotels and level only. Room type and prices will be set later from rooming or manual editing.",
    chooseProgram: "Choose program for this import",
    importWithoutProgram: "Import without selecting a program",
    choosePackage: "Choose hotel for this import",
    importWithoutHotel: "Import without selecting a hotel",
    noPackageOptions: "No hotels are defined in this program’s packages.",
    selectedNoProgramInfo: "Pilgrims will be saved without being linked to any program.",
    selectedProgramOnlyInfo: "Pilgrims will be linked to the program only, without hotels or level.",
    selectedProgramPackageInfo: "Pilgrims will be linked to the program with hotels and level only, without room type or prices.",
    image: "Passport photo",
    bulk: "Multiple passport photos",
    uploadOne: "Upload passport photo",
    uploadBulk: "Choose passport images",
    readPassport: "Read passport",
    readPassports: "Read passports",
    selectedFiles: "Selected images",
    noImageSelected: "Choose a passport image first",
    processing: "Reading",
    progressPreparing: "Preparing passport image…",
    progressReading: "Reading passport data…",
    progressValidating: "Validating data…",
    progressConfirming: "Result found, confirming…",
    progressSlow: "Still reading the passport; unclear images may take longer…",
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
    basicPassportData: "Core passport data",
    additionalData: "Additional data",
    arabicLast: "Arabic last name",
    arabicFirst: "Arabic first name",
    passportNo: "Passport No.",
    nationalId: "National ID / CIN",
    source: "File",
    dataSource: "Source",
    automatic_mrz: "Automatic MRZ",
    manual_mrz: "Manual MRZ selection",
    fallback_ocr: "Fallback OCR",
    nationality: "Nationality",
    birthDate: "Birth Date",
    gender: "Gender",
    expiry: "Passport Expiry",
    selectMRZ: "Read again from image",
    cropTitle: "Correct from passport image",
    cropHint: "Select the two lines at the bottom of the passport, then read the selected area again.",
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
    manualCropInvalid: "Could not use the selected region. Select both complete lines with a small margin.",
    lineSplitFailed: "Could not separate the two MRZ lines in the selected region.",
    partialOcr: "The passport was read partially; some data needs review.",
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

const getExistingIdentity = (client = {}) => ({
  ...getExistingArabic(client),
  cin: getStoredClientCin(client),
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
    if (issue === "PASSPORT_CHECK") return getReviewReasonLabel(l, REVIEW_REASON.INVALID_PASSPORT_NUMBER);
    if (["BIRTH_CHECK", "EXPIRY_CHECK"].includes(issue)) return getReviewReasonLabel(l, REVIEW_REASON.CHECKSUM_FAILED);
    if (issue === "NAME_FILLER_NOISE") return getReviewReasonLabel(l, REVIEW_REASON.SUSPICIOUS_NAME);
    if (issue === "INVALID_DATE") return getReviewReasonLabel(l, REVIEW_REASON.INVALID_DATE);
    if (issue === "LOW_CONFIDENCE") return getReviewReasonLabel(l, REVIEW_REASON.LOW_CONFIDENCE);
    if (["LAST_NAME_MISSING", "FIRST_NAME_MISSING", "NATIONALITY_MISSING", "GENDER_MISSING", "PASSPORT_MISSING"].includes(issue)) {
      return getReviewReasonLabel(l, REVIEW_REASON.MISSING_REQUIRED_FIELD);
    }
    return `MRZ: ${issue}`;
  }).join(" · ");
};

export const ocrFailureText = (error, l) => {
  if (error === REVIEW_REASON.NO_MRZ_TEXT || error === "no_mrz_text") return l.ocrNoText;
  if (error === REVIEW_REASON.PARSER_FAILED || error === "parser_failed") return l.mrzFormatNotRecognized;
  if (error === "OCR_NO_TEXT") return l.ocrNoText;
  if (error === "IMAGE_TOO_SMALL") return l.imageTooSmall;
  if (error === "MANUAL_CROP_INVALID") return l.manualCropInvalid;
  if (error === "MRZ_LINES_NOT_SEPARATED") return l.lineSplitFailed;
  if (["MRZ_PARTIAL", "MRZ_VALIDATION_FAILED"].includes(error)) return l.partialOcr;
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

export const hasVerifiedCriticalMrzChecks = (parsed = {}) => {
  const checks = parsed?.checks || parsed?.engineResult?.checks || {};
  return Boolean(
    checks.passportNumberCheck?.valid
    && checks.birthDateCheck?.valid
    && checks.expiryDateCheck?.valid
    && checks.optionalDataCheck?.valid
    && checks.compositeCheck?.valid
  );
};

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
  const checks = parsed?.checks || parsed?.engineResult?.checks || {};
  if (checks.passportNumberCheck && !checks.passportNumberCheck.valid) {
    reasons.add(REVIEW_REASON.INVALID_PASSPORT_NUMBER);
    setFieldWarning(fieldWarnings, "passportNo", REVIEW_REASON.INVALID_PASSPORT_NUMBER);
  }
  if (
    parsed?.ok
    && !hasVerifiedCriticalMrzChecks(parsed)
  ) {
    reasons.add(REVIEW_REASON.CHECKSUM_FAILED);
    if (!checks.passportNumberCheck?.valid) {
      reasons.add(REVIEW_REASON.INVALID_PASSPORT_NUMBER);
      setFieldWarning(fieldWarnings, "passportNo", REVIEW_REASON.INVALID_PASSPORT_NUMBER);
    }
  }
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
  previewUrl = "",
  extractionSource = EXTRACTION_SOURCE.AUTOMATIC_MRZ,
  debugInfo = null,
}) => {
  const data = parsed?.data || {};
  const duplicate = Boolean(existing);
  const existingIdentity = duplicate ? getExistingIdentity(existing) : {};
  const extractedCin = extractTrustedMoroccanCin(parsed);
  const hasParsedData = Boolean(parsed?.data);
  const isTrustedMRZ = Boolean(parsed?.ok && parsed?.data && hasVerifiedCriticalMrzChecks(parsed));
  const reviewState = buildParsedReviewState({ parsed, duplicate });
  if (extractedCin.value && !parsed?.ok) {
    setFieldWarning(reviewState.reviewWarningFieldLevel, "cin", REVIEW_REASON.LOW_CONFIDENCE);
  }
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
    arabicLastName: existingIdentity.arabicLastName || "",
    arabicFirstName: existingIdentity.arabicFirstName || "",
    passportNo: hasParsedData ? line2Mapping.finalFields.passportNo : "",
    cin: extractedCin.value || existingIdentity.cin || "",
    nationality: hasParsedData ? line2Mapping.finalFields.nationality : "",
    birthDate: hasParsedData ? line2Mapping.finalFields.birthDate : "",
    gender: hasParsedData ? line2Mapping.finalFields.gender : "",
    passportExpiry: hasParsedData ? line2Mapping.finalFields.passportExpiry : "",
    ...birthDateMeta,
    raw: data.raw || parsed?.raw || {},
    hasImage,
    previewUrl,
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

const textValue = (value) => String(value || "").trim();

const getImportCityLabel = (city, lang) => {
  if (city === "madinah") return lang === "fr" ? "Médine" : lang === "en" ? "Madinah" : "المدينة";
  return lang === "fr" ? "La Mecque" : lang === "en" ? "Makkah" : "مكة";
};

const getImportProgramName = (program = {}) => textValue(program.name || program.title || program.nameFr || program.type || program.id);

const getImportProgramPackages = (program = {}) => (
  Array.isArray(program?.packages)
    ? program.packages.filter(Boolean)
    : Array.isArray(program?.priceTable) && program.priceTable.length
      ? normalizeProgramPackages(program).filter(Boolean)
      : []
);

const toPassportImportProgramContext = (program = null) => {
  if (!program?.id) return null;
  return {
    ...program,
    id: program.id,
    name: getImportProgramName(program),
    packages: getImportProgramPackages(program),
  };
};

const getPassportImportPackageOptions = (program = {}, lang = "ar") => {
  if (!program?.id) return [];
  return getImportProgramPackages(program).map((pkg, index) => {
    const pkgId = pkg.id || `pkg-${index + 1}`;
    const level = textValue(pkg.level || pkg.name);
    const hotelMecca = textValue(pkg.hotelMecca);
    const hotelMadina = textValue(pkg.hotelMadina);
    const hotelParts = [
      hotelMecca ? `${getImportCityLabel("makkah", lang)}: ${hotelMecca}` : "",
      hotelMadina ? `${getImportCityLabel("madinah", lang)}: ${hotelMadina}` : "",
    ].filter(Boolean);
    return {
      pkg,
      key: `package::${pkgId}::${index}`,
      packageId: pkg.id || "",
      packageLevel: level,
      hotelMecca,
      hotelMadina,
      label: [level || pkgId, hotelParts.join(" | ")].filter(Boolean).join(" — "),
    };
  });
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
  const [expanded, setExpanded] = React.useState(false);
  const detailsRef = React.useRef(null);
  const canManuallyAccept = rowCanBeManuallyAccepted(row);
  const isReady = row.status === ROW_STATUS.READY || row.status === ROW_STATUS.MANUALLY_ACCEPTED;
  const statusClass = isReady ? "is-ready" : row.status === ROW_STATUS.FAILED ? "is-failed" : "is-review";
  const displayName = [row.arabicFirstName, row.arabicLastName].filter(Boolean).join(" ")
    || [row.latinFirstName, row.latinLastName].filter(Boolean).join(" ")
    || labels.noNameYet;
  const primaryIssue = row.reviewReasons?.[0]
    ? getReviewReasonLabel(labels, row.reviewReasons[0])
    : row.note || "";
  const previewUrl = row.previewUrl || row.mrzDebug?.originalImageUrl || "";
  const coreFields = [
    ["latinLastName", labels.latinLast, "ltr"],
    ["latinFirstName", labels.latinFirst, "ltr"],
    ["passportNo", labels.passportNo, "ltr"],
    ["cin", labels.nationalId, "ltr"],
    ["nationality", labels.nationality, "ltr"],
    ["birthDate", labels.birthDate, "ltr"],
    ["passportExpiry", labels.expiry, "ltr"],
  ];
  const additionalFields = [
    ["arabicLastName", labels.arabicLast, "rtl"],
    ["arabicFirstName", labels.arabicFirst, "rtl"],
    ["phone", labels.phone, "ltr"],
  ];

  const renderTextField = ([key, label, direction]) => {
    const warnings = getFieldWarningReasons(row, key);
    return (
      <label key={key} className={`passport-import__field ${warnings.length ? "is-warning" : ""}`}>
        <span>{label}</span>
        <input
          value={row[key] || ""}
          onChange={(event) => onChange(row.id, { [key]: event.target.value })}
          title={warnings.map((reason) => getReviewReasonLabel(labels, reason)).join(", ")}
          style={{ direction }}
        />
      </label>
    );
  };

  React.useEffect(() => {
    if (!expanded) return;
    detailsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [expanded]);

  return (
    <article className="passport-import__passport-card">
      <div className="passport-import__passport-summary">
        <div className="passport-import__thumb" aria-hidden={!previewUrl}>
          {previewUrl
            ? <img src={previewUrl} alt={row.source || labels.image} />
            : <AppIcon name="passport" size={20} color="var(--rukn-text-muted)" />}
        </div>
        <div className="passport-import__passport-main">
          <p className="passport-import__passport-name">{index + 1}. {displayName}</p>
          <div className="passport-import__passport-meta">
            <span>{labels.passportNo}: {row.passportNo || "—"}</span>
            <span>{labels.nationality}: {row.nationality || "—"}</span>
            <span>{row.source || "—"}</span>
          </div>
          {primaryIssue && !isReady && <p className="passport-import__primary-issue">{primaryIssue}</p>}
        </div>
        <div className="passport-import__card-actions">
          <span className={`passport-import__status ${statusClass}`}>
            {labels[row.status] || labels.needs_review || labels.review}
          </span>
          <button
            type="button"
            className="passport-import__link-button"
            aria-expanded={expanded}
            aria-controls={`passport-details-${row.id}`}
            onClick={() => setExpanded((current) => !current)}
          >
            <AppIcon name={expanded ? "eyeOff" : "eye"} size={13} />
            {expanded ? labels.hideDetails : labels.showDetails}
          </button>
        </div>
      </div>

      {expanded && (
        <div ref={detailsRef} id={`passport-details-${row.id}`} className={`passport-import__passport-details ${previewUrl ? "has-image" : ""}`}>
          {previewUrl && (
            <div className="passport-import__details-image">
              <img src={previewUrl} alt={row.source || labels.image} />
            </div>
          )}
          <div className="passport-import__details-form">
            <section className="passport-import__field-section" aria-labelledby={`passport-core-${row.id}`}>
              <h4 id={`passport-core-${row.id}`}>{labels.basicPassportData}</h4>
              <div className="passport-import__details-grid">
                {coreFields.slice(0, 6).map(renderTextField)}
                <label className={`passport-import__field ${getFieldWarningReasons(row, "gender").length ? "is-warning" : ""}`}>
                  <span>{labels.gender}</span>
                  <select
                    value={row.gender || ""}
                    onChange={(event) => onChange(row.id, { gender: event.target.value })}
                    title={getFieldWarningReasons(row, "gender").map((reason) => getReviewReasonLabel(labels, reason)).join(", ")}
                  >
                    <option value="">—</option>
                    <option value="male">{labels.male}</option>
                    <option value="female">{labels.female}</option>
                  </select>
                </label>
                {coreFields.slice(6).map(renderTextField)}
              </div>
            </section>
            <section className="passport-import__field-section" aria-labelledby={`passport-additional-${row.id}`}>
              <h4 id={`passport-additional-${row.id}`}>{labels.additionalData}</h4>
              <div className="passport-import__details-grid passport-import__details-grid--additional">
                {additionalFields.map(renderTextField)}
              </div>
            </section>
          </div>
          <div className="passport-import__details-actions">
            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
              {row.hasImage && (
                <Button variant="secondary" size="sm" icon="camera" onClick={() => onSelectMRZ(row.id)}>
                  {labels.selectMRZ}
                </Button>
              )}
              {row.existingClientId ? (
                <label className="passport-import__field" style={{ minWidth: 150 }}>
                  <span>{labels.duplicateAction}</span>
                  <select
                    value={row.duplicateAction}
                    disabled={row.status === ROW_STATUS.FAILED}
                    onChange={(event) => onChange(row.id, { duplicateAction: event.target.value, accepted: event.target.value === "update", manualAccepted: event.target.value === "update" && canManuallyAccept })}
                  >
                    <option value="skip">{labels.skip}</option>
                    <option value="update">{labels.update}</option>
                  </select>
                </label>
              ) : (
                <label className="passport-import__accept">
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
            </div>
            <button type="button" className="passport-import__icon-button" onClick={() => onRemove(row.id)} title={labels.delete} aria-label={labels.delete}>
              <AppIcon name="trash" size={14} />
            </button>
          </div>
        </div>
      )}
    </article>
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
  if (!MRZ_DIAGNOSTIC_LAB_ENABLED) return null;
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
  const dir = lang === "ar" ? "rtl" : "ltr";
  const importProgram = programContext?.program || programContext || null;
  const lockedImportProgram = toPassportImportProgramContext(importProgram);
  const lockedImportProgramId = lockedImportProgram?.id || "";
  const [rows, setRows] = React.useState([]);
  const [error, setError] = React.useState("");
  const [workflowView, setWorkflowView] = React.useState("upload");
  const [isDraggingFiles, setIsDraggingFiles] = React.useState(false);
  const [progress, setProgress] = React.useState({
    done: 0,
    total: 0,
    active: false,
    current: 0,
    currentFile: "",
    phase: "preparing",
    passportProgress: 0,
    slow: false,
  });
  const [bulkFiles, setBulkFiles] = React.useState([]);
  const [selectedImportProgramId, setSelectedImportProgramId] = React.useState("");
  const [selectedImportPackageKey, setSelectedImportPackageKey] = React.useState("");
  const [cropModal, setCropModal] = React.useState({ open: false, rowId: "", url: "", fileName: "" });
  const [cropRect, setCropRect] = React.useState({ x: 4, y: 68, width: 92, height: 24 });
  const [cropReading, setCropReading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const bulkRef = React.useRef(null);
  const rowFilesRef = React.useRef(new Map());
  const debugUrlsRef = React.useRef(new Set());
  const cropBoxRef = React.useRef(null);
  const cropImageRef = React.useRef(null);
  const cropDragRef = React.useRef(null);
  const cropOriginalRowRef = React.useRef(null);
  const activeOcrWorkerRef = React.useRef(null);
  const ocrWorkerPromiseRef = React.useRef(null);
  const ocrWorkerDisposedRef = React.useRef(false);
  const batchCancelledRef = React.useRef(false);
  const batchPerfRef = React.useRef(null);
  const slowProgressTimerRef = React.useRef(null);
  const wasProcessingRef = React.useRef(false);
  const clients = store?.clients || store?.activeClients || [];
  const currentAgencyId = store?.agencyId || store?.agency?.id || store?.currentAgency?.id || "";
  const currentAgencyClients = React.useMemo(
    () => filterClientsForCurrentAgency(clients, currentAgencyId),
    [clients, currentAgencyId]
  );
  const capacityClientSource = React.useMemo(() => {
    if (store?.isSupabaseEnabled && !store?.clientsLoaded) return undefined;
    if (Array.isArray(store?.activeClients)) return store.activeClients;
    return clients;
  }, [clients, store?.activeClients, store?.clientsLoaded, store?.isSupabaseEnabled]);
  const importProgramOptions = React.useMemo(
    () => (Array.isArray(store?.programs) ? store.programs : [])
      .filter((program) => program?.id && !program.deleted && !program.archived)
      .map((program) => toPassportImportProgramContext(program))
      .filter(Boolean),
    [store?.programs]
  );
  const selectedImportProgram = React.useMemo(
    () => importProgramOptions.find((program) => program.id === selectedImportProgramId) || null,
    [importProgramOptions, selectedImportProgramId]
  );
  const effectiveImportProgram = lockedImportProgram || selectedImportProgram;
  const effectiveImportProgramId = effectiveImportProgram?.id || "";
  const effectiveImportProgramName = effectiveImportProgram?.name || "";
  const importPackageOptions = React.useMemo(
    () => getPassportImportPackageOptions(effectiveImportProgram, lang),
    [effectiveImportProgram, lang]
  );
  const selectedImportPackage = React.useMemo(
    () => importPackageOptions.find((option) => option.key === selectedImportPackageKey) || null,
    [importPackageOptions, selectedImportPackageKey]
  );
  const showProgramSelector = !lockedImportProgramId;
  const showPackageSelector = Boolean(effectiveImportProgramId);

  const createDebugOriginalImageUrl = React.useCallback((file) => {
    if (!file) return "";
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

  const ensureOcrWorker = React.useCallback((context = {}) => {
    if (activeOcrWorkerRef.current) return Promise.resolve(activeOcrWorkerRef.current);
    if (ocrWorkerPromiseRef.current) return ocrWorkerPromiseRef.current;
    let pendingWorker;
    pendingWorker = Promise.resolve()
      .then(() => createPassportOCRWorker(() => {}, context))
      .then(async (worker) => {
        if (!worker) throw new Error("OCR_WORKER_INIT_FAILED");
        if (ocrWorkerDisposedRef.current) {
          await terminatePassportOCRWorker(worker, { ...context, reason: "warmup-after-close" });
          throw new Error("OCR_CANCELLED");
        }
        activeOcrWorkerRef.current = worker;
        return worker;
      })
      .catch((workerError) => {
        if (ocrWorkerPromiseRef.current === pendingWorker) ocrWorkerPromiseRef.current = null;
        throw workerError;
      });
    ocrWorkerPromiseRef.current = pendingWorker;
    return pendingWorker;
  }, []);

  const resetOcrWorker = React.useCallback(async (context = {}) => {
    const worker = activeOcrWorkerRef.current;
    activeOcrWorkerRef.current = null;
    ocrWorkerPromiseRef.current = null;
    if (worker) await terminatePassportOCRWorker(worker, context);
  }, []);

  React.useEffect(() => {
    ocrWorkerDisposedRef.current = false;
    const warmupTimer = window.setTimeout(() => {
      ensureOcrWorker({ scope: "warmup", reason: "mrz-reader-open" }).catch((workerError) => {
        logPassportPerformance("worker-warmup-error", { error: workerError?.message || String(workerError) });
      });
    }, 0);
    return () => {
      window.clearTimeout(warmupTimer);
      ocrWorkerDisposedRef.current = true;
      batchCancelledRef.current = true;
      if (slowProgressTimerRef.current) {
        window.clearTimeout(slowProgressTimerRef.current);
        slowProgressTimerRef.current = null;
      }
      const worker = activeOcrWorkerRef.current;
      activeOcrWorkerRef.current = null;
      ocrWorkerPromiseRef.current = null;
      if (worker) {
        terminatePassportOCRWorker(worker, {
          batchId: batchPerfRef.current?.batchId || "",
          scope: "batch",
          reason: "component-unmount",
        });
      }
    };
  }, [ensureOcrWorker]);

  React.useEffect(() => {
    const batch = batchPerfRef.current;
    if (!rows.length || !batch || batch.firstRowLogged) return undefined;
    const logFirstDisplayedRow = () => {
      if (batch.firstRowLogged) return;
      batch.firstRowLogged = true;
      logPassportPerformance("time-to-first-displayed-row", {
        batchId: batch.batchId,
        durationMs: passportDuration(batch.startedAt),
      });
    };
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      const frameId = window.requestAnimationFrame(logFirstDisplayedRow);
      return () => window.cancelAnimationFrame(frameId);
    }
    const timeoutId = setTimeout(logFirstDisplayedRow, 0);
    return () => clearTimeout(timeoutId);
  }, [rows.length]);

  React.useEffect(() => {
    setSelectedImportPackageKey("");
  }, [selectedImportProgramId]);

  React.useEffect(() => {
    if (!selectedImportPackageKey) return;
    if (importPackageOptions.some((option) => option.key === selectedImportPackageKey)) return;
    setSelectedImportPackageKey("");
  }, [importPackageOptions, selectedImportPackageKey]);

  const rowProgramDefaults = React.useCallback(() => effectiveImportProgramId ? ({
    programId: effectiveImportProgramId,
  }) : {}, [effectiveImportProgramId]);

  const clientByPassport = React.useMemo(() => {
    const map = new Map();
    currentAgencyClients.forEach((client) => {
      const key = normalizePassportNo(client.passport?.number || client.passportNumber);
      if (key) map.set(key, client);
    });
    return map;
  }, [currentAgencyClients]);

  const findExisting = React.useCallback((passportNo) => clientByPassport.get(normalizePassportNo(passportNo)), [clientByPassport]);
  const addParsedRow = React.useCallback((parsed, source, override = {}) => {
    const passportNo = parsed?.data?.passportNo || "";
    const existing = passportNo ? findExisting(passportNo) : null;
    const row = { ...makeRowFromParsed({ parsed, source, existing, l, ...override }), ...rowProgramDefaults() };
    setRows((current) => [row, ...current]);
    return row;
  }, [findExisting, l, rowProgramDefaults]);

  const selectBulkFiles = React.useCallback((fileList) => {
    setBulkFiles(dedupePassportFiles(fileList).slice(0, MAX_BULK_FILES));
    setError("");
  }, []);

  const processImageFile = React.useCallback(async (file, index = 0, worker = null, batchContext = {}) => {
    const outcome = await extractMRZFromImage(file, () => {}, {
      worker,
      workerPromise: batchContext.workerPromise || null,
      onStage: batchContext.onStage,
      isCancelled: () => batchCancelledRef.current,
      perfContext: {
        batchId: batchContext.batchId || "",
        scope: "batch",
        passport: index + 1,
        totalPassports: batchContext.totalPassports || 1,
        fileName: file?.name || `image-${index + 1}`,
      },
    });
    if (batchCancelledRef.current || outcome.cancelled) {
      return { row: null, cancelled: true, workerShouldReset: Boolean(outcome.workerShouldReset) };
    }
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
        previewUrl: originalImageUrl,
        extractionSource: EXTRACTION_SOURCE.AUTOMATIC_MRZ,
        debugInfo: { outcome, originalImageUrl, mode: "automatic" },
      });
    } else if (outcome.raw?.line1 || outcome.raw?.line2) {
      const parsed = parseMRZDetailed(outcome.raw?.line1 || "", outcome.raw?.line2 || "", { ocrText: outcome.ocrText || "" });
      row = addParsedRow(parsed, file.name || `image-${index + 1}`, {
        statusOverride: parsed.data ? ROW_STATUS.NEEDS_REVIEW : ROW_STATUS.FAILED,
        noteOverride: issueText(parsed.issues || ["PARSE_ERROR"], l, parsed.raw),
        hasImage: true,
        previewUrl: originalImageUrl,
        extractionSource: EXTRACTION_SOURCE.FALLBACK_OCR,
        debugInfo: { outcome, originalImageUrl, mode: "automatic_failed" },
      });
    } else {
      row = addParsedRow({ ok: false, data: null, issues: [outcome.error || "OCR_FAILED"] }, file.name || `image-${index + 1}`, {
        statusOverride: ROW_STATUS.FAILED,
        noteOverride: ocrFailureText(outcome.error, l),
        hasImage: true,
        previewUrl: originalImageUrl,
        extractionSource: EXTRACTION_SOURCE.FALLBACK_OCR,
        debugInfo: { outcome, originalImageUrl, mode: "automatic_failed" },
      });
    }
    if (row?.id) rowFilesRef.current.set(row.id, file);
    return {
      row,
      workerShouldReset: Boolean(outcome.workerShouldReset),
    };
  }, [addParsedRow, createDebugOriginalImageUrl, l]);

  const openCropModal = React.useCallback((id) => {
    const file = rowFilesRef.current.get(id);
    if (!file) {
      onToast?.(l.ocrFailed, "error");
      return;
    }
    const originalRow = rows.find((row) => row.id === id) || null;
    cropOriginalRowRef.current = originalRow;
    if (originalRow && (
      originalRow.accepted
      || originalRow.manualAccepted
      || originalRow.status === ROW_STATUS.READY
      || originalRow.status === ROW_STATUS.MANUALLY_ACCEPTED
    )) {
      setRows((current) => current.map((row) => (row.id === id ? {
        ...row,
        accepted: false,
        manualAccepted: false,
        status: ROW_STATUS.NEEDS_REVIEW,
        duplicateAction: row.existingClientId ? "skip" : row.duplicateAction,
      } : row)));
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
  }, [l.ocrFailed, onToast, rows]);

  const processFilesSequentially = React.useCallback(async (fileList) => {
    const files = dedupePassportFiles(fileList).slice(0, MAX_BULK_FILES);
    if (!files.length) return;
    const batchStartedAt = performanceNow();
    const batchId = `batch-${Math.round(batchStartedAt)}-${files.length}`;
    batchPerfRef.current = {
      batchId,
      startedAt: batchStartedAt,
      firstRowLogged: false,
    };
    batchCancelledRef.current = false;
    setError("");
    setRows([]);
    rowFilesRef.current.clear();
    revokeAllDebugUrls();
    setProgress({
      done: 0,
      total: files.length,
      active: true,
      current: 1,
      currentFile: files[0]?.name || "image-1",
      phase: "preparing",
      passportProgress: 0.01,
      slow: false,
    });
    let workerPromise = ensureOcrWorker({
      batchId,
      scope: "batch",
      totalPassports: files.length,
    });
    let processedCount = 0;
    let batchStatus = "success";
    try {
      for (let index = 0; index < files.length; index += 1) {
        if (batchCancelledRef.current) {
          batchStatus = "cancelled";
          break;
        }
        const file = files[index];
        const passportStartedAt = performanceNow();
        setProgress({
          done: index,
          total: files.length,
          active: true,
          current: index + 1,
          currentFile: file?.name || `image-${index + 1}`,
          phase: "preparing",
          passportProgress: 0.01,
          slow: false,
        });
        if (slowProgressTimerRef.current) window.clearTimeout(slowProgressTimerRef.current);
        slowProgressTimerRef.current = window.setTimeout(() => {
          setProgress((current) => (
            current.active && current.current === index + 1
              ? { ...current, slow: true }
              : current
          ));
        }, 6000);
        let result;
        try {
          result = await processImageFile(file, index, null, {
            batchId,
            totalPassports: files.length,
            workerPromise,
            onStage: (stageProgress = {}) => {
              setProgress((current) => {
                if (!current.active || current.current !== index + 1) return current;
                return {
                  ...current,
                  phase: stageProgress.phase || current.phase,
                  passportProgress: Math.max(0, Math.min(1, Number(stageProgress.progress) || 0)),
                };
              });
            },
          });
        } finally {
          if (slowProgressTimerRef.current) {
            window.clearTimeout(slowProgressTimerRef.current);
            slowProgressTimerRef.current = null;
          }
        }
        processedCount = index + 1;
        logPassportPerformance("passport-total", {
          batchId,
          passport: index + 1,
          totalPassports: files.length,
          fileName: file?.name || `image-${index + 1}`,
          durationMs: passportDuration(passportStartedAt),
          status: result.cancelled ? "cancelled" : result.row?.status || "unknown",
        });

        if (result.workerShouldReset) {
          await resetOcrWorker({
            batchId,
            scope: "batch",
            reason: "passport-ocr-error",
            passport: index + 1,
          });
          if (index + 1 < files.length && !batchCancelledRef.current) {
            workerPromise = ensureOcrWorker({
              batchId,
              scope: "batch",
              reason: "passport-ocr-error-recovery",
              totalPassports: files.length,
            });
          }
        } else if (!activeOcrWorkerRef.current && index + 1 < files.length && !batchCancelledRef.current) {
          workerPromise = ensureOcrWorker({
            batchId,
            scope: "batch",
            reason: "worker-init-retry",
            totalPassports: files.length,
          });
        }

        if (batchCancelledRef.current) {
          batchStatus = "cancelled";
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 40));
        setProgress({
          done: index + 1,
          total: files.length,
          active: index + 1 < files.length,
          current: index + 1,
          currentFile: file?.name || `image-${index + 1}`,
          phase: "confirming",
          passportProgress: 1,
          slow: false,
        });
      }
    } catch (processingError) {
      batchStatus = "error";
      setError(ocrFailureText(processingError?.message || "OCR_FAILED", l));
      logPassportPerformance("batch-error", {
        batchId,
        error: processingError?.message || String(processingError),
      });
    } finally {
      if (slowProgressTimerRef.current) {
        window.clearTimeout(slowProgressTimerRef.current);
        slowProgressTimerRef.current = null;
      }
      if (!batchCancelledRef.current) {
        setProgress({
          done: processedCount,
          total: files.length,
          active: false,
          current: processedCount,
          currentFile: "",
          phase: "confirming",
          passportProgress: processedCount ? 1 : 0,
          slow: false,
        });
      }
      logPassportPerformance("batch-total", {
        batchId,
        passportCount: files.length,
        processedCount,
        durationMs: passportDuration(batchStartedAt),
        status: batchCancelledRef.current ? "cancelled" : batchStatus,
      });
    }
  }, [ensureOcrWorker, l, processImageFile, resetOcrWorker, revokeAllDebugUrls]);

  const readBulkPassports = React.useCallback(() => {
    if (!bulkFiles.length) {
      setError(l.noImageSelected);
      return;
    }
    processFilesSequentially(bulkFiles);
  }, [bulkFiles, l.noImageSelected, processFilesSequentially]);

  React.useEffect(() => {
    if (progress.active) {
      wasProcessingRef.current = true;
      return;
    }
    if (!wasProcessingRef.current) return;
    wasProcessingRef.current = false;
    setWorkflowView(rows.length ? "review" : "upload");
  }, [progress.active, rows.length]);

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
          requiredFieldsCheck: getRequiredFieldsCheck(updatedRow, { programMode: Boolean(effectiveImportProgramId) }),
          requiredFieldsValid: rowHasEssentialPassportData(updatedRow),
          cleanFieldsValid: rowHasRequiredPassportData(updatedRow),
          saveEligible: isRowSaveEligible(updatedRow),
        });
      }
      return updatedRow;
    }));
    if (manualAcceptRequested) onToast?.(l.manualAcceptToast, "success");
  }, [effectiveImportProgramId, l.manualAcceptToast, onToast]);

  const removeRow = React.useCallback((id) => {
    rowFilesRef.current.delete(id);
    setRows((current) => {
      const removed = current.find((row) => row.id === id);
      revokeDebugUrl(removed?.previewUrl || removed?.mrzDebug?.originalImageUrl);
      return current.filter((row) => row.id !== id);
    });
  }, [revokeDebugUrl]);

  const closeCropModal = React.useCallback((options = {}) => {
    const restoreOriginal = options?.restore !== false;
    const originalRow = cropOriginalRowRef.current;
    cropOriginalRowRef.current = null;
    if (restoreOriginal && originalRow?.id) {
      setRows((current) => current.map((row) => (row.id === originalRow.id ? originalRow : row)));
    }
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
        programMode: Boolean(effectiveImportProgramId),
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
  }, [cropModal.rowId, cropRect, findExisting, effectiveImportProgramId, l]);

  const readSelectedCrop = React.useCallback(async () => {
    const file = rowFilesRef.current.get(cropModal.rowId);
    if (!file || cropRect.width < 5 || cropRect.height < 5) return;
    const cropStartedAt = performanceNow();
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
    const workerPromise = ensureOcrWorker({
      scope: "manual-crop",
      fileName: file?.name || cropModal.fileName || "",
      rowId: cropModal.rowId,
    });
    const outcome = await extractMRZFromImageRegion(file, cropRect, () => {}, {
      workerPromise,
      perfContext: {
        scope: "manual-crop",
        fileName: file?.name || cropModal.fileName || "",
        rowId: cropModal.rowId,
      },
    });
    if (outcome.workerShouldReset) {
      await resetOcrWorker({ scope: "manual-crop", reason: "manual-crop-ocr-error" });
    }
    const raw = outcome.raw || {};
    const parsed = outcome.success
      ? outcome.parsed || parseMRZDetailed(
        raw.line1 || outcome.data?.raw?.line1,
        raw.line2 || outcome.data?.raw?.line2,
        { ocrText: outcome.ocrText || "" },
      )
      : parseMRZDetailed(raw.line1 || "", raw.line2 || "", { ocrText: outcome.ocrText || "" });
    const { hasParsedData } = applyParsedToCropRow({
      parsed,
      raw,
      outcome,
      statusOverride: parsed.data ? ROW_STATUS.NEEDS_REVIEW : ROW_STATUS.FAILED,
    });
    setCropReading(false);
    logPassportPerformance("manual-crop-total", {
      fileName: file?.name || cropModal.fileName || "",
      rowId: cropModal.rowId,
      durationMs: passportDuration(cropStartedAt),
      status: hasParsedData ? "needs-review" : "failed",
    });
    if (hasParsedData) {
      onToast?.(l.needs_review || l.review, "info");
      closeCropModal({ restore: false });
    } else {
      onToast?.(ocrFailureText(outcome.error || (raw.line1 || raw.line2 ? "PARSE_FAILED" : "MRZ_NOT_FOUND"), l), "error");
    }
  }, [applyParsedToCropRow, closeCropModal, cropModal.fileName, cropModal.rowId, cropRect, ensureOcrWorker, l, onToast, resetOcrWorker]);

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
      cin: row.cin || "",
      gender: row.gender || "",
      programId: effectiveImportProgramId || row.programId || null,
      packageId: selectedImportPackage?.packageId || "",
      packageLevel: selectedImportPackage?.packageLevel || "",
      hotelLevel: selectedImportPackage?.packageLevel || "",
      hotelMecca: selectedImportPackage?.hotelMecca || "",
      hotelMadina: selectedImportPackage?.hotelMadina || "",
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
        cin: row.cin || "",
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
  }, [buildPartialBirthDateDocs, effectiveImportProgramId, l.groupInRoom, selectedImportPackage]);

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
        requiredFieldsCheck: getRequiredFieldsCheck(row, { programMode: Boolean(effectiveImportProgramId) }),
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
    const capacityDelta = effectiveImportProgramId
      ? accepted.reduce((count, row) => {
          if (!row.existingClientId) return count + 1;
          if (row.duplicateAction !== "update") return count;
          const existing = clients.find((client) => client.id === row.existingClientId) || null;
          return count + getProgramCapacityDeltaForClientChange({
            targetProgramId: effectiveImportProgramId,
            previousClient: existing,
            nextClient: { programId: effectiveImportProgramId },
          });
        }, 0)
      : 0;
    if (capacityDelta > 0 && effectiveImportProgram) {
      const capacityInfo = getProgramCapacityInfo(effectiveImportProgram, capacityClientSource, capacityDelta);
      if (!capacityInfo.canAddRequested) {
        onToast?.(getProgramCapacityMessage({
          program: effectiveImportProgram,
          lang,
          messages: t,
          action: "import",
          countToAdd: capacityDelta,
          remainingSeats: capacityInfo.remainingSeats || 0,
        }), "error");
        return;
      }
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
          programId: effectiveImportProgramId ? payload.programId : (existing.programId || payload.programId || null),
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
      const capacityMessage = failures
        .map((item) => getProgramCapacityDatabaseErrorMessage(item.error, lang))
        .find(Boolean);
      onToast?.(capacityMessage || `${l.saveRowFailed}: ${failures.length}`, "error");
      return;
    }
    onToast?.(l.saved, "success");
    onClose?.();
  }, [capacityClientSource, clients, effectiveImportProgram, effectiveImportProgramId, l, lang, onClose, onToast, rows, store, t, toClientPayload]);

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

  const readyCount = rows.filter((row) => row.status === ROW_STATUS.READY || row.status === ROW_STATUS.MANUALLY_ACCEPTED).length;
  const reviewCount = rows.filter((row) => row.status === ROW_STATUS.NEEDS_REVIEW).length;
  const failedCount = rows.filter((row) => row.status === ROW_STATUS.FAILED).length;
  const acceptedCount = rows.filter(isRowSaveEligible).length;
  const workflowSteps = [l.stepPassports, l.stepReview, l.stepSave];
  const progressPhaseText = {
    preparing: l.progressPreparing,
    reading: l.progressReading,
    validating: l.progressValidating,
    confirming: l.progressConfirming,
  }[progress.phase] || l.progressReading;
  const overallProgressPercent = Math.round(
    ((progress.done + (progress.active ? progress.passportProgress : 0)) / Math.max(progress.total, 1)) * 100
  );
  const passportImportLinkingInfo = effectiveImportProgramId
    ? selectedImportPackage
      ? l.selectedProgramPackageInfo
      : l.selectedProgramOnlyInfo
    : l.selectedNoProgramInfo;
  const currentWorkflowStep = saving ? 2 : progress.active || workflowView === "review" ? 1 : 0;
  const participantTerms = getParticipantTerminology(effectiveImportProgram, lang);
  const saveParticipantsLabel = effectiveImportProgramId
    ? lang === "ar"
      ? `حفظ ${participantTerms.plural}`
      : lang === "fr"
        ? `Enregistrer les ${participantTerms.plural}`
        : `Save ${participantTerms.plural}`
    : l.savePilgrims;
  const selectFilesFromInput = (event) => {
    const nextFiles = Array.from(event.target.files || []);
    if (nextFiles.length) {
      selectBulkFiles(nextFiles);
      setWorkflowView("upload");
    }
    event.target.value = "";
  };
  const getReadingFileStatus = (file, index) => {
    const result = rows.find((row) => row.source === file.name);
    if (result?.status === ROW_STATUS.FAILED) return [l.fileError, "is-failed"];
    if (index + 1 === progress.current && progress.active) return [l.fileReading, "is-reading"];
    if (result || index < progress.done) return [l.fileRead, "is-ready"];
    return [l.fileWaiting, "is-waiting"];
  };

  return (
    <div style={{ direction: dir }}>
      <div className="passport-import">
        <input
          ref={bulkRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={selectFilesFromInput}
        />
        <div className="passport-import__top">
          <div className="passport-import__intro">
            <p>{l.desc}</p>
            {lockedImportProgramId && (
              <span className="passport-import__program-badge" title={lockedImportProgram?.name || ""}>
                <AppIcon name="program" size={14} />
                {lockedImportProgram?.name || "—"}
              </span>
            )}
          </div>
          <ol className="passport-import__steps" aria-label={l.workflow}>
            {workflowSteps.map((step, index) => (
              <li
                key={step}
                className={`passport-import__step ${index === currentWorkflowStep ? "is-active" : ""} ${index < currentWorkflowStep ? "is-complete" : ""}`}
                aria-current={index === currentWorkflowStep ? "step" : undefined}
              >
                <span className="passport-import__step-number">
                  {index < currentWorkflowStep ? <AppIcon name="check" size={13} /> : index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="passport-import__body">

          {!progress.active && (showProgramSelector || showPackageSelector) && (
            <details className="passport-import__advanced">
              <summary>
                <span className="passport-import__advanced-title">
                  <AppIcon name="settings" size={15} />
                  {l.advancedOptions}
                </span>
                <span className="passport-import__optional-badge">{l.optional}</span>
              </summary>
              <div className="passport-import__advanced-content">
                <p className="passport-import__advanced-note">{l.advancedHint}</p>
                <div className="passport-import__selectors">
                  {showProgramSelector && (
                    <label className="passport-import__field">
                      <span>{l.chooseProgram}</span>
                      <select value={selectedImportProgramId} onChange={(event) => setSelectedImportProgramId(event.target.value)}>
                        <option value="">{l.importWithoutProgram}</option>
                        {importProgramOptions.map((program) => (
                          <option key={program.id} value={program.id}>{program.name || program.id}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  {showPackageSelector && (
                    <label className="passport-import__field">
                      <span>{l.choosePackage}</span>
                      <select
                        value={selectedImportPackageKey}
                        onChange={(event) => setSelectedImportPackageKey(event.target.value)}
                        disabled={!importPackageOptions.length}
                      >
                        <option value="">{l.importWithoutHotel}</option>
                        {importPackageOptions.map((option) => (
                          <option key={option.key} value={option.key}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                {showPackageSelector && !importPackageOptions.length && <p className="passport-import__advanced-note">{l.noPackageOptions}</p>}
                <p className="passport-import__linking-note">{passportImportLinkingInfo}</p>
              </div>
            </details>
          )}

          {error && <div className="passport-import__error" role="alert">{error}</div>}

          {progress.active ? (
            <section className="passport-import__reading" aria-live="polite" aria-busy="true">
              <div className="passport-import__reading-head">
                <div>
                  <h3>{l.readingTitle}</h3>
                  <p>{l.readingHint}</p>
                </div>
                <span className="passport-import__progress-value">
                  {progress.current}/{progress.total} · {Math.max(1, Math.min(99, overallProgressPercent))}%
                </span>
              </div>
              <div className="passport-import__progress-track" aria-hidden="true">
                <div className="passport-import__progress-bar" style={{ width: `${Math.max(1, Math.min(99, overallProgressPercent))}%` }} />
              </div>
              <p>{progressPhaseText}</p>
              <div className="passport-import__reading-list">
                {bulkFiles.map((file, index) => {
                  const [statusLabel, statusClass] = getReadingFileStatus(file, index);
                  return (
                    <div className="passport-import__reading-item" key={`${file.name}-${index}`}>
                      <span className="passport-import__reading-name">{file.name || `image-${index + 1}`}</span>
                      <span className={`passport-import__status ${statusClass}`}>{statusLabel}</span>
                    </div>
                  );
                })}
              </div>
              {progress.slow && <p className="passport-import__primary-issue">{l.progressSlow}</p>}
            </section>
          ) : workflowView === "upload" || !rows.length ? (
            <section
              className={`passport-import__dropzone ${isDraggingFiles ? "is-dragging" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={l.chooseImages}
              onClick={() => bulkRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  bulkRef.current?.click();
                }
              }}
              onDragEnter={(event) => { event.preventDefault(); setIsDraggingFiles(true); }}
              onDragOver={(event) => { event.preventDefault(); setIsDraggingFiles(true); }}
              onDragLeave={(event) => { if (event.target === event.currentTarget) setIsDraggingFiles(false); }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDraggingFiles(false);
                selectBulkFiles(event.dataTransfer.files);
                setWorkflowView("upload");
              }}
            >
              <div>
                <IconBubble name="upload" boxSize={50} iconSize={23} style={{ margin: "0 auto" }} />
                <h3>{l.uploadTitle}</h3>
                <p>{l.uploadDescription}</p>
                <span className="passport-import__formats">{l.supportedFormats}</span>
                <Button
                  variant="secondary"
                  icon="upload"
                  onClick={(event) => { event.stopPropagation(); bulkRef.current?.click(); }}
                >
                  {l.chooseImages}
                </Button>
                {bulkFiles.length > 0 && (
                  <div className="passport-import__selected-files" aria-label={`${l.selectedFiles}: ${bulkFiles.length}`}>
                    {bulkFiles.map((file, index) => (
                      <span className="passport-import__file-chip" key={`${file.name}-${index}`}>{file.name || `image-${index + 1}`}</span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {!progress.active && workflowView === "review" && rows.length > 0 && (
            <>
              <section className="passport-import__review">
                <div className="passport-import__review-head">
                  <div>
                    <h3>{l.reviewSection}</h3>
                    <p>{l.reviewHint}</p>
                  </div>
                  <div className="passport-import__counts">
                    {[
                      [l.ready, readyCount, "is-ready"],
                      [l.needs_review, reviewCount, "is-review"],
                      [l.failed, failedCount, "is-failed"],
                    ].map(([label, count, statusClass]) => (
                      <span key={label} className={`passport-import__count passport-import__status ${statusClass}`}>
                        {count} {label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="passport-import__review-list">
                  {rows.map((row, index) => (
                    <ReviewRow
                      key={row.id}
                      row={row}
                      index={index}
                      labels={l}
                      onChange={updateRow}
                      onRemove={removeRow}
                      onSelectMRZ={openCropModal}
                    />
                  ))}
                </div>
              </section>
              <MRZDiagnosticLab rows={rows} onCopyDebug={copyMrzDebugJson} />
            </>
          )}
        </div>

        <div className="passport-import__footer">
          <div className="passport-import__footer-note">
            {progress.active
              ? `${progress.current}/${progress.total} · ${progressPhaseText}`
              : workflowView === "review" && rows.length
                ? acceptedCount > 0 ? `${acceptedCount} ${saveParticipantsLabel}` : l.reviewNeedsCorrection
                : bulkFiles.length ? `${l.selectedFiles}: ${bulkFiles.length}` : l.noImageSelected}
          </div>
          {!progress.active && (
            <div className="passport-import__footer-actions">
              <Button variant="ghost" onClick={onClose}>{t.cancel}</Button>
              {workflowView === "review" && rows.length ? (
                <>
                  {onResult && firstAccepted && (
                    <Button variant="secondary" icon="passport" onClick={applySingleToForm}>{t.mrzApplyData || l.saveAccepted}</Button>
                  )}
                  <Button variant="secondary" icon="plus" onClick={() => bulkRef.current?.click()}>{l.addPhotos}</Button>
                  <Button variant="success" icon="success" onClick={saveAccepted} disabled={saving || acceptedCount === 0}>
                    {saving ? l.processing : `${saveParticipantsLabel}${acceptedCount ? ` (${acceptedCount})` : ""}`}
                  </Button>
                </>
              ) : (
                <Button variant="secondary" icon="check" onClick={readBulkPassports} disabled={!bulkFiles.length}>
                  {l.continueReview}
                </Button>
              )}
            </div>
          )}
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
