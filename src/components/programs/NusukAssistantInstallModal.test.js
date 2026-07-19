import React, { act } from "react";
import { createRoot } from "react-dom/client";
import fs from "fs";
import path from "path";
import NusukAssistantInstallModal from "./NusukAssistantInstallModal";

jest.mock("../UI", () => {
  const React = require("react");
  return {
    Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
    Modal: ({ open, onClose, title, children }) => open ? (
      <div role="dialog" aria-label={title}>
        <button aria-label="إغلاق النافذة" onClick={onClose}>×</button>
        {children}
      </div>
    ) : null,
  };
});

const STORE_URL = "https://chromewebstore.google.com/detail/%D9%85%D8%B3%D8%A7%D8%B9%D8%AF-%D8%B1%D9%83%D9%86-%D9%84%D9%86%D8%B3%D9%83/pfcikaheakeljhimjmbablpnpeghggid";
const programsPageSource = fs.readFileSync(
  path.resolve(__dirname, "../ProgramsPage.jsx"),
  "utf8"
);

describe("Nusuk assistant install link", () => {
  test("uses the exact official extension URL in a protected new tab", () => {
    expect(programsPageSource).toContain(
      `const RUKN_NUSUK_ASSISTANT_STORE_URL = "${STORE_URL}";`
    );
    expect(programsPageSource).toContain(
      'window.open(getNusukAssistantInstallUrl(), "_blank", "noopener,noreferrer");'
    );
    expect(STORE_URL).not.toBe("https://chromewebstore.google.com/");
    expect(STORE_URL).not.toMatch(/[?&](q|query|search)=/i);
    expect(STORE_URL).toMatch(/\/pfcikaheakeljhimjmbablpnpeghggid$/);
    expect(programsPageSource).not.toContain(
      "https://chrome.google.com/webstore/detail/REPLACE_WITH_RUKN_ASSISTANT_EXTENSION_ID"
    );
  });

  test("install handler only opens the store and does not alter upload state", () => {
    const handlerStart = programsPageSource.indexOf("const handleInstallNusukAssistant");
    const handlerEnd = programsPageSource.indexOf(
      "const handleProgramCardNusukUploadToggle",
      handlerStart
    );
    const handlerSource = programsPageSource.slice(handlerStart, handlerEnd);

    expect(handlerSource).toContain(
      'window.open(getNusukAssistantInstallUrl(), "_blank", "noopener,noreferrer");'
    );
    expect(handlerSource).not.toMatch(/setPendingNusukUploadProgram|setIsNusukAssistantInstallOpen/);
    expect(handlerSource).not.toMatch(/openNusukUploadUrl|enableProgramForNusukUploadAndOpen/);
    expect(handlerSource).not.toMatch(/selectedFile|files|upload/i);
  });
});

describe("NusukAssistantInstallModal behavior", () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete global.IS_REACT_ACT_ENVIRONMENT;
  });

  test("keeps cancel, close, and install callbacks independent", () => {
    const onClose = jest.fn();
    const onInstall = jest.fn();
    act(() => {
      root.render(
        <NusukAssistantInstallModal
          isOpen
          onClose={onClose}
          onInstall={onInstall}
        />
      );
    });

    const buttons = Array.from(container.querySelectorAll("button"));
    const cancelButton = buttons.find((button) => button.textContent.includes("إلغاء"));
    const installButton = buttons.find((button) => button.textContent.includes("تثبيت مساعد ركن"));
    const closeButton = container.querySelector('[aria-label="إغلاق النافذة"]');

    act(() => installButton.click());
    expect(onInstall).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    act(() => cancelButton.click());
    act(() => closeButton.click());
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
