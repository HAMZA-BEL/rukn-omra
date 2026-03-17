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
    default:
      return notification.message || "";
  }
}
