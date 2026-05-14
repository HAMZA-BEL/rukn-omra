import { getLegacyFieldsFromPackages } from "../../utils/programPackages";

export const COSTING_ROOM_TYPES = [
  { key: "double", occupancy: 2 },
  { key: "triple", occupancy: 3 },
  { key: "quad", occupancy: 4 },
  { key: "quintuple", occupancy: 5, priceKey: "quint" },
];

const COSTING_META_KEY = "programCosting";
const DEFAULT_EXCHANGE_RATE = 2.7;
const SHARED_COST_KEYS = ["flight", "visa", "transport", "guide", "miscellaneous"];

const TEXT = {
  ar: {
    action: "تسعير البرنامج",
    title: "تسعير البرنامج",
    steps: ["المصاريف المشتركة", "الفنادق والمستويات", "النتائج والأسعار"],
    sharedCosts: "المصاريف المشتركة",
    hotelsLevels: "الفنادق والمستويات",
    resultsPrices: "النتائج والأسعار",
    exchangeRate: "سعر الصرف SAR/MAD",
    flight: "ثمن التذكرة",
    visa: "ثمن التأشيرة",
    transport: "النقل",
    guide: "المؤطر / المرشد",
    miscellaneous: "مصاريف أخرى",
    totalShared: "إجمالي المصاريف المشتركة للفرد",
    makkah: "مكة",
    madinah: "المدينة",
    makkahHotel: "فندق مكة",
    makkahRoomPriceSar: "سعر غرفة مكة بالريال",
    makkahNights: "ليالي مكة",
    madinahHotel: "فندق المدينة",
    madinahRoomPriceSar: "سعر غرفة المدينة بالريال",
    madinahNights: "ليالي المدينة",
    copyPrevious: "نسخ من المستوى السابق",
    defaultLevel: "المستوى الافتراضي",
    double: "ثنائية",
    triple: "ثلاثية",
    quad: "رباعية",
    quintuple: "خماسية",
    cost: "التكلفة",
    accommodation: "السكن",
    shared: "المصاريف المشتركة",
    costPerPerson: "تكلفة الفرد",
    sellingPrice: "سعر البيع",
    profit: "هامش الربح",
    margin: "نسبة الربح",
    sellingAtLoss: "بيع بخسارة",
    neutralPrice: "لم يتم تحديد سعر البيع",
    applyPrices: "تطبيق أسعار البيع على البرنامج",
    applyConfirm: "سيتم تطبيق أسعار البيع المدخلة على مستويات البرنامج. هل تريد المتابعة؟",
    saveCosting: "حفظ التسعير",
    downloadPdf: "تحميل PDF التسعير",
    printCosting: "طباعة التسعير",
    back: "رجوع",
    next: "التالي",
    close: "إغلاق",
    exchangeError: "يرجى إدخال سعر صرف صحيح.",
    nightsWarning: "لا يمكن حساب الليالي تلقائيًا. يرجى إكمال مدة البرنامج وعدد ليالي المدينة في تعديل البرنامج.",
    notSpecified: "غير محدد",
    saved: "تم حفظ التسعير.",
    applied: "تم تطبيق أسعار البيع على البرنامج.",
    noPricesToApply: "لا توجد أسعار بيع مدخلة لتطبيقها.",
    reportTitle: "تقرير تسعير البرنامج",
    generatedOn: "تاريخ الإصدار",
    programDates: "تواريخ البرنامج",
    currencyRate: "العملة / سعر الصرف",
    level: "المستوى",
    roomType: "نوع الغرفة",
    note: "هذه الحسبة تقديرية وقابلة للتعديل حسب الأسعار النهائية.",
    print: "طباعة",
  },
  fr: {
    action: "Cotation du programme",
    title: "Cotation du programme",
    steps: ["Frais communs", "Hôtels et niveaux", "Résultats et prix"],
    sharedCosts: "Frais communs",
    hotelsLevels: "Hôtels et niveaux",
    resultsPrices: "Résultats et prix",
    exchangeRate: "Taux de change SAR/MAD",
    flight: "Billet d’avion",
    visa: "Visa",
    transport: "Transport",
    guide: "Accompagnateur / guide",
    miscellaneous: "Frais divers",
    totalShared: "Total frais communs par pèlerin",
    makkah: "La Mecque",
    madinah: "Médine",
    makkahHotel: "Hôtel à La Mecque",
    makkahRoomPriceSar: "Prix chambre La Mecque en SAR",
    makkahNights: "Nuits à La Mecque",
    madinahHotel: "Hôtel à Médine",
    madinahRoomPriceSar: "Prix chambre Médine en SAR",
    madinahNights: "Nuits à Médine",
    copyPrevious: "Copier depuis le niveau précédent",
    defaultLevel: "Niveau par défaut",
    double: "Double",
    triple: "Triple",
    quad: "Quadruple",
    quintuple: "Quintuple",
    cost: "Coût",
    accommodation: "Hébergement",
    shared: "Frais communs",
    costPerPerson: "Coût par personne",
    sellingPrice: "Prix de vente",
    profit: "Bénéfice souhaité",
    margin: "Taux de bénéfice",
    sellingAtLoss: "Vente à perte",
    neutralPrice: "Prix de vente non défini",
    applyPrices: "Appliquer les prix de vente au programme",
    applyConfirm: "Les prix de vente saisis seront appliqués aux niveaux du programme. Voulez-vous continuer ?",
    saveCosting: "Enregistrer la cotation",
    downloadPdf: "Télécharger PDF cotation",
    printCosting: "Imprimer la cotation",
    back: "Retour",
    next: "Suivant",
    close: "Fermer",
    exchangeError: "Veuillez saisir un taux de change valide.",
    nightsWarning: "Impossible de calculer les nuits automatiquement. Veuillez compléter la durée du programme et les nuits à Médine dans la modification du programme.",
    notSpecified: "Non défini",
    saved: "La cotation a été enregistrée.",
    applied: "Les prix de vente ont été appliqués au programme.",
    noPricesToApply: "Aucun prix de vente saisi à appliquer.",
    reportTitle: "Rapport de cotation du programme",
    generatedOn: "Date de génération",
    programDates: "Dates du programme",
    currencyRate: "Devise / taux",
    level: "Niveau",
    roomType: "Type chambre",
    note: "Cette cotation est estimative et peut être ajustée selon les prix finaux.",
    print: "Imprimer",
  },
  en: {
    action: "Program costing",
    title: "Program costing",
    steps: ["Shared costs", "Hotels and levels", "Results and prices"],
    sharedCosts: "Shared costs",
    hotelsLevels: "Hotels and levels",
    resultsPrices: "Results and prices",
    exchangeRate: "SAR/MAD exchange rate",
    flight: "Flight ticket",
    visa: "Visa",
    transport: "Transport",
    guide: "Guide / leader",
    miscellaneous: "Miscellaneous costs",
    totalShared: "Total shared cost per pilgrim",
    makkah: "Makkah",
    madinah: "Madinah",
    makkahHotel: "Makkah hotel",
    makkahRoomPriceSar: "Makkah room price in SAR",
    makkahNights: "Makkah nights",
    madinahHotel: "Madinah hotel",
    madinahRoomPriceSar: "Madinah room price in SAR",
    madinahNights: "Madinah nights",
    copyPrevious: "Copy from previous level",
    defaultLevel: "Default level",
    double: "Double",
    triple: "Triple",
    quad: "Quad",
    quintuple: "Quintuple",
    cost: "Cost",
    accommodation: "Accommodation",
    shared: "Shared costs",
    costPerPerson: "Cost per person",
    sellingPrice: "Selling price",
    profit: "Profit amount",
    margin: "Profit rate",
    sellingAtLoss: "Selling at a loss",
    neutralPrice: "Selling price not set",
    applyPrices: "Apply selling prices to program",
    applyConfirm: "The entered selling prices will be applied to the program levels. Do you want to continue?",
    saveCosting: "Save costing",
    downloadPdf: "Download costing PDF",
    printCosting: "Print costing",
    back: "Back",
    next: "Next",
    close: "Close",
    exchangeError: "Please enter a valid exchange rate.",
    nightsWarning: "Unable to calculate nights automatically. Please complete the program duration and Madinah nights in the program edit form.",
    notSpecified: "Not specified",
    saved: "Costing saved.",
    applied: "Selling prices applied to the program.",
    noPricesToApply: "No entered selling prices to apply.",
    reportTitle: "Program costing report",
    generatedOn: "Generated date",
    programDates: "Program dates",
    currencyRate: "Currency / exchange rate",
    level: "Level",
    roomType: "Room type",
    note: "This costing is an estimate and can be adjusted according to final prices.",
    print: "Print",
  },
};

