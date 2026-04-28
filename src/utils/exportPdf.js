/**
 * Generates a print-ready HTML page for a program's pilgrim list
 * and opens it in a new window for window.print().
 * No external libraries — pure HTML/CSS.
 */
export function printProgramPDF({ program, clients, getClientStatus, getClientTotalPaid, lang, t, agency }) {
  const isRTL = lang === "ar";
  const dir   = isRTL ? "rtl" : "ltr";

  // ── Labels (fall back to Arabic if key missing) ─────────────────────────
  const L = {
    agencyName:   lang === "fr" ? (agency?.nameFr  || "Tiznit Voyages")     : (agency?.nameAr || "تيزنيت أسفار"),
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
    birthDate:    t.birthDate    || (lang === "fr" ? "Date naissance"   : "تاريخ الميلاد"),
    gender:       t.gender       || (lang === "fr" ? "Sexe"             : "الجنس"),
    roomType:     t.roomType     || (lang === "fr" ? "Chambre"          : "نوع الغرفة"),
    status:       lang === "fr" ? "Statut"    : lang === "en" ? "Status"     : "الحالة",
    remaining:    t.remaining    || (lang === "fr" ? "Reste"            : "المتبقي"),
    cleared:      t.status_cleared || (lang === "fr" ? "Soldé"          : "مصفّى"),
    partial:      t.status_partial || (lang === "fr" ? "Partiel"        : "جزئي"),
    unpaid:       t.status_unpaid  || (lang === "fr" ? "Non payé"       : "لم يدفع"),
    totalClients: t.totalClients   || (lang === "fr" ? "Total pèlerins" : "إجمالي المعتمرين"),
    collected:    t.collected      || (lang === "fr" ? "Encaissé"       : "المحصَّل"),
    male:         lang === "fr" ? "M" : "ذ",
    female:       lang === "fr" ? "F" : "أ",
    currency:     "MAD",
  };

  // ── Totals ───────────────────────────────────────────────────────────────
  const totalRevenue  = clients.reduce((s, c) => s + (c.salePrice || c.price || 0), 0);
  const totalPaid     = clients.reduce((s, c) => s + getClientTotalPaid(c.id), 0);
  const totalRem      = Math.max(0, totalRevenue - totalPaid);
  const fmt           = (n) => Number(n).toLocaleString("fr-MA") + " " + L.currency;
  const today         = new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "ar-MA");

  // ── Table rows ───────────────────────────────────────────────────────────
  const rows = clients.map((c, i) => {
    const status  = getClientStatus(c);
    const paid    = getClientTotalPaid(c.id);
    const rem     = Math.max(0, (c.salePrice || c.price || 0) - paid);
    const sLabel  = status === "cleared" ? L.cleared : status === "partial" ? L.partial : L.unpaid;
    const sClass  = status === "cleared" ? "cleared" : status === "partial" ? "partial" : "unpaid";
    const gLabel  = c.passport?.gender === "F" ? L.female : c.passport?.gender === "M" ? L.male : "—";
    const name    = [c.lastName, c.firstName || c.nom || c.prenom].filter(Boolean).join(" ") || c.name || "—";

    return `
      <tr>
        <td style="text-align:center;font-weight:700">${i + 1}</td>
        <td style="font-weight:600">${name}</td>
        <td style="font-family:monospace;font-size:10px">${c.passport?.number || "—"}</td>
        <td style="text-align:center">${c.passport?.birthDate || "—"}</td>
        <td style="text-align:center">${gLabel}</td>
        <td>${c.roomType || "—"}</td>
        <td style="text-align:center"><span class="status ${sClass}">${sLabel}</span></td>
        <td style="text-align:${isRTL ? "left" : "right"};font-weight:600;color:${rem > 0 ? "#b91c1c" : "#16a34a"}">${rem > 0 ? fmt(rem) : "OK"}</td>
      </tr>`;
  }).join("");

  // ── Column headers ───────────────────────────────────────────────────────
  const headers = [L.num, L.fullName, L.passportNo, L.birthDate, L.gender, L.roomType, L.status, L.remaining]
    .map(h => `<th>${h}</th>`).join("");

  // ── Full HTML ─────────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${program.name}</title>
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
      font-size: 10px;
    }
    thead tr {
      background: #0d4a1a;
    }
    th {
      color: #d4af37;
      padding: 7px 6px;
      font-weight: 700;
      font-size: 10px;
      border: 1px solid #0a3a15;
      white-space: nowrap;
    }
    td {
      padding: 5px 6px;
      border: 1px solid #ddd;
      vertical-align: middle;
    }
    tbody tr:nth-child(even) td { background: #f4fbf5; }
    tbody tr:hover td { background: #e8f5ea; }
    /* ── Status badges ── */
    .status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 9px;
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
      padding: 8px 20px;
      text-align: center;
      background: #f0fbf3;
      min-width: 160px;
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

  <button class="print-btn no-print" onclick="window.print()">${lang === "fr" ? "Imprimer" : lang === "en" ? "Print" : "طباعة"}</button>

  <!-- Header -->
  <div class="page-header">
    <div class="agency-block">
      <div class="agency-name">${L.agencyName}</div>
      ${L.phones ? `<div class="agency-phones">${L.phones}</div>` : ""}
    </div>
    <div class="print-meta">
      <div>${L.printedOn}: <strong>${today}</strong></div>
      <div>${L.totalClients}: <strong>${clients.length}</strong></div>
    </div>
  </div>

  <!-- Program bar -->
  <div class="prog-bar">
    <div class="prog-name">${program.name}</div>
    <div class="info-item"><strong>${L.departure}:</strong>${program.departure || "—"}</div>
    <div class="info-item"><strong>${L.returnDate}:</strong>${program.returnDate || "—"}</div>
    <div class="info-item"><strong>${L.hotelMecca}:</strong>${program.hotelMecca || "—"}</div>
    <div class="info-item"><strong>${L.hotelMadina}:</strong>${program.hotelMadina || "—"}</div>
  </div>

  <!-- Table -->
  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <!-- Footer totals -->
  <div class="footer">
    <div class="footer-card">
      <div class="fc-val">${clients.length}</div>
      <div class="fc-lbl">${L.totalClients}</div>
    </div>
    <div class="footer-card">
      <div class="fc-val">${fmt(totalPaid)}</div>
      <div class="fc-lbl">${L.collected}</div>
    </div>
    <div class="footer-card">
      <div class="fc-val" style="color:${totalRem > 0 ? "#b91c1c" : "#15803d"}">${fmt(totalRem)}</div>
      <div class="fc-lbl">⏳ ${L.remaining}</div>
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
export function printClearancePDF({ data, totals, filterLabel, lang, t, agency }) {
  const isRTL = lang === "ar";
  const dir   = isRTL ? "rtl" : "ltr";
  const fmt   = (n) => Number(n || 0).toLocaleString("fr-MA") + " MAD";
  const today = new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "ar-MA");

  // ── Labels ────────────────────────────────────────────────────────────────
  const L = {
    agencyName:    lang === "fr" ? (agency?.nameFr  || "Tiznit Voyages")    : (agency?.nameAr || "تيزنيت أسفار"),
    phones:        [agency?.phoneTiznit1, agency?.phoneTiznit2].filter(Boolean).join("  |  "),
    address:       agency?.addressTiznit || "",
    title:         t.clearanceReport || (lang === "fr" ? "Bilan financier" : "كشف التصفية المالية"),
    printedOn:     lang === "fr" ? "Imprimé le" : "تاريخ الطباعة",
    filter:        lang === "fr" ? "Filtre appliqué" : "الفلتر المطبق",
    fileId:        t.fileId   || (lang === "fr" ? "N° Dossier" : "رقم الملف"),
    name:          t.name     || (lang === "fr" ? "Nom"        : "الاسم"),
    program:       t.program  || (lang === "fr" ? "Programme"  : "البرنامج"),
    salePrice:     t.salePrice || (lang === "fr" ? "Prix vente" : "سعر البيع"),
    paid:          t.paid     || (lang === "fr" ? "Payé"       : "المدفوع"),
    remaining:     t.remaining || (lang === "fr" ? "Reste"     : "المتبقي"),
    status:        lang === "fr" ? "Statut"     : "الحالة",
    cleared:       t.status_cleared || (lang === "fr" ? "Soldé"    : "مصفّى"),
    partial:       t.status_partial || (lang === "fr" ? "Partiel"  : "جزئي"),
    unpaid:        t.status_unpaid  || (lang === "fr" ? "Non payé" : "لم يدفع"),
    totalRevenue:  lang === "fr" ? "Total revenus"  : "إجمالي الإيرادات",
    collected:     t.collected || (lang === "fr" ? "Encaissé"   : "المحصَّل"),
    totalRem:      lang === "fr" ? "Total restant"  : "إجمالي المتبقي",
    discounts:     t.discounts || (lang === "fr" ? "Remises"    : "الخصومات"),
    totalClients:  t.totalClients || (lang === "fr" ? "Total dossiers" : "إجمالي الملفات"),
    chartTitle:    lang === "fr" ? "Répartition des statuts" : "توزيع الحالات المالية",
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
    return `
      <tr>
        <td style="font-family:monospace;font-size:9px;color:#555">${(c.displayRef || c.id || "—").toString()}</td>
        <td style="font-weight:600">${c.name || "—"}</td>
        <td style="font-size:10px;color:#444">${c.prog?.name || "—"}</td>
        <td style="text-align:${isRTL ? "left" : "right"};font-weight:600;color:#0d4a1a">${fmt(c.salePrice)}</td>
        <td style="text-align:${isRTL ? "left" : "right"};color:#15803d;font-weight:600">${fmt(c.paid)}</td>
        <td style="text-align:${isRTL ? "left" : "right"};font-weight:700;color:${c.remaining > 0 ? "#b91c1c" : "#15803d"}">${c.remaining > 0 ? fmt(c.remaining) : "OK"}</td>
        <td style="text-align:center"><span class="status ${sClass}">${sLabel}</span></td>
      </tr>`;
  }).join("");

  const headers = [L.fileId, L.name, L.program, L.salePrice, L.paid, L.remaining, L.status]
    .map(h => `<th>${h}</th>`).join("");

  // ── HTML ──────────────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${L.title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 portrait; margin: 13mm 14mm; }
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
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 10px; }
    thead tr { background: #0d4a1a; }
    th {
      color: #d4af37;
      padding: 7px 5px;
      font-weight: 700;
      font-size: 9.5px;
      border: 1px solid #0a3a15;
      white-space: nowrap;
    }
    td { padding: 5px; border: 1px solid #e0e0e0; vertical-align: middle; font-size: 10px; }
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

  <button class="print-btn no-print" onclick="window.print()">${L.printBtn}</button>

  <!-- Page header -->
  <div class="page-header">
    <div>
      <div class="agency-name">${L.agencyName}</div>
      <div class="agency-sub">
        ${L.phones ? `${L.phones}` : ""}
        ${L.address ? `<br>${L.address}` : ""}
      </div>
    </div>
    <div class="report-meta">
      <div>${L.printedOn}: <strong>${today}</strong></div>
      <div>${L.totalClients}: <strong>${data.length}</strong></div>
    </div>
  </div>

  <!-- Title + filter -->
  <div class="title-row">
    <div class="report-title">${L.title}</div>
    <span class="filter-badge">${L.filter}: ${filterLabel}</span>
  </div>

  <!-- Table -->
  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <!-- Financial summary -->
  <div class="totals-row">
    <div class="total-card">
      <div class="tc-val">${fmt(totals.rev)}</div>
      <div class="tc-lbl">${L.totalRevenue}</div>
    </div>
    <div class="total-card">
      <div class="tc-val" style="color:#15803d">${fmt(totals.paid)}</div>
      <div class="tc-lbl">${L.collected}</div>
    </div>
    <div class="total-card">
      <div class="tc-val" style="color:${totals.rem > 0 ? "#b91c1c" : "#15803d"}">${fmt(totals.rem)}</div>
      <div class="tc-lbl">⏳ ${L.totalRem}</div>
    </div>
    <div class="total-card">
      <div class="tc-val" style="color:#b45309">${fmt(totals.disc)}</div>
      <div class="tc-lbl">${L.discounts}</div>
    </div>
  </div>

  <!-- Pie chart -->
  <div class="chart-section">
    <div class="pie-wrap">
      <div class="pie"></div>
      <div class="pie-total">${total}</div>
    </div>
    <div class="legend">
      <div class="legend-title">${L.chartTitle}</div>
      <div class="legend-item">
        <div class="dot cleared"></div>
        <div style="flex:1">${L.cleared}</div>
        <div class="pct" style="color:#15803d">${pCleared}%</div>
        <div style="color:#555">(${cleared})</div>
      </div>
      <div class="legend-item">
        <div class="dot partial"></div>
        <div style="flex:1">${L.partial}</div>
        <div class="pct" style="color:#b45309">${pPartial}%</div>
        <div style="color:#555">(${partial})</div>
      </div>
      <div class="legend-item">
        <div class="dot unpaid"></div>
        <div style="flex:1">${L.unpaid}</div>
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
