import React from "react";
import { Button } from "./UI";
import { useLang } from "../hooks/useLang";
import { theme } from "./styles";
import { AppIcon, IconBubble } from "./Icon";

const tc = theme.colors;
const previewText = "var(--rukn-text)";
const previewStrongText = "var(--rukn-text-strong)";
const previewMutedText = "var(--rukn-text-muted)";
const previewInputBg = "var(--rukn-bg-input)";
const previewSectionBg = "var(--rukn-section-bg)";
const previewTableHeadBg = "var(--rukn-table-head-bg)";
const previewBorder = "var(--rukn-border-soft)";
const previewInputBorder = "var(--rukn-border-input)";

const FIELD_DEFS = [
  {
    key: "fullName",
    label: { ar: "الاسم الكامل", fr: "Nom complet", en: "Full name" },
    aliases: ["الاسم", "الاسم الكامل", "اسم المعتمر", "اسم الحاج", "الاسم واللقب", "الإسم الكامل", "الاسم الكامل بالعربية", "nom complet", "nom et prenom", "nom et prénom", "nom & prenom", "nom & prénom", "nom prenom", "nom prénom", "passager", "pelerin", "pèlerin", "pélerin", "client", "full name", "name", "passenger name", "pilgrim name", "client name"],
  },
  {
    key: "arabicLastName",
    label: { ar: "الاسم العائلي", fr: "Nom arabe", en: "Arabic last name" },
    aliases: ["الاسم العائلي بالعربية", "الاسم العائلي", "النسب", "اللقب", "nom arabe", "nom en arabe"],
  },
  {
    key: "arabicFirstName",
    label: { ar: "الاسم الشخصي", fr: "Prénom arabe", en: "Arabic first name" },
    aliases: ["الاسم الشخصي بالعربية", "الاسم الشخصي", "prenom arabe", "prénom arabe", "prenom en arabe", "prénom en arabe"],
  },
  {
    key: "latinFullName",
    label: { ar: "الاسم اللاتيني", fr: "Nom complet latin", en: "Full latin name" },
    aliases: ["الاسم اللاتيني", "الاسم بالحروف اللاتينية", "nom complet latin", "full latin name", "latin name"],
  },
  {
    key: "latinLastName",
    label: { ar: "اللقب اللاتيني", fr: "Nom latin", en: "Latin last name" },
    aliases: ["اللقب اللاتيني", "الاسم العائلي اللاتيني", "nom latin", "latin last name", "nom", "surname", "last name"],
  },
  {
    key: "latinFirstName",
    label: { ar: "الاسم الشخصي اللاتيني", fr: "Prénom latin", en: "Latin first name" },
    aliases: ["الاسم الشخصي اللاتيني", "prenom", "prénom", "given name", "prenom latin", "prénom latin", "latin first name", "first name"],
  },
  {
    key: "phone",
    label: { ar: "الهاتف", fr: "Téléphone", en: "Phone" },
    aliases: ["الهاتف", "رقم الهاتف", "الجوال", "النقال", "telephone", "téléphone", "tel", "tél", "phone", "mobile"],
  },
  {
    key: "passportNo",
    label: { ar: "رقم الجواز", fr: "Passeport", en: "Passport number" },
    aliases: ["رقم الجواز", "جواز السفر", "n passeport", "numero passeport", "numéro passeport", "passeport", "passport", "passport no", "passport number"],
  },
  {
    key: "nationality",
    label: { ar: "الجنسية", fr: "Nationalité", en: "Nationality" },
    aliases: ["الجنسية", "nationalite", "nationalité", "nationality"],
  },
  {
    key: "birthDate",
    label: { ar: "تاريخ الميلاد", fr: "Date de naissance", en: "Birth date" },
    aliases: ["تاريخ الميلاد", "تاريخ الازدياد", "date naissance", "date de naissance", "birth date", "date of birth"],
  },
  {
    key: "passportIssue",
    label: { ar: "إصدار الجواز", fr: "Délivrance passeport", en: "Passport issue" },
    aliases: ["تاريخ إصدار الجواز", "تاريخ اصدار الجواز", "date de delivrance du passeport", "date de délivrance du passeport", "date delivrance passeport", "passport issue date", "issue date"],
  },
  {
    key: "passportExpiry",
    label: { ar: "انتهاء الجواز", fr: "Expiration passeport", en: "Passport expiry" },
    aliases: ["تاريخ انتهاء الجواز", "تاريخ انتهاء الصلاحية", "date expiration passeport", "date expiration", "expiration passeport", "passport expiry", "expiry date"],
  },
  {
    key: "gender",
    label: { ar: "الجنس", fr: "Sexe", en: "Gender" },
    aliases: ["الجنس", "النوع", "sexe", "gender"],
  },
  {
    key: "cin",
    label: { ar: "البطاقة الوطنية", fr: "CIN / CNI", en: "National ID" },
    aliases: ["رقم البطاقة الوطنية", "البطاقة الوطنية", "cin", "cni", "national id", "id number"],
  },
  {
    key: "registrationSource",
    label: { ar: "جهة التسجيل", fr: "Source", en: "Registration source" },
    aliases: ["جهة التسجيل", "المصدر", "source", "registration source", "agence", "وكالة"],
  },
  {
    key: "notes",
    label: { ar: "ملاحظات", fr: "Notes", en: "Notes" },
    aliases: ["ملاحظات", "ملاحظة", "notes", "remarques"],
  },
  {
    key: "city",
    label: { ar: "المدينة", fr: "Ville", en: "City" },
    aliases: ["المدينة", "city", "ville"],
  },
  {
    key: "salePrice",
    label: { ar: "السعر", fr: "Prix", en: "Price" },
    aliases: ["السعر", "سعر البيع", "price", "prix", "tarif", "montant", "مبلغ"],
  },
  {
    key: "level",
    label: { ar: "المستوى", fr: "Niveau", en: "Level" },
    aliases: ["المستوى", "الفئة", "level", "niveau", "package"],
  },
  {
    key: "roomType",
    label: { ar: "نوع الغرفة", fr: "Type de chambre", en: "Room type" },
    aliases: ["نوع الغرفة", "الغرفة", "room type", "room", "type chambre", "type de chambre", "chambre"],
  },
];

