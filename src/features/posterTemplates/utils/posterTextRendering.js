import {
  POSTER_AREA_DEFAULT_STYLE,
} from "./posterTemplateData";

export const POSTER_TEXT_MIN_FONT_SIZE = 6;
export const POSTER_TEXT_MAX_FONT_SIZE = 260;

const NUMBER_OR_LATIN_RUN = /([A-Za-z][A-Za-z0-9._:/+-]*|\d[\d.,:/+-]*)/g;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toFiniteNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const hasArabicText = (value) => /[\u0600-\u06FF]/.test(String(value || ""));

const isRoomPriceField = (type) => (
  /^level_\d+_.*_price$/.test(String(type || ""))
  || /^(double|triple|quad|quint)_l\d+$/.test(String(type || ""))
);

const isDateField = (type) => type === "departure_date" || type === "return_date";

const getDefaultWrap = (type) => (
  !isRoomPriceField(type)
);

export const getPosterTextDirection = (type, value, lang = "ar") => {
  if (isRoomPriceField(type)) return "ltr";
  if (isDateField(type) && lang === "ar") return "rtl";
  if (hasArabicText(value)) return "rtl";
  return lang === "ar" ? "rtl" : "ltr";
};

export const normalizePosterTextLines = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
};

export const resolvePosterTextStyle = (style = {}, options = {}) => {
  const fontScale = toFiniteNumber(options.fontScale, 1);
  const baseFontSize = clamp(
    toFiniteNumber(style.fontSize, POSTER_AREA_DEFAULT_STYLE.fontSize) * fontScale,
    POSTER_TEXT_MIN_FONT_SIZE,
    POSTER_TEXT_MAX_FONT_SIZE
  );
  const lineHeight = clamp(toFiniteNumber(style.lineHeight, 1.18), 1.05, 1.6);
  const paddingX = clamp(
    toFiniteNumber(style.paddingX, Math.max(2, baseFontSize * 0.2)) * (style.paddingX === undefined ? 1 : fontScale),
    0,
    Math.max(0, baseFontSize * 1.4)
  );
  const paddingY = clamp(
    toFiniteNumber(style.paddingY, Math.max(1, baseFontSize * 0.12)) * (style.paddingY === undefined ? 1 : fontScale),
    0,
    Math.max(0, baseFontSize)
  );
  const minFontSize = clamp(
    toFiniteNumber(style.minFontSize, Math.max(POSTER_TEXT_MIN_FONT_SIZE, baseFontSize * 0.62)) * (style.minFontSize === undefined ? 1 : fontScale),
    POSTER_TEXT_MIN_FONT_SIZE,
    baseFontSize
  );
  const maxLines = Number.isFinite(Number(style.maxLines))
    ? Math.max(1, Math.round(Number(style.maxLines)))
    : null;
  const align = ["left", "center", "right"].includes(style.align) ? style.align : POSTER_AREA_DEFAULT_STYLE.align;
  const verticalAlign = ["top", "middle", "bottom"].includes(style.verticalAlign) ? style.verticalAlign : "middle";

  return {
    fontSize: baseFontSize,
    minFontSize,
    color: String(style.color || POSTER_AREA_DEFAULT_STYLE.color).trim() || POSTER_AREA_DEFAULT_STYLE.color,
    align,
    verticalAlign,
    fontWeight: style.fontWeight === "400" || style.fontWeight === "normal" ? "400" : "700",
    lineHeight,
    paddingX,
    paddingY,
    maxLines,
    autoFit: style.autoFit !== false,
    wrap: style.wrap === undefined ? getDefaultWrap(options.type) : style.wrap !== false,
  };
};

export const getPosterPreviewTextCss = (style = {}, options = {}) => {
  const resolved = resolvePosterTextStyle(style, options);
  return {
    ...resolved,
    lineHeightCss: resolved.lineHeight,
    paddingCss: `${resolved.paddingY}px ${resolved.paddingX}px`,
    alignItems: resolved.verticalAlign === "top"
      ? "flex-start"
      : resolved.verticalAlign === "bottom"
      ? "flex-end"
      : "center",
  };
};

const getFont = (style) => (
  `${style.fontWeight} ${style.fontSize}px Cairo, "Noto Sans Arabic", Arial, sans-serif`
);

