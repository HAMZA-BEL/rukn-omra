import { getParticipantTerminology } from "./participantTerminology";
import { escapeHtml } from "./escapeHtml";
import { getClientEffectiveOfficialPrice, getClientEffectiveSalePrice, getClientRemainingAmount } from "./clientPricing";
import { clientServiceIncludesAccommodation, getClientServiceTypeLabel } from "./clientServiceTypes";
import { translateRoomType } from "./i18nValues";
import { getLegacyReceiptNumber, isPreviousPaymentRecord } from "./paymentRecords";
import { getLocalizedAgencyName } from "./agencyDisplay";

const getFinalInvoiceNumber = (invoice = {}) => String(
  invoice.invoiceDisplayNumber
    || invoice.invoiceNumber
    || invoice.invoice_number
    || ""
).trim();

const getFinalInvoiceClientId = (invoice = {}) => String(
  invoice.clientId
    || invoice.client_id
    || ""
).trim();

const getFinalInvoiceProgramId = (invoice = {}) => String(
  invoice.programId
    || invoice.program_id
    || ""
).trim();

const isFinalInvoiceSnapshot = (invoice = {}) => {
  const number = getFinalInvoiceNumber(invoice);
  if (!number) return false;
  const status = String(invoice.status || "issued").trim().toLowerCase();
  if (["trashed", "deleted", "cancelled", "canceled", "void", "draft"].includes(status)) return false;
  const type = String(
    invoice.documentType
      || invoice.document_type
      || invoice.invoiceType
      || invoice.invoice_type
      || invoice.type
      || ""
  ).trim().toLowerCase();
  if (type.includes("proforma") || type.includes("prelim") || type.includes("draft")) return false;
  return true;
};

const getInvoiceSortTime = (invoice = {}) => {
  for (const raw of [invoice.issueDate, invoice.issue_date, invoice.date, invoice.createdAt, invoice.created_at]) {
    if (!raw) continue;
    const time = new Date(raw).getTime();
    if (Number.isFinite(time)) return time;
  }
  return 0;
};

const getInvoiceSortNumber = (invoice = {}) => {
  const raw = String(invoice.invoiceNumber || invoice.invoice_number || invoice.invoiceDisplayNumber || "");
  const matches = raw.match(/\d+/g);
  if (!matches) return 0;
  const value = Number(matches.join(""));
  return Number.isFinite(value) ? value : 0;
};

const getClientFinalInvoiceNumber = (client = {}, finalInvoices = []) => {
  const clientId = String(client.id || client.clientId || client.client_id || "").trim();
  if (!clientId) return "-";
  const programId = String(client.programId || client.program_id || client.prog?.id || "").trim();
  const matches = (Array.isArray(finalInvoices) ? finalInvoices : [])
    .map((invoice, index) => ({ invoice, index }))
    .filter(({ invoice }) => {
      if (!isFinalInvoiceSnapshot(invoice)) return false;
      if (getFinalInvoiceClientId(invoice) !== clientId) return false;
      const invoiceProgramId = getFinalInvoiceProgramId(invoice);
      return !invoiceProgramId || !programId || invoiceProgramId === programId;
    })
    .sort((a, b) => (
      getInvoiceSortTime(b.invoice) - getInvoiceSortTime(a.invoice)
      || getInvoiceSortNumber(b.invoice) - getInvoiceSortNumber(a.invoice)
      || b.index - a.index
    ));
  return matches.length ? getFinalInvoiceNumber(matches[0].invoice) : "-";
};

/**
 * Generates a print-ready HTML page for a program's pilgrim list
 * and opens it in a new window for window.print().
 * No external libraries — pure HTML/CSS.
 */
