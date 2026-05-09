const DAY_MS = 1000 * 60 * 60 * 24;

const trimText = (value) => (typeof value === "string" ? value.trim() : "");

const parseLocalDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const parsed = new Date(Number(year), Number(month) - 1, Number(day));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const todayLocal = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

export const getDaysUntil = (value) => {
  const parsed = parseLocalDate(value);
  if (!parsed) return null;
  return Math.ceil((parsed.getTime() - todayLocal().getTime()) / DAY_MS);
};

const addMonthsLocal = (date, months) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
};

const getDaysBetween = (fromValue, toValue) => {
  const from = parseLocalDate(fromValue);
  const to = parseLocalDate(toValue);
  if (!from || !to) return null;
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
};

export const getProgramDepartureDate = (program = {}) => trimText(
  program.departure
  || program.departureDate
  || program.departure_date
  || program.travelDate
  || program.travel_date
  || program.outboundDate
  || program.outbound_date
  || ""
);

export const createProgramDeparture11DaysKey = (program = {}) => (
  program.id && getProgramDepartureDate(program) ? `program-departure-11days-${program.id}-${getProgramDepartureDate(program)}` : ""
);

export const createProgramDeparture3DaysKey = (program = {}) => (
  program.id && getProgramDepartureDate(program) ? `program-departure-3days-${program.id}-${getProgramDepartureDate(program)}` : ""
);

export const getClientPassportExpiryDate = (client = {}) => {
  const passport = client.passport || {};
  return trimText(
    passport.expiry
    || passport.expiryDate
    || client.passportExpiry
    || client.passport_expiry
    || client.passportExpiryDate
    || client.expiryDate
    || ""
  );
};

export const createPassportExpiryKey = (client = {}, program = {}) => {
  const expiryDate = getClientPassportExpiryDate(client);
  const departureDate = getProgramDepartureDate(program);
  return client.id && expiryDate && departureDate
    ? `passport-expiry-7months-${client.id}-${program.id || client.programId || "program"}-${departureDate}-${expiryDate}`
    : "";
};

export const isUpcomingTrip = (program = {}) => {
  const daysLeft = getDaysUntil(getProgramDepartureDate(program));
  return daysLeft !== null && daysLeft >= 0 && daysLeft <= 11;
};

export const isUrgentTrip = (program = {}) => {
  const daysLeft = getDaysUntil(getProgramDepartureDate(program));
  return daysLeft !== null && daysLeft >= 0 && daysLeft < 3;
};

export const isPassportExpiringSoon = (client = {}, program = {}) => {
  const expiryDate = getClientPassportExpiryDate(client);
  const departureDate = getProgramDepartureDate(program);
  const departure = parseLocalDate(departureDate);
  const expiry = parseLocalDate(expiryDate);
  const sevenMonthsAfterDeparture = addMonthsLocal(departure, 7);
  return Boolean(expiry && sevenMonthsAfterDeparture && expiry < sevenMonthsAfterDeparture);
};

export const hasNotificationKey = (
  key,
  existingNotifications = [],
  generatedKeys = new Set(),
  dismissedKeys = new Set(),
  getNotificationKey
) => {
  if (!key) return true;
  if (generatedKeys?.has?.(key) || dismissedKeys?.has?.(key)) return true;
  return existingNotifications.some((notification) => (
    typeof getNotificationKey === "function"
      ? getNotificationKey(notification) === key
      : notification?.persistKey === key || notification?.meta?.persistKey === key
  ));
};

export function buildSystemNotificationCandidates({
  programs = [],
  clients = [],
  getClientName,
  defaultTitle = "",
  defaultProgramName = "",
} = {}) {
  const programsById = new Map(programs.map((program) => [program.id, program]));
  const candidates = [];

  programs.forEach((program) => {
    const departureDate = getProgramDepartureDate(program);
    const daysLeft = getDaysUntil(departureDate);
    if (daysLeft === null || daysLeft < 0) return;

    if (daysLeft <= 11) {
      const persistKey = createProgramDeparture11DaysKey(program);
      if (persistKey) {
        candidates.push({
          type: "system:departure_11days",
          title: program.name || defaultTitle,
          message: "",
          severity: "info",
          persistKey,
          programId: program.id,
          targetType: "program",
          targetId: program.id,
          actionRoute: "programs",
          stateHash: `departure_11days:${departureDate}`,
          meta: {
            persistKey,
            programName: program.name || "",
            departureDate,
            daysLeft,
          },
        });
      }
    }

    if (daysLeft < 3) {
      const persistKey = createProgramDeparture3DaysKey(program);
      if (persistKey) {
        candidates.push({
          type: "system:departure_3days",
          title: program.name || defaultTitle,
          message: "",
          severity: "warn",
          persistKey,
          programId: program.id,
          targetType: "program",
          targetId: program.id,
          actionRoute: "programs",
          stateHash: `departure_3days:${departureDate}`,
          meta: {
            persistKey,
            programName: program.name || "",
            departureDate,
            daysLeft,
          },
        });
      }
    }
  });

  clients.forEach((client) => {
    const program = programsById.get(client.programId);
    const departureDate = getProgramDepartureDate(program);
    const expiryDate = getClientPassportExpiryDate(client);
    if (!program || !departureDate || !expiryDate) return;
    if (!isPassportExpiringSoon(client, program)) return;

    const remainingDaysFromDeparture = getDaysBetween(departureDate, expiryDate);
    if (remainingDaysFromDeparture === null) return;

    const persistKey = createPassportExpiryKey(client, program);
    if (!persistKey) return;

    const clientName = (typeof getClientName === "function" ? getClientName(client) : "") || client.name || client.id || "";
    candidates.push({
      type: "system:passport_expiry",
      title: clientName || defaultTitle,
      message: "",
      severity: remainingDaysFromDeparture < 0 ? "critical" : "warn",
      persistKey,
      programId: client.programId || null,
      targetType: "client",
      targetId: client.id,
      actionRoute: "clients",
      stateHash: `passport_expiry:${client.programId || ""}:${departureDate}:${expiryDate}`,
      meta: {
        persistKey,
        clientName,
        programName: program?.name || defaultProgramName || "",
        departureDate,
        expiryDate,
        remainingDaysFromDeparture,
        expiredBeforeTravel: remainingDaysFromDeparture < 0,
      },
    });
  });

  return candidates;
}
