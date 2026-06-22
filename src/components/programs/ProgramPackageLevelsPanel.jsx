import { GlassCard } from "../UI";
import { AppIcon } from "../Icon";
import PackageDetailCard from "./PackageDetailCard";
import { getPackageStartingPrice } from "../../utils/programPackages";
import { translateHotelLevel } from "../../utils/i18nValues";

export default function ProgramPackageLevelsPanel({
  packages,
  packageFilter,
  setPackageFilter,
  packageFilterOpen,
  setPackageFilterOpen,
  packageFilterRef,
  activePackageChip,
  packageChips,
  selectedPackageDetail,
  incompleteInfoFilter,
  incompleteInformationLabel,
  filterMenuBaseStyle,
  filterMenuItemStyle,
  filterMenuCountStyle,
  formatCurrencyForLang,
  lang,
  t,
  tc,
}) {
  return (
    <GlassCard gold style={{ padding:"14px 16px", marginBottom:18 }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"center", flexWrap:"wrap", marginBottom:10 }}>
        <div>
          <p style={{ fontSize:14, fontWeight:800, color:tc.gold }}>{t.programLevelsTitle || "مستويات البرنامج"}</p>
          <p style={{ fontSize:11, color:tc.grey, marginTop:3 }}>
            {t.programLevelsHint || "اختر مستوى لعرض تفاصيله وتصفية المعتمرين المرتبطين به."}
          </p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <span style={{
            fontSize:12,
            color:tc.gold,
            background:"rgba(212,175,55,.08)",
            border:"1px solid rgba(212,175,55,.18)",
            borderRadius:999,
            padding:"4px 10px",
            fontWeight:800,
          }}>{packages.length} {t.levels || "مستويات"}</span>
          <div ref={packageFilterRef} style={{ position:"relative" }}>
            <button type="button" onClick={() => setPackageFilterOpen(open => !open)}
              style={{
                minWidth:150,
                display:"inline-flex",
                alignItems:"center",
                justifyContent:"space-between",
                gap:10,
                border:"1px solid rgba(212,175,55,.22)",
                background:"rgba(212,175,55,.08)",
                color:tc.gold,
                borderRadius:12,
                padding:"7px 11px",
                fontSize:12,
                fontWeight:800,
                cursor:"pointer",
                fontFamily:"'Cairo',sans-serif",
              }}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:7, minWidth:0 }}>
                <AppIcon name="program" size={14} color={tc.gold} />
                <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{activePackageChip.label}</span>
              </span>
              <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                <span style={{
                  minWidth:20,
                  textAlign:"center",
                  borderRadius:999,
                  padding:"0 6px",
                  background:"rgba(212,175,55,.16)",
                  fontSize:10,
                }}>{activePackageChip.count}</span>
                <AppIcon name="chevronBack" size={13} color={tc.gold} style={{ transform:"rotate(-90deg)" }} />
              </span>
            </button>
            {packageFilterOpen && (
              <div style={{
                ...filterMenuBaseStyle,
                insetInlineEnd:0,
                width:190,
              }}>
                {packageChips.map(chip => (
                  <button key={chip.key} type="button" onClick={() => {
                    setPackageFilter(chip.key);
                    setPackageFilterOpen(false);
                  }} style={filterMenuItemStyle(packageFilter === chip.key)}>
                    <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{chip.label}</span>
                    <span style={filterMenuCountStyle(packageFilter === chip.key)}>{chip.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {packageFilter === incompleteInfoFilter ? (
        <div style={{
          border:"1px dashed rgba(245,158,11,.28)",
          background:"rgba(245,158,11,.08)",
          borderRadius:10,
          padding:"10px 12px",
          color:tc.warning,
          fontSize:12,
          fontWeight:800,
        }}>
          {incompleteInformationLabel}
        </div>
      ) : packageFilter === "__unassigned" ? (
        <div style={{
          border:"1px dashed rgba(148,163,184,.2)",
          background:"rgba(148,163,184,.05)",
          borderRadius:10,
          padding:"10px 12px",
          color:tc.grey,
          fontSize:12,
        }}>
          {t.unassignedPackageHint || "يعرض هذا الخيار المعتمرين القدامى الذين لم يتم ربطهم بمستوى بعد."}
        </div>
      ) : selectedPackageDetail ? (
        <PackageDetailCard pkg={selectedPackageDetail} formatCurrencyForLang={formatCurrencyForLang} t={t} />
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:8 }}>
          {packages.map(pkg => {
            const start = getPackageStartingPrice(pkg);
            return (
              <button key={pkg.id || pkg.level} type="button" onClick={() => setPackageFilter(pkg.level)}
                style={{
                  border:"1px solid rgba(212,175,55,.14)",
                  background:"rgba(0,0,0,.14)",
                  borderRadius:10,
                  padding:"10px 12px",
                  display:"grid",
                  gap:5,
                  textAlign:"start",
                  cursor:"pointer",
                  fontFamily:"'Cairo',sans-serif",
                }}>
                <span style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center" }}>
                  <strong style={{ color:tc.white, fontSize:13 }}>{translateHotelLevel(pkg.level, lang) || pkg.level}</strong>
                  <span style={{ color:tc.gold, fontSize:11, fontWeight:800 }}>
                    {start ? formatCurrencyForLang(start) : "—"}
                  </span>
                </span>
                <span style={{ color:tc.grey, fontSize:11, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {pkg.hotelMecca || "—"} / {pkg.hotelMadina || "—"}
                </span>
                <span style={{ color:tc.grey, fontSize:11 }}>
                  {pkg.mealPlan || t.noMealPlan || "بدون نظام وجبات محدد"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
