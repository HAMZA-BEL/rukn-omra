import React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Filter } from "lucide-react";
import { GlassCard, Button, EmptyState, Modal } from "./UI";
import { useLang } from "../hooks/useLang";
import { theme } from "./styles";
import { formatCurrency } from "../utils/currency";
import {
  readSavedInvoices,
  restoreSavedInvoiceSnapshot,
  deleteSavedInvoiceSnapshot,
} from "../utils/invoices";
import { getClientDisplayName } from "../utils/clientNames";

const tc = theme.colors;
const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const FILTERS = [
  { id: "all", key: "trashFilter_all" },
  { id: "programs", key: "trashFilter_programs" },
  { id: "clients", key: "trashFilter_clients" },
  { id: "invoices", key: "trashFilter_invoices" },
  { id: "payments", key: "trashFilter_payments" },
];

const trashPaymentMessages = (lang) => {
  if (lang === "fr") {
    return {
      block: "Impossible de supprimer définitivement ce pèlerin car il contient des paiements enregistrés. Supprimez d’abord les paiements si vous êtes sûr.",
      allowed: "Suppression définitive possible — les enregistrements liés seront supprimés après confirmation",
      checking: "Vérification des enregistrements liés...",
      checkUnavailable: "Vérification différée — les règles seront revérifiées avant suppression",
      blocked: "Suppression définitive impossible : des enregistrements liés existent",
      activePayments: "Paiements actifs liés — suppression définitive impossible",
      activeInvoices: "Factures actives liées — suppression définitive impossible",
      hiddenPayments: "Paiements liés non visibles dans cette agence — suppression définitive impossible",
      hiddenInvoices: "Factures liées non visibles dans cette agence — suppression définitive impossible",
      linkedFinancialRecords: "Enregistrements financiers liés — suppression définitive impossible",
      linkedRepresentation: "Liens de représentation liés — suppression définitive impossible",
      linkedRooming: "Affectations d’hébergement liées — suppression définitive impossible",
      linkedActivity: "Journaux d’activité liés — suppression définitive impossible",
      linkedNotifications: "Notifications liées — suppression définitive impossible",
      linkedDocuments: "Documents liés — suppression définitive impossible",
      linkedBadgeData: "Données de badges liées — suppression définitive impossible",
      safeCleanup: "Suppression définitive possible — les enregistrements liés seront supprimés après confirmation",
      safeRoomingCleanup: "Suppression définitive possible — les enregistrements liés seront supprimés après confirmation",
      partial: "{deleted} éléments supprimés définitivement avec leurs enregistrements liés. {failed} éléments n’ont pas pu être supprimés.",
      blockedOnly: "{failed} éléments n’ont pas pu être supprimés.",
      successWithCleanup: "{deleted} éléments supprimés définitivement avec leurs enregistrements liés.",
    };
  }
  if (lang === "en") {
    return {
      block: "This pilgrim cannot be permanently deleted because they still have saved payments. Delete the payments first if you are sure.",
      allowed: "Permanent delete allowed — linked records will be deleted after confirmation",
      checking: "Checking linked records...",
      checkUnavailable: "Check deferred — rules will be checked again before deletion",
      blocked: "Permanent delete blocked: linked records exist",
      activePayments: "Linked active payments — permanent deletion blocked",
      activeInvoices: "Linked active invoices — permanent deletion blocked",
      hiddenPayments: "Linked payments outside the visible agency data — permanent deletion blocked",
      hiddenInvoices: "Linked invoices outside the visible agency data — permanent deletion blocked",
      linkedFinancialRecords: "Linked financial records — permanent deletion blocked",
      linkedRepresentation: "Linked representative records — permanent deletion blocked",
      linkedRooming: "Linked rooming assignments — permanent deletion blocked",
      linkedActivity: "Linked activity logs — permanent deletion blocked",
      linkedNotifications: "Linked notifications — permanent deletion blocked",
      linkedDocuments: "Linked documents — permanent deletion blocked",
      linkedBadgeData: "Linked badge data — permanent deletion blocked",
      safeCleanup: "Permanent delete allowed — linked records will be deleted after confirmation",
      safeRoomingCleanup: "Permanent delete allowed — linked records will be deleted after confirmation",
      partial: "{deleted} items permanently deleted with their linked records. {failed} items could not be deleted.",
      blockedOnly: "{failed} items could not be deleted.",
      successWithCleanup: "{deleted} items permanently deleted with their linked records.",
    };
  }
  return {
    block: "لا يمكن حذف هذا المعتمر نهائيًا لأنه يحتوي على دفعات محفوظة. احذف الدفعات أولًا إذا كنت متأكدًا.",
    allowed: "يمكن الحذف النهائي — سيتم حذف السجلات المرتبطة بعد التأكيد",
    checking: "جارٍ التحقق من السجلات المرتبطة...",
    checkUnavailable: "تعذر التحقق الآن — سيتم التحقق مرة أخرى قبل الحذف",
    blocked: "لا يمكن الحذف النهائي لوجود سجلات مرتبطة",
    activePayments: "توجد دفعات نشطة مرتبطة — لا يمكن الحذف النهائي",
    activeInvoices: "توجد فواتير نشطة مرتبطة — لا يمكن الحذف النهائي",
    hiddenPayments: "توجد دفعات مرتبطة غير ظاهرة — لا يمكن الحذف النهائي",
    hiddenInvoices: "توجد فواتير مرتبطة غير ظاهرة — لا يمكن الحذف النهائي",
    linkedFinancialRecords: "توجد سجلات مالية مرتبطة — لا يمكن الحذف النهائي",
    linkedRepresentation: "توجد روابط تمثيل مرتبطة — لا يمكن الحذف النهائي",
    linkedRooming: "توجد سجلات تسكين مرتبطة — لا يمكن الحذف النهائي",
    linkedActivity: "توجد سجلات نشاط مرتبطة — لا يمكن الحذف النهائي",
    linkedNotifications: "توجد إشعارات مرتبطة — لا يمكن الحذف النهائي",
    linkedDocuments: "توجد وثائق مرتبطة — لا يمكن الحذف النهائي",
    linkedBadgeData: "توجد بيانات شارات مرتبطة — لا يمكن الحذف النهائي",
    safeCleanup: "يمكن الحذف النهائي — سيتم حذف السجلات المرتبطة بعد التأكيد",
    safeRoomingCleanup: "يمكن الحذف النهائي — سيتم حذف السجلات المرتبطة بعد التأكيد",
    partial: "تم حذف {deleted} عنصرًا نهائيًا مع سجلاتها المرتبطة. تعذر حذف {failed} عنصرًا.",
    blockedOnly: "تعذر حذف {failed} عنصرًا.",
    successWithCleanup: "تم حذف {deleted} عنصرًا نهائيًا مع سجلاتها المرتبطة.",
  };
};

