import React from "react";
import { createPortal } from "react-dom";
import { SearchBar, Button, StatusBadge, EmptyState, Modal } from "./UI";
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

export default function ClientsPage({ store, onToast }) {
  const { t, tr, dir, lang } = useLang();
  const isRTL = dir === "rtl";
  const { activeClients, archivedClients, programs,
          getClientStatus, getClientTotalPaid,
          deleteClient, archiveClient, archiveClients, restoreClient } = store;

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

  // Reset tab-specific state when switching tabs
  const switchTab = (newTab) => {
    setTab(newTab);
    setSearch("");
    setFilter("all");
    setFilterProg("all");
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
  const toggleAll   = () => setCheckedIds(
    checkedIds.size === filtered.length ? new Set() : new Set(filtered.map(c => c.id))
  );
  const exitSelectMode = () => { setSelectMode(false); setCheckedIds(new Set()); };

  const handleBulkDelete = () => {
    if (!checkedIds.size) return;
    if (!window.confirm(tr("confirmBulkDelete", { count: checkedIds.size }))) return;
    checkedIds.forEach(id => deleteClient(id));
    onToast(tr("bulkDeleteSuccess", { count: checkedIds.size }), "info");
    exitSelectMode();
  };

  const handleBulkArchive = () => {
    if (!checkedIds.size) return;
    if (!window.confirm(tr("confirmBulkArchive", { count: checkedIds.size }))) return;
    archiveClients([...checkedIds]);
    onToast(tr("bulkArchiveSuccess", { count: checkedIds.size }), "success");
    exitSelectMode();
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
          <div className="page-actions" style={{ display:"flex", gap:8 }}>
            {!selectMode ? (
              <>
                <Button variant="ghost" icon="☑️" onClick={() => setSelectMode(true)}>
                  {t.selectMultiple}
                </Button>
                <Button variant="primary" icon="🛂" onClick={() => setShowMRZ(true)}>
                  + {t.mrzScan}
                </Button>
                <Button variant="ghost" icon="📊" onClick={() => setShowImport(true)}>
                  {t.importExcel}
                </Button>
                <Button variant="primary" icon="➕" onClick={() => setShowAdd(true)}>
                  {t.addClient}
                </Button>
              </>
            ) : (
              <>
                <span style={{ fontSize:13, color:tc.gold, alignSelf:"center", fontWeight:700 }}>
                  {tr("selectedCount", { count: checkedIds.size })}
                </span>
                <Button variant="secondary" onClick={toggleAll}>
                  {allChecked ? t.deselectAll : t.selectAll}
                </Button>
                <Button variant="warning"
                  disabled={!checkedIds.size} onClick={handleBulkArchive}>
                  {t.archiveSelected}
                </Button>
                <Button variant="danger" icon="🗑️"
                  disabled={!checkedIds.size} onClick={handleBulkDelete}>
                  {t.deleteSelected}
                </Button>
                <Button variant="ghost" onClick={exitSelectMode}>{t.cancel}</Button>
              </>
            )}
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
        ].map(({ key, icon, label }) => (
          <button key={key} onClick={() => switchTab(key)} style={{
            padding:"7px 18px", borderRadius:9, fontSize:13, fontWeight:tab===key?700:400,
            background:tab===key?"rgba(212,175,55,.15)":"transparent",
            border:tab===key?"1px solid rgba(212,175,55,.35)":"1px solid transparent",
            color:tab===key?tc.gold:tc.grey, cursor:"pointer",
            fontFamily:"'Cairo',sans-serif", transition:"all .2s",
          }}>
            {icon} {label}
          </button>
        ))}
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

      <SearchBar value={search} onChange={e=>setSearch(e.target.value)}
        placeholder={t.searchClients} style={{ marginBottom:18, maxWidth:460 }} />

      {/* Select all bar — active tab */}
      {tab === "active" && selectMode && filtered.length > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:12,
          padding:"10px 16px", marginBottom:10,
          background:"rgba(212,175,55,.06)", border:"1px solid rgba(212,175,55,.2)",
          borderRadius:10 }}>
          <input type="checkbox" checked={allChecked} onChange={toggleAll}
            style={{ width:16, height:16, accentColor:tc.gold, cursor:"pointer" }} />
          <span style={{ fontSize:13, color:tc.gold, fontWeight:600 }}>
            {tr("selectAllCount", { count: filtered.length })}
          </span>
          {checkedIds.size > 0 && (
            <span style={{ fontSize:12, color:tc.grey }}>
              — {tr("selectedCount", { count: checkedIds.size })}
            </span>
          )}
        </div>
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
                editLabel={t.editLabel}
                deleteLabel={t.deleteLabel}
                archiveLabel={t.archiveClient}
                restoreLabel={t.restoreClient}
                isArchived={tab === "archived"}
                selectMode={selectMode && tab === "active"}
                isChecked={checkedIds.has(c.id)}
                onCheck={() => toggleCheck(c.id)}
                onClick={() => { if (selectMode && tab === "active") { toggleCheck(c.id); return; } setSelected(c); }}
                onEdit={() => setEditing(c)}
                onDelete={() => tab === "archived" ? handleSingleDelete(c) : handleSingleDelete(c)}
                onArchive={() => handleSingleArchive(c)}
                onRestore={() => handleSingleRestore(c)}
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
    </div>
  );
}

