import React from "react";
import { createPortal } from "react-dom";
import { StatusBadge } from "../UI";
import { theme } from "../styles";
import { AppIcon } from "../Icon";
import { useLang } from "../../hooks/useLang";
import { useDropdownPosition } from "../../hooks/useDropdownPosition";
import { formatCurrency } from "../../utils/currency";
import { getRoomTypeLabel } from "../../utils/programPackages";
import {
  clientServiceIncludesAccommodation,
  getClientServiceType,
  getClientServiceTypeLabel,
} from "../../utils/clientServiceTypes";
import { getClientDisplayName as resolveClientDisplayName } from "../../utils/clientNames";
import { getClientCompletionBadges, getClientCompletionTooltip } from "../../utils/clientCompletionStatus";
import { translateHotelLevel, translateRoomType } from "../../utils/i18nValues";
import { isMinor } from "../../utils/age";

const tc = theme.colors;
const MENU_OFFSET_PX = 6;

const completionBadgeStyle = (tone) => ({
  display:"inline-flex",
  alignItems:"center",
  gap:4,
  padding:"1px 6px",
  borderRadius:999,
  border:tone === "warning" ? "1px solid rgba(245,158,11,.32)" : "1px solid rgba(148,163,184,.25)",
  background:tone === "warning" ? "rgba(245,158,11,.12)" : "rgba(148,163,184,.1)",
  color:tone === "warning" ? tc.warning : tc.grey,
  fontSize:9.5,
  lineHeight:1.35,
  fontWeight:800,
  whiteSpace:"nowrap",
});

const getOverpaidLabel = (lang) => {
  if (lang === "fr") return "Trop-perçu";
  if (lang === "en") return "Overpaid";
  return "زائد";
};

