import { getProgramKind } from "../../../utils/participantTerminology";
import { getClientDisplayName } from "../../../utils/clientNames";
import { formatCurrency } from "../../../utils/currency";
import { getRoomTypeLabel } from "../../../utils/programPackages";
import { translateProgramType, translateRoomType } from "../../../utils/i18nValues";
import { getProgramAirline, normalizeAirlineCode } from "../../../utils/airlines";
import { getClientCin } from "../../../utils/clientRepresentation";

export const CONTRACT_TEMPLATE_BUCKET = "contract-templates";
export const CONTRACT_DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const CONTRACT_TEMPLATE_MAX_BYTES = 10 * 1024 * 1024;
export const LOCAL_CONTRACT_TEMPLATES_KEY = "rukn_contract_templates_local_v1";

const KNOWN_AIRLINE_LABELS = {
  SV: { ar: "الخطوط السعودية", fr: "Saudi Airlines", en: "Saudi Airlines" },
  AT: { ar: "الخطوط الملكية المغربية", fr: "Royal Air Maroc", en: "Royal Air Maroc" },
};

const clean = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const firstValue = (...values) => {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatMoney = (value, lang) => {
  const number = toNumber(value);
  return number ? formatCurrency(number, lang) : "";
};

const formatDateValue = (value) => clean(value);

const getAgencyName = (agency = {}, lang = "ar") => (
  firstValue(
    lang === "ar" ? agency.nameAr : agency.nameFr,
    agency.nameFr,
    agency.nameAr,
    agency.name
  )
);

const getAgencyAddress = (agency = {}) => (
  firstValue(agency.addressTiznit, agency.addressAgadir, agency.address, agency.city)
);

const getAgencyPhone = (agency = {}) => (
  firstValue(agency.phoneTiznit1, agency.phoneAgadir1, agency.phone, agency.phoneTiznit2, agency.phoneAgadir2)
);

const getProgramAirlineLabel = (program = {}, lang = "ar") => {
  const airline = getProgramAirline(program);
  if (!airline) return clean(program.transport);
  const code = normalizeAirlineCode(airline.code);
  const translatedName = KNOWN_AIRLINE_LABELS[code]?.[lang] || airline.name || program.transport || code;
  return code ? `${translatedName} (${code})` : translatedName;
};

const getClientRoomType = (client = {}, lang = "ar") => {
  const raw = firstValue(client.roomTypeLabel, client.room_type_label, client.roomType, client.room_type);
  return translateRoomType(raw, lang) || getRoomTypeLabel(raw) || raw;
};

const getRepresentedMinorName = (client = {}) => (
  firstValue(
    [client.firstName, client.lastName].map(clean).filter(Boolean).join(" "),
    getClientDisplayName(client),
    client.name
  )
);

const getRepresentedMinorsText = (representedMinors = [], lang = "ar") => {
  const names = representedMinors.map(getRepresentedMinorName).filter(Boolean);
  return names.join(lang === "ar" ? "، " : ", ");
};

const getRepresentedMinorsDetails = (representedMinors = []) => (
  representedMinors.map((minor) => {
    const name = getRepresentedMinorName(minor);
    const cin = getClientCin(minor);
    const passport = firstValue(minor.passport?.number, minor.passportNumber, minor.passport_number);
    const identity = cin ? `CIN: ${cin}` : passport ? `Passport: ${passport}` : "";
    return [name, identity].filter(Boolean).join(" — ");
  }).filter(Boolean).join("\n")
);

export const getContractTemplateType = (program = {}) => getProgramKind(program) === "hajj" ? "hajj" : "umrah";

export const buildContractTemplatePath = ({ agencyId, templateType }) => {
  const type = templateType === "hajj" ? "hajj" : "umrah";
  return agencyId ? `agencies/${agencyId}/contract-templates/${type}.docx` : "";
};

export const validateContractTemplateFile = (file) => {
  if (!file) return { valid: false, reason: "missing" };
  const name = clean(file.name).toLowerCase();
  if (!name.endsWith(".docx")) return { valid: false, reason: "type" };
  if (file.size > CONTRACT_TEMPLATE_MAX_BYTES) return { valid: false, reason: "size" };
  return { valid: true };
};

export const buildContractTemplateData = ({
  client = {},
  program = {},
  payments = [],
  totalPaid = null,
  salePrice = null,
  agency = {},
  representedMinors = [],
  lang = "ar",
} = {}) => {
  const passport = client.passport || {};
  const fullName = firstValue(
    [client.firstName, client.lastName].map(clean).filter(Boolean).join(" "),
    getClientDisplayName(client),
    client.name
  );
  const paidAmount = totalPaid === null || totalPaid === undefined
    ? payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0)
    : toNumber(totalPaid);
  const finalSalePrice = salePrice === null || salePrice === undefined
    ? toNumber(client.salePrice ?? client.price)
    : toNumber(salePrice);
  const remaining = Math.max(0, finalSalePrice - paidAmount);
  const programType = translateProgramType(program.type, lang) || clean(program.type);
  const representedMinorItems = Array.isArray(representedMinors) ? representedMinors : [];

  return {
    represented_minors_list: getRepresentedMinorsText(representedMinorItems, lang),
    represented_minors_count: representedMinorItems.length ? String(representedMinorItems.length) : "",
    represented_minors_details: getRepresentedMinorsDetails(representedMinorItems),
    pilgrim: {
      full_name: fullName,
      first_name: firstValue(client.firstName, client.prenom),
      last_name: firstValue(client.lastName, client.nom),
      cin: firstValue(client.cin, client.CIN, client.nationalId, client.national_id, passport.cin, passport.nationalId),
      passport_number: firstValue(passport.number, client.passportNumber, client.passport_number),
      address: firstValue(client.address, client.adress, client.addressLine, client.homeAddress, client.city),
      birth_date: formatDateValue(firstValue(passport.birthDate, passport.birth_date, client.birthDate, client.birth_date)),
      phone: firstValue(client.phone),
      room_type: getClientRoomType(client, lang),
    },
    program: {
      name: firstValue(program.name, program.nameFr),
      type: programType,
      departure_date: formatDateValue(firstValue(program.departure, program.departureDate, program.departure_date)),
      return_date: formatDateValue(firstValue(program.returnDate, program.return_date)),
      airline: getProgramAirlineLabel(program, lang),
      madinah_hotel: firstValue(client.hotelMadina, client.hotel_madina, program.hotelMadina, program.hotel_madina),
      madinah_checkin: formatDateValue(firstValue(program.madinahCheckin, program.madinah_checkin, program.madinaCheckin, program.madina_checkin)),
      madinah_checkout: formatDateValue(firstValue(program.madinahCheckout, program.madinah_checkout, program.madinaCheckout, program.madina_checkout)),
      makkah_hotel: firstValue(client.hotelMecca, client.hotel_mecca, program.hotelMecca, program.hotel_mecca),
      makkah_checkin: formatDateValue(firstValue(program.makkahCheckin, program.makkah_checkin, program.meccaCheckin, program.mecca_checkin)),
      makkah_checkout: formatDateValue(firstValue(program.makkahCheckout, program.makkah_checkout, program.meccaCheckout, program.mecca_checkout)),
    },
    payment: {
      sale_price: formatMoney(finalSalePrice, lang),
      paid_amount: formatMoney(paidAmount, lang),
      remaining_amount: formatMoney(remaining, lang),
    },
    agency: {
      name: getAgencyName(agency, lang),
      address: getAgencyAddress(agency),
      phone: getAgencyPhone(agency),
      email: firstValue(agency.email),
      ice: firstValue(agency.ice),
      bank_name: firstValue(agency.bankName, agency.bank_name),
      rib: firstValue(agency.bankRib, agency.bank_rib),
    },
  };
};

export const buildContractFileName = ({ client = {}, lang = "ar" } = {}) => {
  const name = firstValue(getClientDisplayName(client), client.name, "contract")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return `${lang === "ar" ? "عقد" : "Contract"} - ${name || "contract"}.docx`;
};
