import React from "react";
import { GlassCard, SearchBar, StatusBadge } from "./UI";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { formatCurrency } from "../utils/currency";
import { AppIcon, IconBubble } from "./Icon";

const tc = theme.colors;

export default function Dashboard({ store, onNavigate, onSelectClient, headerActions, onBrandNavigate }) {
  const { t, tr, dir, lang } = useLang();
  const isRTL = dir === "rtl";
  const { stats, clients, programs, activityLog,
          getClientStatus, getClientTotalPaid, getProgramClients, getProgramById,
          fetchActivityLogPage } = store;
  const [search, setSearch] = React.useState("");
  const [brandHover, setBrandHover] = React.useState(false);
  const handleBrandClick = React.useCallback(() => {
    if (typeof onBrandNavigate === "function") {
      onBrandNavigate();
    } else if (typeof onNavigate === "function") {
      onNavigate("dashboard");
    }
  }, [onBrandNavigate, onNavigate]);

  const formatCurrencyForLang = React.useCallback(
    (value) => formatCurrency(value, lang),
    [lang]
  );
  const ACTIVITY_PAGE_SIZE = 5;
  const [activityPage, setActivityPage] = React.useState(0);
  const [activityRows, setActivityRows] = React.useState(activityLog.slice(0, ACTIVITY_PAGE_SIZE));
  const [activityTotal, setActivityTotal] = React.useState(activityLog.length);
  const [activityLoading, setActivityLoading] = React.useState(false);
  const [activityError, setActivityError] = React.useState(null);

  const applyActivityFallback = React.useCallback((pageIndex) => {
    const start = pageIndex * ACTIVITY_PAGE_SIZE;
    const fallback = activityLog.slice(start, start + ACTIVITY_PAGE_SIZE);
    if (fallback.length) {
      setActivityRows(fallback);
      setActivityTotal(activityLog.length);
      setActivityPage(pageIndex);
      setActivityError(null);
    } else {
      setActivityRows([]);
      setActivityTotal(0);
      setActivityError("تعذّر تحميل سجل النشاط");
    }
  }, [activityLog]);

  const loadActivityPage = React.useCallback(async (pageIndex = 0) => {
    if (!fetchActivityLogPage) {
      applyActivityFallback(pageIndex);
      return;
    }
    setActivityLoading(true);
    setActivityError(null);
    try {
      const { data, count, error } = await fetchActivityLogPage({ page: pageIndex, limit: ACTIVITY_PAGE_SIZE });
      if (error) {
        applyActivityFallback(pageIndex);
        return;
      }
      setActivityRows(data || []);
      setActivityTotal(count ?? 0);
      setActivityPage(pageIndex);
    } catch (err) {
      console.error("[Dashboard] activity log load failed", err);
      applyActivityFallback(pageIndex);
    } finally {
      setActivityLoading(false);
    }
  }, [applyActivityFallback, fetchActivityLogPage]);

  React.useEffect(() => {
    loadActivityPage(0);
  }, [loadActivityPage]);

  React.useEffect(() => {
    if (activityPage === 0 && !activityLoading && activityLog.length) {
      setActivityRows(activityLog.slice(0, ACTIVITY_PAGE_SIZE));
      setActivityTotal((prev) => Math.max(prev, activityLog.length));
    }
  }, [activityLog, activityLoading, activityPage]);

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

  const maxActivityPage = Math.max(0, Math.ceil(activityTotal / ACTIVITY_PAGE_SIZE) - 1);

  const newerLabel = t.newerUpdates || (lang === "fr" ? "Plus récent" : lang === "en" ? "Newer" : "الأحدث");
  const olderLabel = t.olderUpdates || (lang === "fr" ? "Plus ancien" : lang === "en" ? "Older" : "الأقدم");

  return (
    <div className="page-shell" style={{ paddingBottom:40 }}>
      {/* Hero */}
      <div style={{
        padding:"26px 32px 14px",
        display:"flex",
        flexDirection:isRTL?"row-reverse":"row",
        justifyContent:"space-between",
        alignItems:"center",
        gap:18,
        flexWrap:"wrap",
      }}>
        <button
          type="button"
          onClick={handleBrandClick}
          onMouseEnter={() => setBrandHover(true)}
          onMouseLeave={() => setBrandHover(false)}
          onFocus={() => setBrandHover(true)}
          onBlur={() => setBrandHover(false)}
          style={{
            display:"flex",
            alignItems:"center",
            gap:14,
            minWidth:0,
            flex:"1 1 220px",
            textAlign:isRTL?"right":"left",
            justifyContent:isRTL?"flex-end":"flex-start",
            background:"none",
            border:"none",
            padding:0,
            cursor:"pointer",
            color:"inherit",
            transition:"opacity .2s ease, transform .2s ease",
            opacity:brandHover?0.92:1,
            transform:brandHover?"translateY(-1px)":"none",
          }}
        >
          <IconBubble name="brand" boxSize={46} size={22} style={{ animation:"float 4s ease-in-out infinite" }} />
          <div>
            <h1 style={{ fontSize:24, fontWeight:900, fontFamily:"'Amiri',serif",
              background:"linear-gradient(135deg,#f0d060,#d4af37)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", lineHeight:1.2 }}>
              {t.appName}
            </h1>
            <p style={{ fontSize:12, color:tc.grey }}>
              {store.agency?.nameAr || store.agency?.nameFr || t.agencyName}
            </p>
          </div>
        </button>
        {headerActions && (
          <div style={{ flex:"0 0 auto" }}>
            {headerActions}
          </div>
        )}
      </div>

      <div className="page-hero" style={{ position:"relative", overflow:"hidden",
        background:"linear-gradient(135deg,rgba(26,107,58,.35),rgba(6,13,26,.9))",
        borderBottom:"1px solid rgba(212,175,55,.15)", padding:"24px 32px 26px" }}>
        {[100,180,280].map((s,i)=>(
          <div key={i} style={{ position:"absolute", top:-s/2, left:-s/3,
            width:s, height:s, borderRadius:"50%",
            border:"1px solid rgba(212,175,55,.06)", pointerEvents:"none" }} />
        ))}
        <div style={{ position:"relative", zIndex:1 }}>
          <SearchBar value={search} onChange={e=>setSearch(e.target.value)}
            placeholder={t.search}
            style={{ maxWidth:560, marginTop:16 }} />
        </div>
      </div>

      <div className="page-body" style={{ padding:"24px 32px 0" }}>

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
                { label:t.totalClients,  val:stats.archivedCount > 0 ? `${stats.totalClients} ${tr("archivedCountLabel",{n:stats.archivedCount})}` : stats.totalClients,  icon:"users", color:tc.gold,       delay:0    },
                { label:t.totalPrograms, val:stats.totalPrograms, icon:"program", color:tc.gold,       delay:.04  },
                { label:t.cleared,       val:stats.cleared,       icon:"success", color:tc.greenLight, delay:.08  },
                { label:t.partial,       val:stats.partial,       icon:"partial", color:tc.warning,    delay:.12  },
                { label:t.unpaid,        val:stats.unpaid,        icon:"unpaid", color:tc.danger,     delay:.16  },
                { label:t.collected,     val:formatCurrencyForLang(stats.totalCollected), icon:"banknote", color:tc.gold, delay:.20 },
                { label:t.remaining,     val:formatCurrencyForLang(stats.totalRemaining), icon:"hourglass", color:tc.warning, delay:.24 },
                { label:t.discounts,     val:formatCurrencyForLang(stats.totalDiscount),  icon:"discount", color:tc.danger,  delay:.28 },
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
            <SectionHeader title={t.recentActivity} onMore={()=>onNavigate("activity")} btnLabel={t.viewAll} />
            <div className="list-stack" style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {activityError && (
                <div style={{ padding:16, textAlign:"center", color:theme.colors.danger, fontSize:12 }}>
                  {activityError}
                </div>
              )}
              {activityLoading && (
                <div style={{ padding:16, textAlign:"center", color:tc.grey, fontSize:12 }}>
                  {t.loading || "جاري التحميل..."}
                </div>
              )}
              {!activityError && !activityLoading && activityRows.length === 0 && (
                <div style={{ padding:20, textAlign:"center", color:tc.grey, fontSize:13 }}>
                  {t.noActivities}
                </div>
              )}
              {activityRows.map((a,i)=>(
                <ActivityRow key={a.id || i} activity={a} index={i + activityPage * ACTIVITY_PAGE_SIZE} />
              ))}
            </div>
            {activityTotal > ACTIVITY_PAGE_SIZE && (
              <div style={{
                display:"flex", justifyContent:"center", alignItems:"center",
                gap:12, marginTop:12,
              }}>
                <button
                  type="button"
                  onClick={() => loadActivityPage(Math.max(0, activityPage - 1))}
                  disabled={activityPage === 0 || activityLoading}
                  style={{
                    padding:"6px 14px",
                    borderRadius:999,
                    border:"1px solid rgba(255,255,255,.15)",
                    background:activityPage===0?"rgba(255,255,255,.04)":"rgba(212,175,55,.15)",
                    color:activityPage===0?tc.grey:tc.gold,
                    fontSize:12, fontWeight:600,
                    cursor:activityPage===0?"not-allowed":"pointer",
                    transition:"all .2s",
                  }}
                >
                  {newerLabel}
                </button>
                <span style={{ fontSize:11, color:tc.grey }}>
                  {activityPage + 1}/{maxActivityPage + 1}
                </span>
                <button
                  type="button"
                  onClick={() => loadActivityPage(Math.min(maxActivityPage, activityPage + 1))}
                  disabled={activityPage === maxActivityPage || activityLoading}
                  style={{
                    padding:"6px 14px",
                    borderRadius:999,
                    border:"1px solid rgba(255,255,255,.15)",
                    background:activityPage===maxActivityPage?"rgba(255,255,255,.04)":"rgba(212,175,55,.15)",
                    color:activityPage===maxActivityPage?tc.grey:tc.gold,
                    fontSize:12, fontWeight:600,
                    cursor:activityPage===maxActivityPage?"not-allowed":"pointer",
                    transition:"all .2s",
                  }}
                >
                  {olderLabel}
                </button>
              </div>
            )}
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
            <AppIcon name={icon} size={17} color={color} />
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
        <p style={{ fontSize:11, color:theme.colors.grey, marginBottom:9, display:"flex", alignItems:"center", gap:5 }}>
          <AppIcon name="plane" size={13} /> {program.departure}
        </p>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:11 }}>
          <span style={{ color:theme.colors.grey }}>{t.registered}</span>
          <span style={{ color:theme.colors.gold, fontWeight:700 }}>{registered}/{program.seats}</span>
        </div>
        <div style={{ height:4, background:"rgba(255,255,255,.06)", borderRadius:2, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, borderRadius:2, transition:"width 1s",
            background:pct>80?"linear-gradient(90deg,#ef4444,#f97316)":"linear-gradient(90deg,#22c55e,#d4af37)" }} />
        </div>
        <p style={{ fontSize:11, color:remaining>0?theme.colors.greenLight:theme.colors.danger, marginTop:6, fontWeight:600 }}>
          {remaining>0?`${remaining} ${t.seatsLeft}`:t.full}
        </p>
      </GlassCard>
    </div>
  );
});

