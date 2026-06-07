import { getProgramKind } from "./participantTerminology";

const normalizeLanguage = (language = "ar") => (
  language === "fr" || language === "en" ? language : "ar"
);

const clean = (value) => String(value || "").trim();

const firstValue = (...values) => {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
};

const normalizeText = (value) => clean(value)
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[ـًٌٍَُِّْ]/g, "")
  .replace(/[إأآا]/g, "ا")
  .replace(/ى/g, "ي")
  .replace(/ة/g, "ه")
  .replace(/\s+/g, " ");

const PROGRAM_TYPE_LABELS = {
  umrah: { ar: "عمرة", fr: "Omra", en: "Umrah" },
  hajj: { ar: "حج", fr: "Hajj", en: "Hajj" },
};

const PROGRAM_PACKAGE_LABELS = {
  umrah: { ar: "باقة العمرة", fr: "Forfait Omra", en: "Umrah Package" },
  hajj: { ar: "باقة الحج", fr: "Forfait Hajj", en: "Hajj Package" },
};

const LEVEL_LABELS = [
  {
    labels: { ar: "سياحي بالإفطار", fr: "Touristique avec petit-déjeuner", en: "Tourist with breakfast" },
    aliases: ["سياحي بالإفطار", "سياحي بالافطار", "tourist with breakfast", "touristique avec petit dejeuner"],
  },
  {
    labels: { ar: "اقتصادي", fr: "Économique", en: "Economy" },
    aliases: ["اقتصادي", "economy", "economique", "économique"],
  },
  {
    labels: { ar: "سياحي", fr: "Touristique", en: "Tourist" },
    aliases: ["سياحي", "tourist", "touristique"],
  },
  {
    labels: { ar: "متوسط", fr: "Standard", en: "Standard" },
    aliases: ["متوسط", "متوسطة", "standard"],
  },
  {
    labels: { ar: "فاخر", fr: "Luxe", en: "Luxury" },
    aliases: ["فاخر", "فاخرة", "luxe", "luxury", "deluxe"],
  },
  {
    labels: { ar: "خمس نجوم", fr: "5 étoiles", en: "5 stars" },
    aliases: ["خمس نجوم", "5 نجوم", "5 stars", "5 star", "five stars", "5 etoiles", "5 étoiles"],
  },
  {
    labels: { ar: "VIP", fr: "VIP", en: "VIP" },
    aliases: ["vip"],
  },
];

const ROOM_TYPE_LABELS = [
  {
    labels: { ar: "فردية", fr: "Simple", en: "Single" },
    aliases: ["single", "simple", "فردية", "فردي", "غرفة مفردة"],
  },
  {
    labels: { ar: "ثنائية", fr: "Double", en: "Double" },
    aliases: ["double", "twin", "ثنائية", "ثنائي", "غرفة ثنائية", "غرفة مزدوجة"],
  },
  {
    labels: { ar: "ثلاثية", fr: "Triple", en: "Triple" },
    aliases: ["triple", "ثلاثية", "ثلاثي", "غرفة ثلاثية"],
  },
  {
    labels: { ar: "رباعية", fr: "Quadruple", en: "Quadruple" },
    aliases: ["quad", "quadruple", "رباعية", "رباعي", "غرفة رباعية"],
  },
  {
    labels: { ar: "خماسية", fr: "Quintuple", en: "Quintuple" },
    aliases: ["quint", "quintuple", "خماسية", "خماسي", "غرفة خماسية"],
  },
];

const findLocalizedValue = (items, value, language) => {
  const text = normalizeText(value);
  if (!text) return "";
  const match = items.find((item) => item.aliases.some((alias) => normalizeText(alias) === text));
  return match ? match.labels[normalizeLanguage(language)] : clean(value);
};

const getDocumentProgramKind = (program = {}) => {
  if (typeof program === "string") {
    return getProgramKind({ type: program, name: program }, null, {
      allowNameFallback: true,
      defaultKind: "umrah",
    });
  }

  return getProgramKind({
    ...program,
    type: firstValue(
      program.type,
      program.program_type,
      program.programType,
      program.programKind,
      program.category
    ),
    name: firstValue(
      program.name,
      program.programName,
      program.title,
      program.nameFr,
      program.name_fr
    ),
  }, null, {
    allowNameFallback: true,
    defaultKind: "umrah",
  });
};

export const formatProgramTypeForDocument = (program = {}, language = "ar") => {
  const lang = normalizeLanguage(language);
  const kind = getDocumentProgramKind(program);
  return PROGRAM_TYPE_LABELS[kind]?.[lang] || PROGRAM_TYPE_LABELS.umrah[lang];
};

export const formatProgramPackageLabelForDocument = (program = {}, language = "ar") => {
  const lang = normalizeLanguage(language);
  const kind = getDocumentProgramKind(program);
  return PROGRAM_PACKAGE_LABELS[kind]?.[lang] || PROGRAM_PACKAGE_LABELS.umrah[lang];
};

export const formatProgramLevelForDocument = (level, language = "ar") => (
  findLocalizedValue(LEVEL_LABELS, level, language)
);

export const formatRoomTypeForDocument = (roomType, language = "ar") => (
  findLocalizedValue(ROOM_TYPE_LABELS, roomType, language)
);
