import { theme } from "../styles";
import { AppIcon } from "../Icon";
import { GlassCard } from "../UI";

const tc = theme.colors;

export default function ProgramDetailOverview({
  activeTab,
  onTabChange,
  tabs,
  showSummary = true,
  statCards,
  clearanceLabel,
  clearanceValueLabel,
  clearancePercent,
}) {
  return (
    <>
      <div style={{
        display:"inline-flex",
        gap:4,
        padding:4,
        marginBottom:18,
        borderRadius:14,
        background:"rgba(255,255,255,.04)",
        border:"1px solid rgba(212,175,55,.14)",
      }}>
        {tabs.map(tab => (
          <button key={tab.key} type="button" onClick={() => onTabChange(tab.key)}
            style={{
              display:"inline-flex",
              alignItems:"center",
              gap:7,
              border:0,
              borderRadius:11,
              padding:"8px 14px",
              background:activeTab === tab.key ? "rgba(212,175,55,.16)" : "transparent",
              color:activeTab === tab.key ? tc.gold : tc.grey,
              fontSize:13,
              fontWeight:800,
              cursor:"pointer",
              fontFamily:"'Cairo',sans-serif",
            }}>
            <AppIcon name={tab.icon} size={15} color={activeTab === tab.key ? tc.gold : tc.grey} />
            {tab.label}
          </button>
        ))}
      </div>

      {showSummary && (
        <>
          {/* KPI row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(145px,1fr))", gap:12, marginBottom:24 }}>
            {statCards.map((stat,i)=>(
              <div key={stat.label} className="animate-fadeInUp" style={{ animationDelay:`${i*.04}s` }}>
                <GlassCard gold style={{ padding:"14px 16px", textAlign:"center" }}>
                  <AppIcon name={stat.icon} size={20} color={stat.color} style={{ marginBottom:5 }} />
                  <p style={{ fontSize:15, fontWeight:800, color:stat.color, fontFamily:"'Amiri',serif", lineHeight:1 }}>{stat.value}</p>
                  <p style={{ fontSize:11, color:tc.grey, marginTop:5 }}>{stat.label}</p>
                </GlassCard>
              </div>
            ))}
          </div>

          {/* clearance progress */}
          <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(212,175,55,.15)",
            borderRadius:12, padding:"14px 20px", marginBottom:22 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13 }}>
              <span style={{ color:tc.grey }}>{clearanceLabel}</span>
              <span style={{ color:tc.gold, fontWeight:700 }}>{clearanceValueLabel}</span>
            </div>
            <div style={{ height:8, background:"rgba(255,255,255,.06)", borderRadius:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${clearancePercent}%`,
                background:"linear-gradient(90deg,#22c55e,#d4af37)", borderRadius:4,
                transition:"width 1.2s ease", boxShadow:"0 0 12px rgba(34,197,94,.4)" }} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
