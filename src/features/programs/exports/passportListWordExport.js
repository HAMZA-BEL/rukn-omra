import PizZip from "pizzip";
import { getClientLatinName } from "../../../utils/clientNames";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const BODY_FONT = "Times New Roman";

const LATIN_LAST_NAME_KEYS = [
  "nom",
  "latinNom",
  "nomLatin",
  "latinLastName",
  "lastNameLatin",
  "surnameLatin",
  "familyNameLatin",
];

const LATIN_FIRST_NAME_KEYS = [
  "prenom",
  "latinPrenom",
  "prenomLatin",
  "latinFirstName",
  "firstNameLatin",
  "givenNameLatin",
  "givenNamesLatin",
];

const PASSPORT_LAST_NAME_KEYS = [
  ...LATIN_LAST_NAME_KEYS,
  "surname",
  "lastName",
  "familyName",
];

const PASSPORT_FIRST_NAME_KEYS = [
  ...LATIN_FIRST_NAME_KEYS,
  "givenName",
  "givenNames",
  "firstName",
];

const FALLBACK_LAST_NAME_KEYS = ["lastName", "familyName", "surname"];
const FALLBACK_FIRST_NAME_KEYS = ["firstName", "givenName", "givenNames"];

const FULL_LATIN_KEYS = [
  "nameLatin",
  "latinName",
  "fullNameLatin",
  "displayNameLatin",
  "passportName",
  "passportFullName",
  "passportLatinName",
  "latin_fullName",
];

const PASSPORT_FULL_LATIN_KEYS = [
  "name",
  "fullName",
  "latinName",
  "passportName",
  "passportFullName",
  "passportLatinName",
  "mrzName",
];

const CIN_KEYS = [
  "cin",
  "CIN",
  "cinNumber",
  "cin_number",
  "nationalId",
  "national_id",
  "identityNumber",
  "identity_number",
  "idCardNumber",
  "id_card_number",
];

const PASSPORT_KEYS = [
  "number",
  "passportNumber",
  "passportNo",
  "passport_no",
  "passport_number",
  "documentNumber",
  "document_number",
];

const FRENCH_MONTHS = [
  "JANVIER",
  "FEVRIER",
  "MARS",
  "AVRIL",
  "MAI",
  "JUIN",
  "JUILLET",
  "AOUT",
  "SEPTEMBRE",
  "OCTOBRE",
  "NOVEMBRE",
  "DECEMBRE",
];

const cleanText = (value) => (value === null || value === undefined ? "" : String(value).trim().replace(/\s+/g, " "));
const normalizeUpper = (value) => cleanText(value).toLocaleUpperCase("fr");
const normalizeIdentifier = (value) => cleanText(value).toLocaleUpperCase("fr");

const xmlEscape = (value = "") => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

const pickText = (source, keys = []) => {
  for (const key of keys) {
    const value = cleanText(source?.[key]);
    if (value) return value;
  }
  return "";
};

const isLatinCompatible = (value) => {
  const text = cleanText(value);
  return Boolean(text) && /^[A-Za-zÀ-ÖØ-öø-ÿ\s'’.,/-]+$/.test(text);
};

const pickLatinCompatibleText = (source, keys = []) => {
  for (const key of keys) {
    const value = pickText(source, [key]);
    if (isLatinCompatible(value)) return value;
  }
  return "";
};

const splitStructuredLatinFullName = (value) => {
  const text = cleanText(value);
  if (!text) return { nom: "", prenom: "" };
  if (text.includes("/")) {
    const [nom, ...rest] = text.split("/");
    return { nom: cleanText(nom), prenom: cleanText(rest.join(" ")) };
  }
  if (text.includes(",")) {
    const [nom, ...rest] = text.split(",");
    return { nom: cleanText(nom), prenom: cleanText(rest.join(" ")) };
  }
  return { nom: text, prenom: "" };
};

const parseDateParts = (value) => {
  const raw = cleanText(value);
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return {
      year: Number(iso[1]),
      month: Number(iso[2]),
      day: Number(iso[3]),
    };
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
  };
};

