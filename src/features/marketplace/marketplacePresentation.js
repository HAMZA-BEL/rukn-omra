import { normalizeProgramPackages } from "../../utils/programPackages";

const clean = (value) => String(value ?? "").trim();

export function getAgencyMarketplacePrograms(programs, agencyId) {
  if (!Array.isArray(programs)) return [];
  return programs.filter((program) => {
    if (!program || program.deleted || program.deletedAt) return false;
    const programAgencyId = clean(program.agency_id || program.agencyId);
    return !agencyId || !programAgencyId || programAgencyId === clean(agencyId);
  });
}

const PUBLIC_ROOM_PRICE_KEYS = ["single", "double", "triple", "quad", "quint"];

export function getMarketplaceStartingPrice(program = {}) {
  const prices = normalizeProgramPackages(program).flatMap((item) => (
    PUBLIC_ROOM_PRICE_KEYS
      .map((key) => Number(item?.prices?.[key]))
      .filter((value) => Number.isFinite(value) && value > 0)
  ));
  return prices.length ? Math.min(...prices) : null;
}

const publicPackage = (item = {}) => ({
  level: clean(item.level),
  hotel_mecca: clean(item.hotelMecca),
  hotel_madina: clean(item.hotelMadina),
  madinah_nights: item.madinahNights !== "" && item.madinahNights !== null && item.madinahNights !== undefined
    && Number.isInteger(Number(item.madinahNights)) && Number(item.madinahNights) >= 0
    ? Number(item.madinahNights)
    : null,
  meal_plan: clean(item.mealPlan),
  prices: PUBLIC_ROOM_PRICE_KEYS.reduce((result, key) => {
    const value = Number(item?.prices?.[key]);
    if (Number.isFinite(value) && value > 0) result[key] = value;
    return result;
  }, {}),
});

export function buildMarketplaceSnapshot(program = {}, agency = {}) {
  return {
    schema_version: 1,
    title: clean(program.name || program.title),
    title_fr: clean(program.nameFr || program.name_fr),
    program_type: clean(program.type),
    departure_date: clean(program.departure || program.departureDate),
    return_date: clean(program.returnDate || program.return_date),
    duration: clean(program.duration),
    transport: clean(program.transport),
    route: clean(program.posterTravelRoute || program.outboundRouteText),
    starting_price: getMarketplaceStartingPrice(program),
    packages: normalizeProgramPackages(program).map(publicPackage),
    agency: {
      name_ar: clean(agency.nameAr || agency.name_ar),
      name_fr: clean(agency.nameFr || agency.name_fr),
      city: clean(agency.city || agency.agency_city),
      contact_phone: clean(
        agency.phoneTiznit1
        || agency.phone_tiznit1
        || agency.phoneAgadir1
        || agency.phone_agadir1
      ),
      website: clean(agency.website),
    },
  };
}

export function getMarketplaceProgramPreview(program = {}) {
  const packages = normalizeProgramPackages(program);
  return {
    name: clean(program.name || program.title),
    type: clean(program.type),
    departure: clean(program.departure || program.departureDate),
    returnDate: clean(program.returnDate || program.return_date),
    duration: clean(program.duration),
    status: clean(program.status) || "active",
    transport: clean(program.transport),
    route: clean(program.posterTravelRoute || program.outboundRouteText),
    startingPrice: getMarketplaceStartingPrice(program),
    packages: packages.map((item) => ({
      id: item.id,
      level: clean(item.level),
      hotelMecca: clean(item.hotelMecca),
      hotelMadina: clean(item.hotelMadina),
      mealPlan: clean(item.mealPlan),
      prices: publicPackage(item).prices,
    })),
  };
}

export function getMarketplaceListingCounts(listings = []) {
  return (Array.isArray(listings) ? listings : []).reduce((counts, listing) => {
    if (listing?.status === "published") counts.published += 1;
    if (listing?.status === "draft") counts.draft += 1;
    if (listing?.status === "hidden") counts.hidden += 1;
    return counts;
  }, { published: 0, draft: 0, hidden: 0 });
}

export function getMarketplaceListingByProgram(listings = [], programId) {
  return (Array.isArray(listings) ? listings : []).find(
    (listing) => clean(listing?.programId || listing?.program_id) === clean(programId)
  ) || null;
}
