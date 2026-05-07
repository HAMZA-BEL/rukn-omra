import PizZip from "pizzip";
import { formatCurrency } from "../currency";
import { amountInWordsSentence } from "../amountToWords";
import { savedInvoiceSnapshotToPrintData } from "./invoiceSnapshots";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const label = (lang, ar, fr, en = fr) => (lang === "fr" ? fr : lang === "en" ? en : ar);

const xmlEscape = (value = "") => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

const trimValue = (value) => (typeof value === "string" ? value.trim() : "");
const cleanDisplay = (value, fallback = "-") => trimValue(value) || fallback;
const safeFilePart = (value) => cleanDisplay(value, "invoice").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();

const formatPrintDate = (value) => {
  const raw = trimValue(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const parsed = raw ? new Date(raw) : new Date();
  if (Number.isNaN(parsed.getTime())) return raw;
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${parsed.getFullYear()}`;
};

const run = (text, { bold = false, size = 22 } = {}) => `
  <w:r>
    <w:rPr>${bold ? "<w:b/><w:bCs/>" : ""}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>
    <w:t xml:space="preserve">${xmlEscape(text)}</w:t>
  </w:r>`;

const paragraph = (text, { align = "start", rtl = false, bold = false, size = 22, spacingAfter = 80 } = {}) => {
  const jc = align === "center" ? "center" : align === "end" ? (rtl ? "left" : "right") : (rtl ? "right" : "left");
  return `
    <w:p>
      <w:pPr>${rtl ? "<w:bidi/>" : ""}<w:jc w:val="${jc}"/><w:spacing w:after="${spacingAfter}"/></w:pPr>
      ${run(text, { bold, size })}
    </w:p>`;
};

const cell = (lines, options = {}) => {
  const values = Array.isArray(lines) ? lines : [lines];
  return `
    <w:tc>
      <w:tcPr><w:tcW w:w="${options.width || 2400}" w:type="dxa"/></w:tcPr>
      ${values.map((line) => paragraph(line, options)).join("")}
    </w:tc>`;
};

const table = (rows, { rtl = false } = {}) => `
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="0" w:type="auto"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="6" w:space="0" w:color="888888"/>
        <w:left w:val="single" w:sz="6" w:space="0" w:color="888888"/>
        <w:bottom w:val="single" w:sz="6" w:space="0" w:color="888888"/>
        <w:right w:val="single" w:sz="6" w:space="0" w:color="888888"/>
        <w:insideH w:val="single" w:sz="6" w:space="0" w:color="888888"/>
        <w:insideV w:val="single" w:sz="6" w:space="0" w:color="888888"/>
      </w:tblBorders>
    </w:tblPr>
    ${rows.map((row) => `
      <w:tr>
        ${row.map((item) => cell(item.text, {
          rtl,
          bold: item.bold,
          align: item.align || "start",
          width: item.width,
          size: item.size || 22,
          spacingAfter: 20,
        })).join("")}
      </w:tr>`).join("")}
  </w:tbl>`;

const buildDocumentXml = (body, { rtl = false } = {}) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body}
    <w:sectPr>
      ${rtl ? "<w:bidi/>" : ""}
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="900" w:right="900" w:bottom="900" w:left="900" w:header="708" w:footer="708" w:gutter="0"/>
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

const coreXml = () => {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Invoice</dc:title>
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

export function buildInvoiceDocxBlob({ invoiceData, lang = "ar" } = {}) {
  if (!invoiceData?.valid) return null;
  const rtl = lang === "ar";
  const money = (value) => formatCurrency(value, lang);
  const {
    recipient,
    clientName,
    phone,
    salePrice,
    totalPaid,
    remaining,
    cin,
    passportNo,
    carrier,
    programName,
    departureDate,
    returnDate,
    level,
    roomType,
    latestPayment,
    invoiceNo,
    invoiceDate,
    issuedToCompany,
  } = invoiceData;
  const title = label(lang, `فاتورة رقم ${invoiceNo}`, `FACTURE N° ${invoiceNo}`, `INVOICE No. ${invoiceNo}`);
  const amountWords = amountInWordsSentence(salePrice, lang, "invoice");
  const serviceLabel = label(lang, "باقة العمرة", "Forfait Omra", "Umrah Package");
  const description = [
    `${serviceLabel}${programName ? ` - ${programName}` : ""}`,
    `${label(lang, "المستفيد", "Bénéficiaire", "Beneficiary")}: ${clientName}`,
    departureDate ? `${label(lang, "الذهاب", "Départ", "Departure")}: ${departureDate}` : "",
    returnDate ? `${label(lang, "العودة", "Retour", "Return")}: ${returnDate}` : "",
  ].filter(Boolean);
  const recipientLines = issuedToCompany
    ? [
      `${label(lang, "اسم الشركة", "Nom de la société", "Company name")}: ${cleanDisplay(recipient?.companyName)}`,
      `ICE: ${cleanDisplay(recipient?.ice)}`,
      `${label(lang, "المعتمر", "Client / Pèlerin", "Client / Pilgrim")}: ${cleanDisplay(clientName)}`,
    ]
    : [`${label(lang, "الاسم الكامل", "Nom complet", "Full name")}: ${cleanDisplay(clientName)}`];
  const body = [
    paragraph(formatPrintDate(invoiceDate), { rtl, align: "end", bold: true }),
    paragraph(title, { rtl, align: "center", bold: true, size: 34, spacingAfter: 180 }),
    table([
      [
        { text: label(lang, "الفاتورة باسم", "Facturée à", "Issued to"), bold: true, width: 4200 },
        { text: label(lang, "تفاصيل البرنامج", "Détails programme", "Program Details"), bold: true, width: 4200 },
      ],
      [
        { text: [...recipientLines, `${label(lang, "الهاتف", "Téléphone", "Phone")}: ${cleanDisplay(phone, "")}`, `${label(lang, "CIN", "CIN", "CIN")}: ${cleanDisplay(cin, "")}`, `${label(lang, "رقم الجواز", "N° passeport", "Passport No.")}: ${cleanDisplay(passportNo, "")}`], width: 4200 },
        { text: [`${label(lang, "البرنامج", "Programme", "Program")}: ${cleanDisplay(programName)}`, `${label(lang, "الذهاب", "Départ", "Departure")}: ${cleanDisplay(departureDate)}`, `${label(lang, "العودة", "Retour", "Return")}: ${cleanDisplay(returnDate)}`, `${label(lang, "المستوى", "Niveau", "Level/package")}: ${cleanDisplay(level, "")}`, `${label(lang, "نوع الغرفة", "Type de chambre", "Room type")}: ${cleanDisplay(roomType, "")}`, `${label(lang, "شركة الطيران", "Compagnie aérienne", "Airline")}: ${cleanDisplay(carrier, "")}`], width: 4200 },
      ],
    ], { rtl }),
    paragraph("", { rtl, spacingAfter: 120 }),
    table([
      [
        { text: label(lang, "الكمية", "Qté", "Qty"), bold: true, align: "center", width: 900 },
        { text: label(lang, "البيان", "Désignations", "Description"), bold: true, align: "center", width: 5000 },
        { text: label(lang, "ثمن الوحدة", "P.U", "Unit price"), bold: true, align: "center", width: 1600 },
        { text: label(lang, "المجموع", "P.T", "Total"), bold: true, align: "center", width: 1600 },
      ],
      [
        { text: "1", align: "center", width: 900 },
        { text: description, width: 5000 },
        { text: money(salePrice), align: "center", width: 1600 },
        { text: money(salePrice), align: "center", width: 1600 },
      ],
      [
        { text: label(lang, "المجموع شامل الرسوم", "TOTAL TTC", "TOTAL incl. tax"), bold: true, width: 7500 },
        { text: money(salePrice), bold: true, align: "center", width: 1600 },
      ],
    ], { rtl }),
    paragraph("", { rtl, spacingAfter: 120 }),
    table([
      [{ text: label(lang, "المبلغ المدفوع", "Montant payé", "Paid amount"), bold: true }, { text: money(totalPaid), align: "end" }],
      [{ text: label(lang, "المبلغ المتبقي", "Montant restant", "Remaining amount"), bold: true }, { text: money(remaining), align: "end", bold: true }],
    ], { rtl }),
    paragraph(amountWords, { rtl, bold: true, spacingAfter: 120 }),
    latestPayment?.receiptNo
      ? paragraph(`${label(lang, "مرجع الدفع", "Référence de paiement", "Payment reference")}: ${latestPayment.receiptNo} - ${formatPrintDate(latestPayment.date)}`, { rtl })
      : "",
    paragraph(label(lang, "طابع الوكالة", "Cachet agence", "Agency stamp"), { rtl, align: "end", spacingAfter: 20 }),
  ].join("");

  const zip = new PizZip();
  zip.file("[Content_Types].xml", contentTypesXml);
  zip.folder("_rels").file(".rels", relationshipsXml);
  zip.folder("docProps").file("core.xml", coreXml()).file("app.xml", appXml);
  zip.folder("word").file("document.xml", buildDocumentXml(body, { rtl }));
  return zip.generate({ type: "blob", mimeType: DOCX_MIME, compression: "DEFLATE" });
}

export function downloadInvoiceWordSnapshot({ snapshot, lang = "ar" } = {}) {
  const invoiceData = savedInvoiceSnapshotToPrintData(snapshot);
  if (!invoiceData?.valid) return false;
  const blob = buildInvoiceDocxBlob({ invoiceData, lang });
  if (!blob) return false;
  const prefix = lang === "ar" ? "فاتورة" : "Invoice";
  const fileName = `${prefix} - ${safeFilePart(invoiceData.invoiceNo)}.docx`;
  downloadBlob(blob, fileName);
  return true;
}