const normalizeSortValue = (value) => normalizeUpper(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
  .replace(/\s+/g, " ")
  .trim();

const hasLatinLetters = (value) => /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(cleanText(value));
const hasArabicLetters = (value) => /[\u0600-\u06FF]/.test(cleanText(value));

const getProgramLabel = (program = {}) => {
  const title = cleanText(program.name || program.title || program.nameFr || program.label);
  if (title && hasLatinLetters(title) && !hasArabicLetters(title)) return title;
  const departure = parseDateParts(program.departure || program.departureDate || program.departure_date);
  if (!departure || departure.month < 1 || departure.month > 12) return title && hasLatinLetters(title) ? title : "OMRA";
  return `OMRA ${departure.day} ${FRENCH_MONTHS[departure.month - 1]} ${departure.year}`;
};

const safeFilePart = (value) => {
  const normalized = cleanText(value || "program")
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/[^\p{L}\p{N}\s_-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
  return normalized || "program";
};

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const resolvePassportListFields = (client = {}) => {
  const passport = client.passport || {};
  let nom = pickText(client, LATIN_LAST_NAME_KEYS) || pickText(passport, PASSPORT_LAST_NAME_KEYS);
  let prenom = pickText(client, LATIN_FIRST_NAME_KEYS) || pickText(passport, PASSPORT_FIRST_NAME_KEYS);

  if (!nom) nom = pickLatinCompatibleText(client, FALLBACK_LAST_NAME_KEYS) || pickLatinCompatibleText(passport, FALLBACK_LAST_NAME_KEYS);
  if (!prenom) prenom = pickLatinCompatibleText(client, FALLBACK_FIRST_NAME_KEYS) || pickLatinCompatibleText(passport, FALLBACK_FIRST_NAME_KEYS);

  if (!nom || !prenom) {
    const fullLatin = pickText(client, FULL_LATIN_KEYS)
      || pickText(passport, PASSPORT_FULL_LATIN_KEYS)
      || getClientLatinName(client);
    const split = splitStructuredLatinFullName(isLatinCompatible(fullLatin) ? fullLatin : "");
    if (!nom && split.nom) nom = split.nom;
    if (!prenom && split.prenom) prenom = split.prenom;
  }

  const cin = pickText(client, CIN_KEYS) || pickText(passport, CIN_KEYS);
  const passportNumber = pickText(passport, PASSPORT_KEYS) || pickText(client, PASSPORT_KEYS);

  return {
    nom: normalizeUpper(nom),
    prenom: normalizeUpper(prenom),
    cin: normalizeIdentifier(cin),
    passport: normalizeIdentifier(passportNumber),
  };
};

const isSelectedProgramClient = (client = {}, program = {}) => {
  if (!client || client.deleted || client.trashed) return false;
  const status = cleanText(client.status).toLowerCase();
  if (status === "deleted" || status === "trashed") return false;
  const programId = cleanText(program.id);
  if (!programId) return false;
  const clientProgramId = cleanText(client.programId || client.program_id || client.program?.id);
  return clientProgramId === programId;
};

export const buildPassportListRows = ({ clients = [], program = {} } = {}) => {
  const seen = new Set();
  return clients
    .filter((client) => isSelectedProgramClient(client, program))
    .filter((client, index) => {
      const key = client.id || `${client.name || ""}:${client.phone || ""}:${index}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((client) => {
      const fields = resolvePassportListFields(client);
      return {
        client,
        ...fields,
        sortNom: normalizeSortValue(fields.nom),
        sortPrenom: normalizeSortValue(fields.prenom),
      };
    })
    .sort((a, b) => (
      a.sortNom.localeCompare(b.sortNom, "fr", { sensitivity: "base" })
      || a.sortPrenom.localeCompare(b.sortPrenom, "fr", { sensitivity: "base" })
      || a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" })
      || a.prenom.localeCompare(b.prenom, "fr", { sensitivity: "base" })
    ))
    .map((row, index) => ({
      no: String(index + 1).padStart(2, "0"),
      nom: row.nom,
      prenom: row.prenom,
      cin: row.cin,
      passport: row.passport,
    }));
};

const run = (text, {
  bold = false,
  underline = false,
  size = 24,
} = {}) => `
  <w:r>
    <w:rPr>
      <w:rFonts w:ascii="${BODY_FONT}" w:hAnsi="${BODY_FONT}" w:cs="${BODY_FONT}"/>
      ${bold ? "<w:b/><w:bCs/>" : ""}
      ${underline ? '<w:u w:val="single"/>' : ""}
      <w:sz w:val="${size}"/><w:szCs w:val="${size}"/>
    </w:rPr>
    <w:t xml:space="preserve">${xmlEscape(text)}</w:t>
  </w:r>`;

const paragraph = (text, {
  align = "left",
  bold = false,
  underline = false,
  size = 24,
  spacingAfter = 0,
} = {}) => `
  <w:p>
    <w:pPr>
      <w:jc w:val="${align}"/>
      <w:spacing w:before="0" w:after="${spacingAfter}" w:line="240" w:lineRule="auto"/>
    </w:pPr>
    ${run(text, { bold, underline, size })}
  </w:p>`;

const tableCell = (text, {
  width,
  align = "left",
  bold = false,
  size = 24,
} = {}) => `
  <w:tc>
    <w:tcPr>
      <w:tcW w:w="${width}" w:type="dxa"/>
      <w:vAlign w:val="center"/>
      <w:tcMar>
        <w:top w:w="45" w:type="dxa"/>
        <w:left w:w="70" w:type="dxa"/>
        <w:bottom w:w="45" w:type="dxa"/>
        <w:right w:w="70" w:type="dxa"/>
      </w:tcMar>
    </w:tcPr>
    ${paragraph(text, { align, bold, size })}
  </w:tc>`;

const tableRow = (cells, { header = false } = {}) => `
  <w:tr>
    <w:trPr>
      <w:trHeight w:val="${header ? 360 : 330}" w:hRule="atLeast"/>
    </w:trPr>
    ${cells.join("")}
  </w:tr>`;

const buildTableXml = (rows) => {
  const widths = [700, 2350, 3000, 2000, 2410];
  const headers = ["N°", "NOM", "PRENOM", "CIN", "PASSEPORTS"];
  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="10460" w:type="dxa"/>
        <w:tblLayout w:type="fixed"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:left w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:right w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:insideH w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:insideV w:val="single" w:sz="8" w:space="0" w:color="000000"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>${widths.map((width) => `<w:gridCol w:w="${width}"/>`).join("")}</w:tblGrid>
      ${tableRow(headers.map((header, index) => tableCell(header, {
        width: widths[index],
        align: "center",
        bold: true,
        size: 24,
      })), { header: true })}
      ${rows.map((row) => tableRow([
        tableCell(row.no, { width: widths[0], align: "center" }),
        tableCell(row.nom, { width: widths[1], align: "left" }),
        tableCell(row.prenom, { width: widths[2], align: "left" }),
        tableCell(row.cin, { width: widths[3], align: "center" }),
        tableCell(row.passport, { width: widths[4], align: "center" }),
      ])).join("")}
    </w:tbl>`;
};

const buildDocumentXml = ({ title, rows }) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraph(title, { align: "center", bold: true, underline: true, size: 30, spacingAfter: 120 })}
    ${buildTableXml(rows)}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const relationshipsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const coreXml = (title) => {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${xmlEscape(title)}</dc:title>
  <dc:creator>Rukn</dc:creator>
  <cp:lastModifiedBy>Rukn</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
};

const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Rukn</Application>
</Properties>`;

export function buildPassportListWordBlob({ program = {}, clients = [] } = {}) {
  const rows = buildPassportListRows({ clients, program });
  if (!rows.length) return { blob: null, rows, filename: "" };
  const programLabel = getProgramLabel(program);
  const title = normalizeUpper(`LISTE PASSPORT MOATAMIRINE ${programLabel}`);
  const zip = new PizZip();
  zip.file("[Content_Types].xml", contentTypesXml);
  zip.folder("_rels").file(".rels", relationshipsXml);
  zip.folder("docProps").file("core.xml", coreXml(title)).file("app.xml", appXml);
  zip.folder("word").file("document.xml", buildDocumentXml({ title, rows }));
  const blob = zip.generate({ type: "blob", mimeType: DOCX_MIME, compression: "DEFLATE" });
  const filename = `liste-passeports-word-${safeFilePart(programLabel)}.docx`;
  return { blob, rows, filename };
}

export function downloadPassportListWord({ program = {}, clients = [] } = {}) {
  const result = buildPassportListWordBlob({ program, clients });
  if (!result.blob) return { ok: false, total: 0, filename: "" };
  downloadBlob(result.blob, result.filename);
  return { ok: true, total: result.rows.length, filename: result.filename };
}
