import { TRANSLATIONS } from "../data/initialData";

export const getUiLang = () => {
  if (typeof document === "undefined") return "ar";
  const lang = document.documentElement?.lang || "ar";
  return ["ar", "fr", "en"].includes(lang) ? lang : "ar";
};

export const trKey = (key, lang = getUiLang(), vars = {}) => {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.ar || {};
  const fallback = TRANSLATIONS.ar || {};
  const template = dict[key] || fallback[key] || "";
  return Object.keys(vars).reduce(
    (text, name) => text.replace(new RegExp(`\\{${name}\\}`, "g"), vars[name]),
    template
  );
};

const normalize = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/[ـًٌٍَُِّْ]/g, "")
  .replace(/\s+/g, " ");

const ROOM_TYPE_KEY_BY_VALUE = {
  single: "roomSingleShort",
  simple: "roomSingleShort",
  "فردية": "roomSingleShort",
  "فردي": "roomSingleShort",
  "غرفة مفردة": "roomSingleShort",
  double: "roomDoubleShort",
  twin: "roomDoubleShort",
  "ثنائية": "roomDoubleShort",
  "ثنائي": "roomDoubleShort",
  "غرفة ثنائية": "roomDoubleShort",
  "غرفة مزدوجة": "roomDoubleShort",
  triple: "roomTripleShort",
  "ثلاثية": "roomTripleShort",
  "ثلاثي": "roomTripleShort",
  "غرفة ثلاثية": "roomTripleShort",
  quad: "roomQuadShort",
  quadruple: "roomQuadShort",
  "رباعية": "roomQuadShort",
  "رباعي": "roomQuadShort",
  "غرفة رباعية": "roomQuadShort",
  quint: "roomQuintShort",
  quintuple: "roomQuintShort",
  "خماسية": "roomQuintShort",
  "خماسي": "roomQuintShort",
  "غرفة خماسية": "roomQuintShort",
};

const CATEGORY_KEY_BY_VALUE = {
  male_only: "roomCategoryMaleOnly",
  male: "roomCategoryMaleOnly",
  "رجال فقط": "roomCategoryMaleOnly",
  female_only: "roomCategoryFemaleOnly",
  female: "roomCategoryFemaleOnly",
  "نساء فقط": "roomCategoryFemaleOnly",
  family: "roomCategoryFamily",
  "عائلة": "roomCategoryFamily",
};

const PROGRAM_TYPE_KEY_BY_VALUE = {
  "عمرة": "programTypeUmrah",
  umrah: "programTypeUmrah",
  omra: "programTypeUmrah",
  omrah: "programTypeUmrah",
  "حج": "programTypeHajj",
  hajj: "programTypeHajj",
  hadj: "programTypeHajj",
};

const LEVEL_KEY_BY_VALUE = {
  "اقتصادي": "hotelLevelEconomy",
  economy: "hotelLevelEconomy",
  economique: "hotelLevelEconomy",
  "سياحي": "hotelLevelTourist",
  tourist: "hotelLevelTourist",
  touristique: "hotelLevelTourist",
  "سياحي بالافطار": "hotelLevelBreakfast",
  "سياحي بالإفطار": "hotelLevelBreakfast",
  breakfast: "hotelLevelBreakfast",
  vip: "hotelLevelVIP",
};

const STATUS_KEY_BY_VALUE = {
  cleared: "status_cleared",
  "مصفى": "status_cleared",
  "مصفّى": "status_cleared",
  "مصفون": "clearedFilter",
  partial: "status_partial",
  "دفع جزئي": "status_partial",
  "جزئي": "partialFilter",
  unpaid: "status_unpaid",
  "لم يدفع": "status_unpaid",
  "لم يدفعوا": "unpaidFilter",
};

const GENDER_KEY_BY_VALUE = {
  male: "male",
  m: "male",
  "ذكر": "male",
  female: "female",
  f: "female",
  "أنثى": "female",
  "انثى": "female",
};

const PAYMENT_METHOD_BY_VALUE = {
  "نقدا": { fr: "Espèces", en: "Cash" },
  "نقدًا": { fr: "Espèces", en: "Cash" },
  cash: { fr: "Espèces", en: "Cash" },
  "تحويل بنكي": { fr: "Virement bancaire", en: "Bank transfer" },
  "وقفة بنكية": { fr: "Virement bancaire", en: "Bank transfer" },
  "وقفة بنك": { fr: "Virement bancaire", en: "Bank transfer" },
  bank: { fr: "Virement bancaire", en: "Bank transfer" },
  "شيك": { fr: "Chèque", en: "Check" },
  check: { fr: "Chèque", en: "Check" },
  cheque: { fr: "Chèque", en: "Check" },
  "بطاقة بنكية": { fr: "Carte bancaire", en: "Card" },
  card: { fr: "Carte bancaire", en: "Card" },
};

export const translateRoomType = (value, lang = getUiLang()) => {
  const key = ROOM_TYPE_KEY_BY_VALUE[normalize(value)] || ROOM_TYPE_KEY_BY_VALUE[value];
  return key ? trKey(key, lang) : (value || "");
};

export const translateRoomCategory = (value, lang = getUiLang()) => {
  const key = CATEGORY_KEY_BY_VALUE[normalize(value)] || CATEGORY_KEY_BY_VALUE[value];
  return key ? trKey(key, lang) : (value || "");
};

