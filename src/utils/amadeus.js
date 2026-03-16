/**
 * Amadeus SR DOCS Export
 * Format: SRDOCSSVHK1-P-MAR-[Passport]-[Nat]-[BirthDate]-[Gender]-[ExpiryDate]-[NOM]/[PRENOM]/P[N]
 * Dates in Amadeus format: 09APR00 (DDMMMYY)
 */

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

// Build one Amadeus SR DOCS line
function buildAmadeusLine(client, index) {
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
  const ser = index + 1;

  return `SRDOCSSVHK1-P-MAR-${passNo}-${nat}-${birth}-${gender}-${expiry}-${nameStr}/P${ser}`;
}

// Download file with one line per client in column A
export function downloadAmadeusExcel(clients, program) {
  const progName = (program?.name || "programme")
    .replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "");
  const depDate  = program?.departure || new Date().toISOString().split("T")[0];
  const filename = `AMADEUS_${progName}_${depDate}.xls`;

  // Build lines — only valid entries
  const lines = [];
  let ser = 0;
  clients.forEach(c => {
    const line = buildAmadeusLine(c, ser);
    if (line) {
      lines.push(line);
      ser++;
    }
  });

  // Missing passport warning list
  const missing = clients.filter(c => !c.passport?.number);

  // Excel content: PNR header + empty row + column header + data
  const rows = [
    "PNR : -",
    "",
    "SR DOCS — جاهز للنسخ في Amadeus PNR",
    ...lines,
  ];

  // Tab-separated so each row is in column A
  const content = rows.join("\r\n");
  const bom     = "\uFEFF";
  const blob    = new Blob([bom + content], { type: "text/plain;charset=utf-8;" });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement("a");
  a.href        = url;
  a.download    = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { total: lines.length, missing: missing.length };
}