export default function ProgramClientRow({
  client,
  program,
  index,
  amount,
  paid,
  remaining,
  overpaid = 0,
  status,
  onClick,
  onEdit,
  onDelete,
  onTransfer,
  selectMode = false,
  showCheckbox = false,
  isChecked = false,
  onCheck,
  gridTemplate,
  completionTooltip = "",
}) {
  const [hov, setHov] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { lang, dir, t } = useLang();
  const isRTL = dir === "rtl";
  const amountLabel = formatCurrency(amount, lang);
  const paidLabel = formatCurrency(paid, lang);
  const remainingLabel = formatCurrency(remaining, lang);
  const overpaidAmount = Number(overpaid) || 0;
  const overpaidLabel = overpaidAmount > 0
    ? `${getOverpaidLabel(lang)} ${formatCurrency(overpaidAmount, lang)}`
    : "";
  const btnRef = React.useRef();
  const menuRef = React.useRef();
  const menuPos = useDropdownPosition({
    anchorRef: btnRef,
    menuRef,
    open: menuOpen,
    rtl: isRTL,
    offset: MENU_OFFSET_PX,
  });

  const fallbackName = resolveClientDisplayName(client, "؟");
  const avatarInitial = fallbackName ? fallbackName[0] : "؟";
  const phoneLabel = client.phone ? `${client.phone}` : "";
  const cityLabel = client.city ? `• ${client.city}` : "";
  const packageLabel = translateHotelLevel(client.packageLevel || client.hotelLevel, lang) || client.packageLevel || client.hotelLevel || "";
  const roomLabel = translateRoomType(client.roomTypeLabel || client.roomType, lang) || getRoomTypeLabel(client.roomType) || "";
  const serviceType = getClientServiceType(client);
  const serviceTypeLabel = getClientServiceTypeLabel(serviceType, t, lang);
  const hasAccommodation = clientServiceIncludesAccommodation(serviceType);
  const displayedRoomLabel = hasAccommodation ? roomLabel : "-";
  const bookingLabel = [packageLabel, hasAccommodation ? roomLabel : ""].filter(Boolean).join(" / ");
  const registrationSource = (client.registrationSource || client.registration_source || "").trim();
  const infoLine = [phoneLabel, cityLabel, bookingLabel, registrationSource].filter(Boolean).join(" • ");
  const minorClient = isMinor(client.passport?.birthDate || client.birthDate || client.dateOfBirth);
  const secondaryBadges = getClientCompletionBadges(client, lang, program).filter((badge) => badge.key !== status);
  const incompleteTooltip = status === "information_incomplete"
    ? completionTooltip || getClientCompletionTooltip(client, lang, program)
    : "";

  const handleRowClick = () => {
    if (selectMode && showCheckbox) {
      onCheck?.();
      return;
    }
    onClick?.();
  };

  React.useEffect(() => {
    if (!menuOpen) return;
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          btnRef.current  && !btnRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  React.useEffect(() => {
    if (selectMode && menuOpen) {
      setMenuOpen(false);
    }
  }, [selectMode, menuOpen]);

  React.useEffect(() => {
    if (!menuOpen) return;
    const closeOnScroll = () => setMenuOpen(false);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => window.removeEventListener("scroll", closeOnScroll, true);
  }, [menuOpen]);

  return (
    <div
      className="animate-fadeInUp"
      style={{ animationDelay: `${index * .025}s` }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div
        style={{
          display: "flex",
          gap: 9,
          padding: "8px 12px",
          background: isChecked
            ? "rgba(212,175,55,.12)"
            : hov
            ? "rgba(212,175,55,.05)"
            : "rgba(255,255,255,.02)",
          border: `1px solid ${
            isChecked
              ? "rgba(212,175,55,.35)"
              : hov
              ? "rgba(212,175,55,.2)"
              : "rgba(255,255,255,.05)"
          }`,
          borderRadius: 10,
          transition: "all .15s",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          onClick={handleRowClick}
          style={{
            display: "grid",
            gridTemplateColumns: gridTemplate || "50px minmax(240px,2fr) 120px 135px 120px 120px 120px 120px 100px",
            gap: 10,
            flex: 1,
            minWidth: 0,
            width: "100%",
            cursor: "pointer",
            alignItems: "center",
          }}
        >
          {showCheckbox && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                  e.stopPropagation();
                  onCheck?.();
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 18, height: 18, accentColor: tc.gold, cursor: "pointer" }}
              />
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 11, color: tc.grey, fontWeight: 600, width: 20, textAlign: "center" }}>
              {index + 1}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: "linear-gradient(135deg,rgba(212,175,55,.25),rgba(212,175,55,.08))",
                  border: "1px solid rgba(212,175,55,.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  color: tc.gold,
                }}
              >
                {avatarInitial}
              </div>
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              minWidth: 0,
              flexWrap: "wrap",
              direction: isRTL ? "rtl" : "ltr",
            }}>
              <p style={{ fontWeight: 700, fontSize: 12.5, color: tc.white, margin: 0, minWidth: 0 }}>
                {fallbackName || "—"}
              </p>
              {minorClient && (
                <span style={{
                  fontSize: 9.5,
                  lineHeight: 1.4,
                  fontWeight: 800,
                  padding: "1px 7px",
                  borderRadius: 999,
                  background: "rgba(59,130,246,.1)",
                  border: "1px solid rgba(59,130,246,.2)",
                  color: "var(--rukn-text-strong)",
                  whiteSpace: "nowrap",
                }}>
                  {t.minorBadge || (lang === "fr" ? "Mineur" : lang === "en" ? "Minor" : "قاصر")}
                </span>
              )}
              {secondaryBadges.map((badge) => (
                <span key={badge.key} title={badge.title || badge.label} style={completionBadgeStyle(badge.tone)}>
                  {badge.label}
                </span>
              ))}
            </div>
            <p style={{ fontSize: 10.5, color: tc.grey }}>{infoLine || "—"}</p>
          </div>
          <span style={{ color: tc.grey, textAlign: "center", fontSize: 11 }}>
            {displayedRoomLabel || "—"}
          </span>
          <span style={{ display:"flex", justifyContent:"center", minWidth:0 }}>
            <span style={{
              maxWidth:"100%",
              padding:"3px 8px",
              borderRadius:999,
              border:"1px solid rgba(212,175,55,.18)",
              background:"rgba(212,175,55,.08)",
              color:tc.gold,
              fontSize:10.5,
              fontWeight:800,
              lineHeight:1.4,
              whiteSpace:"nowrap",
              overflow:"hidden",
              textOverflow:"ellipsis",
            }}>
              {serviceTypeLabel}
            </span>
          </span>
          <span style={{ color: tc.gold, fontWeight: 600, textAlign: "center", fontSize: 11 }}>
            {client.ticketNo || "—"}
          </span>
          <span style={{ color: tc.white, fontWeight: 800, textAlign: "center", fontSize: 12 }}>
            {amountLabel}
          </span>
          <span style={{ color: tc.greenLight, fontWeight: 700, textAlign: "center", fontSize: 12 }}>
            {paidLabel}
          </span>
          <span style={{ color: remaining > 0 ? tc.warning : tc.greenLight, fontWeight: 700, textAlign: "center", fontSize: 12 }}>
            {remainingLabel}
          </span>
          <div style={{ textAlign: "center", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }} title={incompleteTooltip || undefined}>
            <StatusBadge status={status} />
            {overpaidLabel && (
              <span style={{
                fontSize:9.5,
                lineHeight:1.2,
                color:tc.grey,
                fontWeight:800,
                whiteSpace:"nowrap",
              }}>
                {overpaidLabel}
              </span>
            )}
          </div>
        </div>
        {!selectMode && (
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              ref={btnRef}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((o) => !o);
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: menuOpen ? "var(--rukn-gold-dim)" : "var(--rukn-bg-soft)",
                border: `1px solid ${
                  menuOpen ? "var(--rukn-border-hover)" : "var(--rukn-border-soft)"
                }`,
                color: menuOpen ? tc.gold : tc.grey,
                cursor: "pointer",
                fontSize: 17,
                fontWeight: 900,
                letterSpacing: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all .15s",
              }}
            >
              ···
            </button>
            {menuOpen &&
              createPortal(
                <div
                  ref={menuRef}
                  style={{
                    position: "fixed",
                    top: menuPos.top,
                    left: menuPos.left,
                    visibility: menuPos.visibility,
                    zIndex: 9999,
                    background: "var(--rukn-menu-bg, rgba(20,30,50,0.96))",
                    border: "1px solid var(--rukn-menu-border, rgba(212,175,55,.3))",
                    borderRadius: 12,
                    boxShadow: "var(--rukn-menu-shadow, 0 10px 25px rgba(0,0,0,0.35))",
                    minWidth: 150,
                    overflow: "hidden",
                  }}
                >
                  <InnerMenuBtn
                    icon="edit"
                    label={t.editLabel || "تعديل"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onEdit();
                    }}
                    color="var(--rukn-text-strong)"
                    hoverBg="var(--rukn-gold-dim)"
                    isRTL={isRTL}
                    border
                  />
                  {onTransfer && (
                    <InnerMenuBtn
                      icon="refresh"
                      label={t.transferClient || "نقل إلى برنامج"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onTransfer();
                      }}
                      color="var(--rukn-text-strong)"
                      hoverBg="var(--rukn-gold-dim)"
                      isRTL={isRTL}
                      border
                    />
                  )}
                  <InnerMenuBtn
                    icon="trash"
                    label={t.deleteLabel || "حذف"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDelete();
                    }}
                    color="var(--rukn-danger)"
                    hoverBg="var(--rukn-danger-dim)"
                    isRTL={isRTL}
                  />
                </div>,
                document.body
              )}
          </div>
        )}
      </div>
    </div>
  );
}

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
        borderBottom: border ? "1px solid var(--rukn-menu-divider, rgba(255,255,255,.06))" : "none",
        color, fontSize:13, fontWeight:600,
        cursor:"pointer", fontFamily:"'Cairo',sans-serif",
        textAlign: isRTL ? "right" : "left",
        transition:"background .15s",
      }}>
      <AppIcon name={icon} size={15} color={color} />
      <span>{label}</span>
    </button>
  );
}
