import { getClientDisplayName } from "../clientNames";
import { formatAirlineNameForDocument } from "../airlines";
import { ensureInvoiceRegistryItem } from "./invoiceRegistry";
import { buildInvoiceKey, getInvoiceIssueDate, trimInvoiceValue } from "./invoiceNumbering";
import { getInvoiceProgramDisplayName } from "./invoiceProgramDisplay";
import { normalizeInvoiceRecipient, validateInvoiceRecipient } from "./invoiceValidation";

export const getInvoiceClientCin = (client = {}) => (
  trimInvoiceValue(client.cin)
  || trimInvoiceValue(client.CIN)
  || trimInvoiceValue(client.nationalId)
  || trimInvoiceValue(client.national_id)
  || trimInvoiceValue(client.passport?.cin)
  || trimInvoiceValue(client.passport?.nationalId)
);

export const calculateInvoiceTotals = ({ client = {}, payments = [] } = {}) => {
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const salePrice = client.salePrice || client.price || 0;
  const remaining = Math.max(0, salePrice - totalPaid);
  return { totalPaid, salePrice, remaining, paidInFull: remaining <= 0 };
};

export const getLatestInvoicePayment = (payments = []) => (
  [...payments].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0] || null
);

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const firstProgramText = (source = {}, keys = []) => {
  for (const key of keys) {
    const value = trimInvoiceValue(source?.[key]);
    if (value) return value;
  }
  return "";
};

export const buildInvoiceData = ({
  client,
  program,
  payments = [],
  recipient,
  recipientType,
  companyName,
  companyIce,
  ice,
  fallbackName = "—",
  lang = "ar",
  documentType = "invoice",
  skipInvoiceRegistry = false,
} = {}) => {
  const safeClient = client || {};
  const safeProgram = program || {};
  const invoiceRecipient = normalizeInvoiceRecipient({ recipient, recipientType, companyName, companyIce, ice });
  const validation = validateInvoiceRecipient(invoiceRecipient);
  if (!validation.valid) return { valid: false, field: validation.field, recipient: invoiceRecipient };

  const clientName = getClientDisplayName(safeClient, fallbackName, lang);
  const latinName = safeClient.nameLatin && safeClient.nameLatin !== clientName ? safeClient.nameLatin : "";
  const { totalPaid, salePrice, remaining, paidInFull } = calculateInvoiceTotals({ client: safeClient, payments });
  const cin = getInvoiceClientCin(safeClient);
  const passportNo = trimInvoiceValue(safeClient.passport?.number);
  const carrier = formatAirlineNameForDocument(
    firstProgramText(safeProgram, [
      "carrier",
      "company",
      "compagnie",
      "airline",
      "transport",
      "airlineName",
      "airline_name",
      "airlineCode",
      "airline_code",
      "carrierCode",
      "carrier_code",
    ]),
    lang
  );
  const departureDate = firstProgramText(safeProgram, ["departure", "departureDate", "departure_date", "startDate", "start_date", "date"]);
  const returnDate = firstProgramText(safeProgram, ["returnDate", "return_date"]);
  const travelRoute = firstProgramText(safeProgram, ["route", "itinerary", "travelRoute", "travel_route", "routeText", "route_text"]);
  const visitOrder = firstProgramText(safeProgram, ["visitOrder", "visit_order"]);
  const hotelCheckinDay = firstProgramText(safeProgram, ["hotelCheckinDay", "hotel_checkin_day", "hotelCheckIn", "hotel_check_in"]);
  const latestPayment = getLatestInvoicePayment(payments);
  const isProforma = documentType === "proforma";
  if (!isProforma && !paidInFull) {
    return {
      valid: false,
      field: "notPaidInFull",
      recipient: invoiceRecipient,
      totalPaid,
      salePrice,
      remaining,
      paidInFull,
    };
  }
  const invoiceItem = isProforma
    ? null
    : skipInvoiceRegistry
      ? { invoiceKey: buildInvoiceKey({ client: safeClient, payments, recipient: invoiceRecipient }) }
      : ensureInvoiceRegistryItem({ client: safeClient, payments, recipient: invoiceRecipient });

  return {
    valid: true,
    lang,
    documentType,
    recipient: invoiceRecipient,
    clientName,
    latinName,
    totalPaid,
    salePrice,
    remaining,
    paidInFull,
    cin,
    passportNo,
    carrier,
    programName: getInvoiceProgramDisplayName(safeProgram, lang),
    departureDate,
    returnDate,
    route: travelRoute,
    itinerary: travelRoute,
    travelRoute,
    travel_route: travelRoute,
    routeText: travelRoute,
    route_text: travelRoute,
    visitOrder,
    visit_order: visitOrder,
    hotelCheckinDay,
    hotel_checkin_day: hotelCheckinDay,
    hotelCheckIn: hotelCheckinDay,
    hotel_check_in: hotelCheckinDay,
    latestPayment,
    invoiceItem,
    invoiceNo: invoiceItem?.invoiceNumber || "",
    invoiceDate: invoiceItem?.date || (isProforma ? getTodayDate() : getInvoiceIssueDate(payments)),
    issuedToCompany: invoiceRecipient.type === "company",
  };
};