const trashPermanentConfirmMessages = (lang, singleClient) => {
  if (lang === "fr") {
    return {
      title: singleClient
        ? "Suppression définitive irréversible"
        : "Suppression définitive groupée irréversible",
      body: singleClient
        ? "Ce pèlerin sera supprimé définitivement avec tous les enregistrements liés, y compris les paiements et les factures s’ils existent.\nCette opération ne peut pas être annulée.\nVoulez-vous continuer ?"
        : "Les éléments sélectionnés seront supprimés définitivement avec tous leurs enregistrements liés, y compris les paiements et les factures s’ils existent.\nCette opération ne peut pas être annulée.\nVoulez-vous continuer ?",
    };
  }
  if (lang === "en") {
    return {
      title: singleClient
        ? "Irreversible Permanent Delete"
        : "Irreversible Bulk Permanent Delete",
      body: singleClient
        ? "This pilgrim will be permanently deleted with all linked records, including payments and invoices if present.\nThis action cannot be undone.\nDo you want to continue?"
        : "The selected items will be permanently deleted with all linked records, including payments and invoices if present.\nThis action cannot be undone.\nDo you want to continue?",
    };
  }
  return {
    title: singleClient
      ? "حذف نهائي لا يمكن التراجع عنه"
      : "حذف نهائي جماعي لا يمكن التراجع عنه",
    body: singleClient
      ? "سيتم حذف هذا الحاج/المعتمر نهائيًا مع جميع السجلات المرتبطة به، بما في ذلك الدفعات والفواتير إن وجدت.\nلا يمكن التراجع عن هذه العملية.\nهل تريد المتابعة؟"
      : "سيتم حذف العناصر المحددة نهائيًا مع جميع السجلات المرتبطة بها، بما في ذلك الدفعات والفواتير إن وجدت.\nلا يمكن التراجع عن هذه العملية.\nهل تريد المتابعة؟",
  };
};

const getClientDeleteBlockLabel = (block, text) => {
  if (!block?.blocked) {
    if (block?.precheckUnavailable || block?.code === "CHECK_UNAVAILABLE") return text.checkUnavailable;
    return text.allowed;
  }
  const code = String(block.code || "");
  const reasonCodes = new Set((block.reasons || []).map((reason) => String(reason.code || "")));
  if (code === "ACTIVE_LINKED_PAYMENTS" || code === "ACTIVE_PAYMENTS") return text.activePayments;
  if (code === "LINKED_EXTERNAL_PAYMENTS" || code === "LINKED_PAYMENT_RECORDS" || reasonCodes.has("LINKED_EXTERNAL_PAYMENTS")) return text.hiddenPayments;
  if (code === "ACTIVE_LINKED_INVOICES") return text.activeInvoices;
  if (code === "LINKED_EXTERNAL_INVOICES" || reasonCodes.has("LINKED_EXTERNAL_INVOICES")) return text.hiddenInvoices;
  if (code === "ACTIVE_LINKED_FINANCIAL_RECORDS" || code === "LINKED_FINANCIAL_RECORDS") return text.linkedFinancialRecords;
  if (code === "LINKED_REPRESENTATION_CLIENTS") return text.linkedRepresentation;
  if (code === "LINKED_ROOMING_ASSIGNMENTS") return text.linkedRooming;
  if (code === "LINKED_ACTIVITY_LOGS") return text.linkedActivity;
  if (code === "LINKED_NOTIFICATIONS") return text.linkedNotifications;
  if (code === "LINKED_DOCUMENTS") return text.linkedDocuments;
  if (code === "LINKED_BADGE_DATA") return text.linkedBadgeData;
  return text.blocked;
};

const formatTrashCountMessage = (template, values) => Object.entries(values).reduce(
  (message, [key, value]) => message.replace(`{${key}}`, String(value)),
  template
);

