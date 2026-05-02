// Print templates — called via window.print() after rendering into a hidden div
import React from "react";
import { TRANSLATIONS } from "../data/initialData";
import { formatCurrency } from "../utils/currency";
import { getClientDisplayName } from "../utils/clientNames";
import { translatePaymentMethod, translateRoomType } from "../utils/i18nValues";

const trimValue = (value) => (typeof value === "string" ? value.trim() : "");
const label = (lang, ar, fr, en = fr) => (lang === "fr" ? fr : lang === "en" ? en : ar);
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
const stableHash = (value) => {
  let hash = 0;
  const source = String(value || "");
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) % 10000;
  }
  return hash;
};
const resolveInvoiceDisplayNumber = ({ client, payments = [] }) => {
  const stored = trimValue(
    client?.invoiceDisplayNumber
    || client?.invoiceNumberDisplay
    || payments.find((payment) => trimValue(payment?.invoiceDisplayNumber || payment?.invoiceNumberDisplay))
      ?.invoiceDisplayNumber
    || payments.find((payment) => trimValue(payment?.invoiceDisplayNumber || payment?.invoiceNumberDisplay))
      ?.invoiceNumberDisplay
  );
  if (stored) return stored;

  const year = getInvoiceYear(payments);
  const receiptSequence = payments
    .map((payment) => toPositiveInt(payment?.receiptNo))
    .find((value) => value !== null);
  if (receiptSequence !== null) return `${padInvoiceSequence(receiptSequence)}/${year}`;

  const fallbackSeed = payments[0]?.id || client?.id || `${client?.name || ""}-${year}`;
  const fallbackSequence = (stableHash(fallbackSeed) % 9999) + 1;
  return `${padInvoiceSequence(fallbackSequence)}/${year}`;
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
    <tr><td>${label(lang, "البرنامج", "Programme", "Program")}</td><td>${program?.name || "—"}</td></tr>
    <tr><td>${label(lang, "طريقة الدفع", "Mode de paiement", "Payment Method")}</td><td>${translatePaymentMethod(payment.method, lang)}</td></tr>
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
  const clientName = getClientDisplayName(client, t.pilgrimFallback || "—", lang);
  const latinName = client.nameLatin && client.nameLatin !== clientName ? client.nameLatin : "";
  const money = (value) => formatCurrency(value, lang);
  const totalPaid = payments.reduce((s,p) => s+p.amount, 0);
  const salePrice = client.salePrice || client.price || 0;
  const remaining = Math.max(0, salePrice - totalPaid);
  const discount  = Math.max(0, (client.officialPrice||salePrice) - salePrice);
  const invoiceNo = resolveInvoiceDisplayNumber({ client, payments });
  const invoiceDate = payments.find((payment) => trimValue(payment?.date))?.date
    || new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : lang === "en" ? "en-US" : "ar-MA");
  const html = `<!DOCTYPE html>
<html dir="${isAr?"rtl":"ltr"}" lang="${lang}">
<head>
<meta charset="UTF-8"/>
<title>${label(lang, "فاتورة", "Facture", "Invoice")} ${invoiceNo}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; font-size:12px; background:#fff; color:#111; }
  .page { width:190mm; margin:0 auto; padding:34mm 15mm 14mm; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
  .invoice-title { font-size:24px; font-weight:900; color:#d4af37; text-align:${isAr?"left":"right"}; }
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
  .stamp { margin-top:28px; display:flex; justify-content:space-between; }
  @media print { @page { size:A4; margin:0; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div></div>
    <div style="text-align:${isAr?"left":"right"}">
      <div class="invoice-title">${label(lang, "فاتورة", "FACTURE", "INVOICE")}</div>
      <div class="invoice-no">${label(lang, "فاتورة رقم", "Facture N°", "Invoice No.")} ${invoiceNo}</div>
      <div class="invoice-no">${label(lang, "التاريخ", "Date", "Date")}: ${invoiceDate}</div>
    </div>
  </div>
  <hr class="divider"/>
  <div class="info-grid">
    <div class="info-box">
      <h3>${label(lang, "المعتمر", "Client / Pèlerin", "Client / Pilgrim")}</h3>
      <p>${clientName}</p>
      ${latinName ? `<p>${latinName}</p>` : ""}
      <p>${client.phone}</p>
      <p>${client.city || ""}</p>
      ${client.passport?.number ? `<p>${label(lang, "جواز السفر", "Passeport", "Passport")}: ${client.passport.number}</p>` : ""}
    </div>
    <div class="info-box">
      <h3>${label(lang, "تفاصيل البرنامج", "Détails programme", "Program Details")}</h3>
      <p>${program?.name || "—"}</p>
      <p>${label(lang, "الذهاب", "Départ", "Departure")}: ${program?.departure || "—"}</p>
      <p>${label(lang, "العودة", "Retour", "Return")}: ${program?.returnDate || "—"}</p>
      <p>${label(lang, "فندق مكة", "Hôtel Mecque", "Makkah Hotel")}: ${client.hotelMecca || "—"}</p>
      <p>${label(lang, "الغرفة", "Chambre", "Room")}: ${translateRoomType(client.roomType || client.roomTypeLabel, lang) || "—"}</p>
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
      <tr><td>${label(lang, "باقة العمرة", "Forfait Omra", "Umrah Package")} — ${program?.name || ""}</td><td>${money(client.officialPrice || salePrice)}</td></tr>
      ${discount > 0 ? `<tr><td style="color:#e65100">${label(lang, "خصم ممنوح", "Remise accordée", "Discount")}</td><td style="color:#e65100">- ${money(discount)}</td></tr>` : ""}
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
        ${payments.map(p=>`<tr><td>${p.receiptNo}</td><td>${p.date}</td><td>${translatePaymentMethod(p.method, lang)}</td><td>${money(p.amount)}</td></tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}
  <div class="stamp">
    <div style="text-align:center;font-size:11px"><div style="border:1px dashed #ccc;width:120px;height:60px;margin-bottom:4px"></div>${label(lang, "ختم الوكالة", "Cachet agence", "Agency Stamp")}</div>
    <div style="text-align:center;font-size:11px"><div style="border:1px dashed #ccc;width:120px;height:60px;margin-bottom:4px"></div>${label(lang, "توقيع المعتمر", "Signature client", "Client Signature")}</div>
  </div>
</div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1200);}</script>
</body></html>`;
  const w = window.open("", "_blank", "width=900,height=680");
  w.document.write(html); w.document.close();
}
