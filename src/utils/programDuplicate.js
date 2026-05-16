import { normalizeHotelCheckinDay, normalizeVisitOrder } from "./hotelDates";

export const getProgramDepartureYear = (program) => {
  const departure = String(program?.departure || "").trim();
  if (!departure) return null;
  const match = departure.match(/(\d{4})/);
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
};

export const normalizeProgramType = (value) => {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "عمرة";
  if (text.includes("حج") || text.includes("hajj") || text.includes("hadj")) return "حج";
  if (text.includes("عمرة") || text.includes("umrah") || text.includes("omra") || text.includes("omrah")) return "عمرة";
  return "عمرة";
};

const deepCloneProgramConfigValue = (value) => {
  if (value === undefined || value === null) return value;
  if (typeof structuredClone === "function") {
    try { return structuredClone(value); } catch (error) { void error; }
  }
  try { return JSON.parse(JSON.stringify(value)); } catch (error) {
    if (Array.isArray(value)) return value.map((item) => deepCloneProgramConfigValue(item));
    if (typeof value === "object") return { ...value };
    return value;
  }
};

export const normalizeDuplicateProgramName = (value) => String(value || "").trim();

export const buildDuplicateProgramName = (program = {}, programs = [], lang = "ar") => {
  const originalName = normalizeDuplicateProgramName(program.name) || (
    lang === "fr" ? "Programme" : lang === "en" ? "Program" : "برنامج"
  );
  const suffix = lang === "ar" ? "نسخة" : "Copy";
  const names = new Set((programs || []).map((item) => normalizeDuplicateProgramName(item?.name)).filter(Boolean));
  const first = `${originalName} - ${suffix}`;
  if (!names.has(first)) return first;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${originalName} - ${suffix} ${index}`;
    if (!names.has(candidate)) return candidate;
  }
  return `${originalName} - ${suffix} ${Date.now()}`;
};

export const isDuplicateProgramNameAvailable = (name, programs = []) => {
  const cleanName = normalizeDuplicateProgramName(name);
  return Boolean(cleanName) && !(programs || []).some((program) => normalizeDuplicateProgramName(program?.name) === cleanName);
};

export const createDuplicateProgramPayload = (program = {}, newName = "") => {
  const source = program || {};
  const payload = {
    name: normalizeDuplicateProgramName(newName),
    type: normalizeProgramType(source.type),
    duration: source.duration || "",
    departure: source.departure || "",
    returnDate: source.returnDate || "",
    visitOrder: normalizeVisitOrder(source.visitOrder || source.visit_order),
    hotelCheckinDay: normalizeHotelCheckinDay(source.hotelCheckinDay || source.hotel_checkin_day),
    price: Number(source.price || 0),
    seats: Number(source.seats || 0),
    transport: source.transport || "",
    airlineCode: source.airlineCode || "",
    airlineName: source.airlineName || "",
    mealPlan: source.mealPlan || "",
    hotelMecca: source.hotelMecca || "",
    hotelMadina: source.hotelMadina || "",
    guidePhone: source.guidePhone || "",
    saudiPhone1: source.saudiPhone1 || "",
    saudiPhone2: source.saudiPhone2 || "",
    badgeNote: source.badgeNote || "",
    badgeTemplateId: source.badgeTemplateId || "",
    notes: source.notes || "",
    priceTable: deepCloneProgramConfigValue(Array.isArray(source.priceTable) ? source.priceTable : []),
    deleted: false,
    deletedAt: null,
    deletedBatchId: null,
    status: "active",
  };
  if (source.nameFr) payload.nameFr = normalizeDuplicateProgramName(newName);
  if (source.currency) payload.currency = source.currency;
  if (source.city) payload.city = source.city;
  if (source.departureCity) payload.departureCity = source.departureCity;
  return payload;
};

export const buildDuplicateProgramCopy = createDuplicateProgramPayload;

export const getUsedProgramYears = (programs = []) => Array.from(
  new Set((programs || []).map(getProgramDepartureYear).filter((year) => Number.isFinite(year)))
).sort((a, b) => a - b);

export const ensureUniqueProgramName = (name, programs = []) => isDuplicateProgramNameAvailable(name, programs);
