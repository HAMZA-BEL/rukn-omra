import React from "react";
import { createPortal } from "react-dom";
import { Button, GlassCard, Modal } from "../../../components/UI";
import { useLang } from "../../../hooks/useLang";
import { useBodyScrollLock } from "../../../hooks/useBodyScrollLock";
import { AppIcon } from "../../../components/Icon";
import { BadgeTemplateCreatorModal } from "./BadgeTemplateCreatorModal";
import { BadgeTemplateMapper } from "./BadgeTemplateMapper";
import { useBadgeTemplates } from "../hooks/useBadgeTemplates";
import { getBadgeTemplateImageUrl } from "../utils/badgeStorage";

const isMissingSetupError = (error) => Boolean(error && (
  String(error.message || "").includes("badge_templates")
  || String(error.message || "").includes("relation")
  || String(error.message || "").includes("does not exist")
  || String(error.code || "") === "42P01"
));
const DEFAULT_TEMPLATE_NAMES = new Set(["قالب الشارة", "Modèle de badge", "Badge template"]);

function BadgeTemplateCardThumbnail({ template }) {
  const [url, setUrl] = React.useState("");
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setUrl("");
    if (!template?.thumbnailPath) return undefined;
    getBadgeTemplateImageUrl(template.thumbnailPath).then((nextUrl) => {
      if (!cancelled) setUrl(nextUrl || "");
    });
    return () => { cancelled = true; };
  }, [template?.thumbnailPath]);

  return (
    <div style={{
      width: 54,
      height: 72,
      borderRadius: 10,
      overflow: "hidden",
      border: "1px solid rgba(212,175,55,.24)",
      background: "linear-gradient(135deg,var(--rukn-bg-soft),var(--rukn-bg-card))",
      flexShrink: 0,
      position: "relative",
      display: "grid",
      placeItems: "center",
    }}>
      {url ? (
        <>
          {!loaded && (
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg,rgba(148,163,184,.10),rgba(255,255,255,.18),rgba(148,163,184,.10))",
            }} />
          )}
          <img
            src={url}
            alt=""
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              background: "#ffffff",
              display: loaded ? "block" : "none",
            }}
          />
        </>
      ) : (
        <AppIcon name="idCard" size={22} style={{ color: "var(--rukn-text-muted)", opacity: .55 }} />
      )}
    </div>
  );
}

