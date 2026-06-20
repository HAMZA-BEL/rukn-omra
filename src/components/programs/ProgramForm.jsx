import React from "react";
import { createPortal } from "react-dom";
import AirlineSelector from "../AirlineSelector";
import { AppIcon } from "../Icon";
import { Button, GlassCard, Input, Modal, Select } from "../UI";
import { theme } from "../styles";
import { useLang } from "../../hooks/useLang";
import { formatCurrency } from "../../utils/currency";
import { formatAirlineLabel, getProgramAirline } from "../../utils/airlines";
import { normalizeHotelCheckinDay, normalizeMadinahNights, normalizeVisitOrder } from "../../utils/hotelDates";
import { buildPosterTravelRoute, normalizeRouteStops, routeStopsToText } from "../../utils/programRoutes";
import {
  PROGRAM_ROOM_PRICE_KEYS,
  getLegacyFieldsFromPackages,
  getProgramStartingPrice,
  getRoomTypeLabel,
  normalizeProgramPackages,
} from "../../utils/programPackages";
import {
  translateHotelLevel,
  translateProgramType,
  translateRoomType,
} from "../../utils/i18nValues";
import {
  isDuplicateProgramNameAvailable,
  normalizeDuplicateProgramName,
  normalizeProgramType,
} from "../../utils/programDuplicate";
import {
  badgePhonesFromProgram,
  getBadgeContactDefaults,
  programFieldsFromBadgePhones,
  useBadgeTemplates,
} from "../../features/badges";

const tc = theme.colors;
const PHONE_INPUT_STYLE = { direction: "ltr", textAlign: "left" };
const PACKAGE_TEMPLATES = ["اقتصادي", "سياحي", "سياحي بالإفطار"];
const PROGRAM_TYPE_OPTIONS = [
  { value: "عمرة", label: "عمرة" },
  { value: "حج", label: "حج" },
];
const isPlainObject = (value) => value && typeof value === "object" && !Array.isArray(value);

const routeLabels = (lang, t = {}) => ({
  routeTitle: lang === "fr" ? "Itinéraire" : lang === "en" ? "Travel route" : "خط الرحلة",
  routeUnset: lang === "fr" ? "Non défini" : lang === "en" ? "Not set" : "غير محدد",
  routeSet: lang === "fr" ? "Défini" : lang === "en" ? "Set" : "محدد",
  setRoute: lang === "fr" ? "Définir l’itinéraire" : lang === "en" ? "Set route" : "تحديد المسار",
  editRoute: lang === "fr" ? "Modifier l’itinéraire" : lang === "en" ? "Edit route" : "تعديل المسار",
  outbound: lang === "fr" ? "Étapes aller" : lang === "en" ? "Outbound stops" : "محطات الذهاب",
  returnRoute: lang === "fr" ? "Étapes retour" : lang === "en" ? "Return stops" : "محطات العودة",
  posterCustom: lang === "fr" ? "Texte personnalisé pour l’affiche" : lang === "en" ? "Custom poster text" : "نص مخصص للملصق",
  advanced: lang === "fr" ? "Options avancées" : lang === "en" ? "Advanced options" : "خيارات متقدمة",
  preview: lang === "fr" ? "Aperçu de l’itinéraire" : lang === "en" ? "Route preview" : "معاينة خط الرحلة",
  posterPreview: lang === "fr" ? "Itinéraire sur l’affiche" : lang === "en" ? "Poster travel route" : "خط الرحلة في الملصق",
  save: t.save || (lang === "fr" ? "Enregistrer" : lang === "en" ? "Save" : "حفظ"),
  cancel: t.cancel || (lang === "fr" ? "Annuler" : lang === "en" ? "Cancel" : "إلغاء"),
  addStop: lang === "fr" ? "+ Ajouter une étape" : lang === "en" ? "+ Add stop" : "+ إضافة محطة",
  removeStop: lang === "fr" ? "Supprimer l’étape" : lang === "en" ? "Remove stop" : "حذف المحطة",
  stopPlaceholder: lang === "fr" ? "Ville ou station" : lang === "en" ? "City or station" : "مدينة أو محطة",
  saving: lang === "fr" ? "Enregistrement..." : lang === "en" ? "Saving..." : "جاري الحفظ...",
  saved: lang === "fr" ? "Enregistré" : lang === "en" ? "Saved" : "تم الحفظ",
  saveError: lang === "fr"
    ? "Impossible d’enregistrer l’itinéraire. Veuillez réessayer."
    : lang === "en"
      ? "Unable to save the route. Please try again."
      : "تعذر حفظ المسار. حاول مرة أخرى.",
  outboundPlaceholder: lang === "fr" ? "Agadir" : lang === "en" ? "Agadir" : "أكادير",
  returnPlaceholder: lang === "fr" ? "Djeddah" : lang === "en" ? "Jeddah" : "جدة",
  customPlaceholder: lang === "fr"
    ? "Laissez vide pour utiliser les étapes aller et retour"
    : lang === "en"
      ? "Leave empty to use outbound and return stops"
      : "اتركه فارغًا ليستعمل النظام محطات الذهاب والعودة",
  customHelper: lang === "fr"
    ? "Si vous écrivez un texte personnalisé, il s’affichera sur l’affiche au lieu de l’itinéraire automatique."
    : lang === "en"
      ? "If you enter custom text, it will appear on the poster instead of the automatic route."
      : "إذا كتبت نصًا مخصصًا، سيظهر في الملصق بدل المسار التلقائي.",
});

const ensureRouteStopRows = (stops) => {
  const source = Array.isArray(stops) ? stops : normalizeRouteStops(stops);
  return source.length ? source : [""];
};

const cleanDraftRouteStops = (stops) => (
  (Array.isArray(stops) ? stops : [])
    .map((stop) => String(stop || "").trim())
    .filter(Boolean)
);

