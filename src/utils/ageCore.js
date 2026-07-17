const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const parseDateOnly = (value) => {
  const match = String(value || "").trim().match(DATE_ONLY_RE);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) return null;
  return date;
};

const toDateInputValue = (date = new Date()) => {
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isFutureDateInput = (value, referenceDate = new Date()) => {
  const date = parseDateOnly(value);
  if (!date) return false;
  const reference = parseDateOnly(referenceDate) || parseDateOnly(toDateInputValue(referenceDate));
  return reference ? date.getTime() > reference.getTime() : false;
};

const calculateAgeAtDate = (birthDate, referenceDate = new Date()) => {
  const birth = parseDateOnly(birthDate);
  const reference = parseDateOnly(referenceDate) || parseDateOnly(toDateInputValue(referenceDate));
  if (!birth || !reference || birth.getTime() > reference.getTime()) return null;
  let age = reference.getFullYear() - birth.getFullYear();
  const monthDiff = reference.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) age -= 1;
  return age;
};

const isMinor = (birthDate, referenceDate = new Date()) => {
  const age = calculateAgeAtDate(birthDate, referenceDate);
  return age !== null && age < 18;
};

const getAmadeusPassengerTypeCode = (birthDate, referenceDate = new Date()) => {
  const age = calculateAgeAtDate(birthDate, referenceDate);
  if (age === null) return "";
  if (age < 2) return "INF";
  if (age < 12) return "CHD";
  return "";
};

module.exports = {
  parseDateOnly,
  toDateInputValue,
  isFutureDateInput,
  calculateAgeAtDate,
  isMinor,
  getAmadeusPassengerTypeCode,
};
