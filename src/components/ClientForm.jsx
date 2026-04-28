import React from "react";
import { Input, Select, Button, Divider, GlassCard, Modal } from "./UI";
import { CITIES, NATIONALITIES } from "../data/initialData";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { calcExpiry } from "../utils/amadeus";
import { AppIcon } from "./Icon";
import {
  getPackageRoomPrice,
  getRoomTypeLabel,
  getRoomTypeOptions,
  normalizeProgramPackages,
  normalizeRoomTypeKey,
} from "../utils/programPackages";

const tc = theme.colors;

const DOCUMENT_FIELDS = [
  ["passportCopy", "passportCopy"],
  ["photo", "photo"],
  ["vaccine", "vaccine"],
  ["contract", "contract"],
];

const HOTEL_LEVEL_KEYS = {
  "اقتصادي": "hotelLevelEconomy",
  "سياحي": "hotelLevelTourist",
  "سياحي بالإفطار": "hotelLevelBreakfast",
  "VIP": "hotelLevelVIP",
};

const HOTEL_NAME_KEYS = {
  "اسكن التيسير": "hotelNameAskan",
  "مثابة": "hotelNameMathaba",
  "جميرا": "hotelNameJumeirah",
  "المنطقة المركزية": "hotelNameCentral",
  "أنوار المدينة موفنبيك": "hotelNameAnwar",
  "برج ساعة فيرمونت": "hotelNameFairmont",
  "فندق أنجم مدينة": "hotelNameAnjum",
};

const LOCALE_BY_LANG = { ar: "ar-MA", fr: "fr-FR", en: "en-US" };
const CURRENCY_BY_LANG = { ar: "د.م", fr: "د.م", en: "MAD" };

const getLocalizedValue = (value, map, t) => {
  const key = map[value];
  return key ? (t[key] || value) : value;
};

const pickString = (...candidates) => {
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed) return trimmed;
    }
  }
  return "";
};

const pickNumber = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === "") continue;
    const parsed = Number(candidate);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
};

const normalizeGenderValue = (value) => {
  const normalized = pickString(value).toLowerCase();
  if (normalized === "male" || normalized === "m" || normalized === "ذكر") return "male";
  if (normalized === "female" || normalized === "f" || normalized === "أنثى") return "female";
  return "";
};

const genderToPassportValue = (gender) => {
  if (gender === "male") return "M";
  if (gender === "female") return "F";
  return "";
};

const splitArabicName = (value) => {
  const normalized = pickString(value);
  if (!normalized) return { first: "", last: "" };
  const parts = normalized.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return {
    first: parts.slice(0, -1).join(" ").trim(),
    last: parts.slice(-1).join(" ").trim(),
  };
};

const splitLatinName = (value) => {
  const normalized = pickString(value);
  if (!normalized) return { nom: "", prenom: "" };
  const cleaned = normalized.replace(/<+/g, " ").replace(/\s+/g, " ").trim();
  const slashIdx = cleaned.indexOf("/");
  if (slashIdx !== -1) {
    return {
      nom: cleaned.slice(0, slashIdx).trim(),
      prenom: cleaned.slice(slashIdx + 1).trim(),
    };
  }
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return { nom: parts[0], prenom: "" };
  return {
    nom: parts[0],
    prenom: parts.slice(1).join(" ").trim(),
  };
};

const extractArabicNames = (client) => {
  let firstName = pickString(client?.firstName, client?.first_name, client?.arabicFirstName);
  let lastName  = pickString(client?.lastName, client?.last_name, client?.arabicLastName);
  if ((!firstName || !lastName) && (client?.name || client?.fullName || client?.nameAr)) {
    const { first, last } = splitArabicName(client?.name ?? client?.fullName ?? client?.nameAr);
    if (!firstName && first) firstName = first;
    if (!lastName && last)   lastName  = last;
  }
  return { firstName, lastName };
};

const extractLatinNames = (client) => {
  let nom    = pickString(client?.nom, client?.latinNom, client?.nomLatin);
  let prenom = pickString(client?.prenom, client?.latinPrenom, client?.prenomLatin);
  if ((!nom || !prenom) && (client?.nameLatin || client?.latinName || client?.latin_fullName)) {
    const { nom: splitNom, prenom: splitPrenom } = splitLatinName(
      client?.nameLatin ?? client?.latinName ?? client?.latin_fullName
    );
    if (!nom && splitNom)       nom = splitNom;
    if (!prenom && splitPrenom) prenom = splitPrenom;
  }
  return { nom, prenom };
};

