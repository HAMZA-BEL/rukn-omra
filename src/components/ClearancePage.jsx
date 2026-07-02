import React from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { StatusBadge, GlassCard, SearchBar, Button, Modal, Select } from "./UI";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { printClearancePDF } from "../utils/exportPdf";
import { printInvoice, printProformaInvoice, printInvoiceSnapshot, previewInvoiceSnapshot, InvoiceRecipientModal } from "./PrintTemplates";
import { AppIcon } from "./Icon";
import { getClientDisplayName } from "../utils/clientNames";
import { formatCurrency } from "../utils/currency";
import { getLocalizedAgencyName } from "../utils/agencyDisplay";
import {
  getClientEffectiveOfficialPrice,
  getClientEffectiveSalePrice,
  getClientRemainingAmount,
} from "../utils/clientPricing";
import { getClientServiceType } from "../utils/clientServiceTypes";
import {
  getProgramServiceCostingReferenceCost,
  getProgramStandaloneServiceSalePrice,
} from "./programs/programCosting";
import {
  buildSearchText,
  normalizeSearchText,
} from "../utils/searchUtils";
import {
  deleteSavedInvoiceSnapshot,
  downloadInvoiceWordDocument,
  downloadInvoiceWordSnapshot,
  readSavedInvoices,
  restoreSavedInvoiceSnapshot,
  trashSavedInvoiceSnapshot,
} from "../utils/invoices";
import {
  CONTRACT_TRAVEL_CONTEXT_SOURCES,
  buildTravelGroupById,
  getClientTravelGroupId,
  resolveClientTravelContext,
} from "../features/contracts/utils/contractTravelContext";

