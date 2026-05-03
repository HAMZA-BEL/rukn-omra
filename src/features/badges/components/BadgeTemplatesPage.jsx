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

export function BadgeTemplatesPage({ store, onToast }) {
  const { t } = useLang();
  const agencyId = store?.agencyId || store?.agency?.id || "";
  const [creatorOpen, setCreatorOpen] = React.useState(false);
  const [activeId, setActiveId] = React.useState("");
  const [editorId, setEditorId] = React.useState("");
  const { templates, loading, error, refresh, save, remove, makeDefault } = useBadgeTemplates({ agencyId });

  React.useEffect(() => {
    if (!activeId && templates.length) {
      setActiveId((templates.find((template) => template.isDefault) || templates[0]).id);
    }
  }, [activeId, templates]);

  React.useEffect(() => {
    if (!editorId) return undefined;
    const handler = (event) => {
      if (event.key === "Escape") setEditorId("");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editorId]);

  const activeTemplate = templates.find((template) => template.id === activeId) || null;
  const editorTemplate = templates.find((template) => template.id === editorId) || null;
  const setupMissing = isMissingSetupError(error);
  const message = setupMissing
    ? (t.badgeSetupMissing || "لم يتم تفعيل إعدادات قوالب الشارات في قاعدة البيانات بعد.")
    : (t.badgeLoadError || "تعذر تحميل قوالب الشارات. تحقق من الاتصال ثم أعد المحاولة.");

  const handleSave = async (template, options = {}) => {
    try {
      const saved = await save(template);
      setActiveId(saved.id || template.id);
      if (options.openEditor) setEditorId(saved.id || template.id);
      onToast?.(t.badgeSaveSuccess || "تم حفظ قالب الشارة", "success");
      return saved;
    } catch {
      onToast?.(t.badgeSaveError || "تعذر حفظ قالب الشارة", "error");
      return null;
    }
  };

  const handleDelete = async (template) => {
    try {
      await remove(template.id);
      setActiveId("");
      setEditorId("");
      onToast?.(t.badgeDeleteSuccess || "تم حذف قالب الشارة", "info");
    } catch {
      onToast?.(t.badgeDeleteError || "تعذر حذف قالب الشارة", "error");
    }
  };

  const handleDefault = async (template) => {
    try {
      await makeDefault(template.id);
      onToast?.(t.badgeDefaultSuccess || "تم تعيين القالب الافتراضي", "success");
    } catch {
      onToast?.(t.badgeDefaultError || "تعذر تعيين القالب الافتراضي", "error");
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
                {t.badgeDesignerTitle || "مصمم الشارة"}
              </p>
              <p style={{ fontSize: 10, color: "var(--rukn-text-muted)", marginTop: 2 }}>
                {t.badgeDesignerSubtitle || "مساحة عمل كاملة لضبط أماكن حقول الشارة بدقة."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditorId("")}
              title={t.close || "إغلاق"}
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
            busy={loading || Boolean(error)}
          />
        </div>
      </div>,
      document.body
    )
    : null;

  return (
    <GlassCard gold style={{ padding: 18, marginBottom: 20, overflow: "visible" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 19, fontWeight: 900, color: "var(--rukn-gold)" }}>{t.badgeTemplatesTitle || "قوالب الشارات"}</p>
          <p style={{ fontSize: 12, color: "var(--rukn-text-muted)", marginTop: 5, lineHeight: 1.7 }}>
            {t.badgeTemplatesSubtitle || "ارفع تصميم الشارة وحدد أماكن البيانات ثم استعمله لطباعة شارات المعتمرين."}
          </p>
        </div>
        <Button variant="primary" size="sm" icon="plus" onClick={() => setCreatorOpen(true)}>
          {t.badgeNewTemplate || "قالب جديد"}
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
          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>{t.retry || "إعادة المحاولة"}</Button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(240px,320px) minmax(0,1fr)", gap: 14, alignItems: "start" }}>
        <GlassCard style={{ padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 900, color: "var(--rukn-text)" }}>{t.badgeTemplatesList || "القوالب"}</p>
            {loading && <span style={{ fontSize: 11, color: "var(--rukn-text-muted)" }}>{t.loading || "تحميل..."}</span>}
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
              <strong style={{ color: "var(--rukn-text)", display: "block", marginBottom: 4 }}>{t.badgeNoTemplatesTitle || "لا توجد قوالب شارات بعد"}</strong>
              {t.badgeNoTemplatesSubtitle || "ابدأ برفع تصميم الشارة الخاص بوكالتك."}
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
                  <strong style={{ display: "block", fontSize: 13 }}>{template.name}</strong>
                  <span style={{ fontSize: 11, color: "var(--rukn-text-muted)" }}>
                    {template.widthMm}×{template.heightMm}mm {template.isDefault ? `· ${t.badgeDefault || "افتراضي"}` : ""}
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
              <p style={{ fontSize: 15, fontWeight: 900, color: "var(--rukn-text)" }}>{activeTemplate.name}</p>
              <p style={{ fontSize: 12, color: "var(--rukn-text-muted)", lineHeight: 1.8, maxWidth: 420 }}>
                {t.badgeOpenDesignerHint || "افتح مساحة التصميم لتعديل مواضع الحقول وحفظ قالب الشارة."}
              </p>
              <Button variant="secondary" size="sm" onClick={() => setEditorId(activeTemplate.id)}>
                {t.badgeOpenDesigner || "فتح مصمم الشارة"}
              </Button>
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "var(--rukn-text-muted)", fontSize: 12, lineHeight: 1.8 }}>
              {t.badgeSelectTemplateEmpty || "اختر قالباً من القائمة أو أنشئ قالباً جديداً للبدء."}
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
    </GlassCard>
  );
}
