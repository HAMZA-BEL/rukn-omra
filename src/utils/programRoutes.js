const cleanRoutePart = (value) => String(value || "").trim();

const routePointText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value !== "object") return cleanRoutePart(value);
  return cleanRoutePart(
    value.label ?? value.name ?? value.city ?? value.airportName ?? value.airport_name
    ?? value.code ?? value.iata ?? value.value
  );
};

const structuredStops = (items = []) => {
  const result = [];
  items.forEach((item) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const origin = routePointText(item.origin ?? item.from ?? item.departure ?? item.departureAirport ?? item.departure_airport);
      const destination = routePointText(item.destination ?? item.to ?? item.arrival ?? item.arrivalAirport ?? item.arrival_airport);
      [origin, destination].filter(Boolean).forEach((point) => {
        if (result.at(-1) !== point) result.push(point);
      });
      if (!origin && !destination) {
        const point = routePointText(item);
        if (point && result.at(-1) !== point) result.push(point);
      }
      return;
    }
    const point = routePointText(item);
    if (point && result.at(-1) !== point) result.push(point);
  });
  return result;
};

const parseJsonStops = (value) => {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text.startsWith("[")) return null;
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const normalizeRouteStops = (value) => {
  const source = Array.isArray(value) ? value : parseJsonStops(value);
  if (source) return structuredStops(source);

  const text = cleanRoutePart(value);
  if (!text) return [];
  return text
    .split(/[\/←→|]+/)
    .map(cleanRoutePart)
    .filter(Boolean);
};

export const routeStopsToText = (stops = []) => (
  normalizeRouteStops(stops).join(" / ")
);

export const routeStopsToDisplayText = (stops = []) => (
  normalizeRouteStops(stops).join(" ← ")
);

export const formatRouteText = (value) => {
  return routeStopsToDisplayText(normalizeRouteStops(value));
};

export const formatProgramTravelRoute = (program = {}) => {
  const outboundStops = normalizeRouteStops(
    program.outboundRouteStops
      ?? program.outbound_route_stops
      ?? program.outboundRouteText
      ?? program.outbound_route_text
  );
  const returnStops = normalizeRouteStops(
    program.returnRouteStops
      ?? program.return_route_stops
      ?? program.returnRouteText
      ?? program.return_route_text
  );
  const outboundRoute = routeStopsToDisplayText(outboundStops);
  const returnRoute = routeStopsToDisplayText(returnStops);

  if (outboundRoute || returnRoute) return [outboundRoute, returnRoute].filter(Boolean).join(" | ");

  const legacyRoute = formatRouteText(
    program.route ?? program.travel_route ?? program.travelRoute
    ?? program.route_text ?? program.routeText ?? program.itinerary
  );
  if (legacyRoute) return legacyRoute;

  return formatRouteText(program.posterTravelRoute ?? program.poster_travel_route);
};

// Compatibility export used by poster features. Route interpretation now has
// one canonical source for the program form, contracts and printable outputs.
export const buildPosterTravelRoute = formatProgramTravelRoute;
