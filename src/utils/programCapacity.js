import { getProgramKind } from "./participantTerminology";

export const PROGRAM_CAPACITY_REACHED = "PROGRAM_CAPACITY_REACHED";
export const PROGRAM_CAPACITY_BELOW_REGISTRATION = "PROGRAM_CAPACITY_BELOW_REGISTRATION";

const DATABASE_CAPACITY_MESSAGES = {
  [PROGRAM_CAPACITY_REACHED]: {
    ar: "اكتملت سعة هذا البرنامج ولا يمكن إضافة معتمر آخر.",
    fr: "La capacité de ce programme est atteinte. Aucun autre client ne peut être ajouté.",
    en: "This program has reached capacity. Another client cannot be added.",
  },
  [PROGRAM_CAPACITY_BELOW_REGISTRATION]: {
    ar: "لا يمكن خفض سعة البرنامج إلى أقل من عدد المعتمرين المسجلين.",
    fr: "La capacité du programme ne peut pas être inférieure au nombre de clients inscrits.",
    en: "Program capacity cannot be lower than the number of registered clients.",
  },
};

export const getProgramCapacityDatabaseErrorCode = (error) => {
  if (!error) return "";
  const values = typeof error === "string"
    ? [error]
    : [error.capacityCode, error.code, error.message, error.details, error.hint];
  const haystack = values.filter(Boolean).join(" ").toUpperCase();
  if (haystack.includes(PROGRAM_CAPACITY_BELOW_REGISTRATION)) {
    return PROGRAM_CAPACITY_BELOW_REGISTRATION;
  }
  if (haystack.includes(PROGRAM_CAPACITY_REACHED)) {
    return PROGRAM_CAPACITY_REACHED;
  }
  return "";
};

export const isProgramCapacityDatabaseError = (error) => (
  Boolean(getProgramCapacityDatabaseErrorCode(error))
);

export const getProgramCapacityDatabaseErrorMessage = (error, lang = "ar") => {
  const code = getProgramCapacityDatabaseErrorCode(error);
  if (!code) return "";
  const normalizedLang = ["ar", "fr", "en"].includes(lang) ? lang : "ar";
  return DATABASE_CAPACITY_MESSAGES[code]?.[normalizedLang]
    || DATABASE_CAPACITY_MESSAGES[code]?.ar
    || "";
};

export const normalizeProgramCapacityDatabaseError = (error) => {
  const capacityCode = getProgramCapacityDatabaseErrorCode(error);
  if (!capacityCode) return error;
  return {
    ...(typeof error === "object" && error ? error : {}),
    code: capacityCode,
    capacityCode,
    postgresCode: typeof error === "object" ? error?.code : undefined,
    message: getProgramCapacityDatabaseErrorMessage(capacityCode, "ar"),
  };
};

const clampCount = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.floor(number);
};

const normalizeId = (value) => String(value ?? "").trim();

export const getCapacityProgramId = (programOrId = {}) => normalizeId(
  typeof programOrId === "object"
    ? (programOrId.id ?? programOrId.programId ?? programOrId.program_id)
    : programOrId
);

export const getCapacityClientProgramId = (client = {}) => normalizeId(
  client.programId ?? client.program_id
);

export const isCapacityActiveClient = (client = {}) => {
  if (!client) return false;
  const status = String(client.status || "").trim().toLowerCase();
  return !client.deleted
    && !client.deletedAt
    && !client.deleted_at
    && !client.archived
    && !client.archivedAt
    && !client.archived_at
    && status !== "deleted"
    && status !== "archived"
    && status !== "trashed";
};

export const getProgramCapacity = (program = {}) => {
  const raw = program?.seats ?? program?.capacity ?? program?.programCapacity ?? program?.program_capacity;
  return clampCount(raw);
};

export const getProgramRegisteredCount = (program = {}, registeredSource) => {
  if (typeof registeredSource === "number") return clampCount(registeredSource);

  const programId = getCapacityProgramId(program);
  if (Array.isArray(registeredSource)) {
    if (!programId) return 0;
    return registeredSource.filter((client) => (
      isCapacityActiveClient(client)
      && getCapacityClientProgramId(client) === programId
    )).length;
  }

  return clampCount(
    program?.registeredCount
      ?? program?.registered_count
      ?? program?.clientsCount
      ?? program?.clients_count
  );
};

export const getProgramCapacityInfo = (program = {}, registeredSource, countToAdd = 1) => {
  const capacity = getProgramCapacity(program);
  const registeredCount = getProgramRegisteredCount(program, registeredSource);
  const hasCapacity = capacity > 0;
  const remainingSeats = hasCapacity ? Math.max(capacity - registeredCount, 0) : null;
  const requestedCount = clampCount(countToAdd);

  return {
    registeredCount,
    capacity,
    hasCapacity,
    remainingSeats,
    requestedCount,
    isProgramFull: hasCapacity && registeredCount >= capacity,
    canAddClients: (nextCount = requestedCount) => (
      !hasCapacity || registeredCount + clampCount(nextCount) <= capacity
    ),
    canAddRequested: !hasCapacity || registeredCount + requestedCount <= capacity,
  };
};

export const canAddClientsToProgram = (program = {}, countToAdd = 1, registeredSource) => (
  getProgramCapacityInfo(program, registeredSource, countToAdd).canAddRequested
);

