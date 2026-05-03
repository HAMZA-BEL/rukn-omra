import React from "react";
import { Input, Select, Button, Divider, GlassCard, Modal } from "./UI";
import { CITIES, NATIONALITIES } from "../data/initialData";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { calcExpiry } from "../utils/amadeus";
import { AppIcon } from "./Icon";
import { PilgrimPhotoUploader, badgeStorageUnavailableMessage } from "../features/badges";
import {
  PROGRAM_ROOM_PRICE_KEYS,
  getPackageRoomPrice,
  getRoomTypeLabel,
  getRoomTypeOptions,
  normalizeProgramPackages,
  normalizeRoomTypeKey,
} from "../utils/programPackages";
import { translateRoomType } from "../utils/i18nValues";

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
const CURRENCY_BY_LANG = { ar: "د.م", fr: "MAD", en: "MAD" };
const ROOM_ENTRY_MODES = {
  SINGLE: "single",
  GROUP: "group",
};
const ROOM_CATEGORY_OPTIONS = [
  { value: "male_only", label: "رجال فقط" },
  { value: "female_only", label: "نساء فقط" },
  { value: "family", label: "عائلة" },
];
const ROOM_CAPACITY = {
  single: 1,
  double: 2,
  triple: 3,
  quad: 4,
  quint: 5,
};

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

const getRoomCategoryLabel = (category) => {
  return ROOM_CATEGORY_OPTIONS.find((option) => option.value === category)?.label || "رجال فقط";
};