const OFFICIAL_TEMPLATE_BY_LANG = {
  ar: {
    title: "قالب استيراد المعتمرين والحجاج - ركن",
    sheetName: "قالب ركن",
    filename: "rukn-excel-template-ar.xlsx",
    direction: "rtl",
    genderOptions: ["ذكر", "أنثى"],
    roomTypeOptions: ["ثنائية", "ثلاثية", "رباعية", "خماسية"],
    headers: [
      "الاسم العائلي بالعربية",
      "الاسم الشخصي بالعربية",
      "Nom latin",
      "Prénom latin",
      "رقم الهاتف",
      "رقم الجواز",
      "الجنسية",
      "تاريخ الميلاد",
      "تاريخ إصدار الجواز",
      "تاريخ انتهاء الجواز",
      "الجنس",
      "CIN",
      "جهة التسجيل",
      "نوع الغرفة",
      "ملاحظات",
    ],
  },
  fr: {
    title: "Modèle d’import des pèlerins - Rukn",
    sheetName: "Modèle Rukn",
    filename: "modele-excel-rukn-fr.xlsx",
    direction: "ltr",
    genderOptions: ["Homme", "Femme"],
    roomTypeOptions: ["Double", "Triple", "Quadruple", "Quintuple"],
    headers: [
      "Nom en arabe",
      "Prénom en arabe",
      "Nom latin",
      "Prénom latin",
      "Téléphone",
      "Numéro de passeport",
      "Nationalité",
      "Date de naissance",
      "Date de délivrance du passeport",
      "Date d’expiration du passeport",
      "Sexe",
      "CIN",
      "Source d’inscription",
      "Type de chambre",
      "Notes",
    ],
  },
  en: {
    title: "Rukn Pilgrims Import Template",
    sheetName: "Rukn Template",
    filename: "rukn-excel-template-en.xlsx",
    direction: "ltr",
    genderOptions: ["Male", "Female"],
    roomTypeOptions: ["Double", "Triple", "Quad", "Quint"],
    headers: [
      "Arabic last name",
      "Arabic first name",
      "Latin last name",
      "Latin first name",
      "Phone",
      "Passport number",
      "Nationality",
      "Date of birth",
      "Passport issue date",
      "Passport expiry date",
      "Gender",
      "National ID",
      "Registration source",
      "Room type",
      "Notes",
    ],
  },
};

const OFFICIAL_TEMPLATE_FIELD_KEYS = [
  "arabicLastName",
  "arabicFirstName",
  "latinLastName",
  "latinFirstName",
  "phone",
  "passportNo",
  "nationality",
  "birthDate",
  "passportIssue",
  "passportExpiry",
  "gender",
  "cin",
  "registrationSource",
  "roomType",
  "notes",
];

const getTemplateConfig = (lang) => OFFICIAL_TEMPLATE_BY_LANG[lang] || OFFICIAL_TEMPLATE_BY_LANG.ar;

const getOfficialHeaderMap = () => {
  const entries = [];
  Object.values(OFFICIAL_TEMPLATE_BY_LANG).forEach((config) => {
    config.headers.forEach((header, index) => {
      entries.push([normalizeHeader(header), OFFICIAL_TEMPLATE_FIELD_KEYS[index]]);
    });
  });
  return new Map(entries);
};

const normalizeHeader = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[’'`´.،:;()_[\]{}#№°/-]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const OFFICIAL_HEADER_MAP = getOfficialHeaderMap();

const normalizeComparable = (value) => normalizeHeader(value)
  .replace(/[^\p{L}\p{N}\s]/gu, "")
  .replace(/\s+/g, " ")
  .trim();

const cellText = (value) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return String(value).trim();
};

const rowHasValue = (row = []) => row.some((value) => cellText(value));

const langText = (lang, values) => values[lang] || values.ar;

const fieldLabel = (key, lang) => {
  const def = FIELD_DEFS.find((field) => field.key === key);
  return def ? langText(lang, def.label) : key;
};

const findHeaderIndex = (normalizedHeaders, aliases, used = new Set(), { loose = true } = {}) => {
  const normalizedAliases = aliases.map(normalizeHeader);
  let index = normalizedHeaders.findIndex((header, idx) => !used.has(idx) && normalizedAliases.includes(header));
  if (index !== -1 || !loose) return index;
  return normalizedHeaders.findIndex((header, idx) => (
    !used.has(idx)
    && normalizedAliases.some((alias) => header && alias && (header.includes(alias) || alias.includes(header)))
  ));
};

const setMappingIfFound = (mapping, used, key, index, { reserve = true } = {}) => {
  if (index === -1 || index === undefined || mapping[key] !== undefined) return false;
  mapping[key] = String(index);
  if (reserve) used.add(index);
  return true;
};

const detectOfficialTemplateColumns = (headers = []) => {
  const mapping = {};
  headers.forEach((header, index) => {
    const key = OFFICIAL_HEADER_MAP.get(normalizeHeader(header));
    if (key && mapping[key] === undefined) mapping[key] = String(index);
  });
  const matchedCount = Object.keys(mapping).length;
  const hasSeparatedLatin = mapping.latinLastName !== undefined && mapping.latinFirstName !== undefined;
  const hasCoreIdentity = mapping.arabicLastName !== undefined && mapping.arabicFirstName !== undefined;
  return {
    mapping,
    isOfficial: matchedCount >= 10 && hasSeparatedLatin && hasCoreIdentity,
  };
};

const detectColumns = (headers = []) => {
  const official = detectOfficialTemplateColumns(headers);
  if (official.isOfficial) return official.mapping;

  const normalizedHeaders = headers.map(normalizeHeader);
  const mapping = {};
  const used = new Set();

  const fullNameIndex = findHeaderIndex(normalizedHeaders, [
    "الاسم الكامل",
    "اسم المعتمر",
    "اسم الحاج",
    "الاسم واللقب",
    "الإسم الكامل",
    "الاسم الكامل بالعربية",
    "nom complet",
    "nom et prenom",
    "nom et prénom",
    "nom & prenom",
    "nom & prénom",
    "nom prenom",
    "nom prénom",
    "passager",
    "pelerin",
    "pèlerin",
    "pélerin",
    "client",
    "full name",
    "passenger name",
    "pilgrim name",
    "client name",
    "name",
  ], used);
  setMappingIfFound(mapping, used, "fullName", fullNameIndex);

  const firstNameIndex = findHeaderIndex(normalizedHeaders, [
    "الاسم الشخصي",
    "الاسم الشخصي بالعربية",
    "prenom",
    "prénom",
    "first name",
    "given name",
  ], used);
  const lastNameIndex = findHeaderIndex(normalizedHeaders, [
    "الاسم العائلي",
    "الاسم العائلي بالعربية",
    "النسب",
    "اللقب",
    "nom",
    "last name",
    "surname",
  ], used);
  if (firstNameIndex !== -1 || lastNameIndex !== -1) {
    setMappingIfFound(mapping, used, "arabicFirstName", firstNameIndex);
    setMappingIfFound(mapping, used, "arabicLastName", lastNameIndex);
    setMappingIfFound(mapping, used, "latinFirstName", firstNameIndex, { reserve: false });
    setMappingIfFound(mapping, used, "latinLastName", lastNameIndex, { reserve: false });
  }

  if (mapping.fullName === undefined) {
    const singleNameIndex = findHeaderIndex(normalizedHeaders, ["الاسم", "nom", "name"], used);
    setMappingIfFound(mapping, used, "fullName", singleNameIndex);
  }

  FIELD_DEFS.forEach((field) => {
    if (mapping[field.key] !== undefined) return;
    const index = findHeaderIndex(normalizedHeaders, field.aliases, used);
    setMappingIfFound(mapping, used, field.key, index);
  });

  return mapping;
};

