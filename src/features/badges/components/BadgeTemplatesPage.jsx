import React from "react";
import { Button, GlassCard, Modal } from "../../../components/UI";
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

  const activeTemplate = templates.find((template) => template.id === activeId) || null;
  const editorTemplate = templates.find((template) => template.id === editorId) || null;
  const setupMissing = isMissingSetupError(error);
  const message = setupMissing
    ? "لم يتم تفعيل إعدادات قوالب الشارات في قاعدة البيانات بعد."
    : "تعذر تحميل قوالب الشارات. تحقق من الاتصال ثم أعد المحاولة.";

  const handleSave = async (template, options = {}) => {
    try {
      const saved = await save(template);
      setActiveId(saved.id || template.id);
      if (options.openEditor) setEditorId(saved.id || template.id);
      onToast?.("تم حفظ قالب الشارة", "success");
      return saved;
    } catch {
      onToast?.("تعذر حفظ قالب الشارة", "error");
      return null;
    }
  };

  const handleDelete = async (template) => {
    try {
      await remove(template.id);
      setActiveId("");
      setEditorId("");
      onToast?.("تم حذف قالب الشارة", "info");
    } catch {
      onToast?.("تعذر حذف قالب الشارة", "error");
    }
  };

  const handleDefault = async (template) => {
    try {
      await makeDefault(template.id);
      onToast?.("تم تعيين القالب الافتراضي", "success");
    } catch {
      onToast?.("تعذر تعيين القالب الافتراضي", "error");
    }
  };

  return (
    <GlassCard gold style={{ padding: 18, marginBottom: 20, overflow: "visible" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 19, fontWeight: 900, color: "var(--rukn-gold)" }}>قوالب الشارات</p>
          <p style={{ fontSize: 12, color: "var(--rukn-text-muted)", marginTop: 5, lineHeight: 1.7 }}>
            ارفع تصميم الشارة وحدد أماكن البيانات ثم استعمله لطباعة شارات المعتمرين.
          </p>
        </div>
        <Button variant="primary" size="sm" icon="plus" onClick={() => setCreatorOpen(true)}>
          قالب جديد
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
          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>إعادة المحاولة</Button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(240px,320px) minmax(0,1fr)", gap: 14, alignItems: "start" }}>
        <GlassCard style={{ padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 900, color: "var(--rukn-text)" }}>القوالب</p>
            {loading && <span style={{ fontSize: 11, color: "var(--rukn-text-muted)" }}>تحميل...</span>}
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
              <strong style={{ color: "var(--rukn-text)", display: "block", marginBottom: 4 }}>لا توجد قوالب شارات بعد</strong>
              ابدأ برفع تصميم الشارة الخاص بوكالتك.
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
                    {template.widthMm}×{template.heightMm}mm {template.isDefault ? "· افتراضي" : ""}
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
                افتح مساحة التصميم لتعديل مواضع الحقول وحفظ قالب الشارة.
              </p>
              <Button variant="secondary" size="sm" onClick={() => setEditorId(activeTemplate.id)}>
                فتح مصمم الشارة
              </Button>
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "var(--rukn-text-muted)", fontSize: 12, lineHeight: 1.8 }}>
              اختر قالباً من القائمة أو أنشئ قالباً جديداً للبدء.
            </div>
          )}
        </GlassCard>
      </div>

      <Modal
        open={Boolean(editorTemplate)}
        onClose={() => setEditorId("")}
        title="مصمم الشارة"
        width="min(1280px, calc(100vw - 32px))"
      >
        <BadgeTemplateMapper
          template={editorTemplate}
          onSave={handleSave}
          onDelete={handleDelete}
          onDefault={handleDefault}
          onClose={() => setEditorId("")}
          busy={loading || Boolean(error)}
        />
      </Modal>

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
