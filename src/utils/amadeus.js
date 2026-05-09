/**
 * Practical one-sheet Amadeus workbook export.
 * The same sorted passenger array drives NM and SRDOCS rows, so /P references
 * always match the name order.
 */
import { getProgramAirline } from "./airlines";
import {
  getClientArabicName,
  getClientDisplayName,
  getClientLatinName,
} from "./clientNames";

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const AIRLINE_PLACEHOLDER = "[AIRLINE]";

const LATIN_LAST_NAME_KEYS = [
  "latinLastName",
  "lastNameLatin",
  "surnameLatin",
  "familyNameLatin",
  "nomLatin",
  "latinNom",
  "nom",
];

const LATIN_FIRST_NAME_KEYS = [
  "latinFirstName",
  "firstNameLatin",
  "givenNameLatin",
  "givenNamesLatin",
  "prenomLatin",
  "latinPrenom",
  "prenom",
];

const FALLBACK_LAST_NAME_KEYS = [
  "lastName",
  "familyName",
  "surname",
];

const FALLBACK_FIRST_NAME_KEYS = [
  "givenName",
  "givenNames",
  "firstName",
];

const FULL_LATIN_KEYS = [
  "nameLatin",
  "latinName",
  "fullNameLatin",
  "displayNameLatin",
  "passportName",
  "passportFullName",
  "passportLatinName",
];

const cleanText = (value) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "");

const pickText = (source, keys = []) => {
  for (const key of keys) {
    const value = cleanText(source?.[key]);
    if (value) return value;
  }
  return "";
};

const removeDiacritics = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "");

const isLatinCompatible = (value) => {
  const text = cleanText(value);
  return Boolean(text) && /^[A-Za-zÀ-ÖØ-öø-ÿ\s'.,/-]+$/.test(text);
};

const normalizeSortText = (value) => removeDiacritics(value)
  .trim()
  .toUpperCase()
  .replace(/[^\p{L}\p{N}\s/-]/gu, " ")
  .replace(/\s+/g, " ");

const normalizeAmadeusNamePart = (value) => removeDiacritics(value)
  .toUpperCase()
  .replace(/[^A-Z]/g, "");

const pickLatinCompatibleText = (source, keys = []) => {
  for (const key of keys) {
    const value = pickText(source, [key]);
    if (isLatinCompatible(value)) return value;
  }
  return "";
};

const safeFilePart = (value) => String(value || "program")
  .trim()
  .replace(/\s+/g, "-")
  .replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, "")
  .slice(0, 72) || "program";

const parseDateParts = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return {
      year: Number(iso[1]),
      month: Number(iso[2]),
      day: Number(iso[3]),
    };
  }
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return null;
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
};

const toAmadeusDate = (value) => {
  const parts = parseDateParts(value);
  if (!parts || parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > 31) return "";
  const dd = String(parts.day).padStart(2, "0");
  const mmm = MONTHS[parts.month - 1];
  const yy = String(parts.year).slice(-2);
  return `${dd}${mmm}${yy}`;
};

export function calcExpiry(issueDate) {
  const parts = parseDateParts(issueDate);
  if (!parts) return "";
  const d = new Date(Date.UTC(parts.year + 5, parts.month - 1, parts.day));
  return d.toISOString().split("T")[0];
}

const splitFullLatinName = (value) => {
  const text = cleanText(value);
  if (!text) return { lastName: "", firstName: "" };
  if (text.includes("/")) {
    const [lastName, ...rest] = text.split("/");
    return { lastName: cleanText(lastName), firstName: cleanText(rest.join(" ")) };
  }
  if (text.includes(",")) {
    const [lastName, ...rest] = text.split(",");
    return { lastName: cleanText(lastName), firstName: cleanText(rest.join(" ")) };
  }
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { lastName: parts[0] || "", firstName: "" };
  return { lastName: parts[0], firstName: parts.slice(1).join(" ") };
};

