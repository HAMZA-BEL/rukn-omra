import {
  clientServiceIncludesAccommodation,
  getClientServiceType,
} from "./clientServiceTypes";
import {
  getPackageRoomPrice,
  normalizeProgramPackages,
  normalizeRoomTypeKey,
} from "./programPackages";

export const toClientPriceNumber = (value) => {
  if (value === "" || value === null || value === undefined) return 0;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
};

const firstPositiveClientPrice = (...values) => (
  values.map(toClientPriceNumber).find((number) => number > 0) || 0
);

const firstText = (...values) => {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
};

const getClientPackageId = (client = {}) => firstText(client.packageId, client.package_id);

const getClientPackageLevel = (client = {}) => firstText(
  client.packageLevel,
  client.package_level,
  client.hotelLevel,
  client.hotel_level,
);

const getClientRoomType = (client = {}) => normalizeRoomTypeKey(firstText(
  client.roomType,
  client.room_type,
  client.roomTypeLabel,
  client.room_type_label,
));

export const getClientProgramPackagePrice = (client = {}, program = null) => {
  if (!program || !clientServiceIncludesAccommodation(client)) return 0;
  const packages = normalizeProgramPackages(program);
  if (!packages.length) return toClientPriceNumber(program.price);
  const packageId = getClientPackageId(client);
  const level = getClientPackageLevel(client);
  const selectedPackage = packages.find((pkg) => (
    (packageId && pkg.id === packageId)
    || (level && pkg.level === level)
  )) || packages[0] || null;
  if (!selectedPackage) return toClientPriceNumber(program.price);
  const roomType = getClientRoomType(client) || "double";
  return firstPositiveClientPrice(
    getPackageRoomPrice(selectedPackage, roomType),
    program.price,
  );
};

export const isManualOnlyPriceServiceType = (source) => {
  const serviceType = getClientServiceType(source);
  return serviceType === "ticket_only" || serviceType === "visa_only";
};

export const getClientEffectiveSalePrice = (client = {}, { referencePrice = 0, program = null, officialPrice } = {}) => {
  const salePrice = toClientPriceNumber(client.salePrice ?? client.sale_price);
  const fallbackReferencePrice = toClientPriceNumber(referencePrice);
  if (isManualOnlyPriceServiceType(client)) return salePrice > 0 ? salePrice : fallbackReferencePrice;

  if (salePrice > 0) return salePrice;
  return firstPositiveClientPrice(
    client.price,
    client.officialPrice,
    client.official_price,
    officialPrice,
    getClientProgramPackagePrice(client, program),
    fallbackReferencePrice,
  );
};

export const getClientEffectiveOfficialPrice = (client = {}, { referencePrice = 0, program = null } = {}) => {
  if (!clientServiceIncludesAccommodation(client)) return 0;
  const officialPrice = toClientPriceNumber(client.officialPrice ?? client.official_price);
  if (officialPrice > 0) return officialPrice;
  return firstPositiveClientPrice(
    getClientProgramPackagePrice(client, program),
    getClientEffectiveSalePrice(client, { referencePrice, program }),
  );
};

export const getClientRemainingAmount = (client = {}, paid = 0, options = {}) => (
  Math.max(0, getClientEffectiveSalePrice(client, options) - toClientPriceNumber(paid))
);