const ActivityRow = React.memo(function ActivityRow({ activity, index }) {
  const { t } = useLang();
  const icons = {
    client_add:"user",
    client_update:"edit",
    client_delete:"trash",
    client_transfer:"refresh",
    client_archive:"archive",
    client_restore:"restore",
    client_bulk_archive:"archive",
    client_bulk_delete:"trash",
    payment_add:"payment",
    payment_delete:"error",
    program_add:"program",
    program_update:"settings",
    program_delete:"receipt",
    program_archive:"archivedFolder",
    program_restore:"restore",
    import_excel:"import",
  };
  const colors= {
    client_add:theme.colors.greenLight,
    client_update:theme.colors.gold,
    client_delete:theme.colors.danger,
    client_transfer:theme.colors.gold,
    client_archive:theme.colors.warning,
    client_restore:theme.colors.greenLight,
    client_bulk_archive:theme.colors.warning,
    client_bulk_delete:theme.colors.danger,
    payment_add:theme.colors.gold,
    payment_delete:theme.colors.danger,
    program_add:theme.colors.gold,
    program_update:theme.colors.gold,
    program_delete:theme.colors.danger,
    program_archive:theme.colors.warning,
    program_restore:theme.colors.greenLight,
    import_excel:theme.colors.gold,
  };
  const type = activity.type || "default";
  const icon = icons[type] || "status";
  const accent = colors[type] || theme.colors.gold;
  const time = new Date(activity.time);
  const timeStr = `${time.toLocaleDateString("ar-MA")} ${time.toLocaleTimeString("ar-MA",{hour:"2-digit",minute:"2-digit"})}`;
  return (
    <div className="animate-fadeInUp" style={{ animationDelay:`${index*.02}s` }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px",
        background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.05)",
        borderRadius:10 }}>
        <AppIcon name={icon} size={16} color={accent} />
        <div style={{ flex:1 }}>
          <span style={{ fontSize:13, color:"#f8fafc", fontWeight:600 }}>{activity.description}</span>
          {activity.isArchived && (
            <span style={{ fontSize:10, color:theme.colors.grey, marginInlineStart:6 }}>
              {t.archivedBadge || "مؤرشف"}
            </span>
          )}
          {activity.clientName && (
            <span style={{ fontSize:12, color:accent,
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
            {client.id} • {client.phone} • {program?.name||"—"}
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
        <AppIcon name="chevronBack" size={18} color={theme.colors.grey} style={{ transform:isRTL?"rotate(180deg)":"none" }} />
      </div>
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
