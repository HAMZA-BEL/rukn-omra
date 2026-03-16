import React from "react";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";

const tc = theme.colors;

const SYNC_DOT = {
  synced:  { color: "#22c55e", label: "●" },
  syncing: { color: "#d4af37", label: "●" },
  offline: { color: "#f59e0b", label: "●" },
};

export default function Sidebar({ active, onNavigate, stats, onExport, onImport, syncStatus = "synced", onLogout }) {
  const { t, lang, dir, setLang } = useLang();
  const [collapsed, setCollapsed] = React.useState(false);
  const fileRef = React.useRef();

  const NAV_ITEMS = [
    { id:"dashboard", icon:"🏠", label:t.dashboard },
    { id:"clients",   icon:"👥", label:t.clients },
    { id:"programs",  icon:"📋", label:t.programs },
    { id:"clearance", icon:"📊", label:t.clearance },
    { id:"settings",  icon:"⚙️", label:t.settings },
  ];

  return (
    <aside className="app-sidebar" style={{ width:collapsed?68:224, minHeight:"100vh",
      background:"linear-gradient(180deg,#0d1f3c 0%,#060d1a 100%)",
      borderLeft: dir==="rtl"?"1px solid rgba(212,175,55,.15)":"none",
      borderRight:dir!=="rtl"?"1px solid rgba(212,175,55,.15)":"none",
      display:"flex", flexDirection:"column",
      transition:"width .3s ease", flexShrink:0,
      position:"sticky", top:0, height:"100vh",
      overflowY:"auto", overflowX:"hidden" }}>

      {/* Logo */}
      <div style={{ padding:collapsed?"18px 10px":"18px 14px",
        borderBottom:"1px solid rgba(212,175,55,.1)",
        display:"flex", alignItems:"center",
        justifyContent:collapsed?"center":"space-between", gap:8 }}>
        {!collapsed && (
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:22, animation:"float 4s ease-in-out infinite" }}>🕋</span>
            <div>
              <p style={{ fontSize:14, fontWeight:900, fontFamily:"'Amiri',serif",
                background:"linear-gradient(135deg,#f0d060,#d4af37)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{t.appName}</p>
              <p style={{ fontSize:9, color:tc.grey }}>{t.agencyName}</p>
            </div>
          </div>
        )}
        {collapsed && <span style={{ fontSize:20 }}>🕋</span>}
        <button onClick={()=>setCollapsed(!collapsed)} style={{
          background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.08)",
          borderRadius:8, width:24, height:24, color:tc.grey,
          cursor:"pointer", fontSize:11, flexShrink:0,
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          {collapsed?(dir==="rtl"?"→":"←"):(dir==="rtl"?"←":"→")}
        </button>
      </div>

      {/* Lang toggle */}
      {!collapsed && (
        <div style={{ padding:"8px 12px", display:"flex", gap:4 }}>
          {["ar","fr","en"].map(l=>(
            <button key={l} onClick={()=>setLang(l)} style={{
              flex:1, padding:"5px", borderRadius:6,
              background:lang===l?"rgba(212,175,55,.15)":"rgba(255,255,255,.03)",
              border:`1px solid ${lang===l?tc.gold:"rgba(255,255,255,.08)"}`,
              color:lang===l?tc.gold:tc.grey,
              fontSize:11, fontWeight:lang===l?700:400,
              cursor:"pointer", fontFamily:"'Cairo',sans-serif" }}>
              {l==="ar"?t.arabic:l==="fr"?t.french:t.english}
            </button>
          ))}
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex:1, padding:"8px 8px" }}>
        {NAV_ITEMS.map(item=>(
          <NavItem key={item.id} item={item}
            active={active===item.id}
            collapsed={collapsed}
            onClick={()=>onNavigate(item.id)} />
        ))}
      </nav>

      {/* Stats */}
      {!collapsed && (
        <div style={{ padding:"10px 12px", margin:"0 8px 6px",
          borderTop:"1px solid rgba(212,175,55,.1)" }}>
          <p style={{ fontSize:10, color:tc.grey, marginBottom:7, fontWeight:700 }}>{t.quickSummary}</p>
          {[
            { label:t.totalClients,  val:stats.totalClients,  color:tc.gold },
            { label:t.totalPrograms, val:stats.totalPrograms, color:tc.gold },
            { label:t.cleared,       val:stats.cleared,       color:tc.greenLight },
            { label:t.unpaid,        val:stats.unpaid,        color:tc.danger },
          ].map(({label,val,color})=>(
            <div key={label} style={{ display:"flex", justifyContent:"space-between",
              padding:"3px 0", borderBottom:"1px solid rgba(255,255,255,.03)" }}>
              <span style={{ fontSize:10, color:tc.grey }}>{label}</span>
              <span style={{ fontSize:11, fontWeight:700, color }}>{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Backup */}
      {!collapsed && (
        <div style={{ padding:"10px 12px", margin:"0 8px 10px",
          background:"rgba(212,175,55,.03)", borderRadius:10,
          border:"1px solid rgba(212,175,55,.1)" }}>
          <p style={{ fontSize:10, color:tc.grey, marginBottom:7, fontWeight:700 }}>{t.backupData}</p>
          <button onClick={onExport} style={{ width:"100%", padding:"6px", marginBottom:5,
            background:"rgba(34,197,94,.1)", border:"1px solid rgba(34,197,94,.25)",
            borderRadius:8, color:tc.greenLight, fontSize:11, fontWeight:600,
            cursor:"pointer", fontFamily:"'Cairo',sans-serif" }}>
            ⬇️ {t.exportData}
          </button>
          <button onClick={()=>fileRef.current.click()} style={{ width:"100%", padding:"6px",
            background:"rgba(212,175,55,.1)", border:"1px solid rgba(212,175,55,.25)",
            borderRadius:8, color:tc.gold, fontSize:11, fontWeight:600,
            cursor:"pointer", fontFamily:"'Cairo',sans-serif" }}>
            ⬆️ {t.importData}
          </button>
          <input ref={fileRef} type="file" accept=".json" style={{ display:"none" }}
            onChange={e=>{ if(e.target.files[0]) onImport(e.target.files[0]); e.target.value=""; }} />
        </div>
      )}
      {/* Sync status + version */}
      <div style={{ padding:"6px 10px 10px", textAlign:"center" }}>
        {!collapsed && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, marginBottom:4 }}>
            <span style={{
              fontSize: 10,
              color: SYNC_DOT[syncStatus]?.color || tc.grey,
              animation: syncStatus === "syncing" ? "pulse 1.2s ease-in-out infinite" : "none",
            }}>
              {SYNC_DOT[syncStatus]?.label}
            </span>
            <span style={{ fontSize: 9, color: "rgba(148,163,184,.35)" }}>
              {syncStatus === "synced" ? "مزامن" : syncStatus === "syncing" ? "يزامن..." : "غير متصل"}
            </span>
          </div>
        )}
        <p style={{ fontSize:9, color:"rgba(148,163,184,.2)" }}>{t.version}</p>
        {onLogout && !collapsed && (
          <button onClick={onLogout} style={{
            marginTop: 6, width: "100%", padding: "5px",
            background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.15)",
            borderRadius: 7, color: "rgba(239,68,68,.6)", fontSize: 10, fontWeight: 600,
            cursor: "pointer", fontFamily: "'Cairo',sans-serif",
          }}>
            خروج
          </button>
        )}
      </div>
    </aside>
  );
}

function NavItem({ item, active, collapsed, onClick }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:"flex", alignItems:"center",
        gap:collapsed?0:9, justifyContent:collapsed?"center":"flex-start",
        width:"100%", padding:collapsed?"9px":"9px 11px",
        borderRadius:10, marginBottom:2,
        background:active?"linear-gradient(135deg,rgba(212,175,55,.2),rgba(212,175,55,.08))":hov?"rgba(255,255,255,.05)":"transparent",
        border:`1px solid ${active?"rgba(212,175,55,.3)":"transparent"}`,
        color:active?theme.colors.gold:hov?"#f8fafc":theme.colors.grey,
        cursor:"pointer", fontFamily:"'Cairo',sans-serif",
        fontSize:12, fontWeight:active?700:400,
        transition:"all .18s", textAlign:"start" }}
      title={collapsed?item.label:undefined}>
      <span style={{ fontSize:16, flexShrink:0 }}>{item.icon}</span>
      {!collapsed && <span style={{ flex:1 }}>{item.label}</span>}
      {active && !collapsed && <div style={{ width:5, height:5, borderRadius:"50%",
        background:theme.colors.gold, boxShadow:"0 0 8px rgba(212,175,55,.6)" }} />}
    </button>
  );
}
