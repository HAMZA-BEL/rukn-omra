import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { SingleLineName } from "./SmartBadge";

describe("SmartBadge pilgrim-name auto-fit", () => {
  let host;
  let root;
  let observers;
  let frames;
  let naturalWidth;
  let availableWidth;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    observers = [];
    frames = new Map();
    naturalWidth = 420;
    availableWidth = 210;
    let nextFrame = 1;
    window.requestAnimationFrame = jest.fn((callback) => {
      const id = nextFrame++;
      frames.set(id, callback);
      return id;
    });
    window.cancelAnimationFrame = jest.fn((id) => frames.delete(id));
    const nativeGetComputedStyle = window.getComputedStyle.bind(window);
    jest.spyOn(window, "getComputedStyle").mockImplementation((element) => {
      const style = nativeGetComputedStyle(element);
      return new Proxy(style, { get(target, key) { return key === "fontSize" ? "21px" : target[key]; } });
    });
    global.ResizeObserver = class {
      constructor(callback) { this.callback = callback; this.disconnect = jest.fn(); observers.push(this); }
      observe = jest.fn();
    };
    jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function getRect() {
      if (this.dataset?.smartBadgeNameMeasure === "true") return { width:naturalWidth, height:20, left:0, top:0, right:naturalWidth, bottom:20 };
      return { width:availableWidth, height:40, left:0, top:0, right:availableWidth, bottom:40 };
    });
    jest.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function getWidth() {
      return this.dataset?.smartBadgeNameMeasure === "true" ? naturalWidth : availableWidth;
    });
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    jest.restoreAllMocks();
    delete global.ResizeObserver;
    delete global.IS_REACT_ACT_ENVIRONMENT;
  });

  const flushFrames = async () => {
    await act(async () => {
      const queued = [...frames.values()];
      frames.clear();
      queued.forEach((callback) => callback());
    });
  };

  const renderName = async (autoFit = true) => {
    await act(async () => root.render(<div><SingleLineName autoFit={autoFit}>عبدالرحمن محمد عبدالسلام العثماني</SingleLineName></div>));
  };

  test("fits the long Arabic name on one line through one scheduled measurement", async () => {
    await renderName();
    expect(observers).toHaveLength(1);
    expect(frames.size).toBe(1);
    await flushFrames();
    const name = host.querySelector("[data-single-line-name]");
    expect(name.style.fontSize).toBe("14px");
    expect(name.dataset.fittedFontSize).toBe("14");
  });

  test("identical measurements do not rewrite the fitted font size", async () => {
    await renderName();
    await flushFrames();
    const name = host.querySelector("[data-single-line-name]");
    const styleBefore = name.getAttribute("style");
    observers[0].callback([]);
    observers[0].callback([]);
    expect(frames.size).toBe(1);
    await flushFrames();
    expect(name.getAttribute("style")).toBe(styleBefore);
  });

  test("a container-width change schedules one controlled recalculation", async () => {
    naturalWidth = 300;
    await renderName();
    await flushFrames();
    const name = host.querySelector("[data-single-line-name]");
    expect(name.style.fontSize).toBe("14.7px");
    availableWidth = 270;
    observers[0].callback([]);
    observers[0].callback([]);
    expect(frames.size).toBe(1);
    await flushFrames();
    expect(name.style.fontSize).toBe("18.9px");
  });

  test("manual customization disables auto-fit and preserves the manual font", async () => {
    await act(async () => root.render(<div><SingleLineName autoFit={false}>عبدالرحمن محمد عبدالسلام العثماني</SingleLineName></div>));
    expect(observers).toHaveLength(0);
    expect(frames.size).toBe(0);
    expect(host.querySelector("[data-single-line-name]").style.fontSize).toBe("");
  });

  test("unmount disconnects the observer and cancels a pending frame", async () => {
    await renderName();
    const pendingFrame = [...frames.keys()][0];
    await act(async () => root.unmount());
    expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(pendingFrame);
    expect(document.querySelector("[data-smart-badge-name-measure='true']")).toBeNull();
    host.remove();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });
});
