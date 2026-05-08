const A4_LANDSCAPE = { widthPt: 841.89, heightPt: 595.28 };
const PDF_SCALE = 2;
const ROOM_TYPE_ORDER = ["double", "triple", "quad", "quint"];
const CITY_ORDER = ["makkah", "madinah"];
const FLOW_LAYOUT = {
  contentTop: 88,
  contentBottom: 576,
  columns: 6,
  gapX: 7,
  gapY: 5,
  groupGap: 2,
  sectionTitleHeight: 15,
  sectionTitleGap: 4,
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

const wrapText = (ctx, value, maxWidth, maxLines = 2) => {
  const raw = text(value, "—");
  const parts = raw.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  parts.forEach((part) => {
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
    return safeLines.map((line) => truncateToWidth(ctx, line, maxWidth));
  }
  const clipped = safeLines.slice(0, maxLines);
  clipped[maxLines - 1] = truncateToWidth(ctx, `${clipped[maxLines - 1]}…`, maxWidth);
  return clipped;
};

const measureRoomCard = (ctx, room, cardWidth) => {
  const contentWidth = cardWidth - 22;
  ctx.font = "700 8.2pt Arial, Tahoma, sans-serif";
  const names = Array.isArray(room.names) ? room.names : [];
  const capacity = Math.max(1, Number(room.capacity) || names.length || 1);
  const rowCount = Math.max(capacity, names.length);
  const rows = Array.from({ length: rowCount }, (_, index) => names[index] || "—");
  const chipsHeight = rows.reduce((sum, name) => {
    const lineCount = wrapText(ctx, name, contentWidth, 2).length;
    return sum + Math.max(12.8, lineCount * 9.4 + 4);
  }, 0);
  return Math.max(56, 13 + chipsHeight + Math.max(0, rows.length - 1) * 2.2 + 7);
};

const drawHeader = (ctx, page, { section, logoImage, agencyName, labels, lang }) => {
  const direction = getDirection(lang);
  const right = page.width - page.margin;
  const left = page.margin;
  const center = page.width / 2;
  const logoSize = 38;
  if (logoImage) {
    drawContainImage(ctx, logoImage, left, 16, logoSize, logoSize);
  } else {
    ctx.strokeStyle = "#d7dbe2";
    ctx.lineWidth = 1;
    drawRoundRect(ctx, left, 16, logoSize, logoSize, 8);
    ctx.stroke();
    drawText(ctx, "R", left + logoSize / 2, 25, {
      size: 16,
      weight: 800,
      color: "#9a7418",
      align: "center",
      direction: "ltr",
    });
  }
  drawText(ctx, agencyName || "", left + logoSize + 8, 22, {
    size: 10.2,
    weight: 800,
    color: "#0f172a",
    align: "left",
    direction,
    maxWidth: 150,
  });
  drawText(ctx, section.cityLabel || "", center, section.combined ? 16 : 12, {
    size: section.combined ? 15.5 : 29,
    weight: 900,
    color: "#0f172a",
    align: "center",
    direction,
    maxWidth: 360,
  });
  if (section.combined && Array.isArray(section.dateRanges)) {
    section.dateRanges.slice(0, 2).forEach((range, index) => {
      const line = `${range.label}: ${labels.checkIn} ${formatDate(range.checkIn)} / ${labels.checkOut} ${formatDate(range.checkOut)}`;
      drawText(ctx, line, center, 39 + index * 15, {
        size: 8.4,
        weight: 800,
        color: index === 0 ? "#7c641f" : "#475569",
        align: "center",
        direction,
        maxWidth: 390,
      });
    });
  } else {
    drawText(ctx, section.hotel || "", center, 49, {
      size: 12,
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
      ctx.moveTo(x + metricWidth, 18);
      ctx.lineTo(x + metricWidth, 55);
      ctx.stroke();
    }
    drawText(ctx, item.label, x + metricWidth / 2, 18, {
      size: 8.6,
      weight: 700,
      color: "#475569",
      align: "center",
      direction,
    });
    drawText(ctx, item.value, x + metricWidth / 2, 36, {
      size: 10.2,
      weight: 800,
      color: "#0f172a",
      align: "center",
      direction: item.value.match(/\d/) ? "ltr" : direction,
    });
  });
  ctx.strokeStyle = "#b99235";
  ctx.lineWidth = 1.05;
  ctx.beginPath();
  ctx.moveTo(left, 78);
  ctx.lineTo(right, 78);
  ctx.stroke();
};

const drawRoomCard = (ctx, room, x, y, width, height, labels, lang) => {
  const direction = getDirection(lang);
  const names = Array.isArray(room.names) ? room.names : [];
  const capacity = Math.max(1, Number(room.capacity) || names.length || 1);
  const rowCount = Math.max(capacity, names.length);
  const count = names.filter(Boolean).length;
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

  const right = x + width - 8;
  const left = x + 8;

  const rows = Array.from({ length: rowCount }, (_, index) => names[index] || "—");
  const chipGap = 2.2;
  const chipX = left;
  const chipWidth = width - 16;
  const contentTop = y + 8;
  const contentBottom = y + height - 7;
  const availableHeight = Math.max(1, contentBottom - contentTop);
  const chipHeight = Math.max(1, (availableHeight - chipGap * Math.max(0, rows.length - 1)) / rows.length);
  const fontSize = chipHeight >= 15.5 ? 8.4 : chipHeight >= 13 ? 8 : chipHeight >= 11 ? 7.4 : 6.8;
  const lineHeight = fontSize + 2;
  const maxLines = chipHeight >= lineHeight * 2 + 3 ? 2 : 1;
  ctx.font = `700 ${fontSize}pt Arial, Tahoma, sans-serif`;
  const contentWidth = chipWidth - 10;
  let cursor = contentTop;
  rows.forEach((name) => {
    const empty = name === "—";
    const lines = wrapText(ctx, name, contentWidth, maxLines);
    drawRoundRect(ctx, chipX, cursor, chipWidth, chipHeight, Math.min(7, chipHeight / 2));
    ctx.fillStyle = empty ? "#fafafa" : typeStyle.chipBg;
    ctx.fill();
    ctx.strokeStyle = empty ? "#ededed" : typeStyle.chipBorder;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    const textBlockHeight = lines.length * lineHeight;
    let lineY = cursor + Math.max(1, (chipHeight - textBlockHeight) / 2);
    lines.forEach((line) => {
      drawText(ctx, line, right - 5, lineY, {
        size: fontSize,
        weight: empty ? 600 : 700,
        color: empty ? "#94a3b8" : typeStyle.text || "#1f2937",
        align: "right",
        direction,
      });
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

const drawTypeSectionTitle = (ctx, page, label, y, lang) => {
  const direction = getDirection(lang);
  const right = page.width - page.margin;
  const left = page.margin;
  ctx.font = "900 8.6pt Arial, Tahoma, sans-serif";
  const textWidth = Math.min(130, Math.max(72, ctx.measureText(label).width + 28));
  const x = right - textWidth;
  drawRoundRect(ctx, x, y, textWidth, FLOW_LAYOUT.sectionTitleHeight, 8.5);
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

const getCardWidth = (page) => (
  (page.width - page.margin * 2 - FLOW_LAYOUT.gapX * (FLOW_LAYOUT.columns - 1)) / FLOW_LAYOUT.columns
);

const getRoomMinimumHeight = (room) => {
  const names = Array.isArray(room.names) ? room.names : [];
  const capacity = Math.max(1, Number(room.capacity) || names.length || 1);
  const rowCount = Math.max(capacity, names.length);
  if (rowCount <= 2) return 56;
  if (rowCount === 3) return 64;
  if (rowCount === 4) return 72;
  if (rowCount === 5) return 80;
  return 92;
};

const getFlowRowHeight = (ctx, rooms, cardWidth) => {
  const measured = rooms.map((room) => Math.max(getRoomMinimumHeight(room), measureRoomCard(ctx, room, cardWidth)));
  return Math.min(116, Math.max(...measured, 60));
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

const getOrderedTypeGroups = (section, labels, lang) => {
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
      rows: Array.from({ length: Math.ceil(typeRooms.length / FLOW_LAYOUT.columns) }, (_, index) => (
        typeRooms.slice(index * FLOW_LAYOUT.columns, (index + 1) * FLOW_LAYOUT.columns)
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

const getSinglePageRowHeights = (ctx, items, page) => {
  const rows = items.filter((item) => item.kind === "row");
  if (!rows.length) return null;
  const cardWidth = getCardWidth(page);
  const titleCount = items.filter((item) => item.kind === "title").length;
  const rowGapCount = Math.max(0, rows.length - 1);
  const groupGapCount = Math.max(0, rows.filter((item) => item.isGroupLastRow).length - 1);
  const titleBlock = FLOW_LAYOUT.sectionTitleHeight + FLOW_LAYOUT.sectionTitleGap;
  const fixedHeight = titleCount * titleBlock
    + rowGapCount * FLOW_LAYOUT.gapY
    + groupGapCount * FLOW_LAYOUT.groupGap;
  const availableForRows = FLOW_LAYOUT.contentBottom - FLOW_LAYOUT.contentTop - fixedHeight;
  const desired = rows.map((item) => getFlowRowHeight(ctx, item.rooms, cardWidth));
  const minimum = rows.map((item) => Math.max(...item.rooms.map(getRoomMinimumHeight), 54));
  const desiredTotal = desired.reduce((sum, value) => sum + value, 0);
  const minimumTotal = minimum.reduce((sum, value) => sum + value, 0);
  if (desiredTotal <= availableForRows) return desired;
  if (minimumTotal > availableForRows) return null;
  const scale = desiredTotal === minimumTotal
    ? 0
    : (availableForRows - minimumTotal) / (desiredTotal - minimumTotal);
  return desired.map((height, index) => minimum[index] + Math.max(0, height - minimum[index]) * scale);
};

const drawRoomRow = (ctx, page, rooms, y, rowHeight, labels, lang) => {
  const cardWidth = getCardWidth(page);
  rooms.forEach((room, index) => {
    const x = page.width - page.margin - cardWidth - index * (cardWidth + FLOW_LAYOUT.gapX);
    drawRoomCard(ctx, room, x, y, cardWidth, rowHeight, labels, lang);
  });
};

const buildPages = async ({ rooms, labels, lang, agencyName, agencyLogoUrl, sectionOverride }) => {
  const pages = [];
  const logoImage = await loadImage(agencyLogoUrl);
  let current = null;
  let cursorY = FLOW_LAYOUT.contentTop;

  const pushPage = async () => {
    if (!current) return;
    pages.push(await canvasToPage(current.canvas));
  };

  const startPage = (section) => {
    current = makeCanvasPage({ labels, lang, agencyName, logoImage, section });
    cursorY = FLOW_LAYOUT.contentTop;
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
    const typeGroups = getOrderedTypeGroups(section, labels, lang);
    const flowItems = getFlowItems(typeGroups);
    const singlePageHeights = section.rooms.length <= 30
      ? getSinglePageRowHeights(current.ctx, flowItems, current.page)
      : null;

    if (singlePageHeights) {
      let rowIndex = 0;
      flowItems.forEach((item) => {
        if (item.kind === "title") {
          drawTypeSectionTitle(current.ctx, current.page, item.title, cursorY, lang);
          cursorY += FLOW_LAYOUT.sectionTitleHeight + FLOW_LAYOUT.sectionTitleGap;
          return;
        }
        const rowHeight = singlePageHeights[rowIndex] || getFlowRowHeight(current.ctx, item.rooms, getCardWidth(current.page));
        rowIndex += 1;
        drawRoomRow(current.ctx, current.page, item.rooms, cursorY, rowHeight, labels, lang);
        cursorY += rowHeight + FLOW_LAYOUT.gapY + (item.isGroupLastRow ? FLOW_LAYOUT.groupGap : 0);
      });
    } else {
      let activeTitle = "";
      for (const item of flowItems) {
        if (item.kind === "title") {
          activeTitle = item.title;
          const titleBlock = FLOW_LAYOUT.sectionTitleHeight + FLOW_LAYOUT.sectionTitleGap;
          if (cursorY + titleBlock + 54 > FLOW_LAYOUT.contentBottom) {
            await pushPage();
            startPage(section);
          }
          drawTypeSectionTitle(current.ctx, current.page, item.title, cursorY, lang);
          cursorY += titleBlock;
          continue;
        }
        const rowHeight = getFlowRowHeight(current.ctx, item.rooms, getCardWidth(current.page));
        if (cursorY + rowHeight > FLOW_LAYOUT.contentBottom) {
          await pushPage();
          startPage(section);
          if (activeTitle) {
            drawTypeSectionTitle(current.ctx, current.page, activeTitle, cursorY, lang);
            cursorY += FLOW_LAYOUT.sectionTitleHeight + FLOW_LAYOUT.sectionTitleGap;
          }
        }
        drawRoomRow(current.ctx, current.page, item.rooms, cursorY, rowHeight, labels, lang);
        cursorY += rowHeight + FLOW_LAYOUT.gapY + (item.isGroupLastRow ? FLOW_LAYOUT.groupGap : 0);
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
} = {}) {
  const pages = await buildPages({ rooms, labels, lang, agencyName, agencyLogoUrl, sectionOverride });
  const pdf = await makePdf(pages);
  downloadBlob(pdf, filename || `rooming-${sanitizeFile(programName)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

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