const getLatinNameParts = (client = {}) => {
  const passport = client.passport || {};
  const explicitLastName = pickText(client, LATIN_LAST_NAME_KEYS) || pickText(passport, LATIN_LAST_NAME_KEYS);
  const explicitFirstName = pickText(client, LATIN_FIRST_NAME_KEYS) || pickText(passport, LATIN_FIRST_NAME_KEYS);
  const fallbackLastName = !explicitLastName
    ? pickLatinCompatibleText(client, FALLBACK_LAST_NAME_KEYS) || pickLatinCompatibleText(passport, FALLBACK_LAST_NAME_KEYS)
    : "";
  const fallbackFirstName = !explicitFirstName
    ? pickLatinCompatibleText(client, FALLBACK_FIRST_NAME_KEYS) || pickLatinCompatibleText(passport, FALLBACK_FIRST_NAME_KEYS)
    : "";
  let lastName = explicitLastName || fallbackLastName;
  let firstName = explicitFirstName || fallbackFirstName;
  const separatedLastName = lastName;
  const separatedFirstName = firstName;

  if (!lastName || !firstName) {
    const fullLatin = pickText(client, FULL_LATIN_KEYS) || pickText(passport, FULL_LATIN_KEYS);
    const splitSource = fullLatin || (!lastName && !firstName ? getClientLatinName(client) : "");
    const split = splitFullLatinName(splitSource);
    if (!lastName && split.lastName) lastName = split.lastName;
    if (!firstName && split.firstName) firstName = split.firstName;
  }

  let amadeusLastName = normalizeAmadeusNamePart(lastName);
  let amadeusFirstName = normalizeAmadeusNamePart(firstName);
  const separatedAmadeusLastName = normalizeAmadeusNamePart(separatedLastName);
  const separatedAmadeusFirstName = normalizeAmadeusNamePart(separatedFirstName);
  const hasSeparatedName = Boolean(separatedAmadeusLastName && separatedAmadeusFirstName);
  if (
    hasSeparatedName
    && amadeusLastName === `${separatedAmadeusLastName}${separatedAmadeusFirstName}`
    && amadeusFirstName === separatedAmadeusLastName
  ) {
    amadeusLastName = separatedAmadeusLastName;
    amadeusFirstName = separatedAmadeusFirstName;
  }
  const nameNeedsReview = !hasSeparatedName
    && amadeusLastName
    && amadeusFirstName
    && amadeusLastName.startsWith(amadeusFirstName)
    && amadeusLastName.length > amadeusFirstName.length;

  return {
    lastName: cleanText(lastName),
    firstName: cleanText(firstName),
    amadeusLastName,
    amadeusFirstName,
    nameNeedsReview,
  };
};

const getPassportNumber = (client = {}) => {
  const passport = client.passport || {};
  return cleanText(
    passport.number
    || client.passportNumber
    || client.passportNo
    || client.passport_no
  ).toUpperCase();
};

const normalizeGender = (value) => {
  const text = cleanText(value).toLowerCase();
  if (["f", "female", "femme", "أنثى", "انثى"].includes(text)) return "F";
  if (["m", "male", "homme", "ذكر"].includes(text)) return "M";
  return "";
};

const getPassportData = (client = {}) => {
  const passport = client.passport || {};
  const birthDate = passport.birthDate || client.birthDate || client.dateOfBirth || "";
  const expiry = passport.expiry || client.passportExpiry || client.expiryDate || calcExpiry(passport.issueDate);
  return {
    passportNumber: getPassportNumber(client),
    nationality: cleanText(passport.nationality || client.nationality).toUpperCase(),
    birthDate,
    birthDateAmadeus: toAmadeusDate(birthDate),
    gender: normalizeGender(passport.gender || client.gender),
    expiry,
    expiryAmadeus: toAmadeusDate(expiry),
  };
};

const buildNameCommand = (index, parts) => {
  if (parts.nameNeedsReview) return "";
  if (!parts.amadeusLastName || !parts.amadeusFirstName) return "";
  const prefix = index === 0 ? "NM1" : "1";
  return `${prefix}${parts.amadeusLastName}/${parts.amadeusFirstName}`;
};

const buildDocsCommand = ({ row, airlineCode }) => {
  if (row.parts.nameNeedsReview) return "";
  if (!row.parts.amadeusLastName || !row.parts.amadeusFirstName) return "";
  if (!row.docs.nationality) return "";
  if (!row.docs.passportNumber) return "";
  if (!row.docs.birthDateAmadeus) return "";
  if (!row.docs.gender) return "";
  if (!row.docs.expiryAmadeus) return "";

  const carrier = airlineCode || AIRLINE_PLACEHOLDER;
  return [
    `SRDOCS ${carrier} HK1-P`,
    row.docs.nationality,
    row.docs.passportNumber,
    row.docs.nationality,
    row.docs.birthDateAmadeus,
    row.docs.gender,
    row.docs.expiryAmadeus,
    row.parts.amadeusLastName,
    `${row.parts.amadeusFirstName}${row.pReference}`,
  ].join("-");
};

const isOperationalProgramPassenger = (client, program) => {
  if (!client || client.deleted || client.trashed) return false;
  const status = cleanText(client.status).toLowerCase();
  if (status === "deleted" || status === "trashed") return false;
  const programId = client.programId || client.program_id;
  return !program?.id || !programId || programId === program.id;
};

