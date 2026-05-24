import {
  getPackageRoomPrice,
  getPackageStartingPrice,
  normalizeProgramPackages,
  PROGRAM_ROOM_PRICE_KEYS,
} from "../../../utils/programPackages";
import { buildPosterTravelRoute } from "../../../utils/programRoutes";

const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "ماي",
  "يونيو",
  "يوليوز",
  "غشت",
  "شتنبر",
  "أكتوبر",
  "نونبر",
  "دجنبر",
];

const POSTER_ROOM_TYPES = ["double", "triple", "quad", "quint"];

const cleanText = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const toPositiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const getPackageSortPrice = (pkg) => toPositiveNumber(getPackageStartingPrice(pkg));

export const getProgramPosterLevels = (program = {}) => (
  normalizeProgramPackages(program)
    .map((pkg, index) => ({
      pkg,
      index,
      price: getPackageSortPrice(pkg),
    }))
    .sort((a, b) => {
      const aHasPrice = a.price > 0;
      const bHasPrice = b.price > 0;
      if (aHasPrice && bHasPrice && a.price !== b.price) return a.price - b.price;
      if (aHasPrice !== bHasPrice) return aHasPrice ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ pkg }) => pkg)
);

export const getProgramPosterLevelsCount = (program = {}) => getProgramPosterLevels(program).length;

const formatPosterNumber = (value) => {
  const number = toPositiveNumber(value);
  if (!number) return "";
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 0,
  }).format(number);
};

const formatPosterMoneyNumber = (value, lang = "ar") => {
  const number = toPositiveNumber(value);
  if (!number) return "";
  return new Intl.NumberFormat(lang === "en" ? "en-US" : "de-DE", {
    maximumFractionDigits: 0,
  }).format(number);
};

const formatPosterStartingPrice = (value, lang = "ar") => {
  const amount = formatPosterMoneyNumber(value, lang);
  if (!amount) return "";
  if (lang === "fr") return `${amount} DH`;
  if (lang === "en") return `${amount} MAD`;
  return `${amount} درهم`;
};

const getProgramStartingPrice = (levels = []) => {
  const prices = levels.flatMap((pkg) => {
    const sourcePrices = pkg?.prices && typeof pkg.prices === "object" ? pkg.prices : {};
    return PROGRAM_ROOM_PRICE_KEYS
      .map((key) => toPositiveNumber(sourcePrices[key]))
      .filter(Boolean);
  });
  return prices.length ? Math.min(...prices) : 0;
};

const parseDateParts = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      day: value.getDate(),
      month: value.getMonth() + 1,
      year: value.getFullYear(),
    };
  }

  const text = String(value).trim();
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
    };
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    day: parsed.getDate(),
    month: parsed.getMonth() + 1,
    year: parsed.getFullYear(),
  };
};

export const formatPosterDate = (value, lang = "ar") => {
  const parts = parseDateParts(value);
  if (!parts || !parts.day || !parts.month || !parts.year) return "";
  const day = String(parts.day).padStart(2, "0");
  const month = String(parts.month).padStart(2, "0");
  if (lang === "ar") return `${day} ${ARABIC_MONTHS[parts.month - 1] || month} ${parts.year}`;
  return `${day}/${month}/${parts.year}`;
};

const getProgramDepartureDateValue = (program = {}) => (
  program.departure || program.departureDate || program.departure_date
);

const getProgramReturnDateValue = (program = {}) => (
  program.returnDate || program.return_date || program.return
);

export const getPosterDatePair = (program = {}, lang = "ar") => ({
  program,
  programId: cleanText(program.id || program.programId || program.program_id),
  departureDate: formatPosterDate(getProgramDepartureDateValue(program), lang),
  returnDate: formatPosterDate(getProgramReturnDateValue(program), lang),
});

export const getPosterDatePairs = (program = {}, posterOptions = {}, options = {}) => {
  if (posterOptions?.showDates === false) return [];
  const lang = options.lang || "ar";
  const sourcePrograms = posterOptions?.isBulkPoster === true
    && Array.isArray(posterOptions.selectedPrograms)
    && posterOptions.selectedPrograms.length
    ? posterOptions.selectedPrograms
    : [program];

  return sourcePrograms
    .map((sourceProgram, index) => ({
      ...getPosterDatePair(sourceProgram, lang),
      index,
    }))
    .filter((pair) => pair.departureDate || pair.returnDate);
};

