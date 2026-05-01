import React from "react";
import { StatusBadge, GlassCard, SearchBar, Button } from "./UI";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { printClearancePDF } from "../utils/exportPdf";
import { printInvoice } from "./PrintTemplates";
import { AppIcon } from "./Icon";
import { getClientDisplayName } from "../utils/clientNames";
import { formatCurrency } from "../utils/currency";

const tc = theme.colors;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REF_KEYS = [
  "fileRef", "file_ref",
  "fileId", "file_id",
  "fileNumber", "file_number",
  "fileNo", "file_no",
  "ref", "reference",
  "dossier", "dossierNo", "dossier_no",
  "caseNumber", "case_number",
  "folderNumber", "folder_number",
];
const TEXT_CLAMP_STYLE = { overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" };

const formatFileReference = (client = {}) => {
  for (const key of REF_KEYS) {
    const value = client?.[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  const ticket = typeof client?.ticketNo === "string"
    ? client.ticketNo.trim()
    : typeof client?.ticket_no === "string"
      ? client.ticket_no.trim()
      : "";
  if (ticket) return ticket;
  const fallback = typeof client?.id === "string" ? client.id.trim() : "";
  if (!fallback) return "—";
  if (UUID_REGEX.test(fallback)) {
    const start = fallback.slice(0, 4).toUpperCase();
    const end   = fallback.slice(-4).toUpperCase();
    return `#${start}-${end}`;
  }
  return fallback;
};

const CLEARANCE_PROGRAM_STORAGE_KEY = "rukn-clearance-selected-program";

const getProgramDateValue = (program = {}) => {
  const raw = program.departure || program.startDate || program.date || program.departureDate || "";
  const time = raw ? new Date(raw).getTime() : NaN;
  return Number.isFinite(time) ? time : null;
};

const pickDefaultProgramId = (programs = []) => {
  if (!programs.length) return "";
  const now = Date.now();
  const withDates = programs
    .map((program) => ({ program, time: getProgramDateValue(program) }))
    .filter((item) => item.time !== null);
  const upcoming = withDates
    .filter((item) => item.time >= now)
    .sort((a, b) => a.time - b.time)[0];
  if (upcoming) return upcoming.program.id;
  const latest = withDates.sort((a, b) => b.time - a.time)[0];
  return latest?.program?.id || programs[0]?.id || "";
};

const getLocalizedClearanceLabels = (lang) => {
  if (lang === "fr") {
    return {
      program: "Programme",
      pageSize: "Lignes",
      exportExcel: "Exporter Excel",
      selectProgram: "Sélectionnez un programme",
      emptyProgram: "Aucun client dans ce programme",
      reportTitle: "État de règlement",
      exportDate: "Date d'export",
      agencyName: "Tiznit Voyages",
      currency: "Devise",
      clientCount: "Nombre de clients",
      period: "Période",
      departure: "Départ",
      returnDate: "Retour",
      summary: "Résumé financier",
      totalSale: "Total ventes",
      totalPaid: "Total payé",
      totalRemaining: "Reste à payer",
      totalDiscount: "Remises",
      fullyPaid: "Soldés",
      partialPaid: "Partiels",
      unpaid: "Non payés",
      index: "#",
      fileRef: "Référence",
      name: "Nom",
      phone: "Téléphone",
      package: "Niveau",
      roomType: "Type chambre",
      salePrice: "Prix vente",
      paidAmount: "Montant payé",
      remainingAmount: "Reste",
      discount: "Remise",
      status: "Statut",
      lastPaymentDate: "Dernier paiement",
      receiptNumber: "Reçu",
      notes: "Notes",
      total: "Total",
      paid: "Soldé",
      partial: "Partiel",
      unpaidStatus: "Non payé",
      allStatuses: "Tous",
    };
  }
  if (lang === "en") {
    return {
      program: "Program",
      pageSize: "Rows",
      exportExcel: "Export Excel",
      selectProgram: "Select a program",
      emptyProgram: "No clients in this program",
      reportTitle: "Clearance Report",
      exportDate: "Export date",
      agencyName: "Tiznit Voyages",
      currency: "Currency",
      clientCount: "Number of clients",
      period: "Period",
      departure: "Departure",
      returnDate: "Return",
      summary: "Financial summary",
      totalSale: "Total sale",
      totalPaid: "Total paid",
      totalRemaining: "Total remaining",
      totalDiscount: "Total discount",
      fullyPaid: "Paid",
      partialPaid: "Partial",
      unpaid: "Unpaid",
      index: "#",
      fileRef: "Reference",
      name: "Name",
      phone: "Phone",
      package: "Package",
      roomType: "Room type",
      salePrice: "Sale price",
      paidAmount: "Paid amount",
      remainingAmount: "Remaining",
      discount: "Discount",
      status: "Status",
      lastPaymentDate: "Last payment",
      receiptNumber: "Receipt",
      notes: "Notes",
      total: "Total",
      paid: "Paid",
      partial: "Partial",
      unpaidStatus: "Unpaid",
      allStatuses: "All",
    };
  }
  return {
    program: "البرنامج",
    pageSize: "عدد الصفوف",
    exportExcel: "تصدير Excel",
    selectProgram: "اختر برنامجًا",
    emptyProgram: "لا يوجد معتمرون في هذا البرنامج",
    reportTitle: "كشف التصفية",
    exportDate: "تاريخ التصدير",
    agencyName: "تيزنيت أسفار",
    currency: "العملة",
    clientCount: "عدد المعتمرين",
    period: "الفترة",
    departure: "الذهاب",
    returnDate: "العودة",
    summary: "الملخص المالي",
    totalSale: "إجمالي البيع",
    totalPaid: "إجمالي المدفوع",
    totalRemaining: "إجمالي المتبقي",
    totalDiscount: "إجمالي الخصم",
    fullyPaid: "مصفّون",
    partialPaid: "دفع جزئي",
    unpaid: "لم يدفعوا",
    index: "#",
    fileRef: "رقم الملف",
    name: "الاسم",
    phone: "الهاتف",
    package: "المستوى",
    roomType: "نوع الغرفة",
    salePrice: "سعر البيع",
    paidAmount: "المدفوع",
    remainingAmount: "المتبقي",
    discount: "الخصم",
    status: "الحالة",
    lastPaymentDate: "آخر دفعة",
    receiptNumber: "رقم الوصل",
    notes: "ملاحظات",
    total: "المجموع",
    paid: "مصفّى",
    partial: "دفع جزئي",
    unpaidStatus: "لم يدفع",
    allStatuses: "الكل",
  };
};

const sanitizeFileName = (value = "") => {
  const safe = String(value)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);
  return safe || "program";
};

const getAgencyName = (agency = {}, lang = "ar", labels = {}) => {
  if (lang === "ar") return agency?.nameAr || agency?.agencyNameAr || agency?.nameFr || labels.agencyName;
  return agency?.nameFr || agency?.agencyNameFr || agency?.nameAr || labels.agencyName;
};

const getClientPackageLabel = (client = {}) => (
  client.packageLevel || client.hotelLevel || client.packageName || client.levelName || client.level || "—"
);

const getClientNotes = (client = {}) => client.note || client.notes || client.remark || client.remarks || "";

const getStatusLabel = (status, labels) => {
  if (status === "cleared") return labels.paid;
  if (status === "partial") return labels.partial;
  return labels.unpaidStatus;
};

export default function ClearancePage({ store }) {
  const { t, lang, dir } = useLang();
  const isRTL = dir === "rtl";
  const {
    clients,
    programs,
    payments,
    getClientStatus,
    getClientTotalPaid,
    getClientLastPayment,
    agency,
  } = store;
  const [filter, setFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [selectedProgramId, setSelectedProgramId] = React.useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(CLEARANCE_PROGRAM_STORAGE_KEY) || "";
  });
  const [pageSize, setPageSize] = React.useState(10);
  const [currentPage, setCurrentPage] = React.useState(1);
  const labels = React.useMemo(() => getLocalizedClearanceLabels(lang), [lang]);
  const invoiceLabel = t.printInvoice || (lang === "fr" ? "Imprimer facture" : lang === "en" ? "Print Invoice" : "طباعة فاتورة");
  const tableColumns = "minmax(0,1.05fr) minmax(0,1.6fr) minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,1.1fr) minmax(0,1.1fr)";
  const money = React.useCallback((value) => formatCurrency(value, lang), [lang]);

  React.useEffect(() => {
    if (!programs.length) {
      if (selectedProgramId) setSelectedProgramId("");
      return;
    }
    const hasSelected = selectedProgramId && programs.some((program) => program.id === selectedProgramId);
    if (hasSelected) return;
    const saved = typeof window !== "undefined"
      ? localStorage.getItem(CLEARANCE_PROGRAM_STORAGE_KEY)
      : "";
    const next = saved && programs.some((program) => program.id === saved)
      ? saved
      : pickDefaultProgramId(programs);
    setSelectedProgramId(next);
  }, [programs, selectedProgramId]);

  React.useEffect(() => {
    if (!selectedProgramId || typeof window === "undefined") return;
    localStorage.setItem(CLEARANCE_PROGRAM_STORAGE_KEY, selectedProgramId);
  }, [selectedProgramId]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedProgramId, filter, search, pageSize]);

  const selectedProgram = React.useMemo(
    () => programs.find((program) => program.id === selectedProgramId) || null,
    [programs, selectedProgramId]
  );

  const selectedProgramClients = React.useMemo(
    () => selectedProgramId ? clients.filter((client) => client.programId === selectedProgramId) : [],
    [clients, selectedProgramId]
  );

  const programData = React.useMemo(() => selectedProgramClients.map(c => {
    const prog      = selectedProgram || programs.find(p => p.id === c.programId);
    const paid      = getClientTotalPaid(c.id);
    const salePrice = c.salePrice || c.price || 0;
    const officialPrice = c.officialPrice || salePrice;
    const remaining = Math.max(0, salePrice - paid);
    const discount  = Math.max(0, officialPrice - salePrice);
    const status    = getClientStatus(c);
    const lastPmt   = getClientLastPayment(c.id);
    const displayRef = formatFileReference(c);
    const displayName = getClientDisplayName(c, "—", lang);
    const clientPayments = payments.filter(p => p.clientId === c.id);
    return { ...c, displayName, prog, paid, salePrice, officialPrice, remaining, discount, status, lastPmt, displayRef, clientPayments };
  }), [selectedProgramClients, selectedProgram, programs, payments, lang, getClientStatus, getClientTotalPaid, getClientLastPayment]);

  const data = React.useMemo(() => programData.filter(c => {
    const ok1 = filter === "all" || c.status === filter;
    const q   = search.toLowerCase();
    const refMatch = (c.displayRef || "").toString().toLowerCase();
    const ok2 = !q
      || (c.displayName || c.name || "").toLowerCase().includes(q)
      || (c.id || "").toLowerCase().includes(q)
      || refMatch.includes(q);
    return ok1 && ok2;
  }), [programData, filter, search]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const pageData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);

  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const totals = React.useMemo(() => ({
    rev:  programData.reduce((s,c)=>s+c.salePrice,0),
    paid: programData.reduce((s,c)=>s+c.paid,0),
    rem:  programData.reduce((s,c)=>s+c.remaining,0),
    disc: programData.reduce((s,c)=>s+c.discount,0),
  }), [programData]);

  const tableTotals = React.useMemo(() => ({
    rev:  data.reduce((s,c)=>s+c.salePrice,0),
    paid: data.reduce((s,c)=>s+c.paid,0),
    rem:  data.reduce((s,c)=>s+c.remaining,0),
    disc: data.reduce((s,c)=>s+c.discount,0),
  }), [data]);

  const statusCounts = React.useMemo(() => ({
    cleared: programData.filter((c) => c.status === "cleared").length,
    partial: programData.filter((c) => c.status === "partial").length,
    unpaid: programData.filter((c) => c.status === "unpaid").length,
  }), [programData]);

  const FILTER_LABELS = {
    all:     t.all     || (lang === "fr" ? "Tous" : "الكل"),
    cleared: t.clearedFilter || (lang === "fr" ? "Soldés"  : "المصفّون"),
    partial: t.partialFilter || (lang === "fr" ? "Partiel" : "الجزئي"),
    unpaid:  t.unpaidFilter  || (lang === "fr" ? "Non payé": "لم يدفعوا"),
  };

  const handlePrintInvoice = React.useCallback((client) => {
    if (!client) return;
    const program = client.prog || programs.find(p => p.id === client.programId);
    const clientPayments = client.clientPayments || payments.filter(p => p.clientId === client.id);
    printInvoice({
      client,
      program,
      payments: clientPayments,
      agency,
      lang,
    });
  }, [agency, lang, payments, programs]);

  const handleExportExcel = React.useCallback(async () => {
    if (!selectedProgram) return;
    const XLSX = await import("xlsx");
    const agencyName = getAgencyName(agency, lang, labels);
    const exportDate = new Intl.DateTimeFormat(lang === "ar" ? "ar-MA" : lang === "fr" ? "fr-FR" : "en-US").format(new Date());
    const period = [selectedProgram.departure, selectedProgram.returnDate].filter(Boolean).join(" - ") || "—";
    const summaryRows = [
      [labels.totalSale, totals.rev, labels.totalPaid, totals.paid],
      [labels.totalRemaining, totals.rem, labels.totalDiscount, totals.disc],
      [labels.fullyPaid, statusCounts.cleared, labels.partialPaid, statusCounts.partial],
      [labels.unpaid, statusCounts.unpaid, labels.clientCount, programData.length],
    ];
    const tableHeader = [
      labels.index,
      labels.fileRef,
      labels.name,
      labels.phone,
      labels.package,
      labels.roomType,
      labels.salePrice,
      labels.paidAmount,
      labels.remainingAmount,
      labels.discount,
      labels.status,
      labels.lastPaymentDate,
      labels.receiptNumber,
      labels.notes,
    ];
    const detailRows = programData.map((client, index) => [
      index + 1,
      client.displayRef || "",
      client.displayName || getClientDisplayName(client, "—", lang),
      client.phone || "",
      getClientPackageLabel(client),
      client.roomType || client.room_type || "",
      client.salePrice,
      client.paid,
      client.remaining,
      client.discount,
      getStatusLabel(client.status, labels),
      client.lastPmt?.date || "",
      client.lastPmt?.receiptNo || "",
      getClientNotes(client) || client.lastPmt?.note || "",
    ]);
    const totalRow = [
      "",
      "",
      labels.total,
      "",
      "",
      "",
      totals.rev,
      totals.paid,
      totals.rem,
      totals.disc,
      "",
      "",
      "",
      "",
    ];
    const rows = [
      [agencyName],
      [labels.reportTitle],
      [],
      [labels.program, selectedProgram.name || "—", labels.period, period],
      [labels.currency, "MAD", labels.exportDate, exportDate],
      [labels.clientCount, programData.length],
      [],
      [labels.summary],
      ...summaryRows,
      [],
      tableHeader,
      ...detailRows,
      totalRow,
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const headerRowIndex = 13;
    const totalRowIndex = rows.length;
    ws["!cols"] = [
      { wch: 6 }, { wch: 16 }, { wch: 30 }, { wch: 16 },
      { wch: 16 }, { wch: 14 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 13 }, { wch: 14 }, { wch: 16 },
      { wch: 16 }, { wch: 32 },
    ];
    ws["!merges"] = [
      { s:{ r:0, c:0 }, e:{ r:0, c:5 } },
      { s:{ r:1, c:0 }, e:{ r:1, c:5 } },
    ];
    ws["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s:{ r:headerRowIndex - 1, c:0 },
        e:{ r:Math.max(headerRowIndex - 1, totalRowIndex - 2), c:tableHeader.length - 1 },
      }),
    };
    const moneyFormat = '#,##0 "MAD"';
    for (let row = 9; row <= totalRowIndex; row += 1) {
      [1, 3, 6, 7, 8, 9].forEach((col) => {
        const address = XLSX.utils.encode_cell({ r: row - 1, c: col });
        if (ws[address] && typeof ws[address].v === "number") ws[address].z = moneyFormat;
      });
    }
    const wb = XLSX.utils.book_new();
    wb.Props = {
      Title: labels.reportTitle,
      Subject: selectedProgram.name || labels.reportTitle,
      Author: agencyName,
      CreatedDate: new Date(),
    };
    if (isRTL) wb.Workbook = { Views: [{ RTL: true }] };
    const sheetName = lang === "ar" ? "كشف التصفية" : lang === "fr" ? "Règlement" : "Clearance";
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    const prefix = lang === "ar" ? "كشف-تصفية" : "Clearance";
    XLSX.writeFile(wb, `${prefix}-${sanitizeFileName(selectedProgram.name)}.xlsx`, { bookType:"xlsx", compression:true });
  }, [agency, isRTL, labels, lang, programData, selectedProgram, statusCounts, totals]);

  return (
    <div className="page-body clearance-page" style={{ padding:"0 32px 32px" }}>
      <div className="page-header clearance-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:21, fontWeight:800, color:tc.white }}>{t.clearanceReport}</h1>
          <p style={{ fontSize:12, color:tc.grey, marginTop:3 }}>{t.clearanceDesc}</p>
        </div>
      </div>

      <GlassCard style={{ padding:14, marginBottom:18 }}>
        <div style={{
          display:"flex",
          flexWrap:"wrap",
          gap:12,
          alignItems:"end",
        }}>
          <label style={{ display:"flex", flexDirection:"column", gap:6, flex:"1 1 260px", minWidth:220 }}>
            <span style={{ fontSize:12, fontWeight:700, color:tc.grey }}>{labels.program}</span>
            <select
              value={selectedProgramId}
              onChange={(event) => setSelectedProgramId(event.target.value)}
              disabled={!programs.length}
              style={{
                width:"100%",
                height:42,
                background:"var(--rukn-bg-select)",
                border:"1px solid var(--rukn-border-input)",
                borderRadius:10,
                color:"var(--rukn-text)",
                padding:"9px 12px",
                fontSize:13,
                fontFamily:"'Cairo',sans-serif",
                direction:dir,
                outline:"none",
              }}
            >
              {!programs.length && <option value="">{labels.selectProgram}</option>}
              {programs.map((program) => (
                <option key={program.id} value={program.id}>{program.name}</option>
              ))}
            </select>
          </label>
          <label style={{ display:"flex", flexDirection:"column", gap:6, flex:"0 0 140px" }}>
            <span style={{ fontSize:12, fontWeight:700, color:tc.grey }}>{labels.pageSize}</span>
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              disabled={!selectedProgram}
              style={{
                width:"100%",
                height:42,
                background:"var(--rukn-bg-select)",
                border:"1px solid var(--rukn-border-input)",
                borderRadius:10,
                color:"var(--rukn-text)",
                padding:"9px 12px",
                fontSize:13,
                fontFamily:"'Cairo',sans-serif",
                direction:dir,
                outline:"none",
              }}
            >
              {[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <Button
            variant="primary"
            icon="download"
            disabled={!selectedProgram}
            onClick={handleExportExcel}
          >
            {labels.exportExcel}
          </Button>
          <Button variant="ghost" icon="print" disabled={!data.length} onClick={() => {
            if (data.length === 0) return;
            printClearancePDF({
              data,
              totals: tableTotals,
              filterLabel: FILTER_LABELS[filter],
              lang,
              t,
              agency,
            });
          }}>
            {lang === "fr" ? "Exporter PDF" : lang === "en" ? "Export PDF" : "تصدير PDF"}
          </Button>
        </div>
      </GlassCard>

      {/* KPIs */}
      <div className="kpi-grid cards-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:12, marginBottom:24 }}>
        {[
          ["users", t.clients, programData.length, t.gold],
          ["coins", t.salePrice, money(totals.rev), t.gold],
          ["success", t.clearedFilter, statusCounts.cleared, t.greenLight],
          ["partial", t.partialFilter, statusCounts.partial, t.warning],
          ["unpaid", t.unpaidFilter, statusCounts.unpaid, t.danger],
          ["banknote", t.collected, money(totals.paid), t.gold],
          ["hourglass", t.remaining, money(totals.rem), t.warning],
          ["discount", t.discounts, money(totals.disc), t.danger],
        ].map(([ic,lb,vl,cl])=>(
          <GlassCard gold key={lb} style={{ padding:"13px 14px", textAlign:"center" }}>
            <AppIcon name={ic} size={19} color={cl} style={{ marginBottom:5 }} />
            <p style={{ fontSize:15, fontWeight:800, color:cl, fontFamily:"'Amiri',serif", lineHeight:1 }}>{vl}</p>
            <p style={{ fontSize:11, color:t.grey, marginTop:4 }}>{lb}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filters */}
      <div className="page-filters filters-chips">
        {[
          { key:"all",     label:t.all },
          { key:"cleared", label:t.clearedFilter },
          { key:"partial", label:t.partialFilter },
          { key:"unpaid",  label:t.unpaidFilter },
        ].map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`filter-chip${filter===f.key ? " is-active" : ""}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="clearance-search">
        <SearchBar
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder={t.searchGeneral}
          style={{ width:"100%", maxWidth:360 }}
        />
      </div>

      <div className="table-scroll clearance-table">
        {/* Table header */}
        <div className="table-grid table-grid-head clearance-grid" style={{ display:"grid",
          gridTemplateColumns:tableColumns,
          gap:6, padding:"8px 14px",
          background:"var(--rukn-table-head-bg)", border:"1px solid var(--rukn-row-border)", borderRadius:8, marginBottom:6,
          fontSize:11, fontWeight:700, color:t.grey,
          width:"100%",
          boxSizing:"border-box" }}>
          {[t.fileId, t.name, t.program, t.salePrice, t.paid, t.remaining, t.status, t.lastReceipt, invoiceLabel].map(h => (
            <span key={h} style={TEXT_CLAMP_STYLE}>{h}</span>
          ))}
        </div>

        <div className="table-grid-body" style={{ display:"flex", flexDirection:"column", gap:3, width:"100%" }}>
          {pageData.map((c,i) => (
            <ClearRow
              key={c.id}
              client={c}
              index={(currentPage - 1) * pageSize + i}
              gridTemplate={tableColumns}
              invoiceLabel={invoiceLabel}
              onPrintInvoice={handlePrintInvoice}
              money={money}
            />
          ))}
          {!data.length && (
            <div style={{
              padding:18,
              border:"1px solid var(--rukn-row-border)",
              borderRadius:10,
              background:"var(--rukn-row-bg)",
              color:tc.grey,
              textAlign:"center",
              fontSize:13,
            }}>
              {!selectedProgram ? labels.selectProgram : labels.emptyProgram}
            </div>
          )}
        </div>

        {/* Totals */}
        {data.length > 0 && (
          <div className="table-grid table-grid-foot clearance-grid" style={{ display:"grid",
            gridTemplateColumns:tableColumns,
            gap:6, padding:"10px 14px", marginTop:8,
            background:"var(--rukn-section-bg)", border:"1px solid var(--rukn-row-border-hover)",
            borderRadius:10, fontSize:12, fontWeight:700,
            width:"100%",
            boxSizing:"border-box" }}>
            <span style={{ ...TEXT_CLAMP_STYLE, color:t.gold }}>{t.totalLabel}</span>
            <span style={{ ...TEXT_CLAMP_STYLE, color:t.grey }}>{data.length} {t.clients}</span>
            <span />
            <span style={{ ...TEXT_CLAMP_STYLE, color:t.gold }}>{money(tableTotals.rev)}</span>
            <span style={{ ...TEXT_CLAMP_STYLE, color:t.greenLight }}>{money(tableTotals.paid)}</span>
            <span style={{ ...TEXT_CLAMP_STYLE, color:t.warning }}>{money(tableTotals.rem)}</span>
            <span />
            <span style={{ ...TEXT_CLAMP_STYLE, color:t.danger }}>{t.discount}: {money(tableTotals.disc)}</span>
            <span />
          </div>
        )}
      </div>

      {data.length > 0 && (
        <div style={{
          display:"flex",
          justifyContent:"space-between",
          alignItems:"center",
          gap:12,
          flexWrap:"wrap",
          marginTop:12,
          marginBottom:10,
          color:tc.grey,
          fontSize:12,
        }}>
          <span>
            {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, data.length)} / {data.length}
          </span>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              {lang === "fr" ? "Précédent" : lang === "en" ? "Previous" : "السابق"}
            </Button>
            <span style={{ color:tc.white, fontWeight:700 }}>{currentPage} / {totalPages}</span>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              {lang === "fr" ? "Suivant" : lang === "en" ? "Next" : "التالي"}
            </Button>
          </div>
        </div>
      )}

      <div className="clearance-card-list">
        {pageData.map((client, index) => (
          <ClearCard
            key={`card-${client.id}`}
            client={client}
            index={(currentPage - 1) * pageSize + index}
            invoiceLabel={invoiceLabel}
            onPrintInvoice={handlePrintInvoice}
            t={t}
            lang={lang}
            money={money}
          />
        ))}

        {data.length === 0 && (
          <div className="clearance-empty-card">
            {t.noResults || (lang === "fr" ? "Aucun résultat" : lang === "en" ? "No records found" : "لا توجد سجلات")}
          </div>
        )}

        {data.length > 0 && (
          <div className="clearance-card-summary">
            <div className="summary-row">
              <span>{t.totalLabel}</span>
              <strong>{data.length} {t.clients}</strong>
            </div>
            <div className="summary-grid">
              <div>
                <p>{t.salePrice}</p>
                <strong>{money(tableTotals.rev)}</strong>
              </div>
              <div>
                <p>{t.paid}</p>
                <strong className="is-success">{money(tableTotals.paid)}</strong>
              </div>
              <div>
                <p>{t.remaining}</p>
                <strong className="is-warning">{money(tableTotals.rem)}</strong>
              </div>
              <div>
                <p>{t.discount}</p>
                <strong className="is-danger">{money(tableTotals.disc)}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClearRow({ client, index, gridTemplate, onPrintInvoice, invoiceLabel, money }) {
  const [hov, setHov] = React.useState(false);
  const contactLine = [client.phone ? `${client.phone}` : "", client.city ? `• ${client.city}` : ""].filter(Boolean).join(" ");
  return (
    <div className="animate-fadeInUp" style={{ animationDelay:`${index*.018}s` }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <div className="table-grid-row clearance-grid" style={{
        display:"grid",
        gridTemplateColumns:gridTemplate || "repeat(9,minmax(0,1fr))",
        gap:6, padding:"10px 14px",
        background:hov?"var(--rukn-row-hover)":"var(--rukn-row-bg)",
        border:`1px solid ${hov?"var(--rukn-row-border-hover)":"var(--rukn-row-border)"}`,
        borderRadius:10, transition:"all .15s", alignItems:"center",
        boxShadow: hov ? "0 10px 24px rgba(15,23,42,.05)" : "none",
        width:"100%",
        boxSizing:"border-box",
      }}>
        <span style={{ ...TEXT_CLAMP_STYLE, fontSize:12, fontWeight:700, color:theme.colors.gold }}>
          {client.displayRef || client.id || "—"}
        </span>
        <div style={{ minWidth:0, overflow:"hidden" }}>
          <p style={{ ...TEXT_CLAMP_STYLE, fontWeight:700, fontSize:13, color:theme.colors.white }}>{client.displayName || getClientDisplayName(client)}</p>
          <p style={{ ...TEXT_CLAMP_STYLE, fontSize:11, color:theme.colors.grey }}>{contactLine || "—"}</p>
        </div>
        <span style={{ ...TEXT_CLAMP_STYLE, fontSize:11, color:theme.colors.grey }}>{client.prog?.name||"—"}</span>
        <span style={{ ...TEXT_CLAMP_STYLE, fontSize:12, fontWeight:700, color:theme.colors.gold }}>
          {money(client.salePrice)}
        </span>
        <span style={{ ...TEXT_CLAMP_STYLE, fontSize:12, fontWeight:700, color:theme.colors.greenLight }}>
          {money(client.paid)}
        </span>
        <span style={{ ...TEXT_CLAMP_STYLE, fontSize:12, fontWeight:700,
          color:client.remaining>0?theme.colors.warning:theme.colors.greenLight }}>
          {money(client.remaining)}
        </span>
        <StatusBadge status={client.status} />
        <span style={{ ...TEXT_CLAMP_STYLE, fontSize:11, color:theme.colors.grey }}>
          {client.lastPmt?.receiptNo||"—"}
        </span>
        <div style={{ display:"flex", justifyContent:"center", width:"100%", minWidth:0 }}>
          <button
            type="button"
            className="invoice-btn"
            onClick={() => onPrintInvoice?.(client)}
          >
            {invoiceLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClearCard({ client, index, invoiceLabel, onPrintInvoice, t, lang, money }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);
  React.useEffect(() => {
    if (!menuOpen) return;
    const handlePointer = (e) => {
      if (!menuRef.current || menuRef.current.contains(e.target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [menuOpen]);
  const reference = client.displayRef || formatFileReference(client);
  const phoneLine = client.phone ? client.phone.trim() : "";
  const cityLine = client.city ? client.city.trim() : "";
  const remainingColor = client.remaining > 0 ? "warning" : "success";
  const moreLabel = t.moreOptions
    || (lang === "fr" ? "Plus d'options" : lang === "en" ? "More options" : "المزيد");

  return (
    <div className="clear-card animate-fadeInUp" style={{ animationDelay:`${index*.02}s` }}>
      <div className="clear-card-header">
        <div className="clear-card-title">
          <p className="clear-card-name" title={client.displayName || getClientDisplayName(client)}>{client.displayName || getClientDisplayName(client)}</p>
          {phoneLine && <p className="clear-card-phone">{phoneLine}</p>}
          {cityLine && <p className="clear-card-meta">{cityLine}</p>}
        </div>
        <div className="clear-card-actions" ref={menuRef}>
          <button
            type="button"
            className={`clear-card-kebab${menuOpen ? " is-open" : ""}`}
            aria-label={moreLabel}
            onClick={() => setMenuOpen(o => !o)}
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="clear-card-menu">
              <button type="button" onClick={() => { onPrintInvoice?.(client); setMenuOpen(false); }}>
                {invoiceLabel}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="clear-card-info-row">
        <div className="clear-card-info-item">
          <span>{t.fileId}</span>
          <strong title={reference}>{reference}</strong>
        </div>
        <div className="clear-card-info-item">
          <span>{t.program}</span>
          <strong title={client.prog?.name || "—"}>{client.prog?.name || "—"}</strong>
        </div>
      </div>

      <div className="clear-card-finance">
        <ClearCardField label={t.paid} value={money(client.paid)} highlight="success" />
        <ClearCardField label={t.remaining} value={money(client.remaining)} highlight={remainingColor} />
        <div className="clear-card-status-block">
          <p className="clear-card-field-label">{t.status}</p>
          <div className="clear-card-status-badge">
            <StatusBadge status={client.status} />
          </div>
        </div>
      </div>

      <div className="clear-card-info-row">
        <div className="clear-card-info-item">
          <span>{t.salePrice}</span>
          <strong>{money(client.salePrice)}</strong>
        </div>
        <div className="clear-card-info-item">
          <span>{t.lastReceipt}</span>
          <strong>{client.lastPmt?.receiptNo || "—"}</strong>
        </div>
      </div>

      <div className="clear-card-footer">
        <button
          type="button"
          className="invoice-btn"
          onClick={() => onPrintInvoice?.(client)}
        >
          {invoiceLabel}
        </button>
      </div>
    </div>
  );
}

function ClearCardField({ label, value, highlight }) {
  const colorClass = highlight ? ` is-${highlight}` : "";
  return (
    <div className="clear-card-field">
      <p className="clear-card-field-label">{label}</p>
      <p className={`clear-card-field-value${colorClass}`}>
        {value}
      </p>
    </div>
  );
}
