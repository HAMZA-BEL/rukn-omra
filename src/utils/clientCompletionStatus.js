import { getPackageRoomPrice, normalizeProgramPackages, normalizeRoomTypeKey } from "./programPackages";

export const UNASSIGNED_PROGRAM_FILTER = "__unassigned_program";
export const INCOMPLETE_INFO_FILTER = "__incomplete_info";

const PRICE_KEYS = ["salePrice", "price", "officialPrice", "sale_price", "official_price"];
const ROOM_PRICE_KEYS = ["single", "double", "triple", "quad", "quint"];

const LABELS = {
  ar: {
    unassignedProgram: "غير مدرج في أي برنامج",
    informationIncomplete: "يرجى إكمال المعلومات",
    unassignedFilter: "غير مدرجين في أي برنامج",
    incompleteFilter: "معلومات ناقصة",
    importAction: "استيراد",
    excelImport: "استيراد من Excel",
    passportImport: "استيراد الجوازات",
    deletedProgram: "البرنامج السابق محذوف",
    deletedProgramShort: "محذوف",
    filter: "فلتر",
    paymentNotEligible: "غير مؤهل لإضافة دفعة",
    programInfoIncomplete: "معلومات البرنامج ناقصة",
    noProgramPaymentBlocked: "لا يمكن إضافة دفعة لأن المعتمر غير مدرج في أي برنامج.",
    incompleteProgramPaymentBlocked: "يرجى إكمال معلومات المعتمر أولًا، مثل المستوى ونوع الغرفة، قبل إضافة دفعة.",
    noProgramPaymentPanel: "لم يُدرج هذا المعتمر في أي برنامج بعد، لذلك لا يمكن إضافة دفعة.",
    incompleteProgramPaymentPanel: "يجب إكمال المستوى ونوع الغرفة/السعر قبل إضافة دفعة.",
  },
  fr: {
    unassignedProgram: "Non affecté à un programme",
    informationIncomplete: "Informations à compléter",
    unassignedFilter: "Non affectés à un programme",
    incompleteFilter: "Infos incomplètes",
    importAction: "Importer",
    excelImport: "Importer depuis Excel",
    passportImport: "Importer les passeports",
    deletedProgram: "Programme précédent supprimé",
    deletedProgramShort: "supprimé",
    filter: "Filtre",
    paymentNotEligible: "Non éligible au paiement",
    programInfoIncomplete: "Informations du programme incomplètes",
    noProgramPaymentBlocked: "Impossible d’ajouter un paiement car le pèlerin n’est affecté à aucun programme.",
    incompleteProgramPaymentBlocked: "Veuillez compléter les informations du pèlerin, comme le niveau et le type de chambre, avant d’ajouter un paiement.",
    noProgramPaymentPanel: "Ce pèlerin n’est affecté à aucun programme, le paiement ne peut pas être ajouté.",
    incompleteProgramPaymentPanel: "Le niveau, le type de chambre et le prix doivent être complétés avant d’ajouter un paiement.",
  },
  en: {
    unassignedProgram: "Not assigned to a program",
    informationIncomplete: "Information needs completion",
    unassignedFilter: "Not assigned to a program",
    incompleteFilter: "Incomplete info",
    importAction: "Import",
    excelImport: "Import from Excel",
    passportImport: "Import passports",
    deletedProgram: "Previous program deleted",
    deletedProgramShort: "deleted",
    filter: "Filter",
    paymentNotEligible: "Not eligible for payment",
    programInfoIncomplete: "Program information incomplete",
    noProgramPaymentBlocked: "Cannot add a payment because the pilgrim is not assigned to any program.",
    incompleteProgramPaymentBlocked: "Please complete the pilgrim information, such as level and room type, before adding a payment.",
    noProgramPaymentPanel: "This pilgrim is not assigned to any program yet, so a payment cannot be added.",
    incompleteProgramPaymentPanel: "Level, room type, and price must be completed before adding a payment.",
  },
};

const hasText = (value) => String(value || "").trim().length > 0;

export const getClientCompletionLabels = (lang) => LABELS[lang] || LABELS.ar;

export const getClientProgramId = (client = {}) => (
  String(client.programId || client.program_id || "").trim()
);

export const hasProgramAssignment = (client = {}) => (
  hasText(getClientProgramId(client))
);

export const hasActiveProgramAssignment = (client = {}, program = null) => (
  hasProgramAssignment(client) && Boolean(program?.id)
);

export const isAssignedToActiveProgram = hasActiveProgramAssignment;

export const isUnassignedFromActiveProgram = (client = {}, program = null) => (
  !isAssignedToActiveProgram(client, program)
);

const positiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const getClientKnownPrice = (client = {}) => {
  for (const key of PRICE_KEYS) {
    const price = positiveNumber(client[key]);
    if (price) return price;
  }
  return 0;
};

const getProgramDerivedPrice = (client = {}, program = null) => {
  if (!program) return 0;
  const flatPrice = positiveNumber(program.price);
  const packages = normalizeProgramPackages(program);
  const clientLevel = String(client.packageLevel || client.hotelLevel || "").trim();
  const clientPackageId = String(client.packageId || "").trim();
  const clientRoomType = normalizeRoomTypeKey(client.roomType || client.roomTypeLabel || "");
  const selectedPackage = packages.find((pkg) => (
    (clientPackageId && pkg.id === clientPackageId)
    || (clientLevel && pkg.level === clientLevel)
  )) || (packages.length === 1 ? packages[0] : null);
  if (!selectedPackage) return flatPrice;
  const roomPrice = getPackageRoomPrice(selectedPackage, clientRoomType);
  return roomPrice || flatPrice;
};