const isPlainObject = (value) => value && typeof value === "object" && !Array.isArray(value);

const asNumber = (value, fallback = 0) => {
  if (value === "" || value === null || value === undefined) return fallback;
  const next = Number(value);
  return Number.isFinite(next) && next >= 0 ? next : fallback;
};

const asPositiveNumber = (value, fallback = DEFAULT_EXCHANGE_RATE) => {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : fallback;
};

const roundMoney = (value) => {
  const next = Number(value);
  if (!Number.isFinite(next)) return 0;
  return Math.round(next * 100) / 100;
};

const text = (value, fallback = "") => {
  const next = String(value ?? "").trim();
  return next || fallback;
};

const getPriceKey = (roomType) => roomType.priceKey || roomType.key;

const hasSourceValue = (value) => value !== "" && value !== null && value !== undefined;

const sourceNumber = (value) => {
  if (!hasSourceValue(value)) return null;
  const next = Number(value);
  return Number.isFinite(next) && next >= 0 ? next : null;
};

const deriveLevelNights = (program = {}, pkg = {}) => {
  const duration = sourceNumber(program.duration);
  const madinahNights = sourceNumber(
    pkg.madinahNights
    ?? pkg.madinah_nights
    ?? program.madinahNights
    ?? program.madinah_nights
  );
  const hasCompleteSource = duration !== null && duration > 0 && madinahNights !== null;
  return {
    duration,
    madinahNights,
    makkahNights: hasCompleteSource ? Math.max(0, duration - madinahNights) : 0,
    missingSource: !hasCompleteSource,
  };
};

