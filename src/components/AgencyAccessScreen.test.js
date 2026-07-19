import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AgencyBlockedScreen,
  AgencyLinkMissingScreen,
} from "./AgencyAccessScreen";

test("suspended and archived agencies share the same non-technical blocked screen", () => {
  const markup = renderToStaticMarkup(
    <AgencyBlockedScreen onRetry={() => {}} onLogout={() => {}} />
  );

  expect(markup).toContain("تم إيقاف حساب الوكالة");
  expect(markup).toContain("تعذر الدخول إلى ركن لأن حساب الوكالة غير نشط حاليا. يرجى التواصل مع إدارة ركن.");
  expect(markup).toContain("إعادة المحاولة");
  expect(markup).toContain("تسجيل الخروج");
  expect(markup).not.toMatch(/مؤرشفة|archived|suspended|agency_uuid|owner_email|System administrator|SELECT|SQL/i);
});

test("the missing-link screen contains only the user-safe linkage message", () => {
  const markup = renderToStaticMarkup(
    <AgencyLinkMissingScreen onLogout={() => {}} />
  );

  expect(markup).toContain("تعذر ربط الحساب بالوكالة");
  expect(markup).toContain("تم تسجيل الدخول، لكن هذا الحساب غير مرتبط بوكالة صالحة. يرجى التواصل مع إدارة ركن.");
  expect(markup).not.toMatch(/agency_uuid|owner_email|System administrator|SELECT|SQL/i);
});

test("retry is single-flight and can open Rukn without a new login", async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const login = jest.fn();
  const retryCheck = jest.fn();
  let finishRetry;

  function Harness() {
    const [blocked, setBlocked] = React.useState(true);
    if (!blocked) return <main>تطبيق ركن</main>;
    return (
      <AgencyBlockedScreen
        onRetry={() => {
          retryCheck();
          return new Promise((resolve) => {
            finishRetry = () => {
              setBlocked(false);
              resolve();
            };
          });
        }}
        onLogout={() => {}}
      />
    );
  }

  await act(async () => root.render(<Harness />));
  const retry = Array.from(host.querySelectorAll("button")).find((button) => button.textContent === "إعادة المحاولة");
  act(() => {
    retry.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(retry.disabled).toBe(true);
  act(() => {
    retry.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(retryCheck).toHaveBeenCalledTimes(1);

  await act(async () => finishRetry());

  expect(host.textContent).toContain("تطبيق ركن");
  expect(login).not.toHaveBeenCalled();

  await act(async () => root.unmount());
  host.remove();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});
