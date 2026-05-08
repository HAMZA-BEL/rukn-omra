export const UNASSIGNED_PROGRAM_FILTER = "__unassigned_program";
export const INCOMPLETE_INFO_FILTER = "__incomplete_info";

const LABELS = {
  ar: {
    unassignedProgram: "لم يُدرج في أي برنامج",
    informationIncomplete: "يرجى إكمال المعلومات",
    unassignedFilter: "غير مدرجين في برنامج",
    incompleteFilter: "معلومات ناقصة",
    passportImport: "استيراد الجوازات",
  },
  fr: {
    unassignedProgram: "Non affecté à un programme",
    informationIncomplete: "Informations à compléter",
    unassignedFilter: "Non affectés",
    incompleteFilter: "Infos incomplètes",
    passportImport: "Import passeports",
  },
  en: {
    unassignedProgram: "Not assigned to a program",
    informationIncomplete: "Information needs completion",
    unassignedFilter: "Unassigned",
    incompleteFilter: "Incomplete info",
    passportImport: "Passport import",
  },
};

const hasText = (value) => String(value || "").trim().length > 0;

export const getClientCompletionLabels = (lang) => LABELS[lang] || LABELS.ar;

export const hasProgramAssignment = (client = {}) => (
  hasText(client.programId) || hasText(client.program_id)
);

export const isUnassignedClient = (client = {}) => !hasProgramAssignment(client);

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

export const getClientCompletionBadges = (client = {}, lang = "ar") => {
  const labels = getClientCompletionLabels(lang);
  const badges = [];
  if (isUnassignedClient(client)) {
    badges.push({ key: "unassigned_program", label: labels.unassignedProgram, tone: "muted" });
  }
  if (clientNeedsCompletion(client)) {
    badges.push({ key: "information_incomplete", label: labels.informationIncomplete, tone: "warning" });
  }
  return badges;
};
