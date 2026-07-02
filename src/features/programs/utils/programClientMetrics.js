import { getClientDisplayStatus } from "../../../utils/clientCompletionStatus";
import {
  getClientEffectiveOfficialPrice,
  getClientEffectiveSalePrice,
  getClientOverpaidAmount,
  getClientPaymentStatus,
  getClientRemainingAmount,
} from "../../../utils/clientPricing";
import { getClientServiceType } from "../../../utils/clientServiceTypes";
import {
  getProgramServiceCostingReferenceCost,
  getProgramStandaloneServiceSalePrice,
} from "../../../components/programs/programCosting";

export const getProgramPricingReferenceCost = (program, client) => {
  if (!program || !client) return 0;
  return getProgramServiceCostingReferenceCost(program, getClientServiceType(client));
};

export const getProgramStandaloneSalePrice = (program, client) => {
  if (!program || !client) return 0;
  return getProgramStandaloneServiceSalePrice(program, getClientServiceType(client));
};

export const getProgramClientSalePrice = (program, client) => (
  getClientEffectiveSalePrice(client, {
    referencePrice: getProgramPricingReferenceCost(program, client),
    standaloneSalePrice: getProgramStandaloneSalePrice(program, client),
    program,
  })
);

export const getProgramClientOfficialPrice = (program, client) => {
  const referencePrice = getProgramPricingReferenceCost(program, client);
  return getClientEffectiveOfficialPrice(client, {
    referencePrice,
    program,
  }) || referencePrice;
};

export const getProgramClientRemainingAmount = (program, client, paid) => (
  getClientRemainingAmount(client, paid, {
    referencePrice: getProgramPricingReferenceCost(program, client),
    standaloneSalePrice: getProgramStandaloneSalePrice(program, client),
    program,
  })
);

export const getProgramClientOverpaidAmount = (program, client, paid) => (
  getClientOverpaidAmount(client, paid, {
    referencePrice: getProgramPricingReferenceCost(program, client),
    standaloneSalePrice: getProgramStandaloneSalePrice(program, client),
    program,
  })
);

export const getClientCreatedSortTime = (client = {}) => {
  const candidates = [
    client.createdAt,
    client.created_at,
    client.registrationDate,
    client.registration_date,
    client.lastModified,
    client.last_modified,
  ];
  for (const value of candidates) {
    const time = Date.parse(value || "");
    if (Number.isFinite(time)) return time;
  }
  return 0;
};

export const sortProgramClientsNewestFirst = (items = []) => (
  [...items]
    .map((client, index) => ({ client, index, createdTime: getClientCreatedSortTime(client) }))
    .sort((a, b) => (b.createdTime - a.createdTime) || (a.index - b.index))
    .map(({ client }) => client)
);

export const upsertProgramClientsNewestFirst = (currentClients = [], incomingClients = []) => {
  const currentById = new Map((Array.isArray(currentClients) ? currentClients : [])
    .map((client) => [String(client?.id || ""), client])
    .filter(([id]) => Boolean(id)));
  const incoming = (Array.isArray(incomingClients) ? incomingClients : [incomingClients]).filter((client) => client?.id);
  const incomingIds = new Set(incoming.map((client) => String(client.id)));
  const mergedIncoming = incoming.map((client) => ({
    ...(currentById.get(String(client.id)) || {}),
    ...client,
  }));
  const rest = (Array.isArray(currentClients) ? currentClients : [])
    .filter((client) => !incomingIds.has(String(client?.id || "")));
  return sortProgramClientsNewestFirst([...mergedIncoming, ...rest]);
};

export const getProgramClientPaymentStatus = (program, client, paid) => {
  return getClientPaymentStatus(client, paid, {
    referencePrice: getProgramPricingReferenceCost(program, client),
    standaloneSalePrice: getProgramStandaloneSalePrice(program, client),
    program,
  });
};

export const getProgramClientDisplayStatus = (program, client, paid) => (
  getClientDisplayStatus(
    client,
    program,
    getProgramClientPaymentStatus(program, client, paid),
    {
      referencePrice: getProgramPricingReferenceCost(program, client),
      standaloneSalePrice: getProgramStandaloneSalePrice(program, client),
    },
  )
);
