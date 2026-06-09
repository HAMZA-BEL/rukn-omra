import React from "react";
import { createPortal } from "react-dom";
import { StatusBadge, Button, GlassCard, Divider } from "./UI";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import PaymentForm from "./PaymentForm";
import SharedReceiptModal from "./SharedReceiptModal";
import { printReceipt, printClientCard, printSharedReceipt } from "./PrintTemplates";
import { AppIcon } from "./Icon";
import { getRoomTypeLabel } from "../utils/programPackages";
import { getClientDisplayName } from "../utils/clientNames";
import { formatCurrency } from "../utils/currency";
import { translateActivityDescription, translateHotelLevel, translatePaymentMethod, translateRoomCategory, translateRoomType } from "../utils/i18nValues";
import {
  getProgramServiceCostingReferenceCost,
  getProgramStandaloneServiceSalePrice,
} from "./programs/programCosting";
import { downloadClientBadgePdf } from "../features/badges";
import { getProgramAirline, normalizeAirlineCode } from "../utils/airlines";
import { getParticipantTerminology } from "../utils/participantTerminology";
import { isMinor } from "../utils/age";
import { downloadSingleContract } from "../features/contracts";
import { clientServiceIncludesAccommodation, getClientServiceType, getClientServiceTypeLabel } from "../utils/clientServiceTypes";
import {
  getClientEffectiveOfficialPrice,
  getClientEffectiveSalePrice,
  getClientOverpaidAmount,
  getClientRemainingAmount,
} from "../utils/clientPricing";
import { getLegacyReceiptNumber, isPreviousPaymentRecord } from "../utils/paymentRecords";
import {
  getRepresentedByClientId,
  isEligibleRepresentative,
  isClientMinorWithoutCin,
} from "../utils/clientRepresentation";
import { getClientCompletionBadges, getClientCompletionLabels, getClientCompletionTooltip, getClientDeletedProgramLabel, getClientDisplayStatus, getClientMissingCompletionItems, getClientPaymentEligibility, getClientProgramId } from "../utils/clientCompletionStatus";