const getUnknownColumns = (headers = [], mapping = {}) => {
  const used = new Set(Object.values(mapping).filter((value) => value !== "" && value !== undefined).map(String));
  return headers.filter((_, index) => !used.has(String(index))).map((header, index) => header || `Col ${index + 1}`);
};

const excelSerialToIso = (value) => {
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial < 1 || serial > 80000) return "";
  const utcDays = Math.floor(serial - 25569);
  const date = new Date(utcDays * 86400 * 1000);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const validIsoDate = (year, month, day) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "";
  return date.toISOString().slice(0, 10);
};

const parseDateValue = (value) => {
  if (value === null || value === undefined || value === "") return { value: "", invalid: false };
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? { value: "", invalid: true }
      : { value: value.toISOString().slice(0, 10), invalid: false };
  }
  if (typeof value === "number") {
    const iso = excelSerialToIso(value);
    return iso ? { value: iso, invalid: false } : { value: "", invalid: true };
  }
  const raw = String(value).trim();
  if (!raw) return { value: "", invalid: false };
  let match = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (match) {
    const iso = validIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
    return iso ? { value: iso, invalid: false } : { value: "", invalid: true };
  }
  match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const iso = validIsoDate(Number(match[3]), Number(match[2]), Number(match[1]));
    return iso ? { value: iso, invalid: false } : { value: "", invalid: true };
  }
  return { value: "", invalid: true };
};

const normalizeGender = (value) => {
  const raw = normalizeHeader(value);
  if (!raw) return "";
  if (["ذكر", "m", "male", "homme", "masculin"].includes(raw)) return "male";
  if (["انثى", "أنثى", "f", "female", "femme", "feminin", "féminin"].map(normalizeHeader).includes(raw)) return "female";
  return "";
};

