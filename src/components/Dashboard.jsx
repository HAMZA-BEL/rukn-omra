import React from "react";
import { GlassCard, SearchBar, StatusBadge } from "./UI";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { formatCurrency } from "../utils/currency";

const tc = theme.colors;

export default function Dashboard({ store, onNavigate, onSelectClient }) {
  const { t, tr, dir, lang } = useLang();
  const isRTL = dir === "rtl";
  const { stats, clients, programs, activityLog,
          getClientStatus, getClientTotalPaid, getProgramClients, getProgramById,
          getAlerts, getArchiveSuggestions, archiveProgram } = store;
  const [search, setSearch] = React.useState("");

  const alerts = getAlerts();
  const archiveSuggestions = getArchiveSuggestions();
  const formatCurrencyForLang = React.useCallback(
    (value) => formatCurrency(value, lang),
    [lang]
  );

  const results = React.useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    const byClient = clients.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q) ||
      c.id.toLowerCase().includes(q) || (c.ticketNo||"").toLowerCase().includes(q) ||
      (c.nameLatin||"").toLowerCase().includes(q) || (c.passport?.number||"").toLowerCase().includes(q)
    );
    const progMatch = programs.find(p => p.name.toLowerCase().includes(q));
    const byProg = progMatch ? clients.filter(c => c.programId === progMatch.id) : [];
    return [...new Map([...byClient, ...byProg].map(c => [c.id, c])).values()];
  }, [search, clients, programs]);

  return (
    <div className="page-shell" style={{ paddingBottom:40 }}>
      {/* Hero */}
      <div className="page-hero" style={{ position:"relative", overflow:"hidden",
        background:"linear-gradient(135deg,rgba(26,107,58,.35),rgba(6,13,26,.9))",
        borderBottom:"1px solid rgba(212,175,55,.15)", padding:"32px 32px 26px" }}>
        {[100,180,280].map((s,i)=>(
          <div key={i} style={{ position:"absolute", top:-s/2, left:-s/3,
            width:s, height:s, borderRadius:"50%",
            border:"1px solid rgba(212,175,55,.06)", pointerEvents:"none" }} />
        ))}
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:6 }}>
            <span style={{ fontSize:36, animation:"float 4s ease-in-out infinite" }}>🕋</span>
            <div>
              <h1 style={{ fontSize:24, fontWeight:900, fontFamily:"'Amiri',serif",
                background:"linear-gradient(135deg,#f0d060,#d4af37)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", lineHeight:1.2 }}>
                {t.appName}
              </h1>
              <p style={{ fontSize:12, color:tc.grey }}>
                {t.agencyName}{t.agencyNameAr ? ` | ${t.agencyNameAr}` : ""}
              </p>
            </div>
          </div>
          <SearchBar value={search} onChange={e=>setSearch(e.target.value)}
            placeholder={`🔍  ${t.search}`}
            style={{ maxWidth:560, marginTop:16 }} />
        </div>
      </div>

      <div className="page-body" style={{ padding:"24px 32px 0" }}>

        {/* Alerts */}
        {!search.trim() && alerts.length > 0 && (
          <div style={{ marginBottom:20 }}>
            {alerts.map((a,i) => (
              <div key={i} style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"10px 14px", borderRadius:10, marginBottom:6,
                background: a.type==="danger"?"rgba(239,68,68,.1)":"rgba(245,158,11,.1)",
                border:`1px solid ${a.type==="danger"?"rgba(239,68,68,.3)":"rgba(245,158,11,.3)"}`,
              }}>
                <span style={{ fontSize:18 }}>{a.icon}</span>
                <span style={{ fontSize:13, fontWeight:600,
                  color:a.type==="danger"?tc.danger:tc.warning }}>{a.msg}</span>
              </div>
            ))}
          </div>
        )}

        {/* Archive suggestions */}
        {!search.trim() && archiveSuggestions.length > 0 && (
          <div style={{ marginBottom:20 }}>
            {archiveSuggestions.map((s) => (
              <ArchiveSuggestionAlert key={s.program.id} suggestion={s}
                t={t} tr={tr} onArchive={() => archiveProgram(s.program.id)} />
            ))}
          </div>
        )}

        {/* Search results */}
        {search.trim() && (
          <div className="search-results animate-fadeInUp" style={{ marginBottom:28 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <span style={{ fontSize:13, color:tc.grey }}>
                {t.searchResults} «<strong style={{color:tc.gold}}>{search}</strong>»
              </span>
              <span style={{ background:tc.goldDim, color:tc.gold,
                padding:"2px 10px", borderRadius:20, fontSize:12, fontWeight:700 }}>
                {results.length}
              </span>
            </div>
            {results.length === 0 ? (
              <div style={{ padding:28, textAlign:"center", color:tc.grey,
                background:"rgba(255,255,255,.02)", borderRadius:12,
                border:"1px solid rgba(255,255,255,.05)" }}>
                {t.noResults}
              </div>
            ) : (
              <div className="list-stack" style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {results.map(c => {
                  const prog  = getProgramById(c.programId);
                  const paid  = getClientTotalPaid(c.id);
                  const price = c.salePrice||c.price||0;
                  return (
                    <ClientRow key={c.id} client={c} program={prog} t={t} lang={lang} isRTL={isRTL}
                      paid={paid} remaining={Math.max(0,price-paid)}
                      status={getClientStatus(c)} onClick={()=>onSelectClient(c)} />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!search.trim() && (
          <>
            {/* KPIs */}
            <div className="kpi-grid cards-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))", gap:12, marginBottom:26 }}>
              {[
                { label:t.totalClients,  val:stats.archivedCount > 0 ? `${stats.totalClients} ${tr("archivedCountLabel",{n:stats.archivedCount})}` : stats.totalClients,  icon:"👥", color:tc.gold,       delay:0    },
                { label:t.totalPrograms, val:stats.totalPrograms, icon:"📋", color:tc.gold,       delay:.04  },
                { label:t.cleared,       val:stats.cleared,       icon:"✅", color:tc.greenLight, delay:.08  },
                { label:t.partial,       val:stats.partial,       icon:"🟠", color:tc.warning,    delay:.12  },
                { label:t.unpaid,        val:stats.unpaid,        icon:"🔴", color:tc.danger,     delay:.16  },
                { label:t.collected,     val:formatCurrencyForLang(stats.totalCollected), icon:"💰", color:tc.gold, delay:.20 },
                { label:t.remaining,     val:formatCurrencyForLang(stats.totalRemaining), icon:"⏳", color:tc.warning, delay:.24 },
                { label:t.discounts,     val:formatCurrencyForLang(stats.totalDiscount),  icon:"🎁", color:tc.danger,  delay:.28 },
              ].map(({label,val,icon,color,delay})=>(
                <KPICard key={label} label={label} val={val} icon={icon} color={color} delay={delay} />
              ))}
            </div>

            {/* Programs */}
            <SectionHeader title={t.availablePrograms} onMore={()=>onNavigate("programs")} btnLabel={t.viewAll} />
            <div className="program-grid cards-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))", gap:12, marginBottom:26 }}>
              {programs.map((p,i)=>{
                const pc = getProgramClients(p.id);
                const pct= Math.min((pc.length/p.seats)*100,100);
                return <ProgramMini key={p.id} program={p} t={t}
                  registered={pc.length} pct={pct} remaining={p.seats-pc.length}
                  delay={i*.05} onClick={()=>onNavigate("programs")} />;
              })}
            </div>

            {/* Activity log */}
            <SectionHeader title={t.recentActivity} onMore={null} btnLabel={null} />
            <div className="list-stack" style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {activityLog.slice(0,8).map((a,i)=>(
                <ActivityRow key={a.id} activity={a} index={i} />
              ))}
              {activityLog.length === 0 && (
                <div style={{ padding:20, textAlign:"center", color:tc.grey, fontSize:13 }}>
                  {t.noActivities}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const KPICard = React.memo(function KPICard({ label, val, icon, color, delay }) {
  return (
    <div className="animate-fadeInUp" style={{ animationDelay:`${delay}s` }}>
      <GlassCard gold style={{ padding:"14px 16px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-20, right:-20, width:70, height:70,
          background:`radial-gradient(circle,${color}18,transparent 70%)`, pointerEvents:"none" }} />
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <p style={{ fontSize:11, color:theme.colors.grey, marginBottom:6 }}>{label}</p>
            <p style={{ fontSize:20, fontWeight:800, color, fontFamily:"'Amiri',serif", lineHeight:1 }}>{val}</p>
          </div>
          <div style={{ width:36, height:36, borderRadius:10,
            background:`${color}15`, border:`1px solid ${color}28`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>
            {icon}
          </div>
        </div>
      </GlassCard>
    </div>
  );
});

const ProgramMini = React.memo(function ProgramMini({ program, registered, pct, remaining, delay, onClick, t }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div className="animate-fadeInUp" style={{ animationDelay:`${delay}s`, cursor:"pointer" }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={onClick}>
      <GlassCard gold style={{ padding:14,
        transform:hov?"translateY(-3px)":"none", transition:"all .25s",
        border:`1px solid ${hov?"rgba(212,175,55,.4)":"rgba(212,175,55,.2)"}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
          <p style={{ fontWeight:700, fontSize:13, color:"#f8fafc", lineHeight:1.4, flex:1 }}>{program.name}</p>
          <span style={{ fontSize:10, color:theme.colors.gold, background:"rgba(212,175,55,.1)",
            padding:"2px 8px", borderRadius:20, whiteSpace:"nowrap", marginRight:6 }}>
            {program.duration}
          </span>
        </div>
        <p style={{ fontSize:11, color:theme.colors.grey, marginBottom:9 }}>✈️ {program.departure}</p>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:11 }}>
          <span style={{ color:theme.colors.grey }}>{t.registered}</span>
          <span style={{ color:theme.colors.gold, fontWeight:700 }}>{registered}/{program.seats}</span>
        </div>
        <div style={{ height:4, background:"rgba(255,255,255,.06)", borderRadius:2, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, borderRadius:2, transition:"width 1s",
            background:pct>80?"linear-gradient(90deg,#ef4444,#f97316)":"linear-gradient(90deg,#22c55e,#d4af37)" }} />
        </div>
        <p style={{ fontSize:11, color:remaining>0?theme.colors.greenLight:theme.colors.danger, marginTop:6, fontWeight:600 }}>
          {remaining>0?`${remaining} ${t.seatsLeft}`:`🔴 ${t.full}`}
        </p>
      </GlassCard>
    </div>
  );
});

const ActivityRow = React.memo(function ActivityRow({ activity, index }) {
  const icons = { client_add:"👤", client_edit:"✏️", client_del:"🗑️", payment_add:"💰", payment_del:"❌", program_add:"📋" };
  const colors= { client_add:theme.colors.greenLight, client_edit:theme.colors.gold,
    client_del:theme.colors.danger, payment_add:theme.colors.gold,
    payment_del:theme.colors.danger, program_add:theme.colors.gold };
  const time = new Date(activity.time);
  const timeStr = `${time.toLocaleDateString("ar-MA")} ${time.toLocaleTimeString("ar-MA",{hour:"2-digit",minute:"2-digit"})}`;
  return (
    <div className="animate-fadeInUp" style={{ animationDelay:`${index*.02}s` }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px",
        background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.05)",
        borderRadius:10 }}>
        <span style={{ fontSize:16 }}>{icons[activity.type]||"📌"}</span>
        <div style={{ flex:1 }}>
          <span style={{ fontSize:13, color:"#f8fafc", fontWeight:600 }}>{activity.description}</span>
          {activity.clientName && (
            <span style={{ fontSize:12, color:colors[activity.type]||theme.colors.gold,
              marginRight:6 }}> — {activity.clientName}</span>
          )}
        </div>
        <span style={{ fontSize:11, color:theme.colors.grey, whiteSpace:"nowrap" }}>{timeStr}</span>
      </div>
    </div>
  );
});

const ClientRow = React.memo(function ClientRow({ client, program, paid, remaining, status, onClick, t, lang, isRTL }) {
  const [hov, setHov] = React.useState(false);
  const paidLabel = formatCurrency(paid, lang);
  const remainingLabel = formatCurrency(remaining, lang);
  return (
    <div onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"11px 14px",
        background:hov?"rgba(212,175,55,.06)":"rgba(255,255,255,.02)",
        border:`1px solid ${hov?"rgba(212,175,55,.28)":"rgba(255,255,255,.06)"}`,
        borderRadius:12, cursor:"pointer", transition:"all .2s",
        transform:hov?"translateX(-2px)":"none" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:38, height:38, borderRadius:10, flexShrink:0,
          background:"linear-gradient(135deg,rgba(212,175,55,.22),rgba(212,175,55,.06))",
          border:"1px solid rgba(212,175,55,.2)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:16, fontWeight:700, color:theme.colors.gold }}>
          {(client.name || "?")[0]}
        </div>
        <div>
          <p style={{ fontWeight:700, fontSize:14, color:"#f8fafc" }}>{client.name}</p>
          <p style={{ fontSize:11, color:theme.colors.grey, marginTop:2 }}>
            {client.id} • 📞 {client.phone} • {program?.name||"—"}
          </p>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:14, flexShrink:0 }}>
        <div style={{ textAlign:"center" }}>
          <p style={{ fontSize:10, color:theme.colors.grey }}>{t.paid}</p>
          <p style={{ fontSize:13, fontWeight:700, color:theme.colors.greenLight }}>{paidLabel}</p>
        </div>
        <div style={{ textAlign:"center" }}>
          <p style={{ fontSize:10, color:theme.colors.grey }}>{t.remaining}</p>
          <p style={{ fontSize:13, fontWeight:700, color:remaining>0?theme.colors.warning:theme.colors.greenLight }}>
            {remainingLabel}
          </p>
        </div>
        <StatusBadge status={status} />
        <span style={{ color:theme.colors.grey, fontSize:18 }}>{isRTL?"→":"←"}</span>
      </div>
    </div>
  );
});

const DISMISS_KEY = "umrah_archive_dismiss_v1";
function getDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}"); } catch { return {}; }
}
function saveDismissed(obj) {
  try { localStorage.setItem(DISMISS_KEY, JSON.stringify(obj)); } catch {}
}

const ArchiveSuggestionAlert = React.memo(function ArchiveSuggestionAlert({ suggestion, t, tr, onArchive }) {
  const { program, daysAgo, count } = suggestion;
  const [dismissed, setDismissed] = React.useState(() => {
    const d = getDismissed();
    return d[program.id] && d[program.id] > Date.now();
  });

  if (dismissed) return null;

  const handleRemindLater = () => {
    const d = getDismissed();
    d[program.id] = Date.now() + 7 * 24 * 60 * 60 * 1000;
    saveDismissed(d);
    setDismissed(true);
  };

  const msg = tr("archiveAlertMsg", { name: program.name, days: daysAgo, count });

  return (
    <div style={{
      display:"flex", alignItems:"center", gap:10, flexWrap:"wrap",
      padding:"10px 14px", borderRadius:10, marginBottom:6,
      background:"rgba(245,158,11,.1)", border:"1px solid rgba(245,158,11,.3)",
    }}>
      <span style={{ fontSize:18 }}>📦</span>
      <span style={{ fontSize:13, fontWeight:600, color:tc.warning, flex:1 }}>{msg}</span>
      <button onClick={onArchive} style={{
        padding:"4px 12px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer",
        background:"rgba(245,158,11,.2)", border:"1px solid rgba(245,158,11,.4)",
        color:tc.warning, fontFamily:"'Cairo',sans-serif",
      }}>{t.archiveNow}</button>
      <button onClick={handleRemindLater} style={{
        padding:"4px 12px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer",
        background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)",
        color:tc.grey, fontFamily:"'Cairo',sans-serif",
      }}>{t.remindLater}</button>
    </div>
  );
});

const SectionHeader = React.memo(function SectionHeader({ title, onMore, btnLabel }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
      <h2 style={{ fontSize:14, fontWeight:700, color:"#f8fafc" }}>{title}</h2>
      {onMore && <button onClick={onMore} style={{ background:"none", border:"none",
        color:theme.colors.gold, fontSize:12, cursor:"pointer", fontFamily:"'Cairo',sans-serif" }}>
        {btnLabel}
      </button>}
    </div>
  );
});
