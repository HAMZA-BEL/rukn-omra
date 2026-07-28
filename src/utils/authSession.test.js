import {
  beginSessionLogoutOnce,
  signOutCurrentSession,
} from "./authSession";

const createIndependentSession = (name) => {
  let valid = true;
  return {
    name,
    auth: {
      signOut: jest.fn(async ({ scope } = {}) => {
        if (scope === "local") valid = false;
        return { error: null };
      }),
    },
    canRequest: () => valid,
  };
};

test("idle logout in session B leaves independent session A valid", async () => {
  const sessionA = createIndependentSession("A");
  const sessionB = createIndependentSession("B");

  expect(sessionA.canRequest()).toBe(true);
  await signOutCurrentSession(sessionB.auth);

  expect(sessionB.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  expect(sessionB.canRequest()).toBe(false);
  expect(sessionA.canRequest()).toBe(true);
});

test("manual logout in session B also leaves session A valid", async () => {
  const sessionA = createIndependentSession("A");
  const sessionB = createIndependentSession("B");

  await signOutCurrentSession(sessionB.auth);

  expect(sessionB.canRequest()).toBe(false);
  expect(sessionA.canRequest()).toBe(true);
});

test("logout guard prevents repeated inactivity logout loops", () => {
  const stateRef = { current: false };
  expect(beginSessionLogoutOnce(stateRef)).toBe(true);
  expect(beginSessionLogoutOnce(stateRef)).toBe(false);
  expect(beginSessionLogoutOnce(stateRef)).toBe(false);
});
