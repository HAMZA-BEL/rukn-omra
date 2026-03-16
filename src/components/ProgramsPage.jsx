import React from "react";
import { createPortal } from "react-dom";
import { Button, GlassCard, Modal, Input, Select, EmptyState, SearchBar, StatusBadge } from "./UI";
import ClientDetail from "./ClientDetail";
import ClientForm from "./ClientForm";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { formatCurrency } from "../utils/currency";
import { downloadAmadeusExcel } from "../utils/amadeus";
import { printProgramPDF } from "../utils/exportPdf";
import { useDropdownPosition } from "../hooks/useDropdownPosition";

const tc = theme.colors;
const MENU_OFFSET_PX = 6;

// ═══════════════════════════════════════
// PROGRAMS LIST PAGE
// ═══════════════════════════════════════
export default function ProgramsPage({ store, onToast }) {
  const { programs, clients, addProgram, updateProgram, deleteProgram,
          getClientTotalPaid, getClientStatus } = store;
  const { t, tr, lang } = useLang();
  const formatCurrencyForLang = React.useCallback(
    (value) => formatCurrency(value, lang),
    [lang]
  );

  const [showForm,      setShowForm]      = React.useState(false);
  const [editing,       setEditing]       = React.useState(null);
  const [activeProgram, setActiveProgram] = React.useState(null);

  if (activeProgram) {
    const prog = programs.find(p => p.id === activeProgram);
    if (!prog) { setActiveProgram(null); return null; }
    return (
      <ProgramInner
        program={prog} store={store} onToast={onToast}
        onBack={() => setActiveProgram(null)}
      />
    );
  }

  return (
    <div className="page-body programs-page" style={{ padding:"28px 32px" }}>
      <div className="page-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:tc.white }}>{t.availablePrograms}</h1>
          <p style={{ fontSize:13, color:tc.grey, marginTop:4 }}>
            {tr("programsSubtitle", { count: programs.length })}
          </p>
        </div>
        <Button variant="primary" icon="➕" onClick={() => setShowForm(true)}>{t.addProgram}</Button>
      </div>

      {programs.length === 0 ? (
        <EmptyState icon="📋" title={t.noProgramsTitle} sub={t.noProgramsSub} />
      ) : (
        <div className="cards-grid program-card-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:20 }}>
          {programs.map((p, i) => {
            const pc  = clients.filter(c => c.programId === p.id);
            const reg = pc.length;
            const pct = Math.min((reg / p.seats) * 100, 100);
            const rev = pc.reduce((s,c) => s + (c.salePrice || c.price || 0), 0);
            const paid= pc.reduce((s,c) => s + getClientTotalPaid(c.id), 0);
            const cl  = pc.filter(c => getClientStatus(c) === "cleared").length;
            const un  = pc.filter(c => getClientStatus(c) === "unpaid").length;
            return (
              <ProgramCard key={p.id} program={p}
                registered={reg} pct={pct}
                totalPaid={paid} totalRemaining={rev-paid}
                cleared={cl} unpaid={un} delay={i*.06}
                onClick={() => setActiveProgram(p.id)}
                onEdit={e => { e.stopPropagation(); setEditing(p); }}
                onDelete={e => {
                  e.stopPropagation();
                  if (window.confirm(tr("confirmDeleteProgram", { name: p.name }))) {
                    deleteProgram(p.id); onToast(t.deleteSuccess, "info");
                  }
                }}
                lang={lang}
                formatCurrencyForLang={formatCurrencyForLang}
              />
            );
          })}
        </div>
      )}

      <Modal open={showForm||!!editing} onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? t.editProgramTitle : t.addProgramTitle} width={620}>
        <ProgramForm program={editing} store={store}
          onSave={() => {
            setShowForm(false);
            setEditing(null);
            onToast(editing ? t.updateSuccess : t.addSuccess, "success");
          }}
          onCancel={() => { setShowForm(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════
// PROGRAM CARD
// ═══════════════════════════════════════
function ProgramCard({ program, registered, pct, totalPaid, totalRemaining,
  cleared, unpaid, delay, onClick, onEdit, onDelete, lang, formatCurrencyForLang }) {
  const [hov, setHov] = React.useState(false);
  const { t } = useLang();
  const startingPrice = formatCurrencyForLang(
    program.priceTable?.[program.priceTable.length-1]?.prices?.quint
    || program.priceTable?.[0]?.prices?.double
    || program.price
    || 0
  );
  const remainingLabel = formatCurrencyForLang(totalRemaining);
  const infoRows = [
    ["🕌", t.hotelMecca, program.hotelMecca],
    ["🕍", t.hotelMadina, program.hotelMadina],
    ["✈️", t.departure, program.departure],
    ["🛬", t.returnDate, program.returnDate],
  ];
  const miniStats = [
    { label: t.registered, value: registered, color: tc.gold },
    { label: t.cleared, value: cleared, color: tc.greenLight },
    { label: t.unpaid, value: unpaid, color: tc.danger },
  ];

  return (
    <div className="animate-fadeInUp" style={{ animationDelay:`${delay}s`, cursor:"pointer" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onClick}>
      <GlassCard gold style={{
        padding:22,
        transform: hov ? "translateY(-5px)" : "none",
        transition:"all .3s ease",
        boxShadow: hov ? "0 24px 56px rgba(0,0,0,.5),0 0 40px rgba(212,175,55,.12)" : "0 4px 24px rgba(0,0,0,.3)",
        border:`1px solid ${hov?"rgba(212,175,55,.45)":"rgba(212,175,55,.2)"}`,
      }}>
        {/* header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:16, fontWeight:800, color:"#f8fafc", marginBottom:6, lineHeight:1.3 }}>{program.name}</p>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, color:tc.gold, background:"rgba(212,175,55,.12)", padding:"2px 10px", borderRadius:20 }}>{program.type}</span>
              <span style={{ fontSize:11, color:tc.grey, background:"rgba(148,163,184,.1)", padding:"2px 10px", borderRadius:20 }}>{program.duration}</span>
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }} onClick={e=>e.stopPropagation()}>
            <SmallBtn icon="✏️" onClick={onEdit}   color={tc.gold} />
            <SmallBtn icon="🗑️" onClick={onDelete} color={tc.danger} />
          </div>
        </div>

        {/* hotel + dates */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
          {infoRows.map(([ic,lb,vl])=>(
            <div key={lb}>
              <p style={{ fontSize:10, color:tc.grey }}>{ic} {lb}</p>
              <p style={{ fontSize:12, fontWeight:600, color:"#f8fafc" }}>{vl||"—"}</p>
            </div>
          ))}
        </div>

        {/* mini stats */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:14,
          background:"rgba(0,0,0,.2)", borderRadius:10, padding:"10px" }}>
          {miniStats.map(({ label, value, color })=>(
            <div key={label} style={{ textAlign:"center" }}>
              <p style={{ fontSize:16, fontWeight:800, color, fontFamily:"'Amiri',serif" }}>{value}</p>
              <p style={{ fontSize:10, color:tc.grey }}>{label}</p>
            </div>
          ))}
        </div>

        {/* seats progress */}
        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:12 }}>
            <span style={{ color:tc.grey }}>{t.seatFill}</span>
            <span style={{ color:pct>80?tc.danger:tc.gold, fontWeight:700 }}>{registered}/{program.seats}</span>
          </div>
          <div style={{ height:5, background:"rgba(255,255,255,.06)", borderRadius:3, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${pct}%`, borderRadius:3, transition:"width 1.2s",
              background:pct>=100?"linear-gradient(90deg,#ef4444,#dc2626)":pct>70?"linear-gradient(90deg,#f59e0b,#d97706)":"linear-gradient(90deg,#22c55e,#d4af37)" }} />
          </div>
        </div>

        {/* footer */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          paddingTop:12, borderTop:"1px solid rgba(212,175,55,.12)" }}>
          <div>
            <p style={{ fontSize:11, color:tc.grey, marginBottom:2 }}>{t.priceFrom}</p>
            <p style={{ fontSize:18, fontWeight:900, color:tc.gold, fontFamily:"'Amiri',serif" }}>
              {startingPrice}
            </p>
          </div>
          <div style={{ textAlign:"center" }}>
            <p style={{ fontSize:11, color:tc.grey, marginBottom:2 }}>{t.remainingToCollect}</p>
            <p style={{ fontSize:14, fontWeight:700, color:totalRemaining>0?tc.warning:tc.greenLight }}>
              {remainingLabel}
            </p>
          </div>
          <div style={{ background:"rgba(212,175,55,.1)", border:"1px solid rgba(212,175,55,.25)",
            borderRadius:8, padding:"7px 14px", fontSize:12, color:tc.gold, fontWeight:700 }}>
            {t.viewList}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

// ═══════════════════════════════════════
// PROGRAM INNER — full client list
// ═══════════════════════════════════════
function ProgramInner({ program, store, onToast, onBack }) {
  const { clients, getClientTotalPaid, getClientStatus, agency } = store;
  const { t, tr, lang, dir } = useLang();
  const formatCurrencyForLang = React.useCallback((value) => formatCurrency(value, lang), [lang]);

  const [filter,         setFilter]         = React.useState("all");
  const [search,         setSearch]         = React.useState("");
  const [selectedClient, setSelectedClient] = React.useState(null);
  const [showAddClient,  setShowAddClient]  = React.useState(false);
  const [editingClient,  setEditingClient]  = React.useState(null);

  const progClients = React.useMemo(() =>
    clients.filter(c => c.programId === program.id), [clients, program.id]);

  const filtered = React.useMemo(() => progClients.filter(c => {
    const status = getClientStatus(c);
    const matchesFilter = filter === "all" || status === filter;
    const q   = search.toLowerCase();
    const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.id.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  }), [progClients, filter, search, getClientStatus]);

  const totals = React.useMemo(() => ({
    revenue: progClients.reduce((s,c)=>s+(c.salePrice||c.price||0),0),
    paid:    progClients.reduce((s,c)=>s+getClientTotalPaid(c.id),0),
  }), [progClients, getClientTotalPaid]);
  const totalRem  = Math.max(0, totals.revenue - totals.paid);
  const statusCounts = React.useMemo(() => ({
    cleared: progClients.filter(c=>getClientStatus(c)==="cleared").length,
    partial: progClients.filter(c=>getClientStatus(c)==="partial").length,
    unpaid:  progClients.filter(c=>getClientStatus(c)==="unpaid").length,
  }), [progClients, getClientStatus]);
  const pct       = progClients.length > 0 ? Math.round((statusCounts.cleared/progClients.length)*100) : 0;
  const backArrow = dir === "rtl" ? "→" : "←";

  const filters = [
    { key:"all",     label:t.all,          count:progClients.length },
    { key:"cleared", label:t.clearedFilter, count:statusCounts.cleared },
    { key:"partial", label:t.partialFilter, count:statusCounts.partial },
    { key:"unpaid",  label:t.unpaidFilter,  count:statusCounts.unpaid },
  ];

  return (
    <div style={{ padding:"28px 32px" }}>

      {/* back + title */}
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:24, flexWrap:"wrap" }}>
        <button onClick={onBack} style={{
          background:"rgba(212,175,55,.1)", border:"1px solid rgba(212,175,55,.25)",
          borderRadius:10, padding:"8px 16px", color:tc.gold,
          fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Cairo',sans-serif",
          display:"inline-flex", alignItems:"center", gap:8,
        }}>
          {dir === "rtl" ? <>{t.backToPrograms} {backArrow}</> : <>{backArrow} {t.backToPrograms}</>}
        </button>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:20, fontWeight:800, color:"#f8fafc" }}>{program.name}</h1>
          <p style={{ fontSize:12, color:tc.grey, marginTop:3 }}>
            ✈️ {t.departure}: {program.departure || "—"} &nbsp;•&nbsp;
            🛬 {t.returnDate}: {program.returnDate || "—"} &nbsp;•&nbsp;
            🕌 {t.hotelMecca}: {program.hotelMecca || "—"} &nbsp;•&nbsp;
            🕍 {t.hotelMadina}: {program.hotelMadina || "—"}
          </p>
        </div>
        <Button variant="ghost" icon="🖨️" onClick={() => {
          if (progClients.length === 0) { onToast("لا يوجد معتمرون في هذا البرنامج","info"); return; }
          printProgramPDF({
            program,
            clients: progClients,
            getClientStatus,
            getClientTotalPaid,
            lang,
            t,
            agency,
          });
        }}>
          {lang === "fr" ? "Exporter PDF" : lang === "en" ? "Export PDF" : "تصدير PDF"}
        </Button>
        <Button variant="secondary" icon="📊" onClick={() => {
          if (progClients.length === 0) { onToast("لا يوجد معتمرون في هذا البرنامج","info"); return; }
          const missing = progClients.filter(c => !c.passport?.number);
          if (missing.length > 0) {
            onToast(`⚠️ ${missing.length} معتمر بدون رقم جواز — سيُصدَّر الملف مع بيانات ناقصة`, "info");
          }
          downloadAmadeusExcel(progClients, program);
          onToast(`✅ تم تصدير ملف Amadeus — ${progClients.length} معتمر`, "success");
        }}>
          Amadeus Excel
        </Button>
        <Button variant="primary" icon="➕" onClick={() => setShowAddClient(true)}>
          {t.addClient}
        </Button>
      </div>

      {/* KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(145px,1fr))", gap:12, marginBottom:24 }}>
        {[
          ["👥", t.registered, progClients.length,          tc.gold],
          ["✅", t.cleared,    statusCounts.cleared,        tc.greenLight],
          ["🟠", t.partial,    statusCounts.partial,        tc.warning],
          ["🔴", t.unpaid,     statusCounts.unpaid,         tc.danger],
          ["💰", t.collected,  formatCurrencyForLang(totals.paid), tc.gold],
          ["⏳", t.remaining,  formatCurrencyForLang(totalRem),    tc.warning],
        ].map(([ic,lb,vl,cl],i)=>(
          <div key={lb} className="animate-fadeInUp" style={{ animationDelay:`${i*.04}s` }}>
            <GlassCard gold style={{ padding:"14px 16px", textAlign:"center" }}>
              <p style={{ fontSize:20, marginBottom:5 }}>{ic}</p>
              <p style={{ fontSize:15, fontWeight:800, color:cl, fontFamily:"'Amiri',serif", lineHeight:1 }}>{vl}</p>
              <p style={{ fontSize:11, color:tc.grey, marginTop:5 }}>{lb}</p>
            </GlassCard>
          </div>
        ))}
      </div>

      {/* clearance progress */}
      <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(212,175,55,.15)",
        borderRadius:12, padding:"14px 20px", marginBottom:22 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13 }}>
          <span style={{ color:tc.grey }}>{t.programClearanceRate}</span>
          <span style={{ color:tc.gold, fontWeight:700 }}>{pct}% {t.cleared}</span>
        </div>
        <div style={{ height:8, background:"rgba(255,255,255,.06)", borderRadius:4, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`,
            background:"linear-gradient(90deg,#22c55e,#d4af37)", borderRadius:4,
            transition:"width 1.2s ease", boxShadow:"0 0 12px rgba(34,197,94,.4)" }} />
        </div>
      </div>

      {/* filters + search */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:14 }}>
        {filters.map(f=>(
          <button key={f.key} onClick={()=>setFilter(f.key)} style={{
            display:"inline-flex", alignItems:"center", gap:6,
            padding:"6px 14px", borderRadius:20,
            background:filter===f.key?"rgba(212,175,55,.15)":"rgba(255,255,255,.04)",
            border:`1px solid ${filter===f.key?tc.gold:"rgba(255,255,255,.08)"}`,
            color:filter===f.key?tc.gold:tc.grey,
            fontSize:13, fontWeight:filter===f.key?700:400,
            cursor:"pointer", fontFamily:"'Cairo',sans-serif",
          }}>
            {f.label}
            <span style={{ background:filter===f.key?"rgba(212,175,55,.2)":"rgba(255,255,255,.06)",
              borderRadius:20, padding:"0 7px", fontSize:11 }}>{f.count}</span>
          </button>
        ))}
        <SearchBar value={search} onChange={e=>setSearch(e.target.value)}
          placeholder={t.searchPrograms} style={{ flex:1, maxWidth:280 }} />
      </div>

      {/* table header */}
      <div style={{ display:"grid",
        gridTemplateColumns:"40px 1fr 110px 110px 105px 105px 50px",
        gap:8, padding:"8px 16px",
        background:"rgba(212,175,55,.06)", borderRadius:8, marginBottom:6,
        fontSize:11, fontWeight:700, color:tc.grey }}>
        {["#", t.name, t.roomType, t.ticketNo, t.paid, t.remaining, ""].map(h=>(
          <span key={h}>{h}</span>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="👥" title={t.programNoPilgrimsTitle}
          sub={filter!=="all"?t.programNoPilgrimsFiltered:t.programNoPilgrimsSub} />
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          {filtered.map((c,i)=>{
            const paid = getClientTotalPaid(c.id);
            const rem  = Math.max(0, (c.salePrice||c.price||0) - paid);
            const stat = getClientStatus(c);
            return (
              <InnerClientRow key={c.id} client={c} index={i}
                paid={paid} remaining={rem} status={stat}
                onClick={()=>setSelectedClient(c)}
                onEdit={()=>setEditingClient(c)}
                onDelete={()=>{
                  if(window.confirm(`حذف "${c.name}"؟`)){
                    store.deleteClient(c.id);
                    onToast("تم الحذف","info");
                  }
                }} />
            );
          })}
        </div>
      )}

      {/* totals row */}
      {filtered.length > 0 && (
        <div style={{ display:"grid",
          gridTemplateColumns:"40px 1fr 110px 110px 105px 105px 50px",
          gap:8, padding:"12px 16px", marginTop:8,
          background:"rgba(212,175,55,.08)", border:"1px solid rgba(212,175,55,.2)",
          borderRadius:10, fontSize:12, fontWeight:700 }}>
          <span />
          <span style={{ color:tc.gold }}>{tr("programTotalsLabel", { count: filtered.length })}</span>
          <span /><span />
          <span style={{ color:tc.greenLight }}>
            {formatCurrencyForLang(filtered.reduce((s,c)=>s+getClientTotalPaid(c.id),0))}
          </span>
          <span style={{ color:tc.warning }}>
            {formatCurrencyForLang(filtered.reduce((s,c)=>s+Math.max(0,(c.salePrice||c.price||0)-getClientTotalPaid(c.id)),0))}
          </span>
          <span />
        </div>
      )}

      {/* modals */}
      <Modal open={!!selectedClient} onClose={()=>setSelectedClient(null)} title={t.clientFile} width={640}>
        {selectedClient && (
          <ClientDetail client={selectedClient} store={store}
            onClose={()=>setSelectedClient(null)}
            onEdit={c=>{setSelectedClient(null);setEditingClient(c);}}
            onToast={onToast} />
        )}
      </Modal>
      <Modal open={showAddClient} onClose={()=>setShowAddClient(false)} title={t.addClient} width={600}>
        <ClientForm store={store} defaultProgramId={program.id}
          onSave={()=>{setShowAddClient(false);onToast(t.addSuccess,"success");}}
          onCancel={()=>setShowAddClient(false)} />
      </Modal>
      <Modal open={!!editingClient} onClose={()=>setEditingClient(null)} title={`${t.edit} — ${t.clientFile}`} width={600}>
        {editingClient && (
          <ClientForm client={editingClient} store={store}
            onSave={()=>{setEditingClient(null);onToast(t.updateSuccess,"success");}}
            onCancel={()=>setEditingClient(null)} />
        )}
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════
// INNER CLIENT ROW
// ═══════════════════════════════════════
function InnerClientRow({ client, index, paid, remaining, status, onClick, onEdit, onDelete }) {
  const [hov,      setHov]      = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { lang, dir, t } = useLang();
  const isRTL = dir === "rtl";
  const paidLabel      = formatCurrency(paid, lang);
  const remainingLabel = formatCurrency(remaining, lang);
  const btnRef  = React.useRef();
  const menuRef = React.useRef();
  const menuPos = useDropdownPosition({
    anchorRef: btnRef,
    menuRef,
    open: menuOpen,
    rtl: isRTL,
    offset: MENU_OFFSET_PX,
  });

  React.useEffect(() => {
    if (!menuOpen) return;
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          btnRef.current  && !btnRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  return (
    <div className="animate-fadeInUp" style={{ animationDelay:`${index*.025}s` }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <div style={{
        display:"flex", alignItems:"center", gap:8, padding:"11px 16px",
        background:hov?"rgba(212,175,55,.05)":"rgba(255,255,255,.02)",
        border:`1px solid ${hov?"rgba(212,175,55,.2)":"rgba(255,255,255,.05)"}`,
        borderRadius:10, transition:"all .15s", position:"relative",
      }}>
        {/* Clickable info area */}
        <div onClick={onClick} style={{
          display:"grid", gridTemplateColumns:"36px 1fr 110px 110px 100px 100px 110px",
          gap:8, flex:1, cursor:"pointer", alignItems:"center",
        }}>
          <span style={{ fontSize:12, color:tc.grey, fontWeight:600 }}>{index+1}</span>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:9, flexShrink:0,
              background:"linear-gradient(135deg,rgba(212,175,55,.25),rgba(212,175,55,.08))",
              border:"1px solid rgba(212,175,55,.2)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:14, fontWeight:700, color:tc.gold }}>
              {client.name[0]}
            </div>
            <div>
              <p style={{ fontWeight:700, fontSize:13, color:"#f8fafc" }}>{client.name}</p>
              <p style={{ fontSize:11, color:tc.grey }}>📞 {client.phone} • {client.city}</p>
            </div>
          </div>
          <span style={{ fontSize:12, color:tc.grey }}>{client.roomType}</span>
          <span style={{ fontSize:12, color:tc.gold, fontWeight:600 }}>{client.ticketNo||"—"}</span>
          <span style={{ fontSize:13, fontWeight:700, color:tc.greenLight }}>{paidLabel}</span>
          <span style={{ fontSize:13, fontWeight:700, color:remaining>0?tc.warning:tc.greenLight }}>{remainingLabel}</span>
          <StatusBadge status={status} />
        </div>

        {/* ··· Menu */}
        <div style={{ position:"relative", flexShrink:0 }}>
          <button
            ref={btnRef}
            onClick={e => { e.stopPropagation(); setMenuOpen(o=>!o); }}
            style={{
              width:32, height:32, borderRadius:8,
              background:menuOpen?"rgba(212,175,55,.18)":"rgba(255,255,255,.06)",
              border:`1px solid ${menuOpen?"rgba(212,175,55,.4)":"rgba(255,255,255,.12)"}`,
              color:menuOpen?tc.gold:tc.grey,
              cursor:"pointer", fontSize:17, fontWeight:900, letterSpacing:1,
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:"all .15s",
            }}>···</button>
          {menuOpen && createPortal(
            <div ref={menuRef} style={{
              position:"fixed",
              top: menuPos.top,
              left: menuPos.left,
              visibility: menuPos.visibility,
              zIndex:9999,
              background:"rgba(20,30,50,0.96)",
              border:"1px solid rgba(212,175,55,.3)",
              borderRadius:12, boxShadow:"0 10px 25px rgba(0,0,0,0.35)",
              minWidth:130, overflow:"hidden",
            }}>
              <InnerMenuBtn icon="✏️" label={t.editLabel||"تعديل"}
                onClick={e=>{e.stopPropagation();setMenuOpen(false);onEdit();}}
                color="#f8fafc" hoverBg="rgba(212,175,55,.1)" isRTL={isRTL} border />
              <InnerMenuBtn icon="🗑️" label={t.deleteLabel||"حذف"}
                onClick={e=>{e.stopPropagation();setMenuOpen(false);onDelete();}}
                color={tc.danger} hoverBg="rgba(239,68,68,.12)" isRTL={isRTL} />
            </div>,
            document.body
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// SMALL HELPERS
// ═══════════════════════════════════════
function InnerMenuBtn({ icon, label, onClick, color, hoverBg, isRTL, border }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display:"flex", alignItems:"center", gap:10,
        flexDirection: isRTL ? "row" : "row-reverse",
        width:"100%", padding:"11px 16px",
        background: hov ? hoverBg : "transparent",
        border:"none",
        borderBottom: border ? "1px solid rgba(255,255,255,.06)" : "none",
        color, fontSize:13, fontWeight:600,
        cursor:"pointer", fontFamily:"'Cairo',sans-serif",
        textAlign: isRTL ? "right" : "left",
        transition:"background .15s",
      }}>
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function SmallBtn({ icon, onClick, color }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={e=>{e.stopPropagation();onClick(e);}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ width:30, height:30, background:hov?`${color}22`:"rgba(255,255,255,.05)",
        border:`1px solid ${hov?color:"rgba(255,255,255,.08)"}`,
        borderRadius:8, cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:13, transition:"all .2s" }}>
      {icon}
    </button>
  );
}

// ═══════════════════════════════════════
// PROGRAM FORM
// ═══════════════════════════════════════
function ProgramForm({ program, store, onSave, onCancel }) {
  const { addProgram, updateProgram } = store;
  const { t } = useLang();
  const isEdit = !!program;
  const [form, setForm] = React.useState({
    name:      program?.name      || "",
    type:      program?.type      || "عمرة مفردة",
    duration:  program?.duration  || "",
    departure: program?.departure || "",
    returnDate:program?.returnDate|| "",
    hotelMecca:program?.hotelMecca|| "",
    hotelMadina:program?.hotelMadina||"",
    price:     program?.price     || "",
    seats:     program?.seats     || "",
    transport: program?.transport || "",
    mealPlan:  program?.mealPlan  || "",
  });
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const programTypeOptions = React.useMemo(() => {
    const base = [
      { value:"عمرة رمضان",     label:t.programTypeRamadan },
      { value:"عمرة شعبان",     label:t.programTypeShaban },
      { value:"عمرة شوال",      label:t.programTypeShawwal },
      { value:"برنامج مميز",     label:t.programTypePremium },
      { value:"عمرة رجب",       label:t.programTypeRajab },
      { value:"عمرة ذي الحجة",  label:t.programTypeDhuAlHijjah },
      { value:"عمرة ذي القعدة VIP", label:t.programTypeDhuAlQadah },
    ];
    const exists = base.some(opt => opt.value === form.type);
    return exists ? base : [...base, { value: form.type, label: form.type }];
  }, [t, form.type]);

  const handleSave = () => {
    if (!form.name||!form.price||!form.seats) {
      alert(t.programFormValidation); return;
    }
    const data = {...form, price:Number(form.price), seats:Number(form.seats)};
    isEdit ? updateProgram(program.id,data) : addProgram(data);
    onSave();
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
      <Input label={t.program} value={form.name} onChange={set("name")} required style={{gridColumn:"1/-1"}}/>
      <Select label={t.programType} value={form.type} onChange={set("type")}
        options={programTypeOptions}/>
      <Input label={t.duration} value={form.duration} onChange={set("duration")} placeholder={t.durationPlaceholder}/>
      <Input label={t.departure} value={form.departure} onChange={set("departure")} type="date"/>
      <Input label={t.returnDate} value={form.returnDate} onChange={set("returnDate")} type="date"/>
      <Input label={t.hotelMecca} value={form.hotelMecca} onChange={set("hotelMecca")} style={{gridColumn:"1/-1"}}/>
      <Input label={t.hotelMadina} value={form.hotelMadina} onChange={set("hotelMadina")} style={{gridColumn:"1/-1"}}/>
      <Input label={t.programPriceLabel} value={form.price} onChange={set("price")} type="number" required/>
      <Input label={t.seats} value={form.seats} onChange={set("seats")} type="number" required/>
      <Input label={t.transport} value={form.transport} onChange={set("transport")}/>
      <Input label={t.mealPlan} value={form.mealPlan} onChange={set("mealPlan")}/>
      <div style={{ gridColumn:"1/-1", display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
        <Button variant="ghost" onClick={onCancel}>{t.cancel}</Button>
        <Button variant="primary" icon={isEdit?"💾":"➕"} onClick={handleSave}>
          {isEdit?t.save:t.addProgram}
        </Button>
      </div>
    </div>
  );
}