const tc = theme.colors;
const printActionButtonStyle = {
  minWidth: 168,
  minHeight: 36,
  justifyContent: "center",
  whiteSpace: "nowrap",
  textAlign: "center",
};
const EMPTY_LINKED_PAYMENTS = [];
const collectClientPaymentRows = (clientId, paymentSources, locallyHiddenPaymentIds = new Set()) => {
  const rows = [];
  const seen = new Set();
  const normalizedClientId = String(clientId || "");
  paymentSources.forEach((source) => {
    (Array.isArray(source) ? source : []).forEach((payment) => {
      if (!payment) return;
      if (payment.id && locallyHiddenPaymentIds.has(payment.id)) return;
      const paymentClientId = String(payment.clientId || payment.client_id || "");
      if (paymentClientId && paymentClientId !== normalizedClientId) return;
      const key = payment.id || `${paymentClientId}:${payment.date || ""}:${payment.amount || ""}:${payment.receiptNo || payment.receipt_no || ""}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push(payment);
    });
  });
  return rows;
};

const firstText = (...values) => {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
};

const getSharedPaymentGroupId = (payment = {}) => String(payment.groupPaymentId || payment.group_payment_id || "").trim();
const completionBadgeStyle = (tone) => ({
  display:"inline-flex",
  alignItems:"center",
  gap:4,
  padding:"2px 8px",
  borderRadius:999,
  border:tone === "warning" ? "1px solid rgba(245,158,11,.32)" : "1px solid rgba(148,163,184,.25)",
  background:tone === "warning" ? "rgba(245,158,11,.12)" : "rgba(148,163,184,.1)",
  color:tone === "warning" ? tc.warning : tc.grey,
  fontSize:10,
  fontWeight:800,
  whiteSpace:"nowrap",
});

const KNOWN_AIRLINE_LABELS = {
  SV: {
    ar: "الخطوط السعودية",
    fr: "Saudi Airlines",
    en: "Saudi Airlines",
  },
  AT: {
    ar: "الخطوط الملكية المغربية",
    fr: "Royal Air Maroc",
    en: "Royal Air Maroc",
  },
};

const translateClientLevel = (value, lang) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const direct = translateHotelLevel(raw, lang);
  if (direct && direct !== raw) return direct;
  const withoutArticle = raw.replace(/^ال/u, "");
  const normalized = translateHotelLevel(withoutArticle, lang);
  return normalized || raw;
};

const translateClientRoomCategory = (client, lang) => {
  const raw = client?.roomCategoryLabel
    || client?.roomCategory
    || client?.docs?.rooming?.categoryLabel
    || client?.docs?.rooming?.category
    || "";
  return translateRoomCategory(raw, lang) || raw;
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

const getOverpaidLabel = (lang) => {
  if (lang === "fr") return "Trop-perçu";
  if (lang === "en") return "Overpaid";
  return "الزائد";
};

const translateProgramAirline = (program, lang) => {
  const airline = getProgramAirline(program);
  if (!airline) return program?.transport || "";
  const code = normalizeAirlineCode(airline.code);
  const translatedName = KNOWN_AIRLINE_LABELS[code]?.[lang] || airline.name || program?.transport || code;
  return code ? `${translatedName} (${code})` : translatedName;
};

export default function ClientDetail({
  client,
  store,
  onClose,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
  onToast,
  onDataChanged,
  highlightFromNotification = false,
  notificationHighlightToken = null,
  linkedPayments = EMPTY_LINKED_PAYMENTS,
  programOverride = null,
  programClientsOverride = null,
  paymentsOverride = null,
  paymentsReadyOverride = undefined,
  onRequireGlobalData = null,
}) {
  const { t, lang, dir } = useLang();
  const isRTL = dir === "rtl";
  const { getProgramById, getClientPayments, getClientTotalPaid, getClientStatus,
          getClientLastPayment, deletePayment, agency, clients = [], badgePhotoApi } = store;
  const scopedPaymentsReady = paymentsReadyOverride === true && Array.isArray(paymentsOverride);
  const globalPaymentsReady = !store.isSupabaseEnabled || store.paymentsLoaded;
  const globalClientsReady = !store.isSupabaseEnabled || store.clientsLoaded;
  const globalDetailReady = globalPaymentsReady && globalClientsReady;
  const paymentsReady = scopedPaymentsReady || globalPaymentsReady;
  const paymentDataLoading = Boolean(store.isSupabaseEnabled && !paymentsReady);
  const loadingLabel = t.loading || "Loading...";
  const [showPayForm, setShowPayForm] = React.useState(false);
  const [showSharedReceiptModal, setShowSharedReceiptModal] = React.useState(false);
  const [badgePhotoUrl, setBadgePhotoUrl] = React.useState("");
  const [badgeBusy, setBadgeBusy] = React.useState(false);
  const [contractBusy, setContractBusy] = React.useState(false);
  const [receiptPayment, setReceiptPayment] = React.useState(null);
  const [sharedReceiptDraft, setSharedReceiptDraft] = React.useState(null);
  const [sharedReceiptLoadingId, setSharedReceiptLoadingId] = React.useState("");
  const [notificationHighlightActive, setNotificationHighlightActive] = React.useState(false);
  const [locallyHiddenPaymentIds, setLocallyHiddenPaymentIds] = React.useState(() => new Set());
  const paymentsHydrationRequestedRef = React.useRef(false);

  React.useEffect(() => {
    if (!highlightFromNotification || !notificationHighlightToken) return undefined;
    setNotificationHighlightActive(true);
    const timer = window.setTimeout(() => setNotificationHighlightActive(false), 3600);
    return () => window.clearTimeout(timer);
  }, [highlightFromNotification, notificationHighlightToken]);

  React.useEffect(() => {
    setLocallyHiddenPaymentIds(new Set());
  }, [client.id, linkedPayments]);

  const clientProgramId = getClientProgramId(client);
  const program     = programOverride || getProgramById(clientProgramId);
  const programStatus = String(program?.status || "").trim().toLowerCase();
  const isAssignedToActiveFinancialProgram = Boolean(
    clientProgramId
    && program?.id
    && program.deleted !== true
    && program.archived !== true
    && !["archived", "deleted", "trashed"].includes(programStatus)
  );
  const docs        = client.docs || {};
  const deletedProgramSnapshot = docs.deletedProgramSnapshot || null;
  const showDeletedProgramSnapshot = !program && deletedProgramSnapshot;
  const participantTerms = React.useMemo(() => getParticipantTerminology(program, client, lang), [client, program, lang]);
  const serviceType = getClientServiceType(client);
  const serviceTypeLabel = getClientServiceTypeLabel(serviceType, t, lang);
  const serviceTypeFieldLabel = t.serviceType || (lang === "fr" ? "Type de service" : lang === "en" ? "Service type" : "نوع الخدمة");
  const serviceHasAccommodation = clientServiceIncludesAccommodation(serviceType);
  const costingReferenceCost = React.useMemo(
    () => getProgramServiceCostingReferenceCost(program, serviceType),
    [program, serviceType],
  );
  const standaloneServiceSalePrice = React.useMemo(
    () => getProgramStandaloneServiceSalePrice(program, serviceType),
    [program, serviceType],
  );
  const referenceCostLabel = getReferenceCostLabel(serviceType, t.officialPrice, lang);
  const storedPayments = React.useMemo(
    () => globalPaymentsReady ? getClientPayments(client.id) : [],
    [client.id, getClientPayments, globalPaymentsReady],
  );
  const globalPaymentRows = React.useMemo(
    () => globalPaymentsReady
      ? collectClientPaymentRows(client.id, [storedPayments, linkedPayments], locallyHiddenPaymentIds)
      : [],
    [client.id, globalPaymentsReady, linkedPayments, locallyHiddenPaymentIds, storedPayments],
  );
  const scopedPaymentRows = React.useMemo(
    () => scopedPaymentsReady
      ? collectClientPaymentRows(client.id, [paymentsOverride, linkedPayments], locallyHiddenPaymentIds)
      : [],
    [client.id, linkedPayments, locallyHiddenPaymentIds, paymentsOverride, scopedPaymentsReady],
  );
  const payments = scopedPaymentsReady ? scopedPaymentRows : globalPaymentRows;
  const totalPaid   = paymentsReady ? payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) : 0;
  const pricingOptions = React.useMemo(() => ({
    referencePrice: costingReferenceCost,
    standaloneSalePrice: standaloneServiceSalePrice,
    program,
  }), [costingReferenceCost, standaloneServiceSalePrice, program]);
  const salePrice   = getClientEffectiveSalePrice(client, pricingOptions);
  const offPrice    = getClientEffectiveOfficialPrice(client, pricingOptions);
  const remaining   = paymentsReady ? getClientRemainingAmount(client, totalPaid, pricingOptions) : null;
  const overpaid    = paymentsReady ? getClientOverpaidAmount(client, totalPaid, pricingOptions) : 0;
  const discount    = Math.max(0, offPrice - salePrice);
  const status      = paymentsReady
    ? (totalPaid === 0 ? "unpaid" : totalPaid >= salePrice ? "cleared" : "partial")
    : "";
  const displayStatus = paymentsReady ? getClientDisplayStatus(client, program, status, pricingOptions) : "";
  const incompleteTooltip = displayStatus === "information_incomplete"
    ? getClientCompletionTooltip(client, lang, program, pricingOptions)
    : "";
  const pct         = paymentsReady && salePrice > 0 ? Math.min((totalPaid / salePrice) * 100, 100) : 0;
  const sortedPayments = React.useMemo(
    () => [...payments].sort((a,b) => new Date(b.date)-new Date(a.date)),
    [payments]
  );
  const lastPmt     = paymentsReady
    ? (sortedPayments[0] || (scopedPaymentsReady ? null : getClientLastPayment(client.id)))
    : null;
  const p           = client.passport || {};
  const displayName = getClientDisplayName(client);
  const completionBadges = React.useMemo(() => getClientCompletionBadges(client, lang, program, pricingOptions), [client, lang, program, pricingOptions]);
  const completionLabels = React.useMemo(() => getClientCompletionLabels(lang), [lang]);
  const paymentEligibility = React.useMemo(() => getClientPaymentEligibility(client, program, pricingOptions), [client, program, pricingOptions]);
  const financialActionsRestricted = !isAssignedToActiveFinancialProgram;
  const canAddPayment = paymentEligibility.canAddPayment && !financialActionsRestricted;
  const canPrintReceipts = !financialActionsRestricted;
  const restrictedPaymentsNotice = t.unassignedClientPaymentsRestrictedNotice || (
    lang === "fr"
      ? "Ce client n’est rattaché à aucun programme actif. Vous ne pouvez donc pas ajouter de nouveaux paiements ni imprimer de reçus. Vous pouvez seulement consulter les paiements existants ou les supprimer si nécessaire."
      : lang === "en"
        ? "This client is not assigned to an active program, so you cannot add new payments or print receipts. You can only review existing payments or delete them if needed."
        : "هذا الحاج/المعتمر غير مدرج في أي برنامج نشط، لذلك لا يمكن إضافة دفعات جديدة أو طباعة وصولات. يمكنك فقط مراجعة الدفعات السابقة أو حذفها إن لزم."
  );
  const addPaymentDisabledMessage = t.unassignedClientAddPaymentTooltip || (
    lang === "fr"
      ? "Le client doit être rattaché à un programme actif avant d’ajouter un paiement."
      : lang === "en"
        ? "The client must be assigned to an active program before adding a new payment."
        : "يجب إدراج الحاج/المعتمر في برنامج نشط قبل إضافة دفعة جديدة."
  );
  const missingCompletionItems = React.useMemo(
    () => getClientMissingCompletionItems(client, lang, program, pricingOptions),
    [client, lang, program, pricingOptions],
  );
  const secondaryCompletionBadges = React.useMemo(
    () => completionBadges.filter((badge) => badge.key !== displayStatus),
    [completionBadges, displayStatus],
  );
  const hasIncompleteCompletionBadge = completionBadges.some((badge) => badge.key === "information_incomplete");
  const showMissingInfoWarning = missingCompletionItems.length > 0
    && (displayStatus === "information_incomplete" || hasIncompleteCompletionBadge);
  const cin = client.cin || client.CIN || client.nationalId || client.national_id || p.cin || p.nationalId || "";
  const registrationSource = client.registrationSource || client.registration_source || "";
  const address = client.address || client.adress || client.addressLine || client.homeAddress || "";
  const badgePhotoPath = client.badgePhotoPath || docs.badgePhotoPath || "";
  const programClientsSource = Array.isArray(programClientsOverride) ? programClientsOverride : null;
  const programClients = React.useMemo(
    () => programClientsSource || clients.filter((item) => getClientProgramId(item) === clientProgramId),
    [clients, clientProgramId, programClientsSource]
  );
  const programClientsById = React.useMemo(() => {
    const map = new Map();
    programClients.forEach((item) => {
      if (item?.id) map.set(String(item.id), item);
    });
    if (client?.id) map.set(String(client.id), client);
    return map;
  }, [client, programClients]);
  const sharedReceiptPayments = React.useMemo(() => {
    if (scopedPaymentsReady) return Array.isArray(paymentsOverride) ? paymentsOverride : [];
    if (globalPaymentsReady) return Array.isArray(store.payments) ? store.payments : [];
    return [];
  }, [globalPaymentsReady, paymentsOverride, scopedPaymentsReady, store.payments]);
  const badgeFileNumber = React.useMemo(() => {
    const index = programClients.findIndex((item) => item.id === client.id);
    return String(index >= 0 ? index + 1 : 1).padStart(3, "0");
  }, [client.id, programClients]);
  const money = React.useCallback((value) => formatCurrency(value, lang), [lang]);
  const template = React.useCallback((text, vars = {}) => {
    return Object.entries(vars).reduce(
      (result, [key, value]) => String(result).replaceAll(`{${key}}`, String(value ?? "")),
      String(text || "")
    );
  }, []);
  const deletedProgramLabel = React.useMemo(() => {
    if (lang === "fr") return "Programme supprimé";
    if (lang === "en") return "Deleted program";
    return "برنامج محذوف";
  }, [lang]);
  const historicalProgramLabel = React.useMemo(() => {
    if (lang === "fr") return "Informations historiques du programme";
    if (lang === "en") return "Historical program information";
    return "معلومات البرنامج المحفوظة";
  }, [lang]);

  const requestGlobalDetailDataForAction = React.useCallback(async () => {
    if (globalDetailReady) return true;
    if (typeof onRequireGlobalData === "function") {
      return Boolean(await onRequireGlobalData());
    }
    onToast?.(loadingLabel, "info");
    store.ensureClientsLoaded?.();
    store.ensurePaymentsLoaded?.();
    return false;
  }, [globalDetailReady, loadingLabel, onRequireGlobalData, onToast, store]);

  const handleDownloadBadge = React.useCallback(async () => {
    if (!program) {
      onToast?.(t.badgeNoProgramForClient || "No program is linked to this pilgrim.", "error");
      return;
    }
    setBadgeBusy(true);
    try {
      await downloadClientBadgePdf({
        agencyId: store.agencyId,
        client,
        program,
        agency,
        lang,
        fileNumber: badgeFileNumber,
      });
    } catch (error) {
      onToast?.(
        error?.message === "missing-template"
          ? (t.badgeNoTemplateForProgram || "No badge template is linked to this program yet.")
          : (t.badgeDownloadError || "Unable to download badge"),
        "error"
      );
    } finally {
      setBadgeBusy(false);
    }
  }, [agency, badgeFileNumber, client, lang, onToast, program, store.agencyId, t.badgeDownloadError, t.badgeNoProgramForClient, t.badgeNoTemplateForProgram]);

  const handleDownloadContract = React.useCallback(async () => {
    const labels = {
      noProgram: lang === "fr" ? "Aucun programme n’est lié à ce pèlerin."
        : lang === "en" ? "No program is linked to this pilgrim."
        : "لا يوجد برنامج مرتبط بهذا المعتمر.",
      missingRepresentative: lang === "fr" ? "Impossible de générer le contrat de ce mineur avant de choisir son représentant."
        : lang === "en" ? "Cannot generate this minor’s contract before selecting a representative."
        : "لا يمكن إنشاء عقد لهذا القاصر قبل اختيار من ينوب عنه.",
      representativeNotFound: lang === "fr" ? "Le représentant doit être un pèlerin du même programme."
        : lang === "en" ? "The representative must be a pilgrim from the same program."
        : "يجب أن يكون من ينوب عنه معتمرًا من نفس البرنامج.",
      representativeContract: lang === "fr" ? "Contrat du représentant téléchargé"
        : lang === "en" ? "Representative contract downloaded"
        : "تم تحميل عقد من ينوب عنه",
      missingUmrah: lang === "fr" ? "Aucun modèle de contrat Omra n’est importé."
        : lang === "en" ? "No Umrah contract template is uploaded."
        : "لم يتم رفع قالب عقد العمرة.",
      missingHajj: lang === "fr" ? "Aucun modèle de contrat Hajj n’est importé."
        : lang === "en" ? "No Hajj contract template is uploaded."
        : "لم يتم رفع قالب عقد الحج.",
      error: lang === "fr" ? "Impossible de télécharger le contrat."
        : lang === "en" ? "Unable to download contract."
        : "تعذر تحميل العقد.",
      success: lang === "fr" ? "Contrat téléchargé"
        : lang === "en" ? "Contract downloaded"
        : "تم تحميل العقد",
    };
    if (!globalDetailReady) {
      const ready = await requestGlobalDetailDataForAction();
      if (!ready) return null;
    }
    if (!globalDetailReady) {
      return null;
    }
    if (!program) {
      onToast?.(labels.noProgram, "error");
      return;
    }
    setContractBusy(true);
    try {
      const representedById = getRepresentedByClientId(client);
      const shouldUseRepresentative = isClientMinorWithoutCin(client);
      if (shouldUseRepresentative && !representedById) {
        onToast?.(labels.missingRepresentative, "error");
        return null;
      }
      const representative = shouldUseRepresentative
        ? clients.find((item) => item.id === representedById && item.programId === client.programId)
        : null;
      if (shouldUseRepresentative && (!representative || !isEligibleRepresentative(representative))) {
        onToast?.(labels.representativeNotFound, "error");
        return null;
      }
      const contractClient = representative || client;
      const contractProgram = getProgramById(contractClient.programId) || program;
      const contractPayments = getClientPayments(contractClient.id);
      const contractTotalPaid = getClientTotalPaid(contractClient.id);
      const contractSalePrice = contractClient.salePrice || contractClient.price || 0;
      const representedMinors = clients.filter((item) => (
        item.id !== contractClient.id
        && item.programId === contractClient.programId
        && getRepresentedByClientId(item) === contractClient.id
        && isClientMinorWithoutCin(item)
      ));
      const result = await downloadSingleContract({
        agencyId: store.agencyId,
        client: contractClient,
        program: contractProgram,
        payments: contractPayments,
        totalPaid: contractTotalPaid,
        salePrice: contractSalePrice,
        agency,
        representedMinors,
        lang,
      });
      store.recordActivity?.(
        "contract_generate",
        translateActivityDescription(`تم تحميل عقد ${getClientDisplayName(contractClient) || displayName}`),
        getClientDisplayName(contractClient) || displayName
      );
      onToast?.(representative ? labels.representativeContract : labels.success, "success");
      return result;
    } catch (error) {
      if (error?.code === "missing-contract-template") {
        onToast?.(error.templateType === "hajj" ? labels.missingHajj : labels.missingUmrah, "error");
      } else {
        console.error("[Contracts] Download failed:", error);
        onToast?.(labels.error, "error");
      }
      return null;
    } finally {
      setContractBusy(false);
    }
  }, [agency, client, clients, displayName, getClientPayments, getClientTotalPaid, getProgramById, globalDetailReady, lang, onToast, program, requestGlobalDetailDataForAction, store]);

  const buildSharedReceiptDraftFromGroup = React.useCallback((paymentGroup = {}) => {
    const coveredClients = Array.isArray(paymentGroup.coveredClients || paymentGroup.covered_clients)
      ? (paymentGroup.coveredClients || paymentGroup.covered_clients)
      : [];
    const paymentType = paymentGroup.paymentType || paymentGroup.payment_type || "normal";
    const paymentTypeLabel = paymentType === "previous"
      ? (t.previousPayment || (lang === "fr" ? "Paiement antérieur" : lang === "en" ? "Previous payment" : "دفعة سابقة"))
      : (t.normalPayment || (lang === "fr" ? "Paiement normal" : lang === "en" ? "Normal payment" : "دفعة عادية"));
    const allocations = coveredClients.map((item) => {
      const clientId = String(item.client_id || item.clientId || item.id || "");
      const coveredClient = programClientsById.get(clientId) || {};
      const name = firstText(item.client_name, item.clientName, item.name, getClientDisplayName(coveredClient));
      const allocatedAmount = Number(item.allocated_amount ?? item.allocatedAmount ?? item.amount ?? 0);
      const totalPrice = Number(item.total_price ?? item.totalPrice ?? 0);
      const paidBefore = Number(item.paid_before ?? item.paidBefore ?? 0);
      const remainingAfter = Number(
        item.remaining_after
        ?? item.remainingAfter
        ?? Math.max(0, totalPrice - paidBefore - allocatedAmount)
      );
      return {
        id: clientId,
        client: coveredClient?.id ? coveredClient : { id: clientId, name },
        name,
        phone: firstText(item.phone, item.phone_number, coveredClient.phone, coveredClient.phoneNumber),
        passport: firstText(
          item.passport,
          item.passport_no,
          item.passportNumber,
          item.passport_number,
          coveredClient.passportNo,
          coveredClient.passport?.number,
        ),
        totalPrice,
        paidBefore,
        allocatedAmount,
        remainingAfter,
      };
    });
    return {
      receiptNo: firstText(paymentGroup.receiptNumber, paymentGroup.receipt_number),
      paymentType,
      paymentTypeLabel,
      payerName: firstText(paymentGroup.payerName, paymentGroup.payer_name, getClientDisplayName(client)),
      amount: Number(paymentGroup.totalAmount ?? paymentGroup.total_amount ?? 0),
      method: firstText(paymentGroup.paymentMethod, paymentGroup.payment_method),
      date: firstText(paymentGroup.paymentDate, paymentGroup.payment_date),
      legacyReceiptNumber: paymentType === "previous" ? firstText(paymentGroup.receiptNumber, paymentGroup.receipt_number) : "",
      paidBy: firstText(paymentGroup.paidBy, paymentGroup.paid_by),
      chequeNumber: firstText(paymentGroup.chequeNumber, paymentGroup.cheque_number),
      note: firstText(paymentGroup.notes, paymentGroup.note),
      allocations,
    };
  }, [client, lang, programClientsById, t.normalPayment, t.previousPayment]);

  const openReceiptSelector = React.useCallback(async (payment) => {
    if (!canPrintReceipts) {
      onToast?.(addPaymentDisabledMessage, "error");
      return;
    }
    const sharedPaymentGroupId = getSharedPaymentGroupId(payment);
    if (sharedPaymentGroupId) {
      if (!store.fetchPaymentGroup) {
        onToast?.(
          t.sharedReceiptSaveError || (
            lang === "fr"
              ? "Impossible de charger le reçu commun."
              : lang === "en"
                ? "Unable to load the shared receipt."
                : "تعذر تحميل الوصل المشترك."
          ),
          "error",
        );
        return;
      }
      setSharedReceiptLoadingId(sharedPaymentGroupId);
      try {
        const paymentGroup = await store.fetchPaymentGroup(sharedPaymentGroupId);
        if (!paymentGroup) {
          onToast?.(
            t.sharedReceiptSaveError || (
              lang === "fr"
                ? "Impossible de charger le reçu commun."
                : lang === "en"
                  ? "Unable to load the shared receipt."
                  : "تعذر تحميل الوصل المشترك."
            ),
            "error",
          );
          return;
        }
        setReceiptPayment(null);
        setSharedReceiptDraft(buildSharedReceiptDraftFromGroup(paymentGroup));
      } finally {
        setSharedReceiptLoadingId("");
      }
      return;
    }
    if (!globalDetailReady) {
      await requestGlobalDetailDataForAction();
      return;
    }
    if (isPreviousPaymentRecord(payment)) return;
    if (payment) setReceiptPayment(payment);
  }, [addPaymentDisabledMessage, buildSharedReceiptDraftFromGroup, canPrintReceipts, globalDetailReady, lang, onToast, requestGlobalDetailDataForAction, store, t.sharedReceiptSaveError]);

  const closeReceiptSelector = React.useCallback(() => {
    setReceiptPayment(null);
    setSharedReceiptDraft(null);
  }, []);

  const handleReceiptTypeSelect = React.useCallback(async (receiptType) => {
    if (sharedReceiptDraft) {
      const printed = printSharedReceipt({
        receipt: sharedReceiptDraft,
        program,
        agency,
        lang,
        receiptType,
      });
      if (!printed) onToast?.(t.printWindowBlocked || "Unable to open the print window.", "error");
      setSharedReceiptDraft(null);
      return;
    }
    if (!receiptPayment || !canPrintReceipts) return;
    if (!globalDetailReady) {
      await requestGlobalDetailDataForAction();
      return;
    }
    printReceipt({ payment: receiptPayment, client, program, agency, lang, receiptType, payments: globalPaymentRows });
    setReceiptPayment(null);
  }, [agency, canPrintReceipts, client, globalDetailReady, globalPaymentRows, lang, onToast, program, receiptPayment, requestGlobalDetailDataForAction, sharedReceiptDraft, t.printWindowBlocked]);

  const paymentBlockMessage = financialActionsRestricted
    ? addPaymentDisabledMessage
    : (
      paymentEligibility.paymentEligibilityReason === "no_program"
        ? (t.noProgramPaymentBlocked || completionLabels.noProgramPaymentBlocked)
        : (t.incompleteProgramPaymentBlocked || completionLabels.incompleteProgramPaymentBlocked)
    );
  const paymentPanelMessage = financialActionsRestricted
    ? restrictedPaymentsNotice
    : (
      paymentEligibility.paymentEligibilityReason === "no_program"
        ? (t.noProgramPaymentPanel || completionLabels.noProgramPaymentPanel)
        : (t.incompleteProgramPaymentPanel || completionLabels.incompleteProgramPaymentPanel)
    );
  const scopedPaymentFormReady = scopedPaymentsReady && Boolean(program);
  const paymentFormDataReady = globalDetailReady || scopedPaymentFormReady;
  const handleAddPaymentClick = React.useCallback(async () => {
    if (!paymentsReady) {
      onToast?.(loadingLabel, "info");
      return;
    }
    if (!canAddPayment) {
      onToast?.(paymentBlockMessage, "error");
      return;
    }
    if (!paymentFormDataReady) {
      await requestGlobalDetailDataForAction();
      return;
    }
    setShowSharedReceiptModal(false);
    setShowPayForm(true);
  }, [canAddPayment, loadingLabel, onToast, paymentBlockMessage, paymentFormDataReady, paymentsReady, requestGlobalDetailDataForAction]);

  const handleSharedReceiptClick = React.useCallback(async () => {
    if (!paymentsReady) {
      onToast?.(loadingLabel, "info");
      return;
    }
    if (!canPrintReceipts) {
      onToast?.(addPaymentDisabledMessage, "error");
      return;
    }
    if (!paymentFormDataReady) {
      await requestGlobalDetailDataForAction();
      return;
    }
    setShowPayForm(false);
    setShowSharedReceiptModal(true);
  }, [addPaymentDisabledMessage, canPrintReceipts, loadingLabel, onToast, paymentFormDataReady, paymentsReady, requestGlobalDetailDataForAction]);

  React.useEffect(() => {
    if (canAddPayment || !showPayForm) return;
    setShowPayForm(false);
  }, [canAddPayment, showPayForm]);

  React.useEffect(() => {
    if (canPrintReceipts || !receiptPayment) return;
    setReceiptPayment(null);
  }, [canPrintReceipts, receiptPayment]);

  React.useEffect(() => {
    if (canPrintReceipts || !showSharedReceiptModal) return;
    setShowSharedReceiptModal(false);
  }, [canPrintReceipts, showSharedReceiptModal]);

  React.useEffect(() => {
    if (scopedPaymentsReady) return;
    if (!store.isSupabaseEnabled || paymentsReady || store.paymentsLoading) return;
    if (paymentsHydrationRequestedRef.current) return;
    paymentsHydrationRequestedRef.current = true;
    store.ensurePaymentsLoaded?.();
  }, [paymentsReady, scopedPaymentsReady, store.ensurePaymentsLoaded, store.isSupabaseEnabled, store.paymentsLoading]);

  const financialCards = React.useMemo(() => ([
    { label:referenceCostLabel, val:serviceHasAccommodation ? money(offPrice) : costingReferenceCost ? money(costingReferenceCost) : "—", color:tc.grey },
    { label:t.salePrice,     val:money(salePrice), color:tc.gold },
    { label:t.paid,          val:paymentsReady ? money(totalPaid) : loadingLabel, color:paymentsReady ? tc.greenLight : tc.grey },
    {
      label:t.remaining,
      val:paymentsReady ? money(remaining) : loadingLabel,
      color:paymentsReady && remaining > 0 ? tc.warning : paymentsReady ? tc.greenLight : tc.grey,
    },
  ]), [costingReferenceCost, loadingLabel, money, offPrice, paymentsReady, referenceCostLabel, remaining, salePrice, serviceHasAccommodation, t.paid, t.remaining, t.salePrice, totalPaid]);
  const overpaidLabel = React.useMemo(() => getOverpaidLabel(lang), [lang]);

  React.useEffect(() => {
    let cancelled = false;
    setBadgePhotoUrl("");
    if (!badgePhotoPath || !badgePhotoApi?.isAvailable || !badgePhotoApi.getPhotoUrl) return undefined;
    badgePhotoApi.getPhotoUrl(badgePhotoPath).then((url) => {
      if (!cancelled) setBadgePhotoUrl(url || "");
    });
    return () => { cancelled = true; };
  }, [badgePhotoApi, badgePhotoPath]);

  // Passport expiry warning
  const passExpiry  = p.expiry ? new Date(p.expiry) : null;
  const daysToExp   = passExpiry ? Math.ceil((passExpiry - new Date())/(1000*60*60*24)) : null;
  const minorClient = isMinor(p.birthDate);
  const showTravelDetails = serviceType === "full_package" || serviceType === "without_visa" || serviceType === "ticket_only";
  const showProgramDates = serviceType !== "visa_only";
  const showProgramContacts = serviceType === "full_package" || serviceType === "without_visa" || serviceType === "accommodation_only";
  const roomCategoryDisplay = translateClientRoomCategory(client, lang);
  const programDetailRows = [
    [t.program, program?.name || (showDeletedProgramSnapshot ? getClientDeletedProgramLabel(client, lang) : completionLabels.deletedProgram)],
    [serviceTypeFieldLabel, serviceTypeLabel],
    ...(serviceHasAccommodation ? [
      [t.level || "المستوى", translateClientLevel(client.packageLevel || client.hotelLevel || deletedProgramSnapshot?.packageLevel || deletedProgramSnapshot?.hotelLevel, lang) || client.packageLevel || client.hotelLevel || deletedProgramSnapshot?.packageLevel || deletedProgramSnapshot?.hotelLevel || "—"],
      [t.hotelMecca, client.hotelMecca || deletedProgramSnapshot?.hotelMecca || "—"],
      [t.hotelMadina, client.hotelMadina || deletedProgramSnapshot?.hotelMadina || "—"],
      [t.roomType, translateRoomType(client.roomTypeLabel || client.roomType || deletedProgramSnapshot?.roomTypeLabel || deletedProgramSnapshot?.roomType, lang) || getRoomTypeLabel(client.roomType || deletedProgramSnapshot?.roomType) || "—"],
      ...(roomCategoryDisplay ? [[t.roomCategory || "تصنيف الغرفة", roomCategoryDisplay]] : []),
    ] : []),
    ...(showTravelDetails ? [
      [t.transport, program ? (translateProgramAirline(program, lang) || program.transport || "—") : (deletedProgramSnapshot?.transport || "—")],
      ...(client.ticketNo ? [[t.ticketNo || "رقم التذكرة", client.ticketNo]] : []),
    ] : []),
    ...(showProgramContacts && program?.guidePhone ? [[t.guidePhone || "رقم المؤطر", program.guidePhone]] : []),
    ...(showProgramContacts && program?.saudiPhone1 ? [[t.saudiPhone1 || "رقم سعودي 1", program.saudiPhone1]] : []),
    ...(showProgramContacts && program?.saudiPhone2 ? [[t.saudiPhone2 || "رقم سعودي 2", program.saudiPhone2]] : []),
    ...(showProgramDates ? [
      [t.departure, program?.departure || deletedProgramSnapshot?.departure || "—"],
      [t.returnDate, program?.returnDate || deletedProgramSnapshot?.returnDate || "—"],
    ] : []),
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20,
        padding:"16px 18px",
        background:"linear-gradient(135deg,rgba(26,107,58,.2),rgba(212,175,55,.08))",
        borderRadius:14, border:"1px solid rgba(212,175,55,.15)",
        outline: notificationHighlightActive ? "2px solid rgba(59,130,246,.72)" : "2px solid transparent",
        outlineOffset:3,
        boxShadow: notificationHighlightActive ? "0 0 0 4px rgba(59,130,246,.14)" : "none",
        transition:"outline-color .25s ease, box-shadow .35s ease" }}>
        <div style={{ width:56, height:56, borderRadius:12, flexShrink:0,
          background:"linear-gradient(135deg,#d4af37,#b8941e)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:24, fontWeight:900, color:"#060d1a",
          boxShadow:"0 8px 24px rgba(212,175,55,.3)", overflow:"hidden" }}>
          {badgePhotoUrl ? (
            <img src={badgePhotoUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          ) : (
            (displayName || "?")[0]
          )}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4, flexWrap:"wrap" }}>
            <h2 style={{ fontSize:18, fontWeight:800, color:tc.white }}>{displayName}</h2>
            {client.archived && (
              <span style={{
                fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:20,
                background:"rgba(245,158,11,.12)", border:"1px solid rgba(245,158,11,.3)",
                color:tc.warning,
              }}><AppIcon name="archive" size={12} color={tc.warning} /> {t.archivedBadge}</span>
            )}
            {minorClient && (
              <span style={{
                fontSize:11,
                fontWeight:800,
                padding:"2px 10px",
                borderRadius:20,
                background:"rgba(59,130,246,.1)",
                border:"1px solid rgba(59,130,246,.22)",
                color:"var(--rukn-text-strong)",
              }}>
                {t.minorBadge || (lang === "fr" ? "Mineur" : lang === "en" ? "Minor" : "قاصر")}
              </span>
            )}
            {secondaryCompletionBadges.map((badge) => (
              <span key={badge.key} title={badge.title || badge.label} style={completionBadgeStyle(badge.tone)}>
                {badge.label}
              </span>
            ))}
            <span style={{
              fontSize:11,
              fontWeight:800,
              padding:"2px 10px",
              borderRadius:20,
              background:"rgba(212,175,55,.12)",
              border:"1px solid rgba(212,175,55,.28)",
              color:tc.gold,
              display:"inline-flex",
              alignItems:"center",
              gap:5,
            }}>
              <AppIcon name="program" size={12} color={tc.gold} /> {serviceTypeFieldLabel}: {serviceTypeLabel}
            </span>
          </div>
          {/* Amadeus format */}
          {(client.nom || client.prenom) && (
            <p style={{ fontSize:12, color:tc.gold, marginBottom:4, fontFamily:"monospace" }}>
              {client.nom && client.prenom ? `${client.nom}/${client.prenom}` : (client.nom || client.prenom)}
            </p>
          )}
          <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
            <span style={{ fontSize:12, color:tc.grey, display:"inline-flex", alignItems:"center", gap:4 }}><AppIcon name="phone" size={13} color={tc.grey} /> {client.phone}</span>
            <span style={{ fontSize:12, color:tc.grey, display:"inline-flex", alignItems:"center", gap:4 }}><AppIcon name="location" size={13} color={tc.grey} /> {client.city}</span>
            {registrationSource && (
              <span style={{ fontSize:12, color:tc.gold, display:"inline-flex", alignItems:"center", gap:4 }}>
                <AppIcon name="contact" size={13} color={tc.gold} /> {t.registrationSource || "جهة التسجيل"}: {registrationSource}
              </span>
            )}
            {address && (
              <span style={{ fontSize:12, color:tc.grey, display:"inline-flex", alignItems:"center", gap:4 }}>
                <AppIcon name="location" size={13} color={tc.grey} /> {t.address || "العنوان"}: {address}
              </span>
            )}
            {showTravelDetails && client.ticketNo && <span style={{ fontSize:12, color:tc.gold, display:"inline-flex", alignItems:"center", gap:4 }}><AppIcon name="ticket" size={13} color={tc.gold} /> {client.ticketNo}</span>}
          </div>
        </div>
        {paymentsReady ? (
          <span title={incompleteTooltip || undefined}>
            <StatusBadge status={displayStatus} />
          </span>
        ) : (
          <span style={{
            padding:"3px 8px",
            borderRadius:999,
            fontSize:11,
            fontWeight:800,
            color:tc.grey,
            border:"1px solid rgba(148,163,184,.25)",
            background:"rgba(148,163,184,.1)",
          }}>
            {loadingLabel}
          </span>
        )}
      </div>

      {showMissingInfoWarning && (
        <div style={{
          display:"flex",
          alignItems:"flex-start",
          gap:10,
          padding:"10px 12px",
          marginBottom:14,
          borderRadius:12,
          border:"1px solid rgba(245,158,11,.28)",
          background:"rgba(245,158,11,.09)",
          color:"var(--rukn-text-strong)",
        }}>
          <AppIcon name="alert" size={16} color={tc.warning} />
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:12.5, fontWeight:900, color:tc.warning, marginBottom:5 }}>
              {completionLabels.informationIncomplete}
            </p>
            <p style={{ fontSize:11.5, color:tc.grey, fontWeight:800, marginBottom:4 }}>
              {completionLabels.missingPrefix}
            </p>
            <ul style={{
              margin:0,
              paddingInlineStart:isRTL ? 0 : 18,
              paddingInlineEnd:isRTL ? 18 : 0,
              display:"grid",
              gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",
              gap:"3px 12px",
              color:"var(--rukn-text-strong)",
              fontSize:12,
              fontWeight:700,
            }}>
              {missingCompletionItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Print buttons */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
        {paymentsReady && payments.map && payments.length > 0 && lastPmt && !isPreviousPaymentRecord(lastPmt) && (
          <span title={!canPrintReceipts ? addPaymentDisabledMessage : undefined} style={{ display:"inline-flex" }}>
            <Button variant="secondary" size="sm" icon="print"
              style={printActionButtonStyle}
              disabled={!canPrintReceipts}
              onClick={() => openReceiptSelector(lastPmt)}>
              {t.printReceipt}
            </Button>
          </span>
        )}
        <Button variant="secondary" size="sm" icon="passport"
          style={printActionButtonStyle}
          onClick={() => printClientCard({ client, program, agency, lang, programClients })}>
          {t.printCard}
        </Button>
        <Button variant="secondary" size="sm" icon="download"
          style={printActionButtonStyle}
          disabled={badgeBusy}
          onClick={handleDownloadBadge}>
          {t.downloadBadge || "Download badge"}
        </Button>
        <Button variant="secondary" size="sm" icon="file"
          style={printActionButtonStyle}
          disabled={contractBusy || !paymentsReady}
          onClick={handleDownloadContract}>
          {lang === "fr" ? "Télécharger contrat" : lang === "en" ? "Download contract" : "تحميل العقد"}
        </Button>
      </div>

      {/* Program */}
      {(program || showDeletedProgramSnapshot) && (
        <GlassCard gold style={{ padding:14, marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:10 }}>
            <p style={{ fontSize:11, color:tc.grey, fontWeight:700, display:"inline-flex", alignItems:"center", gap:6 }}><AppIcon name="program" size={14} color={tc.gold} /> {showDeletedProgramSnapshot ? historicalProgramLabel : t.program}</p>
            {showDeletedProgramSnapshot && (
              <span style={{
                fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:20,
                background:"rgba(245,158,11,.12)", border:"1px solid rgba(245,158,11,.3)",
                color:tc.warning,
              }}>
                {deletedProgramLabel}
              </span>
            )}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {programDetailRows.map(([k,v]) => (
              <div key={k}>
                <p style={{ fontSize:10, color:tc.grey }}>{k}</p>
                <p style={{ fontSize:12, fontWeight:600, color:"var(--rukn-text-strong)" }}>{v}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
      {!program && !showDeletedProgramSnapshot && secondaryCompletionBadges.length > 0 && (
        <GlassCard gold style={{ padding:14, marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <AppIcon name="program" size={14} color={tc.gold} />
            {secondaryCompletionBadges.map((badge) => (
              <span key={badge.key} title={badge.title || badge.label} style={completionBadgeStyle(badge.tone)}>
                {badge.label}
              </span>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Financials */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:14 }}>
        {financialCards.map(({label,val,color}) => (
          <div key={label} style={{ background:"var(--rukn-bg-soft)",
            border:"1px solid var(--rukn-border-soft)",
            borderRadius:10, padding:"10px 12px", textAlign:"center" }}>
            <p style={{ fontSize:10, color:tc.grey, marginBottom:4 }}>{label}</p>
            <p style={{ fontSize:15, fontWeight:800, color, fontFamily:"'Amiri',serif" }}>
              {val}
            </p>
          </div>
        ))}
      </div>
      {paymentsReady && overpaid > 0 && (
        <div style={{
          marginTop:-6,
          marginBottom:14,
          padding:"6px 10px",
          borderRadius:9,
          border:"1px solid rgba(212,175,55,.18)",
          background:"rgba(212,175,55,.06)",
          display:"inline-flex",
          alignItems:"center",
          gap:8,
          color:"var(--rukn-text-muted)",
          fontSize:11.5,
          fontWeight:800,
        }}>
          <span>{overpaidLabel}</span>
          <strong style={{ color:tc.gold }}>{money(overpaid)}</strong>
        </div>
      )}

      {discount > 0 && (
        <div style={{ background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.18)",
          borderRadius:10, padding:"8px 14px", marginBottom:12,
          display:"flex", alignItems:"center", gap:8 }}>
          <AppIcon name="discount" size={16} color={tc.danger} />
          <span style={{ fontSize:13, color:tc.danger, fontWeight:600 }}>
            {t.discount}: {money(discount)} ({Math.round((discount/offPrice)*100)}%)
          </span>
        </div>
      )}

      {/* Progress */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:12 }}>
          <span style={{ color:tc.grey }}>{t.paymentProgress}</span>
          <span style={{ color:tc.gold, fontWeight:700 }}>{paymentsReady ? `${Math.round(pct)}%` : loadingLabel}</span>
        </div>
        <div style={{ height:7, background:"var(--rukn-border-soft)", borderRadius:4, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, borderRadius:4, transition:"width 1.2s",
            background:pct>=100?"linear-gradient(90deg,#22c55e,#16a34a)":pct>50?"linear-gradient(90deg,#f59e0b,#d4af37)":"linear-gradient(90deg,#ef4444,#f97316)" }} />
        </div>
      </div>

      {/* Passport */}
      <GlassCard style={{ padding:14, marginBottom:14 }}>
        <p style={{ fontSize:11, color:tc.grey, fontWeight:700, marginBottom:10, display:"inline-flex", alignItems:"center", gap:6 }}><AppIcon name="passport" size={14} color={tc.gold} /> {t.passport}</p>
        {daysToExp !== null && daysToExp < 180 && (
          <div style={{ background:daysToExp<90?"rgba(239,68,68,.1)":"rgba(245,158,11,.1)",
            border:`1px solid ${daysToExp<90?tc.danger:tc.warning}`,
            borderRadius:8, padding:"6px 12px", marginBottom:10, fontSize:12,
            color:daysToExp<90?tc.danger:tc.warning, fontWeight:600 }}>
            {template(t.passportExpiryWarning, { days: daysToExp, expiry: p.expiry })}
          </div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[
            [t.passportNo,    p.number||"—"],
            [t.cin || "رقم البطاقة الوطنية", cin||"—"],
            [t.nationality,   p.nationality||"—"],
            [t.gender,        p.gender==="M"?t.male:p.gender==="F"?t.female:"—"],
            [t.birthDate,     p.birthDate||"—"],
            [t.expiry,        p.expiry||"—"],
            [t.issueDate,     p.issueDate||"—"],
          ].map(([k,v]) => (
            <div key={k}>
              <p style={{ fontSize:10, color:tc.grey }}>{k}</p>
              <p style={{ fontSize:12, fontWeight:600, color:"var(--rukn-text-strong)" }}>{v}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Documents */}
      <GlassCard style={{ padding:14, marginBottom:14 }}>
        <p style={{ fontSize:11, color:tc.grey, fontWeight:700, marginBottom:10, display:"inline-flex", alignItems:"center", gap:6 }}><AppIcon name="documents" size={14} color={tc.gold} /> {t.documents}</p>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {[
            ["passportCopy", t.passportCopy],
            ["photo",        t.photo],
            ["vaccine",      t.vaccine],
            ["contract",     t.contract],
          ].map(([key, label]) => (
            <span key={key} style={{
              padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:700,
              background:docs[key]?"rgba(34,197,94,.12)":"rgba(239,68,68,.1)",
              border:`1px solid ${docs[key]?tc.greenLight:tc.danger}`,
              color:docs[key]?tc.greenLight:tc.danger,
            }}>
              <AppIcon name={docs[key] ? "success" : "error"} size={13} color={docs[key]?tc.greenLight:tc.danger} /> {label}
            </span>
          ))}
        </div>
      </GlassCard>

      {/* Notes */}
      {client.notes && (
        <div style={{ background:"rgba(212,175,55,.06)", border:"1px solid rgba(212,175,55,.15)",
          borderRadius:10, padding:"10px 14px", marginBottom:14 }}>
          <p style={{ fontSize:11, color:tc.grey, marginBottom:3, display:"inline-flex", alignItems:"center", gap:6 }}><AppIcon name="notes" size={13} color={tc.gold} /> {t.notes}</p>
          <p style={{ fontSize:13, color:"var(--rukn-text-strong)" }}>{client.notes}</p>
        </div>
      )}

      <Divider label={t.paymentRecord} />

      {!canAddPayment && (
        <div style={{
          display:"flex",
          alignItems:"flex-start",
          gap:8,
          padding:"8px 11px",
          marginBottom:10,
          borderRadius:10,
          border:"1px solid rgba(245,158,11,.28)",
          background:"rgba(245,158,11,.09)",
          color:tc.warning,
          fontSize:11.5,
          lineHeight:1.5,
          fontWeight:700,
        }}>
          <AppIcon name="alert" size={15} color={tc.warning} />
          <span>{paymentPanelMessage}</span>
        </div>
      )}

      {/* Add payment */}
      {paymentDataLoading && (
        <div style={{ textAlign:"center", padding:14, color:tc.grey, fontSize:13 }}>
          {loadingLabel}
        </div>
      )}

      {paymentsReady && !showPayForm && !showSharedReceiptModal && (financialActionsRestricted || displayStatus !== "cleared" || canPrintReceipts) && (
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:12 }}>
          {(financialActionsRestricted || displayStatus !== "cleared") && (
            <span title={financialActionsRestricted ? addPaymentDisabledMessage : undefined} style={{ display:"inline-flex" }}>
              <Button
                variant={canAddPayment ? "success" : "warning"}
                icon={canAddPayment ? "plus" : "alert"}
                disabled={financialActionsRestricted}
                onClick={handleAddPaymentClick}
              >
                {financialActionsRestricted
                  ? t.addPayment
                  : canAddPayment ? t.addPayment : (t.paymentNotEligible || completionLabels.paymentNotEligible)}
              </Button>
            </span>
          )}
          {canPrintReceipts && (
            <Button
              variant="secondary"
              icon="receipt"
              onClick={handleSharedReceiptClick}
            >
              {t.sharedReceipt || (lang === "fr" ? "Reçu commun" : lang === "en" ? "Shared receipt" : "وصل مشترك")}
            </Button>
          )}
        </div>
      )}
      {paymentsReady && paymentFormDataReady && showPayForm && canAddPayment && (
        <PaymentForm clientId={client.id} clientName={client.name} store={store}
          clientOverride={scopedPaymentFormReady ? client : null}
          programOverride={scopedPaymentFormReady ? program : null}
          paymentsOverride={scopedPaymentFormReady ? payments : null}
          totalPaidOverride={scopedPaymentFormReady ? totalPaid : undefined}
          paymentsReadyOverride={scopedPaymentFormReady ? true : undefined}
          onSave={(savedPayment) => {
            setShowPayForm(false);
            onToast(t.addSuccess, "success");
            onDataChanged?.({ payment: savedPayment, clientId: client.id });
          }}
          onCancel={() => setShowPayForm(false)} />
      )}
      {paymentsReady && paymentFormDataReady && showSharedReceiptModal && canPrintReceipts && (
        <SharedReceiptModal
          open={showSharedReceiptModal}
          onClose={() => setShowSharedReceiptModal(false)}
          payerClient={client}
          program={program}
          agency={agency}
          clients={programClients}
          payments={sharedReceiptPayments}
          store={store}
          onToast={onToast}
          usesServerReceipt={Boolean(store.isSupabaseEnabled && store.agencyId)}
          onSave={(saved) => {
            onDataChanged?.({
              payments: saved?.payments || [],
              paymentGroup: saved?.paymentGroup || saved?.payment_group || null,
              clientId: client.id,
            });
          }}
        />
      )}

      {/* Payments */}
      {!paymentsReady ? (
        <div style={{ textAlign:"center", padding:20, color:tc.grey, fontSize:13 }}>
          {loadingLabel}
        </div>
      ) : payments.length === 0 ? (
        <div style={{ textAlign:"center", padding:20, color:tc.grey, fontSize:13 }}>
          {t.noPayments}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {sortedPayments.map(pmt => (
            <PaymentRow key={pmt.id} payment={pmt}
              onPrint={() => openReceiptSelector(pmt)}
              canPrint={canPrintReceipts}
              sharedReceiptLoadingId={sharedReceiptLoadingId}
              showActionsAlways={financialActionsRestricted}
              onDelete={async () => {
                const ready = await requestGlobalDetailDataForAction();
                if (!ready) return;
                if (window.confirm(t.confirmDeletePayment)) {
                  const hiddenPaymentIds = pmt.id ? [pmt.id] : [];
                  const deleteResult = deletePayment(pmt.id, { clientId: pmt.clientId || pmt.client_id });
                  if (pmt.id) {
                    setLocallyHiddenPaymentIds((current) => {
                      const next = new Set(current);
                      next.add(pmt.id);
                      return next;
                    });
                  }
                  onToast(t.deleteSuccess, "info");
                  onDataChanged?.({ reason: "payment-delete", hiddenPaymentIds });
                  if (deleteResult && typeof deleteResult.then === "function") {
                    deleteResult.then((result) => {
                      if (!result?.error) onDataChanged?.({ reason: "payment-delete-sync", hiddenPaymentIds });
                    }).catch(() => {});
                  }
                }
              }} />
          ))}
        </div>
      )}

      {lastPmt && (
        <div style={{ marginTop:10, display:"flex", gap:14, flexWrap:"wrap" }}>
          <span style={{ fontSize:12, color:tc.grey }}>{t.lastPayment}: <strong style={{color:"var(--rukn-text-strong)"}}>{lastPmt.date}</strong></span>
          <span style={{ fontSize:12, color:tc.grey }}>{isPreviousPaymentRecord(lastPmt) ? (t.oldReceipt || "وصل قديم") : t.lastReceipt}: <strong style={{color:tc.gold}}>{isPreviousPaymentRecord(lastPmt) ? (getLegacyReceiptNumber(lastPmt) || (t.previousPayment || "دفعة سابقة")) : lastPmt.receiptNo}</strong></span>
          <span style={{ fontSize:12, color:tc.grey }}>{t.paymentCount}: <strong style={{color:"var(--rukn-text-strong)"}}>{payments.length}</strong></span>
        </div>
      )}

      <Divider style={{ marginTop:18 }} />
      <div style={{ display:"flex", gap:8, justifyContent:"space-between", flexWrap:"wrap", alignItems:"center" }}>
        {/* Left: destructive actions */}
        <div style={{ display:"flex", gap:8 }}>
          {onDelete && (
            <Button variant="danger" icon="trash" onClick={onDelete}>
              {t.deleteClient || "حذف"}
            </Button>
          )}
          {!client.archived && onArchive && (
            <Button variant="warning" icon="archive" onClick={onArchive}>
              {t.archiveClient}
            </Button>
          )}
          {client.archived && onRestore && (
            <Button variant="success" icon="restore" onClick={onRestore}>
              {t.restoreClient}
            </Button>
          )}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Button variant="ghost" onClick={onClose}>{t.cancel}</Button>
          {!client.archived && (
            <Button variant="secondary" icon="edit" onClick={() => onEdit(client)}>{t.edit}</Button>
          )}
        </div>
      </div>

      <ReceiptTypeSelector
        open={Boolean(receiptPayment || sharedReceiptDraft)}
        onClose={closeReceiptSelector}
        onSelect={handleReceiptTypeSelect}
        t={t}
        lang={lang}
        participantTerms={participantTerms}
      />
    </div>
  );
}

function ReceiptTypeSelector({ open, onClose, onSelect, t, lang, participantTerms }) {
  React.useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  const labels = {
    title: t.receiptTypeTitle || (lang === "fr" ? "Choisir le type de reçu" : lang === "en" ? "Choose receipt type" : "اختر نوع الوصل"),
    agency: t.agencyReceipt || (lang === "fr" ? "Reçu agence" : lang === "en" ? "Agency receipt" : "وصل الوكالة"),
    client: participantTerms?.receiptTitle || t.pilgrimReceipt || (lang === "fr" ? "Reçu pèlerin" : lang === "en" ? "Pilgrim receipt" : "وصل المعتمر"),
    cancel: t.cancel || (lang === "fr" ? "Annuler" : lang === "en" ? "Cancel" : "إلغاء"),
  };

  return createPortal(
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 13050,
        background: "rgba(2,6,23,.62)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={labels.title}
        style={{
          width: "min(420px, 100%)",
          background: "var(--rukn-bg-modal)",
          border: "1px solid var(--rukn-border-soft)",
          borderRadius: 18,
          boxShadow: "0 32px 80px rgba(0,0,0,.5)",
          padding: 18,
          direction: lang === "ar" ? "rtl" : "ltr",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "var(--rukn-text-strong)" }}>
            {labels.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.cancel}
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              border: "1px solid var(--rukn-border-soft)",
              background: "var(--rukn-bg-soft)",
              color: "var(--rukn-text-muted)",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 16,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <Button variant="secondary" icon="receipt" onClick={() => onSelect("agency")}
            style={{ justifyContent: "center", width: "100%", minHeight: 42 }}>
            {labels.agency}
          </Button>
          <Button variant="primary" icon="receipt" onClick={() => onSelect("client")}
            style={{ justifyContent: "center", width: "100%", minHeight: 42 }}>
            {labels.client}
          </Button>
          <Button variant="ghost" onClick={onClose}
            style={{ justifyContent: "center", width: "100%", minHeight: 38 }}>
            {labels.cancel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PaymentRow({ payment, onPrint, onDelete, canPrint = true, showActionsAlways = false, sharedReceiptLoadingId = "" }) {
  const { t, lang } = useLang();
  const [hov, setHov] = React.useState(false);
  const icons = {"نقدًا":"banknote","تحويل بنكي":"bank","شيك":"file","إيداع بنكي":"bank","بطاقة بنكية":"payment","وقفة بنك":"bank","وقفة بنكية":"bank"};
  const isPrevious = isPreviousPaymentRecord(payment);
  const sharedPaymentGroupId = getSharedPaymentGroupId(payment);
  const isSharedReceiptPayment = Boolean(sharedPaymentGroupId);
  const sharedReceiptLoading = Boolean(sharedPaymentGroupId && sharedReceiptLoadingId === sharedPaymentGroupId);
  const legacyReceiptNumber = getLegacyReceiptNumber(payment);
  const previousPaymentLabel = t.previousPayment || (lang === "fr" ? "Paiement antérieur" : lang === "en" ? "Previous payment" : "دفعة سابقة");
  const sharedReceiptLabel = t.sharedReceipt || (lang === "fr" ? "Reçu commun" : lang === "en" ? "Shared receipt" : "وصل مشترك");
  const printSharedReceiptLabel = t.sharedReceiptPrint || (lang === "fr" ? "Imprimer le reçu commun" : lang === "en" ? "Print shared receipt" : "طباعة الوصل المشترك");
  const oldReceiptLabel = t.oldReceipt || (lang === "fr" ? "Ancien reçu" : lang === "en" ? "Old receipt" : "وصل قديم");
  const extraDetails = [
    payment.chequeNumber ? `${t.chequeNumber || "رقم الشيك"}: ${payment.chequeNumber}` : "",
    payment.paidBy ? `${t.paidBy || "من طرف"}: ${payment.paidBy}` : "",
    isPrevious && legacyReceiptNumber ? `${oldReceiptLabel}: ${legacyReceiptNumber}` : "",
  ].filter(Boolean).join(" • ");
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10,
        padding:"7px 10px",
        background:hov?"var(--rukn-row-hover)":"var(--rukn-row-bg)",
        border:"1px solid var(--rukn-row-border)", borderRadius:10, transition:"all .2s" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0, flex:1 }}>
        <span style={{
          width:28,
          height:28,
          borderRadius:9,
          display:"inline-flex",
          alignItems:"center",
          justifyContent:"center",
          flexShrink:0,
          background:"rgba(212,175,55,.09)",
          border:"1px solid rgba(212,175,55,.16)",
        }}>
          <AppIcon name={icons[payment.method] || "payment"} size={15} color={theme.colors.gold} />
        </span>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", lineHeight:1.35 }}>
            <span style={{ fontWeight:800, color:theme.colors.greenLight, fontSize:13.5, whiteSpace:"nowrap" }}>
            {formatCurrency(payment.amount, lang)}
            </span>
            <span style={{ fontSize:11, color:theme.colors.grey }}>{payment.date}</span>
            <span style={{ fontSize:11, color:theme.colors.grey }}>{translatePaymentMethod(payment.method, lang)}</span>
            {!isPrevious && payment.receiptNo && (
              <strong style={{ color:theme.colors.gold, fontSize:11, whiteSpace:"nowrap" }}>
                {payment.receiptNo}
              </strong>
            )}
          </div>
          {(isPrevious || isSharedReceiptPayment || extraDetails || payment.note) && (
            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginTop:3, lineHeight:1.35 }}>
              {isPrevious && (
                <span style={{
                  display:"inline-flex",
                  alignItems:"center",
                  padding:"1px 7px",
                  borderRadius:999,
                  background:"rgba(245,158,11,.11)",
                  border:"1px solid rgba(245,158,11,.22)",
                  color:theme.colors.warning,
                  fontSize:10,
                  fontWeight:800,
                  whiteSpace:"nowrap",
                }}>
                  {previousPaymentLabel}
                </span>
              )}
              {isSharedReceiptPayment && (
                <span style={{
                  display:"inline-flex",
                  alignItems:"center",
                  padding:"1px 7px",
                  borderRadius:999,
                  background:"rgba(212,175,55,.11)",
                  border:"1px solid rgba(212,175,55,.22)",
                  color:theme.colors.gold,
                  fontSize:10,
                  fontWeight:800,
                  whiteSpace:"nowrap",
                }}>
                  {sharedReceiptLabel}
                </span>
              )}
              {extraDetails && <span style={{ fontSize:10.8, color:theme.colors.grey }}>{extraDetails}</span>}
              {payment.note && <span style={{ fontSize:10.8, color:theme.colors.grey }}>{payment.note}</span>}
            </div>
          )}
        </div>
      </div>
      {(hov || showActionsAlways || (isSharedReceiptPayment && canPrint)) && (
        <div style={{ display:"flex", gap:5, flexShrink:0 }}>
          {canPrint && (isSharedReceiptPayment || !isPrevious) && (
            <button
              onClick={onPrint}
              disabled={sharedReceiptLoading}
              title={isSharedReceiptPayment ? printSharedReceiptLabel : undefined}
              aria-label={isSharedReceiptPayment ? printSharedReceiptLabel : undefined}
              style={{ background:"rgba(212,175,55,.1)",
              border:"1px solid rgba(212,175,55,.2)", color:theme.colors.gold,
              borderRadius:8, padding:"3px 8px", fontSize:11,
              cursor:sharedReceiptLoading ? "wait" : "pointer", fontFamily:"'Cairo',sans-serif", opacity:sharedReceiptLoading ? 0.65 : 1 }}
            >
              <AppIcon name="print" size={13} color={theme.colors.gold} />
            </button>
          )}
          {(hov || showActionsAlways) && (
            <button onClick={onDelete} style={{ background:"rgba(239,68,68,.1)",
              border:"1px solid rgba(239,68,68,.2)", color:"#ef4444",
              borderRadius:8, padding:"3px 8px", fontSize:11,
              cursor:"pointer", fontFamily:"'Cairo',sans-serif" }}>{t.delete}</button>
          )}
        </div>
      )}
    </div>
  );
}