export function printProgramPDF({
  program,
  clients,
  getClientStatus,
  getClientOfficialPrice,
  getClientSalePrice,
  getClientRemainingAmount: getClientRemainingAmountForProgram,
  getClientTotalPaid,
  getClientPayments,
  lang,
  t,
  agency,
}) {
  const isRTL = lang === "ar";
  const dir   = isRTL ? "rtl" : "ltr";
  const terms = getParticipantTerminology(program, lang);

  // ── Labels (fall back to Arabic if key missing) ─────────────────────────
  const L = {
    agencyName:   getLocalizedAgencyName(agency, lang, t.agencyFallbackName),
    phones:       [agency?.phoneTiznit1, agency?.phoneTiznit2].filter(Boolean).join("  |  "),
    printedOn:    lang === "fr" ? "Imprimé le" : lang === "en" ? "Printed on" : "تاريخ الطباعة",
    program:      lang === "fr" ? "Programme" : lang === "en" ? "Programme" : "البرنامج",
    departure:    t.departure    || "تاريخ الذهاب",
    returnDate:   t.returnDate   || "تاريخ العودة",
    hotelMecca:   t.hotelMecca   || "فندق مكة",
    hotelMadina:  t.hotelMadina  || "فندق المدينة",
    num:          lang === "fr" ? "N°"         : lang === "en" ? "No."       : "م",
    fullName:     t.fullName     || (lang === "fr" ? "Nom complet"     : "الاسم الكامل"),
    passportNo:   t.passportNo   || (lang === "fr" ? "N° Passeport"    : "رقم الجواز"),
    roomType:     t.roomType     || (lang === "fr" ? "Chambre"          : "نوع الغرفة"),
    serviceType:  t.serviceType  || (lang === "fr" ? "Type de service"  : lang === "en" ? "Service type" : "نوع الخدمة"),
    officialPrice: lang === "fr" ? "Prix officiel" : lang === "en" ? "Official price" : "السعر الرسمي",
    salePrice:    lang === "fr" ? "Prix de vente / Montant" : lang === "en" ? "Selling price / Amount" : "سعر البيع / المبلغ",
    firstPayment: lang === "fr" ? "1er paiement" : lang === "en" ? "First payment" : "الدفعة الأولى",
    secondPayment: lang === "fr" ? "2e paiement" : lang === "en" ? "Second payment" : "الدفعة الثانية",
    thirdPayment: lang === "fr" ? "3e paiement" : lang === "en" ? "Third payment" : "الدفعة الثالثة",
    paid:         t.paid || (lang === "fr" ? "Payé" : lang === "en" ? "Paid" : "المدفوع"),
    receiptsPayments: lang === "fr" ? "Reçus / paiements" : lang === "en" ? "Receipts / payments" : "الوصولات / الدفعات",
    normalPayment: lang === "fr" ? "Paiement normal" : lang === "en" ? "Normal payment" : "دفعة عادية",
    previousPayment: lang === "fr" ? "Paiement antérieur" : lang === "en" ? "Previous payment" : "دفعة سابقة",
    ruknReceipt:  lang === "fr" ? "Reçu Rukn" : lang === "en" ? "Rukn receipt" : "وصل Rukn",
    oldReceipt:   lang === "fr" ? "Ancien reçu" : lang === "en" ? "Old receipt" : "وصل قديم",
    noReceiptNumber: lang === "fr" ? "Sans numéro de reçu" : lang === "en" ? "No receipt number" : "بدون رقم وصل",
    status:       lang === "fr" ? "Statut"    : lang === "en" ? "Status"     : "الحالة",
    remaining:    t.remaining    || (lang === "fr" ? "Reste"            : "المتبقي"),
    overpaid:     lang === "fr" ? "Trop-perçu" : lang === "en" ? "Overpaid" : "زائد",
    cleared:      t.status_cleared || (lang === "fr" ? "Soldé"          : "مصفّى"),
    partial:      t.status_partial || (lang === "fr" ? "Partiel"        : "جزئي"),
    unpaid:       t.status_unpaid  || (lang === "fr" ? "Non payé"       : "لم يدفع"),
    totalClients: lang === "ar"
      ? `إجمالي ${terms.plural}`
      : t.totalClients || (lang === "fr" ? "Total pèlerins" : "Total Pilgrims"),
    totalSellingPrice: lang === "fr" ? "Total prix de vente" : lang === "en" ? "Total selling price" : "إجمالي سعر البيع",
    collected:    t.collected      || (lang === "fr" ? "Total encaissé" : lang === "en" ? "Collected" : "المحصَّل"),
    currency:     "MAD",
  };

  // ── Totals ───────────────────────────────────────────────────────────────
  const fmt           = (n) => Number(n).toLocaleString("fr-MA") + " " + L.currency;
  const today         = new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "ar-MA");
  const resolveSalePrice = (client = {}) => {
    if (typeof getClientSalePrice === "function") return Number(getClientSalePrice(client)) || 0;
    return getClientEffectiveSalePrice(client, { program });
  };
  const resolveOfficialPrice = (client = {}) => {
    if (typeof getClientOfficialPrice === "function") return Number(getClientOfficialPrice(client)) || 0;
    return getClientEffectiveOfficialPrice(client, { program });
  };
  const resolveRemaining = (client = {}, paid = 0) => {
    if (typeof getClientRemainingAmountForProgram === "function") {
      return Number(getClientRemainingAmountForProgram(client, paid)) || 0;
    }
    return getClientRemainingAmount(client, paid, { program });
  };
  const resolveStatus = (client = {}, paid = 0, salePrice = 0) => {
    if (typeof getClientStatus === "function") return getClientStatus(client, paid, salePrice);
    if (paid === 0) return "unpaid";
    return paid >= salePrice ? "cleared" : "partial";
  };
  const getClientPaidTotal = (client = {}) => (
    typeof getClientTotalPaid === "function" ? Number(getClientTotalPaid(client.id)) || 0 : 0
  );
  const totalSellingPrice = clients.reduce((s, c) => s + resolveSalePrice(c), 0);
  const totalPaid     = clients.reduce((s, c) => s + getClientPaidTotal(c), 0);
  const totalRem      = clients.reduce((s, c) => s + resolveRemaining(c, getClientPaidTotal(c)), 0);
  const getPaymentSortTime = (payment = {}) => {
    for (const raw of [payment.date, payment.createdAt, payment.created_at]) {
      if (!raw) continue;
      const time = new Date(raw).getTime();
      if (Number.isFinite(time)) return time;
    }
    return Number.POSITIVE_INFINITY;
  };
  const getSortedPayments = (clientId) => (
    (typeof getClientPayments === "function" ? getClientPayments(clientId) : [])
      .map((payment, index) => ({ payment, index }))
      .sort((a, b) => {
        const byDate = getPaymentSortTime(a.payment) - getPaymentSortTime(b.payment);
        return byDate || a.index - b.index;
      })
      .map(({ payment }) => payment)
  );
  const getReceiptNumber = (payment = {}) => String(
    payment.receiptNo
      || payment.receipt_no
      || payment.receiptNumber
      || payment.receipt_number
      || ""
  ).trim();
  const renderPaymentsCell = (payments = []) => {
    if (!payments.length) return "—";
    return payments.map((payment) => {
      const isPrevious = isPreviousPaymentRecord(payment);
      const legacyReceiptNumber = getLegacyReceiptNumber(payment);
      const receiptNumber = getReceiptNumber(payment);
      const amount = Number(payment.amount) || 0;
      const receiptLabel = isPrevious
        ? (legacyReceiptNumber ? `${L.oldReceipt}: ${legacyReceiptNumber}` : `${L.previousPayment} ${L.noReceiptNumber}`)
        : (receiptNumber ? `${L.ruknReceipt}: ${receiptNumber}` : `${L.normalPayment} ${L.noReceiptNumber}`);
      return `<div class="receipt-line"><span>${escapeHtml(receiptLabel)}</span><strong>${escapeHtml(fmt(amount))}</strong></div>`;
    }).join("");
  };
  const paymentAmountCell = (payments = [], index) => {
    const amount = Number(payments[index]?.amount) || 0;
    return amount > 0 ? escapeHtml(fmt(amount)) : "—";
  };

  // ── Table rows ───────────────────────────────────────────────────────────
  const rows = clients.map((c, i) => {
    const paid    = getClientPaidTotal(c);
    const salePrice = resolveSalePrice(c);
    const officialPrice = resolveOfficialPrice(c);
    const rem     = resolveRemaining(c, paid);
    const overpaid = Math.max(0, paid - salePrice);
    const status  = resolveStatus(c, paid, salePrice);
    const sLabel  = status === "cleared" ? L.cleared : status === "partial" ? L.partial : L.unpaid;
    const sClass  = status === "cleared" ? "cleared" : status === "partial" ? "partial" : "unpaid";
    const name    = [c.lastName, c.firstName || c.nom || c.prenom].filter(Boolean).join(" ") || c.name || "—";
    const roomLabel = clientServiceIncludesAccommodation(c)
      ? (translateRoomType(c.roomTypeLabel || c.roomType, lang) || c.roomTypeLabel || c.roomType || "—")
      : "-";
    const serviceTypeLabel = getClientServiceTypeLabel(c, t, lang);
    const sortedPayments = getSortedPayments(c.id);
    const paymentsCell = renderPaymentsCell(sortedPayments);

    return `
      <tr>
        <td style="text-align:center;font-weight:700">${i + 1}</td>
        <td style="font-weight:600">${escapeHtml(name)}</td>
        <td style="font-family:monospace;font-size:10px">${escapeHtml(c.passport?.number || "—")}</td>
        <td>${escapeHtml(roomLabel)}</td>
        <td>${escapeHtml(serviceTypeLabel)}</td>
        <td style="text-align:${isRTL ? "left" : "right"};font-weight:600">${officialPrice > 0 ? escapeHtml(fmt(officialPrice)) : "—"}</td>
        <td style="text-align:${isRTL ? "left" : "right"};font-weight:700;color:#0d4a1a">${escapeHtml(fmt(salePrice))}</td>
        <td style="text-align:${isRTL ? "left" : "right"}">${paymentAmountCell(sortedPayments, 0)}</td>
        <td style="text-align:${isRTL ? "left" : "right"}">${paymentAmountCell(sortedPayments, 1)}</td>
        <td style="text-align:${isRTL ? "left" : "right"}">${paymentAmountCell(sortedPayments, 2)}</td>
        <td style="text-align:${isRTL ? "left" : "right"};font-weight:600;color:#15803d">${escapeHtml(fmt(paid))}</td>
        <td style="text-align:${isRTL ? "left" : "right"};font-weight:600;color:${rem > 0 ? "#b91c1c" : "#16a34a"}">${rem > 0 ? escapeHtml(fmt(rem)) : `—${overpaid > 0 ? `<div class="overpaid-note">${escapeHtml(L.overpaid)} ${escapeHtml(fmt(overpaid))}</div>` : ""}`}</td>
        <td style="text-align:center"><span class="status ${sClass}">${escapeHtml(sLabel)}</span></td>
        <td>${paymentsCell}</td>
      </tr>`;
  }).join("");

  // ── Column headers ───────────────────────────────────────────────────────
  const headers = [
    L.num,
    L.fullName,
    L.passportNo,
    L.roomType,
    L.serviceType,
    L.officialPrice,
    L.salePrice,
    L.firstPayment,
    L.secondPayment,
    L.thirdPayment,
    L.paid,
    L.remaining,
    L.status,
    L.receiptsPayments,
  ]
    .map(h => `<th>${escapeHtml(h)}</th>`).join("");
  const columnWidths = [3, 14, 8, 7, 8, 8, 8, 5, 5, 5, 7, 7, 5, 12];
  const colgroup = columnWidths.map((width) => `<col style="width:${width}%">`).join("");

  // ── Full HTML ─────────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${escapeHtml(lang)}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(program.name)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 landscape; margin: 12mm 14mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #111;
      direction: ${dir};
      background: #fff;
    }
    /* ── Header ── */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #d4af37;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .agency-block { }
    .agency-name {
      font-size: 20px;
      font-weight: 900;
      color: #0d4a1a;
      letter-spacing: .5px;
    }
    .agency-phones {
      font-size: 11px;
      color: #555;
      margin-top: 3px;
    }
    .print-meta {
      text-align: ${isRTL ? "left" : "right"};
      font-size: 10px;
      color: #777;
      line-height: 1.6;
    }
    /* ── Program info bar ── */
    .prog-bar {
      background: linear-gradient(135deg, #0d4a1a, #1a6b2e);
      color: #fff;
      border-radius: 8px;
      padding: 9px 16px;
      margin-bottom: 14px;
      display: flex;
      flex-wrap: wrap;
      gap: 18px;
      align-items: center;
    }
    .prog-bar .prog-name {
      font-size: 14px;
      font-weight: 900;
      color: #d4af37;
      flex: 1;
      min-width: 200px;
    }
    .prog-bar .info-item {
      font-size: 10px;
      color: rgba(255,255,255,.85);
      white-space: nowrap;
    }
    .prog-bar .info-item strong { color: #d4af37; margin-${isRTL ? "left" : "right"}: 4px; }
    /* ── Table ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      table-layout: fixed;
      font-size: 7.7px;
    }
    thead tr {
      background: #0d4a1a;
    }
    th {
      color: #d4af37;
      padding: 5px 2px;
      font-weight: 700;
      font-size: 7.5px;
      border: 1px solid #0a3a15;
      white-space: normal;
      line-height: 1.25;
    }
    td {
      padding: 3px 2px;
      border: 1px solid #ddd;
      vertical-align: middle;
      overflow: hidden;
      overflow-wrap: anywhere;
      line-height: 1.3;
    }
    tbody tr:nth-child(even) td { background: #f4fbf5; }
    tbody tr:hover td { background: #e8f5ea; }
    .receipt-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      padding: 1px 0;
      line-height: 1.25;
    }
    .receipt-line + .receipt-line {
      border-top: 1px solid rgba(13,74,26,.12);
    }
    .receipt-line span {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .receipt-line strong {
      flex-shrink: 0;
      color: #0d4a1a;
      font-size: 7.2px;
    }
    .overpaid-note {
      margin-top: 1px;
      color: #6b7280;
      font-size: 6.9px;
      font-weight: 700;
      line-height: 1.15;
      white-space: nowrap;
    }
    /* ── Status badges ── */
    .status {
      display: inline-block;
      padding: 2px 4px;
      border-radius: 20px;
      font-size: 7.2px;
      font-weight: 700;
      white-space: nowrap;
    }
    .status.cleared { background: #dcfce7; color: #15803d; }
    .status.partial  { background: #fef3c7; color: #b45309; }
    .status.unpaid   { background: #fee2e2; color: #b91c1c; }
    /* ── Footer ── */
    .footer {
      display: flex;
      gap: 12px;
      border-top: 2px solid #d4af37;
      padding-top: 12px;
      justify-content: ${isRTL ? "flex-end" : "flex-start"};
      flex-wrap: wrap;
    }
    .footer-card {
      border: 1px solid #c8e6c8;
      border-radius: 6px;
      padding: 8px 14px;
      text-align: center;
      background: #f0fbf3;
      min-width: 145px;
    }
    .footer-card .fc-val {
      font-size: 15px;
      font-weight: 900;
      color: #0d4a1a;
    }
    .footer-card .fc-lbl {
      font-size: 9px;
      color: #666;
      margin-top: 3px;
    }
    /* ── Print button (screen only) ── */
    .print-btn {
      position: fixed;
      top: 14px;
      ${isRTL ? "left" : "right"}: 14px;
      background: #0d4a1a;
      color: #d4af37;
      border: none;
      border-radius: 8px;
      padding: 10px 22px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      font-family: Arial, sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,.25);
      z-index: 9999;
    }
    .print-btn:hover { background: #15603a; }
  </style>
</head>
<body>

  <button class="print-btn no-print" onclick="window.print()">${escapeHtml(lang === "fr" ? "Imprimer" : lang === "en" ? "Print" : "طباعة")}</button>

  <!-- Header -->
  <div class="page-header">
    <div class="agency-block">
      <div class="agency-name">${escapeHtml(L.agencyName)}</div>
      ${L.phones ? `<div class="agency-phones">${escapeHtml(L.phones)}</div>` : ""}
    </div>
    <div class="print-meta">
      <div>${escapeHtml(L.printedOn)}: <strong>${escapeHtml(today)}</strong></div>
      <div>${escapeHtml(L.totalClients)}: <strong>${escapeHtml(clients.length)}</strong></div>
    </div>
  </div>

  <!-- Program bar -->
  <div class="prog-bar">
    <div class="prog-name">${escapeHtml(program.name)}</div>
    <div class="info-item"><strong>${escapeHtml(L.departure)}:</strong>${escapeHtml(program.departure || "—")}</div>
    <div class="info-item"><strong>${escapeHtml(L.returnDate)}:</strong>${escapeHtml(program.returnDate || "—")}</div>
    <div class="info-item"><strong>${escapeHtml(L.hotelMecca)}:</strong>${escapeHtml(program.hotelMecca || "—")}</div>
    <div class="info-item"><strong>${escapeHtml(L.hotelMadina)}:</strong>${escapeHtml(program.hotelMadina || "—")}</div>
  </div>

  <!-- Table -->
  <table>
    <colgroup>${colgroup}</colgroup>
    <thead><tr>${headers}</tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <!-- Footer totals -->
  <div class="footer">
    <div class="footer-card">
      <div class="fc-val">${escapeHtml(fmt(totalSellingPrice))}</div>
      <div class="fc-lbl">${escapeHtml(L.totalSellingPrice)}</div>
    </div>
    <div class="footer-card">
      <div class="fc-val">${escapeHtml(fmt(totalPaid))}</div>
      <div class="fc-lbl">${escapeHtml(L.collected)}</div>
    </div>
    <div class="footer-card">
      <div class="fc-val" style="color:${totalRem > 0 ? "#b91c1c" : "#15803d"}">${escapeHtml(fmt(totalRem))}</div>
      <div class="fc-lbl">⏳ ${escapeHtml(L.remaining)}</div>
    </div>
    <div class="footer-card">
      <div class="fc-val">${clients.length}</div>
      <div class="fc-lbl">${escapeHtml(L.totalClients)}</div>
    </div>
  </div>

</body>
</html>`;

  const win = window.open("", "_blank", "width=1200,height=800");
  if (!win) return; // popup blocked
  win.document.write(html);
  win.document.close();
}

// ─────────────────────────────────────────────────────────────────────────────
// CLEARANCE REPORT PDF  (A4 portrait)
// ─────────────────────────────────────────────────────────────────────────────
export function printClearancePDF({ data, totals, filterLabel, lang, t, agency, finalInvoices = [] }) {
  const isRTL = lang === "ar";
  const dir   = isRTL ? "rtl" : "ltr";
  const fmt   = (n) => Number(n || 0).toLocaleString("fr-MA") + " MAD";
  const fmtPaymentAmount = (n) => (
    lang === "ar"
      ? `${Number(n || 0).toLocaleString("fr-MA")} د.م`
      : `MAD ${Number(n || 0).toLocaleString("fr-MA")}`
  );
  const today = new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "ar-MA");
  const formatDate = (value = "") => {
    const raw = String(value || "").trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    return raw || "-";
  };
  const internalNotePatterns = [
    /بيانات\s*تقريبية/i,
    /معلومات\s*(ناقصة|غير\s*مكتملة)/i,
    /يرجى\s+إكمال\s+المعلومات/i,
    /هذه\s+معلومات/i,
    /تم\s+استيراد\s+بيانات\s+من\s+ملف/i,
    /donn[ée]es\s+import[ée]es/i,
    /informations?\s+[àa]\s+compl[ée]ter/i,
    /data\s+imported/i,
    /missing\s+information/i,
    /information\s+needs\s+completion/i,
    /approx(imate|imation)?/i,
    /fallback/i,
    /debug/i,
    /internal/i,
    /warning/i,
    /\bMRZ\b/i,
    /\bOCR\b/i,
  ];
  const isRealClientNote = (value = "") => {
    const note = String(value || "").trim();
    return Boolean(note) && !internalNotePatterns.some((pattern) => pattern.test(note));
  };
  const getPaymentSortTime = (payment = {}) => {
    for (const raw of [payment.date, payment.createdAt, payment.created_at]) {
      if (!raw) continue;
      const time = new Date(raw).getTime();
      if (Number.isFinite(time)) return time;
    }
    return Number.POSITIVE_INFINITY;
  };
  const getReceiptNumber = (payment = {}) => String(
    isPreviousPaymentRecord(payment)
      ? getLegacyReceiptNumber(payment)
      : (
        payment.receiptNo
        || payment.receipt_no
        || payment.receiptNumber
        || payment.receipt_number
        || ""
      )
  ).trim();
  const getSortedPayments = (payments = []) => (
    (Array.isArray(payments) ? payments : [])
      .map((payment, index) => ({ payment, index }))
      .sort((a, b) => {
        const byDate = getPaymentSortTime(a.payment) - getPaymentSortTime(b.payment);
        return byDate || a.index - b.index;
      })
      .map(({ payment }) => payment)
  );
  const renderPaymentDetails = (payments = []) => {
    const sortedPayments = getSortedPayments(payments);
    if (!sortedPayments.length) return "-";
    return sortedPayments.map((payment) => {
      const amount = fmtPaymentAmount(Number(payment.amount) || 0);
      const receipt = getReceiptNumber(payment) || "-";
      const date = formatDate(payment.date || payment.createdAt || payment.created_at);
      return `<div class="payment-line"><span class="payment-amount">${escapeHtml(amount)}</span><span class="payment-sep">:</span><span class="payment-receipt">${escapeHtml(receipt)}</span><span class="payment-sep">|</span><span class="payment-date">${escapeHtml(date)}</span></div>`;
    }).join("");
  };
  const getClientPhone = (client = {}) => String(
    client.phone
      || client.phoneNumber
      || client.phone_number
      || client.mobile
      || ""
  ).trim();
  const getClientNotes = (client = {}) => {
    const candidates = [
      client.financeNote,
      client.finance_note,
      client.clearanceNote,
      client.clearance_note,
      client.paymentNote,
      client.payment_note,
      client.note,
      client.notes,
      client.remark,
      client.remarks,
    ].map((value) => String(value || "").trim());
    return candidates.find(isRealClientNote) || "";
  };

  // ── Labels ────────────────────────────────────────────────────────────────
  const L = {
    agencyName:    getLocalizedAgencyName(agency, lang, t.agencyFallbackName),
    phones:        [agency?.phoneTiznit1, agency?.phoneTiznit2].filter(Boolean).join("  |  "),
    address:       agency?.addressTiznit || "",
    title:         t.clearanceReport || (lang === "fr" ? "Bilan financier" : lang === "en" ? "Financial clearance report" : "كشف التصفية المالية"),
    printedOn:     lang === "fr" ? "Imprimé le" : lang === "en" ? "Printed on" : "تاريخ الطباعة",
    filter:        lang === "fr" ? "Filtre appliqué" : lang === "en" ? "Applied filter" : "الفلتر المطبق",
    fileId:        t.fileId   || (lang === "fr" ? "N° Dossier" : lang === "en" ? "File No." : "رقم الملف"),
    name:          t.name     || (lang === "fr" ? "Nom" : lang === "en" ? "Name" : "الاسم"),
    phone:         t.phone    || (lang === "fr" ? "Téléphone" : lang === "en" ? "Phone" : "رقم الهاتف"),
    program:       t.program  || (lang === "fr" ? "Programme" : lang === "en" ? "Program" : "البرنامج"),
    serviceType:   t.serviceType || (lang === "fr" ? "Type de service" : lang === "en" ? "Service type" : "نوع الخدمة"),
    salePrice:     t.salePrice || (lang === "fr" ? "Prix vente" : lang === "en" ? "Sale price" : "سعر البيع"),
    paid:          t.paid     || (lang === "fr" ? "Payé" : lang === "en" ? "Paid" : "المدفوع"),
    remaining:     t.remaining || (lang === "fr" ? "Reste" : lang === "en" ? "Remaining" : "المتبقي"),
    paymentDetails: lang === "fr" ? "Détails paiements" : lang === "en" ? "Payment details" : "تفاصيل الدفعات",
    notes:         lang === "fr" ? "Notes" : lang === "en" ? "Notes" : "الملاحظة",
    status:        lang === "fr" ? "Statut" : lang === "en" ? "Status" : "حالة الدفع",
    cleared:       t.status_cleared || (lang === "fr" ? "Soldé" : lang === "en" ? "Paid" : "مصفّى"),
    partial:       t.status_partial || (lang === "fr" ? "Partiel" : lang === "en" ? "Partial" : "جزئي"),
    unpaid:        t.status_unpaid  || (lang === "fr" ? "Non payé" : lang === "en" ? "Unpaid" : "لم يدفع"),
    overpaid:      lang === "fr" ? "Trop-perçu" : lang === "en" ? "Overpaid" : "زائد",
    totalRevenue:  lang === "fr" ? "Total revenus" : lang === "en" ? "Total revenue" : "إجمالي الإيرادات",
    collected:     t.collected || (lang === "fr" ? "Encaissé" : lang === "en" ? "Collected" : "المحصَّل"),
    totalRem:      lang === "fr" ? "Total restant" : lang === "en" ? "Total remaining" : "إجمالي المتبقي",
    discounts:     t.discounts || (lang === "fr" ? "Remises" : lang === "en" ? "Discounts" : "الخصومات"),
    totalClients:  t.totalClients || (lang === "fr" ? "Total dossiers" : lang === "en" ? "Total files" : "إجمالي الملفات"),
    chartTitle:    lang === "fr" ? "Répartition des statuts" : lang === "en" ? "Status breakdown" : "توزيع الحالات المالية",
    printBtn:      lang === "fr" ? "Imprimer" : lang === "en" ? "Print" : "طباعة",
  };

  // ── Status counts (from full data passed) ────────────────────────────────
  const cleared = data.filter(c => c.status === "cleared").length;
  const partial = data.filter(c => c.status === "partial").length;
  const unpaid  = data.filter(c => c.status === "unpaid").length;
  const total   = data.length || 1; // avoid /0

  const pCleared = Math.round((cleared / total) * 100);
  const pPartial = Math.round((partial / total) * 100);
  const pUnpaid  = 100 - pCleared - pPartial;

  // conic-gradient stops
  const g1 = pCleared;
  const g2 = pCleared + pPartial;

  // ── Table rows ────────────────────────────────────────────────────────────
  const rows = data.map((c, i) => {
    const sLabel = c.status === "cleared" ? L.cleared : c.status === "partial" ? L.partial : L.unpaid;
    const sClass = c.status === "cleared" ? "cleared" : c.status === "partial" ? "partial" : "unpaid";
    const serviceTypeLabel = getClientServiceTypeLabel(c, t, lang);
    const phone = getClientPhone(c) || "—";
    const remaining = Number(c.remaining) || 0;
    const overpaid = Math.max(0, (Number(c.paid) || 0) - (Number(c.salePrice) || 0));
    const paymentDetails = renderPaymentDetails(c.clientPayments);
    const notes = getClientNotes(c) || "-";
    return `
      <tr>
        <td style="font-family:monospace;font-size:9px;color:#555">${escapeHtml((c.displayRef || c.id || "—").toString())}</td>
        <td style="font-weight:600">${escapeHtml(c.displayName || c.name || "—")}</td>
        <td>${escapeHtml(phone)}</td>
        <td style="font-size:10px;color:#444">${escapeHtml(c.prog?.name || "—")}</td>
        <td>${escapeHtml(serviceTypeLabel)}</td>
        <td style="text-align:${isRTL ? "left" : "right"};font-weight:600;color:#0d4a1a">${escapeHtml(fmt(c.salePrice))}</td>
        <td style="text-align:${isRTL ? "left" : "right"};color:#15803d;font-weight:600">${escapeHtml(fmt(c.paid))}</td>
        <td style="text-align:${isRTL ? "left" : "right"};font-weight:700;color:${remaining > 0 ? "#b91c1c" : "#15803d"}">${escapeHtml(fmt(remaining))}${overpaid > 0 ? `<div class="overpaid-note">${escapeHtml(L.overpaid)} ${escapeHtml(fmt(overpaid))}</div>` : ""}</td>
        <td style="text-align:center"><span class="status ${sClass}">${escapeHtml(sLabel)}</span></td>
        <td class="payment-details">${paymentDetails}</td>
        <td class="notes-cell">${escapeHtml(notes)}</td>
      </tr>`;
  }).join("");

  const headers = [L.fileId, L.name, L.phone, L.program, L.serviceType, L.salePrice, L.paid, L.remaining, L.status, L.paymentDetails, L.notes]
    .map(h => `<th>${escapeHtml(h)}</th>`).join("");
  const colgroup = ["6%", "14%", "8%", "8%", "7%", "8%", "8%", "8%", "6%", "18%", "9%"]
    .map(width => `<col style="width:${width}">`).join("");

  // ── HTML ──────────────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${escapeHtml(lang)}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(L.title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 landscape; margin: 11mm 12mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #111;
      direction: ${dir};
      background: #fff;
    }
    /* ── Page header ── */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #d4af37;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .agency-name { font-size: 18px; font-weight: 900; color: #0d4a1a; }
    .agency-sub  { font-size: 10px; color: #666; margin-top: 3px; line-height: 1.5; }
    .report-meta { text-align: ${isRTL ? "left" : "right"}; font-size: 10px; color: #777; line-height: 1.7; }
    /* ── Report title ── */
    .report-title {
      text-align: center;
      font-size: 15px;
      font-weight: 900;
      color: #0d4a1a;
      margin-bottom: 4px;
    }
    .filter-badge {
      display: inline-block;
      background: #fef9e7;
      border: 1px solid #d4af37;
      border-radius: 20px;
      padding: 2px 14px;
      font-size: 10px;
      color: #92610a;
      font-weight: 700;
      margin-bottom: 12px;
    }
    .title-row { text-align: center; margin-bottom: 12px; }
    /* ── Table ── */
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 8.6px; table-layout: fixed; }
    thead tr { background: #0d4a1a; }
    th {
      color: #d4af37;
      padding: 6px 3px;
      font-weight: 700;
      font-size: 8px;
      border: 1px solid #0a3a15;
      white-space: normal;
      line-height: 1.25;
    }
    td {
      padding: 4px 3px;
      border: 1px solid #e0e0e0;
      vertical-align: top;
      font-size: 8.4px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .payment-details {
      font-size: 8.1px;
      color: #334155;
      direction: ${dir};
      overflow-wrap: normal;
    }
    .payment-line {
      line-height: 1.28;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .payment-line + .payment-line {
      border-top: 1px solid rgba(13,74,26,.12);
      margin-top: 2px;
      padding-top: 2px;
    }
    .payment-amount {
      color: #0f5132;
      font-weight: 800;
    }
    .payment-receipt {
      color: #334155;
      font-family: Arial, Helvetica, sans-serif;
      font-weight: 700;
    }
    .payment-date {
      color: #475569;
    }
    .payment-sep {
      color: #94a3b8;
      padding: 0 3px;
    }
    .notes-cell {
      color: #475569;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .overpaid-note {
      margin-top: 1px;
      color: #6b7280;
      font-size: 7px;
      font-weight: 700;
      line-height: 1.15;
      white-space: nowrap;
    }
    tbody tr:nth-child(even) td { background: #f4fbf5; }
    .status {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 20px;
      font-size: 9px;
      font-weight: 700;
    }
    .status.cleared { background: #dcfce7; color: #15803d; }
    .status.partial  { background: #fef3c7; color: #b45309; }
    .status.unpaid   { background: #fee2e2; color: #b91c1c; }
    /* ── Totals row ── */
    .totals-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 16px;
      justify-content: ${isRTL ? "flex-end" : "flex-start"};
    }
    .total-card {
      flex: 1;
      min-width: 100px;
      border: 1px solid #c8e6c8;
      border-radius: 6px;
      padding: 8px 12px;
      text-align: center;
      background: #f0fbf3;
    }
    .total-card .tc-val { font-size: 13px; font-weight: 900; color: #0d4a1a; }
    .total-card .tc-lbl { font-size: 9px; color: #666; margin-top: 3px; }
    /* ── Pie chart ── */
    .chart-section {
      display: flex;
      gap: 24px;
      align-items: center;
      border: 1px solid #e2f0e2;
      border-radius: 8px;
      padding: 14px 18px;
      background: #f8fdf8;
      margin-top: 4px;
    }
    .pie-wrap { flex-shrink: 0; position: relative; }
    .pie {
      width: 110px;
      height: 110px;
      border-radius: 50%;
      background: conic-gradient(
        #16a34a 0% ${g1}%,
        #d97706 ${g1}% ${g2}%,
        #dc2626 ${g2}% 100%
      );
    }
    /* donut hole */
    .pie::after {
      content: "";
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 52px; height: 52px;
      border-radius: 50%;
      background: #f8fdf8;
    }
    .pie-total {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      font-size: 14px;
      font-weight: 900;
      color: #0d4a1a;
      z-index: 1;
    }
    .legend { flex: 1; }
    .legend-title { font-size: 12px; font-weight: 800; color: #0d4a1a; margin-bottom: 10px; }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 10px;
    }
    .dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
    .dot.cleared { background: #16a34a; }
    .dot.partial  { background: #d97706; }
    .dot.unpaid   { background: #dc2626; }
    .legend-item .pct { font-weight: 800; font-size: 12px; min-width: 36px; }
    /* ── Print button ── */
    .print-btn {
      position: fixed;
      top: 14px;
      ${isRTL ? "left" : "right"}: 14px;
      background: #0d4a1a;
      color: #d4af37;
      border: none;
      border-radius: 8px;
      padding: 10px 22px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      font-family: Arial, sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,.25);
      z-index: 9999;
    }
    .print-btn:hover { background: #15603a; }
  </style>
</head>
<body>

  <button class="print-btn no-print" onclick="window.print()">${escapeHtml(L.printBtn)}</button>

  <!-- Page header -->
  <div class="page-header">
    <div>
      <div class="agency-name">${escapeHtml(L.agencyName)}</div>
      <div class="agency-sub">
        ${L.phones ? `${escapeHtml(L.phones)}` : ""}
        ${L.address ? `<br>${escapeHtml(L.address)}` : ""}
      </div>
    </div>
    <div class="report-meta">
      <div>${escapeHtml(L.printedOn)}: <strong>${escapeHtml(today)}</strong></div>
      <div>${escapeHtml(L.totalClients)}: <strong>${escapeHtml(data.length)}</strong></div>
    </div>
  </div>

  <!-- Title + filter -->
  <div class="title-row">
    <div class="report-title">${escapeHtml(L.title)}</div>
    <span class="filter-badge">${escapeHtml(L.filter)}: ${escapeHtml(filterLabel)}</span>
  </div>

  <!-- Table -->
  <table>
    <colgroup>${colgroup}</colgroup>
    <thead><tr>${headers}</tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <!-- Financial summary -->
  <div class="totals-row">
    <div class="total-card">
      <div class="tc-val">${escapeHtml(fmt(totals.rev))}</div>
      <div class="tc-lbl">${escapeHtml(L.totalRevenue)}</div>
    </div>
    <div class="total-card">
      <div class="tc-val" style="color:#15803d">${escapeHtml(fmt(totals.paid))}</div>
      <div class="tc-lbl">${escapeHtml(L.collected)}</div>
    </div>
    <div class="total-card">
      <div class="tc-val" style="color:${totals.rem > 0 ? "#b91c1c" : "#15803d"}">${escapeHtml(fmt(totals.rem))}</div>
      <div class="tc-lbl">⏳ ${escapeHtml(L.totalRem)}</div>
    </div>
    <div class="total-card">
      <div class="tc-val" style="color:#b45309">${escapeHtml(fmt(totals.disc))}</div>
      <div class="tc-lbl">${escapeHtml(L.discounts)}</div>
    </div>
  </div>

  <!-- Pie chart -->
  <div class="chart-section">
    <div class="pie-wrap">
      <div class="pie"></div>
      <div class="pie-total">${total}</div>
    </div>
    <div class="legend">
      <div class="legend-title">${escapeHtml(L.chartTitle)}</div>
      <div class="legend-item">
        <div class="dot cleared"></div>
        <div style="flex:1">${escapeHtml(L.cleared)}</div>
        <div class="pct" style="color:#15803d">${pCleared}%</div>
        <div style="color:#555">(${cleared})</div>
      </div>
      <div class="legend-item">
        <div class="dot partial"></div>
        <div style="flex:1">${escapeHtml(L.partial)}</div>
        <div class="pct" style="color:#b45309">${pPartial}%</div>
        <div style="color:#555">(${partial})</div>
      </div>
      <div class="legend-item">
        <div class="dot unpaid"></div>
        <div style="flex:1">${escapeHtml(L.unpaid)}</div>
        <div class="pct" style="color:#b91c1c">${pUnpaid}%</div>
        <div style="color:#555">(${unpaid})</div>
      </div>
    </div>
  </div>

</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
