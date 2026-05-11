const A4_LANDSCAPE = { widthPt: 841.89, heightPt: 595.28 };
const PDF_SCALE = 2;
const ROOM_TYPE_ORDER = ["double", "triple", "quad", "quint"];
const CITY_ORDER = ["makkah", "madinah"];
const FLOW_LAYOUT = {
  contentTop: 72,
  contentBottom: 576,
  columns: 6,
  gapX: 7,
  gapY: 5,
  groupGap: 2,
  sectionTitleHeight: 15,
  sectionTitleGap: 4,
};
const ROOM_CARD_WRITE_AREA_HEIGHT = 8;
const ROOM_CARD_WRITE_AREA_GAP = 4;
const DENSITY_CONFIGS = {
  comfortable: {
    columns: 5,
    gapX: 8,
    gapY: 6,
    groupGap: 3,
    sectionTitleHeight: 16,
    sectionTitleGap: 4.5,
    writeAreaHeight: 9,
    writeAreaGap: 4.5,
    cardPadX: 8,
    cardPadBottom: 7,
    chipGap: 2.6,
    chipMinHeight: 14.4,
    chipHorizontalPad: 5,
    fontLarge: 8.8,
    fontNormal: 8.4,
    fontSmall: 7.7,
    fontTiny: 7.1,
    sourceFontOffset: 1.2,
    lineHeightExtra: 2.2,
    minCardHeight: 70,
    rowMaxHeight: 142,
    maxNameLines: 8,
    html: {
      cardPadding: "2mm",
      cardGap: "2mm",
      writeHeight: "3.2mm",
      writeMargin: "1.5mm",
      itemPadding: ".75mm 1.6mm",
      itemGap: ".8mm",
      itemMinHeight: "4.5mm",
      nameFont: "8.4px",
      nameLine: "1.25",
      sourceFont: "6.8px",
    },
  },
  normal: {
    columns: FLOW_LAYOUT.columns,
    gapX: FLOW_LAYOUT.gapX,
    gapY: FLOW_LAYOUT.gapY,
    groupGap: FLOW_LAYOUT.groupGap,
    sectionTitleHeight: FLOW_LAYOUT.sectionTitleHeight,
    sectionTitleGap: FLOW_LAYOUT.sectionTitleGap,
    writeAreaHeight: ROOM_CARD_WRITE_AREA_HEIGHT,
    writeAreaGap: ROOM_CARD_WRITE_AREA_GAP,
    cardPadX: 8,
    cardPadBottom: 7,
    chipGap: 2.2,
    chipMinHeight: 12.8,
    chipHorizontalPad: 5,
    fontLarge: 8.4,
    fontNormal: 8,
    fontSmall: 7.4,
    fontTiny: 6.8,
    sourceFontOffset: 1.4,
    lineHeightExtra: 2,
    minCardHeight: 66,
    rowMaxHeight: 132,
    maxNameLines: 8,
    html: {
      cardPadding: "1.7mm",
      cardGap: "1.7mm",
      writeHeight: "2.8mm",
      writeMargin: "1.3mm",
      itemPadding: ".55mm 1.4mm",
      itemGap: ".6mm",
      itemMinHeight: "3.9mm",
      nameFont: "8px",
      nameLine: "1.22",
      sourceFont: "6.6px",
    },
  },
  compact: {
    columns: 7,
    gapX: 5,
    gapY: 3.5,
    groupGap: 1.5,
    sectionTitleHeight: 13,
    sectionTitleGap: 3,
    writeAreaHeight: 6,
    writeAreaGap: 2.6,
    cardPadX: 6,
    cardPadBottom: 5,
    chipGap: 1.5,
    chipMinHeight: 10.8,
    chipHorizontalPad: 4,
    fontLarge: 7.5,
    fontNormal: 7.2,
    fontSmall: 6.8,
    fontTiny: 6.3,
    sourceFontOffset: 1.1,
    lineHeightExtra: 1.5,
    minCardHeight: 56,
    rowMaxHeight: 124,
    maxNameLines: 8,
    html: {
      cardPadding: "1.25mm",
      cardGap: "1.2mm",
      writeHeight: "2.2mm",
      writeMargin: ".9mm",
      itemPadding: ".45mm 1mm",
      itemGap: ".45mm",
      itemMinHeight: "3.3mm",
      nameFont: "7.3px",
      nameLine: "1.18",
      sourceFont: "6.1px",
    },
  },
};
const TYPE_COLORS = {
  double: { text: "#1d4f75", chipBg: "#f4f8fb", chipBorder: "#dfe9f1" },
  triple: { text: "#277052", chipBg: "#f3f8f5", chipBorder: "#dcebe2" },
  quad: { text: "#8a6718", chipBg: "#f8f4e8", chipBorder: "#e9ddbc" },
  quint: { text: "#536071", chipBg: "#f6f7f9", chipBorder: "#dde3eb" },
  other: { text: "#475569", chipBg: "#f5f7fa", chipBorder: "#e1e7ef" },
};

