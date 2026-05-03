import React from "react";
import { GlassCard, Button, SearchBar } from "./UI";
import { useLang } from "../hooks/useLang";
import { theme } from "./styles";
import { translateActivityDescription } from "../utils/i18nValues";

const LOAD_LIMIT = 500;
const DISPLAY_STEP = 50;

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

export default function ActivityLogPage({ store }) {
  const { t, lang } = useLang();
  const [category, setCategory] = React.useState("all");
  const [period, setPeriod] = React.useState("30");
  const [searchDraft, setSearchDraft] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [rawRows, setRawRows] = React.useState([]);
  const [visibleCount, setVisibleCount] = React.useState(DISPLAY_STEP);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [archiveBusy, setArchiveBusy] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const searchDebounce = React.useRef(null);
  const filtersRef = React.useRef(null);

  const fetchActivityLogPage = store.fetchActivityLogPage;
  const archiveOldActivityLog = store.archiveOldActivityLog;
  const cachedActivity = store.activityLog || [];

  const applyFallback = React.useCallback(() => {
    setRawRows(Array.isArray(cachedActivity) ? cachedActivity : []);
    setError(null);
  }, [cachedActivity]);

  const loadActivities = React.useCallback(async () => {
    if (!fetchActivityLogPage) {
      applyFallback();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await fetchActivityLogPage({
        page: 0,
        limit: LOAD_LIMIT,
      });
      if (error) {
        applyFallback();
        return;
      }
      setRawRows(data || []);
    } catch (err) {
      console.error("[ActivityLogPage]", err);
      applyFallback();
    } finally {
      setLoading(false);
    }
  }, [applyFallback, fetchActivityLogPage]);

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
    loadActivities();
  }, [loadActivities]);

  React.useEffect(() => {
    setVisibleCount(DISPLAY_STEP);
  }, [category, period, search]);

  React.useEffect(() => {
    if (!filtersOpen) return undefined;
    const handlePointer = (event) => {
      if (!filtersRef.current || filtersRef.current.contains(event.target)) return;
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

  const filteredRows = React.useMemo(() => {
    const q = normalizeText(search);
    return rawRows
      .filter((row) => category === "all" || getActivityCategory(row) === category)
      .filter((row) => isWithinPeriod(row, period))
      .filter((row) => !q || buildSearchHaystack(row).includes(q))
      .sort((a, b) => {
        const aTime = getActivityTime(a)?.getTime() || 0;
        const bTime = getActivityTime(b)?.getTime() || 0;
        return bTime - aTime;
      });
  }, [category, period, rawRows, search]);

  const rows = filteredRows.slice(0, visibleCount);
  const canShowMore = visibleCount < filteredRows.length;
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

  const handleArchivePurge = async () => {
    if (!archiveOldActivityLog) return;
    setArchiveBusy(true);
    try {
      await archiveOldActivityLog(180);
      await loadActivities();
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

      <GlassCard style={{ padding:12, marginBottom:14 }}>
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
          <div ref={filtersRef} style={{ position:"relative", flex:"0 0 auto", zIndex:99999}}>
            <Button
              variant="secondary"
              size="sm"
              icon="settings"
              onClick={() => setFiltersOpen((open) => !open)}
              style={{ minHeight:40 }}
            >
              {lang === "fr" ? "Filtres" : lang === "en" ? "Filters" : "الفلاتر"}
            </Button>
            {filtersOpen && (
              <div style={{
                position:"absolute",
                bottom:"calc(100% + 8px)",
                insetInlineEnd:0,
                width:"min(520px, calc(100vw - 48px))",
                padding:12,
                borderRadius:14,
                background:"var(--rukn-bg-card)",
                border:"1px solid var(--rukn-border-soft)",
                boxShadow:"var(--rukn-shadow-card)",
                zIndex:99999,
                pointerEvents:"auto",
                display:"grid",
                gap:10,
              }}>
                <CompactChipGroup value={category} options={categoryOptions} onChange={setCategory} />
                <CompactChipGroup value={period} options={periodOptions} onChange={setPeriod} />
              </div>
            )}
          </div>
          <span style={{
            flex:"0 1 auto",
            fontSize:12,
            color:"var(--rukn-text-muted)",
            whiteSpace:"nowrap",
          }}>
            {filterSummary}
          </span>
        </div>
      </GlassCard>

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

      {filteredRows.length > 0 && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:18, flexWrap:"wrap", gap:10 }}>
          <span style={{ fontSize:12, color:theme.colors.grey }}>
            {t.activityShowing || "عرض"} {rows.length} / {filteredRows.length}
          </span>
          {canShowMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVisibleCount((count) => count + DISPLAY_STEP)}
            >
              {lang === "fr" ? "Afficher plus" : lang === "en" ? "Show more" : "عرض المزيد"}
            </Button>
          )}
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
