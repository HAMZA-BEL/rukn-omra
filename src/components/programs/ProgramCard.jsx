import React from "react";
import { AppIcon } from "../Icon";
import { GlassCard } from "../UI";
import { useLang } from "../../hooks/useLang";
import { theme } from "../styles";
import {
  getProgramPackageCount,
  getProgramStartingPrice,
  normalizeProgramPackages,
} from "../../utils/programPackages";
import { translateProgramType } from "../../utils/i18nValues";

const tc = theme.colors;

function SmallBtn({ icon, onClick, color, title }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={e=>{e.stopPropagation();onClick(e);}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ width:30, height:30, background:hov?`${color}22`:"rgba(255,255,255,.05)",
        border:`1px solid ${hov?color:"rgba(255,255,255,.08)"}`,
        borderRadius:8, cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:13, transition:"all .2s" }}>
      <AppIcon name={icon} size={15} color={color} />
    </button>
  );
}

export default function ProgramCard({ program, registered, pct, totalPaid, totalRemaining,
  cleared, unpaid, delay, onClick, onEdit, onDuplicate, onDelete, lang, formatCurrencyForLang }) {
  const [hov, setHov] = React.useState(false);
  const { t } = useLang();
  const canDuplicate = !program.deleted && !program.deletedAt && program.status !== "archived";
  const packages = normalizeProgramPackages(program);
  const packageCount = getProgramPackageCount(program);
  const startingPriceValue = getProgramStartingPrice(program);
  const startingPrice = startingPriceValue ? formatCurrencyForLang(startingPriceValue) : "—";
  const packageLabel = `${packageCount} ${packageCount === 1 ? (t.level || "مستوى") : (t.levels || "مستويات")}`;
  const hotelSummary = packageCount > 1 ? (t.multipleHotelsByLevel || "عدة فنادق حسب المستوى") : "";
  const remainingLabel = formatCurrencyForLang(totalRemaining);
  const infoRows = [
    ["hotel", t.hotelMecca, hotelSummary || packages[0]?.hotelMecca || program.hotelMecca],
    ["building", t.hotelMadina, hotelSummary || packages[0]?.hotelMadina || program.hotelMadina],
    ["plane", t.departure, program.departure],
    ["planeLanding", t.returnDate, program.returnDate],
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
        boxShadow: hov ? "var(--rukn-shadow-card-hover)" : "var(--rukn-shadow-card)",
        border:`1px solid ${hov?"rgba(212,175,55,.45)":"rgba(212,175,55,.2)"}`,
      }}>
        {/* header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:16, fontWeight:800, color:tc.white, marginBottom:6, lineHeight:1.3 }}>{program.name}</p>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, color:tc.gold, background:"rgba(212,175,55,.12)", padding:"2px 10px", borderRadius:20 }}>{translateProgramType(program.type, lang)}</span>
              <span style={{ fontSize:11, color:tc.grey, background:"rgba(148,163,184,.1)", padding:"2px 10px", borderRadius:20 }}>{program.duration}</span>
              <span style={{ fontSize:11, color:tc.greenLight, background:"rgba(34,197,94,.1)", padding:"2px 10px", borderRadius:20 }}>{packageLabel}</span>
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }} onClick={e=>e.stopPropagation()}>
            <SmallBtn icon="edit" onClick={onEdit} color={tc.gold} title={t.edit} />
            {canDuplicate && (
              <SmallBtn
                icon="copy"
                onClick={onDuplicate}
                color={tc.gold}
                title={t.programDuplicateAction || (lang === "fr" ? "Dupliquer le programme" : lang === "en" ? "Duplicate program" : "نسخ البرنامج")}
              />
            )}
            <SmallBtn icon="trash" onClick={onDelete} color={tc.danger} title={t.delete} />
          </div>
        </div>

        {/* hotel + dates */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
          {infoRows.map(([ic,lb,vl])=>(
            <div key={lb}>
              <p style={{ fontSize:10, color:tc.grey, display:"inline-flex", alignItems:"center", gap:5 }}>
                <AppIcon name={ic} size={13} color={tc.gold} /> {lb}
              </p>
              <p style={{ fontSize:12, fontWeight:600, color:tc.white }}>{vl||"—"}</p>
            </div>
          ))}
        </div>

        {/* mini stats */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:14,
          background:"var(--rukn-section-bg)", border:"1px solid var(--rukn-section-border)", borderRadius:10, padding:"10px" }}>
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
          <div style={{ height:5, background:"var(--rukn-border-soft)", borderRadius:3, overflow:"hidden" }}>
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
