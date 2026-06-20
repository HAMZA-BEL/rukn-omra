export const CONTRACT_TRAVEL_CONTEXT_SOURCES = Object.freeze({
  MAIN_PROGRAM: "main_program",
  TRAVEL_GROUP: "travel_group",
  STALE_TRAVEL_GROUP: "stale_travel_group",
});

export const CONTRACT_TRAVEL_CONTEXT_WARNINGS = Object.freeze({
  MISSING_TRAVEL_GROUP: "missing_travel_group",
});

const hasOwn = (source, key) => Object.prototype.hasOwnProperty.call(source || {}, key);

const cleanText = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const firstText = (...values) => {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return "";
};

const normalizeId = (value) => cleanText(value);

const getSourceContextKey = (source, travelGroupId = "") => {
  const normalizedTravelGroupId = normalizeId(travelGroupId);
  if (source === CONTRACT_TRAVEL_CONTEXT_SOURCES.TRAVEL_GROUP) {
    return `travel_group:${normalizedTravelGroupId}`;
  }
  if (source === CONTRACT_TRAVEL_CONTEXT_SOURCES.STALE_TRAVEL_GROUP) {
    return `stale_travel_group:${normalizedTravelGroupId}`;
  }
  return CONTRACT_TRAVEL_CONTEXT_SOURCES.MAIN_PROGRAM;
};

export const getClientTravelGroupId = (client = {}) => (
  firstText(client.travelGroupId, client.travel_group_id)
);

export const buildTravelGroupById = (travelGroups = []) => {
  if (travelGroups instanceof Map) {
    return new Map(
      Array.from(travelGroups.entries())
        .map(([key, value]) => [normalizeId(value?.id || key), value])
        .filter(([key, value]) => key && value)
    );
  }

  if (Array.isArray(travelGroups)) {
    return new Map(
      travelGroups
        .map((group) => [normalizeId(group?.id), group])
        .filter(([key, value]) => key && value)
    );
  }

  if (travelGroups && typeof travelGroups === "object") {
    return new Map(
      Object.entries(travelGroups)
        .map(([key, value]) => [normalizeId(value?.id || key), value])
        .filter(([key, value]) => key && value)
    );
  }

  return new Map();
};

const getTravelGroupFromInput = (travelGroupByIdOrGroups, travelGroupId) => {
  const normalizedTravelGroupId = normalizeId(travelGroupId);
  if (!normalizedTravelGroupId) return null;
  return buildTravelGroupById(travelGroupByIdOrGroups).get(normalizedTravelGroupId) || null;
};

const withAliases = (target, keys, value) => {
  const text = cleanText(value);
  if (!text) return target;
  keys.forEach((key) => {
    target[key] = text;
  });
  return target;
};

const buildProgramWithTravelGroup = (program = {}, travelGroup = {}) => {
  const resolvedProgram = { ...(program || {}) };

  withAliases(
    resolvedProgram,
    ["departure", "departureDate", "departure_date"],
    firstText(travelGroup.departure, travelGroup.departureDate, travelGroup.departure_date)
  );
  withAliases(
    resolvedProgram,
    ["returnDate", "return_date"],
    firstText(travelGroup.returnDate, travelGroup.return_date)
  );
  withAliases(
    resolvedProgram,
    ["visitOrder", "visit_order"],
    firstText(travelGroup.visitOrder, travelGroup.visit_order)
  );
  withAliases(
    resolvedProgram,
    ["hotelCheckinDay", "hotel_checkin_day", "hotelCheckIn", "hotel_check_in"],
    firstText(
      travelGroup.hotelCheckinDay,
      travelGroup.hotel_checkin_day,
      travelGroup.hotelCheckIn,
      travelGroup.hotel_check_in
    )
  );
  withAliases(
    resolvedProgram,
    ["airline", "company", "compagnie", "carrier", "transport", "airlineName", "airline_name"],
    firstText(
      travelGroup.airline,
      travelGroup.company,
      travelGroup.compagnie,
      travelGroup.carrier,
      travelGroup.transport,
      travelGroup.airlineName,
      travelGroup.airline_name
    )
  );
  withAliases(
    resolvedProgram,
    ["route", "itinerary", "travelRoute", "travel_route", "routeText", "route_text"],
    firstText(
      travelGroup.route,
      travelGroup.itinerary,
      travelGroup.travelRoute,
      travelGroup.travel_route,
      travelGroup.routeText,
      travelGroup.route_text
    )
  );

  return resolvedProgram;
};

export const getTravelGroupContextKey = (clientOrContext = {}, travelGroupByIdOrGroups) => {
  if (hasOwn(clientOrContext, "source")) {
    return getSourceContextKey(clientOrContext.source, clientOrContext.travelGroupId);
  }

  const travelGroupId = getClientTravelGroupId(clientOrContext);
  if (!travelGroupId) return CONTRACT_TRAVEL_CONTEXT_SOURCES.MAIN_PROGRAM;
  if (travelGroupByIdOrGroups !== undefined) {
    const travelGroup = getTravelGroupFromInput(travelGroupByIdOrGroups, travelGroupId);
    return getSourceContextKey(
      travelGroup
        ? CONTRACT_TRAVEL_CONTEXT_SOURCES.TRAVEL_GROUP
        : CONTRACT_TRAVEL_CONTEXT_SOURCES.STALE_TRAVEL_GROUP,
      travelGroupId
    );
  }
  return getSourceContextKey(CONTRACT_TRAVEL_CONTEXT_SOURCES.TRAVEL_GROUP, travelGroupId);
};

export function resolveClientTravelContext(client = {}, program = {}, travelGroupByIdOrGroups = []) {
  const travelGroupId = getClientTravelGroupId(client);
  const baseProgram = program || {};
  const mainProgramContext = {
    client,
    baseProgram,
    program: { ...baseProgram },
    travelGroup: null,
    travelGroupId,
    source: CONTRACT_TRAVEL_CONTEXT_SOURCES.MAIN_PROGRAM,
    contextKey: CONTRACT_TRAVEL_CONTEXT_SOURCES.MAIN_PROGRAM,
    warnings: [],
  };

  if (!travelGroupId) return mainProgramContext;

  const travelGroup = getTravelGroupFromInput(travelGroupByIdOrGroups, travelGroupId);
  if (!travelGroup) {
    return {
      ...mainProgramContext,
      source: CONTRACT_TRAVEL_CONTEXT_SOURCES.STALE_TRAVEL_GROUP,
      contextKey: getSourceContextKey(CONTRACT_TRAVEL_CONTEXT_SOURCES.STALE_TRAVEL_GROUP, travelGroupId),
      warnings: [CONTRACT_TRAVEL_CONTEXT_WARNINGS.MISSING_TRAVEL_GROUP],
    };
  }

  return {
    client,
    baseProgram,
    program: buildProgramWithTravelGroup(baseProgram, travelGroup),
    travelGroup,
    travelGroupId,
    source: CONTRACT_TRAVEL_CONTEXT_SOURCES.TRAVEL_GROUP,
    contextKey: getSourceContextKey(CONTRACT_TRAVEL_CONTEXT_SOURCES.TRAVEL_GROUP, travelGroupId),
    warnings: [],
  };
}
