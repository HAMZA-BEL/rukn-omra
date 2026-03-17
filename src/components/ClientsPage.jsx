import React from "react";
import { createPortal } from "react-dom";
import { SearchBar, Button, StatusBadge, EmptyState, Modal, GlassCard } from "./UI";
import TransferSheet from "./TransferSheet";
import ClientDetail from "./ClientDetail";
import ClientForm from "./ClientForm";
import MRZReader from "./MRZReader";
import ImportClientsModal from "./ImportClientsModal";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { formatCurrency } from "../utils/currency";
import { useDropdownPosition } from "../hooks/useDropdownPosition";

const tc = theme.colors;
const MENU_OFFSET_PX = 6;
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
  if (!fallback) return "—";
  if (UUID_REGEX.test(fallback)) {
    const start = fallback.slice(0, 4).toUpperCase();
    const end = fallback.slice(-4).toUpperCase();
    return `#${start}-${end}`;
  }
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
          getClientStatus, getClientTotalPaid,
          deleteClient, archiveClient, archiveClients, restoreClient,
          updateClient, recordActivity } = store;

  const [tab,        setTab]        = React.useState("active");
  const [search,     setSearch]     = React.useState("");
  const [filter,     setFilter]     = React.useState("all");
  const [filterProg, setFilterProg] = React.useState("all");
  const [selected,   setSelected]   = React.useState(null);
  const [editing,    setEditing]    = React.useState(null);
  const [showAdd,    setShowAdd]    = React.useState(false);
  const [checkedIds,  setCheckedIds]  = React.useState(new Set());
  const [selectMode,  setSelectMode]  = React.useState(false);
  const [showMRZ,     setShowMRZ]     = React.useState(false);
  const [mrzPrefill,  setMrzPrefill]  = React.useState(null);
  const [showImport,  setShowImport]  = React.useState(false);
  const [transferTargets, setTransferTargets] = React.useState([]);
  const [transferSheetOpen, setTransferSheetOpen] = React.useState(false);

  // Reset tab-specific state when switching tabs
  const switchTab = (newTab) => {
    setTab(newTab);
    setSearch("");
    setFilter("all");
    setFilterProg("all");
    setTransferTargets([]);
    setTransferSheetOpen(false);
    exitSelectMode();
  };

  const FILTERS = [
    { key:"all",     label:t.all,           icon:"👥" },
    { key:"cleared", label:t.clearedFilter, icon:"✅" },
    { key:"partial", label:t.partialFilter, icon:"🟠" },
    { key:"unpaid",  label:t.unpaidFilter,  icon:"🔴" },
  ];

  const sourceList = tab === "active" ? activeClients : archivedClients;

  const filtered = React.useMemo(() => sourceList.filter(c => {
    const status = getClientStatus(c);
    const ok1 = tab === "archived" || filter === "all" || status === filter;
    const ok2 = filterProg === "all" || c.programId === filterProg;
    const q   = search.toLowerCase();
    const ok3 = !q || (c.name||"").toLowerCase().includes(q) ||
      (c.phone||"").includes(q) || c.id.toLowerCase().includes(q) ||
      (c.ticketNo||"").toLowerCase().includes(q);
    return ok1 && ok2 && ok3;
  }), [sourceList, filter, filterProg, search, getClientStatus, tab]);

  const toggleCheck = (id) => setCheckedIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const clearSelection = React.useCallback(() => setCheckedIds(new Set()), [setCheckedIds]);
  const selectAllFiltered = React.useCallback(() => {
    if (!filtered.length) return;
    setCheckedIds(new Set(filtered.map(c => c.id)));
  }, [filtered, setCheckedIds]);
  const exitSelectMode = React.useCallback(() => {
    setSelectMode(false);
    clearSelection();
    setTransferTargets([]);
    setTransferSheetOpen(false);
  }, [clearSelection, setSelectMode, setTransferTargets, setTransferSheetOpen]);

  const handleBulkDelete = React.useCallback(() => {
    const ids = Array.from(checkedIds);
    if (!ids.length) return;
    if (!window.confirm(tr("confirmBulkDelete", { count: ids.length }))) return;
    ids.forEach(id => deleteClient(id));
    if (typeof recordActivity === "function") {
      recordActivity("client_bulk_delete", tr("bulkDeleteSuccess", { count: ids.length }), "");
    }
    onToast(tr("bulkDeleteSuccess", { count: ids.length }), "info");
    exitSelectMode();
  }, [checkedIds, deleteClient, exitSelectMode, onToast, tr, recordActivity]);

  const handleBulkArchive = () => {
    if (!checkedIds.size) return;
    if (!window.confirm(tr("confirmBulkArchive", { count: checkedIds.size }))) return;
    archiveClients([...checkedIds]);
    onToast(tr("bulkArchiveSuccess", { count: checkedIds.size }), "success");
    exitSelectMode();
  };

  const handleTransferSelected = () => {
    if (!checkedIds.size) {
      onToast(t.noClientsSelected || "يرجى اختيار معتمر واحد على الأقل", "info");
      return;
    }
    openTransferSheet([...checkedIds]);
  };

  const handleSingleDelete = (client) => {
    if (!window.confirm(tr("confirmDeleteClient", { name: client.name }))) return;
    deleteClient(client.id);
    setSelected(null);
    onToast(t.deleteSuccess, "info");
  };

  const handleSingleArchive = (client) => {
    if (!window.confirm(tr("confirmArchive", { name: client.name }))) return;
    archiveClient(client.id);
    setSelected(null);
    onToast(t.archiveSuccess, "success");
  };

  const handleSingleRestore = (client) => {
    restoreClient(client.id);
    setSelected(null);
    onToast(t.restoreSuccess, "success");
  };

  const allChecked = checkedIds.size === filtered.length && filtered.length > 0;
  const hasSelection = checkedIds.size > 0;

  const handleMRZResult = (mrzData) => {
    setMrzPrefill({
      nom:    mrzData.lastName  || "",
      prenom: mrzData.firstName || "",
      passport: {
        number:      mrzData.passportNo  || "",
        nationality: mrzData.nationality || "",
        birthDate:   mrzData.birthDate   || "",
        expiry:      mrzData.expiryDate  || "",
        gender:      mrzData.gender      || "",
      },
    });
    setShowMRZ(false);
    setShowAdd(true);
  };

  const programOccupancy = React.useMemo(() => {
    const counts = new Map();
    activeClients.forEach(c => {
      if (!c.programId) return;
      counts.set(c.programId, (counts.get(c.programId) || 0) + 1);
    });
    return counts;
  }, [activeClients]);

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

  const transferClients = React.useMemo(
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
    clientsToMove.forEach(client => {
      if (!client) return;
      updateClient(client.id, { ...client, programId });
    });
    onToast(tr("transferSuccess", { count: clientsToMove.length, program: destination.name }), "success");
    closeTransferSheet();
    exitSelectMode();
  }, [programs, transferTargets, activeClients, programOccupancy, updateClient, onToast, tr, t, closeTransferSheet, exitSelectMode]);

  return (
    <div className="page-body clients-page" style={{ padding:"24px 32px" }}>
      {/* Header */}
      <div className="page-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:21, fontWeight:800, color:"#f8fafc" }}>{t.clients}</h1>
          <p style={{ fontSize:12, color:tc.grey, marginTop:3 }}>
            {tr("clientsTotal", { total: sourceList.length, filtered: filtered.length })}
          </p>
        </div>
        {tab === "active" && (
          <div className="page-actions" style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <Button variant="primary" icon="🛂" onClick={() => setShowMRZ(true)}>
              + {t.mrzScan}
            </Button>
            <Button variant="ghost" icon="📊" onClick={() => setShowImport(true)}>
              {t.importExcel}
            </Button>
            <Button variant="primary" icon="➕" onClick={() => setShowAdd(true)}>
              {t.addClient}
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="page-tabs" style={{ display:"flex", gap:4, marginBottom:18,
        background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)",
        borderRadius:12, padding:4, width:"fit-content" }}>
        {[
          { key:"active",   icon:"👥", label:`${t.activeTab} (${activeClients.length})` },
          { key:"archived", icon:"📦", label:`${t.archiveTab} (${archivedClients.length})` },
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
              {showIcon && <span>{icon}</span>}
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters — active tab only */}
      {tab === "active" && (
        <div className="page-filters" style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
          {FILTERS.map(f => (
            <FilterChip key={f.key} {...f} active={filter===f.key} onClick={() => setFilter(f.key)} />
          ))}
          <select value={filterProg} onChange={e=>setFilterProg(e.target.value)} style={{
            background:filterProg!=="all"?"rgba(212,175,55,.1)":"rgba(255,255,255,.04)",
            border:`1px solid ${filterProg!=="all"?tc.gold:"rgba(255,255,255,.1)"}`,
            borderRadius:20, padding:"6px 14px",
            color:filterProg!=="all"?tc.gold:tc.grey,
            fontSize:12, fontFamily:"'Cairo',sans-serif", cursor:"pointer", direction:dir,
          }}>
            <option value="all">{t.allPrograms}</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      {/* Archive filters: program only */}
      {tab === "archived" && (
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
          <select value={filterProg} onChange={e=>setFilterProg(e.target.value)} style={{
            background:filterProg!=="all"?"rgba(212,175,55,.1)":"rgba(255,255,255,.04)",
            border:`1px solid ${filterProg!=="all"?tc.gold:"rgba(255,255,255,.1)"}`,
            borderRadius:20, padding:"6px 14px",
            color:filterProg!=="all"?tc.gold:tc.grey,
            fontSize:12, fontFamily:"'Cairo',sans-serif", cursor:"pointer", direction:dir,
          }}>
            <option value="all">{t.allPrograms}</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      <div style={{
        display:"flex",
        flexWrap:"wrap",
        gap:12,
        alignItems:"center",
        marginBottom: tab === "active" ? (selectMode ? 8 : 18) : 18,
      }}>
        <SearchBar
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder={t.searchClients}
          style={{ flex:"1 1 320px", minWidth:220, maxWidth:520 }}
        />
        {tab === "active" && filtered.length > 0 && (
          <Button
            variant={selectMode ? "warning" : "ghost"}
            size="sm"
            icon="☑️"
            disabled={!filtered.length}
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
              {tr("selectedCount", { count: checkedIds.size })}
            </span>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={selectAllFiltered}
                disabled={allChecked || filtered.length === 0}
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
                  icon="🗑️"
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
      {filtered.length === 0 ? (
        tab === "archived"
          ? <EmptyState title={t.archiveTabEmpty} sub={t.archiveTabEmptySub} />
          : <EmptyState title={t.noResultsTitle} sub={t.noResultsSub} />
      ) : (
        <div className="list-stack" style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {filtered.map((c,i) => {
            const prog      = store.getProgramById(c.programId);
            const paid      = getClientTotalPaid(c.id);
            const price     = c.salePrice || c.price || 0;
            const status    = getClientStatus(c);
            const remaining = Math.max(0, price - paid);
            return (
              <ClientRow key={c.id} client={c} program={prog}
                paid={paid} remaining={remaining}
                status={status} index={i}
                isRTL={isRTL} lang={lang}
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

      {/* Modals */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={t.clientFile} width={660}>
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
        title={`${t.editLabel} — ${t.clientFile}`} width={660}>
        {editing && (
          <ClientForm client={editing} store={store}
            onSave={() => { setEditing(null); onToast(t.updateSuccess,"success"); }}
            onCancel={() => setEditing(null)} />
        )}
      </Modal>
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setMrzPrefill(null); }} title={t.addClient} width={660}>
        <ClientForm store={store} client={mrzPrefill}
          onSave={() => { setShowAdd(false); setMrzPrefill(null); onToast(t.addSuccess,"success"); }}
          onCancel={() => { setShowAdd(false); setMrzPrefill(null); }} />
      </Modal>
      <Modal open={showMRZ} onClose={() => setShowMRZ(false)} title={t.mrzModalTitle} width={600}>
        <MRZReader onResult={handleMRZResult} onClose={() => setShowMRZ(false)} />
      </Modal>
      <Modal open={showImport} onClose={() => setShowImport(false)} title={t.importModalTitle} width={720}>
        {showImport && (
          <ImportClientsModal
            store={store}
            onClose={() => setShowImport(false)}
            onToast={onToast}
          />
        )}
      </Modal>
      <TransferSheet
        open={transferSheetOpen}
        onClose={closeTransferSheet}
        clients={transferClients}
        programs={programs}
        occupancy={programOccupancy}
        onConfirm={handleTransferConfirm}
      />
    </div>
  );
}

// ── FilterChip ────────────────────────────────────────────────────────────────
const FilterChip = React.memo(function FilterChip({ icon, label, active, onClick }) {
  const showIcon = icon && !startsWithIcon(label, icon);
  return (
    <button onClick={onClick} style={{
      display:"inline-flex", alignItems:"center", gap:6,
      padding:"6px 14px", borderRadius:20,
      background:active?"rgba(212,175,55,.15)":"rgba(255,255,255,.04)",
      border:`1px solid ${active?"rgba(212,175,55,.4)":"rgba(255,255,255,.08)"}`,
      color:active?tc.gold:tc.grey, fontSize:12, fontWeight:active?700:400,
      cursor:"pointer", fontFamily:"'Cairo',sans-serif", transition:"all .2s",
    }}>
      {showIcon && <span>{icon}</span>}
      <span>{label}</span>
    </button>
  );
});

// ── ClientRow ─────────────────────────────────────────────────────────────────
const ClientRow = React.memo(function ClientRow({ client, program, paid, remaining, status, onClick,
  index, isRTL, lang, selectMode, showCheckbox, isChecked, onCheck, onEdit, onDelete, onArchive, onRestore,
  onTransfer, editLabel, deleteLabel, archiveLabel, restoreLabel, isArchived, isMobileCard }) {
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
  const phoneLine = client.phone ? client.phone.trim() : "";
  const cityLine  = client.city ? client.city.trim() : "";
  const ticketLine = client.ticketNo ? client.ticketNo.trim() : "";
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
      style={{
        position:"fixed",
        top: menuPos.top,
        left: menuPos.left,
        visibility: menuPos.visibility,
        zIndex:9999,
        background:"rgba(20,30,50,0.96)",
        border:"1px solid rgba(212,175,55,.3)",
        borderRadius:12,
        boxShadow:"0 10px 25px rgba(0,0,0,0.35)",
        minWidth:160,
        overflow:"hidden",
      }}>
      {!isArchived && (
        <MenuBtn
          icon="✏️" label={editLabel || t.editLabel}
          onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit(); }}
          color="#f8fafc" hoverBg="rgba(212,175,55,.1)"
          isRTL={isRTL} border />
      )}
      {!isArchived && onTransfer && (
        <MenuBtn
          icon="🔁" label={t.transferClient || "نقل إلى برنامج"}
          onClick={e => { e.stopPropagation(); setMenuOpen(false); onTransfer(); }}
          color={tc.gold} hoverBg="rgba(212,175,55,.15)"
          isRTL={isRTL} border />
      )}
      {!isArchived && (
        <MenuBtn
          icon="📦" label={archiveLabel || t.archiveClient}
          onClick={e => { e.stopPropagation(); setMenuOpen(false); onArchive(); }}
          color={tc.warning} hoverBg="rgba(245,158,11,.1)"
          isRTL={isRTL} border />
      )}
      {isArchived && (
        <MenuBtn
          icon="♻️" label={restoreLabel || t.restoreClient}
          onClick={e => { e.stopPropagation(); setMenuOpen(false); onRestore(); }}
          color={tc.greenLight} hoverBg="rgba(34,197,94,.1)"
          isRTL={isRTL} border />
      )}
      <MenuBtn
        icon="🗑️" label={deleteLabel || t.deleteLabel}
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
        >
          <div className="client-card-mobile-heading">
            <div className="client-card-mobile-main">
              <span className="client-card-mobile-index">{index + 1}</span>
              <div className="client-card-mobile-avatar">
                {(client.name || "?")[0]}
              </div>
              <div className="client-card-mobile-texts">
                <p className="client-card-mobile-name-text" title={client.name || "—"}>
                  {client.name || "—"}
                </p>
                {phoneLine && <p className="client-card-mobile-phone">📞 {phoneLine}</p>}
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
            <span>{reference}</span>
            <span>•</span>
            <span>{program?.name || "—"}</span>
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
            {cityLine && <span>📍 {cityLine}</span>}
            {ticketLine && <span>🎫 {ticketLine}</span>}
          </div>
        </div>
        {menuNode}
      </div>
    );
  }

  return (
    <div className="animate-fadeInUp" style={{ animationDelay:`${index*.025}s` }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{
        display:"flex", alignItems:"center", gap:12, padding:"11px 14px",
        background:isChecked?"rgba(212,175,55,.1)":hov?"rgba(212,175,55,.05)":"rgba(255,255,255,.02)",
        border:`1px solid ${isChecked?"rgba(212,175,55,.4)":hov?"rgba(212,175,55,.24)":"rgba(255,255,255,.05)"}`,
        borderRadius:12, transition:"all .18s", position:"relative",
      }}>

        <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <span style={{ width:22, textAlign:"center", fontSize:12, color:tc.grey, fontWeight:600 }}>
            {index + 1}
          </span>
          <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
            background:"linear-gradient(135deg,rgba(212,175,55,.22),rgba(212,175,55,.06))",
            border:"1px solid rgba(212,175,55,.2)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:15, fontWeight:700, color:tc.gold }}>
            {(client.name || "?")[0]}
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
          }}>📦 {t.archivedBadge}</span>
        )}

        <div
          onClick={handleRowClick}
          style={{ display:"flex", alignItems:"center", gap:12, flex:1, cursor:"pointer", minWidth:0 }}
        >
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontWeight:700, fontSize:14, color:"#f8fafc" }}>{client.name || "—"}</p>
            <p style={{ fontSize:11, color:tc.grey, marginTop:2 }}>
              {reference} • 📞 {client.phone} • 📍 {client.city} • {program?.name||"—"}
              {isArchived && client.archivedAt && (
                <span style={{ color:tc.warning }}> • 📦 {new Date(client.archivedAt).toLocaleDateString("ar-MA")}</span>
              )}
            </p>
          </div>
          {!selectMode && (
            <div style={{ display:"flex", gap:12, alignItems:"center", flexShrink:0 }}>
              {!isArchived && (
                <>
                  <div style={{ textAlign:"center" }}>
                    <p style={{ fontSize:10, color:tc.grey }}>{t.paid}</p>
                    <p style={{ fontSize:13, fontWeight:700, color:tc.greenLight }}>
                      {formatCurrency(paid, lang)}
                    </p>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <p style={{ fontSize:10, color:tc.grey }}>{t.remaining}</p>
                    <p style={{ fontSize:13, fontWeight:700, color:remaining>0?tc.warning:tc.greenLight }}>
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
                background:menuOpen?"rgba(212,175,55,.18)":"rgba(255,255,255,.06)",
                border:`1px solid ${menuOpen?"rgba(212,175,55,.4)":"rgba(255,255,255,.12)"}`,
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
        borderBottom: border ? "1px solid rgba(255,255,255,.06)" : "none",
        color, fontSize:13, fontWeight:600,
        cursor:"pointer", fontFamily:"'Cairo',sans-serif",
        textAlign: isRTL ? "right" : "left",
        transition:"background .15s",
      }}>
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
