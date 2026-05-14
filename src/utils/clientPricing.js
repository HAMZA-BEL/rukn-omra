import {
  clientServiceIncludesAccommodation,
  getClientServiceType,
} from "./clientServiceTypes";

export const toClientPriceNumber = (value) => {
  if (value === "" || value === null || value === undefined) return 0;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
};

const firstPositiveClientPrice = (...values) => (
  values.map(toClientPriceNumber).find((number) => number > 0) || 0
);

export const isManualOnlyPriceServiceType = (source) => {
  const serviceType = getClientServiceType(source);
  return serviceType === "ticket_only" || serviceType === "visa_only";
};

export const getClientEffectiveSalePrice = (client = {}) => {
  const salePrice = toClientPriceNumber(client.salePrice ?? client.sale_price);
  if (isManualOnlyPriceServiceType(client)) return salePrice;

  const hasSalePrice = client.salePrice !== undefined && client.salePrice !== null
    || client.sale_price !== undefined && client.sale_price !== null;
  if (getClientServiceType(client) === "full_package") {
    return hasSalePrice ? salePrice : toClientPriceNumber(client.price);
  }

  if (salePrice > 0) return salePrice;
  return firstPositiveClientPrice(client.price, client.officialPrice, client.official_price);
};

export const getClientEffectiveOfficialPrice = (client = {}) => {
  if (!clientServiceIncludesAccommodation(client)) return 0;
  const officialPrice = toClientPriceNumber(client.officialPrice ?? client.official_price);
  if (officialPrice > 0) return officialPrice;
  return getClientEffectiveSalePrice(client);
};

export const getClientRemainingAmount = (client = {}, paid = 0) => (
  Math.max(0, getClientEffectiveSalePrice(client) - toClientPriceNumber(paid))
);
