import { getPackageRoomPrice, normalizeProgramPackages, normalizeRoomTypeKey } from "./programPackages";
import { getClientArabicName } from "./clientNames";
import { clientServiceIncludesAccommodation } from "./clientServiceTypes";

export const UNASSIGNED_PROGRAM_FILTER = "__unassigned_program";
export const INCOMPLETE_INFO_FILTER = "__incomplete_info";

const PRICE_KEYS = ["salePrice", "price", "officialPrice", "sale_price", "official_price"];
const ROOM_PRICE_KEYS = ["single", "double", "triple", "quad", "quint", "kamal"];

const LABELS = {
  ar: {
    unassignedProgram: "غير مدرج في أي برنامج",
    informationIncomplete: "معلومات غير مكتملة",
    missingPrefix: "ينقص:",
    missingArabicName: "الاسم",
    missingPhone: "رقم الهاتف",
    missingHotel: "الفندق",
    missingLevel: "المستوى",
    missingRoomType: "نوع الغرفة",
    missingRoomCategory: "تصنيف الغرفة",
    missingPrice: "السعر",
    unassignedFilter: "غير مدرجين في أي برنامج",
    incompleteFilter: "غير مكتملة",
    importAction: "استيراد",
    excelImport: "استيراد من Excel",
    passportImport: "استيراد الجوازات",
    deletedProgram: "البرنامج السابق محذوف",
    deletedProgramShort: "محذوف",
    filter: "فلتر",
    paymentNotEligible: "غير مؤهل لإضافة دفعة",
    programInfoIncomplete: "معلومات البرنامج ناقصة",
    noProgramPaymentBlocked: "لا يمكن إضافة دفعة لأن المعتمر غير مدرج في أي برنامج.",
    incompleteProgramPaymentBlocked: "يرجى إكمال معلومات المعتمر أولًا، مثل الفندق والمستوى ونوع الغرفة، قبل إضافة دفعة.",
    noProgramPaymentPanel: "لم يُدرج هذا المعتمر في أي برنامج بعد، لذلك لا يمكن إضافة دفعة.",
    incompleteProgramPaymentPanel: "يجب إكمال الفندق والمستوى ونوع الغرفة/السعر قبل إضافة دفعة.",
  },
  fr: {
    unassignedProgram: "Non affecté à un programme",
    informationIncomplete: "Informations incomplètes",
    missingPrefix: "Manquant :",
    missingArabicName: "nom",
    missingPhone: "téléphone",
    missingHotel: "hôtel",
    missingLevel: "niveau",
    missingRoomType: "type de chambre",
    missingRoomCategory: "classification de chambre",
    missingPrice: "prix",
    unassignedFilter: "Non affectés à un programme",
    incompleteFilter: "Incomplets",
    importAction: "Importer",
    excelImport: "Importer depuis Excel",
    passportImport: "Importer les passeports",
    deletedProgram: "Programme précédent supprimé",
    deletedProgramShort: "supprimé",
    filter: "Filtre",
    paymentNotEligible: "Non éligible au paiement",
    programInfoIncomplete: "Informations du programme incomplètes",
    noProgramPaymentBlocked: "Impossible d’ajouter un paiement car le pèlerin n’est affecté à aucun programme.",
    incompleteProgramPaymentBlocked: "Veuillez compléter les informations du pèlerin, comme l’hôtel, le niveau et le type de chambre, avant d’ajouter un paiement.",
    noProgramPaymentPanel: "Ce pèlerin n’est affecté à aucun programme, le paiement ne peut pas être ajouté.",
    incompleteProgramPaymentPanel: "L’hôtel, le niveau, le type de chambre et le prix doivent être complétés avant d’ajouter un paiement.",
  },
  en: {
    unassignedProgram: "Not assigned to a program",
    informationIncomplete: "Incomplete information",
    missingPrefix: "Missing:",
    missingArabicName: "name",
    missingPhone: "phone number",
    missingHotel: "hotel",
    missingLevel: "level",
    missingRoomType: "room type",
    missingRoomCategory: "room classification",
    missingPrice: "price",
    unassignedFilter: "Not assigned to a program",
    incompleteFilter: "Incomplete",
    importAction: "Import",
    excelImport: "Import from Excel",
    passportImport: "Import passports",
    deletedProgram: "Previous program deleted",
    deletedProgramShort: "deleted",
    filter: "Filter",
    paymentNotEligible: "Not eligible for payment",
    programInfoIncomplete: "Program information incomplete",
    noProgramPaymentBlocked: "Cannot add a payment because the pilgrim is not assigned to any program.",
    incompleteProgramPaymentBlocked: "Please complete the pilgrim information, such as hotel, level, and room type, before adding a payment.",
    noProgramPaymentPanel: "This pilgrim is not assigned to any program yet, so a payment cannot be added.",
    incompleteProgramPaymentPanel: "Hotel, level, room type, and price must be completed before adding a payment.",
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

const getClientSelectedHotel = (client = {}) => firstText(
  client.hotel,
  client.hotelName,
  client.hotel_name,
  client.hotelMecca,
  client.hotel_mecca,
  client.hotelMakkah,
  client.hotel_makkah,
  client.hotelMadina,
  client.hotel_madina,
  client.hotelMedina,
  client.hotel_medina,
);

const getClientRoomType = (client = {}) => normalizeRoomTypeKey(firstText(
  client.roomType,
  client.room_type,
  client.roomTypeLabel,
  client.room_type_label,
));

const getSelectedProgramPackage = (client = {}, program = null, { fallbackToFirst = false } = {}) => {
  if (!program) return null;
  const packages = normalizeProgramPackages(program);
  if (!packages.length) return null;
  const clientPackageId = getClientPackageId(client);
  const clientLevel = getClientPackageLevel(client);
  return packages.find((pkg) => (
    (clientPackageId && pkg.id === clientPackageId)
    || (clientLevel && pkg.level === clientLevel)
  )) || (fallbackToFirst ? packages[0] : null);
};

const getProgramDerivedPrice = (client = {}, program = null) => {
  if (!program) return 0;
  const flatPrice = positiveNumber(program.price);
  const selectedPackage = getSelectedProgramPackage(client, program);
  if (!selectedPackage) return flatPrice;
  const clientRoomType = getClientRoomType(client);
  if (!clientRoomType) return 0;
  const roomPrice = getPackageRoomPrice(selectedPackage, clientRoomType);
  return roomPrice || flatPrice;
};

const getClientProgramDetailPresence = (client = {}, program = null) => {
  const rooming = client.docs?.rooming || {};
  const selectedPackage = getSelectedProgramPackage(client, program);
  return {
    selectedPackage,
    hasHotel: hasText(getClientSelectedHotel(client))
      || hasText(selectedPackage?.hotelMecca)
      || hasText(selectedPackage?.hotel_mecca)
      || hasText(selectedPackage?.hotelMakkah)
      || hasText(selectedPackage?.hotel_makkah)
      || hasText(selectedPackage?.hotelMadina)
      || hasText(selectedPackage?.hotel_madina)
      || hasText(selectedPackage?.hotelMedina)
      || hasText(selectedPackage?.hotel_medina),
    hasLevel: !programHasExplicitLevels(program) || hasText(getClientPackageId(client))
      || hasText(getClientPackageLevel(client))
      || hasText(selectedPackage?.id)
      || hasText(selectedPackage?.level),
    hasRoomType: hasText(getClientRoomType(client)),
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

export const getClientAssignmentStatus = (client = {}, program = null, options = {}) => {
  if (isUnassignedFromActiveProgram(client, program)) {
    return {
      isComplete: false,
      missingFields: ["program"],
      shouldCalculatePrice: false,
    };
  }

  const needsAccommodation = clientServiceIncludesAccommodation(client);
  const missingFields = [];
  const detailPresence = getClientProgramDetailPresence(client, program);

  if (needsAccommodation) {
    if (!detailPresence.hasHotel) missingFields.push("hotel");
    if (!detailPresence.hasLevel) missingFields.push("level");
    if (!detailPresence.hasRoomType) missingFields.push("roomType");
    if (!detailPresence.hasRoomCategory) missingFields.push("roomCategory");
  }

  const bookingInfoComplete = missingFields.length === 0;
  const knownPrice = needsAccommodation && !bookingInfoComplete
    ? 0
    : (
      getClientKnownPrice(client)
      || positiveNumber(options.officialPrice)
      || positiveNumber(options.standaloneSalePrice)
      || positiveNumber(options.referencePrice)
      || (needsAccommodation ? getProgramDerivedPrice(client, program) : 0)
    );

  if (bookingInfoComplete && !knownPrice) missingFields.push("price");

  const uniqueMissingFields = Array.from(new Set(missingFields));
  const isComplete = uniqueMissingFields.length === 0;
  return {
    isComplete,
    missingFields: uniqueMissingFields,
    shouldCalculatePrice: isComplete,
  };
};

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
  return !getClientAssignmentStatus(client, program).isComplete;
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
  const activeAssignmentStatus = hasActiveProgramAssignment(client, program)
    ? getClientAssignmentStatus(client, program, options)
    : null;
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
    const assignmentStatus = activeAssignmentStatus || getClientAssignmentStatus(client, program, options);
    const labelByField = {
      hotel: labels.missingHotel,
      level: labels.missingLevel,
      roomType: labels.missingRoomType,
      roomCategory: labels.missingRoomCategory,
      price: labels.missingPrice,
    };
    assignmentStatus.missingFields.forEach((field) => {
      if (labelByField[field]) items.push(labelByField[field]);
    });
  }

  if (hasActiveProgramAssignment(client, program)) {
    const eligibility = getClientPaymentEligibility(client, program, options);
    if (
      eligibility.paymentEligibilityReason === "incomplete_program_info"
      && activeAssignmentStatus?.missingFields.includes("price")
    ) {
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

export const getClientPaymentEligibility = (client = {}, program = null, { referencePrice = 0, standaloneSalePrice = 0, officialPrice = 0 } = {}) => {
  if (isUnassignedFromActiveProgram(client, program)) {
    return {
      isAssignedToProgram: false,
      isCommercialInfoComplete: false,
      canAddPayment: false,
      paymentEligibilityReason: "no_program",
      statusPriority: "unassigned_program",
    };
  }

  const assignmentStatus = getClientAssignmentStatus(client, program, { referencePrice, standaloneSalePrice, officialPrice });
  const isCommercialInfoComplete = assignmentStatus.isComplete;

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
  if (clientNeedsCompletion(client, program) || isIncompleteInfo(client, program, options)) {
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
