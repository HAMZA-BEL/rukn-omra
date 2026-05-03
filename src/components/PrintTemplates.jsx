// Print templates — called via window.print() after rendering into a hidden div
import React from "react";
import { Modal, Button, Input } from "./UI";
import { TRANSLATIONS } from "../data/initialData";
import { formatCurrency } from "../utils/currency";
import { getClientDisplayName } from "../utils/clientNames";
import { translatePaymentMethod, translateRoomType } from "../utils/i18nValues";
import {
  buildInvoiceData,
  createInvoiceSnapshot,
  createInvoiceSnapshotDraft,
  findSavedInvoiceSnapshot,
  saveSavedInvoiceSnapshot,
  savedInvoiceSnapshotToPrintData,
  validateInvoiceRecipient,
} from "../utils/invoices";

export { cancelInvoiceInRegistry } from "../utils/invoices";

const trimValue = (value) => (typeof value === "string" ? value.trim() : "");
const label = (lang, ar, fr, en = fr) => (lang === "fr" ? fr : lang === "en" ? en : ar);
const cleanDisplay = (value, fallback = "—") => {
  const text = trimValue(value);
  return text || fallback;
};
const openPrintWindow = (features, lang = "ar") => {
  const printWindow = window.open("", "_blank", features);
  return printWindow || null;
};
const popupBlockedMessage = (lang = "ar") => label(
  lang,
  "تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة ثم المحاولة مرة أخرى.",
  "Impossible d'ouvrir la fenêtre d'impression. Veuillez autoriser les pop-ups puis réessayer.",
  "Unable to open the print window. Please allow pop-ups and try again."
);
const getClientCin = (client = {}) => (
  trimValue(client.cin)
  || trimValue(client.CIN)
  || trimValue(client.nationalId)
  || trimValue(client.national_id)
  || trimValue(client.passport?.cin)
  || trimValue(client.passport?.nationalId)
);
const normalizePaymentMethodKind = (value = "") => {
  const method = String(value).trim().toLowerCase();
  if (method.includes("شيك") || method.includes("chèque") || method.includes("cheque") || method.includes("check")) return "cheque";
  if (method.includes("تحويل") || method.includes("virement") || method.includes("transfer")) return "bank";
  return "cash";
};
const paymentExtraDetails = (payment = {}, lang = "ar") => {
  const details = [];
  const kind = normalizePaymentMethodKind(payment.method);
  if (kind === "cheque" && trimValue(payment.chequeNumber)) {
    details.push(`${label(lang, "رقم الشيك", "N° chèque", "Cheque number")}: ${trimValue(payment.chequeNumber)}`);
  }
  if ((kind === "cheque" || kind === "bank") && trimValue(payment.paidBy)) {
    details.push(`${label(lang, "من طرف", "De la part de", "From / Paid by")}: ${trimValue(payment.paidBy)}`);
  }
  return details.join(" — ");
};
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FILE_NUMBER_KEYS = [
  "fileRef", "file_ref",
  "fileNumber", "file_number",
  "fileNo", "file_no",
  "dossier", "dossierNo", "dossier_no",
  "caseNumber", "case_number",
  "folderNumber", "folder_number",
  "reference",
];
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
const getReadableFileNumber = (client = {}, programClients = []) => {
  for (const key of FILE_NUMBER_KEYS) {
    const value = trimValue(client?.[key]);
    if (value && !UUID_REGEX.test(value)) return value;
  }
  const scoped = Array.isArray(programClients)
    ? programClients.filter((item) => !client.programId || item.programId === client.programId)
    : [];
  const source = scoped.length ? scoped : (Array.isArray(programClients) ? programClients : []);
  const index = source.findIndex((item) => item?.id === client?.id);
  return String(index >= 0 ? index + 1 : 1).padStart(3, "0");
};
const commonPrintCSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; font-size:12px; background:#fff; color:#111; }
  .page { width:190mm; min-height:297mm; margin:0 auto; padding:50mm 16mm 38mm; direction:inherit; }
  .issue-date { text-align:right; font-size:12px; margin-bottom:10px; color:#222; }
  .title { text-align:center; font-size:20px; font-weight:800; margin-bottom:12px; color:#111; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px; }
  .box { border:1px solid #ccc; padding:9px 10px; min-height:72px; }
  .box h3 { font-size:11px; color:#555; margin-bottom:6px; font-weight:800; }
  .box p { font-size:12px; font-weight:600; line-height:1.65; }
  table { width:100%; border-collapse:collapse; margin-bottom:12px; }
  th { background:#f1f1f1; color:#111; padding:7px 9px; font-size:11px; border:1px solid #cfcfcf; text-align:inherit; }
  td { padding:7px 9px; border:1px solid #d8d8d8; font-size:12px; vertical-align:top; }
  .amount { font-weight:800; white-space:nowrap; }
  .total-box { margin-right:auto; width:250px; border:1px solid #aaa; padding:8px 10px; }
  .total-row { display:flex; justify-content:space-between; gap:16px; padding:3px 0; font-size:12px; }
  .total-final { border-top:1px solid #777; margin-top:5px; padding-top:7px; font-size:14px; font-weight:900; }
  .payment-ref { margin-top:8px; font-size:11px; color:#333; line-height:1.7; }
  .stamp { margin-top:26px; display:flex; justify-content:space-between; gap:24px; }
  .stamp-box { border:1px dashed #777; width:155px; height:78px; margin-bottom:7px; }
  @media print { @page { size:A4 portrait; margin:0; } }
`;
export function InvoiceRecipientModal({ open, onClose, onPrint, lang = "ar", documentType = "invoice" }) {
  const [recipientType, setRecipientType] = React.useState("client");
  const [companyName, setCompanyName] = React.useState("");
  const [companyIce, setCompanyIce] = React.useState("");
  const [error, setError] = React.useState("");
  const [printing, setPrinting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setRecipientType("client");
    setCompanyName("");
    setCompanyIce("");
    setError("");
    setPrinting(false);
  }, [open]);

  const recipientOptions = [
    { value: "client", label: label(lang, "إصدار باسم المعتمر", "Émettre au nom du client", "Issue to pilgrim") },
    { value: "company", label: label(lang, "إصدار باسم شركة / مؤسسة", "Émettre au nom d'une société / institution", "Issue to company / organization") },
  ];

  const handlePrint = async () => {
    if (printing) return;
    const name = trimValue(companyName);
    const ice = trimValue(companyIce);
    const validation = validateInvoiceRecipient(
      recipientType === "company"
        ? { type: "company", companyName: name, ice }
        : { type: "client" }
    );
    if (validation.field === "companyName") {
      setError(label(lang, "اسم الشركة مطلوب", "Le nom de la société est obligatoire", "Company name is required"));
      return;
    }
    if (validation.field === "ice") {
      setError(label(lang, "ICE مطلوب لفاتورة الشركة", "ICE est obligatoire pour une facture société", "ICE is required for a company invoice"));
      return;
    }

    setPrinting(true);
    try {
      const printed = await Promise.resolve(onPrint?.(
        recipientType === "company"
          ? { type: "company", companyName: name, ice }
          : { type: "client" }
      ));
      if (printed === false) {
        setError(popupBlockedMessage(lang));
        return;
      }
      onClose?.();
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={label(lang, "إعداد الفاتورة", "Préparation de la facture", "Invoice Setup")}
      width={520}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gap: 10 }}>
          {recipientOptions.map((option) => {
            const active = recipientType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => { setRecipientType(option.value); setError(""); }}
                style={{
                  width: "100%",
                  textAlign: "start",
                  padding: "13px 14px",
                  borderRadius: 12,
                  border: active ? "1px solid var(--rukn-gold)" : "1px solid var(--rukn-border-soft)",
                  background: active ? "var(--rukn-gold-dim)" : "var(--rukn-bg-soft)",
                  color: active ? "var(--rukn-gold)" : "var(--rukn-text)",
                  fontFamily: "'Cairo',sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {recipientType === "company" && (
          <div style={{ display: "grid", gap: 12 }}>
            <Input
              label={label(lang, "اسم الشركة", "Nom de la société", "Company name")}
              required
              value={companyName}
              onChange={(event) => { setCompanyName(event.target.value); setError(""); }}
            />
            <Input
              label="ICE"
              required
              value={companyIce}
              onChange={(event) => { setCompanyIce(event.target.value); setError(""); }}
            />
          </div>
        )}

        {error && (
          <div style={{
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(239,68,68,.1)",
            border: "1px solid rgba(239,68,68,.25)",
            color: "var(--rukn-danger)",
            fontSize: 13,
            fontWeight: 700,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={onClose}>
            {label(lang, "إلغاء", "Annuler", "Cancel")}
          </Button>
          <Button variant="primary" icon="print" onClick={handlePrint} disabled={printing}>
            {printing
              ? label(lang, "جاري التحضير...", "Préparation...", "Preparing...")
              : documentType === "proforma"
              ? label(lang, "طباعة فاتورة أولية", "Imprimer proforma", "Print Proforma")
              : label(lang, "طباعة الفاتورة", "Imprimer la facture", "Print Invoice")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function printReceipt({ payment, client, program, agency, lang = "ar" }) {
  const isAr = lang === "ar";
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const clientName = getClientDisplayName(client, t.pilgrimFallback || "—", lang);
  const money = (value) => formatCurrency(value, lang);
  const cin = getClientCin(client);
  const extraDetails = paymentExtraDetails(payment, lang);
  const html = `<!DOCTYPE html>
<html dir="${isAr?"rtl":"ltr"}" lang="${lang}">
<head>
<meta charset="UTF-8"/>
<title>${label(lang, "وصل دفعة", "Reçu de paiement", "Payment Receipt")}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; font-size:12px; color:#111; background:#fff; }
  .page { width:190mm; min-height:297mm; margin:0 auto; padding:50mm 18mm 38mm; }
  .receipt-title { font-size:20px; font-weight:800; margin-bottom:8px; text-align:center; color:#111; }
  .receipt-no { text-align:center; font-size:13px; color:#333; margin-bottom:16px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding:8px 10px; border:1px solid #d8d8d8; font-size:12px; }
  td:first-child { font-weight:800; background:#f5f5f5; width:36%; }
  .amount-row td { font-size:16px; font-weight:900; color:#111; }
  .signature { margin-top:28px; display:flex; justify-content:space-between; gap:24px; font-size:11px; }
  .signature-box { border:1px dashed #777; width:155px; height:76px; margin-bottom:7px; }
  @media print { @page { size:A4 portrait; margin:0; } }
</style>
</head>
<body>
<div class="page">
  <div class="receipt-title">${label(lang, "وصل استلام مبلغ", "REÇU DE PAIEMENT", "PAYMENT RECEIPT")}</div>
  <div class="receipt-no">${label(lang, "رقم", "N°", "No.")}: <strong>${payment.receiptNo}</strong></div>
  <table>
    <tr><td>${label(lang, "المعتمر", "Client", "Client")}</td><td>${clientName}${client.nameLatin && client.nameLatin !== clientName ? " — "+client.nameLatin : ""}</td></tr>
    <tr><td>${label(lang, "رقم البطاقة الوطنية", "N° CIN", "National ID / CIN")}</td><td>${cleanDisplay(cin, "")}</td></tr>
    <tr><td>${label(lang, "البرنامج", "Programme", "Program")}</td><td>${program?.name || "—"}</td></tr>
    <tr><td>${label(lang, "طريقة الدفع", "Mode de paiement", "Payment Method")}</td><td>${translatePaymentMethod(payment.method, lang)}</td></tr>
    ${extraDetails ? `<tr><td>${label(lang, "تفاصيل الدفع", "Détails paiement", "Payment details")}</td><td>${extraDetails}</td></tr>` : ""}
    <tr><td>${label(lang, "التاريخ", "Date", "Date")}</td><td>${payment.date}</td></tr>
    ${payment.note ? `<tr><td>${label(lang, "ملاحظة", "Note", "Note")}</td><td>${payment.note}</td></tr>` : ""}
    <tr class="amount-row">
      <td>${label(lang, "المبلغ المستلم", "MONTANT REÇU", "AMOUNT RECEIVED")}</td>
      <td>${money(payment.amount)}</td>
    </tr>
  </table>
  <div class="signature">
    <div style="text-align:center"><div class="signature-box"></div>${label(lang, "ختم الوكالة", "Cachet de l'agence", "Agency Stamp")}</div>
    <div style="text-align:center"><div class="signature-box"></div>${label(lang, "توقيع المعتمر", "Signature du client", "Client Signature")}</div>
  </div>
</div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1000);}</script>
</body></html>`;
  const w = openPrintWindow("width=700,height=500", lang);
  if (!w) return false;
  w.document.write(html); w.document.close();
  return true;
}

export function printClientCard({ client, program, agency, lang = "ar", programClients = [] }) {
  const isAr = lang === "ar";  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;  const p = client.passport || {};
  const clientName = getClientDisplayName(client, t.pilgrimFallback || "—", lang);
  const latinName = client.nameLatin && client.nameLatin !== clientName ? client.nameLatin : "";
  const fileNumber = getReadableFileNumber(client, programClients);
  const cin = getClientCin(client);
  const carrier = trimValue(program?.carrier || program?.company || program?.compagnie || program?.airline || program?.transport);
  const level = client.packageLevel || client.hotelLevel || "";
  const notes = trimValue(client.note || client.notes);
  const html = `<!DOCTYPE html>
<html dir="${isAr?"rtl":"ltr"}" lang="${lang}">
<head>
<meta charset="UTF-8"/>
<title>${label(lang, "بطاقة المعتمر", "Carte pèlerin", "Pilgrim Card")}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; font-size:12px; background:#fff; color:#111; }
  .page { width:190mm; min-height:297mm; margin:0 auto; padding:50mm 18mm 38mm; }
  .title { font-size:20px; font-weight:900; text-align:center; margin-bottom:14px; }
  .file-no { text-align:center; font-size:14px; font-weight:800; margin-bottom:14px; }
  .name { font-size:18px; font-weight:900; margin-bottom:3px; text-align:center; }
  .name-latin { font-size:13px; color:#555; margin-bottom:12px; text-align:center; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:7px; margin-bottom:12px; }
  .item { border:1px solid #d8d8d8; padding:7px 9px; min-height:42px; }
  .item label { font-size:10px; color:#666; display:block; margin-bottom:3px; }
  .item span  { font-size:12px; font-weight:800; }
  .docs { display:flex; gap:7px; flex-wrap:wrap; margin-top:10px; }
  .doc-badge { padding:3px 8px; border-radius:10px; font-size:10px; font-weight:800; border:1px solid #aaa; color:#111; }
  .doc-ok  { background:#f4f4f4; }
  .doc-no  { background:#fff; color:#555; }
  .notes { border:1px solid #d8d8d8; padding:8px 9px; margin-top:10px; font-size:12px; line-height:1.7; }
  @media print { @page { size:A4 portrait; margin:0; } }
</style>
</head>
<body>
  <div class="page">
  <div class="title">${label(lang, "بطاقة المعتمر", "Carte pèlerin", "Pilgrim Card")}</div>
  <div class="file-no">${label(lang, "ملف رقم", "Dossier N°", "File No.")}: ${fileNumber}</div>
  <div class="name">${clientName}</div>
  ${latinName ? `<div class="name-latin">${latinName}</div>` : ""}
  <div class="grid">
    <div class="item"><label>${label(lang, "الهاتف", "Téléphone", "Phone")}</label><span>${client.phone || "—"}</span></div>
    <div class="item"><label>${label(lang, "رقم البطاقة الوطنية", "N° CIN", "National ID / CIN")}</label><span>${cleanDisplay(cin, "—")}</span></div>
    ${p.number ? `<div class="item"><label>${label(lang, "رقم الجواز", "Passeport", "Passport")}</label><span>${p.number}</span></div>` : ""}
    <div class="item"><label>${label(lang, "البرنامج", "Programme", "Program")}</label><span>${program?.name || "—"}</span></div>
    <div class="item"><label>${label(lang, "الذهاب", "Départ", "Departure")}</label><span>${program?.departure || "—"}</span></div>
    <div class="item"><label>${label(lang, "العودة", "Retour", "Return")}</label><span>${program?.returnDate || "—"}</span></div>
    <div class="item"><label>${label(lang, "المستوى", "Niveau", "Level/package")}</label><span>${cleanDisplay(level, "—")}</span></div>
    <div class="item"><label>${label(lang, "نوع الغرفة", "Chambre", "Room Type")}</label><span>${translateRoomType(client.roomType || client.roomTypeLabel, lang) || "—"}</span></div>
    <div class="item"><label>${label(lang, "الشركة الناقلة", "Compagnie", "Carrier company")}</label><span>${cleanDisplay(carrier, "—")}</span></div>
    ${p.expiry ? `<div class="item"><label>${label(lang, "انتهاء الجواز", "Expiration", "Expiry")}</label><span>${p.expiry}</span></div>` : ""}
    ${client.ticketNo ? `<div class="item"><label>${label(lang, "رقم التذكرة", "N° billet", "Ticket No.")}</label><span>${client.ticketNo}</span></div>` : ""}
  </div>
  ${client.docs ? `<div class="docs">
    ${[["passportCopy",label(lang, "صورة الجواز", "Passeport", "Passport")],["photo",label(lang, "صورة", "Photo", "Photo")],["vaccine",label(lang, "تطعيم", "Vaccin", "Vaccine")],["contract",label(lang, "عقد", "Contrat", "Contract")]].map(([k,l])=>`
	    <span class="doc-badge ${client.docs[k]?"doc-ok":"doc-no"}">${client.docs[k]?"OK":"NO"} ${l}</span>`).join("")}
	  </div>` : ""}
  ${notes ? `<div class="notes">${label(lang, "ملاحظات", "Notes", "Notes")}: ${notes}</div>` : ""}
</div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1000);}</script>
</body></html>`;
  const w = openPrintWindow("width=750,height=520", lang);
  if (!w) return false;
  w.document.write(html); w.document.close();
  return true;
}

async function printInvoiceDocument({
  client,
  program,
  payments,
  agency,
  lang = "ar",
  recipient,
  recipientType,
  companyName,
  companyIce,
  ice,
  documentType = "invoice",
  snapshot,
  autoPrint = true,
  invoiceApi,
}) {
  const isAr = lang === "ar";
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const invoicePayments = payments || [];
  const remoteFinalInvoice = !snapshot && documentType !== "proforma" && invoiceApi?.isRemote && invoiceApi?.issueFinalInvoiceSnapshot;
  const snapshotInvoiceData = snapshot ? savedInvoiceSnapshotToPrintData(snapshot) : null;
  if (snapshot && !snapshotInvoiceData) return false;
  const builtInvoiceData = snapshotInvoiceData || buildInvoiceData({
    client,
    program,
    payments: invoicePayments,
    recipient,
    recipientType,
    companyName,
    companyIce,
    ice,
    fallbackName: t.pilgrimFallback || "—",
    lang,
    documentType,
    skipInvoiceRegistry: remoteFinalInvoice,
  });
  let earlyPrintWindow = null;
  let invoiceData = builtInvoiceData;
  let pendingSnapshot = null;

  if (remoteFinalInvoice) {
    if (!builtInvoiceData.valid) return false;
    if (autoPrint) {
      earlyPrintWindow = openPrintWindow("width=900,height=680", lang);
      if (!earlyPrintWindow) return false;
    }
    const draft = createInvoiceSnapshotDraft({
      invoiceData: builtInvoiceData,
      client,
      program,
      payments: invoicePayments,
    });
    const result = await invoiceApi.issueFinalInvoiceSnapshot(draft);
    const savedSnapshot = result?.data || result;
    const remoteInvoiceData = savedInvoiceSnapshotToPrintData(savedSnapshot);
    if (!remoteInvoiceData) {
      try { earlyPrintWindow?.close?.(); } catch {}
      return false;
    }
    invoiceData = remoteInvoiceData;
  } else {
  const existingSnapshot = !snapshotInvoiceData && documentType !== "proforma" && builtInvoiceData.valid
    ? findSavedInvoiceSnapshot({
      invoiceKey: builtInvoiceData.invoiceItem?.invoiceKey,
      invoiceDisplayNumber: builtInvoiceData.invoiceNo,
    })
    : null;
  pendingSnapshot = !snapshotInvoiceData && !existingSnapshot && documentType !== "proforma" && builtInvoiceData.valid
    ? createInvoiceSnapshot({ invoiceData: builtInvoiceData, client, program, payments: invoicePayments })
    : null;
  const snapshotSource = snapshotInvoiceData ? snapshot : existingSnapshot || pendingSnapshot;
  invoiceData = snapshotSource
    ? savedInvoiceSnapshotToPrintData(snapshotSource) || builtInvoiceData
    : builtInvoiceData;
  }
  if (!invoiceData.valid) return false;
  const {
    recipient: invoiceRecipient,
    clientName,
    latinName,
    phone,
    totalPaid,
    salePrice,
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
  const isProforma = documentType === "proforma";
  const money = (value) => formatCurrency(value, lang);
  const title = isProforma
    ? label(lang, "فاتورة أولية", "FACTURE PROFORMA", "PROFORMA INVOICE")
    : label(lang, `فاتورة رقم ${invoiceNo}`, `FACTURE N° ${invoiceNo}`, `INVOICE No. ${invoiceNo}`);
  const serviceLabel = label(lang, "باقة العمرة", "Forfait Omra", "Umrah Package");
  const paymentReference = latestPayment && (latestPayment.receiptNo || latestPayment.date)
    ? [
      latestPayment.receiptNo ? `${label(lang, "رقم الوصل", "N° Reçu", "Receipt No.")}: ${latestPayment.receiptNo}` : "",
      latestPayment.date ? `${label(lang, "التاريخ", "Date", "Date")}: ${formatPrintDate(latestPayment.date)}` : "",
    ].filter(Boolean).join(" — ")
    : "";
  const displayProgramName = programName || program?.name || "—";
  const displayDeparture = departureDate || program?.departure || "—";
  const displayReturn = returnDate || program?.returnDate || "—";
  const displayLevel = level || client?.packageLevel || client?.hotelLevel || "";
  const displayRoomType = roomType || client?.roomType || client?.roomTypeLabel || "";
  const displayPhone = phone || client?.phone || "";
  const bootScript = autoPrint
    ? `<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1200);}</script>`
    : "";
  const html = `<!DOCTYPE html>
<html dir="${isAr?"rtl":"ltr"}" lang="${lang}">
<head>
<meta charset="UTF-8"/>
<title>${title}</title>
<style>
${commonPrintCSS}
</style>
</head>
<body>
  <div class="page">
  <div class="issue-date">${label(lang, "تاريخ الإصدار", "Date d'émission", "Issue date")}: ${formatPrintDate(invoiceDate)}</div>
  <div class="title">${title}</div>
  <div class="grid">
    <div class="box">
      <h3>${issuedToCompany ? label(lang, "الفاتورة باسم", "Facturée à", "Issued to") : label(lang, "المعتمر", "Client / Pèlerin", "Client / Pilgrim")}</h3>
      ${issuedToCompany ? `
        <p>${label(lang, "اسم الشركة", "Nom de la société", "Company name")}: ${cleanDisplay(invoiceRecipient.companyName, "")}</p>
        <p>ICE: ${cleanDisplay(invoiceRecipient.ice, "")}</p>
        <p>${label(lang, "المعتمر", "Client / Pèlerin", "Client / Pilgrim")}: ${clientName}</p>
      ` : `
        <p>${label(lang, "الاسم الكامل", "Nom complet", "Full name")}: ${clientName}</p>
      `}
      ${latinName ? `<p>${latinName}</p>` : ""}
      <p>${label(lang, "رقم الهاتف", "Téléphone", "Phone")}: ${cleanDisplay(displayPhone, "")}</p>
      <p>${label(lang, "رقم البطاقة الوطنية CIN", "N° CIN", "National ID / CIN")}: ${cleanDisplay(cin, "")}</p>
      <p>${label(lang, "رقم الجواز", "N° passeport", "Passport No.")}: ${cleanDisplay(passportNo, "")}</p>
    </div>
    <div class="box">
      <h3>${label(lang, "تفاصيل البرنامج", "Détails programme", "Program Details")}</h3>
      <p>${label(lang, "البرنامج", "Programme", "Program")}: ${displayProgramName}</p>
      <p>${label(lang, "الذهاب", "Départ", "Departure")}: ${displayDeparture}</p>
      <p>${label(lang, "العودة", "Retour", "Return")}: ${displayReturn}</p>
      <p>${label(lang, "المستوى", "Niveau", "Level/package")}: ${cleanDisplay(displayLevel, "")}</p>
      <p>${label(lang, "نوع الغرفة", "Type de chambre", "Room type")}: ${translateRoomType(displayRoomType, lang) || "—"}</p>
      <p>${label(lang, "الشركة الناقلة", "Compagnie", "Carrier company")}: ${cleanDisplay(carrier, "")}</p>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>${label(lang, "البيان", "Description", "Description")}</th>
        <th>${label(lang, "المبلغ", "Montant", "Amount")}</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>${serviceLabel} — ${displayProgramName === "—" ? "" : displayProgramName}</td><td class="amount">${money(salePrice)}</td></tr>
    </tbody>
  </table>
  <div class="total-box">
    ${isProforma ? `
      <div class="total-row"><span>${label(lang, "إجمالي سعر البرنامج", "Prix total du programme", "Program total")}</span><span>${money(salePrice)}</span></div>
      <div class="total-row"><span>${label(lang, "المبلغ المدفوع", "Montant payé", "Paid amount")}</span><span>${money(totalPaid)}</span></div>
      <div class="total-row total-final"><span>${label(lang, "المبلغ المتبقي", "Reste à payer", "Remaining amount")}</span><span>${money(remaining)}</span></div>
    ` : `
      <div class="total-row total-final"><span>${label(lang, "المبلغ الإجمالي", "Montant total", "Total amount")}</span><span>${money(salePrice)}</span></div>
    `}
  </div>
  ${paymentReference ? `<div class="payment-ref">${label(lang, "مرجع الدفع", "Référence de paiement", "Payment reference")}: ${paymentReference}</div>` : ""}
  <div class="stamp">
    <div style="text-align:center;font-size:11px"><div class="stamp-box"></div>${label(lang, "ختم الوكالة", "Cachet agence", "Agency Stamp")}</div>
    <div style="text-align:center;font-size:11px"><div class="stamp-box"></div>${label(lang, "توقيع المعتمر", "Signature client", "Client Signature")}</div>
  </div>
</div>
${bootScript}
</body></html>`;
  const w = earlyPrintWindow || openPrintWindow("width=900,height=680", lang);
  if (!w) return false;
  w.document.write(html); w.document.close();
  if (pendingSnapshot && autoPrint) saveSavedInvoiceSnapshot(pendingSnapshot);
  return true;
}

export function printInvoice(args) {
  return printInvoiceDocument({ ...args, documentType: "invoice" });
}

export function printProformaInvoice(args) {
  return printInvoiceDocument({ ...args, documentType: "proforma" });
}

export function printInvoiceSnapshot({ snapshot, lang = "ar" }) {
  return printInvoiceDocument({ snapshot, lang, documentType: "invoice" });
}

export function previewInvoiceSnapshot({ snapshot, lang = "ar" }) {
  return printInvoiceDocument({ snapshot, lang, documentType: "invoice", autoPrint: false });
}
