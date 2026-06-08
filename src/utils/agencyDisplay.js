const cleanAgencyName = (value) => String(value || "").trim();

const firstAgencyName = (agency = {}, keys = []) => {
  for (const key of keys) {
    const value = cleanAgencyName(agency?.[key]);
    if (value) return value;
  }
  return "";
};

const ARABIC_NAME_KEYS = [
  "nameAr",
  "agencyNameAr",
  "name_ar",
  "agency_name_ar",
];

const LATIN_NAME_KEYS = [
  "nameFr",
  "agencyNameFr",
  "name_fr",
  "agency_name_fr",
  "nameEn",
  "agencyNameEn",
  "name_en",
  "agency_name_en",
  "latinName",
  "latin_name",
];

const GENERIC_NAME_KEYS = [
  "name",
  "agencyName",
  "agency_name",
  "commercialName",
  "commercial_name",
];

export const getLocalizedAgencyName = (agency = {}, language = "ar", fallback = "") => {
  const arabicName = firstAgencyName(agency, ARABIC_NAME_KEYS);
  const latinName = firstAgencyName(agency, LATIN_NAME_KEYS);
  const genericName = firstAgencyName(agency, GENERIC_NAME_KEYS);
  const localizedName = language === "ar"
    ? arabicName || genericName || latinName
    : latinName || genericName || arabicName;

  return localizedName || cleanAgencyName(fallback);
};
