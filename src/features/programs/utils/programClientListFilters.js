import {
  INCOMPLETE_INFO_FILTER,
} from "../../../utils/clientCompletionStatus";
import {
  CLIENT_SERVICE_TYPES,
  getClientServiceType,
  getClientServiceTypeAllFilterLabel,
  getClientServiceTypeLabel,
} from "../../../utils/clientServiceTypes";
import {
  getClientDisplayName as resolveClientDisplayName,
} from "../../../utils/clientNames";
import {
  translateHotelLevel,
} from "../../../utils/i18nValues";
import {
  getProgramClientDisplayStatus,
  getProgramClientRemainingAmount,
  getProgramClientSalePrice,
} from "./programClientMetrics";

export function filterProgramClientsForList({
  clients,
  program,
  filter,
  packageFilter,
  serviceTypeFilter,
  search,
  getClientTotalPaid,
  lang,
}) {
  return clients.filter((client) => {
    const status = getProgramClientDisplayStatus(program, client, getClientTotalPaid(client.id));
    const matchesFilter = filter === "all" || status === filter;
    const clientPackageLevel = client.packageLevel || client.hotelLevel || "";
    const matchesPackage = packageFilter === "all"
      || (packageFilter === INCOMPLETE_INFO_FILTER && status === "information_incomplete")
      || (packageFilter === "__unassigned" && !clientPackageLevel)
      || clientPackageLevel === packageFilter;
    const matchesServiceType = serviceTypeFilter === "all" || getClientServiceType(client) === serviceTypeFilter;
    const q = search.toLowerCase();
    const name = resolveClientDisplayName(client, "", lang).toLowerCase();
    const phone = (client.phone || "").toLowerCase();
    const id = (client.id || "").toLowerCase();
    const matchesSearch = !q || name.includes(q) || phone.includes(q) || id.includes(q);
    return matchesFilter && matchesPackage && matchesServiceType && matchesSearch;
  });
}

export function filterProgramClientsByTravelGroup({
  clients,
  showTravelGroupFilter,
  travelGroupFilter,
}) {
  return clients.filter((client) => {
    if (!showTravelGroupFilter || travelGroupFilter === "all") return true;
    const clientTravelGroupId = client.travelGroupId ?? client.travel_group_id ?? null;
    const normalizedTravelGroupId = typeof clientTravelGroupId === "string"
      ? clientTravelGroupId.trim()
      : clientTravelGroupId;
    if (travelGroupFilter === "__main_program") return !normalizedTravelGroupId;
    return String(normalizedTravelGroupId || "") === travelGroupFilter;
  });
}

export function computeProgramClientPaymentTotals({
  clients,
  program,
  getClientTotalPaid,
}) {
  return clients.reduce((acc, client) => {
    const paid = getClientTotalPaid(client.id);
    acc.amount += getProgramClientSalePrice(program, client);
    acc.paid += paid;
    acc.remaining += getProgramClientRemainingAmount(program, client, paid);
    return acc;
  }, { amount: 0, paid: 0, remaining: 0 });
}

export function computeProgramClientTotals({
  clients,
  program,
  getClientTotalPaid,
}) {
  return {
    revenue: clients.reduce((sum, client) => sum + getProgramClientSalePrice(program, client), 0),
    paid: clients.reduce((sum, client) => sum + getClientTotalPaid(client.id), 0),
    remaining: clients.reduce((sum, client) => (
      sum + getProgramClientRemainingAmount(program, client, getClientTotalPaid(client.id))
    ), 0),
  };
}

export function computeProgramClientStatusCounts({
  clients,
  program,
  getClientTotalPaid,
}) {
  return {
    cleared: clients.filter((client) => (
      getProgramClientDisplayStatus(program, client, getClientTotalPaid(client.id)) === "cleared"
    )).length,
    partial: clients.filter((client) => (
      getProgramClientDisplayStatus(program, client, getClientTotalPaid(client.id)) === "partial"
    )).length,
    unpaid: clients.filter((client) => (
      getProgramClientDisplayStatus(program, client, getClientTotalPaid(client.id)) === "unpaid"
    )).length,
    information_incomplete: clients.filter((client) => (
      getProgramClientDisplayStatus(program, client, getClientTotalPaid(client.id)) === "information_incomplete"
    )).length,
  };
}

export function buildProgramClientStatusFilters({
  clients,
  statusCounts,
  labels,
}) {
  return [
    { key: "all", label: labels.all, count: clients.length },
    { key: "cleared", label: labels.cleared, count: statusCounts.cleared },
    { key: "partial", label: labels.partial, count: statusCounts.partial },
    { key: "unpaid", label: labels.unpaid, count: statusCounts.unpaid },
    {
      key: "information_incomplete",
      label: labels.informationIncomplete,
      count: statusCounts.information_incomplete,
    },
  ];
}

export function buildProgramClientServiceTypeFilters({
  clients,
  t,
  lang,
}) {
  const countForServiceType = (serviceType) => (
    clients.filter((client) => getClientServiceType(client) === serviceType).length
  );
  return [
    {
      key: "all",
      label: getClientServiceTypeAllFilterLabel(t, lang),
      menuLabel: t.all,
      count: clients.length,
    },
    ...CLIENT_SERVICE_TYPES.map((serviceType) => ({
      key: serviceType.value,
      label: getClientServiceTypeLabel(serviceType.value, t, lang),
      count: countForServiceType(serviceType.value),
    })),
  ];
}

export function buildProgramClientPackageChips({
  clients,
  packages,
  program,
  getClientTotalPaid,
  labels,
  lang,
}) {
  const countForLevel = (level) => clients.filter((client) => (
    (client.packageLevel || client.hotelLevel || "") === level
  )).length;
  const unassignedCount = clients.filter((client) => !(client.packageLevel || client.hotelLevel)).length;
  const incompleteCount = clients.filter((client) => (
    getProgramClientDisplayStatus(program, client, getClientTotalPaid(client.id)) === "information_incomplete"
  )).length;
  return [
    { key: "all", label: labels.all, count: clients.length },
    ...(incompleteCount ? [{
      key: INCOMPLETE_INFO_FILTER,
      label: labels.incomplete,
      count: incompleteCount,
    }] : []),
    ...packages.map((pkg) => ({
      key: pkg.level,
      label: translateHotelLevel(pkg.level, lang) || pkg.level,
      count: countForLevel(pkg.level),
    })),
    ...(unassignedCount ? [{
      key: "__unassigned",
      label: labels.unassigned,
      count: unassignedCount,
    }] : []),
  ];
}
