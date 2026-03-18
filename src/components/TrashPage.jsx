import React from "react";
import { GlassCard, Button, EmptyState, Modal } from "./UI";
import { useLang } from "../hooks/useLang";
import { theme } from "./styles";

const tc = theme.colors;

const FILTERS = [
  { id: "all", key: "trashFilter_all" },
  { id: "programs", key: "trashFilter_programs" },
  { id: "clients", key: "trashFilter_clients" },
];

export default function TrashPage({ store, onToast }) {
  const { t, lang, dir } = useLang();
  const [filter, setFilter] = React.useState("all");
  const [selection, setSelection] = React.useState({});
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const locale = lang === "fr" ? "fr-FR" : lang === "en" ? "en-US" : "ar-MA";
  const formatDate = React.useCallback((value) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }, [locale]);

  const deletedPrograms = store.deletedPrograms || [];
  const deletedClients = store.deletedClients || [];

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
    const merged = [...programItems, ...clientItems];
    merged.sort((a, b) => {
      const aDate = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
      const bDate = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
      return bDate - aDate;
    });
    return merged;
  }, [deletedPrograms, deletedClients, clientsByBatch, programNameMap, formatDate, lang, t.programs, t.clients, t.fullName]);

  const visibleItems = React.useMemo(() => {
    if (filter === "programs") return allItems.filter((item) => item.type === "program");
    if (filter === "clients") return allItems.filter((item) => item.type === "client");
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
  }), [selectedItems]);

  const handleRestore = React.useCallback(() => {
    if (!selectedCount || typeof store.restoreTrashItems !== "function") return;
    store.restoreTrashItems(selectionPayload);
    setSelection({});
    if (onToast) onToast(t.restoreSuccess || "Restored", "success");
  }, [selectedCount, selectionPayload, store, onToast, t.restoreSuccess]);

  const handleDelete = React.useCallback(() => {
    if (!selectedCount) return;
    setConfirmOpen(true);
  }, [selectedCount]);

  const confirmDelete = React.useCallback(() => {
    if (!selectedCount || typeof store.purgeTrashItems !== "function") return;
    store.purgeTrashItems(selectionPayload);
    setSelection({});
    setConfirmOpen(false);
    if (onToast) onToast(t.deleteSuccess || "Deleted", "success");
  }, [selectedCount, selectionPayload, store, onToast, t.deleteSuccess]);

  const handleFilterChange = (nextFilter) => {
    setFilter(nextFilter);
  };

  const selectedLabel = (t.trashSelectedCount || "{count}").replace("{count}", selectedCount);
  const confirmMessage = (t.trashConfirmDeleteMessage || "{count}").replace("{count}", selectedCount);

  return (
    <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: tc.gold }}>{t.trash}</h1>
        <p style={{ color: "rgba(248,250,252,.7)", fontSize: 14 }}>{t.trashSubtitle}</p>
      </div>

      <GlassCard style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => handleFilterChange(f.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: active ? `1px solid ${tc.gold}` : "1px solid rgba(255,255,255,.12)",
                  background: active ? "rgba(212,175,55,.18)" : "rgba(255,255,255,.03)",
                  color: active ? tc.gold : "rgba(248,250,252,.8)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t[f.key] || f.id}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(248,250,252,.8)", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleAllVisible}
              style={{ width: 18, height: 18 }}
            />
            {t.selectAllCount ? t.selectAllCount.replace("{count}", visibleItems.length) : t.selectAll}
          </label>
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span style={{ fontSize: 13, color: "rgba(248,250,252,.7)" }}>{selectedLabel}</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Button
                variant="success"
                size="sm"
                disabled={!selectedCount}
                onClick={handleRestore}
              >
                ♻️ {t.trashRestoreSelected}
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={!selectedCount}
                onClick={handleDelete}
              >
                🗑️ {t.trashDeleteSelected}
              </Button>
            </div>
          </div>
        </div>
      </GlassCard>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {visibleItems.length === 0 ? (
          <GlassCard style={{ padding: 24 }}>
            <EmptyState icon="🗑️" title={t.trashEmptyTitle} sub={t.trashEmptySubtitle} />
          </GlassCard>
        ) : (
          visibleItems.map((item) => {
            const checked = !!selection[item.key];
            const isProgram = item.type === "program";
            return (
              <GlassCard
                key={item.key}
                style={{
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleItem(item.key)}
                    style={{ width: 18, height: 18 }}
                  />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: 12,
                        color: isProgram ? tc.gold : tc.greenLight,
                        border: `1px solid ${isProgram ? "rgba(212,175,55,.4)" : "rgba(34,197,94,.4)"}`,
                        borderRadius: 999,
                        padding: "2px 8px",
                      }}>
                        {isProgram ? t.programs : t.clients}
                      </span>
                      <strong style={{ fontSize: 16, color: "#f8fafc" }}>{item.name}</strong>
                    </div>
                    {item.subtitle && (
                      <p style={{ marginTop: 4, fontSize: 13, color: "rgba(248,250,252,.7)" }}>{item.subtitle}</p>
                    )}
                    {item.programName && (
                      <p style={{ marginTop: 2, fontSize: 12, color: "rgba(248,250,252,.6)" }}>
                        {item.programName}
                      </p>
                    )}
                    {isProgram && item.linkedCount > 0 && (
                      <p style={{ marginTop: 2, fontSize: 12, color: "rgba(248,250,252,.6)" }}>
                        {t.trashClientsLinked.replace("{count}", item.linkedCount)}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: dir === "rtl" ? "left" : "right", minWidth: 120 }}>
                    <p style={{ fontSize: 12, color: "rgba(248,250,252,.55)" }}>{t.trashDeletedOn}</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#f8fafc" }}>{formatDate(item.deletedAt)}</p>
                    {item.batchId && (
                      <p style={{ fontSize: 11, color: "rgba(248,250,252,.45)" }}>
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
        <p style={{ fontSize: 15, color: "rgba(248,250,252,.85)", lineHeight: 1.6 }}>{confirmMessage}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 28 }}>
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            {t.trashCancel || t.cancel}
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            🗑️ {t.trashDeleteSelected}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
