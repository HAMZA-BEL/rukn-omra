export const DEFAULT_CLIENT_SERVICE_TYPE = "full_package";

export const CLIENT_SERVICE_TYPES = [
  { value: "full_package", labels: { ar: "كاملة", fr: "Complète", en: "Full package" } },
  { value: "without_visa", labels: { ar: "بدون فيزا", fr: "Sans visa", en: "Without visa" } },
  { value: "ticket_only", labels: { ar: "تذكرة فقط", fr: "Billet uniquement", en: "Ticket only" } },
  { value: "accommodation_only", labels: { ar: "سكن فقط", fr: "Hébergement uniquement", en: "Accommodation only" } },
  { value: "visa_only", labels: { ar: "تأشيرة فقط", fr: "Visa uniquement", en: "Visa only" } },
];

const SERVICE_TYPE_VALUES = new Set(CLIENT_SERVICE_TYPES.map((type) => type.value));
const SERVICE_TYPES_WITH_ACCOMMODATION = new Set(["full_package", "without_visa", "accommodation_only"]);

const normalizeServiceTypeText = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[ـًٌٍَُِّْ]/g, "")
  .replace(/[أإآ]/g, "ا")
  .replace(/ى/g, "ي")
  .replace(/ة/g, "ه")
  .replace(/[’'`´.،:;()_[\]{}#№°/-]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const SERVICE_TYPE_INPUT_ALIASES = {
  full_package: [
    "كاملة",
    "باقة كاملة",
    "عمرة كاملة",
    "كامل",
    "full",
    "full package",
    "package",
    "pack complet",
    "complète",
    "complete",
    "complet",
  ],
  without_visa: [
    "بدون فيزا",
    "بدون تأشيرة",
    "sans visa",
    "without visa",
    "no visa",
  ],
  ticket_only: [
    "تذكرة فقط",
    "تذكرة",
    "billet uniquement",
    "billet seul",
    "ticket only",
    "flight only",
    "ticket",
  ],
  accommodation_only: [
    "سكن فقط",
    "فندق فقط",
    "إقامة فقط",
    "hébergement uniquement",
    "hotel only",
    "accommodation only",
    "lodging only",
  ],
  visa_only: [
    "تأشيرة فقط",
    "فيزا فقط",
    "visa uniquement",
    "visa only",
  ],
};

const SERVICE_TYPE_INPUT_MAP = Object.entries(SERVICE_TYPE_INPUT_ALIASES).reduce((map, [serviceType, aliases]) => {
  map.set(normalizeServiceTypeText(serviceType), serviceType);
  aliases.forEach((alias) => map.set(normalizeServiceTypeText(alias), serviceType));
  return map;
}, new Map());

export const normalizeClientServiceType = (value) => (
  SERVICE_TYPE_VALUES.has(value) ? value : DEFAULT_CLIENT_SERVICE_TYPE
);

export const parseClientServiceTypeValue = (value) => (
  SERVICE_TYPE_INPUT_MAP.get(normalizeServiceTypeText(value)) || DEFAULT_CLIENT_SERVICE_TYPE
);

export const getClientServiceType = (source) => {
  if (source && typeof source === "object") {
    return normalizeClientServiceType(
      source.serviceType
        || source.service_type
        || source.docs?.serviceType
        || source.docs?.service_type
    );
  }
  return normalizeClientServiceType(source);
};

export const clientServiceIncludesAccommodation = (source) => (
  SERVICE_TYPES_WITH_ACCOMMODATION.has(getClientServiceType(source))
);

export const doesServiceTypeNeedAccommodation = clientServiceIncludesAccommodation;

export const getClientServiceTypeLabel = (source, t = {}, lang = "ar") => {
  const serviceType = getClientServiceType(source);
  const option = CLIENT_SERVICE_TYPES.find((type) => type.value === serviceType) || CLIENT_SERVICE_TYPES[0];
  return t?.[`serviceType_${serviceType}`] || option.labels[lang] || option.labels.ar;
};

export const getClientServiceTypeOptions = (t = {}, lang = "ar") => (
  CLIENT_SERVICE_TYPES.map((type) => ({
    value: type.value,
    label: getClientServiceTypeLabel(type.value, t, lang),
  }))
);

export const getClientServiceTypeAllFilterLabel = (t = {}, lang = "ar") => {
  if (t?.serviceTypeAll) return t.serviceTypeAll;
  if (lang === "fr") return "Type de service : Tous";
  if (lang === "en") return "Service type: All";
  return "نوع الخدمة: الكل";
};
