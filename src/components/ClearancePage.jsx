import React from "react";
import { StatusBadge, GlassCard, SearchBar, Button } from "./UI";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { printClearancePDF } from "../utils/exportPdf";
import { printInvoice } from "./PrintTemplates";
import { AppIcon } from "./Icon";
import { getClientDisplayName } from "../utils/clientNames";

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
  const invoiceLabel = t.printInvoice || (lang === "fr" ? "Imprimer facture" : lang === "en" ? "Print Invoice" : "طباعة فاتورة");
  const tableColumns = "minmax(0,1.05fr) minmax(0,1.6fr) minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,1.1fr) minmax(0,1.1fr)";

  const data = React.useMemo(() => clients.map(c => {
    const prog      = programs.find(p => p.id === c.programId);
    const paid      = getClientTotalPaid(c.id);
    const salePrice = c.salePrice || c.price || 0;
    const officialPrice = c.officialPrice || salePrice;
    const remaining = Math.max(0, salePrice - paid);
    const discount  = Math.max(0, officialPrice - salePrice);
    const status    = getClientStatus(c);
    const lastPmt   = getClientLastPayment(c.id);
    const displayRef = formatFileReference(c);
    const displayName = getClientDisplayName(c);
    const clientPayments = payments.filter(p => p.clientId === c.id);
    return { ...c, displayName, prog, paid, salePrice, officialPrice, remaining, discount, status, lastPmt, displayRef, clientPayments };
  }).filter(c => {
    const ok1 = filter === "all" || c.status === filter;
    const q   = search.toLowerCase();
    const refMatch = (c.displayRef || "").toString().toLowerCase();
    const ok2 = !q
      || (c.displayName || c.name || "").toLowerCase().includes(q)
      || (c.id || "").toLowerCase().includes(q)
      || refMatch.includes(q);
    return ok1 && ok2;
  }), [clients, programs, payments, filter, search, getClientStatus, getClientTotalPaid, getClientLastPayment]);

  const totals = {
    rev:  data.reduce((s,c)=>s+c.salePrice,0),
    paid: data.reduce((s,c)=>s+c.paid,0),
    rem:  data.reduce((s,c)=>s+c.remaining,0),
    disc: data.reduce((s,c)=>s+c.discount,0),
  };

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

  return (
    <div className="page-body clearance-page" style={{ padding:"0 32px 32px" }}>
      <div className="page-header clearance-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:21, fontWeight:800, color:tc.white }}>{t.clearanceReport}</h1>
          <p style={{ fontSize:12, color:tc.grey, marginTop:3 }}>{t.clearanceDesc}</p>
        </div>
        <Button variant="ghost" icon="print" onClick={() => {
          if (data.length === 0) return;
          printClearancePDF({
            data,
            totals,
            filterLabel: FILTER_LABELS[filter],
            lang,
            t,
            agency,
          });
        }}>
          {lang === "fr" ? "Exporter PDF" : lang === "en" ? "Export PDF" : "تصدير PDF"}
        </Button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid cards-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:12, marginBottom:24 }}>
        {[
          ["users", t.clients, clients.length, t.gold],
          ["success", t.clearedFilter, clients.filter(c => getClientStatus(c) === "cleared").length, t.greenLight],
          ["partial", t.partialFilter, clients.filter(c => getClientStatus(c) === "partial").length, t.warning],
          ["unpaid", t.unpaidFilter, clients.filter(c => getClientStatus(c) === "unpaid").length, t.danger],
          ["banknote", t.collected, clients.reduce((s,c) => s + getClientTotalPaid(c.id), 0).toLocaleString("ar-MA") + " د.م", t.gold],
          ["hourglass", t.remaining, clients.reduce((s,c) => s + Math.max(0, (c.salePrice||c.price||0) - getClientTotalPaid(c.id)), 0).toLocaleString("ar-MA") + " د.م", t.warning],
          ["discount", t.discounts, clients.reduce((s,c) => s + Math.max(0, (c.officialPrice||0) - (c.salePrice||c.officialPrice||0)), 0).toLocaleString("ar-MA") + " د.م", t.danger],
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
          {data.map((c,i) => (
            <ClearRow
              key={c.id}
              client={c}
              index={i}
              gridTemplate={tableColumns}
              invoiceLabel={invoiceLabel}
              onPrintInvoice={handlePrintInvoice}
            />
          ))}
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
            <span style={{ ...TEXT_CLAMP_STYLE, color:t.gold }}>{totals.rev.toLocaleString("ar-MA")} د.م</span>
            <span style={{ ...TEXT_CLAMP_STYLE, color:t.greenLight }}>{totals.paid.toLocaleString("ar-MA")} د.م</span>
            <span style={{ ...TEXT_CLAMP_STYLE, color:t.warning }}>{totals.rem.toLocaleString("ar-MA")} د.م</span>
            <span />
            <span style={{ ...TEXT_CLAMP_STYLE, color:t.danger }}>{t.discount}: {totals.disc.toLocaleString("ar-MA")}</span>
            <span />
          </div>
        )}
      </div>

      <div className="clearance-card-list">
        {data.map((client, index) => (
          <ClearCard
            key={`card-${client.id}`}
            client={client}
            index={index}
            invoiceLabel={invoiceLabel}
            onPrintInvoice={handlePrintInvoice}
            t={t}
            lang={lang}
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
                <strong>{totals.rev.toLocaleString("ar-MA")} د.م</strong>
              </div>
              <div>
                <p>{t.paid}</p>
                <strong className="is-success">{totals.paid.toLocaleString("ar-MA")} د.م</strong>
              </div>
              <div>
                <p>{t.remaining}</p>
                <strong className="is-warning">{totals.rem.toLocaleString("ar-MA")} د.م</strong>
              </div>
              <div>
                <p>{t.discount}</p>
                <strong className="is-danger">{totals.disc.toLocaleString("ar-MA")} د.م</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClearRow({ client, index, gridTemplate, onPrintInvoice, invoiceLabel }) {
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
          {client.salePrice.toLocaleString("ar-MA")} د.م
        </span>
        <span style={{ ...TEXT_CLAMP_STYLE, fontSize:12, fontWeight:700, color:theme.colors.greenLight }}>
          {client.paid.toLocaleString("ar-MA")} د.م
        </span>
        <span style={{ ...TEXT_CLAMP_STYLE, fontSize:12, fontWeight:700,
          color:client.remaining>0?theme.colors.warning:theme.colors.greenLight }}>
          {client.remaining.toLocaleString("ar-MA")} د.م
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

function ClearCard({ client, index, invoiceLabel, onPrintInvoice, t, lang }) {
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
        <ClearCardField label={t.paid} value={`${client.paid.toLocaleString("ar-MA")} د.م`} highlight="success" />
        <ClearCardField label={t.remaining} value={`${client.remaining.toLocaleString("ar-MA")} د.م`} highlight={remainingColor} />
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
          <strong>{client.salePrice.toLocaleString("ar-MA")} د.م</strong>
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