const createGroupPerson = (index = 0) => ({
  id: `grp-person-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  firstName: "",
  lastName: "",
  phone: "",
  gender: index === 0 ? "male" : "",
});

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
  const normalizedRoomType = normalizeRoomTypeKey(pickString(client?.roomType, client?.room_type, "double"));
  const supportedRoomType = PROGRAM_ROOM_PRICE_KEYS.includes(normalizedRoomType) ? normalizedRoomType : "double";

  const passport = client?.passport || {};
  const docs     = client?.docs     || {};
  const gender = normalizeGenderValue(client?.gender || passport.gender);
  const rooming = docs.rooming || {};

  return {
    firstName,
    lastName,
    prenom,
    nom,
    phone:       pickString(client?.phone, client?.phoneNumber, client?.mobile),
    registrationSource: pickString(client?.registrationSource, client?.registration_source, client?.sourceRegistration, client?.source),
    address:     pickString(client?.address, client?.adress, client?.addressLine, client?.homeAddress),
    cin:         pickString(client?.cin, client?.CIN, client?.nationalId, client?.national_id, passport.cin, passport.nationalId),
    city:        pickString(client?.city, client?.ville, client?.addressCity),
    programId:   programId || "",
    packageId,
    hotelLevel:  packageLevel,
    packageLevel,
    hotelMecca:  pickString(client?.hotelMecca, client?.hotel_mecca),
    hotelMadina: pickString(client?.hotelMadina, client?.hotel_madina),
    roomType:    supportedRoomType,
    roomTypeLabel: pickString(client?.roomTypeLabel, client?.room_type_label, getRoomTypeLabel(supportedRoomType)),
    officialPrice,
    salePrice,
    ticketNo: pickString(client?.ticketNo, client?.ticket_no, client?.ticketNumber, client?.ticket),
    badgePhotoPath: pickString(client?.badgePhotoPath, client?.docs?.badgePhotoPath),
    notes:    pickString(client?.notes, client?.note),
    gender,
    roomCategory: pickString(client?.roomCategory, rooming.category, "male_only"),
    roomingGroupId: pickString(client?.roomingGroupId, rooming.groupId),
    roomingGroupName: pickString(client?.roomingGroupName, rooming.groupName),
    passport: {
      number:      pickString(passport.number, client?.passportNumber, client?.passport_no),
      cin:         pickString(passport.cin, passport.nationalId, client?.cin, client?.nationalId, client?.national_id),
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
      badgePhotoPath: pickString(client?.badgePhotoPath, docs.badgePhotoPath),
    },
  };
};

export default function ClientForm({ client, store, onSave, onCancel, defaultProgramId, lockProgramId = "" }) {
  const { t, tr, dir, lang } = useLang();
  const { programs, addClient, updateClient } = store;
  const badgePhotoApi = store.badgePhotoApi || { isAvailable: false };
  const isEdit = !!client;
  const numberLocale = LOCALE_BY_LANG[lang] || "ar-MA";
  const currencyLabel = CURRENCY_BY_LANG[lang] || "د.م";
  const formatPrice = (value) => (typeof value === "number" ? value.toLocaleString(numberLocale) : (value ?? "—"));
  const localizedRoomTypeOptions = React.useMemo(
    () => getRoomTypeOptions().map((option) => ({ ...option, label: translateRoomType(option.value, lang) || option.label })),
    [lang]
  );
  const formatLevelLabel = (value) => getLocalizedValue(value, HOTEL_LEVEL_KEYS, t);
  const formatHotelName = (value) => getLocalizedValue(value, HOTEL_NAME_KEYS, t);
  const skipProgramResetRef = React.useRef(true);
  const salePriceManualRef = React.useRef(isEdit);
  const previousOfficialPriceRef = React.useRef(0);

  const [form, setForm] = React.useState(() => buildFormState(client, defaultProgramId, programs));
  const [entryMode, setEntryMode] = React.useState(isEdit ? ROOM_ENTRY_MODES.SINGLE : ROOM_ENTRY_MODES.SINGLE);
  const [groupPeople, setGroupPeople] = React.useState([createGroupPerson(0)]);
  const [badgePhotoFile, setBadgePhotoFile] = React.useState(null);
  const [badgePhotoUrl, setBadgePhotoUrl] = React.useState("");
  const [badgePhotoRemoved, setBadgePhotoRemoved] = React.useState(false);
  const [badgePhotoError, setBadgePhotoError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Update form when client changes (for edit mode)
  React.useEffect(() => {
    if (client) {
      skipProgramResetRef.current = true;
      skipInitialAutoFillRef.current = true;
      salePriceManualRef.current = true;
      setForm(buildFormState(client, defaultProgramId, programs));
      setEntryMode(ROOM_ENTRY_MODES.SINGLE);
      setGroupPeople([createGroupPerson(0)]);
      setBadgePhotoFile(null);
      setBadgePhotoRemoved(false);
      setBadgePhotoError("");
    }
  }, [client, defaultProgramId, programs]);

  React.useEffect(() => {
    let cancelled = false;
    const path = form.badgePhotoPath;
    setBadgePhotoUrl("");
    if (!path || !badgePhotoApi.isAvailable || !badgePhotoApi.getPhotoUrl) return undefined;
    badgePhotoApi.getPhotoUrl(path).then((url) => {
      if (!cancelled) setBadgePhotoUrl(url || "");
    });
    return () => { cancelled = true; };
  }, [badgePhotoApi, form.badgePhotoPath]);

  React.useEffect(() => {
    if (!lockProgramId || form.programId === lockProgramId) return;
    skipProgramResetRef.current = true;
    setForm((prev) => ({ ...prev, programId: lockProgramId }));
  }, [lockProgramId, form.programId]);

  const [errors,  setErrors]  = React.useState({});
  const [autoPriceNote, setAutoPriceNote] = React.useState("");
  const localizedRoomCategoryOptions = React.useMemo(() => ROOM_CATEGORY_OPTIONS.map((option) => ({
    ...option,
    label: option.value === "male_only"
      ? (t.roomCategoryMaleOnly || option.label)
      : option.value === "female_only"
        ? (t.roomCategoryFemaleOnly || option.label)
        : (t.roomCategoryFamily || option.label),
  })), [t]);

  const set     = k => e => setForm(f => ({...f, [k]: e.target.value}));
  const setSalePrice = e => {
    salePriceManualRef.current = true;
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
  const roomCapacity = ROOM_CAPACITY[normalizeRoomTypeKey(form.roomType)] || 1;
  const setRoomCategory = React.useCallback((category) => {
    setForm((prev) => ({ ...prev, roomCategory: category }));
    setGroupPeople((prev) => prev.map((person) => {
      if (category === "male_only" && person.gender === "female") return { ...person, gender: "" };
      if (category === "female_only" && person.gender === "male") return { ...person, gender: "" };
      return person;
    }));
    if (category === "male_only") setAutoPriceNote(t.incompatibleGenderRemoved || "تمت إزالة الأجناس غير المتوافقة. راجع صفوف الغرفة قبل الحفظ.");
    if (category === "female_only") setAutoPriceNote(t.incompatibleGenderRemoved || "تمت إزالة الأجناس غير المتوافقة. راجع صفوف الغرفة قبل الحفظ.");
  }, [t]);
  const buildGroupPersonName = React.useCallback((person) => (
    [pickString(person.firstName), pickString(person.lastName)].filter(Boolean).join(" ").trim()
  ), []);
  const updateGroupPerson = React.useCallback((personId, patch) => {
    setGroupPeople((prev) => prev.map((person) => person.id === personId ? { ...person, ...patch } : person));
  }, []);
  const addGroupPerson = React.useCallback(() => {
    if (groupPeople.length >= roomCapacity) {
      if (!window.confirm(t.confirmExtraPerson || "عدد الأشخاص تجاوز سعة الغرفة. هل تريد إضافة شخص إضافي؟")) return;
    }
    setGroupPeople((prev) => [...prev, createGroupPerson(prev.length)]);
  }, [groupPeople.length, roomCapacity, t]);
  const removeGroupPerson = React.useCallback((personId) => {
    setGroupPeople((prev) => prev.length <= 1 ? prev : prev.filter((person) => person.id !== personId));
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
  const derivedOfficialPrice = React.useMemo(
    () => selectedPackage ? getPackageRoomPrice(selectedPackage, form.roomType) : 0,
    [selectedPackage, form.roomType]
  );
  const officialPriceMissing = Boolean(selectedPackage && form.roomType && !derivedOfficialPrice);

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

  const applyOfficialPriceToSale = React.useCallback(() => {
    if (!derivedOfficialPrice) return;
    salePriceManualRef.current = false;
    setForm((f) => ({ ...f, salePrice: derivedOfficialPrice }));
    setAutoPriceNote(t.officialPriceApplied || "تم استخدام السعر الرسمي كسعر البيع");
  }, [derivedOfficialPrice, t]);

  // Auto-fill hotel + official price when package or room changes
  const prevLevelRef = React.useRef("");
  const prevRoomRef  = React.useRef("");
  const skipInitialAutoFillRef = React.useRef(isEdit);

  React.useEffect(() => {
    if (!selectedPackage) {
      setForm((f) => (Number(f.officialPrice) === 0 ? f : { ...f, officialPrice: 0 }));
      previousOfficialPriceRef.current = 0;
      return;
    }
    if (skipInitialAutoFillRef.current) {
      skipInitialAutoFillRef.current = false;
      prevLevelRef.current = selectedPackage.id;
      prevRoomRef.current = form.roomType;
    }
    const changed = !(
      prevLevelRef.current === selectedPackage.id &&
      prevRoomRef.current  === form.roomType
    );
    prevLevelRef.current = selectedPackage.id;
    prevRoomRef.current  = form.roomType;

    setForm(f => {
      const previousOfficial = Number(previousOfficialPriceRef.current || 0);
      const currentSale = Number(f.salePrice || 0);
      const shouldFillSale = Boolean(derivedOfficialPrice) && (
        !salePriceManualRef.current ||
        !currentSale ||
        (previousOfficial && currentSale === previousOfficial)
      );
      return {
        ...f,
        packageId: selectedPackage.id,
        hotelLevel: selectedPackage.level,
        packageLevel: selectedPackage.level,
        roomTypeLabel: getRoomTypeLabel(f.roomType),
        hotelMecca:    selectedPackage.hotelMecca,
        hotelMadina:   selectedPackage.hotelMadina,
        officialPrice: derivedOfficialPrice || 0,
        ...(shouldFillSale ? { salePrice: derivedOfficialPrice } : {}),
      };
    });
    previousOfficialPriceRef.current = derivedOfficialPrice || 0;
    if (changed) {
      setAutoPriceNote(derivedOfficialPrice
        ? (t.officialPriceUpdated || "تم تحديث السعر الرسمي من المستوى ونوع الغرفة المختارين")
        : "");
    }
  }, [form.roomType, selectedPackage, derivedOfficialPrice, t]);

  // Reset hotel when program changes
  React.useEffect(() => {
    if (skipProgramResetRef.current) {
      skipProgramResetRef.current = false;
      return;
    }
    const firstPackage = programPackages[0];
    salePriceManualRef.current = false;
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
    if (entryMode === ROOM_ENTRY_MODES.GROUP && !isEdit) {
      if (!form.salePrice || form.salePrice <= 0) e.salePrice = t.salePriceError;
      if (!form.registrationSource.trim()) e.registrationSource = t.registrationSourceError || "يرجى إدخال جهة التسجيل";
      const peopleErrors = groupPeople.map((person) => {
        const rowErrors = {};
        if (!pickString(person.lastName)) rowErrors.lastName = t.lastNameError || "يرجى إدخال الاسم العائلي";
        if (!pickString(person.firstName)) rowErrors.firstName = t.firstNameError || "يرجى إدخال الاسم الشخصي";
        if (!person.gender) rowErrors.gender = t.genderRequired || "يرجى تحديد الجنس";
        if (form.roomCategory === "male_only" && person.gender && person.gender !== "male") rowErrors.gender = t.maleOnlyRoomError || "هذه الغرفة مخصصة للرجال فقط";
        if (form.roomCategory === "female_only" && person.gender && person.gender !== "female") rowErrors.gender = t.femaleOnlyRoomError || "هذه الغرفة مخصصة للنساء فقط";
        return rowErrors;
      });
      if (peopleErrors.some((row) => Object.keys(row).length)) e.groupPeople = peopleErrors;
      return e;
    }
    if (!form.firstName.trim() && !form.lastName.trim()) e.firstName = t.firstNameError;
    if (!form.phone.trim())    e.phone    = t.phoneError;
    if (!form.registrationSource.trim()) e.registrationSource = t.registrationSourceError || "يرجى إدخال جهة التسجيل";
    if (!form.salePrice || form.salePrice <= 0) e.salePrice = t.salePriceError;
    if (!form.gender) e.gender = t.genderRequired || "يرجى تحديد الجنس";
    return e;
  };

  const createClientId = () => (
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `client-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  );

  const resolveBadgePhotoPath = async (clientId, currentPath = "") => {
    let nextPath = pickString(currentPath);
    if (badgePhotoFile && !badgePhotoApi.isAvailable) {
      setBadgePhotoError(badgeStorageUnavailableMessage(lang));
      return { ok: false, path: nextPath };
    }
    if (badgePhotoRemoved && nextPath && badgePhotoApi.isAvailable && badgePhotoApi.removePhoto) {
      await badgePhotoApi.removePhoto(nextPath);
      nextPath = "";
    }
    if (badgePhotoFile && badgePhotoApi.isAvailable && badgePhotoApi.uploadPhoto) {
      const previousPath = nextPath;
      const { data, error } = await badgePhotoApi.uploadPhoto(clientId, badgePhotoFile);
      if (error || !data?.path) {
        setBadgePhotoError(
          lang === "fr"
            ? "Impossible d'envoyer la photo. Vérifiez le bucket Supabase."
            : lang === "en"
              ? "Could not upload the photo. Check the Supabase bucket."
              : "تعذر رفع الصورة. تحقق من إعدادات Supabase Storage."
        );
        return { ok: false, path: nextPath };
      }
      nextPath = data.path;
      if (previousPath && previousPath !== nextPath && badgePhotoApi.removePhoto) {
        await badgePhotoApi.removePhoto(previousPath);
      }
    }
    if (badgePhotoRemoved && !badgePhotoFile) nextPath = "";
    return { ok: true, path: nextPath };
  };

  const withBadgePhotoPath = (data, path) => ({
    ...data,
    badgePhotoPath: path,
    docs: {
      ...data.docs,
      badgePhotoPath: path,
      photo: Boolean(data.docs?.photo || path),
    },
  });

  const handleSave = async () => {
    if (saving) return;
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (entryMode === ROOM_ENTRY_MODES.GROUP && !isEdit) {
      if (groupPeople.length > roomCapacity && !window.confirm(t.confirmOverCapacity || "عدد الأشخاص أكبر من سعة نوع الغرفة المحدد. هل تريد المتابعة؟")) {
        return;
      }
      const roomingGroupId = `rg-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
      const roomingGroupName = form.roomingGroupName || `مجموعة ${getRoomTypeLabel(form.roomType)} ${String(Date.now()).slice(-4)}`;
      const sharedBase = {
        ...form,
        programId: lockProgramId || form.programId,
        packageId: selectedPackage?.id || form.packageId || "",
        packageLevel: selectedPackage?.level || form.packageLevel || form.hotelLevel || "",
        hotelLevel: selectedPackage?.level || form.hotelLevel || "",
        hotelMecca: selectedPackage?.hotelMecca || form.hotelMecca,
        hotelMadina: selectedPackage?.hotelMadina || form.hotelMadina,
        roomType: normalizeRoomTypeKey(form.roomType),
        roomTypeLabel: getRoomTypeLabel(form.roomType),
        officialPrice: Number(derivedOfficialPrice || 0),
        salePrice: Number(form.salePrice),
        roomCategory: form.roomCategory,
        roomCategoryLabel: getRoomCategoryLabel(form.roomCategory),
        roomingGroupId,
        roomingGroupName,
        roomingGroupSize: groupPeople.length,
      };
      groupPeople.forEach((person, index) => {
        const personName = buildGroupPersonName(person);
        addClient({
          ...sharedBase,
          firstName: pickString(person.firstName),
          lastName: pickString(person.lastName),
          name: personName,
          nom: "",
          prenom: "",
          phone: pickString(person.phone, form.phone),
          gender: person.gender,
          roomingSeatIndex: index + 1,
          passport: {
            ...form.passport,
            number: "",
            birthDate: "",
            expiry: "",
            issueDate: "",
            gender: genderToPassportValue(person.gender),
          },
          docs: {
            passportCopy: false,
            photo: false,
            vaccine: false,
            contract: false,
            rooming: {
              groupId: roomingGroupId,
              groupName: roomingGroupName,
              category: form.roomCategory,
              categoryLabel: getRoomCategoryLabel(form.roomCategory),
              groupSize: groupPeople.length,
              seatIndex: index + 1,
            },
          },
          ticketNo: "",
          notes: form.notes,
        });
      });
      onSave();
      return;
    }
    setSaving(true);
    setBadgePhotoError("");
    const baseData = {
      ...form,
      programId: lockProgramId || form.programId,
      packageId: selectedPackage?.id || form.packageId || "",
      packageLevel: selectedPackage?.level || form.packageLevel || form.hotelLevel || "",
      hotelLevel: selectedPackage?.level || form.hotelLevel || "",
      hotelMecca: selectedPackage?.hotelMecca || form.hotelMecca,
      hotelMadina: selectedPackage?.hotelMadina || form.hotelMadina,
      roomType: normalizeRoomTypeKey(form.roomType),
      roomTypeLabel: getRoomTypeLabel(form.roomType),
      officialPrice: Number(derivedOfficialPrice || 0),
      salePrice:     Number(form.salePrice),
      gender: form.gender,
      passport: {
        ...form.passport,
        cin: pickString(form.cin, form.passport.cin),
        gender: genderToPassportValue(form.gender),
      },
    };
    try {
      const targetId = isEdit ? client.id : (badgePhotoFile ? createClientId() : "");
      const photoResult = await resolveBadgePhotoPath(targetId || client?.id, form.badgePhotoPath);
      if (!photoResult.ok) return;
      const data = withBadgePhotoPath(baseData, photoResult.path);
      isEdit ? updateClient(client.id, data) : addClient(targetId ? { ...data, id: targetId } : data);
      onSave();
    } finally {
      setSaving(false);
    }
  };

  // Apply MRZ data

  return (
    <div>
      {!isEdit && (
        <GlassCard gold style={{ padding:16, marginBottom:14 }}>
          <p style={{ fontSize:12, fontWeight:700, color:tc.gold, marginBottom:12 }}>{t.entryModeTitle || "طريقة الإدخال"}</p>
          <div style={{ display:"inline-flex", gap:8, flexWrap:"wrap" }}>
            {[
              { value: ROOM_ENTRY_MODES.SINGLE, label: t.entrySingle || "إضافة شخص واحد" },
              { value: ROOM_ENTRY_MODES.GROUP, label: t.entryRoomGroup || "إضافة غرفة" },
            ].map((option) => {
              const active = entryMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setEntryMode(option.value);
                    setErrors({});
                  }}
                  style={{
                    minWidth: 140,
                    padding: "10px 16px",
                    borderRadius: 12,
                    border: `1px solid ${active ? "var(--rukn-gold)" : "var(--rukn-border-soft)"}`,
                    background: active ? "var(--rukn-gold-dim)" : "var(--rukn-bg-soft)",
                    color: active ? "var(--rukn-gold)" : "var(--rukn-text-strong)",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'Cairo',sans-serif",
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* ── Program + Booking ── */}
      <GlassCard gold style={{ padding:16, marginBottom:14 }}>
        <p style={{ fontSize:12, fontWeight:700, color:tc.gold, marginBottom:12, display:"inline-flex", alignItems:"center", gap:6 }}><AppIcon name="program" size={14} color={tc.gold} /> {t.programBookingSection || "بيانات البرنامج والحجز"}</p>
        <div className="form-grid form-grid--two">
          <Select
            label={t.program}
            value={form.programId}
            onChange={set("programId")}
            options={(lockProgramId ? programs.filter((p) => p.id === lockProgramId) : programs).map((p) => ({ value: p.id, label: p.name }))}
            disabled={Boolean(lockProgramId)}
            style={{ gridColumn:"1/-1" }}
          />
          {programPackages.length > 0 && (
            <Select
              label={t.level || "المستوى"}
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
            options={localizedRoomTypeOptions}
          />
          <Select
            label={t.roomCategory || "تصنيف الغرفة"}
            value={form.roomCategory}
            onChange={(e) => setRoomCategory(e.target.value)}
            options={localizedRoomCategoryOptions}
          />
          <Input label={t.ticketNo} value={form.ticketNo} onChange={set("ticketNo")} placeholder={t.ticketPlaceholder} />
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
              <p style={{ fontSize:11, color:tc.grey }}>{t.officialPrice}: <span style={{ color:tc.gold }}>{derivedOfficialPrice ? `${formatPrice(derivedOfficialPrice)} ${currencyLabel}` : "—"}</span></p>
            </div>
            {officialPriceMissing && (
              <p style={{ fontSize:11, color:tc.warning, marginTop:8 }}>
                {t.officialPriceMissing || "لم يتم تحديد سعر لهذا المستوى ونوع الغرفة في البرنامج"}
              </p>
            )}
            {autoPriceNote && (
              <p style={{ fontSize:11, color:tc.greenLight, marginTop:8 }}>{autoPriceNote}</p>
            )}
          </div>
        )}
        {entryMode === ROOM_ENTRY_MODES.GROUP && (
          <p style={{ fontSize:11, color:tc.grey, marginTop:10 }}>
            {tr("currentRoomCapacity", { count: groupPeople.length, capacity: roomCapacity }) || `السعة الحالية: ${groupPeople.length}/${roomCapacity} • سيتم حفظ كل شخص كمعتمر مستقل داخل البرنامج.`}
          </p>
        )}
      </GlassCard>

      {/* ── Arabic Name ── */}
      {entryMode === ROOM_ENTRY_MODES.SINGLE ? (
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
      ) : (
        <GlassCard gold style={{ padding:16, marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, marginBottom:12, flexWrap:"wrap" }}>
            <p style={{ fontSize:12, fontWeight:700, color:tc.gold }}>
              <AppIcon name="users" size={14} color={tc.gold} /> {t.roomPeopleTitle || "الأشخاص داخل الغرفة"}
            </p>
            <Button variant="ghost" icon="plus" onClick={addGroupPerson}>{t.addPersonInsideRoom || "إضافة شخص داخل الغرفة"}</Button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {groupPeople.map((person, index) => {
              const rowErrors = errors.groupPeople?.[index] || {};
              return (
                <div key={person.id} style={{
                  border:"1px solid rgba(212,175,55,.14)",
                  borderRadius:12,
                  padding:12,
                  background:"rgba(255,255,255,.03)",
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, marginBottom:10 }}>
                    <p style={{ fontSize:12, fontWeight:700, color:"var(--rukn-text-strong)" }}>{tr("personLabel", { n: index + 1 }) || `الشخص ${index + 1}`}</p>
                    <Button variant="ghost" icon="trash" onClick={() => removeGroupPerson(person.id)} disabled={groupPeople.length <= 1}>
                      حذف
                    </Button>
                  </div>
                  <div className="form-grid form-grid--two">
                    <Input
                      label={t.lastName}
                      value={person.lastName}
                      onChange={(e) => updateGroupPerson(person.id, { lastName: e.target.value })}
                      error={rowErrors.lastName}
                    />
                    <Input
                      label={t.firstName}
                      value={person.firstName}
                      onChange={(e) => updateGroupPerson(person.id, { firstName: e.target.value })}
                      error={rowErrors.firstName}
                    />
                    <Input
                      label={t.phone}
                      value={person.phone}
                      onChange={(e) => updateGroupPerson(person.id, { phone: e.target.value })}
                      placeholder={t.phonePlaceholder}
                    />
                  </div>
                  <div style={{ marginTop:12 }}>
                    <label style={{ fontSize:12, fontWeight:600, color:tc.grey, display:"block", marginBottom:8 }}>
                      {t.gender} *
                    </label>
                    <div style={{ display:"inline-flex", gap:8, flexWrap:"wrap" }}>
                      {[
                        { value: "male", label: t.male },
                        { value: "female", label: t.female },
                      ].map((option) => {
                        const active = person.gender === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateGroupPerson(person.id, { gender: option.value })}
                            style={{
                              minWidth: 92,
                              padding: "10px 16px",
                              borderRadius: 12,
                              border: `1px solid ${active ? "var(--rukn-gold)" : "var(--rukn-border-soft)"}`,
                              background: active ? "var(--rukn-gold-dim)" : "var(--rukn-bg-soft)",
                              color: active ? "var(--rukn-gold)" : "var(--rukn-text-strong)",
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: "pointer",
                              fontFamily: "'Cairo',sans-serif",
                            }}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    {rowErrors.gender && (
                      <p style={{ color: tc.danger, fontSize: 11, marginTop: 6 }}>{rowErrors.gender}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* ── Latin Name ── */}
      {entryMode === ROOM_ENTRY_MODES.SINGLE && (
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
      )}

      {/* ── Contact ── */}
      <GlassCard style={{ padding:16, marginBottom:14 }}>
        <p style={{ fontSize:12, fontWeight:700, color:tc.gold, marginBottom:12, display:"inline-flex", alignItems:"center", gap:6 }}><AppIcon name="phone" size={14} color={tc.gold} /> {t.contactInfo}</p>
        <div className="form-grid form-grid--two">
          <Input label={entryMode === ROOM_ENTRY_MODES.GROUP ? (t.sharedPhoneOptional || "هاتف مشترك اختياري") : t.phone} value={form.phone} onChange={set("phone")}
            placeholder={t.phonePlaceholder} required={entryMode === ROOM_ENTRY_MODES.SINGLE} error={entryMode === ROOM_ENTRY_MODES.SINGLE ? errors.phone : ""} />
          <Input
            label={t.registrationSource || "جهة التسجيل"}
            value={form.registrationSource}
            onChange={set("registrationSource")}
            required
            error={errors.registrationSource}
          />
          <Input
            label={t.address || "العنوان"}
            value={form.address}
            onChange={set("address")}
          />
          <Select label={t.city} value={form.city} onChange={set("city")}
            options={["", ...CITIES].map(c => ({ value:c, label:c || t.selectCityPlaceholder }))} />
        </div>
        {entryMode === ROOM_ENTRY_MODES.SINGLE && (
        <div style={{ marginTop:12 }}>
          <label style={{ fontSize:12, fontWeight:600, color:tc.grey, display:"block", marginBottom:8 }}>
            {t.gender} *
          </label>
          <div style={{ display:"inline-flex", gap:8, flexWrap:"wrap" }}>
            {[
              { value: "male", label: t.male },
              { value: "female", label: t.female },
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
                    border: `1px solid ${active ? "var(--rukn-gold)" : "var(--rukn-border-soft)"}`,
                    background: active ? "var(--rukn-gold-dim)" : "var(--rukn-bg-soft)",
                    color: active ? "var(--rukn-gold)" : "var(--rukn-text-strong)",
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
        )}
      </GlassCard>

      {/* ── Price ── */}
      <GlassCard gold style={{ padding:16, marginBottom:14 }}>
        <p style={{ fontSize:12, fontWeight:700, color:tc.gold, marginBottom:12, display:"inline-flex", alignItems:"center", gap:6 }}><AppIcon name="banknote" size={14} color={tc.gold} /> {t.priceSection}</p>
        <div className="form-grid form-grid--three">
          <Input
            label={`${t.officialPrice} (${currencyLabel})`}
            value={derivedOfficialPrice || ""}
            onChange={() => {}}
            type="number"
            readOnly
            inputStyle={{
              cursor:"not-allowed",
              background:"var(--rukn-bg-soft)",
              border:"1px solid var(--rukn-border-soft)",
              color:"var(--rukn-text-muted)",
              fontWeight:700,
            }}
          />
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <Input label={`${t.salePrice} (${currencyLabel})`} value={form.salePrice} onChange={setSalePrice}
              type="number" required error={errors.salePrice}
              inputStyle={{ border:`1px solid ${tc.gold}`, color:tc.gold, fontWeight:700 }} />
            <button
              type="button"
              onClick={applyOfficialPriceToSale}
              disabled={!derivedOfficialPrice}
              style={{
                alignSelf:"flex-start",
                border:"1px solid rgba(212,175,55,.3)",
                background:"rgba(212,175,55,.08)",
                color:derivedOfficialPrice ? tc.gold : tc.grey,
                borderRadius:8,
                padding:"5px 10px",
                fontSize:11,
                fontWeight:700,
                fontFamily:"'Cairo',sans-serif",
                cursor:derivedOfficialPrice ? "pointer" : "not-allowed",
                opacity:derivedOfficialPrice ? 1 : 0.55,
              }}
            >
              {t.useOfficialPrice || "استخدام السعر الرسمي"}
            </button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <label style={{ fontSize:12, fontWeight:600, color:tc.grey }}>{t.discount}</label>
            <div style={{ background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)",
              borderRadius:10, padding:"10px 12px",
              color:discount>0?tc.danger:tc.grey, fontSize:13, fontWeight:700 }}>
              {discount>0 ? `- ${formatPrice(discount)} ${currencyLabel}` : t.noDiscount}
            </div>
          </div>
        </div>
        {officialPriceMissing && (
          <p style={{ fontSize:11, color:tc.warning, marginTop:8 }}>
            {t.officialPriceMissing || "لم يتم تحديد سعر لهذا المستوى ونوع الغرفة في البرنامج"}
          </p>
        )}
      </GlassCard>

      {/* ── Passport ── */}
      {entryMode === ROOM_ENTRY_MODES.SINGLE && (
      <GlassCard style={{ padding:16, marginBottom:14 }}>
        <p style={{ fontSize:12, fontWeight:700, color:tc.gold, marginBottom:12, display:"inline-flex", alignItems:"center", gap:6 }}><AppIcon name="passport" size={14} color={tc.gold} /> {t.passport}</p>
        <div className="form-grid form-grid--three">
          <Input label={t.passportNo} value={form.passport.number} onChange={setPass("number")}
            placeholder={t.passportPlaceholder} inputStyle={{ textTransform:"uppercase" }} />
          <Input label={t.cin || "رقم البطاقة الوطنية"} value={form.cin} onChange={set("cin")}
            placeholder={lang === "fr" ? "N° CIN" : lang === "en" ? "National ID / CIN" : "رقم البطاقة الوطنية"} />
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
      )}

      {/* ── Documents ── */}
      {entryMode === ROOM_ENTRY_MODES.SINGLE && (
      <GlassCard style={{ padding:16, marginBottom:14 }}>
        <p style={{ fontSize:12, fontWeight:700, color:tc.gold, marginBottom:12, display:"inline-flex", alignItems:"center", gap:6 }}><AppIcon name="documents" size={14} color={tc.gold} /> {t.documents}</p>
        <div style={{ marginBottom:14 }}>
          <PilgrimPhotoUploader
            lang={lang}
            photoUrl={badgePhotoRemoved ? "" : badgePhotoUrl}
            disabled={!badgePhotoApi.isAvailable}
            busy={saving}
            error={badgePhotoError}
            onPhotoReady={(file) => {
              setBadgePhotoFile(file);
              setBadgePhotoRemoved(false);
              setBadgePhotoError("");
              setForm((prev) => ({
                ...prev,
                docs: { ...prev.docs, photo: true },
              }));
            }}
            onRemove={() => {
              setBadgePhotoFile(null);
              setBadgePhotoRemoved(true);
              setBadgePhotoError("");
              setForm((prev) => ({
                ...prev,
                docs: { ...prev.docs, photo: false },
              }));
            }}
          />
        </div>
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
      )}

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
        <Button variant="primary" icon={isEdit?"save":"plus"} onClick={handleSave} disabled={saving}>
          {saving ? (t.loading || "جاري الحفظ...") : isEdit ? t.save : entryMode === ROOM_ENTRY_MODES.GROUP ? (t.saveRoom || "حفظ الغرفة") : t.addClient}
        </Button>
      </div>
    </div>
  );
}
