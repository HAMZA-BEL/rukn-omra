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
import { formatProgramCapacityValue } from "../../utils/programCapacity";
import { getProgramKind } from "../../utils/participantTerminology";

const tc = theme.colors;

function SmallBtn({ icon, onClick, color, title, active = false }) {
  const [hov, setHov] = React.useState(false);
  const activeOrHover = hov || active;
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={e=>{e.stopPropagation();onClick(e);}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ width:30, height:30, background:activeOrHover ? `${color}18` : "transparent",
        border:"1px solid transparent",
        borderRadius:8, cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:13, transition:"background .16s ease, box-shadow .16s ease, color .16s ease",
        outline:"none",
        boxShadow:active ? `0 0 0 1px ${color}33` : "none" }}
      onFocus={(event) => {
        event.currentTarget.style.boxShadow = `0 0 0 2px ${color}33`;
      }}
      onBlur={(event) => {
        event.currentTarget.style.boxShadow = active ? `0 0 0 1px ${color}33` : "none";
      }}
    >
      <AppIcon name={icon} size={15} color={color} />
    </button>
  );
}

const getTravelGroupCountLabel = (count, lang) => {
  if (lang === "fr") return `${count} groupe${count === 1 ? "" : "s"}`;
  if (lang === "en") return `${count} group${count === 1 ? "" : "s"}`;
  if (count <= 2) return `${count} فوج`;
  return `${count} أفواج`;
};