const buildFormState = (client, defaultProgramId, programs) => {
  const { firstName, lastName } = extractArabicNames(client);
  const { nom, prenom }         = extractLatinNames(client);

  const programId = pickString(
    client?.programId,
    client?.program_id,
    client?.program?.id,
    defaultProgramId,
    programs[0]?.id
  );
  const selectedProgram = programs.find(p => p.id === programId);
  const firstPackage = selectedProgram ? normalizeProgramPackages(selectedProgram)[0] : null;
  const packageLevel = pickString(client?.packageLevel, client?.hotelLevel, client?.hotel_level, firstPackage?.level);
  const packageId = pickString(client?.packageId, client?.package_id, firstPackage?.id);

  const officialPrice = pickNumber(
    client?.officialPrice,
    client?.official_price,
    client?.price
  );
  const salePrice = pickNumber(
    client?.salePrice,
    client?.sale_price,
    client?.price,
    officialPrice
  );

  const passport = client?.passport || {};
  const docs     = client?.docs     || {};
  const gender = normalizeGenderValue(client?.gender || passport.gender);

  return {
    firstName,
    lastName,
    prenom,
    nom,
    phone:       pickString(client?.phone, client?.phoneNumber, client?.mobile),
    city:        pickString(client?.city, client?.ville, client?.addressCity),
    programId:   programId || "",
    packageId,
    hotelLevel:  packageLevel,
    packageLevel,
    hotelMecca:  pickString(client?.hotelMecca, client?.hotel_mecca),
    hotelMadina: pickString(client?.hotelMadina, client?.hotel_madina),
    roomType:    normalizeRoomTypeKey(pickString(client?.roomType, client?.room_type, "double")) || "double",
    roomTypeLabel: pickString(client?.roomTypeLabel, client?.room_type_label),
    officialPrice,
    salePrice,
    ticketNo: pickString(client?.ticketNo, client?.ticket_no, client?.ticketNumber, client?.ticket),
    notes:    pickString(client?.notes, client?.note),
    gender,
    passport: {
      number:      pickString(passport.number, client?.passportNumber, client?.passport_no),
      nationality: pickString(passport.nationality, client?.passportNationality, client?.nationality, "MAR") || "MAR",
      birthDate:   pickString(passport.birthDate, client?.birthDate, client?.dateOfBirth),
      expiry:      pickString(passport.expiry, client?.passportExpiry, client?.expiryDate),
      gender:      genderToPassportValue(gender),
      issueDate:   pickString(passport.issueDate, client?.passportIssueDate, client?.issueDate),
    },
    docs: {
      passportCopy: Boolean(docs.passportCopy ?? client?.passportCopy),
      photo:        Boolean(docs.photo        ?? client?.photoProvided),
      vaccine:      Boolean(docs.vaccine      ?? client?.vaccineProvided),
      contract:     Boolean(docs.contract     ?? client?.contractSigned),
    },
  };
};

