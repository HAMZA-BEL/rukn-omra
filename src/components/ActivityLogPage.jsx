import React from "react";
import { GlassCard, Button, SearchBar } from "./UI";
import { useLang } from "../hooks/useLang";
import { theme } from "./styles";

const PAGE_SIZE = 20;
const CATEGORY_GROUPS = {
  all: null,
  clients: [
    "client_add","client_update","client_delete","client_transfer",
    "client_archive","client_restore","client_bulk_archive","client_bulk_delete"
  ],
  programs: [
    "program_add","program_update","program_delete","program_archive","program_restore"
  ],
  payments: ["payment_add","payment_delete"],
  imports: ["import_excel","bulk_import"],
};

const PERIOD_OPTIONS = [
  { key: "all", days: null },
  { key: "today", days: 1 },
  { key: "7", days: 7 },
  { key: "30", days: 30 },
  { key: "180", days: 180 },
];

export default function ActivityLogPage({ store }) {
  const { t } = useLang();
  const [category, setCategory] = React.useState("all");
  const [period, setPeriod] = React.useState("30");
  const [page, setPage] = React.useState(0);
  const [searchDraft, setSearchDraft] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [rows, setRows] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [archiveBusy, setArchiveBusy] = React.useState(false);
  const searchDebounce = React.useRef(null);

  const fetchActivityLogPage = store.fetchActivityLogPage;
  const archiveOldActivityLog = store.archiveOldActivityLog;
  const cachedActivity = store.activityLog || [];

  const types = React.useMemo(() => CATEGORY_GROUPS[category] || null, [category]);
  const fromDate = React.useMemo(() => {
    const option = PERIOD_OPTIONS.find(p => p.key === period);
    if (!option || !option.days) return null;
    const date = new Date(Date.now() - option.days * 86400000);
    return date.toISOString();
  }, [period]);

  const applyFallback = React.useCallback((nextPage) => {
    const start = nextPage * PAGE_SIZE;
    const fallbackRows = cachedActivity.slice(start, start + PAGE_SIZE);
    if (fallbackRows.length) {
      setRows(fallbackRows);
      setTotal(cachedActivity.length);
      setPage(nextPage);
      setError(null);
    } else {
      setRows([]);
      setTotal(0);
      setError(t.activityError || "تعذّر تحميل السجل");
    }
  }, [cachedActivity, t.activityError]);

  const loadPage = React.useCallback(async (nextPage = 0) => {
    if (!fetchActivityLogPage) return;
    setLoading(true);
    setError(null);
    try {
      const { data, count, error } = await fetchActivityLogPage({
        page: nextPage,
        limit: PAGE_SIZE,
        types,
        from: fromDate,
        search,
      });
      if (error) {
        applyFallback(nextPage);
        return;
      }
      setRows(data || []);
      setTotal(count ?? 0);
      setPage(nextPage);
    } catch (err) {
      console.error("[ActivityLogPage]", err);
      applyFallback(nextPage);
    } finally {
      setLoading(false);
    }
  }, [applyFallback, fetchActivityLogPage, fromDate, search, types]);

  React.useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setSearch(searchDraft.trim());
    }, 400);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [searchDraft]);

  React.useEffect(() => {
    loadPage(0);
  }, [category, period, search, loadPage]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const disablePrev = loading || page === 0;
  const disableNext = loading || page >= totalPages - 1;

  const handleArchivePurge = async () => {
    if (!archiveOldActivityLog) return;
    setArchiveBusy(true);
    try {
      await archiveOldActivityLog(180);
      await loadPage(0);
    } finally {
      setArchiveBusy(false);
    }
  };

  return (
    <div className="page-body" style={{ padding:"24px 32px" }}>
      <div className="page-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:theme.colors.white }}>{t.activityLog || "سجل النشاط"}</h1>
          <p style={{ fontSize:12, color:theme.colors.grey }}>{t.activityLogDesc || "جميع الأحداث المهمة في النظام"}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleArchivePurge} disabled={archiveBusy}>
          {archiveBusy ? (t.loading || "جاري التحميل...") : (t.activityArchiveAction || "تنظيف السجل")}
        </Button>
      </div>

      <div className="filters-chips" style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
        {["all","clients","programs","payments","imports"].map(key => (
          <button
            key={key}
            type="button"
            onClick={() => setCategory(key)}
            style={{
              padding:"7px 16px",
              borderRadius:18,
              border:`1px solid ${category===key?theme.colors.gold:"rgba(255,255,255,.08)"}`,
              background:category===key?"rgba(212,175,55,.15)":"rgba(255,255,255,.03)",
              color:category===key?theme.colors.gold:theme.colors.grey,
              fontSize:12,
              fontWeight:category===key?700:500,
              cursor:"pointer",
            }}
          >
            {t[`activityFilter_${key}`] || key}
          </button>
        ))}
      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14 }}>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setPeriod(opt.key)}
              style={{
                padding:"5px 12px",
                borderRadius:14,
                border:`1px solid ${period===opt.key?theme.colors.gold:"rgba(255,255,255,.08)"}`,
                background:period===opt.key?"rgba(212,175,55,.15)":"rgba(255,255,255,.02)",
                color:period===opt.key?theme.colors.gold:theme.colors.grey,
                fontSize:11,
                cursor:"pointer",
              }}
            >
              {t[`activityPeriod_${opt.key}`] || opt.key}
            </button>
          ))}
        </div>
        <SearchBar
          value={searchDraft}
          onChange={(e)=>setSearchDraft(e.target.value)}
          placeholder={t.activitySearchPlaceholder || "ابحث في السجل..."}
          style={{ flex:"1 1 240px", minWidth:220 }}
        />
      </div>

      <GlassCard style={{ padding:0 }}>
        {loading && (
          <div style={{ padding:16, textAlign:"center", color:theme.colors.grey }}>{t.loading || "جاري التحميل..."}</div>
        )}
        {error && !loading && (
          <div style={{ padding:16, textAlign:"center", color:theme.colors.danger }}>{error}</div>
        )}
        {!loading && !error && rows.length === 0 && (
          <div style={{ padding:20, textAlign:"center", color:theme.colors.grey }}>{t.activityEmpty || "لا توجد أنشطة"}</div>
        )}
        {rows.map((row, idx) => (
          <ActivityLogItem key={row.id || idx} row={row} t={t} />
        ))}
      </GlassCard>

      {total > PAGE_SIZE && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:18, flexWrap:"wrap", gap:10 }}>
          <span style={{ fontSize:12, color:theme.colors.grey }}>
            {t.activityShowing || "عدد السجلات"}: {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total}
          </span>
          <div style={{ display:"flex", gap:8 }}>
            <Button variant="ghost" size="sm" onClick={() => !disablePrev && loadPage(page - 1)} disabled={disablePrev}>
              ⟵ {t.activityNewer || (t.newerUpdates || "الأحدث")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => !disableNext && loadPage(page + 1)} disabled={disableNext}>
              {t.activityOlder || (t.olderUpdates || "الأقدم")} ⟶
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityLogItem({ row, t }) {
  const time = new Date(row.time || row.created_at);
  const timeStr = `${time.toLocaleDateString("ar-MA")} ${time.toLocaleTimeString("ar-MA", { hour:"2-digit", minute:"2-digit" })}`;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6, padding:"12px 16px",
      borderBottom:"1px solid rgba(255,255,255,.05)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:12 }}>
        <span style={{ fontSize:14, fontWeight:700, color:theme.colors.white }}>{row.description}</span>
        <span style={{ fontSize:11, color:theme.colors.grey }}>{timeStr}</span>
      </div>
      {row.clientName && (
        <span style={{ fontSize:12, color:theme.colors.gold }}>{row.clientName}</span>
      )}
      {row.isArchived && (
        <span style={{ fontSize:10, color:theme.colors.grey }}>{t.archivedBadge || "مؤرشف"}</span>
      )}
    </div>
  );
}
