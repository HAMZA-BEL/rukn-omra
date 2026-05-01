import React from "react";
import { createPortal } from "react-dom";
import jspreadsheet from "jspreadsheet-ce";
import "jspreadsheet-ce/dist/jspreadsheet.css";
import "jsuites/dist/jsuites.css";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button, GlassCard, Modal, Input, Select, EmptyState, SearchBar, StatusBadge } from "./UI";
import ClientDetail from "./ClientDetail";
import ClientForm from "./ClientForm";
import MRZReader from "./MRZReader";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { formatCurrency } from "../utils/currency";
import { downloadAmadeusExcel } from "../utils/amadeus";
import { printProgramPDF } from "../utils/exportPdf";
import { useDropdownPosition } from "../hooks/useDropdownPosition";
import TransferSheet from "./TransferSheet";
import { AppIcon } from "./Icon";
import tiznitVoyagesLogo from "../assets/tiznit-voyages-logo.png";
import {
  PROGRAM_ROOM_PRICE_KEYS,
  getPackageStartingPrice,
  getLegacyFieldsFromPackages,
  getProgramPackageCount,
  getProgramStartingPrice,
  getRoomTypeLabel,
  normalizeProgramPackages,
} from "../utils/programPackages";
import {
  getClientArabicName,
  getClientDisplayName as resolveClientDisplayName,
  getClientLatinName,
} from "../utils/clientNames";
import {
  translateHotelLevel,
  translateProgramType,
  translateRoomCategory,
  translateRoomType,
  trKey,
} from "../utils/i18nValues";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  ChevronUp,
  Columns3,
  Copy,
  Filter,
  FileSpreadsheet,
  Italic,
  LayoutGrid,
  Lock,
  Maximize2,
  Merge,
  Minimize2,
  MoreHorizontal,
  PaintBucket,
  PanelBottom,
  PanelLeft,
  PanelRightClose,
  PanelRight,
  PanelRightOpen,
  PanelTop,
  Redo2,
  Search,
  Settings,
  Square,
  SquareSlash,
  TableCellsMerge,
  TableColumnsSplit,
  TableRowsSplit,
  Trash2,
  Type,
  Undo2,
  Unlock,
  UserPlus,
  WrapText,
  Scan,
} from "lucide-react";

const tc = theme.colors;
const MENU_OFFSET_PX = 6;
const PACKAGE_TEMPLATES = ["اقتصادي", "سياحي", "سياحي بالإفطار", "VIP"];
const ROOMING_ROWS = 60;
const ROOMING_COLS = 20;
const ROOMING_BASE_CELL_WIDTH = 132;
const ROOMING_BASE_FIRST_COL_WIDTH = 150;
const ROOMING_BASE_ROW_HEIGHT = 34;
const ROOMING_BASE_FONT_SIZE = 13;
const ROOMING_CITY_LABELS = {
  makkah: "تسكين مكة",
  madinah: "تسكين المدينة",
};
const ROOMING_COLORS = ["#fef3c7", "#dcfce7", "#e0f2fe", "#fce7f3", "#ede9fe", "#fee2e2"];
const ROOMING_ROOM_OPTIONS = [
  { value: "single", label: "فردية", capacity: 1 },
  { value: "double", label: "ثنائية", capacity: 2 },
  { value: "triple", label: "ثلاثية", capacity: 3 },
  { value: "quad", label: "رباعية", capacity: 4 },
  { value: "quint", label: "خماسية", capacity: 5 },
];
const ROOMING_CATEGORY_OPTIONS = [
  { value: "male_only", label: "رجال فقط" },
  { value: "female_only", label: "نساء فقط" },
  { value: "family", label: "عائلة" },
];
const ROOMING_BLOCK_WIDTH = 4;
const ROOMING_NODE_WIDTH = 250;
const ROOMING_NODE_MIN_HEIGHT = 170;
const ROOMING_NODE_MIN_GAP = 28;
const ROOMING_NODE_COLLISION_GAP = 0;
const PROGRAM_TYPE_OPTIONS = [
  { value: "عمرة", label: "عمرة" },
  { value: "حج", label: "حج" },
];

const getProgramDepartureYear = (program) => {
  const departure = String(program?.departure || "").trim();
  if (!departure) return null;
  const match = departure.match(/(\d{4})/);
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
};

const normalizeProgramType = (value) => {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "عمرة";
  if (text.includes("حج") || text.includes("hajj") || text.includes("hadj")) return "حج";
  if (text.includes("عمرة") || text.includes("umrah") || text.includes("omra") || text.includes("omrah")) return "عمرة";
  return "عمرة";
};

const normalizeRoomingText = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/[ـًٌٍَُِّْ]/g, "")
  .replace(/\s+/g, " ");

const normalizeRoomingHotel = (value) => normalizeRoomingText(value);

const normalizeRoomingGender = (value) => {
  const text = normalizeRoomingText(value);
  if (!text) return "";
  if (["male", "m", "man", "homme", "ذكر", "رجل", "رجال"].includes(text)) return "male";
  if (["female", "f", "woman", "femme", "أنثى", "انثى", "امرأة", "نساء"].includes(text)) return "female";
  return text;
};

const normalizeRoomingRoomType = (...values) => {
  for (const value of values) {
    const text = normalizeRoomingText(value);
    if (!text) continue;
    if (["single", "simple", "فردية", "فردي", "غرفة مفردة", "chambre simple", "single room"].includes(text)) return "single";
    if (["double", "twin", "ثنائية", "ثنائي", "غرفة ثنائية", "غرفة مزدوجة", "مزدوجة", "مزدوج", "chambre double", "double room"].includes(text)) return "double";
    if (["triple", "ثلاثية", "ثلاثي", "غرفة ثلاثية", "chambre triple", "triple room"].includes(text)) return "triple";
    if (["quad", "quadruple", "رباعية", "رباعي", "غرفة رباعية", "chambre quadruple", "quad room"].includes(text)) return "quad";
    if (["quint", "quintuple", "خماسية", "خماسي", "غرفة خماسية", "chambre quintuple", "quint room"].includes(text)) return "quint";
    const normalizedKey = getRoomTypeLabel(text) ? text : "";
    if (["single", "double", "triple", "quad", "quint"].includes(normalizedKey)) return normalizedKey;
  }
  return "";
};

const getColumnName = (index) => {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    name = String.fromCharCode(65 + r) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
};

const getCellName = (x, y) => `${getColumnName(x)}${y + 1}`;

const getCellCoords = (cell) => {
  const match = String(cell || "").match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  const x = match[1].split("").reduce((sum, ch) => sum * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  const y = Number(match[2]) - 1;
  return { x, y };
};

const getRangeBounds = (range = [0, 0, 0, 0]) => {
  const [x1 = 0, y1 = 0, x2 = x1, y2 = y1] = range.map(value => Number(value) || 0);
  return {
    minX: Math.min(x1, x2),
    maxX: Math.max(x1, x2),
    minY: Math.min(y1, y2),
    maxY: Math.max(y1, y2),
  };
};

const forEachCellInBounds = (bounds, callback) => {
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      callback(x, y, getCellName(x, y));
    }
  }
};

const ROOMING_BORDER = "2px solid #111827";
const ROOMING_FAMILY_KEYS = ["familyGroup", "familyId", "familyName", "groupId", "groupName"];

const getRoomingRoomLabel = (roomType) => {
  const key = normalizeRoomingRoomType(roomType) || roomType;
  return ROOMING_ROOM_OPTIONS.find((option) => option.value === key)?.label || getRoomTypeLabel(key) || "—";
};

const getRoomingCapacity = (roomType) => {
  const key = normalizeRoomingRoomType(roomType) || roomType;
  return ROOMING_ROOM_OPTIONS.find((option) => option.value === key)?.capacity || 1;
};

const getRoomingCategoryLabel = (category) => {
  return ROOMING_CATEGORY_OPTIONS.find((option) => option.value === category)?.label || "رجال فقط";
};

const getRoomingFamilyKey = (client) => {
  for (const key of ROOMING_FAMILY_KEYS) {
    const value = String(client?.[key] || "").trim();
    if (value) return value;
  }
  return "";
};

const normalizeRoomingMeta = (meta) => ({
  insertedClients: meta?.insertedClients || {},
  rooms: meta?.rooms || {},
  freeCanvas: meta?.freeCanvas !== false,
  createdAt: meta?.createdAt || new Date().toISOString(),
});

const getProgramHotelsForCity = (program, packages, city) => {
  const values = new Set();
  packages.forEach((pkg) => {
    const hotel = city === "makkah" ? pkg?.hotelMecca : pkg?.hotelMadina;
    if (String(hotel || "").trim()) values.add(String(hotel).trim());
  });
  const fallback = city === "makkah" ? program?.hotelMecca : program?.hotelMadina;
  if (String(fallback || "").trim()) values.add(String(fallback).trim());
  return Array.from(values);
};

const createRoomId = () => `room-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const getRoomBlockHeight = (capacity) => Math.max(1, Number(capacity) || 1) + 3;

const isCoordsInsideRoom = (room, x, y) => {
  if (!room) return false;
  const startX = Number(room.startX) || 0;
  const startY = Number(room.startY) || 0;
  const width = Number(room.width) || ROOMING_BLOCK_WIDTH;
  const height = Number(room.height) || getRoomBlockHeight(room.capacity);
  return x >= startX && x < startX + width && y >= startY && y < startY + height;
};

const inferRoomCategoryFromClients = (clients = []) => {
  const genders = new Set(clients.map((client) => client.gender).filter(Boolean));
  if (genders.size <= 1) {
    const only = Array.from(genders)[0];
    if (only === "female") return "female_only";
    return "male_only";
  }
  return "family";
};

const buildRoomingGroupsFromClients = (clients, city) => {
  const grouped = new Map();
  clients.forEach((client) => {
    const key = client.roomingGroupId || `single:${client.id}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(client);
  });
  return Array.from(grouped.values()).map((groupClients, index) => {
    const first = groupClients[0] || {};
    const roomType = first.roomType || (groupClients.length >= 5 ? "quint" : groupClients.length === 4 ? "quad" : groupClients.length === 3 ? "triple" : groupClients.length === 2 ? "double" : "single");
    const capacity = Math.max(getRoomingCapacity(roomType), groupClients.length || 1);
    const hotel = city === "makkah" ? (first.hotelMecca || "") : (first.hotelMadina || "");
    return {
      id: createRoomId(),
      city,
      roomNumber: String(index + 1).padStart(2, "0"),
      roomType,
      category: first.roomCategory || inferRoomCategoryFromClients(groupClients),
      hotel,
      capacity,
      height: getRoomBlockHeight(capacity),
      width: ROOMING_BLOCK_WIDTH,
      occupantIds: groupClients.map((client) => client.id),
      roomingGroupId: first.roomingGroupId || "",
      roomingGroupName: first.roomingGroupName || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
};

const getRoomingCategoryAccent = (category) => {
  if (category === "female_only") return { border: "#db2777", bg: "#fdf2f8", text: "#9d174d" };
  if (category === "family") return { border: "#16a34a", bg: "#f0fdf4", text: "#166534" };
  return { border: "#2563eb", bg: "#eff6ff", text: "#1d4ed8" };
};

const autoLayoutRoomNodes = (rooms = []) => {
  const sorted = rooms.slice().sort((a, b) => {
    const hotel = String(a.hotel || "").localeCompare(String(b.hotel || ""), "ar");
    if (hotel) return hotel;
    const type = String(a.roomType || "").localeCompare(String(b.roomType || ""), "ar");
    if (type) return type;
    const category = String(a.category || "").localeCompare(String(b.category || ""), "ar");
    if (category) return category;
    return (a.order || 0) - (b.order || 0);
  });
  const sectionOffsets = new Map();
  let currentHotel = "";
  let sectionIndex = -1;
  return sorted.map((room, index) => {
    const hotel = room.hotel || "فندق غير محدد";
    if (hotel !== currentHotel) {
      currentHotel = hotel;
      sectionIndex += 1;
      sectionOffsets.set(hotel, 0);
    }
    const localIndex = sectionOffsets.get(hotel) || 0;
    sectionOffsets.set(hotel, localIndex + 1);
    return {
      ...room,
      order: room.order ?? index,
      x: sectionIndex * 360,
      y: 90 + localIndex * 210,
    };
  });
};

const getRoomingNodeRect = (node, position = node?.position || {}) => {
  const width = Number(node?.measured?.width || node?.width || ROOMING_NODE_WIDTH);
  const capacity = Number(node?.data?.room?.capacity || node?.data?.room?.occupantIds?.length || 2);
  const fallbackHeight = Math.max(ROOMING_NODE_MIN_HEIGHT, 134 + (Math.max(1, capacity) * 24));
  const height = Number(node?.measured?.height || node?.height || fallbackHeight);
  return {
    x: Number(position.x) || 0,
    y: Number(position.y) || 0,
    width,
    height,
  };
};

const doRoomingRectsOverlap = (a, b, gap = ROOMING_NODE_COLLISION_GAP) => {
  return a.x < b.x + b.width + gap
    && a.x + a.width + gap > b.x
    && a.y < b.y + b.height + gap
    && a.y + a.height + gap > b.y;
};

const hasRoomingNodeCollision = (node, nodes, position = node?.position) => {
  if (!node) return false;
  const rect = getRoomingNodeRect(node, position);
  return nodes.some((other) => {
    if (!other || other.id === node.id) return false;
    return doRoomingRectsOverlap(rect, getRoomingNodeRect(other));
  });
};

const findNearestFreeRoomingPosition = (node, nodes, preferredPosition) => {
  if (!node) return preferredPosition || { x: 0, y: 0 };
  const origin = preferredPosition || node.position || { x: 0, y: 0 };
  if (!hasRoomingNodeCollision(node, nodes, origin)) return origin;
  const rect = getRoomingNodeRect(node, origin);
  const stepX = rect.width + ROOMING_NODE_MIN_GAP;
  const stepY = rect.height + ROOMING_NODE_MIN_GAP;
  const candidates = [];
  for (let ring = 1; ring <= 8; ring += 1) {
    for (let dx = -ring; dx <= ring; dx += 1) {
      for (let dy = -ring; dy <= ring; dy += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        candidates.push({
          x: Math.max(0, origin.x + (dx * stepX)),
          y: Math.max(0, origin.y + (dy * stepY)),
        });
      }
    }
  }
  candidates.sort((a, b) => {
    const da = Math.hypot(a.x - origin.x, a.y - origin.y);
    const db = Math.hypot(b.x - origin.x, b.y - origin.y);
    return da - db;
  });
  return candidates.find((candidate) => !hasRoomingNodeCollision(node, nodes, candidate)) || origin;
};

const cropSheetPayload = (payload, range) => {
  if (!payload || !range) return payload;
  const bounds = getRangeBounds(range);
  const data = [];
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    data.push((payload.data?.[y] || []).slice(bounds.minX, bounds.maxX + 1));
  }
  const style = {};
  Object.entries(payload.style || {}).forEach(([cell, value]) => {
    const coords = getCellCoords(cell);
    if (!coords) return;
    if (coords.x < bounds.minX || coords.x > bounds.maxX || coords.y < bounds.minY || coords.y > bounds.maxY) return;
    style[getCellName(coords.x - bounds.minX, coords.y - bounds.minY)] = value;
  });
  const mergeCells = {};
  Object.entries(payload.mergeCells || {}).forEach(([cell, spans]) => {
    const coords = getCellCoords(cell);
    if (!coords) return;
    if (coords.x < bounds.minX || coords.x > bounds.maxX || coords.y < bounds.minY || coords.y > bounds.maxY) return;
    const maxColspan = bounds.maxX - coords.x + 1;
    const maxRowspan = bounds.maxY - coords.y + 1;
    mergeCells[getCellName(coords.x - bounds.minX, coords.y - bounds.minY)] = [
      Math.min(spans?.[0] || 1, maxColspan),
      Math.min(spans?.[1] || 1, maxRowspan),
    ];
  });
  return { ...payload, data, style, mergeCells };
};

const createBlankSheetData = (rows = ROOMING_ROWS, cols = ROOMING_COLS) =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => ""));

const normalizeSheetData = (data, rows = ROOMING_ROWS, cols = ROOMING_COLS) => {
  const source = Array.isArray(data) ? data : [];
  const targetRows = Math.max(rows, source.length || 0);
  const targetCols = Math.max(cols, ...source.map(row => Array.isArray(row) ? row.length : 0), 0);
  return Array.from({ length: targetRows }, (_, y) =>
    Array.from({ length: targetCols }, (_, x) => source[y]?.[x] ?? "")
  );
};

const getClientDisplayName = (client) => resolveClientDisplayName(client, trKey("pilgrimFallback") || "معتمر");
const getClientRegistrationSource = (client = {}) => pickFirstText(client, [
  "registrationSource",
  "registration_source",
  "sourceRegistration",
  "source",
]);

const slugifyFilePart = (value) => String(value || "program")
  .replace(/\s+/g, "-")
  .replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, "")
  .slice(0, 80);

const CONTRACT_EXPORT_HEADERS = [
  "nom complet",
  "N de pass",
  "N CIN",
  "hotel a medine",
  "entree hotel med",
  "sortie hotel med",
  "hotel a la mecque",
  "entree hotel mec",
  "sortie hotel mec",
  "type de chambre",
  "adress",
  "compagnie",
  "depart",
  "retour",
];

const pickFirstText = (source, keys = []) => {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const toIsoDateString = (value) => {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return "";
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return "";
};

const safeCellValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value.trim();
  if (typeof value === "boolean") return value ? "true" : "false";
  return "";
};

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const parseStyleValue = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  return String(value)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const [prop, ...rest] = part.split(":");
      if (!prop || !rest.length) return acc;
      acc[prop.trim()] = rest.join(":").trim();
      return acc;
    }, {});
};

const createRoomingHeaderSheet = ({ program, clients, city, agency }) => {
  const data = createBlankSheetData();
  const cityName = city === "makkah" ? "مكة" : "المدينة";
  const hotel = city === "makkah" ? program.hotelMecca : program.hotelMadina;
  const style = {
    A1: "background-color:#0f172a;color:#d4af37;font-weight:bold;font-size:18px;text-align:center;",
    A2: "background-color:#111827;color:#f8fafc;font-weight:bold;text-align:center;",
    A3: "background-color:#1f2937;color:#e5e7eb;text-align:center;",
    E3: "background-color:#1f2937;color:#e5e7eb;text-align:center;",
    I3: "background-color:#1f2937;color:#e5e7eb;text-align:center;",
    M3: "background-color:#1f2937;color:#e5e7eb;text-align:center;",
    A4: "background-color:#1f2937;color:#e5e7eb;text-align:center;",
    E4: "background-color:#1f2937;color:#e5e7eb;text-align:center;",
    I4: "background-color:#1f2937;color:#e5e7eb;text-align:center;",
    M4: "background-color:#1f2937;color:#e5e7eb;text-align:center;",
  };
  const mergeCells = {
    A1: [16, 1],
    A2: [16, 1],
    A3: [4, 1],
    E3: [4, 1],
    I3: [4, 1],
    M3: [4, 1],
    A4: [4, 1],
    E4: [4, 1],
    I4: [4, 1],
    M4: [4, 1],
  };
  data[0][0] = `ورقة التسكين - ${cityName}`;
  data[1][0] = program.name || "";
  data[2][0] = `تاريخ الذهاب: ${program.departure || "—"}`;
  data[2][4] = `تاريخ الرجوع: ${program.returnDate || "—"}`;
  data[2][8] = `عدد المعتمرين: ${clients.length}`;
  data[2][12] = `المقاعد: ${program.seats || "—"}`;
  data[3][0] = `الفندق: ${hotel || "—"}`;
  data[3][4] = `الوكالة: ${agency?.nameAr || agency?.nameFr || "—"}`;
  data[3][8] = "ملاحظات:";
  data[3][12] = "";

  return {
    version: 2,
    data,
    style,
    mergeCells,
    meta: normalizeRoomingMeta({}),
  };
};

const writeRoomBlock = (sheet, startX, startY, roomNo = "") => {
  if (!sheet) return;
  const x = Math.max(0, Number(startX) || 0);
  const y = Math.max(0, Number(startY) || 0);
  const data = normalizeSheetData(sheet.getData?.(false, false));
  const rowCount = data.length;
  const colCount = data[0]?.length || ROOMING_COLS;
  if (x + 2 >= colCount) {
    try { sheet.insertColumn(x + 3 - colCount); } catch {}
  }
  if (y + 5 >= rowCount) {
    try { sheet.insertRow(y + 6 - rowCount); } catch {}
  }
  const titleCell = getCellName(x, y);
  try { sheet.setMerge(titleCell, 3, 1); } catch {}
  sheet.setValueFromCoords(x, y, roomNo ? `غرفة ${roomNo}` : "غرفة", true);
  sheet.setValueFromCoords(x, y + 1, "المستوى", true);
  sheet.setValueFromCoords(x + 1, y + 1, "نوع الغرفة", true);
  sheet.setValueFromCoords(x + 2, y + 1, "ملاحظات", true);
  for (let row = y + 2; row <= y + 5; row += 1) {
    sheet.setValueFromCoords(x, row, "", true);
    sheet.setValueFromCoords(x + 1, row, "", true);
    sheet.setValueFromCoords(x + 2, row, "", true);
  }
  sheet.setStyle(titleCell, "background-color", "#d4af37", true);
  sheet.setStyle(titleCell, "color", "#111827", true);
  sheet.setStyle(titleCell, "font-weight", "700", true);
  sheet.setStyle(titleCell, "text-align", "center", true);
  for (let col = x; col < x + 3; col += 1) {
    const header = getCellName(col, y + 1);
    sheet.setStyle(header, "background-color", "#334155", true);
    sheet.setStyle(header, "color", "#f8fafc", true);
    sheet.setStyle(header, "font-weight", "700", true);
    sheet.setStyle(header, "text-align", "center", true);
    for (let row = y + 2; row <= y + 5; row += 1) {
      const cell = getCellName(col, row);
      sheet.setStyle(cell, "background-color", "#111827", true);
      sheet.setStyle(cell, "color", "#e5e7eb", true);
    }
  }
};

const clearRoomBlockMerges = (sheet, room) => {
  if (!sheet || !room) return;
  const height = Number(room.height) || getRoomBlockHeight(room.capacity);
  for (let offsetY = 0; offsetY < height; offsetY += 1) {
    try { sheet.removeMerge(getCellName(room.startX, room.startY + offsetY)); } catch {}
  }
};

const renderStructuredRoomBlock = (sheet, room, clientsById = {}) => {
  if (!sheet || !room) return;
  const startX = Math.max(0, Number(room.startX) || 0);
  const startY = Math.max(0, Number(room.startY) || 0);
  const width = Number(room.width) || ROOMING_BLOCK_WIDTH;
  const capacity = Math.max(1, Number(room.capacity) || getRoomingCapacity(room.roomType));
  const height = Number(room.height) || getRoomBlockHeight(capacity);
  const data = normalizeSheetData(sheet.getData?.(false, false));
  const rowCount = data.length;
  const colCount = data[0]?.length || ROOMING_COLS;
  if (startX + width >= colCount) {
    try { sheet.insertColumn(startX + width - colCount + 1); } catch {}
  }
  if (startY + height >= rowCount) {
    try { sheet.insertRow(startY + height - rowCount + 1); } catch {}
  }

  clearRoomBlockMerges(sheet, room);

  for (let y = startY; y < startY + height; y += 1) {
    for (let x = startX; x < startX + width; x += 1) {
      const cell = getCellName(x, y);
      sheet.setValueFromCoords(x, y, "", true);
      [
        "background-color",
        "color",
        "font-weight",
        "font-style",
        "text-align",
        "font-size",
        "white-space",
        "overflow-wrap",
        "word-break",
        "border-top",
        "border-right",
        "border-bottom",
        "border-left",
      ].forEach((prop) => sheet.setStyle(cell, prop, "", true));
    }
  }

  const titleCell = getCellName(startX, startY);
  const hotelCell = getCellName(startX, startY + 1);
  const actionCell = getCellName(startX, startY + height - 1);

  try { sheet.setMerge(titleCell, width, 1); } catch {}
  try { sheet.setMerge(hotelCell, width, 1); } catch {}
  try { sheet.setMerge(actionCell, width, 1); } catch {}

  const occupants = Array.isArray(room.occupantIds) ? room.occupantIds : [];
  const roomTitle = `غرفة ${room.roomNumber || "—"} — ${getRoomingRoomLabel(room.roomType)} — ${getRoomingCategoryLabel(room.category)} — ${occupants.length}/${capacity}`;
  sheet.setValueFromCoords(startX, startY, roomTitle, true);
  sheet.setValueFromCoords(startX, startY + 1, `الفندق: ${room.hotel || "—"}`, true);
  sheet.setValueFromCoords(startX, startY + height - 1, "إضافة معتمر • تعديل الغرفة • حذف الغرفة", true);

  for (let slot = 0; slot < capacity; slot += 1) {
    const rowY = startY + 2 + slot;
    const rowCell = getCellName(startX, rowY);
    try { sheet.setMerge(rowCell, width, 1); } catch {}
    const occupantId = occupants[slot];
    const occupant = occupantId ? clientsById[occupantId] : null;
    sheet.setValueFromCoords(
      startX,
      rowY,
      occupant ? `${getClientDisplayName(occupant)}` : "مكان شاغر",
      true
    );
  }

  const applyBlockStyle = (rowY, styles) => {
    for (let x = startX; x < startX + width; x += 1) {
      const cell = getCellName(x, rowY);
      Object.entries(styles).forEach(([prop, value]) => sheet.setStyle(cell, prop, value, true));
      sheet.setStyle(cell, "border-top", ROOMING_BORDER, true);
      sheet.setStyle(cell, "border-right", ROOMING_BORDER, true);
      sheet.setStyle(cell, "border-bottom", ROOMING_BORDER, true);
      sheet.setStyle(cell, "border-left", ROOMING_BORDER, true);
    }
  };

  applyBlockStyle(startY, {
    "background-color": "#0f172a",
    color: "#f8fafc",
    "font-weight": "700",
    "text-align": "center",
    "font-size": "13px",
  });
  applyBlockStyle(startY + 1, {
    "background-color": "#f8fafc",
    color: "#334155",
    "font-weight": "700",
    "text-align": "right",
  });
  for (let slot = 0; slot < capacity; slot += 1) {
    applyBlockStyle(startY + 2 + slot, {
      "background-color": occupants[slot] ? "#ecfeff" : "#ffffff",
      color: "#0f172a",
      "font-weight": occupants[slot] ? "700" : "500",
      "text-align": "right",
      "white-space": "pre-wrap",
    });
  }
  applyBlockStyle(startY + height - 1, {
    "background-color": "#eff6ff",
    color: "#1d4ed8",
    "font-weight": "700",
    "text-align": "center",
    "font-size": "12px",
  });
};

