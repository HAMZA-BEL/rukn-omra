import { calculateAgeAtDate } from "./age";
import { getClientDisplayName } from "./clientNames";
import relationshipDefinitions from "../data/clientRepresentationRelationships.json";

const clean = (value) => (typeof value === "string" ? value.trim() : "");

export const normalizeRepresentativeScopeId = (value) => (
  value === null || value === undefined ? "" : String(value).trim()
);

const firstScopeId = (...values) => {
  for (const value of values) {
    const normalized = normalizeRepresentativeScopeId(value);
    if (normalized) return normalized;
  }
  return "";
};

const firstText = (...values) => {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
};

export const REPRESENTED_BY_RELATIONSHIPS = relationshipDefinitions;

const RELATIONSHIP_VALUE_BY_LABEL = REPRESENTED_BY_RELATIONSHIPS.reduce((acc, item) => {
  Object.values(item.label || {}).forEach((label) => {
    acc[clean(label).toLowerCase()] = item.value;
  });
  if (item.nusukValue) acc[clean(item.nusukValue).toLowerCase()] = item.value;
  acc[clean(item.value).toLowerCase()] = item.value;
  return acc;
}, {});

export const normalizeRepresentativeRelationship = (value) => {
  const text = clean(value);
  if (!text) return "";
  return RELATIONSHIP_VALUE_BY_LABEL[text.toLowerCase()] || text;
};

export const getRepresentativeRelationshipLabel = (value, lang = "ar") => {
  const normalized = normalizeRepresentativeRelationship(value);
  return REPRESENTED_BY_RELATIONSHIPS.find((item) => item.value === normalized)?.label?.[lang] || value || "";
};

export const getRepresentativeRelationshipDefinition = (value) => {
  const normalized = normalizeRepresentativeRelationship(value);
  return REPRESENTED_BY_RELATIONSHIPS.find((item) => item.value === normalized) || null;
};

export const normalizeClientGender = (value) => {
  const normalized = clean(value).toLowerCase();
  if (normalized === "male" || normalized === "m" || normalized === "ذكر") return "male";
  if (normalized === "female" || normalized === "f" || normalized === "أنثى") return "female";
  return "";
};

export const getRelationshipsForCompanionGender = (gender) => {
  const normalizedGender = normalizeClientGender(gender);
  if (!normalizedGender) return [];
  return REPRESENTED_BY_RELATIONSHIPS
    .filter((item) => (
      item.legacy !== true
      && Array.isArray(item.allowedCompanionGenders)
      && item.allowedCompanionGenders.includes(normalizedGender)
    ))
    .slice()
    .sort((left, right) => (
      Number(left.genderOrder?.[normalizedGender] || Number.MAX_SAFE_INTEGER)
      - Number(right.genderOrder?.[normalizedGender] || Number.MAX_SAFE_INTEGER)
    ));
};

export const isRepresentativeRelationshipAllowedForGender = (relationshipValue, gender) => {
  const definition = getRepresentativeRelationshipDefinition(relationshipValue);
  const normalizedGender = normalizeClientGender(gender);
  return Boolean(
    definition
    && definition.legacy !== true
    && normalizedGender
    && Array.isArray(definition.allowedCompanionGenders)
    && definition.allowedCompanionGenders.includes(normalizedGender)
  );
};

export const reconcileRepresentativeRelationshipForCompanionGender = (relationshipValue, gender) => (
  isRepresentativeRelationshipAllowedForGender(relationshipValue, gender)
    ? normalizeRepresentativeRelationship(relationshipValue)
    : ""
);

export const getRepresentativeRelationshipFieldState = ({
  companionId = "",
  companionSelectable = false,
  companionGender = "",
  relationshipValue = "",
} = {}) => {
  const normalizedCompanionId = normalizeRepresentativeScopeId(companionId);
  const normalizedGender = normalizeClientGender(companionGender);
  let disabledReason = "";
  if (!normalizedCompanionId) disabledReason = "missing_companion";
  else if (!normalizedGender) disabledReason = "missing_gender";
  else if (!companionSelectable) disabledReason = "ineligible_companion";
  const enabled = !disabledReason;
  return {
    enabled,
    disabled: !enabled,
    disabledReason,
    gender: normalizedGender,
    relationshipCompatible: !relationshipValue
      || Boolean(
        normalizedGender
        && isRepresentativeRelationshipAllowedForGender(relationshipValue, normalizedGender)
      ),
  };
};

export const getClientCin = (client = {}) => {
  const passport = client.passport || {};
  return firstText(
    client.cin,
    client.CIN,
    client.nationalId,
    client.national_id,
    passport.cin,
    passport.nationalId
  );
};

