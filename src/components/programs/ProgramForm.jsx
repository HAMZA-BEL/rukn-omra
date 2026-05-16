import React from "react";
import AirlineSelector from "../AirlineSelector";
import { Button, GlassCard, Input, Select } from "../UI";
import { theme } from "../styles";
import { useLang } from "../../hooks/useLang";
import { formatCurrency } from "../../utils/currency";
import { formatAirlineLabel, getProgramAirline } from "../../utils/airlines";
import { normalizeHotelCheckinDay, normalizeMadinahNights, normalizeVisitOrder } from "../../utils/hotelDates";
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

export default function ProgramForm({ program, store, onSave, onCancel }) {
  const { addProgram, updateProgram } = store;
  const { t, lang } = useLang();
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
  const { templates: badgeTemplates } = useBadgeTemplates({ agencyId: store.agencyId });
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
  const levelMenuRef = React.useRef(null);
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
    const data = {
      ...form,
      ...legacyFields,
      ...phoneFields,
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
