// Print templates — called via window.print() after rendering into a hidden div
import React from "react";
import { TRANSLATIONS } from "../data/initialData";

const trimValue = (value) => (typeof value === "string" ? value.trim() : "");
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
  const isFr = lang === "fr";
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const { primary, secondary, slogan } = resolveAgencyIdentity(agency, t, lang);
  const html = `<!DOCTYPE html>
<html dir="${isFr?"ltr":"rtl"}" lang="${lang}">
<head>
<meta charset="UTF-8"/>
<title>${isFr?"Reçu de paiement":"وصل دفعة"}</title>
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
  <div class="receipt-title">${isFr?"REÇU DE PAIEMENT":"وصل استلام مبلغ"}</div>
  <div class="receipt-no">${isFr?"N°":"رقم"}: <strong>${payment.receiptNo}</strong></div>
  <table>
    <tr><td>${isFr?"Client":"المعتمر"}</td><td>${client.name}${client.nameLatin ? " — "+client.nameLatin : ""}</td></tr>
    <tr><td>${isFr?"Programme":"البرنامج"}</td><td>${program?.name || "—"}</td></tr>
    <tr><td>${isFr?"Mode de paiement":"طريقة الدفع"}</td><td>${payment.method}</td></tr>
    <tr><td>${isFr?"Date":"التاريخ"}</td><td>${payment.date}</td></tr>
    ${payment.note ? `<tr><td>${isFr?"Note":"ملاحظة"}</td><td>${payment.note}</td></tr>` : ""}
    <tr class="amount-row">
      <td>${isFr?"MONTANT REÇU":"المبلغ المستلم"}</td>
      <td>${payment.amount.toLocaleString()} ${isFr?"DH":"د.م"}</td>
    </tr>
  </table>
  <div class="signature">
    <span>${isFr?"Cachet de l'agence":"ختم الوكالة"}</span>
    <span>${isFr?"Signature du client":"توقيع المعتمر"}</span>
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
  const isFr = lang === "fr";  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;  const p = client.passport || {};
  const { primary, secondary, slogan } = resolveAgencyIdentity(agency, t, lang);
  const headerPhones = [agency?.phoneTiznit1, agency?.phoneTiznit2].filter(Boolean).join(" / ");
  const footerPhones = [agency?.phoneTiznit1, agency?.phoneAgadir1].filter(Boolean).join(" / ");
  const footerName = secondary && secondary !== primary ? `${secondary} | ${primary}` : primary;
  const html = `<!DOCTYPE html>