export default function ProgramCard({ program, registered, pct, totalPaid, totalRemaining,
  cleared, unpaid, delay, onClick, onEdit, onDuplicate, onArchive, onDelete, onToggleNusukUpload, lang, formatCurrencyForLang,
  highlighted = false, selected = false, onSelectionChange, selectionLabel = "", programSummary = null,
  travelGroupCount = 0 }) {
  const [hov, setHov] = React.useState(false);
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const [hoveredAction, setHoveredAction] = React.useState("");
  const menuRef = React.useRef(null);
  const { t, dir } = useLang();
  const selectionMode = typeof onSelectionChange === "function";
  const canDuplicate = !program.deleted && !program.deletedAt && program.status !== "archived";
  const canArchive = !program.deleted && !program.deletedAt && program.status !== "archived" && typeof onArchive === "function";
  const nusukUploadEnabled = Boolean(program.nusukUploadEnabled ?? program.nusuk_upload_enabled);
  const hasProgramSummary = programSummary && Number.isFinite(Number(programSummary.packageCount));
  const packages = hasProgramSummary ? [] : normalizeProgramPackages(program);
  const packageCount = hasProgramSummary ? Number(programSummary.packageCount) : getProgramPackageCount(program);
  const startingPriceValue = hasProgramSummary ? Number(programSummary.startingPrice || 0) : getProgramStartingPrice(program);
  const startingPrice = startingPriceValue ? formatCurrencyForLang(startingPriceValue) : "—";
  const packageLabel = `${packageCount} ${packageCount === 1 ? (t.level || "مستوى") : (t.levels || "مستويات")}`;
  const hotelSummary = packageCount > 1 ? (t.multipleHotelsByLevel || "عدة فنادق حسب المستوى") : "";
  const primaryHotelMecca = hasProgramSummary ? programSummary.primaryHotelMecca : packages[0]?.hotelMecca;
  const primaryHotelMadina = hasProgramSummary ? programSummary.primaryHotelMadina : packages[0]?.hotelMadina;
  const remainingLabel = formatCurrencyForLang(totalRemaining);
  const seatFillValue = formatProgramCapacityValue(program, registered);
  const normalizedTravelGroupCount = Math.max(0, Number(travelGroupCount) || 0);
  const showTravelGroupIndicator = getProgramKind(program) === "hajj" && normalizedTravelGroupCount > 0;
  const infoRows = [
    ["hotel", t.hotelMecca, hotelSummary || primaryHotelMecca || program.hotelMecca],
    ["building", t.hotelMadina, hotelSummary || primaryHotelMadina || program.hotelMadina],
    ["plane", t.departure, program.departure],
    ["planeLanding", t.returnDate, program.returnDate],
  ];
  const miniStats = [
    { label: t.registered, value: registered, color: tc.gold },
    { label: t.cleared, value: cleared, color: tc.greenLight },
    { label: t.unpaid, value: unpaid, color: tc.danger },
  ];
  const menuActions = [
    {
      key: "edit",
      icon: "edit",
      label: t.edit,
      onClick: onEdit,
    },
    typeof onToggleNusukUpload === "function" ? {
      key: "nusuk-upload",
      icon: nusukUploadEnabled ? "check" : "upload",
      label: nusukUploadEnabled ? "إيقاف الرفع لنسك" : "رفع لنسك",
      onClick: onToggleNusukUpload,
    } : null,
    canArchive ? {
      key: "archive",
      icon: "archive",
      label: t.programArchiveAction,
      onClick: onArchive,
    } : null,
    {
      key: "delete",
      icon: "trash",
      label: t.delete,
      danger: true,
      onClick: onDelete,
    },
  ].filter(Boolean);

  React.useEffect(() => {
    if (!actionsOpen) return undefined;
    const handleOutside = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      setActionsOpen(false);
      setHoveredAction("");
    };
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setActionsOpen(false);
      setHoveredAction("");
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [actionsOpen]);

  const runMenuAction = React.useCallback((event, action) => {
    event.stopPropagation();
    setActionsOpen(false);
    setHoveredAction("");
    action.onClick?.(event);
  }, []);
  const handleCardClick = React.useCallback((event) => {
    if (selectionMode) {
      event.preventDefault();
      onSelectionChange(!selected);
      return;
    }
    onClick?.(event);
  }, [onClick, onSelectionChange, selected, selectionMode]);

  return (
    <div className="animate-fadeInUp" style={{ animationDelay:`${delay}s`, cursor:selectionMode ? "copy" : "pointer", position:"relative", zIndex:actionsOpen ? 60 : 1 }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={handleCardClick}>
      <GlassCard gold style={{
        padding:22,
        position:"relative",
        overflow:"visible",
        transform: hov ? "translateY(-5px)" : "none",
        transition:"transform .3s ease, border-color .25s ease, box-shadow .35s ease",
        boxShadow: highlighted
          ? "0 0 0 3px rgba(59,130,246,.16), var(--rukn-shadow-card-hover)"
          : selected
            ? "0 0 0 2px rgba(212,175,55,.32), var(--rukn-shadow-card-hover)"
          : hov ? "var(--rukn-shadow-card-hover)" : "var(--rukn-shadow-card)",
        border:`1px solid ${highlighted ? "rgba(59,130,246,.72)" : selected ? "rgba(212,175,55,.62)" : hov ? "rgba(212,175,55,.45)" : "rgba(212,175,55,.2)"}`,
        background:selected ? "linear-gradient(180deg, rgba(212,175,55,.08), rgba(15,23,42,.02)), var(--rukn-card-bg)" : undefined,
      }}>
        {selectionMode && (
          <label
            title={selectionLabel}
            aria-label={selectionLabel}
            onClick={(event) => event.stopPropagation()}
            style={{
              position:"absolute",
              top:12,
              insetInlineStart:12,
              width:28,
              height:28,
              borderRadius:8,
              display:"inline-flex",
              alignItems:"center",
              justifyContent:"center",
              background:selected ? "var(--rukn-gold-dim)" : "rgba(15,23,42,.28)",
              border:`1px solid ${selected ? "rgba(212,175,55,.62)" : "rgba(148,163,184,.22)"}`,
              cursor:"pointer",
              transition:"background .16s ease, border-color .16s ease",
              zIndex:2,
            }}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={(event) => onSelectionChange(event.target.checked)}
              style={{ width:15, height:15, accentColor:tc.gold, cursor:"pointer" }}
            />
          </label>
        )}
        {/* header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <div style={{ flex:1, paddingInlineStart: selectionMode ? 34 : 0 }}>
            <p style={{ fontSize:16, fontWeight:800, color:tc.white, marginBottom:6, lineHeight:1.3 }}>{program.name}</p>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <span style={{
                display:"inline-flex",
                alignItems:"center",
                gap:showTravelGroupIndicator ? 4 : 0,
                maxWidth:showTravelGroupIndicator ? 112 : undefined,
                fontSize:11,
                color:tc.gold,
                background:"rgba(212,175,55,.12)",
                padding:"2px 10px",
                borderRadius:20,
                whiteSpace:"nowrap",
                overflow:"hidden",
              }}>
                <span>{translateProgramType(program.type, lang)}</span>
                {showTravelGroupIndicator && (
                  <>
                    <span aria-hidden="true" style={{ opacity:.55 }}>•</span>
                    <AppIcon name="users" size={10} color={tc.gold} />
                    <span style={{ overflow:"hidden", textOverflow:"ellipsis" }}>
                      {getTravelGroupCountLabel(normalizedTravelGroupCount, lang)}
                    </span>
                  </>
                )}
              </span>
              <span style={{ fontSize:11, color:tc.grey, background:"rgba(148,163,184,.1)", padding:"2px 10px", borderRadius:20 }}>{program.duration}</span>
              <span style={{ fontSize:11, color:tc.greenLight, background:"rgba(34,197,94,.1)", padding:"2px 10px", borderRadius:20 }}>{packageLabel}</span>
              {nusukUploadEnabled && (
                <span style={{
                  display:"inline-flex",
                  alignItems:"center",
                  gap:4,
                  fontSize:11,
                  color:tc.greenLight,
                  background:"rgba(34,197,94,.12)",
                  padding:"2px 10px",
                  borderRadius:20,
                }}>
                  <AppIcon name="upload" size={10} color={tc.greenLight} />
                  مفعل لنسك
                </span>
              )}
            </div>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center", position:"relative", direction:dir }} onClick={e=>e.stopPropagation()}>
            {canDuplicate && (
              <SmallBtn
                icon="copy"
                onClick={onDuplicate}
                color={tc.gold}
                title={t.programDuplicateAction || (lang === "fr" ? "Dupliquer le programme" : lang === "en" ? "Duplicate program" : "نسخ البرنامج")}
              />
            )}
            <div ref={menuRef} style={{ position:"relative" }}>
              <SmallBtn
                icon="moreHorizontal"
                onClick={() => setActionsOpen(open => !open)}
                color={tc.gold}
                title={t.programActionsMenu}
                active={actionsOpen}
              />
              {actionsOpen && (
                <div
                  role="menu"
                  aria-label={t.programActionsMenu}
                  style={{
                    position:"absolute",
                    top:"calc(100% + 8px)",
                    insetInlineEnd:0,
                    minWidth:178,
                    zIndex:80,
                    padding:6,
                    borderRadius:12,
                    border:"1px solid var(--rukn-menu-border)",
                    background:"var(--rukn-menu-bg)",
                    boxShadow:"var(--rukn-menu-shadow)",
                    backdropFilter:"blur(14px)",
                    direction:dir,
                  }}
                >
                  {menuActions.map((action, index) => {
                    const hovered = hoveredAction === action.key;
                    const isDelete = action.danger;
                    return (
                      <React.Fragment key={action.key}>
                        {isDelete && index > 0 && (
                          <div style={{ height:1, background:"var(--rukn-menu-divider)", margin:"5px 2px" }} />
                        )}
                        <button
                          type="button"
                          role="menuitem"
                          onMouseEnter={() => setHoveredAction(action.key)}
                          onMouseLeave={() => setHoveredAction(current => current === action.key ? "" : current)}
                          onClick={(event) => runMenuAction(event, action)}
                          style={{
                            width:"100%",
                            border:0,
                            borderRadius:8,
                            background:hovered
                              ? isDelete ? "var(--rukn-danger-dim)" : "var(--rukn-gold-dim)"
                              : "transparent",
                            color:isDelete ? tc.danger : hovered ? tc.gold : "var(--rukn-text-strong)",
                            display:"flex",
                            alignItems:"center",
                            gap:9,
                            padding:"9px 10px",
                            fontSize:12,
                            fontWeight:800,
                            cursor:"pointer",
                            textAlign:"start",
                            fontFamily:"'Cairo',sans-serif",
                            transition:"background .16s ease, color .16s ease",
                          }}
                        >
                          <AppIcon name={action.icon} size={14} color={isDelete ? tc.danger : hovered ? tc.gold : "var(--rukn-text-muted)"} />
                          <span style={{ flex:1 }}>{action.label}</span>
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
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
            <span style={{ color:pct>80?tc.danger:tc.gold, fontWeight:700 }}>{seatFillValue}</span>
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
