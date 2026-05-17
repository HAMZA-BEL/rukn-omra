import React from "react";
import { Button, EmptyState, GlassCard, Modal, SearchBar } from "./UI";
import { AppIcon } from "./Icon";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { translateProgramType } from "../utils/i18nValues";
import { getClientDisplayName } from "../utils/clientNames";
import { getClientServiceTypeLabel } from "../utils/clientServiceTypes";
import { getClientProgramId } from "../utils/clientCompletionStatus";
import { getExplicitProgramKind } from "../utils/participantTerminology";

const tc = theme.colors;

const ARCHIVE_FILTERS = {
  ALL: "all",
  PROGRAMS: "programs",
  HAJJ: "hajj",
  UMRAH: "umrah",
};

const isArchivedProgram = (program = {}) => (
  program
  && !program.deleted
  && !program.deletedAt
  && String(program.status || "active").toLowerCase() === "archived"
);

const isArchivedClient = (client = {}) => (
  client
  && !client.deleted
  && !client.deletedAt
  && client.archived === true
);

const normalizeSearch = (value) => String(value || "").trim().toLowerCase();

const parseYear = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return String(date.getFullYear());
};

const getProgramDepartureYear = (program = {}) => (
  parseYear(program.departure || program.departureDate || program.departure_date)
);

const getProgramSearchText = (program = {}) => ([
  program.name,
  program.title,
  program.hotelMecca,
  program.hotelMadina,
  program.hotel_mecca,
  program.hotel_madina,
].filter(Boolean).join(" ").toLowerCase());

const formatArchivedDate = (value, lang) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const locale = lang === "fr" ? "fr-FR" : lang === "en" ? "en-US" : "ar-MA";
  return date.toLocaleDateString(locale);
};

const dropdownButtonStyle = (isActive = false) => ({
  height:36,
  display:"inline-flex",
  alignItems:"center",
  justifyContent:"space-between",
  gap:8,
  minWidth:132,
  padding:"0 10px",
  borderRadius:10,
  background:isActive ? "rgba(212,175,55,.1)" : "var(--rukn-bg-soft)",
  border:`1px solid ${isActive ? "rgba(212,175,55,.34)" : "var(--rukn-border-soft)"}`,
  color:isActive ? tc.gold : "var(--rukn-text-muted)",
  fontSize:12,
  fontWeight:850,
  fontFamily:"'Cairo',sans-serif",
  cursor:"pointer",
});

const dropdownMenuStyle = {
  position:"absolute",
  top:"calc(100% + 6px)",
  insetInlineStart:0,
  zIndex:45,
  minWidth:210,
  padding:6,
  borderRadius:12,
  background:"var(--rukn-menu-bg)",
  border:"1px solid var(--rukn-menu-border)",
  boxShadow:"var(--rukn-menu-shadow)",
};

const dropdownOptionStyle = (active) => ({
  width:"100%",
  display:"flex",
  alignItems:"center",
  justifyContent:"space-between",
  gap:10,
  padding:"8px 10px",
  border:0,
  borderRadius:9,
  background:active ? "rgba(212,175,55,.12)" : "transparent",
  color:active ? tc.gold : "var(--rukn-text-strong)",
  fontSize:12,
  fontWeight:active ? 900 : 750,
  cursor:"pointer",
  fontFamily:"'Cairo',sans-serif",
  textAlign:"start",
});

const countPillStyle = {
  minWidth:22,
  height:20,
  display:"inline-flex",
  alignItems:"center",
  justifyContent:"center",
  borderRadius:999,
  padding:"0 7px",
  background:"var(--rukn-bg-card)",
  color:"var(--rukn-text-muted)",
  fontSize:10,
  fontWeight:900,
};