<html dir="${isFr?"ltr":"rtl"}" lang="${lang}">
<head>
<meta charset="UTF-8"/>
<title>${isFr?"Carte pèlerin":"بطاقة المعتمر"}</title>
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
      <div class="agency">🕋 ${primary}</div>
      <div style="font-size:10px;color:#888">${headerPhones}</div>
    </div>
    <div class="badge">${client.name[0]}</div>
  </div>
  <div class="name">${client.name}</div>
  ${client.nameLatin ? `<div class="name-latin">${client.nameLatin}</div>` : ""}
  <div class="grid">
    <div class="item"><label>${isFr?"Référence":"رقم الملف"}</label><span>${client.id}</span></div>
    <div class="item"><label>${isFr?"Téléphone":"الهاتف"}</label><span>${client.phone}</span></div>
    <div class="item"><label>${isFr?"Programme":"البرنامج"}</label><span>${program?.name || "—"}</span></div>
    <div class="item"><label>${isFr?"Chambre":"نوع الغرفة"}</label><span>${client.roomType || "—"}</span></div>
    <div class="item"><label>${isFr?"Hôtel Mecque":"فندق مكة"}</label><span>${client.hotelMecca || "—"}</span></div>
    <div class="item"><label>${isFr?"Hôtel Médine":"فندق المدينة"}</label><span>${client.hotelMadina || "—"}</span></div>
    <div class="item"><label>${isFr?"Départ":"الذهاب"}</label><span>${program?.departure || "—"}</span></div>
    <div class="item"><label>${isFr?"Retour":"العودة"}</label><span>${program?.returnDate || "—"}</span></div>
    ${p.number ? `<div class="item"><label>${isFr?"Passeport":"رقم الجواز"}</label><span>${p.number}</span></div>` : ""}
    ${p.expiry ? `<div class="item"><label>${isFr?"Expiration":"انتهاء الجواز"}</label><span>${p.expiry}</span></div>` : ""}
    ${client.ticketNo ? `<div class="item"><label>${isFr?"N° billet":"رقم التذكرة"}</label><span>${client.ticketNo}</span></div>` : ""}
  </div>
  ${client.docs ? `<div class="docs">
    ${[["passportCopy",isFr?"Passeport":"صورة الجواز"],["photo",isFr?"Photo":"صورة"],["vaccine",isFr?"Vaccin":"تطعيم"],["contract",isFr?"Contrat":"عقد"]].map(([k,l])=>`
    <span class="doc-badge ${client.docs[k]?"doc-ok":"doc-no"}">${client.docs[k]?"✓":"✗"} ${l}</span>`).join("")}
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
  const isFr = lang === "fr";
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const { primary, secondary, slogan } = resolveAgencyIdentity(agency, t, lang);
  const headerPhones = [agency?.phoneTiznit1, agency?.phoneTiznit2].filter(Boolean).join(" / ");
  const footerPhones = [agency?.phoneTiznit1, agency?.phoneAgadir1].filter(Boolean).join(" / ");
  const footerName = secondary && secondary !== primary ? `${secondary} | ${primary}` : primary;
  const totalPaid = payments.reduce((s,p) => s+p.amount, 0);
  const salePrice = client.salePrice || client.price || 0;
  const remaining = Math.max(0, salePrice - totalPaid);
  const discount  = Math.max(0, (client.officialPrice||salePrice) - salePrice);
  const invoiceNo = `INV-${client.id}-${new Date().getFullYear()}`;
  const html = `<!DOCTYPE html>
<html dir="${isFr?"ltr":"rtl"}" lang="${lang}">
<head>
<meta charset="UTF-8"/>
<title>${isFr?"Facture":"فاتورة"} ${invoiceNo}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; font-size:12px; background:#fff; color:#111; }
  .page { width:190mm; margin:0 auto; padding:15mm; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
  .logo { font-size:20px; font-weight:900; color:#1a6b3a; }
  .logo-sub { font-size:11px; color:#666; margin-top:3px; }
  .invoice-title { font-size:24px; font-weight:900; color:#d4af37; text-align:${isFr?"right":"left"}; }
  .invoice-no { font-size:12px; color:#888; }
  .divider { border:none; border-top:2px solid #1a6b3a; margin:12px 0; }
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px; }
  .info-box { background:#f9f9f9; border:1px solid #eee; border-radius:6px; padding:10px; }
  .info-box h3 { font-size:11px; color:#888; margin-bottom:6px; font-weight:700; text-transform:uppercase; }
  .info-box p { font-size:12px; font-weight:600; line-height:1.6; }
  table { width:100%; border-collapse:collapse; margin-bottom:12px; }
  th { background:#1a6b3a; color:#fff; padding:7px 10px; font-size:11px; text-align:${isFr?"left":"right"}; }
  td { padding:7px 10px; border-bottom:1px solid #eee; font-size:12px; }
  tr:nth-child(even) td { background:#fafafa; }
  .totals { margin-${isFr?"left":"right"}:auto; width:240px; }
  .total-row { display:flex; justify-content:space-between; padding:4px 0; font-size:12px; }
  .total-final { font-size:15px; font-weight:900; color:#1a6b3a; border-top:2px solid #1a6b3a; padding-top:6px; margin-top:4px; }
  .remaining { color:${remaining>0?"#e65100":"#1a6b3a"}; font-weight:700; }
  .footer { margin-top:20px; text-align:center; font-size:10px; color:#aaa; border-top:1px solid #eee; padding-top:8px; }
  .stamp { margin-top:24px; display:flex; justify-content:space-between; }
  @media print { @page { size:A4; margin:10mm; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="logo">🕋 ${primary}</div>
      <div class="logo-sub">${secondary && secondary !== primary ? secondary : ""}</div>
      <div class="logo-sub">${agency.addressTiznit || ""}</div>
      <div class="logo-sub">${headerPhones ? `${isFr ? "Tél" : "هاتف"}: ${headerPhones}` : ""}</div>
      ${agency.ice ? `<div class="logo-sub">ICE: ${agency.ice}</div>` : ""}
    </div>
    <div style="text-align:${isFr?"right":"left"}">
      <div class="invoice-title">${isFr?"FACTURE":"فاتورة"}</div>
      <div class="invoice-no">${isFr?"N°":"رقم"}: ${invoiceNo}</div>
      <div class="invoice-no">${isFr?"Date":"التاريخ"}: ${new Date().toLocaleDateString(isFr?"fr-FR":"ar-MA")}</div>
    </div>
  </div>
  <hr class="divider"/>
  <div class="info-grid">
    <div class="info-box">
      <h3>${isFr?"Client / Pèlerin":"المعتمر"}</h3>
      <p>${client.name}</p>
      ${client.nameLatin ? `<p>${client.nameLatin}</p>` : ""}
      <p>${client.phone}</p>
      <p>${client.city || ""}</p>
      ${client.passport?.number ? `<p>${isFr?"Passeport":"جواز السفر"}: ${client.passport.number}</p>` : ""}
    </div>
    <div class="info-box">
      <h3>${isFr?"Détails programme":"تفاصيل البرنامج"}</h3>
      <p>${program?.name || "—"}</p>
      <p>${isFr?"Départ":"الذهاب"}: ${program?.departure || "—"}</p>
      <p>${isFr?"Retour":"العودة"}: ${program?.returnDate || "—"}</p>
      <p>${isFr?"Hôtel Mecque":"فندق مكة"}: ${client.hotelMecca || "—"}</p>
      <p>${isFr?"Chambre":"الغرفة"}: ${client.roomType || "—"}</p>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>${isFr?"Description":"البيان"}</th>
        <th>${isFr?"Montant":"المبلغ"}</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>${isFr?"Forfait Omra — "+program?.name:"باقة العمرة — "+(program?.name||"")}</td><td>${(client.officialPrice||salePrice).toLocaleString()} ${isFr?"DH":"د.م"}</td></tr>
      ${discount > 0 ? `<tr><td style="color:#e65100">${isFr?"Remise accordée":"خصم ممنوح"}</td><td style="color:#e65100">- ${discount.toLocaleString()} ${isFr?"DH":"د.م"}</td></tr>` : ""}
    </tbody>
  </table>
  <div class="totals">
    <div class="total-row"><span>${isFr?"Prix de vente":"سعر البيع"}</span><span>${salePrice.toLocaleString()} ${isFr?"DH":"د.م"}</span></div>
    <div class="total-row" style="color:#1a6b3a"><span>${isFr?"Total payé":"المدفوع"}</span><span>${totalPaid.toLocaleString()} ${isFr?"DH":"د.م"}</span></div>
    <div class="total-row total-final">
      <span class="remaining">${isFr?"RESTE À PAYER":"المتبقي"}</span>
      <span class="remaining">${remaining.toLocaleString()} ${isFr?"DH":"د.م"}</span>
    </div>
  </div>
  ${payments.length > 0 ? `
  <div style="margin-top:14px">
    <h3 style="font-size:11px;color:#888;margin-bottom:6px">${isFr?"HISTORIQUE DES PAIEMENTS":"سجل الدفعات"}</h3>
    <table>
      <thead><tr>
        <th>${isFr?"N° Reçu":"رقم الوصل"}</th>
        <th>${isFr?"Date":"التاريخ"}</th>
        <th>${isFr?"Mode":"الطريقة"}</th>
        <th>${isFr?"Montant":"المبلغ"}</th>
      </tr></thead>
      <tbody>
        ${payments.map(p=>`<tr><td>${p.receiptNo}</td><td>${p.date}</td><td>${p.method}</td><td>${p.amount.toLocaleString()} ${isFr?"DH":"د.م"}</td></tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}
  <div class="stamp">
    <div style="text-align:center;font-size:11px"><div style="border:1px dashed #ccc;width:120px;height:60px;margin-bottom:4px"></div>${isFr?"Cachet agence":"ختم الوكالة"}</div>
    <div style="text-align:center;font-size:11px"><div style="border:1px dashed #ccc;width:120px;height:60px;margin-bottom:4px"></div>${isFr?"Signature client":"توقيع المعتمر"}</div>
  </div>
  <div class="footer">
    ${footerName}${footerPhones ? ` — ${footerPhones}` : ""}${slogan ? ` — ${slogan}` : ""}${agency.ice ? ` — ICE: ${agency.ice}` : ""}
  </div>
</div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1200);}</script>
</body></html>`;
  const w = window.open("", "_blank", "width=900,height=680");
  w.document.write(html); w.document.close();
}
