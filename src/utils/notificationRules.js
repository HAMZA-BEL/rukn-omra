const DAY_MS = 1000 * 60 * 60 * 24;
const PASSPORT_EXPIRY_DAYS = 213;

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

export const createProgramDeparture11DaysKey = (program = {}) => (
  program.id && program.departure ? `program-departure-11days-${program.id}-${program.departure}` : ""
);

export const createProgramDeparture3DaysKey = (program = {}) => (
  program.id && program.departure ? `program-departure-3days-${program.id}-${program.departure}` : ""
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

export const createPassportExpiryKey = (client = {}) => {
  const expiryDate = getClientPassportExpiryDate(client);
  return client.id && expiryDate ? `passport-expiry-7months-${client.id}-${expiryDate}` : "";
};

export const isUpcomingTrip = (program = {}) => {
  const daysLeft = getDaysUntil(program.departure);
  return daysLeft !== null && daysLeft >= 0 && daysLeft <= 11;
};

export const isUrgentTrip = (program = {}) => {
  const daysLeft = getDaysUntil(program.departure);
  return daysLeft !== null && daysLeft >= 0 && daysLeft < 3;
};

export const isPassportExpiringSoon = (client = {}) => {
  const expiryDate = getClientPassportExpiryDate(client);
  const daysLeft = getDaysUntil(expiryDate);
  return daysLeft !== null && daysLeft >= 0 && daysLeft <= PASSPORT_EXPIRY_DAYS;
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
    const daysLeft = getDaysUntil(program.departure);
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
          stateHash: `departure_11days:${program.departure}`,
          meta: {
            persistKey,
            programName: program.name || "",
            departureDate: program.departure,
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
          stateHash: `departure_3days:${program.departure}`,
          meta: {
            persistKey,
            programName: program.name || "",
            departureDate: program.departure,
            daysLeft,
          },
        });
      }
    }
  });

  clients.forEach((client) => {
    const expiryDate = getClientPassportExpiryDate(client);
    const daysLeft = getDaysUntil(expiryDate);
    if (daysLeft === null || daysLeft < 0 || daysLeft > PASSPORT_EXPIRY_DAYS) return;

    const persistKey = createPassportExpiryKey(client);
    if (!persistKey) return;

    const program = programsById.get(client.programId);
    const clientName = (typeof getClientName === "function" ? getClientName(client) : "") || client.name || client.id || "";
    candidates.push({
      type: "system:passport_expiry",
      title: clientName || defaultTitle,
      message: "",
      severity: "warn",
      persistKey,
      programId: client.programId || null,
      targetType: "client",
      targetId: client.id,
      actionRoute: "clients",
      stateHash: `passport_expiry:${expiryDate}`,
      meta: {
        persistKey,
        clientName,
        programName: program?.name || defaultProgramName || "",
        expiryDate,
        daysLeft,
      },
    });
  });

  return candidates;
}