const getProgramField = (program = {}, keys = []) => {
  for (const key of keys) {
    const value = cleanText(program[key]);
    if (value) return value;
  }
  return "";
};

const getLevelFallbackLabel = (levelNumber, lang = "ar") => {
  if (lang === "fr") return `Niveau ${levelNumber}`;
  if (lang === "en") return `Level ${levelNumber}`;
  return `المستوى ${levelNumber}`;
};

const getLevelIndexFromType = (type, patterns = []) => {
  for (const pattern of patterns) {
    const match = String(type || "").match(pattern);
    if (match) return Number(match[1]) - 1;
  }
  return -1;
};

const getRoomRequestFromType = (type) => {
  let match = String(type || "").match(/^level_(\d+)_(double|triple|quad|quint)_price$/);
  if (match) return { levelIndex: Number(match[1]) - 1, roomType: match[2] };

  match = String(type || "").match(/^(double|triple|quad|quint)_l(\d+)$/);
  if (match) return { levelIndex: Number(match[2]) - 1, roomType: match[1] };

  return null;
};

const buildLegacyPricesTable = (levels, lang) => (
  levels.slice(0, 5).map((pkg, index) => {
    const levelName = cleanText(pkg?.level, getLevelFallbackLabel(index + 1, lang));
    const startingPrice = formatPosterStartingPrice(getPackageStartingPrice(pkg), lang);
    return [levelName, startingPrice].filter(Boolean).join(" - ");
  }).filter(Boolean)
);

export const resolvePosterAreaValue = (areaType, program = {}, options = {}) => {
  const lang = options.lang || "ar";
  const type = String(areaType || "");
  const posterOptions = options.posterOptions || {};
  const levels = getProgramPosterLevels(program);

  if (type === "program_name") {
    return cleanText(posterOptions.titleOverride)
      || cleanText(program.name || program.programName || program.title);
  }
  if (type === "starting_price") return formatPosterStartingPrice(getProgramStartingPrice(levels), lang);
  if (type === "departure_date") {
    if (posterOptions.showDates === false) return "";
    return formatPosterDate(getProgramDepartureDateValue(program), lang);
  }
  if (type === "return_date") {
    if (posterOptions.showDates === false) return "";
    return formatPosterDate(getProgramReturnDateValue(program), lang);
  }
  if (type === "flight_info") {
    return getProgramField(program, [
      "transport",
      "flightInfo",
      "flight_info",
      "airline",
      "airlineName",
      "company",
      "carrier",
    ]);
  }
  if (type === "poster_travel_route") return buildPosterTravelRoute(program);
  if (type === "levels_prices_table") return buildLegacyPricesTable(levels, lang);

  const levelNameIndex = getLevelIndexFromType(type, [/^level_(\d+)_name$/, /^level_(\d+)$/]);
  if (levelNameIndex >= 0) {
    const levelNumber = levelNameIndex + 1;
    return cleanText(levels[levelNameIndex]?.level, getLevelFallbackLabel(levelNumber, lang));
  }

  const makkahIndex = getLevelIndexFromType(type, [
    /^makkah_hotel_l(\d+)$/,
    /^level_(\d+)_makkah_hotel$/,
  ]);
  if (makkahIndex >= 0) return cleanText(levels[makkahIndex]?.hotelMecca);

  const madinahIndex = getLevelIndexFromType(type, [
    /^madinah_hotel_l(\d+)$/,
    /^level_(\d+)_madinah_hotel$/,
  ]);
  if (madinahIndex >= 0) return cleanText(levels[madinahIndex]?.hotelMadina);

  const legacyHotelIndex = getLevelIndexFromType(type, [/^hotel_(\d+)$/]);
  if (legacyHotelIndex >= 0) {
    const pkg = levels[legacyHotelIndex];
    return cleanText(pkg?.hotelMecca || pkg?.hotelMadina);
  }

  const roomRequest = getRoomRequestFromType(type);
  if (roomRequest && POSTER_ROOM_TYPES.includes(roomRequest.roomType)) {
    return formatPosterNumber(getPackageRoomPrice(levels[roomRequest.levelIndex], roomRequest.roomType));
  }

  return "";
};