const tc = theme.colors;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REF_KEYS = [
  "fileRef", "file_ref",
  "fileId", "file_id",
  "fileNumber", "file_number",
  "fileNo", "file_no",
  "ref", "reference",
  "dossier", "dossierNo", "dossier_no",
  "caseNumber", "case_number",
  "folderNumber", "folder_number",
];
const TEXT_CLAMP_STYLE = { overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" };

const formatFileReference = (client = {}) => {
  for (const key of REF_KEYS) {
    const value = client?.[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  const ticket = typeof client?.ticketNo === "string"
    ? client.ticketNo.trim()
    : typeof client?.ticket_no === "string"
      ? client.ticket_no.trim()
      : "";
  if (ticket) return ticket;
  const fallback = typeof client?.id === "string" ? client.id.trim() : "";
  if (!fallback) return "—";
  if (UUID_REGEX.test(fallback)) {
    const start = fallback.slice(0, 4).toUpperCase();
    const end   = fallback.slice(-4).toUpperCase();
    return `#${start}-${end}`;
  }
  return fallback;
};

const CLEARANCE_PROGRAM_STORAGE_KEY = "rukn-clearance-selected-program";

const normalizeText = normalizeSearchText;

const joinNormalizedValues = (...values) => values
  .flat()
  .filter((value) => value !== null && value !== undefined && String(value).trim())
  .map(normalizeText)
  .join(" ");

const getPaymentMethodText = (payment = {}) => joinNormalizedValues(
  payment.method,
  payment.paymentMethod,
  payment.payment_method,
  payment.paidByMethod,
  payment.paid_by_method
);

const normalizePaymentMethod = (value = "") => {
  const method = typeof value === "object" && value !== null
    ? getPaymentMethodText(value)
    : normalizeText(value);
  if (!method) return "";
  if (method.includes("شيك") || method.includes("chèque") || method.includes("cheque") || method.includes("check")) return "cheque";
  if (method.includes("إيداع") || method.includes("ايداع") || method.includes("dépôt") || method.includes("depot") || method.includes("deposit")) return "bank_deposit";
  if (method === "bank" || method.includes("تحويل") || method.includes("virement") || method.includes("transfer")) return "bank_transfer";
  if (method.includes("نقد") || method.includes("espèces") || method.includes("especes") || method.includes("cash")) return "cash";
  return method;
};

const getPaymentReferenceText = (payment = {}) => joinNormalizedValues(
  payment.chequeNumber,
  payment.cheque_number,
  payment.checkNumber,
  payment.check_number,
  payment.reference,
  payment.paymentReference,
  payment.payment_reference,
  payment.receiptNo,
  payment.receipt_no,
  payment.receiptNumber,
  payment.receipt_number,
  payment.ref,
  payment.note,
  payment.notes
);

const getPaymentPayerText = (payment = {}) => joinNormalizedValues(
  payment.paidBy,
  payment.paid_by,
  payment.payerName,
  payment.payer_name,
  payment.depositorName,
  payment.depositor_name,
  payment.transferName,
  payment.transfer_name,
  payment.reference,
  payment.paymentReference,
  payment.payment_reference,
  payment.ref,
  payment.note,
  payment.notes
);

const getPaymentContextSearchPlaceholder = (method, lang = "ar", t = {}) => {
  if (method === "cheque") {
    return t.chequeSearchPlaceholder || (lang === "fr" ? "Rechercher par numéro de chèque" : lang === "en" ? "Search by cheque number" : "ابحث برقم الشيك");
  }
  if (method === "bank_transfer") {
    return t.transferNameSearchPlaceholder || (lang === "fr" ? "Rechercher par nom du virement" : lang === "en" ? "Search by transfer name" : "ابحث باسم المحوّل");
  }
  if (method === "bank_deposit") {
    return t.depositorNameSearchPlaceholder || (lang === "fr" ? "Rechercher par nom du déposant" : lang === "en" ? "Search by depositor name" : "ابحث باسم المودِع");
  }
  return "";
};

const joinFilterLabel = (label, value) => `${label}: ${value}`;
const shortFilterLabel = (fullLabel, fallbackLabel) => {
  const parts = String(fullLabel || "").split(":");
  const value = parts.length > 1 ? parts.slice(1).join(":").trim() : "";
  return value || fallbackLabel || fullLabel || "";
};

const getStatusFilterOptions = (t = {}) => {
  const statusLabel = t.statusFilterLabel || t.status;
  const allLabel = t.statusFilterAll || joinFilterLabel(statusLabel, t.all);
  const paidLabel = t.statusFilterPaid || joinFilterLabel(statusLabel, t.clearedFilter);
  const partialLabel = t.statusFilterPartial || joinFilterLabel(statusLabel, t.partialFilter);
  const unpaidLabel = t.statusFilterUnpaid || joinFilterLabel(statusLabel, t.unpaidFilter);
  return [
    { key: "all", buttonLabel: allLabel, label: shortFilterLabel(allLabel, t.all) },
    { key: "cleared", buttonLabel: paidLabel, label: shortFilterLabel(paidLabel, t.clearedFilter) },
    { key: "partial", buttonLabel: partialLabel, label: shortFilterLabel(partialLabel, t.partialFilter) },
    { key: "unpaid", buttonLabel: unpaidLabel, label: shortFilterLabel(unpaidLabel, t.unpaidFilter) },
  ];
};

const getPaymentMethodOptions = (t = {}) => {
  const paymentLabel = t.paymentFilterLabel || t.paymentMethodFilter || t.paymentMethodLabel;
  const methods = Array.isArray(t.paymentMethods) ? t.paymentMethods : [];
  const allLabel = t.paymentFilterAll || joinFilterLabel(paymentLabel, t.all);
  const cashLabel = t.paymentFilterCash || joinFilterLabel(paymentLabel, methods[0]);
  const bankTransferLabel = t.paymentFilterBankTransfer || joinFilterLabel(paymentLabel, methods[1]);
  const chequeLabel = t.paymentFilterCheque || joinFilterLabel(paymentLabel, methods[2]);
  const bankDepositLabel = t.paymentFilterBankDeposit || joinFilterLabel(paymentLabel, methods[3]);
  return [
    { key: "all", buttonLabel: allLabel, label: shortFilterLabel(allLabel, t.all) },
    { key: "cash", buttonLabel: cashLabel, label: shortFilterLabel(cashLabel, methods[0]) },
    { key: "bank_transfer", buttonLabel: bankTransferLabel, label: shortFilterLabel(bankTransferLabel, methods[1]) },
    { key: "cheque", buttonLabel: chequeLabel, label: shortFilterLabel(chequeLabel, methods[2]) },
    { key: "bank_deposit", buttonLabel: bankDepositLabel, label: shortFilterLabel(bankDepositLabel, methods[3]) },
  ];
};

function CompactFilterDropdown({
  options,
  value,
  onChange,
  open,
  setOpen,
  containerRef,
  title,
  basis = 180,
}) {
  const activeOption = options.find((option) => option.key === value) || options[0];
  const buttonLabel = activeOption.buttonLabel || activeOption.label;
  const isActive = value !== "all";
  return (
    <div
      ref={containerRef}
      className="clearance-filter-dropdown"
      style={{
        position: "relative",
        flex: `0 1 ${basis}px`,
        width: "auto",
        maxWidth: "100%",
        zIndex: open ? 80 : 1,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={title || buttonLabel}
        style={{
          width: "100%",
          height: 42,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          border: "1px solid var(--rukn-border-soft)",
          borderRadius: 12,
          background: isActive ? "var(--rukn-gold-dim)" : "var(--rukn-bg-input)",
          color: isActive ? "var(--rukn-gold)" : "var(--rukn-text-muted)",
          padding: "0 11px",
          fontSize: 12,
          fontWeight: 800,
          fontFamily: "'Cairo',sans-serif",
          cursor: "pointer",
          boxSizing: "border-box",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }}>
          <AppIcon name="filter" size={14} color="currentColor" style={{ flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {buttonLabel}
          </span>
        </span>
        <ChevronDown
          size={14}
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .18s ease" }}
        />
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 7px)",
            insetInlineStart: 0,
            width: "max-content",
            minWidth: "100%",
            maxWidth: "min(260px, calc(100vw - 32px))",
            zIndex: 80,
            padding: 6,
            borderRadius: 12,
            border: "1px solid var(--rukn-menu-border, var(--rukn-border-soft))",
            background: "var(--rukn-menu-bg, var(--rukn-bg-card))",
            boxShadow: "var(--rukn-menu-shadow, 0 18px 40px rgba(0,0,0,.28))",
          }}
        >
          {options.map((option) => {
            const active = value === option.key;
            return (
              <button
                key={option.key}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option.key);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  border: 0,
                  borderRadius: 9,
                  background: active ? "var(--rukn-gold-dim)" : "transparent",
                  color: active ? "var(--rukn-gold)" : "var(--rukn-text)",
                  padding: "8px 9px",
                  fontSize: 12,
                  fontWeight: active ? 800 : 600,
                  cursor: "pointer",
                  fontFamily: "'Cairo',sans-serif",
                  textAlign: "start",
                  whiteSpace: "nowrap",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const getProgramDateValue = (program = {}) => {
  const raw = program.departure || program.startDate || program.date || program.departureDate || "";
  const time = raw ? new Date(raw).getTime() : NaN;
  return Number.isFinite(time) ? time : null;
};

const getProgramYear = (program = {}) => {
  const raw = String(program.departure || program.startDate || program.date || program.departureDate || "").trim();
  const direct = raw.match(/^(\d{4})/);
  if (direct) return direct[1];
  const time = getProgramDateValue(program);
  return time !== null ? String(new Date(time).getFullYear()) : "";
};

const pickDefaultProgramId = (programs = []) => {
  if (!programs.length) return "";
  const now = Date.now();
  const withDates = programs
    .map((program) => ({ program, time: getProgramDateValue(program) }))
    .filter((item) => item.time !== null);
  const upcoming = withDates
    .filter((item) => item.time >= now)
    .sort((a, b) => a.time - b.time)[0];
  if (upcoming) return upcoming.program.id;
  const latest = withDates.sort((a, b) => b.time - a.time)[0];
  return latest?.program?.id || programs[0]?.id || "";
};

const isActiveClearanceProgram = (program = {}) => (
  Boolean(program?.id)
  && program.deleted !== true
  && !program.deletedAt
  && !program.deleted_at
  && program.archived !== true
  && !program.archivedAt
  && !program.archived_at
  && String(program.status || "active").trim().toLowerCase() !== "archived"
);

const getLocalizedClearanceLabels = (lang) => {
  if (lang === "fr") {
    return {
      program: "Programme",
      pageSize: "Lignes",
      exportExcel: "Exporter Excel",
      selectProgram: "Sélectionnez un programme",
      emptyProgram: "Aucun client dans ce programme",
      reportTitle: "État de règlement",
      exportDate: "Date d'export",
      currency: "Devise",
      clientCount: "Nombre de clients",
      period: "Période",
      departure: "Départ",
      returnDate: "Retour",
      summary: "Résumé financier",
      totalSale: "Total ventes",
      totalPaid: "Total payé",
      totalRemaining: "Reste à payer",
      totalDiscount: "Remises",
      fullyPaid: "Soldés",
      partialPaid: "Partiels",
      unpaid: "Non payés",
      index: "#",
      fileRef: "Référence",
      name: "Nom",
      phone: "Téléphone",
      package: "Niveau",
      roomType: "Type chambre",
      salePrice: "Prix vente",
      paidAmount: "Montant payé",
      remainingAmount: "Reste",
      discount: "Remise",
      status: "Statut",
      lastPaymentDate: "Dernier paiement",
      receiptNumber: "Reçu",
      notes: "Notes",
      total: "Total",
      paid: "Soldé",
      partial: "Partiel",
      unpaidStatus: "Non payé",
      allStatuses: "Tous",
    };
  }
  if (lang === "en") {
    return {
      program: "Program",
      pageSize: "Rows",
      exportExcel: "Export Excel",
      selectProgram: "Select a program",
      emptyProgram: "No clients in this program",
      reportTitle: "Clearance Report",
      exportDate: "Export date",
      currency: "Currency",
      clientCount: "Number of clients",
      period: "Period",
      departure: "Departure",
      returnDate: "Return",
      summary: "Financial summary",
      totalSale: "Total sale",
      totalPaid: "Total paid",
      totalRemaining: "Total remaining",
      totalDiscount: "Total discount",
      fullyPaid: "Paid",
      partialPaid: "Partial",
      unpaid: "Unpaid",
      index: "#",
      fileRef: "Reference",
      name: "Name",
      phone: "Phone",
      package: "Package",
      roomType: "Room type",
      salePrice: "Sale price",
      paidAmount: "Paid amount",
      remainingAmount: "Remaining",
      discount: "Discount",
      status: "Status",
      lastPaymentDate: "Last payment",
      receiptNumber: "Receipt",
      notes: "Notes",
      total: "Total",
      paid: "Paid",
      partial: "Partial",
      unpaidStatus: "Unpaid",
      allStatuses: "All",
    };
  }
  return {
    program: "البرنامج",
    pageSize: "عدد الصفوف",
    exportExcel: "تصدير Excel",
    selectProgram: "اختر برنامجًا",
    emptyProgram: "لا يوجد معتمرون في هذا البرنامج",
    reportTitle: "كشف التصفية",
    exportDate: "تاريخ التصدير",
    currency: "العملة",
    clientCount: "عدد المعتمرين",
    period: "الفترة",
    departure: "الذهاب",
    returnDate: "العودة",
    summary: "الملخص المالي",
    totalSale: "إجمالي البيع",
    totalPaid: "إجمالي المدفوع",
    totalRemaining: "إجمالي المتبقي",
    totalDiscount: "إجمالي الخصم",
    fullyPaid: "مصفّون",
    partialPaid: "دفع جزئي",
    unpaid: "لم يدفعوا",
    index: "#",
    fileRef: "رقم الملف",
    name: "الاسم",
    phone: "الهاتف",
    package: "المستوى",
    roomType: "نوع الغرفة",
    salePrice: "سعر البيع",
    paidAmount: "المدفوع",
    remainingAmount: "المتبقي",
    discount: "الخصم",
    status: "الحالة",
    lastPaymentDate: "آخر دفعة",
    receiptNumber: "رقم الوصل",
    notes: "ملاحظات",
    total: "المجموع",
    paid: "مصفّى",
    partial: "دفع جزئي",
    unpaidStatus: "لم يدفع",
    allStatuses: "الكل",
  };
};

const sanitizeFileName = (value = "") => {
  const safe = String(value)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);
  return safe || "program";
};

const getClientPackageLabel = (client = {}) => (
  client.packageLevel || client.hotelLevel || client.packageName || client.levelName || client.level || "—"
);

const getClientNotes = (client = {}) => client.note || client.notes || client.remark || client.remarks || "";

const getStatusLabel = (status, labels) => {
  if (status === "cleared") return labels.paid;
  if (status === "partial") return labels.partial;
  return labels.unpaidStatus;
};

const formatClearanceDate = (value = "") => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return raw || "—";
};

const invoiceTabText = (lang) => {
  if (lang === "fr") {
    return {
      clearance: "Règlement",
      invoices: "Factures",
      title: "Factures finales",
      subtitle: "Factures officielles émises uniquement",
      year: "Année",
      program: "Programme",
      all: "Tous",
      search: "Rechercher par client ou numéro de facture",
      empty: "Aucune facture finale enregistrée",
      issued: "Émise",
      trashed: "Corbeille",
      client: "Client",
      company: "Société",
      preview: "Voir",
      reprint: "Réimprimer",
      downloadWord: "Télécharger Word",
      trash: "Supprimer",
      restore: "Restaurer",
      deletePermanent: "Supprimer définitivement",
      warningTitle: "Avertissement important",
      warningBody: "Vous êtes sur le point de supprimer définitivement une facture finale officielle. Elle sera supprimée du registre local des factures enregistrées et ne s'affichera plus.",
      confirmDelete: "Oui, supprimer définitivement",
      cancel: "Annuler",
      invoiceNumber: "N° facture",
      date: "Date",
      amount: "Montant",
      status: "Statut",
      recipient: "Bénéficiaire",
      ice: "ICE",
    };
  }
  if (lang === "en") {
    return {
      clearance: "Clearance",
      invoices: "Invoices",
      title: "Final invoices",
      subtitle: "Official issued invoices only",
      year: "Year",
      program: "Program",
      all: "All",
      search: "Search by pilgrim name or invoice number",
      empty: "No saved final invoices",
      issued: "Issued",
      trashed: "Trash",
      client: "Pilgrim",
      company: "Company",
      preview: "View",
      reprint: "Reprint",
      downloadWord: "Download Word",
      trash: "Delete",
      restore: "Restore",
      deletePermanent: "Delete permanently",
      warningTitle: "Important warning",
      warningBody: "You are about to permanently delete an official final invoice. It will be removed from the local saved invoice list and will not appear again.",
      confirmDelete: "Yes, delete permanently",
      cancel: "Cancel",
      invoiceNumber: "Invoice no.",
      date: "Date",
      amount: "Amount",
      status: "Status",
      recipient: "Beneficiary",
      ice: "ICE",
    };
  }
  return {
    clearance: "التصفية",
    invoices: "الفواتير",
    title: "الفواتير النهائية",
    subtitle: "الفواتير الرسمية الصادرة فقط",
    year: "السنة",
    program: "البرنامج",
    all: "الكل",
    search: "ابحث باسم المعتمر أو رقم الفاتورة",
    empty: "لا توجد فواتير نهائية محفوظة",
    issued: "صادرة",
    trashed: "في سلة المحذوفات",
    client: "معتمر",
    company: "شركة",
    preview: "عرض / معاينة",
    reprint: "إعادة طباعة",
    downloadWord: "تحميل Word",
    trash: "حذف",
    restore: "استعادة",
    deletePermanent: "حذف نهائي",
    warningTitle: "تحذير مهم",
    warningBody: "أنت على وشك حذف فاتورة نهائية رسميًا. سيتم حذف هذه الفاتورة من السجل المحلي للفواتير المحفوظة ولن تظهر مجددًا.",
    confirmDelete: "نعم، حذف نهائيًا",
    cancel: "إلغاء",
    invoiceNumber: "رقم الفاتورة",
    date: "التاريخ",
    amount: "المبلغ",
    status: "الحالة",
    recipient: "المستفيد",
    ice: "ICE",
  };
};

export default function ClearancePage({ store, focus = null, onToast = null }) {
  const { t, lang, dir } = useLang();
  const isRTL = dir === "rtl";
  const {
    clients,
    programs,
    programTravelGroups = [],
    getProgramTravelGroups,
    loadProgramTravelGroups,
    getClientStatus,
    getClientPayments,
    getClientTotalPaid,
    getClientLastPayment,
    agency,
    invoiceApi,
  } = store;
  const invoicesAreRemote = Boolean(invoiceApi?.isRemote);
  const clientsReady = !store.isSupabaseEnabled || store.clientsLoaded;
  const paymentsReady = !store.isSupabaseEnabled || store.paymentsLoaded;
  const clearanceDataReady = clientsReady && paymentsReady;
  const [filter, setFilter] = React.useState("all");
  const [statusFilterOpen, setStatusFilterOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 200);
  const [paymentMethodFilter, setPaymentMethodFilter] = React.useState("all");
  const [paymentMethodOpen, setPaymentMethodOpen] = React.useState(false);
  const [paymentContextSearch, setPaymentContextSearch] = React.useState("");
  const debouncedPaymentContextSearch = useDebouncedValue(paymentContextSearch, 200);
  const [selectedProgramId, setSelectedProgramId] = React.useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(CLEARANCE_PROGRAM_STORAGE_KEY) || "";
  });
  const [pageSize, setPageSize] = React.useState(10);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [invoiceClient, setInvoiceClient] = React.useState(null);
  const [invoiceAction, setInvoiceAction] = React.useState("print");
  const [activeTab, setActiveTab] = React.useState("clearance");
  const [savedInvoices, setSavedInvoices] = React.useState(() => (
    invoicesAreRemote ? [] : readSavedInvoices()
  ));
  const statusFilterRef = React.useRef(null);
  const paymentMethodRef = React.useRef(null);
  const clearanceHydrationRequestedRef = React.useRef(false);
  const invoiceTravelGroupsLoadPromisesRef = React.useRef(new Map());
  const invoiceFocusTokenRef = React.useRef(null);
  const labels = React.useMemo(() => getLocalizedClearanceLabels(lang), [lang]);
  const invoiceLabels = React.useMemo(() => invoiceTabText(lang), [lang]);
  const activeClearancePrograms = React.useMemo(
    () => programs.filter(isActiveClearanceProgram),
    [programs]
  );
  const finalInvoiceLabel = t.printInvoice || (lang === "fr" ? "Imprimer facture" : lang === "en" ? "Print Invoice" : "طباعة الفاتورة");
  const proformaInvoiceLabel = lang === "fr" ? "Imprimer proforma" : lang === "en" ? "Print Proforma" : "طباعة فاتورة أولية";
  const invoiceColumnLabel = lang === "fr" ? "Facture" : lang === "en" ? "Invoice" : "الفاتورة";
  const isInvoiceClientSettled = React.useCallback((client = {}) => (
    Number(client?.salePrice || 0) > 0 && Number(client?.remaining || 0) <= 0
  ), []);
  const invoiceActionLabels = React.useMemo(() => ({
    print: lang === "fr" ? "Imprimer" : lang === "en" ? "Print" : "طباعة",
    downloadWord: lang === "fr" ? "Télécharger Word" : lang === "en" ? "Download Word" : "تحميل Word",
    menu: lang === "fr" ? "Actions facture" : lang === "en" ? "Invoice actions" : "إجراءات الفاتورة",
  }), [lang]);
  const getInvoiceActionLabel = React.useCallback(
    (client) => (isInvoiceClientSettled(client) ? finalInvoiceLabel : proformaInvoiceLabel),
    [finalInvoiceLabel, isInvoiceClientSettled, proformaInvoiceLabel]
  );
  const tableColumns = "minmax(0,1.05fr) minmax(0,1.6fr) minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,1.1fr) minmax(0,1.1fr)";
  const money = React.useCallback((value) => formatCurrency(value, lang), [lang]);
  const refreshSavedInvoices = React.useCallback(async () => {
    if (invoicesAreRemote) {
      const { data, error } = await invoiceApi.fetchFinalInvoices();
      if (!error) setSavedInvoices(data || []);
      return data || [];
    }
    const localInvoices = readSavedInvoices();
    setSavedInvoices(localInvoices);
    return localInvoices;
  }, [invoiceApi, invoicesAreRemote]);

  React.useEffect(() => {
    if (!store.isSupabaseEnabled) return;
    if (clientsReady && paymentsReady) return;
    if (clearanceHydrationRequestedRef.current) return;
    clearanceHydrationRequestedRef.current = true;
    if (!clientsReady && !store.clientsLoading) store.ensureClientsLoaded?.();
    if (!paymentsReady && !store.paymentsLoading) store.ensurePaymentsLoaded?.();
  }, [
    clientsReady,
    paymentsReady,
    store.isSupabaseEnabled,
    store.clientsLoading,
    store.paymentsLoading,
    store.ensureClientsLoaded,
    store.ensurePaymentsLoaded,
  ]);

  React.useEffect(() => {
    if (activeTab === "invoices") refreshSavedInvoices();
  }, [activeTab, refreshSavedInvoices]);

  React.useEffect(() => {
    if (focus?.type !== "invoice" || !focus.token || invoiceFocusTokenRef.current === focus.token) return;
    invoiceFocusTokenRef.current = focus.token;
    setActiveTab("invoices");
    refreshSavedInvoices({ force: true });
  }, [focus, refreshSavedInvoices]);

  React.useEffect(() => {
    if (!activeClearancePrograms.length) {
      if (selectedProgramId) setSelectedProgramId("");
      return;
    }
    const hasSelected = selectedProgramId && activeClearancePrograms.some((program) => program.id === selectedProgramId);
    if (hasSelected) return;
    const saved = typeof window !== "undefined"
      ? localStorage.getItem(CLEARANCE_PROGRAM_STORAGE_KEY)
      : "";
    const next = saved && activeClearancePrograms.some((program) => program.id === saved)
      ? saved
      : pickDefaultProgramId(activeClearancePrograms);
    setSelectedProgramId(next);
  }, [activeClearancePrograms, selectedProgramId]);

  React.useEffect(() => {
    if (!selectedProgramId || typeof window === "undefined") return;
    localStorage.setItem(CLEARANCE_PROGRAM_STORAGE_KEY, selectedProgramId);
  }, [selectedProgramId]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedProgramId, filter, debouncedSearch, paymentMethodFilter, debouncedPaymentContextSearch, pageSize]);

  React.useEffect(() => {
    setPaymentContextSearch("");
  }, [paymentMethodFilter]);

  React.useEffect(() => {
    if (!statusFilterOpen && !paymentMethodOpen) return undefined;
    const handlePointerDown = (event) => {
      if (statusFilterOpen && !statusFilterRef.current?.contains(event.target)) setStatusFilterOpen(false);
      if (paymentMethodOpen && !paymentMethodRef.current?.contains(event.target)) setPaymentMethodOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setStatusFilterOpen(false);
        setPaymentMethodOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [paymentMethodOpen, statusFilterOpen]);

  const selectedProgram = React.useMemo(
    () => activeClearancePrograms.find((program) => program.id === selectedProgramId) || null,
    [activeClearancePrograms, selectedProgramId]
  );

  const selectedProgramClients = React.useMemo(
    () => selectedProgramId ? clients.filter((client) => client.programId === selectedProgramId) : [],
    [clients, selectedProgramId]
  );
  const getInvoiceSourceClient = React.useCallback((client = {}) => {
    const clientId = String(client?.id || "").trim();
    if (!clientId) return client || {};
    const sourceClient = clients.find((item) => String(item?.id || "").trim() === clientId);
    if (!sourceClient) return client || {};
    const sourceTravelGroupId = sourceClient.travelGroupId ?? sourceClient.travel_group_id;
    return {
      ...sourceClient,
      ...client,
      travelGroupId: sourceTravelGroupId ?? client.travelGroupId,
      travel_group_id: sourceClient.travel_group_id ?? sourceClient.travelGroupId ?? client.travel_group_id,
    };
  }, [clients]);
  const getStoredInvoiceProgramTravelGroups = React.useCallback((programId) => {
    const targetProgramId = String(programId || "").trim();
    if (!targetProgramId) return [];
    if (typeof getProgramTravelGroups === "function") {
      return getProgramTravelGroups(targetProgramId) || [];
    }
    return programTravelGroups.filter((group) => (
      String(group?.programId || group?.program_id || "").trim() === targetProgramId
    ));
  }, [getProgramTravelGroups, programTravelGroups]);
  const loadInvoiceProgramTravelGroups = React.useCallback(async (programId) => {
    const targetProgramId = String(programId || "").trim();
    if (!targetProgramId) return [];
    const storedGroups = getStoredInvoiceProgramTravelGroups(targetProgramId);
    if (storedGroups.length || typeof loadProgramTravelGroups !== "function") return storedGroups;

    let loadPromise = invoiceTravelGroupsLoadPromisesRef.current.get(targetProgramId);
    if (!loadPromise) {
      loadPromise = Promise.resolve(loadProgramTravelGroups(targetProgramId));
      invoiceTravelGroupsLoadPromisesRef.current.set(targetProgramId, loadPromise);
    }

    const result = await loadPromise.catch((error) => {
      console.warn("[Clearance] Unable to load invoice travel groups:", error);
      invoiceTravelGroupsLoadPromisesRef.current.delete(targetProgramId);
      return { data: [], error };
    });
    if (Array.isArray(result?.data)) return result.data;
    return getStoredInvoiceProgramTravelGroups(targetProgramId);
  }, [getStoredInvoiceProgramTravelGroups, loadProgramTravelGroups]);
  const resolveInvoiceDocumentTravelContext = React.useCallback(async (client = {}, program = {}) => {
    const sourceClient = getInvoiceSourceClient(client);
    const clientTravelGroupId = getClientTravelGroupId(sourceClient);
    const programId = program?.id || sourceClient.programId || sourceClient.program_id || client.programId || client.program_id;
    const travelGroups = clientTravelGroupId
      ? await loadInvoiceProgramTravelGroups(programId)
      : [];
    const travelGroupById = buildTravelGroupById(travelGroups);
    const travelContext = resolveClientTravelContext(sourceClient, program, travelGroupById);
    return {
      client: sourceClient,
      program: travelContext.program || program,
      travelContext,
    };
  }, [getInvoiceSourceClient, loadInvoiceProgramTravelGroups]);
  const statusFilterOptions = React.useMemo(() => getStatusFilterOptions(t), [t]);
  const activeStatusFilterOption = statusFilterOptions.find((option) => option.key === filter) || statusFilterOptions[0];
  const paymentMethodOptions = React.useMemo(() => getPaymentMethodOptions(t), [t]);
  const activePaymentMethodOption = paymentMethodOptions.find((option) => option.key === paymentMethodFilter) || paymentMethodOptions[0];

  const programData = React.useMemo(() => selectedProgramClients.map(c => {
    const prog      = selectedProgram || programs.find(p => p.id === c.programId);
    const paid      = getClientTotalPaid(c.id);
    const serviceType = getClientServiceType(c);
    const pricingOptions = {
      program: prog,
      referencePrice: getProgramServiceCostingReferenceCost(prog, serviceType),
      standaloneSalePrice: getProgramStandaloneServiceSalePrice(prog, serviceType),
    };
    const salePrice = getClientEffectiveSalePrice(c, pricingOptions);
    const officialPrice = getClientEffectiveOfficialPrice(c, pricingOptions) || salePrice;
    const remaining = getClientRemainingAmount(c, paid, pricingOptions);
    const discount  = Math.max(0, officialPrice - salePrice);
    const status    = getClientStatus(c);
    const lastPmt   = getClientLastPayment(c.id);
    const displayRef = formatFileReference(c);
    const displayName = getClientDisplayName(c, "—", lang);
    const clientPayments = getClientPayments(c.id);
    return { ...c, displayName, prog, paid, salePrice, officialPrice, remaining, discount, status, lastPmt, displayRef, clientPayments };
  }), [selectedProgramClients, selectedProgram, programs, lang, getClientStatus, getClientPayments, getClientTotalPaid, getClientLastPayment]);

  const data = React.useMemo(() => programData.filter(c => {
    const ok1 = filter === "all" || c.status === filter;
    const q = normalizeSearchText(debouncedSearch);
    const searchText = buildSearchText(c.displayName || c.name, c.id, c.displayRef);
    const ok2 = !q
      || searchText.includes(q);
    const methodMatches = paymentMethodFilter === "all"
      || c.clientPayments.some((payment) => normalizePaymentMethod(payment) === paymentMethodFilter);
    const contextQuery = normalizeText(debouncedPaymentContextSearch);
    const hasContextSearch = ["cheque", "bank_transfer", "bank_deposit"].includes(paymentMethodFilter);
    const contextMatches = !hasContextSearch || !contextQuery
      || c.clientPayments.some((payment) => (
        normalizePaymentMethod(payment) === paymentMethodFilter
        && (
          paymentMethodFilter === "cheque"
            ? getPaymentReferenceText(payment).includes(contextQuery)
            : getPaymentPayerText(payment).includes(contextQuery)
        )
      ));
    return ok1 && ok2 && methodMatches && contextMatches;
  }), [debouncedPaymentContextSearch, debouncedSearch, programData, filter, paymentMethodFilter]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const pageData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);

  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const totals = React.useMemo(() => ({
    rev:  programData.reduce((s,c)=>s+c.salePrice,0),
    paid: programData.reduce((s,c)=>s+c.paid,0),
    rem:  programData.reduce((s,c)=>s+c.remaining,0),
    disc: programData.reduce((s,c)=>s+c.discount,0),
  }), [programData]);

  const tableTotals = React.useMemo(() => ({
    rev:  data.reduce((s,c)=>s+c.salePrice,0),
    paid: data.reduce((s,c)=>s+c.paid,0),
    rem:  data.reduce((s,c)=>s+c.remaining,0),
    disc: data.reduce((s,c)=>s+c.discount,0),
  }), [data]);

  const statusCounts = React.useMemo(() => ({
    cleared: programData.filter((c) => c.status === "cleared").length,
    partial: programData.filter((c) => c.status === "partial").length,
    unpaid: programData.filter((c) => c.status === "unpaid").length,
  }), [programData]);

  const FILTER_LABELS = {
    all:     t.all     || (lang === "fr" ? "Tous" : "الكل"),
    cleared: t.clearedFilter || (lang === "fr" ? "Soldés"  : "المصفّون"),
    partial: t.partialFilter || (lang === "fr" ? "Partiel" : "الجزئي"),
    unpaid:  t.unpaidFilter  || (lang === "fr" ? "Non payé": "لم يدفعوا"),
  };

  const handleInvoiceAction = React.useCallback((client, action = "print") => {
    if (!client) return;
    setInvoiceAction(action);
    setInvoiceClient(client);
  }, []);

  const handlePrintSelectedInvoice = React.useCallback(async (recipient) => {
    if (!invoiceClient) return false;
    const program = invoiceClient.prog || programs.find(p => p.id === invoiceClient.programId);
    const clientPayments = invoiceClient.clientPayments || getClientPayments(invoiceClient.id);
    const invoiceDocumentContext = await resolveInvoiceDocumentTravelContext(invoiceClient, program);
    const invoiceDocumentClient = invoiceDocumentContext.client;
    const invoiceDocumentProgram = invoiceDocumentContext.program;
    const showStaleTravelGroupWarning = (generated) => {
      if (
        generated
        && (
          invoiceDocumentContext.travelContext.source === CONTRACT_TRAVEL_CONTEXT_SOURCES.STALE_TRAVEL_GROUP
          || invoiceDocumentContext.travelContext.warnings?.length
        )
      ) {
        onToast?.(
          lang === "fr"
            ? "La facture a été créée avec les données du programme principal car le groupe de voyage lié à ce client n’existe plus."
            : lang === "en"
              ? "The invoice was created with the main program data because this client’s linked travel group no longer exists."
              : "تم إنشاء الفاتورة ببيانات البرنامج الأساسي لأن فوج السفر المرتبط بهذا العميل لم يعد موجودا.",
          "warning"
        );
      }
    };
    if (invoiceAction === "word") {
      const downloaded = downloadInvoiceWordDocument({
        client: invoiceDocumentClient,
        program: invoiceDocumentProgram,
        payments: clientPayments,
        recipient,
        lang,
        documentType: isInvoiceClientSettled(invoiceClient) ? "invoice" : "proforma",
      });
      showStaleTravelGroupWarning(downloaded);
      return downloaded;
    }
    const invoiceSettled = isInvoiceClientSettled(invoiceClient);
    const printFn = invoiceSettled ? printInvoice : printProformaInvoice;
    const printed = await printFn({
      client: invoiceDocumentClient,
      program: invoiceDocumentProgram,
      payments: clientPayments,
      agency,
      lang,
      recipient,
      invoiceApi: invoiceSettled ? invoiceApi : null,
    });
    showStaleTravelGroupWarning(printed);
    if (printed && invoiceSettled) await refreshSavedInvoices();
    return printed;
  }, [agency, getClientPayments, invoiceAction, invoiceApi, invoiceClient, isInvoiceClientSettled, lang, onToast, programs, refreshSavedInvoices, resolveInvoiceDocumentTravelContext]);

  const handleExportExcel = React.useCallback(async () => {
    if (!selectedProgram) return;
    const XLSX = await import("xlsx");
    const agencyName = getLocalizedAgencyName(agency, lang, t.agencyFallbackName);
    const exportDate = new Intl.DateTimeFormat(lang === "ar" ? "ar-MA" : lang === "fr" ? "fr-FR" : "en-US").format(new Date());
    const period = [selectedProgram.departure, selectedProgram.returnDate].filter(Boolean).join(" - ") || "—";
    const summaryRows = [
      [labels.totalSale, totals.rev, labels.totalPaid, totals.paid],
      [labels.totalRemaining, totals.rem, labels.totalDiscount, totals.disc],
      [labels.fullyPaid, statusCounts.cleared, labels.partialPaid, statusCounts.partial],
      [labels.unpaid, statusCounts.unpaid, labels.clientCount, programData.length],
    ];
    const tableHeader = [
      labels.index,
      labels.fileRef,
      labels.name,
      labels.phone,
      labels.package,
      labels.roomType,
      labels.salePrice,
      labels.paidAmount,
      labels.remainingAmount,
      labels.discount,
      labels.status,
      labels.lastPaymentDate,
      labels.receiptNumber,
      labels.notes,
    ];
    const detailRows = programData.map((client, index) => [
      index + 1,
      client.displayRef || "",
      client.displayName || getClientDisplayName(client, "—", lang),
      client.phone || "",
      getClientPackageLabel(client),
      client.roomType || client.room_type || "",
      client.salePrice,
      client.paid,
      client.remaining,
      client.discount,
      getStatusLabel(client.status, labels),
      client.lastPmt?.date || "",
      client.lastPmt?.receiptNo || "",
      getClientNotes(client) || client.lastPmt?.note || "",
    ]);
    const totalRow = [
      "",
      "",
      labels.total,
      "",
      "",
      "",
      totals.rev,
      totals.paid,
      totals.rem,
      totals.disc,
      "",
      "",
      "",
      "",
    ];
    const rows = [
      [agencyName],
      [labels.reportTitle],
      [],
      [labels.program, selectedProgram.name || "—", labels.period, period],
      [labels.currency, "MAD", labels.exportDate, exportDate],
      [labels.clientCount, programData.length],
      [],
      [labels.summary],
      ...summaryRows,
      [],
      tableHeader,
      ...detailRows,
      totalRow,
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const headerRowIndex = 13;
    const totalRowIndex = rows.length;
    ws["!cols"] = [
      { wch: 6 }, { wch: 16 }, { wch: 30 }, { wch: 16 },
      { wch: 16 }, { wch: 14 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 13 }, { wch: 14 }, { wch: 16 },
      { wch: 16 }, { wch: 32 },
    ];
    ws["!merges"] = [
      { s:{ r:0, c:0 }, e:{ r:0, c:5 } },
      { s:{ r:1, c:0 }, e:{ r:1, c:5 } },
    ];
    ws["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s:{ r:headerRowIndex - 1, c:0 },
        e:{ r:Math.max(headerRowIndex - 1, totalRowIndex - 2), c:tableHeader.length - 1 },
      }),
    };
    const moneyFormat = '#,##0 "MAD"';
    for (let row = 9; row <= totalRowIndex; row += 1) {
      [1, 3, 6, 7, 8, 9].forEach((col) => {
        const address = XLSX.utils.encode_cell({ r: row - 1, c: col });
        if (ws[address] && typeof ws[address].v === "number") ws[address].z = moneyFormat;
      });
    }
    const wb = XLSX.utils.book_new();
    wb.Props = {
      Title: labels.reportTitle,
      Subject: selectedProgram.name || labels.reportTitle,
      Author: agencyName,
      CreatedDate: new Date(),
    };
    if (isRTL) wb.Workbook = { Views: [{ RTL: true }] };
    const sheetName = lang === "ar" ? "كشف التصفية" : lang === "fr" ? "Règlement" : "Clearance";
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    const prefix = lang === "ar" ? "كشف-تصفية" : "Clearance";
    XLSX.writeFile(wb, `${prefix}-${sanitizeFileName(selectedProgram.name)}.xlsx`, { bookType:"xlsx", compression:true });
  }, [agency, isRTL, labels, lang, programData, selectedProgram, statusCounts, totals]);

  const handleTrashInvoice = React.useCallback(async (invoice) => {
    if (invoiceApi?.isRemote) {
      await invoiceApi.trashFinalInvoice(invoice.id);
      await refreshSavedInvoices();
      return;
    }
    setSavedInvoices(trashSavedInvoiceSnapshot(invoice.id));
  }, [invoiceApi, refreshSavedInvoices]);

  const handleRestoreInvoice = React.useCallback(async (invoice) => {
    if (invoiceApi?.isRemote) {
      await invoiceApi.restoreFinalInvoice(invoice.id);
      await refreshSavedInvoices();
      return;
    }
    setSavedInvoices(restoreSavedInvoiceSnapshot(invoice.id));
  }, [invoiceApi, refreshSavedInvoices]);

  const handleDeleteInvoice = React.useCallback(async (invoice) => {
    if (invoiceApi?.isRemote) {
      await invoiceApi.deleteFinalInvoice(invoice.id);
      await refreshSavedInvoices();
      return;
    }
    setSavedInvoices(deleteSavedInvoiceSnapshot(invoice.id));
  }, [invoiceApi, refreshSavedInvoices]);

  return (
    <div className="page-body clearance-page" style={{ padding:"0 32px 32px" }}>
      <div className="page-header clearance-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:21, fontWeight:800, color:tc.white }}>{t.clearanceReport}</h1>
          <p style={{ fontSize:12, color:tc.grey, marginTop:3 }}>{t.clearanceDesc}</p>
        </div>
      </div>

      <div className="page-filters filters-chips" style={{ marginBottom:18 }}>
        {[
          { key:"clearance", label:invoiceLabels.clearance },
          { key:"invoices", label:invoiceLabels.invoices },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`filter-chip${activeTab === tab.key ? " is-active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "clearance" && (
      <>
      <GlassCard style={{ padding:14, marginBottom:18 }}>
        <div style={{
          display:"flex",
          flexWrap:"wrap",
          gap:12,
          alignItems:"end",
        }}>
          <Select
            label={labels.program}
            value={selectedProgramId}
            onChange={(event) => setSelectedProgramId(event.target.value)}
            disabled={!activeClearancePrograms.length}
            options={[
              ...(!activeClearancePrograms.length ? [{ value:"", label:labels.selectProgram }] : []),
              ...activeClearancePrograms.map((program) => ({ value:program.id, label:program.name })),
            ]}
            style={{ flex:"1 1 260px", minWidth:220 }}
          />
          <Select
            label={labels.pageSize}
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            disabled={!selectedProgram}
            options={[10, 20, 50].map((size) => ({ value:size, label:String(size) }))}
            style={{ flex:"0 0 140px" }}
          />
          <Button
            variant="primary"
            icon="download"
            disabled={!selectedProgram || !clearanceDataReady}
            onClick={handleExportExcel}
          >
            {labels.exportExcel}
          </Button>
          <Button variant="ghost" icon="print" disabled={!clearanceDataReady || !data.length} onClick={async () => {
            if (data.length === 0) return;
            const finalInvoices = await refreshSavedInvoices();
            printClearancePDF({
              data,
              totals: tableTotals,
              filterLabel: FILTER_LABELS[filter],
              lang,
              t,
              agency,
              finalInvoices,
            });
          }}>
            {lang === "fr" ? "Exporter PDF" : lang === "en" ? "Export PDF" : "تصدير PDF"}
          </Button>
        </div>
      </GlassCard>

      {!clearanceDataReady ? (
        <GlassCard style={{ padding:18, textAlign:"center", color:tc.grey, fontSize:13 }}>
          {t.loading || "Loading..."}
        </GlassCard>
      ) : (
      <>
      {/* KPIs */}
      <div className="kpi-grid cards-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:12, marginBottom:24 }}>
        {[
          ["users", t.clients, programData.length, t.gold],
          ["coins", t.salePrice, money(totals.rev), t.gold],
          ["success", t.clearedFilter, statusCounts.cleared, t.greenLight],
          ["partial", t.partialFilter, statusCounts.partial, t.warning],
          ["unpaid", t.unpaidFilter, statusCounts.unpaid, t.danger],
          ["banknote", t.collected, money(totals.paid), t.gold],
          ["hourglass", t.remaining, money(totals.rem), t.warning],
          ["discount", t.discounts, money(totals.disc), t.danger],
        ].map(([ic,lb,vl,cl])=>(
          <GlassCard gold key={lb} style={{ padding:"13px 14px", textAlign:"center" }}>
            <AppIcon name={ic} size={19} color={cl} style={{ marginBottom:5 }} />
            <p style={{ fontSize:15, fontWeight:800, color:cl, fontFamily:"'Amiri',serif", lineHeight:1 }}>{vl}</p>
            <p style={{ fontSize:11, color:t.grey, marginTop:4 }}>{lb}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filters */}
      <div className="clearance-search" style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", justifyContent:"flex-start", direction:dir }}>
        <CompactFilterDropdown
          options={statusFilterOptions}
          value={filter}
          onChange={setFilter}
          open={statusFilterOpen}
          setOpen={setStatusFilterOpen}
          containerRef={statusFilterRef}
          title={activeStatusFilterOption.buttonLabel}
          basis={170}
        />
        <SearchBar
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder={t.searchGeneral}
          style={{ width:"100%", maxWidth:360, flex:"1 1 260px" }}
        />
        <CompactFilterDropdown
          options={paymentMethodOptions}
          value={paymentMethodFilter}
          onChange={setPaymentMethodFilter}
          open={paymentMethodOpen}
          setOpen={setPaymentMethodOpen}
          containerRef={paymentMethodRef}
          title={activePaymentMethodOption.buttonLabel}
          basis={220}
        />
        {["cheque", "bank_transfer", "bank_deposit"].includes(paymentMethodFilter) && (
          <SearchBar
            value={paymentContextSearch}
            onChange={(event) => setPaymentContextSearch(event.target.value)}
            placeholder={getPaymentContextSearchPlaceholder(paymentMethodFilter, lang, t)}
            style={{ width:"100%", maxWidth:260, flex:"0 1 240px" }}
          />
        )}
      </div>

      <div className="table-scroll clearance-table">
        {/* Table header */}
        <div className="table-grid table-grid-head clearance-grid" style={{ display:"grid",
          gridTemplateColumns:tableColumns,
          gap:6, padding:"8px 14px",
          background:"var(--rukn-table-head-bg)", border:"1px solid var(--rukn-row-border)", borderRadius:8, marginBottom:6,
          fontSize:11, fontWeight:700, color:t.grey,
          width:"100%",
          boxSizing:"border-box" }}>
          {[t.fileId, t.name, t.program, t.salePrice, t.paid, t.remaining, t.status, t.lastReceipt, invoiceColumnLabel].map(h => (
            <span key={h} style={TEXT_CLAMP_STYLE}>{h}</span>
          ))}
        </div>

        <div className="table-grid-body" style={{ display:"flex", flexDirection:"column", gap:3, width:"100%" }}>
          {pageData.map((c,i) => (
            <ClearRow
              key={c.id}
              client={c}
              index={(currentPage - 1) * pageSize + i}
              gridTemplate={tableColumns}
              invoiceLabel={getInvoiceActionLabel(c)}
              onInvoiceAction={handleInvoiceAction}
              actionLabels={invoiceActionLabels}
              money={money}
            />
          ))}
          {!data.length && (
            <div style={{
              padding:18,
              border:"1px solid var(--rukn-row-border)",
              borderRadius:10,
              background:"var(--rukn-row-bg)",
              color:tc.grey,
              textAlign:"center",
              fontSize:13,
            }}>
              {!selectedProgram ? labels.selectProgram : labels.emptyProgram}
            </div>
          )}
        </div>

        {/* Totals */}
        {data.length > 0 && (
          <div className="table-grid table-grid-foot clearance-grid" style={{ display:"grid",
            gridTemplateColumns:tableColumns,
            gap:6, padding:"10px 14px", marginTop:8,
            background:"var(--rukn-section-bg)", border:"1px solid var(--rukn-row-border-hover)",
            borderRadius:10, fontSize:12, fontWeight:700,
            width:"100%",
            boxSizing:"border-box" }}>
            <span style={{ ...TEXT_CLAMP_STYLE, color:t.gold }}>{t.totalLabel}</span>
            <span style={{ ...TEXT_CLAMP_STYLE, color:t.grey }}>{data.length} {t.clients}</span>
            <span />
            <span style={{ ...TEXT_CLAMP_STYLE, color:t.gold }}>{money(tableTotals.rev)}</span>
            <span style={{ ...TEXT_CLAMP_STYLE, color:t.greenLight }}>{money(tableTotals.paid)}</span>
            <span style={{ ...TEXT_CLAMP_STYLE, color:t.warning }}>{money(tableTotals.rem)}</span>
            <span />
            <span style={{ ...TEXT_CLAMP_STYLE, color:t.danger }}>{t.discount}: {money(tableTotals.disc)}</span>
            <span />
          </div>
        )}
      </div>

      {data.length > 0 && (
        <div style={{
          display:"flex",
          justifyContent:"space-between",
          alignItems:"center",
          gap:12,
          flexWrap:"wrap",
          marginTop:12,
          marginBottom:10,
          color:tc.grey,
          fontSize:12,
        }}>
          <span>
            {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, data.length)} / {data.length}
          </span>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              {lang === "fr" ? "Précédent" : lang === "en" ? "Previous" : "السابق"}
            </Button>
            <span style={{ color:tc.white, fontWeight:700 }}>{currentPage} / {totalPages}</span>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              {lang === "fr" ? "Suivant" : lang === "en" ? "Next" : "التالي"}
            </Button>
          </div>
        </div>
      )}

      <div className="clearance-card-list">
        {pageData.map((client, index) => (
          <ClearCard
            key={`card-${client.id}`}
            client={client}
            index={(currentPage - 1) * pageSize + index}
            invoiceLabel={getInvoiceActionLabel(client)}
            onInvoiceAction={handleInvoiceAction}
            actionLabels={invoiceActionLabels}
            t={t}
            lang={lang}
            money={money}
          />
        ))}

        {data.length === 0 && (
          <div className="clearance-empty-card">
            {t.noResults || (lang === "fr" ? "Aucun résultat" : lang === "en" ? "No records found" : "لا توجد سجلات")}
          </div>
        )}

        {data.length > 0 && (
          <div className="clearance-card-summary">
            <div className="summary-row">
              <span>{t.totalLabel}</span>
              <strong>{data.length} {t.clients}</strong>
            </div>
            <div className="summary-grid">
              <div>
                <p>{t.salePrice}</p>
                <strong>{money(tableTotals.rev)}</strong>
              </div>
              <div>
                <p>{t.paid}</p>
                <strong className="is-success">{money(tableTotals.paid)}</strong>
              </div>
              <div>
                <p>{t.remaining}</p>
                <strong className="is-warning">{money(tableTotals.rem)}</strong>
              </div>
              <div>
                <p>{t.discount}</p>
                <strong className="is-danger">{money(tableTotals.disc)}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
      </>
      )}
      </>
      )}

      {activeTab === "invoices" && (
        <InvoicesTab
          invoices={savedInvoices}
          programs={programs}
          labels={invoiceLabels}
          lang={lang}
          dir={dir}
          money={money}
          focusInvoice={focus?.type === "invoice" ? focus : null}
          onPreview={(invoice) => previewInvoiceSnapshot({ snapshot: invoice, lang })}
          onReprint={(invoice) => printInvoiceSnapshot({ snapshot: invoice, lang })}
          onDownloadWord={(invoice) => downloadInvoiceWordSnapshot({ snapshot: invoice, lang })}
          onTrash={handleTrashInvoice}
          onRestore={handleRestoreInvoice}
          onDelete={handleDeleteInvoice}
        />
      )}

      <InvoiceRecipientModal
        open={Boolean(invoiceClient)}
        onClose={() => {
          setInvoiceClient(null);
          setInvoiceAction("print");
        }}
        lang={lang}
        documentType={isInvoiceClientSettled(invoiceClient) ? "invoice" : "proforma"}
        submitLabel={invoiceAction === "word" ? invoiceActionLabels.downloadWord : ""}
        onPrint={handlePrintSelectedInvoice}
      />
    </div>
  );
}

function InvoicesTab({ invoices = [], programs = [], labels, lang, dir, money, focusInvoice = null, onPreview, onReprint, onDownloadWord, onTrash, onRestore, onDelete }) {
  const [yearFilter, setYearFilter] = React.useState("all");
  const [programFilter, setProgramFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 200);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [highlightedInvoiceId, setHighlightedInvoiceId] = React.useState("");

  React.useEffect(() => {
    if (focusInvoice?.type !== "invoice" || !focusInvoice.token) return undefined;
    const invoiceSearch = String(focusInvoice.invoiceNumber || focusInvoice.invoiceId || "").trim();
    if (invoiceSearch) setSearch(invoiceSearch);
    if (focusInvoice.programId && programs.some((program) => String(program.id) === String(focusInvoice.programId))) {
      setProgramFilter(focusInvoice.programId);
    } else {
      setProgramFilter("all");
    }
    if (focusInvoice.invoiceId) setHighlightedInvoiceId(String(focusInvoice.invoiceId));
    const timer = window.setTimeout(() => setHighlightedInvoiceId(""), 4200);
    return () => window.clearTimeout(timer);
  }, [focusInvoice, programs]);

  const invoiceYears = React.useMemo(() => (
    [...new Set(programs.map((program) => getProgramYear(program)).filter(Boolean))]
      .sort((a, b) => String(b).localeCompare(String(a)))
  ), [programs]);

  const invoicePrograms = React.useMemo(() => {
    const seen = new Map();
    programs.forEach((program) => {
      const key = program?.id || "";
      const label = program?.name || "—";
      if (key && !seen.has(key)) seen.set(key, { key, label });
    });
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [programs]);

  const filteredInvoices = React.useMemo(() => {
    const q = normalizeSearchText(debouncedSearch);
    return invoices.filter((invoice) => {
      const snapshotProgram = invoice.programSnapshot || {};
      const recipient = invoice.recipientSnapshot || {};
      const programKey = invoice.programId || "";
      const snapshotYear = String(invoice.year || "").trim()
        || getProgramYear({ departure: snapshotProgram.departureDate });
      const okYear = yearFilter === "all" || snapshotYear === String(yearFilter);
      const okProgram = programFilter === "all" || programKey === programFilter;
      const haystack = buildSearchText(
        recipient.name,
        recipient.clientName,
        recipient.companyName,
        recipient.phone,
        recipient.ice,
        invoice.invoiceDisplayNumber,
        invoice.invoiceNumber,
        invoice.id,
      );
      return okYear && okProgram && (!q || haystack.includes(q));
    });
  }, [debouncedSearch, invoices, programFilter, yearFilter]);

  const renderInvoiceTitle = (invoice) => {
    const recipient = invoice.recipientSnapshot || {};
    const name = invoice.recipientType === "company"
      ? recipient.companyName || recipient.name
      : recipient.clientName || recipient.name;
    return lang === "fr"
      ? `Facture ${name || "—"}`
      : lang === "en"
        ? `Invoice ${name || "—"}`
        : `فاتورة ${name || "—"}`;
  };

  return (
    <>
      <GlassCard style={{ padding:16, marginBottom:18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, flexWrap:"wrap", marginBottom:16 }}>
          <div>
            <h2 style={{ fontSize:18, fontWeight:800, color:"var(--rukn-text)" }}>{labels.title}</h2>
            <p style={{ fontSize:12, color:"var(--rukn-text-muted)", marginTop:3 }}>{labels.subtitle}</p>
          </div>
          <div style={{ fontSize:12, fontWeight:800, color:"var(--rukn-gold)" }}>
            {filteredInvoices.length} / {invoices.length}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12, alignItems:"end", marginBottom:16 }}>
          <Select
            label={labels.year}
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value)}
            options={[
              { value:"all", label:labels.all },
              ...invoiceYears.map((year) => ({ value:year, label:year })),
            ]}
          />

          <Select
            label={labels.program}
            value={programFilter}
            onChange={(event) => setProgramFilter(event.target.value)}
            options={[
              { value:"all", label:labels.all },
              ...invoicePrograms.map((program) => ({ value:program.key, label:program.label })),
            ]}
          />

          <SearchBar
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={labels.search}
            style={{ width:"100%" }}
          />
        </div>

        <div style={{ display:"grid", gap:10 }}>
          {filteredInvoices.map((invoice) => {
            const recipient = invoice.recipientSnapshot || {};
            const program = invoice.programSnapshot || {};
            const isTrashed = invoice.status === "trashed";
            const isFocusedInvoice = highlightedInvoiceId && String(invoice.id) === String(highlightedInvoiceId);
            const menuItems = !isTrashed
              ? [
                { key: "preview", label: labels.preview, icon: "eye", onClick: () => onPreview?.(invoice) },
                { key: "reprint", label: labels.reprint, icon: "print", onClick: () => onReprint?.(invoice) },
                { key: "word", label: labels.downloadWord, icon: "file", onClick: () => onDownloadWord?.(invoice) },
                { key: "trash", label: labels.trash, icon: "trash", tone: "danger", onClick: () => onTrash?.(invoice) },
              ]
              : [
                { key: "restore", label: labels.restore, icon: "restore", onClick: () => onRestore?.(invoice) },
                { key: "delete", label: labels.deletePermanent, icon: "trash", tone: "danger", onClick: () => setDeleteTarget(invoice) },
              ];
            return (
              <div
                key={invoice.id}
                style={{
                  display:"flex",
                  gap:12,
                  flexWrap:"wrap",
                  alignItems:"center",
                  padding:"10px 12px",
                  borderRadius:12,
                  background:isFocusedInvoice ? "var(--rukn-gold-dim)" : "var(--rukn-row-bg)",
                  border:isFocusedInvoice ? "1px solid rgba(212,175,55,.45)" : "1px solid var(--rukn-row-border)",
                  boxShadow:isFocusedInvoice ? "0 0 0 3px rgba(212,175,55,.12)" : "none",
                }}
              >
                <div style={{ minWidth:220, flex:"1 1 240px" }}>
                  <p style={{ ...TEXT_CLAMP_STYLE, fontSize:13, fontWeight:800, color:"var(--rukn-text)" }}>
                    {renderInvoiceTitle(invoice)}
                  </p>
                  <p style={{ ...TEXT_CLAMP_STYLE, fontSize:11, color:"var(--rukn-text-muted)", marginTop:2 }}>
                    {invoice.recipientType === "company" ? labels.company : labels.client}
                    {invoice.recipientType === "company" && recipient.ice ? ` • ${labels.ice}: ${recipient.ice}` : ""}
                  </p>
                </div>
                <div style={{ minWidth:130, flex:"0 1 145px", fontSize:11, color:"var(--rukn-text-muted)" }}>
                  <strong style={{ display:"block", fontSize:12, color:"var(--rukn-gold)" }}>{invoice.invoiceDisplayNumber}</strong>
                  <p style={{ marginTop:2 }}>{labels.date}: {formatClearanceDate(invoice.issueDate)}</p>
                </div>
                <div style={{ minWidth:150, flex:"1 1 180px", fontSize:11, color:"var(--rukn-text-muted)" }}>
                  <p style={TEXT_CLAMP_STYLE}>{program.programName || "—"}</p>
                  <p style={{ marginTop:2, fontSize:12, fontWeight:700, color:"var(--rukn-text)" }}>{money(invoice.amountSnapshot?.total || 0)}</p>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginInlineStart:"auto" }}>
                  <span style={{
                    display:"inline-flex",
                    alignItems:"center",
                    minHeight:24,
                    padding:"3px 9px",
                    borderRadius:999,
                    fontSize:11,
                    fontWeight:800,
                    color:isTrashed ? "var(--rukn-danger)" : "var(--rukn-gold)",
                    background:isTrashed ? "rgba(239,68,68,.1)" : "var(--rukn-gold-dim)",
                    border:isTrashed ? "1px solid rgba(239,68,68,.25)" : "1px solid rgba(212,175,55,.28)",
                  }}>
                    {isTrashed ? labels.trashed : labels.issued}
                  </span>
                  <InvoiceActionsMenu
                    label={lang === "fr" ? "Actions facture" : lang === "en" ? "Invoice actions" : "إجراءات الفاتورة"}
                    items={menuItems}
                  />
                </div>
              </div>
            );
          })}

          {!filteredInvoices.length && (
            <div style={{
              padding:22,
              textAlign:"center",
              borderRadius:12,
              border:"1px dashed var(--rukn-border-soft)",
              color:"var(--rukn-text-muted)",
              fontSize:13,
            }}>
              {labels.empty}
            </div>
          )}
        </div>
      </GlassCard>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={labels.warningTitle}
        width={520}
      >
        <div style={{ display:"grid", gap:16 }}>
          <div style={{
            padding:"13px 14px",
            borderRadius:12,
            background:"rgba(239,68,68,.1)",
            border:"1px solid rgba(239,68,68,.28)",
            color:"var(--rukn-text)",
            lineHeight:1.8,
            fontSize:13,
            fontWeight:700,
          }}>
            <p>{labels.warningBody}</p>
            <p style={{ marginTop:10 }}>{labels.invoiceNumber}: {deleteTarget?.invoiceDisplayNumber || "—"}</p>
            <p>{labels.recipient}: {deleteTarget ? renderInvoiceTitle(deleteTarget).replace(/^فاتورة\s|^Facture\s|^Invoice\s/, "") : "—"}</p>
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, flexWrap:"wrap" }}>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>{labels.cancel}</Button>
            <Button
              variant="danger"
              icon="trash"
              onClick={() => {
                if (deleteTarget) onDelete?.(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              {labels.confirmDelete}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function InvoiceActionsMenu({ label, items = [] }) {
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [menuPos, setMenuPos] = React.useState({ top: 0, left: 0, width: 190 });

  const updateMenuPosition = React.useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect?.();
    if (!rect) return;
    const width = 190;
    const gap = 8;
    const estimatedHeight = Math.max(58, items.length * 42 + 12);
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width));
    const preferredTop = rect.bottom + gap;
    const fallbackTop = rect.top - gap - estimatedHeight;
    const top = preferredTop + estimatedHeight <= window.innerHeight - 8
      ? preferredTop
      : Math.max(8, fallbackTop);
    setMenuPos({ top, left, width });
  }, [items.length]);

  React.useEffect(() => {
    if (!open) return undefined;
    const handlePointer = (event) => {
      if (menuRef.current?.contains(event.target) || buttonRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  return (
    <div style={{ position:"relative" }}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        onClick={() => {
          updateMenuPosition();
          setOpen((value) => !value);
        }}
        style={{
          width:34,
          height:34,
          borderRadius:10,
          border:"1px solid var(--rukn-border-soft)",
          background:"var(--rukn-bg-soft)",
          color:"var(--rukn-text-muted)",
          display:"inline-flex",
          alignItems:"center",
          justifyContent:"center",
          fontSize:18,
          lineHeight:1,
          cursor:"pointer",
          transition:"border-color .2s ease, background .2s ease, color .2s ease",
        }}
      >
        ⋯
      </button>
      {open && createPortal(
        <div ref={menuRef} style={{
          position:"fixed",
          top:menuPos.top,
          left:menuPos.left,
          width:menuPos.width,
          padding:6,
          borderRadius:12,
          background:"var(--rukn-bg-card)",
          border:"1px solid var(--rukn-border-soft)",
          boxShadow:"var(--rukn-shadow-card)",
          zIndex:10000,
        }}>
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                item.onClick?.();
                setOpen(false);
              }}
              style={{
                width:"100%",
                display:"flex",
                alignItems:"center",
                gap:8,
                padding:"9px 10px",
                borderRadius:10,
                border:"none",
                background:"transparent",
                color:item.tone === "danger" ? "var(--rukn-danger)" : "var(--rukn-text)",
                fontFamily:"'Cairo',sans-serif",
                fontSize:13,
                fontWeight:700,
                textAlign:"start",
                cursor:"pointer",
              }}
            >
              <AppIcon
                name={item.icon}
                size={14}
                color={item.tone === "danger" ? "var(--rukn-danger)" : "var(--rukn-text-muted)"}
              />
              <span>{item.label}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

function ClearRow({ client, index, gridTemplate, onInvoiceAction, actionLabels, money }) {
  const [hov, setHov] = React.useState(false);
  const contactLine = [client.phone ? `${client.phone}` : "", client.city ? `• ${client.city}` : ""].filter(Boolean).join(" ");
  return (
    <div className="animate-fadeInUp" style={{ animationDelay:`${index*.018}s` }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <div className="table-grid-row clearance-grid" style={{
        display:"grid",
        gridTemplateColumns:gridTemplate || "repeat(9,minmax(0,1fr))",
        gap:6, padding:"10px 14px",
        background:hov?"var(--rukn-row-hover)":"var(--rukn-row-bg)",
        border:`1px solid ${hov?"var(--rukn-row-border-hover)":"var(--rukn-row-border)"}`,
        borderRadius:10, transition:"all .15s", alignItems:"center",
        boxShadow: hov ? "0 10px 24px rgba(15,23,42,.05)" : "none",
        width:"100%",
        boxSizing:"border-box",
      }}>
        <span style={{ ...TEXT_CLAMP_STYLE, fontSize:12, fontWeight:700, color:theme.colors.gold }}>
          {client.displayRef || client.id || "—"}
        </span>
        <div style={{ minWidth:0, overflow:"hidden" }}>
          <p style={{ ...TEXT_CLAMP_STYLE, fontWeight:700, fontSize:13, color:theme.colors.white }}>{client.displayName || getClientDisplayName(client)}</p>
          <p style={{ ...TEXT_CLAMP_STYLE, fontSize:11, color:theme.colors.grey }}>{contactLine || "—"}</p>
        </div>
        <span style={{ ...TEXT_CLAMP_STYLE, fontSize:11, color:theme.colors.grey }}>{client.prog?.name||"—"}</span>
        <span style={{ ...TEXT_CLAMP_STYLE, fontSize:12, fontWeight:700, color:theme.colors.gold }}>
          {money(client.salePrice)}
        </span>
        <span style={{ ...TEXT_CLAMP_STYLE, fontSize:12, fontWeight:700, color:theme.colors.greenLight }}>
          {money(client.paid)}
        </span>
        <span style={{ ...TEXT_CLAMP_STYLE, fontSize:12, fontWeight:700,
          color:client.remaining>0?theme.colors.warning:theme.colors.greenLight }}>
          {money(client.remaining)}
        </span>
        <StatusBadge status={client.status} />
        <span style={{ ...TEXT_CLAMP_STYLE, fontSize:11, color:theme.colors.grey }}>
          {client.lastPmt?.receiptNo||"—"}
        </span>
        <div style={{ display:"flex", justifyContent:"center", width:"100%", minWidth:0 }}>
          <InvoiceActionsMenu
            label={actionLabels?.menu}
            items={[
              { key: "print", label: actionLabels?.print || "Print", icon: "print", onClick: () => onInvoiceAction?.(client, "print") },
              { key: "word", label: actionLabels?.downloadWord || "Download Word", icon: "file", onClick: () => onInvoiceAction?.(client, "word") },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function ClearCard({ client, index, onInvoiceAction, actionLabels, t, lang, money }) {
  const reference = client.displayRef || formatFileReference(client);
  const phoneLine = client.phone ? client.phone.trim() : "";
  const cityLine = client.city ? client.city.trim() : "";
  const remainingColor = client.remaining > 0 ? "warning" : "success";
  const moreLabel = t.moreOptions
    || (lang === "fr" ? "Plus d'options" : lang === "en" ? "More options" : "المزيد");

  return (
    <div className="clear-card animate-fadeInUp" style={{ animationDelay:`${index*.02}s` }}>
      <div className="clear-card-header">
        <div className="clear-card-title">
          <p className="clear-card-name" title={client.displayName || getClientDisplayName(client)}>{client.displayName || getClientDisplayName(client)}</p>
          {phoneLine && <p className="clear-card-phone">{phoneLine}</p>}
          {cityLine && <p className="clear-card-meta">{cityLine}</p>}
        </div>
        <div className="clear-card-actions">
          <InvoiceActionsMenu
            label={actionLabels?.menu || moreLabel}
            items={[
              { key: "print", label: actionLabels?.print || "Print", icon: "print", onClick: () => onInvoiceAction?.(client, "print") },
              { key: "word", label: actionLabels?.downloadWord || "Download Word", icon: "file", onClick: () => onInvoiceAction?.(client, "word") },
            ]}
          />
        </div>
      </div>

      <div className="clear-card-info-row">
        <div className="clear-card-info-item">
          <span>{t.fileId}</span>
          <strong title={reference}>{reference}</strong>
        </div>
        <div className="clear-card-info-item">
          <span>{t.program}</span>
          <strong title={client.prog?.name || "—"}>{client.prog?.name || "—"}</strong>
        </div>
      </div>

      <div className="clear-card-finance">
        <ClearCardField label={t.paid} value={money(client.paid)} highlight="success" />
        <ClearCardField label={t.remaining} value={money(client.remaining)} highlight={remainingColor} />
        <div className="clear-card-status-block">
          <p className="clear-card-field-label">{t.status}</p>
          <div className="clear-card-status-badge">
            <StatusBadge status={client.status} />
          </div>
        </div>
      </div>

      <div className="clear-card-info-row">
        <div className="clear-card-info-item">
          <span>{t.salePrice}</span>
          <strong>{money(client.salePrice)}</strong>
        </div>
        <div className="clear-card-info-item">
          <span>{t.lastReceipt}</span>
          <strong>{client.lastPmt?.receiptNo || "—"}</strong>
        </div>
      </div>
    </div>
  );
}

function ClearCardField({ label, value, highlight }) {
  const colorClass = highlight ? ` is-${highlight}` : "";
  return (
    <div className="clear-card-field">
      <p className="clear-card-field-label">{label}</p>
      <p className={`clear-card-field-value${colorClass}`}>
        {value}
      </p>
    </div>
  );
}
