const NAME_KEYS = [
  "arabicFullName",
  "fullNameAr",
  "nameAr",
  "arabicName",
];

const DISPLAY_KEYS = [
  "name",
  "displayName",
  "fullName",
  "nameLatin",
  "latinName",
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

export const getClientIdentityName = (client = {}) => {
  const arabicFullName = pick(client, NAME_KEYS);
  if (arabicFullName) return arabicFullName;

  const arabicParts = join(
    client.firstName ?? client.first_name ?? client.arabicFirstName,
    client.lastName ?? client.last_name ?? client.arabicLastName
  );
  if (arabicParts) return arabicParts;

  const latinParts = join(
    client.prenom ?? client.latinPrenom ?? client.prenomLatin,
    client.nom ?? client.latinNom ?? client.nomLatin
  );
  if (latinParts) return latinParts;

  return pick(client, DISPLAY_KEYS);
};

export const getClientDisplayName = (client = {}, fallback = "—") => {
  const identity = getClientIdentityName(client);
  if (identity) return identity;

  const phone = clean(client.phone);
  if (phone) return phone;

  const ref = pick(client, REF_KEYS);
  if (ref) return ref;

  const passportNumber = clean(client.passport?.number);
  if (passportNumber) return passportNumber;

  return fallback;
};
