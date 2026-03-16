import React from "react";
import { Input, Select, Button, Divider, GlassCard, Modal } from "./UI";
import { ROOM_KEYS, CITIES, NATIONALITIES } from "../data/initialData";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { calcExpiry } from "../utils/amadeus";

const tc = theme.colors;

const ROOM_TYPE_OPTIONS = [
  { value: "غرفة مزدوجة", labelKey: "roomTypeDouble" },
  { value: "غرفة ثلاثية", labelKey: "roomTypeTriple" },
  { value: "غرفة رباعية", labelKey: "roomTypeQuad" },
  { value: "غرفة خماسية", labelKey: "roomTypeQuint" },
  { value: "غرفة مفردة", labelKey: "roomTypeSingle" },
  { value: "جناح فاخر", labelKey: "roomTypeSuite" },
];

const ROOM_TABLE_KEYS = ["roomDoubleShort", "roomTripleShort", "roomQuadShort", "roomQuintShort"];

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

  return {
    firstName,
    lastName,
    prenom,
    nom,
    phone:       pickString(client?.phone, client?.phoneNumber, client?.mobile),
    city:        pickString(client?.city, client?.ville, client?.addressCity),
    programId:   programId || "",
    hotelLevel:  pickString(client?.hotelLevel, client?.hotel_level),
    hotelMecca:  pickString(client?.hotelMecca, client?.hotel_mecca),
    hotelMadina: pickString(client?.hotelMadina, client?.hotel_madina),
    roomType:    pickString(client?.roomType, client?.room_type, "غرفة مزدوجة") || "غرفة مزدوجة",
    officialPrice,
    salePrice,
    ticketNo: pickString(client?.ticketNo, client?.ticket_no, client?.ticketNumber, client?.ticket),
    notes:    pickString(client?.notes, client?.note),
    passport: {
      number:      pickString(passport.number, client?.passportNumber, client?.passport_no),
      nationality: pickString(passport.nationality, client?.passportNationality, client?.nationality, "MAR") || "MAR",
      birthDate:   pickString(passport.birthDate, client?.birthDate, client?.dateOfBirth),
      expiry:      pickString(passport.expiry, client?.passportExpiry, client?.expiryDate),
      gender:      pickString(passport.gender, client?.gender, "M") || "M",
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
      setForm(buildFormState(client, defaultProgramId, programs));
    }
  }, [client, defaultProgramId, programs]);

  const [errors,  setErrors]  = React.useState({});

  const set     = k => e => setForm(f => ({...f, [k]: e.target.value}));
  const setPass = k => e => setForm(f => ({...f, passport:{...f.passport, [k]:e.target.value}}));
  const setDoc  = k => e => setForm(f => ({...f, docs:{...f.docs, [k]:e.target.checked}}));

  const selectedProgram = React.useMemo(
    () => programs.find(p => p.id === form.programId) ?? null,
    [programs, form.programId]
  );
  const priceTable = React.useMemo(
    () => selectedProgram?.priceTable ?? [],
    [selectedProgram]
  );
  const selectedRow = React.useMemo(
    () => priceTable.find(r => r.level === form.hotelLevel) ?? null,
    [priceTable, form.hotelLevel]
  );

  // Auto-fill hotel + price when level or room changes
  const prevLevelRef = React.useRef("");
  const prevRoomRef  = React.useRef("");

  React.useEffect(() => {
    if (!selectedRow) return;
    if (
      prevLevelRef.current === form.hotelLevel &&
      prevRoomRef.current  === form.roomType
    ) return;
    prevLevelRef.current = form.hotelLevel;
    prevRoomRef.current  = form.roomType;

    const rk = ROOM_KEYS[form.roomType] || "double";
    const ap = selectedRow.prices[rk] || selectedRow.prices.double || 0;
    setForm(f => ({
      ...f,
      hotelMecca:    selectedRow.hotelMecca,
      hotelMadina:   selectedRow.hotelMadina,
      officialPrice: ap,
      salePrice: f.salePrice === 0 || f.salePrice === f.officialPrice ? ap : f.salePrice,
    }));
  }, [form.hotelLevel, form.roomType, selectedRow]);

  // Reset hotel when program changes
  React.useEffect(() => {
    if (skipProgramResetRef.current) {
      skipProgramResetRef.current = false;
      return;
    }
    setForm(f => ({...f, hotelLevel:"", hotelMecca:"", hotelMadina:"", officialPrice:0, salePrice:0}));
  }, [form.programId]);

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
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const data = {
      ...form,
      officialPrice: Number(form.officialPrice),
      salePrice:     Number(form.salePrice),
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
          👤 {t.arabicNameSection}
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
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
          🔤 {t.latinName}
        </p>
        <p style={{ fontSize:11, color:tc.grey, marginBottom:12 }}>
          {t.latinNameHint}
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
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
        <p style={{ fontSize:12, fontWeight:700, color:tc.gold, marginBottom:12 }}>📞 {t.contactInfo}</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Input label={t.phone} value={form.phone} onChange={set("phone")}
            placeholder={t.phonePlaceholder} required error={errors.phone} />
          <Select label={t.city} value={form.city} onChange={set("city")}
            options={["", ...CITIES].map(c => ({ value:c, label:c || t.selectCityPlaceholder }))} />
        </div>
      </GlassCard>

      {/* ── Program + Hotel ── */}
      <GlassCard gold style={{ padding:16, marginBottom:14 }}>
        <p style={{ fontSize:12, fontWeight:700, color:tc.gold, marginBottom:12 }}>📋 {t.programHotelSection}</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Select label={t.program} value={form.programId} onChange={set("programId")}
            options={programs.map(p => ({ value:p.id, label:p.name }))}
            style={{ gridColumn:"1/-1" }} />
          {priceTable.length > 0 && (
            <Select label={t.hotelLevel} value={form.hotelLevel} onChange={set("hotelLevel")}
              options={[{value:"",label:t.selectLevelPlaceholder},...priceTable.map(r=>({value:r.level,label:formatLevelLabel(r.level)}))]}
              style={{ gridColumn:"1/-1" }} />
          )}
          <Select label={t.roomType} value={form.roomType} onChange={set("roomType")}
            options={ROOM_TYPE_OPTIONS.map(opt => ({ value: opt.value, label: t[opt.labelKey] || opt.value }))} />
          <Input  label={t.ticketNo} value={form.ticketNo} onChange={set("ticketNo")} placeholder={t.ticketPlaceholder} />
        </div>

        {/* Price table */}
        {priceTable.length > 0 && (
          <div style={{ marginTop:14, overflowX:"auto" }}>
            <p style={{ fontSize:11, color:tc.grey, marginBottom:6 }}>{t.priceTableHint}</p>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <thead>
                <tr style={{ background:"rgba(212,175,55,.1)" }}>
                  {[
                    { key:"_level",   label: t.hotelLevel  },
                    { key:"_mecca",   label: t.hotelMecca  },
                    { key:"_madina",  label: t.hotelMadina },
                    ...ROOM_TABLE_KEYS.map(k => ({ key: k, label: t[k] })),
                  ].map(({ key, label }) => (
                    <th key={key} style={{ padding:"5px 8px", color:tc.gold, fontWeight:700,
                      textAlign:"center", border:"1px solid rgba(212,175,55,.15)" }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {priceTable.map(row=>(
                  <tr key={row.level}
                    onClick={()=>setForm(f=>({...f,hotelLevel:row.level}))}
                    style={{ background:row.level===form.hotelLevel?"rgba(212,175,55,.08)":"transparent", cursor:"pointer" }}>
                    <td style={{ padding:"5px 8px", color:"#f8fafc",
                      fontWeight:row.level===form.hotelLevel?700:400,
                      border:"1px solid rgba(255,255,255,.05)", textAlign:"center" }}>{formatLevelLabel(row.level)}</td>
                    <td style={{ padding:"5px 8px", color:tc.grey, border:"1px solid rgba(255,255,255,.05)", textAlign:"center", fontSize:10 }}>{formatHotelName(row.hotelMecca)}</td>
                    <td style={{ padding:"5px 8px", color:tc.grey, border:"1px solid rgba(255,255,255,.05)", textAlign:"center", fontSize:10 }}>{formatHotelName(row.hotelMadina)}</td>
                    {["double","triple","quad","quint"].map(k=>(
                      <td key={k} style={{ padding:"5px 8px", textAlign:"center",
                        border:"1px solid rgba(255,255,255,.05)",
                        color:row.prices[k]?tc.gold:tc.grey, fontWeight:600 }}>
                        {row.prices[k]?formatPrice(row.prices[k]):"—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* ── Price ── */}
      <GlassCard gold style={{ padding:16, marginBottom:14 }}>
        <p style={{ fontSize:12, fontWeight:700, color:tc.gold, marginBottom:12 }}>💰 {t.priceSection}</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          <Input label={`${t.officialPrice} (${currencyLabel})`} value={form.officialPrice} onChange={set("officialPrice")} type="number" />
          <Input label={`${t.salePrice} (${currencyLabel})`} value={form.salePrice} onChange={set("salePrice")}
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
        <p style={{ fontSize:12, fontWeight:700, color:tc.gold, marginBottom:12 }}>🛂 {t.passport}</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          <Input label={t.passportNo} value={form.passport.number} onChange={setPass("number")}
            placeholder={t.passportPlaceholder} inputStyle={{ textTransform:"uppercase" }} />
          <Select label={t.nationality} value={form.passport.nationality} onChange={setPass("nationality")}
            options={NATIONALITIES} />
          <Select label={t.gender} value={form.passport.gender} onChange={setPass("gender")}
            options={[{value:"M",label:t.male},{value:"F",label:t.female}]} />
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
        <p style={{ fontSize:12, fontWeight:700, color:tc.gold, marginBottom:12 }}>📂 {t.documents}</p>
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
        <Button variant="primary" icon={isEdit?"💾":"➕"} onClick={handleSave}>
          {isEdit ? t.save : t.addClient}
        </Button>
      </div>
    </div>
  );
}
