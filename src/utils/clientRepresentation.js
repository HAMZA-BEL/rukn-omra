import { calculateAgeAtDate } from "./age";
import { getClientDisplayName } from "./clientNames";

const clean = (value) => (typeof value === "string" ? value.trim() : "");

const firstText = (...values) => {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
};

export const REPRESENTED_BY_RELATIONSHIPS = [
  { value: "father", label: { ar: "أب", fr: "Père", en: "Father" } },
  { value: "mother", label: { ar: "أم", fr: "Mère", en: "Mother" } },
  { value: "guardian", label: { ar: "وصي", fr: "Tuteur", en: "Guardian" } },
  { value: "brother", label: { ar: "أخ", fr: "Frère", en: "Brother" } },
  { value: "sister", label: { ar: "أخت", fr: "Sœur", en: "Sister" } },
  { value: "husband", label: { ar: "زوج", fr: "Mari", en: "Husband" } },
  { value: "wife", label: { ar: "زوجة", fr: "Épouse", en: "Wife" } },
  { value: "relative", label: { ar: "قريب", fr: "Proche", en: "Relative" } },
  { value: "other", label: { ar: "آخر", fr: "Autre", en: "Other" } },
];

const RELATIONSHIP_VALUE_BY_LABEL = REPRESENTED_BY_RELATIONSHIPS.reduce((acc, item) => {
  Object.values(item.label).forEach((label) => {
    acc[clean(label).toLowerCase()] = item.value;
  });
  acc[item.value] = item.value;
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
  const name = getClientDisplayName(client) || client.name || client.id || "";
  const cin = getClientCin(client);
  if (cin) return `${name} — CIN: ${cin}`;
  if (isClientAdult(client)) {
    const adult = lang === "fr" ? "Adulte" : lang === "en" ? "Adult" : "بالغ";
    return `${name} — ${adult}`;
  }
  return name;
};

export const sortRepresentativeOptions = (items = []) => (
  [...items].sort((left, right) => {
    const leftCin = clientHasCin(left) ? 1 : 0;
    const rightCin = clientHasCin(right) ? 1 : 0;
    if (leftCin !== rightCin) return rightCin - leftCin;
    const leftAdult = isClientAdult(left) ? 1 : 0;
    const rightAdult = isClientAdult(right) ? 1 : 0;
    if (leftAdult !== rightAdult) return rightAdult - leftAdult;
    return String(getClientDisplayName(left)).localeCompare(String(getClientDisplayName(right)), "ar");
  })
);

export const getSameProgramRepresentativeOptions = ({
  clients = [],
  programId = "",
  currentClientId = "",
  referenceDate = new Date(),
} = {}) => sortRepresentativeOptions(
  clients.filter((item) => (
    item
    && String(item.id || "") !== String(currentClientId || "")
    && String(item.programId || item.program_id || "") === String(programId || "")
    && item.deleted !== true
    && !item.deletedAt
    && !item.deleted_at
    && item.archived !== true
    && !item.archivedAt
    && !item.archived_at
    && isClientAdult(item, referenceDate)
  ))
);
