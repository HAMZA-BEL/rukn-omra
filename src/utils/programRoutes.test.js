import { formatProgramTravelRoute, normalizeRouteStops } from "./programRoutes";

test("returns an empty value when no real route exists", () => {
  expect(formatProgramTravelRoute({})).toBe("");
  expect(formatProgramTravelRoute({ outboundRouteStops: [], returnRouteStops: [] })).toBe("");
});

test("formats a simple Arabic route from ordered structured stops", () => {
  expect(formatProgramTravelRoute({ outboundRouteStops: ["الدار البيضاء", "المدينة المنورة"] }))
    .toBe("الدار البيضاء ← المدينة المنورة");
});

test("formats multiple outbound and return stops without assuming a fixed itinerary", () => {
  expect(formatProgramTravelRoute({
    outbound_route_stops: ["أكادير", "جدة", "المدينة"],
    return_route_stops: ["جدة", "الدار البيضاء"],
  })).toBe("أكادير ← جدة ← المدينة | جدة ← الدار البيضاء");
});

test("keeps Latin airport codes readable and supports different outbound and return airports", () => {
  expect(formatProgramTravelRoute({
    outboundRouteStops: ["AGA", "MED"],
    returnRouteStops: ["JED", "CMN"],
  })).toBe("AGA ← MED | JED ← CMN");
});

test("normalizes segment objects and avoids duplicate connecting points", () => {
  expect(normalizeRouteStops([
    { origin: { code: "CMN" }, destination: { code: "MED" } },
    { from: "MED", to: "JED" },
  ])).toEqual(["CMN", "MED", "JED"]);
});

test.each(["route", "travel_route", "travelRoute", "route_text", "routeText", "itinerary"])(
  "supports the legacy %s alias as a fallback",
  (key) => expect(formatProgramTravelRoute({ [key]: "الرباط → جدة → الرباط" })).toBe("الرباط ← جدة ← الرباط")
);
