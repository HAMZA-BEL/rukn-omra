import {
  PRODUCTION_INACTIVITY_TIMEOUT_MS,
  PRODUCTION_WARNING_DURATION_MS,
} from "./sessionTimeoutConfig";

test("production inactivity protection remains ten minutes with a one-minute warning", () => {
  expect(PRODUCTION_INACTIVITY_TIMEOUT_MS).toBe(10 * 60 * 1000);
  expect(PRODUCTION_WARNING_DURATION_MS).toBe(60 * 1000);
});
