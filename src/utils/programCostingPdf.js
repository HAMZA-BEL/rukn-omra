import { escapeHtml } from "./escapeHtml";
import { COSTING_ROOM_TYPES, getSharedCostTotal } from "../components/programs/programCosting";
import { getLocalizedAgencyName } from "./agencyDisplay";

const fmt = (value) => `${Number(value || 0).toLocaleString("fr-MA", { maximumFractionDigits: 2 })} MAD`;
const fmtSar = (value) => `${Number(value || 0).toLocaleString("fr-MA", { maximumFractionDigits: 2 })} SAR`;
const fmtPercent = (value) => value === null || value === undefined ? "—" : `${Number(value).toLocaleString("fr-MA", { maximumFractionDigits: 1 })}%`;

const reportDateForLang = (lang = "ar") => (
  new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : lang === "en" ? "en-US" : "ar-MA")
);

export function printProgramCostingReport({ program = {}, agency = {}, draft = {}, results = [], labels, lang = "ar" }) {
  const isRTL = lang === "ar";
  const dir = isRTL ? "rtl" : "ltr";
  const sharedTotal = getSharedCostTotal(draft);
  const generated = reportDateForLang(lang);
  const title = labels.reportTitle;
  const agencyName = getLocalizedAgencyName(agency, lang);
  const roomLabels = COSTING_ROOM_TYPES.reduce((acc, roomType) => {
    acc[roomType.key] = labels[roomType.key] || roomType.key;
    return acc;
  }, {});
  const hasNightsWarning = results.some((level) => level.nightsMissingSource);
  const hotelLabel = (value) => value || labels.notSpecified || "—";
  const nightsLabel = (level, value) => level.nightsMissingSource ? "—" : String(value ?? 0);

  const sharedRows = [
    [labels.exchangeRate, Number(draft.exchangeRate || 0).toLocaleString("fr-MA", { maximumFractionDigits: 4 })],
    [labels.flight, fmt(draft.sharedCosts?.flight)],
    Number(draft.standaloneSalePrices?.ticketOnly || 0) > 0
      ? [labels.ticketOnlySalePriceReport || labels.ticketOnlySalePrice, fmt(draft.standaloneSalePrices?.ticketOnly)]
      : null,
    [labels.visa, fmt(draft.sharedCosts?.visa)],
    Number(draft.standaloneSalePrices?.visaOnly || 0) > 0
      ? [labels.visaOnlySalePriceReport || labels.visaOnlySalePrice, fmt(draft.standaloneSalePrices?.visaOnly)]
      : null,
    [labels.transport, fmt(draft.sharedCosts?.transport)],
    [labels.guide, fmt(draft.sharedCosts?.guide)],
    [labels.miscellaneous, fmt(draft.sharedCosts?.miscellaneous)],
    [labels.totalShared, fmt(sharedTotal)],
  ].filter(Boolean).map(([label, value]) => `
    <div class="kv">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join("");

  const levelsHtml = results.map((level) => {
    const roomRows = level.rooms.map((room) => `
      <tr class="${room.isLoss ? "loss" : ""}">
        <td>${escapeHtml(roomLabels[room.key] || room.key)}</td>
        <td>${escapeHtml(fmt(room.accommodationCost))}</td>
        <td>${escapeHtml(fmt(room.sharedCost))}</td>
        <td>${escapeHtml(fmt(room.costPerPerson))}</td>
        <td>${escapeHtml(fmt(room.sellingPrice))}</td>
        <td>${escapeHtml(room.sellingPrice > 0 ? fmt(room.profitAmount) : "—")}</td>
        <td>${escapeHtml(fmtPercent(room.margin))}</td>
      </tr>
    `).join("");

    return `
      <section class="level">
        <div class="level-head">
          <h2>${escapeHtml(level.levelName || "—")}</h2>
          <div class="hotel-summary">
            <span><strong>${escapeHtml(labels.makkah)}:</strong> ${escapeHtml(hotelLabel(level.makkah?.hotelName))} · ${escapeHtml(fmtSar(level.makkah?.roomPriceSar))} · ${escapeHtml(nightsLabel(level, level.makkah?.nights))}</span>
            <span><strong>${escapeHtml(labels.madinah)}:</strong> ${escapeHtml(hotelLabel(level.madinah?.hotelName))} · ${escapeHtml(fmtSar(level.madinah?.roomPriceSar))} · ${escapeHtml(nightsLabel(level, level.madinah?.nights))}</span>
          </div>
        </div>
        <table class="costing-table">
          <thead>
            <tr>
              <th>${escapeHtml(labels.roomType)}</th>
              <th>${escapeHtml(labels.accommodation)}</th>
              <th>${escapeHtml(labels.shared)}</th>
              <th>${escapeHtml(labels.costPerPerson)}</th>
              <th>${escapeHtml(labels.sellingPrice)}</th>
              <th>${escapeHtml(labels.profit)}</th>
              <th>${escapeHtml(labels.margin)}</th>
            </tr>
          </thead>
          <tbody>${roomRows}</tbody>
        </table>
      </section>
    `;
  }).join("");

  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${escapeHtml(lang)}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    *,*::before,*::after{box-sizing:border-box}
    @page{size:A4 portrait;margin:14mm}
    @media print{.no-print{display:none!important}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.level{break-inside:avoid}}
    body{margin:0;background:#fff;color:#111;font-family:"IBM Plex Sans Arabic","Cairo","Tajawal",Arial,sans-serif;direction:${dir};font-size:11px;line-height:1.55}
    .print-btn{position:fixed;top:14px;${isRTL ? "left" : "right"}:14px;z-index:20;border:0;border-radius:8px;background:#0d4a1a;color:#fff;padding:9px 18px;font-weight:800;cursor:pointer}
    .header{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;border-bottom:3px solid #d4af37;padding-bottom:12px;margin-bottom:14px}
    .agency{font-size:17px;font-weight:900;color:#0d4a1a}
    .title{text-align:center;margin:8px 0 14px}
    .title h1{margin:0;color:#0d4a1a;font-size:20px;font-weight:900}
    .title p{margin:4px 0 0;color:#555;font-size:12px}
    .meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:14px}
    .kv{border:1px solid #e5e7eb;background:#f8fafc;border-radius:8px;padding:8px 10px;display:flex;justify-content:space-between;gap:10px}
    .kv span{color:#555}.kv strong{color:#111}
    .section-title{font-size:14px;font-weight:900;color:#0d4a1a;margin:16px 0 8px}
    .shared{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-bottom:14px}
    .level{border:1px solid #d6ead9;border-radius:10px;overflow:hidden;margin:12px 0;background:#fff}
    .level-head{background:#f0fbf3;border-bottom:1px solid #d6ead9;padding:10px 12px}
    .level-head h2{margin:0 0 5px;color:#0d4a1a;font-size:15px}
    .hotel-summary{display:grid;gap:3px;color:#444;font-size:10px}
    table{width:100%;border-collapse:collapse;table-layout:fixed}
    .costing-table th{background:#0d4a1a;color:#fff;padding:7px 5px;border:1px solid #0a3a15;font-size:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    td{padding:7px 5px;border:1px solid #e5e7eb;text-align:center}
    tbody tr:nth-child(even) td{background:#f8fafc}
    tr.loss td{background:#fff1f2;color:#991b1b;font-weight:800}
    .warning{border:1px solid #f59e0b;background:#fffbeb;color:#92400e;border-radius:8px;padding:8px 10px;margin:0 0 12px;font-weight:800}
    .note{border-top:2px solid #d4af37;margin-top:16px;padding-top:10px;color:#555;font-weight:700}
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">${escapeHtml(labels.print)}</button>
  <header class="header">
    <div>
      <div class="agency">${escapeHtml(agencyName || "Rukn")}</div>
      <div>${escapeHtml(program.name || "—")}</div>
    </div>
    <div>
      <div><strong>${escapeHtml(labels.generatedOn)}:</strong> ${escapeHtml(generated)}</div>
      <div><strong>${escapeHtml(labels.currencyRate)}:</strong> SAR/MAD ${escapeHtml(String(draft.exchangeRate || "—"))}</div>
    </div>
  </header>
  <div class="title">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(labels.programDates)}: ${escapeHtml(program.departure || "—")} - ${escapeHtml(program.returnDate || "—")}</p>
  </div>
  ${hasNightsWarning ? `<div class="warning">${escapeHtml(labels.nightsWarning)}</div>` : ""}
  <h2 class="section-title">${escapeHtml(labels.sharedCosts)}</h2>
  <section class="shared">${sharedRows}</section>
  <h2 class="section-title">${escapeHtml(labels.resultsPrices)}</h2>
  ${levelsHtml}
  <div class="note">${escapeHtml(labels.note)}</div>
  <script>window.onload=()=>setTimeout(()=>window.print(),250)</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=980,height=1100");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  return true;
}
