export const AIRLINES_STORAGE_KEY = "rukn_airlines_v1";

export const DEFAULT_AIRLINES = [
  { name: "الخطوط الملكية المغربية", code: "AT" },
  { name: "الخطوط السعودية", code: "SV" },
];

export const normalizeAirlineCode = (value) => String(value || "").trim().toUpperCase();

export const isValidAirlineCode = (value) => /^[A-Z]{2}$/.test(normalizeAirlineCode(value));

export const formatAirlineLabel = (airline) => {
  if (!airline?.name && !airline?.code) return "";
  const code = normalizeAirlineCode(airline.code);
  return code ? `${airline.name || code} (${code})` : airline.name || "";
};

const DOCUMENT_AIRLINES = [
  {
    codes: ["AT"],
    labels: { ar: "الخطوط الملكية المغربية", fr: "Royal Air Maroc", en: "Royal Air Maroc" },
    aliases: ["الخطوط الملكية المغربية", "الملكية المغربية", "royal air maroc", "royal maroc", "ram"],
  },
  {
    codes: ["SV"],
    labels: { ar: "الخطوط السعودية", fr: "Saudia", en: "Saudia" },
    aliases: ["الخطوط السعودية", "السعودية", "saudia", "saudi arabian airlines", "saudi airlines"],
  },
  {
    codes: ["XY"],
    labels: { ar: "طيران ناس", fr: "Flynas", en: "Flynas" },
    aliases: ["طيران ناس", "ناس", "flynas", "nas air"],
  },
  {
    codes: ["TK"],
    labels: { ar: "الخطوط التركية", fr: "Turkish Airlines", en: "Turkish Airlines" },
    aliases: ["الخطوط التركية", "التركية", "turkish airlines", "turkish airline"],
  },
  {
    codes: ["MS"],
    labels: { ar: "مصر للطيران", fr: "EgyptAir", en: "EgyptAir" },
    aliases: ["مصر للطيران", "مصر الطيران", "egyptair", "egypt air"],
  },
  {
    codes: ["QR"],
    labels: { ar: "الخطوط القطرية", fr: "Qatar Airways", en: "Qatar Airways" },
    aliases: ["الخطوط القطرية", "القطرية", "qatar airways", "qatar airway"],
  },
  {
    codes: ["MNS", "MN"],
    labels: { ar: "مناسك للطيران", fr: "Manasik Aviation", en: "Manasik Aviation" },
    aliases: ["مناسك للطيران", "مناسك", "manasik aviation", "manasik"],
  },
  {
    codes: ["EK"],
    labels: { ar: "طيران الإمارات", fr: "Emirates", en: "Emirates" },
    aliases: ["طيران الإمارات", "الامارات", "الإمارات", "emirates"],
  },
  {
    codes: ["EY"],
    labels: { ar: "الاتحاد للطيران", fr: "Etihad Airways", en: "Etihad Airways" },
    aliases: ["الاتحاد للطيران", "الاتحاد", "etihad airways", "etihad"],
  },
  {
    codes: ["G9"],
    labels: { ar: "العربية للطيران", fr: "Air Arabia", en: "Air Arabia" },
    aliases: ["العربية للطيران", "العربية", "air arabia"],
  },
  {
    codes: ["PC"],
    labels: { ar: "طيران بيغاسوس", fr: "Pegasus Airlines", en: "Pegasus Airlines" },
    aliases: ["طيران بيغاسوس", "بيغاسوس", "pegasus airlines", "pegasus"],
  },
];

const normalizeDocumentAirlineText = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/[إأآا]/g, "ا")
  .replace(/ى/g, "ي")
  .replace(/ة/g, "ه")
  .replace(/\s+/g, " ");

const stripTrailingAirlineCode = (value) => (
  String(value || "").trim().replace(/\s*\(([A-Za-z0-9]{2,3})\)\s*$/, "").trim()
);

const getDocumentLanguage = (language = "ar") => (
  language === "fr" || language === "en" ? language : "ar"
);