export function BadgeTemplatesPage({ store, onToast, embedded = false }) {
  const { t } = useLang();
  const agencyId = store?.agencyId || store?.agency?.id || "";
  const [creatorOpen, setCreatorOpen] = React.useState(false);
  const [activeId, setActiveId] = React.useState("");
  const [editorId, setEditorId] = React.useState("");
  const [editorDirty, setEditorDirty] = React.useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [deletingId, setDeletingId] = React.useState("");
  const [savingDefault, setSavingDefault] = React.useState(false);
  const didAutoSelectRef = React.useRef(false);
  const { templates, loading, error, refresh, save, remove, makeDefault } = useBadgeTemplates({ agencyId });

  React.useEffect(() => {
    if (!activeId && templates.length && !didAutoSelectRef.current) {
      setActiveId((templates.find((template) => template.isDefault) || templates[0]).id);
      didAutoSelectRef.current = true;
    }
  }, [activeId, templates]);

  const activeTemplate = templates.find((template) => template.id === activeId) || null;
  const editorTemplate = templates.find((template) => template.id === editorId) || null;
  useBodyScrollLock(Boolean(editorTemplate));
  const closeEditorNow = React.useCallback(() => {
    setEditorId("");
    setEditorDirty(false);
    setConfirmCloseOpen(false);
  }, []);
  const requestEditorClose = React.useCallback(() => {
    if (editorDirty) {
      setConfirmCloseOpen(true);
      return;
    }
    closeEditorNow();
  }, [closeEditorNow, editorDirty]);

  React.useEffect(() => {
    if (!editorId) return undefined;
    const handler = (event) => {
      if (event.key === "Escape") requestEditorClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editorId, requestEditorClose]);
  const displayTemplateName = React.useCallback((template) => {
    const name = String(template?.name || "").trim();
    return !name || DEFAULT_TEMPLATE_NAMES.has(name)
      ? (t.badgeDefaultTemplateName || "Badge template")
      : name;
  }, [t.badgeDefaultTemplateName]);
  const setupMissing = isMissingSetupError(error);
  const message = setupMissing
    ? (t.badgeSetupMissing || "Badge templates are not configured in the database yet.")
    : (t.badgeLoadError || "Unable to load badge templates. Check the connection and try again.");

  const handleSave = async (template, options = {}) => {
    try {
      const saved = await save(template);
      setActiveId(saved.id || template.id);
      if (options.openEditor) setEditorId(saved.id || template.id);
      if (!options.silentToast) onToast?.(t.badgeSaveSuccess || "Badge template saved", "success");
      return saved;
    } catch {
      if (!options.silentToast) onToast?.(t.badgeSaveError || "Unable to save badge template", "error");
      return null;
    }
  };

  const handleDelete = async (template) => {
    if (!template?.id) return;
    setDeletingId(template.id);
    onToast?.(t.badgeDeletingTemplate || "جاري حذف القالب…", "info");
    const wasActive = activeId === template.id;
    const wasEditor = editorId === template.id;
    if (wasActive) setActiveId("");
    if (wasEditor) setEditorId("");
    try {
      const result = await remove(template.id);
      if (result?.storageError) {
        onToast?.(
          t.badgeTemplateImageDeleteError || "Badge template deleted, but the image could not be removed from Storage.",
          "error"
        );
      } else {
        onToast?.(t.badgeDeleteSuccess || "Badge template deleted", "info");
      }
    } catch {
      onToast?.(t.badgeDeleteError || "Unable to delete badge template", "error");
    } finally {
      setDeletingId("");
    }
  };

  const handleDefault = async (template) => {
    try {
      await makeDefault(template.id);
      onToast?.(t.badgeDefaultSuccess || "Default badge template set", "success");
    } catch {
      onToast?.(t.badgeDefaultError || "Unable to set default badge template", "error");
    }
  };

  const handleAdoptSelected = async () => {
    if (!activeTemplate?.id) {
      onToast?.(t.badgeSelectTemplateFirst || "يرجى اختيار قالب أولا", "error");
      return;
    }
    setSavingDefault(true);
    try {
      await makeDefault(activeTemplate.id);
      onToast?.(t.badgeAdoptSuccess || "تم اعتماد قالب الشارة", "success");
    } catch {
      onToast?.(t.badgeAdoptError || "تعذر اعتماد قالب الشارة", "error");
    } finally {
      setSavingDefault(false);
    }
  };

  const openSelectedDesigner = () => {
    if (!activeTemplate?.id) {
      onToast?.(t.badgeSelectTemplateFirst || "يرجى اختيار قالب أولا", "error");
      return;
    }
    setEditorId(activeTemplate.id);
  };

  const editorOverlay = editorTemplate && typeof document !== "undefined"
    ? createPortal(
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 13000,
          background: "rgba(2,6,23,.72)",
          backdropFilter: "blur(8px)",
          padding: 12,
          display: "grid",
          placeItems: "center",
          overscrollBehavior: "contain",
        }}
      >
        <div style={{
          width: "min(1520px, calc(100vw - 24px))",
          height: "min(920px, calc(100vh - 24px))",
          background: "var(--rukn-bg-modal)",
          border: "1px solid rgba(212,175,55,.32)",
          borderRadius: 22,
          boxShadow: "0 40px 100px rgba(0,0,0,.58)",
          overflow: "hidden",
          padding: 10,
          display: "grid",
          gridTemplateRows: "auto minmax(0,1fr)",
          gap: 8,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, minHeight: 34 }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 900, color: "var(--rukn-gold)", lineHeight: 1.2 }}>
                {t.badgeDesignerTitle || "Badge designer"}
              </p>
              <p style={{ fontSize: 10, color: "var(--rukn-text-muted)", marginTop: 2 }}>
                {t.badgeDesignerSubtitle || "A full workspace for precisely placing badge fields."}
              </p>
            </div>
            <button
              type="button"
              onClick={requestEditorClose}
              title={t.close || "Close"}
              aria-label={t.close || "إغلاق"}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: "1px solid var(--rukn-border-soft)",
                background: "var(--rukn-bg-card)",
                color: "var(--rukn-text-muted)",
                cursor: "pointer",
                fontSize: 18,
                fontWeight: 900,
              }}
            >
              ×
            </button>
          </div>
          <BadgeTemplateMapper
            template={editorTemplate}
            onSave={handleSave}
            onDelete={handleDelete}
            onDefault={handleDefault}
            onDirtyChange={setEditorDirty}
            busy={loading || Boolean(error)}
          />
          {confirmCloseOpen && (
            <div style={{
              position: "absolute",
              inset: 0,
              zIndex: 13200,
              display: "grid",
              placeItems: "center",
              background: "rgba(2,6,23,.46)",
              backdropFilter: "blur(4px)",
              padding: 16,
            }}>
              <GlassCard style={{
                width: "min(440px, 100%)",
                padding: 18,
                border: "1px solid rgba(245,158,11,.34)",
                boxShadow: "0 28px 80px rgba(0,0,0,.48)",
              }}>
                <p style={{ fontSize: 16, fontWeight: 900, color: "var(--rukn-text)", marginBottom: 8 }}>
                  {t.badgeUnsavedChangesTitle || "You have unsaved changes"}
                </p>
                <p style={{ fontSize: 13, color: "var(--rukn-text-muted)", lineHeight: 1.7, marginBottom: 16 }}>
                  {t.badgeUnsavedChangesMessage || "Do you want to leave without saving?"}
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmCloseOpen(false)}>
                    {t.badgeStayInDesigner || "Stay"}
                  </Button>
                  <Button variant="warning" size="sm" onClick={closeEditorNow}>
                    {t.badgeLeaveWithoutSaving || "Leave without saving"}
                  </Button>
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </div>,
      document.body
    )
    : null;

  const content = (
    <>
      <div style={{
        display: "flex",
        justifyContent: embedded ? "flex-end" : "space-between",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 16,
      }}>
        {!embedded && (
          <div>
            <p style={{ fontSize: 19, fontWeight: 900, color: "var(--rukn-gold)" }}>{t.badgeTemplatesTitle || "Badge templates"}</p>
            <p style={{ fontSize: 12, color: "var(--rukn-text-muted)", marginTop: 5, lineHeight: 1.7 }}>
              {t.badgeTemplatesSubtitle || "Import the badge design, place the data, then use it to print pilgrim badges."}
            </p>
          </div>
        )}
        <Button variant="primary" size="sm" icon="plus" onClick={() => setCreatorOpen(true)}>
          {t.badgeNewTemplate || "New template"}
        </Button>
      </div>

      {error && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          padding: "11px 12px",
          borderRadius: 14,
          border: "1px solid rgba(245,158,11,.28)",
          background: "rgba(245,158,11,.1)",
          color: "var(--rukn-text)",
          fontSize: 12,
          fontWeight: 800,
          marginBottom: 14,
        }}>
          <span>{message}</span>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>{t.retry || "Retry"}</Button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(240px,320px) minmax(0,1fr)", gap: 14, alignItems: "start" }}>
        <GlassCard style={{ padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 900, color: "var(--rukn-text)" }}>{t.badgeTemplatesList || "Templates"}</p>
            {loading && <span style={{ fontSize: 11, color: "var(--rukn-text-muted)" }}>{t.loading || "Loading..."}</span>}
          </div>

          {!loading && !templates.length && (
            <div style={{
              border: "1px dashed var(--rukn-border-soft)",
              borderRadius: 14,
              padding: 14,
              background: "var(--rukn-bg-soft)",
              color: "var(--rukn-text-muted)",
              fontSize: 12,
              lineHeight: 1.8,
            }}>
              <strong style={{ color: "var(--rukn-text)", display: "block", marginBottom: 4 }}>{t.badgeNoTemplatesTitle || "No badge templates yet"}</strong>
              {t.badgeNoTemplatesSubtitle || "Start by importing your agency badge design."}
            </div>
          )}

          {loading && !templates.length && (
            <div style={{ display: "grid", gap: 8 }}>
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  style={{
                    height: 92,
                    borderRadius: 13,
                    border: "1px solid var(--rukn-border-soft)",
                    background: "linear-gradient(90deg,rgba(148,163,184,.08),rgba(255,255,255,.16),rgba(148,163,184,.08))",
                  }}
                />
              ))}
            </div>
          )}

          <div style={{ display: "grid", gap: 8 }}>
            {templates.map((template) => {
              const active = activeId === template.id;
              return (
                <div
                  key={template.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setActiveId(template.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    setActiveId(template.id);
                  }}
                  style={{
                    position: "relative",
                    textAlign: "start",
                    padding: "9px 42px 9px 10px",
                    borderRadius: 13,
                    border: active ? "1px solid var(--rukn-gold)" : "1px solid var(--rukn-border-soft)",
                    background: active ? "var(--rukn-gold-dim)" : "var(--rukn-bg-soft)",
                    color: "var(--rukn-text)",
                    cursor: "pointer",
                    fontFamily: "'Cairo',sans-serif",
                  }}
                >
                  <button
                    type="button"
                    title={t.badgeDeleteTemplate || t.delete || "حذف"}
                    aria-label={t.badgeDeleteTemplate || t.delete || "حذف"}
                    disabled={deletingId === template.id}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setDeleteTarget(template);
                    }}
                    style={{
                      position: "absolute",
                      top: 8,
                      insetInlineEnd: 8,
                      width: 28,
                      height: 28,
                      borderRadius: 9,
                      border: "1px solid rgba(239,68,68,.28)",
                      background: "rgba(239,68,68,.1)",
                      color: "var(--rukn-danger)",
                      cursor: deletingId === template.id ? "not-allowed" : "pointer",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 900,
                    }}
                  >
                    <AppIcon name="trash" size={14} />
                  </button>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                    <BadgeTemplateCardThumbnail template={template} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flexWrap: "wrap" }}>
                        <strong style={{ display: "block", fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {displayTemplateName(template)}
                        </strong>
                        {active && (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            border: "1px solid rgba(34,197,94,.28)",
                            background: "rgba(34,197,94,.12)",
                            color: "var(--rukn-success, #16a34a)",
                            borderRadius: 999,
                            padding: "2px 7px",
                            fontSize: 10,
                            fontWeight: 900,
                            lineHeight: 1.2,
                          }}>
                            <AppIcon name="check" size={11} />
                            {t.badgeSelectedTemplate || "محدد"}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: "var(--rukn-text-muted)" }}>
                        {template.widthMm}×{template.heightMm}mm {template.isDefault ? `· ${t.badgeDefault || "Default"}` : ""}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard style={{
          minHeight: 220,
          padding: 18,
          display: "grid",
          placeItems: "center",
          background: "var(--rukn-bg-soft)",
        }}>
          {activeTemplate ? (
            <div style={{ textAlign: "center", display: "grid", gap: 10, justifyItems: "center" }}>
              <p style={{ fontSize: 15, fontWeight: 900, color: "var(--rukn-text)" }}>{displayTemplateName(activeTemplate)}</p>
              <p style={{ fontSize: 12, color: "var(--rukn-text-muted)", lineHeight: 1.8, maxWidth: 420 }}>
                {t.badgeOpenDesignerHint || "Open the design workspace to adjust fields and save the template."}
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <Button variant="primary" size="sm" icon="save" onClick={handleAdoptSelected} disabled={savingDefault || loading}>
                  {t.saveSettingsLabel || "حفظ الإعدادات"}
                </Button>
                <Button variant="secondary" size="sm" onClick={openSelectedDesigner}>
                  {t.badgeOpenDesigner || "Open designer"}
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "var(--rukn-text-muted)", fontSize: 12, lineHeight: 1.8, display: "grid", gap: 10, justifyItems: "center" }}>
              <span>{t.badgeSelectTemplateEmpty || "Select a template or create a new one to start."}</span>
              <Button variant="secondary" size="sm" onClick={openSelectedDesigner}>
                {t.badgeOpenDesigner || "Open designer"}
              </Button>
            </div>
          )}
        </GlassCard>
      </div>

      {editorOverlay}

      <BadgeTemplateCreatorModal
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        agencyId={agencyId}
        onCreate={(template) => handleSave(template, { silentToast: true })}
        onToast={onToast}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t.badgeDeleteTemplate || "حذف القالب"}
        width={440}
      >
        <div style={{ display: "grid", gap: 16 }}>
          <p style={{ margin: 0, color: "var(--rukn-text)", fontSize: 14, lineHeight: 1.8 }}>
            {t.badgeDeleteConfirmMessage || "هل تريد حذف هذا القالب؟ لا يمكن التراجع عن هذا الإجراء."}
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={Boolean(deletingId)}>
              {t.cancel || "إلغاء"}
            </Button>
            <Button
              variant="danger"
              icon="trash"
              disabled={Boolean(deletingId)}
              onClick={async () => {
                const target = deleteTarget;
                setDeleteTarget(null);
                await handleDelete(target);
              }}
            >
              {t.badgeDeleteTemplate || t.delete || "حذف"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );

  if (embedded) {
    return <div style={{ overflow: "visible" }}>{content}</div>;
  }

  return (
    <GlassCard gold style={{ padding: 18, marginBottom: 20, overflow: "visible" }}>
      {content}
    </GlassCard>
  );
}
