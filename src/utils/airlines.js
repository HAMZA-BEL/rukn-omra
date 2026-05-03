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