export default function ClientForm({ client, store, onSave, onCancel, defaultProgramId }) {
  const { t, dir, lang } = useLang();
  const { programs, addClient, updateClient } = store;
  const isEdit = !!client;
  const numberLocale = LOCALE_BY_LANG[lang] || "ar-MA";
  const currencyLabel = CURRENCY_BY_LANG[lang] || "د.م";
  const formatPrice = (value) => (typeof value === "number" ? value.toLocaleString(numberLocale) : (value ?? "—"));
  const formatLevelLabel = (value) => getLocalizedValue(value, HOTEL_LEVEL_KEYS, t);
  const formatHotelName = (value) => getLocalizedValue(value, HOTEL_NAME_KEYS, t);
  const skipProgramResetRef = React.useRef(true);

  const [form, setForm] = React.useState(() => buildFormState(client, defaultProgramId, programs));

  // Update form when client changes (for edit mode)
  React.useEffect(() => {
    if (client) {
      skipProgramResetRef.current = true;
      skipInitialAutoFillRef.current = true;
      setForm(buildFormState(client, defaultProgramId, programs));
    }
  }, [client, defaultProgramId, programs]);

  const [errors,  setErrors]  = React.useState({});
  const [autoPriceNote, setAutoPriceNote] = React.useState("");

  const set     = k => e => setForm(f => ({...f, [k]: e.target.value}));
  const setSalePrice = e => {
    setAutoPriceNote("");
    setForm(f => ({ ...f, salePrice: e.target.value }));
  };
  const setPass = k => e => setForm(f => ({...f, passport:{...f.passport, [k]:e.target.value}}));
  const setDoc  = k => e => setForm(f => ({...f, docs:{...f.docs, [k]:e.target.checked}}));
  const setGender = React.useCallback((gender) => {
    setForm((f) => ({
      ...f,
      gender,
      passport: {
        ...f.passport,
        gender: genderToPassportValue(gender),
      },
    }));
    setErrors((prev) => {
      if (!prev.gender) return prev;
      const next = { ...prev };
      delete next.gender;
      return next;
    });
  }, []);

  const selectedProgram = React.useMemo(
    () => programs.find(p => p.id === form.programId) ?? null,
    [programs, form.programId]
  );
  const programPackages = React.useMemo(
    () => selectedProgram ? normalizeProgramPackages(selectedProgram) : [],
    [selectedProgram]
  );
  const selectedPackage = React.useMemo(
    () => programPackages.find(pkg => pkg.id === form.packageId)
      || programPackages.find(pkg => pkg.level === (form.packageLevel || form.hotelLevel))
      || null,
    [programPackages, form.packageId, form.packageLevel, form.hotelLevel]
  );

  const handlePackageChange = React.useCallback((e) => {
    const pkg = programPackages.find(item => item.id === e.target.value) || null;
    setAutoPriceNote("");
    setForm(f => ({
      ...f,
      packageId: pkg?.id || "",
      hotelLevel: pkg?.level || "",
      packageLevel: pkg?.level || "",
      hotelMecca: pkg?.hotelMecca || "",
      hotelMadina: pkg?.hotelMadina || "",
    }));
  }, [programPackages]);

  const handleRoomTypeChange = React.useCallback((e) => {
    setAutoPriceNote("");
    setForm(f => ({
      ...f,
      roomType: e.target.value,
      roomTypeLabel: getRoomTypeLabel(e.target.value),
    }));
  }, []);

  // Auto-fill hotel + price when package or room changes
  const prevLevelRef = React.useRef("");
  const prevRoomRef  = React.useRef("");
  const skipInitialAutoFillRef = React.useRef(isEdit);

  React.useEffect(() => {
    if (!selectedPackage) return;
    if (skipInitialAutoFillRef.current) {
      skipInitialAutoFillRef.current = false;
      prevLevelRef.current = selectedPackage.id;
      prevRoomRef.current = form.roomType;
      return;
    }
    if (
      prevLevelRef.current === selectedPackage.id &&
      prevRoomRef.current  === form.roomType
    ) return;
    prevLevelRef.current = selectedPackage.id;
    prevRoomRef.current  = form.roomType;

    const ap = getPackageRoomPrice(selectedPackage, form.roomType);
    setForm(f => ({
      ...f,
      packageId: selectedPackage.id,
      hotelLevel: selectedPackage.level,
      packageLevel: selectedPackage.level,
      roomTypeLabel: getRoomTypeLabel(f.roomType),
      hotelMecca:    selectedPackage.hotelMecca,
      hotelMadina:   selectedPackage.hotelMadina,
      ...(ap ? { officialPrice: ap, salePrice: ap } : {}),
    }));
    setAutoPriceNote(ap ? "تم تعبئة السعر تلقائيًا من المستوى ونوع الغرفة المختارين" : "");
  }, [form.roomType, selectedPackage]);

  // Reset hotel when program changes
  React.useEffect(() => {
    if (skipProgramResetRef.current) {
      skipProgramResetRef.current = false;
      return;
    }
    const firstPackage = programPackages[0];
    setAutoPriceNote("");
    setForm(f => ({
      ...f,
      packageId: firstPackage?.id || "",
      hotelLevel: firstPackage?.level || "",
      packageLevel: firstPackage?.level || "",
      hotelMecca: firstPackage?.hotelMecca || "",
      hotelMadina: firstPackage?.hotelMadina || "",
      roomType: "double",
      roomTypeLabel: getRoomTypeLabel("double"),
      officialPrice:0,
      salePrice:0,
    }));
  }, [form.programId, programPackages]);

  // Auto-calculate expiry = issueDate + 5 years
  React.useEffect(() => {
    const issue = form.passport.issueDate;
    if (!issue) return;
    const auto = calcExpiry(issue);
    if (auto) setForm(f => ({...f, passport:{...f.passport, expiry:auto}}));
  }, [form.passport.issueDate]);

  const discount = Math.max(0, Number(form.officialPrice) - Number(form.salePrice));

  const validate = () => {
    const e = {};
    if (!form.firstName.trim() && !form.lastName.trim()) e.firstName = t.firstNameError;
    if (!form.phone.trim())    e.phone    = t.phoneError;
    if (!form.salePrice || form.salePrice <= 0) e.salePrice = t.salePriceError;
    if (!form.gender) e.gender = "يرجى تحديد الجنس";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const data = {
      ...form,
      packageId: selectedPackage?.id || form.packageId || "",
      packageLevel: selectedPackage?.level || form.packageLevel || form.hotelLevel || "",
      hotelLevel: selectedPackage?.level || form.hotelLevel || "",
      hotelMecca: selectedPackage?.hotelMecca || form.hotelMecca,
      hotelMadina: selectedPackage?.hotelMadina || form.hotelMadina,
      roomType: normalizeRoomTypeKey(form.roomType),
      roomTypeLabel: getRoomTypeLabel(form.roomType),
      officialPrice: Number(form.officialPrice),
      salePrice:     Number(form.salePrice),
      gender: form.gender,
      passport: {
        ...form.passport,
        gender: genderToPassportValue(form.gender),
      },
    };
    isEdit ? updateClient(client.id, data) : addClient(data);
    onSave();
  };

  // Apply MRZ data

  return (
    <div>
      {/* ── Arabic Name ── */}
      <GlassCard gold style={{ padding:16, marginBottom:14 }}>
        <p style={{ fontSize:12, fontWeight:700, color:tc.gold, marginBottom:12 }}>
          <AppIcon name="user" size={14} color={tc.gold} /> {t.arabicNameSection}
        </p>
        <div className="form-grid form-grid--two">
          <Input
            label={t.lastName}
            value={form.lastName} onChange={set("lastName")}
            placeholder={t.lastNamePlaceholder}
            error={errors.firstName}
          />
          <Input
            label={t.firstName}
            value={form.firstName} onChange={set("firstName")}
            placeholder={t.firstNamePlaceholder}
          />
        </div>
      </GlassCard>

      {/* ── Latin Name ── */}
      <GlassCard style={{ padding:16, marginBottom:14 }}>
        <p style={{ fontSize:12, fontWeight:700, color:tc.gold, marginBottom:6 }}>
          <AppIcon name="language" size={14} color={tc.gold} /> {t.latinName}
        </p>
        <p style={{ fontSize:11, color:tc.grey, marginBottom:12 }}>
          {t.latinNameHint}
        </p>
        <div className="form-grid form-grid--two">
          <Input
            label={t.nom}
            value={form.nom} onChange={set("nom")}
            placeholder={t.nomPlaceholder}
            inputStyle={{ textTransform:"uppercase", fontFamily:"monospace" }}
          />
          <Input
            label={t.prenom}
            value={form.prenom} onChange={set("prenom")}
            placeholder={t.prenomPlaceholder}
            inputStyle={{ textTransform:"uppercase", fontFamily:"monospace" }}
          />
        </div>
        {form.nom && form.prenom && (
          <div style={{
            marginTop:10, padding:"8px 12px",
            background:"rgba(212,175,55,.08)", borderRadius:8,
            border:"1px solid rgba(212,175,55,.2)",
            fontFamily:"monospace", fontSize:12, color:tc.gold,
            }}>
            {t.amadeusFormatLabel}: <strong>{form.nom}/{form.prenom}</strong>
          </div>
        )}
      </GlassCard>

      {/* ── Contact ── */}
      <GlassCard style={{ padding:16, marginBottom:14 }}>
        <p style={{ fontSize:12, fontWeight:700, color:tc.gold, marginBottom:12, display:"inline-flex", alignItems:"center", gap:6 }}><AppIcon name="phone" size={14} color={tc.gold} /> {t.contactInfo}</p>
        <div className="form-grid form-grid--two">
          <Input label={t.phone} value={form.phone} onChange={set("phone")}
            placeholder={t.phonePlaceholder} required error={errors.phone} />
          <Select label={t.city} value={form.city} onChange={set("city")}
            options={["", ...CITIES].map(c => ({ value:c, label:c || t.selectCityPlaceholder }))} />
        </div>
        <div style={{ marginTop:12 }}>
          <label style={{ fontSize:12, fontWeight:600, color:tc.grey, display:"block", marginBottom:8 }}>
            الجنس *
          </label>
          <div style={{ display:"inline-flex", gap:8, flexWrap:"wrap" }}>
            {[
              { value: "male", label: "ذكر" },
              { value: "female", label: "أنثى" },
            ].map((option) => {
              const active = form.gender === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGender(option.value)}
                  style={{
                    minWidth: 92,
                    padding: "10px 16px",
                    borderRadius: 12,
                    border: `1px solid ${active ? tc.gold : "rgba(255,255,255,.12)"}`,
                    background: active ? "rgba(212,175,55,.12)" : "rgba(255,255,255,.04)",
                    color: active ? tc.gold : "#f8fafc",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'Cairo',sans-serif",
                    transition: "all .15s ease",
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {errors.gender && (
            <p style={{ color: tc.danger, fontSize: 11, marginTop: 6 }}>{errors.gender}</p>
          )}
        </div>
      </GlassCard>

      {/* ── Program + Booking ── */}
      <GlassCard gold style={{ padding:16, marginBottom:14 }}>
        <p style={{ fontSize:12, fontWeight:700, color:tc.gold, marginBottom:12, display:"inline-flex", alignItems:"center", gap:6 }}><AppIcon name="program" size={14} color={tc.gold} /> بيانات البرنامج والحجز</p>
        <div className="form-grid form-grid--two">
          <Select label={t.program} value={form.programId} onChange={set("programId")}
            options={programs.map(p => ({ value:p.id, label:p.name }))}
            style={{ gridColumn:"1/-1" }} />
          {programPackages.length > 0 && (
            <Select
              label="المستوى"
              value={selectedPackage?.id || ""}
              onChange={handlePackageChange}
              options={[
                { value:"", label:t.selectLevelPlaceholder },
                ...programPackages.map(pkg => ({ value:pkg.id, label:formatLevelLabel(pkg.level) })),
              ]}
            />
          )}
          <Select
            label={t.roomType}
            value={form.roomType}
            onChange={handleRoomTypeChange}
            options={getRoomTypeOptions()}
          />
          <Input  label={t.ticketNo} value={form.ticketNo} onChange={set("ticketNo")} placeholder={t.ticketPlaceholder} />
        </div>
        {selectedPackage && (
          <div style={{
            marginTop:12,
            padding:"10px 12px",
            borderRadius:10,
            background:"rgba(0,0,0,.16)",
            border:"1px solid rgba(212,175,55,.14)",
          }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <p style={{ fontSize:11, color:tc.grey }}>{t.hotelMecca}: <span style={{ color:"#f8fafc" }}>{formatHotelName(selectedPackage.hotelMecca) || "—"}</span></p>
              <p style={{ fontSize:11, color:tc.grey }}>{t.hotelMadina}: <span style={{ color:"#f8fafc" }}>{formatHotelName(selectedPackage.hotelMadina) || "—"}</span></p>
              <p style={{ fontSize:11, color:tc.grey }}>{t.mealPlan}: <span style={{ color:"#f8fafc" }}>{selectedPackage.mealPlan || "—"}</span></p>
              <p style={{ fontSize:11, color:tc.grey }}>{t.salePrice}: <span style={{ color:tc.gold }}>{getPackageRoomPrice(selectedPackage, form.roomType) ? `${formatPrice(getPackageRoomPrice(selectedPackage, form.roomType))} ${currencyLabel}` : "—"}</span></p>
            </div>
            {autoPriceNote && (
              <p style={{ fontSize:11, color:tc.greenLight, marginTop:8 }}>{autoPriceNote}</p>
            )}
          </div>
        )}
      </GlassCard>

      {/* ── Price ── */}
      <GlassCard gold style={{ padding:16, marginBottom:14 }}>
        <p style={{ fontSize:12, fontWeight:700, color:tc.gold, marginBottom:12, display:"inline-flex", alignItems:"center", gap:6 }}><AppIcon name="banknote" size={14} color={tc.gold} /> {t.priceSection}</p>
        <div className="form-grid form-grid--three">
          <Input label={`${t.officialPrice} (${currencyLabel})`} value={form.officialPrice} onChange={set("officialPrice")} type="number" />
          <Input label={`${t.salePrice} (${currencyLabel})`} value={form.salePrice} onChange={setSalePrice}
            type="number" required error={errors.salePrice}
            inputStyle={{ border:`1px solid ${tc.gold}`, color:tc.gold, fontWeight:700 }} />
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <label style={{ fontSize:12, fontWeight:600, color:tc.grey }}>{t.discount}</label>
            <div style={{ background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)",
              borderRadius:10, padding:"10px 12px",
              color:discount>0?tc.danger:tc.grey, fontSize:13, fontWeight:700 }}>
              {discount>0 ? `- ${formatPrice(discount)} ${currencyLabel}` : t.noDiscount}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ── Passport ── */}
      <GlassCard style={{ padding:16, marginBottom:14 }}>
        <p style={{ fontSize:12, fontWeight:700, color:tc.gold, marginBottom:12, display:"inline-flex", alignItems:"center", gap:6 }}><AppIcon name="passport" size={14} color={tc.gold} /> {t.passport}</p>
        <div className="form-grid form-grid--three">
          <Input label={t.passportNo} value={form.passport.number} onChange={setPass("number")}
            placeholder={t.passportPlaceholder} inputStyle={{ textTransform:"uppercase" }} />
          <Select label={t.nationality} value={form.passport.nationality} onChange={setPass("nationality")}
            options={NATIONALITIES} />
          <Select
            label={t.gender}
            value={form.passport.gender}
            onChange={(e) => setGender(normalizeGenderValue(e.target.value))}
            options={[{value:"",label:"—"},{value:"M",label:t.male},{value:"F",label:t.female}]} />
          <Input label={t.birthDate} value={form.passport.birthDate} onChange={setPass("birthDate")} type="date" />
          <Input label={t.issueDate} value={form.passport.issueDate} onChange={setPass("issueDate")} type="date" />
          <Input label={t.expiry} value={form.passport.expiry} onChange={setPass("expiry")} type="date" />
        </div>
        {form.passport.issueDate && form.passport.expiry && (
          <p style={{ fontSize:11, color:tc.grey, marginTop:8 }}>{t.expiryAutoHint}</p>
        )}
      </GlassCard>

      {/* ── Documents ── */}
      <GlassCard style={{ padding:16, marginBottom:14 }}>
        <p style={{ fontSize:12, fontWeight:700, color:tc.gold, marginBottom:12, display:"inline-flex", alignItems:"center", gap:6 }}><AppIcon name="documents" size={14} color={tc.gold} /> {t.documents}</p>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          {DOCUMENT_FIELDS.map(([key, labelKey])=>(
            <label key={key} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer",
              padding:"8px 14px", borderRadius:20,
              background:form.docs[key]?"rgba(34,197,94,.12)":"rgba(255,255,255,.04)",
              border:`1px solid ${form.docs[key]?tc.greenLight:"rgba(255,255,255,.1)"}`,
              color:form.docs[key]?tc.greenLight:tc.grey, fontSize:12, fontWeight:600 }}>
              <input type="checkbox" checked={form.docs[key]} onChange={setDoc(key)}
                style={{ accentColor:tc.greenLight }} />
              {t[labelKey]}
            </label>
          ))}
        </div>
      </GlassCard>

      {/* ── Notes ── */}
      <div style={{ marginBottom:16 }}>
        <label style={{ fontSize:12, fontWeight:600, color:tc.grey, display:"block", marginBottom:6 }}>{t.notes}</label>
        <textarea value={form.notes} onChange={set("notes")} rows={3}
          style={{ width:"100%", background:"rgba(255,255,255,.04)",
            border:"1px solid rgba(255,255,255,.1)", borderRadius:10,
            padding:"10px 14px", color:"#f8fafc", fontSize:13,
            fontFamily:"'Cairo',sans-serif", direction:dir, outline:"none", resize:"vertical" }} />
      </div>

      <Divider />
      <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
        <Button variant="ghost" onClick={onCancel}>{t.cancel}</Button>
        <Button variant="primary" icon={isEdit?"save":"plus"} onClick={handleSave}>
          {isEdit ? t.save : t.addClient}
        </Button>
      </div>
    </div>
  );
}
