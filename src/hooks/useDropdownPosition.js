import { useState, useLayoutEffect } from "react";

/**
 * Positions a dropdown menu using fixed viewport coordinates so it escapes
 * any ancestor stacking contexts (opacity, transform, overflow, backdrop-filter).
 */
export function useDropdownPosition({
  anchorRef,
  menuRef,
  open,
  rtl = false,
  offset = 6,
} = {}) {
  const [pos, setPos] = useState({ top: 0, left: 0, visibility: "hidden" });

  useLayoutEffect(() => {
    if (!open || !anchorRef?.current || !menuRef?.current) return;

    const anchorRect = anchorRef.current.getBoundingClientRect();
    const menuRect   = menuRef.current.getBoundingClientRect();

    // Vertical: prefer below, fallback to above
    const canDropBelow = anchorRect.bottom + offset + menuRect.height <= window.innerHeight;
    const canDropAbove = anchorRect.top    - offset - menuRect.height >= 0;
    const openBelow    = canDropBelow || !canDropAbove;
    const top = openBelow
      ? anchorRect.bottom + offset
      : anchorRect.top - offset - menuRect.height;

    // Horizontal: align to keep menu inside viewport, respect RTL preference
    const canAlignLeft  = anchorRect.left  + menuRect.width <= window.innerWidth;
    const canAlignRight = anchorRect.right - menuRect.width >= 0;
    let alignLeft = canAlignLeft || !canAlignRight;
    if (canAlignLeft && canAlignRight) alignLeft = !rtl;
    const left = alignLeft ? anchorRect.left : anchorRect.right - menuRect.width;

    setPos((prev) =>
      prev.top === top && prev.left === left && prev.visibility === "visible"
        ? prev
        : { top, left, visibility: "visible" }
    );
  }, [open, rtl, offset, anchorRef, menuRef]);

  return pos;
}
