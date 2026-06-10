import {
  clientServiceIncludesAccommodation,
  getClientServiceType,
} from "./clientServiceTypes";
import {
  getPackageRoomPrice,
  normalizeProgramPackages,
  normalizeRoomTypeKey,
} from "./programPackages";
import { getClientAssignmentStatus } from "./clientCompletionStatus";

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
  if (!getClientAssignmentStatus(client, program).shouldCalculatePrice) return 0;
  const packages = normalizeProgramPackages(program);
  if (!packages.length) return toClientPriceNumber(program.price);
  const packageId = getClientPackageId(client);
  const level = getClientPackageLevel(client);
  const selectedPackage = packages.find((pkg) => (
    (packageId && pkg.id === packageId)
    || (level && pkg.level === level)
  )) || null;
  if (!selectedPackage) return toClientPriceNumber(program.price);
  const roomType = getClientRoomType(client);
  if (!roomType) return 0;
  return firstPositiveClientPrice(
    getPackageRoomPrice(selectedPackage, roomType),
    program.price,
  );
};

export const isManualOnlyPriceServiceType = (source) => {
  const serviceType = getClientServiceType(source);
  return serviceType === "ticket_only" || serviceType === "visa_only";
};

export const getClientEffectiveSalePrice = (client = {}, { referencePrice = 0, standaloneSalePrice = 0, program = null, officialPrice } = {}) => {
  if (program && !getClientAssignmentStatus(client, program, { referencePrice, standaloneSalePrice, officialPrice }).shouldCalculatePrice) {
    return 0;
  }
  const salePrice = toClientPriceNumber(client.salePrice ?? client.sale_price);
  const fallbackReferencePrice = toClientPriceNumber(referencePrice);
  const fallbackStandaloneSalePrice = toClientPriceNumber(standaloneSalePrice);
  if (isManualOnlyPriceServiceType(client)) {
    return salePrice > 0 ? salePrice : firstPositiveClientPrice(fallbackStandaloneSalePrice, fallbackReferencePrice);
  }

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
  if (program && !getClientAssignmentStatus(client, program, { referencePrice }).shouldCalculatePrice) return 0;
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

export const getClientOverpaidAmount = (client = {}, paid = 0, options = {}) => (
  options.program && !getClientAssignmentStatus(client, options.program, options).shouldCalculatePrice
    ? 0
    : Math.max(0, toClientPriceNumber(paid) - getClientEffectiveSalePrice(client, options))
);
