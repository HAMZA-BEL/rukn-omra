const VISIT_ORDER_OPTIONS = ["madinah_first", "makkah_first"];
const DAY_MS = 86400000;

const blankStayDates = () => ({
  medinaCheckIn: "",
  medinaCheckOut: "",
  makkahCheckIn: "",
  makkahCheckOut: "",
});

export const formatDateForExcel = (value) => {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return "";
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return "";
};

const parseDateParts = (value) => {
  const iso = formatDateForExcel(value);
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
};

export const addDaysSafe = (date, days) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + days * DAY_MS);
};

export const subtractDaysSafe = (date, days) => addDaysSafe(date, -days);

export const normalizeVisitOrder = (value) => (
  VISIT_ORDER_OPTIONS.includes(value) ? value : "madinah_first"
);

export const normalizeMadinahNights = (value) => {
  if (value === "" || value === null || value === undefined) return 0;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
};

const formatDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

export function calculateHotelStayDates({
  departureDate,
  returnDate,
  visitOrder,
  madinahNights,
} = {}) {
  const departure = parseDateParts(departureDate);
  const returnDay = parseDateParts(returnDate);
  if (!departure || !returnDay || returnDay.getTime() < departure.getTime()) {
    return blankStayDates();
  }

  const nights = normalizeMadinahNights(madinahNights);
  const order = normalizeVisitOrder(visitOrder);
  const firstHotelCheckIn = addDaysSafe(departure, 1);
  if (!firstHotelCheckIn || returnDay.getTime() < firstHotelCheckIn.getTime()) {
    return blankStayDates();
  }

  const availableStayDays = Math.round((returnDay.getTime() - firstHotelCheckIn.getTime()) / DAY_MS);
  if (nights > availableStayDays) {
    return blankStayDates();
  }

  if (order === "makkah_first") {
    const makkahCheckOut = subtractDaysSafe(returnDay, nights);
    return {
      medinaCheckIn: formatDate(makkahCheckOut),
      medinaCheckOut: formatDate(returnDay),
      makkahCheckIn: formatDate(firstHotelCheckIn),
      makkahCheckOut: formatDate(makkahCheckOut),
    };
  }

  const medinaCheckOut = addDaysSafe(firstHotelCheckIn, nights);
  return {
    medinaCheckIn: formatDate(firstHotelCheckIn),
    medinaCheckOut: formatDate(medinaCheckOut),
    makkahCheckIn: formatDate(medinaCheckOut),
    makkahCheckOut: formatDate(returnDay),
  };
}
