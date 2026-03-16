const LOCALE_BY_LANG = { ar: "ar-MA", fr: "fr-FR", en: "en-US" };
const SUFFIX_BY_LANG = { ar: "د.م", fr: "MAD", en: "MAD" };

export function formatCurrency(amount = 0, lang = "ar") {
  const locale = LOCALE_BY_LANG[lang] || "en-US";
  const suffix = SUFFIX_BY_LANG[lang] || "MAD";
  const value = Number(amount) || 0;
  return `${new Intl.NumberFormat(locale).format(value)} ${suffix}`;
}