// ═══════════════════════════════════════
// PROGRAMS LIST PAGE
// ═══════════════════════════════════════
export default function ProgramsPage({ store, onToast }) {
  const { programs, clients, addProgram, updateProgram, deleteProgram,
          getClientTotalPaid, getClientStatus } = store;
  const { t, lang, dir } = useLang();
  const isRTL = dir === "rtl";
  const tr = React.useCallback((key, vars = {}) => {
    const template = t?.[key] ?? key;
    if (typeof template === "function") return template(vars);
    return Object.entries(vars).reduce((text, [name, value]) => (
      String(text).replaceAll(`{${name}}`, String(value ?? ""))
    ), String(template));
  }, [t]);
  const formatCurrencyForLang = React.useCallback(
    (value) => formatCurrency(value, lang),
    [lang]
  );

  const [showForm,      setShowForm]      = React.useState(false);
  const [editing,       setEditing]       = React.useState(null);
  const [activeProgram, setActiveProgram] = React.useState(null);
  const [search,        setSearch]        = React.useState("");
  const currentYear = React.useMemo(() => new Date().getFullYear(), []);
  const nextYear = currentYear + 1;
  const [selectedYear, setSelectedYear] = React.useState(String(currentYear));
  const [yearMenuOpen, setYearMenuOpen] = React.useState(false);
  const [hoveredYearOption, setHoveredYearOption] = React.useState(null);
  const [deletePrompt,  setDeletePrompt]  = React.useState(null);
  const yearMenuRef = React.useRef(null);
  const yearButtonRef = React.useRef(null);

  const searchPlaceholder = React.useMemo(() => {
    if (lang === "fr") return "Rechercher un programme...";
    if (lang === "en") return "Search program name...";
    return "ابحث عن اسم البرنامج...";
  }, [lang]);

  const yearLabel = React.useMemo(() => {
    if (lang === "fr") return "Année";
    if (lang === "en") return "Year";
    return "السنة";
  }, [lang]);

  const allYearsLabel = React.useMemo(() => {
    if (lang === "fr") return "Toutes les années";
    if (lang === "en") return "All years";
    return "كل السنوات";
  }, [lang]);

  const yearOptions = React.useMemo(() => ([
    { value: "all", label: allYearsLabel },
    { value: String(currentYear), label: String(currentYear) },
    { value: String(nextYear), label: String(nextYear) },
  ]), [allYearsLabel, currentYear, nextYear]);

  const selectedYearOption = React.useMemo(
    () => yearOptions.find((option) => option.value === selectedYear) || yearOptions[0],
    [yearOptions, selectedYear]
  );

  const filteredPrograms = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return programs.filter((program) => {
      const matchesSearch = !q || (program.name || "").toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (selectedYear === "all") return true;
      const departureYear = getProgramDepartureYear(program);
      return departureYear === Number(selectedYear);
    });
  }, [programs, search, selectedYear]);

  const openProgramDetail = React.useCallback((programId) => {
    setActiveProgram(programId);
    if (typeof window === "undefined") return;
    const nextState = {
      ...(window.history.state || {}),
      page: "programs",
      programId,
    };
    window.history.pushState(nextState, "", window.location.href);
  }, []);

  const closeProgramDetail = React.useCallback((useHistory = true) => {
    if (!activeProgram) return;
    if (
      useHistory
      && typeof window !== "undefined"
      && window.history.state?.page === "programs"
      && window.history.state?.programId
    ) {
      window.history.back();
      return;
    }
    setActiveProgram(null);
  }, [activeProgram]);

  React.useEffect(() => {
    const syncProgramFromHistory = (state) => {
      if (state?.page !== "programs") return;
      setActiveProgram(state?.programId || null);
    };
    syncProgramFromHistory(typeof window !== "undefined" ? window.history.state : null);
    const handlePopState = (event) => {
      syncProgramFromHistory(event.state);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  React.useEffect(() => {
    if (!yearMenuOpen) return;
    const handlePointerDown = (event) => {
      const menuNode = yearMenuRef.current;
      const buttonNode = yearButtonRef.current;
      if (menuNode?.contains(event.target) || buttonNode?.contains(event.target)) return;
      setYearMenuOpen(false);
      setHoveredYearOption(null);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [yearMenuOpen]);

  const handleConfirmDeleteProgram = React.useCallback(() => {
    if (!deletePrompt) return;
    deleteProgram(deletePrompt.program.id);
    if (activeProgram === deletePrompt.program.id) setActiveProgram(null);
    setDeletePrompt(null);
    onToast(t.deleteSuccess, "info");
  }, [deletePrompt, deleteProgram, activeProgram, setActiveProgram, onToast, t.deleteSuccess]);

  if (activeProgram) {
    const prog = programs.find(p => p.id === activeProgram);
    if (!prog) { setActiveProgram(null); return null; }
    return (
      <ProgramInner
        program={prog} store={store} onToast={onToast}
        onBack={() => closeProgramDetail(true)}
      />
    );
  }

  return (
    <div className="page-body programs-page" style={{ padding:"28px 32px" }}>
      <div className="page-header" style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, flexWrap:"wrap" }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:tc.white }}>{t.availablePrograms}</h1>
            <p style={{ fontSize:13, color:tc.grey, marginTop:4 }}>
              {t.programsSubtitle || `${programs.length} programmes disponibles`}
            </p>
          </div>
          <Button variant="primary" icon="plus" onClick={() => setShowForm(true)}>{t.addProgram}</Button>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"stretch", flexWrap:"wrap" }}>
          <SearchBar
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            style={{ flex:"1 1 360px", minWidth:280, maxWidth:420 }}
            disabled={!programs.length}
          />
          <div style={{ position:"relative", flex:"0 0 198px", minWidth:180, maxWidth:220 }}>
            <button
              ref={yearButtonRef}
              type="button"
              aria-label={yearLabel}
              aria-haspopup="listbox"
              aria-expanded={yearMenuOpen}
              disabled={!programs.length}
              onClick={() => programs.length && setYearMenuOpen((open) => !open)}
              style={{
                width:"100%",
                height:46,
                background:"var(--rukn-bg-input)",
                border:"1px solid var(--rukn-border)",
                borderRadius:12,
                padding: isRTL ? "12px 20px 12px 88px" : "12px 88px 12px 20px",
                color:"var(--rukn-text)",
                fontSize:14,
                fontWeight:500,
                fontFamily:"'Cairo',sans-serif",
                direction: dir,
                outline:"none",
                transition:"border-color .2s, box-shadow .2s",
                opacity: programs.length ? 1 : 0.55,
                cursor: programs.length ? "pointer" : "not-allowed",
                display:"flex",
                alignItems:"center",
                justifyContent: isRTL ? "flex-end" : "flex-start",
                textAlign: isRTL ? "right" : "left",
              }}
            >
              <span>{selectedYearOption?.label}</span>
            </button>
            <span style={{
              position:"absolute",
              top:"50%",
              transform:"translateY(-50%)",
              insetInlineEnd:34,
              color:"rgba(212,175,55,.72)",
              fontSize:12,
              fontWeight:700,
              pointerEvents:"none",
              whiteSpace:"nowrap",
            }}>
              {yearLabel}
            </span>
            <span style={{
              position:"absolute",
              top:"50%",
              transform:"translateY(-50%) rotate(-90deg)",
              insetInlineEnd:14,
              color:"rgba(212,175,55,.72)",
              fontSize:13,
              fontWeight:700,
              pointerEvents:"none",
              lineHeight:1,
            }}>
              ‹
            </span>
            {yearMenuOpen ? (
              <div
                ref={yearMenuRef}
                role="listbox"
                aria-label={yearLabel}
                style={{
                  position:"absolute",
                  top:"calc(100% + 8px)",
                  insetInlineStart:0,
                  width:"100%",
                  background:"var(--rukn-bg-select)",
                  border:"1px solid var(--rukn-border-soft)",
                  borderRadius:14,
                  boxShadow:"var(--rukn-shadow-card)",
                  overflow:"hidden",
                  zIndex:30,
                  backdropFilter:"blur(12px)",
                }}
              >
                {yearOptions.map((option) => {
                  const active = option.value === selectedYear;
                  const hovered = hoveredYearOption === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setHoveredYearOption(option.value)}
                      onMouseLeave={() => setHoveredYearOption((current) => current === option.value ? null : current)}
                      onClick={() => {
                        setSelectedYear(option.value);
                        setYearMenuOpen(false);
                        setHoveredYearOption(null);
                      }}
                      style={{
                        width:"100%",
                        border:"none",
                        background: active
                          ? "var(--rukn-gold-dim)"
                          : hovered
                            ? "var(--rukn-row-hover)"
                            : "transparent",
                        color: active ? "var(--rukn-gold)" : "var(--rukn-text-strong)",
                        padding:"12px 14px",
                        fontSize:14,
                        fontWeight:active ? 700 : 500,
                        fontFamily:"'Cairo',sans-serif",
                        textAlign:isRTL ? "right" : "left",
                        direction:dir,
                        cursor:"pointer",
                        transition:"background-color .16s ease, color .16s ease",
                        borderBottom: option.value !== yearOptions[yearOptions.length - 1].value
                          ? "1px solid var(--rukn-border-soft)"
                          : "none",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {programs.length === 0 ? (
        <EmptyState icon="program" title={t.noProgramsTitle} sub={t.noProgramsSub} />
      ) : !filteredPrograms.length ? (
        <EmptyState icon="search" title={t.noResultsTitle} sub={t.noResultsSub} />
      ) : (
        <div>
          <div className="cards-grid program-card-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:20 }}>
            {filteredPrograms.map((p, i) => {
              const pc  = clients.filter(c => c.programId === p.id);
              const reg = pc.length;
              const pct = Math.min((reg / p.seats) * 100, 100);
            const rev = pc.reduce((s,c) => s + (c.salePrice || c.price || 0), 0);
            const paid= pc.reduce((s,c) => s + getClientTotalPaid(c.id), 0);
            const cl  = pc.filter(c => getClientStatus(c) === "cleared").length;
            const un  = pc.filter(c => getClientStatus(c) === "unpaid").length;
            return (
              <ProgramCard key={p.id} program={p}
                registered={reg} pct={pct}
                totalPaid={paid} totalRemaining={rev-paid}
                cleared={cl} unpaid={un} delay={i*.06}
                onClick={() => openProgramDetail(p.id)}
                onEdit={e => { e.stopPropagation(); setEditing(p); }}
                onDelete={e => {
                  e.stopPropagation();
                  setDeletePrompt({ program: p, clients: pc });
                }}
                lang={lang}
                formatCurrencyForLang={formatCurrencyForLang}
              />
            );
            })}
          </div>
        </div>
      )}

      <Modal open={showForm||!!editing} onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? t.editProgramTitle : t.addProgramTitle} width={620}>
        <ProgramForm program={editing} store={store}
          onSave={() => {
            setShowForm(false);
            setEditing(null);
            onToast(editing ? t.updateSuccess : t.addSuccess, "success");
          }}
          onCancel={() => { setShowForm(false); setEditing(null); }} />
      </Modal>
      <Modal
        open={!!deletePrompt}
        onClose={() => setDeletePrompt(null)}
        title={t.programTrashTitle}
        width={520}
      >
        {deletePrompt && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <p style={{ fontSize:14, color:tc.white }}>
              {tr("programTrashMessage", { name: deletePrompt.program.name })}
            </p>
            {deletePrompt.clients.length > 0 && (
              <GlassCard style={{ padding:12, background:"rgba(239,68,68,.08)", borderColor:"rgba(239,68,68,.3)" }}>
                <p style={{ margin:0, fontSize:13, color:tc.danger }}>
                  {tr("programTrashClientsWarning", { count: deletePrompt.clients.length })}
                </p>
              </GlassCard>
            )}
            <div style={{ display:"flex", justifyContent:"flex-end", gap:12 }}>
              <Button variant="ghost" onClick={() => setDeletePrompt(null)}>
                {t.cancel}
              </Button>
              <Button variant="danger" onClick={handleConfirmDeleteProgram}>
                {t.programTrashConfirm || t.delete}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════
// PROGRAM CARD
// ═══════════════════════════════════════
function ProgramCard({ program, registered, pct, totalPaid, totalRemaining,
  cleared, unpaid, delay, onClick, onEdit, onDelete, lang, formatCurrencyForLang }) {
  const [hov, setHov] = React.useState(false);
  const { t } = useLang();
  const packages = normalizeProgramPackages(program);
  const packageCount = getProgramPackageCount(program);
  const startingPriceValue = getProgramStartingPrice(program);
  const startingPrice = startingPriceValue ? formatCurrencyForLang(startingPriceValue) : "—";
  const packageLabel = `${packageCount} ${packageCount === 1 ? (t.level || "مستوى") : (t.levels || "مستويات")}`;
  const hotelSummary = packageCount > 1 ? (t.multipleHotelsByLevel || "عدة فنادق حسب المستوى") : "";
  const remainingLabel = formatCurrencyForLang(totalRemaining);
  const infoRows = [
    ["hotel", t.hotelMecca, hotelSummary || packages[0]?.hotelMecca || program.hotelMecca],
    ["building", t.hotelMadina, hotelSummary || packages[0]?.hotelMadina || program.hotelMadina],
    ["plane", t.departure, program.departure],
    ["planeLanding", t.returnDate, program.returnDate],
  ];
  const miniStats = [
    { label: t.registered, value: registered, color: tc.gold },
    { label: t.cleared, value: cleared, color: tc.greenLight },
    { label: t.unpaid, value: unpaid, color: tc.danger },
  ];

  return (
    <div className="animate-fadeInUp" style={{ animationDelay:`${delay}s`, cursor:"pointer" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onClick}>
      <GlassCard gold style={{
        padding:22,
        transform: hov ? "translateY(-5px)" : "none",
        transition:"all .3s ease",
        boxShadow: hov ? "var(--rukn-shadow-card-hover)" : "var(--rukn-shadow-card)",
        border:`1px solid ${hov?"rgba(212,175,55,.45)":"rgba(212,175,55,.2)"}`,
      }}>
        {/* header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:16, fontWeight:800, color:tc.white, marginBottom:6, lineHeight:1.3 }}>{program.name}</p>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, color:tc.gold, background:"rgba(212,175,55,.12)", padding:"2px 10px", borderRadius:20 }}>{translateProgramType(program.type, lang)}</span>
              <span style={{ fontSize:11, color:tc.grey, background:"rgba(148,163,184,.1)", padding:"2px 10px", borderRadius:20 }}>{program.duration}</span>
              <span style={{ fontSize:11, color:tc.greenLight, background:"rgba(34,197,94,.1)", padding:"2px 10px", borderRadius:20 }}>{packageLabel}</span>
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }} onClick={e=>e.stopPropagation()}>
            <SmallBtn icon="edit" onClick={onEdit}   color={tc.gold} />
            <SmallBtn icon="trash" onClick={onDelete} color={tc.danger} />
          </div>
        </div>

        {/* hotel + dates */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
          {infoRows.map(([ic,lb,vl])=>(
            <div key={lb}>
              <p style={{ fontSize:10, color:tc.grey, display:"inline-flex", alignItems:"center", gap:5 }}>
                <AppIcon name={ic} size={13} color={tc.gold} /> {lb}
              </p>
              <p style={{ fontSize:12, fontWeight:600, color:tc.white }}>{vl||"—"}</p>
            </div>
          ))}
        </div>

        {/* mini stats */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:14,
          background:"var(--rukn-section-bg)", border:"1px solid var(--rukn-section-border)", borderRadius:10, padding:"10px" }}>
          {miniStats.map(({ label, value, color })=>(
            <div key={label} style={{ textAlign:"center" }}>
              <p style={{ fontSize:16, fontWeight:800, color, fontFamily:"'Amiri',serif" }}>{value}</p>
              <p style={{ fontSize:10, color:tc.grey }}>{label}</p>
            </div>
          ))}
        </div>

        {/* seats progress */}
          <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:12 }}>
            <span style={{ color:tc.grey }}>{t.seatFill}</span>
            <span style={{ color:pct>80?tc.danger:tc.gold, fontWeight:700 }}>{registered}/{program.seats}</span>
          </div>
          <div style={{ height:5, background:"var(--rukn-border-soft)", borderRadius:3, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${pct}%`, borderRadius:3, transition:"width 1.2s",
              background:pct>=100?"linear-gradient(90deg,#ef4444,#dc2626)":pct>70?"linear-gradient(90deg,#f59e0b,#d97706)":"linear-gradient(90deg,#22c55e,#d4af37)" }} />
          </div>
        </div>

        {/* footer */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          paddingTop:12, borderTop:"1px solid rgba(212,175,55,.12)" }}>
          <div>
            <p style={{ fontSize:11, color:tc.grey, marginBottom:2 }}>{t.priceFrom}</p>
            <p style={{ fontSize:18, fontWeight:900, color:tc.gold, fontFamily:"'Amiri',serif" }}>
              {startingPrice}
            </p>
          </div>
          <div style={{ textAlign:"center" }}>
            <p style={{ fontSize:11, color:tc.grey, marginBottom:2 }}>{t.remainingToCollect}</p>
            <p style={{ fontSize:14, fontWeight:700, color:totalRemaining>0?tc.warning:tc.greenLight }}>
              {remainingLabel}
            </p>
          </div>
          <div style={{ background:"rgba(212,175,55,.1)", border:"1px solid rgba(212,175,55,.25)",
            borderRadius:8, padding:"7px 14px", fontSize:12, color:tc.gold, fontWeight:700 }}>
            {t.viewList}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function PackageDetailCard({ pkg, formatCurrencyForLang, t }) {
  const start = getPackageStartingPrice(pkg);
  return (
    <div style={{
      border:"1px solid rgba(212,175,55,.18)",
      background:"rgba(0,0,0,.16)",
      borderRadius:12,
      padding:12,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"flex-start", flexWrap:"wrap", marginBottom:10 }}>
        <div>
          <strong style={{ color:tc.white, fontSize:14 }}>{translateHotelLevel(pkg.level) || pkg.level}</strong>
          <p style={{ color:tc.grey, fontSize:11, marginTop:3 }}>
            {pkg.mealPlan || t.noMealPlan || "بدون نظام وجبات محدد"}
          </p>
        </div>
        <span style={{
          color:tc.gold,
          background:"rgba(212,175,55,.08)",
          border:"1px solid rgba(212,175,55,.16)",
          borderRadius:999,
          padding:"4px 10px",
          fontSize:12,
          fontWeight:800,
        }}>
          {start ? ((t.fromPrice || "ابتداءً من {price}").replace("{price}", formatCurrencyForLang(start))) : (t.noPrice || "بدون سعر")}
        </span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:8, marginBottom:10 }}>
        <p style={{ fontSize:11, color:tc.grey }}>{t.hotelMecca}: <span style={{ color:tc.white }}>{pkg.hotelMecca || "—"}</span></p>
        <p style={{ fontSize:11, color:tc.grey }}>{t.hotelMadina}: <span style={{ color:tc.white }}>{pkg.hotelMadina || "—"}</span></p>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {PROGRAM_ROOM_PRICE_KEYS.map(key => (
          <span key={key} style={{
            border:"1px solid rgba(212,175,55,.14)",
            background:"rgba(212,175,55,.06)",
            borderRadius:999,
            padding:"4px 9px",
            color:pkg.prices?.[key] ? tc.gold : tc.grey,
            fontSize:11,
            fontWeight:700,
          }}>
            {translateRoomType(key)}: {pkg.prices?.[key] ? formatCurrencyForLang(pkg.prices[key]) : "—"}
          </span>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// PROGRAM INNER — full client list
// ═══════════════════════════════════════
function ProgramInner({ program, store, onToast, onBack }) {
  const {
    clients,
    getClientTotalPaid,
    getClientStatus,
    agency,
    programs: allPrograms,
    activeClients = [],
    transferClients,
  } = store;
  const { t, lang } = useLang();
  const tr = React.useCallback((key, vars = {}) => {
    const template = t?.[key] ?? key;
    if (typeof template === "function") return template(vars);
    return Object.entries(vars).reduce((text, [name, value]) => (
      String(text).replaceAll(`{${name}}`, String(value ?? ""))
    ), String(template));
  }, [t]);
  const formatCurrencyForLang = React.useCallback((value) => formatCurrency(value, lang), [lang]);

  const [filter,         setFilter]         = React.useState("all");
  const [search,         setSearch]         = React.useState("");
  const [selectedClient, setSelectedClient] = React.useState(null);
  const [showAddClient,  setShowAddClient]  = React.useState(false);
  const [showPassportImport, setShowPassportImport] = React.useState(false);
  const [editingClient,  setEditingClient]  = React.useState(null);
  const [selectMode,     setSelectMode]     = React.useState(false);
  const [checkedIds,     setCheckedIds]     = React.useState(new Set());
  const [transferTargets, setTransferTargets] = React.useState([]);
  const [transferSheetOpen, setTransferSheetOpen] = React.useState(false);
  const [packageFilter, setPackageFilter] = React.useState("all");
  const [programTab, setProgramTab] = React.useState("clients");
  const [statusFilterOpen, setStatusFilterOpen] = React.useState(false);
  const [packageFilterOpen, setPackageFilterOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [headerActionsOpen, setHeaderActionsOpen] = React.useState(false);
  const [hoveredHeaderAction, setHoveredHeaderAction] = React.useState("");
  const searchInputRef = React.useRef(null);
  const headerActionsRef = React.useRef(null);
  const packages = React.useMemo(() => normalizeProgramPackages(program), [program]);

  const progClients = React.useMemo(() =>
    clients.filter(c => c.programId === program.id), [clients, program.id]);

  const filtered = React.useMemo(() => progClients.filter(c => {
    const status = getClientStatus(c);
    const matchesFilter = filter === "all" || status === filter;
    const clientPackageLevel = c.packageLevel || c.hotelLevel || "";
    const matchesPackage = packageFilter === "all"
      || (packageFilter === "__unassigned" && !clientPackageLevel)
      || clientPackageLevel === packageFilter;
    const q   = search.toLowerCase();
    const name = resolveClientDisplayName(c, "").toLowerCase();
    const phone = (c.phone || "").toLowerCase();
    const id = (c.id || "").toLowerCase();
    const matchesSearch = !q || name.includes(q) || phone.includes(q) || id.includes(q);
    return matchesFilter && matchesPackage && matchesSearch;
  }), [progClients, filter, packageFilter, search, getClientStatus]);

  React.useEffect(() => {
    setPackageFilter("all");
  }, [program.id]);

  React.useEffect(() => {
    if (!headerActionsOpen) return undefined;
    const handleOutside = (event) => {
      if (headerActionsRef.current?.contains(event.target)) return;
      setHeaderActionsOpen(false);
      setHoveredHeaderAction("");
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setHeaderActionsOpen(false);
        setHoveredHeaderAction("");
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [headerActionsOpen]);

  const toggleCheck = React.useCallback((id) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, [setCheckedIds]);

  const clearSelection = React.useCallback(() => setCheckedIds(new Set()), [setCheckedIds]);

  const selectAllFiltered = React.useCallback(() => {
    if (!filtered.length) return;
    setCheckedIds(new Set(filtered.map(c => c.id)));
  }, [filtered, setCheckedIds]);

  const exitSelectMode = React.useCallback(() => {
    setSelectMode(false);
    clearSelection();
    setTransferTargets([]);
    setTransferSheetOpen(false);
  }, [clearSelection, setSelectMode, setTransferSheetOpen, setTransferTargets]);

  const openTransferSheet = React.useCallback((ids) => {
    if (!ids.length) return;
    setTransferTargets(ids);
    setTransferSheetOpen(true);
  }, [setTransferSheetOpen, setTransferTargets]);

  const closeTransferSheet = React.useCallback(() => {
    setTransferTargets([]);
    setTransferSheetOpen(false);
  }, [setTransferSheetOpen, setTransferTargets]);

  const handleTransferSelected = React.useCallback(() => {
    if (!checkedIds.size) {
      onToast(t.noClientsSelected || "يرجى اختيار معتمر واحد على الأقل", "info");
      return;
    }
    openTransferSheet(Array.from(checkedIds));
  }, [checkedIds, onToast, t.noClientsSelected, openTransferSheet]);

  const transferList = React.useMemo(
    () => transferTargets
      .map(id => activeClients.find(c => c.id === id) || clients.find(c => c.id === id))
      .filter(Boolean),
    [transferTargets, activeClients, clients]
  );

  const programOccupancy = React.useMemo(() => {
    const map = new Map();
    (activeClients || []).forEach(c => {
      if (!c.programId) return;
      map.set(c.programId, (map.get(c.programId) || 0) + 1);
    });
    return map;
  }, [activeClients]);

  const handleTransferConfirm = React.useCallback((programId) => {
    const destination = allPrograms.find(p => p.id === programId);
    if (!destination) {
      onToast(t.programNotFound || "البرنامج غير متاح", "error");
      return;
    }
    const clientsToMove = transferList;
    if (!clientsToMove.length) {
      onToast(t.noClientsSelected || "لم يتم اختيار أي معتمر", "info");
      closeTransferSheet();
      return;
    }
    const capacity = destination.seats || Number.MAX_SAFE_INTEGER;
    const currentCount = programOccupancy.get(programId) || 0;
    if (capacity !== Number.MAX_SAFE_INTEGER && currentCount + clientsToMove.length > capacity) {
      onToast(t.programFull || "البرنامج ممتلئ", "error");
      return;
    }
    const movedCount = transferClients(clientsToMove.map((client) => client.id), programId);
    if (!movedCount) {
      onToast(t.noClientsSelected || "لم يتم اختيار أي معتمر", "info");
      closeTransferSheet();
      return;
    }
    onToast(tr("transferSuccess", { count: movedCount, program: destination.name }), "success");
    closeTransferSheet();
    exitSelectMode();
  }, [allPrograms, transferTargets, transferList, programOccupancy, transferClients, onToast, t.programNotFound, t.noClientsSelected, t.programFull, tr, closeTransferSheet, exitSelectMode]);

  const allChecked = checkedIds.size === filtered.length && filtered.length > 0;

  const totals = React.useMemo(() => ({
    revenue: progClients.reduce((s,c)=>s+(c.salePrice||c.price||0),0),
    paid:    progClients.reduce((s,c)=>s+getClientTotalPaid(c.id),0),
  }), [progClients, getClientTotalPaid]);
  const totalRem  = Math.max(0, totals.revenue - totals.paid);
  const statusCounts = React.useMemo(() => ({
    cleared: progClients.filter(c=>getClientStatus(c)==="cleared").length,
    partial: progClients.filter(c=>getClientStatus(c)==="partial").length,
    unpaid:  progClients.filter(c=>getClientStatus(c)==="unpaid").length,
  }), [progClients, getClientStatus]);
  const pct       = progClients.length > 0 ? Math.round((statusCounts.cleared/progClients.length)*100) : 0;

  const filters = [
    { key:"all",     label:t.all,          count:progClients.length },
    { key:"cleared", label:t.clearedFilter, count:statusCounts.cleared },
    { key:"partial", label:t.partialFilter, count:statusCounts.partial },
    { key:"unpaid",  label:t.unpaidFilter,  count:statusCounts.unpaid },
  ];
  const activeStatusFilter = filters.find(f => f.key === filter) || filters[0];
  const packageChips = React.useMemo(() => {
    const countForLevel = (level) => progClients.filter(c => (c.packageLevel || c.hotelLevel || "") === level).length;
    const unassignedCount = progClients.filter(c => !(c.packageLevel || c.hotelLevel)).length;
    return [
      { key: "all", label: t.all, count: progClients.length },
      ...packages.map(pkg => ({ key: pkg.level, label: translateHotelLevel(pkg.level, lang) || pkg.level, count: countForLevel(pkg.level) })),
      ...(unassignedCount ? [{ key: "__unassigned", label: t.noHotel || "غير محدد", count: unassignedCount }] : []),
    ];
  }, [packages, progClients, t, lang]);
  const selectedPackageDetail = packageFilter === "all" || packageFilter === "__unassigned"
    ? null
    : packages.find(pkg => pkg.level === packageFilter) || null;
  const activePackageChip = packageChips.find(chip => chip.key === packageFilter) || packageChips[0];
  const searchExpanded = searchOpen || search.trim().length > 0;
  const tableGridTemplate = selectMode
    ? "38px 46px minmax(0,2.2fr) minmax(0,1.1fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,0.9fr)"
    : "46px minmax(0,2.2fr) minmax(0,1.1fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,0.9fr)";
  const totalsGridColumn = selectMode ? "1 / span 3" : "1 / span 2";
  const packageById = React.useMemo(() => new Map(packages.map((pkg) => [pkg.id, pkg])), [packages]);
  const packageByLevel = React.useMemo(() => new Map(packages.map((pkg) => [pkg.level, pkg])), [packages]);
  const headerActionsLabel = lang === "fr" ? "Actions" : lang === "en" ? "Actions" : "إجراءات";
  const closeHeaderActions = React.useCallback(() => {
    setHeaderActionsOpen(false);
    setHoveredHeaderAction("");
  }, []);
  const handleProgramPdfExport = React.useCallback(() => {
    closeHeaderActions();
    if (progClients.length === 0) { onToast("لا يوجد معتمرون في هذا البرنامج","info"); return; }
    printProgramPDF({
      program,
      clients: progClients,
      getClientStatus,
      getClientTotalPaid,
      lang,
      t,
      agency,
    });
  }, [agency, closeHeaderActions, getClientStatus, getClientTotalPaid, lang, onToast, progClients, program, t]);
  const handleAmadeusExport = React.useCallback(() => {
    closeHeaderActions();
    if (progClients.length === 0) { onToast("لا يوجد معتمرون في هذا البرنامج","info"); return; }
    const missing = progClients.filter(c => !c.passport?.number);
    if (missing.length > 0) {
      onToast(`${missing.length} معتمر بدون رقم جواز — سيُصدَّر الملف مع بيانات ناقصة`, "info");
    }
    downloadAmadeusExcel(progClients, program);
    onToast(`تم تصدير ملف Amadeus — ${progClients.length} معتمر`, "success");
  }, [closeHeaderActions, onToast, progClients, program]);
  const handlePassportImportOpen = React.useCallback(() => {
    closeHeaderActions();
    setShowPassportImport(true);
  }, [closeHeaderActions]);
  const handleContractsExcelExport = React.useCallback(async () => {
    closeHeaderActions();
    const XLSX = await import("xlsx");
    const rows = [
      CONTRACT_EXPORT_HEADERS,
      ...progClients.map((client) => {
        const pkgLevel = client.packageLevel || client.hotelLevel || "";
        const pkg = packageById.get(client.packageId || client.package_id) || packageByLevel.get(pkgLevel) || null;
        const fullName = getClientArabicName(client) || getClientLatinName(client) || resolveClientDisplayName(client, "");
        const passportNumber = pickFirstText(client.passport || {}, ["number"]) || pickFirstText(client, ["passportNumber", "passport_no", "passportNo"]);
        const cin = pickFirstText(client, [
          "cin", "CIN", "cinNumber", "cin_number", "nationalId", "national_id",
          "identityNumber", "identity_number", "idCardNumber", "id_card_number",
        ]);
        const medinaHotel = pickFirstText(client, ["hotelMadina", "hotel_madina"]) || pkg?.hotelMadina || pickFirstText(program, ["hotelMadina", "hotel_madina"]);
        const makkahHotel = pickFirstText(client, ["hotelMecca", "hotel_mecca"]) || pkg?.hotelMecca || pickFirstText(program, ["hotelMecca", "hotel_mecca"]);
        const medinaCheckIn = toIsoDateString(
          pickFirstText(client, ["hotelMadinaCheckIn", "madinaCheckIn", "entryHotelMed", "hotelMadinaEntry"])
          || pickFirstText(pkg, ["hotelMadinaCheckIn", "madinaCheckIn", "entryHotelMed"])
          || pickFirstText(program, ["hotelMadinaCheckIn", "madinaCheckIn", "entryHotelMed"])
        );
        const medinaCheckOut = toIsoDateString(
          pickFirstText(client, ["hotelMadinaCheckOut", "madinaCheckOut", "sortieHotelMed", "hotelMadinaExit"])
          || pickFirstText(pkg, ["hotelMadinaCheckOut", "madinaCheckOut", "sortieHotelMed"])
          || pickFirstText(program, ["hotelMadinaCheckOut", "madinaCheckOut", "sortieHotelMed"])
        );
        const makkahCheckIn = toIsoDateString(
          pickFirstText(client, ["hotelMeccaCheckIn", "meccaCheckIn", "entryHotelMec", "hotelMeccaEntry"])
          || pickFirstText(pkg, ["hotelMeccaCheckIn", "meccaCheckIn", "entryHotelMec"])
          || pickFirstText(program, ["hotelMeccaCheckIn", "meccaCheckIn", "entryHotelMec"])
        );
        const makkahCheckOut = toIsoDateString(
          pickFirstText(client, ["hotelMeccaCheckOut", "meccaCheckOut", "sortieHotelMec", "hotelMeccaExit"])
          || pickFirstText(pkg, ["hotelMeccaCheckOut", "meccaCheckOut", "sortieHotelMec"])
          || pickFirstText(program, ["hotelMeccaCheckOut", "meccaCheckOut", "sortieHotelMec"])
        );
        const roomType = safeCellValue(client.roomTypeLabel || getRoomTypeLabel(client.roomType) || "");
        const address = pickFirstText(client, ["address", "adress", "addressLine", "address_line", "homeAddress", "home_address"]);
        const company = pickFirstText(program, ["company", "compagnie", "airline", "carrier", "transport"]);
        return [
          safeCellValue(fullName),
          safeCellValue(passportNumber),
          safeCellValue(cin),
          safeCellValue(medinaHotel),
          safeCellValue(medinaCheckIn),
          safeCellValue(medinaCheckOut),
          safeCellValue(makkahHotel),
          safeCellValue(makkahCheckIn),
          safeCellValue(makkahCheckOut),
          safeCellValue(roomType),
          safeCellValue(address),
          safeCellValue(company),
          safeCellValue(toIsoDateString(program.departure)),
          safeCellValue(toIsoDateString(program.returnDate)),
        ];
      }),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 15 }, { wch: 15 },
      { wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 16 }, { wch: 24 }, { wch: 18 },
      { wch: 14 }, { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "contracts");
    XLSX.writeFile(wb, `Contrats-${slugifyFilePart(program.name)}.xlsx`, { bookType: "xlsx", compression: true });
    onToast(lang === "fr" ? "Export contrats prêt" : lang === "en" ? "Contracts export ready" : "تم تصدير Excel العقود", "success");
  }, [closeHeaderActions, lang, onToast, packageById, packageByLevel, progClients, program]);
  const headerActions = React.useMemo(() => ([
    {
      key: "passport",
      icon: "passport",
      label: lang === "fr" ? "Importer depuis les passeports" : lang === "en" ? "Import from passports" : "استيراد من الجوازات",
      onClick: handlePassportImportOpen,
    },
    {
      key: "pdf",
      icon: "print",
      label: lang === "fr" ? "Exporter PDF" : lang === "en" ? "Export PDF" : "تصدير PDF",
      onClick: handleProgramPdfExport,
    },
    {
      key: "amadeus",
      icon: "clearance",
      label: "Amadeus Excel",
      onClick: handleAmadeusExport,
    },
    {
      key: "contracts",
      icon: "download",
      label: lang === "fr" ? "Excel contrats" : lang === "en" ? "Contracts Excel" : "تصدير Excel للعقود",
      onClick: handleContractsExcelExport,
    },
  ]), [handleAmadeusExport, handleContractsExcelExport, handlePassportImportOpen, handleProgramPdfExport, lang]);

  return (
    <div style={{ padding:"28px 32px" }}>

      {/* back + title */}
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:24, flexWrap:"wrap" }}>
        {typeof onBack === "function" && (
          <Button variant="ghost" icon="chevronBack" onClick={onBack}>
            رجوع
          </Button>
        )}
        <div style={{ flex:"1 1 320px", minWidth:0 }}>
          <h1 style={{ fontSize:20, fontWeight:800, color:tc.white }}>{program.name}</h1>
          <p style={{ fontSize:12, color:tc.grey, marginTop:3 }}>
            {t.departure}: {program.departure || "—"} &nbsp;•&nbsp;
            {t.returnDate}: {program.returnDate || "—"} &nbsp;•&nbsp;
            {t.hotelMecca}: {program.hotelMecca || "—"} &nbsp;•&nbsp;
            {t.hotelMadina}: {program.hotelMadina || "—"}
          </p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", direction:"ltr" }}>
          <div ref={headerActionsRef} style={{ position:"relative", direction: lang === "ar" ? "rtl" : "ltr" }}>
            <Button
              variant="secondary"
              icon="settings"
              onClick={() => setHeaderActionsOpen(open => !open)}
            >
              {headerActionsLabel}
            </Button>
            {headerActionsOpen && (
              <div style={{
                position:"absolute",
                top:"calc(100% + 8px)",
                insetInlineEnd:0,
                minWidth:230,
                zIndex:40,
                padding:6,
                borderRadius:14,
                border:"1px solid rgba(212,175,55,.2)",
                background:"linear-gradient(135deg, rgba(15,23,42,.98), rgba(17,24,39,.96))",
                boxShadow:"0 22px 55px rgba(0,0,0,.38)",
                backdropFilter:"blur(12px)",
              }}>
                {headerActions.map((action) => {
                  const hovered = hoveredHeaderAction === action.key;
                  return (
                    <button
                      key={action.key}
                      type="button"
                      onMouseEnter={() => setHoveredHeaderAction(action.key)}
                      onMouseLeave={() => setHoveredHeaderAction(current => current === action.key ? "" : current)}
                      onClick={action.onClick}
                      style={{
                        width:"100%",
                        border:0,
                        borderRadius:10,
                        background:hovered ? "rgba(212,175,55,.13)" : "transparent",
                        color:hovered ? tc.gold : "#d1d5db",
                        display:"flex",
                        alignItems:"center",
                        gap:9,
                        padding:"10px 11px",
                        fontSize:12,
                        fontWeight:800,
                        cursor:"pointer",
                        textAlign:"start",
                        fontFamily:"'Cairo',sans-serif",
                        transition:"background .16s ease, color .16s ease",
                      }}
                    >
                      <AppIcon name={action.icon} size={15} color={hovered ? tc.gold : tc.grey} />
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <Button variant="primary" icon="plus" onClick={() => setShowAddClient(true)}>
            {t.addClient}
          </Button>
        </div>
      </div>

      <div style={{
        display:"inline-flex",
        gap:4,
        padding:4,
        marginBottom:18,
        borderRadius:14,
        background:"rgba(255,255,255,.04)",
        border:"1px solid rgba(212,175,55,.14)",
      }}>
        {[
          { key:"clients", label:"المعتمرون", icon:"users" },
          { key:"rooming", label:"التسكين", icon:"hotel" },
        ].map(tab => (
          <button key={tab.key} type="button" onClick={() => setProgramTab(tab.key)}
            style={{
              display:"inline-flex",
              alignItems:"center",
              gap:7,
              border:0,
              borderRadius:11,
              padding:"8px 14px",
              background:programTab === tab.key ? "rgba(212,175,55,.16)" : "transparent",
              color:programTab === tab.key ? tc.gold : tc.grey,
              fontSize:13,
              fontWeight:800,
              cursor:"pointer",
              fontFamily:"'Cairo',sans-serif",
            }}>
            <AppIcon name={tab.icon} size={15} color={programTab === tab.key ? tc.gold : tc.grey} />
            {tab.label}
          </button>
        ))}
      </div>

      {programTab === "rooming" ? (
        <RoomingWorkflowCanvas
          program={program}
          clients={progClients}
          packages={packages}
          agency={agency}
          onToast={onToast}
        />
      ) : (
        <>
      {/* KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(145px,1fr))", gap:12, marginBottom:24 }}>
        {[
          ["users", t.registered, progClients.length,          tc.gold],
          ["success", t.cleared,    statusCounts.cleared,        tc.greenLight],
          ["partial", t.partial,    statusCounts.partial,        tc.warning],
          ["unpaid", t.unpaid,     statusCounts.unpaid,         tc.danger],
          ["banknote", t.collected,  formatCurrencyForLang(totals.paid), tc.gold],
          ["hourglass", t.remaining,  formatCurrencyForLang(totalRem),    tc.warning],
        ].map(([ic,lb,vl,cl],i)=>(
          <div key={lb} className="animate-fadeInUp" style={{ animationDelay:`${i*.04}s` }}>
            <GlassCard gold style={{ padding:"14px 16px", textAlign:"center" }}>
              <AppIcon name={ic} size={20} color={cl} style={{ marginBottom:5 }} />
              <p style={{ fontSize:15, fontWeight:800, color:cl, fontFamily:"'Amiri',serif", lineHeight:1 }}>{vl}</p>
              <p style={{ fontSize:11, color:tc.grey, marginTop:5 }}>{lb}</p>
            </GlassCard>
          </div>
        ))}
      </div>

      {/* clearance progress */}
      <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(212,175,55,.15)",
        borderRadius:12, padding:"14px 20px", marginBottom:22 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13 }}>
          <span style={{ color:tc.grey }}>{t.programClearanceRate}</span>
          <span style={{ color:tc.gold, fontWeight:700 }}>{pct}% {t.cleared}</span>
        </div>
        <div style={{ height:8, background:"rgba(255,255,255,.06)", borderRadius:4, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`,
            background:"linear-gradient(90deg,#22c55e,#d4af37)", borderRadius:4,
            transition:"width 1.2s ease", boxShadow:"0 0 12px rgba(34,197,94,.4)" }} />
        </div>
      </div>

      <GlassCard gold style={{ padding:"14px 16px", marginBottom:18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"center", flexWrap:"wrap", marginBottom:10 }}>
          <div>
            <p style={{ fontSize:14, fontWeight:800, color:tc.gold }}>{t.programLevelsTitle || "مستويات البرنامج"}</p>
            <p style={{ fontSize:11, color:tc.grey, marginTop:3 }}>
              {t.programLevelsHint || "اختر مستوى لعرض تفاصيله وتصفية المعتمرين المرتبطين به."}
            </p>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{
              fontSize:12,
              color:tc.gold,
              background:"rgba(212,175,55,.08)",
              border:"1px solid rgba(212,175,55,.18)",
              borderRadius:999,
              padding:"4px 10px",
              fontWeight:800,
            }}>{packages.length} {t.levels || "مستويات"}</span>
            <div style={{ position:"relative" }}>
              <button type="button" onClick={() => setPackageFilterOpen(open => !open)}
                style={{
                  minWidth:150,
                  display:"inline-flex",
                  alignItems:"center",
                  justifyContent:"space-between",
                  gap:10,
                  border:"1px solid rgba(212,175,55,.22)",
                  background:"rgba(212,175,55,.08)",
                  color:tc.gold,
                  borderRadius:12,
                  padding:"7px 11px",
                  fontSize:12,
                  fontWeight:800,
                  cursor:"pointer",
                  fontFamily:"'Cairo',sans-serif",
                }}>
                <span style={{ display:"inline-flex", alignItems:"center", gap:7, minWidth:0 }}>
                  <AppIcon name="program" size={14} color={tc.gold} />
                  <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{activePackageChip.label}</span>
                </span>
                <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                  <span style={{
                    minWidth:20,
                    textAlign:"center",
                    borderRadius:999,
                    padding:"0 6px",
                    background:"rgba(212,175,55,.16)",
                    fontSize:10,
                  }}>{activePackageChip.count}</span>
                  <AppIcon name="chevronBack" size={13} color={tc.gold} style={{ transform:"rotate(-90deg)" }} />
                </span>
              </button>
              {packageFilterOpen && (
                <div style={{
                  position:"absolute",
                  insetInlineEnd:0,
                  top:"calc(100% + 6px)",
                  width:190,
                  zIndex:20,
                  background:"#111827",
                  border:"1px solid rgba(212,175,55,.2)",
                  borderRadius:12,
                  boxShadow:"0 18px 40px rgba(0,0,0,.35)",
                  padding:6,
                }}>
                  {packageChips.map(chip => (
                    <button key={chip.key} type="button" onClick={() => {
                      setPackageFilter(chip.key);
                      setPackageFilterOpen(false);
                    }} style={{
                      width:"100%",
                      display:"flex",
                      justifyContent:"space-between",
                      alignItems:"center",
                      gap:10,
                      border:0,
                      borderRadius:9,
                      padding:"8px 9px",
                      background:packageFilter === chip.key ? "rgba(212,175,55,.14)" : "transparent",
                      color:packageFilter === chip.key ? tc.gold : "#d1d5db",
                      fontSize:12,
                      fontWeight:packageFilter === chip.key ? 800 : 600,
                      cursor:"pointer",
                      fontFamily:"'Cairo',sans-serif",
                      textAlign:"start",
                    }}>
                      <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{chip.label}</span>
                      <span style={{
                        minWidth:20,
                        textAlign:"center",
                        borderRadius:999,
                        padding:"0 6px",
                        background:"rgba(255,255,255,.06)",
                        color:packageFilter === chip.key ? tc.gold : tc.grey,
                        fontSize:10,
                      }}>{chip.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {packageFilter === "__unassigned" ? (
          <div style={{
            border:"1px dashed rgba(148,163,184,.2)",
            background:"rgba(148,163,184,.05)",
            borderRadius:10,
            padding:"10px 12px",
            color:tc.grey,
            fontSize:12,
          }}>
            {t.unassignedPackageHint || "يعرض هذا الخيار المعتمرين القدامى الذين لم يتم ربطهم بمستوى بعد."}
          </div>
        ) : selectedPackageDetail ? (
          <PackageDetailCard pkg={selectedPackageDetail} formatCurrencyForLang={formatCurrencyForLang} t={t} />
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:8 }}>
            {packages.map(pkg => {
              const start = getPackageStartingPrice(pkg);
              return (
                <button key={pkg.id || pkg.level} type="button" onClick={() => setPackageFilter(pkg.level)}
                  style={{
                    border:"1px solid rgba(212,175,55,.14)",
                    background:"rgba(0,0,0,.14)",
                    borderRadius:10,
                    padding:"10px 12px",
                    display:"grid",
                    gap:5,
                    textAlign:"start",
                    cursor:"pointer",
                    fontFamily:"'Cairo',sans-serif",
                  }}>
                  <span style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center" }}>
                    <strong style={{ color:tc.white, fontSize:13 }}>{translateHotelLevel(pkg.level, lang) || pkg.level}</strong>
                    <span style={{ color:tc.gold, fontSize:11, fontWeight:800 }}>
                      {start ? formatCurrencyForLang(start) : "—"}
                    </span>
                  </span>
                  <span style={{ color:tc.grey, fontSize:11, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {pkg.hotelMecca || "—"} / {pkg.hotelMadina || "—"}
                  </span>
                  <span style={{ color:tc.grey, fontSize:11 }}>
                    {pkg.mealPlan || t.noMealPlan || "بدون نظام وجبات محدد"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* filters + search */}
      <div style={{
        display:"flex",
        flexWrap:"wrap",
        gap:10,
        alignItems:"center",
        justifyContent:"space-between",
        marginBottom: selectMode ? 8 : 16,
      }}>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ position:"relative" }}>
            <button type="button" onClick={() => setStatusFilterOpen(open => !open)} style={{
              minWidth:138,
              display:"inline-flex",
              alignItems:"center",
              justifyContent:"space-between",
              gap:10,
              padding:"7px 11px",
              borderRadius:12,
              background:"rgba(255,255,255,.04)",
              border:"1px solid rgba(255,255,255,.1)",
              color:tc.grey,
              fontSize:12,
              fontWeight:800,
              cursor:"pointer",
              fontFamily:"'Cairo',sans-serif",
            }}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:7 }}>
                <AppIcon name="clearance" size={14} color={filter === "all" ? tc.grey : tc.gold} />
                <span>{activeStatusFilter.label}</span>
              </span>
              <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                <span style={{
                  minWidth:20,
                  textAlign:"center",
                  borderRadius:999,
                  padding:"0 6px",
                  background:"rgba(255,255,255,.06)",
                  color:filter === "all" ? tc.grey : tc.gold,
                  fontSize:10,
                }}>{activeStatusFilter.count}</span>
                <AppIcon name="chevronBack" size={13} color={tc.grey} style={{ transform:"rotate(-90deg)" }} />
              </span>
            </button>
            {statusFilterOpen && (
              <div style={{
                position:"absolute",
                insetInlineStart:0,
                top:"calc(100% + 6px)",
                width:180,
                zIndex:20,
                background:"#111827",
                border:"1px solid rgba(212,175,55,.18)",
                borderRadius:12,
                boxShadow:"0 18px 40px rgba(0,0,0,.35)",
                padding:6,
              }}>
                {filters.map(f=>(
                  <button key={f.key} type="button" onClick={() => {
                    setFilter(f.key);
                    setStatusFilterOpen(false);
                  }} style={{
                    width:"100%",
                    display:"flex",
                    justifyContent:"space-between",
                    alignItems:"center",
                    gap:10,
                    border:0,
                    borderRadius:9,
                    padding:"8px 9px",
                    background:filter === f.key ? "rgba(212,175,55,.14)" : "transparent",
                    color:filter === f.key ? tc.gold : "#d1d5db",
                    fontSize:12,
                    fontWeight:filter === f.key ? 800 : 600,
                    cursor:"pointer",
                    fontFamily:"'Cairo',sans-serif",
                  }}>
                    <span>{f.label}</span>
                    <span style={{
                      minWidth:20,
                      textAlign:"center",
                      borderRadius:999,
                      padding:"0 6px",
                      background:"rgba(255,255,255,.06)",
                      color:filter === f.key ? tc.gold : tc.grey,
                      fontSize:10,
                    }}>{f.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            onMouseEnter={() => setSearchOpen(true)}
            onMouseLeave={() => {
              if (!search.trim() && document.activeElement !== searchInputRef.current) setSearchOpen(false);
            }}
            style={{
              width:searchExpanded ? 280 : 38,
              height:38,
              maxWidth:"100%",
              display:"flex",
              alignItems:"center",
              gap:6,
              borderRadius:12,
              background:"rgba(255,255,255,.04)",
              border:`1px solid ${searchExpanded ? "rgba(212,175,55,.22)" : "rgba(255,255,255,.1)"}`,
              padding:searchExpanded ? "0 9px" : 0,
              overflow:"hidden",
              transition:"width .22s ease, border-color .22s ease, padding .22s ease",
            }}
          >
            <button type="button" onClick={() => {
              setSearchOpen(true);
              requestAnimationFrame(() => searchInputRef.current?.focus());
            }} style={{
              width:38,
              height:36,
              flex:"0 0 38px",
              border:0,
              background:"transparent",
              color:tc.gold,
              display:"inline-flex",
              alignItems:"center",
              justifyContent:"center",
              cursor:"pointer",
            }} aria-label={t.searchClients || t.searchPrograms}>
              <AppIcon name="search" size={17} color={tc.gold} />
            </button>
            {searchExpanded && (
              <>
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={e=>setSearch(e.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => {
                    if (!search.trim()) setSearchOpen(false);
                  }}
                  placeholder={t.searchClients || t.searchPrograms}
                  style={{
                    flex:1,
                    minWidth:0,
                    border:0,
                    outline:0,
                    background:"transparent",
                    color:tc.white,
                    fontSize:13,
                    fontFamily:"'Cairo',sans-serif",
                  }}
                />
                {search.trim() && (
                  <button type="button" onClick={() => {
                    setSearch("");
                    requestAnimationFrame(() => searchInputRef.current?.focus());
                  }} style={{
                    width:24,
                    height:24,
                    border:0,
                    borderRadius:8,
                    background:"rgba(255,255,255,.06)",
                    display:"inline-flex",
                    alignItems:"center",
                    justifyContent:"center",
                    cursor:"pointer",
                  }} aria-label={t.clear || "Clear"}>
                    <AppIcon name="x" size={13} color={tc.grey} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        {filtered.length > 0 && (
          <Button
            variant={selectMode ? "warning" : "ghost"}
            size="sm"
            icon="checked"
            onClick={() => {
              if (selectMode) {
                exitSelectMode();
              } else {
                clearSelection();
                setSelectMode(true);
              }
            }}
          >
            {selectMode ? (t.finishSelection || t.cancel) : t.selectMultiple}
          </Button>
        )}
      </div>

      {selectMode && (
        <GlassCard style={{ padding:"12px 16px", marginBottom:14 }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:13, color:tc.gold, fontWeight:700 }}>
              {tr("selectedCount", { count: checkedIds.size })}
            </span>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={selectAllFiltered}
                disabled={allChecked || filtered.length === 0}
              >
                {t.selectAll}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                disabled={checkedIds.size === 0}
              >
                {t.deselectAll}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleTransferSelected}
              >
                {t.transferSelected}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={exitSelectMode}
              >
                {t.cancel}
              </Button>
            </div>
          </div>
        </GlassCard>
      )}

      {filtered.length > 0 && (
        <div style={{
          width:"100%",
          display:"grid",
          gridTemplateColumns:tableGridTemplate,
          alignItems:"center",
          gap:12,
          padding:"10px 18px",
          background:"rgba(212,175,55,.06)",
          borderRadius:8,
          fontSize:11,
          fontWeight:700,
          color:tc.grey,
        }}>
          {selectMode && <span style={{ textAlign:"center" }} />}
          <span>#</span>
          <span>{t.name}</span>
          <span style={{ textAlign:"center" }}>{t.roomType}</span>
          <span style={{ textAlign:"center" }}>{t.ticketNo}</span>
          <span style={{ textAlign:"center" }}>{t.paid}</span>
          <span style={{ textAlign:"center" }}>{t.remaining}</span>
          <span style={{ textAlign:"center" }}>{t.statusLabel || t.status || "الحالة"}</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon="users" title={t.programNoPilgrimsTitle}
          sub={filter!=="all"?t.programNoPilgrimsFiltered:t.programNoPilgrimsSub} />
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {filtered.map((c,i)=>{
            const paid = getClientTotalPaid(c.id);
            const rem  = Math.max(0, (c.salePrice||c.price||0) - paid);
            const stat = getClientStatus(c);
            return (
              <InnerClientRow key={c.id} client={c} index={i}
                paid={paid} remaining={rem} status={stat}
                onClick={()=>setSelectedClient(c)}
                onEdit={()=>setEditingClient(c)}
                selectMode={selectMode}
                showCheckbox={selectMode}
                isChecked={checkedIds.has(c.id)}
                onCheck={()=>toggleCheck(c.id)}
                onTransfer={()=>openTransferSheet([c.id])}
                onDelete={()=>{
                  if(window.confirm(`حذف "${c.name}"؟`)){
                    store.deleteClient(c.id);
                    onToast("تم الحذف","info");
                  }
                }}
                gridTemplate={tableGridTemplate}
              />
            );
          })}
        </div>
      )}

      {/* totals row */}
      {filtered.length > 0 && (
        <div style={{
          display:"grid",
          gridTemplateColumns:tableGridTemplate,
          gap:12,
          padding:"12px 18px",
          marginTop:8,
          background:"rgba(212,175,55,.08)",
          border:"1px solid rgba(212,175,55,.2)",
          borderRadius:10,
          fontSize:12,
          fontWeight:700,
          alignItems:"center",
        }}>
          <div style={{
            gridColumn:totalsGridColumn,
            display:"flex",
            alignItems:"center",
            gap:10,
            minWidth:0,
            flexWrap:"nowrap",
          }}>
            <span style={{ color:tc.gold, whiteSpace:"nowrap", flexShrink:0 }}>
              {tr("programTotalsLabel", { count: filtered.length })}
            </span>
            <span style={{
              color:tc.grey,
              whiteSpace:"nowrap",
              flexShrink:1,
              overflow:"hidden",
              textOverflow:"ellipsis",
            }}>
              {t.summary || t.clients}
            </span>
          </div>
          <span />
          <span />
          <span style={{ color:tc.greenLight, textAlign:"center" }}>
            {formatCurrencyForLang(filtered.reduce((s,c)=>s+getClientTotalPaid(c.id),0))}
          </span>
          <span style={{ color:tc.warning, textAlign:"center" }}>
            {formatCurrencyForLang(filtered.reduce((s,c)=>s+Math.max(0,(c.salePrice||c.price||0)-getClientTotalPaid(c.id)),0))}
          </span>
          <span />
        </div>
      )}
        </>
      )}

      {/* modals */}
      <Modal open={!!selectedClient} onClose={()=>setSelectedClient(null)} title={t.clientFile} width={640}>
        {selectedClient && (
          <ClientDetail client={selectedClient} store={store}
            onClose={()=>setSelectedClient(null)}
            onEdit={c=>{setSelectedClient(null);setEditingClient(c);}}
            onToast={onToast} />
        )}
      </Modal>
      <Modal open={showAddClient} onClose={()=>setShowAddClient(false)} title={t.addClient} width={600}>
        <ClientForm store={store} defaultProgramId={program.id} lockProgramId={program.id}
          onSave={()=>{setShowAddClient(false);onToast(t.addSuccess,"success");}}
          onCancel={()=>setShowAddClient(false)} />
      </Modal>
      <Modal
        open={showPassportImport}
        onClose={() => setShowPassportImport(false)}
        title={lang === "fr" ? "Importer depuis les passeports" : lang === "en" ? "Import from passports" : "استيراد من الجوازات"}
        width={1040}
      >
        {showPassportImport && (
          <MRZReader
            store={store}
            onToast={onToast}
            onClose={() => setShowPassportImport(false)}
            programContext={{
              id: program.id,
              name: program.name,
              packages,
            }}
          />
        )}
      </Modal>
      <Modal open={!!editingClient} onClose={()=>setEditingClient(null)} title={`${t.edit} — ${t.clientFile}`} width={600}>
        {editingClient && (
          <ClientForm client={editingClient} store={store}
            onSave={()=>{setEditingClient(null);onToast(t.updateSuccess,"success");}}
            onCancel={()=>setEditingClient(null)} />
        )}
      </Modal>
      <TransferSheet
        open={transferSheetOpen}
        onClose={closeTransferSheet}
        clients={transferList}
        programs={allPrograms}
        occupancy={programOccupancy}
        onConfirm={handleTransferConfirm}
      />
    </div>
  );
}

function RoomingWorkflowCanvas({ program, clients, packages, agency, onToast }) {
  const { t, tr, lang } = useLang();
  const [city, setCity] = React.useState("makkah");
  const [rooms, setRooms] = React.useState([]);
  const [unassigned, setUnassigned] = React.useState([]);
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [zoom, setZoom] = React.useState(100);
  const [dirty, setDirty] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState(null);
  const [selectedRoomId, setSelectedRoomId] = React.useState(null);
  const [roomModal, setRoomModal] = React.useState({ open: false, mode: "edit", roomId: null });
  const [roomDraft, setRoomDraft] = React.useState({ roomType: "double", category: "male_only", hotel: "" });
  const [roomCreatePosition, setRoomCreatePosition] = React.useState({ x: 0, y: 0 });
  const [canvasMenu, setCanvasMenu] = React.useState({ open: false, x: 0, y: 0, position: { x: 0, y: 0 } });
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [selectedPilgrimIds, setSelectedPilgrimIds] = React.useState([]);
  const [panelSearch, setPanelSearch] = React.useState("");
  const [panelHotel, setPanelHotel] = React.useState("all");
  const [panelRoomType, setPanelRoomType] = React.useState("all");
  const [roomOccupancyFilter, setRoomOccupancyFilter] = React.useState("all");
  const [roomFilterOpen, setRoomFilterOpen] = React.useState(false);
  const [roomNeedsOpen, setRoomNeedsOpen] = React.useState(false);
  const [toolbarCollapsed, setToolbarCollapsed] = React.useState(false);
  const [draggingClientId, setDraggingClientId] = React.useState(null);
  const flowRef = React.useRef(null);
  const flowNodesRef = React.useRef([]);
  const roomDragActiveRef = React.useRef(false);
  const dragStartPositionRef = React.useRef(new Map());
  const lastValidPositionRef = React.useRef(new Map());
  const dragInvalidRef = React.useRef(new Map());

  const storageKey = React.useMemo(() => `rukn_rooming_sheet_${program.id}_${city}`, [program.id, city]);
  const packageByLevel = React.useMemo(() => {
    const map = new Map();
    packages.forEach((pkg) => map.set(pkg.level, pkg));
    return map;
  }, [packages]);
  const packageById = React.useMemo(() => {
    const map = new Map();
    packages.forEach((pkg) => {
      if (pkg.id) map.set(pkg.id, pkg);
    });
    return map;
  }, [packages]);
  const clientsById = React.useMemo(() => Object.fromEntries(clients.map((client) => [client.id, client])), [clients]);
  const roomingCityLabels = React.useMemo(() => ({
    makkah: t.roomingMakkah || ROOMING_CITY_LABELS.makkah,
    madinah: t.roomingMadinah || ROOMING_CITY_LABELS.madinah,
  }), [t]);
  const roomingRoomOptions = React.useMemo(() => ROOMING_ROOM_OPTIONS.map((option) => ({
    ...option,
    label: option.value === "single" ? (t.roomSingleShort || option.label)
      : option.value === "double" ? (t.roomDoubleShort || option.label)
        : option.value === "triple" ? (t.roomTripleShort || option.label)
          : option.value === "quad" ? (t.roomQuadShort || option.label)
            : option.value === "quint" ? (t.roomQuintShort || option.label)
              : option.label,
  })), [t]);
  const roomingCategoryOptions = React.useMemo(() => ROOMING_CATEGORY_OPTIONS.map((option) => ({
    ...option,
    label: option.value === "male_only" ? (t.roomCategoryMaleOnly || option.label)
      : option.value === "female_only" ? (t.roomCategoryFemaleOnly || option.label)
        : (t.roomCategoryFamily || option.label),
  })), [t]);
  const getLocalizedRoomTypeLabel = React.useCallback((roomType) => {
    const key = normalizeRoomingRoomType(roomType) || roomType;
    return roomingRoomOptions.find((option) => option.value === key)?.label || getRoomingRoomLabel(key);
  }, [roomingRoomOptions]);
  const getLocalizedCategoryLabel = React.useCallback((category) => {
    return roomingCategoryOptions.find((option) => option.value === category)?.label || getRoomingCategoryLabel(category);
  }, [roomingCategoryOptions]);

  const getClientContext = React.useCallback((client) => {
    const level = client.packageLevel || client.hotelLevel || "";
    const pkg = packageByLevel.get(level) || packageById.get(client.packageId || client.package_id);
    const hotel = city === "makkah"
      ? (client.hotelMecca || pkg?.hotelMecca || program.hotelMecca || "")
      : (client.hotelMadina || pkg?.hotelMadina || program.hotelMadina || "");
    const roomType = normalizeRoomingRoomType(client.roomType, client.roomTypeLabel, client.room) || "";
    const gender = normalizeRoomingGender(client.gender);
    return {
      name: getClientDisplayName(client),
      registrationSource: getClientRegistrationSource(client),
      gender,
      genderLabel: gender === "male" ? t.male : gender === "female" ? t.female : "—",
      hotel,
      level: level ? (translateHotelLevel(level, lang) || level) : "",
      roomType,
      roomTypeLabel: getLocalizedRoomTypeLabel(roomType),
      category: client.roomCategory || "",
      familyKey: client.roomingGroupId || getRoomingFamilyKey(client),
    };
  }, [city, packageById, packageByLevel, program, t, lang, getLocalizedRoomTypeLabel]);

  const hotelOptions = React.useMemo(() => {
    const values = new Set(getProgramHotelsForCity(program, packages, city));
    clients.forEach((client) => {
      const hotel = getClientContext(client).hotel;
      if (hotel) values.add(hotel);
    });
    return Array.from(values);
  }, [program, packages, city, clients, getClientContext]);

  const readCanvasState = React.useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return { rooms: [], unassigned: [], version: 4 };
      const parsed = JSON.parse(raw);
      if (parsed.kind === "rooming-canvas") {
        return {
          rooms: Array.isArray(parsed.rooms) ? parsed.rooms : [],
          unassigned: Array.isArray(parsed.unassigned) ? parsed.unassigned : [],
          version: 4,
        };
      }
      const legacyRooms = Object.values(parsed?.meta?.rooms || {});
      const legacyInserted = new Set(Object.keys(parsed?.meta?.insertedClients || {}));
      return {
        rooms: legacyRooms.map((room, index) => ({
          ...room,
          id: room.id || createRoomId(),
          order: index,
          x: room.x ?? ((index % 3) * 280),
          y: room.y ?? (Math.floor(index / 3) * 190),
        })),
        unassigned: clients
          .filter((client) => !legacyInserted.has(client.id))
          .map((client) => ({ clientId: client.id, reason: "" })),
        version: 4,
      };
    } catch {
      return { rooms: [], unassigned: [], version: 4 };
    }
  }, [storageKey, clients]);

  React.useEffect(() => {
    const loaded = readCanvasState();
    setRooms(loaded.rooms);
    setUnassigned(loaded.unassigned);
    setDirty(false);
    setSavedAt(null);
    setSelectedRoomId(null);
  }, [readCanvasState]);

  React.useEffect(() => {
    if (!fullscreen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreen]);

  const saveCanvas = React.useCallback((notify = true) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        kind: "rooming-canvas",
        version: 4,
        city,
        rooms,
        unassigned,
        updatedAt: new Date().toISOString(),
      }));
      setDirty(false);
      setSavedAt(new Date());
      if (notify) onToast?.(t.roomingSavedLocal || "تم حفظ مصمم التسكين محليًا", "success");
    } catch {
      onToast?.(t.roomingSaveFailedLocal || "تعذر حفظ مصمم التسكين محليًا", "error");
    }
  }, [storageKey, city, rooms, unassigned, onToast, t]);

  const markDirty = React.useCallback(() => setDirty(true), []);

  React.useEffect(() => {
    if (!dirty) return undefined;
    const timer = window.setTimeout(() => saveCanvas(false), 650);
    return () => window.clearTimeout(timer);
  }, [dirty, rooms, unassigned, saveCanvas]);

  const switchCity = React.useCallback((nextCity) => {
    if (nextCity === city) return;
    if (dirty) saveCanvas(false);
    setCity(nextCity);
  }, [city, dirty, saveCanvas]);

  React.useEffect(() => {
    if (!canvasMenu.open) return undefined;
    const close = () => setCanvasMenu((current) => ({ ...current, open: false }));
    const handleKeyDown = (event) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canvasMenu.open]);

  React.useEffect(() => {
    if (!roomFilterOpen && !roomNeedsOpen) return undefined;
    const close = () => {
      setRoomFilterOpen(false);
      setRoomNeedsOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [roomFilterOpen, roomNeedsOpen]);

  const clientIdsInRooms = React.useMemo(() => {
    const ids = new Set();
    rooms.forEach((room) => (room.occupantIds || []).forEach((id) => ids.add(id)));
    return ids;
  }, [rooms]);

  const normalizedUnassigned = React.useMemo(() => {
    const explicit = new Map(unassigned.map((item) => [item.clientId, item]));
    clients.forEach((client) => {
      if (!clientIdsInRooms.has(client.id) && !explicit.has(client.id)) {
        explicit.set(client.id, { clientId: client.id, reason: "" });
      }
    });
    return Array.from(explicit.values()).filter((item) => clientsById[item.clientId] && !clientIdsInRooms.has(item.clientId));
  }, [clients, clientsById, clientIdsInRooms, unassigned]);

  const groupedRooms = React.useMemo(() => {
    const sorted = rooms.slice().sort((a, b) => {
      const hotel = String(a.hotel || "").localeCompare(String(b.hotel || ""), "ar");
      if (hotel) return hotel;
      const type = String(a.roomType || "").localeCompare(String(b.roomType || ""), "ar");
      if (type) return type;
      const category = String(a.category || "").localeCompare(String(b.category || ""), "ar");
      if (category) return category;
      return (a.order || 0) - (b.order || 0);
    });
    const hotels = new Map();
    sorted.forEach((room) => {
      const hotelKey = room.hotel || (t.roomingMissingHotel || "فندق غير محدد");
      const typeKey = room.roomType || (t.noHotel || "غير محدد");
      if (!hotels.has(hotelKey)) hotels.set(hotelKey, new Map());
      const byType = hotels.get(hotelKey);
      if (!byType.has(typeKey)) byType.set(typeKey, []);
      byType.get(typeKey).push(room);
    });
    return hotels;
  }, [rooms]);

  const getCompatibilityResult = React.useCallback((client, room) => {
    if (!client || !room) return { ok: false, reason: t.roomingMissingPilgrimData || "بيانات المعتمر ناقصة" };
    const context = getClientContext(client);
    const occupantIds = room.occupantIds || [];
    const roomType = normalizeRoomingRoomType(room.roomType);
    const clientRoomType = normalizeRoomingRoomType(context.roomType, client.roomTypeLabel, client.room);
    const capacity = room.capacity || getRoomingCapacity(roomType);
    const clientGender = normalizeRoomingGender(context.gender);
    const roomHotel = normalizeRoomingHotel(room.hotel);
    const clientHotel = normalizeRoomingHotel(context.hotel);
    if (occupantIds.includes(client.id)) return { ok: false, reason: t.roomingAlreadyInserted || "المعتمر مدرج مسبقا" };
    if (occupantIds.length >= capacity) return { ok: false, reason: t.roomFull || "الغرفة ممتلئة" };
    if (!clientGender) return { ok: false, reason: t.roomingMissingPilgrimData || "بيانات المعتمر ناقصة" };
    if (room.category === "male_only" && clientGender !== "male") return { ok: false, reason: t.roomingGenderMismatch || "الجنس غير متوافق" };
    if (room.category === "female_only" && clientGender !== "female") return { ok: false, reason: t.roomingGenderMismatch || "الجنس غير متوافق" };
    if (roomHotel && clientHotel && roomHotel !== clientHotel) return { ok: false, reason: t.roomingHotelMismatch || "الفندق غير متوافق" };
    if (roomType && clientRoomType && roomType !== clientRoomType) return { ok: false, reason: t.roomingRoomTypeMismatch || "نوع الغرفة غير متوافق" };
    if (room.category === "family") {
      const occupants = occupantIds.map((id) => clientsById[id]).filter(Boolean);
      const mixed = occupants.some((occupant) => normalizeRoomingGender(occupant.gender) && normalizeRoomingGender(occupant.gender) !== clientGender);
      if (mixed) {
        const roomFamilyKeys = new Set(occupants.map((occupant) => getClientContext(occupant).familyKey).filter(Boolean));
        if (!context.familyKey || !roomFamilyKeys.has(context.familyKey)) return { ok: false, reason: t.roomingMissingPilgrimData || "بيانات المعتمر ناقصة" };
      }
    }
    return { ok: true };
  }, [clientsById, getClientContext, t]);

  const getCompatibilityReason = React.useCallback((client, room) => {
    const result = getCompatibilityResult(client, room);
    return result.ok ? "" : result.reason;
  }, [getCompatibilityResult]);

  const compatibleUnassigned = React.useMemo(() => {
    const room = rooms.find((item) => item.id === selectedRoomId);
    if (!room) return [];
    const remaining = Math.max(0, (room.capacity || getRoomingCapacity(room.roomType)) - (room.occupantIds || []).length);
    if (!remaining) return [];
    return normalizedUnassigned
      .map((item) => ({ item, client: clientsById[item.clientId] }))
      .filter(({ client }) => client && !getCompatibilityReason(client, room));
  }, [rooms, selectedRoomId, normalizedUnassigned, clientsById, getCompatibilityReason]);

  const filteredUnassigned = React.useMemo(() => {
    const query = panelSearch.trim().toLowerCase();
    return normalizedUnassigned.filter((item) => {
      const client = clientsById[item.clientId];
      if (!client) return false;
      const context = getClientContext(client);
      if (query && !context.name.toLowerCase().includes(query)) return false;
      if (panelHotel !== "all" && context.hotel !== panelHotel) return false;
      if (panelRoomType !== "all" && context.roomType !== panelRoomType) return false;
      return true;
    });
  }, [normalizedUnassigned, clientsById, getClientContext, panelSearch, panelHotel, panelRoomType]);

  const roomOccupancyOptions = React.useMemo(() => [
    { value: "all", label: t.roomingFilterAllRooms || t.allRooms || "كل الغرف" },
    { value: "empty", label: t.roomingFilterEmpty || "الفارغة" },
    { value: "incomplete", label: t.roomingFilterIncomplete || "الناقصة" },
    { value: "full", label: t.roomingFilterFull || "الممتلئة" },
  ], [t]);

  const visibleRooms = React.useMemo(() => rooms.filter((room) => {
    const hotelMatch = panelHotel === "all"
      || normalizeRoomingHotel(room.hotel) === normalizeRoomingHotel(panelHotel);
    const roomTypeMatch = panelRoomType === "all"
      || normalizeRoomingRoomType(room.roomType) === normalizeRoomingRoomType(panelRoomType);
    const capacity = Math.max(1, Number(room.capacity) || getRoomingCapacity(room.roomType));
    const count = (room.occupantIds || []).length;
    const occupancyMatch = roomOccupancyFilter === "all"
      || (roomOccupancyFilter === "empty" && count === 0)
      || (roomOccupancyFilter === "incomplete" && count > 0 && count < capacity)
      || (roomOccupancyFilter === "full" && count === capacity);
    return hotelMatch && roomTypeMatch && occupancyMatch;
  }), [rooms, panelHotel, panelRoomType, roomOccupancyFilter]);

  const getRoomingProgressForCity = React.useCallback((targetCity) => {
    const sourceRooms = targetCity === city ? rooms : (() => {
      try {
        const raw = localStorage.getItem(`rukn_rooming_sheet_${program.id}_${targetCity}`);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed?.rooms) ? parsed.rooms : [];
      } catch {
        return [];
      }
    })();
    const assigned = new Set();
    sourceRooms.forEach((room) => (room.occupantIds || []).forEach((id) => {
      if (clientsById[id]) assigned.add(id);
    }));
    const total = clients.length;
    const percent = total ? Math.round((assigned.size / total) * 100) : 0;
    return { assigned: assigned.size, total, percent };
  }, [city, rooms, program.id, clients.length, clientsById]);

  const roomingProgress = React.useMemo(() => ({
    makkah: getRoomingProgressForCity("makkah"),
    madinah: getRoomingProgressForCity("madinah"),
  }), [getRoomingProgressForCity]);

  const roomNeeds = React.useMemo(() => {
    const counts = new Map();
    clients.forEach((client) => {
      const type = normalizeRoomingRoomType(client.roomType, client.roomTypeLabel, client.room);
      if (!type) return;
      counts.set(type, (counts.get(type) || 0) + 1);
    });
    const details = ROOMING_ROOM_OPTIONS
      .map((option) => {
        const pilgrims = counts.get(option.value) || 0;
        if (!pilgrims) return null;
        const capacity = getRoomingCapacity(option.value);
        return {
          type: option.value,
          label: getLocalizedRoomTypeLabel(option.value),
          pilgrims,
          rooms: Math.ceil(pilgrims / capacity),
        };
      })
      .filter(Boolean);
    return {
      details,
      totalRooms: details.reduce((sum, item) => sum + item.rooms, 0),
      totalPilgrims: details.reduce((sum, item) => sum + item.pilgrims, 0),
    };
  }, [clients, getLocalizedRoomTypeLabel]);

  const getNextRoomNumber = React.useCallback(() => {
    const values = rooms
      .map((room) => Number(String(room.roomNumber || "").replace(/[^\d]/g, "")))
      .filter((value) => Number.isFinite(value) && value > 0);
    return String((values.length ? Math.max(...values) : 0) + 1).padStart(2, "0");
  }, [rooms]);

  const roomToCollisionNode = React.useCallback((room) => ({
    id: room.id,
    type: "room",
    position: { x: Number(room.x) || 0, y: Number(room.y) || 0 },
    data: { room },
    width: ROOMING_NODE_WIDTH,
  }), []);

  const allCollisionNodes = React.useMemo(
    () => rooms.map((room) => roomToCollisionNode(room)),
    [rooms, roomToCollisionNode]
  );

  const findFreePositionForRoom = React.useCallback((room, preferredPosition) => {
    const node = {
      ...roomToCollisionNode(room),
      position: preferredPosition,
    };
    return findNearestFreeRoomingPosition(node, allCollisionNodes.filter((item) => item.id !== room.id), preferredPosition);
  }, [allCollisionNodes, roomToCollisionNode]);

  const generateRooms = React.useCallback(() => {
    if (rooms.length && !window.confirm(t.roomingRegenerateConfirm || "يوجد تسكين محفوظ لهذه المدينة، هل تريد إعادة التوليد واستبدال الحالي؟")) return;
    const nextRooms = [];
    const nextUnassigned = [];
    const grouped = new Map();
    const addUnassigned = (client, reason) => nextUnassigned.push({ clientId: client.id, reason });

    clients.forEach((client) => {
      const context = getClientContext(client);
      if (!context.hotel) return addUnassigned(client, t.roomingMissingHotel || "فندق غير محدد");
      if (!context.roomType) return addUnassigned(client, t.roomingMissingRoomType || "نوع الغرفة غير محدد");
      if (!context.gender) return addUnassigned(client, t.roomingMissingGender || "الجنس غير محدد");
      const roomType = context.roomType;
      const capacity = getRoomingCapacity(roomType);
      const requestedCategory = client.roomCategory || (context.gender === "female" ? "female_only" : "male_only");
      if (requestedCategory === "family" && !context.familyKey) return addUnassigned(client, t.roomingMissingFamily || "لا توجد مجموعة عائلية");
      const groupKey = [
        context.hotel,
        roomType,
        requestedCategory,
        client.roomingGroupId || context.familyKey || (requestedCategory === "family" ? client.id : context.gender),
      ].join("::");
      if (!grouped.has(groupKey)) grouped.set(groupKey, []);
      grouped.get(groupKey).push(client);
      if (grouped.get(groupKey).length > capacity && client.roomingGroupId) {
        grouped.get(groupKey).pop();
        addUnassigned(client, t.roomingCapacityExceeded || "تجاوز سعة الغرفة");
      }
    });

    let order = 0;
    Array.from(grouped.values()).forEach((group) => {
      if (!group.length) return;
      const first = group[0];
      const context = getClientContext(first);
      const capacity = getRoomingCapacity(context.roomType);
      for (let index = 0; index < group.length; index += capacity) {
        const occupants = group.slice(index, index + capacity);
        const category = first.roomCategory || inferRoomCategoryFromClients(occupants);
        const hasUnsafeFamilyMix = category === "family" && new Set(occupants.map((client) => client.gender)).size > 1
          && !occupants.every((client) => getClientContext(client).familyKey && getClientContext(client).familyKey === getClientContext(first).familyKey);
        if (hasUnsafeFamilyMix) {
          occupants.forEach((client) => addUnassigned(client, t.roomingMissingFamily || "لا توجد مجموعة عائلية"));
          return;
        }
        nextRooms.push({
          id: createRoomId(),
          order: order,
          roomNumber: String(order + 1).padStart(2, "0"),
          roomType: context.roomType,
          category,
          hotel: context.hotel,
          capacity,
          occupantIds: occupants.map((client) => client.id),
          roomingGroupId: first.roomingGroupId || "",
          roomingGroupName: first.roomingGroupName || "",
        });
        order += 1;
      }
    });

    setRooms(autoLayoutRoomNodes(nextRooms));
    setUnassigned(nextUnassigned);
    setSelectedRoomId(null);
    setDirty(true);
    onToast?.(t.roomingGenerated || "تم توليد الغرف من بيانات المعتمرين", "success");
  }, [rooms.length, clients, getClientContext, onToast, t]);

  const openCreateRoom = React.useCallback((position = { x: 0, y: 0 }) => {
    setRoomDraft({
      roomType: "double",
      category: "male_only",
      hotel: hotelOptions[0] || (city === "makkah" ? program.hotelMecca || "" : program.hotelMadina || ""),
    });
    setRoomCreatePosition(position);
    setRoomModal({ open: true, mode: "create", roomId: null });
  }, [hotelOptions, city, program.hotelMecca, program.hotelMadina]);

  const openEditRoom = React.useCallback((room) => {
    setSelectedRoomId(room.id);
    setRoomDraft({
      roomType: room.roomType || "double",
      category: room.category || "male_only",
      hotel: room.hotel || hotelOptions[0] || "",
    });
    setRoomModal({ open: true, mode: "edit", roomId: room.id });
  }, [hotelOptions]);

  const saveRoomEdit = React.useCallback(() => {
    const capacity = getRoomingCapacity(roomDraft.roomType);
    if (roomModal.mode === "create") {
      const draftRoom = {
        id: createRoomId(),
        order: rooms.length,
        roomNumber: getNextRoomNumber(),
        roomType: roomDraft.roomType,
        category: roomDraft.category,
        hotel: roomDraft.hotel || hotelOptions[0] || "",
        capacity,
        occupantIds: [],
        locked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const position = findFreePositionForRoom(draftRoom, roomCreatePosition);
      setRooms((prev) => [...prev, { ...draftRoom, x: position.x, y: position.y }]);
      setSelectedRoomId(draftRoom.id);
      setRoomModal({ open: false, mode: "edit", roomId: null });
      markDirty();
      onToast?.(t.roomingRoomAdded || "تمت إضافة الغرفة", "success");
      return;
    }

    const room = rooms.find((item) => item.id === roomModal.roomId);
    if (!room) return;
    const kept = [];
    const removed = [];
    (room.occupantIds || []).forEach((clientId) => {
      const client = clientsById[clientId];
      if (!client) return;
      const nextRoom = { ...room, ...roomDraft, capacity, occupantIds: kept };
      const reason = getCompatibilityReason(client, nextRoom);
      if (reason || kept.length >= capacity) removed.push({ clientId, reason: reason || t.roomingCapacityExceeded || "تجاوز سعة الغرفة" });
      else kept.push(clientId);
    });
    setRooms((prev) => prev.map((item) => item.id === room.id ? {
      ...item,
      ...roomDraft,
      capacity,
      occupantIds: kept,
    } : item));
    if (removed.length) {
      setUnassigned((prev) => [...prev, ...removed]);
      if (roomDraft.category === "male_only") onToast?.(t.roomingMovedIncompatibleWomen || "تم نقل المعتمرات غير المتوافقات إلى غير المدرجين", "info");
      else if (roomDraft.category === "female_only") onToast?.(t.roomingMovedIncompatibleMen || "تم نقل المعتمرين غير المتوافقين إلى غير المدرجين", "info");
      else onToast?.(t.roomingMovedIncompatible || "تم نقل المعتمرين غير المتوافقين إلى غير المدرجين", "info");
    }
    setRoomModal({ open: false, mode: "edit", roomId: null });
    markDirty();
  }, [rooms, roomModal.mode, roomModal.roomId, roomDraft, hotelOptions, getNextRoomNumber, findFreePositionForRoom, roomCreatePosition, clientsById, getCompatibilityReason, markDirty, onToast]);

  const deleteRoom = React.useCallback((roomId) => {
    const room = rooms.find((item) => item.id === roomId);
    if (!room) return;
    setRooms((prev) => prev.filter((item) => item.id !== roomId));
    setUnassigned((prev) => [
      ...prev,
      ...(room.occupantIds || []).map((clientId) => ({ clientId, reason: "" })),
    ]);
    setSelectedRoomId((current) => current === roomId ? null : current);
    markDirty();
  }, [rooms, markDirty]);

  const copyRoom = React.useCallback((roomId) => {
    const room = rooms.find((item) => item.id === roomId);
    if (!room) return;
    const draftRoom = {
      ...room,
      id: createRoomId(),
      order: rooms.length,
      roomNumber: getNextRoomNumber(),
      occupantIds: [],
      locked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const preferred = {
      x: Number(room.x || 0) + ROOMING_NODE_WIDTH + ROOMING_NODE_MIN_GAP,
      y: Number(room.y || 0),
    };
    const position = findFreePositionForRoom(draftRoom, preferred);
    setRooms((prev) => [...prev, { ...draftRoom, x: position.x, y: position.y }]);
    setSelectedRoomId(draftRoom.id);
    markDirty();
    onToast?.(t.roomingRoomCopied || "تم نسخ الغرفة بدون المعتمرين", "success");
  }, [rooms, getNextRoomNumber, findFreePositionForRoom, markDirty, onToast]);

  const toggleRoomLock = React.useCallback((roomId) => {
    setRooms((prev) => prev.map((room) => room.id === roomId
      ? { ...room, locked: !room.locked, updatedAt: new Date().toISOString() }
      : room));
    markDirty();
  }, [markDirty]);

  const removeClientFromRoom = React.useCallback((roomId, clientId) => {
    setRooms((prev) => prev.map((room) => room.id === roomId
      ? { ...room, occupantIds: (room.occupantIds || []).filter((id) => id !== clientId) }
      : room));
    setUnassigned((prev) => [...prev, { clientId, reason: "" }]);
    markDirty();
  }, [markDirty]);

  const insertClientIntoRoom = React.useCallback((roomId, clientId, notify = true) => {
    const room = rooms.find((item) => item.id === roomId);
    const client = clientsById[clientId];
    if (!room || !client) return false;
    const reason = getCompatibilityReason(client, room);
    if (reason) {
      if (notify) onToast?.(reason, "error");
      return false;
    }
    setRooms((prev) => prev.map((item) => {
      if (item.id !== room.id) return item;
      const occupantIds = item.occupantIds || [];
      if (occupantIds.includes(clientId)) return item;
      return { ...item, occupantIds: [...occupantIds, clientId] };
    }));
    setUnassigned((prev) => prev.filter((item) => item.clientId !== clientId));
    setSelectedRoomId(room.id);
    markDirty();
    return true;
  }, [rooms, clientsById, getCompatibilityReason, markDirty, onToast]);

  const addSelectedPilgrimsToRoom = React.useCallback(() => {
    const room = rooms.find((item) => item.id === selectedRoomId);
    if (!room || !selectedPilgrimIds.length) return;
    const remaining = Math.max(0, (room.capacity || getRoomingCapacity(room.roomType)) - (room.occupantIds || []).length);
    const selected = selectedPilgrimIds
      .filter((clientId) => {
        const client = clientsById[clientId];
        return client && !getCompatibilityReason(client, room);
      })
      .slice(0, remaining);
    if (!selected.length) {
      onToast?.(t.noCompatiblePilgrims || "لا يوجد معتمرون مناسبون لهذه الغرفة", "error");
      return;
    }
    setRooms((prev) => prev.map((item) => item.id === room.id
      ? { ...item, occupantIds: [...(item.occupantIds || []), ...selected] }
      : item));
    setUnassigned((prev) => prev.filter((item) => !selected.includes(item.clientId)));
    setSelectedRoomId(room.id);
    markDirty();
    setSelectedPilgrimIds([]);
    setPickerOpen(false);
  }, [rooms, selectedRoomId, selectedPilgrimIds, clientsById, getCompatibilityReason, markDirty, onToast]);

  const autoArrangeRooms = React.useCallback(() => {
    if (rooms.length && !window.confirm(t.roomingAutoArrangeConfirm || "سيتم إعادة ترتيب الغرف تلقائيًا. هل تريد المتابعة؟")) return;
    setRooms((prev) => autoLayoutRoomNodes(prev));
    markDirty();
    window.requestAnimationFrame(() => flowRef.current?.fitView?.({ padding: 0.18, duration: 400 }));
  }, [rooms.length, markDirty]);

  const openPickerForRoom = React.useCallback((roomId) => {
    setSelectedRoomId(roomId);
    setSelectedPilgrimIds([]);
    setPickerOpen(true);
  }, []);

  const openEditRoomById = React.useCallback((roomId) => {
    const room = rooms.find((item) => item.id === roomId);
    if (room) openEditRoom(room);
  }, [rooms, openEditRoom]);

  const roomFlowNodes = React.useMemo(() => visibleRooms.map((room) => ({
    id: room.id,
    type: "room",
    position: { x: Number(room.x) || 0, y: Number(room.y) || 0 },
    data: {
      room,
      clientsById,
      draggingClientId,
      draggingClient: draggingClientId ? clientsById[draggingClientId] : null,
      dragInvalid: false,
      getDropReason: getCompatibilityReason,
      onDropClient: insertClientIntoRoom,
      onDragComplete: () => setDraggingClientId(null),
      onAdd: openPickerForRoom,
      onEdit: openEditRoomById,
      onCopy: copyRoom,
      onToggleLock: toggleRoomLock,
      onDelete: deleteRoom,
      onRemoveClient: removeClientFromRoom,
    },
    draggable: !room.locked,
    selected: room.id === selectedRoomId,
  })), [visibleRooms, clientsById, draggingClientId, getCompatibilityReason, insertClientIntoRoom, openPickerForRoom, openEditRoomById, copyRoom, toggleRoomLock, deleteRoom, removeClientFromRoom, selectedRoomId]);

  const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState([]);

  React.useEffect(() => {
    if (roomDragActiveRef.current) return;
    setFlowNodes(roomFlowNodes);
  }, [roomFlowNodes, setFlowNodes]);

  React.useEffect(() => {
    flowNodesRef.current = flowNodes;
  }, [flowNodes]);

  React.useEffect(() => {
    if (!selectedRoomId) return;
    if (!visibleRooms.some((room) => room.id === selectedRoomId)) {
      setSelectedRoomId(null);
    }
  }, [selectedRoomId, visibleRooms]);

  const setFlowNodeDragInvalid = React.useCallback((nodeId, invalid) => {
    if (dragInvalidRef.current.get(nodeId) === invalid) return;
    dragInvalidRef.current.set(nodeId, invalid);
    setFlowNodes((current) => current.map((node) => node.id === nodeId
      ? { ...node, data: { ...node.data, dragInvalid: invalid } }
      : node));
  }, [setFlowNodes]);

  const onNodeDragStart = React.useCallback((_event, node) => {
    if (node.data?.room?.locked) return;
    roomDragActiveRef.current = true;
    dragStartPositionRef.current.set(node.id, { ...node.position });
    const nodes = allCollisionNodes;
    const isValidStart = !hasRoomingNodeCollision(node, nodes, node.position);
    if (isValidStart) lastValidPositionRef.current.set(node.id, { ...node.position });
    setFlowNodeDragInvalid(node.id, false);
  }, [allCollisionNodes, setFlowNodeDragInvalid]);

  const onNodeDrag = React.useCallback((_event, node) => {
    const nodes = allCollisionNodes.map((item) => (
      item.id === node.id ? { ...item, position: node.position, measured: node.measured || item.measured } : item
    ));
    const currentNode = nodes.find((item) => item.id === node.id) || node;
    const invalid = hasRoomingNodeCollision(currentNode, nodes, node.position);
    if (!invalid) lastValidPositionRef.current.set(node.id, { ...node.position });
    setFlowNodeDragInvalid(node.id, invalid);
  }, [allCollisionNodes, setFlowNodeDragInvalid]);

  const onNodeDragStop = React.useCallback((_event, node) => {
    const nodes = allCollisionNodes.map((item) => (
      item.id === node.id ? { ...item, position: node.position, measured: node.measured || item.measured } : item
    ));
    const currentNode = nodes.find((item) => item.id === node.id) || node;
    const invalid = hasRoomingNodeCollision(currentNode, nodes, node.position);
    const fallbackPosition = lastValidPositionRef.current.get(node.id)
      || dragStartPositionRef.current.get(node.id)
      || node.position;
    const nextPosition = invalid
      ? findNearestFreeRoomingPosition(currentNode, nodes, fallbackPosition)
      : node.position;
    roomDragActiveRef.current = false;
    dragInvalidRef.current.set(node.id, false);
    setFlowNodes((current) => current.map((item) => item.id === node.id
      ? { ...item, position: nextPosition, data: { ...item.data, dragInvalid: false } }
      : item));
    setRooms((prev) => prev.map((room) => room.id === node.id ? {
      ...room,
      x: nextPosition.x,
      y: nextPosition.y,
    } : room));
    lastValidPositionRef.current.set(node.id, { ...nextPosition });
    markDirty();
    if (invalid) onToast?.(t.roomingOverlapFixed || "تم منع تداخل الغرف وإرجاع البطاقة إلى موضع صالح", "info");
  }, [allCollisionNodes, markDirty, onToast, setFlowNodes, t]);

  const openCanvasContextMenu = React.useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const position = flowRef.current?.screenToFlowPosition
      ? flowRef.current.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      : { x: 0, y: 0 };
    setCanvasMenu({
      open: true,
      x: event.clientX,
      y: event.clientY,
      position,
    });
  }, []);

  const closeCanvasContextMenu = React.useCallback(() => {
    setCanvasMenu((current) => ({ ...current, open: false }));
  }, []);

  const fitView = React.useCallback(() => {
    flowRef.current?.fitView?.({ padding: 0.18, duration: 450 });
  }, []);

  const applyFlowZoom = React.useCallback((nextZoom) => {
    setZoom(nextZoom);
    flowRef.current?.zoomTo?.(nextZoom / 100, { duration: 250 });
  }, []);

  const exportExcel = React.useCallback(async () => {
    const XLSX = await import("xlsx");
    const rows = [["hotel", "room type", "category", "room", "client name", "gender"]];
    rooms.forEach((room) => {
      (room.occupantIds || []).forEach((clientId) => {
        const client = clientsById[clientId];
        rows.push([
          room.hotel || "",
          getLocalizedRoomTypeLabel(room.roomType),
          getLocalizedCategoryLabel(room.category),
          room.roomNumber || "",
          client ? getClientDisplayName(client) : "",
          client?.gender === "male" ? t.male : client?.gender === "female" ? t.female : "",
        ]);
      });
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "rooming");
    XLSX.writeFile(wb, `rooming-canvas-${city}-${slugifyFilePart(program.name)}.xlsx`);
  }, [rooms, clientsById, city, program.name, getLocalizedRoomTypeLabel, getLocalizedCategoryLabel, t]);

  const printCanvas = React.useCallback(() => {
    const totalRooms = rooms.length;
    const totalAssigned = rooms.reduce((sum, room) => sum + (room.occupantIds || []).length, 0);
    const cityLabel = city === "makkah" ? (t.makkah || "مكة") : (t.madinah || "المدينة");
    const period = [program.departure, program.returnDate].filter(Boolean).join(" - ") || "—";
    const sortedRooms = rooms.slice().sort((a, b) => {
      const hotel = String(a.hotel || "").localeCompare(String(b.hotel || ""), "ar");
      if (hotel) return hotel;
      const type = String(a.roomType || "").localeCompare(String(b.roomType || ""), "ar");
      if (type) return type;
      return String(a.roomNumber || "").localeCompare(String(b.roomNumber || ""), "ar", { numeric: true });
    });
    const roomsByHotel = sortedRooms.reduce((map, room) => {
      const hotel = room.hotel || (t.roomingMissingHotel || "فندق غير محدد");
      if (!map.has(hotel)) map.set(hotel, []);
      map.get(hotel).push(room);
      return map;
    }, new Map());
    const sections = Array.from(roomsByHotel.entries()).map(([hotel, hotelRooms]) => {
      const assigned = hotelRooms.reduce((sum, room) => sum + (room.occupantIds || []).length, 0);
      return `
        <section class="hotel-section">
          <div class="hotel-title">
            <h2>${escapeHtml(hotel)}</h2>
            <span>${hotelRooms.length} ${t.roomingRoomsUnit || "غرف"} · ${assigned} ${t.pilgrimUnit || "معتمر"}</span>
          </div>
          <div class="rooms-grid">
            ${hotelRooms.map((room) => {
              const occupants = room.occupantIds || [];
              const capacity = Math.max(Number(room.capacity) || getRoomingCapacity(room.roomType), occupants.length || 1);
              const category = room.category || "male_only";
              const names = occupants.map((clientId, index) => {
                const client = clientsById[clientId];
                const source = getClientRegistrationSource(client);
                const label = client ? `${getClientDisplayName(client)}${source ? ` · ${source}` : ""}` : "—";
                return `<li><span>${index + 1}</span><b>${escapeHtml(label)}</b></li>`;
              }).join("") || `<li class="empty"><span>0</span><b>${escapeHtml(t.noPilgrims || "بدون معتمرين")}</b></li>`;
              return `
                <article class="room-card ${escapeHtml(category)}">
                  <div class="category-line">
                    <span class="category-badge">${escapeHtml(getLocalizedCategoryLabel(category))}</span>
                  </div>
                  <div class="room-meta">
                    <strong>${escapeHtml(getLocalizedRoomTypeLabel(room.roomType))}</strong>
                    <span class="occupancy">${occupants.length}/${capacity}</span>
                  </div>
                  <div class="hotel-name">${escapeHtml(room.hotel || hotel)}</div>
                  <ol>${names}</ol>
                </article>
              `;
            }).join("")}
          </div>
        </section>
      `;
    }).join("");
    const win = window.open("", "_blank");
    if (!win) return;
    const printDir = lang === "ar" ? "rtl" : "ltr";
    win.document.write(`<!doctype html><html dir="${printDir}"><head><meta charset="utf-8"><title>${escapeHtml(program.name)}</title>
      <style>
        @page{size:A4 landscape;margin:7mm 8mm}
        *{box-sizing:border-box}
        html,body{background:#fff !important;background-color:#fff !important;margin:0;overflow-x:hidden}
        body{font-family:Arial,"Tahoma",sans-serif;color:#0f172a;font-size:10.5px;line-height:1.25}
        .page{width:100%;margin:0 auto;padding:0 4mm 2mm;overflow:hidden;background:transparent !important;border:0 !important;outline:0 !important;box-shadow:none !important}
        .hero{position:relative;text-align:center;padding:3px 60mm 3px 18mm;margin-bottom:2px;min-height:29mm}
        .agency-brand{position:absolute;inset-inline-start:0;top:0;display:flex;align-items:center;justify-content:flex-start;gap:7px;width:58mm;text-align:start}
        .agency-brand img{display:block;width:22mm;height:22mm;object-fit:contain;flex:0 0 auto}
        .agency-copy{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;min-width:0}
        .agency-copy strong{display:block;color:#0f5aa6;font-size:16px;line-height:1.05;font-weight:900;white-space:nowrap}
        .agency-copy small{display:block;color:#a9472d;font-size:8.5px;line-height:1.2;font-weight:800;white-space:nowrap;margin-top:2px}
        h1{font-size:34px;line-height:1;margin:0 0 5px;font-weight:900;color:#0d1728;letter-spacing:.5px}
        .program-name{font-size:14px;color:#9a7418;font-weight:900;margin:0}
        .summary{display:grid;grid-template-columns:1fr 1.35fr 1fr 1fr;gap:7px;margin:2px 0 8px}
        .summary-card{height:14.5mm;border:1px solid #d9dce2;border-radius:9px;background:#fff;padding:4px 8px;display:flex;align-items:center;justify-content:center;text-align:center;box-shadow:none}
        .summary-card span{display:block;color:#464b55;font-size:9px;font-weight:800;margin-bottom:2px}
        .summary-card b{display:block;color:#0f172a;font-size:10.5px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .hotel-section{margin:0 0 8px;break-inside:auto;page-break-inside:auto;background:transparent;border:0;outline:0;box-shadow:none}
        .hotel-section::before,.hotel-section::after{content:none !important;display:none !important}
        .hotel-title{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;margin:2px 0 8px;padding:3px 0;break-after:avoid;page-break-after:avoid;color:#101827;border-top:1.5px solid #c79b3c;border-bottom:1.5px solid #c79b3c}
        .hotel-title::before,.hotel-title::after{content:"";height:1.5px;background:#c79b3c;flex:1}
        .hotel-title::after{background:#c79b3c}
        .hotel-title h2{font-size:19px;line-height:1;margin:0;font-weight:900;color:#101827}
        .hotel-title h2::before,.hotel-title h2::after{content:"";display:inline-block;width:14px;height:7px;border-top:2px solid #c79b3c;margin:0 7px;transform:skewX(-28deg)}
        .hotel-title span{display:none}
        .rooms-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px 8px;align-items:start;background:transparent;border:0;outline:0;box-shadow:none;padding:0}
        .rooms-grid::before,.rooms-grid::after{content:none !important;display:none !important}
        .room-card{position:relative;break-inside:avoid;page-break-inside:avoid;border:1px solid #d7dbe2;border-radius:9px;padding:7px 8px;background:#fff;min-height:36mm;box-shadow:none}
        .room-card::before{content:"";position:absolute;inset-inline:0;top:0;height:3px;border-radius:9px 9px 0 0;background:#b99235}
        .room-card.male_only::before{background:#2c5f93}
        .room-card.female_only::before{background:#ad5c7a}
        .room-card.family::before{background:#a88a2c}
        .category-line{display:flex;justify-content:center;margin:1px 0 5px}
        .category-badge{display:inline-flex;align-items:center;justify-content:center;min-width:48px;text-align:center;font-size:8.5px;font-weight:900;color:#263142;background:#e8eef6;border:1px solid #dbe4ef;border-radius:5px;padding:2px 8px}
        .female_only .category-badge{background:#f1dfe7;border-color:#ead1dc}
        .family .category-badge{background:#eadbb4;border-color:#dfcb92}
        .room-meta{display:flex;align-items:center;justify-content:center;gap:10px;padding:0 0 5px;margin-bottom:3px}
        .room-meta strong{display:block;font-size:14px;font-weight:900;color:#0f172a}
        .occupancy{font-size:10px;font-weight:900;color:#0f172a;border:0;background:transparent;border-radius:0;padding:0;white-space:nowrap}
        .hotel-name{border-top:1px dashed #d2d6dd;border-bottom:1px solid #c7cbd2;color:#a77d22;text-align:center;font-size:9.5px;font-weight:900;padding:4px 0;margin:0 0 5px}
        ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
        li{display:grid;grid-template-columns:13px 1fr;gap:5px;align-items:center;padding:0 2px;min-height:14px;border:0;background:transparent}
        li span{color:#111827;font-size:9px;font-weight:900;text-align:center}
        li b{font-size:10.5px;font-weight:700;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        li.empty b{color:#9ca3af;font-weight:700}
        .print-footer{position:fixed;left:0;right:0;bottom:0;color:#0f172a;font-size:9px;display:flex;justify-content:center;gap:18px;align-items:center}
        .print-footer::before,.print-footer::after{content:"";width:38mm;height:1px;background:linear-gradient(90deg,transparent,#d5ad5a)}
        .print-footer::after{background:linear-gradient(90deg,#d5ad5a,transparent)}
        .print-footer .page-no::after{content:"${escapeHtml(t.page || "صفحة")} " counter(page)}
        @media print{
          html,body,.page{overflow:hidden;background:#fff !important;background-color:#fff !important}
          .hero,.summary,.hotel-section,.rooms-grid,.print-footer{background:transparent !important;background-color:transparent !important;box-shadow:none !important;border-image:none !important;outline:none !important}
          .hotel-section,.rooms-grid{border:none !important}
          .summary-card,.room-card{box-shadow:none !important;filter:none !important}
          .rooms-grid{grid-template-columns:repeat(5,1fr)}
          .room-card{break-inside:avoid;page-break-inside:avoid}
          .hotel-title{break-after:avoid;page-break-after:avoid}
          .report-header{break-after:avoid;page-break-after:avoid}
        }
      </style></head><body><main class="page">
        <header>
          <div class="hero">
            <div class="agency-brand">
              <img src="${tiznitVoyagesLogo}" alt="تيزنيت أسفار - TIZNIT VOYAGES" />
              <div class="agency-copy">
                <strong>تيزنيت أسفار</strong>
                <small>تجربة أعوام منذ 1975</small>
              </div>
            </div>
            <h1>${escapeHtml(t.roomingPrintTitle || "ورقة التسكين")}</h1>
            <p class="program-name">${escapeHtml(program.name || "—")}</p>
          </div>
          <div class="summary">
            <div class="summary-card"><div><span>${escapeHtml(t.city)}:</span><b>${escapeHtml(cityLabel)}</b></div></div>
            <div class="summary-card"><div><span>${escapeHtml(t.period || "الفترة")}:</span><b>${escapeHtml(period)}</b></div></div>
            <div class="summary-card"><div><span>${escapeHtml(t.totalClients)}:</span><b>${escapeHtml(String(totalAssigned))}/${escapeHtml(String(clients.length))}</b></div></div>
            <div class="summary-card"><div><span>${escapeHtml(t.roomingRoomsCount || "عدد الغرف")}:</span><b>${escapeHtml(String(totalRooms))}</b></div></div>
          </div>
        </header>
        ${sections || `<p>${escapeHtml(t.noRoomingRooms || "لا توجد غرف للتسكين.")}</p>`}
        <footer class="print-footer"><span class="page-no"></span></footer>
      </main><script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
  }, [groupedRooms, rooms, clientsById, program, city, clients.length, agency, lang, t, getLocalizedRoomTypeLabel, getLocalizedCategoryLabel]);

  const selectedRoom = visibleRooms.find((room) => room.id === selectedRoomId) || null;
  const canvasHeight = fullscreen ? "calc(100vh - 88px)" : "min(72vh, 720px)";

  return (
    <div style={fullscreen ? { position: "fixed", inset: 0, zIndex: 90, background: "#f3f5f8" } : undefined}>
      <style>{`
        .rooming-flow-node {
          transition: box-shadow .12s ease, border-color .12s ease, background .12s ease;
          cursor: grab;
          will-change: box-shadow, border-color, background;
        }
        .rooming-flow-node:hover {
          box-shadow: 0 16px 34px rgba(15,23,42,.16) !important;
        }
        .react-flow__node.dragging .rooming-flow-node {
          transition: none;
          cursor: grabbing;
          box-shadow: 0 20px 46px rgba(15,23,42,.20) !important;
        }
        .rooming-flow-canvas .react-flow__controls,
        .rooming-flow-canvas .react-flow__minimap {
          z-index: 18 !important;
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
          filter: drop-shadow(0 12px 22px rgba(15,23,42,.14));
        }
        .rooming-flow-canvas .react-flow__controls {
          display: flex !important;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(148,163,184,.28);
          border-radius: 12px;
          background: #fff;
        }
        .rooming-flow-canvas .react-flow__controls-button {
          width: 34px;
          height: 34px;
          border-bottom: 1px solid rgba(148,163,184,.16);
          background: #fff;
          color: #0f172a;
        }
        .rooming-flow-canvas .react-flow__controls-button:hover {
          background: #f8fafc;
        }
        .rooming-unassigned-card {
          transition: border-color .16s ease, background .16s ease, box-shadow .16s ease, transform .16s ease;
          cursor: grab;
        }
        .rooming-unassigned-card:hover {
          border-color: rgba(37,99,235,.32) !important;
          background: #fff !important;
          box-shadow: 0 10px 24px rgba(15,23,42,.10);
          transform: translateY(-1px);
        }
        .rooming-unassigned-card:active {
          cursor: grabbing;
        }
        .rooming-menu-item:hover {
          background: rgba(37,99,235,.08) !important;
        }
      `}</style>
      <GlassCard gold style={{
        padding: 12,
        marginBottom: fullscreen ? 0 : 24,
        height: fullscreen ? "100vh" : "auto",
        width: fullscreen ? "100vw" : "100%",
        display: "flex",
        flexDirection: "column",
        background: "#f3f5f8",
        border: "1px solid rgba(203,213,225,.85)",
        overflow: "hidden",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          <div>
            <p style={{ color: "#0f172a", fontWeight: 900, fontSize: 16 }}>{t.roomingDesigner || "مصمم التسكين الذكي"}</p>
            <p style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>
              {program.name || "—"} • {roomingCityLabels[city]} • {clients.length} {t.pilgrimUnit || "معتمر"}
              {dirty ? ` • ${t.unsavedChanges || "تغييرات غير محفوظة"}` : savedAt ? ` • ${tr("lastSaved", { time: savedAt.toLocaleTimeString("ar-MA") }) || `آخر حفظ ${savedAt.toLocaleTimeString("ar-MA")}`}` : ""}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", flex: "1 1 280px", justifyContent: "center" }}>
            {Object.entries(roomingCityLabels).map(([key, label]) => {
              const progress = roomingProgress[key] || { assigned: 0, total: clients.length, percent: 0 };
              return (
                <div key={key} style={{
                  minWidth: 132,
                  border: "1px solid rgba(148,163,184,.20)",
                  background: "#fff",
                  borderRadius: 999,
                  padding: "5px 8px",
                  boxShadow: "0 6px 16px rgba(15,23,42,.045)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, color: "#334155", fontSize: 10, fontWeight: 900, whiteSpace: "nowrap" }}>
                    <span>{label}</span>
                    <span>{progress.assigned}/{progress.total} · {progress.percent}%</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 999, background: "#e2e8f0", overflow: "hidden", marginTop: 4 }}>
                    <div style={{ width: `${Math.min(100, progress.percent)}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#2563eb,#16a34a)" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 10, background: "#fff", border: "1px solid rgba(148,163,184,.22)" }}>
            {Object.entries(roomingCityLabels).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => switchCity(key)}
                style={{
                  border: 0,
                  background: city === key ? "#e8eefc" : "transparent",
                  color: city === key ? "#1d4ed8" : "#475569",
                  borderRadius: 8,
                  padding: "7px 10px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "'Cairo',sans-serif",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {!toolbarCollapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: 8, marginBottom: 10, borderRadius: 12, background: "#fff", border: "1px solid rgba(148,163,184,.2)" }}>
            <RoomingToolbarButton
              title={t.hideToolbar || "إخفاء الأدوات"}
              onClick={() => setToolbarCollapsed(true)}
              icon={<ChevronUp size={15} />}
            />
          <Button variant="primary" icon="refresh" onClick={generateRooms}>{t.roomingGenerateRooms || "توليد الغرف"}</Button>
          <RoomingToolbarButton title={t.roomingAutoArrange || "ترتيب تلقائي"} onClick={autoArrangeRooms} icon={<LayoutGrid size={15} />} />
          <RoomingToolbarButton title={t.roomingSave || "حفظ"} onClick={() => saveCanvas(true)} active={dirty} icon={<AppIcon name="save" size={15} />} />
          <RoomingToolbarButton title={t.roomingPrint || "طباعة"} onClick={printCanvas} icon={<AppIcon name="print" size={15} />} />
          <RoomingToolbarButton title={t.roomingExportExcel || "تصدير Excel"} onClick={exportExcel} icon={<FileSpreadsheet size={15} />} />
          <div onPointerDown={(event) => event.stopPropagation()} style={{ position: "relative" }}>
            <RoomingToolbarButton
              title={t.roomingRoomFilter || "فلترة الغرف"}
              onClick={() => {
                setRoomNeedsOpen(false);
                setRoomFilterOpen((open) => !open);
              }}
              active={roomOccupancyFilter !== "all" || roomFilterOpen}
              icon={<Filter size={15} />}
            />
            <RoomingMenu open={roomFilterOpen} align="start" width={190}>
              {roomOccupancyOptions.map((option) => (
                <RoomingMenuItem
                  key={option.value}
                  label={option.label}
                  active={roomOccupancyFilter === option.value}
                  icon={<span style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: roomOccupancyFilter === option.value ? "#2563eb" : "#cbd5e1",
                    flexShrink: 0,
                  }} />}
                  onClick={() => {
                    setRoomOccupancyFilter(option.value);
                    setRoomFilterOpen(false);
                  }}
                />
              ))}
            </RoomingMenu>
          </div>
          <div onPointerDown={(event) => event.stopPropagation()} style={{ position: "relative" }}>
            <RoomingToolbarButton
              title={t.roomNeeds || "احتياج الغرف"}
              onClick={() => {
                setRoomFilterOpen(false);
                setRoomNeedsOpen((open) => !open);
              }}
              active={roomNeedsOpen}
              icon={<LayoutGrid size={15} />}
            >
              {roomNeeds.totalRooms ? `${t.roomNeeds || "احتياج الغرف"} · ${roomNeeds.totalRooms}` : (t.roomNeeds || "احتياج الغرف")}
            </RoomingToolbarButton>
            <RoomingMenu open={roomNeedsOpen} align="start" width={260}>
              <div style={{ padding: "6px 8px 8px" }}>
                <p style={{ color: "#0f172a", fontSize: 12, fontWeight: 900, marginBottom: 8 }}>{t.roomNeeds || "احتياج الغرف"}</p>
                {!roomNeeds.details.length ? (
                  <p style={{ color: "#64748b", fontSize: 11 }}>{t.noDetails || "بدون تفاصيل"}</p>
                ) : (
                  <div style={{ display: "grid", gap: 7 }}>
                    {roomNeeds.details.map((item) => (
                      <div key={item.type} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", color: "#334155", fontSize: 11, fontWeight: 800 }}>
                        <span>{item.label}</span>
                        <span style={{ color: "#0f172a" }}>
                          {tr("roomNeedsLine", { rooms: item.rooms, pilgrims: item.pilgrims }) || `${item.rooms} غرف / ${item.pilgrims} معتمرين`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </RoomingMenu>
          </div>
          <select
            value={zoom}
            onChange={(event) => applyFlowZoom(Number(event.target.value))}
            title={t.roomingZoom || "التكبير"}
            style={{ height: 34, borderRadius: 8, border: "1px solid rgba(148,163,184,.24)", background: "#fff", color: "#334155", padding: "0 10px", fontSize: 12, fontWeight: 700, fontFamily: "'Cairo',sans-serif" }}
          >
            {[75, 100, 125].map((value) => <option key={value} value={value}>{value}%</option>)}
          </select>
          <RoomingToolbarButton title={t.roomingFit || "Fit"} onClick={fitView} icon={<Scan size={15} />} />
          <RoomingToolbarButton title={panelOpen ? (t.roomingHideUnassigned || "إخفاء غير المسكنين") : (t.roomingShowUnassigned || "إظهار غير المسكنين")} onClick={() => setPanelOpen((open) => !open)} icon={panelOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />} active={panelOpen} />
          <RoomingToolbarButton title={fullscreen ? (t.roomingExitFullscreen || "الخروج من ملء الشاشة") : (t.roomingFullscreen || "ملء الشاشة")} onClick={() => setFullscreen((open) => !open)} icon={fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />} active={fullscreen} />
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: panelOpen ? "minmax(0,1fr) 290px" : "1fr", gap: 10, minHeight: 0, height: canvasHeight }}>
          <div style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 14,
            border: "1px solid rgba(148,163,184,.25)",
            backgroundColor: "#fff",
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(148,163,184,.22) 1px, transparent 0)",
            backgroundSize: "22px 22px",
            boxShadow: "0 12px 28px rgba(15,23,42,.08)",
            minHeight: 0,
          }}>
            {toolbarCollapsed && (
              <div style={{
                position: "absolute",
                top: 12,
                insetInlineStart: 12,
                zIndex: 24,
              }}>
                <RoomingToolbarButton
                  title={t.showToolbar || "إظهار الأدوات"}
                  onClick={() => setToolbarCollapsed(false)}
                  active
                  icon={<ChevronDown size={15} />}
                  style={{
                    background: "rgba(255,255,255,.96)",
                    border: "1px solid rgba(148,163,184,.22)",
                    boxShadow: "0 10px 24px rgba(15,23,42,.12)",
                  }}
                />
              </div>
            )}
            {!rooms.length ? (
              <div
                onContextMenu={(event) => {
                  event.preventDefault();
                  const rect = event.currentTarget.getBoundingClientRect();
                  setCanvasMenu({
                    open: true,
                    x: event.clientX,
                    y: event.clientY,
                    position: {
                      x: Math.max(0, event.clientX - rect.left),
                      y: Math.max(0, event.clientY - rect.top),
                    },
                  });
                }}
                style={{ display: "grid", placeItems: "center", minHeight: "100%", padding: 30 }}
              >
                <div style={{ textAlign: "center", maxWidth: 420 }}>
                  <p style={{ color: "#0f172a", fontSize: 18, fontWeight: 900, marginBottom: 8 }}>{t.roomingStartTitle || "ابدأ بتوليد الغرف"}</p>
                  <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>{t.roomingStartDesc || "سيتم إنشاء بطاقات غرف ذكية من بيانات المعتمرين، مع إبقاء الحالات غير الآمنة في لوحة المراجعة."}</p>
                  <Button variant="primary" icon="refresh" onClick={generateRooms}>{t.roomingGenerateRooms || "توليد الغرف"}</Button>
                </div>
              </div>
            ) : (
              <>
                <ReactFlowProvider>
                  <RoomingFlowSurface
                    nodes={flowNodes}
                    onNodesChange={onFlowNodesChange}
                    selectedRoomId={selectedRoomId}
                    panelOpen={panelOpen}
                    onInit={(flow) => { flowRef.current = flow; }}
                    onNodeClick={(_event, node) => setSelectedRoomId(node.id)}
                    onNodeDragStart={onNodeDragStart}
                    onNodeDrag={onNodeDrag}
                    onNodeDragStop={onNodeDragStop}
                    onPaneContextMenu={openCanvasContextMenu}
                    onPaneClick={closeCanvasContextMenu}
                  />
                </ReactFlowProvider>
                {!visibleRooms.length && (
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    pointerEvents: "none",
                    zIndex: 5,
                  }}>
                    <div style={{
                      background: "rgba(255,255,255,.92)",
                      border: "1px solid rgba(148,163,184,.22)",
                      boxShadow: "0 18px 42px rgba(15,23,42,.12)",
                      borderRadius: 14,
                      padding: "16px 20px",
                      color: "#334155",
                      fontWeight: 800,
                      fontSize: 13,
                    }}>
                      {t.roomingNoRoomsForFilters || "لا توجد غرف مطابقة للفلاتر الحالية"}
                    </div>
                  </div>
                )}
              </>
            )}
            {canvasMenu.open && (
              <div
                onPointerDown={(event) => event.stopPropagation()}
                style={{
                  position: "fixed",
                  top: canvasMenu.y,
                  left: canvasMenu.x,
                  transform: "translate(-8px, 8px)",
                  width: 170,
                  background: "#fff",
                  border: "1px solid rgba(148,163,184,.22)",
                  borderRadius: 12,
                  boxShadow: "0 18px 42px rgba(15,23,42,.16)",
                  padding: 6,
                  zIndex: 120,
                }}
              >
                <RoomingMenuItem
                  label={t.addRoom || "إضافة غرفة"}
                  icon={<AppIcon name="plus" size={14} />}
                  onClick={() => {
                    closeCanvasContextMenu();
                    openCreateRoom(canvasMenu.position);
                  }}
                />
                <RoomingMenuItem
                  label={t.roomingAutoArrange || "ترتيب تلقائي"}
                  icon={<LayoutGrid size={14} />}
                  onClick={() => {
                    closeCanvasContextMenu();
                    autoArrangeRooms();
                  }}
                />
                <RoomingMenuItem
                  label={t.roomingFit || "ملاءمة العرض"}
                  icon={<Scan size={14} />}
                  onClick={() => {
                    closeCanvasContextMenu();
                    fitView();
                  }}
                />
              </div>
            )}
          </div>

          {panelOpen && (
            <aside style={{ background: "#fff", border: "1px solid rgba(148,163,184,.22)", borderRadius: 14, padding: 12, overflow: "auto", boxShadow: "0 12px 28px rgba(15,23,42,.08)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={{ color: "#0f172a", fontWeight: 900, fontSize: 13 }}>{t.unassignedReview || "غير مسكنين / يحتاجون مراجعة"}</p>
                <RoomingToolbarButton title={t.roomingHideUnassigned || "إخفاء"} onClick={() => setPanelOpen(false)} icon={<PanelRightClose size={14} />} style={{ minWidth: 28, height: 28 }} />
              </div>
              <div style={{ display: "grid", gap: 7, marginBottom: 10 }}>
                <Input label="" value={panelSearch} onChange={(event) => setPanelSearch(event.target.value)} placeholder={t.searchGeneral || "بحث"} />
                <Select label="" value={panelHotel} onChange={(event) => setPanelHotel(event.target.value)} options={[{ value: "all", label: t.allHotels || "كل الفنادق" }, ...hotelOptions.map((hotel) => ({ value: hotel, label: hotel }))]} />
                <Select label="" value={panelRoomType} onChange={(event) => setPanelRoomType(event.target.value)} options={[{ value: "all", label: t.allRooms || "كل الغرف" }, ...roomingRoomOptions.map((option) => ({ value: option.value, label: option.label }))]} />
              </div>
              {!filteredUnassigned.length ? (
                <p style={{ color: "#64748b", fontSize: 12 }}>{t.noUnassignedForFilters || "لا توجد حالات غير مسكنة ضمن الفلاتر الحالية."}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredUnassigned.map((item) => {
                    const client = clientsById[item.clientId];
                    const context = client ? getClientContext(client) : {};
                    const selectedRoomReason = client && selectedRoom ? getCompatibilityReason(client, selectedRoom) : "";
                    const canAddToSelected = Boolean(client && selectedRoom && !selectedRoomReason);
                    const displayReason = item.reason && item.reason !== "يحتاج مراجعة" ? item.reason : "";
                    return (
                      <div
                        key={item.clientId}
                        className="rooming-unassigned-card"
                        draggable={Boolean(client)}
                        onDragStart={(event) => {
                          if (!client) return;
                          setDraggingClientId(item.clientId);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("application/x-rukn-client-id", item.clientId);
                          event.dataTransfer.setData("text/plain", context.name || item.clientId);
                        }}
                        onDragEnd={() => setDraggingClientId(null)}
                        style={{ border: draggingClientId === item.clientId ? "1px solid rgba(37,99,235,.42)" : "1px solid rgba(148,163,184,.18)", background: draggingClientId === item.clientId ? "#eff6ff" : "#f8fafc", borderRadius: 10, padding: 9 }}
                      >
                        <strong style={{ display: "block", color: "#0f172a", fontSize: 12 }}>{context.name}</strong>
                        <span style={{ display: "block", color: "#64748b", fontSize: 11, marginTop: 3 }}>
                          {[context.registrationSource, context.roomTypeLabel, context.level || context.hotel].filter(Boolean).join(" • ") || (t.noDetails || "بدون تفاصيل")}
                        </span>
                        {displayReason && <span style={{ display: "block", color: "#b45309", fontSize: 11, marginTop: 3 }}>{displayReason}</span>}
                        {selectedRoom && (
                          <button
                            type="button"
                            disabled={!canAddToSelected}
                            onClick={() => {
                              if (!canAddToSelected) return;
                              insertClientIntoRoom(selectedRoom.id, item.clientId, true);
                            }}
                            style={{
                              marginTop: 8,
                              width: "100%",
                              border: "1px solid rgba(37,99,235,.18)",
                              background: canAddToSelected ? "#eff6ff" : "#eef2f7",
                              color: canAddToSelected ? "#1d4ed8" : "#94a3b8",
                              borderRadius: 8,
                              padding: "6px 8px",
                              fontSize: 11,
                              fontWeight: 800,
                              cursor: canAddToSelected ? "pointer" : "not-allowed",
                              fontFamily: "'Cairo',sans-serif",
                            }}
                          >
                            {canAddToSelected ? (t.addToSelectedRoom || "إضافة إلى الغرفة المحددة") : (selectedRoomReason || t.roomFull || "الغرفة ممتلئة")}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </aside>
          )}
        </div>

        <Modal open={roomModal.open} onClose={() => setRoomModal({ open: false, mode: "edit", roomId: null })} title={roomModal.mode === "create" ? (t.addRoom || "إضافة غرفة") : (t.editRoom || "تعديل الغرفة")} width={420}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Select label={t.hotel || "الفندق"} value={roomDraft.hotel} onChange={(event) => setRoomDraft((prev) => ({ ...prev, hotel: event.target.value }))} options={(hotelOptions.length ? hotelOptions : [roomDraft.hotel || ""]).map((hotel) => ({ value: hotel, label: hotel || t.noHotel || "غير محدد" }))} />
            <Select label={t.roomType} value={roomDraft.roomType} onChange={(event) => setRoomDraft((prev) => ({ ...prev, roomType: event.target.value }))} options={roomingRoomOptions.map((option) => ({ value: option.value, label: option.label }))} />
            <Select label={t.roomCategory || "تصنيف الغرفة"} value={roomDraft.category} onChange={(event) => setRoomDraft((prev) => ({ ...prev, category: event.target.value }))} options={roomingCategoryOptions.map((option) => ({ value: option.value, label: option.label }))} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Button variant="ghost" onClick={() => setRoomModal({ open: false, mode: "edit", roomId: null })}>{t.cancel}</Button>
              <Button onClick={saveRoomEdit}>{roomModal.mode === "create" ? (t.add || "إضافة") : t.save}</Button>
            </div>
          </div>
        </Modal>

        <Modal open={pickerOpen} onClose={() => { setPickerOpen(false); setSelectedPilgrimIds([]); }} title={t.addPilgrim || "إضافة معتمر"} width={560}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!compatibleUnassigned.length ? (
              <p style={{ color: "#64748b", fontSize: 12 }}>{t.noCompatiblePilgrims || "لا يوجد معتمرون مناسبون لهذه الغرفة"}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 330, overflow: "auto" }}>
                {compatibleUnassigned.map(({ client }) => {
                  const context = getClientContext(client);
                  const checked = selectedPilgrimIds.includes(client.id);
                  return (
                    <label key={client.id} style={{ display: "flex", gap: 10, padding: 10, borderRadius: 10, border: "1px solid rgba(148,163,184,.18)", background: checked ? "rgba(37,99,235,.07)" : "#f8fafc", cursor: "pointer" }}>
                      <input type="checkbox" checked={checked} onChange={(event) => setSelectedPilgrimIds((prev) => event.target.checked ? [...prev, client.id] : prev.filter((id) => id !== client.id))} />
                      <span>
                        <strong style={{ display: "block", color: "#0f172a", fontSize: 13 }}>{context.name}</strong>
                        <small style={{ color: "#64748b" }}>{[context.registrationSource, context.roomTypeLabel, context.level || context.hotel].filter(Boolean).join(" • ")}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Button variant="ghost" onClick={() => { setPickerOpen(false); setSelectedPilgrimIds([]); }}>{t.cancel}</Button>
              <Button disabled={!selectedPilgrimIds.length} onClick={addSelectedPilgrimsToRoom}>{t.insertSelected || "إدراج المحدد"}</Button>
            </div>
          </div>
        </Modal>
      </GlassCard>
    </div>
  );
}

function RoomingToolbarButton({
  title,
  icon,
  onClick,
  active = false,
  disabled = false,
  children,
  style,
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        minWidth: 34,
        height: 34,
        padding: children ? "0 10px" : 0,
        borderRadius: 8,
        border: `1px solid ${active ? "rgba(37,99,235,.32)" : "rgba(148,163,184,.28)"}`,
        background: active ? "rgba(37,99,235,.08)" : "#fff",
        color: active ? "#2563eb" : "#334155",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "background .15s ease, border-color .15s ease, color .15s ease",
        fontFamily: "'Cairo',sans-serif",
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

const RoomingFlowNode = React.memo(function RoomingFlowNode({ data, selected }) {
  const { t, lang } = useLang();
  const room = data.room;
  const accent = getRoomingCategoryAccent(room.category);
  const occupantIds = room.occupantIds || [];
  const capacity = Math.max(1, Number(room.capacity) || getRoomingCapacity(room.roomType));
  const isFull = occupantIds.length === capacity;
  const dropReason = data.draggingClient ? data.getDropReason(data.draggingClient, room) : "";
  const isDropTarget = Boolean(data.draggingClient);
  const canDrop = isDropTarget && !dropReason;
  const isInvalidPosition = Boolean(data.dragInvalid);
  const dropBorder = isInvalidPosition ? "#ef4444" : canDrop ? "#16a34a" : isDropTarget ? "#ef4444" : selected ? accent.border : "rgba(148,163,184,.32)";
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!menuOpen) return undefined;
    const handlePointerDown = () => setMenuOpen(false);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  return (
    <article
      className="rooming-flow-node"
      title={isInvalidPosition ? (t.invalidRoomOverlap || "لا يمكن وضع غرفة فوق غرفة أخرى") : isDropTarget ? (dropReason || t.canInsertPilgrimHere || "يمكن إدراج المعتمر هنا") : undefined}
      onContextMenu={(event) => event.stopPropagation()}
      onDragOver={(event) => {
        if (!data.draggingClient) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const clientId = event.dataTransfer.getData("application/x-rukn-client-id");
        if (clientId) data.onDropClient(room.id, clientId, true);
        data.onDragComplete?.();
      }}
      style={{
        width: 250,
        background: isInvalidPosition ? "#fff7f7" : canDrop ? "#f0fdf4" : isDropTarget ? "#fff7f7" : "#fff",
        border: `1px solid ${dropBorder}`,
        borderRight: `4px solid ${accent.border}`,
        borderRadius: 10,
        outline: isInvalidPosition ? "2px solid rgba(239,68,68,.28)" : "none",
        boxShadow: isInvalidPosition
          ? "0 18px 40px rgba(239,68,68,.20)"
          : canDrop
          ? "0 16px 36px rgba(22,163,74,.18)"
          : isDropTarget
            ? "0 16px 36px rgba(239,68,68,.16)"
            : selected ? "0 14px 30px rgba(37,99,235,.18)" : "0 8px 22px rgba(15,23,42,.10)",
        padding: 12,
        direction: "rtl",
        fontFamily: "'Cairo',sans-serif",
        cursor: room.locked ? "default" : "grab",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
        <span style={{ color: accent.text, background: accent.bg, borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 900 }}>
          {translateRoomCategory(room.category, lang) || getRoomingCategoryLabel(room.category)}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#0f172a", fontSize: 12, fontWeight: 900 }}>{occupantIds.length}/{capacity}</span>
          {isFull && (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              border: "1px solid rgba(22,163,74,.22)",
              background: "rgba(22,163,74,.08)",
              color: "#15803d",
              borderRadius: 999,
              padding: "2px 6px",
              fontSize: 9,
              fontWeight: 900,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: "#16a34a" }} />
              {t.roomingFullBadge || "مكتملة"}
            </span>
          )}
          {room.locked && <Lock size={13} color="#64748b" title={t.roomLocked || "الغرفة مقفلة"} />}
          <div
            className="nodrag"
            onPointerDown={(event) => event.stopPropagation()}
            style={{ position: "relative" }}
          >
            <button
              type="button"
              title={t.roomActions || "إجراءات الغرفة"}
              aria-label={t.roomActions || "إجراءات الغرفة"}
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((open) => !open);
              }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: "1px solid rgba(148,163,184,.24)",
                background: "#fff",
                color: "#475569",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <MoreHorizontal size={15} />
            </button>
            <RoomingMenu open={menuOpen} align="end" width={168}>
              <div onPointerDown={(event) => event.stopPropagation()}>
                <RoomingMenuItem
                  label={t.addPilgrim || "إضافة معتمر"}
                  icon={<UserPlus size={14} />}
                  onClick={() => {
                    data.onAdd(room.id);
                    setMenuOpen(false);
                  }}
                />
                <RoomingMenuItem
                  label={t.copyRoom || "نسخ الغرفة"}
                  icon={<Copy size={14} />}
                  onClick={() => {
                    data.onCopy(room.id);
                    setMenuOpen(false);
                  }}
                />
                <RoomingMenuItem
                  label={room.locked ? (t.unlockRoom || "فتح الغرفة") : (t.lockRoom || "قفل الغرفة")}
                  icon={room.locked ? <Unlock size={14} /> : <Lock size={14} />}
                  onClick={() => {
                    data.onToggleLock(room.id);
                    setMenuOpen(false);
                  }}
                />
                <RoomingMenuItem
                  label={t.editRoom || "تعديل الغرفة"}
                  icon={<Settings size={14} />}
                  onClick={() => {
                    data.onEdit(room.id);
                    setMenuOpen(false);
                  }}
                />
                <RoomingMenuItem
                  label={t.deleteRoom || "حذف الغرفة"}
                  destructive
                  icon={<Trash2 size={14} />}
                  onClick={() => {
                    data.onDelete(room.id);
                    setMenuOpen(false);
                  }}
                />
              </div>
            </RoomingMenu>
          </div>
        </div>
      </div>
      <p style={{ color: "#0f172a", fontSize: 13, fontWeight: 900, marginBottom: 4 }}>
        {translateRoomType(room.roomType, lang) || getRoomingRoomLabel(room.roomType)} • {t.room || "غرفة"} {room.roomNumber}
      </p>
      <p style={{ color: "#64748b", fontSize: 11, marginBottom: 10 }}>{room.hotel || t.roomingMissingHotel || "فندق غير محدد"}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, minHeight: 54 }}>
        {occupantIds.map((clientId) => {
          const client = data.clientsById[clientId];
          const source = getClientRegistrationSource(client);
          return (
            <div key={clientId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, color: "#111827", fontSize: 12, fontWeight: 700 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {client ? getClientDisplayName(client) : "—"}
                </span>
                {source && (
                  <span style={{
                    flexShrink: 0,
                    maxWidth: 72,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    border: "1px solid rgba(148,163,184,.24)",
                    background: "rgba(241,245,249,.7)",
                    color: "#64748b",
                    borderRadius: 999,
                    padding: "1px 6px",
                    fontSize: 9,
                    fontWeight: 800,
                  }}>
                    {source}
                  </span>
                )}
              </span>
              <button
                type="button"
                title={t.remove || "إزالة"}
                className="nodrag"
                onClick={(event) => {
                  event.stopPropagation();
                  data.onRemoveClient(room.id, clientId);
                }}
                style={{ border: 0, background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 12, flexShrink: 0 }}
              >
                {t.remove || "إزالة"}
              </button>
            </div>
          );
        })}
        {occupantIds.length < capacity && (
          <span style={{ color: "#94a3b8", fontSize: 12 }}>{t.emptySlot || "مكان شاغر"}</span>
        )}
      </div>
    </article>
  );
}, (prev, next) => (
  prev.selected === next.selected
  && prev.data.room === next.data.room
  && prev.data.clientsById === next.data.clientsById
  && prev.data.draggingClientId === next.data.draggingClientId
  && prev.data.dragInvalid === next.data.dragInvalid
  && prev.data.onAdd === next.data.onAdd
  && prev.data.onEdit === next.data.onEdit
  && prev.data.onCopy === next.data.onCopy
  && prev.data.onToggleLock === next.data.onToggleLock
  && prev.data.onDelete === next.data.onDelete
  && prev.data.onRemoveClient === next.data.onRemoveClient
  && prev.data.onDropClient === next.data.onDropClient
));

const roomingNodeTypes = { room: RoomingFlowNode };

function RoomingMenu({ open, children, align = "start", width = 220 }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        [align === "end" ? "insetInlineEnd" : "insetInlineStart"]: 0,
        width,
        background: "#fff",
        border: "1px solid rgba(148,163,184,.22)",
        borderRadius: 12,
        boxShadow: "0 18px 42px rgba(15,23,42,.16)",
        padding: 6,
        zIndex: 30,
      }}
    >
      {children}
    </div>
  );
}

function RoomingMenuItem({ label, onClick, icon, destructive = false, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rooming-menu-item"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 8,
        border: 0,
        borderRadius: 8,
        background: active ? "rgba(37,99,235,.08)" : "transparent",
        color: destructive ? "#b91c1c" : active ? "#1d4ed8" : "#334155",
        padding: "8px 9px",
        cursor: "pointer",
        textAlign: "start",
        fontFamily: "'Cairo',sans-serif",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function RoomingFlowSurface({
  nodes,
  onNodesChange,
  selectedRoomId,
  onNodeClick,
  onNodeDragStart,
  onNodeDrag,
  onNodeDragStop,
  onPaneContextMenu,
  onPaneClick,
  onInit,
  panelOpen,
}) {
  const flow = useReactFlow();

  React.useEffect(() => {
    onInit?.(flow);
  }, [flow, onInit]);

  return (
    <ReactFlow
      className="rooming-flow-canvas"
      nodes={nodes}
      edges={[]}
      nodeTypes={roomingNodeTypes}
      fitView
      fitViewOptions={{ padding: 0.18 }}
      minZoom={0.35}
      maxZoom={1.6}
      panOnDrag
      zoomOnScroll
      zoomOnPinch
      nodesDraggable
      onlyRenderVisibleElements
      nodeDragThreshold={2}
      nodesConnectable={false}
      elementsSelectable
      onNodeClick={onNodeClick}
      onNodesChange={onNodesChange}
      onNodeDragStart={onNodeDragStart}
      onNodeDrag={onNodeDrag}
      onNodeDragStop={onNodeDragStop}
      onPaneContextMenu={onPaneContextMenu}
      onPaneClick={onPaneClick}
      proOptions={{ hideAttribution: true }}
      style={{ width: "100%", height: "100%", background: "#fff" }}
    >
      <Background color="#d8dee8" gap={22} size={1.2} />
      <Controls position="bottom-left" showInteractive={false} />
      <MiniMap position="bottom-right" pannable zoomable nodeStrokeWidth={2} nodeColor="#dbeafe" maskColor="rgba(248,250,252,.72)" />
    </ReactFlow>
  );
}

function RoomingSheetWorkspace({ program, clients, packages, agency, onToast }) {
  const [city, setCity] = React.useState("makkah");
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = React.useState(false);
  const [borderMenuOpen, setBorderMenuOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCell, setSelectedCell] = React.useState({ x: 0, y: 0 });
  const [selectedRange, setSelectedRange] = React.useState([0, 0, 0, 0]);
  const [selectionUi, setSelectionUi] = React.useState({
    merged: false,
    bold: false,
    italic: false,
    align: "right",
    wrap: false,
  });
  const [zoom, setZoom] = React.useState(100);
  const [fontSize, setFontSize] = React.useState(13);
  const [viewportTick, setViewportTick] = React.useState(0);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [metaTick, setMetaTick] = React.useState(0);
  const [dirty, setDirty] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState(null);
  const [roomModal, setRoomModal] = React.useState({ open: false, mode: "create", roomId: null });
  const [roomDraft, setRoomDraft] = React.useState({
    roomNumber: "",
    roomType: "double",
    category: "male_only",
    hotel: "",
  });
  const [roomPickerState, setRoomPickerState] = React.useState({ open: false, roomId: null });
  const [selectedPilgrimIds, setSelectedPilgrimIds] = React.useState([]);
  const hostRef = React.useRef(null);
  const gridViewportRef = React.useRef(null);
  const sheetRef = React.useRef(null);
  const saveTimerRef = React.useRef(null);
  const metaRef = React.useRef(normalizeRoomingMeta({}));
  const insertClientsRef = React.useRef(null);
  const uninsertedClientsRef = React.useRef([]);
  const workspaceRef = React.useRef(null);
  const selectedCellRef = React.useRef({ x: 0, y: 0 });
  const selectedRangeRef = React.useRef([0, 0, 0, 0]);
  const viewportSizeRef = React.useRef({ width: 0, height: 0 });

  const storageKey = React.useMemo(
    () => `rukn_rooming_sheet_${program.id}_${city}`,
    [program.id, city]
  );

  const packageByLevel = React.useMemo(() => {
    const map = new Map();
    packages.forEach(pkg => map.set(pkg.level, pkg));
    return map;
  }, [packages]);
  const roomHotelOptions = React.useMemo(
    () => getProgramHotelsForCity(program, packages, city),
    [program, packages, city]
  );

  const readStoredSheet = React.useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return createRoomingHeaderSheet({ program, clients, city, agency });
      const parsed = JSON.parse(raw);
      return {
        version: parsed.version || 2,
        data: normalizeSheetData(parsed.data),
        style: parsed.style || {},
        mergeCells: parsed.mergeCells || {},
        meta: normalizeRoomingMeta(parsed.meta),
      };
    } catch {
      return createRoomingHeaderSheet({ program, clients, city, agency });
    }
  }, [storageKey, program, clients, city, agency]);

  const captureSheet = React.useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) return null;
    return {
      version: 2,
      data: normalizeSheetData(sheet.getData(false, false)),
      style: sheet.getStyle?.() || {},
      mergeCells: sheet.getMerge?.() || {},
      meta: normalizeRoomingMeta(metaRef.current),
      updatedAt: new Date().toISOString(),
    };
  }, []);

  const saveSheet = React.useCallback((notify = true) => {
    const payload = captureSheet();
    if (!payload) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
      setDirty(false);
      setSavedAt(new Date());
      if (notify) onToast?.("تم حفظ ورقة التسكين محليًا", "success");
    } catch {
      onToast?.("تعذر حفظ ورقة التسكين محليًا", "error");
    }
  }, [captureSheet, storageKey, onToast]);

  const scheduleSave = React.useCallback(() => {
    setDirty(true);
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => saveSheet(false), 900);
  }, [saveSheet]);

  const clearCellFormatting = React.useCallback((sheet, cell) => {
    if (!sheet || !cell) return;
    [
      "background-color",
      "color",
      "font-weight",
      "font-style",
      "text-align",
      "border",
      "border-top",
      "border-bottom",
      "border-left",
      "border-right",
    ].forEach(prop => sheet.setStyle(cell, prop, "", true));
  }, []);

  const normalizeSelectionRange = React.useCallback((rangeLike, fallback = selectedRangeRef.current) => {
    if (!Array.isArray(rangeLike) || rangeLike.length < 4) return fallback;
    const normalized = rangeLike.slice(0, 4).map((value) => Number(value));
    if (normalized.some((value) => !Number.isFinite(value) || value < 0)) return fallback;
    return normalized;
  }, []);

  const syncSelectionState = React.useCallback((rangeLike) => {
    const range = getRangeBounds(normalizeSelectionRange(rangeLike));
    const nextRange = [range.minX, range.minY, range.maxX, range.maxY];
    selectedRangeRef.current = nextRange;
    selectedCellRef.current = { x: range.minX, y: range.minY };
    setSelectedRange(nextRange);
    setSelectedCell({ x: range.minX, y: range.minY });

    const sheet = sheetRef.current;
    if (!sheet) return nextRange;
    const styleMap = sheet.getStyle?.() || {};
    const activeCell = getCellName(range.minX, range.minY);
    const styles = parseStyleValue(styleMap[activeCell]);
    const merges = sheet.getMerge?.() || {};
    const merged = Object.entries(merges).some(([cell, spans]) => {
      const coords = getCellCoords(cell);
      if (!coords) return false;
      const maxX = coords.x + Math.max(1, Number(spans?.[0]) || 1) - 1;
      const maxY = coords.y + Math.max(1, Number(spans?.[1]) || 1) - 1;
      return range.minX >= coords.x && range.minX <= maxX && range.minY >= coords.y && range.minY <= maxY;
    });
    setSelectionUi({
      merged,
      bold: String(styles["font-weight"] || "").includes("700") || String(styles["font-weight"] || "").includes("bold"),
      italic: String(styles["font-style"] || "").includes("italic"),
      align: styles["text-align"] || "right",
      wrap: String(styles["white-space"] || "").includes("pre-wrap"),
    });
    const nextFontSize = Number.parseInt(String(styles["font-size"] || ""), 10);
    if (Number.isFinite(nextFontSize)) setFontSize(nextFontSize);
    return nextRange;
  }, [normalizeSelectionRange]);

  const getCurrentSelection = React.useCallback(() => {
    return selectedRangeRef.current || [0, 0, 0, 0];
  }, []);

  const refreshSelectionFromSheet = React.useCallback(() => {
    const live = normalizeSelectionRange(sheetRef.current?.getSelection?.(), null);
    if (!live) return getCurrentSelection();
    return syncSelectionState(live);
  }, [getCurrentSelection, normalizeSelectionRange, syncSelectionState]);

  const getLiveSelection = React.useCallback(() => {
    return getCurrentSelection();
  }, [getCurrentSelection]);

  const rememberCellFromEvent = React.useCallback((event) => {
    const cell = event.target?.closest?.("td[data-x][data-y]");
    if (!cell) return;
    const x = Number(cell.getAttribute("data-x"));
    const y = Number(cell.getAttribute("data-y"));
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) return;
    syncSelectionState([x, y, x, y]);
  }, [syncSelectionState]);

  const getActiveCell = React.useCallback(() => {
    const range = getLiveSelection();
    return { x: range?.[0] ?? selectedCellRef.current.x, y: range?.[1] ?? selectedCellRef.current.y };
  }, [getLiveSelection]);

  const getActiveMerge = React.useCallback((rangeLike) => {
    const range = getRangeBounds(rangeLike || getLiveSelection());
    const merges = sheetRef.current?.getMerge?.() || {};
    return Object.entries(merges).find(([cell, spans]) => {
      const coords = getCellCoords(cell);
      if (!coords) return false;
      const maxX = coords.x + Math.max(1, Number(spans?.[0]) || 1) - 1;
      const maxY = coords.y + Math.max(1, Number(spans?.[1]) || 1) - 1;
      return range.minX >= coords.x && range.minX <= maxX && range.minY >= coords.y && range.minY <= maxY;
    }) || null;
  }, [getLiveSelection]);

  const applyFormattingToRange = React.useCallback((styleMap, rangeLike) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const range = rangeLike || getLiveSelection();
    const bounds = getRangeBounds(range);
    forEachCellInBounds(bounds, (_x, _y, cell) => {
      Object.entries(styleMap).forEach(([prop, value]) => {
        sheet.setStyle(cell, prop, value, true);
      });
    });
    scheduleSave();
    syncSelectionState(range);
  }, [getLiveSelection, scheduleSave, syncSelectionState]);

  const clearRangeFormatting = React.useCallback((rangeLike) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const range = rangeLike || getLiveSelection();
    const bounds = getRangeBounds(range);
    forEachCellInBounds(bounds, (_x, _y, cell) => clearCellFormatting(sheet, cell));
    scheduleSave();
    syncSelectionState(range);
  }, [getLiveSelection, clearCellFormatting, scheduleSave, syncSelectionState]);

  const applyBorder = React.useCallback((mode, rangeLike) => {
    const sheet = sheetRef.current;
    if (!sheet || !mode) return;
    const range = rangeLike || getLiveSelection();
    const bounds = getRangeBounds(range);
    const setBorder = (cell, side, value = ROOMING_BORDER) => {
      sheet.setStyle(cell, `border-${side}`, value, true);
    };
    forEachCellInBounds(bounds, (x, y, cell) => {
      if (mode === "remove") {
        ["top", "bottom", "left", "right"].forEach(side => setBorder(cell, side, "none"));
        return;
      }
      if (mode === "all") {
        ["top", "bottom", "left", "right"].forEach(side => setBorder(cell, side));
        return;
      }
      if (mode === "outer") {
        if (y === bounds.minY) setBorder(cell, "top");
        if (y === bounds.maxY) setBorder(cell, "bottom");
        if (x === bounds.minX) setBorder(cell, "left");
        if (x === bounds.maxX) setBorder(cell, "right");
        return;
      }
      if (mode === "inner") {
        if (x < bounds.maxX) setBorder(cell, "right");
        if (y < bounds.maxY) setBorder(cell, "bottom");
        return;
      }
      if (mode === "top" && y === bounds.minY) setBorder(cell, "top");
      if (mode === "bottom" && y === bounds.maxY) setBorder(cell, "bottom");
      if (mode === "left" && x === bounds.minX) setBorder(cell, "left");
      if (mode === "right" && x === bounds.maxX) setBorder(cell, "right");
    });
    scheduleSave();
    syncSelectionState(range);
  }, [getLiveSelection, scheduleSave, syncSelectionState]);

  React.useEffect(() => () => window.clearTimeout(saveTimerRef.current), []);

  React.useEffect(() => {
    if (!sheetRef.current) return;
    if (searchQuery.trim()) sheetRef.current.search(searchQuery.trim());
    else sheetRef.current.resetSearch?.();
  }, [searchQuery, refreshKey]);

  React.useEffect(() => {
    if (!moreMenuOpen && !borderMenuOpen) return undefined;
    const handleOutside = (event) => {
      if (workspaceRef.current?.contains(event.target)) return;
      setMoreMenuOpen(false);
      setBorderMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [moreMenuOpen, borderMenuOpen]);

  React.useEffect(() => {
    if (!fullscreen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fullscreen]);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const payload = readStoredSheet();
    metaRef.current = normalizeRoomingMeta(payload.meta);
    host.innerHTML = "";

    const colCount = Math.max(ROOMING_COLS, payload.data?.[0]?.length || 0);
    const rowCount = Math.max(ROOMING_ROWS, payload.data?.length || 0);
    const columns = Array.from({ length: colCount }, (_, i) => ({
      type: "text",
      title: getColumnName(i),
      width: i === 0 ? ROOMING_BASE_FIRST_COL_WIDTH : ROOMING_BASE_CELL_WIDTH,
      wordWrap: true,
    }));
    const buildContextMenu = (instance, colIndex, rowIndex, event, _items, role) => {
      const col = Number(colIndex);
      const row = Number(rowIndex);
      const setSelectionFromRole = () => {
        if (Number.isFinite(col) && Number.isFinite(row)) {
          instance.updateSelectionFromCoords(col, row, col, row);
          syncSelectionState([col, row, col, row]);
        }
      };
      const clearRow = () => {
        const data = normalizeSheetData(instance.getData(false, false));
        const cols = data[0]?.length || ROOMING_COLS;
        for (let x = 0; x < cols; x += 1) instance.setValueFromCoords(x, row, "", true);
        scheduleSave();
      };
      const clearColumn = () => {
        const data = normalizeSheetData(instance.getData(false, false));
        for (let y = 0; y < data.length; y += 1) instance.setValueFromCoords(col, y, "", true);
        scheduleSave();
      };
      const clearCellRange = () => {
        const range = Number.isFinite(col) && Number.isFinite(row) ? [col, row, col, row] : getLiveSelection();
        const bounds = getRangeBounds(range);
        forEachCellInBounds(bounds, (x, y) => instance.setValueFromCoords(x, y, "", true));
        scheduleSave();
        syncSelectionState(range);
      };
      const clearFormatRange = () => {
        const range = Number.isFinite(col) && Number.isFinite(row) ? [col, row, col, row] : getLiveSelection();
        const bounds = getRangeBounds(range);
        forEachCellInBounds(bounds, (_x, _y, cell) => clearCellFormatting(instance, cell));
        scheduleSave();
        syncSelectionState(range);
      };

      if (role === "header") {
        return [
          { title:"إدراج عمود قبل", onclick:() => { instance.insertColumn(1, col, true); scheduleSave(); } },
          { title:"إدراج عمود بعد", onclick:() => { instance.insertColumn(1, col, false); scheduleSave(); } },
          { title:"حذف العمود", onclick:() => { instance.deleteColumn(col, 1); scheduleSave(); } },
          { title:"مسح العمود", onclick:clearColumn },
          { title:"عرض العمود", onclick:() => {
            const nextWidth = Number(window.prompt("عرض العمود بالبكسل", "140"));
            if (Number.isFinite(nextWidth) && nextWidth > 30) {
              instance.setWidth(col, nextWidth);
              scheduleSave();
            }
          } },
        ];
      }
      if (role === "row") {
        return [
          { title:"إدراج صف أعلى", onclick:() => { instance.insertRow(1, row, true); scheduleSave(); } },
          { title:"إدراج صف أسفل", onclick:() => { instance.insertRow(1, row, false); scheduleSave(); } },
          { title:"حذف الصف", onclick:() => { instance.deleteRow(row, 1); scheduleSave(); } },
          { title:"مسح الصف", onclick:clearRow },
          { title:"ارتفاع الصف", onclick:() => {
            const nextHeight = Number(window.prompt("ارتفاع الصف بالبكسل", "36"));
            if (Number.isFinite(nextHeight) && nextHeight > 18) {
              instance.setHeight(row, nextHeight);
              scheduleSave();
            }
          } },
        ];
      }
      if (role === "cell" || role === "grid") {
        return [
          { title:"مسح المحتوى", onclick:() => { setSelectionFromRole(); clearCellRange(); } },
          { title:"مسح التنسيق", onclick:() => { setSelectionFromRole(); clearFormatRange(); } },
          { title:"كل الحدود", onclick:() => { setSelectionFromRole(); applyBorder("all", Number.isFinite(col) && Number.isFinite(row) ? [col, row, col, row] : getLiveSelection()); } },
          { title:"إزالة الحدود", onclick:() => { setSelectionFromRole(); applyBorder("remove", Number.isFinite(col) && Number.isFinite(row) ? [col, row, col, row] : getLiveSelection()); } },
          { title:"تلوين ذهبي", onclick:() => { setSelectionFromRole(); applyFormattingToRange({ "background-color": "#fef3c7", color: "#111827" }, Number.isFinite(col) && Number.isFinite(row) ? [col, row, col, row] : getLiveSelection()); } },
          { title:"دمج الخلايا", onclick:() => { setSelectionFromRole(); instance.setMerge(); scheduleSave(); } },
          { title:"إلغاء الدمج", onclick:() => {
            const merge = getActiveMerge(Number.isFinite(col) && Number.isFinite(row) ? [col, row, col, row] : getLiveSelection());
            try { if (merge) instance.removeMerge(merge[0]); scheduleSave(); } catch {}
          } },
          { title:"إدراج المعتمرين هنا", onclick:() => {
            setSelectionFromRole();
            insertClientsRef.current?.(uninsertedClientsRef.current, true);
          } },
        ];
      }
      return null;
    };
    const handleSheetMouseUp = () => window.requestAnimationFrame(refreshSelectionFromSheet);

    let workbook;
    try {
      workbook = jspreadsheet(host, {
        about: false,
        contextMenu: buildContextMenu,
        worksheets: [{
          data: payload.data,
          columns,
          minDimensions: [colCount, rowCount],
          tableOverflow: true,
          tableWidth: "100%",
          tableHeight: 620,
          defaultRowHeight: ROOMING_BASE_ROW_HEIGHT,
          wordWrap: true,
          columnSorting: false,
          filters: false,
          allowInsertColumn: true,
          allowInsertRow: true,
          allowDeleteColumn: true,
          allowDeleteRow: true,
          mergeCells: payload.mergeCells,
          style: payload.style,
          onchange: scheduleSave,
          onchangestyle: scheduleSave,
          onmerge: scheduleSave,
          onselection: (_instance, x1, y1, x2, y2) => {
            syncSelectionState(normalizeSelectionRange([x1, y1, x2 ?? x1, y2 ?? y1]));
          },
        }],
      });
      sheetRef.current = Array.isArray(workbook) ? workbook[0] : workbook?.[0] || workbook;
      syncSelectionState([0, 0, 0, 0]);
      host.addEventListener("mousedown", rememberCellFromEvent, true);
      host.addEventListener("mouseup", handleSheetMouseUp, true);
      host.addEventListener("keyup", refreshSelectionFromSheet, true);
      setDirty(false);
      setSavedAt(null);
    } catch (err) {
      console.error("[RoomingSheet] init failed:", err);
      onToast?.("تعذر فتح ورقة التسكين", "error");
    }

    return () => {
      window.clearTimeout(saveTimerRef.current);
      host.removeEventListener("mousedown", rememberCellFromEvent, true);
      host.removeEventListener("mouseup", handleSheetMouseUp, true);
      host.removeEventListener("keyup", refreshSelectionFromSheet, true);
      try { if (host) jspreadsheet.destroy(host); } catch {}
      if (host) host.innerHTML = "";
      sheetRef.current = null;
    };
  }, [readStoredSheet, refreshKey, scheduleSave, onToast, syncSelectionState, normalizeSelectionRange, getLiveSelection, applyBorder, clearCellFormatting, applyFormattingToRange, getActiveMerge, rememberCellFromEvent, refreshSelectionFromSheet]);

  const insertedClientIds = React.useMemo(() => {
    const inserted = metaRef.current?.insertedClients || {};
    return new Set(Object.keys(inserted));
  }, [city, metaTick, dirty, savedAt]);

  const uninsertedClients = clients.filter(client => !insertedClientIds.has(client.id));
  uninsertedClientsRef.current = uninsertedClients;

  const getClientContext = React.useCallback((client) => {
    const level = client.packageLevel || client.hotelLevel || "";
    const pkg = packageByLevel.get(level);
    const hotel = city === "makkah"
      ? (client.hotelMecca || pkg?.hotelMecca || program.hotelMecca || "")
      : (client.hotelMadina || pkg?.hotelMadina || program.hotelMadina || "");
    const roomTypeKey = client.roomType || "";
    return {
      name: getClientDisplayName(client),
      level,
      roomType: client.roomTypeLabel || getRoomTypeLabel(roomTypeKey) || roomTypeKey || "",
      roomTypeKey,
      phone: client.phone || "",
      hotel,
      gender: client.gender || "",
      genderLabel: client.gender === "male" ? "ذكر" : client.gender === "female" ? "أنثى" : "",
      familyKey: getRoomingFamilyKey(client),
    };
  }, [city, packageByLevel, program]);

  const clientsById = React.useMemo(
    () => Object.fromEntries(clients.map((client) => [client.id, client])),
    [clients]
  );

  const getRooms = React.useCallback(() => metaRef.current?.rooms || {}, []);

  const getRoomById = React.useCallback((roomId) => {
    if (!roomId) return null;
    return getRooms()[roomId] || null;
  }, [getRooms]);

  const getRoomFromSelection = React.useCallback((rangeLike) => {
    const range = getRangeBounds(rangeLike || getLiveSelection());
    return Object.values(getRooms()).find((room) => isCoordsInsideRoom(room, range.minX, range.minY)) || null;
  }, [getLiveSelection, getRooms]);

  const selectedRoom = React.useMemo(
    () => getRoomFromSelection(selectedRange),
    [getRoomFromSelection, selectedRange, metaTick, city]
  );

  const setRoomMeta = React.useCallback((updater) => {
    const current = normalizeRoomingMeta(metaRef.current);
    const next = typeof updater === "function" ? updater(current) : normalizeRoomingMeta(updater);
    metaRef.current = normalizeRoomingMeta(next);
    setMetaTick((value) => value + 1);
  }, []);

  const clearRoomArea = React.useCallback((room) => {
    const sheet = sheetRef.current;
    if (!sheet || !room) return;
    const width = Number(room.width) || ROOMING_BLOCK_WIDTH;
    const height = Number(room.height) || getRoomBlockHeight(room.capacity);
    clearRoomBlockMerges(sheet, room);
    for (let y = room.startY; y < room.startY + height; y += 1) {
      for (let x = room.startX; x < room.startX + width; x += 1) {
        const cell = getCellName(x, y);
        sheet.setValueFromCoords(x, y, "", true);
        [
          "background-color",
          "color",
          "font-weight",
          "font-style",
          "text-align",
          "font-size",
          "white-space",
          "overflow-wrap",
          "word-break",
          "border-top",
          "border-right",
          "border-bottom",
          "border-left",
        ].forEach((prop) => sheet.setStyle(cell, prop, "", true));
      }
    }
  }, []);

  const renderRoom = React.useCallback((room) => {
    const sheet = sheetRef.current;
    if (!sheet || !room) return;
    renderStructuredRoomBlock(sheet, room, clientsById);
  }, [clientsById]);

  const getNextRoomNumber = React.useCallback(() => {
    const values = Object.values(getRooms())
      .map((room) => Number(String(room.roomNumber || "").replace(/[^\d]/g, "")))
      .filter((value) => Number.isFinite(value) && value > 0);
    return String((values.length ? Math.max(...values) : 0) + 1).padStart(2, "0");
  }, [getRooms]);

  const getRoomCompatibleClients = React.useCallback((room) => {
    if (!room) return [];
    const occupants = (room.occupantIds || []).map((id) => clientsById[id]).filter(Boolean);
    const occupantGenders = new Set(occupants.map((client) => client.gender).filter(Boolean));
    const occupantFamilyKeys = new Set(occupants.map((client) => getRoomingFamilyKey(client)).filter(Boolean));
    return uninsertedClientsRef.current.filter((client) => {
      const context = getClientContext(client);
      if (room.category === "male_only" && context.gender !== "male") return false;
      if (room.category === "female_only" && context.gender !== "female") return false;
      if (room.hotel && context.hotel && room.hotel !== context.hotel) return false;
      if (room.category === "family" && occupants.length) {
        if (!occupantGenders.size || occupantGenders.has(context.gender)) return true;
        const familyKey = context.familyKey;
        if (!familyKey) return false;
        if (!occupantFamilyKeys.size) return false;
        return occupantFamilyKeys.has(familyKey);
      }
      return true;
    }).sort((left, right) => {
      const leftExact = left.roomType === room.roomType ? 1 : 0;
      const rightExact = right.roomType === room.roomType ? 1 : 0;
      if (leftExact !== rightExact) return rightExact - leftExact;
      return getClientDisplayName(left).localeCompare(getClientDisplayName(right), "ar");
    });
  }, [clientsById, getClientContext]);

  const pickerRoom = roomPickerState.open ? getRoomById(roomPickerState.roomId) : null;
  const compatiblePilgrims = React.useMemo(
    () => getRoomCompatibleClients(pickerRoom),
    [getRoomCompatibleClients, pickerRoom, metaTick, city]
  );

  const findEmptyCell = React.useCallback((startX, startY) => {
    const sheet = sheetRef.current;
    const data = normalizeSheetData(sheet?.getData(false, false));
    const rowCount = data.length;
    const colCount = data[0]?.length || ROOMING_COLS;
    for (let y = Math.max(0, startY); y < rowCount; y += 1) {
      for (let x = y === startY ? Math.max(0, startX) : 0; x < colCount; x += 1) {
        const value = String(data[y]?.[x] || "").trim();
        if (!value || /^اسم\s*\d+$/i.test(value)) return { x, y };
      }
    }
    return { x: 0, y: Math.max(0, rowCount - 1) };
  }, []);

  const insertClients = React.useCallback((items, useSelection = true) => {
    const sheet = sheetRef.current;
    if (!sheet || !items.length) return;
    let cursor = useSelection ? getActiveCell() : findEmptyCell(0, 4);
    const currentMeta = normalizeRoomingMeta(metaRef.current);
    const inserted = { ...currentMeta.insertedClients };

    items.forEach((client, index) => {
      cursor = index === 0 && useSelection ? cursor : findEmptyCell(cursor.x, cursor.y + (index ? 1 : 0));
      const context = getClientContext(client);
      const value = [
        context.name,
        [context.level, context.roomType].filter(Boolean).join(" / "),
        context.phone,
        context.hotel,
      ].filter(Boolean).join("\n");
      const cellName = getCellName(cursor.x, cursor.y);
      sheet.setValueFromCoords(cursor.x, cursor.y, value, true);
      sheet.setMeta(cellName, "clientId", client.id);
      sheet.setMeta(cellName, "city", city);
      sheet.setMeta(cellName, "packageLevel", context.level);
      sheet.setMeta(cellName, "roomType", context.roomType);
      sheet.setMeta(cellName, "hotel", context.hotel);
      sheet.setStyle(cellName, "background-color", ROOMING_COLORS[index % ROOMING_COLORS.length], true);
      sheet.setStyle(cellName, "color", "#111827", true);
      sheet.setStyle(cellName, "font-weight", "700", true);
      inserted[client.id] = {
        cell: cellName,
        city,
        name: context.name,
        packageLevel: context.level,
        roomType: context.roomType,
        hotel: context.hotel,
        roomId: null,
        insertedAt: new Date().toISOString(),
      };
    });

    metaRef.current = { ...currentMeta, insertedClients: inserted };
    scheduleSave();
    syncSelectionState([cursor.x, cursor.y, cursor.x, cursor.y]);
    setMetaTick(k => k + 1);
    onToast?.(`تم إدراج ${items.length} معتمر في ورقة التسكين`, "success");
  }, [city, getActiveCell, findEmptyCell, getClientContext, scheduleSave, onToast, syncSelectionState]);
  insertClientsRef.current = insertClients;

  const openCreateRoomModal = React.useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const activeCell = getActiveCell();
    if (!Number.isFinite(activeCell?.x) || !Number.isFinite(activeCell?.y)) {
      onToast?.("اختر خلية أولا لإنشاء الغرفة", "info");
      return;
    }
    if (getRoomFromSelection([activeCell.x, activeCell.y, activeCell.x, activeCell.y])) {
      onToast?.("الموضع المحدد يحتوي على غرفة بالفعل", "info");
      return;
    }
    setRoomDraft({
      roomNumber: getNextRoomNumber(),
      roomType: "double",
      category: "male_only",
      hotel: roomHotelOptions[0] || (city === "makkah" ? program.hotelMecca || "" : program.hotelMadina || ""),
    });
    setRoomModal({ open: true, mode: "create", roomId: null });
  }, [getActiveCell, getNextRoomNumber, roomHotelOptions, city, program, onToast, getRoomFromSelection]);

  const openEditRoomModal = React.useCallback((room = selectedRoom) => {
    if (!room) {
      onToast?.("اختر غرفة أولا لتعديلها", "info");
      return;
    }
    setRoomDraft({
      roomNumber: room.roomNumber || "",
      roomType: room.roomType || "double",
      category: room.category || "male_only",
      hotel: room.hotel || "",
    });
    setRoomModal({ open: true, mode: "edit", roomId: room.id });
  }, [selectedRoom, onToast]);

  const upsertRoom = React.useCallback(() => {
    const activeCell = getActiveCell();
    const roomType = roomDraft.roomType || "double";
    const capacity = getRoomingCapacity(roomType);
    const category = roomDraft.category || "male_only";
    const hotel = String(roomDraft.hotel || "").trim();
    const roomNumber = String(roomDraft.roomNumber || "").trim();
    if (!roomNumber) {
      onToast?.("يرجى إدخال رقم الغرفة", "error");
      return;
    }
    if (!hotel) {
      onToast?.("يرجى اختيار الفندق", "error");
      return;
    }
    const existing = roomModal.mode === "edit" ? getRoomById(roomModal.roomId) : null;
    const startX = existing ? existing.startX : activeCell.x;
    const startY = existing ? existing.startY : activeCell.y;
    const nextRoom = {
      ...(existing || {}),
      id: existing?.id || createRoomId(),
      city,
      startX,
      startY,
      width: ROOMING_BLOCK_WIDTH,
      roomNumber,
      roomType,
      category,
      hotel,
      capacity,
      height: getRoomBlockHeight(capacity),
      occupantIds: Array.isArray(existing?.occupantIds) ? existing.occupantIds.slice(0, capacity) : [],
      updatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    const nextInserted = { ...normalizeRoomingMeta(metaRef.current).insertedClients };
    let removedCount = 0;
    if (existing && (existing.category !== category || existing.capacity !== capacity)) {
      const kept = [];
      (nextRoom.occupantIds || []).forEach((clientId) => {
        const client = clientsById[clientId];
        if (!client) return;
        if (category === "male_only" && client.gender !== "male") {
          delete nextInserted[clientId];
          removedCount += 1;
          return;
        }
        if (category === "female_only" && client.gender !== "female") {
          delete nextInserted[clientId];
          removedCount += 1;
          return;
        }
        if (kept.length < capacity) kept.push(clientId);
        else {
          delete nextInserted[clientId];
          removedCount += 1;
        }
      });
      nextRoom.occupantIds = kept;
    }

    if (existing) clearRoomArea(existing);
    setRoomMeta((current) => ({
      ...current,
      insertedClients: nextInserted,
      rooms: {
        ...current.rooms,
        [nextRoom.id]: nextRoom,
      },
    }));
    renderRoom(nextRoom);
    scheduleSave();
    setRoomModal({ open: false, mode: "create", roomId: null });
    if (removedCount) {
      if (category === "male_only") onToast?.("تم نقل المعتمرات غير المتوافقات إلى غير المدرجين", "info");
      else if (category === "female_only") onToast?.("تم نقل المعتمرين غير المتوافقين إلى غير المدرجين", "info");
    } else {
      onToast?.(existing ? "تم تحديث الغرفة" : "تم إنشاء الغرفة", "success");
    }
  }, [getActiveCell, roomDraft, roomModal, getRoomById, city, clientsById, clearRoomArea, setRoomMeta, renderRoom, scheduleSave, onToast]);

  const deleteRoom = React.useCallback((room = selectedRoom) => {
    if (!room) {
      onToast?.("اختر غرفة أولا لحذفها", "info");
      return;
    }
    if (!window.confirm(`سيتم حذف الغرفة ${room.roomNumber || ""} وإرجاع المعتمرين إلى غير المدرجين. هل تريد المتابعة؟`)) return;
    const nextInserted = { ...normalizeRoomingMeta(metaRef.current).insertedClients };
    (room.occupantIds || []).forEach((clientId) => {
      delete nextInserted[clientId];
    });
    clearRoomArea(room);
    setRoomMeta((current) => {
      const rooms = { ...current.rooms };
      delete rooms[room.id];
      return {
        ...current,
        insertedClients: nextInserted,
        rooms,
      };
    });
    scheduleSave();
    onToast?.("تم حذف الغرفة", "info");
  }, [selectedRoom, onToast, clearRoomArea, setRoomMeta, scheduleSave]);

  const openRoomPicker = React.useCallback((room = selectedRoom) => {
    if (!room) {
      onToast?.("اختر غرفة أولا لإضافة معتمرين", "info");
      return;
    }
    if ((room.occupantIds || []).length >= room.capacity) {
      onToast?.("الغرفة ممتلئة بالفعل", "info");
      return;
    }
    setSelectedPilgrimIds([]);
    setRoomPickerState({ open: true, roomId: room.id });
  }, [selectedRoom, onToast]);

  const insertPilgrimsIntoRoom = React.useCallback(() => {
    const room = getRoomById(roomPickerState.roomId);
    if (!room) return;
    if (!selectedPilgrimIds.length) {
      onToast?.("اختر معتمرًا واحدًا على الأقل", "info");
      return;
    }
    const currentMeta = normalizeRoomingMeta(metaRef.current);
    const insertedClients = { ...currentMeta.insertedClients };
    const rooms = { ...currentMeta.rooms };
    const nextRoom = { ...room, occupantIds: [...(room.occupantIds || [])] };
    const remaining = Math.max(0, nextRoom.capacity - nextRoom.occupantIds.length);
    const idsToInsert = selectedPilgrimIds.slice(0, remaining || selectedPilgrimIds.length);
    if (selectedPilgrimIds.length > remaining && remaining > 0 && !window.confirm("عدد المعتمرين المحدد أكبر من سعة الغرفة. سيتم إدراج العدد المسموح فقط. هل تريد المتابعة؟")) {
      return;
    }
    idsToInsert.forEach((clientId) => {
      const client = clientsById[clientId];
      if (!client || nextRoom.occupantIds.includes(clientId)) return;
      const context = getClientContext(client);
      nextRoom.occupantIds.push(clientId);
      insertedClients[clientId] = {
        roomId: nextRoom.id,
        city,
        name: context.name,
        packageLevel: context.level,
        roomType: context.roomType,
        hotel: context.hotel,
        insertedAt: new Date().toISOString(),
      };
    });
    rooms[nextRoom.id] = nextRoom;
    metaRef.current = { ...currentMeta, insertedClients, rooms };
    renderRoom(nextRoom);
    scheduleSave();
    setRoomPickerState({ open: false, roomId: null });
    setSelectedPilgrimIds([]);
    setMetaTick((value) => value + 1);
    onToast?.("تم إدراج المعتمرين في الغرفة", "success");
  }, [roomPickerState.roomId, selectedPilgrimIds, getRoomById, clientsById, getClientContext, city, renderRoom, scheduleSave, onToast]);

  const generateTemplateBlocks = React.useCallback(() => {
    if (!window.confirm("سيتم إعادة توليد التسكين من بيانات المعتمرين الحالية مع مسح الغرف الحالية داخل هذه الورقة. هل تريد المتابعة؟")) return;
    const activeCell = getActiveCell();
    const groupedRooms = buildRoomingGroupsFromClients(clients, city);
    const payload = createRoomingHeaderSheet({ program, clients, city, agency });
    const rooms = {};
    const insertedClients = {};
    groupedRooms.forEach((room, index) => {
      const colOffset = index % 3;
      const rowOffset = Math.floor(index / 3);
      const startX = activeCell.x + (colOffset * (ROOMING_BLOCK_WIDTH + 1));
      const startY = activeCell.y + (rowOffset * 8);
      const nextRoom = {
        ...room,
        startX,
        startY,
      };
      rooms[nextRoom.id] = nextRoom;
      (nextRoom.occupantIds || []).forEach((clientId) => {
        const client = clientsById[clientId];
        insertedClients[clientId] = {
          roomId: nextRoom.id,
          city,
          name: client ? getClientDisplayName(client) : clientId,
          packageLevel: client?.packageLevel || client?.hotelLevel || "",
          roomType: client?.roomTypeLabel || getRoomTypeLabel(client?.roomType) || "",
          hotel: city === "makkah" ? client?.hotelMecca || "" : client?.hotelMadina || "",
          insertedAt: new Date().toISOString(),
        };
      });
    });
    payload.meta = normalizeRoomingMeta({
      ...payload.meta,
      rooms,
      insertedClients,
    });
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {}
    metaRef.current = payload.meta;
    setMetaTick((value) => value + 1);
    setRefreshKey((value) => value + 1);
    onToast?.("تم توليد التسكين من مجموعات المعتمرين الحالية", "success");
  }, [getActiveCell, clients, city, program, agency, storageKey, onToast, clientsById]);

  const resetSheet = React.useCallback(() => {
    if (!window.confirm("سيتم حذف ورقة التسكين المحلية لهذا الفندق. هل أنت متأكد؟")) return;
    localStorage.removeItem(storageKey);
    metaRef.current = normalizeRoomingMeta({});
    setMetaTick((value) => value + 1);
    setRefreshKey(k => k + 1);
    onToast?.("تمت إعادة ضبط ورقة التسكين", "info");
  }, [storageKey, onToast]);

  const clearWholeSheet = React.useCallback(() => {
    if (!window.confirm("سيتم مسح الورقة الحالية وإرجاعها إلى ترويسة البرنامج فقط. هل تريد المتابعة؟")) return;
    const payload = createRoomingHeaderSheet({ program, clients, city, agency });
    localStorage.setItem(storageKey, JSON.stringify(payload));
    metaRef.current = normalizeRoomingMeta(payload.meta);
    setMetaTick((value) => value + 1);
    setRefreshKey(k => k + 1);
    onToast?.("تم مسح الورقة", "info");
  }, [program, clients, city, agency, storageKey, onToast]);

  const clearSelection = React.useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const [x1, y1, x2, y2] = getLiveSelection();
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const currentMeta = normalizeRoomingMeta(metaRef.current);
    const inserted = { ...currentMeta.insertedClients };
    const rooms = { ...currentMeta.rooms };
    const merges = sheet.getMerge?.() || {};
    Object.keys(merges).forEach((cell) => {
      const match = cell.match(/^([A-Z]+)(\d+)$/);
      if (!match) return;
      const x = match[1].split("").reduce((s, ch) => s * 26 + ch.charCodeAt(0) - 64, 0) - 1;
      const y = Number(match[2]) - 1;
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        try { sheet.removeMerge(cell); } catch {}
      }
    });
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const cell = getCellName(x, y);
        sheet.setValueFromCoords(x, y, "", true);
        try { sheet.resetStyle?.(cell); } catch {}
        Object.entries(inserted).forEach(([clientId, meta]) => {
          if (meta?.cell === cell) delete inserted[clientId];
        });
      }
    }
    Object.values(rooms).forEach((room) => {
      const width = Number(room.width) || ROOMING_BLOCK_WIDTH;
      const height = Number(room.height) || getRoomBlockHeight(room.capacity);
      const overlaps = !(room.startX + width - 1 < minX || room.startX > maxX || room.startY + height - 1 < minY || room.startY > maxY);
      if (!overlaps) return;
      (room.occupantIds || []).forEach((clientId) => delete inserted[clientId]);
      delete rooms[room.id];
    });
    metaRef.current = { ...currentMeta, insertedClients: inserted, rooms };
    scheduleSave();
    syncSelectionState([minX, minY, maxX, maxY]);
    setMetaTick(k => k + 1);
  }, [getLiveSelection, scheduleSave, syncSelectionState]);

  const addRows = React.useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.insertRow(10);
    scheduleSave();
  }, [scheduleSave]);

  const addColumns = React.useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.insertColumn(4);
    scheduleSave();
  }, [scheduleSave]);

  const applyColor = React.useCallback((color) => {
    applyFormattingToRange({
      "background-color": color,
      color: color === "#111827" ? "#f8fafc" : "#111827",
    });
  }, [applyFormattingToRange]);

  const applyTextColor = React.useCallback((color) => {
    applyFormattingToRange({ color });
  }, [applyFormattingToRange]);

  const applyFontSize = React.useCallback((size) => {
    setFontSize(size);
    applyFormattingToRange({ "font-size": `${size}px` });
  }, [applyFormattingToRange]);

  const applyTextAlign = React.useCallback((align) => {
    applyFormattingToRange({ "text-align": align });
  }, [applyFormattingToRange]);

  const applyWrapText = React.useCallback(() => {
    applyFormattingToRange(selectionUi.wrap
      ? {
          "white-space": "",
          "overflow-wrap": "",
          "word-break": "",
        }
      : {
          "white-space": "pre-wrap",
          "overflow-wrap": "anywhere",
          "word-break": "break-word",
        });
  }, [applyFormattingToRange, selectionUi.wrap]);

  const toggleBold = React.useCallback(() => {
    applyFormattingToRange({ "font-weight": selectionUi.bold ? "" : "700" });
  }, [applyFormattingToRange, selectionUi.bold]);

  const toggleItalic = React.useCallback(() => {
    applyFormattingToRange({ "font-style": selectionUi.italic ? "" : "italic" });
  }, [applyFormattingToRange, selectionUi.italic]);

  const undoSheet = React.useCallback(() => {
    sheetRef.current?.undo?.();
    window.requestAnimationFrame(() => syncSelectionState(getLiveSelection()));
  }, [getLiveSelection, syncSelectionState]);

  const redoSheet = React.useCallback(() => {
    sheetRef.current?.redo?.();
    window.requestAnimationFrame(() => syncSelectionState(getLiveSelection()));
  }, [getLiveSelection, syncSelectionState]);

  const toggleMergeSelection = React.useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const range = getLiveSelection();
    const merge = getActiveMerge(range);
    try {
      if (merge) sheet.removeMerge(merge[0]);
      else sheet.setMerge();
      scheduleSave();
      syncSelectionState(range);
    } catch {
      onToast?.("اختر الخلية الرئيسية للدمج لإلغائه", "info");
    }
  }, [getLiveSelection, getActiveMerge, scheduleSave, syncSelectionState, onToast]);

  const exportExcel = React.useCallback(async (selectedOnly = false) => {
    const payload = selectedOnly ? cropSheetPayload(captureSheet(), getLiveSelection()) : captureSheet();
    if (!payload) return;
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet(payload.data);
    ws["!merges"] = Object.entries(payload.mergeCells || {}).map(([cell, spans]) => {
      const start = XLSX.utils.decode_cell(cell);
      return {
        s: start,
        e: { r: start.r + (spans?.[1] || 1) - 1, c: start.c + (spans?.[0] || 1) - 1 },
      };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedOnly ? "Selected" : (city === "makkah" ? "Makkah" : "Madinah"));
    XLSX.writeFile(wb, `rooming-${city}${selectedOnly ? "-selected" : ""}-${slugifyFilePart(program.name)}.xlsx`);
  }, [captureSheet, getLiveSelection, city, program.name]);

  const printSheet = React.useCallback((selectedOnly = false) => {
    const payload = selectedOnly ? cropSheetPayload(captureSheet(), getLiveSelection()) : captureSheet();
    if (!payload) return;
    const hidden = new Set();
    const mergeMap = payload.mergeCells || {};
    Object.entries(mergeMap).forEach(([cell, spans]) => {
      const match = cell.match(/^([A-Z]+)(\d+)$/);
      if (!match) return;
      const col = match[1].split("").reduce((s, ch) => s * 26 + ch.charCodeAt(0) - 64, 0) - 1;
      const row = Number(match[2]) - 1;
      for (let y = row; y < row + (spans?.[1] || 1); y += 1) {
        for (let x = col; x < col + (spans?.[0] || 1); x += 1) {
          if (x !== col || y !== row) hidden.add(`${x}:${y}`);
        }
      }
    });
    const rows = payload.data.map((row, y) => `<tr>${row.map((value, x) => {
      if (hidden.has(`${x}:${y}`)) return "";
      const cell = getCellName(x, y);
      const merge = mergeMap[cell];
      const attrs = merge ? ` colspan="${merge[0]}" rowspan="${merge[1]}"` : "";
      const style = payload.style?.[cell] || "";
      return `<td${attrs} style="${escapeHtml(style)}">${escapeHtml(value).replace(/\n/g, "<br/>")}</td>`;
    }).join("")}</tr>`).join("");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${ROOMING_CITY_LABELS[city]}</title>
      <style>
        @page{size:A4 landscape;margin:10mm}
        body{font-family:Arial,sans-serif;color:#111;background:#fff}
        table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:10px}
        td{border:1px solid #888;min-height:22px;padding:5px;white-space:pre-wrap;vertical-align:top}
      </style></head><body><table>${rows}</table><script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
  }, [captureSheet, getLiveSelection, city]);

  React.useEffect(() => {
    const viewport = gridViewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      const previous = viewportSizeRef.current;
      if (Math.abs(previous.width - width) < 2 && Math.abs(previous.height - height) < 2) return;
      viewportSizeRef.current = { width, height };
      setViewportTick((value) => value + 1);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const sheet = sheetRef.current;
    const viewport = gridViewportRef.current;
    if (!sheet || !viewport) return undefined;

    const zoomFactor = zoom / 100;
    const scaledFirstColWidth = Math.max(96, Math.round(ROOMING_BASE_FIRST_COL_WIDTH * zoomFactor));
    const scaledCellWidth = Math.max(72, Math.round(ROOMING_BASE_CELL_WIDTH * zoomFactor));
    const scaledRowHeight = Math.max(24, Math.round(ROOMING_BASE_ROW_HEIGHT * zoomFactor));
    const scaledFontSize = Math.max(11, Math.round(ROOMING_BASE_FONT_SIZE * zoomFactor));

    const data = normalizeSheetData(sheet.getData(false, false));
    const rowCount = data.length;
    const colCount = data[0]?.length || ROOMING_COLS;
    const previousIgnoreHistory = sheet.ignoreHistory;
    const previousIgnoreEvents = sheet.parent?.ignoreEvents;

    sheet.ignoreHistory = true;
    if (sheet.parent) sheet.parent.ignoreEvents = true;
    for (let x = 0; x < colCount; x += 1) {
      sheet.setWidth(x, x === 0 ? scaledFirstColWidth : scaledCellWidth);
    }
    for (let y = 0; y < rowCount; y += 1) {
      sheet.setHeight(y, scaledRowHeight);
    }
    sheet.ignoreHistory = previousIgnoreHistory;
    if (sheet.parent) sheet.parent.ignoreEvents = previousIgnoreEvents;

    if (workspaceRef.current) {
      workspaceRef.current.style.setProperty("--rooming-grid-font-size", `${scaledFontSize}px`);
      workspaceRef.current.style.setProperty("--rooming-grid-line-height", zoomFactor > 1 ? "1.5" : "1.4");
    }

    const content = hostRef.current?.querySelector?.(".jss_content");
    if (content) {
      content.style.width = `${Math.max(320, viewport.clientWidth)}px`;
      content.style.maxWidth = `${Math.max(320, viewport.clientWidth)}px`;
      content.style.height = `${Math.max(240, viewport.clientHeight)}px`;
      content.style.maxHeight = `${Math.max(240, viewport.clientHeight)}px`;
      content.style.overflow = "auto";
      content.style.overflowX = "auto";
      content.style.overflowY = "auto";
    }

    return undefined;
  }, [zoom, fullscreen, panelOpen, refreshKey, viewportTick]);

  const roomingViewportHeight = fullscreen ? "calc(100vh - 214px)" : "min(72vh, 680px)";

  return (
    <div
      ref={workspaceRef}
      style={fullscreen ? {
        position: "fixed",
        inset: 0,
        zIndex: 90,
        padding: 0,
      } : undefined}
    >
      <GlassCard
        gold
        style={{
          padding: 12,
          marginBottom: fullscreen ? 0 : 24,
          height: fullscreen ? "100vh" : "auto",
          width: fullscreen ? "100vw" : "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f3f5f8",
          border: "1px solid rgba(203,213,225,.85)",
          boxShadow: fullscreen ? "none" : "0 10px 30px rgba(15,23,42,.08)",
          overflow: "hidden",
        }}
      >
        <style>{`
          .rooming-workspace .jss_container { width: 100% !important; max-width: 100% !important; }
          .rooming-workspace .jss_container,
          .rooming-workspace .jss_content {
            direction: ltr;
          }
          .rooming-workspace .jss_content,
          .rooming-workspace .jss_container,
          .rooming-workspace .jexcel,
          .rooming-workspace .jexcel > div {
            min-width: 100% !important;
          }
          .rooming-workspace .jss_content {
            background: #ffffff;
            border-radius: 0;
            border: 0;
            box-shadow: none !important;
            overscroll-behavior: contain;
          }
          .rooming-workspace .jss_worksheet { background: #fff; color: #111827; direction: ltr; }
          .rooming-workspace .jss_worksheet > thead > tr > td,
          .rooming-workspace .jss_worksheet > tbody > tr > td:first-child {
            background: #f8fafc !important;
            color: #475569 !important;
            border-color: #dbe3ee !important;
            font-weight: 700;
            font-size: var(--rooming-grid-font-size, 13px) !important;
            direction: ltr;
            text-align: center;
          }
          .rooming-workspace .jss_worksheet > tbody > tr > td:not(:first-child) {
            border-color: #e2e8f0 !important;
            background-color: #ffffff;
            color: #111827;
            white-space: pre-wrap;
            line-height: var(--rooming-grid-line-height, 1.45);
            font-size: var(--rooming-grid-font-size, 13px) !important;
            direction: rtl;
            text-align: right;
            box-sizing: border-box;
          }
          .rooming-workspace .jss_worksheet > tbody > tr > td[style*="border-top"],
          .rooming-workspace .jss_worksheet > tbody > tr > td[style*="border-right"],
          .rooming-workspace .jss_worksheet > tbody > tr > td[style*="border-bottom"],
          .rooming-workspace .jss_worksheet > tbody > tr > td[style*="border-left"] {
            border-style: solid !important;
            border-color: #111827 !important;
            position: relative;
            z-index: 1;
          }
          .rooming-workspace .jss_worksheet .highlight,
          .rooming-workspace .jss_worksheet .highlight-selected {
            border-color: #2563eb !important;
            box-shadow: inset 0 0 0 1px #2563eb;
          }
          .rooming-workspace .jss_corner { background: #2563eb !important; }
          .rooming-workspace .jss_textarea { background: transparent; }
          .rooming-workspace .jss_worksheet > tbody > tr > td > input,
          .rooming-workspace .jss_worksheet > tbody > tr > td > textarea {
            color: #111827 !important;
            background: #fff !important;
            font-size: var(--rooming-grid-font-size, 13px) !important;
          }
          .rooming-workspace .jss_selectall {
            background: #eef2ff !important;
          }
        `}</style>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: "#0f172a", fontWeight: 900, fontSize: 16 }}>ورقة التسكين</p>
            <p style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>
              معتمرون غير مدرجين: <strong style={{ color: uninsertedClients.length ? "#b45309" : "#15803d" }}>{uninsertedClients.length}</strong>
              {dirty ? " • تغييرات غير محفوظة" : savedAt ? ` • آخر حفظ ${savedAt.toLocaleTimeString("ar-MA")}` : ""}
            </p>
          </div>
          <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 10, background: "#fff", border: "1px solid rgba(148,163,184,.22)" }}>
            {Object.entries(ROOMING_CITY_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCity(key)}
                style={{
                  border: 0,
                  background: city === key ? "#e8eefc" : "transparent",
                  color: city === key ? "#1d4ed8" : "#475569",
                  borderRadius: 8,
                  padding: "7px 10px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "'Cairo',sans-serif",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          padding: 8,
          marginBottom: 10,
          borderRadius: 12,
          background: "#ffffff",
          border: "1px solid rgba(148,163,184,.2)",
          position: "sticky",
          top: 0,
          zIndex: 6,
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            minWidth: 170,
            height: 34,
            paddingInline: 10,
            borderRadius: 8,
            border: "1px solid rgba(148,163,184,.24)",
            background: "#fff",
          }}>
            <Search size={15} color="#64748b" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث داخل الورقة"
              style={{
                border: 0,
                outline: 0,
                width: "100%",
                background: "transparent",
                color: "#0f172a",
                fontSize: 12,
                fontFamily: "'Cairo',sans-serif",
              }}
            />
          </div>

          <RoomingToolbarButton title="تراجع" onClick={undoSheet} icon={<Undo2 size={15} />} />
          <RoomingToolbarButton title="إعادة" onClick={redoSheet} icon={<Redo2 size={15} />} />
          <RoomingToolbarButton title="طباعة" onClick={() => printSheet(false)} icon={<AppIcon name="print" size={15} />} />
          <RoomingToolbarButton title="تصدير Excel" onClick={() => exportExcel(false)} icon={<FileSpreadsheet size={15} />} />
          <RoomingToolbarButton title="حفظ الورقة" onClick={() => saveSheet(true)} active={dirty} icon={<AppIcon name="save" size={15} />} />
          <RoomingToolbarButton title="إنشاء غرفة" onClick={openCreateRoomModal} icon={<AppIcon name="plus" size={15} />}>
            <span>إنشاء غرفة</span>
          </RoomingToolbarButton>

          <select
            value={zoom}
            title="التكبير"
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{
              height: 34,
              borderRadius: 8,
              border: "1px solid rgba(148,163,184,.24)",
              background: "#fff",
              color: "#334155",
              padding: "0 10px",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'Cairo',sans-serif",
              outline: "none",
            }}
          >
            {[50, 75, 90, 100, 125, 150].map(value => <option key={value} value={value}>{value}%</option>)}
          </select>

          <select
            value={fontSize}
            title="حجم الخط"
            onChange={(e) => applyFontSize(Number(e.target.value))}
            style={{
              height: 34,
              borderRadius: 8,
              border: "1px solid rgba(148,163,184,.24)",
              background: "#fff",
              color: "#334155",
              padding: "0 10px",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'Cairo',sans-serif",
              outline: "none",
            }}
          >
            {[11, 12, 13, 14, 16, 18, 20].map(value => <option key={value} value={value}>{value}px</option>)}
          </select>

          <RoomingToolbarButton title="عريض" onClick={toggleBold} active={selectionUi.bold} icon={<Bold size={15} />} />
          <RoomingToolbarButton title="مائل" onClick={toggleItalic} active={selectionUi.italic} icon={<Italic size={15} />} />

          <label title="لون النص" style={{ display: "inline-flex" }}>
            <RoomingToolbarButton title="لون النص" icon={<Type size={15} />} style={{ position: "relative", overflow: "hidden" }}>
              <input
                type="color"
                onChange={(e) => applyTextColor(e.target.value)}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                aria-label="لون النص"
              />
            </RoomingToolbarButton>
          </label>

          <label title="لون الخلفية" style={{ display: "inline-flex" }}>
            <RoomingToolbarButton title="لون الخلفية" icon={<PaintBucket size={15} />} style={{ position: "relative", overflow: "hidden" }}>
              <input
                type="color"
                onChange={(e) => applyColor(e.target.value)}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                aria-label="لون الخلفية"
              />
            </RoomingToolbarButton>
          </label>

          <div style={{ position: "relative" }}>
            <RoomingToolbarButton
              title="الحدود"
              onClick={() => {
                setMoreMenuOpen(false);
                setBorderMenuOpen(open => !open);
              }}
              active={borderMenuOpen}
              icon={<Columns3 size={15} />}
            />
            <RoomingMenu open={borderMenuOpen} width={164}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}>
                {[
                  { title: "كل الحدود", mode: "all", icon: <Square size={15} /> },
                  { title: "الحد الخارجي", mode: "outer", icon: <Columns3 size={15} /> },
                  { title: "الحدود الداخلية", mode: "inner", icon: <TableCellsMerge size={15} /> },
                  { title: "إزالة الحدود", mode: "remove", icon: <SquareSlash size={15} /> },
                  { title: "حد علوي", mode: "top", icon: <PanelTop size={15} /> },
                  { title: "حد سفلي", mode: "bottom", icon: <PanelBottom size={15} /> },
                  { title: "حد أيسر", mode: "left", icon: <PanelLeft size={15} /> },
                  { title: "حد أيمن", mode: "right", icon: <PanelRight size={15} /> },
                ].map(({ title, mode, icon }) => (
                  <RoomingToolbarButton
                    key={mode}
                    title={title}
                    onClick={() => {
                      applyBorder(mode);
                      setBorderMenuOpen(false);
                    }}
                    icon={icon}
                    style={{ width: "100%" }}
                  />
                ))}
              </div>
            </RoomingMenu>
          </div>

          <RoomingToolbarButton title={selectionUi.merged ? "إلغاء دمج الخلايا" : "دمج الخلايا"} onClick={toggleMergeSelection} active={selectionUi.merged} icon={<Merge size={15} />} />
          <RoomingToolbarButton title="محاذاة يمين" onClick={() => applyTextAlign("right")} active={selectionUi.align === "right"} icon={<AlignRight size={15} />} />
          <RoomingToolbarButton title="محاذاة وسط" onClick={() => applyTextAlign("center")} active={selectionUi.align === "center"} icon={<AlignCenter size={15} />} />
          <RoomingToolbarButton title="محاذاة يسار" onClick={() => applyTextAlign("left")} active={selectionUi.align === "left"} icon={<AlignLeft size={15} />} />
          <RoomingToolbarButton title="التفاف النص" onClick={applyWrapText} active={selectionUi.wrap} icon={<WrapText size={15} />} />
          <RoomingToolbarButton
            title={selectedRoom ? "إضافة معتمرين إلى الغرفة المحددة" : "إدراج المعتمرين"}
            onClick={() => (selectedRoom ? openRoomPicker(selectedRoom) : insertClients(uninsertedClients, true))}
            disabled={!uninsertedClients.length}
            icon={<AppIcon name="users" size={15} />}
          />
          <RoomingToolbarButton
            title={panelOpen ? "إخفاء لوحة المعتمرين" : "إظهار لوحة المعتمرين"}
            onClick={() => setPanelOpen(open => !open)}
            icon={panelOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
            active={panelOpen}
          />
          <RoomingToolbarButton
            title={fullscreen ? "الخروج من ملء الشاشة" : "ملء الشاشة"}
            onClick={() => {
              setMoreMenuOpen(false);
              setBorderMenuOpen(false);
              setFullscreen(open => !open);
            }}
            icon={fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            active={fullscreen}
          />

          <div style={{ position: "relative", marginInlineStart: "auto" }}>
            <RoomingToolbarButton
              title="المزيد"
              onClick={() => {
                setBorderMenuOpen(false);
                setMoreMenuOpen(open => !open);
              }}
              active={moreMenuOpen}
              icon={<MoreHorizontal size={16} />}
            />
            <RoomingMenu open={moreMenuOpen} align="end" width={220}>
              <RoomingMenuItem label="توليد نموذج تسكين" icon={<AppIcon name="refresh" size={14} />} onClick={() => { generateTemplateBlocks(); setMoreMenuOpen(false); }} />
              <RoomingMenuItem label="طباعة المحدد" icon={<AppIcon name="print" size={14} />} onClick={() => { printSheet(true); setMoreMenuOpen(false); }} />
              <RoomingMenuItem label="تصدير المحدد" icon={<FileSpreadsheet size={14} />} onClick={() => { exportExcel(true); setMoreMenuOpen(false); }} />
              <RoomingMenuItem label="حذف المحدد" icon={<AppIcon name="trash" size={14} />} onClick={() => { clearSelection(); setMoreMenuOpen(false); }} />
              <RoomingMenuItem label="مسح التنسيق" icon={<AppIcon name="x" size={14} />} onClick={() => { clearRangeFormatting(); setMoreMenuOpen(false); }} />
              <RoomingMenuItem label="مسح لون الخلايا" icon={<PaintBucket size={14} />} onClick={() => { applyFormattingToRange({ "background-color": "" }); setMoreMenuOpen(false); }} />
              <RoomingMenuItem label="إضافة صفوف" icon={<TableRowsSplit size={14} />} onClick={() => { addRows(); setMoreMenuOpen(false); }} />
              <RoomingMenuItem label="إضافة أعمدة" icon={<TableColumnsSplit size={14} />} onClick={() => { addColumns(); setMoreMenuOpen(false); }} />
              <RoomingMenuItem label="مسح الورقة" destructive icon={<AppIcon name="x" size={14} />} onClick={() => { clearWholeSheet(); setMoreMenuOpen(false); }} />
              <RoomingMenuItem label="إعادة ضبط" destructive icon={<AppIcon name="restore" size={14} />} onClick={() => { resetSheet(); setMoreMenuOpen(false); }} />
            </RoomingMenu>
          </div>
        </div>

        {selectedRoom && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 10,
            padding: "10px 12px",
            borderRadius: 12,
            background: "#ffffff",
            border: "1px solid rgba(148,163,184,.2)",
          }}>
            <div>
              <p style={{ color: "#0f172a", fontWeight: 800, fontSize: 13 }}>
                غرفة {selectedRoom.roomNumber || "—"} • {getRoomingRoomLabel(selectedRoom.roomType)} • {getRoomingCategoryLabel(selectedRoom.category)}
              </p>
              <p style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>
                {selectedRoom.hotel || "—"} • {(selectedRoom.occupantIds || []).length}/{selectedRoom.capacity}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <RoomingToolbarButton title="إضافة معتمر" onClick={() => openRoomPicker(selectedRoom)} icon={<AppIcon name="users" size={14} />}>
                <span>إضافة معتمر</span>
              </RoomingToolbarButton>
              <RoomingToolbarButton title="تعديل الغرفة" onClick={() => openEditRoomModal(selectedRoom)} icon={<AppIcon name="edit" size={14} />}>
                <span>تعديل الغرفة</span>
              </RoomingToolbarButton>
              <RoomingToolbarButton title="حذف الغرفة" onClick={() => deleteRoom(selectedRoom)} icon={<AppIcon name="trash" size={14} />}>
                <span>حذف الغرفة</span>
              </RoomingToolbarButton>
            </div>
          </div>
        )}

        <div
          className="rooming-workspace"
          style={{
            display: "grid",
            gridTemplateColumns: panelOpen ? "minmax(0,1fr) 248px" : "1fr",
            gap: 10,
            alignItems: "stretch",
            flex: 1,
            minHeight: 0,
            height: roomingViewportHeight,
            maxHeight: roomingViewportHeight,
          }}
        >
          <div
            ref={gridViewportRef}
            style={{
              minWidth: 0,
              minHeight: 0,
              height: roomingViewportHeight,
              maxHeight: roomingViewportHeight,
              overflow: "hidden",
              borderRadius: 12,
              border: "1px solid rgba(148,163,184,.2)",
              background: "#fff",
              boxShadow: "0 12px 28px rgba(15,23,42,.08)",
            }}
          >
            <div
              style={{
                height: "100%",
                minHeight: 0,
                background: "#fff",
              }}
            >
              <div ref={hostRef} style={{ height: "100%", width: "100%" }} />
            </div>
          </div>

          {panelOpen && (
            <div style={{
              border: "1px solid rgba(148,163,184,.2)",
              background: "#fff",
              borderRadius: 12,
              padding: 10,
              height: roomingViewportHeight,
              maxHeight: roomingViewportHeight,
              overflow: "auto",
              boxShadow: "0 12px 28px rgba(15,23,42,.08)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <p style={{ color: "#0f172a", fontWeight: 800, fontSize: 13 }}>المعتمرون غير المدرجين</p>
                <RoomingToolbarButton
                  title="إخفاء اللوحة"
                  onClick={() => setPanelOpen(false)}
                  icon={<PanelRightClose size={14} />}
                  style={{ minWidth: 28, height: 28 }}
                />
              </div>
              {!uninsertedClients.length ? (
                <p style={{ color: "#64748b", fontSize: 12 }}>كل المعتمرين مدرجون في هذه الورقة.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {uninsertedClients.map(client => {
                    const context = getClientContext(client);
                    const isCompatibleWithSelectedRoom = !selectedRoom || compatiblePilgrims.some((item) => item.id === client.id);
                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          if (selectedRoom) {
                            if (!isCompatibleWithSelectedRoom) {
                              onToast?.("هذا المعتمر غير متوافق مع الغرفة المحددة", "info");
                              return;
                            }
                            setSelectedPilgrimIds([client.id]);
                            setRoomPickerState({ open: true, roomId: selectedRoom.id });
                            return;
                          }
                          insertClients([client], true);
                        }}
                        style={{
                          border: `1px solid ${selectedRoom && !isCompatibleWithSelectedRoom ? "rgba(239,68,68,.18)" : "rgba(148,163,184,.18)"}`,
                          background: selectedRoom && !isCompatibleWithSelectedRoom ? "#fff1f2" : "#f8fafc",
                          borderRadius: 10,
                          padding: 9,
                          color: "#0f172a",
                          cursor: "pointer",
                          fontFamily: "'Cairo',sans-serif",
                          textAlign: "start",
                        }}
                      >
                        <strong style={{ display: "block", fontSize: 12 }}>{context.name}</strong>
                        <span style={{ display: "block", color: "#64748b", fontSize: 11, marginTop: 3 }}>
                          {[context.genderLabel, context.roomType, context.hotel].filter(Boolean).join(" • ") || "بدون تفاصيل"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <Modal
          open={roomModal.open}
          onClose={() => setRoomModal({ open: false, mode: "create", roomId: null })}
          title={roomModal.mode === "edit" ? "تعديل الغرفة" : "إنشاء غرفة"}
          width={520}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input
              label="رقم الغرفة"
              value={roomDraft.roomNumber}
              onChange={(e) => setRoomDraft((prev) => ({ ...prev, roomNumber: e.target.value }))}
            />
            <Select
              label="نوع الغرفة"
              value={roomDraft.roomType}
              onChange={(e) => setRoomDraft((prev) => ({ ...prev, roomType: e.target.value }))}
              options={ROOMING_ROOM_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            />
            <Select
              label="تصنيف الغرفة"
              value={roomDraft.category}
              onChange={(e) => setRoomDraft((prev) => ({ ...prev, category: e.target.value }))}
              options={ROOMING_CATEGORY_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            />
            <Select
              label="الفندق"
              value={roomDraft.hotel}
              onChange={(e) => setRoomDraft((prev) => ({ ...prev, hotel: e.target.value }))}
              options={(roomHotelOptions.length ? roomHotelOptions : [roomDraft.hotel || "—"]).map((hotel) => ({ value: hotel, label: hotel }))}
            />
            {roomDraft.category === "family" && (
              <p style={{ color: "#64748b", fontSize: 12 }}>
                الغرفة العائلية تسمح بالمزج بين الذكور والإناث فقط عند توفر بيانات عائلة/مجموعة واضحة.
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Button variant="ghost" onClick={() => setRoomModal({ open: false, mode: "create", roomId: null })}>
                إلغاء
              </Button>
              <Button onClick={upsertRoom}>
                {roomModal.mode === "edit" ? "حفظ التعديل" : "إنشاء"}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          open={roomPickerState.open}
          onClose={() => {
            setRoomPickerState({ open: false, roomId: null });
            setSelectedPilgrimIds([]);
          }}
          title="إضافة معتمر"
          width={560}
        >
          {pickerRoom && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GlassCard style={{ padding: 12, background: "rgba(248,250,252,.95)", borderColor: "rgba(148,163,184,.18)" }}>
                <p style={{ color: "#0f172a", fontWeight: 800, fontSize: 13 }}>
                  غرفة {pickerRoom.roomNumber || "—"} • {getRoomingRoomLabel(pickerRoom.roomType)} • {getRoomingCategoryLabel(pickerRoom.category)}
                </p>
                <p style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                  {pickerRoom.hotel || "—"} • المتاح {Math.max(0, pickerRoom.capacity - (pickerRoom.occupantIds || []).length)} من {pickerRoom.capacity}
                </p>
              </GlassCard>
              {!compatiblePilgrims.length ? (
                <p style={{ color: "#64748b", fontSize: 12 }}>
                  لا يوجد معتمرون متوافقون غير مدرجين لهذه الغرفة حاليًا.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflow: "auto" }}>
                  {compatiblePilgrims.map((client) => {
                    const context = getClientContext(client);
                    const checked = selectedPilgrimIds.includes(client.id);
                    const remaining = Math.max(0, pickerRoom.capacity - (pickerRoom.occupantIds || []).length);
                    const disabled = !checked && selectedPilgrimIds.length >= remaining;
                    return (
                      <label
                        key={client.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: 10,
                          borderRadius: 10,
                          border: "1px solid rgba(148,163,184,.18)",
                          background: checked ? "rgba(37,99,235,.07)" : "#f8fafc",
                          cursor: disabled ? "not-allowed" : "pointer",
                          opacity: disabled ? 0.55 : 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setSelectedPilgrimIds((prev) => {
                              if (isChecked) return [...prev, client.id];
                              return prev.filter((id) => id !== client.id);
                            });
                          }}
                          style={{ marginTop: 2 }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <strong style={{ display: "block", color: "#0f172a", fontSize: 13 }}>{context.name}</strong>
                          <span style={{ display: "block", color: "#64748b", fontSize: 11, marginTop: 3 }}>
                            {[context.genderLabel, context.roomType, context.hotel].filter(Boolean).join(" • ") || "بدون تفاصيل"}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setRoomPickerState({ open: false, roomId: null });
                    setSelectedPilgrimIds([]);
                  }}
                >
                  إلغاء
                </Button>
                <Button onClick={insertPilgrimsIntoRoom} disabled={!selectedPilgrimIds.length}>
                  إدراج المحدد
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </GlassCard>
    </div>
  );
}

// ═══════════════════════════════════════
// INNER CLIENT ROW
// ═══════════════════════════════════════
function InnerClientRow({
  client,
  index,
  paid,
  remaining,
  status,
  onClick,
  onEdit,
  onDelete,
  onTransfer,
  selectMode = false,
  showCheckbox = false,
  isChecked = false,
  onCheck,
  gridTemplate,
}) {
  const [hov, setHov] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { lang, dir, t } = useLang();
  const isRTL = dir === "rtl";
  const paidLabel = formatCurrency(paid, lang);
  const remainingLabel = formatCurrency(remaining, lang);
  const btnRef = React.useRef();
  const menuRef = React.useRef();
  const menuPos = useDropdownPosition({
    anchorRef: btnRef,
    menuRef,
    open: menuOpen,
    rtl: isRTL,
    offset: MENU_OFFSET_PX,
  });

  const fallbackName = resolveClientDisplayName(client, "؟");
  const avatarInitial = fallbackName ? fallbackName[0] : "؟";
  const phoneLabel = client.phone ? `${client.phone}` : "";
  const cityLabel = client.city ? `• ${client.city}` : "";
  const packageLabel = translateHotelLevel(client.packageLevel || client.hotelLevel, lang) || client.packageLevel || client.hotelLevel || "";
  const roomLabel = translateRoomType(client.roomTypeLabel || client.roomType, lang) || getRoomTypeLabel(client.roomType) || "";
  const bookingLabel = [packageLabel, roomLabel].filter(Boolean).join(" / ");
  const infoLine = [phoneLabel, cityLabel, bookingLabel ? `• ${bookingLabel}` : ""].filter(Boolean).join(" ");

  const handleRowClick = () => {
    if (selectMode && showCheckbox) {
      onCheck?.();
      return;
    }
    onClick?.();
  };

  React.useEffect(() => {
    if (!menuOpen) return;
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          btnRef.current  && !btnRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  React.useEffect(() => {
    if (selectMode && menuOpen) {
      setMenuOpen(false);
    }
  }, [selectMode, menuOpen]);

  return (
    <div
      className="animate-fadeInUp"
      style={{ animationDelay: `${index * .025}s` }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "11px 16px",
          background: isChecked
            ? "rgba(212,175,55,.12)"
            : hov
            ? "rgba(212,175,55,.05)"
            : "rgba(255,255,255,.02)",
          border: `1px solid ${
            isChecked
              ? "rgba(212,175,55,.35)"
              : hov
              ? "rgba(212,175,55,.2)"
              : "rgba(255,255,255,.05)"
          }`,
          borderRadius: 10,
          transition: "all .15s",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          onClick={handleRowClick}
          style={{
            display: "grid",
            gridTemplateColumns: gridTemplate || "50px minmax(240px,2fr) 140px 140px 130px 130px 110px",
            gap: 12,
            flex: 1,
            minWidth: 0,
            width: "100%",
            cursor: "pointer",
            alignItems: "center",
          }}
        >
          {showCheckbox && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                  e.stopPropagation();
                  onCheck?.();
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 18, height: 18, accentColor: tc.gold, cursor: "pointer" }}
              />
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: tc.grey, fontWeight: 600, width: 22, textAlign: "center" }}>
              {index + 1}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: "linear-gradient(135deg,rgba(212,175,55,.25),rgba(212,175,55,.08))",
                  border: "1px solid rgba(212,175,55,.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: tc.gold,
                }}
              >
                {avatarInitial}
              </div>
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: tc.white }}>{fallbackName || "—"}</p>
            <p style={{ fontSize: 11, color: tc.grey }}>{infoLine || "—"}</p>
          </div>
          <span style={{ color: tc.grey, textAlign: "center", fontSize: 12 }}>
            {roomLabel || "—"}
          </span>
          <span style={{ color: tc.gold, fontWeight: 600, textAlign: "center", fontSize: 12 }}>
            {client.ticketNo || "—"}
          </span>
          <span style={{ color: tc.greenLight, fontWeight: 700, textAlign: "center", fontSize: 13 }}>
            {paidLabel}
          </span>
          <span style={{ color: remaining > 0 ? tc.warning : tc.greenLight, fontWeight: 700, textAlign: "center", fontSize: 13 }}>
            {remainingLabel}
          </span>
          <div style={{ textAlign: "center" }}>
            <StatusBadge status={status} />
          </div>
        </div>
        {!selectMode && (
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              ref={btnRef}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((o) => !o);
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: menuOpen ? "rgba(212,175,55,.18)" : "rgba(255,255,255,.06)",
                border: `1px solid ${
                  menuOpen ? "rgba(212,175,55,.4)" : "rgba(255,255,255,.12)"
                }`,
                color: menuOpen ? tc.gold : tc.grey,
                cursor: "pointer",
                fontSize: 17,
                fontWeight: 900,
                letterSpacing: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all .15s",
              }}
            >
              ···
            </button>
            {menuOpen &&
              createPortal(
                <div
                  ref={menuRef}
                  style={{
                    position: "fixed",
                    top: menuPos.top,
                    left: menuPos.left,
                    visibility: menuPos.visibility,
                    zIndex: 9999,
                    background: "rgba(20,30,50,0.96)",
                    border: "1px solid rgba(212,175,55,.3)",
                    borderRadius: 12,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
                    minWidth: 150,
                    overflow: "hidden",
                  }}
                >
                  <InnerMenuBtn
                    icon="edit"
                    label={t.editLabel || "تعديل"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onEdit();
                    }}
                    color={tc.white}
                    hoverBg="rgba(212,175,55,.1)"
                    isRTL={isRTL}
                    border
                  />
                  {onTransfer && (
                    <InnerMenuBtn
                      icon="refresh"
                      label={t.transferClient || "نقل إلى برنامج"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onTransfer();
                      }}
                      color={tc.gold}
                      hoverBg="rgba(212,175,55,.15)"
                      isRTL={isRTL}
                      border
                    />
                  )}
                  <InnerMenuBtn
                    icon="trash"
                    label={t.deleteLabel || "حذف"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDelete();
                    }}
                    color={tc.danger}
                    hoverBg="rgba(239,68,68,.12)"
                    isRTL={isRTL}
                  />
                </div>,
                document.body
              )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// SMALL HELPERS
// ═══════════════════════════════════════
function InnerMenuBtn({ icon, label, onClick, color, hoverBg, isRTL, border }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display:"flex", alignItems:"center", gap:10,
        flexDirection: isRTL ? "row" : "row-reverse",
        width:"100%", padding:"11px 16px",
        background: hov ? hoverBg : "transparent",
        border:"none",
        borderBottom: border ? "1px solid rgba(255,255,255,.06)" : "none",
        color, fontSize:13, fontWeight:600,
        cursor:"pointer", fontFamily:"'Cairo',sans-serif",
        textAlign: isRTL ? "right" : "left",
        transition:"background .15s",
      }}>
      <AppIcon name={icon} size={15} color={color} />
      <span>{label}</span>
    </button>
  );
}

function SmallBtn({ icon, onClick, color }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={e=>{e.stopPropagation();onClick(e);}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ width:30, height:30, background:hov?`${color}22`:"rgba(255,255,255,.05)",
        border:`1px solid ${hov?color:"rgba(255,255,255,.08)"}`,
        borderRadius:8, cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:13, transition:"all .2s" }}>
      <AppIcon name={icon} size={15} color={color} />
    </button>
  );
}

// ═══════════════════════════════════════
// PROGRAM FORM
// ═══════════════════════════════════════
function ProgramForm({ program, store, onSave, onCancel }) {
  const { addProgram, updateProgram } = store;
  const { t, tr, lang } = useLang();
  const isEdit = !!program;
  const createPackage = React.useCallback((level = "اقتصادي") => ({
    id: `pkg-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    level,
    hotelMecca: "",
    hotelMadina: "",
    mealPlan: "",
    notes: "",
    prices: {},
  }), []);
  const initialPackages = React.useMemo(() => {
    if (program) return normalizeProgramPackages(program).map(({ legacy, ...pkg }) => pkg);
    return [createPackage("اقتصادي")];
  }, [program, createPackage]);
  const [form, setForm] = React.useState({
    name:      program?.name      || "",
    type:      normalizeProgramType(program?.type || "عمرة"),
    duration:  program?.duration  || "",
    departure: program?.departure || "",
    returnDate:program?.returnDate|| "",
    price:     program?.price     || "",
    seats:     program?.seats     || "",
    transport: program?.transport || "",
    notes:     program?.notes     || "",
  });
  const [errors, setErrors] = React.useState({});
  const [packages, setPackages] = React.useState(initialPackages);
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const setPackageField = (index, key, value) => {
    setPackages(prev => prev.map((pkg, i) => i === index ? { ...pkg, [key]: value } : pkg));
  };
  const setPackagePrice = (index, key, value) => {
    setPackages(prev => prev.map((pkg, i) => {
      if (i !== index) return pkg;
      return { ...pkg, prices: { ...(pkg.prices || {}), [key]: value } };
    }));
  };
  const addPackage = (level = "اقتصادي") => setPackages(prev => [...prev, createPackage(level)]);
  const removePackage = (index) => setPackages(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== index));

  const cleanPackages = React.useCallback(() => packages.map((pkg, index) => {
    const prices = {};
    PROGRAM_ROOM_PRICE_KEYS.forEach((key) => {
      const raw = pkg.prices?.[key];
      if (raw === "" || raw === null || raw === undefined) return;
      const value = Number(raw);
      if (Number.isFinite(value) && value >= 0) prices[key] = value;
    });
    ["child", "infant"].forEach((legacyKey) => {
      const raw = pkg.prices?.[legacyKey];
      if (raw === "" || raw === null || raw === undefined) return;
      const value = Number(raw);
      if (Number.isFinite(value) && value >= 0) prices[legacyKey] = value;
    });
    return {
      id: pkg.id || `pkg-${index + 1}`,
      level: (pkg.level || "").trim() || `مستوى ${index + 1}`,
      hotelMecca: (pkg.hotelMecca || "").trim(),
      hotelMadina: (pkg.hotelMadina || "").trim(),
      mealPlan: (pkg.mealPlan || "").trim(),
      notes: (pkg.notes || "").trim(),
      prices,
    };
  }), [packages]);

  React.useEffect(() => {
    const days = Number(form.duration);
    if (!form.departure || !Number.isFinite(days) || days <= 0) {
      setForm(prev => (prev.returnDate ? { ...prev, returnDate: "" } : prev));
      return;
    }
    const parts = form.departure.split("-");
    if (parts.length !== 3) {
      setForm(prev => (prev.returnDate ? { ...prev, returnDate: "" } : prev));
      return;
    }
    const [year, month, day] = parts.map(Number);
    if ([year, month, day].some(v => Number.isNaN(v))) {
      setForm(prev => (prev.returnDate ? { ...prev, returnDate: "" } : prev));
      return;
    }
    const utcBase = Date.UTC(year, month - 1, day);
    const ms = utcBase + (days - 1) * 86400000;
    const iso = new Date(ms).toISOString().split("T")[0];
    setForm(prev => (prev.returnDate === iso ? prev : { ...prev, returnDate: iso }));
  }, [form.departure, form.duration]);
  const programTypeOptions = PROGRAM_TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label: translateProgramType(option.value, lang),
  }));

  const handleSave = () => {
    const nextErrors = {};
    if (!String(form.name || "").trim() || !String(form.seats || "").trim()) {
      alert(t.programNameSeatsRequired || "يرجى إدخال اسم البرنامج وعدد المقاعد");
      return;
    }
    if (!String(form.transport || "").trim()) nextErrors.transport = t.transportError || "يرجى إدخال الشركة الناقلة";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    const priceTable = cleanPackages();
    const legacyFields = getLegacyFieldsFromPackages(priceTable, program || form);
    const data = {
      ...form,
      ...legacyFields,
      type: normalizeProgramType(form.type),
      price: Number(legacyFields.price || 0),
      seats: Number(form.seats),
      transport: String(form.transport || "").trim(),
      priceTable,
    };
    isEdit ? updateProgram(program.id,data) : addProgram(data);
    onSave();
  };

  const packageCount = packages.length;
  const startingPrice = getProgramStartingPrice({ ...form, priceTable: cleanPackages() });
  const summaryPrice = startingPrice ? formatCurrency(startingPrice, lang) : "—";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <GlassCard gold style={{ padding:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, marginBottom:14 }}>
          <p style={{ fontSize:13, fontWeight:800, color:tc.gold }}>{t.programInfo || "معلومات البرنامج"}</p>
          <span style={{ fontSize:12, color:tc.grey }}>
            {packageCount} {t.levels || "مستويات"} • {(t.fromPrice || "ابتداءً من {price}").replace("{price}", summaryPrice)}
          </span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <Input label={t.program} value={form.name} onChange={set("name")} required style={{gridColumn:"1/-1"}}/>
          <Select label={t.programType} value={form.type} onChange={set("type")}
            options={programTypeOptions}/>
          <Input
            label={t.duration}
            value={form.duration}
            onChange={set("duration")}
            placeholder={t.durationPlaceholder}
            type="number"
            min={1}
          />
          <Input label={t.departure} value={form.departure} onChange={set("departure")} type="date"/>
          <Input
            label={t.returnDate}
            value={form.returnDate}
            onChange={() => {}}
            type="date"
            readOnly
            disabled
            inputStyle={{ cursor:"not-allowed", opacity:0.8 }}
          />
          <Input label={t.seats} value={form.seats} onChange={set("seats")} type="number" required/>
          <Input
            label={t.transport}
            value={form.transport}
            onChange={e => {
              set("transport")(e);
              setErrors(prev => (prev.transport ? { ...prev, transport: "" } : prev));
            }}
            required
            error={errors.transport}
          />
          <div style={{ gridColumn:"1/-1" }}>
            <label style={{ fontSize:12, fontWeight:600, color:tc.grey, display:"block", marginBottom:6 }}>{t.notes}</label>
            <textarea value={form.notes} onChange={set("notes")} rows={2}
              style={{ width:"100%", background:"var(--rukn-bg-input)",
                border:"1px solid var(--rukn-border-input)", borderRadius:10,
                padding:"10px 14px", color:"var(--rukn-text)", fontSize:13,
                fontFamily:"'Cairo',sans-serif", outline:"none", resize:"vertical" }} />
          </div>
        </div>
      </GlassCard>

      <GlassCard style={{ padding:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"center", flexWrap:"wrap", marginBottom:14 }}>
          <div>
            <p style={{ fontSize:13, fontWeight:800, color:tc.gold }}>{t.programPackagesTitle || "المستويات والباقات"}</p>
            <p style={{ fontSize:11, color:tc.grey, marginTop:3 }}>{t.programPackagesHint || "أضف الفنادق ونظام الوجبات وأسعار الغرف لكل مستوى."}</p>
          </div>
          <Button variant="primary" size="sm" icon="plus" onClick={() => addPackage("اقتصادي")}>{t.addLevel || "إضافة مستوى"}</Button>
        </div>

        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
          {PACKAGE_TEMPLATES.map(level => (
            <button key={level} type="button" onClick={() => addPackage(level)}
              style={{
                border:"1px solid rgba(212,175,55,.25)",
                background:"rgba(212,175,55,.08)",
                color:tc.gold,
                borderRadius:20,
                padding:"6px 12px",
                fontSize:12,
                fontWeight:700,
                cursor:"pointer",
                fontFamily:"'Cairo',sans-serif",
              }}>
              {translateHotelLevel(level, lang) || level}
            </button>
          ))}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {packages.map((pkg, index) => (
            <div key={pkg.id || index} style={{
              border:"1px solid rgba(212,175,55,.16)",
              background:"rgba(255,255,255,.025)",
              borderRadius:12,
              padding:14,
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center", marginBottom:12 }}>
                <strong style={{ color:tc.white, fontSize:13 }}>{t.level || "المستوى"} {index + 1}</strong>
                {packages.length > 1 && (
                  <Button variant="ghost" size="sm" icon="trash" onClick={() => removePackage(index)}>
                    {t.delete}
                  </Button>
                )}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Input label={t.levelName || "اسم المستوى"} value={pkg.level || ""} onChange={e => setPackageField(index, "level", e.target.value)} />
                <Input label={t.mealPlan} value={pkg.mealPlan || ""} onChange={e => setPackageField(index, "mealPlan", e.target.value)} />
                <Input label={t.hotelMecca} value={pkg.hotelMecca || ""} onChange={e => setPackageField(index, "hotelMecca", e.target.value)} />
                <Input label={t.hotelMadina} value={pkg.hotelMadina || ""} onChange={e => setPackageField(index, "hotelMadina", e.target.value)} />
                <Input label={t.notes} value={pkg.notes || ""} onChange={e => setPackageField(index, "notes", e.target.value)} style={{ gridColumn:"1/-1" }} />
              </div>
              <div style={{ marginTop:12 }}>
                <p style={{ fontSize:11, color:tc.grey, fontWeight:700, marginBottom:8 }}>{t.roomPrices || "أسعار الغرف"}</p>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10 }}>
                  {PROGRAM_ROOM_PRICE_KEYS.map(key => (
                    <Input
                      key={key}
                      label={translateRoomType(key, lang) || getRoomTypeLabel(key)}
                      value={pkg.prices?.[key] ?? ""}
                      onChange={e => setPackagePrice(index, key, e.target.value)}
                      type="number"
                      min={0}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:2 }}>
        <Button variant="ghost" onClick={onCancel}>{t.cancel}</Button>
        <Button variant="primary" icon={isEdit?"save":"plus"} onClick={handleSave}>
          {isEdit?t.save:t.addProgram}
        </Button>
      </div>
    </div>
  );
}