export default function ArchivePage({ store, onToast }) {
  const { t, lang, dir, tr } = useLang();
  const [typeFilter, setTypeFilter] = React.useState(ARCHIVE_FILTERS.ALL);
  const [yearFilter, setYearFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [typeMenuOpen, setTypeMenuOpen] = React.useState(false);
  const [yearMenuOpen, setYearMenuOpen] = React.useState(false);
  const [restorePrompt, setRestorePrompt] = React.useState(null);
  const typeMenuRef = React.useRef(null);
  const yearMenuRef = React.useRef(null);
  const programs = Array.isArray(store?.programs) ? store.programs : [];
  const clients = Array.isArray(store?.clients) ? store.clients : [];
  const clientsLoaded = Boolean(store?.clientsLoaded);
  const clientsLoading = Boolean(store?.clientsLoading);
  const isSupabaseStore = Boolean(store?.isSupabaseEnabled);
  const ensureClientsLoaded = store?.ensureClientsLoaded;

  React.useEffect(() => {
    if (!isSupabaseStore || clientsLoaded || clientsLoading) return;
    ensureClientsLoaded?.();
  }, [clientsLoaded, clientsLoading, ensureClientsLoaded, isSupabaseStore]);

  React.useEffect(() => {
    if (!typeMenuOpen && !yearMenuOpen) return undefined;
    const handlePointerDown = (event) => {
      if (typeMenuOpen && !typeMenuRef.current?.contains(event.target)) setTypeMenuOpen(false);
      if (yearMenuOpen && !yearMenuRef.current?.contains(event.target)) setYearMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [typeMenuOpen, yearMenuOpen]);

  const clientCountsByProgram = React.useMemo(() => {
    const counts = new Map();
    clients.forEach((client) => {
      if (!client?.programId || client.deleted || client.deletedAt) return;
      counts.set(client.programId, (counts.get(client.programId) || 0) + 1);
    });
    return counts;
  }, [clients]);

  const programsById = React.useMemo(() => new Map(programs.map((program) => [program.id, program])), [programs]);
  const archivedProgramsAll = React.useMemo(() => programs.filter(isArchivedProgram), [programs]);
  const archivedClientsAll = React.useMemo(() => clients.filter(isArchivedClient), [clients]);

  const getProgramForClient = React.useCallback((client) => (
    programsById.get(getClientProgramId(client)) || client?.docs?.deletedProgramSnapshot || null
  ), [programsById]);

  const getClientKind = React.useCallback((client) => (
    getExplicitProgramKind(getProgramForClient(client), client)
  ), [getProgramForClient]);

  const getClientArchiveYear = React.useCallback((client) => (
    parseYear(client.archivedAt || client.archived_at)
    || getProgramDepartureYear(getProgramForClient(client))
  ), [getProgramForClient]);

  const yearOptions = React.useMemo(() => {
    const years = new Set();
    archivedProgramsAll.forEach((program) => {
      const year = getProgramDepartureYear(program);
      if (year) years.add(year);
    });
    archivedClientsAll.forEach((client) => {
      const year = getClientArchiveYear(client);
      if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [archivedClientsAll, archivedProgramsAll, getClientArchiveYear]);

  React.useEffect(() => {
    if (yearFilter !== "all" && !yearOptions.includes(yearFilter)) setYearFilter("all");
  }, [yearFilter, yearOptions]);

  const archiveTypeOptions = React.useMemo(() => {
    const hajjCount = archivedClientsAll.filter((client) => getClientKind(client) === ARCHIVE_FILTERS.HAJJ).length;
    const umrahCount = archivedClientsAll.filter((client) => getClientKind(client) === ARCHIVE_FILTERS.UMRAH).length;
    return [
      { key: ARCHIVE_FILTERS.ALL, label: t.archiveTypeAll, icon: "archive", count: archivedProgramsAll.length + archivedClientsAll.length },
      { key: ARCHIVE_FILTERS.PROGRAMS, label: t.archiveTypePrograms, icon: "program", count: archivedProgramsAll.length },
      { key: ARCHIVE_FILTERS.HAJJ, label: t.archiveTypeHajj, icon: "users", count: hajjCount },
      { key: ARCHIVE_FILTERS.UMRAH, label: t.archiveTypeUmrah, icon: "users", count: umrahCount },
    ];
  }, [archivedClientsAll, archivedProgramsAll.length, getClientKind, t.archiveTypeAll, t.archiveTypeHajj, t.archiveTypePrograms, t.archiveTypeUmrah]);

  const activeTypeOption = archiveTypeOptions.find((option) => option.key === typeFilter) || archiveTypeOptions[0];
  const selectedYearLabel = yearFilter === "all" ? t.archiveAllYears : yearFilter;
  const query = normalizeSearch(search);

  const archivedPrograms = React.useMemo(() => {
    if (typeFilter !== ARCHIVE_FILTERS.ALL && typeFilter !== ARCHIVE_FILTERS.PROGRAMS) return [];
    return archivedProgramsAll.filter((program) => {
      if (yearFilter !== "all" && getProgramDepartureYear(program) !== yearFilter) return false;
      if (!query) return true;
      return getProgramSearchText(program).includes(query);
    });
  }, [archivedProgramsAll, query, typeFilter, yearFilter]);

  const archivedClients = React.useMemo(() => {
    if (typeFilter === ARCHIVE_FILTERS.PROGRAMS) return [];
    return archivedClientsAll.filter((client) => {
      const kind = getClientKind(client);
      if (typeFilter === ARCHIVE_FILTERS.HAJJ && kind !== ARCHIVE_FILTERS.HAJJ) return false;
      if (typeFilter === ARCHIVE_FILTERS.UMRAH && kind !== ARCHIVE_FILTERS.UMRAH) return false;
      if (yearFilter !== "all" && getClientArchiveYear(client) !== yearFilter) return false;
      if (!query) return true;
      const program = getProgramForClient(client);
      const haystack = [
        getClientDisplayName(client, ""),
        client.phone,
        client.passport?.number,
        client.passportNumber,
        program?.name,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [archivedClientsAll, getClientArchiveYear, getClientKind, getProgramForClient, query, typeFilter, yearFilter]);

  const archivedHajjClients = React.useMemo(
    () => archivedClients.filter((client) => getClientKind(client) === ARCHIVE_FILTERS.HAJJ),
    [archivedClients, getClientKind]
  );
  const archivedUmrahClients = React.useMemo(
    () => archivedClients.filter((client) => getClientKind(client) === ARCHIVE_FILTERS.UMRAH),
    [archivedClients, getClientKind]
  );
  const unclassifiedArchivedClients = React.useMemo(
    () => archivedClients.filter((client) => {
      const kind = getClientKind(client);
      return kind !== ARCHIVE_FILTERS.HAJJ && kind !== ARCHIVE_FILTERS.UMRAH;
    }),
    [archivedClients, getClientKind]
  );

  const handleConfirmRestore = React.useCallback(async () => {
    if (!restorePrompt?.item) return;
    if (restorePrompt.type === "client") {
      const result = await store.restoreClient?.(restorePrompt.item.id);
      if (result?.error) return;
      onToast?.(t.clientRestoreSuccess, "success");
    } else {
      const result = await store.restoreProgramRecord?.(restorePrompt.item.id);
      if (result?.error) return;
      onToast?.(t.programRestoreSuccess, "success");
    }
    setRestorePrompt(null);
  }, [onToast, restorePrompt, store, t.clientRestoreSuccess, t.programRestoreSuccess]);

  const renderProgramCard = (program, index) => {
    const registered = clientCountsByProgram.get(program.id) || 0;
    return (
      <GlassCard
        key={program.id}
        gold
        className="animate-fadeInUp"
        style={{
          animationDelay:`${index * 0.04}s`,
          padding:18,
          border:"1px solid var(--rukn-border-soft)",
          boxShadow:"var(--rukn-shadow-card)",
        }}
      >
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:12 }}>
          <div style={{ minWidth:0 }}>
            <p style={{ fontSize:15, fontWeight:900, color:"var(--rukn-text-strong)", lineHeight:1.35, marginBottom:7 }}>
              {program.name || t.archivedPrograms}
            </p>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, color:tc.gold, background:"var(--rukn-gold-dim)", padding:"2px 9px", borderRadius:999 }}>
                {translateProgramType(program.type, lang)}
              </span>
              <span style={{ fontSize:11, color:tc.grey, background:"var(--rukn-bg-soft)", padding:"2px 9px", borderRadius:999 }}>
                {tr("archiveRegisteredCount", { count: registered })}
              </span>
            </div>
          </div>
          <Button
            variant="secondary"
            icon="restore"
            size="sm"
            onClick={() => setRestorePrompt({ type: "program", item: program })}
            style={{ flexShrink:0 }}
          >
            {t.restoreProgramAction}
          </Button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
          {[
            ["plane", t.departure, program.departure],
            ["planeLanding", t.returnDate, program.returnDate],
            ["hotel", t.hotelMecca, program.hotelMecca],
            ["building", t.hotelMadina, program.hotelMadina],
          ].map(([icon, label, value]) => (
            <div key={label} style={{ minWidth:0 }}>
              <p style={{ fontSize:10.5, color:tc.grey, display:"inline-flex", alignItems:"center", gap:5, marginBottom:3 }}>
                <AppIcon name={icon} size={13} color={tc.gold} /> {label}
              </p>
              <p style={{ fontSize:12, fontWeight:700, color:"var(--rukn-text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {value || "-"}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>
    );
  };

  const renderClientCard = (client, index) => {
    const program = getProgramForClient(client);
    const archivedDate = formatArchivedDate(client.archivedAt || client.archived_at, lang);
    return (
      <GlassCard
        key={client.id}
        className="animate-fadeInUp"
        style={{
          animationDelay:`${index * 0.04}s`,
          padding:18,
          border:"1px solid var(--rukn-border-soft)",
          boxShadow:"var(--rukn-shadow-card)",
        }}
      >
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:12 }}>
          <div style={{ minWidth:0 }}>
            <p style={{ fontSize:15, fontWeight:900, color:"var(--rukn-text-strong)", lineHeight:1.35, marginBottom:7 }}>
              {getClientDisplayName(client, client.id)}
            </p>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, color:tc.gold, background:"var(--rukn-gold-dim)", padding:"2px 9px", borderRadius:999 }}>
                {getClientServiceTypeLabel(client, t, lang)}
              </span>
              {archivedDate && (
                <span style={{ fontSize:11, color:tc.grey, background:"var(--rukn-bg-soft)", padding:"2px 9px", borderRadius:999 }}>
                  {archivedDate}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="secondary"
            icon="restore"
            size="sm"
            onClick={() => setRestorePrompt({ type: "client", item: client })}
            style={{ flexShrink:0 }}
          >
            {t.restoreClientAction}
          </Button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
          {[
            ["phone", t.phone, client.phone],
            ["program", t.program, program?.name],
            ["import", t.registrationSource, client.registrationSource || client.registration_source],
            ["passport", t.passportNo, client.passport?.number || client.passportNumber],
          ].map(([icon, label, value]) => (
            <div key={label} style={{ minWidth:0 }}>
              <p style={{ fontSize:10.5, color:tc.grey, display:"inline-flex", alignItems:"center", gap:5, marginBottom:3 }}>
                <AppIcon name={icon} size={13} color={tc.gold} /> {label}
              </p>
              <p style={{ fontSize:12, fontWeight:700, color:"var(--rukn-text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {value || "-"}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>
    );
  };

  const renderSectionHeader = (title) => (
    <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
      <h2 style={{ fontSize:15, fontWeight:900, color:"var(--rukn-text-strong)", margin:0 }}>
        {title}
      </h2>
    </div>
  );

  const renderProgramSection = (items, { showEmpty = false } = {}) => {
    if (!items.length) {
      if (!showEmpty) return null;
      return (
        <EmptyState
          icon={query || yearFilter !== "all" ? "search" : "archivedFolder"}
          title={query || yearFilter !== "all" ? t.noResultsTitle : t.noArchivedProgramsTitle}
          sub={query || yearFilter !== "all" ? t.noResultsSub : t.noArchivedProgramsSub}
        />
      );
    }
    return (
      <section style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {renderSectionHeader(t.archivedPrograms)}
        <div className="cards-grid archive-program-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16, alignItems:"start" }}>
          {items.map(renderProgramCard)}
        </div>
      </section>
    );
  };

  const renderClientSection = (title, items, { showEmpty = false, emptyTitle, emptySub } = {}) => {
    if (isSupabaseStore && !clientsLoaded && clientsLoading) {
      return <GlassCard style={{ padding:18, textAlign:"center", color:tc.grey, fontSize:13 }}>{t.loading || "Loading..."}</GlassCard>;
    }
    if (!items.length) {
      if (!showEmpty) return null;
      return (
        <EmptyState
          icon={query || yearFilter !== "all" ? "search" : "users"}
          title={query || yearFilter !== "all" ? t.noResultsTitle : emptyTitle}
          sub={query || yearFilter !== "all" ? t.noResultsSub : emptySub}
        />
      );
    }
    return (
      <section style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {renderSectionHeader(title)}
        <div className="cards-grid archive-client-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16, alignItems:"start" }}>
          {items.map(renderClientCard)}
        </div>
      </section>
    );
  };

  const renderResults = () => {
    if (typeFilter === ARCHIVE_FILTERS.PROGRAMS) {
      return renderProgramSection(archivedPrograms, { showEmpty: true });
    }
    if (typeFilter === ARCHIVE_FILTERS.HAJJ) {
      return renderClientSection(t.archivedHajj, archivedClients, {
        showEmpty: true,
        emptyTitle: t.noArchivedHajjTitle,
        emptySub: t.noArchivedHajjSub,
      });
    }
    if (typeFilter === ARCHIVE_FILTERS.UMRAH) {
      return renderClientSection(t.archivedUmrah, archivedClients, {
        showEmpty: true,
        emptyTitle: t.noArchivedUmrahTitle,
        emptySub: t.noArchivedUmrahSub,
      });
    }

    const hasResults = archivedPrograms.length
      || archivedHajjClients.length
      || archivedUmrahClients.length
      || unclassifiedArchivedClients.length
      || (isSupabaseStore && !clientsLoaded && clientsLoading);
    if (!hasResults) {
      return (
        <EmptyState
          icon={query || yearFilter !== "all" ? "search" : "archivedFolder"}
          title={query || yearFilter !== "all" ? t.noResultsTitle : t.noArchivedItemsTitle}
          sub={query || yearFilter !== "all" ? t.noResultsSub : t.noArchivedItemsSub}
        />
      );
    }
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
        {renderProgramSection(archivedPrograms)}
        {isSupabaseStore && !clientsLoaded && clientsLoading ? (
          <GlassCard style={{ padding:18, textAlign:"center", color:tc.grey, fontSize:13 }}>{t.loading || "Loading..."}</GlassCard>
        ) : (
          <>
            {renderClientSection(t.archivedHajj, archivedHajjClients)}
            {renderClientSection(t.archivedUmrah, archivedUmrahClients)}
            {renderClientSection(t.archivedClients, unclassifiedArchivedClients)}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="page-body archive-page" style={{ padding:"28px 32px" }}>
      <div className="page-header" style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, flexWrap:"wrap" }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:tc.white }}>{t.archiveNav}</h1>
            <p style={{ fontSize:13, color:tc.grey, marginTop:4 }}>
              {t.archiveProgramsSubtitle}
            </p>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <div ref={typeMenuRef} style={{ position:"relative", flex:"0 0 auto" }}>
            <button
              type="button"
              onClick={() => {
                setTypeMenuOpen((open) => !open);
                setYearMenuOpen(false);
              }}
              style={dropdownButtonStyle(typeFilter !== ARCHIVE_FILTERS.ALL)}
              aria-label={t.archiveFilter}
            >
              <span style={{ display:"inline-flex", alignItems:"center", gap:7, minWidth:0 }}>
                <AppIcon name="filter" size={14} color={typeFilter !== ARCHIVE_FILTERS.ALL ? tc.gold : tc.grey} />
                <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {activeTypeOption.label}
                </span>
              </span>
              <span style={countPillStyle}>{activeTypeOption.count}</span>
            </button>
            {typeMenuOpen && (
              <div style={dropdownMenuStyle}>
                {archiveTypeOptions.map((option) => {
                  const active = option.key === typeFilter;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        setTypeFilter(option.key);
                        setTypeMenuOpen(false);
                      }}
                      style={dropdownOptionStyle(active)}
                    >
                      <span style={{ display:"inline-flex", alignItems:"center", gap:7 }}>
                        <AppIcon name={option.icon} size={13} color={active ? tc.gold : tc.grey} />
                        {option.label}
                      </span>
                      <span style={{ ...countPillStyle, background:active ? "rgba(212,175,55,.16)" : "var(--rukn-bg-card)" }}>{option.count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div ref={yearMenuRef} style={{ position:"relative", flex:"0 0 auto" }}>
            <button
              type="button"
              onClick={() => {
                setYearMenuOpen((open) => !open);
                setTypeMenuOpen(false);
              }}
              style={dropdownButtonStyle(yearFilter !== "all")}
              aria-label={t.archiveYearFilter}
            >
              <span style={{ display:"inline-flex", alignItems:"center", gap:7 }}>
                <AppIcon name="clock" size={14} color={yearFilter !== "all" ? tc.gold : tc.grey} />
                {selectedYearLabel}
              </span>
            </button>
            {yearMenuOpen && (
              <div style={{ ...dropdownMenuStyle, minWidth:170 }}>
                {["all", ...yearOptions].map((option) => {
                  const active = option === yearFilter;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setYearFilter(option);
                        setYearMenuOpen(false);
                      }}
                      style={dropdownOptionStyle(active)}
                    >
                      <span>{option === "all" ? t.archiveAllYears : option}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <SearchBar
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t.searchArchive || t.searchArchivedItems}
            style={{ flex:"1 1 280px", minWidth:220, maxWidth:460 }}
          />
        </div>
      </div>

      {renderResults()}

      <Modal
        open={!!restorePrompt}
        onClose={() => setRestorePrompt(null)}
        title={restorePrompt?.type === "client" ? t.clientRestoreTitle : t.programRestoreTitle}
        width={520}
      >
        {restorePrompt && (
          <div style={{ display:"flex", flexDirection:"column", gap:16, direction:dir }}>
            <p style={{ fontSize:15, fontWeight:800, color:"var(--rukn-text-strong)", lineHeight:1.45 }}>
              {tr(
                restorePrompt.type === "client" ? "clientRestoreQuestion" : "programRestoreQuestion",
                { name: restorePrompt.type === "client" ? getClientDisplayName(restorePrompt.item, restorePrompt.item.id) : restorePrompt.item.name }
              )}
            </p>
            <GlassCard style={{ padding:12, background:"var(--rukn-bg-soft)", borderColor:"var(--rukn-border-soft)" }}>
              <div style={{ display:"grid", gap:9 }}>
                {[
                  [restorePrompt.type === "client" ? "users" : "program", restorePrompt.type === "client" ? t.clientRestoreReturnToClients : t.programRestoreReturnToPrograms],
                  ["copy", restorePrompt.type === "client" ? t.clientRestoreNotDuplicate : t.programRestoreNotDuplicate],
                  ["shieldCheck", t.programRestoreDataUnchanged],
                ].map(([icon, label]) => (
                  <div key={icon} style={{ display:"flex", alignItems:"flex-start", gap:9, color:"var(--rukn-text)", fontSize:12.5, lineHeight:1.55 }}>
                    <AppIcon name={icon} size={15} color={tc.gold} style={{ marginTop:2 }} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:12, flexWrap:"wrap" }}>
              <Button variant="ghost" onClick={() => setRestorePrompt(null)}>
                {t.cancel}
              </Button>
              <Button variant="secondary" icon="restore" onClick={handleConfirmRestore}>
                {t.restore}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
