import { PROGRAM_FULLY_CLEARED_ARCHIVE_NOTIFICATION_TYPE } from "./notificationRules";

const stableStringify = (value) => {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${key}:${stableStringify(value[key])}`).join(",")}}`;
};

export function buildNotificationStateHash(notification) {
  if (!notification) return "ntf:unknown";
  if (notification.stateHash && typeof notification.stateHash === "string") {
    return notification.stateHash;
  }
  if (notification.meta && typeof notification.meta.stateHash === "string") {
    return notification.meta.stateHash;
  }
  const type = notification.type || "system";
  const target = notification.targetId
    || notification.programId
    || notification.meta?.targetId
    || "global";
  const signature = notification.meta && Object.keys(notification.meta).length
    ? stableStringify(notification.meta)
    : (notification.message || "");
  return `${type}:${target}:${signature}`;
}

const firstFilled = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
};

const normalizeTargetType = (value) => {
  const text = firstFilled(value).toLowerCase();
  if (!text) return "";
  if (["client", "clients", "pilgrim", "pilgrims", "customer"].includes(text)) return "client";
  if (["program", "programs", "trip", "travel"].includes(text)) return "program";
  if (["payment", "payments"].includes(text)) return "payments";
  return text;
};

const normalizeRoute = (value) => {
  const text = firstFilled(value);
  if (!text) return "";
  const hashMatch = text.match(/#\/?([^?/#]+)/);
  const pathMatch = text.match(/^\/?([^?/#]+)/);
  const route = (hashMatch?.[1] || pathMatch?.[1] || text).trim();
  return route.replace(/^#\/?/, "").replace(/^\/+/, "");
};

const getRouteParam = (value, keys = []) => {
  const text = firstFilled(value);
  const queryStart = text.indexOf("?");
  if (queryStart === -1) return "";
  const query = text.slice(queryStart + 1).split("#")[0];
  const params = new URLSearchParams(query);
  for (const key of keys) {
    const found = params.get(key);
    if (firstFilled(found)) return found;
  }
  return "";
};

export function resolveNotificationTarget(notification) {
  if (!notification) return null;
  const meta = notification.meta || notification.metadata || {};
  const targetUrl = firstFilled(
    notification.targetUrl,
    notification.target_url,
    meta.targetUrl,
    meta.target_url
  );
  const actionRoute = firstFilled(
    notification.actionRoute,
    notification.action_route,
    meta.actionRoute,
    meta.action_route,
    meta.route,
    targetUrl
  );
  const clientId = firstFilled(
    notification.clientId,
    notification.client_id,
    notification.pilgrimId,
    notification.pilgrim_id,
    meta.clientId,
    meta.client_id,
    meta.pilgrimId,
    meta.pilgrim_id,
    getRouteParam(targetUrl, ["openClientId", "clientId", "client_id", "pilgrimId", "pilgrim_id"])
  );
  const programId = firstFilled(
    notification.programId,
    notification.program_id,
    meta.programId,
    meta.program_id,
    getRouteParam(targetUrl, ["highlightProgramId", "programId", "program_id"])
  );
  const entityType = normalizeTargetType(firstFilled(
    notification.targetType,
    notification.target_type,
    notification.entityType,
    notification.entity_type,
    meta.targetType,
    meta.target_type,
    meta.entityType,
    meta.entity_type
  ));
  const entityId = firstFilled(
    notification.targetId,
    notification.target_id,
    notification.entityId,
    notification.entity_id,
    meta.targetId,
    meta.target_id,
    meta.entityId,
    meta.entity_id,
    getRouteParam(targetUrl, ["targetId", "target_id", "entityId", "entity_id", "selected"])
  );
  let targetType = entityType || (clientId ? "client" : programId ? "program" : "");
  let targetId = entityId;
  if (targetType === "client" && !targetId) targetId = clientId;
  if (targetType === "program" && !targetId) targetId = programId;
  if (!targetType && actionRoute) {
    return { type: "route", route: normalizeRoute(actionRoute), targetId: targetId || null };
  }
  if (!targetType) return null;
  const defaultRoutes = {
    program: "programs",
    client: "clients",
    clearance: "clearance",
    trash: "trash",
    payments: "clients",
  };
  const route = normalizeRoute(actionRoute) || defaultRoutes[targetType] || null;
  return { type: targetType, route, targetId };
}

export function formatNotificationMessage(notification, { programs = [], activeClients = [], getClientStatus, tr } = {}) {
  if (!notification) return "";
  if (!notification.type || !notification.type.startsWith("system:")) {
    return notification.message || "";
  }

  const program = notification.programId
    ? programs.find((p) => p.id === notification.programId)
    : null;
  const programName = program?.name || notification.title || "";
  const relatedClients = notification.programId
    ? activeClients.filter((c) => c.programId === notification.programId)
    : [];

  const translate = (key, vars) => {
    if (typeof tr === "function") return tr(key, vars);
    switch (key) {
      case "notificationsSeatLow":
        return `${vars.program}: ${vars.seats} seats left`;
      case "notificationsSeatFull":
        return `${vars.program}: program is full`;
      case "notificationsUnsettled":
        return `${vars.program}: ${vars.count} clients unpaid, departure in ${vars.days} day(s)`;
      case "notificationsArchive":
        return `${vars.program}: ended ${vars.days} day(s) ago — please archive`;
      case "notificationsProgramFullyClearedArchiveBody":
        return `All participants in "${vars.programName}" are fully cleared. You can archive it to keep your workspace organized.`;
      case "notificationsDepartureSoon":
        return `Trip is approaching: ${vars.program}\nDeparture: ${vars.date}\nRemaining: ${vars.days} day(s)`;
      case "notificationsDepartureUrgent":
        return `Urgent alert: ${vars.program} departure is very close\nDeparture: ${vars.date}\nRemaining: ${vars.days} day(s)`;
      case "notificationsPassportExpiry":
        return `Passport validity alert: ${vars.client}'s passport does not have 7 months validity from the departure date of ${vars.program}.\nDeparture: ${vars.departureDate}\nExpiry date: ${vars.date}\nValidity from departure: ${vars.validity}`;
      case "notificationsPassportExpiredBeforeTravel":
        return `${vars.client}'s passport expires before the departure date of ${vars.program}.\nDeparture: ${vars.departureDate}\nExpiry date: ${vars.date}`;
      default:
        return "";
    }
  };

  switch (notification.type) {
    case "system:seat_low": {
      const seats = typeof program?.seats === "number" ? program.seats : 0;
      const seatsLeft = Math.max(0, seats - relatedClients.length);
      return translate("notificationsSeatLow", { program: programName, seats: seatsLeft });
    }
    case "system:seat_full": {
      return translate("notificationsSeatFull", { program: programName });
    }
    case "system:unsettled": {
      const unsettled = getClientStatus
        ? relatedClients.filter((c) => getClientStatus(c) !== "cleared")
        : relatedClients;
      let daysLeft = 0;
      if (program?.departure) {
        const depDate = new Date(program.departure);
        if (!Number.isNaN(depDate.getTime())) {
          daysLeft = Math.max(0, Math.ceil((depDate - Date.now()) / (1000 * 60 * 60 * 24)));
        }
      }
      return translate("notificationsUnsettled", {
        program: programName,
        count: unsettled.length,
        days: daysLeft,
      });
    }
    case "system:archive_due": {
      let daysAgo = 0;
      const refDate = program?.returnDate || program?.departure;
      if (refDate) {
        const parsed = new Date(refDate);
        if (!Number.isNaN(parsed.getTime())) {
          daysAgo = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24)));
        }
      }
      return translate("notificationsArchive", { program: programName, days: daysAgo });
    }
    case PROGRAM_FULLY_CLEARED_ARCHIVE_NOTIFICATION_TYPE: {
      const meta = notification.meta || {};
      return translate("notificationsProgramFullyClearedArchiveBody", {
        programName: meta.programName || programName,
      });
    }
    case "system:departure_11days": {
      const meta = notification.meta || {};
      return translate("notificationsDepartureSoon", {
        program: meta.programName || programName,
        date: meta.departureDate || "",
        days: meta.daysLeft ?? 0,
      });
    }
    case "system:departure_3days": {
      const meta = notification.meta || {};
      return translate("notificationsDepartureUrgent", {
        program: meta.programName || programName,
        date: meta.departureDate || "",
        days: meta.daysLeft ?? 0,
      });
    }
    case "system:passport_expiry": {
      const meta = notification.meta || {};
      const validity = meta.remainingDaysFromDeparture !== undefined && meta.remainingDaysFromDeparture !== null
        ? `${meta.remainingDaysFromDeparture} ${meta.remainingDaysFromDeparture === 1 ? "day" : "days"}`
        : "";
      return translate(meta.expiredBeforeTravel ? "notificationsPassportExpiredBeforeTravel" : "notificationsPassportExpiry", {
        client: meta.clientName || notification.title || "",
        program: meta.programName || "",
        departureDate: meta.departureDate || "",
        date: meta.expiryDate || "",
        days: meta.remainingDaysFromDeparture ?? "",
        validity,
      });
    }
    default:
      return notification.message || "";
  }
}
