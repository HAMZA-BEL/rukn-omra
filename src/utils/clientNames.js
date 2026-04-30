const ARABIC_NAME_KEYS = [
  "arabicFullName",
  "fullNameAr",
  "nameAr",
  "arabicName",
];

const DISPLAY_KEYS = [
  "name",
  "displayName",
  "fullName",
];

const LATIN_NAME_KEYS = [
  "nameLatin",
  "latinName",
  "fullNameLatin",
  "displayNameLatin",
  "passportName",
  "passportFullName",
  "passportLatinName",
];

const PASSPORT_LATIN_KEYS = [
  "name",
  "fullName",
  "latinName",
  "passportName",
  "mrzName",
];

const REF_KEYS = [
  "fileRef",
  "file_ref",
  "fileId",
  "file_id",
  "fileNumber",
  "file_number",
  "fileNo",
  "file_no",
  "clientCode",
  "client_code",
  "ticketNo",
  "ticket_no",
  "ref",
  "reference",
  "dossier",
  "dossierNo",
  "dossier_no",
];

const clean = (value) => (typeof value === "string" ? value.trim() : "");

const pick = (client, keys) => {
  for (const key of keys) {
    const value = clean(client?.[key]);
    if (value) return value;
  }
  return "";
};

const join = (...values) => values.map(clean).filter(Boolean).join(" ").trim();

const getCurrentLang = () => {
  if (typeof document === "undefined") return "ar";
  return document.documentElement?.lang || "ar";
};

export const getClientLatinName = (client = {}) => {
  const direct = pick(client, LATIN_NAME_KEYS);
  if (direct) return direct;

  const latinParts = join(
    client.prenom ?? client.latinPrenom ?? client.prenomLatin ?? client.firstNameLatin,
    client.nom ?? client.latinNom ?? client.nomLatin ?? client.lastNameLatin
  );
  if (latinParts) return latinParts;

  const passport = client.passport || {};
  const passportDirect = pick(passport, PASSPORT_LATIN_KEYS);
  if (passportDirect) return passportDirect;

  const passportParts = join(
    passport.givenNames ?? passport.givenName ?? passport.firstName ?? passport.prenom,
    passport.surname ?? passport.lastName ?? passport.nom
  );
  return passportParts;
};

export const getClientArabicName = (client = {}) => {
  const arabicFullName = pick(client, ARABIC_NAME_KEYS);
  if (arabicFullName) return arabicFullName;

  const arabicParts = join(
    client.firstName ?? client.first_name ?? client.arabicFirstName,
    client.lastName ?? client.last_name ?? client.arabicLastName
  );
  if (arabicParts) return arabicParts;

  return pick(client, DISPLAY_KEYS);
};

export const getClientIdentityName = (client = {}, lang = getCurrentLang()) => {
  const latinName = getClientLatinName(client);
  if (lang !== "ar" && latinName) return latinName;

  const arabicName = getClientArabicName(client);
  if (arabicName) return arabicName;
  if (latinName) return latinName;

  return pick(client, DISPLAY_KEYS);
};

export const getClientDisplayName = (client = {}, fallback = "—", lang = getCurrentLang()) => {
  const identity = getClientIdentityName(client, lang);
  if (identity) return identity;

  const phone = clean(client.phone);
  if (phone) return phone;

  const ref = pick(client, REF_KEYS);
  if (ref) return ref;

  const passportNumber = clean(client.passport?.number);
  if (passportNumber) return passportNumber;

  return fallback;
};
