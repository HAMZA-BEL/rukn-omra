const clampInteger = (value) => {
  const number = Math.floor(Number(value) || 0);
  return Math.max(0, Math.min(999999999, number));
};

const EN_ONES = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
const EN_TENS = ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];

const enUnderThousand = (n) => {
  if (n < 20) return EN_ONES[n];
  if (n < 100) return `${EN_TENS[Math.floor(n / 10)]}${n % 10 ? `-${EN_ONES[n % 10]}` : ""}`;
  return `${EN_ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${enUnderThousand(n % 100)}` : ""}`;
};

const enWords = (n) => {
  if (n < 1000) return enUnderThousand(n);
  if (n < 1000000) {
    const thousands = Math.floor(n / 1000);
    return `${enUnderThousand(thousands)} thousand${n % 1000 ? ` ${enUnderThousand(n % 1000)}` : ""}`;
  }
  const millions = Math.floor(n / 1000000);
  const rest = n % 1000000;
  return `${enUnderThousand(millions)} million${rest ? ` ${enWords(rest)}` : ""}`;
};

const FR_ONES = ["zéro","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize"];
const FR_TENS = ["","","vingt","trente","quarante","cinquante","soixante"];

const frUnderHundred = (n) => {
  if (n <= 16) return FR_ONES[n];
  if (n < 20) return `dix-${FR_ONES[n - 10]}`;
  if (n < 70) {
    const ten = Math.floor(n / 10);
    const one = n % 10;
    if (!one) return FR_TENS[ten];
    return `${FR_TENS[ten]}${one === 1 ? " et " : "-"}${FR_ONES[one]}`;
  }
  if (n < 80) return `soixante-${frUnderHundred(n - 60)}`;
  if (n === 80) return "quatre-vingts";
  return `quatre-vingt-${frUnderHundred(n - 80)}`;
};

const frUnderThousand = (n) => {
  if (n < 100) return frUnderHundred(n);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const prefix = hundreds === 1 ? "cent" : `${FR_ONES[hundreds]} cent`;
  return `${prefix}${rest ? ` ${frUnderHundred(rest)}` : hundreds > 1 ? "s" : ""}`;
};

const frWords = (n) => {
  if (n < 1000) return frUnderThousand(n);
  if (n < 1000000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    const prefix = thousands === 1 ? "mille" : `${frUnderThousand(thousands)} mille`;
    return `${prefix}${rest ? ` ${frUnderThousand(rest)}` : ""}`;
  }
  const millions = Math.floor(n / 1000000);
  const rest = n % 1000000;
  const prefix = millions === 1 ? "un million" : `${frUnderThousand(millions)} millions`;
  return `${prefix}${rest ? ` ${frWords(rest)}` : ""}`;
};

const AR_ONES = ["صفر","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة","عشرة","أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر","ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"];
const AR_TENS = ["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"];
const AR_HUNDREDS = ["","مائة","مائتان","ثلاثمائة","أربعمائة","خمسمائة","ستمائة","سبعمائة","ثمانمائة","تسعمائة"];

const arUnderHundred = (n) => {
  if (n < 20) return AR_ONES[n];
  const one = n % 10;
  const ten = Math.floor(n / 10);
  return one ? `${AR_ONES[one]} و${AR_TENS[ten]}` : AR_TENS[ten];
};

const arUnderThousand = (n) => {
  if (n < 100) return arUnderHundred(n);
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  return `${AR_HUNDREDS[hundred]}${rest ? ` و${arUnderHundred(rest)}` : ""}`;
};

const arScale = (count, singular, dual, plural) => {
  if (count === 1) return singular;
  if (count === 2) return dual;
  if (count >= 3 && count <= 10) return `${arUnderThousand(count)} ${plural}`;
  return `${arUnderThousand(count)} ${singular}`;
};

const arWords = (n) => {
  if (n < 1000) return arUnderThousand(n);
  if (n < 1000000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    return `${arScale(thousands, "ألف", "ألفان", "آلاف")}${rest ? ` و${arUnderThousand(rest)}` : ""}`;
  }
  const millions = Math.floor(n / 1000000);
  const rest = n % 1000000;
  return `${arScale(millions, "مليون", "مليونان", "ملايين")}${rest ? ` و${arWords(rest)}` : ""}`;
};

export const amountToWords = (amount, lang = "ar") => {
  const whole = clampInteger(amount);
  if (lang === "fr") return `${frWords(whole)} dirhams`;
  if (lang === "en") return `${enWords(whole)} dirhams`;
  return `${arWords(whole)} درهم`;
};

export const amountInWordsSentence = (amount, lang = "ar", documentType = "invoice") => {
  const words = amountToWords(amount, lang);
  if (lang === "fr") {
    const doc = documentType === "proforma" ? "LA PRÉSENTE FACTURE PROFORMA EST ARRÊTÉE À LA SOMME DE" : "LA PRÉSENTE FACTURE EST ARRÊTÉE À LA SOMME DE";
    return `${doc} : ${words.toUpperCase()} TTC.`;
  }
  if (lang === "en") {
    return `${documentType === "proforma" ? "This proforma invoice amounts to" : "This invoice amounts to"}: ${words}.`;
  }
  return `${documentType === "proforma" ? "أوقفت هذه الفاتورة الأولية عند مبلغ" : "أوقفت هذه الفاتورة عند مبلغ"}: ${words}.`;
};
