import { getPackageRoomPrice, normalizeProgramPackages, normalizeRoomTypeKey } from "./programPackages";
import { getClientArabicName } from "./clientNames";
import { clientServiceIncludesAccommodation } from "./clientServiceTypes";

export const UNASSIGNED_PROGRAM_FILTER = "__unassigned_program";
export const INCOMPLETE_INFO_FILTER = "__incomplete_info";

const PRICE_KEYS = ["salePrice", "price", "officialPrice", "sale_price", "official_price"];
const ROOM_PRICE_KEYS = ["single", "double", "triple", "quad", "quint"];

const LABELS = {
  ar: {
    unassignedProgram: "غير مدرج في أي برنامج",
    informationIncomplete: "يرجى إكمال المعلومات",
    missingPrefix: "ينقص:",
    missingArabicName: "الاسم",
    missingPhone: "رقم الهاتف",
    missingLevel: "المستوى",
    missingRoomType: "نوع الغرفة",
    missingRoomCategory: "تصنيف الغرفة",
    missingPrice: "السعر",
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
    missingPrefix: "Manquant :",
    missingArabicName: "nom",
    missingPhone: "téléphone",
    missingLevel: "niveau",
    missingRoomType: "type de chambre",
    missingRoomCategory: "classification de chambre",
    missingPrice: "prix",
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
    informationIncomplete: "Please complete information",
    missingPrefix: "Missing:",
    missingArabicName: "name",
    missingPhone: "phone number",
    missingLevel: "level",
    missingRoomType: "room type",
    missingRoomCategory: "room classification",
    missingPrice: "price",
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

const firstText = (...values) => {
  for (const value of values) {
    const textValue = String(value || "").trim();
    if (textValue) return textValue;
  }
  return "";
};

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

const getClientPackageId = (client = {}) => firstText(client.packageId, client.package_id);

const getClientPackageLevel = (client = {}) => firstText(
  client.packageLevel,
  client.package_level,
  client.hotelLevel,
  client.hotel_level,
);

const getClientRoomType = (client = {}) => normalizeRoomTypeKey(firstText(
  client.roomType,
  client.room_type,
  client.roomTypeLabel,
  client.room_type_label,
));

const getSelectedProgramPackage = (client = {}, program = null) => {
  if (!program) return null;
  const packages = normalizeProgramPackages(program);
  if (!packages.length) return null;
  const clientPackageId = getClientPackageId(client);
  const clientLevel = getClientPackageLevel(client);
  return packages.find((pkg) => (
    (clientPackageId && pkg.id === clientPackageId)
    || (clientLevel && pkg.level === clientLevel)
  )) || packages[0] || null;
};

const getProgramDerivedPrice = (client = {}, program = null) => {
  if (!program) return 0;
  const flatPrice = positiveNumber(program.price);
  const selectedPackage = getSelectedProgramPackage(client, program);
  if (!selectedPackage) return flatPrice;
  const clientRoomType = getClientRoomType(client) || "double";
  const roomPrice = getPackageRoomPrice(selectedPackage, clientRoomType);
  return roomPrice || flatPrice;
};

const getClientProgramDetailPresence = (client = {}, program = null) => {
  const rooming = client.docs?.rooming || {};
  const selectedPackage = getSelectedProgramPackage(client, program);
  return {
    selectedPackage,
    hasLevel: hasText(getClientPackageId(client))
      || hasText(getClientPackageLevel(client))
      || hasText(selectedPackage?.id)
      || hasText(selectedPackage?.level)
      || (program ? !programHasExplicitLevels(program) : false),
    hasRoomType: hasText(getClientRoomType(client)) || Boolean(program),
    hasRoomCategory: hasText(client.roomCategory)
      || hasText(client.room_category)
      || hasText(client.roomCategoryLabel)
      || hasText(client.room_category_label)
      || hasText(rooming.category)
      || Boolean(program),
  };
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

export const clientMissingProgramDetails = (client = {}, program = null) => {
  if (!hasProgramAssignment(client)) return false;
  if (!clientServiceIncludesAccommodation(client)) return false;

  const { hasLevel, hasRoomType, hasRoomCategory } = getClientProgramDetailPresence(client, program);
  return !hasLevel || !hasRoomType || !hasRoomCategory;
};

export const clientMissingContactOrArabicName = (client = {}) => {
  const hasArabicParts = (
    hasText(client.firstName) || hasText(client.arabicFirstName) || hasText(client.first_name)
  ) && (
    hasText(client.lastName) || hasText(client.arabicLastName) || hasText(client.last_name)
  );
  const hasArabicName = hasArabicParts || hasText(getClientArabicName(client));
  const hasPhone = hasText(firstText(client.phone, client.phoneNumber, client.mobile, client.telephone));
  return !hasArabicName || !hasPhone;
};

export const clientNeedsCompletion = (client = {}, program = null) => (
  clientMissingProgramDetails(client, program) || clientMissingContactOrArabicName(client)
);

export const getClientMissingCompletionItems = (client = {}, lang = "ar", program = null, options = {}) => {
  const labels = getClientCompletionLabels(lang);
  const items = [];
  const hasArabicParts = (
    hasText(client.firstName) || hasText(client.arabicFirstName) || hasText(client.first_name)
  ) && (
    hasText(client.lastName) || hasText(client.arabicLastName) || hasText(client.last_name)
  );
  const hasArabicName = hasArabicParts || hasText(getClientArabicName(client));
  const hasPhone = hasText(firstText(client.phone, client.phoneNumber, client.mobile, client.telephone));
  if (!hasArabicName) items.push(labels.missingArabicName);
  if (!hasPhone) items.push(labels.missingPhone);

  if (hasProgramAssignment(client) && clientServiceIncludesAccommodation(client)) {
    const { hasLevel, hasRoomType, hasRoomCategory } = getClientProgramDetailPresence(client, program);
    if (!hasLevel) items.push(labels.missingLevel);
    if (!hasRoomType) items.push(labels.missingRoomType);
    if (!hasRoomCategory) items.push(labels.missingRoomCategory);
  }

  if (hasActiveProgramAssignment(client, program)) {
    const eligibility = getClientPaymentEligibility(client, program, options);
    if (eligibility.paymentEligibilityReason === "incomplete_program_info") {
      items.push(labels.missingPrice);
    }
  }

  return Array.from(new Set(items.filter(Boolean)));
};

export const getClientCompletionTooltip = (client = {}, lang = "ar", program = null, options = {}) => {
  const labels = getClientCompletionLabels(lang);
  const items = getClientMissingCompletionItems(client, lang, program, options);
  if (!items.length) return labels.informationIncomplete;
  return `${labels.missingPrefix} ${items.join(lang === "ar" ? "، " : ", ")}`;
};

export const getClientPaymentEligibility = (client = {}, program = null, { referencePrice = 0 } = {}) => {
  if (isUnassignedFromActiveProgram(client, program)) {
    return {
      isAssignedToProgram: false,
      isCommercialInfoComplete: false,
      canAddPayment: false,
      paymentEligibilityReason: "no_program",
      statusPriority: "unassigned_program",
    };
  }

  const needsAccommodation = clientServiceIncludesAccommodation(client);
  const hasKnownPrice = Boolean(
    getClientKnownPrice(client)
    || positiveNumber(referencePrice)
    || (needsAccommodation ? getProgramDerivedPrice(client, program) : 0)
  );
  const selectedPackage = getSelectedProgramPackage(client, program);
  const hasLevel = hasText(getClientPackageId(client)) || hasText(getClientPackageLevel(client)) || hasText(selectedPackage?.id) || hasText(selectedPackage?.level);
  const hasRoomType = hasText(getClientRoomType(client)) || Boolean(program);
  const needsLevel = needsAccommodation && programHasExplicitLevels(program);
  const needsRoomType = needsAccommodation && programPricingDependsOnRoomType(program);
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

export const getClientDisplayStatus = (client = {}, program = null, paymentStatus = "unpaid", options = {}) => {
  const eligibility = getClientPaymentEligibility(client, program, options);
  if (!eligibility.canAddPayment) return eligibility.statusPriority;
  return ["cleared", "partial", "unpaid"].includes(paymentStatus) ? paymentStatus : "unpaid";
};

export const isIncompleteInfo = (client = {}, program = null, options = {}) => (
  getClientPaymentEligibility(client, program, options).paymentEligibilityReason === "incomplete_program_info"
);

export const getClientCompletionBadges = (client = {}, lang = "ar", program = null, options = {}) => {
  const labels = getClientCompletionLabels(lang);
  const badges = [];
  if (isUnassignedFromActiveProgram(client, program)) {
    badges.push({ key: "unassigned_program", label: labels.unassignedProgram, tone: "muted" });
  }
  if (clientNeedsCompletion(client, program)) {
    badges.push({
      key: "information_incomplete",
      label: labels.informationIncomplete,
      tone: "warning",
      title: getClientCompletionTooltip(client, lang, program, options),
      missingItems: getClientMissingCompletionItems(client, lang, program, options),
    });
  }
  return badges;
};
