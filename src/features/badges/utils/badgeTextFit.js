const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const numberOr = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const BADGE_TEXT_FIT_DEFAULTS = {
  minFontSize: 10,
  maxFontSize: 56,
  paddingX: 12,
  paddingY: 6,
  lineHeightRatio: 1.18,
};

const RTL_RE = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufefc]/;
const LTR_RE = /[A-Za-z0-9]/;

export const resolveBadgeTextDirection = (value = "", mode = "auto", fallback = "rtl") => {
  if (mode === "rtl" || mode === "ltr") return mode;
  const text = String(value || "");
  if (RTL_RE.test(text)) return "rtl";
  if (LTR_RE.test(text)) return "ltr";
  return fallback === "ltr" ? "ltr" : "rtl";
};

export const getBadgeTextPadding = (box = {}, { scale = 1, paddingX, paddingY } = {}) => {
  const safeScale = Math.max(0.1, numberOr(scale, 1));
  const width = Math.max(1, numberOr(box.width, 1));
  const height = Math.max(1, numberOr(box.height, 1));
  return {
    x: numberOr(
      paddingX,
      clamp(width * 0.06, 8 * safeScale, 14 * safeScale)
    ),
    y: numberOr(
      paddingY,
      clamp(height * 0.10, 4 * safeScale, 10 * safeScale)
    ),
  };
};

const trimToWidth = (ctx, value, maxWidth, suffix = "") => {
  let text = String(value || "").trim();
  if (!text || ctx.measureText(`${text}${suffix}`).width <= maxWidth) return `${text}${suffix}`;
  while (text && ctx.measureText(`${text}${suffix}`).width > maxWidth) {
    text = text.slice(0, -1).trim();
  }
  return text ? `${text}${suffix}` : "";
};

const splitLongWord = (ctx, word, maxWidth) => {
  const chunks = [];
  let current = "";
  String(word || "").split("").forEach((char) => {
    const next = `${current}${char}`;
    if (!current || ctx.measureText(next).width <= maxWidth) {
      current = next;
      return;
    }
    chunks.push(current);
    current = char;
  });
  if (current) chunks.push(current);
  return chunks;
};

export function wrapTextToLines(ctx, text, maxWidth, maxLines) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let current = "";
  words.forEach((rawWord) => {
    const wordParts = ctx.measureText(rawWord).width > maxWidth
      ? splitLongWord(ctx, rawWord, maxWidth)
      : [rawWord];
    wordParts.forEach((word) => {
      if (lines.length >= maxLines) return;
      const next = current ? `${current} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth || !current) {
        current = next;
        return;
      }
      lines.push(current);
      current = word;
    });
  });
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const clipped = lines.slice(0, maxLines);
  let last = clipped[clipped.length - 1] || "";
  clipped[clipped.length - 1] = trimToWidth(ctx, last, maxWidth, "…");
  return clipped;
}

export function fitTextBox(ctx, text, box, {
  autoFit = false,
  fontSize = 12,
  fontWeight = 700,
  fontFamily = "Arial",
  minFontSize = 7,
  maxFontSize = BADGE_TEXT_FIT_DEFAULTS.maxFontSize,
  maxLines = 1,
  paddingX = 0,
  paddingY = 0,
  lineHeightRatio = BADGE_TEXT_FIT_DEFAULTS.lineHeightRatio,
} = {}) {
  const safeBox = {
    x: numberOr(box.x, 0),
    y: numberOr(box.y, 0),
    width: Math.max(1, numberOr(box.width, 1)),
    height: Math.max(1, numberOr(box.height, 1)),
  };
  const safePaddingX = clamp(numberOr(paddingX, 0), 0, safeBox.width / 2 - 0.5);
  const safePaddingY = clamp(numberOr(paddingY, 0), 0, safeBox.height / 2 - 0.5);
  const contentBox = {
    x: safeBox.x + safePaddingX,
    y: safeBox.y + safePaddingY,
    width: Math.max(1, safeBox.width - safePaddingX * 2),
    height: Math.max(1, safeBox.height - safePaddingY * 2),
  };
  const safeMaxLines = Math.max(1, Number(maxLines) || 1);
  const safeMinFontSize = Math.max(1, numberOr(minFontSize, 7));
  const safeMaxFontSize = autoFit
    ? Math.max(safeMinFontSize, numberOr(maxFontSize, BADGE_TEXT_FIT_DEFAULTS.maxFontSize))
    : Math.max(safeMinFontSize, numberOr(fontSize, 12));
  const heightBasedSize = contentBox.height * (safeMaxLines > 1 ? 0.58 : 0.62);
  let size = autoFit
    ? clamp(heightBasedSize, safeMinFontSize, safeMaxFontSize)
    : Math.max(safeMinFontSize, numberOr(fontSize, 12));
  let lines = [];
  while (size >= safeMinFontSize) {
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
    lines = wrapTextToLines(ctx, text, contentBox.width, safeMaxLines);
    const lineHeight = size * lineHeightRatio;
    if (lines.length * lineHeight <= contentBox.height && lines.every((line) => ctx.measureText(line).width <= contentBox.width)) {
      return { fontSize: size, lines, lineHeight, box: contentBox, paddingX: safePaddingX, paddingY: safePaddingY };
    }
    size -= 1;
  }
  ctx.font = `${fontWeight} ${safeMinFontSize}px ${fontFamily}`;
  lines = wrapTextToLines(ctx, text, contentBox.width, safeMaxLines).map((line, index, allLines) => (
    index === allLines.length - 1
      ? trimToWidth(ctx, line, contentBox.width, allLines.length > safeMaxLines ? "…" : "")
      : trimToWidth(ctx, line, contentBox.width)
  )).slice(0, safeMaxLines);
  return {
    fontSize: safeMinFontSize,
    lines,
    lineHeight: safeMinFontSize * lineHeightRatio,
    box: contentBox,
    paddingX: safePaddingX,
    paddingY: safePaddingY,
  };
}
