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
import { normalizeProgramType } from "../../utils/programDuplicate";
import {
  badgePhonesFromProgram,
  getBadgeContactDefaults,
  programFieldsFromBadgePhones,
  useBadgeTemplates,
} from "../../features/badges";

const tc = theme.colors;
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

export default function ProgramForm({
  program,
  store,
  onSave,
  onCancel,
  badgesEnabled = true,
}) {
  const { addProgram, updateProgram } = store;
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
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const routeCopy = React.useMemo(() => routeLabels(lang, t), [lang, t]);
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

  const handleSave = () => {
    const nextErrors = {};
    if (!String(form.name || "").trim() || !String(form.seats || "").trim()) {
      alert(t.programNameSeatsRequired || "يرجى إدخال اسم البرنامج وعدد المقاعد");
      return;
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
    isEdit ? updateProgram(program.id,data) : addProgram(data);
    onSave();
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
          <Input label={t.program} value={form.name} onChange={set("name")} required style={{gridColumn:"1/-1"}}/>
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
            />
            {badgePhones.slice(1).map((phone, index) => (
              <div key={`badge-phone-${index + 1}`} style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8, alignItems:"end" }}>
                <Input
                  label={`${t.extraSaudiPhone || "رقم إضافي"} ${index + 1}`}
                  value={phone}
                  onChange={e => setBadgePhone(index + 1, e.target.value)}
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
        <Button variant="ghost" onClick={onCancel}>{t.cancel}</Button>
        <Button variant="primary" icon={isEdit?"save":"plus"} onClick={handleSave}>
          {isEdit?t.save:t.addProgram}
        </Button>
      </div>
    </div>
  );
}
