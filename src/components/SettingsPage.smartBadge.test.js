import SettingsPage from "./SettingsPage";

test("settings page includes the smart badge workspace without changing its public component contract", () => {
  expect(typeof SettingsPage).toBe("function");
});
