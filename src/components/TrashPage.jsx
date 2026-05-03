import React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Filter } from "lucide-react";
import { GlassCard, Button, EmptyState, Modal } from "./UI";
import { useLang } from "../hooks/useLang";
import { theme } from "./styles";
import {
  readSavedInvoices,
  restoreSavedInvoiceSnapshot,
  deleteSavedInvoiceSnapshot,
} from "../utils/invoices";

const tc = theme.colors;

const FILTERS = [
  { id: "all", key: "trashFilter_all" },
  { id: "programs", key: "trashFilter_programs" },
  { id: "clients", key: "trashFilter_clients" },
  { id: "invoices", key: "trashFilter_invoices" },
];

export default function TrashPage({ store, onToast }) {
  const { t, lang, dir } = useLang();
  const [filter, setFilter] = React.useState("all");
  const [selection, setSelection] = React.useState({});
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [trashedInvoices, setTrashedInvoices] = React.useState(() => (
    readSavedInvoices().filter((invoice) => invoice.status === "trashed")
  ));
  const filterRef = React.useRef(null);
  const filterButtonRef = React.useRef(null);
  const filterMenuRef = React.useRef(null);
  const [filterMenuStyle, setFilterMenuStyle] = React.useState(null);

  const locale = lang === "fr" ? "fr-FR" : lang === "en" ? "en-US" : "ar-MA";
  const formatDate = React.useCallback((value) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }, [locale]);

  const deletedPrograms = store.deletedPrograms || [];
  const deletedClients = store.deletedClients || [];

  React.useEffect(() => {
    setTrashedInvoices(readSavedInvoices().filter((invoice) => invoice.status === "trashed"));
  }, []);

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
      ].filter(Boolean).join(" • "),
      deletedAt: invoice.trashedAt || invoice.deletedAt || invoice.issueDate,
      meta: t.trashFilter_invoices || "Invoices",
    }));
    const merged = [...programItems, ...clientItems, ...invoiceItems];
    merged.sort((a, b) => {
      const aDate = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
      const bDate = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
      return bDate - aDate;
    });
    return merged;
  }, [deletedPrograms, deletedClients, trashedInvoices, clientsByBatch, programNameMap, formatDate, lang, t.programs, t.clients, t.fullName, t.trashFilter_invoices]);

  const visibleItems = React.useMemo(() => {
    if (filter === "programs") return allItems.filter((item) => item.type === "program");
    if (filter === "clients") return allItems.filter((item) => item.type === "client");
    if (filter === "invoices") return allItems.filter((item) => item.type === "invoice");
    return allItems;
  }, [allItems, filter]);

  const selectedItems = React.useMemo(
    () => allItems.filter((item) => selection[item.key]),
    [allItems, selection]
  );
  const selectedCount = selectedItems.length;
  const selectedVisibleCount = visibleItems.filter((item) => selection[item.key]).length;
  const allVisibleSelected = visibleItems.length > 0 && selectedVisibleCount === visibleItems.length;

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
        visibleItems.forEach((item) => { delete next[item.key]; });
      } else {
        visibleItems.forEach((item) => { next[item.key] = true; });
      }
      return next;
    });
  }, [allVisibleSelected, visibleItems]);

  const selectionPayload = React.useMemo(() => ({
    programIds: selectedItems.filter((item) => item.type === "program").map((item) => item.id),
    clientIds: selectedItems.filter((item) => item.type === "client").map((item) => item.id),
    invoiceIds: selectedItems.filter((item) => item.type === "invoice").map((item) => item.id),
  }), [selectedItems]);

  const handleRestore = React.useCallback(() => {
    if (!selectedCount) return;
    if ((selectionPayload.programIds.length || selectionPayload.clientIds.length) && typeof store.restoreTrashItems === "function") {
      store.restoreTrashItems(selectionPayload);
    }
    if (selectionPayload.invoiceIds.length) {
      selectionPayload.invoiceIds.forEach((id) => restoreSavedInvoiceSnapshot(id));
      setTrashedInvoices(readSavedInvoices().filter((invoice) => invoice.status === "trashed"));
    }
    setSelection({});
    if (onToast) onToast(t.restoreSuccess || "Restored", "success");
  }, [selectedCount, selectionPayload, store, onToast, t.restoreSuccess]);

  const handleDelete = React.useCallback(() => {
    if (!selectedCount) return;
    setConfirmOpen(true);
  }, [selectedCount]);

  const confirmDelete = React.useCallback(() => {
    if (!selectedCount) return;
    if ((selectionPayload.programIds.length || selectionPayload.clientIds.length) && typeof store.purgeTrashItems === "function") {
      store.purgeTrashItems(selectionPayload);
    }
    if (selectionPayload.invoiceIds.length) {
      selectionPayload.invoiceIds.forEach((id) => deleteSavedInvoiceSnapshot(id));
      setTrashedInvoices(readSavedInvoices().filter((invoice) => invoice.status === "trashed"));
    }
    setSelection({});
    setConfirmOpen(false);
    if (onToast) onToast(t.deleteSuccess || "Deleted", "success");
  }, [selectedCount, selectionPayload, store, onToast, t.deleteSuccess]);

  const handleFilterChange = (nextFilter) => {
    setFilter(nextFilter);
  };

  const selectedLabel = (t.trashSelectedCount || "{count}").replace("{count}", selectedCount);
  const confirmMessage = (t.trashConfirmDeleteMessage || "{count}").replace("{count}", selectedCount);
  const selectedFilterLabel = FILTERS.find((item) => item.id === filter)?.key;
  const selectedFilterText = t[selectedFilterLabel] || t.trashFilter_all;
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
              <span>{t[f.key] || f.id}</span>
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
              {t.selectAllCount ? t.selectAllCount.replace("{count}", visibleItems.length) : t.selectAll}
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
              disabled={!selectedCount}
              onClick={handleDelete}
            >
              {t.trashDeleteSelected}
            </Button>
          </div>
        </div>
      </GlassCard>
      {filterMenu}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visibleItems.length === 0 ? (
          <GlassCard style={{ padding: 24 }}>
            <EmptyState icon="trash" title={t.trashEmptyTitle} sub={t.trashEmptySubtitle} />
          </GlassCard>
        ) : (
          visibleItems.map((item) => {
            const checked = !!selection[item.key];
            const isProgram = item.type === "program";
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
                        color: item.type === "invoice" ? "#60a5fa" : isProgram ? tc.gold : tc.greenLight,
                        border: `1px solid ${item.type === "invoice" ? "rgba(96,165,250,.35)" : isProgram ? "rgba(212,175,55,.4)" : "rgba(34,197,94,.4)"}`,
                        borderRadius: 999,
                        padding: "2px 8px",
                        background: item.type === "invoice" ? "rgba(96,165,250,.1)" : isProgram ? "rgba(212,175,55,.12)" : "rgba(34,197,94,.1)",
                        fontWeight: 800,
                        lineHeight: 1.45,
                      }}>
                        {item.type === "invoice" ? (t.trashFilter_invoices || "Invoices") : isProgram ? t.programs : t.clients}
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
