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
      allowed: "Aucun paiement actif lié — suppression définitive possible",
      blocked: "Paiements enregistrés liés — suppression définitive impossible",
    };
  }
  if (lang === "en") {
    return {
      block: "This pilgrim cannot be permanently deleted because they still have saved payments. Delete the payments first if you are sure.",
      allowed: "No active linked payments — permanent deletion allowed",
      blocked: "Saved linked payments exist — permanent deletion blocked",
    };
  }
  return {
    block: "لا يمكن حذف هذا المعتمر نهائيًا لأنه يحتوي على دفعات محفوظة. احذف الدفعات أولًا إذا كنت متأكدًا.",
    allowed: "لا توجد دفعات نشطة مرتبطة — يمكن الحذف النهائي",
    blocked: "توجد دفعات محفوظة مرتبطة — لا يمكن الحذف النهائي",
  };
};

export default function TrashPage({ store, onToast }) {
  const { t, lang, dir } = useLang();
  const invoicesAreRemote = Boolean(store.invoiceApi?.isRemote);
  const [filter, setFilter] = React.useState("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [selection, setSelection] = React.useState({});
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [trashedInvoices, setTrashedInvoices] = React.useState(() => (
    invoicesAreRemote ? [] : readSavedInvoices().filter((invoice) => invoice.status === "trashed")
  ));
  const filterRef = React.useRef(null);
  const filterButtonRef = React.useRef(null);
  const filterMenuRef = React.useRef(null);
  const [filterMenuStyle, setFilterMenuStyle] = React.useState(null);

  const locale = lang === "fr" ? "fr-FR" : lang === "en" ? "en-US" : "ar-MA";
  const paymentLabel = lang === "fr" ? "Paiements" : lang === "en" ? "Payments" : "الدفعات";
  const paymentGuardText = React.useMemo(() => {
    const fallback = trashPaymentMessages(lang);
    return {
      block: t.trashClientDeleteBlockedPayments || fallback.block,
      allowed: t.trashClientNoLinkedPayments || fallback.allowed,
      blocked: t.trashClientHasLinkedPayments || fallback.blocked,
    };
  }, [lang, t]);
  const permanentDeleteText = React.useMemo(() => ({
    clientSuccess: t.trashClientPermanentDeleteSuccess || (lang === "fr" ? "Pèlerin supprimé définitivement" : lang === "en" ? "Pilgrim permanently deleted" : "تم حذف المعتمر نهائيًا"),
    failure: t.trashPermanentDeleteFailed || (lang === "fr" ? "La suppression définitive a échoué. Réessayez ou vérifiez les enregistrements liés." : lang === "en" ? "Permanent deletion failed. Try again or check linked records." : "تعذر الحذف النهائي. حاول مرة أخرى أو تحقق من السجلات المرتبطة."),
    linkedFailure: t.trashPermanentDeleteLinkedRecordsFailed || (lang === "fr" ? "La suppression définitive a échoué car des enregistrements sont liés à ce pèlerin. Vérifiez les paiements ou les enregistrements liés puis réessayez." : lang === "en" ? "Permanent deletion failed because linked records still exist for this pilgrim. Check payments or linked records, then try again." : "تعذر الحذف النهائي لأن هناك سجلات مرتبطة بهذا المعتمر. تحقق من الدفعات أو السجلات المرتبطة ثم حاول مرة أخرى."),
  }), [lang, t]);
  const [activePaymentCountsByClient, setActivePaymentCountsByClient] = React.useState({});
  const formatDate = React.useCallback((value) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }, [locale]);

  const deletedPrograms = store.deletedPrograms || [];
  const deletedClients = store.deletedClients || [];
  const deletedPayments = store.deletedPayments || [];
  const getActivePaymentCountsForClientIds = store.getActivePaymentCountsForClientIds;

  const refreshTrashedInvoices = React.useCallback(async () => {
    if (invoicesAreRemote) {
      const { data, error } = await (store.invoiceApi?.fetchTrashedFinalInvoices?.() || Promise.resolve({ data: [], error: null }));
      if (error) {
        if (onToast) onToast(error.message || "Failed to load trashed invoices", "error");
        return [];
      }
      setTrashedInvoices(data || []);
      return data || [];
    }
    const localInvoices = readSavedInvoices().filter((invoice) => invoice.status === "trashed");
    setTrashedInvoices(localInvoices);
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
    const clientItems = deletedClients.map((client) => ({
      activePaymentCount: Number(activePaymentCountsByClient[client.id] || 0),
      key: `client-${client.id}`,
      id: client.id,
      type: "client",
      name: client.name || t.fullName,
      subtitle: [client.phone, client.city].filter(Boolean).join(" • "),
      deletedAt: client.deletedAt,
      batchId: client.deletedBatchId,
      programName: programNameMap.get(client.programId),
      meta: t.clients,
    }));
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
  }, [deletedPrograms, deletedClients, deletedPayments, trashedInvoices, clientsByBatch, programNameMap, clientNameMap, activePaymentCountsByClient, formatDate, lang, paymentLabel, t.programs, t.clients, t.fullName, t.trashFilter_invoices]);

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
    () => selectedItems.filter((item) => item.type === "client" && Number(item.activePaymentCount || 0) > 0),
    [selectedItems]
  );
  const selectedVisibleCount = paginatedItems.filter((item) => selection[item.key]).length;
  const allVisibleSelected = paginatedItems.length > 0 && selectedVisibleCount === paginatedItems.length;

  const paymentCheckClientKey = React.useMemo(() => {
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
    const clientIds = paymentCheckClientKey ? paymentCheckClientKey.split("|").filter(Boolean) : [];
    if (!clientIds.length || typeof getActivePaymentCountsForClientIds !== "function") {
      setActivePaymentCountsByClient({});
      return undefined;
    }
    getActivePaymentCountsForClientIds(clientIds)
      .then((counts) => {
        if (cancelled) return;
        setActivePaymentCountsByClient(Object.fromEntries(counts || []));
      })
      .catch((error) => {
        console.error("[Trash] Failed to check linked payments:", error);
        if (!cancelled) setActivePaymentCountsByClient({});
      });
    return () => { cancelled = true; };
  }, [paymentCheckClientKey, getActivePaymentCountsForClientIds]);

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
      await refreshTrashedInvoices();
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
    if (!selectedCount) return;
    setConfirmOpen(true);
  }, [selectedCount]);

  const confirmDelete = React.useCallback(async () => {
    if (!selectedCount) return;
    if (selectedBlockedClientItems.length) {
      if (onToast) onToast(paymentGuardText.block, "error");
      setConfirmOpen(false);
      return;
    }
    if ((selectionPayload.programIds.length || selectionPayload.clientIds.length) && typeof store.purgeTrashItems === "function") {
      let result = null;
      try {
        result = await store.purgeTrashItems(selectionPayload);
      } catch (error) {
        console.error("[Trash] Permanent delete payment check failed:", error);
        if (onToast) onToast(error.message || "Delete failed", "error");
        setConfirmOpen(false);
        return;
      }
      if (result?.blocked) {
        if (onToast) onToast(paymentGuardText.block, "error");
        setConfirmOpen(false);
        return;
      }
      if (result?.error) {
        const technicalMessage = String(result.error.message || result.error.details || "");
        const isPaymentBlockError = result.error.code === "ACTIVE_PAYMENTS";
        const isLinkedRecordError = result.error.code === "LINKED_RECORDS"
          || result.error.code === "23503"
          || /foreign key|violates foreign key|constraint/i.test(technicalMessage);
        if (onToast) {
          onToast(
            isPaymentBlockError
              ? paymentGuardText.block
              : (isLinkedRecordError ? permanentDeleteText.linkedFailure : permanentDeleteText.failure),
            "error"
          );
        }
        setConfirmOpen(false);
        return;
      }
    }
    if (invoicesAreRemote && selectionPayload.invoiceIds.length && store.invoiceApi?.deleteFinalInvoice) {
      const responses = await Promise.all(selectionPayload.invoiceIds.map((id) => store.invoiceApi.deleteFinalInvoice(id)));
      const error = responses.find((response) => response?.error)?.error;
      if (error) {
        if (onToast) onToast(error.message || "Delete failed", "error");
        return;
      }
      await refreshTrashedInvoices();
    }
    if (!invoicesAreRemote && selectionPayload.invoiceIds.length) {
      selectionPayload.invoiceIds.forEach((id) => deleteSavedInvoiceSnapshot(id));
      setTrashedInvoices(readSavedInvoices().filter((invoice) => invoice.status === "trashed"));
    }
    if (selectionPayload.paymentIds.length && typeof store.deletePaymentFromTrash === "function") {
      await Promise.all(selectionPayload.paymentIds.map((id) => store.deletePaymentFromTrash(id)));
    }
    setSelection({});
    setConfirmOpen(false);
    if (onToast) {
      const onlyClients = selectedCount > 0
        && selectionPayload.clientIds.length === selectedCount
        && !selectionPayload.programIds.length
        && !selectionPayload.invoiceIds.length
        && !selectionPayload.paymentIds.length;
      onToast(onlyClients ? permanentDeleteText.clientSuccess : (t.deleteSuccess || "Deleted"), "success");
    }
  }, [invoicesAreRemote, refreshTrashedInvoices, selectedBlockedClientItems.length, selectedCount, selectionPayload, store, onToast, paymentGuardText.block, permanentDeleteText, t.deleteSuccess]);

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
  const confirmMessage = (t.trashConfirmDeleteMessage || "{count}").replace("{count}", selectedCount);
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
              disabled={!selectedCount}
              onClick={handleRestore}
            >
              {t.trashRestoreSelected}
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon="trash"
              disabled={!selectedCount || selectedBlockedClientItems.length > 0}
              onClick={handleDelete}
              title={selectedBlockedClientItems.length ? paymentGuardText.block : undefined}
            >
              {t.trashDeleteSelected}
            </Button>
          </div>
        </div>
      </GlassCard>
      {filterMenu}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {totalItems === 0 ? (
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
            const activePaymentCount = Number(item.activePaymentCount || 0);
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
                        color: activePaymentCount > 0 ? "var(--rukn-danger)" : "var(--rukn-text-muted)",
                        fontWeight: activePaymentCount > 0 ? 800 : 700,
                      }}>
                        {activePaymentCount > 0 ? paymentGuardText.blocked : paymentGuardText.allowed}
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
        onClose={() => setConfirmOpen(false)}
        title={t.trashConfirmDeleteTitle}
        width={520}
      >
        <p style={{ fontSize: 15, color: tc.white, lineHeight: 1.6 }}>{confirmMessage}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 28 }}>
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            {t.trashCancel || t.cancel}
          </Button>
          <Button variant="danger" icon="trash" onClick={confirmDelete}>
            {t.trashDeleteSelected}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