const getPackageHotelName = (pkg = {}, program = {}, city = "makkah") => {
  if (city === "makkah") return text(pkg.hotelMecca ?? pkg.hotel_mecca ?? program.hotelMecca ?? program.hotel_mecca);
  return text(pkg.hotelMadina ?? pkg.hotel_madina ?? program.hotelMadina ?? program.hotel_madina);
};

export function getProgramCostingLabels(lang = "ar") {
  return TEXT[lang] || TEXT.ar;
}

export function sanitizeCostingNumberInput(value, { allowBlank = true, fallback = "" } = {}) {
  if (value === "" || value === null || value === undefined) return allowBlank ? "" : fallback;
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.max(0, next);
}

export function getStoredProgramCosting(program = {}) {
  if (isPlainObject(program.programCosting)) return program.programCosting;
  const raw = Array.isArray(program.priceTable) ? program.priceTable : [];
  const source = raw.find((pkg) => isPlainObject(pkg?.[COSTING_META_KEY]));
  return source?.[COSTING_META_KEY] || null;
}

const getStoredPackages = (program = {}) => (
  Array.isArray(program.priceTable) ? program.priceTable.filter(isPlainObject) : []
);

const findExistingLevel = (existingLevels = [], pkg = {}, index = 0) => (
  existingLevels.find((level) => level.levelId && pkg.id && level.levelId === pkg.id)
  || existingLevels.find((level) => text(level.levelName) && text(pkg.level) && text(level.levelName) === text(pkg.level))
  || existingLevels[index]
  || null
);