const getProgramPackages = (program = {}) => (
  Array.isArray(program?.priceTable) ? program.priceTable.filter(Boolean) : []
);

const programHasExplicitLevels = (program = {}) => (
  getProgramPackages(program).some((pkg) => hasText(pkg?.level) || hasText(pkg?.name))
);

const programPricingDependsOnRoomType = (program = {}) => (
  getProgramPackages(program).some((pkg) => {
    const prices = pkg?.prices || {};
    return ROOM_PRICE_KEYS.some((key) => positiveNumber(prices[key]));
  })
);

export const isUnassignedClient = (client = {}) => !hasProgramAssignment(client);

const getDeletedProgramSnapshot = (client = {}) => client.docs?.deletedProgramSnapshot || null;

export const hasDeletedProgramContext = (client = {}) => {
  const snapshot = getDeletedProgramSnapshot(client);
  return Boolean(snapshot?.programName || snapshot?.programNameFr || snapshot?.originalProgramId);
};

export const getClientDeletedProgramLabel = (client = {}, lang = "ar") => {
  const labels = getClientCompletionLabels(lang);
  const snapshot = getDeletedProgramSnapshot(client) || {};
  const name = snapshot.programName || snapshot.programNameFr || "";
  return name ? `${name} (${labels.deletedProgramShort})` : labels.deletedProgram;
};

export const clientMissingProgramDetails = (client = {}) => {
  if (!hasProgramAssignment(client)) return false;
  const rooming = client.docs?.rooming || {};
  const hasLevel = hasText(client.packageId) || hasText(client.packageLevel) || hasText(client.hotelLevel);
  const hasRoomType = hasText(client.roomType) || hasText(client.roomTypeLabel);
  const hasRoomCategory = hasText(client.roomCategory) || hasText(client.roomCategoryLabel) || hasText(rooming.category);
  return !hasLevel || !hasRoomType || !hasRoomCategory;
};

export const clientMissingContactOrArabicName = (client = {}) => {
  const hasArabicFirst = hasText(client.firstName) || hasText(client.arabicFirstName) || hasText(client.first_name);
  const hasArabicLast = hasText(client.lastName) || hasText(client.arabicLastName) || hasText(client.last_name);
  return !hasArabicFirst || !hasArabicLast || !hasText(client.phone);
};

export const clientNeedsCompletion = (client = {}) => (
  clientMissingProgramDetails(client) || clientMissingContactOrArabicName(client)
);

export const getClientPaymentEligibility = (client = {}, program = null) => {
  if (isUnassignedFromActiveProgram(client, program)) {
    return {
      isAssignedToProgram: false,
      isCommercialInfoComplete: false,
      canAddPayment: false,
      paymentEligibilityReason: "no_program",
      statusPriority: "unassigned_program",
    };
  }

  const hasKnownPrice = Boolean(getClientKnownPrice(client) || getProgramDerivedPrice(client, program));
  const hasLevel = hasText(client.packageId) || hasText(client.packageLevel) || hasText(client.hotelLevel);
  const hasRoomType = hasText(client.roomType) || hasText(client.roomTypeLabel);
  const needsLevel = programHasExplicitLevels(program);
  const needsRoomType = programPricingDependsOnRoomType(program);
  const isCommercialInfoComplete = hasKnownPrice
    || ((!needsLevel || hasLevel) && (!needsRoomType || hasRoomType) && hasKnownPrice);

  if (!isCommercialInfoComplete) {
    return {
      isAssignedToProgram: true,
      isCommercialInfoComplete: false,
      canAddPayment: false,
      paymentEligibilityReason: "incomplete_program_info",
      statusPriority: "information_incomplete",
    };
  }

  return {
    isAssignedToProgram: true,
    isCommercialInfoComplete: true,
    canAddPayment: true,
    paymentEligibilityReason: "ok",
    statusPriority: "payment_status",
  };
};

export const getClientDisplayStatus = (client = {}, program = null, paymentStatus = "unpaid") => {
  const eligibility = getClientPaymentEligibility(client, program);
  if (!eligibility.canAddPayment) return eligibility.statusPriority;
  return ["cleared", "partial", "unpaid"].includes(paymentStatus) ? paymentStatus : "unpaid";
};

export const isIncompleteInfo = (client = {}, program = null) => (
  getClientPaymentEligibility(client, program).paymentEligibilityReason === "incomplete_program_info"
);

export const getClientCompletionBadges = (client = {}, lang = "ar", program = null) => {
  const labels = getClientCompletionLabels(lang);
  const badges = [];
  if (isUnassignedFromActiveProgram(client, program)) {
    badges.push({ key: "unassigned_program", label: labels.unassignedProgram, tone: "muted" });
  }
  if (clientNeedsCompletion(client)) {
    badges.push({ key: "information_incomplete", label: labels.informationIncomplete, tone: "warning" });
  }
  return badges;
};