const sanitizeFile = (value) => String(value || "rooming")
  .replace(/[\\/:*?"<>|]+/g, "-")
  .replace(/\s+/g, "-")
  .replace(/-+/g, "-")
  .slice(0, 90);

const formatDate = (value) => {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return text || "—";
};

const parseIsoDate = (value) => {
  const match = String(value || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
};

const minDateValue = (...values) => {
  const dates = values.map(parseIsoDate).filter(Boolean).sort((a, b) => a - b);
  return dates[0] ? dates[0].toISOString().slice(0, 10) : values.find(Boolean) || "";
};

const maxDateValue = (...values) => {
  const dates = values.map(parseIsoDate).filter(Boolean).sort((a, b) => b - a);
  return dates[0] ? dates[0].toISOString().slice(0, 10) : values.filter(Boolean).pop() || "";
};

const getDirection = (lang) => (lang === "ar" ? "rtl" : "ltr");

const text = (value, fallback = "—") => {
  const clean = String(value || "").trim();
  return clean || fallback;
};

const normalizePrintSettings = (settings = {}) => {
  const density = ["comfortable", "normal", "compact"].includes(settings.density)
    ? settings.density
    : "normal";
  return {
    density,
    showRegistrationSource: settings.showRegistrationSource !== false,
  };
};

const getDensityConfig = (settings = {}) => DENSITY_CONFIGS[normalizePrintSettings(settings).density] || DENSITY_CONFIGS.normal;

const getFlowLayout = (settings = {}) => {
  const density = getDensityConfig(settings);
  return {
    ...FLOW_LAYOUT,
    columns: density.columns,
    gapX: density.gapX,
    gapY: density.gapY,
    groupGap: density.groupGap,
    sectionTitleHeight: density.sectionTitleHeight,
    sectionTitleGap: density.sectionTitleGap,
  };
};

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const getRoomPilgrims = (room = {}, settings = {}) => {
  const printSettings = normalizePrintSettings(settings);
  if (Array.isArray(room.pilgrims)) {
    return room.pilgrims.map((pilgrim) => ({
      name: text(pilgrim?.name, "—"),
      source: printSettings.showRegistrationSource ? text(pilgrim?.source, "") : "",
    }));
  }
  const names = Array.isArray(room.names) ? room.names : [];
  return names.map((name) => ({ name: text(name, "—"), source: "" }));
};

const drawRoundRect = (ctx, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

const drawText = (ctx, value, x, y, {
  size = 10,
  weight = 400,
  color = "#111827",
  align = "right",
  baseline = "top",
  maxWidth,
  direction = "rtl",
} = {}) => {
  ctx.save();
  ctx.direction = direction;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.font = `${weight} ${size}pt Arial, Tahoma, sans-serif`;
  if (maxWidth) ctx.fillText(String(value || ""), x, y, maxWidth);
  else ctx.fillText(String(value || ""), x, y);
  ctx.restore();
};

const loadImage = async (url) => {
  if (!url) return null;
  try {
    const image = new Image();
    image.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    return image;
  } catch {
    return null;
  }
};

const drawContainImage = (ctx, image, x, y, width, height) => {
  if (!image) return false;
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  return true;
};

const truncateToWidth = (ctx, value, maxWidth) => {
  const raw = String(value || "");
  if (ctx.measureText(raw).width <= maxWidth) return raw;
  const ellipsis = "…";
  let lo = 0;
  let hi = raw.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(`${raw.slice(0, mid)}${ellipsis}`).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return `${raw.slice(0, Math.max(1, lo))}${ellipsis}`;
};

const splitLongToken = (ctx, token, maxWidth) => {
  const parts = [];
  let current = "";
  Array.from(String(token || "")).forEach((char) => {
    const next = `${current}${char}`;
    if (!current || ctx.measureText(next).width <= maxWidth) {
      current = next;
      return;
    }
    parts.push(current);
    current = char;
  });
  if (current) parts.push(current);
  return parts.length ? parts : [token];
};

const wrapText = (ctx, value, maxWidth, maxLines = 2, { ellipsis = false } = {}) => {
  const raw = text(value, "—");
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return [raw];
  const parts = raw.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  parts.forEach((part) => {
    if (ctx.measureText(part).width > maxWidth) {
      if (current) {
        lines.push(current);
        current = "";
      }
      splitLongToken(ctx, part, maxWidth).forEach((piece) => lines.push(piece));
      return;
    }
    const next = current ? `${current} ${part}` : part;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      return;
    }
    if (current) lines.push(current);
    current = part;
  });
  if (current) lines.push(current);
  const safeLines = lines.length ? lines : [raw];
  if (safeLines.length <= maxLines) {
    return safeLines;
  }
  const clipped = safeLines.slice(0, maxLines);
  if (ellipsis) clipped[maxLines - 1] = truncateToWidth(ctx, `${clipped[maxLines - 1]}…`, maxWidth);
  return clipped;
};

const measureRoomCard = (ctx, room, cardWidth, settings = {}) => {
  const density = getDensityConfig(settings);
  const contentWidth = cardWidth - density.cardPadX * 2 - density.chipHorizontalPad * 2;
  ctx.font = `700 ${density.fontNormal}pt Arial, Tahoma, sans-serif`;
  const pilgrims = getRoomPilgrims(room, settings);
  const capacity = Math.max(1, Number(room.capacity) || pilgrims.length || 1);
  const rowCount = Math.max(capacity, pilgrims.length);
  const rows = Array.from({ length: rowCount }, (_, index) => pilgrims[index] || { name: "—", source: "" });
  const chipsHeight = rows.reduce((sum, pilgrim) => {
    const sourceWidth = pilgrim.source ? Math.min(38, Math.max(22, ctx.measureText(pilgrim.source).width + 12)) : 0;
    const lineCount = wrapText(ctx, pilgrim.name, contentWidth - sourceWidth - (sourceWidth ? 5 : 0), density.maxNameLines).length;
    return sum + Math.max(density.chipMinHeight, lineCount * (density.fontNormal + density.lineHeightExtra) + 4);
  }, 0);
  return Math.max(
    density.minCardHeight,
    13 + density.writeAreaHeight + density.writeAreaGap + chipsHeight + Math.max(0, rows.length - 1) * density.chipGap + density.cardPadBottom
  );
};

const drawHeader = (ctx, page, { section, logoImage, agencyName, labels, lang }) => {
  const direction = getDirection(lang);
  const right = page.width - page.margin;
  const left = page.margin;
  const center = page.width / 2;
  const logoSize = 30;
  if (logoImage) {
    drawContainImage(ctx, logoImage, left, 12, logoSize, logoSize);
  } else {
    ctx.strokeStyle = "#d7dbe2";
    ctx.lineWidth = 1;
    drawRoundRect(ctx, left, 12, logoSize, logoSize, 7);
    ctx.stroke();
    drawText(ctx, "R", left + logoSize / 2, 19, {
      size: 13,
      weight: 800,
      color: "#9a7418",
      align: "center",
      direction: "ltr",
    });
  }
  drawText(ctx, agencyName || "", left + logoSize + 7, 18, {
    size: 8.8,
    weight: 800,
    color: "#0f172a",
    align: "left",
    direction,
    maxWidth: 150,
  });
  drawText(ctx, section.cityLabel || "", center, section.combined ? 12 : 9, {
    size: section.combined ? 12.8 : 20,
    weight: 900,
    color: "#0f172a",
    align: "center",
    direction,
    maxWidth: 360,
  });
  if (section.combined && Array.isArray(section.dateRanges)) {
    section.dateRanges.slice(0, 2).forEach((range, index) => {
      const line = `${range.label}: ${labels.checkIn} ${formatDate(range.checkIn)} / ${labels.checkOut} ${formatDate(range.checkOut)}`;
      drawText(ctx, line, center, 31 + index * 12, {
        size: 7.4,
        weight: 800,
        color: index === 0 ? "#7c641f" : "#475569",
        align: "center",
        direction,
        maxWidth: 390,
      });
    });
  } else {
    drawText(ctx, section.hotel || "", center, 37, {
      size: 9.8,
      weight: 800,
      color: "#9a7418",
      align: "center",
      direction,
    });
  }

  const metrics = [
    { label: labels.roomsCount, value: String(section.rooms.length) },
    { label: labels.checkIn, value: formatDate(section.checkIn) },
    { label: labels.checkOut, value: formatDate(section.checkOut) },
  ];
  const metricWidth = 88;
  metrics.forEach((item, index) => {
    const x = right - metricWidth * (index + 1);
    if (index > 0) {
      ctx.strokeStyle = "#d9c491";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x + metricWidth, 13);
      ctx.lineTo(x + metricWidth, 45);
      ctx.stroke();
    }
    drawText(ctx, item.label, x + metricWidth / 2, 13, {
      size: 7.4,
      weight: 700,
      color: "#475569",
      align: "center",
      direction,
    });
    drawText(ctx, item.value, x + metricWidth / 2, 29, {
      size: 8.8,
      weight: 800,
      color: "#0f172a",
      align: "center",
      direction: item.value.match(/\d/) ? "ltr" : direction,
    });
  });
  ctx.strokeStyle = "#b99235";
  ctx.lineWidth = 1.05;
  ctx.beginPath();
  ctx.moveTo(left, 60);
  ctx.lineTo(right, 60);
  ctx.stroke();
};

const drawRoomCard = (ctx, room, x, y, width, height, labels, lang, settings = {}) => {
  const density = getDensityConfig(settings);
  const direction = getDirection(lang);
  const pilgrims = getRoomPilgrims(room, settings);
  const capacity = Math.max(1, Number(room.capacity) || pilgrims.length || 1);
  const rowCount = Math.max(capacity, pilgrims.length);
  const count = pilgrims.filter((pilgrim) => pilgrim.name && pilgrim.name !== "—").length;
  const status = count > capacity ? "over" : count < capacity ? "incomplete" : "full";
  const colors = {
    full: { border: "#d8dee7", fill: "#ffffff" },
    incomplete: { border: "#d8c99a", fill: "#fffdfa" },
    over: { border: "#d8aaaa", fill: "#fffafa" },
  }[status];
  const typeStyle = TYPE_COLORS[room.roomTypeKey] || TYPE_COLORS.other;

  drawRoundRect(ctx, x, y, width, height, 8);
  ctx.fillStyle = colors.fill;
  ctx.fill();
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = status === "full" ? 0.75 : 0.95;
  ctx.stroke();

  const right = x + width - density.cardPadX;
  const left = x + density.cardPadX;

  const rows = Array.from({ length: rowCount }, (_, index) => pilgrims[index] || { name: "—", source: "" });
  const chipGap = density.chipGap;
  const chipX = left;
  const chipWidth = width - density.cardPadX * 2;
  const writeY = y + 6;
  drawRoundRect(ctx, left, writeY, chipWidth, density.writeAreaHeight, 4);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#d7dbe2";
  ctx.lineWidth = 0.55;
  ctx.setLineDash([2, 2]);
  ctx.stroke();
  ctx.setLineDash([]);

  const contentTop = writeY + density.writeAreaHeight + density.writeAreaGap;
  const contentBottom = y + height - density.cardPadBottom;
  const availableHeight = Math.max(1, contentBottom - contentTop);
  const chipHeight = Math.max(1, (availableHeight - chipGap * Math.max(0, rows.length - 1)) / rows.length);
  const fontSize = chipHeight >= 15.5 ? density.fontLarge : chipHeight >= 13 ? density.fontNormal : chipHeight >= 11 ? density.fontSmall : density.fontTiny;
  const lineHeight = fontSize + density.lineHeightExtra;
  const maxLines = Math.max(1, Math.min(density.maxNameLines, Math.floor((chipHeight - 3) / lineHeight)));
  ctx.font = `700 ${fontSize}pt Arial, Tahoma, sans-serif`;
  const contentWidth = chipWidth - density.chipHorizontalPad * 2;
  let cursor = contentTop;
  rows.forEach((pilgrim) => {
    const empty = pilgrim.name === "—";
    const sourceText = !empty ? text(pilgrim.source, "") : "";
    const sourceMaxWidth = sourceText ? Math.min(40, Math.max(24, chipWidth * 0.34)) : 0;
    ctx.font = `800 ${Math.max(5.7, fontSize - density.sourceFontOffset)}pt Arial, Tahoma, sans-serif`;
    const sourceLabel = sourceText ? truncateToWidth(ctx, sourceText, sourceMaxWidth - 9) : "";
    const sourceWidth = sourceLabel ? Math.min(sourceMaxWidth, Math.max(20, ctx.measureText(sourceLabel).width + 9)) : 0;
    ctx.font = `700 ${fontSize}pt Arial, Tahoma, sans-serif`;
    const nameWidthLimit = contentWidth - sourceWidth - (sourceWidth ? 5 : 0);
    const lines = wrapText(ctx, pilgrim.name, nameWidthLimit, maxLines);
    drawRoundRect(ctx, chipX, cursor, chipWidth, chipHeight, Math.min(7, chipHeight / 2));
    ctx.fillStyle = empty ? "#fafafa" : typeStyle.chipBg;
    ctx.fill();
    ctx.strokeStyle = empty ? "#ededed" : typeStyle.chipBorder;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    const textBlockHeight = lines.length * lineHeight;
    let lineY = cursor + Math.max(1, (chipHeight - textBlockHeight) / 2);
    const firstLine = lines[0] || "";
    const measuredNameWidth = Math.min(ctx.measureText(firstLine).width, nameWidthLimit);
    lines.forEach((line, lineIndex) => {
      const lineX = direction === "rtl" ? right - density.chipHorizontalPad : left + density.chipHorizontalPad;
      drawText(ctx, line, lineX, lineY, {
        size: fontSize,
        weight: empty ? 600 : 700,
        color: empty ? "#94a3b8" : typeStyle.text || "#1f2937",
        align: direction === "rtl" ? "right" : "left",
        direction,
      });
      if (lineIndex === 0 && sourceLabel) {
        const badgeX = direction === "rtl"
          ? Math.max(chipX + 4, right - 5 - measuredNameWidth - 5 - sourceWidth)
          : Math.min(chipX + chipWidth - sourceWidth - 4, left + 5 + measuredNameWidth + 5);
        const badgeY = cursor + Math.max(1, (chipHeight - Math.min(10.5, chipHeight - 2)) / 2);
        const badgeH = Math.min(10.5, chipHeight - 2);
        drawRoundRect(ctx, badgeX, badgeY, sourceWidth, badgeH, Math.min(5, badgeH / 2));
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = typeStyle.chipBorder;
        ctx.lineWidth = 0.45;
        ctx.stroke();
        drawText(ctx, sourceLabel, direction === "rtl" ? badgeX + sourceWidth / 2 : badgeX + sourceWidth / 2, badgeY + 1.4, {
          size: Math.max(5.7, fontSize - density.sourceFontOffset),
          weight: 800,
          color: "#64748b",
          align: "center",
          direction,
          maxWidth: sourceWidth - 6,
        });
      }
      lineY += lineHeight;
    });
    cursor += chipHeight + chipGap;
  });
};

const makeCanvasPage = ({ labels, lang, agencyName, logoImage, section }) => {
  const width = A4_LANDSCAPE.widthPt;
  const height = A4_LANDSCAPE.heightPt;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * PDF_SCALE);
  canvas.height = Math.round(height * PDF_SCALE);
  const ctx = canvas.getContext("2d");
  ctx.scale(PDF_SCALE, PDF_SCALE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  const page = { width, height, margin: 22 };
  if (section) drawHeader(ctx, page, { section, logoImage, agencyName, labels, lang });
  return { canvas, ctx, page };
};

const getRoomTypeSectionLabel = (key, fallback, lang) => {
  if (lang === "fr") {
    return key === "double" ? "Chambres doubles"
      : key === "triple" ? "Chambres triples"
        : key === "quad" ? "Chambres quadruples"
          : key === "quint" ? "Chambres quintuples"
            : fallback || "Autres chambres";
  }
  if (lang === "en") {
    return key === "double" ? "Double rooms"
      : key === "triple" ? "Triple rooms"
        : key === "quad" ? "Quad rooms"
          : key === "quint" ? "Quint rooms"
            : fallback || "Other rooms";
  }
  return key === "double" ? "ثنائيات"
    : key === "triple" ? "ثلاثيات"
      : key === "quad" ? "رباعيات"
        : key === "quint" ? "خماسيات"
          : fallback || "غرف أخرى";
};

const drawTypeSectionTitle = (ctx, page, label, y, lang, settings = {}) => {
  const layout = getFlowLayout(settings);
  const direction = getDirection(lang);
  const right = page.width - page.margin;
  const left = page.margin;
  ctx.font = "900 8.6pt Arial, Tahoma, sans-serif";
  const textWidth = Math.min(130, Math.max(72, ctx.measureText(label).width + 28));
  const x = right - textWidth;
  drawRoundRect(ctx, x, y, textWidth, layout.sectionTitleHeight, 8.5);
  ctx.fillStyle = "#fbfaf7";
  ctx.fill();
  ctx.strokeStyle = "#e6dcc2";
  ctx.lineWidth = 0.7;
  ctx.stroke();
  drawText(ctx, label, x + textWidth / 2, y + 3.1, {
    size: 8.6,
    weight: 900,
    color: "#7c641f",
    align: "center",
    direction,
  });
  ctx.strokeStyle = "#eee7d6";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(left, y + 9);
  ctx.lineTo(x - 8, y + 9);
  ctx.stroke();
};

const getCardWidth = (page, settings = {}) => {
  const layout = getFlowLayout(settings);
  return (
    (page.width - page.margin * 2 - layout.gapX * (layout.columns - 1)) / layout.columns
  );
};

const getRoomMinimumHeight = (room, settings = {}) => {
  const density = getDensityConfig(settings);
  const pilgrims = getRoomPilgrims(room, settings);
  const capacity = Math.max(1, Number(room.capacity) || pilgrims.length || 1);
  const rowCount = Math.max(capacity, pilgrims.length);
  if (rowCount <= 2) return density.minCardHeight;
  if (rowCount === 3) return density.minCardHeight + 8;
  if (rowCount === 4) return density.minCardHeight + 16;
  if (rowCount === 5) return density.minCardHeight + 24;
  return density.minCardHeight + 36;
};

const getFlowRowHeight = (ctx, rooms, cardWidth, settings = {}) => {
  const density = getDensityConfig(settings);
  const measured = rooms.map((room) => Math.max(getRoomMinimumHeight(room, settings), measureRoomCard(ctx, room, cardWidth, settings)));
  return Math.max(...measured, density.minCardHeight - 6);
};

const groupRooms = (rooms = [], labels = {}, sectionOverride = null) => {
  const sorted = rooms.slice().sort((a, b) => {
    const city = CITY_ORDER.indexOf(a.city) - CITY_ORDER.indexOf(b.city);
    if (city) return city;
    const hotel = String(a.hotel || "").localeCompare(String(b.hotel || ""), "ar");
    if (hotel) return hotel;
    const aTypeOrder = ROOM_TYPE_ORDER.includes(a.roomTypeKey) ? ROOM_TYPE_ORDER.indexOf(a.roomTypeKey) : 99;
    const bTypeOrder = ROOM_TYPE_ORDER.includes(b.roomTypeKey) ? ROOM_TYPE_ORDER.indexOf(b.roomTypeKey) : 99;
    const type = aTypeOrder - bTypeOrder;
    if (type) return type;
    return (Number(a.order) || 0) - (Number(b.order) || 0);
  });
  if (sectionOverride) {
    const overrideRooms = rooms.slice().sort((a, b) => {
      const aTypeOrder = ROOM_TYPE_ORDER.includes(a.roomTypeKey) ? ROOM_TYPE_ORDER.indexOf(a.roomTypeKey) : 99;
      const bTypeOrder = ROOM_TYPE_ORDER.includes(b.roomTypeKey) ? ROOM_TYPE_ORDER.indexOf(b.roomTypeKey) : 99;
      const type = aTypeOrder - bTypeOrder;
      if (type) return type;
      return (Number(a.order) || 0) - (Number(b.order) || 0);
    });
    return [{
      ...sectionOverride,
      rooms: overrideRooms.map((room) => ({ ...room, hotel: text(room.hotel, labels.unknownHotel || "—") })),
    }];
  }
  const sections = [];
  sorted.forEach((room) => {
    const hotel = text(room.hotel, labels.unknownHotel || "—");
    const last = sections[sections.length - 1];
    if (!last || last.city !== room.city || last.hotel !== hotel) {
      sections.push({
        city: room.city,
        cityLabel: room.cityLabel,
        hotel,
        checkIn: room.checkIn,
        checkOut: room.checkOut,
        rooms: [],
      });
    }
    sections[sections.length - 1].rooms.push({ ...room, hotel });
  });
  return sections;
};

const getOrderedTypeGroups = (section, labels, lang, settings = {}) => {
  const layout = getFlowLayout(settings);
  const byType = new Map();
  section.rooms.forEach((room) => {
    const key = room.roomTypeKey || "other";
    if (!byType.has(key)) byType.set(key, []);
    byType.get(key).push(room);
  });
  return Array.from(byType.entries())
    .sort(([a], [b]) => {
      const aTypeOrder = ROOM_TYPE_ORDER.includes(a) ? ROOM_TYPE_ORDER.indexOf(a) : 99;
      const bTypeOrder = ROOM_TYPE_ORDER.includes(b) ? ROOM_TYPE_ORDER.indexOf(b) : 99;
      return aTypeOrder - bTypeOrder || String(a).localeCompare(String(b), "ar");
    })
    .map(([typeKey, typeRooms]) => ({
      typeKey,
      title: getRoomTypeSectionLabel(typeKey, typeRooms[0]?.roomTypeLabel || labels.otherRoomType, lang),
      rows: Array.from({ length: Math.ceil(typeRooms.length / layout.columns) }, (_, index) => (
        typeRooms.slice(index * layout.columns, (index + 1) * layout.columns)
      )),
    }));
};

const getFlowItems = (typeGroups) => {
  const items = [];
  typeGroups.forEach((group) => {
    if (!group.rows.length) return;
    items.push({ kind: "title", title: group.title });
    group.rows.forEach((rooms, rowIndex) => {
      items.push({
        kind: "row",
        title: group.title,
        rooms,
        isGroupLastRow: rowIndex === group.rows.length - 1,
      });
    });
  });
  return items;
};

const getSinglePageRowHeights = (ctx, items, page, settings = {}) => {
  const layout = getFlowLayout(settings);
  const rows = items.filter((item) => item.kind === "row");
  if (!rows.length) return null;
  const cardWidth = getCardWidth(page, settings);
  const titleCount = items.filter((item) => item.kind === "title").length;
  const rowGapCount = Math.max(0, rows.length - 1);
  const groupGapCount = Math.max(0, rows.filter((item) => item.isGroupLastRow).length - 1);
  const titleBlock = layout.sectionTitleHeight + layout.sectionTitleGap;
  const fixedHeight = titleCount * titleBlock
    + rowGapCount * layout.gapY
    + groupGapCount * layout.groupGap;
  const availableForRows = layout.contentBottom - layout.contentTop - fixedHeight;
  const desired = rows.map((item) => getFlowRowHeight(ctx, item.rooms, cardWidth, settings));
  const minimum = rows.map((item) => Math.max(
    ...item.rooms.map((room) => measureRoomCard(ctx, room, cardWidth, settings) * 0.92),
    getDensityConfig(settings).minCardHeight - 4
  ));
  const desiredTotal = desired.reduce((sum, value) => sum + value, 0);
  const minimumTotal = minimum.reduce((sum, value) => sum + value, 0);
  if (desiredTotal <= availableForRows) return desired;
  if (minimumTotal > availableForRows) return null;
  const scale = desiredTotal === minimumTotal
    ? 0
    : (availableForRows - minimumTotal) / (desiredTotal - minimumTotal);
  return desired.map((height, index) => minimum[index] + Math.max(0, height - minimum[index]) * scale);
};

const drawRoomRow = (ctx, page, rooms, y, rowHeight, labels, lang, settings = {}) => {
  const layout = getFlowLayout(settings);
  const cardWidth = getCardWidth(page, settings);
  rooms.forEach((room, index) => {
    const x = page.width - page.margin - cardWidth - index * (cardWidth + layout.gapX);
    drawRoomCard(ctx, room, x, y, cardWidth, rowHeight, labels, lang, settings);
  });
};

const buildPages = async ({ rooms, labels, lang, agencyName, agencyLogoUrl, sectionOverride, printSettings }) => {
  const layout = getFlowLayout(printSettings);
  const pages = [];
  const logoImage = await loadImage(agencyLogoUrl);
  let current = null;
  let cursorY = layout.contentTop;

  const pushPage = async () => {
    if (!current) return;
    pages.push(await canvasToPage(current.canvas));
  };

  const startPage = (section) => {
    current = makeCanvasPage({ labels, lang, agencyName, logoImage, section });
    cursorY = layout.contentTop;
  };

  const sections = groupRooms(rooms, labels, sectionOverride);
  if (!sections.length) {
    current = makeCanvasPage({ labels, lang, agencyName, logoImage, section: {
      cityLabel: labels.rooming || "Rooming",
      hotel: "",
      checkIn: "",
      checkOut: "",
      rooms: [],
    } });
    drawText(current.ctx, labels.noRooms || "No rooms", current.page.width - current.page.margin, 140, {
      size: 12,
      weight: 800,
      color: "#64748b",
      align: "right",
      direction: getDirection(lang),
    });
    await pushPage();
    return pages;
  }

  for (const section of sections) {
    startPage(section);
    const typeGroups = getOrderedTypeGroups(section, labels, lang, printSettings);
    const flowItems = getFlowItems(typeGroups);
    const singlePageHeights = section.rooms.length <= 30
      ? getSinglePageRowHeights(current.ctx, flowItems, current.page, printSettings)
      : null;

    if (singlePageHeights) {
      let rowIndex = 0;
      flowItems.forEach((item) => {
        if (item.kind === "title") {
          drawTypeSectionTitle(current.ctx, current.page, item.title, cursorY, lang, printSettings);
          cursorY += layout.sectionTitleHeight + layout.sectionTitleGap;
          return;
        }
        const rowHeight = singlePageHeights[rowIndex] || getFlowRowHeight(current.ctx, item.rooms, getCardWidth(current.page, printSettings), printSettings);
        rowIndex += 1;
        drawRoomRow(current.ctx, current.page, item.rooms, cursorY, rowHeight, labels, lang, printSettings);
        cursorY += rowHeight + layout.gapY + (item.isGroupLastRow ? layout.groupGap : 0);
      });
    } else {
      let activeTitle = "";
      for (const item of flowItems) {
        if (item.kind === "title") {
          activeTitle = item.title;
          const titleBlock = layout.sectionTitleHeight + layout.sectionTitleGap;
          if (cursorY + titleBlock + 54 > layout.contentBottom) {
            await pushPage();
            startPage(section);
          }
          drawTypeSectionTitle(current.ctx, current.page, item.title, cursorY, lang, printSettings);
          cursorY += titleBlock;
          continue;
        }
        const rowHeight = getFlowRowHeight(current.ctx, item.rooms, getCardWidth(current.page, printSettings), printSettings);
        if (cursorY + rowHeight > layout.contentBottom) {
          await pushPage();
          startPage(section);
          if (activeTitle) {
            drawTypeSectionTitle(current.ctx, current.page, activeTitle, cursorY, lang, printSettings);
            cursorY += layout.sectionTitleHeight + layout.sectionTitleGap;
          }
        }
        drawRoomRow(current.ctx, current.page, item.rooms, cursorY, rowHeight, labels, lang, printSettings);
        cursorY += rowHeight + layout.gapY + (item.isGroupLastRow ? layout.groupGap : 0);
      }
    }
    await pushPage();
    current = null;
  }
  return pages;
};

const canvasToPage = async (canvas) => ({
  widthPt: A4_LANDSCAPE.widthPt,
  heightPt: A4_LANDSCAPE.heightPt,
  pixelWidth: canvas.width,
  pixelHeight: canvas.height,
  jpeg: await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92)),
});