const normalizeSellingPrices = (source = {}, fallbackPrices = {}) => (
  COSTING_ROOM_TYPES.reduce((acc, roomType) => {
    const key = roomType.key;
    const priceKey = getPriceKey(roomType);
    const raw = source[key] ?? source[priceKey] ?? fallbackPrices[priceKey] ?? "";
    acc[key] = raw === "" || raw === null || raw === undefined ? "" : asNumber(raw, "");
    return acc;
  }, {})
);

const normalizeProfitAmounts = (source = {}) => (
  COSTING_ROOM_TYPES.reduce((acc, roomType) => {
    const raw = source[roomType.key] ?? source[getPriceKey(roomType)] ?? "";
    acc[roomType.key] = raw === "" || raw === null || raw === undefined ? "" : asNumber(raw, "");
    return acc;
  }, {})
);

const normalizeCostingHotelBlock = (source = {}) => ({
  roomPriceSar: asNumber(source.roomPriceSar, 0),
});

export function createInitialCostingDraft({ program = {}, lang = "ar" } = {}) {
  const labels = getProgramCostingLabels(lang);
  const existing = getStoredProgramCosting(program) || {};
  const existingLevels = Array.isArray(existing.levels) ? existing.levels : [];
  const storedPackages = getStoredPackages(program);
  const sourcePackages = storedPackages.length ? storedPackages : [{
    id: "default",
    level: labels.defaultLevel,
    hotelMecca: program.hotelMecca || "",
    hotelMadina: program.hotelMadina || "",
    madinahNights: program.madinahNights ?? program.madinah_nights ?? "",
    prices: {},
  }];

  const levels = sourcePackages.map((pkg, index) => {
    const existingLevel = findExistingLevel(existingLevels, pkg, index);
    const nights = deriveLevelNights(program, pkg);
    return {
      levelId: text(storedPackages.length ? pkg.id : existingLevel?.levelId, pkg.id || `level-${index + 1}`),
      levelName: storedPackages.length ? text(pkg.level || pkg.name || "") : labels.defaultLevel,
      makkah: {
        hotelName: getPackageHotelName(pkg, program, "makkah"),
        roomPriceSar: asNumber(existingLevel?.makkah?.roomPriceSar, 0),
        nights: nights.makkahNights,
      },
      madinah: {
        hotelName: getPackageHotelName(pkg, program, "madinah"),
        roomPriceSar: asNumber(existingLevel?.madinah?.roomPriceSar, 0),
        nights: nights.madinahNights ?? 0,
      },
      nightsMissingSource: nights.missingSource,
      profitAmounts: normalizeProfitAmounts(existingLevel?.profitAmounts),
      sellingPrices: normalizeSellingPrices(existingLevel?.sellingPrices, pkg.prices || {}),
    };
  });

  return {
    version: 1,
    exchangeRate: asPositiveNumber(existing.exchangeRate, DEFAULT_EXCHANGE_RATE),
    sharedCosts: SHARED_COST_KEYS.reduce((acc, key) => {
      acc[key] = asNumber(existing.sharedCosts?.[key], 0);
      return acc;
    }, {}),
    levels,
    createdAt: existing.createdAt || "",
    updatedAt: existing.updatedAt || "",
  };
}

