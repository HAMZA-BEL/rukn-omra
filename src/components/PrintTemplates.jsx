// Print templates — called via window.print() after rendering into a hidden div
import React from "react";
import { Modal, Button, Input } from "./UI";
import { TRANSLATIONS } from "../data/initialData";
import { formatCurrency } from "../utils/currency";
import { amountInWordsSentence } from "../utils/amountToWords";
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
const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");
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
const getAgencyDisplay = (agency = {}, lang = "ar") => {
  const name = lang === "ar"
    ? trimValue(agency.nameAr || agency.agencyNameAr || agency.name_ar || agency.nameFr || agency.name_fr)
    : trimValue(agency.nameFr || agency.agencyNameFr || agency.name_fr || agency.nameAr || agency.name_ar);
  return {
    name,
    city: trimValue(agency.city || agency.agencyCity || agency.agency_city),
    address: trimValue(agency.addressTiznit || agency.address_tiznit || agency.mainAddress || agency.address),
    address2: trimValue(agency.addressAgadir || agency.address_agadir || agency.additionalAddress),
    phone1: trimValue(agency.phoneTiznit1 || agency.phone_tiznit1 || agency.phone1),
    phone2: trimValue(agency.phoneAgadir1 || agency.phone_agadir1 || agency.phone2),
    email: trimValue(agency.email),
    website: trimValue(agency.website),
    ice: trimValue(agency.ice),
    rc: trimValue(agency.rc),
  };
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
  .page { width:190mm; min-height:297mm; margin:0 auto; padding:30mm 15mm 24mm; direction:inherit; }
  .agency-head { border-bottom:2px solid #111; padding-bottom:8px; margin-bottom:14px; display:flex; justify-content:space-between; gap:16px; align-items:flex-start; }
  .agency-name { font-size:16px; font-weight:900; color:#111; }
  .agency-meta { margin-top:4px; font-size:10.5px; color:#333; line-height:1.55; }
  .issue-date { text-align:end; font-size:12px; margin-bottom:10px; color:#222; font-weight:700; }
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
  .stamp { margin-top:24px; display:flex; justify-content:space-between; gap:24px; }
  .stamp-box { border:1px dashed #777; width:155px; height:78px; margin-bottom:7px; }
  html[dir="rtl"] .price, html[dir="rtl"] .qty { text-align:center; }
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
  const agencyDisplay = getAgencyDisplay(agency, lang);
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
  const serviceLabel = label(lang, "باقة العمرة", "Forfait Omra", "Umrah Package");
  const paymentReference = !isProforma && latestPayment && (latestPayment.receiptNo || latestPayment.date)
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
  const agencyMeta = [
    agencyDisplay.address,
    agencyDisplay.address2,
    agencyDisplay.city,
    [agencyDisplay.phone1, agencyDisplay.phone2].filter(Boolean).join(" / "),
    agencyDisplay.email,
    agencyDisplay.website,
    agencyDisplay.ice ? `ICE: ${agencyDisplay.ice}` : "",
    agencyDisplay.rc ? `RC: ${agencyDisplay.rc}` : "",
  ].filter(Boolean);
  const descriptionLines = [
    `${serviceLabel}${displayProgramName && displayProgramName !== "—" ? ` — ${displayProgramName}` : ""}`,
    `${label(lang, "المستفيد", "Bénéficiaire", "Beneficiary")}: ${clientName}`,
    displayDeparture && displayDeparture !== "—" ? `${label(lang, "الذهاب", "Départ", "Departure")}: ${displayDeparture}` : "",
    displayReturn && displayReturn !== "—" ? `${label(lang, "العودة", "Retour", "Return")}: ${displayReturn}` : "",
  ].filter(Boolean);
  const totalWords = amountInWordsSentence(salePrice, lang, isProforma ? "proforma" : "invoice");
  const dateLine = lang === "fr"
    ? `DATE : ${formatPrintDate(invoiceDate)}`
    : lang === "en"
      ? `DATE: ${formatPrintDate(invoiceDate)}`
      : `التاريخ: ${formatPrintDate(invoiceDate)}`;
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
  <div class="agency-head">
    <div>
      <div class="agency-name">${escapeHtml(agencyDisplay.name || label(lang, "الوكالة", "Agence", "Agency"))}</div>
      ${agencyMeta.length ? `<div class="agency-meta">${agencyMeta.map(escapeHtml).join("<br/>")}</div>` : ""}
    </div>
    <div class="issue-date">${dateLine}</div>
  </div>
  <div class="title">${title}</div>
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
      <p>${label(lang, "نوع الغرفة", "Type de chambre", "Room type")}: ${escapeHtml(translateRoomType(displayRoomType, lang) || "—")}</p>
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
        <td class="price amount">${money(salePrice)}</td>
        <td class="price amount">${money(salePrice)}</td>
      </tr>
      <tr class="total-line">
        <td colspan="3" class="total-label">${label(lang, "المجموع شامل الرسوم", "TOTAL TTC", "TOTAL incl. tax")}</td>
        <td class="price amount">${money(salePrice)}</td>
      </tr>
    </tbody>
  </table>
  ${isProforma ? `<div class="summary-box">
    <div class="summary-row"><span>${label(lang, "إجمالي سعر البرنامج", "Prix total du programme", "Program total")}</span><span>${money(salePrice)}</span></div>
    <div class="summary-row"><span>${label(lang, "المبلغ المدفوع", "Montant payé", "Paid amount")}</span><span>${money(totalPaid)}</span></div>
    <div class="summary-row summary-final"><span>${label(lang, "المبلغ المتبقي", "Reste à payer", "Remaining amount")}</span><span>${money(remaining)}</span></div>
  </div>` : ""}
  <div class="words">${escapeHtml(totalWords)}</div>
  ${paymentReference ? `<div class="payment-ref">${label(lang, "مرجع الدفع", "Référence de paiement", "Payment reference")}: ${paymentReference}</div>` : ""}
  ${isProforma && bankDetails.length ? `<div class="bank">
    <h3>${label(lang, "المعلومات البنكية", "Coordonnées bancaires", "Bank details")}</h3>
    <div class="bank-grid">
      ${bankDetails.map(([key, value]) => `<div class="bank-row"><strong>${bankLabels[key]}:</strong> ${escapeHtml(value)}</div>`).join("")}
    </div>
  </div>` : ""}
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
