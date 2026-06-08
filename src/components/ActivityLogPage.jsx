import React from "react";
import { createPortal } from "react-dom";
import { Filter } from "lucide-react";
import { GlassCard, Button, SearchBar, Modal } from "./UI";
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

const matchesActivityFilters = (row, { category = "all", period = "all", search = "" } = {}) => {
  const q = normalizeText(search);
  return (category === "all" || getActivityCategory(row) === category)
    && isWithinPeriod(row, period)
    && (!q || buildSearchHaystack(row).includes(q));
};

export default function ActivityLogPage({ store, onToast }) {
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
  const [cleanupBusy, setCleanupBusy] = React.useState(false);
  const [cleanupConfirmOpen, setCleanupConfirmOpen] = React.useState(false);
  const [cleanupError, setCleanupError] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const searchDebounce = React.useRef(null);
  const filtersRef = React.useRef(null);
  const filterButtonRef = React.useRef(null);
  const filterMenuRef = React.useRef(null);
  const loadSeqRef = React.useRef(0);
  const realtimeFiltersRef = React.useRef({ category, period, search, page });
  const visibleRowsRef = React.useRef([]);
  const realtimeAppliedIdsRef = React.useRef(new Set());
  const [filterMenuStyle, setFilterMenuStyle] = React.useState(null);

  const fetchActivityLogPage = store.fetchActivityLogPage;
  const subscribeActivityLog = store.subscribeActivityLog;
  const clearActivityLog = store.clearActivityLog;
  const cachedActivity = store.activityLog || [];
  const canFetchRemoteActivity = Boolean(store.isSupabaseEnabled && fetchActivityLogPage);

  React.useEffect(() => {
    realtimeFiltersRef.current = { category, period, search, page };
  }, [category, page, period, search]);

  React.useEffect(() => {
    visibleRowsRef.current = rows;
  }, [rows]);

  const applyRealtimeActivityEntry = React.useCallback((entry) => {
    const entryId = String(entry?.id || "");
    if (!entryId || realtimeAppliedIdsRef.current.has(entryId)) return;

    const filterState = realtimeFiltersRef.current;
    if (!matchesActivityFilters(entry, filterState)) return;
    realtimeAppliedIdsRef.current.add(entryId);

    const alreadyVisible = visibleRowsRef.current.some((row) => String(row?.id || "") === entryId);
    if (!alreadyVisible) {
      setTotalCount((current) => Math.max(0, Number(current) || 0) + 1);
    }
    if (filterState.page !== 1) return;

    setRows((currentRows) => {
      const existingIndex = currentRows.findIndex((row) => String(row?.id || "") === entryId);
      const nextRows = existingIndex >= 0
        ? currentRows.map((row, index) => (index === existingIndex ? { ...row, ...entry } : row))
        : [entry, ...currentRows];
      return nextRows
        .slice()
        .sort((a, b) => {
          const aTime = getActivityTime(a)?.getTime() || 0;
          const bTime = getActivityTime(b)?.getTime() || 0;
          return bTime - aTime;
        })
        .slice(0, PAGE_SIZE);
    });
  }, []);

  React.useEffect(() => {
    if (!canFetchRemoteActivity || typeof subscribeActivityLog !== "function") return undefined;
    realtimeAppliedIdsRef.current = new Set();
    const unsubscribe = subscribeActivityLog({
      updateCache: false,
      onInsert: applyRealtimeActivityEntry,
      onError: (err) => {
        console.error("[ActivityLogPage] realtime subscription failed", err);
      },
    });
    return () => {
      realtimeAppliedIdsRef.current = new Set();
      unsubscribe?.();
    };
  }, [applyRealtimeActivityEntry, canFetchRemoteActivity, subscribeActivityLog]);

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

  const cleanupLabels = React.useMemo(() => {
    if (lang === "fr") {
      return {
        title: "Confirmer la suppression du journal",
        message: "Êtes-vous sûr de vouloir supprimer définitivement le journal d’activité ? Ces entrées ne pourront pas être récupérées.",
        confirm: "Supprimer définitivement",
        cancel: "Annuler",
        success: "Journal d’activité supprimé définitivement",
        error: "Impossible de supprimer le journal d’activité",
        migrationError: "Impossible de supprimer le journal d’activité : la fonction Supabase clear_activity_log n’est pas installée. Exécutez la migration Activity Log cleanup dans Supabase SQL Editor, puis réessayez.",
      };
    }
    if (lang === "en") {
      return {
        title: "Confirm activity log deletion",
        message: "Are you sure you want to permanently delete the activity log? These entries cannot be recovered.",
        confirm: "Delete permanently",
        cancel: "Cancel",
        success: "Activity log permanently deleted",
        error: "Unable to delete the activity log",
        migrationError: "Unable to delete the activity log: the Supabase clear_activity_log function is not installed. Run the Activity Log cleanup migration in Supabase SQL Editor, then try again.",
      };
    }
    return {
      title: "تأكيد تنظيف السجل",
      message: "هل أنت متأكد من حذف سجل النشاط نهائيًا؟ لا يمكن استرجاع هذه السجلات بعد الحذف.",
      confirm: "حذف السجل نهائيًا",
      cancel: "إلغاء",
      success: "تم حذف سجل النشاط نهائيًا",
      error: "تعذر حذف سجل النشاط",
      migrationError: "تعذر حذف سجل النشاط لأن دالة Supabase clear_activity_log غير مثبتة. شغّل ترحيل تنظيف سجل النشاط في Supabase SQL Editor ثم أعد المحاولة.",
    };
  }, [lang]);

  const handleClearActivityLog = async () => {
    if (!clearActivityLog) return;
    setCleanupBusy(true);
    setCleanupError("");
    try {
      const result = await clearActivityLog(0);
      if (result?.error) {
        const message = result.error.isMissingMigration ? cleanupLabels.migrationError : cleanupLabels.error;
        setCleanupError(message);
        setError(message);
        onToast?.(message, "error");
        return;
      }
      setCleanupConfirmOpen(false);
      onToast?.(cleanupLabels.success, "success");
      if (page !== 1) setPage(1);
      else await loadActivities();
    } catch (err) {
      console.error("[ActivityLogPage] cleanup failed", err);
      setCleanupError(cleanupLabels.error);
      setError(cleanupLabels.error);
      onToast?.(cleanupLabels.error, "error");
    } finally {
      setCleanupBusy(false);
    }
  };

  return (
    <div className="page-body" style={{ padding:"24px 32px" }}>
      <div className="page-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:10 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:theme.colors.white, lineHeight:1.2 }}>{t.activityLog || "سجل النشاط"}</h1>
          <p style={{ fontSize:12, color:theme.colors.grey, marginTop:3 }}>{t.activityLogDesc || "جميع الأحداث المهمة في النظام"}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setCleanupError("");
            setCleanupConfirmOpen(true);
          }}
          disabled={cleanupBusy}
        >
          {cleanupBusy ? (t.loading || "جاري التحميل...") : (t.activityArchiveAction || "تنظيف السجل")}
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

      <Modal
        open={cleanupConfirmOpen}
        onClose={() => {
          if (!cleanupBusy) {
            setCleanupConfirmOpen(false);
            setCleanupError("");
          }
        }}
        title={cleanupLabels.title}
        width={460}
      >
        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
          <p style={{ margin:0, color:"var(--rukn-text-strong)", fontSize:14, lineHeight:1.8 }}>
            {cleanupLabels.message}
          </p>
          {cleanupError && (
            <div style={{
              padding:"10px 12px",
              borderRadius:12,
              border:"1px solid rgba(239,68,68,.35)",
              background:"rgba(239,68,68,.12)",
              color:theme.colors.danger,
              fontSize:13,
              lineHeight:1.7,
            }}>
              {cleanupError}
            </div>
          )}
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, flexWrap:"wrap" }}>
            <Button
              variant="ghost"
              onClick={() => {
                setCleanupConfirmOpen(false);
                setCleanupError("");
              }}
              disabled={cleanupBusy}
            >
              {cleanupLabels.cancel}
            </Button>
            <Button
              variant="danger"
              onClick={handleClearActivityLog}
              disabled={cleanupBusy}
            >
              {cleanupBusy ? (t.loading || "جاري التحميل...") : cleanupLabels.confirm}
            </Button>
          </div>
        </div>
      </Modal>
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