const uniqueClients = (clients = []) => {
  const seen = new Set();
  return clients.filter((client) => {
    const key = client?.id || `${client?.name || ""}:${client?.phone || ""}:${seen.size}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const sortClientsForAmadeus = (clients = []) => uniqueClients(clients)
  .map((client, index) => {
    const parts = getLatinNameParts(client);
    const localName = getClientArabicName(client) || getClientDisplayName(client, "");
    const latinSort = parts.lastName || parts.firstName
      ? `${normalizeSortText(parts.lastName)} ${normalizeSortText(parts.firstName)}`
      : "";
    return {
      client,
      index,
      parts,
      localName,
      sortKey: latinSort || normalizeSortText(localName),
    };
  })
  .sort((a, b) => (
    a.sortKey.localeCompare(b.sortKey, "fr", { sensitivity: "base" })
    || normalizeSortText(a.localName).localeCompare(normalizeSortText(b.localName), "ar", { sensitivity: "base" })
    || a.index - b.index
  ));

const buildPassengerRows = ({ clients = [], program = {} }) => (
  sortClientsForAmadeus(clients.filter((client) => isOperationalProgramPassenger(client, program)))
    .map((item, index) => {
      const passengerNumber = index + 1;
      const pReference = `/P${passengerNumber}`;
      const docs = getPassportData(item.client);
      const nmCommand = buildNameCommand(index, item.parts);
      return {
        passengerNumber,
        pReference,
        parts: item.parts,
        docs,
        nmCommand,
      };
    })
);

const styleCell = (ws, cell, style) => {
  if (!ws[cell]) return;
  ws[cell].s = style;
};

const applyBasicStyles = (ws, titleCell, sectionCells = [], commandRowCount = 0) => {
  styleCell(ws, titleCell, {
    font: { bold: true, sz: 18, color: { rgb: "1F2937" } },
    alignment: { horizontal: "center" },
  });
  sectionCells.forEach((cell) => {
    styleCell(ws, cell, {
      font: { bold: true, sz: 13, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1F2937" } },
      alignment: { horizontal: "center" },
    });
  });
  for (let rowNumber = 4; rowNumber < 4 + commandRowCount; rowNumber += 1) {
    ["A", "C"].forEach((col) => {
      styleCell(ws, `${col}${rowNumber}`, {
        font: { color: { rgb: "111827" }, name: "Consolas" },
        border: {
          top: { style: "thin", color: { rgb: "D1D5DB" } },
          bottom: { style: "thin", color: { rgb: "D1D5DB" } },
          left: { style: "thin", color: { rgb: "D1D5DB" } },
          right: { style: "thin", color: { rgb: "D1D5DB" } },
        },
      });
    });
  }
};

const buildOneSheet = (XLSX, { passengerRows, airlineCode }) => {
  const docsRows = passengerRows.map((row) => buildDocsCommand({ row, airlineCode }));
  const rows = [
    ["Amadeus Excel / Docs Amadeus", "", ""],
    [],
    ["Amadeus Names", "", "SRDOCS / DOCS Amadeus"],
    ...passengerRows.map((row, index) => [row.nmCommand, "", docsRows[index] || ""]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 36 }, { wch: 5 }, { wch: 110 }];
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
  ];
  ws["!freeze"] = {
    xSplit: 0,
    ySplit: 3,
    topLeftCell: "A4",
    activePane: "bottomLeft",
    state: "frozen",
  };
  applyBasicStyles(ws, "A1", ["A3", "C3"], passengerRows.length);

  return {
    ws,
    stats: {
      total: passengerRows.length,
      reviewCount: passengerRows.filter((row, index) => !row.nmCommand || !docsRows[index]).length,
      missingLatin: passengerRows.filter((row) => !row.nmCommand).length,
      missingDocs: docsRows.filter((command) => !command).length,
    },
  };
};

export async function downloadAmadeusExcel(clients, program, options = {}) {
  const XLSX = await import("xlsx");
  const exportDate = new Date().toISOString().slice(0, 10);
  const selectedLevelLabel = options.selectedLevelLabel || "All levels";
  const airline = getProgramAirline(program);
  const airlineCode = cleanText(airline?.code).toUpperCase();
  const passengerRows = buildPassengerRows({ clients, program });

  const wb = XLSX.utils.book_new();
  const { ws, stats } = buildOneSheet(XLSX, {
    passengerRows,
    airlineCode,
  });

  XLSX.utils.book_append_sheet(wb, ws, "Amadeus");

  const levelPart = selectedLevelLabel && selectedLevelLabel !== "All levels"
    ? `-${safeFilePart(selectedLevelLabel)}`
    : "";
  const filename = `Amadeus-${safeFilePart(program?.name || "Program")}${levelPart}-${exportDate}.xlsx`;
  XLSX.writeFile(wb, filename, { bookType: "xlsx", compression: true });

  return { ...stats, filename };
}