export const translateProgramType = (value, lang = getUiLang()) => {
  const text = normalize(value);
  if (text.includes("حج") || text.includes("hajj") || text.includes("hadj")) return trKey("programTypeHajj", lang);
  if (text.includes("عمرة") || text.includes("umrah") || text.includes("omra")) return trKey("programTypeUmrah", lang);
  const key = PROGRAM_TYPE_KEY_BY_VALUE[text] || PROGRAM_TYPE_KEY_BY_VALUE[value];
  return key ? trKey(key, lang) : (value || "");
};

export const translateHotelLevel = (value, lang = getUiLang()) => {
  const key = LEVEL_KEY_BY_VALUE[normalize(value)] || LEVEL_KEY_BY_VALUE[value];
  return key ? trKey(key, lang) : (value || "");
};

export const translatePaymentStatus = (value, lang = getUiLang()) => {
  const key = STATUS_KEY_BY_VALUE[normalize(value)] || STATUS_KEY_BY_VALUE[value];
  return key ? trKey(key, lang) : (value || "");
};

export const translateGender = (value, lang = getUiLang()) => {
  const key = GENDER_KEY_BY_VALUE[normalize(value)] || GENDER_KEY_BY_VALUE[value];
  return key ? trKey(key, lang) : (value || "");
};

export const translatePaymentMethod = (value, lang = getUiLang()) => {
  if (lang === "ar") return value || "";
  const item = PAYMENT_METHOD_BY_VALUE[normalize(value)] || PAYMENT_METHOD_BY_VALUE[value];
  return item?.[lang] || value || "";
};

export const translateSystemValue = (value, lang = getUiLang()) => (
  translateRoomType(value, lang)
  || translateRoomCategory(value, lang)
  || translateProgramType(value, lang)
  || translateHotelLevel(value, lang)
  || translatePaymentStatus(value, lang)
  || translateGender(value, lang)
  || translatePaymentMethod(value, lang)
  || value
);

export const localizeCurrencyText = (text, lang = getUiLang()) => {
  if (!text) return text;
  return lang === "ar" ? text : String(text).replace(/د\.م/g, "MAD");
};

export const translateActivityDescription = (description = "", lang = getUiLang()) => {
  if (lang === "ar" || !description) return description;
  let text = localizeCurrencyText(String(description), lang);
  const dict = lang === "fr"
    ? {
        "تم تسجيل معتمر جديد": "Nouveau pèlerin enregistré",
        "تم تعديل ملف المعتمر": "Dossier pèlerin modifié",
        "تم حذف معتمر": "Pèlerin supprimé",
        "تم أرشفة المعتمر": "Pèlerin archivé",
        "تمت استعادة المعتمر من الأرشيف": "Pèlerin restauré depuis les archives",
        "تم استيراد بيانات من ملف": "Données importées depuis un fichier",
        "تمت استعادة معتمر من السلة": "Pèlerin restauré depuis la corbeille",
      }
    : {
        "تم تسجيل معتمر جديد": "New pilgrim registered",
        "تم تعديل ملف المعتمر": "Pilgrim file updated",
        "تم حذف معتمر": "Pilgrim deleted",
        "تم أرشفة المعتمر": "Pilgrim archived",
        "تمت استعادة المعتمر من الأرشيف": "Pilgrim restored from archive",
        "تم استيراد بيانات من ملف": "Data imported from file",
        "تمت استعادة معتمر من السلة": "Pilgrim restored from trash",
      };
  if (dict[text]) return dict[text];

  const replacements = [
    [/^تم نقل المعتمر إلى (.+)$/u, lang === "fr" ? "Pèlerin transféré vers $1" : "Pilgrim moved to $1"],
    [/^تم حذف (\d+) معتمر$/u, lang === "fr" ? "$1 pèlerin(s) supprimé(s)" : "$1 pilgrim(s) deleted"],
    [/^تمت أرشفة (\d+) معتمر$/u, lang === "fr" ? "$1 pèlerin(s) archivé(s)" : "$1 pilgrim(s) archived"],
    [/^تم أرشفة برنامج (.+)$/u, lang === "fr" ? "Programme archivé : $1" : "Program archived: $1"],
    [/^تم إضافة برنامج جديد: (.+)$/u, lang === "fr" ? "Nouveau programme ajouté : $1" : "New program added: $1"],
    [/^تم تعديل برنامج (.+)$/u, lang === "fr" ? "Programme modifié : $1" : "Program updated: $1"],
    [/^تم حذف برنامج (.+)$/u, lang === "fr" ? "Programme supprimé : $1" : "Program deleted: $1"],
    [/^تم حذف دفعة (.*)$/u, lang === "fr" ? "Paiement supprimé $1" : "Payment deleted $1"],
    [/^دفعة (.+)$/u, lang === "fr" ? "Paiement $1" : "Payment $1"],
    [/^تمت استعادة برنامج (.+)$/u, lang === "fr" ? "Programme restauré : $1" : "Program restored: $1"],
    [/^تمت استعادة (\d+) برامج من سلة المحذوفات$/u, lang === "fr" ? "$1 programme(s) restauré(s) depuis la corbeille" : "$1 program(s) restored from trash"],
    [/^تمت استعادة (\d+) معتمرين من السلة$/u, lang === "fr" ? "$1 pèlerin(s) restauré(s) depuis la corbeille" : "$1 pilgrim(s) restored from trash"],
  ];
  for (const [pattern, replacement] of replacements) {
    if (pattern.test(text)) return text.replace(pattern, replacement);
  }
  return text;
};
