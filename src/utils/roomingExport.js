const ROOMING_EXPORT_DATE = () => new Date().toISOString().slice(0, 10);

const cleanText = (value, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const safeSheetName = (value, fallback = "Rooming") => {
  const cleaned = cleanText(value, fallback)
    .replace(/[\\/?*[\]:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || fallback).slice(0, 31);
};

const slugifyExportPart = (value, fallback = "rooming") => cleanText(value, fallback)
  .replace(/\s+/g, "-")
  .replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, "")
  .replace(/-+/g, "-")
  .slice(0, 80) || fallback;

const groupRoomsByHotel = (rooms = [], unknownHotel = "") => {
  const map = new Map();
  rooms.forEach((room) => {
    const hotelName = cleanText(room.hotelName, unknownHotel);
    if (!map.has(hotelName)) map.set(hotelName, { hotelName, rooms: [] });
    map.get(hotelName).rooms.push(room);
  });
  return Array.from(map.values());
};

const sumLocationTotals = (rooms = []) => rooms.reduce((totals, room) => ({
  rooms: totals.rooms + 1,
  assignedPilgrims: totals.assignedPilgrims + room.occupants.length,
  capacity: totals.capacity + room.capacity,
  emptyBeds: totals.emptyBeds + room.emptyBeds,
}), {
  rooms: 0,
  assignedPilgrims: 0,
  capacity: 0,
  emptyBeds: 0,
});

const sumGlobalTotals = (locations = []) => locations.reduce((totals, location) => ({
  rooms: totals.rooms + location.totals.rooms,
  assignedPilgrims: totals.assignedPilgrims + location.totals.assignedPilgrims,
  capacity: totals.capacity + location.totals.capacity,
  emptyBeds: totals.emptyBeds + location.totals.emptyBeds,
}), {
  rooms: 0,
  assignedPilgrims: 0,
  capacity: 0,
  emptyBeds: 0,
});

const makeRoomDisplayName = (room) => cleanText(
  room.roomNumber || room.roomName || room.name,
  ""
);

export function buildRoomingPrintModel({
  program = {},
  agencyName = "",
  agencyLogoUrl = "",
  lang = "ar",
  targetCities = [],
  cityLabels = {},
  roomsByCity = {},
  roomLinksByCity = {},
  hotelsByCity = {},
  datesByCity = {},
  getRoomDates = () => ({}),
  clientsById = {},
  labels = {},
  settings = {},
  getRoomTypeLabel = (value) => cleanText(value),
  getRoomCategoryLabel = (value) => cleanText(value),
  getRoomTypeKey = (value) => cleanText(value, "other"),
  getCapacity = () => 1,
  getClientName = (client) => cleanText(client?.name),
  getClientRegistrationSource = () => "",
  getClientGenderLabel = () => "",
} = {}) {
  const normalizedLabels = {
    title: labels.title || labels.rooming || "Rooming",
    unknownHotel: labels.unknownHotel || "",
    emptyBed: labels.emptyBed || "",
    generatedAt: labels.generatedAt || "",
    ...labels,
  };
  const locations = targetCities.map((cityKey) => {
    const cityRooms = Array.isArray(roomsByCity[cityKey]) ? roomsByCity[cityKey] : [];
    const fallbackHotel = cleanText(hotelsByCity[cityKey], normalizedLabels.unknownHotel);
    const dateInfo = datesByCity[cityKey] || {};
    const rooms = cityRooms.map((room, index) => {
      const occupantIds = Array.isArray(room.occupantIds) ? room.occupantIds : [];
      const occupants = occupantIds
        .map((clientId, occupantIndex) => {
          const client = clientsById[clientId];
          if (!client) return null;
          return {
            id: client.id || clientId,
            name: cleanText(getClientName(client)),
            registrationSource: cleanText(getClientRegistrationSource(client)),
            genderLabel: cleanText(getClientGenderLabel(client)),
            bedNumber: occupantIndex + 1,
          };
        })
        .filter(Boolean);
      const roomTypeKey = getRoomTypeKey(room.roomType) || room.roomType || "other";
      const capacity = Math.max(
        1,
        Number(room.capacity) || Number(getCapacity(roomTypeKey)) || 0,
        occupants.length || 1
      );
      const roomDates = getRoomDates(cityKey, room) || dateInfo;
      const hotelName = cleanText(room.hotel, fallbackHotel || normalizedLabels.unknownHotel);
      return {
        id: room.id || `${cityKey}-${index}`,
        city: cityKey,
        cityLabel: cityLabels[cityKey] || cityKey,
        hotelName,
        checkIn: roomDates.checkIn || dateInfo.checkIn || "",
        checkOut: roomDates.checkOut || dateInfo.checkOut || "",
        roomName: makeRoomDisplayName(room),
        roomTypeKey,
        roomTypeLabel: cleanText(getRoomTypeLabel(roomTypeKey), roomTypeKey),
        category: room.category || "",
        categoryLabel: cleanText(getRoomCategoryLabel(room.category)),
        capacity,
        occupants,
        emptyBeds: Math.max(0, capacity - occupants.length),
        order: Number(room.order ?? index),
        x: Number(room.x) || 0,
        y: Number(room.y) || 0,
      };
    });
    const totals = sumLocationTotals(rooms);
    return {
      key: cityKey,
      label: cityLabels[cityKey] || cityKey,
      hotelName: fallbackHotel,
      checkIn: dateInfo.checkIn || "",
      checkOut: dateInfo.checkOut || "",
      rooms,
      hotels: groupRoomsByHotel(rooms, normalizedLabels.unknownHotel),
      roomLinks: Array.isArray(roomLinksByCity[cityKey]) ? roomLinksByCity[cityKey] : [],
      totals,
    };
  });

  const pdfRooms = locations.flatMap((location) => location.rooms.map((room) => ({
    id: room.id,
    city: room.city,
    cityLabel: room.cityLabel,
    hotel: room.hotelName,
    checkIn: room.checkIn,
    checkOut: room.checkOut,
    roomTypeKey: room.roomTypeKey,
    roomTypeLabel: room.roomTypeLabel,
    capacity: room.capacity,
    pilgrims: room.occupants.map((occupant) => ({
      name: occupant.name,
      source: occupant.registrationSource,
    })),
    names: room.occupants.map((occupant) => occupant.name),
    order: room.order,
    x: room.x,
    y: room.y,
  })));

  return {
    lang,
    generatedAt: normalizedLabels.generatedAtValue || new Date().toLocaleDateString(lang === "ar" ? "ar-MA" : lang === "fr" ? "fr-FR" : "en-US"),
    programInfo: {
      id: program.id || "",
      name: cleanText(program.name, "program"),
      type: cleanText(program.type || program.programType || program.kind),
      departureDate: cleanText(program.departure || program.departureDate || program.departure_date),
      returnDate: cleanText(program.returnDate || program.return_date),
    },
    agencyInfo: {
      name: agencyName,
      logoUrl: agencyLogoUrl,
    },
    labels: normalizedLabels,
    settings,
    locations,
    roomLinks: locations.flatMap((location) => location.roomLinks),
    pdfRooms,
    globalTotals: sumGlobalTotals(locations),
    filenameBase: `rooming-${targetCities.join("-")}-${slugifyExportPart(program.name)}-${ROOMING_EXPORT_DATE()}`,
  };
}

export const buildRoomingExportData = buildRoomingPrintModel;

const EXCEL_FONT = "Cairo";
const MANUAL_ROOM_NUMBER_LABEL = "غرفة رقم :";
const PRINT_START_COL = 3;
const CARD_COLUMNS = 4;
const GAP_COLUMNS = 1;
const TYPE_ORDER = ["double", "triple", "quad", "quint", "quintuple", "single"];
const COLORS = {
  gold: "FF9A7418",
  goldDark: "FF7C641F",
  goldSoft: "FFFBFAF7",
  cream: "FFF8FAFC",
  card: "FFFFFFFF",
  border: "FF334155",
  mutedBorder: "FF94A3B8",
  divider: "FFB99235",
  text: "FF0F172A",
  mutedText: "FF64748B",
  bedFill: "FFFEF3C7",
};

const PDF_DENSITY = {
  comfortable: {
    columns: 5,
    topRowHeight: 17,
    occupantRowHeight: 24,
    cardColumnWidth: 8.8,
    gapColumnWidth: 2.4,
    headerFontSize: 8.5,
    nameFontSize: 8.5,
    sourceFontSize: 6.2,
  },
  normal: {
    columns: 6,
    topRowHeight: 14,
    occupantRowHeight: 19,
    cardColumnWidth: 7.5,
    gapColumnWidth: 1.8,
    headerFontSize: 8,
    nameFontSize: 7.7,
    sourceFontSize: 5.8,
  },
  compact: {
    columns: 7,
    topRowHeight: 11,
    occupantRowHeight: 15,
    cardColumnWidth: 6.4,
    gapColumnWidth: 1.4,
    headerFontSize: 7.2,
    nameFontSize: 6.8,
    sourceFontSize: 5.4,
  },
};

const excelBorder = (color = COLORS.border, style = "thin") => ({
  top: { style, color: { argb: color } },
  left: { style, color: { argb: color } },
  bottom: { style, color: { argb: color } },
  right: { style, color: { argb: color } },
});

const getPdfLikeDensity = (settings = {}) => {
  const key = ["comfortable", "normal", "compact"].includes(settings.density) ? settings.density : "normal";
  return PDF_DENSITY[key] || PDF_DENSITY.normal;
};

const getPdfLikeCardsPerRow = (settings = {}, roomCount = 0) => {
  const densityKey = ["comfortable", "normal", "compact"].includes(settings.density) ? settings.density : "normal";
  const count = Number(roomCount) || 0;
  if (densityKey === "comfortable") {
    if (count <= 3) return 3;
    if (count <= 12) return 4;
    return PDF_DENSITY.comfortable.columns;
  }
  if (densityKey === "compact") {
    if (count <= 4) return 4;
    if (count <= 8) return 4;
    if (count <= 14) return 5;
    return PDF_DENSITY.compact.columns;
  }
  if (count <= 3) return 3;
  if (count <= 12) return 4;
  return PDF_DENSITY.normal.columns;
};

const getTotalVisualColumns = (cardsPerRow) => (cardsPerRow * CARD_COLUMNS) + ((cardsPerRow - 1) * GAP_COLUMNS);

const getExcelVisualLayout = (settings = {}, roomCount = 0) => {
  const density = getPdfLikeDensity(settings);
  const cardsPerRow = getPdfLikeCardsPerRow(settings, roomCount);
  const printableCardsPerRow = Math.max(cardsPerRow, Number(density.columns) || cardsPerRow);
  const printableColumns = getTotalVisualColumns(printableCardsPerRow);
  const contentColumns = getTotalVisualColumns(cardsPerRow);
  const contentOffset = Math.max(0, Math.floor((printableColumns - contentColumns) / 2));
  const printStartCol = PRINT_START_COL;
  const printEndCol = printStartCol + printableColumns - 1;
  const contentStartCol = printStartCol + contentOffset;
  const contentEndCol = contentStartCol + contentColumns - 1;

  return {
    cardsPerRow,
    printableCardsPerRow,
    printableColumns,
    contentColumns,
    printStartCol,
    printEndCol,
    contentStartCol,
    contentEndCol,
  };
};

const getColumnName = (columnNumber) => {
  let number = columnNumber;
  let name = "";
  while (number > 0) {
    const remainder = (number - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    number = Math.floor((number - 1) / 26);
  }
  return name;
};

const formatExportDate = (value) => {
  const text = cleanText(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return text;
};

const getRoomTypeSectionLabel = (key, fallback, lang) => {
  const normalized = key === "quintuple" ? "quint" : key;
  if (lang === "fr") {
    return normalized === "single" ? "Chambres individuelles"
      : normalized === "double" ? "Chambres doubles"
        : normalized === "triple" ? "Chambres triples"
          : normalized === "quad" ? "Chambres quadruples"
            : normalized === "quint" ? "Chambres quintuples"
              : fallback || "Autres chambres";
  }
  if (lang === "en") {
    return normalized === "single" ? "Single rooms"
      : normalized === "double" ? "Double rooms"
        : normalized === "triple" ? "Triple rooms"
          : normalized === "quad" ? "Quad rooms"
            : normalized === "quint" ? "Quint rooms"
              : fallback || "Other rooms";
  }
  return normalized === "single" ? "فرادى"
    : normalized === "double" ? "ثنائيات"
      : normalized === "triple" ? "ثلاثيات"
        : normalized === "quad" ? "رباعيات"
          : normalized === "quint" ? "خماسيات"
            : fallback || "غرف أخرى";
};

const getTypeOrder = (key) => {
  const normalized = key === "quintuple" ? "quint" : key;
  const index = TYPE_ORDER.indexOf(normalized);
  return index === -1 ? 99 : index;
};

const compareRoomPosition = (a, b, lang = "ar") => {
  const yDelta = Number(a.y || 0) - Number(b.y || 0);
  if (Math.abs(yDelta) > 42) return yDelta;
  const xDelta = lang === "ar"
    ? Number(b.x || 0) - Number(a.x || 0)
    : Number(a.x || 0) - Number(b.x || 0);
  if (xDelta) return xDelta;
  return (Number(a.order) || 0) - (Number(b.order) || 0);
};

const getRoomLinkEndpoints = (link = {}) => {
  const source = String(link.sourceRoomId || link.source || "");
  const target = String(link.targetRoomId || link.target || "");
  return source && target && source !== target ? [source, target] : null;
};

const getLinkedRoomGroups = (rooms = [], roomLinks = []) => {
  const roomMap = new Map(rooms.map((room) => [String(room.id || ""), room]).filter(([id]) => id));
  const adjacency = new Map(Array.from(roomMap.keys()).map((id) => [id, new Set()]));
  (Array.isArray(roomLinks) ? roomLinks : []).forEach((link) => {
    const endpoints = getRoomLinkEndpoints(link);
    if (!endpoints) return;
    const [source, target] = endpoints;
    if (!roomMap.has(source) || !roomMap.has(target)) return;
    adjacency.get(source).add(target);
    adjacency.get(target).add(source);
  });
  const visited = new Set();
  const groups = [];
  roomMap.forEach((room, roomId) => {
    if (visited.has(roomId)) return;
    const stack = [roomId];
    const ids = [];
    visited.add(roomId);
    while (stack.length) {
      const current = stack.pop();
      ids.push(current);
      (adjacency.get(current) || []).forEach((next) => {
        if (visited.has(next)) return;
        visited.add(next);
        stack.push(next);
      });
    }
    groups.push(ids.map((id) => roomMap.get(id)).filter(Boolean));
  });
  return groups;
};

const getRoomGroupAnchor = (group = [], lang = "ar") => {
  const sorted = group.slice().sort((a, b) => compareRoomPosition(a, b, lang));
  const first = sorted[0] || {};
  return {
    city: first.city,
    x: Number(first.x) || 0,
    y: Number(first.y) || 0,
    order: Number(first.order) || 0,
  };
};

const compareRoomGroupAnchor = (a, b, lang = "ar") => {
  const yDelta = a.y - b.y;
  if (Math.abs(yDelta) > 42) return yDelta;
  const xDelta = lang === "ar" ? b.x - a.x : a.x - b.x;
  if (xDelta) return xDelta;
  return a.order - b.order;
};

const sortRoomsForArrangedExcel = (rooms = [], lang = "ar", roomLinks = []) => getLinkedRoomGroups(rooms, roomLinks)
  .map((group) => ({
    anchor: getRoomGroupAnchor(group, lang),
    rooms: group.slice().sort((a, b) => compareRoomPosition(a, b, lang)),
  }))
  .sort((a, b) => compareRoomGroupAnchor(a.anchor, b.anchor, lang))
  .flatMap((group) => group.rooms);

const sortRoomsForVisualExcel = (rooms = [], settings = {}, lang = "ar", roomLinks = []) => {
  if (settings.layoutMode === "arranged") {
    return sortRoomsForArrangedExcel(rooms, lang, roomLinks);
  }
  return rooms.slice().sort((a, b) => {
    const hotel = String(a.hotelName || "").localeCompare(String(b.hotelName || ""), lang === "ar" ? "ar" : undefined);
    if (hotel) return hotel;
    const type = getTypeOrder(a.roomTypeKey) - getTypeOrder(b.roomTypeKey);
    if (type) return type;
    return (Number(a.order) || 0) - (Number(b.order) || 0);
  });
};

const groupRoomsForVisualExcel = (location = {}, exportData = {}) => {
  const sortedRooms = sortRoomsForVisualExcel(location.rooms, exportData.settings, exportData.lang, location.roomLinks);
  const hotelMap = new Map();
  sortedRooms.forEach((room) => {
    const hotelName = cleanText(room.hotelName, exportData.labels.unknownHotel);
    if (!hotelMap.has(hotelName)) hotelMap.set(hotelName, new Map());
    const typeKey = room.roomTypeKey || "other";
    const typeMap = hotelMap.get(hotelName);
    if (!typeMap.has(typeKey)) typeMap.set(typeKey, []);
    typeMap.get(typeKey).push(room);
  });
  return Array.from(hotelMap.entries()).map(([hotelName, typeMap]) => ({
    hotelName,
    typeGroups: Array.from(typeMap.entries())
      .sort(([a], [b]) => getTypeOrder(a) - getTypeOrder(b) || String(a).localeCompare(String(b), "ar"))
      .map(([typeKey, typeRooms]) => ({
        typeKey,
        title: getRoomTypeSectionLabel(typeKey, typeRooms[0]?.roomTypeLabel, exportData.lang),
        rooms: typeRooms,
      })),
  }));
};

const saveWorkbookBuffer = (buffer, filename) => {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  if (typeof FileReader === "undefined") {
    resolve("");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const resolveLogoDataUrl = async (logoUrl) => {
  const url = cleanText(logoUrl);
  if (!url) return "";
  if (/^data:image\//i.test(url)) return url;
  if (typeof fetch !== "function") return "";
  try {
    const response = await fetch(url, { mode: "cors", cache: "force-cache" });
    if (!response.ok) return "";
    return await blobToDataUrl(await response.blob());
  } catch {
    return "";
  }
};

const getImageDimensions = (src) => new Promise((resolve) => {
  if (!src || typeof Image === "undefined") {
    resolve({ width: 1, height: 1 });
    return;
  }
  const image = new Image();
  image.onload = () => resolve({
    width: image.naturalWidth || image.width || 1,
    height: image.naturalHeight || image.height || 1,
  });
  image.onerror = () => resolve({ width: 1, height: 1 });
  image.src = src;
});

const fitImageSize = ({ width, height }, maxWidth, maxHeight) => {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  const scale = Math.min(maxWidth / safeWidth, maxHeight / safeHeight);
  return {
    width: Math.max(1, safeWidth * scale),
    height: Math.max(1, safeHeight * scale),
  };
};

const getImageExtension = (dataUrl) => {
  const match = String(dataUrl || "").match(/^data:image\/(png|jpe?g|gif);/i);
  if (!match) return "png";
  return match[1].toLowerCase().startsWith("jp") ? "jpeg" : match[1].toLowerCase();
};

const applyCellStyle = (cell, style = {}) => {
  if (style.font) cell.font = style.font;
  if (style.alignment) cell.alignment = style.alignment;
  if (style.fill) cell.fill = style.fill;
  if (style.border) cell.border = style.border;
  if (style.numFmt) cell.numFmt = style.numFmt;
};

const styleRange = (worksheet, startRow, startCol, endRow, endCol, style = {}) => {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      applyCellStyle(worksheet.getCell(row, col), style);
    }
  }
};

const mergeValue = (worksheet, startRow, startCol, endRow, endCol, value, style = {}) => {
  if (startRow !== endRow || startCol !== endCol) worksheet.mergeCells(startRow, startCol, endRow, endCol);
  const cell = worksheet.getCell(startRow, startCol);
  cell.value = value;
  styleRange(worksheet, startRow, startCol, endRow, endCol, style);
  return cell;
};

const getAlignment = (direction, extra = {}) => ({
  horizontal: direction === "rtl" ? "right" : "left",
  vertical: "middle",
  readingOrder: direction === "rtl" ? "rtl" : "ltr",
  wrapText: true,
  ...extra,
});

const fill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

const applyCardColumnPattern = (worksheet, startCol, cardsPerRow, density) => {
  let column = startCol;
  for (let card = 0; card < cardsPerRow; card += 1) {
    Array.from({ length: CARD_COLUMNS }).forEach(() => {
      worksheet.getColumn(column).width = density.cardColumnWidth;
      column += 1;
    });
    if (card < cardsPerRow - 1) {
      worksheet.getColumn(column).width = density.gapColumnWidth;
      column += 1;
    }
  }
};

const applyVisualColumns = (worksheet, layout, density) => {
  for (let column = 1; column < layout.printStartCol; column += 1) {
    worksheet.getColumn(column).width = 2.4;
  }
  applyCardColumnPattern(worksheet, layout.printStartCol, layout.printableCardsPerRow, density);
  applyCardColumnPattern(worksheet, layout.contentStartCol, layout.cardsPerRow, density);
};

const addAgencyLogo = async (workbook, worksheet, exportData, startCol) => {
  const logoDataUrl = await resolveLogoDataUrl(exportData.agencyInfo.logoUrl);
  if (!logoDataUrl) return;
  try {
    const dimensions = await getImageDimensions(logoDataUrl);
    const fitted = fitImageSize(dimensions, 42, 42);
    const imageId = workbook.addImage({
      base64: logoDataUrl,
      extension: getImageExtension(logoDataUrl),
    });
    worksheet.addImage(imageId, {
      tl: { col: startCol - 1 + 0.15, row: 0.25 },
      ext: fitted,
      editAs: "oneCell",
    });
  } catch {
    // Logo embedding is best-effort; the agency name remains printed in the header.
  }
};

const writeMetricBlock = (worksheet, startRow, startCol, endCol, label, value, direction) => {
  mergeValue(worksheet, startRow, startCol, startRow, endCol, label, {
    font: { name: EXCEL_FONT, size: 7.4, bold: true, color: { argb: "FF475569" } },
    alignment: getAlignment(direction, { horizontal: "center" }),
    fill: fill("FFFFFFFF"),
    border: {
      left: { style: "thin", color: { argb: "FFD9C491" } },
      right: { style: "thin", color: { argb: "FFD9C491" } },
    },
  });
  mergeValue(worksheet, startRow + 1, startCol, startRow + 2, endCol, value, {
    font: { name: EXCEL_FONT, size: 8.8, bold: true, color: { argb: COLORS.text } },
    alignment: getAlignment(direction, { horizontal: "center" }),
    fill: fill("FFFFFFFF"),
    border: {
      left: { style: "thin", color: { argb: "FFD9C491" } },
      right: { style: "thin", color: { argb: "FFD9C491" } },
    },
  });
};

const writeVisualHeader = async (workbook, worksheet, location, exportData, startCol, endCol, direction) => {
  const labels = exportData.labels;
  const totalColumns = endCol - startCol + 1;
  const brandColumns = Math.max(4, Math.min(6, Math.floor(totalColumns * 0.24)));
  const metricColumns = Math.max(6, Math.min(9, Math.floor(totalColumns * 0.34)));
  const brandStart = startCol;
  const brandEnd = Math.min(endCol, brandStart + brandColumns - 1);
  const metricsStart = Math.max(brandEnd + 1, endCol - metricColumns + 1);
  const titleStart = Math.min(endCol, brandEnd + 1);
  const titleEnd = Math.max(titleStart, metricsStart - 1);

  const programDates = [
    formatExportDate(exportData.programInfo.departureDate),
    formatExportDate(exportData.programInfo.returnDate),
  ].filter(Boolean).join(" - ");
  const hotelTitle = cleanText(location.hotelName, labels.unknownHotel || "");

  const agencyNameStart = Math.min(brandEnd, brandStart + 2);
  styleRange(worksheet, 1, brandStart, 3, Math.max(brandStart, agencyNameStart - 1), {
    fill: fill("FFFFFFFF"),
  });
  mergeValue(worksheet, 1, agencyNameStart, 3, brandEnd, exportData.agencyInfo.name || "", {
    font: { name: EXCEL_FONT, size: 8.8, bold: true, color: { argb: COLORS.text } },
    alignment: getAlignment(direction, { horizontal: "left" }),
    fill: fill("FFFFFFFF"),
  });
  await addAgencyLogo(workbook, worksheet, exportData, brandStart);

  mergeValue(worksheet, 1, titleStart, 1, titleEnd, location.label || labels.rooming || "Rooming", {
    font: { name: EXCEL_FONT, size: 10.4, bold: true, color: { argb: COLORS.mutedText } },
    alignment: getAlignment(direction, { horizontal: "center" }),
    fill: fill("FFFFFFFF"),
  });
  mergeValue(worksheet, 2, titleStart, 3, titleEnd, hotelTitle, {
    font: { name: EXCEL_FONT, size: 11.4, bold: true, color: { argb: COLORS.text } },
    alignment: getAlignment(direction, { horizontal: "center" }),
    fill: fill("FFFFFFFF"),
  });
  mergeValue(worksheet, 4, titleStart, 4, titleEnd, programDates ? `${exportData.programInfo.name || ""} • ${programDates}` : exportData.programInfo.name || "", {
    font: { name: EXCEL_FONT, size: 7.4, bold: true, color: { argb: COLORS.mutedText } },
    alignment: getAlignment(direction, { horizontal: "center" }),
    fill: fill("FFFFFFFF"),
  });

  const metricWidth = Math.max(1, Math.floor((endCol - metricsStart + 1) / 3));
  const metrics = [
    [labels.roomsCount || "Rooms", String(location.totals.rooms)],
    [labels.checkIn || "Check-in", formatExportDate(location.checkIn) || "—"],
    [labels.checkOut || "Check-out", formatExportDate(location.checkOut) || "—"],
  ];
  metrics.forEach(([label, value], index) => {
    const blockStart = metricsStart + (index * metricWidth);
    const blockEnd = index === metrics.length - 1 ? endCol : Math.min(endCol, blockStart + metricWidth - 1);
    writeMetricBlock(worksheet, 1, blockStart, blockEnd, label, value, direction);
  });
  mergeValue(worksheet, 4, metricsStart, 4, endCol, exportData.programInfo.name || "", {
    font: { name: EXCEL_FONT, size: 6.9, bold: true, color: { argb: COLORS.mutedText } },
    alignment: getAlignment(direction, { horizontal: "center" }),
    fill: fill("FFFFFFFF"),
    border: {
      top: { style: "thin", color: { argb: "FFEADFCA" } },
      left: { style: "thin", color: { argb: "FFD9C491" } },
      right: { style: "thin", color: { argb: "FFD9C491" } },
    },
  });

  mergeValue(worksheet, 5, startCol, 5, endCol, "", {
    fill: fill("FFFFFFFF"),
    border: { bottom: { style: "thin", color: { argb: COLORS.divider } } },
  });
  [1, 2, 3].forEach((row) => {
    worksheet.getRow(row).height = 18;
  });
  worksheet.getRow(4).height = 13;
  worksheet.getRow(5).height = 6;
  worksheet.getRow(6).height = 8;
  return 7;
};

const appendBandTitle = (worksheet, row, startCol, endCol, label, direction, kind = "type") => {
  const isHotel = kind === "hotel";
  mergeValue(worksheet, row, startCol, row, endCol, label, {
    font: { name: EXCEL_FONT, size: isHotel ? 10.4 : 8.6, bold: true, color: { argb: isHotel ? COLORS.text : COLORS.goldDark } },
    alignment: getAlignment(direction, { horizontal: direction === "rtl" ? "right" : "left" }),
    fill: fill(isHotel ? "FFFFFFFF" : COLORS.goldSoft),
    border: isHotel ? { bottom: { style: "thin", color: { argb: COLORS.mutedBorder } } } : excelBorder("FFE6DCC2"),
  });
  worksheet.getRow(row).height = isHotel ? 22 : 17;
  return row + 1;
};

const getCardStartColumn = (startCol, cardIndex) => startCol + (cardIndex * (CARD_COLUMNS + GAP_COLUMNS));

const getCenteredRowStartColumn = (layout, cardCount) => {
  const leadingSlots = Math.max(0, Math.floor((layout.cardsPerRow - cardCount) / 2));
  return getCardStartColumn(layout.contentStartCol, leadingSlots);
};

const drawBlankCardArea = (worksheet, startRow, startCol, endRow, direction) => {
  styleRange(worksheet, startRow, startCol, endRow, startCol + CARD_COLUMNS - 1, {
    fill: fill(COLORS.card),
    border: excelBorder(COLORS.mutedBorder),
    alignment: getAlignment(direction),
  });
};

const makeOccupantCellText = (occupant, includeSource) => {
  if (!occupant?.name) return "";
  const source = includeSource ? cleanText(occupant.registrationSource) : "";
  return source ? `${occupant.name}    ${source}` : occupant.name;
};

const writeOccupantName = (worksheet, row, startCol, endCol, occupant, includeSource, density, direction, border) => {
  mergeValue(worksheet, row, startCol, row, endCol, makeOccupantCellText(occupant, includeSource), {
    font: { name: EXCEL_FONT, size: density.nameFontSize, bold: Boolean(occupant), color: { argb: COLORS.text } },
    alignment: getAlignment(direction),
    fill: fill(COLORS.card),
    border,
  });
};

const drawRoomCard = (worksheet, room, startRow, startCol, blockRows, exportData, direction) => {
  const includeSource = exportData.settings.showRegistrationSource !== false;
  const showBedNumbers = exportData.settings.showBedNumbers === true;
  const density = getPdfLikeDensity(exportData.settings);
  const endCol = startCol + CARD_COLUMNS - 1;
  const roomRowCount = Math.max(1, Number(room.capacity) || 0, room.occupants.length || 0);

  mergeValue(worksheet, startRow, startCol, startRow, endCol, MANUAL_ROOM_NUMBER_LABEL, {
    font: { name: EXCEL_FONT, size: density.headerFontSize, bold: true, color: { argb: COLORS.text } },
    alignment: getAlignment("rtl", { horizontal: "right" }),
    fill: fill(COLORS.cream),
    border: {
      top: { style: "thin", color: { argb: COLORS.border } },
      left: { style: "thin", color: { argb: COLORS.border } },
      bottom: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } },
    },
  });
  worksheet.getRow(startRow).height = density.topRowHeight;

  for (let index = 0; index < blockRows; index += 1) {
    const row = startRow + 1 + index;
    const occupant = room.occupants[index] || null;
    const inCapacity = index < roomRowCount;
    const rowBorder = {
      left: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } },
      bottom: { style: "thin", color: { argb: COLORS.mutedBorder } },
    };

    if (showBedNumbers) {
      mergeValue(worksheet, row, startCol, row, startCol, inCapacity ? index + 1 : "", {
        font: { name: EXCEL_FONT, size: density.headerFontSize, bold: true, color: { argb: COLORS.text } },
        alignment: { horizontal: "center", vertical: "middle", readingOrder: "ltr" },
        fill: fill(COLORS.bedFill),
        border: {
          left: { style: "thin", color: { argb: COLORS.border } },
          bottom: { style: "thin", color: { argb: COLORS.mutedBorder } },
          right: { style: "thin", color: { argb: COLORS.divider } },
        },
      });
      writeOccupantName(worksheet, row, startCol + 1, endCol, inCapacity ? occupant : null, includeSource, density, direction, rowBorder);
    } else {
      writeOccupantName(worksheet, row, startCol, endCol, inCapacity ? occupant : null, includeSource, density, direction, rowBorder);
    }
    worksheet.getRow(row).height = density.occupantRowHeight;
  }

  if (blockRows > roomRowCount) {
    drawBlankCardArea(worksheet, startRow + 1 + roomRowCount, startCol, startRow + blockRows, direction);
  }
};

