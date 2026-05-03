/**
 * Amadeus SR DOCS Export
 * Format: SRDOCS[Airline]HK1-P-MAR-[Passport]-[Nat]-[BirthDate]-[Gender]-[ExpiryDate]-[NOM]/[PRENOM]/P
 * Dates in Amadeus format: 09APR00 (DDMMMYY)
 */
import { getProgramAirline, normalizeAirlineCode } from "./airlines";

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

// Convert YYYY-MM-DD → DDMMMYY (Amadeus format)
function toAmadeusDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const dd  = String(d.getDate()).padStart(2, "0");
  const mmm = MONTHS[d.getMonth()];
  const yy  = String(d.getFullYear()).slice(-2);
  return `${dd}${mmm}${yy}`;
}

// Calculate expiry = issue date + 5 years, returns YYYY-MM-DD
export function calcExpiry(issueDate) {
  if (!issueDate) return "";
  const d = new Date(issueDate);
  if (isNaN(d.getTime())) return "";
  d.setFullYear(d.getFullYear() + 5);
  return d.toISOString().split("T")[0];
}

const cleanSortValue = (value) => String(value || "")
  .trim()
  .toUpperCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "");

const getFamilyNameForSort = (client) => {
  const direct = client?.nom || client?.lastName || client?.last_name || client?.familyName || client?.family_name;
  if (direct) return cleanSortValue(direct);
  if (client?.nameLatin) return cleanSortValue(String(client.nameLatin).trim().split(/\s+/)[0]);
  const full = client?.fullName || client?.name || client?.nameAr || "";
  const parts = String(full).trim().split(/\s+/).filter(Boolean);
  return cleanSortValue(parts[parts.length - 1] || full);
};

const sortClientsForAmadeus = (clients = []) => clients
  .map((client, index) => ({ client, index, key: getFamilyNameForSort(client) }))
  .sort((a, b) => {
    const byName = a.key.localeCompare(b.key, "fr", { sensitivity: "base" });
    return byName || a.index - b.index;
  })
  .map((item) => item.client);

// Build one Amadeus SR DOCS line
function buildAmadeusLine(client, airlineCode) {
  const p = client.passport || {};

  const passNo = (p.number || "").toUpperCase().trim();
  const nat    = (p.nationality || "MAR").toUpperCase().trim();
  const birth  = toAmadeusDate(p.birthDate);
  const gender = p.gender === "F" ? "F" : "M";
  const expiry = toAmadeusDate(p.expiry || calcExpiry(p.issueDate));

  // NOM/PRENOM — use dedicated fields, fallback to splitting nameLatin
  let nom    = (client.nom    || "").toUpperCase().trim();
  let prenom = (client.prenom || "").toUpperCase().trim();

  // Fallback: split nameLatin (first word = NOM, rest = PRENOM)
  if (!nom && !prenom && client.nameLatin) {
    const parts = client.nameLatin.trim().toUpperCase().split(/\s+/);
    nom    = parts[0] || "";
    prenom = parts.slice(1).join(" ") || "";
  }

  // Validate
  if (!passNo) return null; // skip if no passport number

  const nameStr = nom && prenom ? `${nom}/${prenom}` : (nom || prenom || "");
  return `SRDOCS${airlineCode}HK1-P-MAR-${passNo}-${nat}-${birth}-${gender}-${expiry}-${nameStr}/P`;
}

// Download file with one line per client in column A
export function downloadAmadeusExcel(clients, program) {
  const airline = getProgramAirline(program);
  const airlineCode = normalizeAirlineCode(airline?.code);
  if (!/^[A-Z]{2}$/.test(airlineCode)) {
    throw new Error("Missing airline code");
  }
  const progName = (program?.name || "programme")
    .replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "");
  const depDate  = program?.departure || new Date().toISOString().split("T")[0];
  const filename = `AMADEUS_${progName}_${depDate}.xls`;

  // Build lines — only valid entries
  const lines = [];
  sortClientsForAmadeus(clients).forEach(c => {
    const line = buildAmadeusLine(c, airlineCode);
    if (line) {
      lines.push({ docs: line, pax: lines.length + 1 });
    }
  });

  // Missing passport warning list
  const missing = clients.filter(c => !c.passport?.number);

  // Excel-compatible HTML table: keeps DOCS and PAX in separate columns
  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const excelHtml = `
<html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <table>
      <tr>
        <td>PNR : -</td>
      </tr>
      <tr></tr>
      <tr>
        <td colspan="2">SR DOCS — جاهز للنسخ في Amadeus PNR</td>
      </tr>
      <tr>
        <th>DOCS</th>
        <th>PAX</th>
      </tr>
      ${lines
        .map(
          (line) => `
            <tr>
              <td>${escapeHtml(line.docs)}</td>
              <td>${escapeHtml(line.pax)}</td>
            </tr>
          `
        )
        .join("")}
    </table>
  </body>
</html>
`;

  const bom = "\uFEFF";
  const blob = new Blob([bom + excelHtml], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a       = document.createElement("a");
  a.href        = url;
  a.download    = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { total: lines.length, missing: missing.length };
}