export const clientHasCin = (client = {}) => Boolean(getClientCin(client));

export const getClientBirthDate = (client = {}) => {
  const passport = client.passport || {};
  return firstText(passport.birthDate, passport.birth_date, client.birthDate, client.birth_date, client.dateOfBirth);
};

export const getClientPassportNumber = (client = {}) => firstText(
  client.passport?.number,
  client.passport?.passportNumber,
  client.passportNumber,
  client.passport_number,
  client.passportNo,
  client.passport_no,
  client.docs?.passportNumber
);

export const getClientGender = (client = {}) => {
  return normalizeClientGender(firstText(client.gender, client.passport?.gender));
};

export const getClientAge = (client = {}, referenceDate = new Date()) => (
  calculateAgeAtDate(getClientBirthDate(client), referenceDate)
);

export const isClientMinor = (client = {}, referenceDate = new Date()) => {
  const age = getClientAge(client, referenceDate);
  return age !== null && age < 18;
};

export const isClientAdult = (client = {}, referenceDate = new Date()) => {
  const age = getClientAge(client, referenceDate);
  return age !== null && age >= 18;
};

export const isClientMinorWithoutCin = (client = {}, referenceDate = new Date()) => (
  !clientHasCin(client) && isClientMinor(client, referenceDate)
);

export const isClientAdultWithoutCin = (client = {}, referenceDate = new Date()) => (
  !clientHasCin(client) && isClientAdult(client, referenceDate)
);

export const getRepresentedByClientId = (client = {}) => firstText(
  client.representedByClientId,
  client.represented_by_client_id,
  client.guardianClientId,
  client.guardian_client_id,
  client.docs?.representedByClientId,
  client.docs?.guardianClientId
);

export const isEligibleRepresentative = (client = {}, referenceDate = new Date()) => (
  clientHasCin(client) || isClientAdult(client, referenceDate)
);

export const getRepresentativeLabel = (client = {}, lang = "ar") => {
  const name = getClientDisplayName(client, "", lang) || client.name || client.id || "";
  const cin = getClientCin(client);
  if (cin) return `${name} — CIN: ${cin}`;
  if (isClientAdult(client)) {
    const adult = lang === "fr" ? "Adulte" : lang === "en" ? "Adult" : "بالغ";
    return `${name} — ${adult}`;
  }
  return name;
};

export const sortRepresentativeOptions = (items = [], lang = "ar") => (
  [...items].sort((left, right) => {
    const leftCin = clientHasCin(left) ? 1 : 0;
    const rightCin = clientHasCin(right) ? 1 : 0;
    if (leftCin !== rightCin) return rightCin - leftCin;
    const leftAdult = isClientAdult(left) ? 1 : 0;
    const rightAdult = isClientAdult(right) ? 1 : 0;
    if (leftAdult !== rightAdult) return rightAdult - leftAdult;
    return String(getClientDisplayName(left, "", lang)).localeCompare(String(getClientDisplayName(right, "", lang)), lang === "fr" ? "fr" : lang === "en" ? "en" : "ar");
  })
);

const INACTIVE_CLIENT_STATUSES = new Set(["inactive", "archived", "deleted"]);

export const REPRESENTATIVE_DISABLED_REASON_LABELS = Object.freeze({
  missing_birth_date: {
    ar: "تاريخ الميلاد غير مسجل",
    fr: "Date de naissance non renseignée",
    en: "Birth date is missing",
  },
  missing_gender: {
    ar: "الجنس غير مسجل",
    fr: "Sexe non renseigné",
    en: "Gender is missing",
  },
  minor: {
    ar: "قاصر — لا يمكن اختياره مرافقًا",
    fr: "Mineur — ne peut pas être choisi comme accompagnateur",
    en: "Minor — cannot be selected as a companion",
  },
  missing_passport: {
    ar: "رقم الجواز غير مسجل",
    fr: "Numéro de passeport non renseigné",
    en: "Passport number is missing",
  },
  inactive: {
    ar: "العميل غير نشط",
    fr: "Client inactif",
    en: "Client is inactive",
  },
  travel_group_mismatch: {
    ar: "ليس ضمن فوج السفر الحالي",
    fr: "Ne fait pas partie du groupe de voyage actuel",
    en: "Not in the current travel group",
  },
});

export const getRepresentativeDisabledReasonLabel = (reason, lang = "ar") => (
  REPRESENTATIVE_DISABLED_REASON_LABELS[reason]?.[lang]
  || REPRESENTATIVE_DISABLED_REASON_LABELS[reason]?.ar
  || ""
);

