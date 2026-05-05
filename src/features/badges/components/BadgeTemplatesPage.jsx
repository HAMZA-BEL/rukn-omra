import React from "react";
import { createPortal } from "react-dom";
import { Button, GlassCard } from "../../../components/UI";
import { useLang } from "../../../hooks/useLang";
import { BadgeTemplateCreatorModal } from "./BadgeTemplateCreatorModal";
import { BadgeTemplateMapper } from "./BadgeTemplateMapper";
import { useBadgeTemplates } from "../hooks/useBadgeTemplates";

const isMissingSetupError = (error) => Boolean(error && (
  String(error.message || "").includes("badge_templates")
  || String(error.message || "").includes("relation")
  || String(error.message || "").includes("does not exist")
  || String(error.code || "") === "42P01"
));
const DEFAULT_TEMPLATE_NAMES = new Set(["قالب الشارة", "Modèle de badge", "Badge template"]);

export function BadgeTemplatesPage({ store, onToast, embedded = false }) {
  const { t } = useLang();
  const agencyId = store?.agencyId || store?.agency?.id || "";
  const [creatorOpen, setCreatorOpen] = React.useState(false);
  const [activeId, setActiveId] = React.useState("");
  const [editorId, setEditorId] = React.useState("");
  const [editorDirty, setEditorDirty] = React.useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false);
  const { templates, loading, error, refresh, save, remove, makeDefault } = useBadgeTemplates({ agencyId });

  React.useEffect(() => {
    if (!activeId && templates.length) {
      setActiveId((templates.find((template) => template.isDefault) || templates[0]).id);
    }
  }, [activeId, templates]);

  const activeTemplate = templates.find((template) => template.id === activeId) || null;
  const editorTemplate = templates.find((template) => template.id === editorId) || null;
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
      onToast?.(t.badgeSaveSuccess || "Badge template saved", "success");
      return saved;
    } catch {
      onToast?.(t.badgeSaveError || "Unable to save badge template", "error");
      return null;
    }
  };

  const handleDelete = async (template) => {
    try {
      const result = await remove(template.id);
      setActiveId("");
      setEditorId("");
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

          <div style={{ display: "grid", gap: 8 }}>
            {templates.map((template) => {
              const active = activeId === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    setActiveId(template.id);
                    setEditorId(template.id);
                  }}
                  style={{
                    textAlign: "start",
                    padding: "10px 11px",
                    borderRadius: 13,
                    border: active ? "1px solid var(--rukn-gold)" : "1px solid var(--rukn-border-soft)",
                    background: active ? "var(--rukn-gold-dim)" : "var(--rukn-bg-soft)",
                    color: "var(--rukn-text)",
                    cursor: "pointer",
                    fontFamily: "'Cairo',sans-serif",
                  }}
                >
                  <strong style={{ display: "block", fontSize: 13 }}>{displayTemplateName(template)}</strong>
                  <span style={{ fontSize: 11, color: "var(--rukn-text-muted)" }}>
                    {template.widthMm}×{template.heightMm}mm {template.isDefault ? `· ${t.badgeDefault || "Default"}` : ""}
                  </span>
                </button>
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
              <Button variant="secondary" size="sm" onClick={() => setEditorId(activeTemplate.id)}>
                {t.badgeOpenDesigner || "Open designer"}
              </Button>
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "var(--rukn-text-muted)", fontSize: 12, lineHeight: 1.8 }}>
              {t.badgeSelectTemplateEmpty || "Select a template or create a new one to start."}
            </div>
          )}
        </GlassCard>
      </div>

      {editorOverlay}

      <BadgeTemplateCreatorModal
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        agencyId={agencyId}
        onCreate={(template) => handleSave(template, { openEditor: true })}
        onToast={onToast}
      />
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
