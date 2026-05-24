import React from "react";
import jspreadsheet from "jspreadsheet-ce";
import "jspreadsheet-ce/dist/jspreadsheet.css";
import "jsuites/dist/jsuites.css";
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button, GlassCard, Modal, Input, Select, EmptyState, preventNumberInputWheelChange } from "./UI";
import { theme } from "./styles";
import ProgramCard from "./programs/ProgramCard";
import DuplicateProgramModal from "./programs/DuplicateProgramModal";
import PackageDetailCard from "./programs/PackageDetailCard";
import ProgramEditorModal from "./programs/ProgramEditorModal";
import ProgramDetailHeader from "./programs/ProgramDetailHeader";
import ProgramClientsToolbar from "./programs/ProgramClientsToolbar";
import BulkClientActionsBar from "./programs/BulkClientActionsBar";
import ProgramClientsTable from "./programs/ProgramClientsTable";
import ProgramClientRow from "./programs/ProgramClientRow";
import ProgramClientModals from "./programs/ProgramClientModals";
import ProgramDetailOverview from "./programs/ProgramDetailOverview";
import ProgramCostingModal from "./programs/ProgramCostingModal";
import {
  getProgramCostingLabels,
  getProgramServiceCostingReferenceCost,
  getProgramStandaloneServiceSalePrice,
} from "./programs/programCosting";
import { useLang } from "../hooks/useLang";
import { formatCurrency } from "../utils/currency";
import { downloadAmadeusExcel } from "../utils/amadeus";
import { escapeHtml } from "../utils/escapeHtml";
import { printProgramPDF } from "../utils/exportPdf";
import { createCombinedRoomingSection, createRoomingPrintHtml, downloadRoomingPdf } from "../utils/roomingPdf";
import {
  calculateHotelStayDates,
  formatDateForExcel,
} from "../utils/hotelDates";
import { AGENCY_FEATURES, useAgencyFeature } from "../hooks/useAgencyFeature";
import { useDropdownPosition } from "../hooks/useDropdownPosition";
import { db } from "../lib/db";
import { AppIcon } from "./Icon";
import {
  getPackageRoomPrice,
  getPackageStartingPrice,
  getRoomTypeLabel,
  normalizeProgramPackages,
} from "../utils/programPackages";
import {
  CLIENT_SERVICE_TYPES,
  doesServiceTypeNeedAccommodation,
  getClientServiceType,
  getClientServiceTypeAllFilterLabel,
  getClientServiceTypeLabel,
} from "../utils/clientServiceTypes";
import {
  getClientEffectiveOfficialPrice,
  getClientEffectiveSalePrice,
  getClientOverpaidAmount,
  getClientRemainingAmount,
} from "../utils/clientPricing";
import {
  buildDuplicateProgramName,
  createDuplicateProgramPayload,
  getProgramDepartureYear,
  isDuplicateProgramNameAvailable,
  normalizeDuplicateProgramName,
} from "../utils/programDuplicate";
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
  INCOMPLETE_INFO_FILTER,
  clientNeedsCompletion,
  getClientCompletionLabels,
  getClientCompletionTooltip,
  getClientDisplayStatus,
} from "../utils/clientCompletionStatus";
import { getParticipantTerminology, getProgramKind } from "../utils/participantTerminology";
import { buildProgramListSummaryById } from "../utils/programListSummaries";
import {
  downloadProgramBadgesPdf,
} from "../features/badges";
import {
  exportProgramWordContractsZip,
} from "../features/contracts";
import {
  fetchPosterTemplates,
  getPosterTemplateImageUrl,
} from "../features/posterTemplates/services/posterTemplatesApi";
import {
  buildProgramPosterFilename,
  downloadPosterBlob,
  generateProgramPosterPng,
} from "../features/posterTemplates/services/programPosterGenerator";
import {
  loadCodePosterTemplate,
  OFFICIAL_RUKN_CODE_TEMPLATE_KEY,
} from "../features/posterTemplates/codeTemplates/registry";
import { useAgencyCodePosterTemplates } from "../hooks/useAgencyCodePosterTemplates";
import {
  getProgramPosterLevelsCount,
} from "../features/posterTemplates/utils/programPosterMapping";
import {
  normalizePosterTemplateLevelsCount,
  normalizePosterTemplateType,
} from "../features/posterTemplates/utils/posterTemplateData";
import { downloadPassportListWord } from "../features/programs/exports/passportListWordExport";
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
  Link2,
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
const PROGRAM_DETAIL_DEFAULT_PAGE_SIZE = 10;
const PROGRAM_DETAIL_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const PROGRAMS_LIST_DEFAULT_PAGE_SIZE = 12;
const PROGRAMS_LIST_PAGE_SIZE_OPTIONS = [12, 24, 48];
const SCOPED_PROGRAM_DETAIL_REFRESH_DEBOUNCE_MS = 75;
const OFFICIAL_RUKN_POSTER_CHOICE_ID = OFFICIAL_RUKN_CODE_TEMPLATE_KEY;

const isActiveTransferDestinationProgram = (program = {}) => (
  Boolean(program?.id)
  && program.deleted !== true
  && !program.deletedAt
  && !program.deleted_at
  && program.archived !== true
  && !program.archivedAt
  && !program.archived_at
  && String(program.status || "active").toLowerCase() !== "archived"
);

const getProgramPricingReferenceCost = (program, client) => {
  if (!program || !client) return 0;
  return getProgramServiceCostingReferenceCost(program, getClientServiceType(client));
};

const getProgramStandaloneSalePrice = (program, client) => {
  if (!program || !client) return 0;
  return getProgramStandaloneServiceSalePrice(program, getClientServiceType(client));
};

const getProgramClientSalePrice = (program, client) => (
  getClientEffectiveSalePrice(client, {
    referencePrice: getProgramPricingReferenceCost(program, client),
    standaloneSalePrice: getProgramStandaloneSalePrice(program, client),
    program,
  })
);

const getProgramClientOfficialPrice = (program, client) => {
  const referencePrice = getProgramPricingReferenceCost(program, client);
  return getClientEffectiveOfficialPrice(client, {
    referencePrice,
    program,
  }) || referencePrice;
};

const getProgramClientRemainingAmount = (program, client, paid) => (
  getClientRemainingAmount(client, paid, {
    referencePrice: getProgramPricingReferenceCost(program, client),
    standaloneSalePrice: getProgramStandaloneSalePrice(program, client),
    program,
  })
);

const getProgramClientOverpaidAmount = (program, client, paid) => (
  getClientOverpaidAmount(client, paid, {
    referencePrice: getProgramPricingReferenceCost(program, client),
    standaloneSalePrice: getProgramStandaloneSalePrice(program, client),
    program,
  })
);

const getProgramClientPaymentStatus = (program, client, paid) => {
  const price = getProgramClientSalePrice(program, client);
  if (paid === 0) return "unpaid";
  if (paid >= price) return "cleared";
  return "partial";
};

const getProgramClientDisplayStatus = (program, client, paid) => (
  getClientDisplayStatus(
    client,
    program,
    getProgramClientPaymentStatus(program, client, paid),
    {
      referencePrice: getProgramPricingReferenceCost(program, client),
      standaloneSalePrice: getProgramStandaloneSalePrice(program, client),
    },
  )
);

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
const ROOMING_LAYOUT_START_X = 40;
const ROOMING_LAYOUT_START_Y = 48;
const ROOMING_LAYOUT_CARD_WIDTH = ROOMING_NODE_WIDTH;
const ROOMING_LAYOUT_CARD_HEIGHT = 292;
const ROOMING_LAYOUT_HORIZONTAL_GAP = 40;
const ROOMING_LAYOUT_VERTICAL_GAP = 36;
const ROOMING_LAYOUT_GROUP_VERTICAL_GAP = 96;
const ROOMING_LAYOUT_MAX_COLUMNS = 6;
const ROOMING_LARGE_GENERATION_THRESHOLD = 80;
const ROOMING_CLIENT_DRAG_PAN_EDGE = 82;
const ROOMING_CLIENT_DRAG_PAN_MIN_SPEED = 2.2;
const ROOMING_CLIENT_DRAG_PAN_MAX_SPEED = 18;
const ROOMING_LAYOUT_TYPE_ORDER = ["double", "triple", "quad", "quint"];
const normalizeRoomingText = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/[ـًٌٍَُِّْ]/g, "")
  .replace(/\s+/g, " ");

const normalizeRoomingHotel = (value) => normalizeRoomingText(value);

const isMissingRoomingValue = (value) => {
  const text = normalizeRoomingText(value);
  return !text
    || ["-", "—", "null", "undefined", "غير محدد", "غير محددة", "بدون", "aucun", "non défini", "non defini", "unspecified", "not specified", "n/a"].includes(text);
};

const normalizeRoomingGender = (value) => {
  const text = normalizeRoomingText(value);
  if (!text || isMissingRoomingValue(text)) return "";
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

const getRoomingStorageKey = (programId, city, agencyId = null) => (
  agencyId
    ? `rukn_rooming_sheet_${agencyId}_${programId}_${city}`
    : `rukn_rooming_sheet_${programId}_${city}`
);

const getLegacyRoomingStorageKey = (programId, city) => `rukn_rooming_sheet_${programId}_${city}`;

const createRoomLinkId = (sourceRoomId, targetRoomId) => {
  const [source, target] = [String(sourceRoomId || ""), String(targetRoomId || "")].sort();
  return source && target ? `room-link:${source}:${target}` : "";
};

const normalizeRoomingLinks = (links = [], rooms = []) => {
  const roomIds = new Set((rooms || []).map((room) => room?.id).filter(Boolean));
  const byKey = new Map();
  (Array.isArray(links) ? links : []).forEach((link) => {
    const sourceRoomId = String(link?.sourceRoomId || link?.source || "");
    const targetRoomId = String(link?.targetRoomId || link?.target || "");
    if (!sourceRoomId || !targetRoomId || sourceRoomId === targetRoomId) return;
    if (roomIds.size && (!roomIds.has(sourceRoomId) || !roomIds.has(targetRoomId))) return;
    const id = createRoomLinkId(sourceRoomId, targetRoomId);
    if (!id || byKey.has(id)) return;
    byKey.set(id, { id, sourceRoomId, targetRoomId });
  });
  return Array.from(byKey.values());
};

const normalizeRoomingCanvasState = (payload = {}, clients = []) => {
  const parsed = payload || {};
  if (parsed.kind === "rooming-canvas" || Array.isArray(parsed.rooms)) {
    const rooms = Array.isArray(parsed.rooms) ? parsed.rooms : [];
    return {
      rooms,
      unassigned: Array.isArray(parsed.unassigned) ? parsed.unassigned : [],
      roomLinks: normalizeRoomingLinks(Array.isArray(parsed.roomLinks) ? parsed.roomLinks : parsed.meta?.roomLinks, rooms),
      version: Number(parsed.version || parsed.canvasVersion || 4),
    };
  }
  const legacyRooms = Object.values(parsed?.meta?.rooms || {});
  const legacyInserted = new Set(Object.keys(parsed?.meta?.insertedClients || {}));
  const rooms = legacyRooms.map((room, index) => ({
    ...room,
    id: room.id || createRoomId(),
    order: index,
    x: room.x ?? ((index % 3) * 280),
    y: room.y ?? (Math.floor(index / 3) * 190),
  }));
  return {
    rooms,
    unassigned: clients
      .filter((client) => !legacyInserted.has(client.id))
      .map((client) => ({ clientId: client.id, reason: "" })),
    roomLinks: normalizeRoomingLinks(parsed?.meta?.roomLinks, rooms),
    version: 4,
  };
};

const filterRoomingMapByClientIds = (source = {}, allowedClientIds = new Set()) => (
  Object.fromEntries(Object.entries(source || {}).filter(([clientId]) => allowedClientIds.has(clientId)))
);

const sanitizeRoomingStateForEligibleClients = (state = {}, eligibleClientIds = new Set()) => {
  const sourceRooms = Array.isArray(state.rooms) ? state.rooms : [];
  const sourceUnassigned = Array.isArray(state.unassigned) ? state.unassigned : [];
  let removedCount = 0;
  const rooms = sourceRooms.map((room) => {
    const originalOccupantIds = Array.isArray(room.occupantIds) ? room.occupantIds : [];
    const occupantIds = originalOccupantIds.filter((clientId) => eligibleClientIds.has(clientId));
    removedCount += originalOccupantIds.length - occupantIds.length;
    return {
      ...room,
      occupantIds,
      genderOverrides: filterRoomingMapByClientIds(room.genderOverrides, new Set(occupantIds)),
      priceOverrides: filterRoomingMapByClientIds(room.priceOverrides, new Set(occupantIds)),
    };
  });
  const assignedIds = new Set(rooms.flatMap((room) => room.occupantIds || []));
  const unassigned = sourceUnassigned.filter((item) => {
    const clientId = item?.clientId;
    return eligibleClientIds.has(clientId) && !assignedIds.has(clientId);
  });
  removedCount += sourceUnassigned.length - unassigned.length;
  const roomLinks = normalizeRoomingLinks(state.roomLinks, rooms);
  return {
    rooms,
    unassigned,
    roomLinks,
    version: Number(state.version || 4),
    removedCount,
  };
};

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

const getRoomingRoomTypeFromCapacity = (capacity) => {
  const value = Math.max(1, Number(capacity) || 0);
  if (value >= 5) return "quint";
  if (value === 4) return "quad";
  if (value === 3) return "triple";
  if (value === 2) return "double";
  return "single";
};

const getExplicitClientHotelForRoomingCity = (client = {}, city = "makkah") => {
  const value = city === "madinah"
    ? (client.hotelMadina || client.hotel_madina || "")
    : (client.hotelMecca || client.hotel_mecca || "");
  return isMissingRoomingValue(value) ? "" : String(value).trim();
};

const clampRoomingContextMenuPoint = (x, y, width = 170, height = 132) => {
  if (typeof window === "undefined") return { x, y };
  const margin = 8;
  return {
    x: Math.min(Math.max(margin, x), Math.max(margin, window.innerWidth - width - margin)),
    y: Math.min(Math.max(margin, y), Math.max(margin, window.innerHeight - height - margin)),
  };
};

const getRoomingPackageHotel = (pkg, city) => (
  city === "madinah" ? pkg?.hotelMadina : pkg?.hotelMecca
);

const findRoomingPackageFromRoom = (room = {}, packages = [], city = "makkah") => {
  const packageId = String(room.packageId || room.package_id || "").trim();
  if (packageId) {
    const byId = packages.find((pkg) => pkg.id === packageId);
    if (byId) return byId;
  }
  const explicitLevel = String(room.packageLevel || room.hotelLevel || room.level || room.levelName || "").trim();
  if (explicitLevel) {
    const byLevel = packages.find((pkg) => String(pkg.level || "").trim() === explicitLevel);
    if (byLevel) return byLevel;
  }
  const roomHotel = normalizeRoomingHotel(room.hotel);
  if (!roomHotel) return null;
  const matches = packages.filter((pkg) => normalizeRoomingHotel(getRoomingPackageHotel(pkg, city)) === roomHotel);
  const uniqueLevels = new Set(matches.map((pkg) => String(pkg.level || "").trim()).filter(Boolean));
  if (uniqueLevels.size === 1) return matches.find((pkg) => String(pkg.level || "").trim() === Array.from(uniqueLevels)[0]) || null;
  return null;
};

const getRoomingClientPackage = (client = {}, room = {}, packages = [], city = "makkah") => {
  const roomPackage = findRoomingPackageFromRoom(room, packages, city);
  if (roomPackage) return roomPackage;
  const packageId = String(client.packageId || client.package_id || "").trim();
  if (packageId) {
    const byId = packages.find((pkg) => String(pkg.id || "") === packageId);
    if (byId) return byId;
  }
  const level = String(client.packageLevel || client.hotelLevel || client.hotel_level || "").trim();
  if (!level) return null;
  return packages.find((pkg) => String(pkg.level || "").trim() === level) || null;
};

const getRoomingPriceNumber = (value) => {
  if (value === "" || value === null || value === undefined) return 0;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
};

const getClientOfficialRoomingPrice = (client = {}) => getRoomingPriceNumber(
  client.officialPrice ?? client.official_price ?? client.price
);

const getClientSaleRoomingPrice = (client = {}) => getRoomingPriceNumber(
  client.salePrice ?? client.sale_price ?? client.price
);

const getRoomingPriceSync = ({ client, room, packages = [], city = "makkah", decision = null }) => {
  if (!client || !room) return null;
  const targetRoomType = normalizeRoomingRoomType(room.roomType) || getRoomingRoomTypeFromCapacity(room.capacity);
  if (!targetRoomType) return null;
  const currentRoomType = normalizeRoomingRoomType(client.roomType, client.roomTypeLabel, client.room);
  if (currentRoomType && currentRoomType === targetRoomType) return null;
  const pkg = getRoomingClientPackage(client, room, packages, city);
  const newOfficialPrice = getPackageRoomPrice(pkg, targetRoomType);
  if (!newOfficialPrice) return null;
  const oldOfficialPrice = getClientOfficialRoomingPrice(client);
  const oldSalePrice = getClientSaleRoomingPrice(client);
  const salePriceLooksManual = oldSalePrice > 0 && oldSalePrice !== oldOfficialPrice;
  if (salePriceLooksManual && !decision) {
    return {
      requiresConfirmation: true,
      oldOfficialPrice,
      oldSalePrice,
      newOfficialPrice,
      targetRoomType,
      packageId: pkg?.id || "",
      packageLevel: pkg?.level || "",
      patch: null,
    };
  }
  const keepPreviousSale = Boolean(decision?.keepPreviousSale);
  const decidedSalePrice = decision && !keepPreviousSale
    ? getRoomingPriceNumber(decision.salePrice)
    : null;
  return {
    requiresConfirmation: false,
    oldOfficialPrice,
    oldSalePrice,
    newOfficialPrice,
    targetRoomType,
    packageId: pkg?.id || "",
    packageLevel: pkg?.level || "",
    patch: {
      officialPrice: newOfficialPrice,
      salePrice: keepPreviousSale ? oldSalePrice : (decision ? decidedSalePrice : newOfficialPrice),
    },
  };
};

const buildRoomingClientFieldUpdates = ({ rooms = [], clients = [], programId = "", city = "makkah", packages = [] }) => {
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const seen = new Set();
  const updates = [];
  rooms.forEach((room) => {
    const validOccupantIds = (Array.isArray(room.occupantIds) ? room.occupantIds : [])
      .filter((clientId) => {
        const client = clientsById.get(clientId);
        return client && String(client.programId || "") === String(programId || "") && doesServiceTypeNeedAccommodation(client);
      });
    if (!validOccupantIds.length) return;
    const roomType = normalizeRoomingRoomType(room.roomType) || getRoomingRoomTypeFromCapacity(room.capacity);
    const roomTypeLabel = getRoomTypeLabel(roomType) || getRoomingRoomLabel(roomType);
    const category = ["male_only", "female_only", "family"].includes(room.category) ? room.category : "";
    const categoryLabel = category ? getRoomingCategoryLabel(category) : "";
    const roomingGroupId = String(room.roomingGroupId || room.id || "").trim();
    const roomingGroupName = String(room.roomingGroupName || (room.roomNumber ? `غرفة ${room.roomNumber}` : "")).trim();
    const genderOverrides = room.genderOverrides && typeof room.genderOverrides === "object" ? room.genderOverrides : {};
    const roomHotel = String(room.hotel || "").trim();
    const roomPackage = findRoomingPackageFromRoom(room, packages, city);
    const roomLevel = String(roomPackage?.level || room.packageLevel || room.hotelLevel || room.level || room.levelName || "").trim();
    const priceOverrides = room.priceOverrides && typeof room.priceOverrides === "object" ? room.priceOverrides : {};
    const locationPatch = roomHotel
      ? (city === "madinah" ? { hotelMadina: roomHotel } : { hotelMecca: roomHotel })
      : {};
    const levelPatch = roomLevel
      ? { packageId: roomPackage?.id || room.packageId || room.package_id || "", hotelLevel: roomLevel, packageLevel: roomLevel }
      : {};
    validOccupantIds.forEach((clientId, index) => {
      if (seen.has(clientId)) return;
      seen.add(clientId);
      const client = clientsById.get(clientId);
      const confirmedGender = ["male", "female"].includes(genderOverrides[clientId]) ? genderOverrides[clientId] : "";
      const roomingPatch = {
        groupId: roomingGroupId,
        groupName: roomingGroupName,
        category,
        categoryLabel,
        groupSize: validOccupantIds.length,
        seatIndex: index + 1,
      };
      const priceSync = getRoomingPriceSync({
        client,
        room,
        packages,
        city,
        decision: priceOverrides[clientId] || null,
      });
      const pricePatch = priceSync?.patch || {};
      const unchanged = client.roomType === roomType
        && client.roomTypeLabel === roomTypeLabel
        && (client.roomCategory || "") === category
        && (client.roomCategoryLabel || "") === categoryLabel
        && (client.roomingGroupId || "") === roomingGroupId
        && (client.roomingGroupName || "") === roomingGroupName
        && Number(client.roomingGroupSize || 0) === validOccupantIds.length
        && Number(client.roomingSeatIndex || 0) === index + 1
        && (!locationPatch.hotelMecca || client.hotelMecca === locationPatch.hotelMecca)
        && (!locationPatch.hotelMadina || client.hotelMadina === locationPatch.hotelMadina)
        && (!levelPatch.packageLevel || client.packageLevel === levelPatch.packageLevel)
        && (!levelPatch.hotelLevel || client.hotelLevel === levelPatch.hotelLevel)
        && (!levelPatch.packageId || client.packageId === levelPatch.packageId)
        && (!confirmedGender || client.gender === confirmedGender)
        && (pricePatch.officialPrice === undefined || Number(client.officialPrice || 0) === Number(pricePatch.officialPrice || 0))
        && (pricePatch.salePrice === undefined || Number(client.salePrice || 0) === Number(pricePatch.salePrice || 0));
      if (unchanged) return;
      updates.push({
        id: clientId,
        patch: {
          roomType,
          roomTypeLabel,
          roomCategory: category,
          roomCategoryLabel: categoryLabel,
          roomingGroupId,
          roomingGroupName,
          roomingGroupSize: validOccupantIds.length,
          roomingSeatIndex: index + 1,
          ...locationPatch,
          ...levelPatch,
          ...pricePatch,
          ...(confirmedGender ? { gender: confirmedGender } : {}),
          docs: {
            ...(client.docs || {}),
            rooming: {
              ...((client.docs && client.docs.rooming) || {}),
              ...roomingPatch,
            },
          },
        },
      });
    });
  });
  return updates;
};

const getRoomingCategoryAccent = (category) => {
  if (category === "female_only") return { border: "#db2777", bg: "#fdf2f8", text: "#9d174d", darkBg: "rgba(219,39,119,.20)", darkText: "#f9a8d4", darkBorder: "rgba(244,114,182,.44)" };
  if (category === "family") return { border: "#16a34a", bg: "#f0fdf4", text: "#166534", darkBg: "rgba(22,163,74,.18)", darkText: "#86efac", darkBorder: "rgba(74,222,128,.38)" };
  return { border: "#2563eb", bg: "#eff6ff", text: "#1d4ed8", darkBg: "rgba(37,99,235,.22)", darkText: "#93c5fd", darkBorder: "rgba(96,165,250,.42)" };
};

const getRoomingLayoutTypeKey = (room = {}) => {
  const capacity = Number(room.capacity);
  if (Number.isFinite(capacity) && capacity > 0) {
    if (capacity === 2) return "double";
    if (capacity === 3) return "triple";
    if (capacity === 4) return "quad";
    if (capacity === 5) return "quint";
    if (capacity === 1) return "single";
    return `capacity:${capacity}`;
  }
  return normalizeRoomingRoomType(room.roomType) || String(room.roomType || "other").trim() || "other";
};

const getRoomingLayoutTypeRank = (room = {}) => {
  const key = getRoomingLayoutTypeKey(room);
  const index = ROOMING_LAYOUT_TYPE_ORDER.indexOf(key);
  return index === -1 ? ROOMING_LAYOUT_TYPE_ORDER.length : index;
};

const autoLayoutRoomNodes = (rooms = []) => {
  const sorted = rooms.slice().sort((a, b) => {
    const typeRank = getRoomingLayoutTypeRank(a) - getRoomingLayoutTypeRank(b);
    if (typeRank) return typeRank;
    const type = String(getRoomingLayoutTypeKey(a)).localeCompare(String(getRoomingLayoutTypeKey(b)), "ar");
    if (type) return type;
    const hotel = String(a.hotel || "").localeCompare(String(b.hotel || ""), "ar");
    if (hotel) return hotel;
    const category = String(a.category || "").localeCompare(String(b.category || ""), "ar");
    if (category) return category;
    return (a.order || 0) - (b.order || 0);
  });

  const groupOffsets = new Map();
  let currentTypeKey = "";
  let groupStartY = ROOMING_LAYOUT_START_Y;
  let groupRowCount = 0;

  return sorted.map((room, index) => {
    const typeKey = getRoomingLayoutTypeKey(room);
    if (typeKey !== currentTypeKey) {
      if (currentTypeKey) {
        groupStartY += (groupRowCount * (ROOMING_LAYOUT_CARD_HEIGHT + ROOMING_LAYOUT_VERTICAL_GAP)) + ROOMING_LAYOUT_GROUP_VERTICAL_GAP;
      }
      currentTypeKey = typeKey;
      groupRowCount = 0;
    }
    const localIndex = groupOffsets.get(typeKey) || 0;
    groupOffsets.set(typeKey, localIndex + 1);
    const columnIndex = localIndex % ROOMING_LAYOUT_MAX_COLUMNS;
    const rowIndex = Math.floor(localIndex / ROOMING_LAYOUT_MAX_COLUMNS);
    groupRowCount = Math.max(groupRowCount, rowIndex + 1);
    return {
      ...room,
      order: room.order ?? index,
      x: ROOMING_LAYOUT_START_X + (columnIndex * (ROOMING_LAYOUT_CARD_WIDTH + ROOMING_LAYOUT_HORIZONTAL_GAP)),
      y: groupStartY + (rowIndex * (ROOMING_LAYOUT_CARD_HEIGHT + ROOMING_LAYOUT_VERTICAL_GAP)),
    };
  });
};

const getRoomingGeneratedLayoutSummary = (roomCount = 0) => {
  const count = Math.max(0, Number(roomCount) || 0);
  if (!count) return { count: 0, columns: 0, rows: 0 };
  const stepX = ROOMING_LAYOUT_CARD_WIDTH + ROOMING_LAYOUT_HORIZONTAL_GAP;
  const stepY = ROOMING_LAYOUT_CARD_HEIGHT + ROOMING_LAYOUT_VERTICAL_GAP;
  const columns = Math.max(1, Math.ceil(Math.sqrt(count * (stepY / stepX))));
  return {
    count,
    columns,
    rows: Math.ceil(count / columns),
  };
};

const getRoomingGeneratedGridPosition = (index = 0, columns = 1, origin = {}) => {
  const stepX = ROOMING_LAYOUT_CARD_WIDTH + ROOMING_LAYOUT_HORIZONTAL_GAP;
  const stepY = ROOMING_LAYOUT_CARD_HEIGHT + ROOMING_LAYOUT_VERTICAL_GAP;
  const safeColumns = Math.max(1, Number(columns) || 1);
  const columnIndex = index % safeColumns;
  const rowIndex = Math.floor(index / safeColumns);
  return {
    x: Number(origin.x ?? ROOMING_LAYOUT_START_X) + (columnIndex * stepX),
    y: Number(origin.y ?? ROOMING_LAYOUT_START_Y) + (rowIndex * stepY),
  };
};

const autoLayoutGeneratedRoomNodes = (rooms = []) => {
  const sorted = rooms.slice().sort((a, b) => {
    const typeRank = getRoomingLayoutTypeRank(a) - getRoomingLayoutTypeRank(b);
    if (typeRank) return typeRank;
    const type = String(getRoomingLayoutTypeKey(a)).localeCompare(String(getRoomingLayoutTypeKey(b)), "ar");
    if (type) return type;
    const hotel = String(a.hotel || "").localeCompare(String(b.hotel || ""), "ar");
    if (hotel) return hotel;
    const category = String(a.category || "").localeCompare(String(b.category || ""), "ar");
    if (category) return category;
    return (a.order || 0) - (b.order || 0);
  });
  const roomCount = sorted.length;
  if (!roomCount) return [];

  const { columns } = getRoomingGeneratedLayoutSummary(roomCount);

  return sorted.map((room, index) => {
    const position = getRoomingGeneratedGridPosition(index, columns);
    return {
      ...room,
      order: room.order ?? index,
      x: position.x,
      y: position.y,
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

const normalizeRoomingSearchText = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[ـًٌٍَُِّْ]/g, "")
  .trim()
  .toLowerCase();

const getRoomingClientSearchText = (client = {}) => normalizeRoomingSearchText([
  getClientDisplayName(client),
  getClientArabicName(client),
  getClientLatinName(client),
  client.name,
  client.firstName,
  client.lastName,
  client.nom,
  client.prenom,
  client.phone,
  client.passport?.number,
  client.passportNumber,
  client.passport_no,
  client.cin,
  client.nationalId,
  client.national_id,
  client.passport?.cin,
  client.passport?.nationalId,
  client.passport?.national_id,
].filter(Boolean).join(" "));

const normalizeRoomCreateCount = (value) => {
  const count = Math.floor(Number(value));
  if (!Number.isFinite(count)) return 1;
  return Math.min(100, Math.max(1, count));
};

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

const safeCellValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value.trim();
  if (typeof value === "boolean") return value ? "true" : "false";
  return "";
};

const compareText = (a, b, lang = "ar") => String(a || "").localeCompare(String(b || ""), lang === "ar" ? "ar" : lang);

const pushVerticalMerge = (merges, startRow, endRow, columnIndex) => {
  if (endRow > startRow) {
    merges.push({ s: { r: startRow, c: columnIndex }, e: { r: endRow, c: columnIndex } });
  }
};

const buildPilgrimsListSheet = (clients = [], lang = "ar", labels = {}) => {
  const rows = clients
    .map((client, index) => ({
      latinName: safeCellValue(getClientLatinName(client)),
      localName: safeCellValue(getClientArabicName(client) || resolveClientDisplayName(client, "")),
      phone: safeCellValue(client.phone),
      source: safeCellValue(getClientRegistrationSource(client)),
      serviceType: safeCellValue(getClientServiceTypeLabel(client, {}, lang)),
      index,
    }))
    .sort((a, b) => (
      compareText(a.source, b.source, lang)
      || compareText(a.phone, b.phone, lang)
      || compareText(a.localName, b.localName, lang)
      || compareText(a.latinName, b.latinName, lang)
      || a.index - b.index
    ));
  const data = [
    [
      "Nom complet",
      labels.localName,
      labels.phone,
      labels.registrationSource,
      labels.serviceType,
    ],
    ...rows.map((row) => [row.latinName, row.localName, row.phone, row.source, row.serviceType]),
  ];
  const merges = [];
  ["phone", "source"].forEach((field) => {
    const columnIndex = field === "phone" ? 2 : 3;
    let groupStart = 0;
    for (let index = 1; index <= rows.length; index += 1) {
      const current = rows[groupStart]?.[field] || "";
      const sameGroup = index < rows.length && rows[index]?.[field] === current;
      if (sameGroup) continue;
      if (current) pushVerticalMerge(merges, groupStart + 1, index, columnIndex);
      groupStart = index;
    }
  });
  return { data, merges };
};

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
export default function ProgramsPage({ store, onToast, notificationFocus = null }) {
  const { programs, clients, addProgram, updateProgram, archiveProgramRecord, trashProgramRecord, deleteProgram,
          getClientTotalPaid } = store;
  const { t, lang, dir } = useLang();
  const isRTL = dir === "rtl";
  const clientsReady = !store.isSupabaseEnabled || store.clientsLoaded;
  const paymentsReady = !store.isSupabaseEnabled || store.paymentsLoaded;
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
  const [programTypeFilter, setProgramTypeFilter] = React.useState("all");
  const [programStatusFilter, setProgramStatusFilter] = React.useState("all");
  const [programsPageSize, setProgramsPageSize] = React.useState(PROGRAMS_LIST_DEFAULT_PAGE_SIZE);
  const [programsCurrentPage, setProgramsCurrentPage] = React.useState(1);
  const [programSelectionMode, setProgramSelectionMode] = React.useState(false);
  const [selectedProgramIds, setSelectedProgramIds] = React.useState(() => new Set());
  const [programSearchOpen, setProgramSearchOpen] = React.useState(false);
  const [highlightProgramId, setHighlightProgramId] = React.useState("");
  const [programTypeMenuOpen, setProgramTypeMenuOpen] = React.useState(false);
  const [programStatusMenuOpen, setProgramStatusMenuOpen] = React.useState(false);
  const [yearMenuOpen, setYearMenuOpen] = React.useState(false);
  const [programPageSizeMenuOpen, setProgramPageSizeMenuOpen] = React.useState(false);
  const [hoveredYearOption, setHoveredYearOption] = React.useState(null);
  const [hoveredProgramPageSizeOption, setHoveredProgramPageSizeOption] = React.useState(null);
  const [deletePrompt,  setDeletePrompt]  = React.useState(null);
  const [archivePrompt, setArchivePrompt] = React.useState(null);
  const [bulkTrashPrompt, setBulkTrashPrompt] = React.useState(null);
  const [duplicatePrompt, setDuplicatePrompt] = React.useState(null);
  const [serverProgramPage, setServerProgramPage] = React.useState({ status: "idle", data: null });
  const yearMenuRef = React.useRef(null);
  const yearButtonRef = React.useRef(null);
  const programTypeMenuRef = React.useRef(null);
  const programTypeButtonRef = React.useRef(null);
  const programStatusMenuRef = React.useRef(null);
  const programStatusButtonRef = React.useRef(null);
  const programPageSizeMenuRef = React.useRef(null);
  const programPageSizeButtonRef = React.useRef(null);
  const programSearchInputRef = React.useRef(null);
  const programCardRefs = React.useRef(new Map());
  const metricsHydrationRequestedRef = React.useRef(false);
  const serverProgramPageData = store.isSupabaseEnabled && serverProgramPage.status === "ready" ? serverProgramPage.data : null;
  const serverProgramPageReady = Boolean(serverProgramPageData);
  const programMetricsReady = Boolean(serverProgramPageReady) || (clientsReady && paymentsReady);

  React.useEffect(() => {
    if (!store.isSupabaseEnabled) {
      setServerProgramPage({ status: "idle", data: null });
      return undefined;
    }

    let cancelled = false;
    const requestedPage = Math.max(1, Number(programsCurrentPage) || 1);
    const offset = (requestedPage - 1) * programsPageSize;
    const year = selectedYear === "all" ? null : Number(selectedYear);

    setServerProgramPage({ status: "loading", data: null });
    db.programs.fetchPageSummary({
      search,
      year: Number.isFinite(year) ? year : null,
      type: programTypeFilter,
      status: programStatusFilter,
      limit: programsPageSize,
      offset,
    }).then((result) => {
      if (cancelled) return;
      if (result?.error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[ProgramsPage] Program summary RPC failed; using frontend summary fallback.", result.error);
        }
        setServerProgramPage({ status: "failed", data: null, error: result.error });
        return;
      }
      setServerProgramPage({ status: "ready", data: result.data });
    }).catch((error) => {
      if (cancelled) return;
      if (process.env.NODE_ENV === "development") {
        console.warn("[ProgramsPage] Program summary RPC failed; using frontend summary fallback.", error);
      }
      setServerProgramPage({ status: "failed", data: null, error });
    });

    return () => {
      cancelled = true;
    };
  }, [
    store.isSupabaseEnabled,
    search,
    selectedYear,
    programTypeFilter,
    programStatusFilter,
    programsPageSize,
    programsCurrentPage,
    programs,
    store.lastSynced,
  ]);

  React.useEffect(() => {
    if (!store.isSupabaseEnabled) return;
    if (clientsReady && paymentsReady) return;
    if (metricsHydrationRequestedRef.current) return;
    metricsHydrationRequestedRef.current = true;
    if (!clientsReady && !store.clientsLoading) store.ensureClientsLoaded?.();
    if (!paymentsReady && !store.paymentsLoading) store.ensurePaymentsLoaded?.();
  }, [
    clientsReady,
    paymentsReady,
    store.isSupabaseEnabled,
    store.clientsLoading,
    store.paymentsLoading,
    store.ensureClientsLoaded,
    store.ensurePaymentsLoaded,
  ]);

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

  const programTypeLabels = React.useMemo(() => ({
    all: t.programTypeAll,
    umrah: t.programTypeUmrah,
    hajj: t.programTypeHajj,
  }), [t.programTypeAll, t.programTypeUmrah, t.programTypeHajj]);

  const programStatusLabels = React.useMemo(() => ({
    all: t.programStatusAll,
    cleared: t.programStatusCleared,
    not_cleared: t.programStatusNotCleared,
    full: t.programStatusFull,
    not_full: t.programStatusNotFull,
  }), [
    t.programStatusAll,
    t.programStatusCleared,
    t.programStatusNotCleared,
    t.programStatusFull,
    t.programStatusNotFull,
  ]);

  const yearOptions = React.useMemo(() => ([
    { value: "all", label: allYearsLabel },
    { value: String(currentYear), label: String(currentYear) },
    { value: String(nextYear), label: String(nextYear) },
  ]), [allYearsLabel, currentYear, nextYear]);

  const selectedYearOption = React.useMemo(
    () => yearOptions.find((option) => option.value === selectedYear) || yearOptions[0],
    [yearOptions, selectedYear]
  );

  const activePrograms = React.useMemo(() => (
    programs.filter((program) => (
      program
      && !program.deleted
      && !program.deletedAt
      && String(program.status || "active").toLowerCase() !== "archived"
    ))
  ), [programs]);

  const activeProgramById = React.useMemo(() => (
    new Map(activePrograms.map((program) => [String(program.id), program]))
  ), [activePrograms]);

  const clientsByProgramId = React.useMemo(() => {
    const map = new Map();
    clients.forEach((client) => {
      if (!client?.programId) return;
      const programId = String(client.programId);
      const list = map.get(programId) || [];
      list.push(client);
      map.set(programId, list);
    });
    return map;
  }, [clients]);

  const activeClientsByProgramId = React.useMemo(() => {
    const sourceClients = Array.isArray(store.activeClients) ? store.activeClients : clients;
    const map = new Map();
    sourceClients.forEach((client) => {
      if (!client?.programId || client.deleted || client.deletedAt || client.archived) return;
      const programId = String(client.programId);
      const list = map.get(programId) || [];
      list.push(client);
      map.set(programId, list);
    });
    return map;
  }, [clients, store.activeClients]);

  const frontendProgramSummaryById = React.useMemo(() => (
    buildProgramListSummaryById({
      programs: activePrograms,
      clientsByProgramId,
      activeClientsByProgramId,
      getClientTotalPaid,
      getProgramClientRemainingAmount,
      getProgramClientPaymentStatus,
      getClientStatusRemainingAmount: getClientRemainingAmount,
      getProgramKind,
      getProgramDepartureYear,
    })
  ), [activePrograms, activeClientsByProgramId, clientsByProgramId, getClientTotalPaid]);

  const serverProgramSummaryById = React.useMemo(() => {
    const map = new Map();
    if (!serverProgramPageReady) return map;
    (serverProgramPageData.items || []).forEach((program) => {
      if (program?.id && program.programSummary) {
        map.set(String(program.id), program.programSummary);
      }
    });
    return map;
  }, [serverProgramPageData, serverProgramPageReady]);

  const programSummaryById = React.useMemo(() => {
    if (!serverProgramPageReady) return frontendProgramSummaryById;
    const map = new Map(frontendProgramSummaryById);
    serverProgramSummaryById.forEach((summary, programId) => {
      map.set(programId, summary);
    });
    return map;
  }, [frontendProgramSummaryById, serverProgramPageReady, serverProgramSummaryById]);

  const serverVisiblePrograms = React.useMemo(() => {
    if (!serverProgramPageReady) return [];
    return (serverProgramPageData.items || []).map((program) => {
      const fullProgram = activeProgramById.get(String(program.id));
      return fullProgram
        ? { ...program, ...fullProgram, programSummary: program.programSummary }
        : program;
    });
  }, [activeProgramById, serverProgramPageData, serverProgramPageReady]);

  const baseFilteredPrograms = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return activePrograms.filter((program) => {
      const matchesSearch = !q || (program.name || "").toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (selectedYear === "all") return true;
      const departureYear = programSummaryById.get(String(program.id))?.year ?? getProgramDepartureYear(program);
      return departureYear === Number(selectedYear);
    });
  }, [activePrograms, programSummaryById, search, selectedYear]);

  const programTypeOptions = React.useMemo(() => ([
    { key: "all", label: programTypeLabels.all, count: baseFilteredPrograms.length },
    { key: "umrah", label: programTypeLabels.umrah, count: baseFilteredPrograms.filter((program) => programSummaryById.get(String(program.id))?.typeKind === "umrah").length },
    { key: "hajj", label: programTypeLabels.hajj, count: baseFilteredPrograms.filter((program) => programSummaryById.get(String(program.id))?.typeKind === "hajj").length },
  ]), [baseFilteredPrograms, programSummaryById, programTypeLabels]);

  const selectedProgramTypeOption = React.useMemo(
    () => programTypeOptions.find((option) => option.key === programTypeFilter) || programTypeOptions[0],
    [programTypeOptions, programTypeFilter]
  );

  const typeFilteredPrograms = React.useMemo(() => {
    if (programTypeFilter === "all") return baseFilteredPrograms;
    return baseFilteredPrograms.filter((program) => (
      programSummaryById.get(String(program.id))?.typeKind === programTypeFilter
    ));
  }, [baseFilteredPrograms, programSummaryById, programTypeFilter]);

  const getProgramStatusOptionCount = React.useCallback((key, fallbackCount) => (
    serverProgramPageReady && key === programStatusFilter
      ? serverProgramPageData.totalCount
      : fallbackCount
  ), [programStatusFilter, serverProgramPageData, serverProgramPageReady]);

  const programStatusOptions = React.useMemo(() => ([
    { key: "all", label: programStatusLabels.all, count: getProgramStatusOptionCount("all", typeFilteredPrograms.length) },
    {
      key: "cleared",
      label: programStatusLabels.cleared,
      count: getProgramStatusOptionCount("cleared", typeFilteredPrograms.filter((program) => programSummaryById.get(String(program.id))?.isCleared).length),
    },
    {
      key: "not_cleared",
      label: programStatusLabels.not_cleared,
      count: getProgramStatusOptionCount("not_cleared", typeFilteredPrograms.filter((program) => programSummaryById.get(String(program.id))?.isNotCleared).length),
    },
    {
      key: "full",
      label: programStatusLabels.full,
      count: getProgramStatusOptionCount("full", typeFilteredPrograms.filter((program) => programSummaryById.get(String(program.id))?.isFull).length),
    },
    {
      key: "not_full",
      label: programStatusLabels.not_full,
      count: getProgramStatusOptionCount("not_full", typeFilteredPrograms.filter((program) => programSummaryById.get(String(program.id))?.isNotFull).length),
    },
  ]), [getProgramStatusOptionCount, programStatusLabels, programSummaryById, typeFilteredPrograms]);

  const selectedProgramStatusOption = React.useMemo(
    () => programStatusOptions.find((option) => option.key === programStatusFilter) || programStatusOptions[0],
    [programStatusOptions, programStatusFilter]
  );

  const filteredPrograms = React.useMemo(() => {
    if (programStatusFilter === "all") return typeFilteredPrograms;
    if (programStatusFilter === "cleared" || programStatusFilter === "not_cleared") {
      return typeFilteredPrograms.filter((program) => (
        programSummaryById.get(String(program.id))?.paymentStatus === programStatusFilter
      ));
    }
    return typeFilteredPrograms.filter((program) => (
      programSummaryById.get(String(program.id))?.capacityStatus === programStatusFilter
    ));
  }, [programStatusFilter, programSummaryById, typeFilteredPrograms]);

  const totalProgramsCount = serverProgramPageReady
    ? serverProgramPageData.totalCount
    : filteredPrograms.length;
  const totalProgramsPages = Math.max(1, Math.ceil(totalProgramsCount / programsPageSize));
  const safeProgramsPage = Math.min(Math.max(1, programsCurrentPage), totalProgramsPages);
  const visiblePrograms = React.useMemo(() => {
    if (serverProgramPageReady) return serverVisiblePrograms;
    const start = (safeProgramsPage - 1) * programsPageSize;
    return filteredPrograms.slice(start, start + programsPageSize);
  }, [filteredPrograms, programsPageSize, safeProgramsPage, serverProgramPageReady, serverVisiblePrograms]);

  const visibleProgramIds = React.useMemo(() => (
    new Set(visiblePrograms.map((program) => String(program.id)))
  ), [visiblePrograms]);

  const selectedVisiblePrograms = React.useMemo(() => (
    visiblePrograms.filter((program) => selectedProgramIds.has(String(program.id)))
  ), [selectedProgramIds, visiblePrograms]);

  const selectedProgramsCount = selectedVisiblePrograms.length;
  const allVisibleProgramsSelected = visiblePrograms.length > 0 && selectedProgramsCount === visiblePrograms.length;
  const pageSizeSuffix = t.programPageSizeCompactLabel;
  const yearControlParts = selectedYear === "all"
    ? { label: selectedYearOption?.label, value: "" }
    : { label: yearLabel, value: selectedYearOption?.label };
  const programSearchExpanded = programSearchOpen || search.trim().length > 0;

  const clearProgramSelection = React.useCallback(() => {
    setSelectedProgramIds(new Set());
  }, []);

  const enterProgramSelectionMode = React.useCallback(() => {
    setProgramSelectionMode(true);
  }, []);

  const exitProgramSelectionMode = React.useCallback(() => {
    setProgramSelectionMode(false);
    clearProgramSelection();
  }, [clearProgramSelection]);

  const openProgramSearch = React.useCallback(() => {
    setProgramSearchOpen(true);
  }, []);

  const focusProgramSearch = React.useCallback(() => {
    setProgramSearchOpen(true);
    requestAnimationFrame(() => programSearchInputRef.current?.focus());
  }, []);

  const closeProgramSearchIfEmpty = React.useCallback(() => {
    if (!search.trim()) setProgramSearchOpen(false);
  }, [search]);

  const clearProgramSearch = React.useCallback(() => {
    setSearch("");
    requestAnimationFrame(() => programSearchInputRef.current?.focus());
  }, []);

  React.useEffect(() => {
    const targetId = notificationFocus?.targetId;
    if (!targetId) return undefined;
    const program = activePrograms.find((item) => String(item.id) === String(targetId));
    if (!program) {
      if (onToast) {
        const message = lang === "fr"
          ? "Le programme lié est indisponible."
          : lang === "en"
            ? "The linked program is unavailable."
            : "البرنامج المرتبط غير متاح.";
        onToast(message, "info");
      }
      return undefined;
    }
    setSearch("");
    setProgramTypeFilter("all");
    setProgramStatusFilter("all");
    exitProgramSelectionMode();
    const departureYear = getProgramDepartureYear(program);
    setSelectedYear(
      departureYear === currentYear || departureYear === nextYear
        ? String(departureYear)
        : "all"
    );
    setActiveProgram(null);
    setHighlightProgramId(String(targetId));
    const timer = window.setTimeout(() => {
      setHighlightProgramId((current) => current === String(targetId) ? "" : current);
    }, 3600);
    return () => window.clearTimeout(timer);
  }, [notificationFocus?.targetId, notificationFocus?.token, activePrograms, onToast, lang, currentYear, nextYear, exitProgramSelectionMode]);

  React.useEffect(() => {
    if (!highlightProgramId) return undefined;
    const timer = window.setTimeout(() => {
      const node = programCardRefs.current.get(String(highlightProgramId));
      if (node && typeof node.scrollIntoView === "function") {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [highlightProgramId, filteredPrograms]);

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

  React.useEffect(() => {
    if (!programTypeMenuOpen) return;
    const handlePointerDown = (event) => {
      const menuNode = programTypeMenuRef.current;
      const buttonNode = programTypeButtonRef.current;
      if (menuNode?.contains(event.target) || buttonNode?.contains(event.target)) return;
      setProgramTypeMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setProgramTypeMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [programTypeMenuOpen]);

  React.useEffect(() => {
    if (!programStatusMenuOpen) return;
    const handlePointerDown = (event) => {
      const menuNode = programStatusMenuRef.current;
      const buttonNode = programStatusButtonRef.current;
      if (menuNode?.contains(event.target) || buttonNode?.contains(event.target)) return;
      setProgramStatusMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setProgramStatusMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [programStatusMenuOpen]);

  React.useEffect(() => {
    if (!programPageSizeMenuOpen) return;
    const handlePointerDown = (event) => {
      const menuNode = programPageSizeMenuRef.current;
      const buttonNode = programPageSizeButtonRef.current;
      if (menuNode?.contains(event.target) || buttonNode?.contains(event.target)) return;
      setProgramPageSizeMenuOpen(false);
      setHoveredProgramPageSizeOption(null);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setProgramPageSizeMenuOpen(false);
        setHoveredProgramPageSizeOption(null);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [programPageSizeMenuOpen]);

  React.useEffect(() => {
    setProgramsCurrentPage(1);
  }, [search, selectedYear, programTypeFilter, programStatusFilter, programsPageSize]);

  React.useEffect(() => {
    if (programsCurrentPage > totalProgramsPages) setProgramsCurrentPage(totalProgramsPages);
  }, [programsCurrentPage, totalProgramsPages]);

  React.useEffect(() => {
    setSelectedProgramIds((current) => {
      let changed = false;
      const next = new Set();
      current.forEach((id) => {
        if (visibleProgramIds.has(String(id))) next.add(String(id));
        else changed = true;
      });
      return changed ? next : current;
    });
  }, [visibleProgramIds]);

  React.useEffect(() => {
    if (!highlightProgramId) return;
    const index = filteredPrograms.findIndex((program) => String(program.id) === String(highlightProgramId));
    if (index < 0) return;
    const targetPage = Math.floor(index / programsPageSize) + 1;
    setProgramsCurrentPage(targetPage);
  }, [filteredPrograms, highlightProgramId, programsPageSize]);

  const handleConfirmDeleteProgram = React.useCallback(() => {
    if (!deletePrompt) return;
    deleteProgram(deletePrompt.program.id);
    if (activeProgram === deletePrompt.program.id) setActiveProgram(null);
    setDeletePrompt(null);
    onToast(t.deleteSuccess, "info");
  }, [deletePrompt, deleteProgram, activeProgram, setActiveProgram, onToast, t.deleteSuccess]);
  const handleConfirmArchiveProgram = React.useCallback(async () => {
    if (!archivePrompt?.program) return;
    const result = await archiveProgramRecord?.(archivePrompt.program.id);
    if (result?.error) return;
    setArchivePrompt(null);
    onToast(t.programArchiveSuccess, "success");
  }, [archivePrompt, archiveProgramRecord, onToast, t.programArchiveSuccess]);

  const toggleProgramSelection = React.useCallback((programId, checked) => {
    setSelectedProgramIds((current) => {
      const next = new Set(current);
      const id = String(programId);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleSelectVisiblePrograms = React.useCallback((checked) => {
    setSelectedProgramIds((current) => {
      const next = new Set(current);
      visiblePrograms.forEach((program) => {
        const id = String(program.id);
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  }, [visiblePrograms]);

  const handleBulkArchivePrograms = React.useCallback(async () => {
    if (!selectedVisiblePrograms.length) return;
    if (!window.confirm(t.programBulkArchiveConfirm)) return;
    const results = await Promise.all(selectedVisiblePrograms.map((program) => (
      archiveProgramRecord?.(program.id)
    )));
    const failedCount = results.filter((result) => result?.error).length;
    if (failedCount) {
      onToast?.(tr("programBulkArchivePartial", { count: selectedVisiblePrograms.length - failedCount }), "warning");
      return;
    }
    exitProgramSelectionMode();
    onToast?.(tr("programBulkArchiveSuccess", { count: selectedVisiblePrograms.length }), "success");
  }, [archiveProgramRecord, exitProgramSelectionMode, onToast, selectedVisiblePrograms, t.programBulkArchiveConfirm, tr]);

  const openBulkTrashProgramsPrompt = React.useCallback(() => {
    if (!selectedVisiblePrograms.length) return;
    setBulkTrashPrompt({ programs: selectedVisiblePrograms });
  }, [selectedVisiblePrograms]);

  const handleConfirmBulkTrashPrograms = React.useCallback(async () => {
    const programsToTrash = bulkTrashPrompt?.programs || [];
    if (!programsToTrash.length) return;
    const results = await Promise.all(programsToTrash.map((program) => (
      trashProgramRecord?.(program.id)
    )));
    const failedCount = results.filter((result) => result?.error).length;
    if (failedCount) {
      onToast?.(tr("programBulkTrashPartial", { count: programsToTrash.length - failedCount }), "warning");
      return;
    }
    setBulkTrashPrompt(null);
    exitProgramSelectionMode();
    onToast?.(tr("programBulkTrashSuccess", { count: programsToTrash.length }), "success");
  }, [bulkTrashPrompt, exitProgramSelectionMode, onToast, trashProgramRecord, tr]);
  const openDuplicatePrompt = React.useCallback((program) => {
    if (!program || program.deleted || program.deletedAt || program.status === "archived") return;
    setDuplicatePrompt({
      program,
      name: buildDuplicateProgramName(program, programs, lang),
      error: "",
    });
  }, [programs, lang]);
  const closeDuplicatePrompt = React.useCallback(() => {
    setDuplicatePrompt(null);
  }, []);
  const handleDuplicateNameChange = React.useCallback((event) => {
    const value = event.target.value;
    setDuplicatePrompt((current) => current ? { ...current, name: value, error: "" } : current);
  }, []);
  const handleConfirmDuplicateProgram = React.useCallback(() => {
    if (!duplicatePrompt?.program) return;
    const cleanName = normalizeDuplicateProgramName(duplicatePrompt.name);
    if (!cleanName) {
      setDuplicatePrompt((current) => current ? {
        ...current,
        error: t.programDuplicateNameRequired || (lang === "fr" ? "Le nom du programme est obligatoire." : lang === "en" ? "Program name is required." : "اسم البرنامج مطلوب."),
      } : current);
      return;
    }
    if (!isDuplicateProgramNameAvailable(cleanName, programs)) {
      setDuplicatePrompt((current) => current ? {
        ...current,
        error: t.programDuplicateNameExists || (lang === "fr" ? "Un programme porte déjà ce nom." : lang === "en" ? "A program with this name already exists." : "يوجد برنامج بنفس الاسم."),
      } : current);
      return;
    }
    addProgram(createDuplicateProgramPayload(duplicatePrompt.program, cleanName));
    setDuplicatePrompt(null);
    onToast?.(t.programDuplicateSuccess || (lang === "fr" ? "Programme dupliqué" : lang === "en" ? "Program duplicated" : "تم إنشاء نسخة من البرنامج"), "success");
  }, [addProgram, duplicatePrompt, lang, onToast, programs, t.programDuplicateNameExists, t.programDuplicateNameRequired, t.programDuplicateSuccess]);
  const closeProgramForm = React.useCallback(() => {
    setShowForm(false);
    setEditing(null);
  }, []);
  const handleProgramFormSaved = React.useCallback(() => {
    const wasEditing = Boolean(editing);
    closeProgramForm();
    onToast(wasEditing ? t.updateSuccess : t.addSuccess, "success");
  }, [closeProgramForm, editing, onToast, t.addSuccess, t.updateSuccess]);

  if (activeProgram) {
    const prog = programs.find(p => p.id === activeProgram);
    if (!prog) { setActiveProgram(null); return null; }
    return (
      <>
        <ProgramInner
          program={prog} store={store} onToast={onToast}
          programSummaryById={programSummaryById}
          onBack={() => closeProgramDetail(true)}
          onEditProgram={() => setEditing(prog)}
        />
        <ProgramEditorModal
          open={!!editing}
          program={editing}
          store={store}
          title={t.editProgramTitle}
          onSaved={handleProgramFormSaved}
          onClose={closeProgramForm}
        />
      </>
    );
  }

  return (
    <div className="page-body programs-page" style={{ padding:"28px 32px" }}>
      <div className="page-header" style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, flexWrap:"wrap" }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:tc.white }}>{t.availablePrograms}</h1>
            <p style={{ fontSize:13, color:tc.grey, marginTop:4 }}>
              {tr("programsSubtitle", { count: activePrograms.length })}
            </p>
          </div>
          <Button variant="primary" icon="plus" onClick={() => setShowForm(true)}>{t.addProgram}</Button>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", direction:dir }}>
          <div
            onMouseEnter={openProgramSearch}
            onMouseLeave={() => {
              if (document.activeElement !== programSearchInputRef.current) closeProgramSearchIfEmpty();
            }}
            style={{
              order:4,
              width:programSearchExpanded ? 286 : 42,
              height:42,
              maxWidth:"100%",
              display:"flex",
              alignItems:"center",
              gap:6,
              borderRadius:12,
              background:"var(--rukn-bg-input)",
              border:`1px solid ${programSearchExpanded ? "rgba(212,175,55,.32)" : "var(--rukn-border)"}`,
              padding:programSearchExpanded ? "0 9px" : 0,
              overflow:"hidden",
              opacity:activePrograms.length ? 1 : .55,
              transition:"width .22s ease, border-color .22s ease, padding .22s ease, box-shadow .22s ease",
              boxShadow:programSearchExpanded ? "0 10px 26px rgba(15,23,42,.08)" : "none",
              direction:dir,
            }}
          >
            <button
              type="button"
              aria-label={searchPlaceholder}
              disabled={!activePrograms.length}
              onClick={focusProgramSearch}
              onFocus={openProgramSearch}
              style={{
                width:40,
                height:40,
                flex:"0 0 40px",
                border:0,
                background:"transparent",
                color:tc.gold,
                display:"inline-flex",
                alignItems:"center",
                justifyContent:"center",
                cursor:activePrograms.length ? "pointer" : "not-allowed",
              }}
            >
              <Search size={17} />
            </button>
            {programSearchExpanded && (
              <>
                <input
                  ref={programSearchInputRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onFocus={openProgramSearch}
                  onBlur={closeProgramSearchIfEmpty}
                  placeholder={searchPlaceholder}
                  disabled={!activePrograms.length}
                  style={{
                    flex:1,
                    minWidth:0,
                    border:0,
                    outline:0,
                    background:"transparent",
                    color:"var(--rukn-text)",
                    fontSize:13,
                    fontFamily:"'Cairo',sans-serif",
                    direction:dir,
                  }}
                />
                {search.trim() && (
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={clearProgramSearch}
                    style={{
                      width:24,
                      height:24,
                      border:0,
                      borderRadius:8,
                      background:"var(--rukn-bg-soft)",
                      display:"inline-flex",
                      alignItems:"center",
                      justifyContent:"center",
                      cursor:"pointer",
                    }}
                    aria-label={t.clear || "Clear"}
                  >
                    <AppIcon name="x" size={13} color="var(--rukn-text-muted)" />
                  </button>
                )}
              </>
            )}
          </div>
          <div style={{ order:2, position:"relative", flex:"0 0 150px", minWidth:138, maxWidth:170 }}>
            <button
              ref={programTypeButtonRef}
              type="button"
              aria-label={t.programType || (lang === "fr" ? "Type de programme" : lang === "en" ? "Program type" : "نوع البرنامج")}
              aria-haspopup="listbox"
              aria-expanded={programTypeMenuOpen}
              disabled={!activePrograms.length}
              onClick={() => activePrograms.length && setProgramTypeMenuOpen((open) => !open)}
              style={{
                width:"100%",
                height:42,
                display:"flex",
                alignItems:"center",
                justifyContent:"space-between",
                gap:10,
                background:programTypeFilter === "all" ? "var(--rukn-bg-input)" : "var(--rukn-gold-dim)",
                border:"1px solid var(--rukn-border)",
                borderRadius:12,
                padding:"0 12px",
                color:programTypeFilter === "all" ? "var(--rukn-text)" : "var(--rukn-gold)",
                fontSize:13,
                fontWeight:800,
                fontFamily:"'Cairo',sans-serif",
                direction:dir,
                opacity:activePrograms.length ? 1 : 0.55,
                cursor:activePrograms.length ? "pointer" : "not-allowed",
                transition:"border-color .2s, box-shadow .2s, background .2s",
              }}
            >
              <span style={{ display:"inline-flex", alignItems:"center", gap:7, minWidth:0 }}>
                <Filter size={14} />
                <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {selectedProgramTypeOption?.label}
                  <span style={{ color:"var(--rukn-text-muted)", fontWeight:700 }}> ({selectedProgramTypeOption?.count ?? 0})</span>
                </span>
              </span>
              <ChevronDown
                size={15}
                style={{ flexShrink:0, transform:programTypeMenuOpen ? "rotate(180deg)" : "none", transition:"transform .18s ease" }}
              />
            </button>
            {programTypeMenuOpen && (
              <div
                ref={programTypeMenuRef}
                role="listbox"
                aria-label={t.programType || (lang === "fr" ? "Type de programme" : lang === "en" ? "Program type" : "نوع البرنامج")}
                style={{
                  position:"absolute",
                  top:"calc(100% + 8px)",
                  insetInlineStart:0,
                  width:"100%",
                  minWidth:180,
                  zIndex:35,
                  padding:6,
                  borderRadius:14,
                  border:"1px solid var(--rukn-border-soft)",
                  background:"var(--rukn-bg-select)",
                  boxShadow:"var(--rukn-shadow-card)",
                  backdropFilter:"blur(12px)",
                }}
              >
                {programTypeOptions.map((option) => {
                  const active = option.key === programTypeFilter;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        setProgramTypeFilter(option.key);
                        setProgramTypeMenuOpen(false);
                      }}
                      style={{
                        width:"100%",
                        display:"flex",
                        alignItems:"center",
                        justifyContent:"space-between",
                        gap:10,
                        border:0,
                        borderRadius:10,
                        padding:"9px 10px",
                        background:active ? "var(--rukn-gold-dim)" : "transparent",
                        color:active ? "var(--rukn-gold)" : "var(--rukn-text)",
                        fontSize:12,
                        fontWeight:active ? 900 : 700,
                        fontFamily:"'Cairo',sans-serif",
                        cursor:"pointer",
                        textAlign:"start",
                      }}
                    >
                      <span>{option.label}</span>
                      <span style={{
                        minWidth:22,
                        height:20,
                        borderRadius:999,
                        display:"inline-flex",
                        alignItems:"center",
                        justifyContent:"center",
                        padding:"0 7px",
                        background:active ? "rgba(212,175,55,.16)" : "var(--rukn-bg-soft)",
                        color:active ? "var(--rukn-gold)" : "var(--rukn-text-muted)",
                        fontSize:10,
                        fontWeight:900,
                      }}>
                        {option.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ order:3, position:"relative", flex:"0 0 174px", minWidth:154, maxWidth:198 }}>
            <button
              ref={programStatusButtonRef}
              type="button"
              aria-label={t.programStatusFilter}
              aria-haspopup="listbox"
              aria-expanded={programStatusMenuOpen}
              disabled={!activePrograms.length}
              onClick={() => activePrograms.length && setProgramStatusMenuOpen((open) => !open)}
              style={{
                width:"100%",
                height:42,
                display:"flex",
                alignItems:"center",
                justifyContent:"space-between",
                gap:10,
                background:programStatusFilter === "all" ? "var(--rukn-bg-input)" : "var(--rukn-gold-dim)",
                border:"1px solid var(--rukn-border)",
                borderRadius:12,
                padding:"0 12px",
                color:programStatusFilter === "all" ? "var(--rukn-text)" : "var(--rukn-gold)",
                fontSize:13,
                fontWeight:800,
                fontFamily:"'Cairo',sans-serif",
                direction:dir,
                opacity:activePrograms.length ? 1 : 0.55,
                cursor:activePrograms.length ? "pointer" : "not-allowed",
                transition:"border-color .2s, box-shadow .2s, background .2s",
              }}
            >
              <span style={{ display:"inline-flex", alignItems:"center", gap:7, minWidth:0 }}>
                <Filter size={14} />
                <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {selectedProgramStatusOption?.label}
                  <span style={{ color:"var(--rukn-text-muted)", fontWeight:700 }}> ({selectedProgramStatusOption?.count ?? 0})</span>
                </span>
              </span>
              <ChevronDown
                size={15}
                style={{ flexShrink:0, transform:programStatusMenuOpen ? "rotate(180deg)" : "none", transition:"transform .18s ease" }}
              />
            </button>
            {programStatusMenuOpen && (
              <div
                ref={programStatusMenuRef}
                role="listbox"
                aria-label={t.programStatusFilter}
                style={{
                  position:"absolute",
                  top:"calc(100% + 8px)",
                  insetInlineStart:0,
                  width:"100%",
                  minWidth:190,
                  zIndex:35,
                  padding:6,
                  borderRadius:14,
                  border:"1px solid var(--rukn-border-soft)",
                  background:"var(--rukn-bg-select)",
                  boxShadow:"var(--rukn-shadow-card)",
                  backdropFilter:"blur(12px)",
                }}
              >
                {programStatusOptions.map((option) => {
                  const active = option.key === programStatusFilter;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        setProgramStatusFilter(option.key);
                        setProgramStatusMenuOpen(false);
                      }}
                      style={{
                        width:"100%",
                        display:"flex",
                        alignItems:"center",
                        justifyContent:"space-between",
                        gap:10,
                        border:0,
                        borderRadius:10,
                        padding:"9px 10px",
                        background:active ? "var(--rukn-gold-dim)" : "transparent",
                        color:active ? "var(--rukn-gold)" : "var(--rukn-text)",
                        fontSize:12,
                        fontWeight:active ? 900 : 700,
                        fontFamily:"'Cairo',sans-serif",
                        cursor:"pointer",
                        textAlign:"start",
                      }}
                    >
                      <span>{option.label}</span>
                      <span style={{
                        minWidth:22,
                        height:20,
                        borderRadius:999,
                        display:"inline-flex",
                        alignItems:"center",
                        justifyContent:"center",
                        padding:"0 7px",
                        background:active ? "rgba(212,175,55,.16)" : "var(--rukn-bg-soft)",
                        color:active ? "var(--rukn-gold)" : "var(--rukn-text-muted)",
                        fontSize:10,
                        fontWeight:900,
                      }}>
                        {option.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ order:1, position:"relative", flex:"0 0 138px", minWidth:126, maxWidth:156 }}>
            <button
              ref={yearButtonRef}
              type="button"
              aria-label={yearLabel}
              aria-haspopup="listbox"
              aria-expanded={yearMenuOpen}
              disabled={!activePrograms.length}
              onClick={() => activePrograms.length && setYearMenuOpen((open) => !open)}
              style={{
                width:"100%",
                height:42,
                background:"var(--rukn-bg-input)",
                border:"1px solid var(--rukn-border)",
                borderRadius:12,
                padding: isRTL ? "12px 18px 12px 42px" : "12px 42px 12px 18px",
                color:"var(--rukn-text)",
                fontSize:13,
                fontWeight:800,
                fontFamily:"'Cairo',sans-serif",
                direction: dir,
                outline:"none",
                transition:"border-color .2s, box-shadow .2s",
                opacity: activePrograms.length ? 1 : 0.55,
                cursor: activePrograms.length ? "pointer" : "not-allowed",
                display:"flex",
                alignItems:"center",
                justifyContent:"flex-start",
                textAlign: isRTL ? "right" : "left",
              }}
            >
              <span style={{ display:"inline-flex", alignItems:"baseline", gap:6, minWidth:0 }}>
                <span style={{ color:"var(--rukn-text)", fontWeight:700 }}>{yearControlParts.label}</span>
                {yearControlParts.value && (
                  <span style={{ color:"var(--rukn-gold)", fontWeight:900 }}>{yearControlParts.value}</span>
                )}
              </span>
            </button>
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
          {activePrograms.length > 0 && (
            <>
              <div style={{ order:5, display:"flex", flexWrap:"wrap", alignItems:"center", gap:8 }}>
                <Button
                  variant={programSelectionMode ? "warning" : "ghost"}
                  size="sm"
                  icon="checked"
                  disabled={!visiblePrograms.length}
                  onClick={programSelectionMode ? exitProgramSelectionMode : enterProgramSelectionMode}
                >
                  {programSelectionMode ? t.programCancelSelection : t.programSelectPrograms}
                </Button>
                {programSelectionMode && (
                  <label style={{
                    display:"inline-flex",
                    alignItems:"center",
                    gap:8,
                    height:34,
                    padding:"0 10px",
                    border:"1px solid var(--rukn-border-soft)",
                    borderRadius:9,
                    background:"var(--rukn-bg-soft)",
                    color:"var(--rukn-text)",
                    fontSize:12,
                    fontWeight:800,
                    cursor:visiblePrograms.length ? "pointer" : "not-allowed",
                    opacity:visiblePrograms.length ? 1 : .55,
                  }}>
                    <input
                      type="checkbox"
                      checked={allVisibleProgramsSelected}
                      disabled={!visiblePrograms.length}
                      onChange={(event) => toggleSelectVisiblePrograms(event.target.checked)}
                      style={{ width:15, height:15, accentColor:tc.gold, cursor:"pointer" }}
                    />
                    {t.programSelectVisible}
                  </label>
                )}
              </div>
              <div style={{
                order:7,
                position:"relative",
                height:34,
                display:"inline-flex",
                alignItems:"center",
              }}>
                <button
                  ref={programPageSizeButtonRef}
                  type="button"
                  aria-label={pageSizeSuffix}
                  aria-haspopup="listbox"
                  aria-expanded={programPageSizeMenuOpen}
                  onClick={() => setProgramPageSizeMenuOpen((open) => !open)}
                  style={{
                    height:34,
                    display:"inline-flex",
                    alignItems:"center",
                    justifyContent:"space-between",
                    gap:8,
                    border:"1px solid var(--rukn-border-soft)",
                    borderRadius:9,
                    background:"var(--rukn-bg-soft)",
                    padding:"0 10px",
                    color:"var(--rukn-text-muted)",
                    fontSize:12,
                    fontWeight:800,
                    fontFamily:"'Cairo',sans-serif",
                    direction:dir,
                    whiteSpace:"nowrap",
                    cursor:"pointer",
                    transition:"border-color .2s, box-shadow .2s, background .2s",
                  }}
                >
                  <span style={{ display:"inline-flex", alignItems:"baseline", gap:7, minWidth:0 }}>
                    <span>{pageSizeSuffix}</span>
                    <span style={{ color:"var(--rukn-gold)", fontWeight:900, minWidth:18, textAlign:"center" }}>
                      {programsPageSize}
                    </span>
                  </span>
                  <ChevronDown
                    size={13}
                    color="var(--rukn-text-muted)"
                    strokeWidth={2.3}
                    style={{
                      flexShrink:0,
                      transform:programPageSizeMenuOpen ? "rotate(180deg)" : "none",
                      transition:"transform .18s ease",
                    }}
                  />
                </button>
                {programPageSizeMenuOpen && (
                  <div
                    ref={programPageSizeMenuRef}
                    role="listbox"
                    aria-label={pageSizeSuffix}
                    style={{
                      position:"absolute",
                      top:"calc(100% + 8px)",
                      insetInlineStart:0,
                      minWidth:"100%",
                      width:96,
                      zIndex:35,
                      padding:6,
                      borderRadius:14,
                      border:"1px solid var(--rukn-border-soft)",
                      background:"var(--rukn-bg-select)",
                      boxShadow:"var(--rukn-shadow-card)",
                      backdropFilter:"blur(12px)",
                    }}
                  >
                    {PROGRAMS_LIST_PAGE_SIZE_OPTIONS.map((option) => {
                      const active = option === programsPageSize;
                      const hovered = hoveredProgramPageSizeOption === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          role="option"
                          aria-selected={active}
                          onMouseEnter={() => setHoveredProgramPageSizeOption(option)}
                          onMouseLeave={() => setHoveredProgramPageSizeOption((current) => current === option ? null : current)}
                          onClick={() => {
                            setProgramsPageSize(option);
                            setProgramPageSizeMenuOpen(false);
                            setHoveredProgramPageSizeOption(null);
                          }}
                          style={{
                            width:"100%",
                            border:0,
                            borderRadius:10,
                            padding:"8px 10px",
                            background:active
                              ? "var(--rukn-gold-dim)"
                              : hovered
                                ? "var(--rukn-row-hover)"
                                : "transparent",
                            color:active ? "var(--rukn-gold)" : "var(--rukn-text)",
                            fontSize:12,
                            fontWeight:active ? 900 : 800,
                            fontFamily:"'Cairo',sans-serif",
                            textAlign:"center",
                            cursor:"pointer",
                            transition:"background-color .16s ease, color .16s ease",
                          }}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {activePrograms.length === 0 ? (
        <EmptyState icon="program" title={t.noProgramsTitle} sub={t.noProgramsSub} />
      ) : !programMetricsReady ? (
        <GlassCard style={{ padding:18, textAlign:"center", color:tc.grey, fontSize:13 }}>
          {t.loading || "Loading..."}
        </GlassCard>
      ) : totalProgramsCount === 0 ? (
        <EmptyState icon="search" title={t.noResultsTitle} sub={t.noResultsSub} />
      ) : (
        <div>
          {programSelectionMode && selectedProgramsCount > 0 && (
            <GlassCard style={{ padding:"12px 16px", marginBottom:14 }}>
              <div style={{
                display:"flex",
                flexWrap:"wrap",
                gap:12,
                alignItems:"center",
                justifyContent:"space-between",
                direction:dir,
              }}>
                <span style={{ fontSize:13, color:tc.gold, fontWeight:800 }}>
                  {tr("programBulkSelectedCount", { count: selectedProgramsCount })}
                </span>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon="archive"
                    onClick={handleBulkArchivePrograms}
                  >
                    {t.programArchiveSelected}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="trash"
                    onClick={openBulkTrashProgramsPrompt}
                    style={{
                      border:"1px solid rgba(239,68,68,.28)",
                      color:tc.danger,
                      background:"rgba(239,68,68,.06)",
                    }}
                  >
                    {t.programTrashSelected}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearProgramSelection}
                  >
                    {t.programClearSelection}
                  </Button>
                </div>
              </div>
            </GlassCard>
          )}
          <div className="cards-grid program-card-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:20 }}>
            {visiblePrograms.map((p, i) => {
              const pc = clientsByProgramId.get(String(p.id)) || [];
              const summary = programSummaryById.get(String(p.id)) || {};
              const deletePromptClients = clientsReady
                ? pc
                : Array.from({ length: summary.registeredCount || 0 });
              const selected = selectedProgramIds.has(String(p.id));
              return (
                <div
                  key={p.id}
                  ref={(node) => {
                    if (node) programCardRefs.current.set(String(p.id), node);
                    else programCardRefs.current.delete(String(p.id));
                  }}
                >
                  <ProgramCard program={p}
                    registered={summary.registeredCount || 0} pct={summary.capacityPct || 0}
                    totalPaid={summary.totalPaid || 0} totalRemaining={summary.remainingTotal || 0}
                    cleared={summary.clearedCount || 0} unpaid={summary.unpaidCount || 0} delay={i*.06}
                    programSummary={summary}
                    highlighted={String(highlightProgramId) === String(p.id)}
                    selected={programSelectionMode && selected}
                    selectionLabel={t.programSelectVisible}
                    onSelectionChange={programSelectionMode ? (checked) => toggleProgramSelection(p.id, checked) : undefined}
                    onClick={() => {
                      if (programSelectionMode) return;
                      openProgramDetail(p.id);
                    }}
                    onEdit={e => { e.stopPropagation(); setEditing(p); }}
                    onDuplicate={e => {
                      e.stopPropagation();
                      openDuplicatePrompt(p);
                    }}
                    onArchive={e => {
                      e.stopPropagation();
                      setArchivePrompt({ program: p });
                    }}
                    onDelete={e => {
                      e.stopPropagation();
                      setDeletePrompt({ program: p, clients: deletePromptClients });
                    }}
                    lang={lang}
                    formatCurrencyForLang={formatCurrencyForLang}
                  />
                </div>
              );
            })}
          </div>
          {totalProgramsPages > 1 && (
            <div style={{
              display:"flex",
              justifyContent:"center",
              alignItems:"center",
              gap:10,
              marginTop:20,
              flexWrap:"wrap",
            }}>
              <Button
                variant="ghost"
                size="sm"
                disabled={safeProgramsPage <= 1}
                onClick={() => setProgramsCurrentPage((page) => Math.max(1, page - 1))}
              >
                {t.programPagePrevious}
              </Button>
              <span style={{ color:"var(--rukn-text-muted)", fontSize:12, fontWeight:800 }}>
                {tr("programPageIndicator", { page: safeProgramsPage, total: totalProgramsPages })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={safeProgramsPage >= totalProgramsPages}
                onClick={() => setProgramsCurrentPage((page) => Math.min(totalProgramsPages, page + 1))}
              >
                {t.programPageNext}
              </Button>
            </div>
          )}
        </div>
      )}

      <ProgramEditorModal
        open={showForm || !!editing}
        program={editing}
        store={store}
        title={editing ? t.editProgramTitle : t.addProgramTitle}
        onSaved={handleProgramFormSaved}
        onClose={closeProgramForm}
      />
      <DuplicateProgramModal
        prompt={duplicatePrompt}
        onNameChange={handleDuplicateNameChange}
        onCreate={handleConfirmDuplicateProgram}
        onClose={closeDuplicatePrompt}
        lang={lang}
        t={t}
      />
      <Modal
        open={!!archivePrompt}
        onClose={() => setArchivePrompt(null)}
        title={t.programArchiveTitle}
        width={560}
      >
        {archivePrompt && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <p style={{ fontSize:15, fontWeight:800, color:"var(--rukn-text-strong)", marginBottom:8 }}>
                {tr("programArchiveQuestion", { name: archivePrompt.program.name })}
              </p>
              <p style={{ fontSize:13, color:"var(--rukn-text-muted)", lineHeight:1.7 }}>
                {t.programArchiveHiddenFromPrograms}
              </p>
            </div>
            <GlassCard style={{ padding:12, background:"var(--rukn-bg-soft)", borderColor:"var(--rukn-border-soft)" }}>
              <div style={{ display:"grid", gap:9 }}>
                {[
                  ["shieldCheck", t.programArchiveNotDeletion],
                  ["archive", t.programArchiveDataSafe],
                  ["restore", t.programArchiveRestoreLater],
                ].map(([icon, label]) => (
                  <div key={icon} style={{ display:"flex", alignItems:"flex-start", gap:9, color:"var(--rukn-text)", fontSize:12.5, lineHeight:1.55 }}>
                    <AppIcon name={icon} size={15} color={tc.gold} style={{ marginTop:2 }} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:12, flexWrap:"wrap" }}>
              <Button variant="ghost" onClick={() => setArchivePrompt(null)}>
                {t.cancel}
              </Button>
              <Button variant="secondary" icon="archive" onClick={handleConfirmArchiveProgram}>
                {t.programArchiveConfirm}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        open={!!bulkTrashPrompt}
        onClose={() => setBulkTrashPrompt(null)}
        title={t.programBulkTrashTitle}
        width={560}
      >
        {bulkTrashPrompt && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <p style={{ fontSize:14, color:"var(--rukn-text)", lineHeight:1.7 }}>
              {t.programBulkTrashBody}
            </p>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:12, flexWrap:"wrap" }}>
              <Button variant="ghost" onClick={() => setBulkTrashPrompt(null)}>
                {t.cancel}
              </Button>
              <Button variant="danger" icon="trash" onClick={handleConfirmBulkTrashPrograms}>
                {t.programBulkTrashConfirmAction}
              </Button>
            </div>
          </div>
        )}
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
// PROGRAM INNER — full client list
// ═══════════════════════════════════════
function ProgramInner({ program, store, onToast, onBack, onEditProgram, programSummaryById = null }) {
  const {
    clients,
    getClientTotalPaid,
    getClientPayments,
    agency,
    programs: allPrograms,
    activeClients = [],
    transferClients,
    deleteClientsBulk,
    deleteClient,
    updateProgram,
  } = store;
  const { t, lang, dir } = useLang();
  const isRTL = dir === "rtl";
  const { enabled: programPostersEnabled } = useAgencyFeature(
    store.agencyId,
    AGENCY_FEATURES.PROGRAM_POSTERS
  );
  const { templates: assignedCodePosterTemplates } = useAgencyCodePosterTemplates(store.agencyId);
  const clientsReady = !store.isSupabaseEnabled || store.clientsLoaded;
  const paymentsReady = !store.isSupabaseEnabled || store.paymentsLoaded;
  const detailDataReady = clientsReady && paymentsReady;
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
  const [showExcelImport, setShowExcelImport] = React.useState(false);
  const [excelImportSaving, setExcelImportSaving] = React.useState(false);
  const [showPassportImport, setShowPassportImport] = React.useState(false);
  const [editingClient,  setEditingClient]  = React.useState(null);
  const [selectMode,     setSelectMode]     = React.useState(false);
  const [checkedIds,     setCheckedIds]     = React.useState(new Set());
  const [transferTargets, setTransferTargets] = React.useState([]);
  const [transferSheetOpen, setTransferSheetOpen] = React.useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const closeExcelImportModal = React.useCallback(() => {
    if (excelImportSaving) return;
    setShowExcelImport(false);
  }, [excelImportSaving]);
  const [bulkActionsOpen, setBulkActionsOpen] = React.useState(false);
  const [packageFilter, setPackageFilter] = React.useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = React.useState("all");
  const [programClientPage, setProgramClientPage] = React.useState(1);
  const [programClientPageSize, setProgramClientPageSize] = React.useState(PROGRAM_DETAIL_DEFAULT_PAGE_SIZE);
  const [programTab, setProgramTab] = React.useState("clients");
  const [costingOpen, setCostingOpen] = React.useState(false);
  const [statusFilterOpen, setStatusFilterOpen] = React.useState(false);
  const [serviceTypeFilterOpen, setServiceTypeFilterOpen] = React.useState(false);
  const [packageFilterOpen, setPackageFilterOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [headerActionsOpen, setHeaderActionsOpen] = React.useState(false);
  const [badgeExportBusy, setBadgeExportBusy] = React.useState(false);
  const [wordContractExportBusy, setWordContractExportBusy] = React.useState(false);
  const [posterExportBusy, setPosterExportBusy] = React.useState(false);
  const [posterTemplateChoice, setPosterTemplateChoice] = React.useState(null);
  const [posterTemplateChoiceId, setPosterTemplateChoiceId] = React.useState("");
  const [hoveredHeaderAction, setHoveredHeaderAction] = React.useState("");
  const searchInputRef = React.useRef(null);
  const headerActionsRef = React.useRef(null);
  const bulkActionsBtnRef = React.useRef(null);
  const bulkActionsMenuRef = React.useRef(null);
  const packageFilterRef = React.useRef(null);
  const statusFilterRef = React.useRef(null);
  const serviceTypeFilterRef = React.useRef(null);
  const detailHydrationRequestedRef = React.useRef(false);
  const scopedProgramDetailHiddenPaymentIdsRef = React.useRef(new Set());
  const [scopedProgramDetailRefreshKey, setScopedProgramDetailRefreshKey] = React.useState(0);
  const [scopedProgramDetail, setScopedProgramDetail] = React.useState({
    programId: "",
    status: "idle",
    program: null,
    clients: [],
    payments: [],
    error: null,
  });
  const packages = React.useMemo(() => normalizeProgramPackages(program), [program]);
  const participantTerms = React.useMemo(() => getParticipantTerminology(program, lang), [program, lang]);
  const participantExcelImportLabel = React.useMemo(() => {
    if (lang === "fr") return `${participantTerms.importAction} depuis Excel / CSV`;
    if (lang === "en") return `${participantTerms.importAction} from Excel / CSV`;
    return `${participantTerms.importAction} من Excel / CSV`;
  }, [lang, participantTerms.importAction]);
  const completionLabels = React.useMemo(() => getClientCompletionLabels(lang), [lang]);
  const bulkActionsMenuPos = useDropdownPosition({
    anchorRef: bulkActionsBtnRef,
    menuRef: bulkActionsMenuRef,
    open: bulkActionsOpen,
    rtl: isRTL,
    offset: MENU_OFFSET_PX,
  });

  const ensureGlobalDetailData = React.useCallback(async ({ notify = false } = {}) => {
    if (!store.isSupabaseEnabled) return true;
    if (clientsReady && paymentsReady) return true;

    const tasks = [];
    if (!clientsReady) {
      if (typeof store.ensureClientsLoaded !== "function") return false;
      tasks.push(store.ensureClientsLoaded());
    }
    if (!paymentsReady) {
      if (typeof store.ensurePaymentsLoaded !== "function") return false;
      tasks.push(store.ensurePaymentsLoaded());
    }

    try {
      const results = await Promise.all(tasks);
      const error = results.find((result) => result?.error)?.error;
      if (error) {
        if (notify) onToast?.(t.loadingFailed || t.error || "تعذر تحميل البيانات", "error");
        return false;
      }
      return true;
    } catch (error) {
      console.error("[Programs] Global detail hydration failed:", error);
      if (notify) onToast?.(t.loadingFailed || t.error || "تعذر تحميل البيانات", "error");
      return false;
    }
  }, [
    clientsReady,
    paymentsReady,
    store.isSupabaseEnabled,
    store.ensureClientsLoaded,
    store.ensurePaymentsLoaded,
    onToast,
    t.loadingFailed,
    t.error,
  ]);

  const runWithGlobalDetailData = React.useCallback(async (action) => {
    const ready = await ensureGlobalDetailData({ notify: true });
    if (!ready) return;
    action?.();
  }, [ensureGlobalDetailData]);

  const ensureGlobalDetailDataForCurrentAction = React.useCallback(async () => {
    if (detailDataReady) return true;
    const ready = await ensureGlobalDetailData({ notify: true });
    if (ready) onToast?.(t.loading || "Loading...", "info");
    return false;
  }, [detailDataReady, ensureGlobalDetailData, onToast, t.loading]);

  const refreshScopedProgramDetail = React.useCallback((options = {}) => {
    const programId = String(program.id || "");
    if (!programId) return;
    const hiddenPaymentIds = Array.isArray(options?.hiddenPaymentIds)
      ? options.hiddenPaymentIds.map((id) => String(id || "")).filter(Boolean)
      : [];
    if (hiddenPaymentIds.length) {
      const nextHiddenIds = new Set(scopedProgramDetailHiddenPaymentIdsRef.current);
      hiddenPaymentIds.forEach((id) => nextHiddenIds.add(id));
      scopedProgramDetailHiddenPaymentIdsRef.current = nextHiddenIds;
    }
    setScopedProgramDetail((current) => (
      current.programId === programId
        ? {
            ...current,
            status: current.program || current.clients.length || current.payments.length ? "refreshing" : "loading",
            payments: scopedProgramDetailHiddenPaymentIdsRef.current.size
              ? current.payments.filter((payment) => !scopedProgramDetailHiddenPaymentIdsRef.current.has(String(payment?.id || "")))
              : current.payments,
            error: null,
          }
        : current
    ));
    setScopedProgramDetailRefreshKey((key) => key + 1);
  }, [program.id]);

  React.useEffect(() => {
    detailHydrationRequestedRef.current = false;
    scopedProgramDetailHiddenPaymentIdsRef.current = new Set();
  }, [program.id]);

  React.useEffect(() => {
    const programId = String(program.id || "");
    if (!programId) return undefined;

    let cancelled = false;
    let refreshTimer = null;
    const filterHiddenPayments = (payments = []) => {
      const hiddenPaymentIds = scopedProgramDetailHiddenPaymentIdsRef.current;
      if (!hiddenPaymentIds.size) return payments;
      return payments.filter((payment) => !hiddenPaymentIds.has(String(payment?.id || "")));
    };
    setScopedProgramDetail((current) => {
      const keepCurrent = current.programId === programId
        && (current.program || current.clients.length || current.payments.length);
      return {
        programId,
        status: keepCurrent ? "refreshing" : "loading",
        program: keepCurrent ? current.program : null,
        clients: keepCurrent ? current.clients : [],
        payments: keepCurrent ? filterHiddenPayments(current.payments) : [],
        error: null,
      };
    });

    const setScopedProgramDetailFailure = (error) => {
      setScopedProgramDetail((current) => {
        const keepCurrent = current.programId === programId
          && (current.program || current.clients.length || current.payments.length);
        return {
          programId,
          status: "failed",
          program: keepCurrent ? current.program : null,
          clients: keepCurrent ? current.clients : [],
          payments: keepCurrent ? filterHiddenPayments(current.payments) : [],
          error,
        };
      });
    };

    if (typeof store.loadProgramDetailData !== "function") {
      setScopedProgramDetailFailure(new Error("Missing scoped program detail loader"));
      return undefined;
    }

    const loadScopedProgramDetail = () => {
      store.loadProgramDetailData(programId)
        .then((result) => {
          if (cancelled) return;
          if (result?.error) {
            setScopedProgramDetailFailure(result.error);
            return;
          }
          if (!result?.program) {
            setScopedProgramDetailFailure(new Error("Scoped program detail not found"));
            return;
          }
          const resultPayments = Array.isArray(result?.payments) ? result.payments : [];
          const hiddenPaymentIds = new Set(scopedProgramDetailHiddenPaymentIdsRef.current);
          if (hiddenPaymentIds.size) {
            const fetchedPaymentIds = new Set(resultPayments.map((payment) => String(payment?.id || "")).filter(Boolean));
            hiddenPaymentIds.forEach((id) => {
              if (!fetchedPaymentIds.has(id)) hiddenPaymentIds.delete(id);
            });
            scopedProgramDetailHiddenPaymentIdsRef.current = hiddenPaymentIds;
          }
          setScopedProgramDetail({
            programId,
            status: "ready",
            program: result.program,
            clients: Array.isArray(result?.clients) ? result.clients : [],
            payments: filterHiddenPayments(resultPayments),
            error: null,
          });
        })
        .catch((error) => {
          if (cancelled) return;
          console.error("[Programs] Scoped program detail fetch failed:", error);
          setScopedProgramDetailFailure(error);
        });
    };

    refreshTimer = window.setTimeout(loadScopedProgramDetail, SCOPED_PROGRAM_DETAIL_REFRESH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
    };
  }, [
    program.id,
    scopedProgramDetailRefreshKey,
    store.loadProgramDetailData,
    store.lastSynced,
  ]);

  React.useEffect(() => {
    if (!store.isSupabaseEnabled) return;
    if (clientsReady && paymentsReady) return;
    if (!scopedProgramDetail.error) return;
    if (detailHydrationRequestedRef.current) return;
    detailHydrationRequestedRef.current = true;
    ensureGlobalDetailData();
  }, [
    clientsReady,
    paymentsReady,
    store.isSupabaseEnabled,
    scopedProgramDetail.error,
    ensureGlobalDetailData,
  ]);

  const scopedProgramDetailMatches = scopedProgramDetail.programId === String(program.id || "");
  const scopedProgramDetailReady = scopedProgramDetailMatches
    && (scopedProgramDetail.status === "ready" || scopedProgramDetail.status === "refreshing")
    && !scopedProgramDetail.error;
  const useScopedProgramDetail = scopedProgramDetailReady;
  const listDataReady = useScopedProgramDetail || detailDataReady;

  const scopedPaymentsByClient = React.useMemo(() => {
    const map = new Map();
    (scopedProgramDetail.payments || []).forEach((payment) => {
      const clientId = payment.clientId || payment.client_id;
      if (!clientId) return;
      const current = map.get(clientId);
      if (current) current.push(payment);
      else map.set(clientId, [payment]);
    });
    return map;
  }, [scopedProgramDetail.payments]);

  const getScopedClientPayments = React.useCallback((clientId) => {
    const clientPayments = scopedPaymentsByClient.get(clientId);
    return clientPayments ? clientPayments.slice() : [];
  }, [scopedPaymentsByClient]);

  const getScopedClientTotalPaid = React.useCallback((clientId) => (
    getScopedClientPayments(clientId).reduce((sum, payment) => {
      const amount = Number(payment.amount);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0)
  ), [getScopedClientPayments]);

  const getListClientTotalPaid = useScopedProgramDetail ? getScopedClientTotalPaid : getClientTotalPaid;
  const progClients = React.useMemo(() =>
    useScopedProgramDetail
      ? scopedProgramDetail.clients
      : clients.filter(c => c.programId === program.id),
    [clients, program.id, scopedProgramDetail.clients, useScopedProgramDetail]);

  const filtered = React.useMemo(() => progClients.filter(c => {
    const status = getProgramClientDisplayStatus(program, c, getListClientTotalPaid(c.id));
    const matchesFilter = filter === "all" || status === filter;
    const clientPackageLevel = c.packageLevel || c.hotelLevel || "";
    const matchesPackage = packageFilter === "all"
      || (packageFilter === INCOMPLETE_INFO_FILTER && clientNeedsCompletion(c, program))
      || (packageFilter === "__unassigned" && !clientPackageLevel)
      || clientPackageLevel === packageFilter;
    const matchesServiceType = serviceTypeFilter === "all" || getClientServiceType(c) === serviceTypeFilter;
    const q   = search.toLowerCase();
    const name = resolveClientDisplayName(c, "").toLowerCase();
    const phone = (c.phone || "").toLowerCase();
    const id = (c.id || "").toLowerCase();
    const matchesSearch = !q || name.includes(q) || phone.includes(q) || id.includes(q);
    return matchesFilter && matchesPackage && matchesServiceType && matchesSearch;
  }), [progClients, filter, packageFilter, serviceTypeFilter, search, getListClientTotalPaid, program]);

  const totalProgramClientItems = filtered.length;
  const totalProgramClientPages = Math.max(1, Math.ceil(totalProgramClientItems / programClientPageSize));
  const safeProgramClientPage = Math.min(Math.max(1, programClientPage), totalProgramClientPages);
  const programClientStartIndex = (safeProgramClientPage - 1) * programClientPageSize;
  const programClientEndIndex = programClientStartIndex + programClientPageSize;
  const paginatedProgramClients = React.useMemo(
    () => filtered.slice(programClientStartIndex, programClientEndIndex),
    [filtered, programClientStartIndex, programClientEndIndex]
  );
  const filteredPaymentTotals = React.useMemo(() => (
    filtered.reduce((acc, client) => {
      const paid = getListClientTotalPaid(client.id);
      acc.amount += getProgramClientSalePrice(program, client);
      acc.paid += paid;
      acc.remaining += getProgramClientRemainingAmount(program, client, paid);
      return acc;
    }, { amount: 0, paid: 0, remaining: 0 })
  ), [filtered, getListClientTotalPaid, program]);
  const programClientRangeStart = totalProgramClientItems ? programClientStartIndex + 1 : 0;
  const programClientRangeEnd = Math.min(programClientEndIndex, totalProgramClientItems);
  const programClientPageSizeOptions = React.useMemo(() => (
    PROGRAM_DETAIL_PAGE_SIZE_OPTIONS.map((size) => ({
      value: size,
      label: lang === "fr"
        ? `Afficher ${size} par page`
        : lang === "en"
          ? `Show ${size} per page`
          : `عرض ${size} في الصفحة`,
    }))
  ), [lang]);

  React.useEffect(() => {
    setPackageFilter("all");
    setServiceTypeFilter("all");
  }, [program.id]);

  React.useEffect(() => {
    setProgramClientPageSize(PROGRAM_DETAIL_DEFAULT_PAGE_SIZE);
    setProgramClientPage(1);
    setCheckedIds(new Set());
    setBulkActionsOpen(false);
  }, [program.id]);

  React.useEffect(() => {
    setProgramClientPage(1);
    setCheckedIds(new Set());
    setBulkActionsOpen(false);
  }, [search, filter, packageFilter, serviceTypeFilter, programTab]);

  React.useEffect(() => {
    setProgramClientPage((current) => Math.min(Math.max(1, current), totalProgramClientPages));
  }, [totalProgramClientPages]);

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

  React.useEffect(() => {
    if (!packageFilterOpen && !statusFilterOpen && !serviceTypeFilterOpen) return undefined;
    const handleOutside = (event) => {
      if (packageFilterOpen && packageFilterRef.current && !packageFilterRef.current.contains(event.target)) {
        setPackageFilterOpen(false);
      }
      if (statusFilterOpen && statusFilterRef.current && !statusFilterRef.current.contains(event.target)) {
        setStatusFilterOpen(false);
      }
      if (serviceTypeFilterOpen && serviceTypeFilterRef.current && !serviceTypeFilterRef.current.contains(event.target)) {
        setServiceTypeFilterOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setPackageFilterOpen(false);
      setStatusFilterOpen(false);
      setServiceTypeFilterOpen(false);
    };
    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [packageFilterOpen, statusFilterOpen, serviceTypeFilterOpen]);

  React.useEffect(() => {
    if (!bulkActionsOpen) return undefined;
    const handleOutside = (event) => {
      if (bulkActionsMenuRef.current?.contains(event.target)) return;
      if (bulkActionsBtnRef.current?.contains(event.target)) return;
      setBulkActionsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setBulkActionsOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [bulkActionsOpen]);

  React.useEffect(() => {
    if (!bulkActionsOpen) return undefined;
    const closeOnScroll = () => setBulkActionsOpen(false);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => window.removeEventListener("scroll", closeOnScroll, true);
  }, [bulkActionsOpen]);

  const toggleCheck = React.useCallback((id) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, [setCheckedIds]);

  const clearSelection = React.useCallback(() => setCheckedIds(new Set()), [setCheckedIds]);

  const toggleAllFiltered = React.useCallback(() => {
    if (!paginatedProgramClients.length) return;
    const filteredIds = paginatedProgramClients.map((client) => client.id);
    setCheckedIds((prev) => {
      const allVisibleSelected = filteredIds.every((id) => prev.has(id));
      if (allVisibleSelected) {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...prev, ...filteredIds]);
    });
  }, [paginatedProgramClients, setCheckedIds]);

  const exitSelectMode = React.useCallback(() => {
    setSelectMode(false);
    clearSelection();
    setTransferTargets([]);
    setTransferSheetOpen(false);
  }, [clearSelection, setSelectMode, setTransferSheetOpen, setTransferTargets]);

  const openTransferSheet = React.useCallback((ids) => {
    const nextIds = Array.from(new Set((Array.isArray(ids) ? ids : [ids])
      .map((id) => String(id || ""))
      .filter(Boolean)));
    if (!nextIds.length) return;
    runWithGlobalDetailData(() => {
      setTransferTargets(nextIds);
      setTransferSheetOpen(true);
    });
  }, [runWithGlobalDetailData, setTransferSheetOpen, setTransferTargets]);

  const closeTransferSheet = React.useCallback(() => {
    setTransferTargets([]);
    setTransferSheetOpen(false);
  }, [setTransferSheetOpen, setTransferTargets]);

  const handleTransferSelected = React.useCallback(() => {
    if (!checkedIds.size) {
      onToast(t.noClientsSelected || "يرجى اختيار معتمر واحد على الأقل", "info");
      return;
    }
    setBulkActionsOpen(false);
    openTransferSheet(Array.from(checkedIds));
  }, [checkedIds, onToast, t.noClientsSelected, openTransferSheet]);

  const handleDeleteSelectedClick = React.useCallback(() => {
    if (!checkedIds.size) {
      onToast(t.noClientsSelected || "يرجى اختيار معتمر واحد على الأقل", "info");
      return;
    }
    setBulkActionsOpen(false);
    runWithGlobalDetailData(() => setBulkDeleteOpen(true));
  }, [checkedIds, onToast, runWithGlobalDetailData, t.noClientsSelected]);

  const handleConfirmDeleteSelected = React.useCallback(async () => {
    const ids = Array.from(checkedIds);
    if (!ids.length) {
      setBulkDeleteOpen(false);
      return;
    }
    const ready = await ensureGlobalDetailDataForCurrentAction();
    if (!ready) return;
    const deletedCount = typeof deleteClientsBulk === "function"
      ? deleteClientsBulk(ids)
      : ids.reduce((count, id) => {
          if (typeof deleteClient !== "function") return count;
          deleteClient(id);
          return count + 1;
        }, 0);
    setBulkDeleteOpen(false);
    exitSelectMode();
    refreshScopedProgramDetail();
    onToast(tr("bulkDeleteSuccess", { count: deletedCount || ids.length }), "info");
  }, [checkedIds, deleteClientsBulk, deleteClient, ensureGlobalDetailDataForCurrentAction, exitSelectMode, onToast, refreshScopedProgramDetail, tr]);

  const transferList = React.useMemo(
    () => {
      const clientsById = new Map();
      [...progClients, ...activeClients, ...clients].forEach((client) => {
        const id = String(client?.id || "");
        if (id && !clientsById.has(id)) clientsById.set(id, client);
      });
      return transferTargets
        .map((id) => clientsById.get(String(id || "")))
        .filter(Boolean);
    },
    [transferTargets, progClients, activeClients, clients]
  );

  const transferDestinationPrograms = React.useMemo(() => {
    const programsById = new Map();
    (Array.isArray(allPrograms) ? allPrograms : []).forEach((destinationProgram) => {
      if (!isActiveTransferDestinationProgram(destinationProgram)) return;
      const id = String(destinationProgram.id || "");
      if (id && !programsById.has(id)) programsById.set(id, destinationProgram);
    });
    return Array.from(programsById.values());
  }, [allPrograms]);

  const programOccupancy = React.useMemo(() => {
    const map = new Map();
    (activeClients || []).forEach(c => {
      const programId = String(c.programId || c.program_id || "");
      if (!programId) return;
      map.set(programId, (map.get(programId) || 0) + 1);
    });
    return map;
  }, [activeClients]);

  const handleTransferConfirm = React.useCallback(async (programId) => {
    const ready = await ensureGlobalDetailDataForCurrentAction();
    if (!ready) return;
    const destination = allPrograms.find(p => String(p.id || "") === String(programId || ""));
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
    const currentCount = programOccupancy.get(String(programId || "")) || 0;
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
    refreshScopedProgramDetail();
  }, [allPrograms, ensureGlobalDetailDataForCurrentAction, transferList, programOccupancy, transferClients, onToast, t.programNotFound, t.noClientsSelected, t.programFull, tr, closeTransferSheet, exitSelectMode, refreshScopedProgramDetail]);

  const selectedVisibleCount = React.useMemo(
    () => paginatedProgramClients.reduce((count, client) => count + (checkedIds.has(client.id) ? 1 : 0), 0),
    [paginatedProgramClients, checkedIds]
  );
  const allChecked = selectedVisibleCount === paginatedProgramClients.length && paginatedProgramClients.length > 0;
  const partiallyChecked = selectedVisibleCount > 0 && !allChecked;
  const handleProgramClientPageSizeChange = React.useCallback((event) => {
    const nextSize = Number(event.target.value) || PROGRAM_DETAIL_DEFAULT_PAGE_SIZE;
    setProgramClientPageSize(nextSize);
    setProgramClientPage(1);
    setCheckedIds(new Set());
    setBulkActionsOpen(false);
  }, []);
  const goToProgramClientPage = React.useCallback((nextPage) => {
    setProgramClientPage(Math.min(Math.max(1, nextPage), totalProgramClientPages));
    setCheckedIds(new Set());
    setBulkActionsOpen(false);
  }, [totalProgramClientPages]);

  const totals = React.useMemo(() => ({
    revenue: progClients.reduce((s,c)=>s + getProgramClientSalePrice(program, c),0),
    paid:    progClients.reduce((s,c)=>s+getListClientTotalPaid(c.id),0),
    remaining: progClients.reduce((s,c)=>s + getProgramClientRemainingAmount(program, c, getListClientTotalPaid(c.id)),0),
  }), [progClients, getListClientTotalPaid, program]);
  const totalRem  = totals.remaining;
  const statusCounts = React.useMemo(() => ({
    cleared: progClients.filter(c=>getProgramClientDisplayStatus(program, c, getListClientTotalPaid(c.id))==="cleared").length,
    partial: progClients.filter(c=>getProgramClientDisplayStatus(program, c, getListClientTotalPaid(c.id))==="partial").length,
    unpaid:  progClients.filter(c=>getProgramClientDisplayStatus(program, c, getListClientTotalPaid(c.id))==="unpaid").length,
  }), [progClients, getListClientTotalPaid, program]);
  const pct       = progClients.length > 0 ? Math.round((statusCounts.cleared/progClients.length)*100) : 0;

  const filters = [
    { key:"all",     label:t.all,          count:progClients.length },
    { key:"cleared", label:t.clearedFilter, count:statusCounts.cleared },
    { key:"partial", label:t.partialFilter, count:statusCounts.partial },
    { key:"unpaid",  label:t.unpaidFilter,  count:statusCounts.unpaid },
  ];
  const activeStatusFilter = filters.find(f => f.key === filter) || filters[0];
  const serviceTypeFilters = React.useMemo(() => {
    const countForServiceType = (serviceType) => (
      progClients.filter((client) => getClientServiceType(client) === serviceType).length
    );
    return [
      {
        key: "all",
        label: getClientServiceTypeAllFilterLabel(t, lang),
        menuLabel: t.all,
        count: progClients.length,
      },
      ...CLIENT_SERVICE_TYPES.map((serviceType) => ({
        key: serviceType.value,
        label: getClientServiceTypeLabel(serviceType.value, t, lang),
        count: countForServiceType(serviceType.value),
      })),
    ];
  }, [progClients, t, lang]);
  const activeServiceTypeFilter = serviceTypeFilters.find(f => f.key === serviceTypeFilter) || serviceTypeFilters[0];
  const packageChips = React.useMemo(() => {
    const countForLevel = (level) => progClients.filter(c => (c.packageLevel || c.hotelLevel || "") === level).length;
    const unassignedCount = progClients.filter(c => !(c.packageLevel || c.hotelLevel)).length;
    const incompleteCount = progClients.filter((client) => clientNeedsCompletion(client, program)).length;
    return [
      { key: "all", label: t.all, count: progClients.length },
      ...(incompleteCount ? [{ key: INCOMPLETE_INFO_FILTER, label: completionLabels.incompleteFilter, count: incompleteCount }] : []),
      ...packages.map(pkg => ({ key: pkg.level, label: translateHotelLevel(pkg.level, lang) || pkg.level, count: countForLevel(pkg.level) })),
      ...(unassignedCount ? [{ key: "__unassigned", label: t.noHotel || "غير محدد", count: unassignedCount }] : []),
    ];
  }, [completionLabels.incompleteFilter, packages, progClients, program, t, lang]);
  const selectedPackageDetail = packageFilter === "all" || packageFilter === "__unassigned" || packageFilter === INCOMPLETE_INFO_FILTER
    ? null
    : packages.find(pkg => pkg.level === packageFilter) || null;
  const activePackageChip = packageChips.find(chip => chip.key === packageFilter) || packageChips[0];
  const searchExpanded = searchOpen || search.trim().length > 0;
  const filterMenuBaseStyle = {
    position:"absolute",
    top:"calc(100% + 6px)",
    zIndex:20,
    background:"var(--rukn-menu-bg)",
    border:"1px solid var(--rukn-menu-border)",
    borderRadius:12,
    boxShadow:"var(--rukn-menu-shadow)",
    padding:6,
  };
  const filterMenuItemStyle = (active) => ({
    width:"100%",
    display:"flex",
    justifyContent:"space-between",
    alignItems:"center",
    gap:10,
    border:0,
    borderRadius:9,
    padding:"8px 9px",
    background:active ? "var(--rukn-gold-dim)" : "transparent",
    color:active ? "var(--rukn-gold)" : "var(--rukn-text)",
    fontSize:12,
    fontWeight:active ? 800 : 600,
    cursor:"pointer",
    fontFamily:"'Cairo',sans-serif",
    textAlign:"start",
  });
  const filterMenuCountStyle = (active) => ({
    minWidth:20,
    textAlign:"center",
    borderRadius:999,
    padding:"0 6px",
    background:active ? "rgba(212,175,55,.14)" : "var(--rukn-bg-soft)",
    color:active ? "var(--rukn-gold)" : "var(--rukn-text-muted)",
    fontSize:10,
  });
  const tableGridTemplate = selectMode
    ? "38px 44px minmax(0,2fr) minmax(0,.9fr) minmax(0,1fr) minmax(0,.9fr) minmax(0,.9fr) minmax(0,.9fr) minmax(0,.9fr) minmax(0,.8fr)"
    : "44px minmax(0,2fr) minmax(0,.9fr) minmax(0,1fr) minmax(0,.9fr) minmax(0,.9fr) minmax(0,.9fr) minmax(0,.9fr) minmax(0,.8fr)";
  const totalsGridColumn = selectMode ? "1 / span 4" : "1 / span 3";
  const packageById = React.useMemo(() => new Map(packages.map((pkg) => [pkg.id, pkg])), [packages]);
  const packageByLevel = React.useMemo(() => new Map(packages.map((pkg) => [pkg.level, pkg])), [packages]);
  const headerActionsLabel = lang === "fr" ? "Actions" : lang === "en" ? "Actions" : "إجراءات";
  const allLevelsExportLabel = React.useMemo(() => {
    if (lang === "fr") return "Tous les niveaux";
    if (lang === "en") return "All levels";
    return "كل المستويات";
  }, [lang]);
  const amadeusExportLabel = React.useMemo(() => {
    if (lang === "fr") return "Exporter Amadeus Excel";
    if (lang === "en") return "Export Amadeus Excel";
    return "تصدير Amadeus Excel";
  }, [lang]);
  const wordContractsExportLabels = React.useMemo(() => ({
    action: lang === "fr" ? "Exporter les contrats Word" : lang === "en" ? "Export Word contracts" : "تصدير عقود Word",
    busy: lang === "fr" ? "Génération des contrats Word..." : lang === "en" ? "Generating Word contracts..." : "جاري تجهيز عقود Word...",
    loading: t.loading || (lang === "fr" ? "Chargement..." : lang === "en" ? "Loading..." : "جاري التحميل..."),
    noClients: lang === "fr" ? "Aucun pèlerin à exporter." : lang === "en" ? "No pilgrims available for contract export." : "لا يوجد معتمرون لتصدير عقودهم",
    success: lang === "fr" ? "Les contrats Word ont été générés avec succès." : lang === "en" ? "Word contracts generated successfully." : "تم تجهيز عقود Word بنجاح",
    missingTemplate: lang === "fr" ? "Importez d’abord le modèle de contrat Word." : lang === "en" ? "Upload the Word contract template first." : "ارفع قالب العقد أولًا لتصدير عقود Word.",
    error: lang === "fr" ? "Impossible d’exporter les contrats Word." : lang === "en" ? "Unable to export Word contracts." : "تعذر تصدير عقود Word",
  }), [lang, t.loading]);
  const posterExportLabels = React.useMemo(() => ({
    action: lang === "fr" ? "Télécharger l’affiche du programme" : lang === "en" ? "Download program poster" : "تنزيل ملصق البرنامج",
    busy: lang === "fr" ? "Génération de l’affiche..." : lang === "en" ? "Generating poster..." : "جاري تجهيز الملصق...",
    chooseTitle: lang === "fr" ? "Choisir le modèle d’affiche" : lang === "en" ? "Choose poster template" : "اختيار قالب الملصق",
    chooseHint: lang === "fr"
      ? "Choisissez l’affiche officielle Rukn ou l’un des modèles de votre agence."
      : lang === "en"
        ? "Choose the official Rukn poster or one of your agency templates."
        : "اختر قالب ركن الرسمي أو أحد القوالب الخاصة بالوكالة.",
    officialName: lang === "fr" ? "Modèle officiel Rukn" : lang === "en" ? "Official Rukn template" : "قالب ركن الرسمي",
    officialHint: lang === "fr"
      ? "Affiche gratuite qui s’adapte automatiquement aux niveaux du programme."
      : lang === "en"
        ? "Free poster that adapts automatically to this program’s levels."
        : "ملصق مجاني يتكيف تلقائيًا مع مستويات هذا البرنامج.",
    codeGroup: lang === "fr" ? "Modèles signature par code" : lang === "en" ? "Signature code templates" : "قوالب خاصة بالوكالة",
    customGroup: lang === "fr" ? "Modèles importés par l’agence" : lang === "en" ? "Uploaded agency templates" : "قوالب مرفوعة من الوكالة",
    download: lang === "fr" ? "Télécharger l’affiche" : lang === "en" ? "Download poster" : "تنزيل الملصق",
    cancel: t.cancel || (lang === "fr" ? "Annuler" : lang === "en" ? "Cancel" : "إلغاء"),
    noMatch: lang === "fr"
      ? "Aucun modèle d’affiche adapté à ce programme."
      : lang === "en"
        ? "No matching poster template found for this program."
        : "لا يوجد قالب ملصق مناسب لهذا البرنامج. أضف قالبًا من الإعدادات بنفس نوع البرنامج وعدد المستويات.",
    tooManyLevels: lang === "fr"
      ? "Les modèles d’affiche prennent en charge jusqu’à 5 niveaux."
      : lang === "en"
        ? "Poster templates support up to 5 levels."
        : "قوالب الملصقات تدعم حتى 5 مستويات فقط.",
    missingImage: lang === "fr"
      ? "L’image du modèle d’affiche n’est pas disponible."
      : lang === "en"
        ? "The poster template image is not available."
        : "صورة قالب الملصق غير متاحة.",
    success: lang === "fr" ? "Affiche du programme téléchargée." : lang === "en" ? "Program poster downloaded." : "تم تنزيل ملصق البرنامج.",
    error: lang === "fr" ? "Impossible de générer l’affiche du programme." : lang === "en" ? "Unable to generate the program poster." : "تعذر إنشاء ملصق البرنامج.",
    levelsBadge: (count) => {
      if (lang === "fr") return `${count} ${count === 1 ? "niveau" : "niveaux"}`;
      if (lang === "en") return `${count} ${count === 1 ? "level" : "levels"}`;
      return `${count} ${count === 1 ? "مستوى" : "مستويات"}`;
    },
  }), [lang, t.cancel]);
  const costingLabels = React.useMemo(() => getProgramCostingLabels(lang), [lang]);
  const closeHeaderActions = React.useCallback(() => {
    setHeaderActionsOpen(false);
    setHoveredHeaderAction("");
  }, []);
  const closePosterTemplateChoice = React.useCallback(() => {
    if (posterExportBusy) return;
    setPosterTemplateChoice(null);
    setPosterTemplateChoiceId("");
  }, [posterExportBusy]);
  const generatePosterFromTemplate = React.useCallback(async (template) => {
    const imageUrl = await getPosterTemplateImageUrl(template);
    if (!imageUrl) throw new Error("missing-template-image");
    const blob = await generateProgramPosterPng({
      template,
      imageUrl,
      program,
      lang,
    });
    downloadPosterBlob(blob, buildProgramPosterFilename(program, lang));
  }, [lang, program]);
  const generateCodePoster = React.useCallback(async (templateKey = OFFICIAL_RUKN_CODE_TEMPLATE_KEY) => {
    const codeTemplate = await loadCodePosterTemplate(templateKey);
    if (!codeTemplate?.renderPoster) throw new Error("missing-code-poster-template");
    const blob = await codeTemplate.renderPoster({
      program,
      agency,
      locale: lang,
    });
    downloadPosterBlob(blob, buildProgramPosterFilename(program, lang));
  }, [agency, lang, program]);
  const runPosterTemplateDownload = React.useCallback(async (template) => {
    if (!template || posterExportBusy) return;
    setPosterExportBusy(true);
    try {
      await generatePosterFromTemplate(template);
      setPosterTemplateChoice(null);
      setPosterTemplateChoiceId("");
      onToast?.(posterExportLabels.success, "success");
    } catch (error) {
      console.error("[ProgramPoster] Poster generation failed:", error);
      onToast?.(
        error?.message === "missing-template-image" ? posterExportLabels.missingImage : posterExportLabels.error,
        "error"
      );
    } finally {
      setPosterExportBusy(false);
    }
  }, [generatePosterFromTemplate, onToast, posterExportBusy, posterExportLabels.error, posterExportLabels.missingImage, posterExportLabels.success]);
  const runCodePosterDownload = React.useCallback(async (templateKey = OFFICIAL_RUKN_CODE_TEMPLATE_KEY) => {
    if (posterExportBusy) return;
    setPosterExportBusy(true);
    try {
      await generateCodePoster(templateKey);
      setPosterTemplateChoice(null);
      setPosterTemplateChoiceId("");
      onToast?.(posterExportLabels.success, "success");
    } catch (error) {
      console.error("[ProgramPoster] Code poster generation failed:", error);
      onToast?.(posterExportLabels.error, "error");
    } finally {
      setPosterExportBusy(false);
    }
  }, [generateCodePoster, onToast, posterExportBusy, posterExportLabels.error, posterExportLabels.success]);
  const runOfficialPosterDownload = React.useCallback(() => (
    runCodePosterDownload(OFFICIAL_RUKN_CODE_TEMPLATE_KEY)
  ), [runCodePosterDownload]);
  const handleProgramPosterDownload = React.useCallback(async () => {
    closeHeaderActions();
    if (posterExportBusy) return;

    const rawLevelsCount = getProgramPosterLevelsCount(program);
    const programType = normalizePosterTemplateType(getProgramKind(program, null, {
      allowNameFallback: true,
      defaultKind: "umrah",
    }));
    const levelsCount = normalizePosterTemplateLevelsCount(rawLevelsCount);

    if (!programPostersEnabled) {
      if (assignedCodePosterTemplates.length > 0) {
        setPosterTemplateChoice({
          codeTemplates: assignedCodePosterTemplates,
          templates: [],
          programType,
          levelsCount,
        });
        setPosterTemplateChoiceId(OFFICIAL_RUKN_POSTER_CHOICE_ID);
        return;
      }
      await runOfficialPosterDownload();
      return;
    }

    setPosterExportBusy(true);
    try {
      let matches = [];
      if (rawLevelsCount <= 5) {
        const { data, error } = await fetchPosterTemplates({ agencyId: store.agencyId });
        if (error) throw error;

        matches = (Array.isArray(data) ? data : [])
          .filter((template) => (
            normalizePosterTemplateType(template.programType || template.program_type) === programType
            && normalizePosterTemplateLevelsCount(template.levelsCount ?? template.levels_count) === levelsCount
          ))
          .sort((a, b) => {
            const bTime = Date.parse(b.updatedAt || b.updated_at || "") || 0;
            const aTime = Date.parse(a.updatedAt || a.updated_at || "") || 0;
            if (bTime !== aTime) return bTime - aTime;
            return String(a.name || "").localeCompare(String(b.name || ""), lang);
          });
      }

      if (assignedCodePosterTemplates.length === 0 && matches.length === 0) {
        setPosterExportBusy(false);
        await runOfficialPosterDownload();
        return;
      }

      setPosterTemplateChoice({
        codeTemplates: assignedCodePosterTemplates,
        templates: matches,
        programType,
        levelsCount,
      });
      setPosterTemplateChoiceId(OFFICIAL_RUKN_POSTER_CHOICE_ID);
    } catch (error) {
      console.error("[ProgramPoster] Custom template lookup failed; official poster remains available:", error);
      setPosterTemplateChoice({
        codeTemplates: assignedCodePosterTemplates,
        templates: [],
        programType,
        levelsCount,
      });
      setPosterTemplateChoiceId(OFFICIAL_RUKN_POSTER_CHOICE_ID);
    } finally {
      setPosterExportBusy(false);
    }
  }, [assignedCodePosterTemplates, closeHeaderActions, lang, posterExportBusy, program, programPostersEnabled, runOfficialPosterDownload, store.agencyId]);
  const handlePosterTemplateChoiceDownload = React.useCallback(() => {
    if (posterTemplateChoiceId === OFFICIAL_RUKN_POSTER_CHOICE_ID) {
      runOfficialPosterDownload();
      return;
    }
    const selectedCodeTemplate = posterTemplateChoice?.codeTemplates?.find((template) => template.key === posterTemplateChoiceId);
    if (selectedCodeTemplate) {
      runCodePosterDownload(selectedCodeTemplate.key);
      return;
    }
    const selectedTemplate = posterTemplateChoice?.templates?.find((template) => template.id === posterTemplateChoiceId)
      || posterTemplateChoice?.templates?.[0];
    runPosterTemplateDownload(selectedTemplate);
  }, [posterTemplateChoice, posterTemplateChoiceId, runCodePosterDownload, runOfficialPosterDownload, runPosterTemplateDownload]);
  const getCurrentExportClients = React.useCallback(() => filtered, [filtered]);
  const getCurrentWordContractExportClients = React.useCallback(() => {
    if (checkedIds.size > 0) return progClients.filter((client) => checkedIds.has(client.id));
    return getCurrentExportClients();
  }, [checkedIds, getCurrentExportClients, progClients]);
  const notifyNoExportClients = React.useCallback(() => {
    onToast(participantTerms.noMatching, "info");
  }, [onToast, participantTerms.noMatching]);
  const handleProgramPdfExport = React.useCallback(async () => {
    closeHeaderActions();
    const ready = await ensureGlobalDetailDataForCurrentAction();
    if (!ready) return;
    const exportClients = getCurrentExportClients();
    if (exportClients.length === 0) { notifyNoExportClients(); return; }
    printProgramPDF({
      program,
      clients: exportClients,
      getClientStatus: (client) => getProgramClientPaymentStatus(program, client, getClientTotalPaid(client.id)),
      getClientOfficialPrice: (client) => getProgramClientOfficialPrice(program, client),
      getClientSalePrice: (client) => getProgramClientSalePrice(program, client),
      getClientRemainingAmount: (client, paid) => getProgramClientRemainingAmount(program, client, paid),
      getClientTotalPaid,
      getClientPayments,
      lang,
      t,
      agency,
    });
  }, [agency, closeHeaderActions, ensureGlobalDetailDataForCurrentAction, getClientPayments, getClientTotalPaid, getCurrentExportClients, lang, notifyNoExportClients, program, t]);
  const handleAmadeusExport = React.useCallback(async () => {
    closeHeaderActions();
    if (!useScopedProgramDetail) {
      const ready = await ensureGlobalDetailDataForCurrentAction();
      if (!ready) return;
    }
    const exportClients = getCurrentExportClients();
    if (exportClients.length === 0) { notifyNoExportClients(); return; }
    try {
      const selectedLevelLabel = packageFilter === "all"
        ? allLevelsExportLabel
        : (activePackageChip?.label || packageFilter || allLevelsExportLabel);
      const result = await downloadAmadeusExcel(exportClients, program, {
        agency,
        lang,
        selectedLevelLabel,
      });
      const reviewText = result.reviewCount
        ? (lang === "fr"
          ? ` — ${result.reviewCount} ligne(s) à vérifier`
          : lang === "en"
            ? ` — ${result.reviewCount} row(s) need review`
            : ` — ${result.reviewCount} سطر يحتاج للمراجعة`)
        : "";
      const successText = lang === "fr"
        ? `Export Amadeus prêt — ${result.total} pèlerin(s)${reviewText}`
        : lang === "en"
          ? `Amadeus export ready — ${result.total} pilgrim(s)${reviewText}`
          : `تم تصدير ملف Amadeus — ${result.total} معتمر${reviewText}`;
      onToast(successText, result.reviewCount ? "info" : "success");
    } catch (error) {
      onToast(
        lang === "fr"
          ? "Impossible de générer le fichier Amadeus"
          : lang === "en"
            ? "Unable to generate Amadeus file"
            : "تعذر إنشاء ملف Amadeus",
        "error"
      );
    }
  }, [activePackageChip?.label, agency, allLevelsExportLabel, closeHeaderActions, ensureGlobalDetailDataForCurrentAction, getCurrentExportClients, lang, notifyNoExportClients, onToast, packageFilter, program, useScopedProgramDetail]);
  const handlePassportListWordExport = React.useCallback(async () => {
    closeHeaderActions();
    if (!useScopedProgramDetail) {
      const ready = await ensureGlobalDetailDataForCurrentAction();
      if (!ready) return;
    }
    const exportClients = getCurrentExportClients();
    try {
      const result = downloadPassportListWord({ program, clients: exportClients });
      if (!result.ok) {
        onToast(t.noPilgrimsToExport || (lang === "fr" ? "Aucun pèlerin à exporter" : lang === "en" ? "No pilgrims to export" : "لا يوجد معتمرون لتصديرهم"), "info");
        return;
      }
      onToast(t.passportListWordExported || (lang === "fr" ? "Liste passeports Word exportée avec succès" : lang === "en" ? "Passport list Word exported successfully" : "تم تصدير لائحة الجوازات بنجاح"), "success");
    } catch (error) {
      console.error("[Programs] Passport list Word export failed:", error);
      onToast(t.error || (lang === "fr" ? "Erreur inattendue" : lang === "en" ? "Unexpected error" : "خطأ غير متوقع"), "error");
    }
  }, [closeHeaderActions, ensureGlobalDetailDataForCurrentAction, getCurrentExportClients, lang, onToast, program, t.error, t.noPilgrimsToExport, t.passportListWordExported, useScopedProgramDetail]);
  const handleBadgePdfExport = React.useCallback(async () => {
    closeHeaderActions();
    if (!useScopedProgramDetail) {
      const ready = await ensureGlobalDetailDataForCurrentAction();
      if (!ready) return;
    }
    const exportClients = getCurrentExportClients();
    if (exportClients.length === 0) { notifyNoExportClients(); return; }
    setBadgeExportBusy(true);
    try {
      await downloadProgramBadgesPdf({
        agencyId: store.agencyId,
        clients: exportClients,
        program,
        agency,
      });
    } catch (error) {
      onToast(
        error?.message === "missing-template"
          ? "لا يوجد قالب شارة لهذا البرنامج بعد."
          : "تعذر تصدير شارات البرنامج",
        "error"
      );
    } finally {
      setBadgeExportBusy(false);
    }
  }, [agency, closeHeaderActions, ensureGlobalDetailDataForCurrentAction, getCurrentExportClients, notifyNoExportClients, onToast, program, store.agencyId, useScopedProgramDetail]);
  const handlePassportImportOpen = React.useCallback(() => {
    closeHeaderActions();
    runWithGlobalDetailData(() => setShowPassportImport(true));
  }, [closeHeaderActions, runWithGlobalDetailData]);
  const handleExcelImportOpen = React.useCallback(() => {
    closeHeaderActions();
    runWithGlobalDetailData(() => setShowExcelImport(true));
  }, [closeHeaderActions, runWithGlobalDetailData]);
  const handleEditProgram = React.useCallback(() => {
    closeHeaderActions();
    onEditProgram?.();
  }, [closeHeaderActions, onEditProgram]);
  const handleCostingOpen = React.useCallback(() => {
    closeHeaderActions();
    setCostingOpen(true);
  }, [closeHeaderActions]);
  const handleProgramTabChange = React.useCallback((nextTab) => {
    setProgramTab(nextTab);
    if (nextTab === "rooming") ensureGlobalDetailData({ notify: true });
  }, [ensureGlobalDetailData]);
  const handlePilgrimsListExport = React.useCallback(async () => {
    closeHeaderActions();
    if (!useScopedProgramDetail) {
      const ready = await ensureGlobalDetailDataForCurrentAction();
      if (!ready) return;
    }
    const exportClients = getCurrentExportClients();
    if (exportClients.length === 0) { notifyNoExportClients(); return; }
    const XLSX = await import("xlsx");
    const labels = {
      localName: "الاسم الكامل",
      phone: "رقم الهاتف",
      registrationSource: "جهة التسجيل",
      serviceType: t.serviceType || (lang === "fr" ? "Type de service" : lang === "en" ? "Service type" : "نوع الخدمة"),
    };
    const { data, merges } = buildPilgrimsListSheet(exportClients, lang, labels);
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 28 }, { wch: 32 }, { wch: 18 }, { wch: 24 }, { wch: 18 }];
    if (merges.length) ws["!merges"] = merges;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "pilgrims");
    const levelPart = packageFilter === "all" ? "all" : (activePackageChip?.label || packageFilter || "filtered");
    XLSX.writeFile(
      wb,
      `${participantTerms.kind === "hajj" ? "hajj-pilgrims-list" : "pilgrims-list"}-${slugifyFilePart(program.name)}-${slugifyFilePart(levelPart)}.xlsx`,
      { bookType: "xlsx", compression: true }
    );
    onToast(participantTerms.listExportReady || t.pilgrimsListExportReady || (lang === "fr" ? "Liste des pèlerins exportée" : lang === "en" ? "Pilgrims list exported" : "تم تصدير لائحة المعتمرين"), "success");
  }, [activePackageChip?.label, closeHeaderActions, ensureGlobalDetailDataForCurrentAction, getCurrentExportClients, lang, notifyNoExportClients, onToast, packageFilter, participantTerms.kind, participantTerms.listExportReady, program.name, t.pilgrimsListExportReady, t.serviceType, useScopedProgramDetail]);
  const handleContractsExcelExport = React.useCallback(async () => {
    closeHeaderActions();
    if (!useScopedProgramDetail) {
      const ready = await ensureGlobalDetailDataForCurrentAction();
      if (!ready) return;
    }
    const exportClients = getCurrentExportClients();
    if (exportClients.length === 0) { notifyNoExportClients(); return; }
    const XLSX = await import("xlsx");
    const rows = [
      CONTRACT_EXPORT_HEADERS,
      ...exportClients.map((client) => {
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
        const stayDates = calculateHotelStayDates({
          departureDate: program.departure,
          returnDate: program.returnDate,
          visitOrder: program.visitOrder || program.visit_order,
          hotelCheckinDay: program.hotelCheckinDay || program.hotel_checkin_day,
          madinahNights: pkg?.madinahNights,
        });
        const roomType = safeCellValue(client.roomTypeLabel || getRoomTypeLabel(client.roomType) || "");
        const address = pickFirstText(client, ["address", "adress", "addressLine", "address_line", "homeAddress", "home_address"]);
        const company = pickFirstText(program, ["company", "compagnie", "airline", "carrier", "transport"]);
        return [
          safeCellValue(fullName),
          safeCellValue(passportNumber),
          safeCellValue(cin),
          safeCellValue(medinaHotel),
          safeCellValue(stayDates.medinaCheckIn),
          safeCellValue(stayDates.medinaCheckOut),
          safeCellValue(makkahHotel),
          safeCellValue(stayDates.makkahCheckIn),
          safeCellValue(stayDates.makkahCheckOut),
          safeCellValue(roomType),
          safeCellValue(address),
          safeCellValue(company),
          safeCellValue(formatDateForExcel(program.departure)),
          safeCellValue(formatDateForExcel(program.returnDate)),
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
  }, [closeHeaderActions, ensureGlobalDetailDataForCurrentAction, getCurrentExportClients, lang, notifyNoExportClients, onToast, packageById, packageByLevel, program, useScopedProgramDetail]);
  const handleWordContractsExport = React.useCallback(async () => {
    closeHeaderActions();
    if (wordContractExportBusy) return;
    const ready = await ensureGlobalDetailDataForCurrentAction();
    if (!ready) return;
    if (!paymentsReady) {
      onToast(wordContractsExportLabels.loading, "info");
      return;
    }
    const exportClients = getCurrentWordContractExportClients();
    if (exportClients.length === 0) {
      onToast(wordContractsExportLabels.noClients, "info");
      return;
    }
    setWordContractExportBusy(true);
    try {
      await exportProgramWordContractsZip({
        agencyId: store.agencyId,
        clients: exportClients,
        programClients: progClients,
        program,
        getClientPayments,
        getClientTotalPaid,
        agency,
        lang,
      });
      onToast(wordContractsExportLabels.success, "success");
    } catch (error) {
      if (error?.code === "missing-contract-template") {
        onToast(wordContractsExportLabels.missingTemplate, "error");
      } else {
        console.error("[Contracts] Bulk Word export failed:", error);
        onToast(wordContractsExportLabels.error, "error");
      }
    } finally {
      setWordContractExportBusy(false);
    }
  }, [agency, closeHeaderActions, ensureGlobalDetailDataForCurrentAction, getClientPayments, getClientTotalPaid, getCurrentWordContractExportClients, lang, onToast, paymentsReady, progClients, program, store.agencyId, wordContractExportBusy, wordContractsExportLabels]);
  const headerActions = React.useMemo(() => ([
    {
      key: "edit",
      icon: "edit",
      label: t.editProgramTitle || (lang === "fr" ? "Modifier le programme" : lang === "en" ? "Edit program" : "تعديل البرنامج"),
      onClick: handleEditProgram,
    },
    {
      key: "costing",
      icon: "coins",
      label: costingLabels.action,
      onClick: handleCostingOpen,
    },
    {
      key: "excel-import",
      icon: "import",
      label: participantExcelImportLabel,
      onClick: handleExcelImportOpen,
    },
    {
      key: "passport",
      icon: "passport",
      label: participantTerms.passportImport || completionLabels.passportImport,
      onClick: handlePassportImportOpen,
    },
    {
      key: "pilgrims-list",
      icon: "download",
      label: participantTerms.exportListAction || t.exportPilgrimsList || (lang === "fr" ? "Exporter la liste des pèlerins" : lang === "en" ? "Export pilgrims list" : "تصدير لائحة المعتمرين"),
      onClick: handlePilgrimsListExport,
    },
    {
      key: "pdf",
      icon: "print",
      label: lang === "fr" ? "Exporter PDF" : lang === "en" ? "Export PDF" : "تصدير PDF",
      onClick: handleProgramPdfExport,
    },
    {
      key: "program-poster",
      icon: "download",
      label: posterExportBusy ? posterExportLabels.busy : posterExportLabels.action,
      onClick: handleProgramPosterDownload,
    },
    {
      key: "amadeus",
      icon: "clearance",
      label: amadeusExportLabel,
      onClick: handleAmadeusExport,
    },
    {
      key: "passport-list-word",
      icon: "file",
      label: t.exportPassportListWord || (lang === "fr" ? "Exporter la liste passeports Word" : lang === "en" ? "Export passport list Word" : "تصدير لائحة الجوازات Word"),
      onClick: handlePassportListWordExport,
    },
    {
      key: "badges",
      icon: "download",
      label: badgeExportBusy ? "جاري تجهيز الشارات..." : "تحميل شارات البرنامج PDF",
      onClick: handleBadgePdfExport,
    },
    {
      key: "word-contracts",
      icon: "file",
      label: wordContractExportBusy ? wordContractsExportLabels.busy : wordContractsExportLabels.action,
      onClick: handleWordContractsExport,
    },
    {
      key: "contracts",
      icon: "download",
      label: lang === "fr" ? "Excel contrats" : lang === "en" ? "Contracts Excel" : "تصدير Excel للعقود",
      onClick: handleContractsExcelExport,
    },
  ]), [amadeusExportLabel, badgeExportBusy, completionLabels.passportImport, costingLabels.action, handleAmadeusExport, handleBadgePdfExport, handleContractsExcelExport, handleCostingOpen, handleEditProgram, handleExcelImportOpen, handlePassportImportOpen, handlePassportListWordExport, handlePilgrimsListExport, handleProgramPdfExport, handleProgramPosterDownload, handleWordContractsExport, lang, participantExcelImportLabel, participantTerms.exportListAction, participantTerms.passportImport, posterExportBusy, posterExportLabels.action, posterExportLabels.busy, t.editProgramTitle, t.exportPassportListWord, t.exportPilgrimsList, wordContractExportBusy, wordContractsExportLabels.action, wordContractsExportLabels.busy]);

  return (
    <div style={{ padding:"28px 32px" }}>

      {/* back + title */}
      <ProgramDetailHeader
        program={program}
        t={t}
        lang={lang}
        onBack={onBack}
        headerActionsRef={headerActionsRef}
        headerActionsLabel={headerActionsLabel}
        headerActionsOpen={headerActionsOpen}
        onToggleHeaderActions={() => setHeaderActionsOpen(open => !open)}
        headerActions={headerActions}
        hoveredHeaderAction={hoveredHeaderAction}
        setHoveredHeaderAction={setHoveredHeaderAction}
        onAddClient={() => runWithGlobalDetailData(() => setShowAddClient(true))}
        addClientLabel={participantTerms.addAction || t.addClient}
      />

      <Modal
        open={Boolean(posterTemplateChoice)}
        onClose={closePosterTemplateChoice}
        title={posterExportLabels.chooseTitle}
        width={520}
        closeOnBackdrop={!posterExportBusy}
        closeOnEscape={!posterExportBusy}
      >
        {posterTemplateChoice && (
          <div style={{ display:"grid", gap:16, direction:dir }}>
            <p style={{ margin:0, color:"var(--rukn-text-muted)", fontSize:13, lineHeight:1.7 }}>
              {posterExportLabels.chooseHint}
            </p>
            <div style={{ display:"grid", gap:8 }}>
              <button
                type="button"
                disabled={posterExportBusy}
                onClick={() => setPosterTemplateChoiceId(OFFICIAL_RUKN_POSTER_CHOICE_ID)}
                style={{
                  border:`1px solid ${posterTemplateChoiceId === OFFICIAL_RUKN_POSTER_CHOICE_ID ? "rgba(212,175,55,.55)" : "var(--rukn-border-soft)"}`,
                  background:posterTemplateChoiceId === OFFICIAL_RUKN_POSTER_CHOICE_ID ? "rgba(212,175,55,.11)" : "var(--rukn-bg-soft)",
                  borderRadius:12,
                  padding:"11px 12px",
                  color:"var(--rukn-text)",
                  display:"flex",
                  alignItems:"center",
                  gap:11,
                  textAlign:"start",
                  cursor:posterExportBusy ? "not-allowed" : "pointer",
                  fontFamily:"'Cairo',sans-serif",
                }}
              >
                <span style={{
                  width:16,
                  height:16,
                  borderRadius:999,
                  border:`2px solid ${posterTemplateChoiceId === OFFICIAL_RUKN_POSTER_CHOICE_ID ? "var(--rukn-gold)" : "rgba(148,163,184,.45)"}`,
                  display:"inline-flex",
                  alignItems:"center",
                  justifyContent:"center",
                  flex:"0 0 auto",
                }}>
                  <span style={{
                    width:7,
                    height:7,
                    borderRadius:999,
                    background:posterTemplateChoiceId === OFFICIAL_RUKN_POSTER_CHOICE_ID ? "var(--rukn-gold)" : "transparent",
                  }} />
                </span>
                <span style={{ minWidth:0, display:"grid", gap:3 }}>
                  <strong style={{ fontSize:13, color:"var(--rukn-text-strong)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {posterExportLabels.officialName}
                  </strong>
                  <span style={{ fontSize:11, color:"var(--rukn-text-muted)", lineHeight:1.5 }}>
                    {posterExportLabels.officialHint}
                  </span>
                </span>
              </button>

              {posterTemplateChoice.codeTemplates?.length > 0 && (
                <div style={{
                  marginTop:5,
                  paddingTop:10,
                  borderTop:"1px solid var(--rukn-border-soft)",
                  display:"grid",
                  gap:8,
                }}>
                  <p style={{
                    margin:0,
                    color:"var(--rukn-text-muted)",
                    fontSize:11,
                    fontWeight:800,
                  }}>
                    {posterExportLabels.codeGroup}
                  </p>
                  {posterTemplateChoice.codeTemplates.map((template) => {
                    const active = String(template.key || "") === String(posterTemplateChoiceId || "");
                    const name = template.meta?.name?.[lang] || template.meta?.name?.ar || template.key;
                    return (
                      <button
                        key={template.key}
                        type="button"
                        disabled={posterExportBusy}
                        onClick={() => setPosterTemplateChoiceId(template.key)}
                        style={{
                          border:`1px solid ${active ? "rgba(212,175,55,.55)" : "var(--rukn-border-soft)"}`,
                          background:active ? "rgba(212,175,55,.11)" : "var(--rukn-bg-soft)",
                          borderRadius:12,
                          padding:"11px 12px",
                          color:"var(--rukn-text)",
                          display:"flex",
                          alignItems:"center",
                          gap:11,
                          textAlign:"start",
                          cursor:posterExportBusy ? "not-allowed" : "pointer",
                          fontFamily:"'Cairo',sans-serif",
                        }}
                      >
                        <span style={{
                          width:16,
                          height:16,
                          borderRadius:999,
                          border:`2px solid ${active ? "var(--rukn-gold)" : "rgba(148,163,184,.45)"}`,
                          display:"inline-flex",
                          alignItems:"center",
                          justifyContent:"center",
                          flex:"0 0 auto",
                        }}>
                          <span style={{
                            width:7,
                            height:7,
                            borderRadius:999,
                            background:active ? "var(--rukn-gold)" : "transparent",
                          }} />
                        </span>
                        <span style={{ minWidth:0, display:"grid", gap:3 }}>
                          <strong style={{ fontSize:13, color:"var(--rukn-text-strong)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {name}
                          </strong>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {posterTemplateChoice.templates?.length > 0 && (
                <div style={{
                  marginTop:5,
                  paddingTop:10,
                  borderTop:"1px solid var(--rukn-border-soft)",
                  display:"grid",
                  gap:8,
                }}>
                  <p style={{
                    margin:0,
                    color:"var(--rukn-text-muted)",
                    fontSize:11,
                    fontWeight:800,
                  }}>
                    {posterExportLabels.customGroup}
                  </p>
                  {posterTemplateChoice.templates.map((template) => {
                const active = String(template.id || "") === String(posterTemplateChoiceId || "");
                return (
                  <button
                    key={template.id}
                    type="button"
                    disabled={posterExportBusy}
                    onClick={() => setPosterTemplateChoiceId(template.id)}
                    style={{
                      border:`1px solid ${active ? "rgba(212,175,55,.55)" : "var(--rukn-border-soft)"}`,
                      background:active ? "rgba(212,175,55,.11)" : "var(--rukn-bg-soft)",
                      borderRadius:12,
                      padding:"11px 12px",
                      color:"var(--rukn-text)",
                      display:"flex",
                      alignItems:"center",
                      gap:11,
                      textAlign:"start",
                      cursor:posterExportBusy ? "not-allowed" : "pointer",
                      fontFamily:"'Cairo',sans-serif",
                    }}
                  >
                    <span style={{
                      width:16,
                      height:16,
                      borderRadius:999,
                      border:`2px solid ${active ? "var(--rukn-gold)" : "rgba(148,163,184,.45)"}`,
                      display:"inline-flex",
                      alignItems:"center",
                      justifyContent:"center",
                      flex:"0 0 auto",
                    }}>
                      <span style={{
                        width:7,
                        height:7,
                        borderRadius:999,
                        background:active ? "var(--rukn-gold)" : "transparent",
                      }} />
                    </span>
                    <span style={{ minWidth:0, display:"grid", gap:3 }}>
                      <strong style={{ fontSize:13, color:"var(--rukn-text-strong)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {template.name || posterExportLabels.action}
                      </strong>
                      <span style={{ fontSize:11, color:"var(--rukn-text-muted)" }}>
                        {posterExportLabels.levelsBadge(normalizePosterTemplateLevelsCount(template.levelsCount ?? template.levels_count))}
                      </span>
                    </span>
                  </button>
                );
                  })}
                </div>
              )}
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:10, flexWrap:"wrap" }}>
              <Button variant="ghost" onClick={closePosterTemplateChoice} disabled={posterExportBusy}>
                {posterExportLabels.cancel}
              </Button>
              <Button
                icon="download"
                onClick={handlePosterTemplateChoiceDownload}
                disabled={posterExportBusy || !posterTemplateChoiceId}
              >
                {posterExportBusy ? posterExportLabels.busy : posterExportLabels.download}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ProgramDetailOverview
        activeTab={programTab}
        onTabChange={handleProgramTabChange}
        tabs={[
          { key:"clients", label:participantTerms.plural || t.clients, icon:"users" },
          { key:"rooming", label:"التسكين", icon:"hotel" },
        ]}
        showSummary={listDataReady && programTab !== "rooming"}
        statCards={[
          { icon:"users", label:t.registered, value:progClients.length, color:tc.gold },
          { icon:"success", label:t.cleared, value:statusCounts.cleared, color:tc.greenLight },
          { icon:"partial", label:t.partial, value:statusCounts.partial, color:tc.warning },
          { icon:"unpaid", label:t.unpaid, value:statusCounts.unpaid, color:tc.danger },
          { icon:"banknote", label:t.collected, value:formatCurrencyForLang(totals.paid), color:tc.gold },
          { icon:"hourglass", label:t.remaining, value:formatCurrencyForLang(totalRem), color:tc.warning },
        ]}
        clearanceLabel={t.programClearanceRate}
        clearanceValueLabel={`${pct}% ${t.cleared}`}
        clearancePercent={pct}
      />

      {!listDataReady ? (
        <GlassCard style={{ padding:18, textAlign:"center", color:tc.grey, fontSize:13 }}>
          {t.loading || "Loading..."}
        </GlassCard>
      ) : programTab === "rooming" ? (
        !detailDataReady ? (
          <GlassCard style={{ padding:18, textAlign:"center", color:tc.grey, fontSize:13 }}>
            {t.loading || "Loading..."}
          </GlassCard>
        ) : (
          <RoomingWorkflowCanvas
            program={program}
            clients={progClients}
            packages={packages}
            agency={agency}
            agencyLogoApi={store.agencyLogoApi}
            agencyId={store.agencyId}
            supabaseRoomingEnabled={store.isSupabaseEnabled}
            syncRoomingClientFields={store.syncRoomingClientFields}
            onToast={onToast}
          />
        )
      ) : (
        <>
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
            <div ref={packageFilterRef} style={{ position:"relative" }}>
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
                  ...filterMenuBaseStyle,
                  insetInlineEnd:0,
                  width:190,
                }}>
                  {packageChips.map(chip => (
                    <button key={chip.key} type="button" onClick={() => {
                      setPackageFilter(chip.key);
                      setPackageFilterOpen(false);
                    }} style={filterMenuItemStyle(packageFilter === chip.key)}>
                      <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{chip.label}</span>
                      <span style={filterMenuCountStyle(packageFilter === chip.key)}>{chip.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {packageFilter === INCOMPLETE_INFO_FILTER ? (
          <div style={{
            border:"1px dashed rgba(245,158,11,.28)",
            background:"rgba(245,158,11,.08)",
            borderRadius:10,
            padding:"10px 12px",
            color:tc.warning,
            fontSize:12,
            fontWeight:800,
          }}>
            {completionLabels.informationIncomplete}
          </div>
        ) : packageFilter === "__unassigned" ? (
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
      <ProgramClientsToolbar
        selectMode={selectMode}
        statusFilterRef={statusFilterRef}
        statusFilterOpen={statusFilterOpen}
        onToggleStatusFilter={() => {
          setStatusFilterOpen(open => !open);
          setServiceTypeFilterOpen(false);
        }}
        activeStatusFilter={activeStatusFilter}
        filter={filter}
        filters={filters}
        serviceTypeFilterRef={serviceTypeFilterRef}
        serviceTypeFilterOpen={serviceTypeFilterOpen}
        onToggleServiceTypeFilter={() => {
          setServiceTypeFilterOpen(open => !open);
          setStatusFilterOpen(false);
        }}
        activeServiceTypeFilter={activeServiceTypeFilter}
        serviceTypeFilter={serviceTypeFilter}
        serviceTypeFilters={serviceTypeFilters}
        filterMenuBaseStyle={filterMenuBaseStyle}
        filterMenuItemStyle={filterMenuItemStyle}
        filterMenuCountStyle={filterMenuCountStyle}
        onSelectStatusFilter={(key) => {
          setFilter(key);
          setStatusFilterOpen(false);
        }}
        onSelectServiceTypeFilter={(key) => {
          setServiceTypeFilter(key);
          setServiceTypeFilterOpen(false);
        }}
        searchExpanded={searchExpanded}
        search={search}
        searchInputRef={searchInputRef}
        onSearchMouseEnter={() => setSearchOpen(true)}
        onSearchMouseLeave={() => {
          if (!search.trim() && document.activeElement !== searchInputRef.current) setSearchOpen(false);
        }}
        onSearchButtonClick={() => {
          setSearchOpen(true);
          requestAnimationFrame(() => searchInputRef.current?.focus());
        }}
        onSearchChange={e=>setSearch(e.target.value)}
        onSearchFocus={() => setSearchOpen(true)}
        onSearchBlur={() => {
          if (!search.trim()) setSearchOpen(false);
        }}
        onClearSearch={() => {
          setSearch("");
          requestAnimationFrame(() => searchInputRef.current?.focus());
        }}
        filteredCount={filtered.length}
        onToggleSelectMode={() => {
          if (selectMode) {
            exitSelectMode();
          } else {
            clearSelection();
            setSelectMode(true);
          }
        }}
        t={t}
        lang={lang}
        dir={dir}
        isRTL={isRTL}
        programClientRangeStart={programClientRangeStart}
        programClientRangeEnd={programClientRangeEnd}
        programClientPageSize={programClientPageSize}
        onProgramClientPageSizeChange={handleProgramClientPageSizeChange}
        programClientPageSizeOptions={programClientPageSizeOptions}
        safeProgramClientPage={safeProgramClientPage}
        totalProgramClientPages={totalProgramClientPages}
        onGoToProgramClientPage={goToProgramClientPage}
      />

      {selectMode && (
        <BulkClientActionsBar
          selectedCount={checkedIds.size}
          selectedCountLabel={tr("selectedCount", { count: checkedIds.size })}
          bulkActionsOpen={bulkActionsOpen}
          bulkActionsBtnRef={bulkActionsBtnRef}
          bulkActionsMenuRef={bulkActionsMenuRef}
          bulkActionsMenuPos={bulkActionsMenuPos}
          onToggleBulkActions={() => setBulkActionsOpen((open) => !open)}
          onTransferSelected={(event) => {
            event.stopPropagation();
            handleTransferSelected();
          }}
          onDeleteSelected={(event) => {
            event.stopPropagation();
            handleDeleteSelectedClick();
          }}
          onExitSelectMode={exitSelectMode}
          t={t}
          isRTL={isRTL}
        />
      )}

      <ProgramClientsTable
        filteredCount={filtered.length}
        tableGridTemplate={tableGridTemplate}
        selectMode={selectMode}
        headerSelectControl={(
          <HeaderSelectCheckbox
            checked={allChecked}
            indeterminate={partiallyChecked}
            onChange={toggleAllFiltered}
            label={allChecked ? t.deselectAll : t.selectAll}
          />
        )}
        labels={{
          name: t.name,
          roomType: t.roomType,
          serviceType: t.serviceType || "نوع الخدمة",
          ticketNo: t.ticketNo,
          amount: t.amount || (lang === "fr" ? "Montant" : lang === "en" ? "Amount" : "المبلغ"),
          paid: t.paid,
          remaining: t.remaining,
          status: t.statusLabel || t.status || "الحالة",
        }}
        emptyTitle={participantTerms.emptyTitle || t.programNoPilgrimsTitle}
        emptySub={filter!=="all" ? (participantTerms.emptyFiltered || t.programNoPilgrimsFiltered) : (participantTerms.emptySub || t.programNoPilgrimsSub)}
        rows={paginatedProgramClients}
        renderRow={(c,i)=>{
            const paid = getListClientTotalPaid(c.id);
            const amount = getProgramClientSalePrice(program, c);
            const rem  = getProgramClientRemainingAmount(program, c, paid);
            const overpaid = getProgramClientOverpaidAmount(program, c, paid);
            const stat = getProgramClientDisplayStatus(program, c, paid);
            const completionTooltip = getClientCompletionTooltip(c, lang, program, {
              referencePrice: getProgramPricingReferenceCost(program, c),
              standaloneSalePrice: getProgramStandaloneSalePrice(program, c),
            });
            return (
              <ProgramClientRow key={c.id} client={c} index={programClientStartIndex + i}
                program={program}
                amount={amount} paid={paid} remaining={rem} overpaid={overpaid} status={stat}
                completionTooltip={completionTooltip}
                onClick={()=>setSelectedClient(c)}
                onEdit={()=>runWithGlobalDetailData(() => setEditingClient(c))}
                selectMode={selectMode}
                showCheckbox={selectMode}
                isChecked={checkedIds.has(c.id)}
                onCheck={()=>toggleCheck(c.id)}
                onTransfer={()=>openTransferSheet([c.id])}
                onDelete={async ()=>{
                  const ready = await ensureGlobalDetailDataForCurrentAction();
                  if(!ready) return;
                  if(window.confirm(`حذف "${c.name}"؟`)){
                    store.deleteClient(c.id);
                    refreshScopedProgramDetail();
                    onToast("تم الحذف","info");
                  }
                }}
                gridTemplate={tableGridTemplate}
              />
            );
          }}
        totalsGridColumn={totalsGridColumn}
        totalLabel={participantTerms.totalLabel ? participantTerms.totalLabel(filtered.length) : tr("programTotalsLabel", { count: filtered.length })}
        summaryLabel={t.summary || participantTerms.plural || t.clients}
        amountTotalLabel={formatCurrencyForLang(filteredPaymentTotals.amount)}
        paidTotalLabel={formatCurrencyForLang(filteredPaymentTotals.paid)}
        remainingTotalLabel={formatCurrencyForLang(filteredPaymentTotals.remaining)}
      />
        </>
      )}

      {/* modals */}
      <ProgramCostingModal
        open={costingOpen}
        onClose={() => setCostingOpen(false)}
        program={program}
        packages={packages}
        agency={agency}
        onUpdateProgram={(nextProgram) => updateProgram?.(program.id, nextProgram)}
        onToast={onToast}
      />
      <ProgramClientModals
        store={store}
        onToast={onToast}
        t={t}
        tr={tr}
        program={program}
        packages={packages}
        participantTerms={participantTerms}
        completionLabels={completionLabels}
        participantExcelImportLabel={participantExcelImportLabel}
        selectedClient={selectedClient}
        onCloseClientDetail={() => setSelectedClient(null)}
        onEditClientFromDetail={(client) => {
          runWithGlobalDetailData(() => {
            setSelectedClient(null);
            setEditingClient(client);
          });
        }}
        isAddClientOpen={showAddClient}
        onCloseAddClient={() => setShowAddClient(false)}
        onSaveAddClient={() => {
          setShowAddClient(false);
          refreshScopedProgramDetail();
          onToast(t.addSuccess, "success");
        }}
        isExcelImportOpen={showExcelImport}
        onCloseExcelImport={() => {
          if (excelImportSaving) {
            closeExcelImportModal();
            return;
          }
          closeExcelImportModal();
          refreshScopedProgramDetail();
        }}
        onExcelImportingChange={setExcelImportSaving}
        isPassportImportOpen={showPassportImport}
        onClosePassportImport={() => {
          setShowPassportImport(false);
          refreshScopedProgramDetail();
        }}
        editingClient={editingClient}
        onCloseEditClient={() => setEditingClient(null)}
        onSaveEditClient={() => {
          setEditingClient(null);
          refreshScopedProgramDetail();
          onToast(t.updateSuccess, "success");
        }}
        isTransferOpen={transferSheetOpen}
        onCloseTransfer={closeTransferSheet}
        transferClients={transferList}
        availablePrograms={transferDestinationPrograms}
        programOccupancy={programOccupancy}
        programSummaryById={programSummaryById}
        onConfirmTransfer={handleTransferConfirm}
        getClientPayments={getClientPayments}
        onClientDataChanged={refreshScopedProgramDetail}
        programOverride={useScopedProgramDetail ? (scopedProgramDetail.program || program) : null}
        programClientsOverride={useScopedProgramDetail ? progClients : null}
        paymentsOverride={useScopedProgramDetail ? scopedProgramDetail.payments : null}
        paymentsReadyOverride={useScopedProgramDetail ? true : undefined}
        onRequireGlobalData={ensureGlobalDetailDataForCurrentAction}
        invoiceApi={store.invoiceApi}
        isBulkDeleteOpen={bulkDeleteOpen}
        onCloseBulkDelete={() => setBulkDeleteOpen(false)}
        bulkDeleteSelectedCount={checkedIds.size}
        onConfirmBulkDelete={handleConfirmDeleteSelected}
      />
    </div>
  );
}

function RoomingWorkflowCanvas({ program, clients, packages, agency, agencyLogoApi, agencyId = null, supabaseRoomingEnabled = false, syncRoomingClientFields, onToast }) {
  const { t, tr, lang } = useLang();
  const [city, setCity] = React.useState("makkah");
  const [rooms, setRooms] = React.useState([]);
  const [unassigned, setUnassigned] = React.useState([]);
  const [roomLinks, setRoomLinks] = React.useState([]);
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [roomingWorkspaceMode, setRoomingWorkspaceMode] = React.useState("normal");
  const [zoom, setZoom] = React.useState(100);
  const [dirty, setDirty] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState(null);
  const [selectedRoomId, setSelectedRoomId] = React.useState(null);
  const [roomModal, setRoomModal] = React.useState({ open: false, mode: "edit", roomId: null });
  const [roomDraft, setRoomDraft] = React.useState({ roomType: "double", category: "male_only", hotel: "", roomCount: "1" });
  const [roomCreatePosition, setRoomCreatePosition] = React.useState({ x: 0, y: 0 });
  const [canvasMenu, setCanvasMenu] = React.useState({ open: false, x: 0, y: 0, position: { x: 0, y: 0 } });
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pickerSearch, setPickerSearch] = React.useState("");
  const [selectedPilgrimIds, setSelectedPilgrimIds] = React.useState([]);
  const [selectedUnassignedIds, setSelectedUnassignedIds] = React.useState(() => new Set());
  const [roomSelectionMode, setRoomSelectionMode] = React.useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = React.useState(() => new Set());
  const [linkMode, setLinkMode] = React.useState(false);
  const [linkStartRoomId, setLinkStartRoomId] = React.useState(null);
  const [selectedRoomLinkId, setSelectedRoomLinkId] = React.useState(null);
  const [roomLinkMenu, setRoomLinkMenu] = React.useState({ open: false, x: 0, y: 0, linkId: "" });
  const [pendingDrop, setPendingDrop] = React.useState(null);
  const [pendingDropSalePrice, setPendingDropSalePrice] = React.useState("");
  const [panelSearch, setPanelSearch] = React.useState("");
  const [panelHotel, setPanelHotel] = React.useState("all");
  const [panelRoomType, setPanelRoomType] = React.useState("all");
  const [roomOccupancyFilter, setRoomOccupancyFilter] = React.useState("all");
  const [roomFilterOpen, setRoomFilterOpen] = React.useState(false);
  const [roomNeedsOpen, setRoomNeedsOpen] = React.useState(false);
  const [largeRoomGenerationConfirm, setLargeRoomGenerationConfirm] = React.useState(null);
  const [roomingPrintSettingsOpen, setRoomingPrintSettingsOpen] = React.useState(false);
  const [roomingPrintSettings, setRoomingPrintSettings] = React.useState({
    showRegistrationSource: true,
    showBedNumbers: false,
    density: "normal",
    layoutMode: "default",
  });
  const [toolbarCollapsed, setToolbarCollapsed] = React.useState(false);
  const [roomingPdfBusy, setRoomingPdfBusy] = React.useState("");
  const [roomingLoadStatus, setRoomingLoadStatus] = React.useState("idle");
  const [roomingSaveStatus, setRoomingSaveStatus] = React.useState("idle");
  const [draggingClientId, setDraggingClientId] = React.useState(null);
  const [hoveredDropRoomId, setHoveredDropRoomId] = React.useState(null);
  const flowRef = React.useRef(null);
  const roomingFullscreenRef = React.useRef(null);
  const flowNodesRef = React.useRef([]);
  const roomDragActiveRef = React.useRef(false);
  const dragStartPositionRef = React.useRef(new Map());
  const lastValidPositionRef = React.useRef(new Map());
  const dragInvalidRef = React.useRef(new Map());
  const clientDragPointerRef = React.useRef(null);
  const clientDragPanFrameRef = React.useRef(0);
  const roomingLoadSeqRef = React.useRef(0);
  const roomingRevisionRef = React.useRef(0);
  const generatedRoomFitPendingRef = React.useRef(null);

  const fullWorkspace = roomingWorkspaceMode !== "normal";
  const browserFullscreenMode = roomingWorkspaceMode === "browserFullscreen";
  const roomingModalPortalContainer = browserFullscreenMode ? roomingFullscreenRef.current : null;
  const canPersistRoomingRemote = Boolean(supabaseRoomingEnabled && agencyId && program?.id);
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
  const roomingEligibleClients = React.useMemo(
    () => clients.filter((client) => doesServiceTypeNeedAccommodation(client)),
    [clients]
  );
  const roomingEligibleClientIds = React.useMemo(
    () => new Set(roomingEligibleClients.map((client) => client.id).filter(Boolean)),
    [roomingEligibleClients]
  );
  const excludedRoomingClientCount = Math.max(0, clients.length - roomingEligibleClients.length);
  const clientsById = React.useMemo(() => Object.fromEntries(roomingEligibleClients.map((client) => [client.id, client])), [roomingEligibleClients]);
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
  const largeRoomGenerationCopy = React.useMemo(() => ({
    title: t.roomingLargeGenerationConfirmTitle || (
      lang === "fr" ? "Confirmer la génération des chambres"
        : lang === "en" ? "Confirm room generation"
          : "تأكيد توليد الغرف"
    ),
    message: t.roomingLargeGenerationConfirmMessage || (
      lang === "fr" ? "Le nombre de chambres sélectionné est relativement élevé. Les chambres seront générées et organisées dans l’espace d’hébergement. Voulez-vous continuer ?"
        : lang === "en" ? "The selected number of rooms is relatively large. The rooms will be generated and arranged in the rooming workspace. Do you want to continue?"
          : "عدد الغرف المختار كبير نسبيًا. سيتم إنشاء هذه الغرف وترتيبها داخل مساحة التسكين. هل تؤكد المتابعة؟"
    ),
    confirm: t.roomingLargeGenerationConfirmAction || (
      lang === "fr" ? "Confirmer la génération"
        : lang === "en" ? "Confirm generation"
          : "تأكيد التوليد"
    ),
    cancel: t.roomingLargeGenerationCancelAction || t.cancel || (
      lang === "fr" ? "Annuler"
        : lang === "en" ? "Cancel"
          : "إلغاء"
    ),
    countLabel: t.roomingLargeGenerationCountLabel || (
      lang === "fr" ? "Nombre de chambres"
        : lang === "en" ? "Number of rooms"
          : "عدد الغرف"
    ),
  }), [lang, t]);
  const getLocalizedRoomTypeLabel = React.useCallback((roomType) => {
    const key = normalizeRoomingRoomType(roomType) || roomType;
    return roomingRoomOptions.find((option) => option.value === key)?.label || getRoomingRoomLabel(key);
  }, [roomingRoomOptions]);
  const getLocalizedCategoryLabel = React.useCallback((category) => {
    return roomingCategoryOptions.find((option) => option.value === category)?.label || getRoomingCategoryLabel(category);
  }, [roomingCategoryOptions]);
  const roomingClientSyncWarning = React.useMemo(() => {
    if (lang === "fr") return "La répartition a été enregistrée, mais certaines informations des pèlerins n’ont pas pu être mises à jour.";
    if (lang === "en") return "Rooming was saved, but some pilgrim details could not be updated.";
    return "تم حفظ التسكين، لكن تعذر تحديث بعض بيانات المعتمرين.";
  }, [lang]);
  const roomingServiceTypeHiddenNote = React.useMemo(() => {
    if (lang === "fr") return "Certains clients sont masqués de l’hébergement car leur type de service ne nécessite pas d’hébergement.";
    if (lang === "en") return "Some clients are hidden from rooming because their service type does not require accommodation.";
    return "تم إخفاء بعض العملاء من التسكين لأن نوع خدمتهم لا يحتاج سكنًا.";
  }, [lang]);
  const unknownGenderBadgeLabel = React.useMemo(() => {
    if (lang === "fr") return "Sexe non défini";
    if (lang === "en") return "Gender not set";
    return "الجنس غير محدد";
  }, [lang]);
  const roomingParticipantTerms = React.useMemo(() => getParticipantTerminology(program, lang), [program, lang]);
  const roomingPrintLabels = React.useMemo(() => {
    if (lang === "fr") {
      return {
        title: "Paramètres d’impression",
        showSource: "Afficher la source d’inscription",
        showBedNumbers: "Afficher la numérotation des lits dans la chambre",
        density: "Densité d’impression",
        comfortable: "Confortable",
        normal: "Normal",
        compact: "Compact",
        layoutMode: "Mode d’organisation d’impression",
        defaultLayout: "Organisation par défaut",
        arrangedLayout: "Selon l’agencement du rooming",
        layoutHelp: "L’organisation par défaut regroupe les chambres par type. L’agencement du rooming respecte la proximité des chambres que vous avez organisée, tout en les compactant proprement pour l’impression.",
        done: "Terminé",
      };
    }
    if (lang === "en") {
      return {
        title: "Print settings",
        showSource: "Show registration source",
        showBedNumbers: "Show bed numbering inside the room",
        density: "Print density",
        comfortable: "Comfortable",
        normal: "Normal",
        compact: "Compact",
        layoutMode: "Print layout mode",
        defaultLayout: "Default layout",
        arrangedLayout: "Rooming arrangement",
        layoutHelp: "Default layout groups rooms by type. Rooming arrangement keeps rooms close to how you arranged them, while packing them cleanly for print.",
        done: "Done",
      };
    }
    return {
      title: "إعدادات الطباعة",
      showSource: "إظهار جهة التسجيل",
      showBedNumbers: "إظهار ترقيم الأسرة داخل الغرفة",
      density: "حجم الغرف",
      comfortable: "كبير",
      normal: "عادي",
      compact: "صغير",
      layoutMode: "طريقة ترتيب الطباعة",
      defaultLayout: "الترتيب الافتراضي",
      arrangedLayout: "حسب ترتيب التسكين",
      layoutHelp: "الترتيب الافتراضي يجمع الغرف حسب النوع، أما ترتيب التسكين فيحافظ على قرب الغرف كما رتبتها مع ضغطها للطباعة باحترافية.",
      done: "تطبيق",
    };
  }, [lang]);
  const roomingDensityOptions = React.useMemo(() => ([
    { value: "comfortable", label: roomingPrintLabels.comfortable },
    { value: "normal", label: roomingPrintLabels.normal },
    { value: "compact", label: roomingPrintLabels.compact },
  ]), [roomingPrintLabels]);
  const roomingPrintLayoutOptions = React.useMemo(() => ([
    { value: "default", label: roomingPrintLabels.defaultLayout },
    { value: "arranged", label: roomingPrintLabels.arrangedLayout },
  ]), [roomingPrintLabels]);

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
    roomingEligibleClients.forEach((client) => {
      const hotel = getClientContext(client).hotel;
      if (hotel) values.add(hotel);
    });
    return Array.from(values);
  }, [program, packages, city, roomingEligibleClients, getClientContext]);

  const buildCanvasPayload = React.useCallback((targetCity, nextRooms = [], nextUnassigned = [], nextRoomLinks = []) => ({
    kind: "rooming-canvas",
    version: 4,
    city: targetCity,
    rooms: Array.isArray(nextRooms) ? nextRooms : [],
    unassigned: Array.isArray(nextUnassigned) ? nextUnassigned : [],
    roomLinks: normalizeRoomingLinks(nextRoomLinks, nextRooms),
    updatedAt: new Date().toISOString(),
  }), []);

  const syncRoomingClientsFromRooms = React.useCallback(async (nextRooms = []) => {
    if (typeof syncRoomingClientFields !== "function") return { error: null, updatedCount: 0, skippedCount: 0 };
    const updates = buildRoomingClientFieldUpdates({ rooms: nextRooms, clients: roomingEligibleClients, programId: program.id, city, packages });
    if (!updates.length) return { error: null, updatedCount: 0, skippedCount: 0 };
    return syncRoomingClientFields(program.id, updates);
  }, [city, roomingEligibleClients, packages, program.id, syncRoomingClientFields]);

  const writeCanvasCache = React.useCallback((targetCity, payload) => {
    try {
      localStorage.setItem(
        getRoomingStorageKey(program.id, targetCity, agencyId),
        JSON.stringify(payload)
      );
    } catch (error) {
      console.warn("[rooming] local cache write failed", error);
    }
  }, [agencyId, program.id]);

  const readCanvasStateFromStorage = React.useCallback((targetCity) => {
    const keys = [
      getRoomingStorageKey(program.id, targetCity, agencyId),
      getLegacyRoomingStorageKey(program.id, targetCity),
    ].filter((key, index, list) => key && list.indexOf(key) === index);

    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        return normalizeRoomingCanvasState(JSON.parse(raw), roomingEligibleClients);
      } catch (error) {
        console.warn("[rooming] local cache read failed", error);
      }
    }
    return { rooms: [], unassigned: [], roomLinks: [], version: 4 };
  }, [agencyId, roomingEligibleClients, program.id]);

  React.useEffect(() => {
    let active = true;
    const loadSeq = roomingLoadSeqRef.current + 1;
    roomingLoadSeqRef.current = loadSeq;

    const applyLoadedState = (loaded, sourceUpdatedAt = null) => {
      if (!active || roomingLoadSeqRef.current !== loadSeq) return;
      const sanitized = sanitizeRoomingStateForEligibleClients(loaded, roomingEligibleClientIds);
      setRooms(sanitized.rooms);
      setUnassigned(sanitized.unassigned);
      setRoomLinks(normalizeRoomingLinks(sanitized.roomLinks, sanitized.rooms));
      setDirty(Boolean(sanitized.removedCount));
      roomingRevisionRef.current += 1;
      setSavedAt(sourceUpdatedAt ? new Date(sourceUpdatedAt) : null);
      setSelectedRoomId(null);
      setSelectedUnassignedIds(new Set());
      setSelectedRoomIds(new Set());
      setRoomSelectionMode(false);
      setLinkMode(false);
      setLinkStartRoomId(null);
      setSelectedRoomLinkId(null);
      setRoomLinkMenu({ open: false, x: 0, y: 0, linkId: "" });
      setRoomingSaveStatus(sanitized.removedCount ? "dirty" : "idle");
    };

    const loadRooming = async () => {
      if (!canPersistRoomingRemote) {
        applyLoadedState(readCanvasStateFromStorage(city));
        setRoomingLoadStatus("local");
        return;
      }

      setRoomingLoadStatus("loading");
      const { data, error } = await db.roomingAssignments.fetch(agencyId, program.id, city);
      if (!active || roomingLoadSeqRef.current !== loadSeq) return;

      if (error) {
        console.error("[rooming] Supabase load failed", error);
        onToast?.(t.roomingLoadFailed || "تعذر تحميل التسكين. سيتم استخدام النسخة المحلية إن وجدت.", "error");
        applyLoadedState(readCanvasStateFromStorage(city));
        setRoomingLoadStatus("local");
        return;
      }

      if (data) {
        const loaded = normalizeRoomingCanvasState(data, roomingEligibleClients);
        writeCanvasCache(city, buildCanvasPayload(city, loaded.rooms, loaded.unassigned, loaded.roomLinks));
        applyLoadedState(loaded, data.updatedAt);
        setRoomingLoadStatus("remote");
        return;
      }

      applyLoadedState(readCanvasStateFromStorage(city));
      setRoomingLoadStatus("local");
    };

    loadRooming();
    return () => {
      active = false;
    };
  }, [agencyId, buildCanvasPayload, canPersistRoomingRemote, city, onToast, program.id, readCanvasStateFromStorage, roomingEligibleClientIds, roomingEligibleClients, t.roomingLoadFailed, writeCanvasCache]);

  const exitRoomingWorkspace = React.useCallback(async () => {
    setRoomingWorkspaceMode("normal");
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    if (!fullscreenElement) return;
    const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    try {
      await exitFullscreen?.call(document);
    } catch (error) {
      console.warn("[rooming] browser fullscreen exit failed", error);
    }
  }, []);

  const enterRoomingExpanded = React.useCallback(async () => {
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    if (fullscreenElement) {
      const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
      try {
        await exitFullscreen?.call(document);
      } catch (error) {
        console.warn("[rooming] browser fullscreen exit failed", error);
      }
    }
    setRoomingWorkspaceMode("expanded");
  }, []);

  const enterRoomingBrowserFullscreen = React.useCallback(async () => {
    setRoomingWorkspaceMode("browserFullscreen");
    const target = roomingFullscreenRef.current || document.documentElement;
    const requestFullscreen = target?.requestFullscreen || target?.webkitRequestFullscreen || target?.msRequestFullscreen;
    if (!requestFullscreen) {
      setRoomingWorkspaceMode("expanded");
      return;
    }
    try {
      await requestFullscreen.call(target);
    } catch (error) {
      console.warn("[rooming] browser fullscreen request failed", error);
      setRoomingWorkspaceMode("expanded");
    }
  }, []);

  React.useEffect(() => {
    const syncFullscreenState = () => {
      const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
      if (!fullscreenElement && roomingWorkspaceMode === "browserFullscreen") {
        setRoomingWorkspaceMode("normal");
      }
    };
    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState);
    document.addEventListener("MSFullscreenChange", syncFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("webkitfullscreenchange", syncFullscreenState);
      document.removeEventListener("MSFullscreenChange", syncFullscreenState);
    };
  }, [roomingWorkspaceMode]);

  React.useEffect(() => {
    if (!fullWorkspace) return undefined;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      const modalOpen = roomModal.open || pickerOpen || Boolean(pendingDrop) || roomingPrintSettingsOpen;
      if (!modalOpen) exitRoomingWorkspace();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [exitRoomingWorkspace, fullWorkspace, pendingDrop, pickerOpen, roomModal.open, roomingPrintSettingsOpen]);

  const saveCanvas = React.useCallback(async (notify = true) => {
    const revision = roomingRevisionRef.current;
    const sanitized = sanitizeRoomingStateForEligibleClients({ rooms, unassigned, roomLinks }, roomingEligibleClientIds);
    const payload = buildCanvasPayload(city, sanitized.rooms, sanitized.unassigned, sanitized.roomLinks);
    try {
      writeCanvasCache(city, payload);

      if (canPersistRoomingRemote) {
        setRoomingSaveStatus("saving");
        const { data, error } = await db.roomingAssignments.upsert({
          programId: program.id,
          location: city,
          rooms: payload.rooms,
          unassigned: payload.unassigned,
          version: payload.version,
          meta: { kind: payload.kind, city, roomLinks: payload.roomLinks },
        }, agencyId);
        if (error) throw error;
        const clientSync = await syncRoomingClientsFromRooms(payload.rooms);
        if (roomingRevisionRef.current === revision) {
          setDirty(false);
          setSavedAt(data?.updatedAt ? new Date(data.updatedAt) : new Date());
          setRoomingSaveStatus("saved");
        }
        if (clientSync?.error) {
          console.error("[rooming] client field sync failed", clientSync.error);
          if (notify) onToast?.(roomingClientSyncWarning, "warning");
        } else if (notify) {
          onToast?.(t.roomingSaved || "تم حفظ التسكين", "success");
        }
        return;
      }

      const clientSync = await syncRoomingClientsFromRooms(payload.rooms);
      if (roomingRevisionRef.current === revision) {
        setDirty(false);
        setSavedAt(new Date());
        setRoomingSaveStatus("saved");
      }
      if (clientSync?.error) {
        console.error("[rooming] client field sync failed", clientSync.error);
        if (notify) onToast?.(roomingClientSyncWarning, "warning");
      } else if (notify) {
        onToast?.(t.roomingSavedLocal || "تم حفظ مصمم التسكين محليًا", "success");
      }
    } catch (error) {
      console.error("[rooming] save failed", error);
      setRoomingSaveStatus("error");
      if (notify || canPersistRoomingRemote) {
        onToast?.(
          t.roomingSaveFailed || "تعذر حفظ التسكين. تحقق من الاتصال ثم حاول مرة أخرى.",
          "error"
        );
      }
    }
  }, [agencyId, buildCanvasPayload, canPersistRoomingRemote, city, onToast, program.id, rooms, roomLinks, roomingClientSyncWarning, roomingEligibleClientIds, syncRoomingClientsFromRooms, t, unassigned, writeCanvasCache]);

  const markDirty = React.useCallback(() => {
    roomingRevisionRef.current += 1;
    setDirty(true);
    setRoomingSaveStatus("dirty");
  }, []);

  React.useEffect(() => {
    const sanitized = sanitizeRoomingStateForEligibleClients({ rooms, unassigned, roomLinks }, roomingEligibleClientIds);
    if (!sanitized.removedCount) return;
    setRooms(sanitized.rooms);
    setUnassigned(sanitized.unassigned);
    setRoomLinks(normalizeRoomingLinks(sanitized.roomLinks, sanitized.rooms));
    setSelectedUnassignedIds((current) => {
      const available = new Set(sanitized.unassigned.map((item) => item.clientId));
      const next = new Set(Array.from(current).filter((clientId) => available.has(clientId)));
      return next.size === current.size ? current : next;
    });
    markDirty();
  }, [markDirty, rooms, roomLinks, roomingEligibleClientIds, unassigned]);

  React.useEffect(() => {
    if (!dirty) return undefined;
    const timer = window.setTimeout(() => saveCanvas(false), 650);
    return () => window.clearTimeout(timer);
  }, [dirty, rooms, roomLinks, unassigned, saveCanvas]);

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
    if (!roomLinkMenu.open) return undefined;
    const close = () => setRoomLinkMenu({ open: false, x: 0, y: 0, linkId: "" });
    const handleKeyDown = (event) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [roomLinkMenu.open]);

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
    roomingEligibleClients.forEach((client) => {
      if (!clientIdsInRooms.has(client.id) && !explicit.has(client.id)) {
        explicit.set(client.id, { clientId: client.id, reason: "" });
      }
    });
    return Array.from(explicit.values()).filter((item) => clientsById[item.clientId] && !clientIdsInRooms.has(item.clientId));
  }, [roomingEligibleClients, clientsById, clientIdsInRooms, unassigned]);

  React.useEffect(() => {
    const availableIds = new Set(normalizedUnassigned.map((item) => item.clientId));
    setSelectedUnassignedIds((current) => {
      const next = new Set(Array.from(current).filter((clientId) => availableIds.has(clientId)));
      return next.size === current.size ? current : next;
    });
  }, [normalizedUnassigned]);

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
    if (String(client.programId || "") !== String(program.id || "")) return { ok: false, reason: t.programNotFound || "البرنامج غير متاح" };
    if (!doesServiceTypeNeedAccommodation(client)) return { ok: false, reason: roomingServiceTypeHiddenNote };
    const context = getClientContext(client);
    const occupantIds = room.occupantIds || [];
    const roomType = normalizeRoomingRoomType(room.roomType);
    const capacity = room.capacity || getRoomingCapacity(roomType);
    const clientGender = normalizeRoomingGender(context.gender);
    if (occupantIds.includes(client.id)) return { ok: false, reason: t.roomingAlreadyInserted || "المعتمر مدرج مسبقا" };
    if (occupantIds.length >= capacity) return { ok: false, reason: t.roomFull || "الغرفة ممتلئة" };
    if (room.category === "male_only" && clientGender === "female") return { ok: false, reason: t.roomingGenderMismatch || "الجنس غير متوافق" };
    if (room.category === "female_only" && clientGender === "male") return { ok: false, reason: t.roomingGenderMismatch || "الجنس غير متوافق" };
    return { ok: true };
  }, [getClientContext, program.id, roomingServiceTypeHiddenNote, t]);

  const getRoomingDropConflicts = React.useCallback((client, room) => {
    if (!client || !room) return null;
    const targetRoomType = normalizeRoomingRoomType(room.roomType);
    const currentRoomType = normalizeRoomingRoomType(client.roomType, client.roomTypeLabel, client.room);
    const targetHotel = isMissingRoomingValue(room.hotel) ? "" : String(room.hotel).trim();
    const currentHotel = getExplicitClientHotelForRoomingCity(client, city);
    const clientGender = normalizeRoomingGender(client.gender);
    const occupantGenders = (room.occupantIds || [])
      .map((id) => normalizeRoomingGender(clientsById[id]?.gender))
      .filter((gender) => gender === "male" || gender === "female");
    const hasMale = occupantGenders.includes("male");
    const hasFemale = occupantGenders.includes("female");
    const conflicts = [];
    if (targetRoomType && currentRoomType && targetRoomType !== currentRoomType) conflicts.push("roomType");
    if (targetHotel && currentHotel && normalizeRoomingHotel(targetHotel) !== normalizeRoomingHotel(currentHotel)) conflicts.push("hotel");
    const priceSync = getRoomingPriceSync({ client, room, packages, city });
    if (priceSync?.requiresConfirmation) conflicts.push("price");
    let genderAssignment = "";
    if (!clientGender && room.category === "male_only") {
      conflicts.push("genderAssignment");
      genderAssignment = "male";
    } else if (!clientGender && room.category === "female_only") {
      conflicts.push("genderAssignment");
      genderAssignment = "female";
    }
    const createsFamilyMix = room.category === "family"
      && ["male", "female"].includes(clientGender)
      && occupantGenders.length > 0
      && !(hasMale && hasFemale)
      && ((clientGender === "male" && hasFemale) || (clientGender === "female" && hasMale));
    if (createsFamilyMix) conflicts.push("familyMixed");
    if (!conflicts.length) return null;
    return {
      clientId: client.id,
      roomId: room.id,
      city,
      conflicts,
      genderAssignment,
      currentRoomType,
      targetRoomType,
      currentRoomTypeLabel: currentRoomType ? getLocalizedRoomTypeLabel(currentRoomType) : "",
      targetRoomTypeLabel: targetRoomType ? getLocalizedRoomTypeLabel(targetRoomType) : "",
      currentHotel,
      targetHotel,
      priceSync,
    };
  }, [city, clientsById, getLocalizedRoomTypeLabel, packages]);

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

  const filteredCompatibleUnassigned = React.useMemo(() => {
    const query = normalizeRoomingSearchText(pickerSearch);
    if (!query) return compatibleUnassigned;
    return compatibleUnassigned.filter(({ client }) => getRoomingClientSearchText(client).includes(query));
  }, [compatibleUnassigned, pickerSearch]);

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

  const unassignedSelectionLabels = React.useMemo(() => {
    if (lang === "fr") {
      return {
        selected: "sélectionnés",
        clear: "Effacer",
        addToRoom: "Ajouter à la chambre sélectionnée",
        capacity: "La chambre ne peut pas accueillir tous les pèlerins sélectionnés.",
        classification: "Certains pèlerins sélectionnés ne correspondent pas à la classification de cette chambre.",
        conflict: "Certains pèlerins sélectionnés nécessitent une vérification. Ajoutez-les un par un pour confirmer les différences.",
        success: "Les pèlerins sélectionnés ont été ajoutés.",
      };
    }
    if (lang === "en") {
      return {
        selected: "selected",
        clear: "Clear",
        addToRoom: "Add to selected room",
        capacity: "This room does not have enough capacity for all selected pilgrims.",
        classification: "Some selected pilgrims do not match this room classification.",
        conflict: "Some selected pilgrims need review before they can be added. Add them one by one to confirm differences.",
        success: "Selected pilgrims added.",
      };
    }
    return {
      selected: "محدد",
      clear: "إلغاء",
      addToRoom: "إضافة المحددين إلى الغرفة",
      capacity: "الغرفة لا تتسع لكل المعتمرين المحددين",
      classification: "بعض المحددين لا يناسبون تصنيف هذه الغرفة",
      conflict: "بعض المحددين يحتاجون مراجعة قبل إدراجهم. أضفهم فرديًا لتأكيد الاختلافات.",
      success: "تم إدراج المعتمرين المحددين",
    };
  }, [lang]);

  const selectedUnassignedList = React.useMemo(() => (
    Array.from(selectedUnassignedIds).filter((clientId) => clientsById[clientId] && !clientIdsInRooms.has(clientId))
  ), [selectedUnassignedIds, clientsById, clientIdsInRooms]);

  const clearSelectedUnassigned = React.useCallback(() => {
    setSelectedUnassignedIds(new Set());
  }, []);

  const toggleUnassignedSelection = React.useCallback((clientId) => {
    setSelectedUnassignedIds((current) => {
      const next = new Set(current);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }, []);

  const setUnassignedGroupDragImage = React.useCallback((event, dragIds = [], fallbackName = "") => {
    if (!event?.dataTransfer?.setDragImage || dragIds.length <= 1 || typeof document === "undefined") return;
    const firstClient = clientsById[dragIds[0]];
    const firstName = getClientDisplayName(firstClient) || fallbackName || "—";
    const extraCount = Math.max(0, dragIds.length - 1);
    const title = extraCount ? `${firstName} +${extraCount}` : firstName;
    const subtitle = lang === "fr"
      ? `${dragIds.length} ${roomingParticipantTerms.plural} sélectionnés`
      : lang === "en"
        ? `${dragIds.length} selected ${roomingParticipantTerms.plural}`
        : `${dragIds.length} ${roomingParticipantTerms.plural} محددين`;
    const preview = document.createElement("div");
    preview.dir = lang === "ar" ? "rtl" : "ltr";
    preview.style.cssText = [
      "position:fixed",
      "top:-1000px",
      "left:-1000px",
      "z-index:2147483647",
      "width:230px",
      "border:1px solid rgba(37,99,235,.35)",
      "border-radius:12px",
      "background:#ffffff",
      "box-shadow:0 18px 42px rgba(15,23,42,.22)",
      "padding:10px 12px",
      "font-family:Cairo,Arial,Tahoma,sans-serif",
      "pointer-events:none",
    ].join(";");
    const titleEl = document.createElement("strong");
    titleEl.textContent = title;
    titleEl.style.cssText = "display:block;color:#0f172a;font-size:13px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
    const subtitleEl = document.createElement("span");
    subtitleEl.textContent = subtitle;
    subtitleEl.style.cssText = "display:inline-flex;margin-top:5px;border-radius:999px;background:rgba(37,99,235,.10);border:1px solid rgba(37,99,235,.22);color:#1d4ed8;font-size:11px;font-weight:900;padding:3px 8px";
    preview.appendChild(titleEl);
    preview.appendChild(subtitleEl);
    document.body.appendChild(preview);
    event.dataTransfer.setDragImage(preview, lang === "ar" ? 206 : 24, 24);
    window.setTimeout(() => preview.remove(), 0);
  }, [clientsById, lang, roomingParticipantTerms.plural]);

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
    const sourceRooms = targetCity === city ? rooms : readCanvasStateFromStorage(targetCity).rooms;
    const assigned = new Set();
    sourceRooms.forEach((room) => (room.occupantIds || []).forEach((id) => {
      if (clientsById[id]) assigned.add(id);
    }));
    const total = roomingEligibleClients.length;
    const percent = total ? Math.round((assigned.size / total) * 100) : 0;
    return { assigned: assigned.size, total, percent };
  }, [city, rooms, readCanvasStateFromStorage, roomingEligibleClients.length, clientsById]);

  const roomingProgress = React.useMemo(() => ({
    makkah: getRoomingProgressForCity("makkah"),
    madinah: getRoomingProgressForCity("madinah"),
  }), [getRoomingProgressForCity]);

  const roomingStatusText = React.useMemo(() => {
    if (roomingLoadStatus === "loading") return t.loading || "جاري التحميل...";
    if (roomingSaveStatus === "saving") return t.saving || "جارٍ الحفظ";
    if (roomingSaveStatus === "error") return t.roomingSaveFailedShort || "تعذر الحفظ";
    if (dirty) return t.unsavedChanges || "تغييرات غير محفوظة";
    if (savedAt) return tr("lastSaved", { time: savedAt.toLocaleTimeString("ar-MA") }) || `آخر حفظ ${savedAt.toLocaleTimeString("ar-MA")}`;
    if (roomingLoadStatus === "remote") return t.roomingLoadedFromCloud || "محفوظ في السحابة";
    return "";
  }, [dirty, roomingLoadStatus, roomingSaveStatus, savedAt, t, tr]);

  const roomNeeds = React.useMemo(() => {
    const counts = new Map();
    roomingEligibleClients.forEach((client) => {
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
  }, [roomingEligibleClients, getLocalizedRoomTypeLabel]);

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

  const generateRooms = React.useCallback((options = {}) => {
    const skipLargeConfirm = Boolean(options?.skipLargeConfirm);
    const skipReplaceConfirm = Boolean(options?.skipReplaceConfirm);
    if (rooms.length && !skipReplaceConfirm && !window.confirm(t.roomingRegenerateConfirm || "سيتم توليد الغرف فارغة حسب الاحتياج. سيبقى الحجاج/المعتمرون في قائمة غير المسكنين لتقوم بتسكينهم يدويًا. سيتم استبدال التسكين الحالي. هل تريد المتابعة؟")) return;
    const nextRooms = [];
    const nextUnassignedByClientId = new Map(roomingEligibleClients.map((client) => [client.id, { clientId: client.id, reason: "" }]));
    const grouped = new Map();
    const addUnassigned = (client, reason) => {
      nextUnassignedByClientId.set(client.id, { clientId: client.id, reason });
    };

    roomingEligibleClients.forEach((client) => {
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
        const plannedClients = group.slice(index, index + capacity);
        const category = first.roomCategory || inferRoomCategoryFromClients(plannedClients);
        const hasUnsafeFamilyMix = category === "family" && new Set(plannedClients.map((client) => client.gender)).size > 1
          && !plannedClients.every((client) => getClientContext(client).familyKey && getClientContext(client).familyKey === getClientContext(first).familyKey);
        if (hasUnsafeFamilyMix) {
          plannedClients.forEach((client) => addUnassigned(client, t.roomingMissingFamily || "لا توجد مجموعة عائلية"));
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
          occupantIds: [],
          roomingGroupId: "",
          roomingGroupName: "",
        });
        order += 1;
      }
    });

    const generatedRooms = autoLayoutGeneratedRoomNodes(nextRooms);
    if (!skipLargeConfirm && generatedRooms.length >= ROOMING_LARGE_GENERATION_THRESHOLD) {
      generatedRoomFitPendingRef.current = null;
      setLargeRoomGenerationConfirm({ mode: "generate", roomCount: generatedRooms.length });
      return;
    }
    generatedRoomFitPendingRef.current = getRoomingGeneratedLayoutSummary(generatedRooms.length);
    setRooms(generatedRooms);
    setUnassigned(Array.from(nextUnassignedByClientId.values()));
    setRoomLinks([]);
    setLinkMode(false);
    setLinkStartRoomId(null);
    setSelectedRoomLinkId(null);
    setSelectedRoomId(null);
    setDirty(true);
    onToast?.(t.roomingGenerated || "تم توليد الغرف فارغة حسب الاحتياج. سيبقى الحجاج/المعتمرون في قائمة غير المسكنين لتقوم بتسكينهم يدويًا.", "success");
  }, [rooms.length, roomingEligibleClients, getClientContext, onToast, t]);

  const openCreateRoom = React.useCallback((position = { x: 0, y: 0 }) => {
    setRoomDraft({
      roomType: "double",
      category: "male_only",
      hotel: hotelOptions[0] || (city === "makkah" ? program.hotelMecca || "" : program.hotelMadina || ""),
      roomCount: "1",
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
      roomCount: "1",
    });
    setRoomModal({ open: true, mode: "edit", roomId: room.id });
  }, [hotelOptions]);

  const saveRoomEdit = React.useCallback((options = {}) => {
    const skipLargeConfirm = Boolean(options?.skipLargeConfirm);
    const capacity = getRoomingCapacity(roomDraft.roomType);
    if (roomModal.mode === "create") {
      const roomCount = normalizeRoomCreateCount(roomDraft.roomCount);
      if (!skipLargeConfirm && roomCount >= ROOMING_LARGE_GENERATION_THRESHOLD) {
        setLargeRoomGenerationConfirm({ mode: "create", roomCount });
        return;
      }
      const now = new Date().toISOString();
      const roomNumbers = rooms
        .map((room) => Number(String(room.roomNumber || "").replace(/[^\d]/g, "")))
        .filter((value) => Number.isFinite(value) && value > 0);
      const firstRoomNumber = (roomNumbers.length ? Math.max(...roomNumbers) : 0) + 1;
      const createdRooms = [];
      const baseCollisionNodes = rooms.map((room) => roomToCollisionNode(room));
      const createdLayout = getRoomingGeneratedLayoutSummary(roomCount);
      const createdLayoutOrigin = {
        x: Number(roomCreatePosition.x ?? ROOMING_LAYOUT_START_X),
        y: Number(roomCreatePosition.y ?? ROOMING_LAYOUT_START_Y),
      };
      for (let index = 0; index < roomCount; index += 1) {
        const draftRoom = {
          id: createRoomId(),
          order: rooms.length + index,
          roomNumber: String(firstRoomNumber + index).padStart(2, "0"),
          roomType: roomDraft.roomType,
          category: roomDraft.category,
          hotel: roomDraft.hotel || hotelOptions[0] || "",
          capacity,
          occupantIds: [],
          locked: false,
          createdAt: now,
          updatedAt: now,
        };
        const preferredPosition = getRoomingGeneratedGridPosition(index, createdLayout.columns, createdLayoutOrigin);
        const node = { ...roomToCollisionNode(draftRoom), position: preferredPosition };
        const collisionNodes = [...baseCollisionNodes, ...createdRooms.map((room) => roomToCollisionNode(room))];
        const position = findNearestFreeRoomingPosition(node, collisionNodes, preferredPosition);
        createdRooms.push({ ...draftRoom, x: position.x, y: position.y });
      }
      if (roomCount > 1) generatedRoomFitPendingRef.current = getRoomingGeneratedLayoutSummary(rooms.length + createdRooms.length);
      setRooms((prev) => [...prev, ...createdRooms]);
      setSelectedRoomId(createdRooms[createdRooms.length - 1]?.id || null);
      setRoomModal({ open: false, mode: "edit", roomId: null });
      markDirty();
      onToast?.(roomCount > 1 ? (t.roomingRoomsAdded || t.roomingRoomAdded || "تمت إضافة الغرف") : (t.roomingRoomAdded || "تمت إضافة الغرفة"), "success");
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
      genderOverrides: Object.fromEntries(Object.entries(item.genderOverrides || {}).filter(([id]) => kept.includes(id))),
      priceOverrides: Object.fromEntries(Object.entries(item.priceOverrides || {}).filter(([id]) => kept.includes(id))),
    } : item));
    if (removed.length) {
      setUnassigned((prev) => [...prev, ...removed]);
      if (roomDraft.category === "male_only") onToast?.(t.roomingMovedIncompatibleWomen || "تم نقل المعتمرات غير المتوافقات إلى غير المدرجين", "info");
      else if (roomDraft.category === "female_only") onToast?.(t.roomingMovedIncompatibleMen || "تم نقل المعتمرين غير المتوافقين إلى غير المدرجين", "info");
      else onToast?.(t.roomingMovedIncompatible || "تم نقل المعتمرين غير المتوافقين إلى غير المدرجين", "info");
    }
    setRoomModal({ open: false, mode: "edit", roomId: null });
    markDirty();
  }, [rooms, roomModal.mode, roomModal.roomId, roomDraft, hotelOptions, roomCreatePosition, clientsById, getCompatibilityReason, markDirty, onToast, roomToCollisionNode, t]);

  const cancelLargeRoomGeneration = React.useCallback(() => {
    setLargeRoomGenerationConfirm(null);
  }, []);

  const confirmLargeRoomGeneration = React.useCallback(() => {
    const pending = largeRoomGenerationConfirm;
    if (!pending) return;
    setLargeRoomGenerationConfirm(null);
    if (pending.mode === "generate") {
      generateRooms({ skipLargeConfirm: true, skipReplaceConfirm: true });
      return;
    }
    if (pending.mode === "create") {
      saveRoomEdit({ skipLargeConfirm: true });
    }
  }, [generateRooms, largeRoomGenerationConfirm, saveRoomEdit]);

  const deleteRoom = React.useCallback((roomId) => {
    const room = rooms.find((item) => item.id === roomId);
    if (!room) return;
    setRooms((prev) => prev.filter((item) => item.id !== roomId));
    setRoomLinks((prev) => prev.filter((link) => link.sourceRoomId !== roomId && link.targetRoomId !== roomId));
    setUnassigned((prev) => [
      ...prev,
      ...(room.occupantIds || []).map((clientId) => ({ clientId, reason: "" })),
    ]);
    setSelectedRoomId((current) => current === roomId ? null : current);
    setSelectedRoomLinkId((current) => {
      const selectedLink = roomLinks.find((link) => link.id === current);
      return selectedLink && (selectedLink.sourceRoomId === roomId || selectedLink.targetRoomId === roomId) ? null : current;
    });
    markDirty();
  }, [rooms, roomLinks, markDirty]);

  const toggleRoomSelectionMode = React.useCallback(() => {
    setLinkMode(false);
    setLinkStartRoomId(null);
    setSelectedRoomLinkId(null);
    setRoomSelectionMode((active) => {
      if (active) setSelectedRoomIds(new Set());
      return !active;
    });
  }, []);

  const toggleRoomSelection = React.useCallback((roomId) => {
    setSelectedRoomIds((current) => {
      const next = new Set(current);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  }, []);

  const selectAllRooms = React.useCallback(() => {
    setRoomSelectionMode(true);
    setSelectedRoomIds(new Set(visibleRooms.map((room) => room.id)));
  }, [visibleRooms]);

  const clearRoomSelection = React.useCallback(() => {
    setSelectedRoomIds(new Set());
  }, []);

  const deleteRoomLink = React.useCallback((linkId) => {
    if (!linkId) return;
    setRoomLinks((prev) => prev.filter((link) => link.id !== linkId));
    setSelectedRoomLinkId((current) => current === linkId ? null : current);
    setRoomLinkMenu((current) => current.linkId === linkId ? { open: false, x: 0, y: 0, linkId: "" } : current);
    markDirty();
  }, [markDirty]);

  const createRoomLink = React.useCallback((sourceRoomId, targetRoomId) => {
    if (!sourceRoomId || !targetRoomId || sourceRoomId === targetRoomId) return false;
    const sourceExists = rooms.some((room) => room.id === sourceRoomId);
    const targetExists = rooms.some((room) => room.id === targetRoomId);
    if (!sourceExists || !targetExists) return false;
    const id = createRoomLinkId(sourceRoomId, targetRoomId);
    const normalized = normalizeRoomingLinks(roomLinks, rooms);
    if (normalized.some((link) => link.id === id)) {
      setSelectedRoomLinkId(id);
      return false;
    }
    setRoomLinks(normalizeRoomingLinks([...normalized, { id, sourceRoomId, targetRoomId }], rooms));
    setSelectedRoomLinkId(id);
    markDirty();
    return true;
  }, [markDirty, roomLinks, rooms]);

  const toggleRoomLinkMode = React.useCallback(() => {
    setRoomSelectionMode(false);
    setSelectedRoomIds(new Set());
    setSelectedRoomLinkId(null);
    setLinkMode((active) => {
      if (active) setLinkStartRoomId(null);
      return !active;
    });
  }, []);

  const handleRoomLinkConnect = React.useCallback((connection) => {
    if (!linkMode) return;
    createRoomLink(connection?.source, connection?.target);
    setLinkStartRoomId(null);
  }, [createRoomLink, linkMode]);

  const handleRoomLinkConnectStart = React.useCallback((_event, params) => {
    if (!linkMode) return;
    setLinkStartRoomId(params?.nodeId || null);
  }, [linkMode]);

  const handleRoomLinkConnectEnd = React.useCallback(() => {
    setLinkStartRoomId(null);
  }, []);

  const isValidRoomLinkConnection = React.useCallback((connection) => {
    if (!linkMode || !connection?.source || !connection?.target) return false;
    if (connection.source === connection.target) return false;
    const id = createRoomLinkId(connection.source, connection.target);
    return !normalizeRoomingLinks(roomLinks, rooms).some((link) => link.id === id);
  }, [linkMode, roomLinks, rooms]);

  React.useEffect(() => {
    if (!selectedRoomLinkId) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target;
      if (target?.closest?.("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      deleteRoomLink(selectedRoomLinkId);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteRoomLink, selectedRoomLinkId]);

  const deleteSelectedRooms = React.useCallback(() => {
    if (!selectedRoomIds.size) return;
    const selectedRooms = rooms.filter((room) => selectedRoomIds.has(room.id));
    if (!selectedRooms.length) return;
    const confirmed = window.confirm(
      t.roomingDeleteSelectedConfirm || "هل تريد حذف الغرف المحددة؟ لا يمكن التراجع عن هذا الإجراء بعد الحفظ."
    );
    if (!confirmed) return;
    const selectedOccupantIds = Array.from(new Set(selectedRooms.flatMap((room) => room.occupantIds || [])))
      .filter((clientId) => clientsById[clientId]);
    const remainingAssignedIds = new Set();
    rooms.forEach((room) => {
      if (selectedRoomIds.has(room.id)) return;
      (room.occupantIds || []).forEach((clientId) => remainingAssignedIds.add(clientId));
    });
    setRooms((prev) => prev.filter((room) => !selectedRoomIds.has(room.id)));
    if (selectedOccupantIds.length) {
      setUnassigned((prev) => {
        const byClientId = new Map(prev.map((item) => [item.clientId, item]));
        selectedOccupantIds.forEach((clientId) => {
          if (!remainingAssignedIds.has(clientId)) byClientId.set(clientId, { clientId, reason: "" });
        });
        return Array.from(byClientId.values());
      });
    }
    setRoomLinks((prev) => prev.filter((link) => !selectedRoomIds.has(link.sourceRoomId) && !selectedRoomIds.has(link.targetRoomId)));
    setSelectedRoomId((current) => selectedRoomIds.has(current) ? null : current);
    setSelectedRoomLinkId(null);
    setSelectedRoomIds(new Set());
    setRoomSelectionMode(false);
    markDirty();
  }, [clientsById, markDirty, rooms, selectedRoomIds, t]);

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
      ? {
        ...room,
        occupantIds: (room.occupantIds || []).filter((id) => id !== clientId),
        genderOverrides: Object.fromEntries(Object.entries(room.genderOverrides || {}).filter(([id]) => id !== clientId)),
        priceOverrides: Object.fromEntries(Object.entries(room.priceOverrides || {}).filter(([id]) => id !== clientId)),
      }
      : room));
    setUnassigned((prev) => [...prev, { clientId, reason: "" }]);
    markDirty();
  }, [markDirty]);

  const commitClientDropIntoRoom = React.useCallback((roomId, clientId, options = {}) => {
    const room = rooms.find((item) => item.id === roomId);
    if (!room) return false;
    setRooms((prev) => prev.map((item) => {
      if (item.id !== room.id) return item;
      const occupantIds = item.occupantIds || [];
      const genderAssignment = ["male", "female"].includes(options.genderAssignment) ? options.genderAssignment : "";
      const priceDecision = options.priceDecision && typeof options.priceDecision === "object" ? options.priceDecision : null;
      if (occupantIds.includes(clientId)) {
        if (!genderAssignment && !priceDecision) return item;
        return {
          ...item,
          ...(genderAssignment ? { genderOverrides: { ...(item.genderOverrides || {}), [clientId]: genderAssignment } } : {}),
          ...(priceDecision ? { priceOverrides: { ...(item.priceOverrides || {}), [clientId]: priceDecision } } : {}),
        };
      }
      return {
        ...item,
        occupantIds: [...occupantIds, clientId],
        ...(genderAssignment ? { genderOverrides: { ...(item.genderOverrides || {}), [clientId]: genderAssignment } } : {}),
        ...(priceDecision ? { priceOverrides: { ...(item.priceOverrides || {}), [clientId]: priceDecision } } : {}),
      };
    }));
    setUnassigned((prev) => prev.filter((item) => item.clientId !== clientId));
    setSelectedRoomId(room.id);
    markDirty();
    return true;
  }, [markDirty, rooms]);

  const insertClientIntoRoom = React.useCallback((roomId, clientId, notify = true, options = {}) => {
    const room = rooms.find((item) => item.id === roomId);
    const client = clientsById[clientId];
    if (!room || !client) return false;
    const reason = getCompatibilityReason(client, room);
    if (reason) {
      if (notify) onToast?.(reason, "error");
      return false;
    }
    const conflict = getRoomingDropConflicts(client, room);
    if (conflict && !options.confirmed) {
      setPendingDrop(conflict);
      return false;
    }
    return commitClientDropIntoRoom(roomId, clientId, options);
  }, [rooms, clientsById, getCompatibilityReason, getRoomingDropConflicts, commitClientDropIntoRoom, onToast]);

  const insertClientsIntoRoom = React.useCallback((roomId, clientIds = [], notify = true) => {
    const room = rooms.find((item) => item.id === roomId);
    if (!room) return false;
    const uniqueIds = Array.from(new Set(clientIds))
      .filter((clientId) => clientsById[clientId] && !clientIdsInRooms.has(clientId));
    if (!uniqueIds.length) return false;
    if (uniqueIds.length === 1) return insertClientIntoRoom(roomId, uniqueIds[0], notify);

    const capacity = Math.max(1, Number(room.capacity) || getRoomingCapacity(room.roomType));
    const occupantIds = room.occupantIds || [];
    const remaining = Math.max(0, capacity - occupantIds.length);
    if (uniqueIds.length > remaining) {
      if (notify) onToast?.(unassignedSelectionLabels.capacity, "error");
      return false;
    }

    const classificationMismatch = uniqueIds.some((clientId) => {
      const gender = normalizeRoomingGender(getClientContext(clientsById[clientId]).gender);
      return (room.category === "male_only" && gender === "female")
        || (room.category === "female_only" && gender === "male");
    });
    if (classificationMismatch) {
      if (notify) onToast?.(unassignedSelectionLabels.classification, "error");
      return false;
    }

    const firstReason = uniqueIds
      .map((clientId) => getCompatibilityReason(clientsById[clientId], room))
      .find(Boolean);
    if (firstReason) {
      if (notify) onToast?.(firstReason, "error");
      return false;
    }

    const needsSingleReview = uniqueIds.some((clientId) => getRoomingDropConflicts(clientsById[clientId], room));
    if (needsSingleReview) {
      if (notify) onToast?.(unassignedSelectionLabels.conflict, "error");
      return false;
    }

    setRooms((prev) => prev.map((item) => item.id === room.id
      ? { ...item, occupantIds: [...(item.occupantIds || []), ...uniqueIds] }
      : item));
    setUnassigned((prev) => prev.filter((item) => !uniqueIds.includes(item.clientId)));
    setSelectedRoomId(room.id);
    clearSelectedUnassigned();
    markDirty();
    if (notify) onToast?.(unassignedSelectionLabels.success, "success");
    return true;
  }, [
    clearSelectedUnassigned,
    clientIdsInRooms,
    clientsById,
    getCompatibilityReason,
    getClientContext,
    getRoomingDropConflicts,
    insertClientIntoRoom,
    markDirty,
    onToast,
    rooms,
    unassignedSelectionLabels,
  ]);

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
    const firstConflict = selected
      .map((clientId) => getRoomingDropConflicts(clientsById[clientId], room))
      .find(Boolean);
    if (firstConflict) {
      setPendingDrop({ ...firstConflict, source: "picker" });
      return;
    }
    setRooms((prev) => prev.map((item) => item.id === room.id
      ? { ...item, occupantIds: [...(item.occupantIds || []), ...selected] }
      : item));
    setUnassigned((prev) => prev.filter((item) => !selected.includes(item.clientId)));
    setSelectedRoomId(room.id);
    markDirty();
    setSelectedPilgrimIds([]);
    setPickerSearch("");
    setPickerOpen(false);
  }, [rooms, selectedRoomId, selectedPilgrimIds, clientsById, getCompatibilityReason, getRoomingDropConflicts, markDirty, onToast, t.noCompatiblePilgrims]);

  const autoArrangeRooms = React.useCallback(() => {
    if (rooms.length && !window.confirm(t.roomingAutoArrangeConfirm || "سيتم إعادة ترتيب الغرف تلقائيًا. هل تريد المتابعة؟")) return;
    setRooms((prev) => autoLayoutRoomNodes(prev));
    markDirty();
    window.requestAnimationFrame(() => flowRef.current?.fitView?.({ padding: 0.18, duration: 400 }));
  }, [rooms.length, markDirty]);

  const openPickerForRoom = React.useCallback((roomId) => {
    setSelectedRoomId(roomId);
    setSelectedPilgrimIds([]);
    setPickerSearch("");
    setPickerOpen(true);
  }, []);

  const openEditRoomById = React.useCallback((roomId) => {
    const room = rooms.find((item) => item.id === roomId);
    if (room) openEditRoom(room);
  }, [rooms, openEditRoom]);

  const clearRoomingDragState = React.useCallback(() => {
    setDraggingClientId(null);
    setHoveredDropRoomId(null);
    clientDragPointerRef.current = null;
    if (clientDragPanFrameRef.current) {
      window.cancelAnimationFrame(clientDragPanFrameRef.current);
      clientDragPanFrameRef.current = 0;
    }
  }, []);

  const enterRoomingDropHover = React.useCallback((roomId) => {
    setHoveredDropRoomId((current) => current === roomId ? current : roomId);
  }, []);

  const leaveRoomingDropHover = React.useCallback((roomId) => {
    setHoveredDropRoomId((current) => current === roomId ? null : current);
  }, []);

  const getRoomingDropVisualStatus = React.useCallback((client, room) => {
    if (!client || !room) return null;
    const fullMessage = lang === "fr" ? "Chambre complète" : lang === "en" ? "Room is full" : "الغرفة ممتلئة";
    const occupantIds = Array.isArray(room.occupantIds) ? room.occupantIds : [];
    const roomType = normalizeRoomingRoomType(room.roomType) || getRoomingRoomTypeFromCapacity(room.capacity);
    const capacity = Math.max(1, Number(room.capacity) || getRoomingCapacity(roomType));
    if (occupantIds.length >= capacity) return { state: "full", message: fullMessage };

    const clientGender = normalizeRoomingGender(client.gender);
    const occupantGenders = occupantIds
      .map((clientId) => normalizeRoomingGender(clientsById[clientId]?.gender))
      .filter((gender) => gender === "male" || gender === "female");
    const hasOppositeGender = ["male", "female"].includes(clientGender)
      && occupantGenders.some((gender) => gender !== clientGender);
    if (hasOppositeGender) {
      return { state: "invalid", message: t.roomingGenderMismatch || "الجنس غير متوافق" };
    }

    const hardReason = getCompatibilityReason(client, room);
    if (hardReason) return { state: "invalid", message: hardReason };

    const conflict = getRoomingDropConflicts(client, room);
    if (conflict) {
      return {
        state: "mismatch",
        message: t.roomingDropNeedsConfirmation || "سيتم طلب تأكيد لتحديث بيانات المعتمر",
      };
    }

    const context = getClientContext(client);
    const targetHotel = isMissingRoomingValue(room.hotel) ? "" : String(room.hotel).trim();
    const currentHotel = isMissingRoomingValue(context.hotel) ? "" : String(context.hotel).trim();
    if (targetHotel && currentHotel && normalizeRoomingHotel(targetHotel) !== normalizeRoomingHotel(currentHotel)) {
      return {
        state: "mismatch",
        message: t.roomingDropNeedsConfirmation || "سيتم طلب تأكيد لتحديث بيانات المعتمر",
      };
    }

    const clientLevel = normalizeRoomingText(client.packageLevel || client.hotelLevel || client.hotel_level || "");
    const roomPackage = findRoomingPackageFromRoom(room, packages, city);
    const roomLevel = normalizeRoomingText(roomPackage?.level || room.packageLevel || room.hotelLevel || room.level || room.levelName || "");
    if (clientLevel && roomLevel && clientLevel !== roomLevel) {
      return {
        state: "mismatch",
        message: t.roomingDropNeedsConfirmation || "سيتم طلب تأكيد لتحديث بيانات المعتمر",
      };
    }

    return { state: "match", message: t.canInsertPilgrimHere || "يمكن إدراج المعتمر هنا" };
  }, [city, clientsById, getClientContext, getCompatibilityReason, getRoomingDropConflicts, lang, packages, t]);

  const roomFlowNodes = React.useMemo(() => visibleRooms.map((room) => ({
    id: room.id,
    type: "room",
    position: { x: Number(room.x) || 0, y: Number(room.y) || 0 },
    data: {
      room,
      clientsById,
      draggingClientId,
      draggingClient: draggingClientId ? clientsById[draggingClientId] : null,
      hoveredDropRoomId,
      dragInvalid: false,
      getDropReason: getCompatibilityReason,
      getDropVisualStatus: getRoomingDropVisualStatus,
      onDropClient: insertClientIntoRoom,
      onDropClients: insertClientsIntoRoom,
      onDragComplete: clearRoomingDragState,
      onDropHoverEnter: enterRoomingDropHover,
      onDropHoverLeave: leaveRoomingDropHover,
      onAdd: openPickerForRoom,
      onEdit: openEditRoomById,
      onCopy: copyRoom,
      onToggleLock: toggleRoomLock,
      onDelete: deleteRoom,
      onRemoveClient: removeClientFromRoom,
      selectionMode: roomSelectionMode,
      selectionChecked: selectedRoomIds.has(room.id),
      linkMode,
      linkActive: linkStartRoomId === room.id,
    },
    draggable: !room.locked && !roomSelectionMode,
    selected: room.id === selectedRoomId,
  })), [visibleRooms, clientsById, draggingClientId, hoveredDropRoomId, getCompatibilityReason, getRoomingDropVisualStatus, insertClientIntoRoom, insertClientsIntoRoom, clearRoomingDragState, enterRoomingDropHover, leaveRoomingDropHover, openPickerForRoom, openEditRoomById, copyRoom, toggleRoomLock, deleteRoom, removeClientFromRoom, roomSelectionMode, selectedRoomIds, linkMode, linkStartRoomId, selectedRoomId]);

  const roomLinkDeleteLabel = t.roomingDeleteLink || (lang === "fr" ? "Supprimer le lien" : lang === "en" ? "Delete link" : "حذف الرابط");
  const roomFlowEdges = React.useMemo(() => {
    const visibleIds = new Set(visibleRooms.map((room) => room.id));
    return normalizeRoomingLinks(roomLinks, visibleRooms)
      .filter((link) => visibleIds.has(link.sourceRoomId) && visibleIds.has(link.targetRoomId))
      .map((link) => {
        const selected = selectedRoomLinkId === link.id;
        return {
          id: link.id,
          source: link.sourceRoomId,
          target: link.targetRoomId,
          type: "roomProximity",
          selectable: true,
          focusable: true,
          interactionWidth: 18,
          data: {
            linkId: link.id,
            selected,
            deleteLabel: roomLinkDeleteLabel,
            onDelete: deleteRoomLink,
          },
          style: {
            stroke: selected ? "var(--rooming-link-selected)" : "var(--rooming-link-line)",
            strokeWidth: selected ? 2.6 : 1.6,
          },
        };
      });
  }, [deleteRoomLink, roomLinkDeleteLabel, roomLinks, selectedRoomLinkId, visibleRooms]);

  const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState([]);

  React.useEffect(() => {
    if (roomDragActiveRef.current) return;
    setFlowNodes(roomFlowNodes);
  }, [roomFlowNodes, setFlowNodes]);

  React.useEffect(() => {
    flowNodesRef.current = flowNodes;
  }, [flowNodes]);

  React.useEffect(() => {
    const pending = generatedRoomFitPendingRef.current;
    if (!pending || !flowNodes.length || roomDragActiveRef.current) return undefined;
    generatedRoomFitPendingRef.current = null;

    let cancelled = false;
    let frameId = 0;
    const fitGeneratedRooms = (attempt = 0) => {
      if (cancelled) return;
      const flow = flowRef.current;
      if (flow?.fitView) {
        flow.fitView({ padding: 0.16, duration: 450 });
        return;
      }
      if (attempt < 6) {
        frameId = window.requestAnimationFrame(() => fitGeneratedRooms(attempt + 1));
      }
    };

    frameId = window.requestAnimationFrame(() => fitGeneratedRooms());
    return () => {
      cancelled = true;
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [flowNodes]);

  React.useEffect(() => {
    if (!selectedRoomId) return;
    if (!visibleRooms.some((room) => room.id === selectedRoomId)) {
      setSelectedRoomId(null);
    }
  }, [selectedRoomId, visibleRooms]);

  React.useEffect(() => {
    if (!draggingClientId) {
      clientDragPointerRef.current = null;
      if (clientDragPanFrameRef.current) {
        window.cancelAnimationFrame(clientDragPanFrameRef.current);
        clientDragPanFrameRef.current = 0;
      }
      return undefined;
    }

    const getPanSpeed = (distanceToEdge) => {
      const ratio = Math.min(1, Math.max(0, (ROOMING_CLIENT_DRAG_PAN_EDGE - distanceToEdge) / ROOMING_CLIENT_DRAG_PAN_EDGE));
      if (ratio <= 0) return 0;
      return ROOMING_CLIENT_DRAG_PAN_MIN_SPEED
        + (ROOMING_CLIENT_DRAG_PAN_MAX_SPEED - ROOMING_CLIENT_DRAG_PAN_MIN_SPEED) * ratio * ratio;
    };

    const panLoop = () => {
      clientDragPanFrameRef.current = window.requestAnimationFrame(panLoop);
      const pointer = clientDragPointerRef.current;
      const flow = flowRef.current;
      if (!pointer || !flow?.getViewport || !flow?.setViewport) return;
      const canvas = document.querySelector(".rooming-flow-canvas");
      const rect = canvas?.getBoundingClientRect?.();
      if (!rect || rect.width <= 0 || rect.height <= 0) return;

      let dx = 0;
      let dy = 0;
      if (pointer.x - rect.left < ROOMING_CLIENT_DRAG_PAN_EDGE) {
        dx = getPanSpeed(pointer.x - rect.left);
      } else if (rect.right - pointer.x < ROOMING_CLIENT_DRAG_PAN_EDGE) {
        dx = -getPanSpeed(rect.right - pointer.x);
      }
      if (pointer.y - rect.top < ROOMING_CLIENT_DRAG_PAN_EDGE) {
        dy = getPanSpeed(pointer.y - rect.top);
      } else if (rect.bottom - pointer.y < ROOMING_CLIENT_DRAG_PAN_EDGE) {
        dy = -getPanSpeed(rect.bottom - pointer.y);
      }
      if (!dx && !dy) return;
      const viewport = flow.getViewport();
      flow.setViewport({ x: viewport.x + dx, y: viewport.y + dy, zoom: viewport.zoom });
    };

    const handleDragOver = (event) => {
      if (!event.clientX && !event.clientY) return;
      clientDragPointerRef.current = { x: event.clientX, y: event.clientY };
    };
    const handleDragEnd = () => clearRoomingDragState();
    const handleDrop = () => {
      clientDragPointerRef.current = null;
      if (clientDragPanFrameRef.current) {
        window.cancelAnimationFrame(clientDragPanFrameRef.current);
        clientDragPanFrameRef.current = 0;
      }
    };
    const handleWheel = (event) => {
      const flow = flowRef.current;
      if (!flow?.getViewport || !flow?.setViewport) return;
      const canvas = document.querySelector(".rooming-flow-canvas");
      const rect = canvas?.getBoundingClientRect?.();
      if (!rect || rect.width <= 0 || rect.height <= 0) return;
      const fallbackPoint = clientDragPointerRef.current;
      const point = event.clientX || event.clientY
        ? { x: event.clientX, y: event.clientY }
        : fallbackPoint;
      if (!point) return;
      const insideCanvas = point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
      if (!insideCanvas) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      clientDragPointerRef.current = point;

      const unit = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? rect.height : 1;
      let panX = event.deltaX * unit;
      let panY = event.deltaY * unit;
      if (event.shiftKey && Math.abs(panX) < 0.5) {
        panX = panY;
        panY = 0;
      }
      const limitDelta = (value) => Math.max(-180, Math.min(180, value));
      const viewport = flow.getViewport();
      flow.setViewport({
        x: viewport.x - limitDelta(panX),
        y: viewport.y - limitDelta(panY),
        zoom: viewport.zoom,
      });
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragend", handleDragEnd);
    window.addEventListener("drop", handleDrop);
    window.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    clientDragPanFrameRef.current = window.requestAnimationFrame(panLoop);

    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragend", handleDragEnd);
      window.removeEventListener("drop", handleDrop);
      window.removeEventListener("wheel", handleWheel, { capture: true });
      if (clientDragPanFrameRef.current) {
        window.cancelAnimationFrame(clientDragPanFrameRef.current);
        clientDragPanFrameRef.current = 0;
      }
      clientDragPointerRef.current = null;
    };
  }, [clearRoomingDragState, draggingClientId]);

  React.useEffect(() => {
    setSelectedRoomIds((current) => {
      if (!current.size) return current;
      const roomIds = new Set(rooms.map((room) => room.id));
      const next = new Set(Array.from(current).filter((roomId) => roomIds.has(roomId)));
      return next.size === current.size ? current : next;
    });
  }, [rooms]);

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
    const menuPoint = clampRoomingContextMenuPoint(event.clientX, event.clientY);
    const position = flowRef.current?.screenToFlowPosition
      ? flowRef.current.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      : { x: 0, y: 0 };
    setCanvasMenu({
      open: true,
      x: menuPoint.x,
      y: menuPoint.y,
      position,
    });
  }, []);

  const closeCanvasContextMenu = React.useCallback(() => {
    setCanvasMenu((current) => ({ ...current, open: false }));
  }, []);

  const handleRoomLinkClick = React.useCallback((event, edge) => {
    event.stopPropagation();
    setSelectedRoomLinkId(edge?.data?.linkId || edge?.id || "");
    setRoomLinkMenu({ open: false, x: 0, y: 0, linkId: "" });
  }, []);

  const handleRoomLinkContextMenu = React.useCallback((event, edge) => {
    event.preventDefault();
    event.stopPropagation();
    const linkId = edge?.data?.linkId || edge?.id || "";
    if (!linkId) return;
    const menuPoint = clampRoomingContextMenuPoint(event.clientX, event.clientY);
    setSelectedRoomLinkId(linkId);
    setRoomLinkMenu({ open: true, x: menuPoint.x, y: menuPoint.y, linkId });
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

  const resolveAgencyLogoUrlForRooming = React.useCallback(async () => {
    const directUrl = agency?.logoUrl || agency?.logo_url || "";
    if (directUrl) return directUrl;
    const logoPath = agency?.logoPath || agency?.logo_path || "";
    if (!logoPath || !agencyLogoApi?.isAvailable || !agencyLogoApi.getLogoUrl) return "";
    try {
      return await agencyLogoApi.getLogoUrl(logoPath) || "";
    } catch {
      return "";
    }
  }, [agency?.logoPath, agency?.logoUrl, agency?.logo_path, agency?.logo_url, agencyLogoApi]);

  const printCanvas = React.useCallback(async () => {
    const cityLabel = city === "makkah" ? (t.makkah || "مكة") : (t.madinah || "المدينة");
    const win = window.open("", "_blank");
    if (!win) return;
    const agencyName = agency?.nameAr || agency?.nameFr || t.agencyName || "";
    const agencyLogoUrl = await resolveAgencyLogoUrlForRooming();
    const printRooms = rooms.map((room, index) => {
      const occupantIds = Array.isArray(room.occupantIds) ? room.occupantIds : [];
      const pilgrims = occupantIds
        .map((clientId) => clientsById[clientId])
        .filter(Boolean)
        .map((client) => ({
          name: getClientDisplayName(client),
          source: getClientRegistrationSource(client),
        }));
      const roomTypeKey = normalizeRoomingRoomType(room.roomType) || room.roomType || "other";
      return {
        id: room.id,
        city,
        cityLabel,
        hotel: room.hotel || (t.roomingMissingHotel || "فندق غير محدد"),
        checkIn: program.departure || "",
        checkOut: program.returnDate || "",
        roomTypeKey,
        roomTypeLabel: getLocalizedRoomTypeLabel(roomTypeKey),
        capacity: Math.max(1, Number(room.capacity) || getRoomingCapacity(roomTypeKey), pilgrims.length || 1),
        pilgrims,
        names: pilgrims.map((pilgrim) => pilgrim.name),
        order: Number(room.order ?? index),
        x: Number(room.x) || 0,
        y: Number(room.y) || 0,
      };
    });
    win.document.write(createRoomingPrintHtml({
      rooms: printRooms,
      roomLinks,
      lang,
      programName: program.name || "",
      agencyName,
      agencyLogoUrl,
      printSettings: roomingPrintSettings,
      labels: {
        rooming: t.roomingPrintTitle || "ورقة التسكين",
        checkIn: t.checkIn || (lang === "fr" ? "Arrivée" : lang === "en" ? "Check-in" : "الدخول"),
        checkOut: t.checkOut || (lang === "fr" ? "Départ" : lang === "en" ? "Check-out" : "الخروج"),
        roomsCount: t.roomingRoomsCount || (lang === "fr" ? "Chambres" : lang === "en" ? "Rooms" : "عدد الغرف"),
        unknownHotel: t.roomingMissingHotel || (lang === "fr" ? "Hôtel non défini" : lang === "en" ? "Unspecified hotel" : "فندق غير محدد"),
        noRooms: t.noRoomingRooms || (lang === "fr" ? "Aucune chambre d'hébergement." : lang === "en" ? "No rooming rooms." : "لا توجد غرف للتسكين."),
        otherRoomType: t.other || (lang === "fr" ? "Autre" : lang === "en" ? "Other" : "أخرى"),
      },
    }));
    win.document.close();
  }, [rooms, roomLinks, clientsById, program, city, agency, lang, t, getLocalizedRoomTypeLabel, roomingPrintSettings, resolveAgencyLogoUrlForRooming]);

  const getStoredCanvasRooms = React.useCallback((targetCity) => {
    if (targetCity === city) return rooms;
    return sanitizeRoomingStateForEligibleClients(readCanvasStateFromStorage(targetCity), roomingEligibleClientIds).rooms;
  }, [city, rooms, readCanvasStateFromStorage, roomingEligibleClientIds]);

  const getStoredCanvasLinks = React.useCallback((targetCity) => {
    const stored = targetCity === city
      ? { rooms, roomLinks }
      : sanitizeRoomingStateForEligibleClients(readCanvasStateFromStorage(targetCity), roomingEligibleClientIds);
    const cityRooms = stored.rooms;
    const cityLinks = stored.roomLinks;
    return normalizeRoomingLinks(cityLinks, cityRooms);
  }, [city, rooms, roomLinks, readCanvasStateFromStorage, roomingEligibleClientIds]);

  const getRoomingStayDates = React.useCallback((targetCity, room) => {
    const firstClient = (room.occupantIds || []).map((id) => clientsById[id]).find(Boolean);
    const pkgLevel = firstClient?.packageLevel || firstClient?.hotelLevel || "";
    const pkg = firstClient
      ? (packageById.get(firstClient.packageId || firstClient.package_id) || packageByLevel.get(pkgLevel))
      : null;
    const explicitDates = targetCity === "makkah"
      ? {
        checkIn: pickFirstText(program, ["makkahCheckin", "makkah_checkin", "meccaCheckin", "mecca_checkin"]),
        checkOut: pickFirstText(program, ["makkahCheckout", "makkah_checkout", "meccaCheckout", "mecca_checkout"]),
      }
      : {
        checkIn: pickFirstText(program, ["madinahCheckin", "madinah_checkin", "madinaCheckin", "madina_checkin", "medinaCheckin", "medina_checkin"]),
        checkOut: pickFirstText(program, ["madinahCheckout", "madinah_checkout", "madinaCheckout", "madina_checkout", "medinaCheckout", "medina_checkout"]),
      };
    if (explicitDates.checkIn || explicitDates.checkOut) return explicitDates;
    const stayDates = calculateHotelStayDates({
      departureDate: program.departure,
      returnDate: program.returnDate,
      visitOrder: program.visitOrder || program.visit_order,
      hotelCheckinDay: program.hotelCheckinDay || program.hotel_checkin_day,
      madinahNights: pkg?.madinahNights ?? program.madinahNights ?? program.madinah_nights,
    });
    return targetCity === "makkah"
      ? { checkIn: stayDates.makkahCheckIn, checkOut: stayDates.makkahCheckOut }
      : { checkIn: stayDates.medinaCheckIn, checkOut: stayDates.medinaCheckOut };
  }, [clientsById, packageById, packageByLevel, program]);

  const getRoomingHotelForCity = React.useCallback((targetCity, cityRooms = []) => {
    const fallbackHotel = targetCity === "makkah"
      ? (program.hotelMecca || program.hotel_mecca || "")
      : (program.hotelMadina || program.hotel_madina || "");
    return cityRooms.find((room) => String(room.hotel || "").trim())?.hotel || fallbackHotel || "";
  }, [program]);

  const buildRoomingPdfRows = React.useCallback((targetCities = [city]) => {
    const cityLabels = {
      makkah: t.makkah || "مكة",
      madinah: t.madinah || "المدينة",
    };
    return targetCities.flatMap((targetCity) => {
      const cityRooms = getStoredCanvasRooms(targetCity);
      const fallbackHotel = getRoomingHotelForCity(targetCity, cityRooms);
      return cityRooms.map((room, index) => {
        const occupantIds = Array.isArray(room.occupantIds) ? room.occupantIds : [];
        const pilgrims = occupantIds
          .map((clientId) => clientsById[clientId])
          .filter(Boolean)
          .map((client) => ({
            name: getClientDisplayName(client),
            source: getClientRegistrationSource(client),
          }));
        const names = pilgrims.map((pilgrim) => pilgrim.name);
        const roomTypeKey = normalizeRoomingRoomType(room.roomType) || room.roomType || "other";
        const capacity = Math.max(1, Number(room.capacity) || getRoomingCapacity(roomTypeKey), names.length || 1);
        const stayDates = getRoomingStayDates(targetCity, room);
        return {
          id: room.id,
          city: targetCity,
          cityLabel: cityLabels[targetCity],
          hotel: room.hotel || fallbackHotel || (t.roomingMissingHotel || "فندق غير محدد"),
          checkIn: stayDates.checkIn,
          checkOut: stayDates.checkOut,
          roomTypeKey,
          roomTypeLabel: getLocalizedRoomTypeLabel(roomTypeKey),
          capacity,
          pilgrims,
          names,
          order: Number(room.order ?? index),
          x: Number(room.x) || 0,
          y: Number(room.y) || 0,
        };
      });
    });
  }, [city, clientsById, getLocalizedRoomTypeLabel, getRoomingHotelForCity, getRoomingStayDates, getStoredCanvasRooms, t]);

  const handleDownloadRoomingPdf = React.useCallback(async (mode = "single") => {
    if (roomingPdfBusy) return;
    try {
      setRoomingPdfBusy(mode);
      const combined = mode === "combined";
      const targetCities = combined ? ["makkah", "madinah"] : [city];
      const pdfRooms = buildRoomingPdfRows(targetCities);
      const pdfRoomLinks = targetCities.flatMap((targetCity) => getStoredCanvasLinks(targetCity));
      const makkahRooms = combined ? getStoredCanvasRooms("makkah") : [];
      const madinahRooms = combined ? getStoredCanvasRooms("madinah") : [];
      const makkahHotel = getRoomingHotelForCity("makkah", makkahRooms);
      const madinahHotel = getRoomingHotelForCity("madinah", madinahRooms);
      const makkahDates = getRoomingStayDates("makkah", { occupantIds: makkahRooms[0]?.occupantIds || [] });
      const madinahDates = getRoomingStayDates("madinah", { occupantIds: madinahRooms[0]?.occupantIds || [] });
      const agencyLogoUrl = await resolveAgencyLogoUrlForRooming();
      const sharedLabels = {
        checkIn: t.checkIn || (lang === "fr" ? "Arrivée" : lang === "en" ? "Check-in" : "الدخول"),
        checkOut: t.checkOut || (lang === "fr" ? "Départ" : lang === "en" ? "Check-out" : "الخروج"),
        roomsCount: t.roomingRoomsCount || (lang === "fr" ? "Chambres" : lang === "en" ? "Rooms" : "عدد الغرف"),
        unknownHotel: t.roomingMissingHotel || (lang === "fr" ? "Hôtel non défini" : lang === "en" ? "Unspecified hotel" : "فندق غير محدد"),
        noRooms: t.noRoomingRooms || (lang === "fr" ? "Aucune chambre d'hébergement." : lang === "en" ? "No rooming rooms." : "لا توجد غرف للتسكين."),
        otherRoomType: t.other || (lang === "fr" ? "Autre" : lang === "en" ? "Other" : "أخرى"),
        generatedAt: new Date().toLocaleDateString(lang === "ar" ? "ar-MA" : lang === "fr" ? "fr-FR" : "en-US"),
        makkah: t.makkah || "مكة",
        madinah: t.madinah || "المدينة",
      };
      await downloadRoomingPdf({
        rooms: pdfRooms,
        lang,
        programName: program.name || "program",
        agencyName: agency?.nameAr || agency?.nameFr || agency?.name || "",
        agencyLogoUrl,
        filename: `rooming-${combined ? "combined" : city}-${slugifyFilePart(program.name)}-${new Date().toISOString().slice(0, 10)}.pdf`,
        labels: sharedLabels,
        printSettings: roomingPrintSettings,
        roomLinks: pdfRoomLinks,
        sectionOverride: combined ? createCombinedRoomingSection({
          rooms: pdfRooms,
          makkahHotel,
          madinahHotel,
          makkahDates,
          madinahDates,
          labels: sharedLabels,
        }) : null,
      });
      onToast?.(t.roomingPdfReady || (lang === "fr" ? "PDF d'hébergement téléchargé" : lang === "en" ? "Rooming PDF downloaded" : "تم تنزيل PDF التسكين"), "success");
    } catch (error) {
      console.error("[rooming pdf export]", error);
      onToast?.(t.roomingPdfFailed || (lang === "fr" ? "Impossible de générer le PDF" : lang === "en" ? "Unable to generate PDF" : "تعذر إنشاء ملف PDF"), "error");
    } finally {
      setRoomingPdfBusy("");
    }
  }, [agency, buildRoomingPdfRows, city, getRoomingHotelForCity, getRoomingStayDates, getStoredCanvasLinks, getStoredCanvasRooms, lang, onToast, program.name, resolveAgencyLogoUrlForRooming, roomingPdfBusy, roomingPrintSettings, t]);

  const selectedRoom = visibleRooms.find((room) => room.id === selectedRoomId) || null;
  const canvasHeight = fullWorkspace ? "100%" : "min(72vh, 720px)";
  const fullWorkspacePanelTop = toolbarCollapsed ? 106 : "calc(58px + 22vh + 18px)";
  const expandRoomingLabel = t.roomingExpandWorkspace || (lang === "fr" ? "Agrandir le rooming dans l’application" : lang === "en" ? "Expand rooming in app" : "توسيع التسكين داخل النظام");
  const browserFullscreenLabel = t.roomingBrowserFullscreen || (lang === "fr" ? "Plein écran" : lang === "en" ? "Full screen" : "فتح بملء الشاشة");
  const exitFullWorkspaceLabel = t.roomingExitFullWorkspace || (lang === "fr" ? "Quitter le mode rooming plein écran" : lang === "en" ? "Exit full rooming mode" : "الخروج من وضع التسكين الكامل");
  const hideUnassignedLabel = t.roomingHideUnassigned || (lang === "fr" ? "Masquer les non affectés" : lang === "en" ? "Hide unassigned" : "إخفاء غير المسكنين");
  const showUnassignedLabel = t.roomingShowUnassigned || (lang === "fr" ? "Afficher les non affectés" : lang === "en" ? "Show unassigned" : "إظهار غير المسكنين");
  React.useEffect(() => {
    if (!pendingDrop?.priceSync?.requiresConfirmation) {
      setPendingDropSalePrice("");
      return;
    }
    setPendingDropSalePrice(String(pendingDrop.priceSync.newOfficialPrice || ""));
  }, [pendingDrop]);
  const pendingDropCopy = React.useMemo(() => {
    if (!pendingDrop) return null;
    const hasRoomType = pendingDrop.conflicts.includes("roomType");
    const hasHotel = pendingDrop.conflicts.includes("hotel");
    const hasGenderAssignment = pendingDrop.conflicts.includes("genderAssignment");
    const hasFamilyMixed = pendingDrop.conflicts.includes("familyMixed");
    const hasPrice = pendingDrop.conflicts.includes("price") && pendingDrop.priceSync?.requiresConfirmation;
    const conflictCity = pendingDrop.city || city;
    const hotelLabel = conflictCity === "madinah" ? (t.hotelMadina || "فندق المدينة") : (t.hotelMecca || "فندق مكة");
    const genderTarget = pendingDrop.genderAssignment === "female"
      ? (lang === "fr" ? "femme" : lang === "en" ? "female" : "أنثى")
      : (lang === "fr" ? "homme" : lang === "en" ? "male" : "ذكر");
    const formatPriceLabel = (value) => formatCurrency(value || 0, lang);
    const priceSection = hasPrice ? {
      newOfficialLabel: lang === "fr" ? "Nouveau prix officiel" : lang === "en" ? "New official price" : "السعر الرسمي الجديد",
      newSaleLabel: lang === "fr" ? "Nouveau prix de vente" : lang === "en" ? "New sale price" : "سعر البيع الجديد",
      oldOfficialLabel: lang === "fr" ? "Ancien prix officiel" : lang === "en" ? "Previous official price" : "السعر الرسمي السابق",
      oldSaleLabel: lang === "fr" ? "Ancien prix de vente" : lang === "en" ? "Previous sale price" : "سعر البيع السابق",
      keepPrevious: lang === "fr" ? "Garder l’ancien prix de vente" : lang === "en" ? "Keep previous sale price" : "الإبقاء على سعر البيع السابق",
      intro: lang === "fr"
        ? "Le type de chambre a été modifié, et le prix de vente actuel est différent de l’ancien prix officiel."
        : lang === "en"
          ? "The room type has changed, and the current sale price is different from the previous official price."
          : "تم تغيير نوع الغرفة، وسعر البيع الحالي مختلف عن السعر الرسمي السابق.",
      newOfficialPrice: pendingDrop.priceSync.newOfficialPrice,
      oldOfficialPrice: pendingDrop.priceSync.oldOfficialPrice,
      oldSalePrice: pendingDrop.priceSync.oldSalePrice,
      formatPrice: formatPriceLabel,
    } : null;
    const conflictCount = [hasRoomType, hasHotel, hasGenderAssignment, hasFamilyMixed, hasPrice].filter(Boolean).length;
    const makeDetails = (labels) => [
      ...(hasRoomType ? [{ currentLabel: labels.roomCurrent, currentValue: pendingDrop.currentRoomTypeLabel || "—", targetLabel: labels.roomTarget, targetValue: pendingDrop.targetRoomTypeLabel || "—" }] : []),
      ...(hasHotel ? [{ currentLabel: labels.hotelCurrent, currentValue: pendingDrop.currentHotel || "—", targetLabel: labels.hotelTarget, targetValue: pendingDrop.targetHotel || "—" }] : []),
      ...(hasGenderAssignment ? [{ currentLabel: labels.genderCurrent, currentValue: labels.unknownGender, targetLabel: labels.genderTarget, targetValue: genderTarget }] : []),
      ...(hasFamilyMixed ? [{ note: labels.familyNote }] : []),
    ];
    if (conflictCount > 1) {
      if (lang === "fr") return {
        title: "Mettre à jour les informations de répartition ?",
        intro: "Certaines informations sont différentes entre le dossier du pèlerin et la chambre choisie :",
        details: makeDetails({
          roomCurrent: "Type de chambre actuel",
          roomTarget: "Nouveau type de chambre",
          hotelCurrent: "Hôtel actuel",
          hotelTarget: "Nouvel hôtel",
          genderCurrent: "Sexe actuel",
          genderTarget: "Nouveau sexe",
          unknownGender: "Non défini",
          familyNote: "La chambre familiale peut inclure des hommes et des femmes.",
        }),
        question: "Voulez-vous mettre à jour ces informations et ajouter le pèlerin à cette chambre ?",
        primary: "Mettre à jour et ajouter",
        priceSection,
      };
      if (lang === "en") return {
        title: "Update rooming details?",
        intro: "Some details differ between the pilgrim file and the selected room:",
        details: makeDetails({
          roomCurrent: "Current room type",
          roomTarget: "New room type",
          hotelCurrent: "Current hotel",
          hotelTarget: "New hotel",
          genderCurrent: "Current gender",
          genderTarget: "New gender",
          unknownGender: "Not set",
          familyNote: "The family room may include both men and women.",
        }),
        question: "Do you want to update these details and add the pilgrim to this room?",
        primary: "Update and add",
        priceSection,
      };
      return {
        title: "تحديث بيانات التسكين؟",
        intro: "توجد معلومات مختلفة بين ملف المعتمر والغرفة المختارة:",
        details: makeDetails({
          roomCurrent: "نوع الغرفة الحالي",
          roomTarget: "نوع الغرفة الجديد",
          hotelCurrent: "الفندق الحالي",
          hotelTarget: "الفندق الجديد",
          genderCurrent: "الجنس الحالي",
          genderTarget: "الجنس الجديد",
          unknownGender: "غير محدد",
          familyNote: "الغرفة العائلية يمكن أن تضم رجالًا ونساءً.",
        }),
        question: "هل تريد تحديث هذه البيانات وإضافة المعتمر إلى الغرفة؟",
        primary: "تحديث وإضافة",
        priceSection,
      };
    }
    if (hasPrice) {
      if (lang === "fr") return {
        title: "Mettre à jour le prix de vente ?",
        intro: priceSection.intro,
        question: "Voulez-vous mettre à jour le prix et ajouter ce pèlerin à cette chambre ?",
        primary: "Mettre à jour et ajouter",
        priceSection,
      };
      if (lang === "en") return {
        title: "Update sale price?",
        intro: priceSection.intro,
        question: "Do you want to update the price and add them to this room?",
        primary: "Update and add",
        priceSection,
      };
      return {
        title: "تحديث سعر البيع؟",
        intro: priceSection.intro,
        question: "هل تريد تحديث السعر وإضافة المعتمر إلى هذه الغرفة؟",
        primary: "تحديث وإضافة",
        priceSection,
      };
    }
    if (hasRoomType) {
      if (lang === "fr") return {
        title: "Mettre à jour le type de chambre ?",
        intro: `Ce pèlerin est actuellement défini en ${pendingDrop.currentRoomTypeLabel}, mais la chambre sélectionnée est ${pendingDrop.targetRoomTypeLabel}.`,
        question: "Voulez-vous mettre à jour le type de chambre et l’ajouter à cette chambre ?",
        primary: "Mettre à jour et ajouter",
        priceSection,
      };
      if (lang === "en") return {
        title: "Update room type?",
        intro: `This pilgrim is currently assigned to ${pendingDrop.currentRoomTypeLabel}, but the selected room is ${pendingDrop.targetRoomTypeLabel}.`,
        question: "Do you want to update the room type and add them to this room?",
        primary: "Update and add",
        priceSection,
      };
      return {
        title: "تحديث نوع الغرفة؟",
        intro: `هذا المعتمر محدد حاليًا كـ ${pendingDrop.currentRoomTypeLabel}، والغرفة المختارة هي ${pendingDrop.targetRoomTypeLabel}.`,
        question: "هل تريد تحديث نوع الغرفة وإضافته إلى هذه الغرفة؟",
        primary: "تحديث وإضافة",
        priceSection,
      };
    }
    if (hasGenderAssignment) {
      if (lang === "fr") return {
        title: "Définir le sexe ?",
        intro: pendingDrop.genderAssignment === "female"
          ? "Cette pèlerine n’a pas de sexe défini dans son dossier.\nLa chambre sélectionnée est réservée aux femmes."
          : "Ce pèlerin n’a pas de sexe défini dans son dossier.\nLa chambre sélectionnée est réservée aux hommes.",
        question: pendingDrop.genderAssignment === "female"
          ? "Voulez-vous définir le sexe comme femme et l’ajouter à cette chambre ?"
          : "Voulez-vous définir le sexe comme homme et l’ajouter à cette chambre ?",
        primary: pendingDrop.genderAssignment === "female" ? "Définir comme femme et ajouter" : "Définir comme homme et ajouter",
      };
      if (lang === "en") return {
        title: "Set gender?",
        intro: pendingDrop.genderAssignment === "female"
          ? "This pilgrim does not have a gender set in their file.\nThe selected room is women-only."
          : "This pilgrim does not have a gender set in their file.\nThe selected room is men-only.",
        question: pendingDrop.genderAssignment === "female"
          ? "Do you want to set gender as female and add them to this room?"
          : "Do you want to set gender as male and add them to this room?",
        primary: pendingDrop.genderAssignment === "female" ? "Set as female and add" : "Set as male and add",
      };
      return {
        title: "تحديد الجنس؟",
        intro: pendingDrop.genderAssignment === "female"
          ? "هذه المعتمرة لا يوجد لها جنس محدد في ملفها.\nالغرفة المختارة مصنفة كـ نساء فقط."
          : "هذا المعتمر لا يوجد له جنس محدد في ملفه.\nالغرفة المختارة مصنفة كـ رجال فقط.",
        question: pendingDrop.genderAssignment === "female"
          ? "هل تريد تحديد الجنس كأنثى وإضافتها إلى هذه الغرفة؟"
          : "هل تريد تحديد الجنس كذكر وإضافته إلى هذه الغرفة؟",
        primary: pendingDrop.genderAssignment === "female" ? "تحديد كأنثى وإضافة" : "تحديد كذكر وإضافة",
      };
    }
    if (hasFamilyMixed) {
      if (lang === "fr") return {
        title: "Confirmer la chambre familiale",
        intro: "Cette chambre est définie comme familiale et peut contenir des hommes et des femmes.",
        question: "Voulez-vous ajouter ce pèlerin à cette chambre ?",
        primary: "Confirmer et ajouter",
      };
      if (lang === "en") return {
        title: "Confirm family room",
        intro: "This room is marked as a family room and may include both men and women.",
        question: "Do you want to add this pilgrim to this room?",
        primary: "Confirm and add",
      };
      return {
        title: "تأكيد غرفة عائلية",
        intro: "هذه الغرفة مصنفة كغرفة عائلة، وستضم رجالًا ونساءً.",
        question: "هل تريد إضافة هذا المعتمر إلى هذه الغرفة؟",
        primary: "تأكيد وإضافة",
      };
    }
    if (lang === "fr") return {
      title: `Mettre à jour ${hotelLabel} ?`,
      intro: `Ce pèlerin est actuellement lié à l’hôtel : ${pendingDrop.currentHotel}`,
      target: `La chambre sélectionnée dépend de l’hôtel : ${pendingDrop.targetHotel}`,
      question: `Voulez-vous mettre à jour ${hotelLabel} et l’ajouter à cette chambre ?`,
      primary: "Mettre à jour et ajouter",
    };
    if (lang === "en") return {
      title: `Update ${hotelLabel}?`,
      intro: `This pilgrim is currently linked to hotel: ${pendingDrop.currentHotel}`,
      target: `The selected room belongs to hotel: ${pendingDrop.targetHotel}`,
      question: `Do you want to update ${hotelLabel} and add them to this room?`,
      primary: "Update and add",
    };
    return {
      title: conflictCity === "madinah" ? "تحديث فندق المدينة؟" : "تحديث فندق مكة؟",
      intro: `هذا المعتمر مرتبط حاليًا بـ${hotelLabel}: ${pendingDrop.currentHotel}`,
      target: `والغرفة المختارة تابعة لفندق: ${pendingDrop.targetHotel}`,
      question: `هل تريد تحديث ${hotelLabel} وإضافته إلى هذه الغرفة؟`,
      primary: "تحديث وإضافة",
    };
  }, [city, lang, pendingDrop, t.hotelMadina, t.hotelMecca]);
  const buildPendingDropPriceDecision = React.useCallback((mode = "update") => {
    if (!pendingDrop?.priceSync?.requiresConfirmation) return null;
    if (mode === "keep") {
      return {
        officialPrice: pendingDrop.priceSync.newOfficialPrice,
        salePrice: pendingDrop.priceSync.oldSalePrice,
        keepPreviousSale: true,
      };
    }
    const parsedSalePrice = getRoomingPriceNumber(String(pendingDropSalePrice).replace(",", "."));
    return {
      officialPrice: pendingDrop.priceSync.newOfficialPrice,
      salePrice: parsedSalePrice,
      keepPreviousSale: false,
    };
  }, [pendingDrop, pendingDropSalePrice]);
  const confirmPendingDrop = React.useCallback(() => {
    if (!pendingDrop) return;
    commitClientDropIntoRoom(pendingDrop.roomId, pendingDrop.clientId, {
      genderAssignment: pendingDrop.genderAssignment,
      priceDecision: buildPendingDropPriceDecision("update"),
    });
    if (pendingDrop.source === "picker") {
      setSelectedPilgrimIds([]);
      setPickerOpen(false);
    }
    setPendingDrop(null);
  }, [buildPendingDropPriceDecision, commitClientDropIntoRoom, pendingDrop]);
  const keepPendingDropSalePrice = React.useCallback(() => {
    if (!pendingDrop) return;
    commitClientDropIntoRoom(pendingDrop.roomId, pendingDrop.clientId, {
      genderAssignment: pendingDrop.genderAssignment,
      priceDecision: buildPendingDropPriceDecision("keep"),
    });
    if (pendingDrop.source === "picker") {
      setSelectedPilgrimIds([]);
      setPickerOpen(false);
    }
    setPendingDrop(null);
  }, [buildPendingDropPriceDecision, commitClientDropIntoRoom, pendingDrop]);
  const cancelPendingDrop = React.useCallback(() => {
    setPendingDrop(null);
  }, []);

  return (
    <div ref={roomingFullscreenRef} className="rooming-designer-root" style={fullWorkspace ? { position: "fixed", inset: 0, zIndex: 90, background: "var(--rooming-page-bg)" } : undefined}>
      <style>{`
        .rooming-designer-root,
        .rooming-modal-surface {
          --rooming-page-bg: #f3f5f8;
          --rooming-panel-bg: #ffffff;
          --rooming-panel-border: rgba(148,163,184,.22);
          --rooming-panel-shadow: 0 12px 28px rgba(15,23,42,.08);
          --rooming-text: #0f172a;
          --rooming-text-soft: #334155;
          --rooming-muted: #64748b;
          --rooming-input-bg: #ffffff;
          --rooming-input-border: rgba(148,163,184,.24);
          --rooming-toolbar-bg: #ffffff;
          --rooming-toolbar-border: rgba(148,163,184,.2);
          --rooming-button-bg: #ffffff;
          --rooming-button-active-bg: rgba(37,99,235,.08);
          --rooming-button-text: #334155;
          --rooming-button-active-text: #2563eb;
          --rooming-popover-bg: #ffffff;
          --rooming-popover-border: rgba(148,163,184,.22);
          --rooming-popover-shadow: 0 18px 42px rgba(15,23,42,.16);
          --rooming-list-bg: #f8fafc;
          --rooming-list-hover-bg: #ffffff;
          --rooming-list-selected-bg: rgba(37,99,235,.07);
          --rooming-chip-bg: rgba(248,250,252,.78);
          --rooming-chip-border: rgba(148,163,184,.18);
          --rooming-chip-text: #111827;
          --rooming-source-bg: rgba(241,245,249,.7);
          --rooming-source-text: #64748b;
          --rooming-modal-section-bg: #f8fafc;
          --rooming-modal-section-border: rgba(148,163,184,.18);
          --rooming-danger-soft-bg: rgba(254,226,226,.75);
          --rooming-danger-text: #b91c1c;
          --rooming-minimap-mask: rgba(248,250,252,.72);
        }
        html[data-theme="dark"] .rooming-designer-root,
        html[data-theme="dark"] .rooming-modal-surface {
          --rooming-page-bg: #07111f;
          --rooming-panel-bg: rgba(15,23,42,.96);
          --rooming-panel-border: rgba(148,163,184,.24);
          --rooming-panel-shadow: 0 18px 44px rgba(0,0,0,.38);
          --rooming-text: #f8fafc;
          --rooming-text-soft: #e2e8f0;
          --rooming-muted: #a8b5c8;
          --rooming-input-bg: rgba(15,23,42,.72);
          --rooming-input-border: rgba(148,163,184,.30);
          --rooming-toolbar-bg: rgba(15,23,42,.94);
          --rooming-toolbar-border: rgba(148,163,184,.24);
          --rooming-button-bg: rgba(30,41,59,.88);
          --rooming-button-active-bg: rgba(37,99,235,.22);
          --rooming-button-text: #dbeafe;
          --rooming-button-active-text: #93c5fd;
          --rooming-popover-bg: rgba(15,23,42,.98);
          --rooming-popover-border: rgba(148,163,184,.28);
          --rooming-popover-shadow: 0 22px 52px rgba(0,0,0,.48);
          --rooming-list-bg: rgba(30,41,59,.78);
          --rooming-list-hover-bg: rgba(51,65,85,.92);
          --rooming-list-selected-bg: rgba(37,99,235,.22);
          --rooming-chip-bg: rgba(30,41,59,.82);
          --rooming-chip-border: rgba(148,163,184,.24);
          --rooming-chip-text: #f8fafc;
          --rooming-source-bg: rgba(15,23,42,.78);
          --rooming-source-text: #cbd5e1;
          --rooming-modal-section-bg: rgba(30,41,59,.72);
          --rooming-modal-section-border: rgba(148,163,184,.24);
          --rooming-danger-soft-bg: rgba(127,29,29,.28);
          --rooming-danger-text: #fca5a5;
          --rooming-minimap-mask: rgba(2,6,23,.58);
        }
        .rooming-flow-node {
          transition: box-shadow .12s ease, border-color .12s ease, background .12s ease;
          cursor: grab;
          will-change: box-shadow, border-color, background;
        }
        .rooming-flow-node:hover {
          box-shadow: var(--rooming-card-hover-shadow) !important;
        }
        .react-flow__node.dragging .rooming-flow-node {
          transition: none;
          cursor: grabbing;
          box-shadow: 0 20px 46px rgba(15,23,42,.20) !important;
        }
        .room-link-handle {
          transition: filter .14s ease, box-shadow .14s ease, border-color .14s ease;
        }
        .room-link-handle:hover {
          filter: brightness(1.08) saturate(1.08);
        }
        .rooming-canvas-shell,
        .rooming-flow-canvas {
          --rooming-canvas-bg: #f6f2e8;
          --rooming-canvas-dot: rgba(120,113,108,.34);
          --rooming-canvas-border: rgba(15,23,42,.14);
          --rooming-canvas-shadow: 0 12px 30px rgba(15,23,42,.08);
          --rooming-link-line: rgba(37,99,235,.42);
          --rooming-link-selected: rgba(154,116,24,.86);
          --rooming-card-bg: #fffdf8;
          --rooming-card-border: rgba(15,23,42,.16);
          --rooming-card-shadow: 0 8px 20px rgba(15,23,42,.09);
          --rooming-card-hover-shadow: 0 12px 28px rgba(15,23,42,.13);
        }
        html[data-theme="dark"] .rooming-canvas-shell,
        html[data-theme="dark"] .rooming-flow-canvas {
          --rooming-canvas-bg: #08111f;
          --rooming-canvas-dot: rgba(148,163,184,.26);
          --rooming-canvas-border: rgba(148,163,184,.22);
          --rooming-canvas-shadow: 0 18px 46px rgba(0,0,0,.42);
          --rooming-link-line: rgba(147,197,253,.46);
          --rooming-link-selected: rgba(250,204,21,.88);
          --rooming-card-bg: #111c2d;
          --rooming-card-border: rgba(203,213,225,.20);
          --rooming-card-shadow: 0 18px 38px rgba(0,0,0,.42);
          --rooming-card-hover-shadow: 0 22px 46px rgba(0,0,0,.48), 0 0 0 1px rgba(96,165,250,.20);
        }
        .rooming-flow-canvas.react-flow,
        .rooming-flow-canvas .react-flow__renderer,
        .rooming-flow-canvas .react-flow__pane {
          background: var(--rooming-canvas-bg) !important;
          background-image: radial-gradient(circle, var(--rooming-canvas-dot) 1.25px, transparent 1.35px) !important;
          background-size: 22px 22px !important;
          background-position: 0 0 !important;
        }
        .rooming-flow-canvas .react-flow__background {
          background: transparent !important;
        }
        .rooming-flow-canvas .react-flow__viewport {
          background: transparent !important;
        }
        .rooming-flow-canvas .react-flow__node-room {
          filter: drop-shadow(0 8px 16px rgba(15,23,42,.08));
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
          background: var(--rooming-panel-bg);
        }
        .rooming-flow-canvas .react-flow__controls-button {
          width: 34px;
          height: 34px;
          border-bottom: 1px solid rgba(148,163,184,.16);
          background: var(--rooming-panel-bg);
          color: var(--rooming-text);
        }
        .rooming-flow-canvas .react-flow__controls-button:hover {
          background: var(--rooming-list-hover-bg);
        }
        .rooming-unassigned-card {
          transition: border-color .16s ease, background .16s ease, box-shadow .16s ease, transform .16s ease;
          cursor: grab;
        }
        .rooming-unassigned-card:hover {
          border-color: rgba(37,99,235,.32) !important;
          background: var(--rooming-list-hover-bg) !important;
          box-shadow: 0 10px 24px rgba(15,23,42,.10);
          transform: translateY(-1px);
        }
        html[data-theme="dark"] .rooming-unassigned-card:hover {
          border-color: rgba(96,165,250,.44) !important;
          box-shadow: 0 12px 28px rgba(0,0,0,.34);
        }
        .rooming-unassigned-card:active {
          cursor: grabbing;
        }
        .rooming-menu-item:hover {
          background: rgba(37,99,235,.08) !important;
        }
        html[data-theme="dark"] .rooming-menu-item:hover {
          background: rgba(96,165,250,.16) !important;
        }
        html[data-theme="dark"] .rooming-menu-item svg {
          color: currentColor;
          stroke: currentColor;
        }
        html[data-theme="dark"] .rooming-category-badge {
          background: var(--category-dark-bg) !important;
          color: var(--category-dark-text) !important;
          border-color: var(--category-dark-border) !important;
        }
        .rooming-designer-root input:not([type="checkbox"]),
        .rooming-designer-root select,
        .rooming-designer-root textarea,
        .rooming-modal-surface input:not([type="checkbox"]),
        .rooming-modal-surface select,
        .rooming-modal-surface textarea {
          background: var(--rooming-input-bg) !important;
          border-color: var(--rooming-input-border) !important;
          color: var(--rooming-text) !important;
        }
        .rooming-designer-root input::placeholder,
        .rooming-modal-surface input::placeholder {
          color: var(--rooming-muted) !important;
        }
        html[data-theme="dark"] .rooming-modal-surface p,
        html[data-theme="dark"] .rooming-modal-surface span,
        html[data-theme="dark"] .rooming-modal-surface strong,
        html[data-theme="dark"] .rooming-modal-surface small,
        html[data-theme="dark"] .rooming-modal-surface label {
          color: var(--rooming-text-soft);
        }
      `}</style>
      <GlassCard gold style={{
        padding: fullWorkspace ? 10 : 12,
        marginBottom: fullWorkspace ? 0 : 24,
        height: fullWorkspace ? "100vh" : "auto",
        width: fullWorkspace ? "100vw" : "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: "var(--rooming-page-bg)",
        border: "1px solid var(--rooming-panel-border)",
        overflow: "hidden",
      }}>
        {fullWorkspace && (
          <div style={{ position: "absolute", top: 10, insetInlineEnd: 10, zIndex: 48 }}>
            <RoomingToolbarButton
              title={exitFullWorkspaceLabel}
              onClick={exitRoomingWorkspace}
              icon={<Minimize2 size={15} />}
              active
              style={{
                background: "var(--rooming-popover-bg)",
                border: "1px solid var(--rooming-popover-border)",
                boxShadow: "var(--rooming-popover-shadow)",
              }}
            />
          </div>
        )}
        {!fullWorkspace && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 8,
          paddingInlineEnd: 0,
        }}>
          <div>
            <p style={{ color: "var(--rooming-text)", fontWeight: 900, fontSize: 16 }}>{t.roomingDesigner || "مصمم التسكين الذكي"}</p>
            <p style={{ color: "var(--rooming-muted)", fontSize: 12, marginTop: 3 }}>
              {program.name || "—"} • {roomingCityLabels[city]} • {roomingEligibleClients.length} {t.pilgrimUnit || "معتمر"}
              {roomingStatusText ? ` • ${roomingStatusText}` : ""}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", flex: "1 1 280px", justifyContent: "center" }}>
            {Object.entries(roomingCityLabels).map(([key, label]) => {
              const progress = roomingProgress[key] || { assigned: 0, total: roomingEligibleClients.length, percent: 0 };
              return (
                <div key={key} style={{
                  minWidth: 132,
                  border: "1px solid var(--rooming-panel-border)",
                  background: "var(--rooming-panel-bg)",
                  borderRadius: 999,
                  padding: "5px 8px",
                  boxShadow: "0 6px 16px rgba(15,23,42,.045)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, color: "var(--rooming-text-soft)", fontSize: 10, fontWeight: 900, whiteSpace: "nowrap" }}>
                    <span>{label}</span>
                    <span>{progress.assigned}/{progress.total} · {progress.percent}%</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 999, background: "var(--rooming-input-border)", overflow: "hidden", marginTop: 4 }}>
                    <div style={{ width: `${Math.min(100, progress.percent)}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#2563eb,#16a34a)" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 10, background: "var(--rooming-toolbar-bg)", border: "1px solid var(--rooming-toolbar-border)" }}>
            {Object.entries(roomingCityLabels).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => switchCity(key)}
                style={{
                  border: 0,
                  background: city === key ? "var(--rooming-button-active-bg)" : "transparent",
                  color: city === key ? "var(--rooming-button-active-text)" : "var(--rooming-button-text)",
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
        )}

        {fullWorkspace && (
          <div style={{
            position: "absolute",
            top: 10,
            insetInlineStart: 10,
            zIndex: 48,
            display: "inline-flex",
            gap: 4,
            padding: 4,
            borderRadius: 12,
            background: "var(--rooming-popover-bg)",
            border: "1px solid var(--rooming-popover-border)",
            boxShadow: "var(--rooming-popover-shadow)",
            backdropFilter: "blur(14px)",
          }}>
            {Object.entries(roomingCityLabels).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => switchCity(key)}
                style={{
                  border: 0,
                  background: city === key ? "var(--rooming-button-active-bg)" : "transparent",
                  color: city === key ? "var(--rooming-button-active-text)" : "var(--rooming-button-text)",
                  borderRadius: 9,
                  padding: "8px 11px",
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: "pointer",
                  fontFamily: "'Cairo',sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {!toolbarCollapsed && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            padding: 8,
            marginBottom: fullWorkspace ? 8 : 10,
            borderRadius: 12,
            background: "var(--rooming-toolbar-bg)",
            border: "1px solid var(--rooming-toolbar-border)",
            ...(fullWorkspace ? {
              position: "absolute",
              top: 58,
              insetInlineStart: 10,
              insetInlineEnd: 10,
              zIndex: 38,
              boxShadow: "0 16px 40px rgba(15,23,42,.16)",
              maxHeight: "22vh",
              overflow: "auto",
              backdropFilter: "blur(14px)",
              boxSizing: "border-box",
            } : {}),
          }}>
            <RoomingToolbarButton
              title={t.hideToolbar || "إخفاء الأدوات"}
              onClick={() => setToolbarCollapsed(true)}
              icon={<ChevronUp size={15} />}
            />
          <Button variant="primary" icon="refresh" onClick={generateRooms}>{t.roomingGenerateRooms || "توليد الغرف"}</Button>
          <RoomingToolbarButton
            title={t.addRooms || t.addRoom || "إضافة غرف"}
            onClick={() => openCreateRoom({ x: ROOMING_LAYOUT_START_X, y: ROOMING_LAYOUT_START_Y })}
            icon={<AppIcon name="plus" size={15} />}
          >
            <span>{t.addRooms || t.addRoom || "إضافة غرف"}</span>
          </RoomingToolbarButton>
          <RoomingToolbarButton
            title={roomingPrintLabels.title}
            onClick={() => setRoomingPrintSettingsOpen(true)}
            active={roomingPrintSettingsOpen || roomingPrintSettings.density !== "normal" || roomingPrintSettings.layoutMode !== "default" || !roomingPrintSettings.showRegistrationSource || roomingPrintSettings.showBedNumbers}
            icon={<Settings size={15} />}
          >
            <span>{roomingPrintLabels.title}</span>
          </RoomingToolbarButton>
          <RoomingToolbarButton title={t.roomingAutoArrange || "ترتيب تلقائي"} onClick={autoArrangeRooms} icon={<LayoutGrid size={15} />} />
          <RoomingToolbarButton
            title={t.roomingLinkRooms || (lang === "fr" ? "Lier les chambres" : lang === "en" ? "Link rooms" : "ربط الغرف")}
            onClick={toggleRoomLinkMode}
            active={linkMode}
            icon={<Link2 size={15} />}
          >
            {linkMode && linkStartRoomId ? <span>{t.roomingDragLinkToRoom || (lang === "fr" ? "Glisser vers une chambre" : lang === "en" ? "Drag to a room" : "اسحب إلى غرفة")}</span> : null}
          </RoomingToolbarButton>
          <RoomingToolbarButton
            title={t.roomingSelectRooms || "تحديد الغرف"}
            onClick={toggleRoomSelectionMode}
            active={roomSelectionMode}
            icon={<Square size={15} />}
          >
            {roomSelectionMode && selectedRoomIds.size ? `${t.roomingSelectRooms || "تحديد الغرف"} · ${selectedRoomIds.size}` : null}
          </RoomingToolbarButton>
          {roomSelectionMode && (
            <RoomingToolbarButton
              title={t.roomingSelectAllRooms || "تحديد كل الغرف"}
              onClick={selectAllRooms}
              icon={<LayoutGrid size={15} />}
            >
              <span>{t.roomingSelectAllRooms || "تحديد كل الغرف"}</span>
            </RoomingToolbarButton>
          )}
          {roomSelectionMode && (
            <RoomingToolbarButton
              title={t.roomingClearSelection || "إلغاء التحديد"}
              onClick={clearRoomSelection}
              disabled={!selectedRoomIds.size}
              icon={<SquareSlash size={15} />}
            >
              <span>{t.roomingClearSelection || "إلغاء التحديد"}</span>
            </RoomingToolbarButton>
          )}
          {roomSelectionMode && (
            <RoomingToolbarButton
              title={t.roomingDeleteSelectedRooms || "حذف الغرف المحددة"}
              onClick={deleteSelectedRooms}
              disabled={!selectedRoomIds.size}
              icon={<Trash2 size={15} />}
              style={{
                border: "1px solid rgba(239,68,68,.32)",
                background: "var(--rooming-danger-soft-bg)",
                color: "var(--rooming-danger-text)",
              }}
            >
              <span>{t.roomingDeleteSelectedRooms || "حذف الغرف المحددة"}</span>
            </RoomingToolbarButton>
          )}
          <RoomingToolbarButton
            title={t.roomingSave || "حفظ"}
            onClick={() => saveCanvas(true)}
            active={dirty || roomingSaveStatus === "saving"}
            disabled={roomingLoadStatus === "loading" || roomingSaveStatus === "saving"}
            icon={<AppIcon name="save" size={15} />}
          />
          <RoomingToolbarButton title={t.roomingPrint || "طباعة"} onClick={printCanvas} icon={<AppIcon name="print" size={15} />} />
          <RoomingToolbarButton
            title={t.roomingDownloadPdf || (lang === "fr" ? "Télécharger PDF" : lang === "en" ? "Download PDF" : "تنزيل PDF")}
            onClick={() => handleDownloadRoomingPdf("single")}
            disabled={Boolean(roomingPdfBusy)}
            icon={<AppIcon name="download" size={15} />}
          >
            <span>{roomingPdfBusy === "single" ? (t.loading || "جاري التحميل...") : (t.roomingDownloadPdf || (lang === "fr" ? "Télécharger PDF" : lang === "en" ? "Download PDF" : "تنزيل PDF"))}</span>
          </RoomingToolbarButton>
          <RoomingToolbarButton
            title={t.roomingCombinedPdf || (lang === "fr" ? "PDF combiné" : lang === "en" ? "Combined PDF" : "PDF مكة والمدينة")}
            onClick={() => handleDownloadRoomingPdf("combined")}
            disabled={Boolean(roomingPdfBusy)}
            icon={<AppIcon name="download" size={15} />}
          >
            <span>{roomingPdfBusy === "combined" ? (t.loading || "جاري التحميل...") : (t.roomingCombinedPdf || (lang === "fr" ? "PDF combiné" : lang === "en" ? "Combined PDF" : "PDF مكة والمدينة"))}</span>
          </RoomingToolbarButton>
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
                    background: roomOccupancyFilter === option.value ? "var(--rooming-button-active-text)" : "var(--rooming-input-border)",
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
                <p style={{ color: "var(--rooming-text)", fontSize: 12, fontWeight: 900, marginBottom: 8 }}>{t.roomNeeds || "احتياج الغرف"}</p>
                {!roomNeeds.details.length ? (
                  <p style={{ color: "var(--rooming-muted)", fontSize: 11 }}>{t.noDetails || "بدون تفاصيل"}</p>
                ) : (
                  <div style={{ display: "grid", gap: 7 }}>
                    {roomNeeds.details.map((item) => (
                      <div key={item.type} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", color: "var(--rooming-text-soft)", fontSize: 11, fontWeight: 800 }}>
                        <span>{item.label}</span>
                        <span style={{ color: "var(--rooming-text)" }}>
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
            style={{ height: 34, borderRadius: 8, border: "1px solid var(--rooming-input-border)", background: "var(--rooming-input-bg)", color: "var(--rooming-text-soft)", padding: "0 10px", fontSize: 12, fontWeight: 700, fontFamily: "'Cairo',sans-serif" }}
          >
            {[75, 100, 125].map((value) => <option key={value} value={value}>{value}%</option>)}
          </select>
          <RoomingToolbarButton title={t.roomingFit || "Fit"} onClick={fitView} icon={<Scan size={15} />} />
          <RoomingToolbarButton title={panelOpen ? hideUnassignedLabel : showUnassignedLabel} onClick={() => setPanelOpen((open) => !open)} icon={panelOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />} active={panelOpen} />
          <RoomingToolbarButton
            title={expandRoomingLabel}
            onClick={enterRoomingExpanded}
            icon={<PanelTop size={15} />}
            active={roomingWorkspaceMode === "expanded"}
            style={{
              background: roomingWorkspaceMode === "expanded" ? "var(--rooming-button-active-bg)" : "var(--rooming-list-bg)",
              border: "1px solid var(--rooming-input-border)",
              color: roomingWorkspaceMode === "expanded" ? "var(--rooming-button-active-text)" : "var(--rooming-text-soft)",
            }}
          />
          <RoomingToolbarButton
            title={browserFullscreenLabel}
            onClick={enterRoomingBrowserFullscreen}
            icon={<Maximize2 size={15} />}
            active={browserFullscreenMode}
            style={{
              border: browserFullscreenMode ? "1px solid rgba(37,99,235,.42)" : "1px solid rgba(212,175,55,.48)",
              background: browserFullscreenMode ? "var(--rooming-button-active-bg)" : "linear-gradient(135deg, rgba(212,175,55,.18), var(--rooming-button-bg))",
              color: browserFullscreenMode ? "var(--rooming-button-active-text)" : "var(--rooming-text)",
              boxShadow: "0 8px 18px rgba(15,23,42,.10)",
            }}
          />
          </div>
        )}

        <div style={fullWorkspace ? {
          position: "relative",
          flex: 1,
          minHeight: 0,
          height: canvasHeight,
          display: "block",
        } : {
          display: "grid",
          gridTemplateColumns: panelOpen ? "minmax(0,1fr) 290px" : "1fr",
          gap: 10,
          minHeight: 0,
          height: canvasHeight,
        }}>
          <div className="rooming-canvas-shell" style={{
            position: fullWorkspace ? "absolute" : "relative",
            inset: fullWorkspace ? 0 : undefined,
            overflow: "hidden",
            borderRadius: fullWorkspace ? 16 : 14,
            border: "1px solid var(--rooming-canvas-border)",
            backgroundColor: "var(--rooming-canvas-bg)",
            boxShadow: "var(--rooming-canvas-shadow)",
            height: fullWorkspace ? "100%" : undefined,
            minHeight: 0,
          }}>
            {toolbarCollapsed && (
              <div style={{
                position: "absolute",
                top: fullWorkspace ? 58 : 12,
                insetInlineStart: 12,
                zIndex: fullWorkspace ? 38 : 24,
              }}>
                <RoomingToolbarButton
                  title={t.showToolbar || "إظهار الأدوات"}
                  onClick={() => setToolbarCollapsed(false)}
                  active
                  icon={<ChevronDown size={15} />}
                  style={{
                    background: "var(--rooming-button-bg)",
                    border: "1px solid var(--rooming-toolbar-border)",
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
                  const menuPoint = clampRoomingContextMenuPoint(event.clientX, event.clientY);
                  setCanvasMenu({
                    open: true,
                    x: menuPoint.x,
                    y: menuPoint.y,
                    position: {
                      x: Math.max(0, event.clientX - rect.left),
                      y: Math.max(0, event.clientY - rect.top),
                    },
                  });
                }}
                style={{ display: "grid", placeItems: "center", minHeight: "100%", padding: 30 }}
              >
                <div style={{ textAlign: "center", maxWidth: 420 }}>
                  <p style={{ color: "var(--rooming-text)", fontSize: 18, fontWeight: 900, marginBottom: 8 }}>{t.roomingStartTitle || "ابدأ بتوليد الغرف"}</p>
                  <p style={{ color: "var(--rooming-muted)", fontSize: 13, marginBottom: 16 }}>{t.roomingStartDesc || "سيتم توليد الغرف فارغة حسب الاحتياج. سيبقى الحجاج/المعتمرون في قائمة غير المسكنين لتقوم بتسكينهم يدويًا."}</p>
                  <Button variant="primary" icon="refresh" onClick={generateRooms}>{t.roomingGenerateRooms || "توليد الغرف"}</Button>
                </div>
              </div>
            ) : (
              <>
                <ReactFlowProvider>
                  <RoomingFlowSurface
                    nodes={flowNodes}
                    edges={roomFlowEdges}
                    onNodesChange={onFlowNodesChange}
                    selectedRoomId={selectedRoomId}
                    panelOpen={panelOpen}
                    nodesDraggable={!roomSelectionMode}
                    onInit={(flow) => { flowRef.current = flow; }}
                    onNodeClick={(_event, node) => {
                      if (roomSelectionMode) {
                        toggleRoomSelection(node.id);
                        return;
                      }
                      setSelectedRoomId(node.id);
                    }}
                    linkMode={linkMode}
                    onConnect={handleRoomLinkConnect}
                    onConnectStart={handleRoomLinkConnectStart}
                    onConnectEnd={handleRoomLinkConnectEnd}
                    isValidConnection={isValidRoomLinkConnection}
                    onEdgeClick={handleRoomLinkClick}
                    onEdgeContextMenu={handleRoomLinkContextMenu}
                    onNodeDragStart={onNodeDragStart}
                    onNodeDrag={onNodeDrag}
                    onNodeDragStop={onNodeDragStop}
                    onPaneContextMenu={openCanvasContextMenu}
                    onPaneClick={() => {
                      closeCanvasContextMenu();
                      setRoomLinkMenu({ open: false, x: 0, y: 0, linkId: "" });
                      setSelectedRoomLinkId(null);
                    }}
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
                      background: "var(--rooming-panel-bg)",
                      border: "1px solid var(--rooming-panel-border)",
                      boxShadow: "0 18px 42px rgba(15,23,42,.12)",
                      borderRadius: 14,
                      padding: "16px 20px",
                      color: "var(--rooming-text-soft)",
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
                  width: 170,
                  background: "var(--rooming-popover-bg)",
                  border: "1px solid var(--rooming-popover-border)",
                  borderRadius: 12,
                  boxShadow: "var(--rooming-popover-shadow)",
                  padding: 6,
                  zIndex: 120,
                }}
              >
                <RoomingMenuItem
                  label={t.addRooms || t.addRoom || "إضافة غرف"}
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
            {roomLinkMenu.open && (
              <div
                onPointerDown={(event) => event.stopPropagation()}
                style={{
                  position: "fixed",
                  top: roomLinkMenu.y,
                  left: roomLinkMenu.x,
                  zIndex: 70,
                  width: 176,
                }}
              >
                <RoomingMenu open width={176}>
                  <RoomingMenuItem
                    destructive
                    icon={<Trash2 size={14} />}
                    label={t.roomingDeleteLink || (lang === "fr" ? "Supprimer le lien" : lang === "en" ? "Delete link" : "حذف الرابط")}
                    onClick={() => deleteRoomLink(roomLinkMenu.linkId)}
                  />
                </RoomingMenu>
              </div>
            )}
          </div>

          {fullWorkspace && !panelOpen && (
            <button
              type="button"
              title={showUnassignedLabel}
              onClick={() => setPanelOpen(true)}
              style={{
                position: "absolute",
                top: "50%",
                left: 14,
                transform: "translateY(-50%)",
                zIndex: 32,
                border: "1px solid var(--rooming-popover-border)",
                background: "var(--rooming-popover-bg)",
                color: "var(--rooming-button-text)",
                borderRadius: 999,
                padding: "8px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                cursor: "pointer",
                boxShadow: "var(--rooming-popover-shadow)",
                fontFamily: "'Cairo',sans-serif",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              <PanelRightOpen size={15} />
              <span>{showUnassignedLabel}</span>
            </button>
          )}

          {panelOpen && (
            <aside style={{
              background: "var(--rooming-panel-bg)",
              border: "1px solid var(--rooming-panel-border)",
              borderRadius: 14,
              padding: 12,
              overflow: "auto",
              boxShadow: fullWorkspace ? "var(--rooming-popover-shadow)" : "var(--rooming-panel-shadow)",
              ...(fullWorkspace ? {
                position: "absolute",
                top: fullWorkspacePanelTop,
                bottom: 18,
                left: 18,
                zIndex: 31,
                width: "min(340px, calc(100vw - 36px))",
                maxWidth: "calc(100vw - 36px)",
                maxHeight: toolbarCollapsed ? "calc(100vh - 124px)" : "calc(100vh - 58px - 22vh - 36px)",
                backdropFilter: "blur(14px)",
              } : {}),
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={{ color: "var(--rooming-text)", fontWeight: 900, fontSize: 13 }}>{t.unassignedReview || "غير مسكنين / يحتاجون مراجعة"}</p>
                <RoomingToolbarButton title={fullWorkspace ? hideUnassignedLabel : (t.roomingHideUnassigned || "إخفاء")} onClick={() => setPanelOpen(false)} icon={<PanelRightClose size={14} />} style={{ minWidth: 28, height: 28 }} />
              </div>
              <div style={{ display: "grid", gap: 7, marginBottom: 10 }}>
                <Input label="" value={panelSearch} onChange={(event) => setPanelSearch(event.target.value)} placeholder={t.searchGeneral || "بحث"} />
                <Select label="" value={panelHotel} onChange={(event) => setPanelHotel(event.target.value)} options={[{ value: "all", label: t.allHotels || "كل الفنادق" }, ...hotelOptions.map((hotel) => ({ value: hotel, label: hotel }))]} />
                <Select label="" value={panelRoomType} onChange={(event) => setPanelRoomType(event.target.value)} options={[{ value: "all", label: t.allRooms || "كل الغرف" }, ...roomingRoomOptions.map((option) => ({ value: option.value, label: option.label }))]} />
              </div>
              {excludedRoomingClientCount > 0 && (
                <p style={{
                  marginBottom:10,
                  padding:"8px 10px",
                  borderRadius:10,
                  background:"rgba(148,163,184,.08)",
                  border:"1px solid var(--rooming-panel-border)",
                  color:"var(--rooming-muted)",
                  fontSize:11.5,
                  lineHeight:1.55,
                  fontWeight:800,
                }}>
                  {roomingServiceTypeHiddenNote}
                </p>
              )}
              {selectedUnassignedList.length > 0 && (
                <div style={{
                  display: "grid",
                  gap: 7,
                  marginBottom: 10,
                  padding: 8,
                  border: "1px solid rgba(37,99,235,.22)",
                  borderRadius: 11,
                  background: "var(--rooming-list-selected-bg)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ color: "var(--rooming-text)", fontSize: 12, fontWeight: 900 }}>
                      {selectedUnassignedList.length} {unassignedSelectionLabels.selected}
                    </span>
                    <button
                      type="button"
                      onClick={clearSelectedUnassigned}
                      style={{
                        border: "1px solid var(--rooming-panel-border)",
                        background: "var(--rooming-button-bg)",
                        color: "var(--rooming-button-text)",
                        borderRadius: 8,
                        padding: "4px 8px",
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: "pointer",
                        fontFamily: "'Cairo',sans-serif",
                      }}
                    >
                      {unassignedSelectionLabels.clear}
                    </button>
                  </div>
                  {selectedRoom && (
                    <button
                      type="button"
                      onClick={() => insertClientsIntoRoom(selectedRoom.id, selectedUnassignedList, true)}
                      style={{
                        width: "100%",
                        border: "1px solid rgba(37,99,235,.24)",
                        background: "var(--rooming-button-active-bg)",
                        color: "var(--rooming-button-active-text)",
                        borderRadius: 8,
                        padding: "6px 8px",
                        fontSize: 11,
                        fontWeight: 900,
                        cursor: "pointer",
                        fontFamily: "'Cairo',sans-serif",
                      }}
                    >
                      {unassignedSelectionLabels.addToRoom}
                    </button>
                  )}
                </div>
              )}
              {!filteredUnassigned.length ? (
                <p style={{ color: "var(--rooming-muted)", fontSize: 12 }}>{t.noUnassignedForFilters || "لا توجد حالات غير مسكنة ضمن الفلاتر الحالية."}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredUnassigned.map((item) => {
                    const client = clientsById[item.clientId];
                    const context = client ? getClientContext(client) : {};
                    const genderMissing = client && !normalizeRoomingGender(client.gender);
                    const selectedRoomReason = client && selectedRoom ? getCompatibilityReason(client, selectedRoom) : "";
                    const canAddToSelected = Boolean(client && selectedRoom && !selectedRoomReason);
                    const displayReason = item.reason && item.reason !== "يحتاج مراجعة" ? item.reason : "";
                    const unassignedSelected = selectedUnassignedIds.has(item.clientId);
                    return (
                      <div
                        key={item.clientId}
                        className="rooming-unassigned-card"
                        draggable={Boolean(client)}
                        onDragStart={(event) => {
                          if (!client) return;
                          const dragIds = unassignedSelected && selectedUnassignedList.length
                            ? selectedUnassignedList
                            : [item.clientId];
                          setDraggingClientId(item.clientId);
                          setHoveredDropRoomId(null);
                          clientDragPointerRef.current = { x: event.clientX, y: event.clientY };
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("application/x-rukn-client-id", item.clientId);
                          event.dataTransfer.setData("application/x-rukn-client-ids", JSON.stringify(dragIds));
                          event.dataTransfer.setData("text/plain", dragIds.length > 1 ? `${dragIds.length} ${unassignedSelectionLabels.selected}` : (context.name || item.clientId));
                          setUnassignedGroupDragImage(event, dragIds, context.name);
                        }}
                        onDragEnd={clearRoomingDragState}
                        style={{
                          position: "relative",
                          border: draggingClientId === item.clientId || unassignedSelected ? "1px solid rgba(37,99,235,.42)" : "1px solid var(--rooming-panel-border)",
                          background: draggingClientId === item.clientId || unassignedSelected ? "var(--rooming-list-selected-bg)" : "var(--rooming-list-bg)",
                          boxShadow: unassignedSelected ? "0 10px 22px rgba(37,99,235,.10)" : "none",
                          borderRadius: 10,
                          padding: 9,
                          paddingInlineStart: 38,
                        }}
                      >
                        <button
                          type="button"
                          title={unassignedSelected ? unassignedSelectionLabels.clear : unassignedSelectionLabels.selected}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleUnassignedSelection(item.clientId);
                          }}
                          style={{
                            position: "absolute",
                            top: 8,
                            insetInlineStart: 8,
                            width: 22,
                            height: 22,
                            borderRadius: 999,
                            border: unassignedSelected ? "1px solid rgba(37,99,235,.56)" : "1px solid var(--rooming-panel-border)",
                            background: unassignedSelected ? "var(--rooming-button-active-bg)" : "var(--rooming-button-bg)",
                            color: unassignedSelected ? "var(--rooming-button-active-text)" : "var(--rooming-muted)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: 900,
                            lineHeight: 1,
                            fontFamily: "'Cairo',sans-serif",
                          }}
                        >
                          {unassignedSelected ? "✓" : ""}
                        </button>
                        <strong style={{ display: "block", color: "var(--rooming-text)", fontSize: 12 }}>{context.name}</strong>
                        <span style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", color: "var(--rooming-muted)", fontSize: 11, marginTop: 3 }}>
                          <span>{[context.registrationSource, context.roomTypeLabel, context.level || context.hotel].filter(Boolean).join(" • ") || (t.noDetails || "بدون تفاصيل")}</span>
                          {genderMissing && (
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              border: "1px solid rgba(148,163,184,.24)",
                              background: "var(--rooming-source-bg)",
                              color: "var(--rooming-source-text)",
                              borderRadius: 999,
                              padding: "1px 6px",
                              fontSize: 9,
                              fontWeight: 800,
                              lineHeight: 1.45,
                              whiteSpace: "nowrap",
                            }}>
                              {unknownGenderBadgeLabel}
                            </span>
                          )}
                        </span>
                        {displayReason && <span style={{ display: "block", color: "var(--rukn-warning)", fontSize: 11, marginTop: 3 }}>{displayReason}</span>}
                        {selectedRoom && (
                          <button
                            type="button"
                            disabled={!canAddToSelected}
                            onClick={() => {
                              if (!canAddToSelected) return;
                              const ids = unassignedSelected && selectedUnassignedList.length > 1
                                ? selectedUnassignedList
                                : [item.clientId];
                              insertClientsIntoRoom(selectedRoom.id, ids, true);
                            }}
                            style={{
                              marginTop: 8,
                              width: "100%",
                              border: "1px solid rgba(37,99,235,.18)",
                              background: canAddToSelected ? "var(--rooming-button-active-bg)" : "var(--rooming-list-bg)",
                              color: canAddToSelected ? "var(--rooming-button-active-text)" : "var(--rooming-muted)",
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

        <Modal
          open={roomingPrintSettingsOpen}
          onClose={() => setRoomingPrintSettingsOpen(false)}
          title={roomingPrintLabels.title}
          width={460}
          portalContainer={roomingModalPortalContainer}
        >
          <div className="rooming-modal-surface" style={{ display: "grid", gap: 16 }}>
            <label style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 12px",
              border: "1px solid var(--rooming-modal-section-border)",
              borderRadius: 12,
              background: "var(--rooming-modal-section-bg)",
              color: "var(--rooming-text)",
              fontSize: 13,
              fontWeight: 900,
            }}>
              <span>{roomingPrintLabels.showSource}</span>
              <input
                type="checkbox"
                checked={roomingPrintSettings.showRegistrationSource}
                onChange={(event) => setRoomingPrintSettings((prev) => ({
                  ...prev,
                  showRegistrationSource: event.target.checked,
                }))}
                style={{ width: 18, height: 18, accentColor: "#2563eb" }}
              />
            </label>

            <label style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 12px",
              border: "1px solid var(--rooming-modal-section-border)",
              borderRadius: 12,
              background: "var(--rooming-modal-section-bg)",
              color: "var(--rooming-text)",
              fontSize: 13,
              fontWeight: 900,
            }}>
              <span>{roomingPrintLabels.showBedNumbers}</span>
              <input
                type="checkbox"
                checked={roomingPrintSettings.showBedNumbers}
                onChange={(event) => setRoomingPrintSettings((prev) => ({
                  ...prev,
                  showBedNumbers: event.target.checked,
                }))}
                style={{ width: 18, height: 18, accentColor: "#b99235" }}
              />
            </label>

            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ color: "var(--rooming-text-soft)", fontSize: 12, fontWeight: 900 }}>{roomingPrintLabels.density}</p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 6,
                padding: 4,
                borderRadius: 12,
                background: "var(--rooming-list-bg)",
                border: "1px solid var(--rooming-modal-section-border)",
              }}>
                {roomingDensityOptions.map((option) => {
                  const active = roomingPrintSettings.density === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRoomingPrintSettings((prev) => ({ ...prev, density: option.value }))}
                      style={{
                        border: active ? "1px solid rgba(37,99,235,.34)" : "1px solid transparent",
                        background: active ? "var(--rooming-button-bg)" : "transparent",
                        color: active ? "var(--rooming-button-active-text)" : "var(--rooming-button-text)",
                        boxShadow: active ? "0 8px 18px rgba(15,23,42,.08)" : "none",
                        borderRadius: 9,
                        padding: "8px 10px",
                        fontSize: 12,
                        fontWeight: 900,
                        cursor: "pointer",
                        fontFamily: "'Cairo',sans-serif",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ color: "var(--rooming-text-soft)", fontSize: 12, fontWeight: 900 }}>{roomingPrintLabels.layoutMode}</p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 6,
                padding: 4,
                borderRadius: 12,
                background: "var(--rooming-list-bg)",
                border: "1px solid var(--rooming-modal-section-border)",
              }}>
                {roomingPrintLayoutOptions.map((option) => {
                  const active = roomingPrintSettings.layoutMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRoomingPrintSettings((prev) => ({ ...prev, layoutMode: option.value }))}
                      style={{
                        border: active ? "1px solid rgba(37,99,235,.34)" : "1px solid transparent",
                        background: active ? "var(--rooming-button-bg)" : "transparent",
                        color: active ? "var(--rooming-button-active-text)" : "var(--rooming-button-text)",
                        boxShadow: active ? "0 8px 18px rgba(15,23,42,.08)" : "none",
                        borderRadius: 9,
                        padding: "8px 10px",
                        fontSize: 12,
                        fontWeight: 900,
                        cursor: "pointer",
                        fontFamily: "'Cairo',sans-serif",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p style={{ color: "var(--rooming-muted)", fontSize: 11, lineHeight: 1.7, margin: 0 }}>
                {roomingPrintLabels.layoutHelp}
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="primary" onClick={() => setRoomingPrintSettingsOpen(false)}>
                {roomingPrintLabels.done}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal open={Boolean(pendingDrop)} onClose={cancelPendingDrop} title={pendingDropCopy?.title || ""} width={520} portalContainer={roomingModalPortalContainer}>
          {pendingDrop && pendingDropCopy && (
            <div className="rooming-modal-surface" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ color: "var(--rooming-text-soft)", fontSize: 13, lineHeight: 1.8, margin: 0 }}>
                {pendingDropCopy.intro}
              </p>
              {pendingDropCopy.details?.length ? (
                <div style={{ display: "grid", gap: 9, padding: 12, border: "1px solid var(--rooming-modal-section-border)", background: "var(--rooming-modal-section-bg)", borderRadius: 12 }}>
                  {pendingDropCopy.details.map((detail, index) => detail.note ? (
                    <p key={`note-${index}`} style={{ color: "var(--rooming-muted)", fontSize: 12, fontWeight: 800, lineHeight: 1.7, margin: 0 }}>{detail.note}</p>
                  ) : (
                    <div key={`${detail.currentLabel}-${index}`} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <p style={{ color: "var(--rooming-muted)", fontSize: 11, fontWeight: 800 }}>{detail.currentLabel}</p>
                        <p style={{ color: "var(--rooming-text)", fontSize: 13, fontWeight: 900 }}>{detail.currentValue}</p>
                      </div>
                      <div>
                        <p style={{ color: "var(--rooming-muted)", fontSize: 11, fontWeight: 800 }}>{detail.targetLabel}</p>
                        <p style={{ color: "var(--rooming-button-active-text)", fontSize: 13, fontWeight: 900 }}>{detail.targetValue}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : pendingDropCopy.target ? (
                <p style={{ color: "var(--rooming-text-soft)", fontSize: 13, lineHeight: 1.8, margin: 0 }}>{pendingDropCopy.target}</p>
              ) : null}
              {pendingDropCopy.priceSection && (
                <div style={{
                  display: "grid",
                  gap: 10,
                  padding: 12,
                  border: "1px solid rgba(212,175,55,.24)",
                  background: "var(--rukn-gold-dim)",
                  borderRadius: 12,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ color: "var(--rooming-muted)", fontSize: 11, fontWeight: 900 }}>
                      {pendingDropCopy.priceSection.newOfficialLabel}
                    </span>
                    <strong style={{ color: "var(--rooming-text)", fontSize: 14 }}>
                      {pendingDropCopy.priceSection.formatPrice(pendingDropCopy.priceSection.newOfficialPrice)}
                    </strong>
                  </div>
                  <label style={{ display: "grid", gap: 5 }}>
                    <span style={{ color: "var(--rooming-muted)", fontSize: 11, fontWeight: 900 }}>
                      {pendingDropCopy.priceSection.newSaleLabel}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={pendingDropSalePrice}
                      onChange={(event) => setPendingDropSalePrice(event.target.value)}
                      onWheel={preventNumberInputWheelChange}
                      style={{
                        width: "100%",
                        border: "1px solid var(--rooming-input-border)",
                        borderRadius: 9,
                        padding: "8px 10px",
                        background: "var(--rooming-input-bg)",
                        color: "var(--rooming-text)",
                        fontSize: 13,
                        fontWeight: 800,
                        fontFamily: "'Cairo',sans-serif",
                        outline: "none",
                      }}
                    />
                  </label>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    paddingTop: 2,
                  }}>
                    <div>
                      <p style={{ color: "var(--rooming-muted)", fontSize: 10.5, fontWeight: 800 }}>
                        {pendingDropCopy.priceSection.oldOfficialLabel}
                      </p>
                      <p style={{ color: "var(--rooming-text-soft)", fontSize: 12, fontWeight: 900 }}>
                        {pendingDropCopy.priceSection.formatPrice(pendingDropCopy.priceSection.oldOfficialPrice)}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: "var(--rooming-muted)", fontSize: 10.5, fontWeight: 800 }}>
                        {pendingDropCopy.priceSection.oldSaleLabel}
                      </p>
                      <p style={{ color: "var(--rooming-text-soft)", fontSize: 12, fontWeight: 900 }}>
                        {pendingDropCopy.priceSection.formatPrice(pendingDropCopy.priceSection.oldSalePrice)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <p style={{ color: "var(--rooming-text)", fontSize: 13, fontWeight: 800, lineHeight: 1.8, margin: 0 }}>
                {pendingDropCopy.question}
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                <Button variant="ghost" onClick={cancelPendingDrop}>{t.cancel || "إلغاء"}</Button>
                {pendingDropCopy.priceSection && (
                  <Button variant="ghost" onClick={keepPendingDropSalePrice}>
                    {pendingDropCopy.priceSection.keepPrevious}
                  </Button>
                )}
                <Button onClick={confirmPendingDrop}>{pendingDropCopy.primary}</Button>
              </div>
            </div>
          )}
        </Modal>

        <Modal
          open={Boolean(largeRoomGenerationConfirm)}
          onClose={cancelLargeRoomGeneration}
          title={largeRoomGenerationCopy.title}
          width={500}
          portalContainer={roomingModalPortalContainer}
        >
          {largeRoomGenerationConfirm && (
            <div className="rooming-modal-surface" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{
                display: "grid",
                gap: 8,
                padding: 14,
                border: "1px solid rgba(212,175,55,.28)",
                background: "var(--rukn-gold-dim)",
                borderRadius: 14,
              }}>
                <p style={{ color: "var(--rooming-text)", fontSize: 13, fontWeight: 800, lineHeight: 1.8, margin: 0 }}>
                  {largeRoomGenerationCopy.message}
                </p>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  alignSelf: "flex-start",
                  gap: 8,
                  border: "1px solid rgba(212,175,55,.34)",
                  background: "var(--rooming-button-bg)",
                  color: "var(--rooming-text)",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 900,
                }}>
                  <LayoutGrid size={14} />
                  <span>{largeRoomGenerationCopy.countLabel}: {largeRoomGenerationConfirm.roomCount}</span>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
                <Button variant="ghost" onClick={cancelLargeRoomGeneration}>
                  {largeRoomGenerationCopy.cancel}
                </Button>
                <Button onClick={confirmLargeRoomGeneration}>
                  {largeRoomGenerationCopy.confirm}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        <Modal open={roomModal.open} onClose={() => setRoomModal({ open: false, mode: "edit", roomId: null })} title={roomModal.mode === "create" ? (t.addRooms || t.addRoom || "إضافة غرف") : (t.editRoom || "تعديل الغرفة")} width={420} portalContainer={roomingModalPortalContainer}>
          <div className="rooming-modal-surface" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Select label={t.hotel || "الفندق"} value={roomDraft.hotel} onChange={(event) => setRoomDraft((prev) => ({ ...prev, hotel: event.target.value }))} options={(hotelOptions.length ? hotelOptions : [roomDraft.hotel || ""]).map((hotel) => ({ value: hotel, label: hotel || t.noHotel || "غير محدد" }))} />
            <Select label={t.roomType} value={roomDraft.roomType} onChange={(event) => setRoomDraft((prev) => ({ ...prev, roomType: event.target.value }))} options={roomingRoomOptions.map((option) => ({ value: option.value, label: option.label }))} />
            <Select label={t.roomCategory || "تصنيف الغرفة"} value={roomDraft.category} onChange={(event) => setRoomDraft((prev) => ({ ...prev, category: event.target.value }))} options={roomingCategoryOptions.map((option) => ({ value: option.value, label: option.label }))} />
            {roomModal.mode === "create" && (
              <Input
                label={t.roomingRoomCountInput || "عدد الغرف"}
                type="number"
                min="1"
                max="100"
                step="1"
                inputMode="numeric"
                pattern="[0-9]*"
                value={roomDraft.roomCount ?? "1"}
                onWheel={preventNumberInputWheelChange}
                onChange={(event) => {
                  const digits = String(event.target.value || "").replace(/[^\d]/g, "");
                  setRoomDraft((prev) => ({
                    ...prev,
                    roomCount: digits ? String(normalizeRoomCreateCount(digits)) : "",
                  }));
                }}
              />
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Button variant="ghost" onClick={() => setRoomModal({ open: false, mode: "edit", roomId: null })}>{t.cancel}</Button>
              <Button onClick={saveRoomEdit}>{roomModal.mode === "create" ? (t.addRooms || t.add || "إضافة غرف") : t.save}</Button>
            </div>
          </div>
        </Modal>

        <Modal open={pickerOpen} onClose={() => { setPickerOpen(false); setSelectedPilgrimIds([]); setPickerSearch(""); }} title={t.addPilgrim || "إضافة معتمر"} width={560} portalContainer={roomingModalPortalContainer}>
          <div className="rooming-modal-surface" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Input
              label=""
              value={pickerSearch}
              onChange={(event) => setPickerSearch(event.target.value)}
              placeholder={t.roomingPilgrimSearchPlaceholder || "ابحث بالاسم أو الهاتف أو رقم الجواز..."}
            />
            {!compatibleUnassigned.length ? (
              <p style={{ color: "var(--rooming-muted)", fontSize: 12 }}>{t.noCompatiblePilgrims || "لا يوجد معتمرون مناسبون لهذه الغرفة"}</p>
            ) : !filteredCompatibleUnassigned.length ? (
              <p style={{ color: "var(--rooming-muted)", fontSize: 12 }}>{t.roomingNoMatchingPilgrims || "لا توجد نتائج مطابقة"}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 330, overflow: "auto" }}>
                {filteredCompatibleUnassigned.map(({ client }) => {
                  const context = getClientContext(client);
                  const checked = selectedPilgrimIds.includes(client.id);
                  return (
                    <label key={client.id} style={{ display: "flex", gap: 10, padding: 10, borderRadius: 10, border: "1px solid var(--rooming-modal-section-border)", background: checked ? "var(--rooming-list-selected-bg)" : "var(--rooming-list-bg)", cursor: "pointer" }}>
                      <input type="checkbox" checked={checked} onChange={(event) => setSelectedPilgrimIds((prev) => event.target.checked ? [...prev, client.id] : prev.filter((id) => id !== client.id))} />
                      <span>
                        <strong style={{ display: "block", color: "var(--rooming-text)", fontSize: 13 }}>{context.name}</strong>
                        <small style={{ color: "var(--rooming-muted)" }}>{[context.registrationSource, context.roomTypeLabel, context.level || context.hotel].filter(Boolean).join(" • ")}</small>
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
        border: `1px solid ${active ? "rgba(37,99,235,.32)" : "var(--rooming-toolbar-border)"}`,
        background: active ? "var(--rooming-button-active-bg)" : "var(--rooming-button-bg)",
        color: active ? "var(--rooming-button-active-text)" : "var(--rooming-button-text)",
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
  const isDropHovered = Boolean(data.draggingClient && data.hoveredDropRoomId === room.id);
  const dropFeedback = data.draggingClient && data.getDropVisualStatus
    ? data.getDropVisualStatus(data.draggingClient, room)
    : null;
  const dropState = dropFeedback?.state || "";
  const canDrop = dropState === "match";
  const needsDropReview = dropState === "mismatch";
  const cannotDrop = dropState === "invalid";
  const isFullDropTarget = dropState === "full";
  const isInvalidPosition = Boolean(data.dragInvalid);
  const selectionMode = Boolean(data.selectionMode);
  const selectionChecked = Boolean(data.selectionChecked);
  const linkMode = Boolean(data.linkMode);
  const linkActive = Boolean(data.linkActive);
  const dropBorder = isInvalidPosition
    ? "#ef4444"
    : canDrop
      ? "#16a34a"
      : needsDropReview
        ? "#d97706"
        : cannotDrop
          ? "#ef4444"
          : isFullDropTarget
            ? "rgba(100,116,139,.56)"
            : linkActive ? "#2563eb" : selectionChecked ? "#d4af37" : selected ? accent.border : "var(--rooming-card-border)";
  const [menuOpen, setMenuOpen] = React.useState(false);
  const dragHoverDepthRef = React.useRef(0);

  React.useEffect(() => {
    if (data.draggingClient) return;
    dragHoverDepthRef.current = 0;
  }, [data.draggingClient]);

  React.useEffect(() => {
    if (!menuOpen) return undefined;
    const handlePointerDown = () => setMenuOpen(false);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  return (
    <article
      className="rooming-flow-node"
      title={isInvalidPosition ? (t.invalidRoomOverlap || "لا يمكن وضع غرفة فوق غرفة أخرى") : isDropHovered ? (dropFeedback?.message || t.canInsertPilgrimHere || "يمكن إدراج المعتمر هنا") : undefined}
      onContextMenu={(event) => event.stopPropagation()}
      onDragEnter={(event) => {
        if (!data.draggingClient) return;
        event.preventDefault();
        dragHoverDepthRef.current += 1;
        data.onDropHoverEnter?.(room.id);
      }}
      onDragOver={(event) => {
        if (!data.draggingClient) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        data.onDropHoverEnter?.(room.id);
      }}
      onDragLeave={() => {
        if (!data.draggingClient) return;
        dragHoverDepthRef.current = Math.max(0, dragHoverDepthRef.current - 1);
        if (dragHoverDepthRef.current === 0) data.onDropHoverLeave?.(room.id);
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        dragHoverDepthRef.current = 0;
        data.onDropHoverLeave?.(room.id);
        const clientId = event.dataTransfer.getData("application/x-rukn-client-id");
        let clientIds = [];
        try {
          const rawClientIds = event.dataTransfer.getData("application/x-rukn-client-ids");
          const parsed = rawClientIds ? JSON.parse(rawClientIds) : [];
          if (Array.isArray(parsed)) clientIds = parsed.filter(Boolean);
        } catch {
          clientIds = [];
        }
        if (clientIds.length > 1 && data.onDropClients) data.onDropClients(room.id, clientIds, true);
        else if (clientId) data.onDropClient(room.id, clientId, true);
        data.onDragComplete?.();
      }}
      style={{
        width: 250,
        position: "relative",
        background: isInvalidPosition
          ? "var(--rooming-danger-soft-bg)"
          : canDrop
            ? (isDropHovered ? "rgba(22,163,74,.18)" : "rgba(22,163,74,.12)")
            : needsDropReview
              ? (isDropHovered ? "rgba(217,119,6,.13)" : "rgba(217,119,6,.075)")
              : cannotDrop
                ? "var(--rooming-danger-soft-bg)"
                : isFullDropTarget
                  ? "rgba(100,116,139,.09)"
                  : linkActive ? "rgba(37,99,235,.12)" : selectionChecked ? "rgba(212,175,55,.16)" : "var(--rooming-card-bg)",
        border: `1px solid ${dropBorder}`,
        borderRight: `4px solid ${accent.border}`,
        borderRadius: 10,
        outline: isInvalidPosition
          ? "2px solid rgba(239,68,68,.28)"
          : canDrop
            ? (isDropHovered ? "2px solid rgba(22,163,74,.34)" : "1px solid rgba(22,163,74,.18)")
            : needsDropReview
              ? (isDropHovered ? "2px solid rgba(217,119,6,.26)" : "1px solid rgba(217,119,6,.14)")
              : cannotDrop
                ? (isDropHovered ? "2px solid rgba(239,68,68,.30)" : "1px solid rgba(239,68,68,.16)")
                : isFullDropTarget
                  ? (isDropHovered ? "2px solid rgba(100,116,139,.30)" : "1px solid rgba(100,116,139,.16)")
                  : linkActive ? "2px solid rgba(37,99,235,.30)" : selectionChecked ? "2px solid rgba(212,175,55,.34)" : "none",
        boxShadow: isInvalidPosition
          ? "0 18px 40px rgba(239,68,68,.20)"
          : canDrop
          ? (isDropHovered ? "0 18px 40px rgba(22,163,74,.22)" : "0 12px 28px rgba(22,163,74,.13)")
          : needsDropReview
            ? (isDropHovered ? "0 16px 36px rgba(217,119,6,.17)" : "0 10px 24px rgba(217,119,6,.10)")
            : cannotDrop
              ? (isDropHovered ? "0 16px 36px rgba(239,68,68,.18)" : "0 10px 24px rgba(239,68,68,.11)")
              : isFullDropTarget
                ? (isDropHovered ? "0 16px 34px rgba(100,116,139,.16)" : "0 8px 20px rgba(100,116,139,.10)")
                : selectionChecked ? "0 16px 34px rgba(212,175,55,.18)"
                : selected ? "0 14px 30px rgba(37,99,235,.18)" : "var(--rooming-card-shadow)",
        opacity: isFullDropTarget ? 0.78 : 1,
        padding: 12,
        direction: "rtl",
        fontFamily: "'Cairo',sans-serif",
        cursor: selectionMode ? "pointer" : room.locked ? "default" : "grab",
      }}
    >
      <Handle
        className="room-link-handle room-link-source-handle"
        type="source"
        position={Position.Right}
        isConnectable={linkMode}
        style={{
          top: 18,
          right: 9,
          width: 24,
          height: 24,
          borderRadius: 999,
          border: `2px solid ${linkActive ? "rgba(37,99,235,.95)" : "rgba(37,99,235,.72)"}`,
          background: linkMode ? (linkActive ? "var(--rooming-button-active-bg)" : "var(--rooming-button-bg)") : "transparent",
          boxShadow: linkMode ? "0 0 0 5px rgba(37,99,235,.14), 0 10px 22px rgba(15,23,42,.18)" : "none",
          opacity: linkMode ? 1 : 0,
          pointerEvents: linkMode ? "auto" : "none",
          cursor: linkMode ? "crosshair" : "default",
          zIndex: 7,
        }}
      />
      <Handle
        className="room-link-handle room-link-target-handle"
        type="target"
        position={Position.Left}
        isConnectable={linkMode}
        style={{
          top: 18,
          left: 9,
          width: 22,
          height: 22,
          borderRadius: 999,
          border: "2px solid rgba(154,116,24,.72)",
          background: linkMode ? "var(--rooming-button-bg)" : "transparent",
          boxShadow: linkMode ? "0 0 0 5px rgba(212,175,55,.13), 0 10px 22px rgba(15,23,42,.16)" : "none",
          opacity: linkMode ? 1 : 0,
          pointerEvents: linkMode ? "auto" : "none",
          cursor: linkMode ? "crosshair" : "default",
          zIndex: 7,
        }}
      />
      {linkMode && (
        <>
        <span style={{
          position: "absolute",
          top: 8,
          insetInlineEnd: 8,
          width: 24,
          height: 24,
          borderRadius: 999,
          border: `1px solid ${linkActive ? "rgba(37,99,235,.86)" : "rgba(37,99,235,.48)"}`,
          background: linkActive ? "var(--rooming-button-active-bg)" : "var(--rooming-button-bg)",
          color: linkActive ? "var(--rooming-button-active-text)" : "var(--rooming-muted)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 18px rgba(15,23,42,.12)",
          pointerEvents: "none",
          zIndex: 6,
        }}>
          <Link2 size={12} />
        </span>
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 9,
            insetInlineStart: 9,
            width: 22,
            height: 22,
            borderRadius: 999,
            border: "1px solid rgba(154,116,24,.58)",
            background: "var(--rooming-button-bg)",
            color: "rgba(154,116,24,.92)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 18px rgba(15,23,42,.12)",
            pointerEvents: "none",
            zIndex: 6,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "currentColor", boxShadow: "0 0 0 3px rgba(212,175,55,.16)" }} />
        </span>
        </>
      )}
      {selectionMode && (
        <span style={{
          position: "absolute",
          top: 8,
          insetInlineStart: 8,
          width: 20,
          height: 20,
          borderRadius: 999,
          border: `1px solid ${selectionChecked ? "rgba(212,175,55,.95)" : "rgba(148,163,184,.32)"}`,
          background: selectionChecked ? "#d4af37" : "var(--rooming-button-bg)",
          color: selectionChecked ? "#fff" : "transparent",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 900,
          boxShadow: "0 8px 18px rgba(15,23,42,.14)",
          pointerEvents: "none",
          zIndex: 2,
        }}>
          ✓
        </span>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
        <span className="rooming-category-badge" style={{
          "--category-dark-bg": accent.darkBg,
          "--category-dark-text": accent.darkText,
          "--category-dark-border": accent.darkBorder,
          color: accent.text,
          background: accent.bg,
          border: `1px solid ${accent.border}`,
          borderRadius: 999,
          padding: "4px 8px",
          fontSize: 11,
          fontWeight: 900,
        }}>
          {translateRoomCategory(room.category, lang) || getRoomingCategoryLabel(room.category)}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "var(--rooming-text)", fontSize: 12, fontWeight: 900 }}>{occupantIds.length}/{capacity}</span>
          {isFull && (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              border: "1px solid rgba(34,197,94,.32)",
              background: "rgba(22,163,74,.14)",
              color: "var(--rukn-text)",
              borderRadius: 999,
              padding: "2px 6px",
              fontSize: 9,
              fontWeight: 900,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: "#16a34a" }} />
              {t.roomingFullBadge || "مكتملة"}
            </span>
          )}
          {room.locked && <Lock size={13} color="var(--rooming-muted)" title={t.roomLocked || "الغرفة مقفلة"} />}
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
                border: "1px solid var(--rooming-toolbar-border)",
                background: "var(--rooming-button-bg)",
                color: "var(--rooming-button-text)",
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
      <p style={{ color: "var(--rooming-text)", fontSize: 13, fontWeight: 900, marginBottom: 4 }}>
        {translateRoomType(room.roomType, lang) || getRoomingRoomLabel(room.roomType)}
      </p>
      <p style={{ color: "var(--rooming-muted)", fontSize: 11, marginBottom: 10 }}>{room.hotel || t.roomingMissingHotel || "فندق غير محدد"}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, minHeight: 54 }}>
        {occupantIds.map((clientId) => {
          const client = data.clientsById[clientId];
          const source = getClientRegistrationSource(client);
          return (
            <div key={clientId} style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              color: "var(--rooming-chip-text)",
              fontSize: 12,
              fontWeight: 800,
              padding: "5px 7px",
              borderRadius: 8,
              border: "1px solid var(--rooming-chip-border)",
              background: "var(--rooming-chip-bg)",
            }}>
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
                    border: "1px solid var(--rooming-chip-border)",
                    background: "var(--rooming-source-bg)",
                    color: "var(--rooming-source-text)",
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
                style={{
                  width: 20,
                  height: 20,
                  border: "1px solid var(--rooming-chip-border)",
                  background: "var(--rooming-button-bg)",
                  color: "var(--rooming-muted)",
                  cursor: "pointer",
                  fontSize: 14,
                  lineHeight: 1,
                  borderRadius: 7,
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>
          );
        })}
        {occupantIds.length < capacity && (
          <span style={{ color: "var(--rooming-muted)", fontSize: 12 }}>{t.emptySlot || "مكان شاغر"}</span>
        )}
      </div>
    </article>
  );
}, (prev, next) => (
  prev.selected === next.selected
  && prev.data.room === next.data.room
  && prev.data.clientsById === next.data.clientsById
  && prev.data.draggingClientId === next.data.draggingClientId
  && prev.data.hoveredDropRoomId === next.data.hoveredDropRoomId
  && prev.data.dragInvalid === next.data.dragInvalid
  && prev.data.selectionMode === next.data.selectionMode
  && prev.data.selectionChecked === next.data.selectionChecked
  && prev.data.linkMode === next.data.linkMode
  && prev.data.linkActive === next.data.linkActive
  && prev.data.onAdd === next.data.onAdd
  && prev.data.onEdit === next.data.onEdit
  && prev.data.onCopy === next.data.onCopy
  && prev.data.onToggleLock === next.data.onToggleLock
  && prev.data.onDelete === next.data.onDelete
  && prev.data.onRemoveClient === next.data.onRemoveClient
  && prev.data.onDropClient === next.data.onDropClient
  && prev.data.onDropClients === next.data.onDropClients
  && prev.data.onDragComplete === next.data.onDragComplete
  && prev.data.onDropHoverEnter === next.data.onDropHoverEnter
  && prev.data.onDropHoverLeave === next.data.onDropHoverLeave
  && prev.data.getDropReason === next.data.getDropReason
  && prev.data.getDropVisualStatus === next.data.getDropVisualStatus
));

function RoomingProximityEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
  selected,
}) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const isSelected = Boolean(selected || data?.selected);
  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {isSelected && (
        <EdgeLabelRenderer>
          <button
            type="button"
            title={data?.deleteLabel || "Delete link"}
            aria-label={data?.deleteLabel || "Delete link"}
            className="nodrag nopan"
            onClick={(event) => {
              event.stopPropagation();
              data?.onDelete?.(data?.linkId || id);
            }}
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              width: 24,
              height: 24,
              borderRadius: 999,
              border: "1px solid var(--rooming-popover-border)",
              background: "var(--rooming-popover-bg)",
              color: "var(--rooming-danger-text)",
              boxShadow: "0 10px 24px rgba(15,23,42,.18)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              cursor: "pointer",
              pointerEvents: "all",
              zIndex: 20,
            }}
          >
            <Trash2 size={13} />
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const ROOMING_NODE_TYPES = Object.freeze({ room: RoomingFlowNode });
const ROOMING_EDGE_TYPES = Object.freeze({ roomProximity: RoomingProximityEdge });
const ROOMING_EDGES = Object.freeze([]);
const ROOMING_FIT_VIEW_OPTIONS = Object.freeze({ padding: 0.18 });
const ROOMING_PRO_OPTIONS = Object.freeze({ hideAttribution: true });

function RoomingMenu({ open, children, align = "start", width = 220 }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        [align === "end" ? "insetInlineEnd" : "insetInlineStart"]: 0,
        width,
        background: "var(--rooming-popover-bg)",
        border: "1px solid var(--rooming-popover-border)",
        borderRadius: 12,
        boxShadow: "var(--rooming-popover-shadow)",
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
        background: active ? "var(--rooming-button-active-bg)" : "transparent",
        color: destructive ? "var(--rooming-danger-text)" : active ? "var(--rooming-button-active-text)" : "var(--rooming-button-text)",
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
  edges = ROOMING_EDGES,
  onNodesChange,
  selectedRoomId,
  onNodeClick,
  onConnect,
  onConnectStart,
  onConnectEnd,
  isValidConnection,
  onEdgeClick,
  onEdgeContextMenu,
  onNodeDragStart,
  onNodeDrag,
  onNodeDragStop,
  onPaneContextMenu,
  onPaneClick,
  onInit,
  panelOpen,
  linkMode = false,
  nodesDraggable = true,
}) {
  const flow = useReactFlow();

  React.useEffect(() => {
    onInit?.(flow);
  }, [flow, onInit]);

  return (
    <ReactFlow
      className="rooming-flow-canvas"
      nodes={nodes}
      edges={edges}
      nodeTypes={ROOMING_NODE_TYPES}
      edgeTypes={ROOMING_EDGE_TYPES}
      fitView
      fitViewOptions={ROOMING_FIT_VIEW_OPTIONS}
      minZoom={0.35}
      maxZoom={1.6}
      panOnDrag
      zoomOnScroll
      zoomOnPinch
      nodesDraggable={nodesDraggable}
      onlyRenderVisibleElements
      nodeDragThreshold={2}
      nodesConnectable={linkMode}
      connectOnClick={false}
      connectionLineStyle={{
        stroke: "var(--rooming-link-selected)",
        strokeWidth: 1.8,
      }}
      onConnect={onConnect}
      onConnectStart={onConnectStart}
      onConnectEnd={onConnectEnd}
      isValidConnection={isValidConnection}
      elementsSelectable
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onEdgeContextMenu={onEdgeContextMenu}
      onNodesChange={onNodesChange}
      onNodeDragStart={onNodeDragStart}
      onNodeDrag={onNodeDrag}
      onNodeDragStop={onNodeDragStop}
      onPaneContextMenu={onPaneContextMenu}
      onPaneClick={onPaneClick}
      proOptions={ROOMING_PRO_OPTIONS}
      style={{ width: "100%", height: "100%", background: "var(--rooming-canvas-bg)" }}
    >
      <Background variant="dots" color="var(--rooming-canvas-dot)" gap={22} size={1.55} />
      <Controls position="bottom-left" showInteractive={false} />
      <MiniMap position="bottom-right" pannable zoomable nodeStrokeWidth={2} nodeColor="var(--rooming-button-active-text)" maskColor="var(--rooming-minimap-mask)" />
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
      const colspan = Math.max(1, Math.min(200, Number.parseInt(merge?.[0], 10) || 1));
      const rowspan = Math.max(1, Math.min(2000, Number.parseInt(merge?.[1], 10) || 1));
      const attrs = merge ? ` colspan="${colspan}" rowspan="${rowspan}"` : "";
      const style = payload.style?.[cell] || "";
      return `<td${attrs} style="${escapeHtml(style)}">${escapeHtml(value).replace(/\n/g, "<br/>")}</td>`;
    }).join("")}</tr>`).join("");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(ROOMING_CITY_LABELS[city])}</title>
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
// HEADER SELECT CHECKBOX
// ═══════════════════════════════════════
function HeaderSelectCheckbox({ checked, indeterminate, onChange, label }) {
  const inputRef = React.useRef(null);
  React.useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);

  return (
    <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        style={{
          width: 18,
          height: 18,
          accentColor: "#fff",
          cursor: "pointer",
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,.25))",
        }}
      />
    </span>
  );
}