const parsePrice = (value) => {
  const raw = cellText(value).replace(/\s/g, "").replace(",", ".");
  if (!raw) return 0;
  const number = Number(raw.replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const splitName = (value) => {
  const parts = cellText(value).split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: parts[0] || "", last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
};

const getMappedCell = (row, mapping, key) => {
  const index = mapping[key];
  if (index === undefined || index === "") return "";
  return row[Number(index)];
};

const buildName = (fields) => {
  const direct = cellText(fields.fullName);
  if (direct) return direct;
  const arabic = [cellText(fields.arabicFirstName), cellText(fields.arabicLastName)].filter(Boolean).join(" ");
  if (arabic) return arabic;
  const latin = cellText(fields.latinFullName) || [cellText(fields.latinFirstName), cellText(fields.latinLastName)].filter(Boolean).join(" ");
  return latin;
};

const normalizePassport = (value) => cellText(value).replace(/\s+/g, "").toUpperCase();
const normalizePhone = (value) => cellText(value).replace(/[^\d+]/g, "");

const namesLookSimilar = (a, b) => {
  const left = normalizeComparable(a);
  const right = normalizeComparable(b);
  if (!left || !right) return false;
  if (left === right || left.includes(right) || right.includes(left)) return true;
  const leftTokens = new Set(left.split(/\s+/).filter((part) => part.length > 2));
  return right.split(/\s+/).some((token) => token.length > 2 && leftTokens.has(token));
};

const labelsFor = (lang, t = {}) => ({
  accepted: lang === "fr" ? "Acceptée" : lang === "en" ? "Accepted" : "مقبول",
  rejected: lang === "fr" ? "Rejetée" : lang === "en" ? "Rejected" : "مرفوض",
  needsCompletion: t.informationIncompleteBadge || (lang === "fr" ? "Informations à compléter" : lang === "en" ? "Information needs completion" : "يرجى إكمال المعلومات"),
  unassigned: t.unassignedProgramBadge || (lang === "fr" ? "Non affecté à un programme" : lang === "en" ? "Not assigned to a program" : "غير مدرج في أي برنامج"),
  invalidDate: t.importInvalidDate || (lang === "fr" ? "Date invalide" : lang === "en" ? "Invalid date" : "تاريخ غير صالح"),
  possibleDuplicate: t.importPossibleDuplicate || (lang === "fr" ? "Doublon possible" : lang === "en" ? "Possible duplicate" : "تكرار محتمل"),
  passportExists: t.importPassportExists || (lang === "fr" ? "Passeport déjà existant" : lang === "en" ? "Passport number already exists" : "رقم الجواز موجود مسبقًا"),
  phoneExists: t.importPhoneExists || (lang === "fr" ? "Téléphone déjà existant" : lang === "en" ? "Phone number already exists" : "رقم الهاتف موجود مسبقًا"),
  missingName: t.importNoNameRow || (lang === "fr" ? "Aucun nom sur cette ligne" : lang === "en" ? "No name in this row" : "لا يوجد اسم في هذا السطر"),
  emptyRow: t.importEmptyRow || (lang === "fr" ? "Ligne vide" : lang === "en" ? "Empty row" : "سطر فارغ"),
  unknownColumns: t.importUnknownColumns || (lang === "fr" ? "Colonnes non reconnues" : lang === "en" ? "Unknown columns" : "أعمدة غير معروفة"),
  recognizedColumns: t.importRecognizedColumns || (lang === "fr" ? "Colonnes reconnues" : lang === "en" ? "Recognized columns" : "الأعمدة التي تم التعرف عليها"),
});

const setCellStyle = (ws, cell, style) => {
  if (!ws[cell]) return;
  ws[cell].s = style;
};

const applyColumnFormat = (ws, XLSX, columns, rowStart = 4, rowEnd = 200, format = "@") => {
  columns.forEach((index) => {
    const col = XLSX.utils.encode_col(index);
    for (let row = rowStart; row <= rowEnd; row += 1) {
      const cell = `${col}${row}`;
      if (!ws[cell]) ws[cell] = { t: "s", v: "" };
      ws[cell].z = format;
    }
  });
};

const addListValidation = (ws, XLSX, columnIndex, values, rowStart = 4, rowEnd = 200) => {
  const col = XLSX.utils.encode_col(columnIndex);
  const sqref = `${col}${rowStart}:${col}${rowEnd}`;
  const formula = `"${values.join(",").replace(/"/g, '""')}"`;
  const validation = {
    sqref,
    type: "list",
    allowBlank: true,
    showErrorMessage: true,
    formula1: formula,
    formulas: [formula],
  };
  ws["!dataValidations"] = [...(ws["!dataValidations"] || []), validation];
  ws["!dataValidation"] = [...(ws["!dataValidation"] || []), validation];
};

const escapeXml = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const injectExcelDataValidations = async (workbookArray, validations = []) => {
  if (!validations.length) return workbookArray;
  const zipModule = await import("pizzip");
  const PizZip = zipModule.default || zipModule;
  const zip = new PizZip(workbookArray);
  const sheetPath = "xl/worksheets/sheet1.xml";
  const sheetFile = zip.file(sheetPath);
  if (!sheetFile) return workbookArray;
  const xml = sheetFile.asText();
  if (xml.includes("<dataValidations")) return workbookArray;
  const validationXml = `<dataValidations count="${validations.length}">${validations.map((validation) => (
    `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${escapeXml(validation.sqref)}"><formula1>${escapeXml(validation.formula)}</formula1></dataValidation>`
  )).join("")}</dataValidations>`;
  const insertionPoint = xml.includes("<pageMargins")
    ? xml.indexOf("<pageMargins")
    : xml.indexOf("</worksheet>");
  if (insertionPoint === -1) return workbookArray;
  zip.file(sheetPath, `${xml.slice(0, insertionPoint)}${validationXml}${xml.slice(insertionPoint)}`);
  return zip.generate({
    type: "arraybuffer",
    compression: "DEFLATE",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};

const saveWorkbookArray = (workbookArray, filename) => {
  const blob = new Blob([workbookArray], {
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

const downloadOfficialTemplate = async (lang) => {
  const XLSX = await import("xlsx");
  const config = getTemplateConfig(lang);
  const rows = [[config.title], [], config.headers];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const lastColumn = config.headers.length - 1;
  const lastDataRow = 200;
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastDataRow - 1, c: lastColumn } });
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastColumn } }];
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({ s: { r: 2, c: 0 }, e: { r: 2, c: lastColumn } }),
  };
  ws["!freeze"] = {
    xSplit: 0,
    ySplit: 3,
    topLeftCell: "A4",
    activePane: "bottomLeft",
    state: "frozen",
  };
  ws["!cols"] = config.headers.map((header) => ({
    wch: Math.min(Math.max(String(header).length + 4, 16), 30),
  }));
  ws["!dir"] = config.direction;

  setCellStyle(ws, "A1", {
    font: { bold: true, sz: 15, color: { rgb: "111827" } },
    alignment: { horizontal: "center" },
  });
  config.headers.forEach((_, index) => {
    const cell = `${XLSX.utils.encode_col(index)}3`;
    setCellStyle(ws, cell, {
      font: { bold: true, color: { rgb: "111827" } },
      alignment: { horizontal: config.direction === "rtl" ? "right" : "left" },
    });
  });

  applyColumnFormat(ws, XLSX, [4, 5, 11], 4, lastDataRow, "@");
  applyColumnFormat(ws, XLSX, [7, 8, 9], 4, lastDataRow, "yyyy-mm-dd");
  const validations = [
    {
      sqref: `${XLSX.utils.encode_col(10)}4:${XLSX.utils.encode_col(10)}${lastDataRow}`,
      formula: `"${config.genderOptions.join(",")}"`,
    },
    {
      sqref: `${XLSX.utils.encode_col(13)}4:${XLSX.utils.encode_col(13)}${lastDataRow}`,
      formula: `"${config.roomTypeOptions.join(",")}"`,
    },
  ];
  addListValidation(ws, XLSX, 10, config.genderOptions, 4, lastDataRow);
  addListValidation(ws, XLSX, 13, config.roomTypeOptions, 4, lastDataRow);

  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: config.direction === "rtl" }] };
  XLSX.utils.book_append_sheet(wb, ws, config.sheetName);
  const workbookArray = XLSX.write(wb, { bookType: "xlsx", type: "array", compression: true });
  const workbookWithDropdowns = await injectExcelDataValidations(workbookArray, validations);
  saveWorkbookArray(workbookWithDropdowns, config.filename);
};

const buildPreviewRows = ({ rawRows, mapping, edits, existingClients, lang, t, programContext }) => {
  const labels = labelsFor(lang, t);
  const existingPassports = new Map();
  const existingPhones = new Map();
  existingClients.forEach((client) => {
    const passport = normalizePassport(client.passport?.number || client.passportNo || client.passport_no);
    if (passport) existingPassports.set(passport, client);
    const phone = normalizePhone(client.phone);
    if (phone) {
      if (!existingPhones.has(phone)) existingPhones.set(phone, []);
      existingPhones.get(phone).push(client);
    }
  });

  return rawRows.map((entry) => {
    const fields = {};
    FIELD_DEFS.forEach((field) => {
      fields[field.key] = cellText(getMappedCell(entry.values, mapping, field.key));
    });
    const edited = edits[entry.id] || {};
    Object.assign(fields, edited);

    const birth = parseDateValue(edited.birthDate !== undefined ? edited.birthDate : getMappedCell(entry.values, mapping, "birthDate"));
    const issue = parseDateValue(edited.passportIssue !== undefined ? edited.passportIssue : getMappedCell(entry.values, mapping, "passportIssue"));
    const expiry = parseDateValue(edited.passportExpiry !== undefined ? edited.passportExpiry : getMappedCell(entry.values, mapping, "passportExpiry"));
    fields.birthDate = birth.value;
    fields.passportIssue = issue.value;
    fields.passportExpiry = expiry.value;
    fields.gender = normalizeGender(fields.gender);
    fields.salePrice = parsePrice(fields.salePrice);

    const displayName = buildName(fields);
    const displayValues = {
      displayName,
      phone: fields.phone,
      passportNo: fields.passportNo,
      nationality: fields.nationality,
      birthDate: fields.birthDate,
      passportExpiry: fields.passportExpiry,
      gender: fields.gender,
      notes: fields.notes,
    };
    const warnings = [];
    const rejectionReasons = [];
    if (!rowHasValue(entry.values)) rejectionReasons.push(labels.emptyRow);
    if (!displayName) rejectionReasons.push(labels.missingName);
    if (birth.invalid || issue.invalid || expiry.invalid) warnings.push(labels.invalidDate);
    if (!fields.phone || !fields.passportNo || !fields.birthDate || !fields.passportExpiry || !fields.gender) warnings.push(labels.needsCompletion);
    if (!programContext?.id) warnings.push(labels.unassigned);

    const passport = normalizePassport(fields.passportNo);
    if (passport && existingPassports.has(passport)) warnings.push(labels.passportExists);
    const phone = normalizePhone(fields.phone);
    if (phone && existingPhones.has(phone)) {
      const similar = existingPhones.get(phone).some((client) => namesLookSimilar(displayName, client.name || client.fullName || `${client.firstName || ""} ${client.lastName || ""}`));
      warnings.push(similar ? labels.possibleDuplicate : labels.phoneExists);
    }
    const accepted = Boolean(displayName.trim()) && rejectionReasons.length === 0;

    return {
      id: entry.id,
      rowNumber: entry.rowNumber,
      ...displayValues,
      status: accepted ? "accepted" : "rejected",
      accepted,
      fields: { ...fields, fullName: displayName || fields.fullName },
      warnings,
      rejectionReasons,
    };
  });
};

const makeClientPayload = (previewRow, programContext) => {
  const fields = { ...previewRow.fields, fullName: previewRow.displayName };
  const arabicFromFull = splitName(fields.fullName);
  const latinFromFull = splitName(fields.latinFullName);
  const arabicFirst = fields.arabicFirstName || arabicFromFull.first;
  const arabicLast = fields.arabicLastName || arabicFromFull.last;
  const latinFirst = fields.latinFirstName || latinFromFull.first;
  const latinLast = fields.latinLastName || latinFromFull.last;
  return {
    name: fields.fullName,
    firstName: arabicFirst,
    lastName: arabicLast,
    prenom: latinFirst,
    nom: latinLast,
    nameLatin: fields.latinFullName || [latinFirst, latinLast].filter(Boolean).join(" "),
    phone: fields.phone,
    cin: fields.cin,
    city: fields.city,
    registrationSource: fields.registrationSource,
    programId: programContext?.id || null,
    packageLevel: programContext?.id ? fields.level || "" : "",
    hotelLevel: programContext?.id ? fields.level || "" : "",
    roomType: programContext?.id ? fields.roomType || "" : "",
    salePrice: fields.salePrice || 0,
    officialPrice: fields.salePrice || 0,
    notes: fields.notes,
    gender: fields.gender,
    passport: {
      number: fields.passportNo,
      cin: fields.cin,
      nationality: fields.nationality,
      birthDate: fields.birthDate,
      expiry: fields.passportExpiry,
      gender: fields.gender === "male" ? "M" : fields.gender === "female" ? "F" : "",
      issueDate: fields.passportIssue || "",
    },
  };
};

export default function ImportClientsModal({ store, onClose, onToast, programContext = null }) {
  const { t, dir, lang } = useLang();
  const isRTL = dir === "rtl";
  const labels = labelsFor(lang, t);
  const [stage, setStage] = React.useState(1);
  const [headers, setHeaders] = React.useState([]);
  const [rawRows, setRawRows] = React.useState([]);
  const [mapping, setMapping] = React.useState({});
  const [edits, setEdits] = React.useState({});
  const [report, setReport] = React.useState(null);
  const [dragging, setDragging] = React.useState(false);
  const [showColumnCorrection, setShowColumnCorrection] = React.useState(false);
  const [error, setError] = React.useState("");
  const [templateBusy, setTemplateBusy] = React.useState(false);
  const fileRef = React.useRef();

  const existingClients = store?.clients || [];
  const previewRows = React.useMemo(() => buildPreviewRows({
    rawRows,
    mapping,
    edits,
    existingClients,
    lang,
    t,
    programContext,
  }), [rawRows, mapping, edits, existingClients, lang, t, programContext]);
  const acceptedCount = previewRows.filter((row) => row.accepted).length;
  const rejectedCount = previewRows.length - acceptedCount;
  const acceptedRowsMissingDisplayName = acceptedCount > 0 && previewRows
    .filter((row) => row.accepted)
    .every((row) => !cellText(row.displayName));
  const previewNameError = acceptedRowsMissingDisplayName
    ? (t.importCannotReadNames || (lang === "fr" ? "Impossible de lire les noms des pèlerins depuis le fichier. Veuillez vérifier les colonnes." : lang === "en" ? "Could not read pilgrim names from the file. Please review the columns." : "تعذر قراءة أسماء المعتمرين من الملف. يرجى مراجعة الأعمدة."))
    : "";
  const recognizedCount = Object.values(mapping).filter((value) => value !== "" && value !== undefined).length;
  const unknownColumns = React.useMemo(() => getUnknownColumns(headers, mapping), [headers, mapping]);
  const recognizedMappings = React.useMemo(() => (
    FIELD_DEFS
      .map((field) => {
        const index = mapping[field.key];
        if (index === undefined || index === "") return null;
        return {
          key: field.key,
          label: fieldLabel(field.key, lang),
          header: headers[Number(index)] || `Col ${Number(index) + 1}`,
        };
      })
      .filter(Boolean)
  ), [headers, lang, mapping]);

  const updateEdit = (rowId, key, value) => {
    setError("");
    setEdits((prev) => ({
      ...prev,
      [rowId]: { ...(prev[rowId] || {}), [key]: value },
    }));
  };

  const handleTemplateDownload = async (event) => {
    event?.stopPropagation?.();
    setError("");
    setTemplateBusy(true);
    try {
      await downloadOfficialTemplate(lang);
    } catch (templateError) {
      setError(t.importTemplateDownloadError || (lang === "fr" ? "Impossible de générer le modèle Excel." : lang === "en" ? "Unable to generate the Excel template." : "تعذر إنشاء قالب Excel."));
    } finally {
      setTemplateBusy(false);
    }
  };

  React.useEffect(() => {
    if (stage !== 2 || process.env.NODE_ENV === "production") return;
    const trace = rawRows.slice(0, 3).map((entry) => {
      const parsed = previewRows.find((row) => row.id === entry.id);
      return {
        rawExcelRow: { rowNumber: entry.rowNumber, values: entry.values },
        detectedMapping: mapping,
        parsedRow: parsed,
        finalDisplayValues: parsed ? {
          displayName: parsed.displayName,
          phone: parsed.phone,
          passportNo: parsed.passportNo,
          nationality: parsed.nationality,
          birthDate: parsed.birthDate,
          passportExpiry: parsed.passportExpiry,
          gender: parsed.gender,
          notes: parsed.notes,
          status: parsed.status,
        } : null,
      };
    });
    // Development-only trace for diagnosing agency files with unexpected column shapes.
    // eslint-disable-next-line no-console
    console.info("[Excel import preview trace]", trace);
    if (acceptedRowsMissingDisplayName) {
      // eslint-disable-next-line no-console
      console.error("[Excel import preview trace] Accepted rows have no displayName", trace);
    }
  }, [acceptedRowsMissingDisplayName, mapping, previewRows, rawRows, stage]);

  const parseFile = (file) => {
    setError("");
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      setError(t.importFileTypeError || "يجب أن يكون الملف بصيغة Excel أو CSV");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(event.target.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
        const rowsWithIndex = (data || [])
          .map((values, index) => ({ values, rowNumber: index + 1 }))
          .filter((entry) => rowHasValue(entry.values));
        if (!rowsWithIndex.length) {
          setError(t.importEmptyFile || "الملف فارغ أو لا يحتوي على بيانات");
          return;
        }
        const officialHeaderEntry = rowsWithIndex
          .map((entry) => {
            const headersForDetection = Array.from({ length: Math.max(entry.values.length, 1) }, (_, index) => cellText(entry.values[index]));
            const official = detectOfficialTemplateColumns(headersForDetection);
            return official.isOfficial ? { ...entry, headersForDetection, detected: official.mapping } : null;
          })
          .find(Boolean);
        const headerEntry = officialHeaderEntry || rowsWithIndex[0];
        const maxCols = Math.max(...rowsWithIndex.map((entry) => entry.values.length), headerEntry.values.length, 1);
        const firstHeaders = officialHeaderEntry?.headersForDetection
          || Array.from({ length: maxCols }, (_, index) => cellText(headerEntry.values[index]));
        let detected = officialHeaderEntry?.detected || detectColumns(firstHeaders);
        const hasRecognizedHeader = Object.keys(detected).length > 0;
        const hdrs = hasRecognizedHeader
          ? firstHeaders
          : Array.from({ length: maxCols }, (_, index) => {
            if (lang === "fr") return `Colonne ${index + 1}`;
            if (lang === "en") return `Column ${index + 1}`;
            return `عمود ${index + 1}`;
          });
        if (!hasRecognizedHeader) detected = { fullName: "0" };
        const body = hasRecognizedHeader
          ? rowsWithIndex.filter((entry) => entry.rowNumber > headerEntry.rowNumber)
          : rowsWithIndex;
        setHeaders(hdrs);
        setRawRows(body.map((entry, index) => ({
          id: `${Date.now()}-${index}`,
          rowNumber: entry.rowNumber,
          values: entry.values,
        })));
        setMapping(detected);
        setEdits({});
        setShowColumnCorrection(false);
        setStage(2);
      } catch (parseError) {
        setError(t.importParseError || "تعذّر قراءة الملف — تحقق من التنسيق");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const doImport = () => {
    const hasBlankAcceptedName = previewRows.some((row) => row.accepted && !cellText(row.displayName));
    if (hasBlankAcceptedName) {
      setError(t.importCannotSaveBlankNames || (lang === "fr" ? "Impossible d’enregistrer des lignes sans nom." : lang === "en" ? "Cannot save rows without a name." : "لا يمكن حفظ سطور بدون اسم."));
      return;
    }
    let imported = 0;
    let skipped = 0;
    previewRows.forEach((row) => {
      if (!row.accepted) {
        skipped += 1;
        return;
      }
      store.addClient(makeClientPayload(row, programContext));
      imported += 1;
    });
    setReport({ imported, skipped });
    setStage(3);
    if (imported > 0) {
      const success = t.importClientsSuccess || (lang === "fr" ? "{n} pèlerins importés avec succès" : lang === "en" ? "{n} pilgrims imported successfully" : "تم استيراد المعتمرين بنجاح — تم حفظ {n} معتمر");
      onToast?.(success.replace("{n}", imported), "success");
    }
  };

  if (stage === 1) return (
    <div style={{ direction: dir, fontFamily: "'Cairo',sans-serif" }}>
      <div
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? tc.gold : "rgba(212,175,55,.3)"}`,
          borderRadius: 16,
          padding: "42px 24px",
          textAlign: "center",
          background: dragging ? "rgba(212,175,55,.06)" : "rgba(255,255,255,.02)",
          cursor: "pointer",
          transition: "all .2s",
          marginBottom: 16,
        }}>
        <IconBubble name="import" size={44} iconSize={24} style={{ margin: "0 auto 12px" }} />
        <p style={{ fontSize: 16, fontWeight: 800, color: "#f8fafc", marginBottom: 6 }}>
          {t.importModalTitle || (lang === "fr" ? "Importer depuis Excel / CSV" : lang === "en" ? "Import from Excel / CSV" : "استيراد من Excel / CSV")}
        </p>
        <p style={{ fontSize: 12, color: tc.grey, marginBottom: 20 }}>
          {t.importDropHint || "اسحب ملف Excel أو CSV وأفلته هنا"} — .xlsx, .xls, .csv
        </p>
        <Button variant="primary" icon="upload" onClick={(event) => { event.stopPropagation(); fileRef.current?.click(); }}>
          {t.importChooseFile || "اختيار ملف"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: "none" }}
          onChange={(event) => { if (event.target.files[0]) parseFile(event.target.files[0]); }}
        />
      </div>

      {error && (
        <div style={{
          padding: "10px 14px",
          borderRadius: 10,
          background: "rgba(239,68,68,.1)",
          border: "1px solid rgba(239,68,68,.3)",
          color: tc.danger,
          fontSize: 13,
        }}>{error}</div>
      )}

      <div style={{
        padding: "14px 16px",
        borderRadius: 12,
        background: "rgba(255,255,255,.03)",
        border: "1px solid rgba(255,255,255,.08)",
        marginTop: 8,
      }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: tc.gold, marginBottom: 8 }}>
          {t.importTips || "تلميح للاستيراد الأفضل:"}
        </p>
        <ul style={{ fontSize: 12, color: tc.grey, paddingInlineStart: 20, lineHeight: 2 }}>
          <li>{t.importTip1 || "يُفضّل أن يحتوي السطر الأول من الملف على أسماء الأعمدة، مثل: الاسم، الهاتف، رقم الجواز."}</li>
          <li>{t.importTip2 || "سيحاول النظام التعرف على الأعمدة تلقائيًا، ويمكنك تصحيحها قبل الحفظ."}</li>
          <li>{t.importTip3 || "يكفي وجود اسم المعتمر على الأقل. باقي المعلومات يمكن إكمالها لاحقًا."}</li>
        </ul>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          marginTop: 12,
          paddingTop: 12,
          borderTop: "1px solid rgba(255,255,255,.08)",
        }}>
          <p style={{ margin: 0, color: tc.grey, fontSize: 12, lineHeight: 1.7, flex: "1 1 280px" }}>
            {lang === "fr"
              ? "Il est recommandé d’utiliser le modèle officiel Rukn pour éviter les erreurs de colonnes et de noms, notamment pour Amadeus."
              : lang === "en"
                ? "Use the official Rukn template to avoid column and name errors, especially for Amadeus."
                : "يُفضّل استعمال قالب ركن الرسمي لتفادي أخطاء الأعمدة والأسماء، خصوصًا أسماء Amadeus."}
          </p>
          <Button
            variant="ghost"
            size="sm"
            icon="download"
            onClick={handleTemplateDownload}
            disabled={templateBusy}
          >
            {lang === "fr"
              ? "Télécharger le modèle Excel Rukn"
              : lang === "en"
                ? "Download Rukn Excel template"
                : "تحميل قالب Excel ركن"}
          </Button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <Button variant="ghost" onClick={onClose}>{t.cancel}</Button>
      </div>
    </div>
  );

  if (stage === 2) {
    return (
      <div style={{ direction: dir, fontFamily: "'Cairo',sans-serif" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <Chip icon="file" label={`${rawRows.length} ${t.importRowsFound || "سطر"}`} />
          <Chip icon="success" label={`${acceptedCount} ${labels.accepted}`} />
          <Chip icon="alert" label={`${rejectedCount} ${labels.rejected}`} />
          <Chip icon="archive" label={`${recognizedCount} ${labels.recognizedColumns}`} />
        </div>

        <div style={{
          padding: "10px 12px",
          borderRadius: 12,
          background: programContext?.id ? "rgba(245,158,11,.08)" : "rgba(148,163,184,.08)",
          border: `1px solid ${previewBorder}`,
          color: previewMutedText,
          fontSize: 12,
          marginBottom: 14,
        }}>
          {programContext?.id
            ? (lang === "fr" ? `Les pèlerins seront ajoutés au programme : ${programContext.name || ""}` : lang === "en" ? `Pilgrims will be added to program: ${programContext.name || ""}` : `سيتم حفظ المعتمرين داخل البرنامج: ${programContext.name || ""}`)
            : labels.unassigned}
        </div>

        {(error || previewNameError) && (
          <div style={{
            padding: "9px 12px",
            borderRadius: 10,
            background: "rgba(239,68,68,.1)",
            border: "1px solid rgba(239,68,68,.28)",
            color: tc.danger,
            fontSize: 12,
            marginBottom: 12,
          }}>{error || previewNameError}</div>
        )}

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "flex-start",
          flexWrap: "wrap",
          padding: "10px 12px",
          borderRadius: 12,
          background: previewSectionBg,
          border: `1px solid ${previewBorder}`,
          marginBottom: 12,
        }}>
          <div style={{ flex: "1 1 440px", minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: tc.gold, marginBottom: 8 }}>
              {labels.recognizedColumns}
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {recognizedMappings.length ? recognizedMappings.slice(0, 10).map((item) => (
                <span key={`${item.key}-${item.header}`} style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: "rgba(212,175,55,.09)",
                  border: "1px solid rgba(212,175,55,.18)",
                  color: previewText,
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  <span style={{ color: tc.gold }}>{item.label}</span>
                  <span style={{ color: previewMutedText }}>←</span>
                  <span style={{ color: previewStrongText }}>{item.header}</span>
                </span>
              )) : (
                <span style={{ color: previewMutedText, fontSize: 12 }}>—</span>
              )}
            </div>
            {unknownColumns.length > 0 && (
              <details style={{ marginTop: 9, color: previewMutedText, fontSize: 11 }}>
                <summary style={{ cursor: "pointer", color: tc.warning, fontWeight: 800 }}>
                  {labels.unknownColumns} ({unknownColumns.length})
                </summary>
                <p style={{ marginTop: 6, color: previewText }}>{unknownColumns.join("، ")}</p>
              </details>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowColumnCorrection((value) => !value)}>
            {t.importCorrectColumns || (lang === "fr" ? "Corriger les colonnes" : lang === "en" ? "Correct columns" : "تصحيح الأعمدة")}
          </Button>
        </div>

        {showColumnCorrection && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
            gap: 8,
            marginBottom: 14,
            maxHeight: 180,
            overflowY: "auto",
            paddingInlineEnd: 4,
          }}>
            {FIELD_DEFS.map((field) => (
              <div key={field.key} style={{
                padding: "8px 10px",
                borderRadius: 10,
                background: previewSectionBg,
                border: `1px solid ${mapping[field.key] !== undefined && mapping[field.key] !== "" ? "rgba(212,175,55,.3)" : previewBorder}`,
              }}>
                <label style={{
                  fontSize: 10.5,
                  color: mapping[field.key] !== undefined && mapping[field.key] !== "" ? tc.gold : previewMutedText,
                  display: "block",
                  marginBottom: 5,
                  fontWeight: 700,
                }}>
                  {fieldLabel(field.key, lang)}
                </label>
                <select
                  value={mapping[field.key] !== undefined ? String(mapping[field.key]) : ""}
                  onChange={(event) => {
                    setError("");
                    setMapping((prev) => ({ ...prev, [field.key]: event.target.value }));
                  }}
                  style={{ ...selectStyle(dir), padding: "5px 8px", fontSize: 11 }}>
                  <option value="">{t.importIgnore || "— تجاهل —"}</option>
                  {headers.map((header, index) => (
                    <option key={index} value={String(index)}>{header || `Col ${index + 1}`}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: 12, fontWeight: 800, color: tc.gold, marginBottom: 8 }}>
          {t.importPreview || "معاينة البيانات"}
        </p>
        <div style={{ overflowX: "auto", borderRadius: 12, border: `1px solid ${previewBorder}`, marginBottom: 16, maxHeight: 340, background: previewSectionBg }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 940, color: previewText }}>
            <thead>
              <tr style={{ background: previewTableHeadBg }}>
                {[t.row || "#", t.name, t.phone, t.passportNo || "رقم الجواز", t.nationality || "الجنسية", t.birthDate || "تاريخ الميلاد", t.passportExpiry || "انتهاء الجواز", t.gender || "الجنس", t.status || "الحالة", t.notes || "ملاحظات"].map((header) => (
                  <th key={header} style={{
                    padding: "8px 10px",
                    color: tc.gold,
                    fontWeight: 800,
                    borderBottom: `1px solid ${previewBorder}`,
                    textAlign: isRTL ? "right" : "left",
                    whiteSpace: "nowrap",
                  }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row) => (
                <tr key={row.id} style={{ borderBottom: `1px solid ${previewBorder}`, background: row.accepted ? "transparent" : "rgba(239,68,68,.05)" }}>
                  <td style={tdStyle(isRTL)}>{row.rowNumber}</td>
                  <EditableCell value={row.displayName} onChange={(value) => updateEdit(row.id, "fullName", value)} isRTL={isRTL} required={row.accepted} />
                  <EditableCell value={row.phone} onChange={(value) => updateEdit(row.id, "phone", value)} isRTL={isRTL} />
                  <EditableCell value={row.passportNo} onChange={(value) => updateEdit(row.id, "passportNo", value)} isRTL={isRTL} />
                  <td style={tdStyle(isRTL)}>{row.nationality || "—"}</td>
                  <td style={tdStyle(isRTL)}>{row.birthDate || "—"}</td>
                  <td style={tdStyle(isRTL)}>{row.passportExpiry || "—"}</td>
                  <td style={tdStyle(isRTL)}>{row.gender || "—"}</td>
                  <td style={tdStyle(isRTL)}>
                    <StatusPill accepted={row.accepted} label={row.accepted ? labels.accepted : labels.rejected} />
                  </td>
                  <td style={{ ...tdStyle(isRTL), minWidth: 210 }}>
                    {[...row.rejectionReasons, ...row.warnings].slice(0, 4).map((warning) => (
                      <WarningPill key={warning} label={warning} danger={row.rejectionReasons.includes(warning)} />
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={() => setStage(1)}>{t.back || "رجوع"}</Button>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="ghost" onClick={onClose}>{t.cancel}</Button>
            <Button variant="primary" icon="success" disabled={acceptedCount === 0} onClick={doImport}>
              {t.importSaveAcceptedOnly || (lang === "fr" ? "Enregistrer les lignes acceptées uniquement" : lang === "en" ? "Save accepted rows only" : "حفظ المقبولين فقط")} ({acceptedCount})
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ direction: dir, fontFamily: "'Cairo',sans-serif", textAlign: "center", padding: "24px 0" }}>
      <IconBubble name={report.imported > 0 ? "success" : "alert"} size={52} iconSize={28} style={{ margin: "0 auto 16px" }} />
      <h3 style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc", marginBottom: 10 }}>
        {t.importDone || "اكتمل الاستيراد"}
      </h3>
      <p style={{ fontSize: 13, color: tc.grey, marginBottom: 24 }}>
        {(t.importSavedAndSkipped || (lang === "fr" ? "{saved} pèlerin(s) enregistré(s), {skipped} ligne(s) ignorée(s)" : lang === "en" ? "{saved} pilgrim(s) saved, {skipped} row(s) ignored" : "تم حفظ {saved} معتمر، وتم تجاهل {skipped} سطر"))
          .replace("{saved}", report.imported)
          .replace("{skipped}", report.skipped)}
      </p>

      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 28 }}>
        <StatCard value={report.imported} label={t.importImported || "تم حفظه"} color={tc.greenLight} bg="rgba(34,197,94,.1)" border="rgba(34,197,94,.25)" />
        <StatCard value={report.skipped} label={t.importSkipped || "تم تجاهله"} color={tc.warning} bg="rgba(245,158,11,.08)" border="rgba(245,158,11,.2)" />
      </div>

      <Button variant="primary" onClick={onClose}>{t.close || "إغلاق"}</Button>
    </div>
  );
}

function EditableCell({ value, onChange, isRTL, required = false }) {
  const [focused, setFocused] = React.useState(false);
  const visibleValue = cellText(value);
  const inputValue = focused || visibleValue ? visibleValue : "—";
  return (
    <td style={tdStyle(isRTL)}>
      <input
        value={inputValue}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: "100%",
          minWidth: 110,
          border: `1px solid ${required && !visibleValue ? "rgba(239,68,68,.45)" : previewInputBorder}`,
          borderRadius: 8,
          padding: "5px 7px",
          background: previewInputBg,
          color: visibleValue ? previewStrongText : previewMutedText,
          fontFamily: "'Cairo',sans-serif",
          fontSize: 11,
          textAlign: isRTL ? "right" : "left",
        }}
      />
    </td>
  );
}

function StatusPill({ accepted, label }) {
  return (
    <span style={{
      display: "inline-flex",
      padding: "2px 8px",
      borderRadius: 999,
      background: accepted ? "rgba(34,197,94,.12)" : "rgba(239,68,68,.12)",
      border: `1px solid ${accepted ? "rgba(34,197,94,.25)" : "rgba(239,68,68,.25)"}`,
      color: accepted ? previewStrongText : tc.danger,
      fontWeight: 800,
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function WarningPill({ label, danger }) {
  return (
    <span style={{
      display: "inline-flex",
      margin: "1px 2px",
      padding: "2px 7px",
      borderRadius: 999,
      background: danger ? "rgba(239,68,68,.12)" : "rgba(245,158,11,.10)",
      border: `1px solid ${danger ? "rgba(239,68,68,.25)" : "rgba(245,158,11,.22)"}`,
      color: danger ? tc.danger : tc.warning,
      fontWeight: 800,
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function Chip({ icon, label }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 12px",
      borderRadius: 20,
      background: "rgba(212,175,55,.1)",
      border: "1px solid rgba(212,175,55,.2)",
      fontSize: 12,
      color: tc.gold,
      fontWeight: 700,
      fontFamily: "'Cairo',sans-serif",
    }}>
      <AppIcon name={icon} size={14} color={tc.gold} /> {label}
    </span>
  );
}

function StatCard({ value, label, color, bg, border }) {
  return (
    <div style={{
      padding: "18px 32px",
      borderRadius: 14,
      background: bg,
      border: `1px solid ${border}`,
      minWidth: 120,
    }}>
      <p style={{ fontSize: 32, fontWeight: 900, color, marginBottom: 4 }}>{value}</p>
      <p style={{ fontSize: 13, color: tc.grey }}>{label}</p>
    </div>
  );
}

function tdStyle(isRTL) {
  return {
    padding: "7px 10px",
    color: previewText,
    textAlign: isRTL ? "right" : "left",
    verticalAlign: "top",
  };
}

function selectStyle(dir) {
  return {
    width: "100%",
    background: previewInputBg,
    border: `1px solid ${previewInputBorder}`,
    borderRadius: 8,
    padding: "8px 10px",
    color: previewText,
    fontSize: 12,
    fontFamily: "'Cairo',sans-serif",
    cursor: "pointer",
    direction: dir,
  };
}