function RouteStopsEditor({
  title,
  stops,
  placeholder,
  addLabel,
  removeLabel,
  dir,
  onChangeStop,
  onAddStop,
  onRemoveStop,
}) {
  const rows = ensureRouteStopRows(stops);

  return (
    <div style={{ display:"grid", gap:8 }}>
      <label style={{ fontSize:12, fontWeight:800, color:tc.grey }}>
        {title}
      </label>
      <div style={{ display:"grid", gap:7 }}>
        {rows.map((stop, index) => (
          <div
            key={`${title}-${index}`}
            style={{
              display:"grid",
              gridTemplateColumns:"28px 1fr 34px",
              alignItems:"center",
              gap:8,
            }}
          >
            <span style={{
              width:24,
              height:24,
              display:"inline-flex",
              alignItems:"center",
              justifyContent:"center",
              borderRadius:999,
              border:"1px solid var(--rukn-border-soft)",
              color:"var(--rukn-text-muted)",
              background:"var(--rukn-bg-soft)",
              fontSize:11,
              fontWeight:800,
            }}>
              {index + 1}
            </span>
            <input
              value={stop}
              onChange={(event) => onChangeStop(index, event.target.value)}
              placeholder={placeholder}
              style={{
                width:"100%",
                background:"var(--rukn-bg-input)",
                border:"1px solid var(--rukn-border-input)",
                borderRadius:10,
                padding:"9px 12px",
                color:"var(--rukn-text)",
                fontSize:13,
                fontFamily:"'Cairo',sans-serif",
                direction:dir,
                outline:"none",
              }}
            />
            <button
              type="button"
              aria-label={removeLabel}
              title={removeLabel}
              onClick={() => onRemoveStop(index)}
              disabled={rows.length <= 1}
              style={{
                width:32,
                height:32,
                borderRadius:9,
                border:"1px solid var(--rukn-border-soft)",
                background:rows.length <= 1 ? "transparent" : "var(--rukn-bg-soft)",
                color:"var(--rukn-text-muted)",
                cursor:rows.length <= 1 ? "default" : "pointer",
                opacity:rows.length <= 1 ? 0 : 1,
                display:"inline-flex",
                alignItems:"center",
                justifyContent:"center",
              }}
            >
              <AppIcon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        icon="plus"
        onClick={onAddStop}
        style={{ justifySelf:"start", padding:"6px 10px" }}
      >
        {addLabel}
      </Button>
    </div>
  );
}

function RouteSaveOverlay({ done, copy }) {
  const overlay = (
    <div style={{
      position:"fixed",
      inset:0,
      zIndex:13050,
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      background:"rgba(7,12,21,.28)",
      backdropFilter:"blur(14px) saturate(1.15)",
      WebkitBackdropFilter:"blur(14px) saturate(1.15)",
      pointerEvents:"auto",
    }}>
      <style>{`
        @keyframes ruknRoutePlaneOverlay {
          0% { left: 0%; transform: translate(-50%, -50%) rotate(-3deg); opacity: .12; }
          12% { opacity: 1; }
          88% { opacity: 1; }
          100% { left: 100%; transform: translate(-50%, -50%) rotate(3deg); opacity: .16; }
        }
        @keyframes ruknRouteTrail {
          0% { transform: translateX(-75%); opacity: .08; }
          18% { opacity: .58; }
          100% { transform: translateX(230%); opacity: .05; }
        }
        @keyframes ruknRouteSuccessPop {
          0% { transform: translate(-50%, -50%) scale(.82); opacity: .35; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>
      <div style={{
        width:"min(380px, 72vw)",
        display:"grid",
        justifyItems:"center",
        gap:14,
        color:done ? tc.greenLight : "var(--rukn-gold)",
      }}>
        <div style={{
          width:"100%",
          height:42,
          position:"relative",
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
        }}>
          <span style={{
            position:"absolute",
            left:0,
            right:0,
            top:"50%",
            height:2,
            borderRadius:999,
            background:"currentColor",
            opacity:.32,
            boxShadow:"0 0 18px currentColor",
          }} />
          {!done && (
            <span style={{
              position:"absolute",
              left:0,
              top:"50%",
              width:"38%",
              height:2,
              borderRadius:999,
              background:"linear-gradient(90deg, transparent, currentColor)",
              animation:"ruknRouteTrail .78s cubic-bezier(.45, 0, .2, 1) infinite",
            }} />
          )}
          <span style={{
            position:"absolute",
            left:done ? "100%" : "0%",
            top:"50%",
            display:"inline-flex",
            alignItems:"center",
            justifyContent:"center",
            filter:"drop-shadow(0 0 10px currentColor)",
            animation:done ? "ruknRouteSuccessPop .18s ease-out" : "ruknRoutePlaneOverlay .78s cubic-bezier(.45, 0, .2, 1) infinite",
          }}>
            <AppIcon name={done ? "check" : "plane"} size={24} />
          </span>
        </div>
        <div style={{
          display:"grid",
          justifyItems:"center",
          gap:3,
          textAlign:"center",
        }}>
          <strong style={{
            color:done ? tc.greenLight : "var(--rukn-gold)",
            fontSize:14,
            fontWeight:900,
            textShadow:"0 1px 18px rgba(0,0,0,.24)",
          }}>
            {done ? copy.saved : copy.saving}
          </strong>
        </div>
      </div>
    </div>
  );
  if (typeof document === "undefined") return overlay;
  return createPortal(overlay, document.body);
}

const getTravelGroupVisitOrderValue = (source = {}, fallback = "") => {
  const raw = source.visitOrder ?? source.visit_order ?? "";
  const value = String(raw || fallback || "").trim();
  return value ? normalizeVisitOrder(value) : "";
};

const getTravelGroupHotelCheckInValue = (source = {}, fallback = "") => {
  const raw = source.hotelCheckIn
    ?? source.hotel_check_in
    ?? source.hotelCheckinDay
    ?? source.hotel_checkin_day
    ?? "";
  const value = String(raw || fallback || "").trim();
  return value ? normalizeHotelCheckinDay(value) : "";
};

const formatTravelGroupVisitOrder = (value, t = {}) => {
  if (value === "madinah_first") return t.visitOrderMadinahFirst || "المدينة ثم مكة";
  if (value === "makkah_first") return t.visitOrderMakkahFirst || "مكة ثم المدينة";
  return "";
};

const formatTravelGroupHotelCheckIn = (value, t = {}) => {
  if (value === "same_day") return t.sameDayAsDeparture || "نفس يوم الذهاب";
  if (value === "next_day") return t.nextDayAfterDeparture || "اليوم الموالي للذهاب";
  return "";
};

const getBlankTravelGroupDraft = (defaults = {}) => ({
  name: "",
  code: "",
  airline: "",
  departureCity: "",
  arrivalCity: "",
  departureDate: "",
  duration: "",
  returnDate: "",
  visitOrder: getTravelGroupVisitOrderValue(defaults),
  hotelCheckIn: getTravelGroupHotelCheckInValue(defaults),
  returnDepartureCity: "",
  returnArrivalCity: "",
  route: "",
  flightNumbers: "",
  seatCapacity: "",
  notes: "",
  isDefault: false,
});

const normalizeTravelGroupName = (value) => String(value || "").trim().replace(/\s+/g, " ");

const createTravelGroupDraftId = () => (
  `travel-group-draft-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
);

const getTravelGroupUtcDate = (dateValue) => {
  const match = String(dateValue || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  if ([year, month, day].some((part) => Number.isNaN(part))) return null;
  return Date.UTC(year, month - 1, day);
};

const calculateTravelGroupReturnDate = (departureDate, duration) => {
  const start = getTravelGroupUtcDate(departureDate);
  const days = Number(duration);
  if (start === null || !Number.isInteger(days) || days <= 0) return "";
  return new Date(start + (days - 1) * 86400000).toISOString().split("T")[0];
};

const getTravelGroupDurationFromDates = (departureDate, returnDate) => {
  const start = getTravelGroupUtcDate(departureDate);
  const end = getTravelGroupUtcDate(returnDate);
  if (start === null || end === null || end < start) return "";
  return String(Math.round((end - start) / 86400000) + 1);
};

const getTravelGroupDuration = (group = {}) => (
  String(group.duration || group.durationDays || group.duration_days || "").trim()
  || getTravelGroupDurationFromDates(
    group.departureDate || group.departure_date,
    group.returnDate || group.return_date
  )
);

const isMissingProgramTravelGroupsTableError = (error) => {
  const text = typeof error === "string"
    ? error
    : [error?.code, error?.message, error?.details, error?.hint].filter(Boolean).join(" ");
  const lower = text.toLowerCase();
  return lower.includes("program_travel_groups")
    && (
      lower.includes("does not exist")
      || lower.includes("schema cache")
      || lower.includes("could not find")
      || lower.includes("pgrst205")
      || lower.includes("42p01")
    );
};

const draftFromTravelGroup = (group = {}, defaults = {}) => ({
  name: group.name || "",
  code: group.code || "",
  airline: group.airline || "",
  departureCity: group.departureCity || group.departure_city || "",
  arrivalCity: group.arrivalCity || group.arrival_city || "",
  departureDate: group.departureDate || group.departure_date || "",
  duration: getTravelGroupDuration(group),
  returnDate: group.returnDate || group.return_date || "",
  visitOrder: getTravelGroupVisitOrderValue(group, getTravelGroupVisitOrderValue(defaults)),
  hotelCheckIn: getTravelGroupHotelCheckInValue(group, getTravelGroupHotelCheckInValue(defaults)),
  returnDepartureCity: group.returnDepartureCity || group.return_departure_city || "",
  returnArrivalCity: group.returnArrivalCity || group.return_arrival_city || "",
  route: group.route || "",
  flightNumbers: group.flightNumbers || group.flight_numbers || "",
  seatCapacity: group.seatCapacity ?? group.seat_capacity ?? "",
  notes: group.notes || "",
  isDefault: Boolean(group.isDefault ?? group.is_default),
});

const formatTravelGroupDateRange = (group = {}) => {
  const departureDate = group.departureDate || group.departure_date || "";
  const returnDate = group.returnDate || group.return_date || "";
  if (departureDate && returnDate) return `${departureDate} → ${returnDate}`;
  return departureDate || returnDate || "";
};

const prepareTravelGroupPayload = (draft = {}) => {
  const seatText = String(draft.seatCapacity ?? "").trim();
  const seatCapacity = seatText ? Number(seatText) : null;
  const returnDate = calculateTravelGroupReturnDate(draft.departureDate, draft.duration);
  return {
    name: normalizeTravelGroupName(draft.name),
    code: String(draft.code || "").trim(),
    airline: String(draft.airline || "").trim(),
    departureCity: String(draft.departureCity || "").trim(),
    arrivalCity: String(draft.arrivalCity || "").trim(),
    departureDate: String(draft.departureDate || "").trim(),
    returnDate,
    visitOrder: normalizeVisitOrder(draft.visitOrder),
    hotelCheckIn: normalizeHotelCheckinDay(draft.hotelCheckIn),
    returnDepartureCity: String(draft.returnDepartureCity || "").trim(),
    returnArrivalCity: String(draft.returnArrivalCity || "").trim(),
    route: String(draft.route || "").trim(),
    flightNumbers: String(draft.flightNumbers || "").trim(),
    seatCapacity,
    notes: String(draft.notes || "").trim(),
    isDefault: Boolean(draft.isDefault),
  };
};

function TravelGroupRouteModal({ open, routeValue, routeCopy, dir, onClose, onSave }) {
  const [advancedOpen, setAdvancedOpen] = React.useState(Boolean(routeValue));
  const [draft, setDraft] = React.useState(() => ({
    outboundRouteStops: ensureRouteStopRows(normalizeRouteStops(routeValue)),
    returnRouteStops: [""],
    posterTravelRoute: routeValue || "",
  }));

  React.useEffect(() => {
    if (!open) return;
    setDraft({
      outboundRouteStops: ensureRouteStopRows(normalizeRouteStops(routeValue)),
      returnRouteStops: [""],
      posterTravelRoute: routeValue || "",
    });
    setAdvancedOpen(Boolean(routeValue));
  }, [open, routeValue]);

  const setRouteDraftField = (key) => (event) => {
    const value = event.target.value;
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const setRouteDraftStop = (key) => (index, value) => {
    const splitStops = /[\/←]/.test(value) ? normalizeRouteStops(value) : null;
    setDraft((current) => {
      const rows = ensureRouteStopRows(current[key]);
      const next = splitStops?.length
        ? [...rows.slice(0, index), ...splitStops, ...rows.slice(index + 1)]
        : rows.map((stop, stopIndex) => (stopIndex === index ? value : stop));
      return { ...current, [key]: ensureRouteStopRows(next) };
    });
  };
  const addRouteDraftStop = (key) => () => {
    setDraft((current) => ({ ...current, [key]: [...ensureRouteStopRows(current[key]), ""] }));
  };
  const removeRouteDraftStop = (key) => (index) => {
    setDraft((current) => {
      const next = ensureRouteStopRows(current[key]).filter((_, stopIndex) => stopIndex !== index);
      return { ...current, [key]: ensureRouteStopRows(next) };
    });
  };
  const routePreview = React.useMemo(() => {
    const customRoute = String(draft.posterTravelRoute || "").trim();
    if (customRoute) return customRoute;
    const outboundRoute = routeStopsToText(cleanDraftRouteStops(draft.outboundRouteStops));
    const returnRoute = routeStopsToText(cleanDraftRouteStops(draft.returnRouteStops));
    return [outboundRoute, returnRoute].filter(Boolean).join(" / ");
  }, [draft]);

  return (
    <Modal open={open} onClose={onClose} title={routeCopy.routeTitle} width={520}>
      <div style={{ display:"grid", gap:14 }}>
        <RouteStopsEditor
          title={routeCopy.outbound}
          stops={draft.outboundRouteStops}
          placeholder={routeCopy.outboundPlaceholder}
          addLabel={routeCopy.addStop}
          removeLabel={routeCopy.removeStop}
          dir={dir}
          onChangeStop={setRouteDraftStop("outboundRouteStops")}
          onAddStop={addRouteDraftStop("outboundRouteStops")}
          onRemoveStop={removeRouteDraftStop("outboundRouteStops")}
        />
        <RouteStopsEditor
          title={routeCopy.returnRoute}
          stops={draft.returnRouteStops}
          placeholder={routeCopy.returnPlaceholder}
          addLabel={routeCopy.addStop}
          removeLabel={routeCopy.removeStop}
          dir={dir}
          onChangeStop={setRouteDraftStop("returnRouteStops")}
          onAddStop={addRouteDraftStop("returnRouteStops")}
          onRemoveStop={removeRouteDraftStop("returnRouteStops")}
        />
        <button
          type="button"
          onClick={() => setAdvancedOpen((current) => !current)}
          style={{
            border:"1px solid var(--rukn-border-soft)",
            background:"var(--rukn-bg-soft)",
            color:"var(--rukn-text)",
            borderRadius:12,
            padding:"9px 11px",
            cursor:"pointer",
            display:"flex",
            alignItems:"center",
            justifyContent:"space-between",
            gap:10,
            fontFamily:"'Cairo',sans-serif",
            fontSize:12,
            fontWeight:800,
          }}
        >
          <span>{routeCopy.advanced}</span>
          <span style={{ color:tc.gold }}>{advancedOpen ? "▴" : "▾"}</span>
        </button>
        {advancedOpen && (
          <div style={{ display:"grid", gap:7 }}>
            <label style={{ fontSize:12, fontWeight:700, color:tc.grey }}>
              {routeCopy.posterCustom}
            </label>
            <textarea
              value={draft.posterTravelRoute}
              onChange={setRouteDraftField("posterTravelRoute")}
              placeholder={routeCopy.customPlaceholder}
              rows={2}
              style={{
                width:"100%",
                background:"var(--rukn-bg-input)",
                border:"1px solid var(--rukn-border-input)",
                borderRadius:10,
                padding:"10px 14px",
                color:"var(--rukn-text)",
                fontSize:13,
                fontFamily:"'Cairo',sans-serif",
                outline:"none",
                resize:"vertical",
              }}
            />
          </div>
        )}
        <div style={{
          border:"1px solid var(--rukn-border-soft)",
          background:"var(--rukn-bg-soft)",
          borderRadius:12,
          padding:12,
        }}>
          <p style={{ fontSize:11, color:tc.grey, fontWeight:800, marginBottom:5 }}>
            {routeCopy.preview}
          </p>
          <p style={{ margin:0, fontSize:13, color:routePreview ? "var(--rukn-text)" : "var(--rukn-text-muted)", lineHeight:1.7 }}>
            {routePreview || routeCopy.routeUnset}
          </p>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, flexWrap:"wrap" }}>
          <Button variant="ghost" onClick={onClose}>{routeCopy.cancel}</Button>
          <Button
            variant="primary"
            icon="save"
            onClick={() => {
              onSave(routePreview);
              onClose();
            }}
          >
            {routeCopy.save}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function TravelGroupMeta({ label, value }) {
  return (
    <div style={{ display:"grid", gap:3, minWidth:0 }}>
      <span style={{ color:"var(--rukn-text-muted)", fontSize:10, fontWeight:800 }}>{label}</span>
      <span style={{ color:"var(--rukn-text)", fontSize:12, fontWeight:800, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
        {value}
      </span>
    </div>
  );
}

function ProgramTravelGroupsSection({
  programId,
  programDefaults,
  store,
  routeCopy,
  t = {},
  dir,
  draftMode = false,
  draftGroups = [],
  onDraftGroupsChange,
  onTravelGroupsChanged,
  programClientsSource = null,
  lang = "ar",
}) {
  const groups = React.useMemo(() => (
    (draftMode
      ? draftGroups
      : (store.programTravelGroups || [])
        .filter((group) => String(group.programId || group.program_id || "") === String(programId || "")))
      .slice()
      .sort((a, b) => (
        (Number(a.sortOrder ?? a.sort_order) || 0) - (Number(b.sortOrder ?? b.sort_order) || 0)
        || String(a.name || "").localeCompare(String(b.name || ""), "ar")
      ))
  ), [draftGroups, draftMode, programId, store.programTravelGroups]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState("");
  const [draft, setDraft] = React.useState(getBlankTravelGroupDraft);
  const [errors, setErrors] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  const [routeModalOpen, setRouteModalOpen] = React.useState(false);
  const [programClients, setProgramClients] = React.useState([]);
  const [deletingId, setDeletingId] = React.useState("");

  const loadProgramTravelGroups = store.loadProgramTravelGroups;

  React.useEffect(() => {
    let cancelled = false;
    if (draftMode || !programId || !loadProgramTravelGroups) return undefined;
    setLoading(true);
    setLoadError("");
    loadProgramTravelGroups(programId)
      .then((result) => {
        if (cancelled) return;
        if (result?.error) {
          if (isMissingProgramTravelGroupsTableError(result.error)) {
            console.warn("[ProgramTravelGroups] program_travel_groups table is not available yet:", result.error);
            setLoadError("");
            return;
          }
          setLoadError("تعذر تحميل أفواج السفر");
        }
      })
      .catch((error) => {
        if (cancelled) return;
        if (isMissingProgramTravelGroupsTableError(error)) {
          console.warn("[ProgramTravelGroups] program_travel_groups table is not available yet:", error);
          setLoadError("");
          return;
        }
        setLoadError("تعذر تحميل أفواج السفر");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [draftMode, loadProgramTravelGroups, programId]);

  React.useEffect(() => {
    let cancelled = false;
    if (draftMode || !programId) {
      setProgramClients([]);
      return undefined;
    }
    const localClients = (store.clients || []).filter((client) => (
      String(client.programId || client.program_id || "") === String(programId)
      && !client.deleted
      && !client.deletedAt
      && !client.deleted_at
      && !client.archived
      && !client.archivedAt
      && !client.archived_at
    ));
    if (Array.isArray(programClientsSource)) {
      setProgramClients(programClientsSource.filter((client) => (
        String(client.programId || client.program_id || "") === String(programId)
        && !client.deleted
        && !client.deletedAt
        && !client.deleted_at
        && !client.archived
        && !client.archivedAt
        && !client.archived_at
      )));
      return undefined;
    }
    if (!store.isSupabaseEnabled || store.clientsLoaded) {
      setProgramClients(localClients);
      return undefined;
    }
    if (typeof store.loadProgramDetailData !== "function") {
      setProgramClients(localClients);
      return undefined;
    }
    store.loadProgramDetailData(programId)
      .then((result) => {
        if (!cancelled && !result?.error) {
          setProgramClients(Array.isArray(result?.clients) ? result.clients : localClients);
        }
      })
      .catch((error) => {
        if (!cancelled && process.env.NODE_ENV === "development") {
          console.warn("[ProgramTravelGroups] Program clients could not be loaded for counts.", error);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    draftMode,
    programId,
    programClientsSource,
    store.clients,
    store.clientsLoaded,
    store.isSupabaseEnabled,
    store.loadProgramDetailData,
  ]);

  const assignedClientCounts = React.useMemo(() => (
    programClients.reduce((counts, client) => {
      const travelGroupId = client.travelGroupId ?? client.travel_group_id ?? null;
      if (travelGroupId) {
        const key = String(travelGroupId);
        counts[key] = (counts[key] || 0) + 1;
      }
      return counts;
    }, {})
  ), [programClients]);

  const updateDraft = (key) => (event) => {
    const value = event.target.value;
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: "" } : current));
  };

  React.useEffect(() => {
    setDraft((current) => {
      const returnDate = calculateTravelGroupReturnDate(current.departureDate, current.duration);
      return current.returnDate === returnDate ? current : { ...current, returnDate };
    });
  }, [draft.departureDate, draft.duration]);

  const openAddForm = () => {
    setEditingId("");
    setDraft(getBlankTravelGroupDraft(programDefaults));
    setErrors({});
    setFormOpen(true);
  };

  const openEditForm = (group) => {
    setEditingId(group.id);
    setDraft(draftFromTravelGroup(group, programDefaults));
    setErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingId("");
    setDraft(getBlankTravelGroupDraft());
    setErrors({});
  };

  const validateDraft = () => {
    const nextErrors = {};
    const cleanName = normalizeTravelGroupName(draft.name);
    if (!cleanName) nextErrors.name = "اسم الفوج مطلوب";
    const duplicate = groups.some((group) => (
      String(group.id || "") !== String(editingId || "")
      && normalizeTravelGroupName(group.name).toLowerCase() === cleanName.toLowerCase()
    ));
    if (duplicate) nextErrors.name = "يوجد فوج سفر بنفس الاسم داخل هذا البرنامج";
    if (String(draft.seatCapacity ?? "").trim()) {
      const seats = Number(draft.seatCapacity);
      if (!Number.isInteger(seats) || seats <= 0) {
        nextErrors.seatCapacity = "عدد المقاعد يجب أن يكون رقماً صحيحاً موجباً";
      }
    }
    if (String(draft.duration ?? "").trim()) {
      const days = Number(draft.duration);
      if (!Number.isInteger(days) || days <= 0) {
        nextErrors.duration = "المدة يجب أن تكون رقماً صحيحاً موجباً";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveGroup = async () => {
    if (!validateDraft()) return;
    const payload = prepareTravelGroupPayload(draft);
    if (draftMode) {
      onDraftGroupsChange?.((current = []) => {
        if (editingId) {
          return current.map((group) => (
            String(group.id || "") === String(editingId)
              ? { ...group, ...payload, id: group.id }
              : group
          ));
        }
        return [
          ...current,
          {
            ...payload,
            id: createTravelGroupDraftId(),
            sortOrder: current.length,
          },
        ];
      });
      setFormOpen(false);
      setEditingId("");
      setDraft(getBlankTravelGroupDraft());
      setErrors({});
      return;
    }
    setSaving(true);
    try {
      const result = editingId
        ? await store.updateProgramTravelGroup?.(editingId, payload)
        : await store.createProgramTravelGroup?.(programId, payload);
      if (result?.error) {
        setErrors({ form: "تعذر حفظ فوج السفر. حاول مرة أخرى." });
        return;
      }
      setFormOpen(false);
      setEditingId("");
      setDraft(getBlankTravelGroupDraft());
      setErrors({});
    } catch (error) {
      console.error("[ProgramTravelGroups]", error);
      setErrors({ form: "تعذر حفظ فوج السفر. حاول مرة أخرى." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (group) => {
    if (!group?.id) return;
    const assignedClients = programClients.filter((client) => (
      String(client.travelGroupId ?? client.travel_group_id ?? "") === String(group.id)
    ));
    const assignedCount = assignedClients.length;
    const confirmationMessage = assignedCount > 0
      ? (
        lang === "fr"
          ? `Ce groupe contient ${assignedCount} pèlerins. Si vous le supprimez, ils seront automatiquement replacés dans le programme principal. Voulez-vous continuer ?`
          : lang === "en"
            ? `This group contains ${assignedCount} pilgrims. If you delete it, they will be moved back to the main program. Do you want to continue?`
            : `هذا الفوج يحتوي على ${assignedCount} حاجا. إذا حذفته، سيتم إرجاعهم تلقائيا إلى البرنامج الأساسي. هل تريد المتابعة؟`
      )
      : "هل تريد حذف فوج السفر؟\nسيتم حذف هذا الفوج من البرنامج.";
    if (!window.confirm(confirmationMessage)) return;
    if (draftMode) {
      onDraftGroupsChange?.((current = []) => (
        current.filter((item) => String(item.id || "") !== String(group.id || ""))
      ));
      if (String(editingId || "") === String(group.id || "")) closeForm();
      return;
    }
    setDeletingId(String(group.id));
    setLoadError("");
    try {
      if (typeof store.clearProgramTravelGroupAssignments !== "function") {
        setLoadError("تعذر إعادة حجاج الفوج إلى البرنامج الأساسي. لم يتم حذف الفوج.");
        return;
      }
      const moveResult = await store.clearProgramTravelGroupAssignments(
        programId,
        group.id,
        assignedClients
      );
      if (moveResult?.error) {
        setLoadError("تعذر إعادة حجاج الفوج إلى البرنامج الأساسي. لم يتم حذف الفوج.");
        return;
      }
      setProgramClients((current) => current.map((client) => (
        String(client.travelGroupId ?? client.travel_group_id ?? "") === String(group.id)
          ? { ...client, travelGroupId: null }
          : client
      )));
      const deleteResult = await store.deleteProgramTravelGroup?.(group.id);
      if (deleteResult?.error) {
        setLoadError("تمت إعادة الحجاج إلى البرنامج الأساسي، لكن تعذر حذف فوج السفر.");
        onTravelGroupsChanged?.({
          programId,
          deletedGroupId: null,
          clients: moveResult?.data || [],
        });
        return;
      }
      if (String(editingId || "") === String(group.id || "")) closeForm();
      onTravelGroupsChanged?.({
        programId,
        deletedGroupId: group.id,
        clients: moveResult?.data || [],
      });
    } catch (error) {
      console.error("[ProgramTravelGroups] Safe group delete failed:", error);
      setLoadError("تعذر حذف فوج السفر. لم يتم إجراء تغييرات غير آمنة.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <GlassCard style={{ padding:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"center", flexWrap:"wrap", marginBottom:14 }}>
        <div>
          <p style={{ fontSize:13, fontWeight:800, color:tc.gold }}>أفواج السفر</p>
          <p style={{ fontSize:11, color:tc.grey, marginTop:3 }}>
            أضف أفواج السفر إذا كان برنامج الحج يحتوي على رحلات أو مدن انطلاق أو شركات طيران مختلفة.
          </p>
        </div>
        <Button variant="primary" size="sm" icon="plus" onClick={openAddForm}>
          إضافة فوج سفر
        </Button>
      </div>
      {loadError && (
        <p style={{ margin:"0 0 10px", color:"var(--rukn-danger)", fontSize:12, fontWeight:800 }}>
          {loadError}
        </p>
      )}
      {loading && (
        <p style={{ margin:0, color:"var(--rukn-text-muted)", fontSize:12 }}>جاري تحميل أفواج السفر...</p>
      )}
      {!loading && groups.length === 0 && !formOpen && (
        <div style={{
          padding:"4px 0 2px",
        }}>
          <p style={{ margin:0, color:"var(--rukn-text-muted)", fontSize:12, fontWeight:800 }}>
            لا توجد أفواج سفر حاليا
          </p>
        </div>
      )}
      {groups.length > 0 && (
        <div style={{ display:"grid", gap:10, marginBottom:formOpen ? 14 : 0 }}>
          {groups.map((group) => {
            const dateRange = formatTravelGroupDateRange(group);
            const duration = getTravelGroupDuration(group);
            const visitOrder = getTravelGroupVisitOrderValue(group);
            const hotelCheckIn = getTravelGroupHotelCheckInValue(group);
            const seatCapacity = group.seatCapacity ?? group.seat_capacity;
            const assignedCount = assignedClientCounts[String(group.id || "")] || 0;
            const assignedCountLabel = seatCapacity
              ? `${assignedCount} / ${seatCapacity}`
              : (
                lang === "fr"
                  ? `${assignedCount} pèlerin${assignedCount === 1 ? "" : "s"}`
                  : lang === "en"
                    ? `${assignedCount} pilgrim${assignedCount === 1 ? "" : "s"}`
                    : `${assignedCount} حاج`
              );
            return (
              <div
                key={group.id}
                style={{
                  border:"1px solid rgba(212,175,55,.16)",
                  background:"rgba(255,255,255,.025)",
                  borderRadius:12,
                  padding:12,
                  display:"grid",
                  gap:10,
                }}
              >
                <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"flex-start", flexWrap:"wrap" }}>
                  <div style={{ minWidth:0, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <strong style={{ color:"var(--rukn-text-strong)", fontSize:13 }}>{group.name}</strong>
                    {!draftMode && (
                      <span style={{
                        display:"inline-flex",
                        alignItems:"center",
                        padding:"1px 7px",
                        borderRadius:999,
                        border:"1px solid rgba(212,175,55,.18)",
                        background:"rgba(212,175,55,.08)",
                        color:tc.gold,
                        fontSize:10,
                        lineHeight:1.4,
                        fontWeight:800,
                        whiteSpace:"nowrap",
                      }}>
                        {assignedCountLabel}
                      </span>
                    )}
                  </div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    <Button variant="ghost" size="sm" onClick={() => openEditForm(group)}>تعديل</Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteGroup(group)}
                      disabled={Boolean(deletingId)}
                    >
                      {String(deletingId) === String(group.id) ? "جاري الحذف..." : "حذف"}
                    </Button>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))", gap:8 }}>
                  {group.airline && <TravelGroupMeta label="شركة الطيران" value={group.airline} />}
                  {dateRange && <TravelGroupMeta label="التواريخ" value={dateRange} />}
                  {duration && <TravelGroupMeta label="المدة" value={`${duration} يوم`} />}
                  {visitOrder && <TravelGroupMeta label="ترتيب الزيارة" value={formatTravelGroupVisitOrder(visitOrder, t)} />}
                  {hotelCheckIn && <TravelGroupMeta label="الدخول للفندق" value={formatTravelGroupHotelCheckIn(hotelCheckIn, t)} />}
                  {group.route && <TravelGroupMeta label="خط الرحلة" value={group.route} />}
                  {seatCapacity ? <TravelGroupMeta label="عدد المقاعد" value={seatCapacity} /> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {formOpen && (
        <div style={{
          border:"1px solid rgba(212,175,55,.22)",
          background:"rgba(255,255,255,.025)",
          borderRadius:12,
          padding:14,
          display:"grid",
          gap:12,
        }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Input label="اسم الفوج" value={draft.name} onChange={updateDraft("name")} placeholder="فوج الدار البيضاء 17 يونيو" required error={errors.name} style={{ gridColumn:"1/-1" }} />
            <AirlineSelector
              label="شركة الطيران"
              value={draft.airline}
              onChange={(airline) => {
                setDraft((current) => ({ ...current, airline: formatAirlineLabel(airline) }));
              }}
            />
            <Input label="تاريخ الذهاب" value={draft.departureDate} onChange={updateDraft("departureDate")} type="date" />
            <Input label="المدة" value={draft.duration} onChange={updateDraft("duration")} type="number" min={1} step={1} error={errors.duration} />
            <Input
              label="تاريخ العودة"
              value={draft.returnDate}
              onChange={() => {}}
              type="date"
              readOnly
              disabled
              inputStyle={{ cursor:"not-allowed", opacity:0.8 }}
            />
            <Select
              label={t.visitOrder || "ترتيب الزيارة"}
              value={draft.visitOrder}
              onChange={updateDraft("visitOrder")}
              options={[
                { value: "madinah_first", label: t.visitOrderMadinahFirst || "المدينة ثم مكة" },
                { value: "makkah_first", label: t.visitOrderMakkahFirst || "مكة ثم المدينة" },
              ]}
            />
            <Select
              label={t.hotelCheckin || "الدخول للفندق"}
              value={draft.hotelCheckIn}
              onChange={updateDraft("hotelCheckIn")}
              options={[
                { value: "same_day", label: t.sameDayAsDeparture || "نفس يوم الذهاب" },
                { value: "next_day", label: t.nextDayAfterDeparture || "اليوم الموالي للذهاب" },
              ]}
            />
            <div style={{ display:"grid", gap:6, gridColumn:"1/-1" }}>
              <label style={{ fontSize:12, fontWeight:600, color:tc.grey }}>
                خط الرحلة
              </label>
              <div style={{
                display:"flex",
                alignItems:"center",
                justifyContent:"space-between",
                gap:8,
                minHeight:42,
                border:"1px solid var(--rukn-border-input)",
                background:"var(--rukn-bg-input)",
                borderRadius:10,
                padding:"6px 8px 6px 10px",
              }}>
                <span style={{
                  minWidth:0,
                  fontSize:12,
                  color:draft.route ? "var(--rukn-gold)" : "var(--rukn-text-muted)",
                  fontWeight:800,
                  overflow:"hidden",
                  textOverflow:"ellipsis",
                  whiteSpace:"nowrap",
                }}>
                  {draft.route || "غير محدد"}
                </span>
                <Button variant="secondary" size="sm" onClick={() => setRouteModalOpen(true)} style={{ padding:"6px 10px", whiteSpace:"nowrap" }}>
                  {draft.route ? "تعديل المسار" : "تحديد المسار"}
                </Button>
              </div>
            </div>
            <Input label="عدد المقاعد" value={draft.seatCapacity} onChange={updateDraft("seatCapacity")} type="number" min={1} step={1} error={errors.seatCapacity} />
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ fontSize:12, fontWeight:600, color:tc.grey, display:"block", marginBottom:6 }}>ملاحظات</label>
              <textarea
                value={draft.notes}
                onChange={updateDraft("notes")}
                rows={2}
                style={{
                  width:"100%",
                  background:"var(--rukn-bg-input)",
                  border:"1px solid var(--rukn-border-input)",
                  borderRadius:10,
                  padding:"10px 14px",
                  color:"var(--rukn-text)",
                  fontSize:13,
                  fontFamily:"'Cairo',sans-serif",
                  outline:"none",
                  resize:"vertical",
                }}
              />
            </div>
          </div>
          {errors.form && (
            <p style={{ margin:0, color:"var(--rukn-danger)", fontSize:12, fontWeight:800 }}>{errors.form}</p>
          )}
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, flexWrap:"wrap" }}>
            <Button variant="ghost" onClick={closeForm} disabled={saving}>إلغاء</Button>
            <Button variant="primary" icon="save" onClick={handleSaveGroup} disabled={saving}>
              {saving ? "جاري الحفظ..." : "حفظ الفوج"}
            </Button>
          </div>
          <TravelGroupRouteModal
            open={routeModalOpen}
            routeValue={draft.route}
            routeCopy={routeCopy}
            dir={dir}
            onClose={() => setRouteModalOpen(false)}
            onSave={(route) => setDraft((current) => ({ ...current, route }))}
          />
        </div>
      )}
    </GlassCard>
  );
}

export default function ProgramForm({
  program,
  store,
  onSave,
  onCancel,
  onTravelGroupsChanged,
  programClients = null,
  badgesEnabled = true,
}) {
  const {
    addProgram,
    addProgramAndWait,
    createProgramTravelGroup,
    updateProgram,
    programs = [],
  } = store;
  const { t, lang, dir } = useLang();
  const isEdit = !!program;
  const createPackage = React.useCallback((level = "اقتصادي") => ({
    id: `pkg-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    level,
    hotelMecca: "",
    hotelMadina: "",
    madinahNights: "",
    mealPlan: "",
    notes: "",
    prices: {},
  }), []);
  const initialPackages = React.useMemo(() => {
    if (program) return normalizeProgramPackages(program).map(({ legacy, ...pkg }) => pkg);
    return [createPackage("اقتصادي")];
  }, [program, createPackage]);
  const badgeContacts = getBadgeContactDefaults(program);
  const initialBadgePhones = badgePhonesFromProgram(program);
  const initialAirline = getProgramAirline(program);
  const hasOriginalRouteFields = Boolean(program) && (
    "outboundRouteText" in program
    || "outbound_route_text" in program
    || "outboundRouteStops" in program
    || "outbound_route_stops" in program
    || "returnRouteText" in program
    || "return_route_text" in program
    || "returnRouteStops" in program
    || "return_route_stops" in program
    || "posterTravelRoute" in program
    || "poster_travel_route" in program
  );
  const initialOutboundStops = normalizeRouteStops(
    program?.outboundRouteStops
      ?? program?.outbound_route_stops
      ?? program?.outboundRouteText
      ?? program?.outbound_route_text
  );
  const initialReturnStops = normalizeRouteStops(
    program?.returnRouteStops
      ?? program?.return_route_stops
      ?? program?.returnRouteText
      ?? program?.return_route_text
  );
  const initialRoute = {
    outboundRouteStops: initialOutboundStops,
    returnRouteStops: initialReturnStops,
    outboundRouteText: program?.outboundRouteText ?? program?.outbound_route_text ?? routeStopsToText(initialOutboundStops),
    returnRouteText: program?.returnRouteText ?? program?.return_route_text ?? routeStopsToText(initialReturnStops),
    posterTravelRoute: program?.posterTravelRoute ?? program?.poster_travel_route ?? "",
  };
  const { templates: badgeTemplates } = useBadgeTemplates({ agencyId: store.agencyId, enabled: badgesEnabled });
  const [form, setForm] = React.useState({
    name:      program?.name      || "",
    type:      normalizeProgramType(program?.type || "عمرة"),
    duration:  program?.duration  || "",
    departure: program?.departure || "",
    returnDate:program?.returnDate|| "",
    visitOrder: normalizeVisitOrder(program?.visitOrder || program?.visit_order),
    hotelCheckinDay: normalizeHotelCheckinDay(program?.hotelCheckinDay || program?.hotel_checkin_day),
    price:     program?.price     || "",
    seats:     program?.seats     || "",
    transport: formatAirlineLabel(initialAirline) || program?.transport || "",
    airlineCode: initialAirline?.code || program?.airlineCode || "",
    airlineName: initialAirline?.name || program?.airlineName || "",
    outboundRouteStops: initialRoute.outboundRouteStops,
    returnRouteStops: initialRoute.returnRouteStops,
    outboundRouteText: initialRoute.outboundRouteText,
    returnRouteText: initialRoute.returnRouteText,
    posterTravelRoute: initialRoute.posterTravelRoute,
    guidePhone: badgeContacts.guidePhone,
    saudiPhone1: badgeContacts.saudiPhone1,
    saudiPhone2: badgeContacts.saudiPhone2,
    badgeNote: badgeContacts.badgeNote,
    badgeTemplateId: program?.badgeTemplateId || "",
    notes:     program?.notes     || "",
  });
  const [badgePhones, setBadgePhones] = React.useState(initialBadgePhones.length ? initialBadgePhones : [badgeContacts.guidePhone || ""]);
  const [errors, setErrors] = React.useState({});
  const [packages, setPackages] = React.useState(initialPackages);
  const [levelMenuOpen, setLevelMenuOpen] = React.useState(false);
  const [routeModalOpen, setRouteModalOpen] = React.useState(false);
  const [routeAdvancedOpen, setRouteAdvancedOpen] = React.useState(Boolean(initialRoute.posterTravelRoute));
  const [routeTouched, setRouteTouched] = React.useState(false);
  const [routeDraft, setRouteDraft] = React.useState(initialRoute);
  const [routeSaving, setRouteSaving] = React.useState(false);
  const [routeSaveDone, setRouteSaveDone] = React.useState(false);
  const [routeSaveError, setRouteSaveError] = React.useState("");
  const [draftTravelGroups, setDraftTravelGroups] = React.useState([]);
  const [createdProgramId, setCreatedProgramId] = React.useState("");
  const [programSaving, setProgramSaving] = React.useState(false);
  const [programSaveError, setProgramSaveError] = React.useState("");
  const levelMenuRef = React.useRef(null);
  const routeSaveTimersRef = React.useRef([]);
  const clearRouteSaveTimers = React.useCallback(() => {
    routeSaveTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    routeSaveTimersRef.current = [];
  }, []);
  React.useEffect(() => clearRouteSaveTimers, [clearRouteSaveTimers]);
  React.useEffect(() => {
    if (!levelMenuOpen) return;
    const handler = (event) => {
      if (levelMenuRef.current && !levelMenuRef.current.contains(event.target)) {
        setLevelMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [levelMenuOpen]);
  const set = k => e => {
    setForm(f=>({...f,[k]:e.target.value}));
    setErrors(prev => (prev[k] ? { ...prev, [k]: "" } : prev));
    if (programSaveError) setProgramSaveError("");
  };
  const routeCopy = React.useMemo(() => routeLabels(lang, t), [lang, t]);
  const isHajjProgram = normalizeProgramType(form.type) === "حج";
  const showTravelGroupsSection = isHajjProgram;
  const travelGroupDefaults = React.useMemo(() => ({
    visitOrder: form.visitOrder,
    hotelCheckinDay: form.hotelCheckinDay,
  }), [form.hotelCheckinDay, form.visitOrder]);
  React.useEffect(() => {
    if (isEdit || isHajjProgram || !draftTravelGroups.length) return;
    setDraftTravelGroups([]);
  }, [draftTravelGroups.length, isEdit, isHajjProgram]);
  const routePreview = React.useMemo(() => buildPosterTravelRoute(form), [form]);
  const routeDraftPreview = React.useMemo(() => buildPosterTravelRoute(routeDraft), [routeDraft]);
  const openRouteModal = () => {
    if (routeSaving) return;
    clearRouteSaveTimers();
    setRouteSaveDone(false);
    setRouteSaveError("");
    const outboundStops = normalizeRouteStops(form.outboundRouteStops).length
      ? normalizeRouteStops(form.outboundRouteStops)
      : normalizeRouteStops(form.outboundRouteText);
    const returnStops = normalizeRouteStops(form.returnRouteStops).length
      ? normalizeRouteStops(form.returnRouteStops)
      : normalizeRouteStops(form.returnRouteText);
    setRouteDraft({
      outboundRouteStops: ensureRouteStopRows(outboundStops),
      returnRouteStops: ensureRouteStopRows(returnStops),
      outboundRouteText: form.outboundRouteText || "",
      returnRouteText: form.returnRouteText || "",
      posterTravelRoute: form.posterTravelRoute || "",
    });
    setRouteAdvancedOpen(Boolean(form.posterTravelRoute));
    setRouteModalOpen(true);
  };
  const setRouteDraftField = (key) => (event) => {
    const value = event.target.value;
    setRouteDraft((current) => ({ ...current, [key]: value }));
  };
  const setRouteDraftStop = (key) => (index, value) => {
    const splitStops = /[\/←]/.test(value) ? normalizeRouteStops(value) : null;
    setRouteDraft((current) => {
      const rows = ensureRouteStopRows(current[key]);
      const next = splitStops?.length
        ? [
          ...rows.slice(0, index),
          ...splitStops,
          ...rows.slice(index + 1),
        ]
        : rows.map((stop, stopIndex) => (stopIndex === index ? value : stop));
      return { ...current, [key]: ensureRouteStopRows(next) };
    });
  };
  const addRouteDraftStop = (key) => () => {
    setRouteDraft((current) => ({
      ...current,
      [key]: [...ensureRouteStopRows(current[key]), ""],
    }));
  };
  const removeRouteDraftStop = (key) => (index) => {
    setRouteDraft((current) => {
      const next = ensureRouteStopRows(current[key]).filter((_, stopIndex) => stopIndex !== index);
      return { ...current, [key]: ensureRouteStopRows(next) };
    });
  };
  const saveRouteDraft = () => {
    if (routeSaving) return;
    clearRouteSaveTimers();
    const outboundRouteStops = cleanDraftRouteStops(routeDraft.outboundRouteStops);
    const returnRouteStops = cleanDraftRouteStops(routeDraft.returnRouteStops);
    const posterTravelRoute = String(routeDraft.posterTravelRoute || "").trim();
    const routeFields = {
      outboundRouteStops,
      returnRouteStops,
      outboundRouteText: routeStopsToText(outboundRouteStops),
      returnRouteText: routeStopsToText(returnRouteStops),
      posterTravelRoute,
    };
    setRouteSaving(true);
    setRouteSaveDone(false);
    setRouteSaveError("");
    const saveTimer = window.setTimeout(async () => {
      try {
        if (isEdit && program?.id) {
          const result = await updateProgram(program.id, routeFields);
          if (result?.error) throw result.error;
        }
        setForm((current) => ({
          ...current,
          ...routeFields,
        }));
        setRouteTouched(true);
        setRouteSaveDone(true);
        const closeTimer = window.setTimeout(() => {
          setRouteModalOpen(false);
          setRouteSaving(false);
          setRouteSaveDone(false);
        }, 280);
        routeSaveTimersRef.current.push(closeTimer);
      } catch (error) {
        console.error("[ProgramForm] Route save failed:", error);
        setRouteSaveError(routeCopy.saveError);
        setRouteSaving(false);
        setRouteSaveDone(false);
      }
    }, 520);
    routeSaveTimersRef.current.push(saveTimer);
  };
  const setPackageField = (index, key, value) => {
    setPackages(prev => prev.map((pkg, i) => i === index ? { ...pkg, [key]: value } : pkg));
  };
  const setPackagePrice = (index, key, value) => {
    setPackages(prev => prev.map((pkg, i) => {
      if (i !== index) return pkg;
      return { ...pkg, prices: { ...(pkg.prices || {}), [key]: value } };
    }));
  };
  const setBadgePhone = (index, value) => {
    setBadgePhones(prev => prev.map((phone, i) => i === index ? value : phone));
  };
  const addBadgePhone = () => {
    setBadgePhones(prev => prev.length >= 3 ? prev : [...prev, ""]);
  };
  const removeBadgePhone = (index) => {
    setBadgePhones(prev => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [""];
    });
  };
  const addPackage = (level = "اقتصادي") => {
    setPackages(prev => [createPackage(level), ...prev]);
    setLevelMenuOpen(false);
  };
  const removePackage = (index) => setPackages(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== index));

  const cleanPackages = React.useCallback(() => packages.map((pkg, index) => {
    const prices = {};
    PROGRAM_ROOM_PRICE_KEYS.forEach((key) => {
      const raw = pkg.prices?.[key];
      if (raw === "" || raw === null || raw === undefined) return;
      const value = Number(raw);
      if (Number.isFinite(value) && value >= 0) prices[key] = value;
    });
    ["child", "infant"].forEach((legacyKey) => {
      const raw = pkg.prices?.[legacyKey];
      if (raw === "" || raw === null || raw === undefined) return;
      const value = Number(raw);
      if (Number.isFinite(value) && value >= 0) prices[legacyKey] = value;
    });
    return {
      id: pkg.id || `pkg-${index + 1}`,
      level: (pkg.level || "").trim() || `مستوى ${index + 1}`,
      hotelMecca: (pkg.hotelMecca || "").trim(),
      hotelMadina: (pkg.hotelMadina || "").trim(),
      madinahNights: normalizeMadinahNights(pkg.madinahNights),
      mealPlan: (pkg.mealPlan || "").trim(),
      notes: (pkg.notes || "").trim(),
      prices,
      ...(isPlainObject(pkg.programCosting) ? { programCosting: pkg.programCosting } : {}),
    };
  }), [packages]);

  React.useEffect(() => {
    const days = Number(form.duration);
    if (!form.departure || !Number.isFinite(days) || days <= 0) {
      setForm(prev => (prev.returnDate ? { ...prev, returnDate: "" } : prev));
      return;
    }
    const parts = form.departure.split("-");
    if (parts.length !== 3) {
      setForm(prev => (prev.returnDate ? { ...prev, returnDate: "" } : prev));
      return;
    }
    const [year, month, day] = parts.map(Number);
    if ([year, month, day].some(v => Number.isNaN(v))) {
      setForm(prev => (prev.returnDate ? { ...prev, returnDate: "" } : prev));
      return;
    }
    const utcBase = Date.UTC(year, month - 1, day);
    const ms = utcBase + (days - 1) * 86400000;
    const iso = new Date(ms).toISOString().split("T")[0];
    setForm(prev => (prev.returnDate === iso ? prev : { ...prev, returnDate: iso }));
  }, [form.departure, form.duration]);
  const programTypeOptions = PROGRAM_TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label: translateProgramType(option.value, lang),
  }));

  const handleSave = async () => {
    if (programSaving) return;
    const nextErrors = {};
    const cleanName = normalizeDuplicateProgramName(form.name);
    if (!cleanName || !String(form.seats || "").trim()) {
      alert(t.programNameSeatsRequired || "يرجى إدخال اسم البرنامج وعدد المقاعد");
      return;
    }
    if (!isDuplicateProgramNameAvailable(cleanName, programs, {
      excludeProgramId: program?.id || createdProgramId,
    })) {
      nextErrors.name = lang === "ar"
        ? "يوجد برنامج آخر بنفس الاسم"
        : t.programDuplicateNameExists || "يوجد برنامج آخر بنفس الاسم";
    }
    const selectedAirline = getProgramAirline(form);
    if (!selectedAirline?.code) nextErrors.transport = t.transportError || "يرجى اختيار شركة الطيران";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    const priceTable = cleanPackages();
    const legacyFields = getLegacyFieldsFromPackages(priceTable, program || form);
    const phoneFields = programFieldsFromBadgePhones(badgePhones);
    const {
      outboundRouteStops,
      returnRouteStops,
      outboundRouteText,
      returnRouteText,
      posterTravelRoute,
      ...baseForm
    } = form;
    const cleanedOutboundRouteStops = normalizeRouteStops(outboundRouteStops);
    const cleanedReturnRouteStops = normalizeRouteStops(returnRouteStops);
    const routeFields = (!isEdit || routeTouched || hasOriginalRouteFields)
      ? {
        outboundRouteStops: cleanedOutboundRouteStops,
        returnRouteStops: cleanedReturnRouteStops,
        outboundRouteText: String(outboundRouteText || routeStopsToText(cleanedOutboundRouteStops) || "").trim(),
        returnRouteText: String(returnRouteText || routeStopsToText(cleanedReturnRouteStops) || "").trim(),
        posterTravelRoute: String(posterTravelRoute || "").trim(),
      }
      : {};
    const data = {
      ...baseForm,
      ...legacyFields,
      ...phoneFields,
      ...routeFields,
      name: cleanName,
      type: normalizeProgramType(form.type),
      visitOrder: normalizeVisitOrder(form.visitOrder),
      hotelCheckinDay: normalizeHotelCheckinDay(form.hotelCheckinDay),
      price: Number(legacyFields.price || 0),
      seats: Number(form.seats),
      transport: formatAirlineLabel(selectedAirline),
      airlineCode: selectedAirline.code,
      airlineName: selectedAirline.name,
      badgeNote: String(form.badgeNote || "").trim(),
      badgeTemplateId: String(form.badgeTemplateId || "").trim(),
      priceTable,
    };
    if (isEdit) {
      updateProgram(program.id, data);
      onSave();
      return;
    }

    setProgramSaving(true);
    setProgramSaveError("");
    try {
      let targetProgramId = createdProgramId;
      if (!targetProgramId) {
        const createResult = typeof addProgramAndWait === "function"
          ? await addProgramAndWait(data)
          : { data: addProgram(data), error: null };
        if (createResult?.error || !createResult?.data?.id) {
          console.error("[ProgramTravelGroups] Program creation failed before saving draft groups:", createResult?.error);
          setProgramSaveError("تعذر إنشاء البرنامج. لم يتم حفظ أفواج السفر.");
          return;
        }
        targetProgramId = createResult.data.id;
        setCreatedProgramId(targetProgramId);
      }

      if (isHajjProgram && draftTravelGroups.length) {
        const failedGroups = [];
        for (const group of draftTravelGroups) {
          const { id: _draftId, sortOrder, ...groupData } = group;
          try {
            const result = await createProgramTravelGroup?.(targetProgramId, {
              ...groupData,
              sortOrder,
            });
            if (result?.error || !result?.data) {
              failedGroups.push(group);
              console.error("[ProgramTravelGroups] Draft group save failed:", {
                programId: targetProgramId,
                group: group.name,
                error: result?.error || new Error("missing-created-travel-group"),
              });
            }
          } catch (error) {
            failedGroups.push(group);
            console.error("[ProgramTravelGroups] Draft group save failed:", {
              programId: targetProgramId,
              group: group.name,
              error,
            });
          }
        }
        if (failedGroups.length) {
          setDraftTravelGroups(failedGroups);
          setProgramSaveError(
            `تم إنشاء البرنامج، لكن تعذر حفظ ${failedGroups.length} من أفواج السفر. حاول الحفظ مرة أخرى.`
          );
          return;
        }
      }

      setDraftTravelGroups([]);
      onSave();
    } finally {
      setProgramSaving(false);
    }
  };

  const packageCount = packages.length;
  const startingPrice = getProgramStartingPrice({ ...form, priceTable: cleanPackages() });
  const summaryPrice = startingPrice ? formatCurrency(startingPrice, lang) : "—";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <GlassCard gold style={{ padding:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, marginBottom:14 }}>
          <p style={{ fontSize:13, fontWeight:800, color:tc.gold }}>{t.programInfo || "معلومات البرنامج"}</p>
          <span style={{ fontSize:12, color:tc.grey }}>
            {packageCount} {t.levels || "مستويات"} • {(t.fromPrice || "ابتداءً من {price}").replace("{price}", summaryPrice)}
          </span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <Input label={t.program} value={form.name} onChange={set("name")} required error={errors.name} style={{gridColumn:"1/-1"}}/>
          <Select label={t.programType} value={form.type} onChange={set("type")}
            options={programTypeOptions}/>
          <Input
            label={t.duration}
            value={form.duration}
            onChange={set("duration")}
            placeholder={t.durationPlaceholder}
            type="number"
            min={1}
          />
          <Input label={t.departure} value={form.departure} onChange={set("departure")} type="date"/>
          <Input
            label={t.returnDate}
            value={form.returnDate}
            onChange={() => {}}
            type="date"
            readOnly
            disabled
            inputStyle={{ cursor:"not-allowed", opacity:0.8 }}
          />
          <Select
            label={t.visitOrder || "ترتيب الزيارة"}
            value={form.visitOrder}
            onChange={set("visitOrder")}
            options={[
              { value: "madinah_first", label: t.visitOrderMadinahFirst || "المدينة ثم مكة" },
              { value: "makkah_first", label: t.visitOrderMakkahFirst || "مكة ثم المدينة" },
            ]}
          />
          <Select
            label={t.hotelCheckin || "الدخول للفندق"}
            value={form.hotelCheckinDay}
            onChange={set("hotelCheckinDay")}
            options={[
              { value: "same_day", label: t.sameDayAsDeparture || "نفس يوم الذهاب" },
              { value: "next_day", label: t.nextDayAfterDeparture || "اليوم الموالي للذهاب" },
            ]}
          />
          <AirlineSelector
            label={t.transport}
            value={form.transport}
            onChange={(airline) => {
              setForm(prev => ({
                ...prev,
                transport: formatAirlineLabel(airline),
                airlineCode: airline.code,
                airlineName: airline.name,
              }));
              setErrors(prev => (prev.transport ? { ...prev, transport: "" } : prev));
            }}
            required
            error={errors.transport}
          />
          <Input label={t.seats} value={form.seats} onChange={set("seats")} type="number" required/>
          <div style={{
            display:"grid",
            gap:6,
            alignSelf:"end",
          }}>
            <label style={{ fontSize:12, fontWeight:600, color:tc.grey }}>
              {routeCopy.routeTitle}
            </label>
            <div style={{
              display:"flex",
              alignItems:"center",
              justifyContent:"space-between",
              gap:8,
              minHeight:42,
              border:"1px solid var(--rukn-border-input)",
              background:"var(--rukn-bg-input)",
              borderRadius:10,
              padding:"6px 8px 6px 10px",
            }}>
              <span style={{
                minWidth:0,
                fontSize:12,
                color:routePreview ? "var(--rukn-gold)" : "var(--rukn-text-muted)",
                fontWeight:800,
                whiteSpace:"nowrap",
              }}>
                {routePreview ? routeCopy.routeSet : routeCopy.routeUnset}
              </span>
              <Button variant="secondary" size="sm" onClick={openRouteModal} style={{ padding:"6px 10px", whiteSpace:"nowrap" }}>
                {routePreview ? routeCopy.editRoute : routeCopy.setRoute}
              </Button>
            </div>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={{ fontSize:12, fontWeight:600, color:tc.grey, display:"block", marginBottom:6 }}>{t.notes}</label>
            <textarea value={form.notes} onChange={set("notes")} rows={2}
              style={{ width:"100%", background:"var(--rukn-bg-input)",
                border:"1px solid var(--rukn-border-input)", borderRadius:10,
                padding:"10px 14px", color:"var(--rukn-text)", fontSize:13,
                fontFamily:"'Cairo',sans-serif", outline:"none", resize:"vertical" }} />
          </div>
        </div>
      </GlassCard>

      <Modal
        open={routeModalOpen}
        onClose={() => {
          if (!routeSaving) setRouteModalOpen(false);
        }}
        title={routeCopy.routeTitle}
        width={520}
      >
        <div style={{ position:"relative" }}>
          <div style={{
            display:"grid",
            gap:14,
            filter:routeSaving || routeSaveDone ? "blur(1.5px)" : "none",
            opacity:routeSaving || routeSaveDone ? 0.44 : 1,
            pointerEvents:routeSaving || routeSaveDone ? "none" : "auto",
            transition:"filter .18s ease, opacity .18s ease",
          }}>
            <RouteStopsEditor
              title={routeCopy.outbound}
              stops={routeDraft.outboundRouteStops}
              placeholder={routeCopy.outboundPlaceholder}
              addLabel={routeCopy.addStop}
              removeLabel={routeCopy.removeStop}
              dir={dir}
              onChangeStop={setRouteDraftStop("outboundRouteStops")}
              onAddStop={addRouteDraftStop("outboundRouteStops")}
              onRemoveStop={removeRouteDraftStop("outboundRouteStops")}
            />
            <RouteStopsEditor
              title={routeCopy.returnRoute}
              stops={routeDraft.returnRouteStops}
              placeholder={routeCopy.returnPlaceholder}
              addLabel={routeCopy.addStop}
              removeLabel={routeCopy.removeStop}
              dir={dir}
              onChangeStop={setRouteDraftStop("returnRouteStops")}
              onAddStop={addRouteDraftStop("returnRouteStops")}
              onRemoveStop={removeRouteDraftStop("returnRouteStops")}
            />
            <button
              type="button"
              onClick={() => setRouteAdvancedOpen((open) => !open)}
              style={{
                border:"1px solid var(--rukn-border-soft)",
                background:"var(--rukn-bg-soft)",
                color:"var(--rukn-text)",
                borderRadius:12,
                padding:"9px 11px",
                cursor:"pointer",
                display:"flex",
                alignItems:"center",
                justifyContent:"space-between",
                gap:10,
                fontFamily:"'Cairo',sans-serif",
                fontSize:12,
                fontWeight:800,
              }}
            >
              <span>{routeCopy.advanced}</span>
              <span style={{ color:tc.gold }}>{routeAdvancedOpen ? "▴" : "▾"}</span>
            </button>
            {routeAdvancedOpen && (
              <div style={{ display:"grid", gap:7 }}>
                <label style={{ fontSize:12, fontWeight:700, color:tc.grey }}>
                  {routeCopy.posterCustom}
                </label>
                <textarea
                  value={routeDraft.posterTravelRoute}
                  onChange={setRouteDraftField("posterTravelRoute")}
                  placeholder={routeCopy.customPlaceholder}
                  rows={2}
                  style={{
                    width:"100%",
                    background:"var(--rukn-bg-input)",
                    border:"1px solid var(--rukn-border-input)",
                    borderRadius:10,
                    padding:"10px 14px",
                    color:"var(--rukn-text)",
                    fontSize:13,
                    fontFamily:"'Cairo',sans-serif",
                    outline:"none",
                    resize:"vertical",
                  }}
                />
                <p style={{ margin:0, fontSize:11, color:"var(--rukn-text-muted)", lineHeight:1.7 }}>
                  {routeCopy.customHelper}
                </p>
              </div>
            )}
            <GlassCard style={{ padding:12, background:"var(--rukn-bg-soft)", borderColor:"var(--rukn-border-soft)" }}>
              <p style={{ fontSize:11, color:tc.grey, fontWeight:800, marginBottom:5 }}>
                {routeCopy.posterPreview}
              </p>
              <p style={{ margin:0, fontSize:13, color:routeDraftPreview ? "var(--rukn-text)" : "var(--rukn-text-muted)", lineHeight:1.7 }}>
                {routeDraftPreview || routeCopy.routeUnset}
              </p>
            </GlassCard>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:10, flexWrap:"wrap" }}>
              <Button variant="ghost" onClick={() => setRouteModalOpen(false)} disabled={routeSaving}>
                {routeCopy.cancel}
              </Button>
              <Button
                variant="primary"
                icon={routeSaveDone ? "check" : "save"}
                onClick={saveRouteDraft}
                disabled={routeSaving}
              >
                {routeSaving ? routeCopy.saving : routeCopy.save}
              </Button>
            </div>
            {routeSaveError && (
              <p style={{ margin:0, color:"var(--rukn-danger)", fontSize:12, lineHeight:1.6 }}>
                {routeSaveError}
              </p>
            )}
          </div>
          {(routeSaving || routeSaveDone) && (
            <RouteSaveOverlay done={routeSaveDone} copy={routeCopy} />
          )}
        </div>
      </Modal>

      {showTravelGroupsSection && (
        <ProgramTravelGroupsSection
          programId={program?.id || createdProgramId}
          programDefaults={travelGroupDefaults}
          store={store}
          routeCopy={routeCopy}
          t={t}
          dir={dir}
          draftMode={!isEdit}
          draftGroups={draftTravelGroups}
          onDraftGroupsChange={setDraftTravelGroups}
          onTravelGroupsChanged={onTravelGroupsChanged}
          programClientsSource={programClients}
          lang={lang}
        />
      )}

      {badgesEnabled && (
        <GlassCard style={{ padding:16 }}>
          <p style={{ fontSize:13, fontWeight:800, color:tc.gold, marginBottom:6 }}>
            {t.badgeData || "بيانات الشارة"}
          </p>
          <p style={{ fontSize:11, color:tc.grey, marginBottom:14 }}>
            {t.badgeDataHint || "حقول اختيارية ستستخدم لاحقاً في بطاقات المعتمرين."}
          </p>
          <div style={{ display:"grid", gap:12 }}>
            <Input
              label={t.guidePhone || "رقم المؤطر / الرقم السعودي"}
              value={badgePhones[0] || ""}
              onChange={e => setBadgePhone(0, e.target.value)}
              dir="ltr"
              inputStyle={PHONE_INPUT_STYLE}
            />
            {badgePhones.slice(1).map((phone, index) => (
              <div key={`badge-phone-${index + 1}`} style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8, alignItems:"end" }}>
                <Input
                  label={`${t.extraSaudiPhone || "رقم إضافي"} ${index + 1}`}
                  value={phone}
                  onChange={e => setBadgePhone(index + 1, e.target.value)}
                  dir="ltr"
                  inputStyle={PHONE_INPUT_STYLE}
                />
                <Button variant="ghost" icon="trash" onClick={() => removeBadgePhone(index + 1)}>
                  {t.remove || "إزالة"}
                </Button>
              </div>
            ))}
            {badgePhones.length < 3 && (
              <Button variant="ghost" size="sm" icon="plus" onClick={addBadgePhone} style={{ justifySelf:"start" }}>
                {t.addPhone || "+ إضافة رقم"}
              </Button>
            )}
            {badgeTemplates.length > 0 && (
              <Select
                label={t.badgeTemplate || "قالب الشارة"}
                value={form.badgeTemplateId}
                onChange={set("badgeTemplateId")}
                options={[
                  { value:"", label:t.defaultBadgeTemplate || "القالب الافتراضي" },
                  ...badgeTemplates.map(template => ({ value:template.id, label:template.name })),
                ]}
              />
            )}
            <Input
              label={t.badgeNote || "ملاحظة الشارة"}
              value={form.badgeNote}
              onChange={set("badgeNote")}
            />
          </div>
        </GlassCard>
      )}

      <GlassCard style={{ padding:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"center", flexWrap:"wrap", marginBottom:14 }}>
          <div>
            <p style={{ fontSize:13, fontWeight:800, color:tc.gold }}>{t.programPackagesTitle || "المستويات والباقات"}</p>
            <p style={{ fontSize:11, color:tc.grey, marginTop:3 }}>{t.programPackagesHint || "أضف الفنادق ونظام الوجبات وأسعار الغرف لكل مستوى."}</p>
          </div>
          <div ref={levelMenuRef} style={{ position:"relative" }}>
            <Button variant="primary" size="sm" icon="plus" onClick={() => setLevelMenuOpen(prev => !prev)}>
              {t.addLevel || "إضافة مستوى"}
            </Button>
            {levelMenuOpen && (
              <div style={{
                position:"absolute",
                top:"calc(100% + 8px)",
                insetInlineEnd:0,
                minWidth:210,
                background:"var(--rukn-menu-bg, rgba(20,30,50,.96))",
                border:"1px solid var(--rukn-menu-border, rgba(212,175,55,.28))",
                boxShadow:"var(--rukn-menu-shadow, 0 18px 40px rgba(0,0,0,.32))",
                borderRadius:12,
                padding:6,
                zIndex:20,
              }}>
                {PACKAGE_TEMPLATES.map(level => (
                  <button key={level} type="button" onClick={() => addPackage(level)}
                    style={{
                      width:"100%",
                      border:"none",
                      background:"transparent",
                      color:"var(--rukn-text)",
                      borderRadius:10,
                      padding:"9px 12px",
                      fontSize:12,
                      fontWeight:700,
                      cursor:"pointer",
                      fontFamily:"'Cairo',sans-serif",
                      textAlign:"start",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--rukn-row-hover)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                    {translateHotelLevel(level, lang) || level}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {packages.map((pkg, index) => (
            <div key={pkg.id || index} style={{
              border:"1px solid rgba(212,175,55,.16)",
              background:"rgba(255,255,255,.025)",
              borderRadius:12,
              padding:14,
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center", marginBottom:12 }}>
                <strong style={{ color:tc.white, fontSize:13 }}>{t.level || "المستوى"} {index + 1}</strong>
                {packages.length > 1 && (
                  <Button variant="ghost" size="sm" icon="trash" onClick={() => removePackage(index)}>
                    {t.delete}
                  </Button>
                )}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Input label={t.levelName || "اسم المستوى"} value={pkg.level || ""} onChange={e => setPackageField(index, "level", e.target.value)} />
                <Input label={t.mealPlan} value={pkg.mealPlan || ""} onChange={e => setPackageField(index, "mealPlan", e.target.value)} />
                <Input label={t.hotelMecca} value={pkg.hotelMecca || ""} onChange={e => setPackageField(index, "hotelMecca", e.target.value)} />
                <Input label={t.hotelMadina} value={pkg.hotelMadina || ""} onChange={e => setPackageField(index, "hotelMadina", e.target.value)} />
                <Input
                  label={t.madinahNights || "عدد ليالي المدينة"}
                  value={pkg.madinahNights ?? ""}
                  onChange={e => setPackageField(index, "madinahNights", e.target.value)}
                  type="number"
                  min={0}
                  step={1}
                />
                <Input label={t.notes} value={pkg.notes || ""} onChange={e => setPackageField(index, "notes", e.target.value)} style={{ gridColumn:"1/-1" }} />
              </div>
              <div style={{ marginTop:12 }}>
                <p style={{ fontSize:11, color:tc.grey, fontWeight:700, marginBottom:8 }}>{t.roomPrices || "أسعار الغرف"}</p>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10 }}>
                  {PROGRAM_ROOM_PRICE_KEYS.map(key => (
                    <Input
                      key={key}
                      label={translateRoomType(key, lang) || getRoomTypeLabel(key)}
                      value={pkg.prices?.[key] ?? ""}
                      onChange={e => setPackagePrice(index, key, e.target.value)}
                      type="number"
                      min={0}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:2 }}>
        {programSaveError && (
          <p style={{ flex:"1 1 100%", margin:0, color:"var(--rukn-danger)", fontSize:12, fontWeight:800, lineHeight:1.7 }}>
            {programSaveError}
          </p>
        )}
        <Button variant="ghost" onClick={onCancel} disabled={programSaving}>{t.cancel}</Button>
        <Button variant="primary" icon={isEdit?"save":"plus"} onClick={handleSave} disabled={programSaving}>
          {programSaving ? (routeCopy.saving || "جاري الحفظ...") : isEdit ? t.save : t.addProgram}
        </Button>
      </div>
    </div>
  );
}
