import { PROGRAM_ROOM_PRICE_KEYS, normalizeProgramPackages } from "./programPackages";
import { getProgramCapacity, getProgramCapacityInfo } from "./programCapacity";

const toProgramId = (programOrId) => String(programOrId?.id ?? programOrId ?? "");

const getPaidForClient = (client, getClientTotalPaid) => {
  if (!client?.id || typeof getClientTotalPaid !== "function") return 0;
  return Number(getClientTotalPaid(client.id)) || 0;
};

const getPackagePriceValues = (packages) => (
  packages.flatMap((pkg) => {
    const prices = pkg?.prices && typeof pkg.prices === "object" ? pkg.prices : {};
    return PROGRAM_ROOM_PRICE_KEYS
      .map((key) => Number(prices[key]))
      .filter((value) => Number.isFinite(value) && value > 0);
  })
);

export const getProgramPackageSummary = (program = {}) => {
  const packages = normalizeProgramPackages(program);
  const prices = getPackagePriceValues(packages);
  const firstPackage = packages[0] || {};

  return {
    packageCount: packages.length,
    startingPrice: prices.length ? Math.min(...prices) : 0,
    primaryHotelMecca: firstPackage.hotelMecca || program.hotelMecca || "",
    primaryHotelMadina: firstPackage.hotelMadina || program.hotelMadina || "",
    hasMultiplePackages: packages.length > 1,
  };
};

export function buildProgramListSummaryById({
  programs = [],
  clientsByProgramId = new Map(),
  activeClientsByProgramId = new Map(),
  getClientTotalPaid,
  getProgramClientRemainingAmount,
  getProgramClientPaymentStatus,
  getClientStatusRemainingAmount,
  getProgramKind,
  getProgramDepartureYear,
} = {}) {
  const summaryById = new Map();
  const paidByClientId = new Map();
  const readClientPaid = (client) => {
    const clientId = String(client?.id || "");
    if (!clientId) return 0;
    if (paidByClientId.has(clientId)) return paidByClientId.get(clientId);
    const paid = getPaidForClient(client, getClientTotalPaid);
    paidByClientId.set(clientId, paid);
    return paid;
  };

  programs.forEach((program) => {
    if (!program?.id) return;

    const programId = toProgramId(program);
    const activeProgramClients = activeClientsByProgramId.get(programId) || [];
    const registeredCount = activeProgramClients.length;
    const capacityInfo = getProgramCapacityInfo(program, registeredCount);
    const capacity = getProgramCapacity(program);
    const hasValidCapacity = capacityInfo.hasCapacity;

    let totalPaid = 0;
    let remainingTotal = 0;
    let clearedCount = 0;
    let unpaidCount = 0;
    let partialCount = 0;

    activeProgramClients.forEach((client) => {
      const paid = readClientPaid(client);
      totalPaid += paid;

      if (typeof getProgramClientRemainingAmount === "function") {
        remainingTotal += Number(getProgramClientRemainingAmount(program, client, paid)) || 0;
      }

      const paymentStatus = typeof getProgramClientPaymentStatus === "function"
        ? getProgramClientPaymentStatus(program, client, paid)
        : "";
      if (paymentStatus === "cleared") clearedCount += 1;
      else if (paymentStatus === "unpaid") unpaidCount += 1;
      else if (paymentStatus === "partial") partialCount += 1;
    });

    let paymentStatus = "empty";
    if (activeProgramClients.length) {
      const hasUnclearedClient = activeProgramClients.some((client) => {
        const paid = readClientPaid(client);
        if (typeof getProgramClientPaymentStatus === "function") {
          return getProgramClientPaymentStatus(program, client, paid) !== "cleared";
        }
        if (typeof getClientStatusRemainingAmount !== "function") return false;
        return (Number(getClientStatusRemainingAmount(client, paid)) || 0) > 0;
      });
      paymentStatus = hasUnclearedClient ? "not_cleared" : "cleared";
    }

    const capacityStatus = !hasValidCapacity
      ? "unknown"
      : registeredCount >= capacity
        ? "full"
        : "not_full";

    summaryById.set(programId, {
      programId,
      registeredCount,
      clearedCount,
      unpaidCount,
      partialCount,
      totalPaid,
      remainingTotal,
      ...getProgramPackageSummary(program),
      capacity,
      hasValidCapacity,
      remainingSeats: capacityInfo.remainingSeats,
      capacityPct: hasValidCapacity ? Math.min((registeredCount / capacity) * 100, 100) : 0,
      isFull: capacityStatus === "full",
      isNotFull: capacityStatus === "not_full",
      capacityStatus,
      isCleared: paymentStatus === "cleared",
      isNotCleared: paymentStatus === "not_cleared",
      paymentStatus,
      typeKind: typeof getProgramKind === "function" ? getProgramKind(program) : "",
      year: typeof getProgramDepartureYear === "function" ? getProgramDepartureYear(program) : null,
    });
  });

  return summaryById;
}
