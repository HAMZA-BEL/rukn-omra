import React from "react";
import { createPortal } from "react-dom";
import { Button, StatusBadge, EmptyState, Modal, GlassCard } from "./UI";
import TransferSheet from "./TransferSheet";
import ClientDetail from "./ClientDetail";
import ClientForm from "./ClientForm";
import ImportClientsModal from "./ImportClientsModal";
import MRZReader from "./MRZReader";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { formatCurrency } from "../utils/currency";
import { useDropdownPosition } from "../hooks/useDropdownPosition";
import { AppIcon } from "./Icon";
import { getClientDisplayName } from "../utils/clientNames";
import { getExplicitProgramKind, getParticipantTerminology } from "../utils/participantTerminology";
import {
  getClientDisplayStatus,
  getClientCompletionBadges,
  getClientCompletionLabels,
  getClientDeletedProgramLabel,
  getClientProgramId,
  hasDeletedProgramContext,
} from "../utils/clientCompletionStatus";
import { fetchClientsPage } from "../services/clientsService";

const tc = theme.colors;
const MENU_OFFSET_PX = 6;
const CLIENTS_PAGE_SIZE = 10;
const CLIENT_TYPE_FILTERS = {
  ALL: "all",
  UMRAH: "umrah",
  HAJJ: "hajj",
  UNASSIGNED: "unassigned",
};
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

