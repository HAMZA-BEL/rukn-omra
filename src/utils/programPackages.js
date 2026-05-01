export const PROGRAM_ROOM_PRICE_KEYS = ["single", "double", "triple", "quad", "quint"];
const LEGACY_NON_ROOM_PRICE_KEYS = ["child", "infant"];
const ROOM_TYPE_LABELS = {
  single: "فردية",
  double: "ثنائية",
  triple: "ثلاثية",
  quad: "رباعية",
  quint: "خماسية",
  child: "طفل",
  infant: "رضيع",
};
const LEGACY_ROOM_TYPE_KEYS = {
  "غرفة مفردة": "single",
  "فردية": "single",
  "غرفة رباعية": "quad",
  "رباعية": "quad",
  "غرفة ثلاثية": "triple",
  "ثلاثية": "triple",
  "غرفة مزدوجة": "double",
  "ثنائية": "double",
  "غرفة ثنائية": "double",
  "طفل": "child",
  "رضيع": "infant",
  "غرفة خماسية": "quint",
  "خماسية": "quint",
};

const isPlainObject = (value) => value && typeof value === "object" && !Array.isArray(value);

const cleanText = (value, fallback = "") => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
};

const toPriceValue = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : "";
};

const toNonNegativeInteger = (value) => {
  if (value === "" || value === null || value === undefined) return 0;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
};

const collectValidPrices = (packages = []) => packages.flatMap((pkg) => {
  const prices = isPlainObject(pkg?.prices) ? pkg.prices : {};
  return PROGRAM_ROOM_PRICE_KEYS
    .map((key) => Number(prices[key]))
    .filter((value) => Number.isFinite(value) && value > 0);
});

export const normalizeRoomTypeKey = (roomType) => {
  if (typeof roomType !== "string") return "";
  const normalized = roomType.trim();
  if (!normalized) return "";
  if (ROOM_TYPE_LABELS[normalized]) return normalized;
  return LEGACY_ROOM_TYPE_KEYS[normalized] || normalized;
};

export const getRoomTypeLabel = (roomType) => {
  const key = normalizeRoomTypeKey(roomType);
  return ROOM_TYPE_LABELS[key] || roomType || "";
};

export const getRoomTypeOptions = () => PROGRAM_ROOM_PRICE_KEYS.map((key) => ({
  value: key,
  label: ROOM_TYPE_LABELS[key],
}));

export const getPackageRoomPrice = (pkg, roomType) => {
  if (!isPlainObject(pkg?.prices)) return 0;
  const key = normalizeRoomTypeKey(roomType);
  const value = Number(pkg.prices[key]);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

export const getPackageStartingPrice = (pkg) => {
  const prices = collectValidPrices([pkg]);
  return prices.length ? Math.min(...prices) : 0;
};

const normalizePackage = (pkg, index, program = {}) => {
  const sourcePrices = isPlainObject(pkg?.prices) ? pkg.prices : {};
  const prices = {};
  [...PROGRAM_ROOM_PRICE_KEYS, ...LEGACY_NON_ROOM_PRICE_KEYS].forEach((key) => {
    const value = toPriceValue(sourcePrices[key]);
    if (value !== "") prices[key] = value;
  });

  return {
    id: cleanText(pkg?.id, `pkg-${index + 1}`),
    level: cleanText(pkg?.level || pkg?.name, program.type || "أساسي"),
    hotelMecca: cleanText(pkg?.hotelMecca, program.hotelMecca || ""),
    hotelMadina: cleanText(pkg?.hotelMadina, program.hotelMadina || ""),
    madinahNights: toNonNegativeInteger(pkg?.madinahNights ?? pkg?.madinah_nights),
    mealPlan: cleanText(pkg?.mealPlan, program.mealPlan || ""),
    notes: cleanText(pkg?.notes, ""),
    prices,
  };
};

export function normalizeProgramPackages(program = {}) {
  const raw = Array.isArray(program.priceTable) ? program.priceTable : [];
  const packages = raw
    .filter(isPlainObject)
    .map((pkg, index) => normalizePackage(pkg, index, program))
    .filter((pkg) => (
      pkg.level ||
      pkg.hotelMecca ||
      pkg.hotelMadina ||
      pkg.mealPlan ||
      Object.keys(pkg.prices || {}).length > 0
    ));

  if (packages.length) return packages;

  const fallbackPrice = toPriceValue(program.price);
  const fallbackPrices = fallbackPrice !== "" ? { double: fallbackPrice } : {};
  return [{
    id: "legacy-default",
    level: cleanText(program.type, "أساسي"),
    hotelMecca: cleanText(program.hotelMecca, ""),
    hotelMadina: cleanText(program.hotelMadina, ""),
    mealPlan: cleanText(program.mealPlan, ""),
    notes: cleanText(program.notes, ""),
    prices: fallbackPrices,
    legacy: true,
  }];
}

export function getProgramPriceRange(program = {}) {
  const prices = collectValidPrices(normalizeProgramPackages(program));
  if (!prices.length) return { min: 0, max: 0 };
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

export function getProgramStartingPrice(program = {}) {
  return getProgramPriceRange(program).min;
}

export function getProgramPackageCount(program = {}) {
  return normalizeProgramPackages(program).length;
}

export function getLegacyFieldsFromPackages(packages = [], fallbackProgram = {}) {
  const normalized = (Array.isArray(packages) ? packages : [])
    .filter(isPlainObject)
    .map((pkg, index) => normalizePackage(pkg, index, fallbackProgram));
  const first = normalized[0] || normalizeProgramPackages(fallbackProgram)[0] || {};
  const range = getProgramPriceRange({ ...fallbackProgram, priceTable: normalized });

  return {
    hotelMecca: first.hotelMecca || fallbackProgram.hotelMecca || "",
    hotelMadina: first.hotelMadina || fallbackProgram.hotelMadina || "",
    mealPlan: first.mealPlan || fallbackProgram.mealPlan || "",
    price: range.min || 0,
  };
}
