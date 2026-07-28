import { clearSupabaseLogoutAppStorage } from "./localStorageHardening";

test("logout cleanup removes sensitive data only from the current browser storage", () => {
  const otherDevice = new Map([
    ["umrah_agency_v4_agency-1", "sensitive-other-device-data"],
  ]);
  window.localStorage.setItem("umrah_agency_v4_agency-1", "sensitive-current-data");
  window.localStorage.setItem("unrelated-key", "keep");

  clearSupabaseLogoutAppStorage("agency-1");

  expect(window.localStorage.getItem("umrah_agency_v4_agency-1")).toBeNull();
  expect(window.localStorage.getItem("unrelated-key")).toBe("keep");
  expect(otherDevice.get("umrah_agency_v4_agency-1")).toBe("sensitive-other-device-data");
  window.localStorage.removeItem("unrelated-key");
});