const splitLongToken = (measureText, token, maxWidth) => {
  if (measureText(token) <= maxWidth) return [token];
  const chunks = [];
  let current = "";
  for (const char of token) {
    const next = `${current}${char}`;
    if (current && measureText(next) > maxWidth) {
      chunks.push(current);
      current = char;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
};

const wrapLine = (measureText, line, maxWidth, wrap) => {
  if (!line) return [];
  if (!wrap) return [String(line)];
  const words = String(line).split(/\s+/).filter(Boolean);
  const wrapped = [];
  let current = "";

  words.forEach((word) => {
    const wordChunks = splitLongToken(measureText, word, maxWidth);
    wordChunks.forEach((chunk) => {
      const next = current ? `${current} ${chunk}` : chunk;
      if (current && measureText(next) > maxWidth) {
        wrapped.push(current);
        current = chunk;
      } else {
        current = next;
      }
    });
  });

  if (current) wrapped.push(current);
  return wrapped;
};

const truncateLineToWidth = (measureText, line, maxWidth, direction) => {
  if (measureText(line) <= maxWidth) return line;
  const ellipsis = "…";
  let text = String(line || "");
  while (text && measureText(`${text}${ellipsis}`) > maxWidth) {
    text = direction === "rtl" ? text.slice(1) : text.slice(0, -1);
  }
  return direction === "rtl" ? `${ellipsis}${text}` : `${text}${ellipsis}`;
};

const protectMixedDirectionText = (line, direction) => {
  if (direction !== "rtl") return line;
  return String(line || "").replace(NUMBER_OR_LATIN_RUN, "\u2066$1\u2069");
};

const getTextX = (box, align) => {
  if (align === "left") return box.x;
  if (align === "right") return box.x + box.width;
  return box.x + (box.width / 2);
};

const getTextStartY = (box, totalHeight, verticalAlign) => {
  if (verticalAlign === "top") return box.y;
  if (verticalAlign === "bottom") return box.y + Math.max(0, box.height - totalHeight);
  return box.y + Math.max(0, (box.height - totalHeight) / 2);
};

const buildCandidateLayout = ({ ctx, rawLines, box, style, type, lang, value }) => {
  ctx.font = getFont(style);
  const measureText = (text) => ctx.measureText(String(text || "")).width;
  const innerBox = {
    x: box.x + style.paddingX,
    y: box.y + style.paddingY,
    width: Math.max(1, box.width - style.paddingX * 2),
    height: Math.max(1, box.height - style.paddingY * 2),
  };
  const lineHeightPx = style.fontSize * style.lineHeight;
  const direction = getPosterTextDirection(type, value, lang);
  const wrappedLines = rawLines.flatMap((line) => wrapLine(measureText, line, innerBox.width, style.wrap));
  const lineCapacity = Math.max(1, Math.floor(innerBox.height / Math.max(1, lineHeightPx)));
  const allowedLines = Math.max(1, Math.min(style.maxLines || lineCapacity, lineCapacity));
  const visibleLines = wrappedLines.slice(0, allowedLines);
  const wasTruncated = wrappedLines.length > allowedLines;
  if (wasTruncated && visibleLines.length) {
    visibleLines[visibleLines.length - 1] = truncateLineToWidth(
      measureText,
      visibleLines[visibleLines.length - 1],
      innerBox.width,
      direction
    );
  }
  const lineWidths = visibleLines.map((line) => measureText(line));
  const maxLineWidth = lineWidths.length ? Math.max(...lineWidths) : 0;
  const totalHeight = visibleLines.length * lineHeightPx;

  return {
    innerBox,
    lineHeightPx,
    direction,
    lines: visibleLines,
    totalHeight,
    fits: !wasTruncated && totalHeight <= innerBox.height + 0.1 && maxLineWidth <= innerBox.width + 0.1,
  };
};

export const drawPosterTextInBox = (ctx, value, box, style = {}, options = {}) => {
  const rawLines = normalizePosterTextLines(value);
  if (!rawLines.length || !box?.width || !box?.height) return;

  const resolvedBaseStyle = resolvePosterTextStyle(style, options);
  const minFontSize = resolvedBaseStyle.autoFit ? resolvedBaseStyle.minFontSize : resolvedBaseStyle.fontSize;
  let resolvedStyle = resolvedBaseStyle;
  let layout = null;

  ctx.save();
  try {
    for (let size = resolvedBaseStyle.fontSize; size >= minFontSize; size -= Math.max(0.5, resolvedBaseStyle.fontSize * 0.035)) {
      resolvedStyle = { ...resolvedBaseStyle, fontSize: size };
      layout = buildCandidateLayout({
        ctx,
        rawLines,
        box,
        style: resolvedStyle,
        type: options.type,
        lang: options.lang,
        value,
      });
      if (!resolvedBaseStyle.autoFit || layout.fits) break;
    }

    if (!layout) return;

    ctx.beginPath();
    ctx.rect(box.x, box.y, box.width, box.height);
    ctx.clip();
    ctx.fillStyle = resolvedStyle.color;
    ctx.font = getFont(resolvedStyle);
    ctx.textAlign = resolvedStyle.align;
    ctx.textBaseline = "middle";
    ctx.direction = layout.direction;

    if (!layout.fits) {
      const measureText = (text) => ctx.measureText(String(text || "")).width;
      layout.lines = layout.lines.map((line) => truncateLineToWidth(
        measureText,
        line,
        layout.innerBox.width,
        layout.direction
      ));
    }

    const x = getTextX(layout.innerBox, resolvedStyle.align);
    const startY = getTextStartY(layout.innerBox, layout.totalHeight, resolvedStyle.verticalAlign);

    layout.lines.forEach((line, index) => {
      ctx.fillText(
        protectMixedDirectionText(line, layout.direction),
        x,
        startY + (index * layout.lineHeightPx) + (layout.lineHeightPx / 2)
      );
    });
  } finally {
    ctx.restore();
  }
};
