import React from "react";
import { Input, Select, Button, Divider, GlassCard, Modal } from "./UI";
import { CITIES, NATIONALITIES } from "../data/initialData";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { calcExpiry } from "../utils/amadeus";
import { isFutureDateInput, toDateInputValue } from "../utils/age";
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
import {
  getProgramServiceCostingReferenceCost,
  getProgramServiceSalePriceFallback,
  getProgramStandaloneServiceSalePrice,
} from "./programs/programCosting";
import { translateRoomType } from "../utils/i18nValues";
import {
  clientServiceIncludesAccommodation,
  getClientServiceType,
  getClientServiceTypeOptions,
  normalizeClientServiceType,
} from "../utils/clientServiceTypes";
import { getProgramKind } from "../utils/participantTerminology";
import { getClientDisplayName } from "../utils/clientNames";
import {
  REPRESENTED_BY_RELATIONSHIPS,
  clientHasCin,
  getSameProgramRepresentativeOptions,
  isClientMinorWithoutCin,
  normalizeRepresentativeRelationship,
} from "../utils/clientRepresentation";

const tc = theme.colors;

const DOCUMENT_FIELDS = [
  ["photo", "photo"],
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
  kamal: 1,
};

const getProgramAddLabel = (program, lang, fallback) => {
  if (!program) return fallback;
  const kind = getProgramKind(program);
  if (kind === "hajj") {
    if (lang === "fr") return "Ajouter un pèlerin Hajj";
    if (lang === "en") return "Add Hajj pilgrim";
    return "إضافة حاج";
  }
  if (lang === "fr") return "Ajouter un pèlerin Omra";
  if (lang === "en") return "Add Umrah pilgrim";
  return "إضافة معتمر";
};

const getLocalizedValue = (value, map, t) => {
  const key = map[value];
  return key ? (t[key] || value) : value;
};

const representationText = (lang) => ({
  title: lang === "fr" ? "Représentation" : lang === "en" ? "Representation" : "النيابة في العقد",
  hasCin: lang === "fr"
    ? "Ce pèlerin possède une CIN, un contrat individuel sera généré."
    : lang === "en"
    ? "This pilgrim has a national ID, so an individual contract will be generated."
    : "هذا المعتمر يملك بطاقة وطنية، لذلك سيتم إنشاء عقد منفرد له.",
  minorNeedsRepresentative: lang === "fr"
    ? "Ce pèlerin n’a pas de CIN. Vous pouvez choisir la personne qui le représente dans le contrat."
    : lang === "en"
    ? "This pilgrim has no national ID. You can select who represents them in the contract."
    : "هذا المعتمر لا يملك بطاقة وطنية، ويمكن اختيار من ينوب عنه في العقد.",
  adultNoCin: lang === "fr"
    ? "Ce pèlerin est adulte mais n’a pas de CIN."
    : lang === "en"
    ? "This pilgrim is adult but has no national ID."
    : "هذا المعتمر بالغ لكنه لا يملك بطاقة وطنية.",
  waitingForBirthDate: lang === "fr"
    ? "Ajoutez la date de naissance et la CIN pour déterminer le type de contrat."
    : lang === "en"
    ? "Add birth date and national ID to determine the contract type."
    : "أدخل تاريخ الازدياد والبطاقة الوطنية لتحديد نوع العقد.",
  representedBy: lang === "fr" ? "Représenté par" : lang === "en" ? "Represented by" : "ينوب عنه",
  relationship: lang === "fr" ? "Lien de parenté" : lang === "en" ? "Relationship" : "صلة القرابة",
  searchRepresentative: lang === "fr" ? "Rechercher dans les pèlerins du même programme" : lang === "en" ? "Search same-program pilgrims" : "ابحث داخل معتمري نفس البرنامج",
  selectRepresentative: lang === "fr" ? "Choisir un représentant" : lang === "en" ? "Select representative" : "اختر من ينوب عنه",
  noRepresentative: lang === "fr" ? "Aucun représentant éligible dans ce programme" : lang === "en" ? "No eligible representative in this program" : "لا يوجد ممثل مؤهل في هذا البرنامج",
  noResults: lang === "fr" ? "Aucun résultat" : lang === "en" ? "No results" : "لا توجد نتائج",
  representativeRequired: lang === "fr"
    ? "Choisissez un représentant pour ce mineur."
    : lang === "en"
    ? "Select a representative for this minor."
    : "يرجى اختيار من ينوب عن هذا القاصر.",
});

const pickString = (...candidates) => {
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed) return trimmed;
    }
  }
  return "";
};

const normalizeSearchValue = (value) => pickString(value).toLowerCase();

const getRepresentativeDisplayName = (client = {}) => (
  pickString(getClientDisplayName(client, ""), client.name, client.displayName, client.fullName, client.id)
);

