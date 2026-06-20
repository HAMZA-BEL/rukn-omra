// Print templates — called via window.print() after rendering into a hidden div
import React from "react";
import { Modal, Button, Input } from "./UI";
import { TRANSLATIONS } from "../data/initialData";
import { formatCurrency } from "../utils/currency";
import { amountInWordsSentence } from "../utils/amountToWords";
import { getClientDisplayName } from "../utils/clientNames";
import { escapeHtml } from "../utils/escapeHtml";
import {
  formatProgramLevelForDocument,
  formatProgramPackageLabelForDocument,
  formatRoomTypeForDocument,
} from "../utils/documentDisplay";
import { translatePaymentMethod, translateRoomType } from "../utils/i18nValues";
import { getParticipantTerminology } from "../utils/participantTerminology";
import {
  buildInvoiceData,
  createInvoiceSnapshot,
  createInvoiceSnapshotDraft,
  findSavedInvoiceSnapshot,
  getInvoiceProgramDisplayName,
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
const overlayLiveInvoiceTravelFields = (invoiceData = {}, liveInvoiceData = {}) => {
  if (!invoiceData?.valid || !liveInvoiceData?.valid) return invoiceData;
  const next = { ...invoiceData };
  [
    "carrier",
    "departureDate",
    "returnDate",
    "route",
    "itinerary",
    "travelRoute",
    "travel_route",
    "routeText",
    "route_text",
    "visitOrder",
    "visit_order",
    "hotelCheckinDay",
    "hotel_checkin_day",
    "hotelCheckIn",
    "hotel_check_in",
  ].forEach((key) => {
    const value = trimValue(liveInvoiceData[key]);
    if (value) next[key] = value;
  });
  return next;
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
  if (
    method.includes("تحويل")
    || method.includes("virement")
    || method.includes("transfer")
    || method.includes("إيداع")
    || method.includes("ايداع")
    || method.includes("dépôt")
    || method.includes("depot")
    || method.includes("deposit")
  ) return "bank";
  return "cash";
};
const getPaymentValue = (payment = {}, keys = []) => {
  for (const key of keys) {
    const value = trimValue(payment[key]);
    if (value) return value;
  }
  return "";
};
const toAmount = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};
const getPaymentAmount = (payment = {}) => toAmount(payment.amount);
const getPaymentReceiptNumber = (payment = {}) => getPaymentValue(payment, ["receiptNo", "receipt_no", "receiptNumber", "receipt_number"]);
const isSamePayment = (a = {}, b = {}) => {
  if (a.id && b.id && a.id === b.id) return true;
  const aReceipt = getPaymentReceiptNumber(a);
  const bReceipt = getPaymentReceiptNumber(b);
  return Boolean(aReceipt && bReceipt && aReceipt === bReceipt);
};
const getReceiptSequence = (payment = {}) => {
  const sequence = Number(payment.receiptSequence ?? payment.receipt_sequence);
  return Number.isFinite(sequence) ? sequence : null;
};
const getPaymentTime = (payment = {}) => {
  const time = new Date(payment.date || payment.createdAt || payment.created_at || 0).getTime();
  return Number.isFinite(time) ? time : 0;
};
const sortPaymentsForReceipt = (items = []) => (
  items
    .map((payment, index) => ({ payment, index }))
    .sort((a, b) => {
      const sequenceA = getReceiptSequence(a.payment);
      const sequenceB = getReceiptSequence(b.payment);
      if (sequenceA !== null && sequenceB !== null && sequenceA !== sequenceB) return sequenceA - sequenceB;
      const timeDiff = getPaymentTime(a.payment) - getPaymentTime(b.payment);
      if (timeDiff) return timeDiff;
      return a.index - b.index;
    })
    .map(({ payment }) => payment)
);
const calculateReceiptAmounts = ({ payment = {}, client = {}, payments = [] } = {}) => {
  const salePrice = toAmount(client.salePrice ?? client.price);
  const paymentAmount = getPaymentAmount(payment);
  const sameClientPayments = Array.isArray(payments)
    ? payments.filter((item) => !client.id || !item.clientId || item.clientId === client.id)
    : [];
  const sortedPayments = sortPaymentsForReceipt(sameClientPayments);
  const selectedIndex = sortedPayments.findIndex((item) => isSamePayment(item, payment));
  const paidThroughReceipt = selectedIndex >= 0
    ? sortedPayments.slice(0, selectedIndex + 1)
    : (sortedPayments.length ? sortedPayments : [payment]);
  const totalPaidSoFar = paidThroughReceipt.reduce((sum, item) => sum + getPaymentAmount(item), 0);
  const remaining = salePrice > 0 ? Math.max(0, salePrice - totalPaidSoFar) : 0;
  return { salePrice, paymentAmount, totalPaidSoFar, remaining };
};
const paymentExtraDetails = (payment = {}, lang = "ar", { includeInternal = false } = {}) => {
  if (!includeInternal) return "";
  const details = [];
  const method = getPaymentValue(payment, ["method", "paymentMethod", "payment_method"]);
  const kind = normalizePaymentMethodKind(method);
  const chequeNumber = getPaymentValue(payment, ["chequeNumber", "cheque_number", "checkNumber", "check_number"]);
  const paidBy = getPaymentValue(payment, ["paidBy", "paid_by"]);
  if (kind === "cheque" && chequeNumber) {
    details.push(`${label(lang, "رقم الشيك", "N° chèque", "Cheque number")}: ${chequeNumber}`);
  }
  if ((kind === "cheque" || kind === "bank") && paidBy) {
    details.push(`${label(lang, "من طرف", "Payé par", "Paid by")}: ${paidBy}`);
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
const formatInvoiceTravelDate = (value) => {
  const raw = trimValue(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return raw;
};
const getAgencyBankDetails = (agency = {}) => ([
  ["bank", trimValue(agency.bankName || agency.bank_name)],
  ["holder", trimValue(agency.bankAccountHolder || agency.bank_account_holder)],
  ["rib", trimValue(agency.bankRib || agency.bank_rib)],
  ["iban", trimValue(agency.bankIban || agency.bank_iban)],
  ["note", trimValue(agency.bankNote || agency.bank_note)],
]).filter(([, value]) => value);
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
  .page { width:190mm; min-height:297mm; margin:0 auto; padding:42mm 15mm 32mm; direction:inherit; }
  .issue-date { text-align:end; font-size:12px; margin-bottom:8px; color:#222; font-weight:700; }
  .title { text-align:center; font-size:20px; font-weight:900; margin:12px 0 16px; color:#111; letter-spacing:.2px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; }
  .box { border:1px solid #bdbdbd; padding:9px 10px; min-height:92px; }
  .box h3 { font-size:11px; color:#111; margin-bottom:6px; font-weight:900; text-transform:uppercase; border-bottom:1px solid #e5e5e5; padding-bottom:4px; }
  .box p { font-size:11.5px; font-weight:600; line-height:1.65; }
  table.invoice-table { width:100%; border-collapse:collapse; margin:10px 0 12px; table-layout:fixed; }
  .invoice-table th { background:#f3f4f6; color:#111; padding:8px 8px; font-size:11px; border:1px solid #a7a7a7; text-align:center; font-weight:900; }
  .invoice-table td { padding:9px 8px; border:1px solid #bdbdbd; font-size:12px; vertical-align:top; }
  .qty { width:12%; text-align:center; }
  .designation { width:52%; line-height:1.7; }
  .price { width:18%; text-align:center; white-space:nowrap; }
  .amount { font-weight:800; white-space:nowrap; }
  .total-line td { font-weight:900; background:#fafafa; }
  .total-label { text-align:end; }
  .summary-box { margin-inline-start:auto; width:280px; border:1px solid #aaa; padding:8px 10px; margin-bottom:10px; }
  .summary-row { display:flex; justify-content:space-between; gap:16px; padding:3px 0; font-size:12px; }
  .summary-final { border-top:1px solid #777; margin-top:5px; padding-top:7px; font-size:14px; font-weight:900; }
  .words { margin:12px 0; border:1px solid #cfcfcf; background:#fafafa; padding:9px 10px; font-size:12px; font-weight:800; line-height:1.75; }
  .bank { margin-top:14px; border:1px solid #bdbdbd; padding:10px; }
  .bank h3 { font-size:12px; font-weight:900; margin-bottom:7px; color:#111; }
  .bank-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 12px; }
  .bank-row { font-size:11.5px; line-height:1.55; }
  .bank-row strong { color:#111; }
  .payment-ref { margin-top:8px; font-size:11px; color:#333; line-height:1.7; }
  .stamp { margin-top:14px; display:flex; justify-content:space-between; gap:24px; align-items:flex-start; }
  .stamp-label { min-width:150px; text-align:center; font-size:11px; color:#222; font-weight:700; }
  html[dir="rtl"] .price, html[dir="rtl"] .qty { text-align:center; }
  @media print { @page { size:A4 portrait; margin:0; } }
`;
export function InvoiceRecipientModal({ open, onClose, onPrint, lang = "ar", documentType = "invoice", submitLabel = "" }) {
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
              : submitLabel
                ? submitLabel
              : documentType === "proforma"
              ? label(lang, "طباعة فاتورة أولية", "Imprimer proforma", "Print Proforma")
              : label(lang, "طباعة الفاتورة", "Imprimer la facture", "Print Invoice")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function printReceipt({ payment, client, program, agency, lang = "ar", receiptType = "client", payments = [] }) {
  const isAr = lang === "ar";
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const isAgencyReceipt = receiptType === "agency";
  const terms = getParticipantTerminology(program, client, lang);
  const clientName = getClientDisplayName(client, terms.singular || t.pilgrimFallback || "—", lang);
  const money = (value) => formatCurrency(value, lang);
  const cin = getClientCin(client);
  const paymentMethod = getPaymentValue(payment, ["method", "paymentMethod", "payment_method"]);
  const receiptNo = getPaymentValue(payment, ["receiptNo", "receipt_no", "receiptNumber", "receipt_number"]);
  const chequeNumber = getPaymentValue(payment, ["chequeNumber", "cheque_number", "checkNumber", "check_number"]);
  const note = getPaymentValue(payment, ["note", "notes"]);
  const extraDetails = paymentExtraDetails(payment, lang, { includeInternal: isAgencyReceipt });
  const receiptAmounts = calculateReceiptAmounts({ payment, client, payments });
  const agencyLogoUrl = cleanDisplay(agency?.logoUrl || agency?.logo_url, "");
  const receiptTitle = isAgencyReceipt
    ? label(lang, "وصل الوكالة", "REÇU AGENCE", "AGENCY RECEIPT")
    : terms.receiptTitle;
  const html = `<!DOCTYPE html>
<html dir="${isAr?"rtl":"ltr"}" lang="${escapeHtml(lang)}">
<head>
<meta charset="UTF-8"/>
<title>${escapeHtml(receiptTitle)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; font-size:12px; color:#111; background:#fff; }
  .page { width:190mm; min-height:297mm; margin:0 auto; padding:50mm 18mm 38mm; }
  .receipt-logo { display:flex; justify-content:center; align-items:center; margin:-16mm 0 7mm; min-height:18mm; }
  .receipt-logo img { display:block; max-width:42mm; max-height:18mm; object-fit:contain; }
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
  ${agencyLogoUrl ? `<div class="receipt-logo"><img src="${escapeHtml(agencyLogoUrl)}" alt="" onerror="this.style.display='none'"/></div>` : ""}
  <div class="receipt-title">${escapeHtml(receiptTitle)}</div>
  <div class="receipt-no">${label(lang, "رقم", "N°", "No.")}: <strong>${escapeHtml(receiptNo)}</strong></div>
  <table>
    <tr><td>${escapeHtml(terms.singular)}</td><td>${escapeHtml(clientName)}${client.nameLatin && client.nameLatin !== clientName ? ` — ${escapeHtml(client.nameLatin)}` : ""}</td></tr>
    <tr><td>${label(lang, "رقم البطاقة الوطنية", "N° CIN", "National ID / CIN")}</td><td>${escapeHtml(cleanDisplay(cin, ""))}</td></tr>
    <tr><td>${label(lang, "البرنامج", "Programme", "Program")}</td><td>${escapeHtml(program?.name || "—")}</td></tr>
    <tr><td>${label(lang, "طريقة الدفع", "Mode de paiement", "Payment Method")}</td><td>${escapeHtml(translatePaymentMethod(paymentMethod, lang))}</td></tr>
    ${!isAgencyReceipt && chequeNumber ? `<tr><td>${label(lang, "رقم الشيك", "N° chèque", "Cheque number")}</td><td>${escapeHtml(chequeNumber)}</td></tr>` : ""}
    ${extraDetails ? `<tr><td>${label(lang, "تفاصيل الدفع", "Détails paiement", "Payment details")}</td><td>${escapeHtml(extraDetails)}</td></tr>` : ""}
    <tr><td>${label(lang, "التاريخ", "Date", "Date")}</td><td>${escapeHtml(payment.date)}</td></tr>
    ${isAgencyReceipt && note ? `<tr><td>${label(lang, "ملاحظات", "Notes", "Notes")}</td><td>${escapeHtml(note)}</td></tr>` : ""}
    ${receiptAmounts.salePrice > 0 ? `<tr><td>${label(lang, "إجمالي السعر", "Prix total", "Total price")}</td><td>${escapeHtml(money(receiptAmounts.salePrice))}</td></tr>` : ""}
    <tr class="amount-row">
      <td>${label(lang, "المبلغ المستلم", "MONTANT REÇU", "AMOUNT RECEIVED")}</td>
      <td>${escapeHtml(money(receiptAmounts.paymentAmount))}</td>
    </tr>
    <tr><td>${label(lang, "إجمالي المدفوع", "Total payé", "Total paid so far")}</td><td>${escapeHtml(money(receiptAmounts.totalPaidSoFar))}</td></tr>
    <tr class="amount-row"><td>${label(lang, "المبلغ المتبقي", "Montant restant", "Remaining amount")}</td><td>${escapeHtml(money(receiptAmounts.remaining))}</td></tr>
  </table>
  <div class="signature">
    <div style="text-align:center"><div class="signature-box"></div>${label(lang, "ختم الوكالة", "Cachet de l'agence", "Agency Stamp")}</div>
    <div style="text-align:center"><div class="signature-box"></div>${escapeHtml(terms.signatureLabel)}</div>
  </div>
</div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1000);}</script>
</body></html>`;
  const w = openPrintWindow("width=700,height=500", lang);
  if (!w) return false;
  w.document.write(html); w.document.close();
  return true;
}

export function printSharedReceipt({ receipt = {}, program = {}, agency = {}, lang = "ar", receiptType = "agency" }) {
  const isAr = lang === "ar";
  const isAgencyReceipt = receiptType === "agency";
  const money = (value) => formatCurrency(value, lang);
  const receiptNo = cleanDisplay(receipt.receiptNo, "PREVIEW");
  const receiptDate = formatPrintDate(receipt.date);
  const payerName = cleanDisplay(receipt.payerName);
  const paymentTypeLabel = cleanDisplay(receipt.paymentTypeLabel, "");
  const paidBy = cleanDisplay(receipt.paidBy, "");
  const agencyLogoUrl = cleanDisplay(agency?.logoUrl || agency?.logo_url, "");
  const allocations = Array.isArray(receipt.allocations) ? receipt.allocations : [];
  const terms = getParticipantTerminology(program, allocations[0]?.client || null, lang);
  const title = isAgencyReceipt
    ? label(lang, "وصل الوكالة", "REÇU AGENCE", "AGENCY RECEIPT")
    : terms.receiptTitle;
  const totalAllocated = allocations.reduce((sum, row) => sum + toAmount(row.allocatedAmount), 0);
  const coveredNames = allocations
    .map((row) => cleanDisplay(row.name || getClientDisplayName(row.client), ""))
    .filter(Boolean)
    .join(isAr ? "، " : ", ");
  const rowsHtml = allocations.map((row, index) => {
    const name = cleanDisplay(row.name || getClientDisplayName(row.client));
    const phone = cleanDisplay(row.phone || row.client?.phone || row.client?.phoneNumber, "");
    const passport = cleanDisplay(row.passport || row.client?.passportNo || row.client?.passport?.number, "");
    const details = [phone, passport].filter(Boolean).join(" / ");
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(name)}${details ? `<div class="muted">${escapeHtml(details)}</div>` : ""}</td>
        <td>${escapeHtml(money(row.totalPrice))}</td>
        <td>${escapeHtml(money(row.paidBefore))}</td>
        <td class="amount">${escapeHtml(money(row.allocatedAmount))}</td>
        <td>${escapeHtml(money(row.remainingAfter))}</td>
      </tr>`;
  }).join("");
  const detailsTableHtml = isAgencyReceipt ? `
  <table class="covered">
    <thead>
      <tr>
        <th>#</th>
        <th>${label(lang, "الاسم", "Nom", "Name")}</th>
        <th>${label(lang, "إجمالي السعر", "Prix total", "Total price")}</th>
        <th>${label(lang, "المدفوع قبل الوصل", "Payé avant reçu", "Paid before")}</th>
        <th>${label(lang, "المبلغ الموزع", "Montant réparti", "Allocated amount")}</th>
        <th>${label(lang, "المتبقي بعد الدفع", "Restant après paiement", "Remaining after payment")}</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="total-row">
        <td colspan="4">${label(lang, "مجموع التوزيع", "Total réparti", "Total allocated")}</td>
        <td colspan="2">${escapeHtml(money(totalAllocated))}</td>
      </tr>
    </tbody>
  </table>` : "";
  const signatureHtml = isAgencyReceipt ? `
  <div class="signature">
    <div style="text-align:center"><div class="signature-box"></div>${label(lang, "ختم الوكالة", "Cachet de l'agence", "Agency Stamp")}</div>
    <div style="text-align:center"><div class="signature-box"></div>${label(lang, "توقيع الدافع", "Signature du payeur", "Payer signature")}</div>
  </div>` : "";
  const html = `<!DOCTYPE html>
<html dir="${isAr?"rtl":"ltr"}" lang="${escapeHtml(lang)}">
<head>
<meta charset="UTF-8"/>
<title>${escapeHtml(title)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; font-size:12px; color:#111; background:#fff; }
  .page { width:190mm; min-height:297mm; margin:0 auto; padding:${isAgencyReceipt ? "38mm 18mm 28mm" : "44mm 22mm 34mm"}; }
  .receipt-logo { display:flex; justify-content:center; align-items:center; margin:-13mm 0 7mm; min-height:18mm; }
  .receipt-logo img { display:block; max-width:42mm; max-height:18mm; object-fit:contain; }
  .receipt-title { font-size:20px; font-weight:800; margin-bottom:8px; text-align:center; color:#111; }
  .receipt-no { text-align:center; font-size:13px; color:#333; margin-bottom:16px; }
  table { width:100%; border-collapse:collapse; }
  .meta td { padding:7px 9px; border:1px solid #d8d8d8; font-size:12px; vertical-align:top; }
  .meta td:first-child { font-weight:800; background:#f5f5f5; width:30%; }
  .covered { margin-top:14px; }
  .covered th, .covered td { padding:7px 8px; border:1px solid #d8d8d8; font-size:11px; vertical-align:top; }
  .covered th { background:#1f2937; color:#fff; font-weight:800; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .covered td:first-child { text-align:center; width:8mm; color:#555; }
  .covered .amount { font-weight:900; color:#111; white-space:nowrap; }
  .muted { color:#555; font-size:10px; margin-top:2px; }
  .total-row td { background:#f5f5f5; font-weight:900; color:#111; }
  .signature { margin-top:28px; display:flex; justify-content:space-between; gap:24px; font-size:11px; }
  .signature-box { border:1px dashed #777; width:155px; height:76px; margin-bottom:7px; }
  @media print { @page { size:A4 portrait; margin:0; } }
</style>
</head>
<body>
<div class="page">
  ${agencyLogoUrl ? `<div class="receipt-logo"><img src="${escapeHtml(agencyLogoUrl)}" alt="" onerror="this.style.display='none'"/></div>` : ""}
  <div class="receipt-title">${escapeHtml(title)}</div>
  <div class="receipt-no">${label(lang, "رقم", "N°", "No.")}: <strong>${escapeHtml(receiptNo)}</strong></div>
  <table class="meta">
    <tr><td>${label(lang, "الدافع", "Payeur", "Payer")}</td><td>${escapeHtml(payerName)}</td></tr>
    <tr><td>${label(lang, "البرنامج", "Programme", "Program")}</td><td>${escapeHtml(program?.name || "—")}</td></tr>
    <tr><td>${label(lang, "المعتمرون المشمولون", "Pèlerins couverts", "Covered pilgrims")}</td><td>${escapeHtml(coveredNames || "—")}</td></tr>
    ${isAgencyReceipt && paymentTypeLabel ? `<tr><td>${label(lang, "نوع الدفعة", "Type de paiement", "Payment type")}</td><td>${escapeHtml(paymentTypeLabel)}</td></tr>` : ""}
    <tr><td>${label(lang, "طريقة الدفع", "Mode de paiement", "Payment Method")}</td><td>${escapeHtml(translatePaymentMethod(receipt.method, lang))}</td></tr>
    ${receipt.chequeNumber ? `<tr><td>${label(lang, "رقم الشيك", "N° chèque", "Cheque number")}</td><td>${escapeHtml(receipt.chequeNumber)}</td></tr>` : ""}
    ${paidBy ? `<tr><td>${label(lang, "من طرف", "Payé par", "Paid by")}</td><td>${escapeHtml(paidBy)}</td></tr>` : ""}
    <tr><td>${label(lang, "التاريخ", "Date", "Date")}</td><td>${escapeHtml(receiptDate)}</td></tr>
    ${receipt.note ? `<tr><td>${label(lang, "ملاحظات", "Notes", "Notes")}</td><td>${escapeHtml(receipt.note)}</td></tr>` : ""}
    <tr><td>${label(lang, "المبلغ الإجمالي", "Montant total", "Total amount")}</td><td><strong>${escapeHtml(money(receipt.amount))}</strong></td></tr>
  </table>
  ${detailsTableHtml}
  ${signatureHtml}
</div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1000);}</script>
</body></html>`;
  const w = openPrintWindow("width=900,height=700", lang);
  if (!w) return false;
  w.document.write(html); w.document.close();
  return true;
}

export function printClientCard({ client, program, agency, lang = "ar", programClients = [] }) {
  const isAr = lang === "ar";  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;  const p = client.passport || {};
  const terms = getParticipantTerminology(program, client, lang);
  const clientName = getClientDisplayName(client, terms.singular || t.pilgrimFallback || "—", lang);
  const latinName = client.nameLatin && client.nameLatin !== clientName ? client.nameLatin : "";
  const fileNumber = getReadableFileNumber(client, programClients);
  const cin = getClientCin(client);
  const carrier = trimValue(program?.carrier || program?.company || program?.compagnie || program?.airline || program?.transport);
  const level = client.packageLevel || client.hotelLevel || "";
  const notes = trimValue(client.note || client.notes);
  const html = `<!DOCTYPE html>
<html dir="${isAr?"rtl":"ltr"}" lang="${escapeHtml(lang)}">
<head>
<meta charset="UTF-8"/>
<title>${escapeHtml(terms.cardTitle)}</title>
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
  <div class="title">${escapeHtml(terms.cardTitle)}</div>
  <div class="file-no">${label(lang, "ملف رقم", "Dossier N°", "File No.")}: ${escapeHtml(fileNumber)}</div>
  <div class="name">${escapeHtml(clientName)}</div>
  ${latinName ? `<div class="name-latin">${escapeHtml(latinName)}</div>` : ""}
  <div class="grid">
    <div class="item"><label>${label(lang, "الهاتف", "Téléphone", "Phone")}</label><span>${escapeHtml(client.phone || "—")}</span></div>
    <div class="item"><label>${label(lang, "رقم البطاقة الوطنية", "N° CIN", "National ID / CIN")}</label><span>${escapeHtml(cleanDisplay(cin, "—"))}</span></div>
    ${p.number ? `<div class="item"><label>${label(lang, "رقم الجواز", "Passeport", "Passport")}</label><span>${escapeHtml(p.number)}</span></div>` : ""}
    <div class="item"><label>${label(lang, "البرنامج", "Programme", "Program")}</label><span>${escapeHtml(program?.name || "—")}</span></div>
    <div class="item"><label>${label(lang, "الذهاب", "Départ", "Departure")}</label><span>${escapeHtml(program?.departure || "—")}</span></div>
    <div class="item"><label>${label(lang, "العودة", "Retour", "Return")}</label><span>${escapeHtml(program?.returnDate || "—")}</span></div>
    <div class="item"><label>${label(lang, "المستوى", "Niveau", "Level/package")}</label><span>${escapeHtml(cleanDisplay(level, "—"))}</span></div>
    <div class="item"><label>${label(lang, "نوع الغرفة", "Chambre", "Room Type")}</label><span>${escapeHtml(translateRoomType(client.roomType || client.roomTypeLabel, lang) || "—")}</span></div>
    <div class="item"><label>${label(lang, "الشركة الناقلة", "Compagnie", "Carrier company")}</label><span>${escapeHtml(cleanDisplay(carrier, "—"))}</span></div>
    ${p.expiry ? `<div class="item"><label>${label(lang, "انتهاء الجواز", "Expiration", "Expiry")}</label><span>${escapeHtml(p.expiry)}</span></div>` : ""}
    ${client.ticketNo ? `<div class="item"><label>${label(lang, "رقم التذكرة", "N° billet", "Ticket No.")}</label><span>${escapeHtml(client.ticketNo)}</span></div>` : ""}
  </div>
  ${client.docs ? `<div class="docs">
    ${[["passportCopy",label(lang, "صورة الجواز", "Passeport", "Passport")],["photo",label(lang, "صورة", "Photo", "Photo")],["vaccine",label(lang, "تطعيم", "Vaccin", "Vaccine")],["contract",label(lang, "عقد", "Contrat", "Contract")]].map(([k,l])=>`
	    <span class="doc-badge ${client.docs[k]?"doc-ok":"doc-no"}">${client.docs[k]?"OK":"NO"} ${escapeHtml(l)}</span>`).join("")}
	  </div>` : ""}
  ${notes ? `<div class="notes">${label(lang, "ملاحظات", "Notes", "Notes")}: ${escapeHtml(notes)}</div>` : ""}
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
  const snapshotInvoiceData = snapshot ? savedInvoiceSnapshotToPrintData(snapshot, { lang }) : null;
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
    const remoteInvoiceData = savedInvoiceSnapshotToPrintData(savedSnapshot, { lang });
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
    ? savedInvoiceSnapshotToPrintData(snapshotSource, { lang }) || builtInvoiceData
    : builtInvoiceData;
  }
  if (!snapshotInvoiceData) {
    invoiceData = overlayLiveInvoiceTravelFields(invoiceData, builtInvoiceData);
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
  const bankDetails = getAgencyBankDetails(agency);
  const bankLabels = {
    bank: label(lang, "اسم البنك", "Banque", "Bank"),
    holder: label(lang, "صاحب الحساب", "Titulaire du compte", "Account holder"),
    rib: "RIB",
    iban: "IBAN",
    note: label(lang, "ملاحظة", "Note", "Note"),
  };
  const title = isProforma
    ? label(lang, "فاتورة أولية", "FACTURE PROFORMA", "PROFORMA INVOICE")
    : label(lang, `فاتورة رقم ${invoiceNo}`, `FACTURE N° ${invoiceNo}`, `INVOICE No. ${invoiceNo}`);
  const paymentReference = !isProforma && latestPayment && (latestPayment.receiptNo || latestPayment.date)
    ? [
      latestPayment.receiptNo ? `${label(lang, "رقم الوصل", "N° Reçu", "Receipt No.")}: ${latestPayment.receiptNo}` : "",
      latestPayment.date ? `${label(lang, "التاريخ", "Date", "Date")}: ${formatPrintDate(latestPayment.date)}` : "",
    ].filter(Boolean).join(" — ")
    : "";
  const displayProgramName = programName || getInvoiceProgramDisplayName(program, lang);
  const programDisplaySource = {
    ...(program || {}),
    type: program?.type || displayProgramName,
    programName: displayProgramName,
  };
  const serviceLabel = formatProgramPackageLabelForDocument(programDisplaySource, lang);
  const displayDeparture = formatInvoiceTravelDate(departureDate || program?.departure) || "—";
  const displayReturn = formatInvoiceTravelDate(returnDate || program?.returnDate) || "—";
  const displayLevel = formatProgramLevelForDocument(level || client?.packageLevel || client?.hotelLevel || "", lang);
  const displayRoomType = formatRoomTypeForDocument(roomType || client?.roomType || client?.roomTypeLabel || "", lang);
  const displayPhone = phone || client?.phone || "";
  const descriptionLines = [
    serviceLabel,
    `${label(lang, "المستفيد", "Bénéficiaire", "Beneficiary")}: ${clientName}`,
    displayDeparture && displayDeparture !== "—" ? `${label(lang, "الذهاب", "Départ", "Departure")}: ${displayDeparture}` : "",
    displayReturn && displayReturn !== "—" ? `${label(lang, "العودة", "Retour", "Return")}: ${displayReturn}` : "",
  ].filter(Boolean);
  const amountForWords = isProforma ? Math.max(0, Number(remaining) || 0) : salePrice;
  const totalWords = amountInWordsSentence(amountForWords, lang, isProforma ? "proforma" : "invoice");
  const dateLine = lang === "fr"
    ? `DATE : ${formatPrintDate(invoiceDate)}`
    : lang === "en"
      ? `DATE: ${formatPrintDate(invoiceDate)}`
      : `التاريخ: ${formatPrintDate(invoiceDate)}`;
  const bootScript = autoPrint
    ? `<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1200);}</script>`
    : "";
  const html = `<!DOCTYPE html>
<html dir="${isAr?"rtl":"ltr"}" lang="${escapeHtml(lang)}">
<head>
<meta charset="UTF-8"/>
<title>${escapeHtml(title)}</title>
<style>
${commonPrintCSS}
</style>
</head>
<body>
  <div class="page">
  <div class="issue-date">${escapeHtml(dateLine)}</div>
  <div class="title">${escapeHtml(title)}</div>
  <div class="grid">
    <div class="box">
      <h3>${issuedToCompany ? label(lang, "الفاتورة باسم", "Facturée à", "Issued to") : label(lang, "المعتمر", "Client / Pèlerin", "Client / Pilgrim")}</h3>
      ${issuedToCompany ? `
        <p>${label(lang, "اسم الشركة", "Nom de la société", "Company name")}: ${escapeHtml(cleanDisplay(invoiceRecipient.companyName, ""))}</p>
        <p>ICE: ${escapeHtml(cleanDisplay(invoiceRecipient.ice, ""))}</p>
        <p>${label(lang, "المعتمر", "Client / Pèlerin", "Client / Pilgrim")}: ${escapeHtml(clientName)}</p>
      ` : `
        <p>${label(lang, "الاسم الكامل", "Nom complet", "Full name")}: ${escapeHtml(clientName)}</p>
      `}
      ${latinName ? `<p>${escapeHtml(latinName)}</p>` : ""}
      <p>${label(lang, "رقم الهاتف", "Téléphone", "Phone")}: ${escapeHtml(cleanDisplay(displayPhone, ""))}</p>
      <p>${label(lang, "رقم البطاقة الوطنية CIN", "N° CIN", "National ID / CIN")}: ${escapeHtml(cleanDisplay(cin, ""))}</p>
      <p>${label(lang, "رقم الجواز", "N° passeport", "Passport No.")}: ${escapeHtml(cleanDisplay(passportNo, ""))}</p>
    </div>
    <div class="box">
      <h3>${label(lang, "تفاصيل البرنامج", "Détails programme", "Program Details")}</h3>
      <p>${label(lang, "البرنامج", "Programme", "Program")}: ${escapeHtml(displayProgramName)}</p>
      <p>${label(lang, "الذهاب", "Départ", "Departure")}: ${escapeHtml(displayDeparture)}</p>
      <p>${label(lang, "العودة", "Retour", "Return")}: ${escapeHtml(displayReturn)}</p>
      <p>${label(lang, "المستوى", "Niveau", "Level/package")}: ${escapeHtml(cleanDisplay(displayLevel, ""))}</p>
      <p>${label(lang, "نوع الغرفة", "Type de chambre", "Room type")}: ${escapeHtml(cleanDisplay(displayRoomType, ""))}</p>
      <p>${label(lang, "شركة الطيران", "Compagnie aérienne", "Airline")}: ${escapeHtml(cleanDisplay(carrier, ""))}</p>
    </div>
  </div>
  <table class="invoice-table">
    <thead>
      <tr>
        <th class="qty">${label(lang, "الكمية", "Qté", "Qty")}</th>
        <th class="designation">${label(lang, "البيان", "Désignations", "Description")}</th>
        <th class="price">${label(lang, "ثمن الوحدة", "P.U", "Unit price")}</th>
        <th class="price">${label(lang, "المجموع", "P.T", "Total")}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="qty">1</td>
        <td class="designation">${descriptionLines.map(escapeHtml).join("<br/>")}</td>
        <td class="price amount">${escapeHtml(money(salePrice))}</td>
        <td class="price amount">${escapeHtml(money(salePrice))}</td>
      </tr>
      <tr class="total-line">
        <td colspan="3" class="total-label">${label(lang, "المجموع شامل الرسوم", "TOTAL TTC", "TOTAL incl. tax")}</td>
        <td class="price amount">${escapeHtml(money(salePrice))}</td>
      </tr>
    </tbody>
  </table>
  ${isProforma ? `<div class="summary-box">
    <div class="summary-row"><span>${label(lang, "إجمالي سعر البرنامج", "Prix total du programme", "Program total")}</span><span>${escapeHtml(money(salePrice))}</span></div>
    <div class="summary-row"><span>${label(lang, "المبلغ المدفوع", "Montant payé", "Paid amount")}</span><span>${escapeHtml(money(totalPaid))}</span></div>
    <div class="summary-row summary-final"><span>${label(lang, "المبلغ المتبقي", "Reste à payer", "Remaining amount")}</span><span>${escapeHtml(money(remaining))}</span></div>
  </div>` : ""}
  <div class="words">${escapeHtml(totalWords)}</div>
  ${paymentReference ? `<div class="payment-ref">${label(lang, "مرجع الدفع", "Référence de paiement", "Payment reference")}: ${escapeHtml(paymentReference)}</div>` : ""}
  ${isProforma && bankDetails.length ? `<div class="bank">
    <h3>${label(lang, "المعلومات البنكية", "Coordonnées bancaires", "Bank details")}</h3>
    <div class="bank-grid">
      ${bankDetails.map(([key, value]) => `<div class="bank-row"><strong>${bankLabels[key]}:</strong> ${escapeHtml(value)}</div>`).join("")}
    </div>
  </div>` : ""}
  <div class="stamp">
    <div class="stamp-label">${label(lang, "طابع الوكالة", "Cachet agence", "Agency stamp")}</div>
    <div class="stamp-label">${label(lang, "توقيع الزبون", "Signature client", "Client signature")}</div>
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