export function prepareCostingDraftForSave(draft = {}) {
  const now = new Date().toISOString();
  const cleanedLevels = (Array.isArray(draft.levels) ? draft.levels : []).map((level, index) => ({
    levelId: text(level.levelId, `level-${index + 1}`),
    levelName: text(level.levelName, ""),
    makkah: normalizeCostingHotelBlock(level.makkah),
    madinah: normalizeCostingHotelBlock(level.madinah),
    profitAmounts: normalizeProfitAmounts(level.profitAmounts),
    sellingPrices: normalizeSellingPrices(level.sellingPrices),
  }));
  const cleanedDraft = {
    version: 1,
    exchangeRate: asPositiveNumber(draft.exchangeRate, DEFAULT_EXCHANGE_RATE),
    sharedCosts: SHARED_COST_KEYS.reduce((acc, key) => {
      acc[key] = asNumber(draft.sharedCosts?.[key], 0);
      return acc;
    }, {}),
    levels: cleanedLevels,
    createdAt: draft.createdAt || now,
    updatedAt: now,
  };
  const resultsByLevel = calculateCostingResults({ ...cleanedDraft, levels: draft.levels || [] });
  cleanedDraft.levels = cleanedDraft.levels.map((level, index) => {
    const result = resultsByLevel[index];
    if (!result) return level;
    return {
      ...level,
      profitAmounts: result.rooms.reduce((acc, room) => {
        acc[room.key] = room.profitAmount;
        return acc;
      }, {}),
      sellingPrices: result.rooms.reduce((acc, room) => {
        acc[room.key] = room.sellingPrice;
        return acc;
      }, {}),
    };
  });
  return cleanedDraft;
}

export function getSharedCostTotal(draft = {}) {
  return SHARED_COST_KEYS.reduce((sum, key) => sum + asNumber(draft.sharedCosts?.[key], 0), 0);
}

export function isValidCostingExchangeRate(draft = {}) {
  const value = Number(draft.exchangeRate);
  return Number.isFinite(value) && value > 0;
}

export function calculateCostingResults(draft = {}) {
  const exchangeRate = asPositiveNumber(draft.exchangeRate, 0);
  const sharedCost = getSharedCostTotal(draft);
  return (Array.isArray(draft.levels) ? draft.levels : []).map((level) => ({
    levelId: level.levelId,
    levelName: level.levelName,
    makkah: level.makkah || {},
    madinah: level.madinah || {},
    nightsMissingSource: !!level.nightsMissingSource,
    rooms: COSTING_ROOM_TYPES.map((roomType) => {
      const makkahSar = asNumber(level.makkah?.roomPriceSar, 0) * asNumber(level.makkah?.nights, 0);
      const madinahSar = asNumber(level.madinah?.roomPriceSar, 0) * asNumber(level.madinah?.nights, 0);
      const accommodation = roomType.occupancy > 0
        ? ((makkahSar + madinahSar) * exchangeRate) / roomType.occupancy
        : 0;
      const costPerPerson = accommodation + sharedCost;
      const rawProfitAmount = level.profitAmounts?.[roomType.key];
      const hasProfitAmount = rawProfitAmount !== "" && rawProfitAmount !== null && rawProfitAmount !== undefined;
      const legacySellingPrice = asNumber(level.sellingPrices?.[roomType.key], 0);
      const profitAmount = hasProfitAmount
        ? asNumber(rawProfitAmount, 0)
        : Math.max(legacySellingPrice - costPerPerson, 0);
      const sellingPrice = costPerPerson + profitAmount;
      const profitRate = sellingPrice > 0 ? (profitAmount / sellingPrice) * 100 : null;
      return {
        key: roomType.key,
        priceKey: getPriceKey(roomType),
        occupancy: roomType.occupancy,
        accommodationCost: roundMoney(accommodation),
        sharedCost: roundMoney(sharedCost),
        costPerPerson: roundMoney(costPerPerson),
        totalCost: roundMoney(costPerPerson),
        profitAmount: roundMoney(profitAmount),
        sellingPrice: roundMoney(sellingPrice),
        profit: roundMoney(profitAmount),
        margin: profitRate === null ? null : Math.round(profitRate * 10) / 10,
        isLoss: false,
      };
    }),
  }));
}