const getRepresentativeSearchText = (client = {}) => {
  const passport = client.passport || {};
  return [
    getRepresentativeDisplayName(client),
    client.name,
    client.displayName,
    client.fullName,
    client.firstName,
    client.lastName,
    client.prenom,
    client.nom,
    client.phone,
    passport.number,
    client.passportNumber,
    client.passport_number,
  ].map(normalizeSearchValue).filter(Boolean).join(" ");
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

const getProgramPlaceholder = (lang) => {
  if (lang === "fr") return "Choisir un programme";
  if (lang === "en") return "Select program";
  return "اختيار برنامج";
};

const getNoAccommodationServiceNote = (lang) => {
  if (lang === "fr") return "Ce type de service ne nécessite pas d’hébergement.";
  if (lang === "en") return "This service type does not require accommodation.";
  return "هذا النوع من الخدمة لا يحتاج سكنًا.";
};

const getManualSellingPriceHelpText = (lang) => {
  if (lang === "fr") return "Vous pouvez définir le prix de vente selon l’accord avec le client.";
  if (lang === "en") return "You can set the selling price according to the client agreement.";
  return "يمكنك تحديد سعر البيع حسب الاتفاق مع العميل.";
};

const getMissingCostingHint = (lang) => {
  if (lang === "fr") return "Aucune tarification enregistrée pour ce programme. Vous pouvez saisir le prix de vente manuellement.";
  if (lang === "en") return "No saved costing was found for this program. You can enter the selling price manually.";
  return "لم يتم العثور على تسعير محفوظ لهذا البرنامج. يمكنك إدخال سعر البيع يدويًا.";
};

const getReferenceCostLabel = (serviceType, fallback, lang) => {
  if (serviceType === "visa_only") {
    if (lang === "fr") return "Coût du visa selon la cotation";
    if (lang === "en") return "Visa cost from costing";
    return "تكلفة التأشيرة حسب التسعير";
  }
  if (serviceType === "ticket_only") {
    if (lang === "fr") return "Coût du billet selon la cotation";
    if (lang === "en") return "Ticket cost from costing";
    return "تكلفة التذكرة حسب التسعير";
  }
  return fallback;
};

const createGroupPerson = (index = 0) => ({
  id: `grp-person-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  firstName: "",
  lastName: "",
  phone: "",
  gender: index === 0 ? "male" : "",
});

const isActiveProgramChoice = (program = {}) => (
  program
  && !program.deleted
  && !program.deletedAt
  && String(program.status || "active").toLowerCase() !== "archived"
);

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
  const isEdit = Boolean(client);

  const clientProgramId = pickString(
    client?.programId,
    client?.program_id,
    client?.program?.id
  );
  const programId = clientProgramId || (isEdit ? "" : pickString(defaultProgramId));
  const selectedProgram = programs.find(p => p.id === programId);
  const programPackages = selectedProgram ? normalizeProgramPackages(selectedProgram) : [];
  const savedPackageId = pickString(client?.packageId, client?.package_id);
  const savedPackageLevel = pickString(client?.packageLevel, client?.hotelLevel, client?.hotel_level);
  const packageBySavedId = savedPackageId
    ? programPackages.find(pkg => pkg.id === savedPackageId)
    : null;
  const packageBySavedLevel = savedPackageLevel
    ? programPackages.find(pkg => pkg.level === savedPackageLevel)
    : null;
  const initialPackage = isEdit
    ? (packageBySavedId || packageBySavedLevel || null)
    : null;
  const packageId = initialPackage?.id || "";
  const packageLevel = isEdit
    ? (packageBySavedId?.level || savedPackageLevel || initialPackage?.level || "")
    : (initialPackage?.level || "");

  const officialPrice = pickNumber(
    client?.officialPrice,
    client?.official_price,
    client?.price
  );
  const serviceType = getClientServiceType(client);
  const serviceUsesManualOnlyPrice = serviceType === "ticket_only" || serviceType === "visa_only";
  const manualOnlySalePrice = pickNumber(client?.salePrice, client?.sale_price);
  const manualOnlyFallbackSalePrice = getProgramServiceSalePriceFallback(selectedProgram, serviceType);
  const salePriceLooksPackageDerived = [
    client?.officialPrice,
    client?.official_price,
    client?.price,
  ].some((value) => {
    const number = pickNumber(value);
    return number > 0 && manualOnlySalePrice === number && number !== manualOnlyFallbackSalePrice;
  });
  const salePrice = serviceUsesManualOnlyPrice
    ? (
      salePriceLooksPackageDerived
        ? (manualOnlyFallbackSalePrice || "")
        : manualOnlySalePrice > 0 ? manualOnlySalePrice : (manualOnlyFallbackSalePrice || "")
    )
    : pickNumber(
      client?.salePrice,
      client?.sale_price,
      client?.price,
      officialPrice
    );
  const normalizedRoomType = normalizeRoomTypeKey(pickString(client?.roomType, client?.room_type));
  const supportedRoomType = selectedProgram && PROGRAM_ROOM_PRICE_KEYS.includes(normalizedRoomType) ? normalizedRoomType : "";

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
    packageId: selectedProgram ? packageId : "",
    hotelLevel:  selectedProgram ? packageLevel : "",
    packageLevel: selectedProgram ? packageLevel : "",
    hotelMecca:  selectedProgram ? pickString(client?.hotelMecca, client?.hotel_mecca) : "",
    hotelMadina: selectedProgram ? pickString(client?.hotelMadina, client?.hotel_madina) : "",
    serviceType,
    roomType:    supportedRoomType,
    roomTypeLabel: supportedRoomType ? pickString(client?.roomTypeLabel, client?.room_type_label, getRoomTypeLabel(supportedRoomType)) : "",
    officialPrice: selectedProgram && clientServiceIncludesAccommodation(serviceType) ? officialPrice : 0,
    salePrice: selectedProgram ? salePrice : "",
    ticketNo: pickString(client?.ticketNo, client?.ticket_no, client?.ticketNumber, client?.ticket),
    representedByClientId: pickString(client?.representedByClientId, client?.represented_by_client_id, client?.guardianClientId, client?.guardian_client_id),
    representedByRelationship: normalizeRepresentativeRelationship(pickString(client?.representedByRelationship, client?.represented_by_relationship, client?.guardianRelationship, client?.guardian_relationship)),
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
  const { programs = [], clients = [], addClient, updateClient } = store;
  const badgePhotoApi = store.badgePhotoApi || { isAvailable: false };
  const isEdit = !!client;
  const numberLocale = LOCALE_BY_LANG[lang] || "ar-MA";
  const currencyLabel = CURRENCY_BY_LANG[lang] || "د.م";
  const formatPrice = (value) => (typeof value === "number" ? value.toLocaleString(numberLocale) : (value ?? "—"));
  const programPlaceholder = React.useMemo(() => getProgramPlaceholder(lang), [lang]);
  const localizedRoomTypeOptions = React.useMemo(
    () => [
      { value: "", label: t.selectRoomPlaceholder },
      ...getRoomTypeOptions().map((option) => ({ ...option, label: translateRoomType(option.value, lang) || option.label })),
    ],
    [lang, t.selectRoomPlaceholder]
  );
  const serviceTypeOptions = React.useMemo(
    () => getClientServiceTypeOptions(t, lang),
    [t, lang]
  );
  const formatLevelLabel = (value) => getLocalizedValue(value, HOTEL_LEVEL_KEYS, t);
  const formatHotelName = (value) => getLocalizedValue(value, HOTEL_NAME_KEYS, t);
  const skipProgramResetRef = React.useRef(true);
  const salePriceManualRef = React.useRef(isEdit);
  const previousOfficialPriceRef = React.useRef(0);

  const [form, setForm] = React.useState(() => buildFormState(client, defaultProgramId, programs));
  const selectablePrograms = React.useMemo(() => {
    const base = lockProgramId
      ? programs.filter((p) => p.id === lockProgramId)
      : programs.filter(isActiveProgramChoice);
    if (!form.programId || base.some((program) => program.id === form.programId)) return base;
    const currentProgram = programs.find((program) => program.id === form.programId);
    return currentProgram ? [currentProgram, ...base] : base;
  }, [form.programId, lockProgramId, programs]);
  const [entryMode, setEntryMode] = React.useState(isEdit ? ROOM_ENTRY_MODES.SINGLE : ROOM_ENTRY_MODES.SINGLE);
  const [groupPeople, setGroupPeople] = React.useState([createGroupPerson(0)]);
  const [badgePhotoFile, setBadgePhotoFile] = React.useState(null);
  const [badgePhotoUrl, setBadgePhotoUrl] = React.useState("");
  const [badgePhotoRemoved, setBadgePhotoRemoved] = React.useState(false);
  const [badgePhotoError, setBadgePhotoError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [representativeSearch, setRepresentativeSearch] = React.useState("");
  const [representativePickerOpen, setRepresentativePickerOpen] = React.useState(false);

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
      setRepresentativeSearch("");
      setRepresentativePickerOpen(false);
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
  const representationLabels = React.useMemo(() => representationText(lang), [lang]);
  const salePriceOptionalText = React.useMemo(() => {
    if (lang === "fr") return "Optionnel — peut être défini plus tard";
    if (lang === "en") return "Optional — can be set later";
    return "اختياري — يمكن تحديده لاحقًا";
  }, [lang]);
  const manualSellingPriceHelpText = React.useMemo(() => getManualSellingPriceHelpText(lang), [lang]);
  const missingCostingHint = React.useMemo(() => getMissingCostingHint(lang), [lang]);
  const localizedRoomCategoryOptions = React.useMemo(() => ROOM_CATEGORY_OPTIONS.map((option) => ({
    ...option,
    label: option.value === "male_only"
      ? (t.roomCategoryMaleOnly || option.label)
      : option.value === "female_only"
        ? (t.roomCategoryFemaleOnly || option.label)
        : (t.roomCategoryFamily || option.label),
  })), [t]);

  const set     = k => e => setForm(f => ({...f, [k]: e.target.value}));
  const setCin = e => {
    const value = e.target.value;
    setForm(f => ({
      ...f,
      cin: value,
      passport: {
        ...f.passport,
        cin: value,
      },
    }));
  };
  const setSalePrice = e => {
    salePriceManualRef.current = true;
    setAutoPriceNote("");
    const value = e.target.value;
    const number = Number(value);
    setForm(f => ({ ...f, salePrice: value !== "" && Number.isFinite(number) && number < 0 ? "0" : value }));
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
  const normalizedServiceType = normalizeClientServiceType(form.serviceType);
  const serviceNeedsAccommodation = clientServiceIncludesAccommodation(normalizedServiceType);
  const noAccommodationServiceNote = React.useMemo(() => getNoAccommodationServiceNote(lang), [lang]);
  const isFullPackageService = normalizedServiceType === "full_package";
  const salePriceHelpText = isFullPackageService ? salePriceOptionalText : manualSellingPriceHelpText;
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
  const hasSelectedProgram = Boolean(selectedProgram);
  const addSubmitLabel = React.useMemo(
    () => getProgramAddLabel(selectedProgram, lang, t.addClient),
    [lang, selectedProgram, t.addClient]
  );
  const representationClient = React.useMemo(() => ({
    ...form,
    id: client?.id || "",
    cin: form.cin,
    nationalId: "",
    national_id: "",
    passport: {
      ...form.passport,
      cin: form.cin,
      nationalId: "",
    },
  }), [client?.id, form]);
  const hasCin = clientHasCin(representationClient);
  const minorWithoutCin = isClientMinorWithoutCin(representationClient);
  const representativeOptions = React.useMemo(() => (
    getSameProgramRepresentativeOptions({
      clients,
      programId: form.programId,
      currentClientId: client?.id || "",
    })
  ), [client?.id, clients, form.programId]);
  const selectedRepresentative = React.useMemo(() => (
    representativeOptions.find((item) => String(item.id || "") === String(form.representedByClientId || "")) || null
  ), [form.representedByClientId, representativeOptions]);
  const selectedRepresentativeLabel = selectedRepresentative ? getRepresentativeDisplayName(selectedRepresentative) : "";
  const filteredRepresentativeOptions = React.useMemo(() => {
    const term = normalizeSearchValue(representativeSearch);
    if (!term) return representativeOptions;
    return representativeOptions.filter((item) => (
      getRepresentativeSearchText(item).includes(term)
    ));
  }, [representativeOptions, representativeSearch]);
  const representativeInputValue = representativeSearch || selectedRepresentativeLabel;
  const relationshipOptions = React.useMemo(() => {
    const options = REPRESENTED_BY_RELATIONSHIPS.map((item) => ({ value: item.value, label: item.label[lang] || item.label.ar }));
    if (
      form.representedByRelationship
      && !options.some((item) => item.value === form.representedByRelationship)
    ) {
      options.push({ value: form.representedByRelationship, label: form.representedByRelationship });
    }
    return [{ value: "", label: "—" }, ...options];
  }, [form.representedByRelationship, lang]);
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
  const costingReferenceCost = React.useMemo(() => {
    return getProgramServiceCostingReferenceCost(selectedProgram, normalizedServiceType);
  }, [normalizedServiceType, selectedProgram]);
  const standaloneServiceSalePrice = React.useMemo(() => (
    getProgramStandaloneServiceSalePrice(selectedProgram, normalizedServiceType)
  ), [normalizedServiceType, selectedProgram]);
  const displayedOfficialPrice = serviceNeedsAccommodation ? derivedOfficialPrice : costingReferenceCost;
  const referenceCostLabel = getReferenceCostLabel(normalizedServiceType, t.officialPrice, lang);
  const canApplyOfficialPrice = Boolean(serviceNeedsAccommodation && displayedOfficialPrice);
  const getDefaultSalePriceForService = React.useCallback((serviceType) => {
    if (serviceType === "ticket_only" || serviceType === "visa_only") {
      return getProgramServiceSalePriceFallback(selectedProgram, serviceType) || "";
    }
    if (serviceType === "accommodation_only") return derivedOfficialPrice || "";
    return null;
  }, [derivedOfficialPrice, selectedProgram]);
  const showMissingCostingHint = Boolean(
    selectedProgram
    && (normalizedServiceType === "ticket_only" || normalizedServiceType === "visa_only")
    && !costingReferenceCost
    && !standaloneServiceSalePrice
  );
  const handleServiceTypeChange = React.useCallback((e) => {
    const nextServiceType = normalizeClientServiceType(e.target.value);
    const nextNeedsAccommodation = clientServiceIncludesAccommodation(nextServiceType);
    const nextDefaultSalePrice = getDefaultSalePriceForService(nextServiceType);
    setAutoPriceNote("");
    setForm((prev) => ({
      ...prev,
      serviceType: nextServiceType,
      officialPrice: nextNeedsAccommodation ? prev.officialPrice : 0,
      ...(nextDefaultSalePrice !== null ? { salePrice: nextDefaultSalePrice } : {}),
    }));
  }, [getDefaultSalePriceForService]);
  const officialPriceMissing = Boolean(serviceNeedsAccommodation && selectedPackage && form.roomType && !derivedOfficialPrice);

  React.useEffect(() => {
    const fallback = getDefaultSalePriceForService(normalizedServiceType);
    const fallbackNumber = Number(fallback);
    if (fallback === null || !Number.isFinite(fallbackNumber) || fallbackNumber <= 0) return;
    if (Number(form.salePrice || 0) > 0) return;
    setForm((prev) => (
      Number(prev.salePrice || 0) > 0 ? prev : { ...prev, salePrice: fallbackNumber }
    ));
  }, [form.salePrice, getDefaultSalePriceForService, normalizedServiceType]);

  React.useEffect(() => {
    if (!hasCin) return;
    setForm((prev) => (
      prev.representedByClientId || prev.representedByRelationship
        ? { ...prev, representedByClientId: "", representedByRelationship: "" }
        : prev
    ));
  }, [hasCin]);

  React.useEffect(() => {
    if (!form.representedByClientId) return;
    if (representativeOptions.some((item) => String(item.id || "") === String(form.representedByClientId || ""))) return;
    setForm((prev) => ({ ...prev, representedByClientId: "", representedByRelationship: "" }));
    setRepresentativeSearch("");
  }, [form.representedByClientId, representativeOptions]);

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
    if (!canApplyOfficialPrice) return;
    salePriceManualRef.current = false;
    setForm((f) => ({ ...f, salePrice: displayedOfficialPrice }));
    setAutoPriceNote(t.officialPriceApplied || "تم استخدام السعر الرسمي كسعر البيع");
  }, [canApplyOfficialPrice, displayedOfficialPrice, t]);

  // Auto-fill hotel + official price when package or room changes
  const prevLevelRef = React.useRef("");
  const prevRoomRef  = React.useRef("");
  const skipInitialAutoFillRef = React.useRef(isEdit);

  React.useEffect(() => {
    if (!serviceNeedsAccommodation) {
      setForm((f) => (Number(f.officialPrice) === 0 ? f : { ...f, officialPrice: 0 }));
      previousOfficialPriceRef.current = 0;
      return;
    }
    if (!selectedPackage) {
      setForm((f) => (Number(f.officialPrice) === 0 ? f : { ...f, officialPrice: 0 }));
      previousOfficialPriceRef.current = 0;
      return;
    }
    if (skipInitialAutoFillRef.current) {
      skipInitialAutoFillRef.current = false;
      prevLevelRef.current = selectedPackage.id;
      prevRoomRef.current = form.roomType;
      previousOfficialPriceRef.current = derivedOfficialPrice || 0;
      return;
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
  }, [form.roomType, selectedPackage, derivedOfficialPrice, serviceNeedsAccommodation, t]);

  // Reset hotel when program changes
  React.useEffect(() => {
    if (skipProgramResetRef.current) {
      skipProgramResetRef.current = false;
      return;
    }
    salePriceManualRef.current = false;
    setAutoPriceNote("");
    setForm(f => ({
      ...f,
      packageId: "",
      hotelLevel: "",
      packageLevel: "",
      hotelMecca: "",
      hotelMadina: "",
      roomType: "",
      roomTypeLabel: "",
      officialPrice: 0,
      salePrice: "",
    }));
  }, [form.programId, programPackages]);

  // Auto-calculate expiry = issueDate + 5 years
  React.useEffect(() => {
    const issue = form.passport.issueDate;
    if (!issue) return;
    const auto = calcExpiry(issue);
    if (auto) setForm(f => ({...f, passport:{...f.passport, expiry:auto}}));
  }, [form.passport.issueDate]);

  const discount = Math.max(0, Number(displayedOfficialPrice || 0) - Number(form.salePrice || 0));
  const todayInputValue = React.useMemo(() => toDateInputValue(new Date()), []);
  const passportDateErrors = React.useMemo(() => ({
    birthDate: isFutureDateInput(form.passport.birthDate)
      ? (t.birthDateFutureError || (lang === "fr" ? "La date de naissance ne peut pas être dans le futur" : lang === "en" ? "Birth date cannot be in the future" : "لا يمكن أن يكون تاريخ الميلاد في المستقبل"))
      : "",
    issueDate: isFutureDateInput(form.passport.issueDate)
      ? (t.issueDateFutureError || (lang === "fr" ? "La date d’émission ne peut pas être dans le futur" : lang === "en" ? "Issue date cannot be in the future" : "لا يمكن أن يكون تاريخ الإصدار في المستقبل"))
      : "",
  }), [form.passport.birthDate, form.passport.issueDate, lang, t.birthDateFutureError, t.issueDateFutureError]);

  const validate = () => {
    const e = {};
    if (entryMode === ROOM_ENTRY_MODES.GROUP && !isEdit) {
      const peopleErrors = groupPeople.map((person) => {
        const rowErrors = {};
        if (!pickString(person.lastName)) rowErrors.lastName = t.lastNameError || "يرجى إدخال الاسم العائلي";
        if (!pickString(person.firstName)) rowErrors.firstName = t.firstNameError || "يرجى إدخال الاسم الشخصي";
        if (!person.gender) rowErrors.gender = t.genderRequired || "يرجى تحديد الجنس";
        if (serviceNeedsAccommodation && form.roomCategory === "male_only" && person.gender && person.gender !== "male") rowErrors.gender = t.maleOnlyRoomError || "هذه الغرفة مخصصة للرجال فقط";
        if (serviceNeedsAccommodation && form.roomCategory === "female_only" && person.gender && person.gender !== "female") rowErrors.gender = t.femaleOnlyRoomError || "هذه الغرفة مخصصة للنساء فقط";
        return rowErrors;
      });
      if (peopleErrors.some((row) => Object.keys(row).length)) e.groupPeople = peopleErrors;
      return e;
    }
    if (!form.firstName.trim() && !form.lastName.trim()) e.firstName = t.firstNameError;
    if (!form.phone.trim())    e.phone    = t.phoneError;
    if (!form.gender) e.gender = t.genderRequired || "يرجى تحديد الجنس";
    if (form.salePrice !== "" && Number(form.salePrice) < 0) {
      e.salePrice = lang === "fr" ? "Le prix de vente doit être positif."
        : lang === "en" ? "Selling price must be non-negative."
        : "يجب أن يكون سعر البيع موجبًا أو صفرًا.";
    }
    if (passportDateErrors.birthDate) e.birthDate = passportDateErrors.birthDate;
    if (passportDateErrors.issueDate) e.issueDate = passportDateErrors.issueDate;
    if (minorWithoutCin && !form.representedByClientId) e.representedByClientId = representationLabels.representativeRequired;
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
        programId: lockProgramId || form.programId || null,
        packageId: selectedPackage?.id || form.packageId || "",
        packageLevel: selectedPackage?.level || form.packageLevel || form.hotelLevel || "",
        hotelLevel: selectedPackage?.level || form.hotelLevel || "",
        hotelMecca: selectedPackage?.hotelMecca || form.hotelMecca,
        hotelMadina: selectedPackage?.hotelMadina || form.hotelMadina,
        roomType: normalizeRoomTypeKey(form.roomType),
        roomTypeLabel: getRoomTypeLabel(form.roomType),
        officialPrice: Number(displayedOfficialPrice || 0),
        salePrice: Math.max(0, Number(form.salePrice || 0) || 0),
        roomCategory: form.roomCategory,
        roomCategoryLabel: getRoomCategoryLabel(form.roomCategory),
        roomingGroupId,
        roomingGroupName,
        roomingGroupSize: groupPeople.length,
        representedByClientId: "",
        representedByRelationship: "",
      };
      const addedClients = [];
      groupPeople.forEach((person, index) => {
        const personName = buildGroupPersonName(person);
        const addedClient = addClient({
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
        if (addedClient) addedClients.push(addedClient);
      });
      onSave(addedClients);
      return;
    }
    setSaving(true);
    setBadgePhotoError("");
    const baseData = {
      ...form,
      programId: lockProgramId || form.programId || null,
      packageId: selectedPackage?.id || form.packageId || "",
      packageLevel: selectedPackage?.level || form.packageLevel || form.hotelLevel || "",
      hotelLevel: selectedPackage?.level || form.hotelLevel || "",
      hotelMecca: selectedPackage?.hotelMecca || form.hotelMecca,
      hotelMadina: selectedPackage?.hotelMadina || form.hotelMadina,
      roomType: normalizeRoomTypeKey(form.roomType),
      roomTypeLabel: getRoomTypeLabel(form.roomType),
      officialPrice: Number(displayedOfficialPrice || 0),
      salePrice:     Math.max(0, Number(form.salePrice || 0) || 0),
      registrationDate: client?.registrationDate ?? client?.registration_date ?? form.registrationDate ?? null,
      archived: client?.archived ?? form.archived ?? false,
      archivedAt: client?.archivedAt ?? client?.archived_at ?? form.archivedAt ?? null,
      deleted: client?.deleted ?? form.deleted ?? false,
      deletedAt: client?.deletedAt ?? client?.deleted_at ?? form.deletedAt ?? null,
      deletedBatchId: client?.deletedBatchId ?? client?.deleted_batch_id ?? form.deletedBatchId ?? null,
      gender: form.gender,
      passport: {
        ...form.passport,
        cin: pickString(form.cin),
        gender: genderToPassportValue(form.gender),
      },
      representedByClientId: hasCin ? "" : form.representedByClientId,
      representedByRelationship: hasCin ? "" : normalizeRepresentativeRelationship(form.representedByRelationship),
    };
    try {
      const targetId = isEdit ? client.id : (badgePhotoFile ? createClientId() : "");
      const photoResult = await resolveBadgePhotoPath(targetId || client?.id, form.badgePhotoPath);
      if (!photoResult.ok) return;
      const data = withBadgePhotoPath(baseData, photoResult.path);
      let savedClient;
      if (isEdit) {
        updateClient(client.id, data);
        savedClient = { ...client, ...data, id: client.id };
      } else {
        savedClient = addClient(targetId ? { ...data, id: targetId } : data);
      }
      onSave(savedClient);
    } finally {
      setSaving(false);
    }
  };

  // Apply MRZ data

  return (
    <div>
      <style>{`
        .client-form-pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          align-items: start;
        }
        .client-form-pricing-grid > * {
          min-width: 0;
        }
        .client-form-pricing-grid label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        @media (max-width: 640px) {
          .client-form-pricing-grid {
            grid-template-columns: 1fr;
          }
        }
        .client-representative-option:hover,
        .client-representative-option:focus-visible {
          background: rgba(212,175,55,.08) !important;
          color: var(--rukn-gold) !important;
          outline: none;
        }
      `}</style>
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
            options={[
              ...(lockProgramId ? [] : [{ value: "", label: programPlaceholder }]),
              ...selectablePrograms.map((p) => ({ value: p.id, label: p.name })),
            ]}
            disabled={Boolean(lockProgramId)}
            style={{ gridColumn:"1/-1" }}
          />
          <Select
            label={t.serviceType || "نوع الخدمة"}
            value={normalizedServiceType}
            onChange={handleServiceTypeChange}
            options={serviceTypeOptions}
          />
          {hasSelectedProgram ? (
            <Select
              label={t.level || "المستوى"}
              value={selectedPackage?.id || ""}
              onChange={handlePackageChange}
              options={[
                { value:"", label:t.selectLevelPlaceholder },
                ...programPackages.map(pkg => ({ value:pkg.id, label:formatLevelLabel(pkg.level) })),
              ]}
              disabled={!serviceNeedsAccommodation}
            />
          ) : (
            <Select
              label={t.level || "المستوى"}
              value=""
              onChange={() => {}}
              options={[{ value:"", label:t.selectLevelPlaceholder }]}
              disabled
            />
          )}
          <Select
            label={t.roomType}
            value={form.roomType}
            onChange={handleRoomTypeChange}
            options={hasSelectedProgram ? localizedRoomTypeOptions : [{ value:"", label:t.selectRoomPlaceholder }]}
            disabled={!hasSelectedProgram || !serviceNeedsAccommodation}
          />
          <Select
            label={t.roomCategory || "تصنيف الغرفة"}
            value={form.roomCategory}
            onChange={(e) => setRoomCategory(e.target.value)}
            options={localizedRoomCategoryOptions}
            disabled={!serviceNeedsAccommodation}
          />
          <Input label={t.ticketNo} value={form.ticketNo} onChange={set("ticketNo")} placeholder={t.ticketPlaceholder} />
        </div>
        {!serviceNeedsAccommodation && (
          <p style={{
            marginTop:10,
            padding:"8px 10px",
            borderRadius:10,
            background:"rgba(148,163,184,.08)",
            border:"1px solid rgba(148,163,184,.16)",
            color:"var(--rukn-text-muted)",
            fontSize:11.5,
            fontWeight:700,
          }}>
            {noAccommodationServiceNote}
          </p>
        )}
        {selectedPackage && (
          <div style={{
            marginTop:12,
            padding:"11px 12px",
            borderRadius:12,
            background:"var(--rukn-bg-soft)",
            border:"1px solid var(--rukn-border-soft)",
          }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <p style={{ fontSize:11, color:"var(--rukn-text-muted)" }}>{t.hotelMecca}: <span style={{ color:"var(--rukn-text)", fontWeight:700 }}>{formatHotelName(selectedPackage.hotelMecca) || "—"}</span></p>
              <p style={{ fontSize:11, color:"var(--rukn-text-muted)" }}>{t.hotelMadina}: <span style={{ color:"var(--rukn-text)", fontWeight:700 }}>{formatHotelName(selectedPackage.hotelMadina) || "—"}</span></p>
              <p style={{ fontSize:11, color:"var(--rukn-text-muted)" }}>{t.mealPlan}: <span style={{ color:"var(--rukn-text)", fontWeight:700 }}>{selectedPackage.mealPlan || "—"}</span></p>
              <p style={{ fontSize:11, color:tc.grey }}>{t.officialPrice}: <span style={{ color:tc.gold }}>{displayedOfficialPrice ? `${formatPrice(displayedOfficialPrice)} ${currencyLabel}` : "—"}</span></p>
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
      <GlassCard gold style={{ padding:14, marginBottom:14 }}>
        <p style={{ fontSize:12, fontWeight:700, color:tc.gold, marginBottom:10, display:"inline-flex", alignItems:"center", gap:6 }}><AppIcon name="banknote" size={14} color={tc.gold} /> {t.priceSection}</p>
        <div className="client-form-pricing-grid">
          <Input
            label={`${referenceCostLabel} (${currencyLabel})`}
            value={displayedOfficialPrice || ""}
            onChange={() => {}}
            type="number"
            readOnly
            inputStyle={{
              height:36,
              padding:"7px 10px",
              fontSize:13,
              cursor:"not-allowed",
              background:"var(--rukn-bg-soft)",
              border:"1px solid var(--rukn-border-soft)",
              color:"var(--rukn-text-muted)",
              fontWeight:700,
              boxSizing:"border-box",
            }}
          />
          <Input
            label={`${t.salePrice} (${currencyLabel})`}
            value={form.salePrice}
            onChange={setSalePrice}
            type="number"
            min="0"
            step="0.01"
            error={errors.salePrice}
            inputStyle={{
              height:36,
              padding:"7px 10px",
              fontSize:13,
              border:`1px solid ${hasSelectedProgram ? tc.gold : "var(--rukn-border-soft)"}`,
              color:hasSelectedProgram ? tc.gold : "var(--rukn-text-muted)",
              fontWeight:700,
              background:hasSelectedProgram ? undefined : "var(--rukn-bg-soft)",
              cursor:hasSelectedProgram ? "text" : "not-allowed",
              boxSizing:"border-box",
            }}
            disabled={!hasSelectedProgram}
          />
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <label style={{ fontSize:12, fontWeight:600, color:tc.grey }}>{t.discount}</label>
            <div style={{
              height:36,
              display:"flex",
              alignItems:"center",
              background:"rgba(239,68,68,.08)",
              border:"1px solid rgba(239,68,68,.2)",
              borderRadius:8,
              padding:"0 10px",
              boxSizing:"border-box",
              color:discount>0?tc.danger:tc.grey, fontSize:13, fontWeight:700 }}>
              {discount>0 ? `- ${formatPrice(discount)} ${currencyLabel}` : t.noDiscount}
            </div>
          </div>
        </div>
        {(hasSelectedProgram || canApplyOfficialPrice) && (
          <div style={{ marginTop:8, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
            {hasSelectedProgram && (
              <p style={{ fontSize:10.5, color:"var(--rukn-text-muted)", margin:0, lineHeight:1.5 }}>{salePriceHelpText}</p>
            )}
            {canApplyOfficialPrice && (
              <button
                type="button"
                onClick={applyOfficialPriceToSale}
                style={{
                  border:"1px solid rgba(212,175,55,.3)",
                  background:"rgba(212,175,55,.08)",
                  color:tc.gold,
                  borderRadius:8,
                  padding:"4px 9px",
                  fontSize:10.5,
                  fontWeight:700,
                  fontFamily:"'Cairo',sans-serif",
                  cursor:"pointer",
                }}
              >
                {t.useOfficialPrice || "استخدام السعر الرسمي"}
              </button>
            )}
          </div>
        )}
        {officialPriceMissing && (
          <p style={{ fontSize:11, color:tc.warning, marginTop:8 }}>
            {t.officialPriceMissing || "لم يتم تحديد سعر لهذا المستوى ونوع الغرفة في البرنامج"}
          </p>
        )}
        {showMissingCostingHint && (
          <p style={{ fontSize:11, color:tc.grey, marginTop:8, lineHeight:1.6 }}>
            {missingCostingHint}
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
          <Input label={t.cin || "رقم البطاقة الوطنية"} value={form.cin} onChange={setCin}
            placeholder={lang === "fr" ? "N° CIN" : lang === "en" ? "National ID / CIN" : "رقم البطاقة الوطنية"} />
          <Select label={t.nationality} value={form.passport.nationality} onChange={setPass("nationality")}
            options={NATIONALITIES} />
          <Select
            label={t.gender}
            value={form.passport.gender}
            onChange={(e) => setGender(normalizeGenderValue(e.target.value))}
            options={[{value:"",label:"—"},{value:"M",label:t.male},{value:"F",label:t.female}]} />
          <Input
            label={t.birthDate}
            value={form.passport.birthDate}
            onChange={setPass("birthDate")}
            type="date"
            max={todayInputValue}
            error={passportDateErrors.birthDate}
          />
          <Input
            label={t.issueDate}
            value={form.passport.issueDate}
            onChange={setPass("issueDate")}
            type="date"
            max={todayInputValue}
            error={passportDateErrors.issueDate}
          />
          <Input label={t.expiry} value={form.passport.expiry} onChange={setPass("expiry")} type="date" />
        </div>
        {form.passport.issueDate && form.passport.expiry && (
          <p style={{ fontSize:11, color:tc.grey, marginTop:8 }}>{t.expiryAutoHint}</p>
        )}
      </GlassCard>
      )}

	      {/* ── Contract Representation ── */}
	      {entryMode === ROOM_ENTRY_MODES.SINGLE && minorWithoutCin && (
	      <GlassCard style={{
	        padding:16,
	        marginBottom:14,
	        position:"relative",
	        zIndex:representativePickerOpen ? 80 : 2,
	        overflow:"visible",
	      }}>
	        <p style={{ fontSize:12, fontWeight:700, color:tc.gold, marginBottom:10, display:"inline-flex", alignItems:"center", gap:6 }}>
	          <AppIcon name="users" size={14} color={tc.gold} /> {representationLabels.title}
	        </p>
	        <div>
	          <p style={{ fontSize:12, color:"var(--rukn-text-muted)", lineHeight:1.7, marginBottom:12 }}>
	            {representationLabels.minorNeedsRepresentative}
	          </p>
	          <div className="form-grid form-grid--two">
	              <div style={{ display:"flex", flexDirection:"column", gap:6, position:"relative", minWidth:0 }}>
	                <label style={{ fontSize:13, fontWeight:600, color:representativePickerOpen ? "var(--rukn-gold)" : "var(--rukn-text-muted)" }}>
	                  {representationLabels.representedBy}
	                </label>
	                <div style={{ position:"relative" }}>
	                  <input
	                    value={representativeInputValue}
	                    disabled={!representativeOptions.length}
	                    placeholder={representativeOptions.length ? representationLabels.selectRepresentative : representationLabels.noRepresentative}
		                    onFocus={(event) => {
		                      setRepresentativePickerOpen(true);
		                      event.currentTarget.select();
		                    }}
	                    onBlur={() => window.setTimeout(() => setRepresentativePickerOpen(false), 120)}
	                    onChange={(event) => {
	                      setRepresentativeSearch(event.target.value);
	                      setRepresentativePickerOpen(true);
	                      if (form.representedByClientId) {
	                        setForm((prev) => ({ ...prev, representedByClientId: "" }));
	                      }
	                    }}
	                    style={{
	                      width:"100%",
	                      background:"var(--rukn-bg-input)",
	                      border:`1px solid ${errors.representedByClientId ? tc.danger : representativePickerOpen ? "var(--rukn-gold)" : "var(--rukn-border-input)"}`,
	                      borderRadius:10,
	                      padding:dir === "rtl" ? "10px 14px 10px 38px" : "10px 38px 10px 14px",
	                      color:"var(--rukn-text)",
	                      fontSize:14,
	                      fontFamily:"'Cairo',sans-serif",
	                      direction:dir,
	                      outline:"none",
	                      transition:"border-color .2s, box-shadow .2s",
	                      boxShadow:representativePickerOpen ? "0 0 0 3px rgba(212,175,55,.15)" : "none",
	                      opacity:representativeOptions.length ? 1 : .65,
	                      cursor:representativeOptions.length ? "text" : "not-allowed",
	                      boxSizing:"border-box",
	                    }}
	                  />
	                  {form.representedByClientId && (
	                    <button
	                      type="button"
	                      aria-label={lang === "fr" ? "Effacer" : lang === "en" ? "Clear" : "مسح"}
	                      onMouseDown={(event) => event.preventDefault()}
	                      onClick={() => {
	                        setForm((prev) => ({ ...prev, representedByClientId: "", representedByRelationship: "" }));
	                        setRepresentativeSearch("");
	                        setRepresentativePickerOpen(false);
	                      }}
	                      style={{
	                        position:"absolute",
	                        top:"50%",
	                        [dir === "rtl" ? "left" : "right"]:10,
	                        transform:"translateY(-50%)",
	                        width:22,
	                        height:22,
	                        borderRadius:8,
	                        border:"1px solid var(--rukn-border-soft)",
	                        background:"var(--rukn-bg-soft)",
	                        color:"var(--rukn-text-muted)",
	                        cursor:"pointer",
	                        display:"grid",
	                        placeItems:"center",
	                        fontSize:15,
	                        lineHeight:1,
	                      }}
	                    >
	                      ×
	                    </button>
	                  )}
	                  {representativePickerOpen && representativeOptions.length > 0 && (
	                    <div
	                      style={{
	                        position:"absolute",
	                        zIndex:13000,
	                        top:"calc(100% + 6px)",
	                        left:0,
	                        right:0,
	                        maxHeight:220,
	                        overflowY:"auto",
	                        borderRadius:12,
	                        border:"1px solid var(--rukn-menu-border)",
	                        background:"var(--rukn-menu-bg)",
	                        boxShadow:"var(--rukn-menu-shadow)",
	                        padding:6,
	                      }}
	                    >
	                      {filteredRepresentativeOptions.length ? filteredRepresentativeOptions.map((item) => {
		                        const label = getRepresentativeDisplayName(item);
	                        const selected = String(item.id || "") === String(form.representedByClientId || "");
	                        return (
	                          <button
	                            key={item.id}
	                            type="button"
	                            className="client-representative-option"
	                            onMouseDown={(event) => event.preventDefault()}
	                            onClick={() => {
	                              setForm((prev) => ({ ...prev, representedByClientId: item.id }));
	                              setRepresentativeSearch("");
	                              setRepresentativePickerOpen(false);
	                            }}
	                            style={{
	                              width:"100%",
	                              textAlign:dir === "rtl" ? "right" : "left",
	                              border:"none",
	                              borderRadius:9,
	                              padding:"9px 10px",
	                              background:selected ? "rgba(212,175,55,.16)" : "transparent",
	                              color:selected ? "var(--rukn-gold)" : "var(--rukn-text)",
	                              cursor:"pointer",
	                              fontFamily:"'Cairo',sans-serif",
	                              fontSize:13,
	                              fontWeight:selected ? 800 : 600,
	                            }}
	                          >
	                            {label}
	                          </button>
	                        );
	                      }) : (
	                        <div style={{ padding:"10px 12px", color:"var(--rukn-text-muted)", fontSize:12 }}>
	                          {representationLabels.noResults}
	                        </div>
	                      )}
	                    </div>
	                  )}
	                </div>
	              </div>
	              <Select
	                label={representationLabels.relationship}
	                value={form.representedByRelationship}
	                onChange={(event) => setForm((prev) => ({ ...prev, representedByRelationship: event.target.value }))}
	                options={relationshipOptions}
	              />
	          </div>
	          {errors.representedByClientId && (
	            <p style={{ color:tc.danger, fontSize:11, marginTop:8 }}>{errors.representedByClientId}</p>
	          )}
	        </div>
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
          {saving ? (t.loading || "جاري الحفظ...") : isEdit ? t.save : entryMode === ROOM_ENTRY_MODES.GROUP ? (t.saveRoom || "حفظ الغرفة") : addSubmitLabel}
        </Button>
      </div>
    </div>
  );
}