export const formatAirlineNameForDocument = (value, language = "ar") => {
  const lang = getDocumentLanguage(language);
  const rawCode = typeof value === "object"
    ? normalizeAirlineCode(value?.code || value?.airlineCode || value?.carrierCode)
    : "";
  const rawName = typeof value === "object"
    ? String(value?.name || value?.airlineName || value?.transport || "").trim()
    : String(value || "").trim();
  const parenCode = normalizeAirlineCode(String(rawName).match(/\(([A-Za-z0-9]{2,3})\)\s*$/)?.[1]);
  const codeOnly = normalizeAirlineCode(/^[A-Za-z0-9]{2,3}$/.test(rawName) ? rawName : "");
  const code = rawCode || parenCode || codeOnly;
  const cleanedName = stripTrailingAirlineCode(rawName);
  const normalizedName = normalizeDocumentAirlineText(cleanedName);
  const match = DOCUMENT_AIRLINES.find((airline) => (
    airline.codes.includes(code)
    || airline.aliases.some((alias) => normalizeDocumentAirlineText(alias) === normalizedName)
  ));
  if (match) return match.labels[lang] || match.labels.ar;
  return cleanedName;
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

export const loadCustomAirlines = () => {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(AIRLINES_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((airline) => ({
        name: String(airline?.name || "").trim(),
        code: normalizeAirlineCode(airline?.code),
      }))
      .filter((airline) => airline.name && isValidAirlineCode(airline.code));
  } catch {
    return [];
  }
};

export const saveCustomAirlines = (airlines = []) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AIRLINES_STORAGE_KEY, JSON.stringify(airlines));
};

export const getAirlineOptions = () => {
  const byCode = new Map();
  [...DEFAULT_AIRLINES, ...loadCustomAirlines()].forEach((airline) => {
    const code = normalizeAirlineCode(airline.code);
    if (!code || byCode.has(code)) return;
    byCode.set(code, { name: airline.name, code });
  });
  return Array.from(byCode.values());
};

export const addCustomAirline = ({ name, code }) => {
  const cleanName = String(name || "").trim();
  const cleanCode = normalizeAirlineCode(code);
  if (!cleanName || !isValidAirlineCode(cleanCode)) return { error: "invalid" };
  const all = getAirlineOptions();
  if (all.some((airline) => airline.code === cleanCode)) return { error: "duplicate" };
  const next = [...loadCustomAirlines(), { name: cleanName, code: cleanCode }];
  saveCustomAirlines(next);
  return { airline: { name: cleanName, code: cleanCode }, airlines: getAirlineOptions() };
};

export const resolveAirline = (value, options = getAirlineOptions()) => {
  if (!value) return null;
  if (typeof value === "object") {
    const code = normalizeAirlineCode(value.code || value.airlineCode || value.carrierCode);
    const name = String(value.name || value.airlineName || value.transport || "").trim();
    if (isValidAirlineCode(code)) {
      const found = options.find((airline) => airline.code === code);
      return found || { name: name || code, code };
    }
    return resolveAirline(name, options);
  }

  const text = String(value || "").trim();
  const codeMatch = text.match(/\(([A-Za-z]{2})\)|\b([A-Za-z]{2})\b/);
  const code = normalizeAirlineCode(codeMatch?.[1] || codeMatch?.[2]);
  if (isValidAirlineCode(code)) {
    const found = options.find((airline) => airline.code === code);
    return found || { name: text.replace(/\([^)]+\)/, "").trim() || code, code };
  }

  const clean = normalizeText(text);
  const found = options.find((airline) => normalizeText(airline.name) === clean);
  if (found) return found;
  if (clean.includes("السعودية") || clean.includes("saudia") || clean.includes("saudi")) {
    return options.find((airline) => airline.code === "SV") || DEFAULT_AIRLINES[1];
  }
  if (clean.includes("الملكية") || clean.includes("المغربية") || clean.includes("royal") || clean.includes("maroc")) {
    return options.find((airline) => airline.code === "AT") || DEFAULT_AIRLINES[0];
  }
  return null;
};

export const getProgramAirline = (program, options = getAirlineOptions()) => {
  const direct = resolveAirline({
    code: program?.airlineCode || program?.carrierCode,
    name: program?.airlineName,
    transport: program?.transport,
  }, options);
  return direct || resolveAirline(program?.transport || program?.carrier || program?.airline || program?.company, options);
};
