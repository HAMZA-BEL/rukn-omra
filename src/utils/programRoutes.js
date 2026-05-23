const cleanRoutePart = (value) => String(value || "").trim();

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
  if (source) return source.map(cleanRoutePart).filter(Boolean);

  const text = cleanRoutePart(value);
  if (!text) return [];
  return text
    .split(/[\/←]+/)
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

export const buildPosterTravelRoute = (program = {}) => {
  const customRoute = formatRouteText(program.posterTravelRoute ?? program.poster_travel_route);
  if (customRoute) return customRoute;

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

  if (outboundRoute && returnRoute) return `${outboundRoute} / ${returnRoute}`;
  return outboundRoute || returnRoute || "";
};
