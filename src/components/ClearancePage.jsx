import React from "react";
import { StatusBadge, GlassCard, SearchBar, Button } from "./UI";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { printClearancePDF } from "../utils/exportPdf";

const tc = theme.colors;

export default function ClearancePage({ store }) {
  const { t, lang, dir } = useLang();
  const isRTL = dir === "rtl";
  const { clients, programs, getClientStatus, getClientTotalPaid, getClientLastPayment, agency } = store;
  const [filter, setFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");

  const data = React.useMemo(() => clients.map(c => {
    const prog      = programs.find(p => p.id === c.programId);
    const paid      = getClientTotalPaid(c.id);
    const salePrice = c.salePrice || c.price || 0;
    const officialPrice = c.officialPrice || salePrice;
    const remaining = Math.max(0, salePrice - paid);
    const discount  = Math.max(0, officialPrice - salePrice);
    const status    = getClientStatus(c);
    const lastPmt   = getClientLastPayment(c.id);
    return { ...c, prog, paid, salePrice, officialPrice, remaining, discount, status, lastPmt };
  }).filter(c => {
    const ok1 = filter === "all" || c.status === filter;
    const q   = search.toLowerCase();
    const ok2 = !q || c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
    return ok1 && ok2;
  }), [clients, programs, filter, search, getClientStatus, getClientTotalPaid, getClientLastPayment]);

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

  return (
    <div className="page-body clearance-page" style={{ padding:"24px 32px" }}>
      <div className="page-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:21, fontWeight:800, color:"#f8fafc" }}>{t.clearanceReport}</h1>
          <p style={{ fontSize:12, color:tc.grey, marginTop:3 }}>{t.clearanceDesc}</p>
        </div>
        <Button variant="ghost" icon="🖨️" onClick={() => {
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
          ["👥", t.clients, clients.length, t.gold],
          ["✅", t.clearedFilter, clients.filter(c => getClientStatus(c) === "cleared").length, t.greenLight],
          ["🟠", t.partialFilter, clients.filter(c => getClientStatus(c) === "partial").length, t.warning],
          ["🔴", t.unpaidFilter, clients.filter(c => getClientStatus(c) === "unpaid").length, t.danger],
          ["💰", t.collected, clients.reduce((s,c) => s + getClientTotalPaid(c.id), 0).toLocaleString("ar-MA") + " د.م", t.gold],
          ["⏳", t.remaining, clients.reduce((s,c) => s + Math.max(0, (c.salePrice||c.price||0) - getClientTotalPaid(c.id)), 0).toLocaleString("ar-MA") + " د.م", t.warning],
          ["🎁", t.discounts, clients.reduce((s,c) => s + Math.max(0, (c.officialPrice||0) - (c.salePrice||c.officialPrice||0)), 0).toLocaleString("ar-MA") + " د.م", t.danger],
        ].map(([ic,lb,vl,cl])=>(
          <GlassCard gold key={lb} style={{ padding:"13px 14px", textAlign:"center" }}>
            <p style={{ fontSize:18, marginBottom:5 }}>{ic}</p>
            <p style={{ fontSize:15, fontWeight:800, color:cl, fontFamily:"'Amiri',serif", lineHeight:1 }}>{vl}</p>
            <p style={{ fontSize:11, color:t.grey, marginTop:4 }}>{lb}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filters */}
      <div className="page-filters" style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:14 }}>
        {[
          { key:"all",     label:t.all },
          { key:"cleared", label:t.clearedFilter },
          { key:"partial", label:t.partialFilter },
          { key:"unpaid",  label:t.unpaidFilter },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding:"6px 14px", borderRadius:20,
            background:filter===f.key?"rgba(212,175,55,.15)":"rgba(255,255,255,.04)",
            border:`1px solid ${filter===f.key?t.gold:"rgba(255,255,255,.08)"}`,
            color:filter===f.key?t.gold:t.grey,
            fontSize:12, cursor:"pointer", fontFamily:"'Cairo',sans-serif",
            fontWeight:filter===f.key?700:400,
          }}>{f.label}</button>
        ))}
        <SearchBar value={search} onChange={e=>setSearch(e.target.value)}
          placeholder={t.searchGeneral} style={{ flex:1, maxWidth:260 }} />
      </div>

      <div className="table-scroll">
        {/* Table header */}
        <div className="table-grid table-grid-head" style={{ display:"grid",
          gridTemplateColumns:"90px 1fr 130px 110px 110px 100px 105px 120px",
          gap:6, padding:"8px 14px",
          background:"rgba(212,175,55,.07)", borderRadius:8, marginBottom:6,
          fontSize:11, fontWeight:700, color:t.grey }}>
          {[t.fileId, t.name, t.program, t.salePrice, t.paid, t.remaining, t.status, t.lastReceipt].map(h => (
            <span key={h}>{h}</span>
          ))}
        </div>

        <div className="table-grid-body" style={{ display:"flex", flexDirection:"column", gap:3 }}>
          {data.map((c,i) => (
            <ClearRow key={c.id} client={c} index={i} />
          ))}
        </div>

        {/* Totals */}
        {data.length > 0 && (
          <div className="table-grid table-grid-foot" style={{ display:"grid",
            gridTemplateColumns:"90px 1fr 130px 110px 110px 100px 105px 120px",
            gap:6, padding:"10px 14px", marginTop:8,
            background:"rgba(212,175,55,.08)", border:"1px solid rgba(212,175,55,.2)",
            borderRadius:10, fontSize:12, fontWeight:700 }}>
            <span style={{ color:t.gold }}>{t.totalLabel}</span>
            <span style={{ color:t.grey }}>{data.length} {t.clients}</span>
            <span />
            <span style={{ color:t.gold }}>{totals.rev.toLocaleString("ar-MA")} د.م</span>
            <span style={{ color:t.greenLight }}>{totals.paid.toLocaleString("ar-MA")} د.م</span>
            <span style={{ color:t.warning }}>{totals.rem.toLocaleString("ar-MA")} د.م</span>
            <span />
            <span style={{ color:t.danger }}>{t.discount}: {totals.disc.toLocaleString("ar-MA")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ClearRow({ client, index }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div className="animate-fadeInUp" style={{ animationDelay:`${index*.018}s` }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <div className="table-grid-row" style={{
        display:"grid",
        gridTemplateColumns:"90px 1fr 130px 110px 110px 100px 105px 120px",
        gap:6, padding:"10px 14px",
        background:hov?"rgba(212,175,55,.04)":"rgba(255,255,255,.02)",
        border:`1px solid ${hov?"rgba(212,175,55,.18)":"rgba(255,255,255,.04)"}`,
        borderRadius:10, transition:"all .15s", alignItems:"center",
      }}>
        <span style={{ fontSize:12, fontWeight:700, color:theme.colors.gold }}>{client.id}</span>
        <div>
          <p style={{ fontSize:13, fontWeight:700, color:"#f8fafc" }}>{client.name}</p>
          <p style={{ fontSize:11, color:theme.colors.grey }}>📞 {client.phone}</p>
        </div>
        <span style={{ fontSize:11, color:theme.colors.grey }}>{client.prog?.name||"—"}</span>
        <span style={{ fontSize:12, fontWeight:700, color:theme.colors.gold }}>
          {client.salePrice.toLocaleString("ar-MA")} د.م
        </span>
        <span style={{ fontSize:12, fontWeight:700, color:theme.colors.greenLight }}>
          {client.paid.toLocaleString("ar-MA")} د.م
        </span>
        <span style={{ fontSize:12, fontWeight:700,
          color:client.remaining>0?theme.colors.warning:theme.colors.greenLight }}>
          {client.remaining.toLocaleString("ar-MA")} د.م
        </span>
        <StatusBadge status={client.status} />
        <span style={{ fontSize:11, color:theme.colors.grey }}>
          {client.lastPmt?.receiptNo||"—"}
        </span>
      </div>
    </div>
  );
}