const formatClientReference = (client = {}) => {
  for (const key of REF_KEYS) {
    const value = client?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const ticket = typeof client?.ticketNo === "string" ? client.ticketNo.trim() : "";
  if (ticket) return ticket;
  const fallback = typeof client?.id === "string" ? client.id.trim() : "";
  if (!fallback) return "";
  if (UUID_REGEX.test(fallback) || fallback.length > 18) return "";
  return fallback;
};

const startsWithIcon = (text, icon) => {
  if (typeof text !== "string" || typeof icon !== "string") return false;
  const normalizedIcon = icon.trim();
  if (!normalizedIcon) return false;
  return text.trimStart().startsWith(normalizedIcon);
};

export default function ClientsPage({ store, onToast }) {
  const { t, tr, dir, lang } = useLang();
  const isRTL = dir === "rtl";
  const { activeClients, archivedClients, programs,
          getClientStatus, getClientTotalPaid, getClientPayments,
          deleteClient, deleteClientsBulk,
          archiveClient, archiveClients, restoreClient,
          updateClient, transferClients: transferClientsToProgram } = store;

  const [tab,        setTab]        = React.useState("active");
  const [search,     setSearch]     = React.useState("");
  const [filter,     setFilter]     = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState(CLIENT_TYPE_FILTERS.ALL);
  const [filterProg, setFilterProg] = React.useState("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [remotePage, setRemotePage] = React.useState({ data: [], count: 0, loading: false, error: null, page: 1 });
  const [selected,   setSelected]   = React.useState(null);
  const [editing,    setEditing]    = React.useState(null);
  const [showAdd,    setShowAdd]    = React.useState(false);
  const [checkedIds,  setCheckedIds]  = React.useState(new Set());
  const [selectMode,  setSelectMode]  = React.useState(false);
  const [showImport,  setShowImport]  = React.useState(false);
  const [importSaving, setImportSaving] = React.useState(false);
  const [showPassportImport, setShowPassportImport] = React.useState(false);
  const [transferTargets, setTransferTargets] = React.useState([]);
  const [transferSheetOpen, setTransferSheetOpen] = React.useState(false);
  const [statusFilterOpen, setStatusFilterOpen] = React.useState(false);
  const [typeFilterOpen, setTypeFilterOpen] = React.useState(false);
  const [importMenuOpen, setImportMenuOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const statusFilterRef = React.useRef(null);
  const typeFilterRef = React.useRef(null);
  const importMenuRef = React.useRef(null);
  const searchInputRef = React.useRef(null);
  const hydrationRequestedRef = React.useRef(false);
  const getClientProgram = React.useCallback(
    (client) => programs.find((program) => program.id === getClientProgramId(client)) || null,
    [programs]
  );
  const getClientTerms = React.useCallback(
    (client) => getParticipantTerminology(getClientProgram(client), client, lang),
    [getClientProgram, lang]
  );
  const closeImportModal = React.useCallback(() => {
    if (importSaving) return;
    setShowImport(false);
  }, [importSaving]);

  // Reset tab-specific state when switching tabs
  const switchTab = (newTab) => {
    setTab(newTab);
    setSearch("");
    setFilter("all");
    setTypeFilter(CLIENT_TYPE_FILTERS.ALL);
    setFilterProg("all");
    setStatusFilterOpen(false);
    setTypeFilterOpen(false);
    setImportMenuOpen(false);
    setSearchOpen(false);
    setTransferTargets([]);
    setTransferSheetOpen(false);
    exitSelectMode();
  };

  const fallbackClients = tab === "active" ? activeClients : archivedClients;
  const useRemotePaging = Boolean(store.isSupabaseEnabled && store.agencyId && filter === "all" && typeFilter === CLIENT_TYPE_FILTERS.ALL);
  const shouldUseFullFallback = !useRemotePaging || Boolean(remotePage.error);
  const clientsReady = !store.isSupabaseEnabled || store.clientsLoaded;
  const paymentsReady = !store.isSupabaseEnabled || store.paymentsLoaded;
  const hydrationLoading = Boolean(store.isSupabaseEnabled && (!clientsReady || !paymentsReady));
  const programById = React.useMemo(() => new Map(programs.map((program) => [program.id, program])), [programs]);
  const getDisplayStatusForClient = React.useCallback((client) => (
    getClientDisplayStatus(client, programById.get(getClientProgramId(client)), getClientStatus(client))
  ), [getClientStatus, programById]);
  const getClientType = React.useCallback((client) => {
    const programId = getClientProgramId(client);
    if (!programId) return CLIENT_TYPE_FILTERS.UNASSIGNED;
    const program = programById.get(programId) || client?.docs?.deletedProgramSnapshot || null;
    return getExplicitProgramKind(program, client) || "unknown";
  }, [programById]);

  // The full store list is only used for payment-status filters and local mode.
  // When remote paging is available, the visible page comes from Supabase range().
  const fallbackFilteredClients = React.useMemo(() => {
    if (!shouldUseFullFallback) return [];
    return fallbackClients.filter(c => {
      const status = getDisplayStatusForClient(c);
      const ok1 = tab === "archived"
        || filter === "all"
        || status === filter;
      const clientType = getClientType(c);
      const okType = typeFilter === CLIENT_TYPE_FILTERS.ALL || clientType === typeFilter;
      const ok2 = typeFilter === CLIENT_TYPE_FILTERS.UNASSIGNED || filterProg === "all" || getClientProgramId(c) === filterProg;
      const q   = search.toLowerCase();
      const displayName = getClientDisplayName(c, "");
      const ok3 = !q || displayName.toLowerCase().includes(q) ||
        (c.phone||"").includes(q) || c.id.toLowerCase().includes(q) ||
        (c.ticketNo||"").toLowerCase().includes(q);
      return ok1 && okType && ok2 && ok3;
    });
  }, [fallbackClients, filter, filterProg, search, getDisplayStatusForClient, getClientType, tab, typeFilter, shouldUseFullFallback]);

  // Reset to page 1 whenever filters or tab change
  React.useEffect(() => { setCurrentPage(1); }, [search, filter, typeFilter, filterProg, tab]);

  React.useEffect(() => {
    if (!useRemotePaging) {
      setRemotePage((current) => (
        current.loading || current.error || current.data.length || current.count
          ? { data: [], count: 0, loading: false, error: null, page: 1 }
          : current
      ));
      return undefined;
    }

    let cancelled = false;
    setRemotePage((current) => ({
      data: current.page === currentPage ? current.data : [],
      count: current.count,
      loading: true,
      error: null,
      page: currentPage,
    }));
    fetchClientsPage(store.agencyId, {
      page: currentPage,
      pageSize: CLIENTS_PAGE_SIZE,
      archived: tab === "archived",
      programId: filterProg === "all" ? null : filterProg,
      search,
    }).then((result) => {
      if (cancelled) return;
      setRemotePage({
        data: result?.data || [],
        count: result?.count || 0,
        loading: false,
        error: result?.error || null,
        page: result?.page || currentPage,
      });
    }).catch((error) => {
      if (cancelled) return;
      setRemotePage({ data: [], count: 0, loading: false, error, page: currentPage });
    });

    return () => { cancelled = true; };
  }, [useRemotePaging, store.agencyId, store.lastSynced, currentPage, tab, filterProg, search]);

  React.useEffect(() => {
    if (!store.isSupabaseEnabled) return;
    if (clientsReady && paymentsReady) return;
    if (hydrationRequestedRef.current) return;
    hydrationRequestedRef.current = true;
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

  const useRemoteResults = useRemotePaging && !remotePage.error;
  const filteredCount = useRemoteResults ? remotePage.count : fallbackFilteredClients.length;
  const displayedTotalCount = useRemoteResults ? filteredCount : fallbackClients.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / CLIENTS_PAGE_SIZE));
  const remotePageMatchesCurrentPage = remotePage.page === currentPage;
  const isPageLoading = useRemoteResults && (remotePage.loading || !remotePageMatchesCurrentPage);
  const paginatedClients = useRemoteResults
    ? (remotePageMatchesCurrentPage ? remotePage.data : [])
    : fallbackFilteredClients.slice(
      (currentPage - 1) * CLIENTS_PAGE_SIZE,
      currentPage * CLIENTS_PAGE_SIZE
    );
  const pageSelectionScope = paginatedClients;

  React.useEffect(() => {
    if (!isPageLoading && currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages, isPageLoading]);

  const toggleCheck = (id) => setCheckedIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const clearSelection = React.useCallback(() => setCheckedIds(new Set()), [setCheckedIds]);
  const selectionScopeKey = React.useMemo(
    () => [tab, search, filter, typeFilter, filterProg, currentPage].join("|"),
    [tab, search, filter, typeFilter, filterProg, currentPage]
  );
  const previousSelectionScopeKey = React.useRef(selectionScopeKey);
  React.useEffect(() => {
    if (previousSelectionScopeKey.current === selectionScopeKey) return;
    previousSelectionScopeKey.current = selectionScopeKey;
    clearSelection();
  }, [selectionScopeKey, clearSelection]);
  const removeFromRemotePage = React.useCallback((ids) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    const idSet = new Set(idList.filter(Boolean));
    if (!idSet.size) return;
    setRemotePage((current) => {
      const nextData = current.data.filter((client) => !idSet.has(client.id));
      const removedCount = current.data.length - nextData.length;
      if (!removedCount) return current;
      return { ...current, data: nextData, count: Math.max(0, current.count - removedCount) };
    });
  }, []);
  const selectAllFiltered = React.useCallback(() => {
    if (!pageSelectionScope.length) return;
    setCheckedIds(new Set(pageSelectionScope.map(c => c.id)));
  }, [pageSelectionScope, setCheckedIds]);
  const exitSelectMode = React.useCallback(() => {
    setSelectMode(false);
    clearSelection();
    setTransferTargets([]);
    setTransferSheetOpen(false);
  }, [clearSelection, setSelectMode, setTransferTargets, setTransferSheetOpen]);
  const selectedPageIds = React.useMemo(() => {
    const pageIds = new Set(pageSelectionScope.map((client) => client.id));
    return Array.from(checkedIds).filter((id) => pageIds.has(id));
  }, [checkedIds, pageSelectionScope]);

  const handleBulkDelete = React.useCallback(() => {
    const ids = selectedPageIds;
    if (!ids.length) return;
    if (!window.confirm(tr("confirmBulkDelete", { count: ids.length }))) return;
    const removed = deleteClientsBulk(ids);
    if (removed) {
      removeFromRemotePage(ids);
      onToast(
        removed === ids.length
          ? tr("bulkDeleteSuccess", { count: removed })
          : (t.bulkDeletePartial || "تعذر نقل بعض العناصر لأنها غير موجودة أو تم تحديثها."),
        removed === ids.length ? "success" : "warning"
      );
    } else {
      onToast(
        t.bulkDeleteFailure || "تعذر نقل المحددين إلى سلة المحذوفات. حدّث الصفحة وحاول مرة أخرى.",
        "error"
      );
    }
    exitSelectMode();
  }, [selectedPageIds, deleteClientsBulk, exitSelectMode, onToast, removeFromRemotePage, tr, t.bulkDeleteFailure, t.bulkDeletePartial]);

  const handleBulkArchive = () => {
    if (!selectedPageIds.length) return;
    if (!window.confirm(tr("confirmBulkArchive", { count: selectedPageIds.length }))) return;
    const ids = selectedPageIds;
    archiveClients(ids);
    removeFromRemotePage(ids);
    onToast(tr("bulkArchiveSuccess", { count: ids.length }), "success");
    exitSelectMode();
  };

  const handleTransferSelected = () => {
    if (!selectedPageIds.length) {
      onToast(t.noClientsSelected || "يرجى اختيار معتمر واحد على الأقل", "info");
      return;
    }
    openTransferSheet(selectedPageIds);
  };

  const handleSingleDelete = (client) => {
    if (!window.confirm(tr("confirmDeleteClient", { name: client.name }))) return;
    deleteClient(client.id);
    removeFromRemotePage(client.id);
    setSelected(null);
    onToast(t.deleteSuccess, "info");
  };

  const handleSingleArchive = (client) => {
    if (!window.confirm(tr("confirmArchive", { name: client.name }))) return;
    archiveClient(client.id);
    removeFromRemotePage(client.id);
    setSelected(null);
    onToast(t.archiveSuccess, "success");
  };

  const handleSingleRestore = (client) => {
    restoreClient(client.id);
    removeFromRemotePage(client.id);
    setSelected(null);
    onToast(t.restoreSuccess, "success");
  };

  const allChecked = pageSelectionScope.length > 0 && pageSelectionScope.every(c => checkedIds.has(c.id));
  const selectedCount = selectedPageIds.length;
  const hasSelection = selectedCount > 0;
  const paginationLabels = React.useMemo(() => {
    if (lang === "fr") return { previous: "Précédent", next: "Suivant", loading: "Chargement...", page: "Page" };
    if (lang === "en") return { previous: "Previous", next: "Next", loading: "Loading...", page: "Page" };
    return { previous: "السابق", next: "التالي", loading: "جاري التحميل...", page: "صفحة" };
  }, [lang]);
  const deletedProgramShortLabel = React.useMemo(() => {
    if (lang === "fr") return "supprimé";
    if (lang === "en") return "deleted";
    return "محذوف";
  }, [lang]);
  const globalPassportImportLabel = React.useMemo(() => {
    if (lang === "fr") return "Importer les passeports des pèlerins Hajj et Omra";
    if (lang === "en") return "Import Hajj & Umrah pilgrims passports";
    return "استيراد جوازات الحجاج والمعتمرين";
  }, [lang]);
  const completionLabels = React.useMemo(() => getClientCompletionLabels(lang), [lang]);
  const typeFilterLabels = React.useMemo(() => {
    if (lang === "fr") {
      return {
        all: "Tous les types",
        umrah: "Pèlerins Omra",
        hajj: "Pèlerins Hajj",
        unassigned: "Non liés à un programme",
        allPrograms: "Tous les programmes",
        allHajjPrograms: "Tous les programmes Hajj",
        allUmrahPrograms: "Tous les programmes Omra",
        inactiveProgram: "Programme non applicable",
      };
    }
    if (lang === "en") {
      return {
        all: "All types",
        umrah: "Umrah pilgrims",
        hajj: "Hajj pilgrims",
        unassigned: "Not linked to any program",
        allPrograms: "All programs",
        allHajjPrograms: "All Hajj programs",
        allUmrahPrograms: "All Umrah programs",
        inactiveProgram: "Program not applicable",
      };
    }
    return {
      all: "كل الأنواع",
      umrah: "معتمرون",
      hajj: "حجاج",
      unassigned: "غير مدرجين في أي برنامج",
      allPrograms: "كل البرامج",
      allHajjPrograms: "كل برامج الحج",
      allUmrahPrograms: "كل برامج العمرة",
      inactiveProgram: "البرنامج غير قابل للتطبيق",
    };
  }, [lang]);
  const statusFilters = React.useMemo(() => ([
    { key:"all", label:t.all, icon:"users" },
    { key:"cleared", label:t.status_cleared || t.clearedFilter, icon:"success" },
    { key:"partial", label:t.status_partial || t.partialFilter, icon:"partial" },
    { key:"unpaid", label:t.status_unpaid || t.unpaidFilter, icon:"unpaid" },
    { key:"information_incomplete", label:t.informationIncompleteBadge || completionLabels.informationIncomplete, icon:"alert" },
  ]), [completionLabels.informationIncomplete, t]);
  const activeStatusFilter = statusFilters.find((item) => item.key === filter) || statusFilters[0];
  const typeFilters = React.useMemo(() => ([
    { key:CLIENT_TYPE_FILTERS.ALL, label:typeFilterLabels.all, icon:"users" },
    { key:CLIENT_TYPE_FILTERS.UMRAH, label:typeFilterLabels.umrah, icon:"users" },
    { key:CLIENT_TYPE_FILTERS.HAJJ, label:typeFilterLabels.hajj, icon:"program" },
    { key:CLIENT_TYPE_FILTERS.UNASSIGNED, label:typeFilterLabels.unassigned, icon:"program" },
  ]), [typeFilterLabels]);
  const activeTypeFilter = typeFilters.find((item) => item.key === typeFilter) || typeFilters[0];
  const availablePrograms = React.useMemo(() => {
    if (typeFilter === CLIENT_TYPE_FILTERS.UNASSIGNED) return [];
    if (typeFilter === CLIENT_TYPE_FILTERS.HAJJ || typeFilter === CLIENT_TYPE_FILTERS.UMRAH) {
      return programs.filter((program) => getExplicitProgramKind(program) === typeFilter);
    }
    return programs;
  }, [programs, typeFilter]);
  const programDefaultLabel = React.useMemo(() => {
    if (typeFilter === CLIENT_TYPE_FILTERS.HAJJ) return typeFilterLabels.allHajjPrograms;
    if (typeFilter === CLIENT_TYPE_FILTERS.UMRAH) return typeFilterLabels.allUmrahPrograms;
    if (typeFilter === CLIENT_TYPE_FILTERS.UNASSIGNED) return typeFilterLabels.inactiveProgram;
    return t.allPrograms || typeFilterLabels.allPrograms;
  }, [t.allPrograms, typeFilter, typeFilterLabels]);
  React.useEffect(() => {
    if (typeFilter === CLIENT_TYPE_FILTERS.UNASSIGNED) {
      if (filterProg !== "all") setFilterProg("all");
      return;
    }
    if (filterProg === "all") return;
    if (!availablePrograms.some((program) => program.id === filterProg)) {
      setFilterProg("all");
    }
  }, [availablePrograms, filterProg, typeFilter]);
  React.useEffect(() => {
    if (!statusFilterOpen && !typeFilterOpen) return undefined;
    const handleOutside = (event) => {
      if (statusFilterOpen && !statusFilterRef.current?.contains(event.target)) setStatusFilterOpen(false);
      if (typeFilterOpen && !typeFilterRef.current?.contains(event.target)) setTypeFilterOpen(false);
    };
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [statusFilterOpen, typeFilterOpen]);
  React.useEffect(() => {
    if (!importMenuOpen) return undefined;
    const handleOutside = (event) => {
      if (importMenuRef.current?.contains(event.target)) return;
      setImportMenuOpen(false);
    };
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [importMenuOpen]);
  const searchExpanded = searchOpen || search.trim().length > 0;
  const unspecifiedProgramLabel = React.useMemo(() => {
    if (lang === "fr") return "Non défini";
    if (lang === "en") return "Not specified";
    return "غير محدد";
  }, [lang]);

  const programOccupancy = React.useMemo(() => {
    if (!selectMode) return new Map();
    const counts = new Map();
    activeClients.forEach(c => {
      const programId = getClientProgramId(c);
      if (!programId) return;
      counts.set(programId, (counts.get(programId) || 0) + 1);
    });
    return counts;
  }, [activeClients, selectMode]);

  const [isMobileCardLayout, setIsMobileCardLayout] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 720;
  });
  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleResize = () => setIsMobileCardLayout(window.innerWidth <= 720);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const transferList = React.useMemo(
    () => transferTargets
      .map(id => activeClients.find(c => c.id === id))
      .filter(Boolean),
    [transferTargets, activeClients]
  );

  const openTransferSheet = React.useCallback((ids) => {
    if (!ids.length) return;
    setTransferTargets(ids);
    setTransferSheetOpen(true);
  }, []);

  const closeTransferSheet = React.useCallback(() => {
    setTransferTargets([]);
    setTransferSheetOpen(false);
  }, []);

  const handleTransferConfirm = React.useCallback((programId) => {
    const destination = programs.find(p => p.id === programId);
    const notFoundMsg = t.programNotFound || "البرنامج غير متاح";
    const noSelectionMsg = t.noClientsSelected || "لم يتم اختيار أي معتمر";
    const fullMsg = t.programFull || "البرنامج ممتلئ";
    if (!destination) {
      onToast(notFoundMsg, "error");
      return;
    }
    const clientsToMove = transferTargets
      .map(id => activeClients.find(c => c.id === id))
      .filter(Boolean);
    if (!clientsToMove.length) {
      onToast(noSelectionMsg, "info");
      closeTransferSheet();
      return;
    }
    const capacity = destination.seats || Number.MAX_SAFE_INTEGER;
    const currentCount = programOccupancy.get(programId) || 0;
    if (currentCount + clientsToMove.length > capacity) {
      onToast(fullMsg, "error");
      return;
    }
    const movedCount = transferClientsToProgram(clientsToMove.map((client) => client.id), programId);
    if (!movedCount) {
      onToast(noSelectionMsg, "info");
      return;
    }
    onToast(tr("transferSuccess", { count: movedCount, program: destination.name }), "success");
    closeTransferSheet();
    exitSelectMode();
  }, [programs, transferTargets, activeClients, programOccupancy, transferClientsToProgram, onToast, tr, t, closeTransferSheet, exitSelectMode]);

  return (
    <div className="page-body clients-page" style={{ padding:"24px 32px" }}>
      {/* Header */}
      <div className="page-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:21, fontWeight:800, color:tc.white }}>{t.clients}</h1>
          <p style={{ fontSize:12, color:tc.grey, marginTop:3 }}>
            {tr("clientsTotal", {
              total: hydrationLoading ? "..." : displayedTotalCount,
              filtered: hydrationLoading ? "..." : filteredCount,
            })}
          </p>
        </div>
        {tab === "active" && (
          <div className="page-actions" style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <Button variant="primary" icon="plus" onClick={() => setShowAdd(true)}>
              {t.addClient}
            </Button>
            <div ref={importMenuRef} style={{ position:"relative" }}>
              <Button variant="ghost" icon="import" onClick={() => setImportMenuOpen(open => !open)}>
                {t.importAction || completionLabels.importAction}
              </Button>
              {importMenuOpen && (
                <div style={{
                  position:"absolute",
                  top:"calc(100% + 6px)",
                  insetInlineEnd:0,
                  zIndex:35,
                  width:210,
                  padding:6,
                  borderRadius:12,
                  background:"var(--rukn-menu-bg)",
                  border:"1px solid var(--rukn-menu-border)",
                  boxShadow:"var(--rukn-menu-shadow)",
                }}>
                  {[
                    {
                      key:"excel",
                      icon:"import",
                      label:t.excelImport || t.importExcel || completionLabels.excelImport,
                      onClick:() => {
                        setImportMenuOpen(false);
                        setShowImport(true);
                      },
                    },
                    {
                      key:"passport",
                      icon:"passport",
                      label:t.passportImport || globalPassportImportLabel,
                      onClick:() => {
                        setImportMenuOpen(false);
                        setShowPassportImport(true);
                      },
                    },
                  ].map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      onClick={action.onClick}
                      style={{
                        width:"100%",
                        display:"flex",
                        alignItems:"center",
                        gap:8,
                        padding:"8px 10px",
                        border:0,
                        borderRadius:9,
                        background:"transparent",
                        color:"var(--rukn-text-strong)",
                        fontSize:12,
                        fontWeight:800,
                        cursor:"pointer",
                        textAlign:"start",
                        fontFamily:"'Cairo',sans-serif",
                      }}
                    >
                      <AppIcon name={action.icon} size={14} color={tc.gold} />
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="page-tabs" style={{ display:"flex", gap:4, marginBottom:18,
        background:"var(--rukn-section-bg)", border:"1px solid var(--rukn-section-border)",
        borderRadius:12, padding:4, width:"fit-content" }}>
        {[
          { key:"active",   icon:"users", label:useRemoteResults ? t.activeTab : `${t.activeTab} (${activeClients.length})` },
          { key:"archived", icon:"archive", label:useRemoteResults ? t.archiveTab : `${t.archiveTab} (${archivedClients.length})` },
        ].map(({ key, icon, label }) => {
          const showIcon = icon && !startsWithIcon(label, icon);
          return (
            <button key={key} onClick={() => switchTab(key)} style={{
              padding:"7px 18px", borderRadius:9, fontSize:13, fontWeight:tab===key?700:400,
              background:tab===key?"rgba(212,175,55,.15)":"transparent",
              border:tab===key?"1px solid rgba(212,175,55,.35)":"1px solid transparent",
              color:tab===key?tc.gold:tc.grey, cursor:"pointer",
              fontFamily:"'Cairo',sans-serif", transition:"all .2s",
              display:"inline-flex", alignItems:"center", gap:6,
            }}>
              {showIcon && <AppIcon name={icon} size={15} color={tab===key?tc.gold:tc.grey} />}
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <div style={{
        display:"flex",
        flexWrap:"wrap",
        gap:6,
        alignItems:"center",
        justifyContent:"flex-start",
        marginBottom: tab === "active" ? (selectMode ? 8 : 18) : 18,
      }}>
        {tab === "active" && (
          <div ref={statusFilterRef} style={{ position:"relative", flex:"0 0 auto" }}>
            <button
              type="button"
              onClick={() => setStatusFilterOpen(open => !open)}
              style={{
                display:"inline-flex",
                alignItems:"center",
                justifyContent:"space-between",
                gap:6,
                minWidth:92,
                height:34,
                padding:"0 9px",
                borderRadius:11,
                background:filter !== "all" ? "rgba(212,175,55,.1)" : "var(--rukn-bg-soft)",
                border:`1px solid ${filter !== "all" ? "rgba(212,175,55,.35)" : "var(--rukn-border-soft)"}`,
                color:filter !== "all" ? tc.gold : tc.grey,
                fontSize:12,
                fontWeight:800,
                cursor:"pointer",
                fontFamily:"'Cairo',sans-serif",
              }}
            >
              <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                <AppIcon name="filter" size={14} color={filter !== "all" ? tc.gold : tc.grey} />
                {activeStatusFilter.label}
              </span>
            </button>
            {statusFilterOpen && (
              <div style={{
                position:"absolute",
                top:"calc(100% + 6px)",
                insetInlineStart:0,
                width:230,
                zIndex:30,
                padding:6,
                borderRadius:12,
                background:"var(--rukn-menu-bg)",
                border:"1px solid var(--rukn-menu-border)",
                boxShadow:"var(--rukn-menu-shadow)",
              }}>
                {statusFilters.map((option) => {
                  const active = filter === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        setFilter(option.key);
                        setStatusFilterOpen(false);
                      }}
                      style={{
                        width:"100%",
                        display:"flex",
                        alignItems:"center",
                        justifyContent:"space-between",
                        gap:8,
                        padding:"8px 10px",
                        border:0,
                        borderRadius:9,
                        background:active ? "rgba(212,175,55,.12)" : "transparent",
                        color:active ? tc.gold : "var(--rukn-text-strong)",
                        fontSize:12,
                        fontWeight:active ? 900 : 700,
                        cursor:"pointer",
                        fontFamily:"'Cairo',sans-serif",
                      }}
                    >
                      <span style={{ display:"inline-flex", alignItems:"center", gap:7 }}>
                        <AppIcon name={option.icon} size={13} color={active ? tc.gold : tc.grey} />
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <div ref={typeFilterRef} style={{ position:"relative", flex:"0 0 auto" }}>
          <button
            type="button"
            onClick={() => setTypeFilterOpen(open => !open)}
            style={{
              display:"inline-flex",
              alignItems:"center",
              justifyContent:"space-between",
              gap:6,
              minWidth:118,
              height:34,
              padding:"0 9px",
              borderRadius:11,
              background:typeFilter !== CLIENT_TYPE_FILTERS.ALL ? "rgba(212,175,55,.1)" : "var(--rukn-bg-soft)",
              border:`1px solid ${typeFilter !== CLIENT_TYPE_FILTERS.ALL ? "rgba(212,175,55,.35)" : "var(--rukn-border-soft)"}`,
              color:typeFilter !== CLIENT_TYPE_FILTERS.ALL ? tc.gold : tc.grey,
              fontSize:12,
              fontWeight:800,
              cursor:"pointer",
              fontFamily:"'Cairo',sans-serif",
            }}
          >
            <span style={{ display:"inline-flex", alignItems:"center", gap:6, minWidth:0 }}>
              <AppIcon name="users" size={14} color={typeFilter !== CLIENT_TYPE_FILTERS.ALL ? tc.gold : tc.grey} />
              <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{activeTypeFilter.label}</span>
            </span>
          </button>
          {typeFilterOpen && (
            <div style={{
              position:"absolute",
              top:"calc(100% + 6px)",
              insetInlineStart:0,
              width:240,
              zIndex:30,
              padding:6,
              borderRadius:12,
              background:"var(--rukn-menu-bg)",
              border:"1px solid var(--rukn-menu-border)",
              boxShadow:"var(--rukn-menu-shadow)",
            }}>
              {typeFilters.map((option) => {
                const active = typeFilter === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setTypeFilter(option.key);
                      setTypeFilterOpen(false);
                    }}
                    style={{
                      width:"100%",
                      display:"flex",
                      alignItems:"center",
                      justifyContent:"space-between",
                      gap:8,
                      padding:"8px 10px",
                      border:0,
                      borderRadius:9,
                      background:active ? "rgba(212,175,55,.12)" : "transparent",
                      color:active ? tc.gold : "var(--rukn-text-strong)",
                      fontSize:12,
                      fontWeight:active ? 900 : 700,
                      cursor:"pointer",
                      fontFamily:"'Cairo',sans-serif",
                      textAlign:"start",
                    }}
                  >
                    <span style={{ display:"inline-flex", alignItems:"center", gap:7 }}>
                      <AppIcon name={option.icon} size={13} color={active ? tc.gold : tc.grey} />
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <select
          value={filterProg}
          onChange={e=>setFilterProg(e.target.value)}
          disabled={typeFilter === CLIENT_TYPE_FILTERS.UNASSIGNED}
          style={{
            flex:"0 0 190px",
            maxWidth:"100%",
            height:34,
            background:typeFilter === CLIENT_TYPE_FILTERS.UNASSIGNED
              ? "rgba(148,163,184,.05)"
              : filterProg!=="all" ? "rgba(212,175,55,.1)" : "var(--rukn-bg-input)",
            border:`1px solid ${filterProg!=="all" && typeFilter !== CLIENT_TYPE_FILTERS.UNASSIGNED ? tc.gold : "var(--rukn-border-soft)"}`,
            borderRadius:10,
            padding:"0 12px",
            color:typeFilter === CLIENT_TYPE_FILTERS.UNASSIGNED
              ? "rgba(148,163,184,.55)"
              : filterProg!=="all" ? tc.gold : tc.grey,
            fontSize:12,
            fontFamily:"'Cairo',sans-serif",
            cursor:typeFilter === CLIENT_TYPE_FILTERS.UNASSIGNED ? "not-allowed" : "pointer",
            direction:dir,
            opacity:typeFilter === CLIENT_TYPE_FILTERS.UNASSIGNED ? .72 : 1,
          }}
        >
          <option value="all">{programDefaultLabel}</option>
          {availablePrograms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div
          onMouseEnter={() => setSearchOpen(true)}
          onMouseLeave={() => {
            if (!search.trim() && document.activeElement !== searchInputRef.current) setSearchOpen(false);
          }}
          style={{
            width:searchExpanded ? "min(280px, 100%)" : 34,
            height:34,
            flex:searchExpanded ? "0 1 280px" : "0 0 38px",
            maxWidth:"100%",
            display:"flex",
            alignItems:"center",
            gap:6,
            borderRadius:11,
            background:"rgba(255,255,255,.04)",
            border:`1px solid ${searchExpanded ? "rgba(212,175,55,.24)" : "var(--rukn-border-soft)"}`,
            padding:searchExpanded ? "0 9px" : 0,
            overflow:"hidden",
            transition:"width .2s ease, flex-basis .2s ease, border-color .2s ease, padding .2s ease",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setSearchOpen(true);
              requestAnimationFrame(() => searchInputRef.current?.focus());
            }}
            style={{
              width:34,
              height:32,
              flex:"0 0 34px",
              border:0,
              background:"transparent",
              display:"inline-flex",
              alignItems:"center",
              justifyContent:"center",
              cursor:"pointer",
            }}
            aria-label={t.searchClients}
          >
            <AppIcon name="search" size={16} color={tc.gold} />
          </button>
          {searchExpanded && (
            <>
              <input
                ref={searchInputRef}
                value={search}
                onChange={e=>setSearch(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => {
                  if (!search.trim()) setSearchOpen(false);
                }}
                placeholder={t.searchClients}
                style={{
                  flex:1,
                  minWidth:0,
                  border:0,
                  outline:0,
                  background:"transparent",
                  color:tc.white,
                  fontSize:13,
                  fontFamily:"'Cairo',sans-serif",
                }}
              />
              {search.trim() && (
                <button type="button" onClick={() => {
                  setSearch("");
                  requestAnimationFrame(() => searchInputRef.current?.focus());
                }} style={{
                  width:24,
                  height:24,
                  border:0,
                  borderRadius:8,
                  background:"rgba(255,255,255,.06)",
                  display:"inline-flex",
                  alignItems:"center",
                  justifyContent:"center",
                  cursor:"pointer",
                }} aria-label={t.clear || "Clear"}>
                  <AppIcon name="x" size={13} color={tc.grey} />
                </button>
              )}
            </>
          )}
        </div>
        {tab === "active" && filteredCount > 0 && (
          <div style={{ marginInlineStart:"auto" }}>
            <Button
              variant={selectMode ? "warning" : "ghost"}
              size="sm"
              icon="checked"
              disabled={!filteredCount}
              onClick={() => {
                if (selectMode) {
                  exitSelectMode();
                } else {
                  clearSelection();
                  setSelectMode(true);
                }
              }}
            >
              {selectMode ? (t.finishSelection || t.cancel) : t.selectMultiple}
            </Button>
          </div>
        )}
      </div>

      {tab === "active" && selectMode && (
        <GlassCard style={{
          padding:"12px 16px",
          marginBottom:14,
        }}>
          <div style={{
            display:"flex",
            flexWrap:"wrap",
            gap:12,
            alignItems:"center",
            justifyContent:"space-between",
          }}>
            <span style={{ fontSize:13, color:tc.gold, fontWeight:700 }}>
              {tr("selectedCount", { count: selectedCount })}
            </span>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={selectAllFiltered}
                disabled={allChecked || pageSelectionScope.length === 0}
              >
                {t.selectAll}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                disabled={!hasSelection}
              >
                {t.deselectAll}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleTransferSelected}
                disabled={!hasSelection}
              >
                {t.transferSelected}
              </Button>
              {hasSelection && (
                <Button
                  variant="danger"
                  size="sm"
                  icon="trash"
                  onClick={handleBulkDelete}
                >
                  {t.deleteSelected}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={exitSelectMode}
              >
                {t.cancel}
              </Button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* List */}
      {hydrationLoading ? (
        <GlassCard style={{ padding:18, textAlign:"center", color:tc.grey, fontSize:13 }}>
          {paginationLabels.loading}
        </GlassCard>
      ) : isPageLoading ? (
        <GlassCard style={{ padding:18, textAlign:"center", color:tc.grey, fontSize:13 }}>
          {paginationLabels.loading}
        </GlassCard>
      ) : filteredCount === 0 ? (
        tab === "archived"
          ? <EmptyState title={t.archiveTabEmpty} sub={t.archiveTabEmptySub} />
          : <EmptyState title={t.noResultsTitle} sub={t.noResultsSub} />
      ) : (
        <div className="list-stack" style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {paginatedClients.map((c,i) => {
            const deletedProgramSnapshot = c.docs?.deletedProgramSnapshot;
            const clientProgramId = getClientProgramId(c);
            const liveProgram = clientProgramId ? store.getProgramById(clientProgramId) : null;
            const explicitProgramKind = getExplicitProgramKind(liveProgram || deletedProgramSnapshot, c);
            const prog      = liveProgram
              || (deletedProgramSnapshot?.programName || deletedProgramSnapshot?.programNameFr
                ? {
                    ...deletedProgramSnapshot,
                    name: `${deletedProgramSnapshot.programName || deletedProgramSnapshot.programNameFr} (${deletedProgramShortLabel})`,
                  }
                : { name: unspecifiedProgramLabel });
            const paid      = getClientTotalPaid(c.id);
            const price     = c.salePrice || c.price || 0;
            const status    = getDisplayStatusForClient(c);
            const remaining = Math.max(0, price - paid);
            return (
              <ClientRow key={c.id} client={c} program={prog}
                paid={paid} remaining={remaining}
                status={status} index={i}
                isRTL={isRTL} lang={lang}
                isHajjRecord={explicitProgramKind === "hajj"}
                isMobileCard={isMobileCardLayout}
                editLabel={t.editLabel}
                deleteLabel={t.deleteLabel}
                archiveLabel={t.archiveClient}
                restoreLabel={t.restoreClient}
                isArchived={tab === "archived"}
                selectMode={selectMode && tab === "active"}
                showCheckbox={tab === "active" && selectMode}
                isChecked={checkedIds.has(c.id)}
                onCheck={() => toggleCheck(c.id)}
                onClick={() => setSelected(c)}
                onEdit={() => setEditing(c)}
                onDelete={() => tab === "archived" ? handleSingleDelete(c) : handleSingleDelete(c)}
                onArchive={() => handleSingleArchive(c)}
                onRestore={() => handleSingleRestore(c)}
                onTransfer={tab === "active" ? () => openTransferSheet([c.id]) : undefined}
              />
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 10, marginTop: 20, paddingTop: 16,
          borderTop: "1px solid rgba(212,175,55,.1)",
        }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isPageLoading}
            style={{
              padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: "rgba(212,175,55,.08)", border: "1px solid rgba(212,175,55,.25)",
              color: currentPage === 1 || isPageLoading ? "rgba(212,175,55,.3)" : "#d4af37",
              cursor: currentPage === 1 || isPageLoading ? "default" : "pointer",
              fontFamily: "'Cairo',sans-serif", transition: "all .18s",
            }}
          >
            {paginationLabels.previous}
          </button>
          <span style={{ fontSize: 13, color: tc.grey, fontFamily: "'Cairo',sans-serif", minWidth: 80, textAlign: "center" }}>
            {paginationLabels.page} {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || isPageLoading}
            style={{
              padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: "rgba(212,175,55,.08)", border: "1px solid rgba(212,175,55,.25)",
              color: currentPage === totalPages || isPageLoading ? "rgba(212,175,55,.3)" : "#d4af37",
              cursor: currentPage === totalPages || isPageLoading ? "default" : "pointer",
              fontFamily: "'Cairo',sans-serif", transition: "all .18s",
            }}
          >
            {paginationLabels.next}
          </button>
        </div>
      )}

      {/* Modals */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? getClientTerms(selected).fileTitle : t.clientFile} width={660}>
        {selected && (
          <ClientDetail client={selected} store={store}
            onClose={() => setSelected(null)}
            onEdit={c => { setSelected(null); setEditing(c); }}
            onDelete={() => handleSingleDelete(selected)}
            onArchive={() => handleSingleArchive(selected)}
            onRestore={() => handleSingleRestore(selected)}
            onToast={onToast} />
        )}
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)}
        title={`${t.editLabel} — ${editing ? getClientTerms(editing).fileTitle : t.clientFile}`} width={660}>
        {editing && (
          <ClientForm client={editing} store={store}
            onSave={() => { setEditing(null); onToast(t.updateSuccess,"success"); }}
            onCancel={() => setEditing(null)} />
        )}
      </Modal>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t.addClient} width={660}>
        <ClientForm store={store}
          onSave={() => { setShowAdd(false); onToast(t.addSuccess,"success"); }}
          onCancel={() => setShowAdd(false)} />
      </Modal>
      <Modal open={showImport} onClose={closeImportModal} title={t.importModalTitle} width={920}>
        {showImport && (
          <ImportClientsModal
            store={store}
            onClose={closeImportModal}
            onToast={onToast}
            onImportingChange={setImportSaving}
          />
        )}
      </Modal>
      <Modal open={showPassportImport} onClose={() => setShowPassportImport(false)} title={t.passportImport || globalPassportImportLabel} width={1040}>
        {showPassportImport && (
          <MRZReader
            store={store}
            onClose={() => setShowPassportImport(false)}
            onToast={onToast}
          />
        )}
      </Modal>
      <TransferSheet
        open={transferSheetOpen}
        onClose={closeTransferSheet}
        clients={transferList}
        programs={programs}
        occupancy={programOccupancy}
        onConfirm={handleTransferConfirm}
        getClientPayments={getClientPayments}
        invoiceApi={store.invoiceApi}
      />
    </div>
  );
}

const clientCompletionBadgeStyle = (tone) => ({
  display:"inline-flex",
  alignItems:"center",
  gap:4,
  padding:"1px 6px",
  borderRadius:999,
  border:tone === "warning" ? "1px solid rgba(245,158,11,.32)" : "1px solid rgba(148,163,184,.25)",
  background:tone === "warning" ? "rgba(245,158,11,.12)" : "rgba(148,163,184,.1)",
  color:tone === "warning" ? tc.warning : tc.grey,
  fontSize:9.5,
  lineHeight:1.35,
  fontWeight:800,
  whiteSpace:"nowrap",
});

// ── ClientRow ─────────────────────────────────────────────────────────────────
const ClientRow = React.memo(function ClientRow({ client, program, paid, remaining, status, onClick,
  index, isRTL, lang, selectMode, showCheckbox, isChecked, onCheck, onEdit, onDelete, onArchive, onRestore,
  onTransfer, editLabel, deleteLabel, archiveLabel, restoreLabel, isArchived, isMobileCard, isHajjRecord }) {
  const { t } = useLang();
  const [hov,      setHov]      = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const btnRef  = React.useRef();
  const menuRef = React.useRef();
  const menuPos = useDropdownPosition({
    anchorRef: btnRef,
    menuRef,
    open: menuOpen,
    rtl: isRTL,
    offset: MENU_OFFSET_PX,
  });

  React.useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          btnRef.current  && !btnRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const reference = formatClientReference(client);
  const displayName = getClientDisplayName(client);
  const phoneLine = client.phone ? client.phone.trim() : "";
  const cityLine  = client.city ? client.city.trim() : "";
  const ticketLine = client.ticketNo ? client.ticketNo.trim() : "";
  const registrationSource = (client.registrationSource || client.registration_source || "").trim();
  const secondaryBadges = getClientCompletionBadges(client, lang, program).filter((badge) => badge.key !== status);
  const rowLabels = getClientCompletionLabels(lang);
  const programName = String(program?.name || "").trim();
  const genericProgramLabels = new Set(["—", "غير محدد", "Non défini", "Not specified"]);
  const contextLabel = status === "unassigned_program"
    ? (hasDeletedProgramContext(client) ? getClientDeletedProgramLabel(client, lang) : "")
    : (!genericProgramLabels.has(programName) ? programName : "");
  const contextLine = [reference, phoneLine, cityLine, contextLabel, registrationSource, ticketLine].filter(Boolean).join(" • ");
  const hajjBadgeLabel = lang === "fr" || lang === "en" ? "Hajj" : "حاج";
  const hajjBadgeStyle = {
    display:"inline-flex",
    alignItems:"center",
    padding:"1px 7px",
    borderRadius:999,
    border:"1px solid rgba(212,175,55,.28)",
    background:"rgba(212,175,55,.08)",
    color:tc.gold,
    fontSize:10,
    fontWeight:900,
    lineHeight:1.45,
    whiteSpace:"nowrap",
  };
  const handleRowClick = () => {
    if (selectMode && showCheckbox) {
      onCheck();
      return;
    }
    onClick();
  };

  const menuNode = (!showCheckbox && menuOpen) ? createPortal(
    <div
      ref={menuRef}
      className="client-actions-menu"
      style={{
        position:"fixed",
        top: menuPos.top,
        left: menuPos.left,
        visibility: menuPos.visibility,
        zIndex:9999,
        background:"var(--rukn-menu-bg, rgba(20,30,50,0.96))",
        border:"1px solid var(--rukn-menu-border, rgba(212,175,55,.3))",
        borderRadius:12,
        boxShadow:"var(--rukn-menu-shadow, 0 10px 25px rgba(0,0,0,0.35))",
        minWidth:160,
        overflow:"hidden",
      }}>
      {!isArchived && (
        <MenuBtn
          icon="edit" label={editLabel || t.editLabel}
          onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit(); }}
          color={tc.white} hoverBg="rgba(212,175,55,.1)"
          isRTL={isRTL} border />
      )}
      {!isArchived && onTransfer && (
        <MenuBtn
          icon="refresh" label={t.transferClient || "نقل إلى برنامج"}
          onClick={e => { e.stopPropagation(); setMenuOpen(false); onTransfer(); }}
          color={tc.gold} hoverBg="rgba(212,175,55,.15)"
          isRTL={isRTL} border />
      )}
      {!isArchived && (
        <MenuBtn
          icon="archive" label={archiveLabel || t.archiveClient}
          onClick={e => { e.stopPropagation(); setMenuOpen(false); onArchive(); }}
          color={tc.warning} hoverBg="rgba(245,158,11,.1)"
          isRTL={isRTL} border />
      )}
      {isArchived && (
        <MenuBtn
          icon="restore" label={restoreLabel || t.restoreClient}
          onClick={e => { e.stopPropagation(); setMenuOpen(false); onRestore(); }}
          color={tc.greenLight} hoverBg="rgba(34,197,94,.1)"
          isRTL={isRTL} border />
      )}
      <MenuBtn
        icon="trash" label={deleteLabel || t.deleteLabel}
        onClick={e => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
        color={tc.danger} hoverBg="rgba(239,68,68,.12)"
        isRTL={isRTL} />
    </div>,
    document.body
  ) : null;

  if (isMobileCard) {
    return (
      <div className="animate-fadeInUp client-card-mobile-wrapper" style={{ animationDelay:`${index*.025}s` }}>
        <div
          className={`client-card-mobile${isChecked ? " is-selected" : ""}`}
          onClick={handleRowClick}
          style={{
            borderInlineStart:"3px solid rgba(212,175,55,.38)",
          }}
        >
          <div className="client-card-mobile-heading">
            <div className="client-card-mobile-main">
              <span className="client-card-mobile-index">{index + 1}</span>
              <div className="client-card-mobile-avatar">
                {(displayName || "?")[0]}
              </div>
              <div className="client-card-mobile-texts">
                <p className="client-card-mobile-name-text" title={displayName}>
                  {displayName}
                </p>
                {isHajjRecord && (
                  <div style={{ display:"flex", marginTop:3 }}>
                    <span style={hajjBadgeStyle}>{hajjBadgeLabel}</span>
                  </div>
                )}
                {secondaryBadges.length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:2 }}>
                    {secondaryBadges.map((badge) => (
                      <span key={badge.key} style={clientCompletionBadgeStyle(badge.tone)}>{badge.label}</span>
                    ))}
                  </div>
                )}
                {phoneLine && <p className="client-card-mobile-phone">{phoneLine}</p>}
              </div>
            </div>
            <div className="client-card-mobile-action" onClick={e => e.stopPropagation()}>
              {showCheckbox ? (
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => { e.stopPropagation(); onCheck(); }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width:20, height:20, accentColor:tc.gold }}
                />
              ) : (
                <button
                  ref={btnRef}
                  type="button"
                  className="client-card-mobile-kebab"
                  onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
                >
                  ···
                </button>
              )}
            </div>
          </div>
          <div className="client-card-mobile-subinfo">
            <span>{contextLine || phoneLine || "—"}</span>
          </div>
          <div className="client-card-mobile-finance">
            <div>
              <span>{t.paid}</span>
              <strong className="is-success">{formatCurrency(paid, lang)}</strong>
            </div>
            <div>
              <span>{t.remaining}</span>
              <strong className={remaining>0 ? "is-warning" : "is-success"}>
                {formatCurrency(remaining, lang)}
              </strong>
            </div>
            <div className="client-card-mobile-status">
              <StatusBadge status={status} />
            </div>
          </div>
          <div className="client-card-mobile-tags">
            {cityLine && <span>{cityLine}</span>}
            {ticketLine && <span>{ticketLine}</span>}
          </div>
        </div>
        {menuNode}
      </div>
    );
  }

  const rowBackground = isChecked
    ? "rgba(212,175,55,.1)"
    : hov
      ? "var(--rukn-row-hover)"
      : "var(--rukn-row-bg)";
  const rowBorder = isChecked
    ? "rgba(212,175,55,.4)"
    : hov
      ? "var(--rukn-row-border-hover)"
      : "var(--rukn-row-border)";

  return (
    <div className="animate-fadeInUp" style={{ animationDelay:`${index*.025}s` }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{
        display:"flex", alignItems:"center", gap:9, padding:"8px 12px",
        background:rowBackground,
        border:`1px solid ${rowBorder}`,
        borderRadius:12, transition:"all .18s", position:"relative",
        overflow:"hidden",
        boxShadow: hov ? "0 8px 20px rgba(15,23,42,.05)" : "none",
      }}>
        <span style={{
          position:"absolute",
          insetBlock:0,
          insetInlineStart:0,
          width:3,
          background:"rgba(212,175,55,.38)",
        }} />

        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <span style={{ width:20, textAlign:"center", fontSize:11, color:tc.grey, fontWeight:600 }}>
            {index + 1}
          </span>
          <div style={{ width:31, height:31, borderRadius:9, flexShrink:0,
            background:"linear-gradient(135deg,rgba(212,175,55,.22),rgba(212,175,55,.06))",
            border:"1px solid rgba(212,175,55,.2)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:13, fontWeight:700, color:tc.gold }}>
            {(displayName || "?")[0]}
          </div>
          {showCheckbox && (
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => { e.stopPropagation(); onCheck(); }}
              onClick={(e) => e.stopPropagation()}
              style={{ width:18, height:18, accentColor:tc.gold, cursor:"pointer" }}
            />
          )}
        </div>

        {isArchived && (
          <span style={{
            fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
            background:"rgba(245,158,11,.12)", border:"1px solid rgba(245,158,11,.3)",
            color:tc.warning, whiteSpace:"nowrap", flexShrink:0,
          }}><AppIcon name="archive" size={12} color={tc.warning} /> {t.archivedBadge}</span>
        )}

        <div
          onClick={handleRowClick}
          style={{ display:"flex", alignItems:"center", gap:10, flex:1, cursor:"pointer", minWidth:0 }}
        >
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap", minWidth:0 }}>
              <p style={{ fontWeight:700, fontSize:13, color:tc.white, margin:0 }}>{displayName}</p>
              {isHajjRecord && <span style={hajjBadgeStyle}>{hajjBadgeLabel}</span>}
              {secondaryBadges.map((badge) => (
                <span key={badge.key} style={clientCompletionBadgeStyle(badge.tone)}>
                  {badge.label}
                </span>
              ))}
            </div>
            <p style={{ fontSize:10.5, color:tc.grey, marginTop:1 }}>
              {contextLine || "—"}
              {isArchived && client.archivedAt && (
                <span style={{ color:tc.warning }}> • {new Date(client.archivedAt).toLocaleDateString("ar-MA")}</span>
              )}
            </p>
          </div>
          {!selectMode && (
            <div style={{ display:"flex", gap:10, alignItems:"center", flexShrink:0 }}>
              {!isArchived && (
                <>
                  <div style={{ textAlign:"center" }}>
                    <p style={{ fontSize:9.5, color:tc.grey }}>{t.paid}</p>
                    <p style={{ fontSize:12, fontWeight:700, color:tc.greenLight }}>
                      {formatCurrency(paid, lang)}
                    </p>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <p style={{ fontSize:9.5, color:tc.grey }}>{t.remaining}</p>
                    <p style={{ fontSize:12, fontWeight:700, color:remaining>0?tc.warning:tc.greenLight }}>
                      {formatCurrency(remaining, lang)}
                    </p>
                  </div>
                </>
              )}
              <StatusBadge status={status} />
            </div>
          )}
        </div>

        {!selectMode && (
          <div style={{ position:"relative", flexShrink:0 }}>
            <button
              ref={btnRef}
              onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
              style={{
                width:32, height:32, borderRadius:8,
                background:menuOpen?"rgba(212,175,55,.18)":"var(--rukn-bg-soft)",
                border:`1px solid ${menuOpen?"rgba(212,175,55,.4)":"var(--rukn-border-soft)"}`,
                color:menuOpen?tc.gold:tc.grey,
                cursor:"pointer", fontSize:17, fontWeight:900, letterSpacing:1,
                display:"flex", alignItems:"center", justifyContent:"center",
                transition:"all .15s",
              }}>
              ···
            </button>
            {menuNode}
          </div>
        )}
      </div>
    </div>
  );
});

// ── MenuBtn helper ─────────────────────────────────────────────────────────────
function MenuBtn({ icon, label, onClick, color, hoverBg, isRTL, border }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:"flex", alignItems:"center",
        gap:10,
        flexDirection: isRTL ? "row" : "row-reverse",
        width:"100%", padding:"11px 16px",
        background: hov ? hoverBg : "transparent",
        border:"none",
        borderBottom: border ? "1px solid var(--rukn-menu-divider, rgba(255,255,255,.06))" : "none",
        color, fontSize:13, fontWeight:600,
        cursor:"pointer", fontFamily:"'Cairo',sans-serif",
        textAlign: isRTL ? "right" : "left",
        transition:"background .15s",
      }}>
      <AppIcon name={icon} size={15} color={color} />
      <span>{label}</span>
    </button>
  );
}