export const evaluateRepresentativeEligibility = (client = {}, {
  agencyId = "",
  programId = "",
  travelGroupId,
  enforceTravelGroup = false,
  currentClientId = "",
  referenceDate = new Date(),
} = {}) => {
  const clientId = normalizeRepresentativeScopeId(client?.id);
  const expectedAgencyId = normalizeRepresentativeScopeId(agencyId);
  const clientAgencyId = firstScopeId(client?.agencyId, client?.agency_id);
  const expectedProgramId = normalizeRepresentativeScopeId(programId);
  const clientProgramId = firstScopeId(client?.programId, client?.program_id);
  const expectedTravelGroupId = normalizeRepresentativeScopeId(travelGroupId);
  const clientTravelGroupId = firstScopeId(client?.travelGroupId, client?.travel_group_id);
  const age = getClientAge(client, referenceDate);
  const gender = getClientGender(client);
  const status = clean(client?.status).toLowerCase();
  const isSelf = Boolean(clientId && clientId === normalizeRepresentativeScopeId(currentClientId));
  // Missing agency metadata is accepted because store.clients is already scoped by
  // authenticated agency/RLS; an explicit conflicting agency is never accepted.
  const sameAgency = !expectedAgencyId || !clientAgencyId || clientAgencyId === expectedAgencyId;
  const sameProgram = clientProgramId === expectedProgramId;
  const sameTravelGroup = !enforceTravelGroup
    || !expectedTravelGroupId
    || clientTravelGroupId === expectedTravelGroupId;
  const isDeleted = client?.deleted === true
    || Boolean(client?.deletedAt || client?.deleted_at)
    || status === "deleted";
  const isArchived = client?.archived === true
    || Boolean(client?.archivedAt || client?.archived_at)
    || status === "archived";
  const isActive = !isDeleted
    && !isArchived
    && client?.active !== false
    && client?.isActive !== false
    && client?.is_active !== false
    && !INACTIVE_CLIENT_STATUSES.has(status);
  const isAdult = age !== null && age >= 18;
  const hasPassport = Boolean(getClientPassportNumber(client));

  let hiddenReason = "";
  if (!clientId) hiddenReason = "missing_client_id";
  else if (isSelf) hiddenReason = "self_candidate";
  else if (!sameAgency) hiddenReason = "agency_mismatch";
  else if (!sameProgram) hiddenReason = "program_mismatch";
  else if (isDeleted) hiddenReason = "deleted_client";
  else if (isArchived) hiddenReason = "archived_client";

  let disabledReason = "";
  if (!hiddenReason) {
    if (age === null) disabledReason = "missing_birth_date";
    else if (!gender) disabledReason = "missing_gender";
    else if (!isAdult) disabledReason = "minor";
    else if (!hasPassport) disabledReason = "missing_passport";
    else if (!isActive) disabledReason = "inactive";
    else if (!sameTravelGroup) disabledReason = "travel_group_mismatch";
  }

  const visible = !hiddenReason;
  const selectable = visible && !disabledReason;

  return {
    client,
    clientId,
    sameAgency,
    sameProgram,
    sameTravelGroup,
    isAdult,
    isActive,
    hasPassport,
    gender,
    isSelf,
    isDeleted,
    isArchived,
    hiddenReason,
    disabledReason,
    excludedReason: hiddenReason || disabledReason,
    visible,
    selectable,
    eligible: selectable,
  };
};

export const getRepresentativeEligibilityDiagnostics = ({ clients = [], ...scope } = {}) => (
  clients.map((client) => {
    const { client: _client, ...diagnostic } = evaluateRepresentativeEligibility(client, scope);
    return diagnostic;
  })
);

export const getRepresentativeCandidateOptions = ({
  clients = [],
  lang = "ar",
  ...scope
} = {}) => {
  const visibleCandidates = clients
    .map((client) => evaluateRepresentativeEligibility(client, scope))
    .filter((candidate) => candidate.visible);
  const candidateById = new Map(visibleCandidates.map((candidate) => [candidate.clientId, candidate]));
  return sortRepresentativeOptions(
    visibleCandidates.map((candidate) => candidate.client),
    lang
  ).map((client) => candidateById.get(normalizeRepresentativeScopeId(client.id)));
};

export const getSameProgramRepresentativeOptions = ({
  clients = [],
  agencyId = "",
  programId = "",
  travelGroupId,
  enforceTravelGroup = false,
  currentClientId = "",
  referenceDate = new Date(),
  lang = "ar",
} = {}) => {
  return getRepresentativeCandidateOptions({
    clients,
    agencyId,
    programId,
    travelGroupId,
    enforceTravelGroup,
    currentClientId,
    referenceDate,
    lang,
  }).filter((candidate) => candidate.selectable).map((candidate) => candidate.client);
};