const blobToBytes = async (blob) => new Uint8Array(await blob.arrayBuffer());
const ascii = (value) => new TextEncoder().encode(value);
const concatBytes = (chunks) => {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  chunks.forEach((chunk) => {
    out.set(chunk, offset);
    offset += chunk.length;
  });
  return out;
};

const makePdf = async (pages) => {
  const chunks = [];
  const offsets = [0];
  const write = (chunk) => chunks.push(typeof chunk === "string" ? ascii(chunk) : chunk);
  const currentOffset = () => chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  let objectId = 1;
  const pageIds = [];
  const objects = [];

  write("%PDF-1.4\n");
  const addObject = async (bodyParts) => {
    const id = objectId;
    objectId += 1;
    offsets[id] = currentOffset();
    write(`${id} 0 obj\n`);
    for (const part of bodyParts) write(part);
    write("\nendobj\n");
    return id;
  };

  for (const page of pages) {
    const jpeg = await blobToBytes(page.jpeg);
    const imageId = await addObject([
      `<< /Type /XObject /Subtype /Image /Width ${page.pixelWidth || 1} /Height ${page.pixelHeight || 1} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
      jpeg,
      "\nendstream",
    ]);
    const content = `q\n${page.widthPt} 0 0 ${page.heightPt} 0 0 cm\n/Im${imageId} Do\nQ\n`;
    const contentId = await addObject([`<< /Length ${content.length} >>\nstream\n${content}endstream`]);
    objects.push({ page, imageId, contentId });
  }

  const pagesId = objectId;
  objectId += 1;
  for (const item of objects) {
    const pageId = await addObject([`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${item.page.widthPt} ${item.page.heightPt}] /Resources << /XObject << /Im${item.imageId} ${item.imageId} 0 R >> >> /Contents ${item.contentId} 0 R >>`]);
    pageIds.push(pageId);
  }
  offsets[pagesId] = currentOffset();
  write(`${pagesId} 0 obj\n<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>\nendobj\n`);
  const catalogId = await addObject([`<< /Type /Catalog /Pages ${pagesId} 0 R >>`]);
  const xrefOffset = currentOffset();
  write(`xref\n0 ${objectId}\n0000000000 65535 f \n`);
  for (let i = 1; i < objectId; i += 1) write(`${String(offsets[i] || 0).padStart(10, "0")} 00000 n \n`);
  write(`trailer\n<< /Size ${objectId} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return new Blob([concatBytes(chunks)], { type: "application/pdf" });
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export async function downloadRoomingPdf({
  rooms = [],
  labels = {},
  lang = "ar",
  programName = "",
  agencyName = "",
  agencyLogoUrl = "",
  filename = "",
  sectionOverride = null,
  printSettings = {},
} = {}) {
  const pages = await buildPages({ rooms, labels, lang, agencyName, agencyLogoUrl, sectionOverride, printSettings });
  const pdf = await makePdf(pages);
  downloadBlob(pdf, filename || `rooming-${sanitizeFile(programName)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export const createRoomingPrintHtml = ({
  rooms = [],
  labels = {},
  lang = "ar",
  programName = "",
  agencyName = "",
  agencyLogoUrl = "",
  sectionOverride = null,
  printSettings = {},
} = {}) => {
  const normalizedPrintSettings = normalizePrintSettings(printSettings);
  const density = getDensityConfig(normalizedPrintSettings);
  const layout = getFlowLayout(normalizedPrintSettings);
  const direction = getDirection(lang);
  const sections = groupRooms(rooms, labels, sectionOverride);
  const logoHtml = agencyLogoUrl
    ? `<img class="agency-logo" src="${escapeHtml(agencyLogoUrl)}" alt="${escapeHtml(agencyName || "Rukn")}" onerror="this.style.display='none'"/>`
    : `<span class="agency-logo-fallback">${escapeHtml((agencyName || "R").trim().slice(0, 1))}</span>`;
  const roomCardHtml = (room) => {
    const typeStyle = TYPE_COLORS[room.roomTypeKey] || TYPE_COLORS.other;
    const pilgrims = getRoomPilgrims(room, normalizedPrintSettings);
    const capacity = Math.max(1, Number(room.capacity) || pilgrims.length || 1);
    const rowCount = Math.max(capacity, pilgrims.length);
    const rows = Array.from({ length: rowCount }, (_, index) => pilgrims[index] || { name: "—", source: "" });
    return `
      <article class="room-card" style="--type-text:${typeStyle.text};--chip-bg:${typeStyle.chipBg};--chip-border:${typeStyle.chipBorder}">
        <div class="write-space"></div>
        <ol>
          ${rows.map((pilgrim) => {
            const empty = !pilgrim.name || pilgrim.name === "—";
            return `
              <li class="${empty ? "empty" : ""}">
                <span class="pilgrim-name">${escapeHtml(empty ? "—" : pilgrim.name)}</span>
                ${!empty && normalizedPrintSettings.showRegistrationSource && pilgrim.source ? `<span class="source-badge">${escapeHtml(pilgrim.source)}</span>` : ""}
              </li>
            `;
          }).join("")}
        </ol>
      </article>
    `;
  };
  const sectionsHtml = sections.length ? sections.map((section) => {
    const typeGroups = getOrderedTypeGroups(section, labels, lang, normalizedPrintSettings);
    return `
      <section class="rooming-section">
        <header class="print-header">
          <div class="agency-brand">
            ${logoHtml}
            <strong>${escapeHtml(agencyName || "—")}</strong>
          </div>
          <div class="title-block">
            <h1>${escapeHtml(section.cityLabel || labels.rooming || "Rooming")}</h1>
            ${section.combined && Array.isArray(section.dateRanges)
              ? section.dateRanges.slice(0, 2).map((range) => (
                `<p>${escapeHtml(range.label)}: ${escapeHtml(labels.checkIn || "Check-in")} ${escapeHtml(formatDate(range.checkIn))} / ${escapeHtml(labels.checkOut || "Check-out")} ${escapeHtml(formatDate(range.checkOut))}</p>`
              )).join("")
              : `<p>${escapeHtml(section.hotel || "")}</p>`}
            ${programName ? `<small>${escapeHtml(programName)}</small>` : ""}
          </div>
          <div class="metric-strip">
            <div><span>${escapeHtml(labels.roomsCount || "Rooms")}</span><b>${escapeHtml(String(section.rooms.length))}</b></div>
            <div><span>${escapeHtml(labels.checkIn || "Check-in")}</span><b>${escapeHtml(formatDate(section.checkIn))}</b></div>
            <div><span>${escapeHtml(labels.checkOut || "Check-out")}</span><b>${escapeHtml(formatDate(section.checkOut))}</b></div>
          </div>
        </header>
        <div class="divider"></div>
        ${typeGroups.map((group) => `
          <div class="type-group">
            <div class="type-title"><span>${escapeHtml(group.title)}</span></div>
            <div class="rooms-grid">
              ${group.rows.flat().map(roomCardHtml).join("")}
            </div>
          </div>
        `).join("")}
      </section>
    `;
  }).join("") : `
    <section class="rooming-section">
      <header class="print-header">
        <div class="agency-brand">${logoHtml}<strong>${escapeHtml(agencyName || "—")}</strong></div>
        <div class="title-block"><h1>${escapeHtml(labels.rooming || "Rooming")}</h1>${programName ? `<small>${escapeHtml(programName)}</small>` : ""}</div>
      </header>
      <div class="divider"></div>
      <p class="empty-state">${escapeHtml(labels.noRooms || "No rooms")}</p>
    </section>
  `;

  return `<!doctype html>
<html dir="${direction}" lang="${escapeHtml(lang)}">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(programName || labels.rooming || "Rooming")}</title>
  <style>
    @page{size:A4 landscape;margin:7mm}
    :root{
      --rooms-columns:${layout.columns};
      --room-card-padding:${density.html.cardPadding};
      --room-card-gap:${density.html.cardGap};
      --write-height:${density.html.writeHeight};
      --write-margin:${density.html.writeMargin};
      --item-padding:${density.html.itemPadding};
      --item-gap:${density.html.itemGap};
      --item-min-height:${density.html.itemMinHeight};
      --name-font:${density.html.nameFont};
      --name-line:${density.html.nameLine};
      --source-font:${density.html.sourceFont};
    }
    *{box-sizing:border-box}
    html,body{margin:0;background:#fff;color:#0f172a}
    body{font-family:Arial,Tahoma,sans-serif;font-size:9px;line-height:1.25}
    .rooming-section{break-after:page;page-break-after:always}
    .rooming-section:last-child{break-after:auto;page-break-after:auto}
    .print-header{position:relative;display:grid;grid-template-columns:48mm minmax(0,1fr) 86mm;align-items:start;gap:8mm;min-height:16mm;padding:0 0 2.5mm}
    .agency-brand{display:flex;align-items:center;gap:2.5mm;min-width:0}
    .agency-logo,.agency-logo-fallback{width:10mm;height:10mm;flex:0 0 auto;object-fit:contain;border-radius:2mm}
    .agency-logo-fallback{border:1px solid #d7dbe2;display:inline-flex;align-items:center;justify-content:center;color:#9a7418;font-size:12px;font-weight:900}
    .agency-brand strong{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8.5px;color:#0f172a}
    .title-block{text-align:center;min-width:0}
    .title-block h1{margin:0;color:#0f172a;font-size:15px;line-height:1.1;font-weight:900}
    .title-block p{margin:2px 0 0;color:#9a7418;font-size:8px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .title-block small{display:block;margin-top:1px;color:#64748b;font-size:7.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .metric-strip{display:grid;grid-template-columns:repeat(3,1fr);height:12mm;border-inline-start:1px solid #d9c491}
    .metric-strip div{display:flex;flex-direction:column;align-items:center;justify-content:center;border-inline-end:1px solid #d9c491;padding:0 2mm;text-align:center;min-width:0}
    .metric-strip span{font-size:7px;color:#475569;font-weight:800;white-space:nowrap}
    .metric-strip b{font-size:8.2px;color:#0f172a;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
    .divider{height:1px;background:#b99235;margin:0 0 3mm}
    .type-group{margin:0 0 2.5mm;break-inside:auto;page-break-inside:auto}
    .type-title{display:flex;align-items:center;gap:2mm;margin:0 0 1.5mm;color:#7c641f;font-weight:900}
    .type-title::before,.type-title::after{content:"";height:1px;background:#eee7d6;flex:1}
    .type-title span{display:inline-flex;align-items:center;justify-content:center;border:1px solid #e6dcc2;background:#fbfaf7;border-radius:999px;padding:1.2mm 5mm;font-size:8.5px;line-height:1}
    .rooms-grid{display:grid;grid-template-columns:repeat(var(--rooms-columns),minmax(0,1fr));gap:var(--room-card-gap);align-items:start}
    .room-card{border:1px solid #d8dee7;border-radius:2mm;background:#fff;padding:var(--room-card-padding);break-inside:avoid;page-break-inside:avoid;min-height:17mm}
    .write-space{height:var(--write-height);border:1px dashed #d7dbe2;border-radius:1.2mm;margin-bottom:var(--write-margin);background:#fff}
    ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:var(--item-gap)}
    li{display:flex;align-items:flex-start;justify-content:flex-start;gap:1mm;min-height:var(--item-min-height);border:1px solid var(--chip-border);border-radius:2mm;background:var(--chip-bg);padding:var(--item-padding);min-width:0;overflow:visible;flex-wrap:wrap}
    .pilgrim-name{min-width:0;max-width:100%;overflow:visible;text-overflow:clip;white-space:normal;overflow-wrap:anywhere;word-break:normal;color:var(--type-text);font-size:var(--name-font);line-height:var(--name-line);font-weight:800}
    .source-badge{flex:0 1 auto;max-width:100%;overflow:visible;text-overflow:clip;white-space:normal;overflow-wrap:anywhere;border:1px solid var(--chip-border);border-radius:999px;background:#fff;color:#64748b;font-size:var(--source-font);font-weight:800;line-height:1.15;padding:.25mm 1.3mm}
    li.empty{background:#fafafa;border-color:#ededed}
    li.empty .pilgrim-name{color:#94a3b8}
    .empty-state{margin:18mm 0 0;text-align:center;color:#64748b;font-size:12px;font-weight:800}
    @media print{
      html,body{background:#fff !important}
      .room-card,.type-title,.print-header{break-inside:avoid;page-break-inside:avoid}
      .rooms-grid{grid-template-columns:repeat(var(--rooms-columns),minmax(0,1fr))}
    }
  </style>
</head>
<body>
  ${sectionsHtml}
  <script>window.onload=()=>window.print()</script>
</body>
</html>`;
};

export const createCombinedRoomingSection = ({
  rooms = [],
  makkahHotel = "",
  madinahHotel = "",
  makkahDates = {},
  madinahDates = {},
  labels = {},
} = {}) => {
  const makkahLabel = labels.makkah || "مكة";
  const madinahLabel = labels.madinah || "المدينة";
  const title = [madinahHotel, makkahHotel].filter(Boolean).join(" — ")
    || `${madinahLabel} — ${makkahLabel}`;
  return {
    combined: true,
    city: "combined",
    cityLabel: title,
    hotel: "",
    checkIn: minDateValue(makkahDates.checkIn, madinahDates.checkIn),
    checkOut: maxDateValue(makkahDates.checkOut, madinahDates.checkOut),
    rooms,
    dateRanges: [
      { label: makkahLabel, checkIn: makkahDates.checkIn, checkOut: makkahDates.checkOut },
      { label: madinahLabel, checkIn: madinahDates.checkIn, checkOut: madinahDates.checkOut },
    ],
  };
};