export const formatProgramCapacityValue = (program = {}, registeredSource) => {
  const info = getProgramCapacityInfo(program, registeredSource);
  return info.hasCapacity
    ? `${info.registeredCount}/${info.capacity}`
    : String(info.registeredCount);
};

export const getProgramCapacityDeltaForClientChange = ({
  targetProgramId,
  previousClient = null,
  nextClient = null,
} = {}) => {
  const targetId = normalizeId(targetProgramId ?? getCapacityClientProgramId(nextClient));
  if (!targetId) return 0;
  const previousProgramId = getCapacityClientProgramId(previousClient);
  const nextProgramId = getCapacityClientProgramId(nextClient);
  if (nextProgramId !== targetId) return 0;
  return previousProgramId === targetId ? 0 : 1;
};

const FALLBACK_MESSAGES = {
  ar: {
    programCapacityFullAddUmrah: "البرنامج ممتلئ. زد عدد المقاعد لإضافة معتمرين جدد.",
    programCapacityFullAddHajj: "البرنامج ممتلئ. زد عدد المقاعد لإضافة حجاج جدد.",
    programCapacityAddExceeded: "لا يمكن إضافة هذا العدد. المقاعد المتبقية: {remaining} فقط.",
    programCapacityBulkImportExceeded: "لا يمكن استيراد هذا العدد. المقاعد المتبقية: {remaining} فقط.",
    programCapacityFullImport: "البرنامج ممتلئ. زد عدد المقاعد قبل الاستيراد.",
    programCapacityFullTransferUmrah: "لا يمكن نقل المعتمر. البرنامج الهدف ممتلئ. زد عدد المقاعد أولا.",
    programCapacityFullTransferHajj: "لا يمكن نقل الحاج. البرنامج الهدف ممتلئ. زد عدد المقاعد أولا.",
    programCapacityBulkTransferExceeded: "لا يمكن نقل هذا العدد. المقاعد المتبقية في البرنامج الهدف: {remaining} فقط.",
  },
  fr: {
    programCapacityFullAddUmrah: "Le programme est complet. Augmentez le nombre de places pour ajouter de nouveaux pèlerins.",
    programCapacityFullAddHajj: "Le programme est complet. Augmentez le nombre de places pour ajouter de nouveaux pèlerins du Hajj.",
    programCapacityAddExceeded: "Impossible d’ajouter ce nombre. Places restantes : {remaining} seulement.",
    programCapacityBulkImportExceeded: "Impossible d’importer ce nombre. Places restantes : {remaining} seulement.",
    programCapacityFullImport: "Le programme est complet. Augmentez le nombre de places avant l’importation.",
    programCapacityFullTransferUmrah: "Impossible de déplacer le pèlerin. Le programme cible est complet. Augmentez d’abord le nombre de places.",
    programCapacityFullTransferHajj: "Impossible de déplacer le pèlerin du Hajj. Le programme cible est complet. Augmentez d’abord le nombre de places.",
    programCapacityBulkTransferExceeded: "Impossible de déplacer ce nombre. Places restantes dans le programme cible : {remaining} seulement.",
  },
  en: {
    programCapacityFullAddUmrah: "The program is full. Increase the number of seats to add new pilgrims.",
    programCapacityFullAddHajj: "The program is full. Increase the number of seats to add new Hajj pilgrims.",
    programCapacityAddExceeded: "Cannot add this number. Remaining seats: only {remaining}.",
    programCapacityBulkImportExceeded: "Cannot import this number. Remaining seats: only {remaining}.",
    programCapacityFullImport: "The program is full. Increase the number of seats before importing.",
    programCapacityFullTransferUmrah: "Cannot move the pilgrim. The target program is full. Increase the number of seats first.",
    programCapacityFullTransferHajj: "Cannot move the Hajj pilgrim. The target program is full. Increase the number of seats first.",
    programCapacityBulkTransferExceeded: "Cannot move this number. Remaining seats in the target program: only {remaining}.",
  },
};

const interpolate = (template, vars = {}) => Object.entries(vars).reduce(
  (text, [name, value]) => String(text).replaceAll(`{${name}}`, String(value ?? "")),
  String(template || "")
);

const getMessageTemplate = (messages = {}, lang = "ar", key) => (
  messages?.[key]
  || FALLBACK_MESSAGES[lang]?.[key]
  || FALLBACK_MESSAGES.ar[key]
  || ""
);

export const getProgramCapacityMessage = ({
  program = {},
  lang = "ar",
  messages = {},
  action = "add",
  countToAdd = 1,
  remainingSeats = 0,
} = {}) => {
  const normalizedLang = ["ar", "fr", "en"].includes(lang) ? lang : "ar";
  const remaining = Math.max(0, clampCount(remainingSeats));
  const requestedCount = clampCount(countToAdd);
  const kind = getProgramKind(program, null, { defaultKind: "umrah" }) === "hajj" ? "Hajj" : "Umrah";
  let key = `programCapacityFullAdd${kind}`;

  if (action === "import") {
    key = remaining <= 0 ? "programCapacityFullImport" : "programCapacityBulkImportExceeded";
  } else if (action === "transfer") {
    key = remaining > 0 && requestedCount > remaining
      ? "programCapacityBulkTransferExceeded"
      : `programCapacityFullTransfer${kind}`;
  } else if (remaining > 0 && requestedCount > remaining) {
    key = "programCapacityAddExceeded";
  }

  return interpolate(getMessageTemplate(messages, normalizedLang, key), { remaining });
};
