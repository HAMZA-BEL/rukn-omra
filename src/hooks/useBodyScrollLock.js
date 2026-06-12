import React from "react";

let lockCount = 0;
let savedScrollY = 0;
let savedScrollX = 0;
let savedBodyStyle = null;
let savedHtmlStyle = null;

const getScrollbarWidth = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
};

const px = (value) => `${value}px`;

const lockBodyScroll = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const body = document.body;
  const html = document.documentElement;
  if (!body || !html) return;

  if (lockCount === 0) {
    savedScrollY = window.scrollY || html.scrollTop || body.scrollTop || 0;
    savedScrollX = window.scrollX || html.scrollLeft || body.scrollLeft || 0;
    savedBodyStyle = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
      overscrollBehavior: body.style.overscrollBehavior,
    };
    savedHtmlStyle = {
      overflow: html.style.overflow,
      overscrollBehavior: html.style.overscrollBehavior,
      scrollBehavior: html.style.scrollBehavior,
    };

    const scrollbarWidth = getScrollbarWidth();
    const currentPaddingRight = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    html.style.scrollBehavior = "auto";
    body.style.position = "fixed";
    body.style.top = px(-savedScrollY);
    body.style.left = px(-savedScrollX);
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = px(currentPaddingRight + scrollbarWidth);
    }
  }

  lockCount += 1;
};

const unlockBodyScroll = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (lockCount <= 0) return;
  lockCount -= 1;
  if (lockCount > 0) return;

  const body = document.body;
  const html = document.documentElement;
  if (!body || !html) return;

  Object.assign(body.style, savedBodyStyle || {});
  Object.assign(html.style, savedHtmlStyle || {});
  const scrollX = savedScrollX;
  const scrollY = savedScrollY;
  savedBodyStyle = null;
  savedHtmlStyle = null;
  savedScrollX = 0;
  savedScrollY = 0;
  window.scrollTo(scrollX, scrollY);
};

export function useBodyScrollLock(active = true) {
  React.useEffect(() => {
    if (!active) return undefined;
    lockBodyScroll();
    return unlockBodyScroll;
  }, [active]);
}