const appendRoomCards = (worksheet, rooms, startRow, exportData, layout, direction) => {
  let row = startRow;
  for (let index = 0; index < rooms.length; index += layout.cardsPerRow) {
    const chunk = rooms.slice(index, index + layout.cardsPerRow);
    const blockRows = Math.max(...chunk.map((room) => Math.max(1, Number(room.capacity) || 0, room.occupants.length || 0)));
    const rowStartCol = getCenteredRowStartColumn(layout, chunk.length);
    chunk.forEach((room, cardIndex) => {
      drawRoomCard(worksheet, room, row, getCardStartColumn(rowStartCol, cardIndex), blockRows, exportData, direction);
    });
    row += blockRows + 2;
  }
  return row;
};

const appendNoRooms = (worksheet, row, startCol, endCol, labels, direction) => {
  mergeValue(worksheet, row, startCol, row + 2, endCol, labels.noRooms || "No rooms", {
    font: { name: EXCEL_FONT, size: 13, bold: true, color: { argb: COLORS.mutedText } },
    alignment: getAlignment(direction, { horizontal: "center" }),
    fill: fill("FFFFFFFF"),
    border: excelBorder(COLORS.mutedBorder),
  });
  worksheet.getRow(row).height = 28;
  return row + 4;
};

const appendLocationVisualSheet = async (workbook, location, exportData, direction) => {
  const density = getPdfLikeDensity(exportData.settings);
  const layout = getExcelVisualLayout(exportData.settings, location.rooms.length);
  const startCol = layout.contentStartCol;
  const endCol = layout.contentEndCol;
  const worksheet = workbook.addWorksheet(safeSheetName(location.sheetName || location.label), {
    views: [{ rightToLeft: direction === "rtl", showGridLines: false }],
  });
  worksheet.properties.defaultRowHeight = 18;
  worksheet.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: {
      left: 0.2,
      right: 0.2,
      top: 0.35,
      bottom: 0.35,
      header: 0.15,
      footer: 0.15,
    },
  };
  worksheet.pageSetup.horizontalCentered = true;
  worksheet.pageSetup.fitToWidth = 1;
  applyVisualColumns(worksheet, layout, density);

  let row = await writeVisualHeader(workbook, worksheet, location, exportData, startCol, endCol, direction);
  const hotelGroups = groupRoomsForVisualExcel(location, exportData);
  if (!hotelGroups.length) {
    row = appendNoRooms(worksheet, row, startCol, endCol, exportData.labels, direction);
  } else if (exportData.settings.layoutMode === "arranged") {
    row = appendRoomCards(
      worksheet,
      sortRoomsForVisualExcel(location.rooms, exportData.settings, exportData.lang, location.roomLinks),
      row,
      exportData,
      layout,
      direction
    );
  } else {
    const showHotelBands = hotelGroups.length > 1;
    hotelGroups.forEach((hotelGroup) => {
      if (showHotelBands) {
        row = appendBandTitle(worksheet, row, startCol, endCol, `${exportData.labels.hotel || "Hotel"}: ${hotelGroup.hotelName}`, direction, "hotel");
      }
      hotelGroup.typeGroups.forEach((typeGroup) => {
        row = appendBandTitle(worksheet, row, startCol, endCol, typeGroup.title, direction, "type");
        row = appendRoomCards(worksheet, typeGroup.rooms, row, exportData, layout, direction);
      });
    });
  }
  worksheet.pageSetup.printArea = `${getColumnName(layout.printStartCol)}1:${getColumnName(layout.printEndCol)}${Math.max(1, row - 1)}`;
  return worksheet;
};

export async function downloadRoomingExcel(exportData) {
  const ExcelJSModule = await import("exceljs");
  const ExcelJS = ExcelJSModule.default || ExcelJSModule;
  const direction = exportData.lang === "ar" ? "rtl" : "ltr";
  const workbook = new ExcelJS.Workbook();
  workbook.creator = exportData.agencyInfo.name || "Rukn";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties = {
    title: exportData.labels.title,
    subject: exportData.programInfo.name,
    creator: exportData.agencyInfo.name || "Rukn",
  };
  workbook.views = [{ rtl: direction === "rtl" }];

  for (const location of exportData.locations) {
    // eslint-disable-next-line no-await-in-loop
    await appendLocationVisualSheet(workbook, location, exportData, direction);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveWorkbookBuffer(buffer, `${exportData.filenameBase}.xlsx`);
}