export default function TrashPage({ store, onToast }) {
  const { t, lang, dir } = useLang();
  const invoicesAreRemote = Boolean(store.invoiceApi?.isRemote);
  const [filter, setFilter] = React.useState("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [selection, setSelection] = React.useState({});
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [deleteInProgress, setDeleteInProgress] = React.useState(false);
  const [deleteProgress, setDeleteProgress] = React.useState({ done: 0, total: 0 });
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [trashedInvoices, setTrashedInvoices] = React.useState(() => (
    invoicesAreRemote ? [] : readSavedInvoices().filter((invoice) => invoice.status === "trashed")
  ));
  const [invoicesLoading, setInvoicesLoading] = React.useState(false);
  const filterRef = React.useRef(null);
  const filterButtonRef = React.useRef(null);
  const filterMenuRef = React.useRef(null);
  const clientPreflightCacheRef = React.useRef(new Map());
  const [filterMenuStyle, setFilterMenuStyle] = React.useState(null);

  const locale = lang === "fr" ? "fr-FR" : lang === "en" ? "en-US" : "ar-MA";
  const paymentLabel = lang === "fr" ? "Paiements" : lang === "en" ? "Payments" : "الدفعات";
  const paymentGuardText = React.useMemo(() => {
    const fallback = trashPaymentMessages(lang);
    return {
      block: t.trashClientDeleteBlockedLinkedRecords || fallback.block,
      allowed: t.trashClientPermanentDeleteAllowed || fallback.allowed,
      checking: t.trashClientDeleteCheckingLinkedRecords || fallback.checking,
      checkUnavailable: t.trashClientDeleteCheckUnavailable || fallback.checkUnavailable,
      blocked: t.trashClientPermanentDeleteBlocked || fallback.blocked,
      activePayments: t.trashClientDeleteBlockedActivePayments || fallback.activePayments,
      activeInvoices: t.trashClientDeleteBlockedActiveInvoices || fallback.activeInvoices,
      hiddenPayments: t.trashClientDeleteBlockedHiddenPayments || fallback.hiddenPayments,
      hiddenInvoices: t.trashClientDeleteBlockedHiddenInvoices || fallback.hiddenInvoices,
      linkedFinancialRecords: t.trashClientDeleteBlockedFinancialRecords || fallback.linkedFinancialRecords,
      linkedRepresentation: t.trashClientDeleteBlockedRepresentation || fallback.linkedRepresentation,
      linkedRooming: t.trashClientDeleteBlockedRooming || fallback.linkedRooming,
      linkedActivity: t.trashClientDeleteBlockedActivity || fallback.linkedActivity,
      linkedNotifications: t.trashClientDeleteBlockedNotifications || fallback.linkedNotifications,
      linkedDocuments: t.trashClientDeleteBlockedDocuments || fallback.linkedDocuments,
      linkedBadgeData: t.trashClientDeleteBlockedBadgeData || fallback.linkedBadgeData,
      safeCleanup: t.trashClientDeleteSafeCleanup || fallback.safeCleanup,
      safeRoomingCleanup: t.trashClientDeleteSafeRoomingCleanup || fallback.safeRoomingCleanup,
      partial: t.trashPermanentDeletePartialSuccess || fallback.partial,
      blockedOnly: t.trashPermanentDeleteBlockedOnly || fallback.blockedOnly,
      successWithCleanup: t.trashPermanentDeleteSuccessWithCleanup || fallback.successWithCleanup,
    };
  }, [lang, t]);
  const permanentDeleteText = React.useMemo(() => ({
    clientSuccess: t.trashClientPermanentDeleteSuccess || (lang === "fr" ? "Pèlerin supprimé définitivement" : lang === "en" ? "Pilgrim permanently deleted" : "تم حذف المعتمر نهائيًا"),
    failure: t.trashPermanentDeleteFailed || (lang === "fr" ? "La suppression définitive a échoué. Réessayez ou vérifiez les enregistrements liés." : lang === "en" ? "Permanent deletion failed. Try again or check linked records." : "تعذر الحذف النهائي. حاول مرة أخرى أو تحقق من السجلات المرتبطة."),
    linkedFailure: t.trashPermanentDeleteLinkedRecordsFailed || (lang === "fr" ? "La suppression définitive a échoué car des enregistrements sont liés à ce pèlerin. Vérifiez les paiements ou les enregistrements liés puis réessayez." : lang === "en" ? "Permanent deletion failed because linked records still exist for this pilgrim. Check payments or linked records, then try again." : "تعذر الحذف النهائي لأن هناك سجلات مرتبطة بهذا المعتمر. تحقق من الدفعات أو السجلات المرتبطة ثم حاول مرة أخرى."),
    deleting: t.trashDeleting || (lang === "fr" ? "Suppression..." : lang === "en" ? "Deleting..." : "جاري الحذف..."),
    deletingProgress: (done, total) => {
      if (lang === "fr") return `Suppression de ${done} sur ${total}`;
      if (lang === "en") return `Deleting ${done} of ${total}`;
      return `جاري حذف ${done} من ${total}`;
    },
  }), [lang, t]);
  const [clientDeleteBlocksByClient, setClientDeleteBlocksByClient] = React.useState({});
  const [clientDeleteBlocksLoading, setClientDeleteBlocksLoading] = React.useState(false);
  const formatDate = React.useCallback((value) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }, [locale]);

  const deletedPrograms = store.deletedPrograms || [];
  const deletedClients = store.deletedClients || [];
  const deletedPayments = store.deletedPayments || [];
  const getClientPermanentDeleteBlockMap = store.getClientPermanentDeleteBlockMap;
  const trashLoading = Boolean(store.trashLoading);
  const trashLoaded = Boolean(store.trashLoaded);
  const trashError = store.trashError;
  const loadTrashData = store.loadTrashData;
  const trashDataLoading = trashLoading || invoicesLoading;

  React.useEffect(() => {
    if (trashLoaded || trashLoading || typeof loadTrashData !== "function") return undefined;
    let cancelled = false;
    loadTrashData().then((result) => {
      if (cancelled || !result?.error || !onToast) return;
      onToast(result.error.message || t.activityError || "Failed to load Trash", "error");
    });
    return () => { cancelled = true; };
  }, [loadTrashData, onToast, t.activityError, trashLoaded, trashLoading]);

  const refreshTrashedInvoices = React.useCallback(async ({ force = false } = {}) => {
    setInvoicesLoading(true);
    if (invoicesAreRemote) {
      const { data, error } = await (store.invoiceApi?.fetchTrashedFinalInvoices?.({ force }) || Promise.resolve({ data: [], error: null }));
      if (error) {
        if (onToast) onToast(error.message || "Failed to load trashed invoices", "error");
        setInvoicesLoading(false);
        return [];
      }
      setTrashedInvoices(data || []);
      setInvoicesLoading(false);
      return data || [];
    }
    const localInvoices = readSavedInvoices().filter((invoice) => invoice.status === "trashed");
    setTrashedInvoices(localInvoices);
    setInvoicesLoading(false);
    return localInvoices;
  }, [invoicesAreRemote, onToast, store.invoiceApi]);

  React.useEffect(() => {
    refreshTrashedInvoices();
  }, [refreshTrashedInvoices]);

  React.useEffect(() => {
    if (!filterOpen) return undefined;
    const handlePointer = (event) => {
      if (
        (filterRef.current && filterRef.current.contains(event.target))
        || (filterMenuRef.current && filterMenuRef.current.contains(event.target))
      ) return;
      setFilterOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setFilterOpen(false);
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [filterOpen]);

  React.useLayoutEffect(() => {
    if (!filterOpen || !filterButtonRef.current) return undefined;
    const updatePosition = () => {
      const rect = filterButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 220;
      const safeWidth = Math.min(width, window.innerWidth - 32);
      const preferredLeft = dir === "rtl" ? rect.right - safeWidth : rect.left;
      setFilterMenuStyle({
        top: rect.bottom + 8,
        left: Math.max(16, Math.min(preferredLeft, window.innerWidth - safeWidth - 16)),
        width: safeWidth,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [dir, filterOpen]);

  const programNameMap = React.useMemo(() => {
    const map = new Map();
    (store.programs || []).forEach((p) => map.set(p.id, p.name));
    deletedPrograms.forEach((p) => {
      if (!map.has(p.id)) map.set(p.id, p.name);
    });
    return map;
  }, [store.programs, deletedPrograms]);

  const clientNameMap = React.useMemo(() => {
    const map = new Map();
    [...(store.clients || []), ...deletedClients].forEach((client) => {
      if (!client?.id || map.has(client.id)) return;
      map.set(client.id, getClientDisplayName(client, client.name || client.id));
    });
    return map;
  }, [store.clients, deletedClients]);

  const clientsByBatch = React.useMemo(() => {
    const map = new Map();
    deletedClients.forEach((client) => {
      if (!client.deletedBatchId) return;
      map.set(client.deletedBatchId, (map.get(client.deletedBatchId) || 0) + 1);
    });
    return map;
  }, [deletedClients]);

  const allItems = React.useMemo(() => {
    const programItems = deletedPrograms.map((program) => ({
      key: `program-${program.id}`,
      id: program.id,
      type: "program",
      name: program.name || t.programs,
      subtitle: [
        program.departure ? `${formatDate(program.departure)}` : null,
        program.duration ? `${program.duration} ${lang === "fr" ? "jours" : lang === "en" ? "days" : "يوم"}` : null,
      ].filter(Boolean).join(" • "),
      deletedAt: program.deletedAt,
      batchId: program.deletedBatchId,
      linkedCount: program.deletedBatchId ? (clientsByBatch.get(program.deletedBatchId) || 0) : 0,
      meta: t.programs,
    }));
    const clientItems = deletedClients.map((client) => {
      const permanentDeleteBlock = clientDeleteBlocksByClient[client.id] || null;
      return {
        permanentDeleteBlock,
        permanentDeleteCheckPending: clientDeleteBlocksLoading && !permanentDeleteBlock,
        key: `client-${client.id}`,
        id: client.id,
        type: "client",
        name: client.name || t.fullName,
        subtitle: [client.phone, client.city].filter(Boolean).join(" • "),
        deletedAt: client.deletedAt,
        batchId: client.deletedBatchId,
        programName: programNameMap.get(client.programId),
        meta: t.clients,
      };
    });
    const invoiceItems = trashedInvoices.map((invoice) => ({
      key: `invoice-${invoice.id}`,
      id: invoice.id,
      type: "invoice",
      name: invoice.recipientType === "company"
        ? (invoice.recipientSnapshot?.companyName || invoice.invoiceDisplayNumber)
        : (invoice.recipientSnapshot?.clientName || invoice.recipientSnapshot?.name || invoice.invoiceDisplayNumber),
      subtitle: [
        invoice.invoiceDisplayNumber,
        invoice.programSnapshot?.programName,
        invoice.amountSnapshot?.total ? formatCurrency(invoice.amountSnapshot.total, lang) : null,
      ].filter(Boolean).join(" • "),
      deletedAt: invoice.trashedAt || invoice.deletedAt || invoice.issueDate,
      meta: t.trashFilter_invoices || "Invoices",
    }));
    const paymentItems = deletedPayments.map((payment) => ({
      key: `payment-${payment.id}`,
      id: payment.id,
      type: "payment",
      name: payment.receiptNo || payment.receipt_no || payment.receiptNumber || payment.receipt_number || paymentLabel,
      subtitle: [
        clientNameMap.get(payment.clientId || payment.client_id),
        Number.isFinite(Number(payment.amount)) ? formatCurrency(Number(payment.amount), lang) : null,
        payment.method || payment.paymentMethod || payment.payment_method,
      ].filter(Boolean).join(" • "),
      deletedAt: payment.trashedAt || payment.trashed_at || payment.deletedAt || payment.deleted_at || payment.date,
      meta: paymentLabel,
    }));
    const merged = [...programItems, ...clientItems, ...invoiceItems, ...paymentItems];
    merged.sort((a, b) => {
      const aDate = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
      const bDate = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
      return bDate - aDate;
    });
    return merged;
  }, [deletedPrograms, deletedClients, deletedPayments, trashedInvoices, clientsByBatch, programNameMap, clientNameMap, clientDeleteBlocksByClient, clientDeleteBlocksLoading, formatDate, lang, paymentLabel, t.programs, t.clients, t.fullName, t.trashFilter_invoices]);

  const visibleItems = React.useMemo(() => {
    if (filter === "programs") return allItems.filter((item) => item.type === "program");
    if (filter === "clients") return allItems.filter((item) => item.type === "client");
    if (filter === "invoices") return allItems.filter((item) => item.type === "invoice");
    if (filter === "payments") return allItems.filter((item) => item.type === "payment");
    return allItems;
  }, [allItems, filter]);

  const totalItems = visibleItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  React.useEffect(() => {
    if (currentPage <= totalPages) return;
    setCurrentPage(totalPages);
    setSelection({});
  }, [currentPage, totalPages]);

  const paginatedItems = React.useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return visibleItems.slice(startIndex, endIndex);
  }, [safePage, pageSize, visibleItems]);

  const selectedItems = React.useMemo(
    () => paginatedItems.filter((item) => selection[item.key]),
    [paginatedItems, selection]
  );
  const selectedCount = selectedItems.length;
  const selectedBlockedClientItems = React.useMemo(
    () => selectedItems.filter((item) => item.type === "client" && item.permanentDeleteBlock?.blocked),
    [selectedItems]
  );
  const selectedVisibleCount = paginatedItems.filter((item) => selection[item.key]).length;
  const allVisibleSelected = paginatedItems.length > 0 && selectedVisibleCount === paginatedItems.length;

  const clientDeleteGuardKey = React.useMemo(() => {
    const ids = new Set();
    paginatedItems.forEach((item) => {
      if (item.type === "client" && item.id) ids.add(item.id);
    });
    selectedItems.forEach((item) => {
      if (item.type === "client" && item.id) ids.add(item.id);
    });
    return Array.from(ids).join("|");
  }, [paginatedItems, selectedItems]);

  React.useEffect(() => {
    let cancelled = false;
    const clientIds = clientDeleteGuardKey ? clientDeleteGuardKey.split("|").filter(Boolean) : [];
    if (!clientIds.length || typeof getClientPermanentDeleteBlockMap !== "function") {
      if (!clientIds.length) setClientDeleteBlocksByClient({});
      setClientDeleteBlocksLoading(false);
      return undefined;
    }
    const cachedEntries = clientIds
      .filter((id) => clientPreflightCacheRef.current.has(id))
      .map((id) => [id, clientPreflightCacheRef.current.get(id)]);
    if (cachedEntries.length) {
      setClientDeleteBlocksByClient((prev) => ({ ...prev, ...Object.fromEntries(cachedEntries) }));
    }
    const missingClientIds = clientIds.filter((id) => !clientPreflightCacheRef.current.has(id));
    if (!missingClientIds.length) {
      setClientDeleteBlocksLoading(false);
      return undefined;
    }
    setClientDeleteBlocksLoading(true);
    getClientPermanentDeleteBlockMap(missingClientIds)
      .then((blocks) => {
        if (cancelled) return;
        const entries = Object.fromEntries(blocks || []);
        Object.entries(entries).forEach(([id, block]) => {
          clientPreflightCacheRef.current.set(id, block);
        });
        setClientDeleteBlocksByClient((prev) => ({ ...prev, ...entries }));
      })
      .catch((error) => {
        console.error("[Trash] Failed to check linked records:", error);
        if (!cancelled) {
          const entries = Object.fromEntries(missingClientIds.map((id) => [id, {
            clientId: id,
            blocked: false,
            code: "CHECK_UNAVAILABLE",
            precheckUnavailable: true,
          }]));
          Object.entries(entries).forEach(([id, block]) => {
            clientPreflightCacheRef.current.set(id, block);
          });
          setClientDeleteBlocksByClient((prev) => ({ ...prev, ...entries }));
        }
      })
      .finally(() => {
        if (!cancelled) setClientDeleteBlocksLoading(false);
      });
    return () => { cancelled = true; };
  }, [clientDeleteGuardKey, getClientPermanentDeleteBlockMap]);

  const toggleItem = React.useCallback((key) => {
    setSelection((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  }, []);

  const toggleAllVisible = React.useCallback(() => {
    setSelection((prev) => {
      const next = { ...prev };
      if (allVisibleSelected) {
        paginatedItems.forEach((item) => { delete next[item.key]; });
      } else {
        paginatedItems.forEach((item) => { next[item.key] = true; });
      }
      return next;
    });
  }, [allVisibleSelected, paginatedItems]);

  const selectionPayload = React.useMemo(() => ({
    programIds: selectedItems.filter((item) => item.type === "program").map((item) => item.id),
    clientIds: selectedItems.filter((item) => item.type === "client").map((item) => item.id),
    invoiceIds: selectedItems.filter((item) => item.type === "invoice").map((item) => item.id),
    paymentIds: selectedItems.filter((item) => item.type === "payment").map((item) => item.id),
  }), [selectedItems]);
  const selectedClientPreflightPending = React.useMemo(() => (
    selectionPayload.clientIds.some((id) => !clientDeleteBlocksByClient[id] && !clientPreflightCacheRef.current.has(id)) && clientDeleteBlocksLoading
  ), [clientDeleteBlocksByClient, clientDeleteBlocksLoading, selectionPayload.clientIds]);

  const closeConfirm = React.useCallback(() => {
    if (deleteInProgress) return;
    setConfirmOpen(false);
  }, [deleteInProgress]);

  const handleRestore = React.useCallback(async () => {
    if (!selectedCount) return;
    if ((selectionPayload.programIds.length || selectionPayload.clientIds.length) && typeof store.restoreTrashItems === "function") {
      store.restoreTrashItems(selectionPayload);
    }
    if (invoicesAreRemote && selectionPayload.invoiceIds.length && store.invoiceApi?.restoreFinalInvoice) {
      const responses = await Promise.all(selectionPayload.invoiceIds.map((id) => store.invoiceApi.restoreFinalInvoice(id)));
      const error = responses.find((response) => response?.error)?.error;
      if (error) {
        if (onToast) onToast(error.message || "Restore failed", "error");
        return;
      }
      await refreshTrashedInvoices({ force: true });
    }
    if (!invoicesAreRemote && selectionPayload.invoiceIds.length) {
      selectionPayload.invoiceIds.forEach((id) => restoreSavedInvoiceSnapshot(id));
      setTrashedInvoices(readSavedInvoices().filter((invoice) => invoice.status === "trashed"));
    }
    if (selectionPayload.paymentIds.length && typeof store.restorePaymentFromTrash === "function") {
      await Promise.all(selectionPayload.paymentIds.map((id) => store.restorePaymentFromTrash(id)));
    }
    setSelection({});
    if (onToast) onToast(t.restoreSuccess || "Restored", "success");
  }, [invoicesAreRemote, refreshTrashedInvoices, selectedCount, selectionPayload, store, onToast, t.restoreSuccess]);

  const handleDelete = React.useCallback(() => {
    if (!selectedCount || deleteInProgress || selectedClientPreflightPending) return;
    setConfirmOpen(true);
  }, [deleteInProgress, selectedClientPreflightPending, selectedCount]);

  const confirmDelete = React.useCallback(async () => {
    if (!selectedCount || deleteInProgress) return;
    setDeleteInProgress(true);
    setDeleteProgress({ done: 0, total: selectionPayload.clientIds.length });
    try {
      let deletePayload = selectionPayload;
      let blockedClientIds = [];
      let failedClientIds = [];
      let selectedClientBlockMap = new Map(
        selectionPayload.clientIds
          .map((id) => [id, clientDeleteBlocksByClient[id] || clientPreflightCacheRef.current.get(id)])
          .filter(([, block]) => Boolean(block))
      );

      const missingClientIds = selectionPayload.clientIds.filter((id) => !selectedClientBlockMap.has(id));
      if (missingClientIds.length && typeof getClientPermanentDeleteBlockMap === "function") {
        try {
          const blockMap = await getClientPermanentDeleteBlockMap(missingClientIds);
          const blockEntries = Object.fromEntries(blockMap || []);
          Object.entries(blockEntries).forEach(([id, block]) => {
            clientPreflightCacheRef.current.set(id, block);
          });
          selectedClientBlockMap = new Map([...selectedClientBlockMap, ...(blockMap || new Map())]);
          setClientDeleteBlocksByClient((prev) => ({ ...prev, ...blockEntries }));
        } catch (error) {
          console.error("[Trash] Permanent delete linked-record check failed:", error);
          if (onToast) onToast(error.message || permanentDeleteText.failure, "error");
          setConfirmOpen(false);
          return;
        }
      }
      blockedClientIds = selectionPayload.clientIds.filter((id) => selectedClientBlockMap.get(id)?.blocked);
      deletePayload = {
        ...selectionPayload,
        clientIds: selectionPayload.clientIds.filter((id) => !selectedClientBlockMap.get(id)?.blocked),
        clientPreflightBlocks: Object.fromEntries(selectedClientBlockMap),
      };

      let purgeResult = null;
      if ((deletePayload.programIds.length || deletePayload.clientIds.length) && typeof store.purgeTrashItems === "function") {
        let result = null;
        try {
          result = await store.purgeTrashItems({
            ...deletePayload,
            onProgress: ({ done = 0, total = 0 } = {}) => {
              setDeleteProgress({ done, total });
            },
          });
        } catch (error) {
          console.error("[Trash] Permanent delete payment check failed:", error);
          if (onToast) onToast(error.message || "Delete failed", "error");
          setConfirmOpen(false);
          return;
        }
        if (result?.error) {
          const technicalMessage = String(result.error.message || result.error.details || "");
          const isPaymentBlockError = result.error.code === "ACTIVE_LINKED_PAYMENTS" || result.error.code === "ACTIVE_PAYMENTS";
          const isHiddenPaymentBlockError = result.error.code === "LINKED_EXTERNAL_PAYMENTS" || result.error.code === "LINKED_PAYMENT_RECORDS";
          const isInvoiceBlockError = result.error.code === "ACTIVE_LINKED_INVOICES";
          const isHiddenInvoiceBlockError = result.error.code === "LINKED_EXTERNAL_INVOICES";
          const isLinkedRecordError = result.error.code === "LINKED_RECORDS"
            || result.error.code === "UNKNOWN_LINKED_RECORDS"
            || result.error.code === "LINKED_INVOICES"
            || result.error.code === "LINKED_FINANCIAL_RECORDS"
            || result.error.code === "ACTIVE_LINKED_FINANCIAL_RECORDS"
            || result.error.code === "23503"
            || /foreign key|violates foreign key|constraint/i.test(technicalMessage);
          if (onToast) {
            onToast(
              isPaymentBlockError
                ? paymentGuardText.activePayments
                : isHiddenPaymentBlockError
                  ? paymentGuardText.hiddenPayments
                : isInvoiceBlockError
                  ? paymentGuardText.activeInvoices
                  : isHiddenInvoiceBlockError
                    ? paymentGuardText.hiddenInvoices
                    : (isLinkedRecordError ? permanentDeleteText.linkedFailure : permanentDeleteText.failure),
              "error"
            );
          }
          setConfirmOpen(false);
          return;
        }
        purgeResult = result;
        if (result?.clientBlocks) {
          Object.entries(result.clientBlocks).forEach(([id, block]) => {
            clientPreflightCacheRef.current.set(id, block);
          });
          setClientDeleteBlocksByClient((prev) => ({ ...prev, ...result.clientBlocks }));
        }
        blockedClientIds = Array.from(new Set([...blockedClientIds, ...(result?.blockedClientIds || [])]));
        failedClientIds = Array.from(new Set([...(result?.failedClientIds || [])]));
        if (invoicesAreRemote && Number(result?.cleanup?.cleanedInvoicesCount || 0) > 0) {
          await refreshTrashedInvoices({ force: true });
        }
      }
      if (invoicesAreRemote && deletePayload.invoiceIds.length && store.invoiceApi?.deleteFinalInvoice) {
        const responses = await Promise.all(deletePayload.invoiceIds.map((id) => store.invoiceApi.deleteFinalInvoice(id)));
        const error = responses.find((response) => response?.error)?.error;
        if (error) {
          if (onToast) onToast(error.message || "Delete failed", "error");
          return;
        }
        await refreshTrashedInvoices({ force: true });
      }
      if (!invoicesAreRemote && deletePayload.invoiceIds.length) {
        deletePayload.invoiceIds.forEach((id) => deleteSavedInvoiceSnapshot(id));
        setTrashedInvoices(readSavedInvoices().filter((invoice) => invoice.status === "trashed"));
      }
      if (deletePayload.paymentIds.length && typeof store.deletePaymentFromTrash === "function") {
        await Promise.all(deletePayload.paymentIds.map((id) => store.deletePaymentFromTrash(id)));
      }
      const blockedOrFailedClientIds = Array.from(new Set([...blockedClientIds, ...failedClientIds]));
      (purgeResult?.deletedClientIds || []).forEach((id) => {
        clientPreflightCacheRef.current.delete(id);
      });
      setSelection(Object.fromEntries(blockedOrFailedClientIds.map((id) => [`client-${id}`, true])));
      setConfirmOpen(false);
      if (onToast) {
        const deletedCount = (purgeResult?.deletedClientIds?.length || 0)
          + deletePayload.programIds.length
          + deletePayload.invoiceIds.length
          + deletePayload.paymentIds.length;
        const blockedCount = blockedOrFailedClientIds.length;
        const cleanupCount = Number(purgeResult?.cleanup?.cleanedPaymentsCount || 0)
          + Number(purgeResult?.cleanup?.cleanedInvoicesCount || 0)
          + Number(purgeResult?.cleanup?.cleanedRoomingAssignmentsCount || 0)
          + Number(purgeResult?.cleanup?.cleanedNotificationsCount || 0)
          + Number(purgeResult?.cleanup?.cleanedRepresentationLinksCount || 0)
          + Number(purgeResult?.cleanup?.cleanedBadgePhotosCount || 0);
        if (deletedCount && blockedCount) {
          onToast(formatTrashCountMessage(paymentGuardText.partial, { deleted: deletedCount, failed: blockedCount, blocked: blockedCount }), "warning");
        } else if (blockedCount) {
          onToast(formatTrashCountMessage(paymentGuardText.blockedOnly, { failed: blockedCount, blocked: blockedCount }), "error");
        } else if (deletedCount && cleanupCount) {
          onToast(formatTrashCountMessage(paymentGuardText.successWithCleanup, { deleted: deletedCount }), "success");
        } else {
          const onlyClients = selectedCount > 0
            && deletePayload.clientIds.length === selectedCount
            && !deletePayload.programIds.length
            && !deletePayload.invoiceIds.length
            && !deletePayload.paymentIds.length;
          onToast(onlyClients ? permanentDeleteText.clientSuccess : (t.deleteSuccess || "Deleted"), "success");
        }
      }
    } finally {
      setDeleteInProgress(false);
      setDeleteProgress({ done: 0, total: 0 });
    }
  }, [clientDeleteBlocksByClient, deleteInProgress, getClientPermanentDeleteBlockMap, invoicesAreRemote, refreshTrashedInvoices, selectedCount, selectionPayload, store, onToast, paymentGuardText, permanentDeleteText, t.deleteSuccess]);

  const handleFilterChange = (nextFilter) => {
    setFilter(nextFilter);
    setCurrentPage(1);
    setSelection({});
  };

  const changePage = React.useCallback((nextPage) => {
    const boundedPage = Math.max(1, Math.min(totalPages, nextPage));
    setCurrentPage(boundedPage);
    setSelection({});
  }, [totalPages]);

  const handlePageSizeChange = React.useCallback((event) => {
    setPageSize(Number(event.target.value) || DEFAULT_PAGE_SIZE);
    setCurrentPage(1);
    setSelection({});
  }, []);

  const paginationText = React.useMemo(() => {
    if (lang === "fr") {
      return {
        previous: "Précédent",
        next: "Suivant",
        page: "Page",
        range: (start, end, total) => `Afficher ${start} - ${end} sur ${total}`,
        showPerPage: (size) => `Afficher ${size} par page`,
      };
    }
    if (lang === "en") {
      return {
        previous: "Previous",
        next: "Next",
        page: "Page",
        range: (start, end, total) => `Showing ${start} - ${end} of ${total}`,
        showPerPage: (size) => `Show ${size} per page`,
      };
    }
    return {
      previous: "السابق",
      next: "التالي",
      page: "صفحة",
      range: (start, end, total) => `عرض ${start} - ${end} من ${total}`,
      showPerPage: (size) => `عرض ${size} في الصفحة`,
    };
  }, [lang]);

  const showPaginationControls = totalItems > 0 && (totalPages > 1 || totalItems > Math.min(...PAGE_SIZE_OPTIONS));
  const pageStart = totalItems ? ((safePage - 1) * pageSize) + 1 : 0;
  const pageEnd = Math.min(totalItems, safePage * pageSize);
  const pageLabel = `${paginationText.page} ${safePage} / ${totalPages}`;
  const rangeLabel = totalItems ? paginationText.range(pageStart, pageEnd, totalItems) : "";

  const selectedLabel = (t.trashSelectedCount || "{count}").replace("{count}", selectedCount);
  const deleteProgressLabel = deleteInProgress && deleteProgress.total > 1
    ? permanentDeleteText.deletingProgress(Math.min(deleteProgress.done, deleteProgress.total), deleteProgress.total)
    : permanentDeleteText.deleting;
  const confirmCopy = React.useMemo(() => {
    const singleClient = selectedCount === 1 && selectionPayload.clientIds.length === 1;
    const fallback = trashPermanentConfirmMessages(lang, singleClient);
    const body = singleClient
      ? (t.trashPermanentDeleteSingleConfirmBody || fallback.body)
      : (t.trashPermanentDeleteBulkConfirmBody || fallback.body);
    return {
      title: singleClient
        ? (t.trashPermanentDeleteSingleConfirmTitle || fallback.title)
        : (t.trashPermanentDeleteBulkConfirmTitle || fallback.title),
      body,
    };
  }, [lang, selectedCount, selectionPayload.clientIds.length, t]);
  const getFilterText = React.useCallback((item) => (
    item.id === "payments" ? paymentLabel : (t[item.key] || item.id)
  ), [paymentLabel, t]);
  const selectedFilterLabel = FILTERS.find((item) => item.id === filter)?.key;
  const selectedFilter = FILTERS.find((item) => item.id === filter) || FILTERS[0];
  const selectedFilterText = getFilterText(selectedFilter) || t[selectedFilterLabel] || t.trashFilter_all;
  const filterMenu = filterOpen && filterMenuStyle && typeof document !== "undefined"
    ? createPortal(
      <div
        ref={filterMenuRef}
        style={{
          position: "fixed",
          top: filterMenuStyle.top,
          left: filterMenuStyle.left,
          width: filterMenuStyle.width,
          padding: 6,
          borderRadius: 14,
          background: "var(--rukn-bg-card)",
          border: "1px solid var(--rukn-border-soft)",
          boxShadow: "0 20px 44px rgba(15,23,42,.22)",
          zIndex: 15000,
          display: "grid",
          gap: 3,
        }}
      >
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                handleFilterChange(f.id);
                setFilterOpen(false);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                textAlign: "start",
                border: "none",
                background: active ? "var(--rukn-gold-dim)" : "transparent",
                color: active ? "var(--rukn-gold)" : "var(--rukn-text)",
                borderRadius: 10,
                padding: "9px 10px",
                fontSize: 12,
                fontWeight: active ? 800 : 700,
                cursor: "pointer",
                fontFamily: "'Cairo',sans-serif",
              }}
            >
              <span>{getFilterText(f)}</span>
              {active && <Check size={14} strokeWidth={2.2} />}
            </button>
          );
        })}
      </div>,
      document.body
    )
    : null;

  return (
    <div style={{ padding: "22px 24px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
      <GlassCard style={{ padding: "13px 14px", display: "grid", gap: 11, overflow: "visible" }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 800, color: "var(--rukn-gold)", lineHeight: 1.2 }}>{t.trash}</h1>
          <p style={{ color: "var(--rukn-text-muted)", fontSize: 12, marginTop: 3, lineHeight: 1.55 }}>{t.trashSubtitle}</p>
        </div>

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div ref={filterRef}>
              <button
                ref={filterButtonRef}
                type="button"
                onClick={() => setFilterOpen((open) => !open)}
                aria-expanded={filterOpen}
                title={t.filterLabel || "Filter"}
                style={{
                  height: 34,
                  minWidth: 166,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "0 11px",
                  borderRadius: 999,
                  border: "1px solid var(--rukn-border-soft)",
                  background: "var(--rukn-bg-card)",
                  color: "var(--rukn-text)",
                  boxShadow: filterOpen ? "0 0 0 3px rgba(212,175,55,.13)" : "0 8px 22px rgba(15,23,42,.06)",
                  cursor: "pointer",
                  fontFamily: "'Cairo',sans-serif",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  <Filter size={14} color="var(--rukn-gold)" strokeWidth={2.1} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedFilterText}</span>
                </span>
                <ChevronDown size={14} color="var(--rukn-text-muted)" strokeWidth={2.1} style={{ transform: filterOpen ? "rotate(180deg)" : "none", transition: "transform .18s ease" }} />
              </button>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--rukn-text)", fontSize: 12.5, fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleAllVisible}
                style={{ width: 17, height: 17 }}
              />
              {t.selectAllCount ? t.selectAllCount.replace("{count}", paginatedItems.length) : t.selectAll}
            </label>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--rukn-text-muted)", fontWeight: 700 }}>{selectedLabel}</span>
            <Button
              variant="success"
              size="sm"
              icon="restore"
              disabled={!selectedCount || deleteInProgress}
              onClick={handleRestore}
            >
              {t.trashRestoreSelected}
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon="trash"
              disabled={!selectedCount || deleteInProgress || selectedClientPreflightPending}
              onClick={handleDelete}
              title={selectedClientPreflightPending ? paymentGuardText.checking : selectedBlockedClientItems.length ? paymentGuardText.blocked : undefined}
            >
              {t.trashDeleteSelected}
            </Button>
          </div>
        </div>
      </GlassCard>
      {filterMenu}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {trashDataLoading ? (
          <GlassCard style={{ padding: 24, textAlign: "center", color: "var(--rukn-text-muted)", fontSize: 13, fontWeight: 700 }}>
            {t.loading || "Loading..."}
          </GlassCard>
        ) : trashError ? (
          <GlassCard style={{ padding: 24, textAlign: "center", color: "var(--rukn-danger)", fontSize: 13, fontWeight: 700 }}>
            {trashError.message || t.activityError || "Failed to load Trash"}
          </GlassCard>
        ) : totalItems === 0 ? (
          <GlassCard style={{ padding: 24 }}>
            <EmptyState icon="trash" title={t.trashEmptyTitle} sub={t.trashEmptySubtitle} />
          </GlassCard>
        ) : (
          paginatedItems.map((item) => {
            const checked = !!selection[item.key];
            const isProgram = item.type === "program";
            const isInvoice = item.type === "invoice";
            const isPayment = item.type === "payment";
            const badgeColor = isInvoice ? "#60a5fa" : isPayment ? "#f59e0b" : isProgram ? tc.gold : tc.greenLight;
            const badgeBorder = isInvoice ? "rgba(96,165,250,.35)" : isPayment ? "rgba(245,158,11,.35)" : isProgram ? "rgba(212,175,55,.4)" : "rgba(34,197,94,.4)";
            const badgeBackground = isInvoice ? "rgba(96,165,250,.1)" : isPayment ? "rgba(245,158,11,.1)" : isProgram ? "rgba(212,175,55,.12)" : "rgba(34,197,94,.1)";
            const badgeText = isInvoice ? (t.trashFilter_invoices || "Invoices") : isPayment ? paymentLabel : isProgram ? t.programs : t.clients;
            const clientDeleteBlock = item.permanentDeleteBlock;
            const clientDeleteBlocked = Boolean(clientDeleteBlock?.blocked);
            return (
              <GlassCard
                key={item.key}
                style={{
                  padding: "13px 14px",
                  display: "grid",
                  gap: 10,
                  background: checked ? "linear-gradient(135deg, rgba(212,175,55,.1), rgba(212,175,55,.04))" : "var(--rukn-bg-card)",
                  border: checked ? "1px solid rgba(212,175,55,.34)" : "1px solid var(--rukn-border-soft)",
                  boxShadow: checked ? "0 14px 34px rgba(212,175,55,.08)" : "0 10px 30px rgba(15,23,42,.07)",
                  borderRadius: 14,
                }}
              >
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "auto minmax(0,1fr) auto",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleItem(item.key)}
                    style={{ width: 18, height: 18 }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: 11.5,
                        color: badgeColor,
                        border: `1px solid ${badgeBorder}`,
                        borderRadius: 999,
                        padding: "2px 8px",
                        background: badgeBackground,
                        fontWeight: 800,
                        lineHeight: 1.45,
                      }}>
                        {badgeText}
                      </span>
                      <strong style={{ fontSize: 15, color: "var(--rukn-text)", lineHeight: 1.35 }}>{item.name}</strong>
                    </div>
                    {item.subtitle && (
                      <p style={{ marginTop: 4, fontSize: 12.5, color: "var(--rukn-text-muted)", lineHeight: 1.55 }}>{item.subtitle}</p>
                    )}
                    {item.programName && (
                      <p style={{ marginTop: 2, fontSize: 12, color: "var(--rukn-text-muted)" }}>
                        {item.programName}
                      </p>
                    )}
                    {item.type === "client" && (
                      <p style={{
                        marginTop: 2,
                        fontSize: 12,
                        color: clientDeleteBlocked ? "var(--rukn-danger)" : "var(--rukn-text-muted)",
                        fontWeight: clientDeleteBlocked ? 800 : 700,
                      }}>
                        {item.permanentDeleteCheckPending
                          ? paymentGuardText.checking
                          : getClientDeleteBlockLabel(clientDeleteBlock, paymentGuardText)}
                      </p>
                    )}
                    {isProgram && item.linkedCount > 0 && (
                      <p style={{ marginTop: 2, fontSize: 12, color: "var(--rukn-text-muted)" }}>
                        {t.trashClientsLinked.replace("{count}", item.linkedCount)}
                      </p>
                    )}
                  </div>
                  <div style={{
                    textAlign: dir === "rtl" ? "left" : "right",
                    minWidth: 126,
                    padding: "5px 0",
                  }}>
                    <p style={{ fontSize: 11, color: "var(--rukn-text-muted)", fontWeight: 700 }}>{t.trashDeletedOn}</p>
                    <p style={{ fontSize: 13, fontWeight: 800, color: "var(--rukn-text)", marginTop: 3 }}>{formatDate(item.deletedAt)}</p>
                    {item.batchId && (
                      <p style={{ fontSize: 11, color: "var(--rukn-text-muted)" }}>
                        #{item.batchId.slice(0, 8)}
                      </p>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>

      {showPaginationControls && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          flexWrap: "wrap",
          paddingTop: 4,
        }}>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            aria-label={paginationText.showPerPage(pageSize)}
            style={{
              height: 34,
              borderRadius: 999,
              border: "1px solid var(--rukn-border-soft)",
              background: "var(--rukn-bg-card)",
              color: "var(--rukn-text)",
              padding: "0 12px",
              fontSize: 12,
              fontWeight: 800,
              fontFamily: "'Cairo',sans-serif",
              cursor: "pointer",
            }}
          >
            <option value={DEFAULT_PAGE_SIZE} hidden>
              {paginationText.showPerPage(DEFAULT_PAGE_SIZE)}
            </option>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {paginationText.showPerPage(size)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => changePage(safePage - 1)}
            disabled={safePage === 1}
            style={{
              height: 34,
              padding: "0 14px",
              borderRadius: 999,
              border: "1px solid var(--rukn-border-soft)",
              background: "var(--rukn-bg-card)",
              color: safePage === 1 ? "var(--rukn-text-muted)" : "var(--rukn-gold)",
              fontSize: 12,
              fontWeight: 800,
              fontFamily: "'Cairo',sans-serif",
              cursor: safePage === 1 ? "default" : "pointer",
              opacity: safePage === 1 ? 0.55 : 1,
            }}
          >
            {paginationText.previous}
          </button>
          <div style={{
            minWidth: 140,
            display: "grid",
            gap: 2,
            textAlign: "center",
            color: "var(--rukn-text-muted)",
            fontSize: 12,
            fontWeight: 800,
            lineHeight: 1.35,
          }}>
            <span>{pageLabel}</span>
            {rangeLabel && <span style={{ fontSize: 11, fontWeight: 700 }}>{rangeLabel}</span>}
          </div>
          <button
            type="button"
            onClick={() => changePage(safePage + 1)}
            disabled={safePage === totalPages}
            style={{
              height: 34,
              padding: "0 14px",
              borderRadius: 999,
              border: "1px solid var(--rukn-border-soft)",
              background: "var(--rukn-bg-card)",
              color: safePage === totalPages ? "var(--rukn-text-muted)" : "var(--rukn-gold)",
              fontSize: 12,
              fontWeight: 800,
              fontFamily: "'Cairo',sans-serif",
              cursor: safePage === totalPages ? "default" : "pointer",
              opacity: safePage === totalPages ? 0.55 : 1,
            }}
          >
            {paginationText.next}
          </button>
        </div>
      )}

      <Modal
        open={confirmOpen}
        onClose={closeConfirm}
        title={confirmCopy.title}
        width={520}
      >
        <div style={{ display: "grid", gap: 10 }}>
          {String(confirmCopy.body || "").split("\n").map((line, index) => (
            <p key={`${line}-${index}`} style={{
              fontSize: index === 0 ? 14.5 : 13,
              color: index === 0 ? "var(--rukn-danger)" : "var(--rukn-text)",
              fontWeight: index === 0 ? 800 : 700,
              lineHeight: 1.65,
              margin: 0,
            }}>
              {line}
            </p>
          ))}
          {deleteInProgress && deleteProgress.total > 1 && (
            <p style={{
              fontSize: 13,
              color: "var(--rukn-gold)",
              fontWeight: 800,
              lineHeight: 1.65,
              margin: 0,
            }}>
              {deleteProgressLabel}
            </p>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 28 }}>
          <Button variant="ghost" onClick={closeConfirm} disabled={deleteInProgress}>
            {t.trashCancel || t.cancel}
          </Button>
          <Button variant="danger" icon="trash" onClick={confirmDelete} disabled={deleteInProgress}>
            {deleteInProgress ? deleteProgressLabel : t.trashDeleteSelected}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
