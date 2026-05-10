import React from "react";
import { createPortal } from "react-dom";
import { Filter } from "lucide-react";
import { GlassCard, Button, SearchBar } from "./UI";
import { useLang } from "../hooks/useLang";
import { theme } from "./styles";
import { translateActivityDescription } from "../utils/i18nValues";

const PAGE_SIZE = 20;

const PERIOD_OPTIONS = [
  { key: "all", days: null },
  { key: "today", days: "today" },
  { key: "7", days: 7 },
  { key: "30", days: 30 },
  { key: "180", days: 180 },
];

const CATEGORY_KEYS = ["all", "clients", "programs", "payments", "imports"];

const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

const getActivityTime = (row = {}) => {
  const raw = row.time || row.created_at || row.createdAt || row.date || row.timestamp;
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const getActivityCategory = (row = {}) => {
  const type = normalizeText(row.type || row.action || row.entity);
  const text = [
    row.type,
    row.action,
    row.entity,
    row.description,
    row.title,
    row.clientName,
    row.programName,
    row.receiptNo,
    row.receiptNumber,
    row.metadata && JSON.stringify(row.metadata),
    row.meta && JSON.stringify(row.meta),
  ].filter(Boolean).join(" ").toLowerCase();

  if (type.startsWith("client_") || type.includes("pilgrim") || /معتمر|client|pilgrim|pèlerin/.test(text)) return "clients";
  if (type.startsWith("program_") || /برنامج|program|programme/.test(text)) return "programs";
  if (type.startsWith("payment_") || /دفعة|دفع|وصل|payment|paiement|receipt|reçu/.test(text)) return "payments";
  if (
    type.startsWith("import_")
    || type.includes("import")
    || type.includes("backup")
    || /استيراد|استورد|import|backup|sauvegarde|ملف|excel/.test(text)
  ) return "imports";

  return "other";
};

const buildSearchHaystack = (row = {}) => [
  row.type,
  row.action,
  row.entity,
  row.description,
  row.title,
  row.clientName,
  row.client_name,
  row.programName,
  row.program_name,
  row.receiptNo,
  row.receiptNumber,
  row.paymentNumber,
  row.metadata && JSON.stringify(row.metadata),
  row.meta && JSON.stringify(row.meta),
].filter(Boolean).join(" ").toLowerCase();

const isWithinPeriod = (row, periodKey) => {
  if (periodKey === "all") return true;
  const time = getActivityTime(row);
  if (!time) return false;
  const now = new Date();
  if (periodKey === "today") {
    return time.getFullYear() === now.getFullYear()
      && time.getMonth() === now.getMonth()
      && time.getDate() === now.getDate();
  }
  const days = Number(periodKey);
  if (!Number.isFinite(days)) return true;
  return time.getTime() >= now.getTime() - days * 86400000;
};

const getPeriodStartIso = (periodKey) => {
  if (periodKey === "all") return null;
  const now = new Date();
  if (periodKey === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return start.toISOString();
  }
  const days = Number(periodKey);
  if (!Number.isFinite(days)) return null;
  return new Date(now.getTime() - days * 86400000).toISOString();
};

export default function ActivityLogPage({ store }) {
  const { t, lang } = useLang();
  const [category, setCategory] = React.useState("all");
  const [period, setPeriod] = React.useState("30");
  const [searchDraft, setSearchDraft] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [rows, setRows] = React.useState([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [archiveBusy, setArchiveBusy] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const searchDebounce = React.useRef(null);
  const filtersRef = React.useRef(null);
  const filterButtonRef = React.useRef(null);
  const filterMenuRef = React.useRef(null);
  const loadSeqRef = React.useRef(0);
  const [filterMenuStyle, setFilterMenuStyle] = React.useState(null);

  const fetchActivityLogPage = store.fetchActivityLogPage;
  const archiveOldActivityLog = store.archiveOldActivityLog;
  const cachedActivity = store.activityLog || [];
  const canFetchRemoteActivity = Boolean(store.isSupabaseEnabled && fetchActivityLogPage);

  const applyLocalPage = React.useCallback(() => {
    const q = normalizeText(search);
    const filtered = (Array.isArray(cachedActivity) ? cachedActivity : [])
      .filter((row) => category === "all" || getActivityCategory(row) === category)
      .filter((row) => isWithinPeriod(row, period))
      .filter((row) => !q || buildSearchHaystack(row).includes(q))
      .sort((a, b) => {
        const aTime = getActivityTime(a)?.getTime() || 0;
        const bTime = getActivityTime(b)?.getTime() || 0;
        return bTime - aTime;
      });
    const start = (page - 1) * PAGE_SIZE;
    setRows(filtered.slice(start, start + PAGE_SIZE));
    setTotalCount(filtered.length);
    setError(null);
  }, [cachedActivity, category, page, period, search]);

  const loadActivities = React.useCallback(async () => {
    if (!canFetchRemoteActivity) {
      applyLocalPage();
      return;
    }
    const loadSeq = loadSeqRef.current + 1;
    loadSeqRef.current = loadSeq;
    setLoading(true);
    setError(null);
    setRows([]);
    try {
      const { data, error, count } = await fetchActivityLogPage({
        offset: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        category,
        search,
        from: getPeriodStartIso(period),
      });
      if (loadSeqRef.current !== loadSeq) return;
      if (error) {
        setRows([]);
        setTotalCount(0);
        setError(t.activityError || "تعذّر تحميل السجل");
        return;
      }
      const nextRows = Array.isArray(data) ? data : [];
      setRows(nextRows);
      setTotalCount(Number.isFinite(Number(count)) ? Number(count) : nextRows.length);
    } catch (err) {
      console.error("[ActivityLogPage]", err);
      if (loadSeqRef.current !== loadSeq) return;
      setRows([]);
      setTotalCount(0);
      setError(t.activityError || "تعذّر تحميل السجل");
    } finally {
      if (loadSeqRef.current === loadSeq) setLoading(false);
    }
  }, [applyLocalPage, canFetchRemoteActivity, category, fetchActivityLogPage, page, period, search, t.activityError]);

  React.useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      setSearch(searchDraft.trim());
    }, 400);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [searchDraft]);

  const handleCategoryChange = React.useCallback((nextCategory) => {
    setPage(1);
    setCategory(nextCategory);
  }, []);

  const handlePeriodChange = React.useCallback((nextPeriod) => {
    setPage(1);
    setPeriod(nextPeriod);
  }, []);

  React.useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  React.useEffect(() => {
    if (!filtersOpen) return undefined;
    const handlePointer = (event) => {
      if (
        (filtersRef.current && filtersRef.current.contains(event.target))
        || (filterMenuRef.current && filterMenuRef.current.contains(event.target))
      ) return;
      setFiltersOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [filtersOpen]);

  React.useLayoutEffect(() => {
    if (!filtersOpen || !filterButtonRef.current) return undefined;
    const updatePosition = () => {
      const rect = filterButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(520, window.innerWidth - 48);
      setFilterMenuStyle({
        top: rect.bottom + 8,
        left: Math.max(24, Math.min(rect.right - width, window.innerWidth - width - 24)),
        width,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [filtersOpen]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStartIndex = (safePage - 1) * PAGE_SIZE;
  const pageEndIndex = Math.min(pageStartIndex + rows.length, totalCount);
  const canGoPrevious = safePage > 1;
  const canGoNext = safePage < totalPages;

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const rangeLabel = React.useMemo(() => {
    if (!totalCount) return "";
    const first = pageStartIndex + 1;
    const last = pageEndIndex;
    const template = t.activityRange || (
      lang === "fr" ? "Affichage de {start}–{end} sur {total}"
        : lang === "en" ? "Showing {start}–{end} of {total}"
          : "عرض {start}–{end} من {total}"
    );
    return String(template)
      .replaceAll("{start}", first)
      .replaceAll("{end}", last)
      .replaceAll("{total}", totalCount);
  }, [lang, pageEndIndex, pageStartIndex, t.activityRange, totalCount]);
  const categoryOptions = React.useMemo(
    () => CATEGORY_KEYS.map((key) => ({ key, label:t[`activityFilter_${key}`] || key })),
    [t]
  );
  const periodOptions = React.useMemo(
    () => PERIOD_OPTIONS.map((opt) => ({ key:opt.key, label:t[`activityPeriod_${opt.key}`] || opt.key })),
    [t]
  );
  const filterSummary = [
    categoryOptions.find((option) => option.key === category)?.label,
    periodOptions.find((option) => option.key === period)?.label,
  ].filter(Boolean).join(" · ");
  const filtersMenu = filtersOpen && filterMenuStyle && typeof document !== "undefined"
    ? createPortal(
      <div style={{
        position: "fixed",
        top: filterMenuStyle.top,
        left: filterMenuStyle.left,
        width: filterMenuStyle.width,
        padding: 12,
        borderRadius: 14,
        background: "var(--rukn-bg-card)",
        border: "1px solid var(--rukn-border-soft)",
        boxShadow: "0 22px 48px rgba(0,0,0,.34)",
        zIndex: 14000,
        display: "grid",
        gap: 10,
      }} ref={filterMenuRef}>
        <CompactChipGroup value={category} options={categoryOptions} onChange={handleCategoryChange} />
        <CompactChipGroup value={period} options={periodOptions} onChange={handlePeriodChange} />
      </div>,
      document.body
    )
    : null;

  const handleArchivePurge = async () => {
    if (!archiveOldActivityLog) return;
    setArchiveBusy(true);
    try {
      await archiveOldActivityLog(180);
      if (page !== 1) setPage(1);
      else await loadActivities();
    } finally {
      setArchiveBusy(false);
    }
  };

  return (
    <div className="page-body" style={{ padding:"24px 32px" }}>
      <div className="page-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:10 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:theme.colors.white, lineHeight:1.2 }}>{t.activityLog || "سجل النشاط"}</h1>
          <p style={{ fontSize:12, color:theme.colors.grey, marginTop:3 }}>{t.activityLogDesc || "جميع الأحداث المهمة في النظام"}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleArchivePurge} disabled={archiveBusy}>
          {archiveBusy ? (t.loading || "جاري التحميل...") : (t.activityArchiveAction || "تنظيف السجل")}
        </Button>
      </div>

      <GlassCard style={{ padding:"10px 12px", marginBottom:14, overflow:"visible" }}>
        <div style={{
          display:"flex",
          gap:10,
          flexWrap:"wrap",
          alignItems:"center",
        }}>
          <div style={{ flex:"1 1 300px", minWidth:220 }}>
            <SearchBar
              value={searchDraft}
              onChange={(e)=>setSearchDraft(e.target.value)}
              placeholder={t.activitySearchPlaceholder || "ابحث في السجل..."}
              style={{ width:"100%" }}
            />
          </div>
          <div ref={filtersRef} style={{ position:"relative", flex:"0 0 auto" }}>
            <div ref={filterButtonRef}>
              <Button
                variant="secondary"
                size="sm"
                icon={<Filter size={16} />}
                onClick={() => setFiltersOpen((open) => !open)}
                style={{ minHeight:38, minWidth:120 }}
              >
                {t.filterLabel || (lang === "fr" ? "Filtrer" : lang === "en" ? "Filter" : "تصفية")}
              </Button>
            </div>
          </div>
          <span style={{
            flex:"0 1 auto",
            fontSize:12,
            color:"var(--rukn-text-muted)",
            whiteSpace:"nowrap",
            paddingInline:"2px",
          }}>
            {filterSummary}
          </span>
        </div>
      </GlassCard>

      {filtersMenu}

      <GlassCard style={{ padding:0 }}>
        {loading && (
          <div style={{ padding:16, textAlign:"center", color:theme.colors.grey }}>{t.loading || "جاري التحميل..."}</div>
        )}
        {error && !loading && (
          <div style={{ padding:16, textAlign:"center", color:theme.colors.danger }}>{error}</div>
        )}
        {!loading && !error && rows.length === 0 && (
          <div style={{ padding:20, textAlign:"center", color:theme.colors.grey }}>
            {t.activityEmpty || "لا توجد أنشطة مطابقة للفلاتر الحالية"}
          </div>
        )}
        {rows.map((row, idx) => (
          <ActivityLogItem key={row.id || idx} row={row} t={t} lang={lang} />
        ))}
      </GlassCard>

      {totalCount > 0 && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:18, flexWrap:"wrap", gap:10 }}>
          <span style={{ fontSize:12, color:theme.colors.grey }}>
            {rangeLabel}
          </span>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <Button
              variant="ghost"
              size="sm"
              disabled={!canGoPrevious}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t.activityPrevious || "Previous"}
            </Button>
            <span style={{
              minHeight:30,
              display:"inline-flex",
              alignItems:"center",
              padding:"0 10px",
              borderRadius:10,
              border:"1px solid var(--rukn-border-soft)",
              background:"var(--rukn-bg-soft)",
              color:"var(--rukn-text-muted)",
              fontSize:12,
              fontWeight:700,
            }}>
              {t.activityPage || "Page"} {safePage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={!canGoNext}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              {t.activityNext || "Next"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CompactChipGroup({ value, options, onChange }) {
  return (
    <div style={{
      display:"flex",
      gap:4,
      flexWrap:"wrap",
      padding:4,
      borderRadius:14,
      background:"var(--rukn-bg-soft)",
      border:"1px solid var(--rukn-border-soft)",
      minWidth:0,
    }}>
      {options.map((option) => {
        const active = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            style={{
              flex:"1 1 auto",
              minWidth:0,
              minHeight:30,
              padding:"5px 9px",
              borderRadius:10,
              border:`1px solid ${active ? "var(--rukn-gold)" : "transparent"}`,
              background:active ? "var(--rukn-gold-dim)" : "transparent",
              color:active ? "var(--rukn-gold)" : "var(--rukn-text-muted)",
              fontFamily:"'Cairo',sans-serif",
              fontSize:11,
              fontWeight:active ? 800 : 700,
              lineHeight:1.25,
              whiteSpace:"nowrap",
              cursor:"pointer",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ActivityLogItem({ row, t, lang }) {
  const time = getActivityTime(row);
  const locale = lang === "fr" ? "fr-FR" : lang === "en" ? "en-US" : "ar-MA";
  const timeStr = time
    ? `${time.toLocaleDateString(locale)} ${time.toLocaleTimeString(locale, { hour:"2-digit", minute:"2-digit" })}`
    : "—";
  const description = translateActivityDescription(row.description, lang);
  const clientName = row.clientName || row.client_name;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6, padding:"12px 16px",
      background:"var(--rukn-row-bg)",
      borderBottom:"1px solid var(--rukn-row-border)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:12 }}>
        <span style={{ fontSize:14, fontWeight:700, color:theme.colors.white }}>{description}</span>
        <span style={{ fontSize:11, color:theme.colors.grey }}>{timeStr}</span>
      </div>
      {clientName && (
        <span style={{ fontSize:12, color:theme.colors.gold }}>{clientName}</span>
      )}
      {row.isArchived && (
        <span style={{ fontSize:10, color:theme.colors.grey }}>{t.archivedBadge || "مؤرشف"}</span>
      )}
    </div>
  );
}
