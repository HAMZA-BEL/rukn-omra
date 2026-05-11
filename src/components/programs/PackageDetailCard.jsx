import { theme } from "../styles";
import { PROGRAM_ROOM_PRICE_KEYS, getPackageStartingPrice } from "../../utils/programPackages";
import { translateHotelLevel, translateRoomType } from "../../utils/i18nValues";

const tc = theme.colors;

export default function PackageDetailCard({ pkg, formatCurrencyForLang, t }) {
  const start = getPackageStartingPrice(pkg);
  return (
    <div style={{
      border:"1px solid rgba(212,175,55,.18)",
      background:"rgba(0,0,0,.16)",
      borderRadius:12,
      padding:12,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"flex-start", flexWrap:"wrap", marginBottom:10 }}>
        <div>
          <strong style={{ color:tc.white, fontSize:14 }}>{translateHotelLevel(pkg.level) || pkg.level}</strong>
          <p style={{ color:tc.grey, fontSize:11, marginTop:3 }}>
            {pkg.mealPlan || t.noMealPlan || "بدون نظام وجبات محدد"}
          </p>
        </div>
        <span style={{
          color:tc.gold,
          background:"rgba(212,175,55,.08)",
          border:"1px solid rgba(212,175,55,.16)",
          borderRadius:999,
          padding:"4px 10px",
          fontSize:12,
          fontWeight:800,
        }}>
          {start ? ((t.fromPrice || "ابتداءً من {price}").replace("{price}", formatCurrencyForLang(start))) : (t.noPrice || "بدون سعر")}
        </span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:8, marginBottom:10 }}>
        <p style={{ fontSize:11, color:tc.grey }}>{t.hotelMecca}: <span style={{ color:tc.white }}>{pkg.hotelMecca || "—"}</span></p>
        <p style={{ fontSize:11, color:tc.grey }}>{t.hotelMadina}: <span style={{ color:tc.white }}>{pkg.hotelMadina || "—"}</span></p>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {PROGRAM_ROOM_PRICE_KEYS.map(key => (
          <span key={key} style={{
            border:"1px solid rgba(212,175,55,.14)",
            background:"rgba(212,175,55,.06)",
            borderRadius:999,
            padding:"4px 9px",
            color:pkg.prices?.[key] ? tc.gold : tc.grey,
            fontSize:11,
            fontWeight:700,
          }}>
            {translateRoomType(key)}: {pkg.prices?.[key] ? formatCurrencyForLang(pkg.prices[key]) : "—"}
          </span>
        ))}
      </div>
    </div>
  );
}
