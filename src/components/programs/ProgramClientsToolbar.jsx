import { Button } from "../UI";
import { AppIcon } from "../Icon";
import { theme } from "../styles";

const tc = theme.colors;

export default function ProgramClientsToolbar({
  selectMode,
  statusFilterRef,
  statusFilterOpen,
  onToggleStatusFilter,
  activeStatusFilter,
  filter,
  filters,
  serviceTypeFilterRef,
  serviceTypeFilterOpen,
  onToggleServiceTypeFilter,
  activeServiceTypeFilter,
  serviceTypeFilter,
  serviceTypeFilters = [],
  showTravelGroupFilter = false,
  travelGroupFilterRef,
  travelGroupFilterOpen,
  onToggleTravelGroupFilter,
  activeTravelGroupFilter,
  travelGroupFilter,
  travelGroupFilters = [],
  filterMenuBaseStyle,
  filterMenuItemStyle,
  filterMenuCountStyle,
  onSelectStatusFilter,
  onSelectServiceTypeFilter,
  onSelectTravelGroupFilter,
  searchExpanded,
  search,
  searchInputRef,
  onSearchMouseEnter,
  onSearchMouseLeave,
  onSearchButtonClick,
  onSearchChange,
  onSearchFocus,
  onSearchBlur,
  onClearSearch,
  filteredCount,
  onToggleSelectMode,
  t,
  lang,
  dir,
  isRTL,
  programClientRangeStart,
  programClientRangeEnd,
  programClientPageSize,
  onProgramClientPageSizeChange,
  programClientPageSizeOptions,
  safeProgramClientPage,
  totalProgramClientPages,
  onGoToProgramClientPage,
}) {
  return (
    <>
      <div style={{
        display:"flex",
        flexWrap:"wrap",
        gap:10,
        alignItems:"center",
        justifyContent:"space-between",
        marginBottom: selectMode ? 8 : 16,
      }}>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <div ref={statusFilterRef} style={{ position:"relative" }}>
            <button type="button" onClick={onToggleStatusFilter} style={{
              minWidth:138,
              display:"inline-flex",
              alignItems:"center",
              justifyContent:"space-between",
              gap:10,
              padding:"7px 11px",
              borderRadius:12,
              background:"rgba(255,255,255,.04)",
              border:"1px solid rgba(255,255,255,.1)",
              color:tc.grey,
              fontSize:12,
              fontWeight:800,
              cursor:"pointer",
              fontFamily:"'Cairo',sans-serif",
            }}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:7 }}>
                <AppIcon name="clearance" size={14} color={filter === "all" ? tc.grey : tc.gold} />
                <span>{activeStatusFilter.label}</span>
              </span>
              <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                <span style={{
                  minWidth:20,
                  textAlign:"center",
                  borderRadius:999,
                  padding:"0 6px",
                  background:"rgba(255,255,255,.06)",
                  color:filter === "all" ? tc.grey : tc.gold,
                  fontSize:10,
                }}>{activeStatusFilter.count}</span>
                <AppIcon name="chevronBack" size={13} color={tc.grey} style={{ transform:"rotate(-90deg)" }} />
              </span>
            </button>
            {statusFilterOpen && (
              <div style={{
                ...filterMenuBaseStyle,
                insetInlineStart:0,
                width:180,
              }}>
                {filters.map(f=>(
                  <button key={f.key} type="button" onClick={() => onSelectStatusFilter(f.key)} style={filterMenuItemStyle(filter === f.key)}>
                    <span>{f.label}</span>
                    <span style={filterMenuCountStyle(filter === f.key)}>{f.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div ref={serviceTypeFilterRef} style={{ position:"relative" }}>
            <button type="button" onClick={onToggleServiceTypeFilter} style={{
              minWidth:166,
              display:"inline-flex",
              alignItems:"center",
              justifyContent:"space-between",
              gap:10,
              padding:"7px 11px",
              borderRadius:12,
              background:"rgba(255,255,255,.04)",
              border:"1px solid rgba(255,255,255,.1)",
              color:tc.grey,
              fontSize:12,
              fontWeight:800,
              cursor:"pointer",
              fontFamily:"'Cairo',sans-serif",
            }}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:7, minWidth:0 }}>
                <AppIcon name="program" size={14} color={serviceTypeFilter === "all" ? tc.grey : tc.gold} />
                <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{activeServiceTypeFilter.label}</span>
              </span>
              <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                <span style={{
                  minWidth:20,
                  textAlign:"center",
                  borderRadius:999,
                  padding:"0 6px",
                  background:"rgba(255,255,255,.06)",
                  color:serviceTypeFilter === "all" ? tc.grey : tc.gold,
                  fontSize:10,
                }}>{activeServiceTypeFilter.count}</span>
                <AppIcon name="chevronBack" size={13} color={tc.grey} style={{ transform:"rotate(-90deg)" }} />
              </span>
            </button>
            {serviceTypeFilterOpen && (
              <div style={{
                ...filterMenuBaseStyle,
                insetInlineStart:0,
                width:218,
              }}>
                {serviceTypeFilters.map(f=>(
                  <button key={f.key} type="button" onClick={() => onSelectServiceTypeFilter(f.key)} style={filterMenuItemStyle(serviceTypeFilter === f.key)}>
                    <span>{f.menuLabel || f.label}</span>
                    <span style={filterMenuCountStyle(serviceTypeFilter === f.key)}>{f.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {showTravelGroupFilter && (
            <div ref={travelGroupFilterRef} style={{ position:"relative" }}>
              <button type="button" onClick={onToggleTravelGroupFilter} style={{
                minWidth:166,
                maxWidth:220,
                display:"inline-flex",
                alignItems:"center",
                justifyContent:"space-between",
                gap:10,
                padding:"7px 11px",
                borderRadius:12,
                background:"rgba(255,255,255,.04)",
                border:"1px solid rgba(255,255,255,.1)",
                color:tc.grey,
                fontSize:12,
                fontWeight:800,
                cursor:"pointer",
                fontFamily:"'Cairo',sans-serif",
              }}>
                <span style={{ display:"inline-flex", alignItems:"center", gap:7, minWidth:0 }}>
                  <AppIcon name="users" size={14} color={travelGroupFilter === "all" ? tc.grey : tc.gold} />
                  <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {activeTravelGroupFilter.label}
                  </span>
                </span>
                <AppIcon name="chevronBack" size={13} color={tc.grey} style={{ transform:"rotate(-90deg)", flexShrink:0 }} />
              </button>
              {travelGroupFilterOpen && (
                <div style={{
                  ...filterMenuBaseStyle,
                  insetInlineStart:0,
                  width:230,
                }}>
                  {travelGroupFilters.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => onSelectTravelGroupFilter(option.key)}
                      style={filterMenuItemStyle(travelGroupFilter === option.key)}
                    >
                      <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div
            onMouseEnter={onSearchMouseEnter}
            onMouseLeave={onSearchMouseLeave}
            style={{
              width:searchExpanded ? 280 : 38,
              height:38,
              maxWidth:"100%",
              display:"flex",
              alignItems:"center",
              gap:6,
              borderRadius:12,
              background:"rgba(255,255,255,.04)",
              border:`1px solid ${searchExpanded ? "rgba(212,175,55,.22)" : "rgba(255,255,255,.1)"}`,
              padding:searchExpanded ? "0 9px" : 0,
              overflow:"hidden",
              transition:"width .22s ease, border-color .22s ease, padding .22s ease",
            }}
          >
            <button type="button" onClick={onSearchButtonClick} style={{
              width:38,
              height:36,
              flex:"0 0 38px",
              border:0,
              background:"transparent",
              color:tc.gold,
              display:"inline-flex",
              alignItems:"center",
              justifyContent:"center",
              cursor:"pointer",
            }} aria-label={t.searchClients || t.searchPrograms}>
              <AppIcon name="search" size={17} color={tc.gold} />
            </button>
            {searchExpanded && (
              <>
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={onSearchChange}
                  onFocus={onSearchFocus}
                  onBlur={onSearchBlur}
                  placeholder={t.searchClients || t.searchPrograms}
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
                  <button type="button" onClick={onClearSearch} style={{
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
        </div>
        {filteredCount > 0 && (
          <Button
            variant={selectMode ? "warning" : "ghost"}
            size="sm"
            icon="checked"
            onClick={onToggleSelectMode}
          >
            {selectMode ? (t.finishSelection || t.cancel) : t.selectMultiple}
          </Button>
        )}
      </div>

      {filteredCount > 0 && (
        <div style={{
          display:"flex",
          alignItems:"center",
          justifyContent:"space-between",
          gap:10,
          flexWrap:"wrap",
          marginBottom: selectMode ? 8 : 14,
          padding:"8px 10px",
          border:"1px solid rgba(255,255,255,.08)",
          borderRadius:10,
          background:"rgba(255,255,255,.025)",
        }}>
          <span style={{ color:tc.grey, fontSize:11.5, fontWeight:700 }}>
            {lang === "fr"
              ? `Affichage ${programClientRangeStart} - ${programClientRangeEnd} sur ${filteredCount}`
              : lang === "en"
                ? `Showing ${programClientRangeStart} - ${programClientRangeEnd} of ${filteredCount}`
                : `عرض ${programClientRangeStart} - ${programClientRangeEnd} من ${filteredCount}`}
          </span>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <select
              value={programClientPageSize}
              onChange={onProgramClientPageSizeChange}
              style={{
                height:32,
                borderRadius:9,
                border:"1px solid rgba(255,255,255,.12)",
                background:"rgba(255,255,255,.04)",
                color:tc.white,
                padding:"0 9px",
                fontSize:11.5,
                fontWeight:800,
                fontFamily:"'Cairo',sans-serif",
                direction:dir,
                outline:"none",
                cursor:"pointer",
              }}
            >
              {programClientPageSizeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
              <button
                type="button"
                onClick={() => onGoToProgramClientPage(safeProgramClientPage - 1)}
                disabled={safeProgramClientPage <= 1}
                style={{
                  width:30,
                  height:30,
                  borderRadius:8,
                  border:"1px solid rgba(255,255,255,.1)",
                  background:"rgba(255,255,255,.04)",
                  color:safeProgramClientPage <= 1 ? "rgba(148,163,184,.45)" : tc.gold,
                  cursor:safeProgramClientPage <= 1 ? "not-allowed" : "pointer",
                  display:"inline-flex",
                  alignItems:"center",
                  justifyContent:"center",
                }}
                aria-label={t.previous || "Previous"}
              >
                <AppIcon name="chevronBack" size={14} color="currentColor" style={{ transform:isRTL ? "rotate(180deg)" : "none" }} />
              </button>
              <span style={{ color:tc.gold, fontSize:11.5, fontWeight:900, minWidth:72, textAlign:"center" }}>
                {lang === "fr" || lang === "en"
                  ? `Page ${safeProgramClientPage} / ${totalProgramClientPages}`
                  : `صفحة ${safeProgramClientPage} / ${totalProgramClientPages}`}
              </span>
              <button
                type="button"
                onClick={() => onGoToProgramClientPage(safeProgramClientPage + 1)}
                disabled={safeProgramClientPage >= totalProgramClientPages}
                style={{
                  width:30,
                  height:30,
                  borderRadius:8,
                  border:"1px solid rgba(255,255,255,.1)",
                  background:"rgba(255,255,255,.04)",
                  color:safeProgramClientPage >= totalProgramClientPages ? "rgba(148,163,184,.45)" : tc.gold,
                  cursor:safeProgramClientPage >= totalProgramClientPages ? "not-allowed" : "pointer",
                  display:"inline-flex",
                  alignItems:"center",
                  justifyContent:"center",
                }}
                aria-label={t.next || "Next"}
              >
                <AppIcon name="chevronBack" size={14} color="currentColor" style={{ transform:isRTL ? "none" : "rotate(180deg)" }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