// ── FilterChip ────────────────────────────────────────────────────────────────
const FilterChip = React.memo(function FilterChip({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:"inline-flex", alignItems:"center", gap:6,
      padding:"6px 14px", borderRadius:20,
      background:active?"rgba(212,175,55,.15)":"rgba(255,255,255,.04)",
      border:`1px solid ${active?"rgba(212,175,55,.4)":"rgba(255,255,255,.08)"}`,
      color:active?tc.gold:tc.grey, fontSize:12, fontWeight:active?700:400,
      cursor:"pointer", fontFamily:"'Cairo',sans-serif", transition:"all .2s",
    }}>{icon} {label}</button>
  );
});

// ── ClientRow ─────────────────────────────────────────────────────────────────
const ClientRow = React.memo(function ClientRow({ client, program, paid, remaining, status, onClick,
  index, isRTL, lang, selectMode, isChecked, onCheck, onEdit, onDelete, onArchive, onRestore,
  editLabel, deleteLabel, archiveLabel, restoreLabel, isArchived }) {
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

  return (
    <div className="animate-fadeInUp" style={{ animationDelay:`${index*.025}s` }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{
        display:"flex", alignItems:"center", gap:10, padding:"11px 14px",
        background:isChecked?"rgba(212,175,55,.1)":hov?"rgba(212,175,55,.05)":"rgba(255,255,255,.02)",
        border:`1px solid ${isChecked?"rgba(212,175,55,.4)":hov?"rgba(212,175,55,.24)":"rgba(255,255,255,.05)"}`,
        borderRadius:12, transition:"all .18s", position:"relative",
      }}>

        {/* Checkbox */}
        {selectMode && (
          <input type="checkbox" checked={isChecked}
            onChange={e => { e.stopPropagation(); onCheck(); }}
            onClick={e => e.stopPropagation()}
            style={{ width:18, height:18, accentColor:tc.gold, cursor:"pointer", flexShrink:0 }} />
        )}

        {/* Archived badge */}
        {isArchived && (
          <span style={{
            fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
            background:"rgba(245,158,11,.12)", border:"1px solid rgba(245,158,11,.3)",
            color:tc.warning, whiteSpace:"nowrap", flexShrink:0,
          }}>📦 {t.archivedBadge}</span>
        )}

        {/* Main clickable area */}
        <div onClick={onClick} style={{ display:"flex", alignItems:"center", gap:12, flex:1, cursor:"pointer", minWidth:0 }}>
          <div style={{ width:40, height:40, borderRadius:10, flexShrink:0,
            background:"linear-gradient(135deg,rgba(212,175,55,.22),rgba(212,175,55,.06))",
            border:"1px solid rgba(212,175,55,.2)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:16, fontWeight:700, color:tc.gold }}>
            {(client.name || "?")[0]}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontWeight:700, fontSize:14, color:"#f8fafc" }}>{client.name || "—"}</p>
            <p style={{ fontSize:11, color:tc.grey, marginTop:2 }}>
              {client.id} • 📞 {client.phone} • 📍 {client.city} • {program?.name||"—"}
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

        {/* ··· Button + Menu */}
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

            {menuOpen && createPortal(
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
            )}
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