const getProgramPriceTable = (program = {}, draft = {}) => {
  const raw = Array.isArray(program.priceTable) ? program.priceTable : [];
  if (raw.length) return raw.map((pkg) => ({ ...pkg, prices: { ...(pkg.prices || {}) } }));
  return (Array.isArray(draft.levels) ? draft.levels : []).map((level, index) => ({
    id: level.levelId || `level-${index + 1}`,
    level: level.levelName || "",
    hotelMecca: program.hotelMecca || "",
    hotelMadina: program.hotelMadina || "",
    madinahNights: level.madinah?.nights ?? 0,
    mealPlan: program.mealPlan || "",
    notes: "",
    prices: {},
  }));
};

const matchLevelForPackage = (levels = [], pkg = {}, index = 0) => (
  levels.find((level) => level.levelId && pkg.id && level.levelId === pkg.id)
  || levels.find((level) => text(level.levelName) && text(pkg.level) && text(level.levelName) === text(pkg.level))
  || levels[index]
  || null
);

export function attachProgramCostingDraft(program = {}, draft = {}) {
  const savedDraft = prepareCostingDraftForSave(draft);
  const nextPriceTable = getProgramPriceTable(program, savedDraft).map((pkg, index) => {
    const next = { ...pkg, prices: { ...(pkg.prices || {}) } };
    next[COSTING_META_KEY] = savedDraft;
    return next;
  });
  if (!nextPriceTable.length) {
    nextPriceTable.push({
      id: "default",
      level: savedDraft.levels[0]?.levelName || "",
      hotelMecca: program.hotelMecca || "",
      hotelMadina: program.hotelMadina || "",
      madinahNights: 0,
      mealPlan: program.mealPlan || "",
      notes: "",
      prices: {},
      [COSTING_META_KEY]: savedDraft,
    });
  }
  const legacyFields = getLegacyFieldsFromPackages(nextPriceTable, program);
  return {
    ...program,
    ...legacyFields,
    priceTable: nextPriceTable,
  };
}

export function applyCostingSellingPricesToProgram(program = {}, draft = {}) {
  const savedDraft = prepareCostingDraftForSave(draft);
  const results = calculateCostingResults(draft);
  let appliedCount = 0;
  const nextPriceTable = getProgramPriceTable(program, savedDraft).map((pkg, index) => {
    const level = matchLevelForPackage(savedDraft.levels, pkg, index);
    const result = results.find((item) => item.levelId && level?.levelId && item.levelId === level.levelId)
      || results.find((item) => text(item.levelName) && text(level?.levelName) && text(item.levelName) === text(level.levelName))
      || results[index];
    const nextPrices = { ...(pkg.prices || {}) };
    if (level && result) {
      result.rooms.forEach((room) => {
        const value = asNumber(room.sellingPrice, 0);
        if (value > 0) {
          nextPrices[room.priceKey] = roundMoney(value);
          appliedCount += 1;
        }
      });
    }
    const next = { ...pkg, prices: nextPrices };
    next[COSTING_META_KEY] = savedDraft;
    return next;
  });
  const legacyFields = getLegacyFieldsFromPackages(nextPriceTable, program);
  return {
    appliedCount,
    program: {
      ...program,
      ...legacyFields,
      priceTable: nextPriceTable,
    },
  };
}

export function copyCostingNumbersFromPreviousLevel(draft = {}, index = 0) {
  if (index <= 0 || !Array.isArray(draft.levels)) return draft;
  const previous = draft.levels[index - 1];
  if (!previous) return draft;
  return {
    ...draft,
    levels: draft.levels.map((level, levelIndex) => {
      if (levelIndex !== index) return level;
      return {
        ...level,
        makkah: {
          ...(level.makkah || {}),
          roomPriceSar: previous.makkah?.roomPriceSar ?? level.makkah?.roomPriceSar ?? 0,
        },
        madinah: {
          ...(level.madinah || {}),
          roomPriceSar: previous.madinah?.roomPriceSar ?? level.madinah?.roomPriceSar ?? 0,
        },
      };
    }),
  };
}
