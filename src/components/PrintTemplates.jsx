// Print templates — called via window.print() after rendering into a hidden div
import React from "react";
import { TRANSLATIONS } from "../data/initialData";
import { formatCurrency } from "../utils/currency";
import { getClientDisplayName } from "../utils/clientNames";
import { translatePaymentMethod, translateRoomType } from "../utils/i18nValues";

const trimValue = (value) => (typeof value === "string" ? value.trim() : "");
const label = (lang, ar, fr, en = fr) => (lang === "fr" ? fr : lang === "en" ? en : ar);
const cleanDisplay = (value, fallback = "—") => {
  const text = trimValue(value);
  return text || fallback;
};
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
const toPositiveInt = (value) => {
  const parsed = Number.parseInt(String(value ?? "").replace(/\D+/g, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
const padInvoiceSequence = (value) => String(Math.max(1, Number(value) || 1)).padStart(4, "0");
const getInvoiceYear = (payments = []) => {
  const dated = [...payments]
    .map((payment) => trimValue(payment?.date))
    .find(Boolean);
  if (dated) {
    const match = dated.match(/^(\d{4})/);
    if (match) return match[1];
    const parsed = new Date(dated);
    if (!Number.isNaN(parsed.getTime())) return String(parsed.getFullYear());
  }
  return String(new Date().getFullYear());
};
const INVOICE_REGISTRY_KEY = "rukn_invoice_registry_v1";
const readInvoiceRegistry = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(INVOICE_REGISTRY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
const writeInvoiceRegistry = (registry) => {
  try {
    window.localStorage.setItem(INVOICE_REGISTRY_KEY, JSON.stringify(registry));
  } catch {
    /* Printing should not fail if localStorage is unavailable. */
  }
};
const latestPaymentForInvoice = (payments = []) => (
  [...payments].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0] || null
);
const getInvoiceIssueDate = (payments = []) => {
  const latest = latestPaymentForInvoice(payments);
  const rawDate = trimValue(latest?.date) || new Date().toISOString().slice(0, 10);
  const match = rawDate.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
};
const invoiceRecipientKey = (recipient = {}) => (
  recipient.type === "company"
    ? `company:${trimValue(recipient.companyName)}:${trimValue(recipient.ice)}`
    : "client"
);
const buildInvoiceKey = ({ client, payments = [], recipient = {} }) => {
  const latest = latestPaymentForInvoice(payments);
  return [
    "invoice",
    client?.id || "unknown-client",
    latest?.id || "no-payment",
    invoiceRecipientKey(recipient),
  ].join(":");
};
const nextInvoiceSequence = (registry, year) => {
  const maxSeq = registry
    .filter((item) => String(item.year) === String(year))
    .map((item) => toPositiveInt(item.invoiceNumber))
    .filter((value) => value !== null)
    .reduce((max, value) => Math.max(max, value), 0);
  return maxSeq + 1;
};
const latestIssuedDateForYear = (registry, year) => (
  registry
    .filter((item) => String(item.year) === String(year) && item.status !== "cancelled")
    .map((item) => trimValue(item.date))
    .filter(Boolean)
    .sort()
    .pop() || ""
);
const ensureInvoiceRegistryItem = ({ client, payments = [], recipient = {} }) => {
  const registry = readInvoiceRegistry();
  const invoiceKey = buildInvoiceKey({ client, payments, recipient });
  const existing = registry.find((item) => item.invoiceKey === invoiceKey && item.status !== "cancelled");
  if (existing?.invoiceNumber) return existing;

  const requestedDate = getInvoiceIssueDate(payments);
  const storedInvoiceNumber = trimValue(
    client?.invoiceDisplayNumber
    || client?.invoiceNumberDisplay
    || payments.find((payment) => trimValue(payment?.invoiceDisplayNumber || payment?.invoiceNumberDisplay))
      ?.invoiceDisplayNumber
    || payments.find((payment) => trimValue(payment?.invoiceDisplayNumber || payment?.invoiceNumberDisplay))
      ?.invoiceNumberDisplay
  );
  if (storedInvoiceNumber) {
    const storedYear = storedInvoiceNumber.match(/\/(\d{4})$/)?.[1] || getInvoiceYear([{ date: requestedDate }]);
    const item = {
      invoiceKey,
      invoiceNumber: storedInvoiceNumber,
      year: storedYear,
      date: requestedDate,
      status: "issued",
      paymentId: latestPaymentForInvoice(payments)?.id || null,
      clientId: client?.id || null,
      recipientType: recipient.type || "client",
      companyName: recipient.companyName || "",
      ice: recipient.ice || "",
      createdAt: new Date().toISOString(),
      cancelledAt: null,
    };
    writeInvoiceRegistry([...registry, item]);
    return item;
  }

  const requestedYear = getInvoiceYear([{ date: requestedDate }]);
  const latestDate = latestIssuedDateForYear(registry, requestedYear);
  const date = latestDate && requestedDate < latestDate ? latestDate : requestedDate;
  const year = getInvoiceYear([{ date }]);
  const reusableCancelled = registry.find((item) => (
    String(item.year) === String(year)
    && item.status === "cancelled"
    && item.date === date
    && !registry.some((other) => other.status !== "cancelled" && other.invoiceNumber === item.invoiceNumber && String(other.year) === String(year))
  ));
  const sequence = reusableCancelled ? toPositiveInt(reusableCancelled.invoiceNumber) : nextInvoiceSequence(registry, year);
  const invoiceNumber = `${padInvoiceSequence(sequence)}/${year}`;
  const item = {
    invoiceKey,
    invoiceNumber,
    year,
    date,
    status: "issued",
    paymentId: latestPaymentForInvoice(payments)?.id || null,
    clientId: client?.id || null,
    recipientType: recipient.type || "client",
    companyName: recipient.companyName || "",
    ice: recipient.ice || "",
    createdAt: new Date().toISOString(),
    cancelledAt: null,
  };
  writeInvoiceRegistry([...registry, item]);
  return item;
};
export const cancelInvoiceInRegistry = (invoiceNumber, year) => {
  const registry = readInvoiceRegistry();
  const next = registry.map((item) => (
    item.invoiceNumber === invoiceNumber && String(item.year) === String(year) && item.status !== "cancelled"
      ? { ...item, status: "cancelled", cancelledAt: new Date().toISOString() }
      : item
  ));
  writeInvoiceRegistry(next);
};
const requestInvoiceRecipient = (client, lang = "ar") => {
  const wantsCompany = window.confirm(label(
    lang,
    "هل تريد إصدار الفاتورة باسم شركة؟\nاضغط إلغاء لإصدارها باسم المعتمر.",
    "Émettre la facture au nom d'une société ?\nAnnuler pour l'émettre au nom du client.",
    "Issue the invoice to a company?\nCancel to issue it to the client."
  ));
  if (!wantsCompany) return { type: "client" };

  const companyName = trimValue(window.prompt(label(lang, "اسم الشركة", "Nom de la société", "Company name"), ""));
  if (!companyName) {
    window.alert(label(lang, "اسم الشركة مطلوب", "Le nom de la société est obligatoire", "Company name is required"));
    return null;
  }
  const ice = trimValue(window.prompt("ICE", ""));
  if (!ice) {
    window.alert(label(lang, "ICE مطلوب لفاتورة الشركة", "ICE est obligatoire pour une facture société", "ICE is required for a company invoice"));
    return null;
  }
  return { type: "company", companyName, ice };
};

const resolveAgencyIdentity = (agency = {}, t, lang = "ar") => {
  const nameAr = trimValue(agency.nameAr);
  const nameFr = trimValue(agency.nameFr);
  const fallbackPrimary = t.agencyName || "Tiznit Voyages";
  const fallbackSecondary = t.agencyNameAr || fallbackPrimary;
  const primary = lang === "fr"
    ? (nameFr || nameAr || fallbackPrimary)
    : (nameAr || nameFr || fallbackPrimary);
  const secondary = lang === "fr"
    ? (nameAr || nameFr || fallbackSecondary)
    : (nameFr || nameAr || fallbackSecondary);
  const slogan = trimValue(agency.slogan) || t.agencySlogan || "";
  return { primary, secondary, slogan };
};

export function printReceipt({ payment, client, program, agency, lang = "ar" }) {
  const isAr = lang === "ar";
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const { primary, secondary, slogan } = resolveAgencyIdentity(agency, t, lang);
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
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background:#fff; }
  .page { width: 148mm; min-height: 100mm; margin: 0 auto; padding: 10mm; }
  .header { text-align: center; border-bottom: 2px solid #1a6b3a; padding-bottom: 8px; margin-bottom: 10px; }
  .agency-name { font-size: 18px; font-weight: 900; color: #1a6b3a; }
  .agency-sub  { font-size: 11px; color: #555; margin-top: 3px; }
  .receipt-title { font-size: 15px; font-weight: 700; color: #b8941e; margin: 10px 0 8px; text-align: center; }
  .receipt-no { text-align: center; font-size: 13px; color: #555; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 5px 8px; border: 1px solid #ddd; font-size: 12px; }
  td:first-child { font-weight: 700; background: #f5f5f5; width: 40%; }
  .amount-row td { font-size: 16px; font-weight: 900; color: #1a6b3a; }
  .footer { margin-top: 14px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 8px; }
  .signature { margin-top: 18px; display: flex; justify-content: space-between; font-size: 11px; }
  @media print { @page { size: A5 landscape; margin: 8mm; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="agency-name">${primary}${secondary ? ` | ${secondary}` : ""}</div>
    <div class="agency-sub">${[agency.phoneTiznit1, agency.phoneTiznit2].filter(Boolean).join(" / ")}</div>
    <div class="agency-sub">${agency.addressTiznit || ""}</div>
    ${agency.ice ? `<div class="agency-sub">ICE: ${agency.ice}</div>` : ""}
  </div>
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
    <span>${label(lang, "ختم الوكالة", "Cachet de l'agence", "Agency Stamp")}</span>
    <span>${label(lang, "توقيع المعتمر", "Signature du client", "Client Signature")}</span>
  </div>
  <div class="footer">
    ${primary}${secondary ? ` | ${secondary}` : ""}${slogan ? ` — ${slogan}` : ""}
  </div>
</div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1000);}</script>
</body></html>`;
  const w = window.open("", "_blank", "width=700,height=500");
  w.document.write(html); w.document.close();
}

export function printClientCard({ client, program, agency, lang = "ar" }) {
  const isAr = lang === "ar";  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;  const p = client.passport || {};
  const { primary, secondary, slogan } = resolveAgencyIdentity(agency, t, lang);
  const headerPhones = [agency?.phoneTiznit1, agency?.phoneTiznit2].filter(Boolean).join(" / ");
  const footerPhones = [agency?.phoneTiznit1, agency?.phoneAgadir1].filter(Boolean).join(" / ");
  const footerName = secondary && secondary !== primary ? `${secondary} | ${primary}` : primary;
  const clientName = getClientDisplayName(client, t.pilgrimFallback || "—", lang);
  const latinName = client.nameLatin && client.nameLatin !== clientName ? client.nameLatin : "";
  const html = `<!DOCTYPE html>
<html dir="${isAr?"rtl":"ltr"}" lang="${lang}">
<head>
<meta charset="UTF-8"/>
<title>${label(lang, "بطاقة المعتمر", "Carte pèlerin", "Pilgrim Card")}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; font-size:12px; background:#fff; color:#111; }
  .card { width:148mm; margin:8mm auto; padding:8mm; border:2px solid #1a6b3a; border-radius:6px; }
  .header { display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #d4af37; padding-bottom:8px; margin-bottom:10px; }
  .agency { font-size:14px; font-weight:900; color:#1a6b3a; }
  .badge { background:#1a6b3a; color:#fff; border-radius:50%; width:50px; height:50px; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:900; }
  .name { font-size:17px; font-weight:900; margin-bottom:3px; }
  .name-latin { font-size:13px; color:#555; margin-bottom:8px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-bottom:10px; }
  .item label { font-size:10px; color:#888; display:block; }
  .item span  { font-size:12px; font-weight:700; }
  .docs { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
  .doc-badge { padding:2px 8px; border-radius:10px; font-size:11px; font-weight:700; }
  .doc-ok  { background:#e8f5e9; color:#1a6b3a; border:1px solid #a5d6a7; }
  .doc-no  { background:#ffebee; color:#c62828; border:1px solid #ffcdd2; }
  .footer  { margin-top:10px; text-align:center; font-size:10px; color:#aaa; }
  @media print { @page { size:A5 landscape; margin:6mm; } }
</style>
</head>
<body>
  <div class="card">
  <div class="header">
    <div>
      <div class="agency">${primary}</div>
      <div style="font-size:10px;color:#888">${headerPhones}</div>
    </div>
    <div class="badge">${clientName[0] || "—"}</div>
  </div>
  <div class="name">${clientName}</div>
  ${latinName ? `<div class="name-latin">${latinName}</div>` : ""}
  <div class="grid">
    <div class="item"><label>${label(lang, "رقم الملف", "Référence", "Reference")}</label><span>${client.id}</span></div>
    <div class="item"><label>${label(lang, "الهاتف", "Téléphone", "Phone")}</label><span>${client.phone}</span></div>
    <div class="item"><label>${label(lang, "البرنامج", "Programme", "Program")}</label><span>${program?.name || "—"}</span></div>
    <div class="item"><label>${label(lang, "نوع الغرفة", "Chambre", "Room Type")}</label><span>${translateRoomType(client.roomType || client.roomTypeLabel, lang) || "—"}</span></div>
    <div class="item"><label>${label(lang, "فندق مكة", "Hôtel Mecque", "Makkah Hotel")}</label><span>${client.hotelMecca || "—"}</span></div>
    <div class="item"><label>${label(lang, "فندق المدينة", "Hôtel Médine", "Madinah Hotel")}</label><span>${client.hotelMadina || "—"}</span></div>
    <div class="item"><label>${label(lang, "الذهاب", "Départ", "Departure")}</label><span>${program?.departure || "—"}</span></div>
    <div class="item"><label>${label(lang, "العودة", "Retour", "Return")}</label><span>${program?.returnDate || "—"}</span></div>
    ${p.number ? `<div class="item"><label>${label(lang, "رقم الجواز", "Passeport", "Passport")}</label><span>${p.number}</span></div>` : ""}
    ${p.expiry ? `<div class="item"><label>${label(lang, "انتهاء الجواز", "Expiration", "Expiry")}</label><span>${p.expiry}</span></div>` : ""}
    ${client.ticketNo ? `<div class="item"><label>${label(lang, "رقم التذكرة", "N° billet", "Ticket No.")}</label><span>${client.ticketNo}</span></div>` : ""}
  </div>
  ${client.docs ? `<div class="docs">
    ${[["passportCopy",label(lang, "صورة الجواز", "Passeport", "Passport")],["photo",label(lang, "صورة", "Photo", "Photo")],["vaccine",label(lang, "تطعيم", "Vaccin", "Vaccine")],["contract",label(lang, "عقد", "Contrat", "Contract")]].map(([k,l])=>`
    <span class="doc-badge ${client.docs[k]?"doc-ok":"doc-no"}">${client.docs[k]?"OK":"NO"} ${l}</span>`).join("")}
  </div>` : ""}
  <div class="footer">
    ${footerName}${footerPhones ? ` — ${footerPhones}` : ""}${slogan ? ` — ${slogan}` : ""}
  </div>
</div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1000);}</script>
</body></html>`;
  const w = window.open("", "_blank", "width=750,height=520");
  w.document.write(html); w.document.close();
}

export function printInvoice({ client, program, payments, agency, lang = "ar" }) {
  const isAr = lang === "ar";
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const recipient = requestInvoiceRecipient(client, lang);
  if (!recipient) return;
  const clientName = getClientDisplayName(client, t.pilgrimFallback || "—", lang);
  const latinName = client.nameLatin && client.nameLatin !== clientName ? client.nameLatin : "";
  const money = (value) => formatCurrency(value, lang);
  const totalPaid = payments.reduce((s,p) => s+p.amount, 0);
  const salePrice = client.salePrice || client.price || 0;
  const remaining = Math.max(0, salePrice - totalPaid);
  const cin = getClientCin(client);
  const passportNo = trimValue(client.passport?.number);
  const carrier = trimValue(program?.carrier || program?.company || program?.compagnie || program?.airline || program?.transport);
  const invoiceItem = ensureInvoiceRegistryItem({ client, payments, recipient });
  const invoiceNo = invoiceItem.invoiceNumber;
  const invoiceDate = invoiceItem.date;
  const issuedToCompany = recipient.type === "company";
  const html = `<!DOCTYPE html>
<html dir="${isAr?"rtl":"ltr"}" lang="${lang}">
<head>
<meta charset="UTF-8"/>
<title>${label(lang, "فاتورة", "Facture", "Invoice")} ${invoiceNo}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; font-size:12px; background:#fff; color:#111; }
  .page { width:190mm; min-height:277mm; margin:0 auto; padding:38mm 15mm 24mm; }
  .header { display:flex; justify-content:${isAr?"flex-start":"flex-end"}; align-items:flex-start; margin-bottom:16px; }
  .invoice-head { text-align:${isAr?"right":"left"}; direction:${isAr?"rtl":"ltr"}; min-width:180px; }
  .invoice-title { font-size:24px; font-weight:900; color:#d4af37; text-align:${isAr?"right":"left"}; }
  .invoice-no { font-size:12px; color:#666; margin-top:4px; }
  .divider { border:none; border-top:2px solid #1a6b3a; margin:12px 0; }
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px; }
  .info-box { background:#f9f9f9; border:1px solid #eee; border-radius:6px; padding:10px; }
  .info-box h3 { font-size:11px; color:#888; margin-bottom:6px; font-weight:700; text-transform:uppercase; }
  .info-box p { font-size:12px; font-weight:600; line-height:1.6; }
  table { width:100%; border-collapse:collapse; margin-bottom:12px; }
  th { background:#1a6b3a; color:#fff; padding:7px 10px; font-size:11px; text-align:${isAr?"right":"left"}; }
  td { padding:7px 10px; border-bottom:1px solid #eee; font-size:12px; }
  tr:nth-child(even) td { background:#fafafa; }
  .totals { margin-${isAr?"right":"left"}:auto; width:240px; }
  .total-row { display:flex; justify-content:space-between; padding:4px 0; font-size:12px; }
  .total-final { font-size:15px; font-weight:900; color:#1a6b3a; border-top:2px solid #1a6b3a; padding-top:6px; margin-top:4px; }
  .remaining { color:${remaining>0?"#e65100":"#1a6b3a"}; font-weight:700; }
  .stamp { margin-top:36px; margin-bottom:22mm; display:flex; justify-content:space-between; gap:24px; }
  .stamp-box { border:1px dashed #bbb; width:150px; height:86px; margin-bottom:7px; }
  @media print { @page { size:A4; margin:0; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="invoice-head">
      <div class="invoice-title">${label(lang, "فاتورة", "FACTURE", "INVOICE")}</div>
      <div class="invoice-no">${label(lang, "فاتورة رقم", "Facture N°", "Invoice No.")} ${invoiceNo}</div>
      <div class="invoice-no">${label(lang, "التاريخ", "Date", "Date")}: ${invoiceDate}</div>
    </div>
  </div>
  <hr class="divider"/>
  <div class="info-grid">
    <div class="info-box">
      <h3>${issuedToCompany ? label(lang, "الفاتورة باسم", "Facturée à", "Issued to") : label(lang, "المعتمر", "Client / Pèlerin", "Client / Pilgrim")}</h3>
      ${issuedToCompany ? `
        <p>${label(lang, "اسم الشركة", "Nom de la société", "Company name")}: ${cleanDisplay(recipient.companyName, "")}</p>
        <p>ICE: ${cleanDisplay(recipient.ice, "")}</p>
        <p>${label(lang, "المعتمر", "Client / Pèlerin", "Client / Pilgrim")}: ${clientName}</p>
      ` : `
        <p>${label(lang, "الاسم الكامل", "Nom complet", "Full name")}: ${clientName}</p>
      `}
      ${latinName ? `<p>${latinName}</p>` : ""}
      <p>${label(lang, "رقم الهاتف", "Téléphone", "Phone")}: ${cleanDisplay(client.phone, "")}</p>
      <p>${label(lang, "رقم البطاقة الوطنية CIN", "N° CIN", "National ID / CIN")}: ${cleanDisplay(cin, "")}</p>
      <p>${label(lang, "رقم الجواز", "N° passeport", "Passport No.")}: ${cleanDisplay(passportNo, "")}</p>
    </div>
    <div class="info-box">
      <h3>${label(lang, "تفاصيل البرنامج", "Détails programme", "Program Details")}</h3>
      <p>${label(lang, "البرنامج", "Programme", "Program")}: ${program?.name || "—"}</p>
      <p>${label(lang, "الذهاب", "Départ", "Departure")}: ${program?.departure || "—"}</p>
      <p>${label(lang, "العودة", "Retour", "Return")}: ${program?.returnDate || "—"}</p>
      <p>${label(lang, "المستوى", "Niveau", "Level/package")}: ${cleanDisplay(client.packageLevel || client.hotelLevel, "")}</p>
      <p>${label(lang, "نوع الغرفة", "Type de chambre", "Room type")}: ${translateRoomType(client.roomType || client.roomTypeLabel, lang) || "—"}</p>
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
      <tr><td>${label(lang, "باقة العمرة", "Forfait Omra", "Umrah Package")} — ${program?.name || ""}</td><td>${money(salePrice)}</td></tr>
    </tbody>
  </table>
  <div class="totals">
    <div class="total-row"><span>${label(lang, "سعر البيع", "Prix de vente", "Sale Price")}</span><span>${money(salePrice)}</span></div>
    <div class="total-row" style="color:#1a6b3a"><span>${label(lang, "المدفوع", "Total payé", "Total Paid")}</span><span>${money(totalPaid)}</span></div>
    <div class="total-row total-final">
      <span class="remaining">${label(lang, "المتبقي", "RESTE À PAYER", "REMAINING")}</span>
      <span class="remaining">${money(remaining)}</span>
    </div>
  </div>
  ${payments.length > 0 ? `
  <div style="margin-top:14px">
    <h3 style="font-size:11px;color:#888;margin-bottom:6px">${label(lang, "سجل الدفعات", "HISTORIQUE DES PAIEMENTS", "PAYMENT HISTORY")}</h3>
    <table>
      <thead><tr>
        <th>${label(lang, "رقم الوصل", "N° Reçu", "Receipt No.")}</th>
        <th>${label(lang, "التاريخ", "Date", "Date")}</th>
        <th>${label(lang, "الطريقة", "Mode", "Method")}</th>
        <th>${label(lang, "المبلغ", "Montant", "Amount")}</th>
      </tr></thead>
      <tbody>
        ${payments.map(p=>{
          const extra = paymentExtraDetails(p, lang);
          return `<tr><td>${p.receiptNo || ""}</td><td>${p.date || ""}</td><td>${translatePaymentMethod(p.method, lang)}${extra ? `<br/><span style="font-size:10px;color:#666">${extra}</span>` : ""}</td><td>${money(p.amount)}</td></tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>` : ""}
  <div class="stamp">
    <div style="text-align:center;font-size:11px"><div class="stamp-box"></div>${label(lang, "ختم الوكالة", "Cachet agence", "Agency Stamp")}</div>
    <div style="text-align:center;font-size:11px"><div class="stamp-box"></div>${label(lang, "توقيع المعتمر", "Signature client", "Client Signature")}</div>
  </div>
</div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1200);}</script>
</body></html>`;
  const w = window.open("", "_blank", "width=900,height=680");
  w.document.write(html); w.document.close();
}
