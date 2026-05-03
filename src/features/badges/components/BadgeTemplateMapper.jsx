import React from "react";
import { Button, GlassCard, Input } from "../../../components/UI";
import { useLang } from "../../../hooks/useLang";
import { BadgeCanvas } from "./BadgeCanvas";
import { BadgeFieldPalette } from "./BadgeFieldPalette";
import { BadgePropertiesPanel } from "./BadgePropertiesPanel";
import { useBadgeDesigner } from "../hooks/useBadgeDesigner";
import { normalizeBadgeLayout } from "../utils/badgeLayout";
import { getBadgeTemplateImageUrl } from "../utils/badgeStorage";

const isEditableTarget = (target) => {
  const tag = target?.tagName?.toLowerCase();
  return target?.isContentEditable || ["input", "textarea", "select"].includes(tag);
};

export function BadgeTemplateMapper({ template, onSave, onDelete, onDefault, busy }) {
  const { t } = useLang();
  const [draft, setDraft] = React.useState(template);
  const [imageUrl, setImageUrl] = React.useState("");
  const [headerCollapsed, setHeaderCollapsed] = React.useState(false);
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const actionsRef = React.useRef(null);
  const designer = useBadgeDesigner(template?.layout);

  React.useEffect(() => {
    setDraft(template);
  }, [template]);

  React.useEffect(() => {
    let cancelled = false;
    setImageUrl("");
    if (!template?.templatePath) return undefined;
    getBadgeTemplateImageUrl(template.templatePath).then((url) => {
      if (!cancelled) setImageUrl(url || "");
    });
    return () => { cancelled = true; };
  }, [template?.templatePath]);

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (!designer.selectedFieldId || isEditableTarget(event.target)) return;
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      event.preventDefault();
      designer.removeField(designer.selectedFieldId);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [designer.selectedFieldId, designer.removeField]);

  React.useEffect(() => {
    if (!actionsOpen) return undefined;
    const handler = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) setActionsOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [actionsOpen]);

  if (!draft) {
    return (
      <GlassCard style={{ padding: 18 }}>
        <p style={{ color: "var(--rukn-text-muted)", fontSize: 13 }}>
          {t.badgeSelectTemplateEmpty || "اختر قالباً أو أنشئ قالباً جديداً للبدء."}
        </p>
      </GlassCard>
    );
  }

  const saveTemplate = () => onSave?.({
    ...draft,
    layout: normalizeBadgeLayout(designer.layout),
  });

  const actionMenu = (
    <div ref={actionsRef} style={{ position: "relative" }}>
      <button
        type="button"
        title={t.badgeMoreActions || "المزيد"}
        aria-label={t.badgeMoreActions || "المزيد"}
        onClick={() => setActionsOpen((current) => !current)}
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          border: "1px solid var(--rukn-border-soft)",
          background: "var(--rukn-bg-card)",
          color: "var(--rukn-text)",
          cursor: "pointer",
          fontSize: 20,
          lineHeight: "28px",
          fontWeight: 900,
        }}
      >
        ⋯
      </button>
      {actionsOpen && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          insetInlineEnd: 0,
          minWidth: 190,
          padding: 6,
          borderRadius: 12,
          border: "1px solid var(--rukn-menu-border, var(--rukn-border-soft))",
          background: "var(--rukn-menu-bg, var(--rukn-bg-card))",
          boxShadow: "var(--rukn-menu-shadow, 0 18px 40px rgba(0,0,0,.28))",
          zIndex: 30,
        }}>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setActionsOpen(false);
              onDefault?.(draft);
            }}
            style={menuItemStyle}
          >
            {t.badgeSetDefault || "تعيين كافتراضي"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setActionsOpen(false);
              onDelete?.(draft);
            }}
            style={{ ...menuItemStyle, color: "var(--rukn-danger)" }}
          >
            {t.badgeDeleteTemplate || t.delete || "حذف"}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto minmax(0,1fr)", gap: headerCollapsed ? 8 : 12, minWidth: 0, height: "100%" }}>
      <GlassCard style={{ padding: headerCollapsed ? "7px 10px" : 12, borderRadius: 16, position: "relative", zIndex: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: headerCollapsed ? "nowrap" : "wrap" }}>
          <div style={{
            flex: "1 1 320px",
            minWidth: 0,
            display: "flex",
            gap: 10,
            alignItems: headerCollapsed ? "center" : "end",
            flexWrap: headerCollapsed ? "nowrap" : "wrap",
          }}>
            <button
              type="button"
              title={headerCollapsed ? (t.badgeExpandHeader || "توسيع الشريط") : (t.badgeCollapseHeader || "طي الشريط")}
              aria-label={headerCollapsed ? (t.badgeExpandHeader || "توسيع الشريط") : (t.badgeCollapseHeader || "طي الشريط")}
              onClick={() => setHeaderCollapsed((current) => !current)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: "1px solid var(--rukn-border-soft)",
                background: "var(--rukn-bg-card)",
                color: "var(--rukn-gold)",
                cursor: "pointer",
                fontWeight: 900,
                flexShrink: 0,
              }}
            >
              {headerCollapsed ? "⌄" : "⌃"}
            </button>
            {headerCollapsed ? (
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 900, color: "var(--rukn-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {draft.name || t.badgeTemplateName || "اسم القالب"}
                </p>
                <p style={{ fontSize: 10, color: "var(--rukn-text-muted)", marginTop: 1 }}>
                  {draft.widthMm}mm × {draft.heightMm}mm
                </p>
              </div>
            ) : (
              <>
                <Input
                  label={t.badgeTemplateName || "اسم القالب"}
                  value={draft.name || ""}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  style={{ minWidth: 260, flex: "1 1 300px" }}
                />
                <span style={{ fontSize: 11, color: "var(--rukn-text-muted)", paddingBottom: 10 }}>
                  {draft.widthMm}mm × {draft.heightMm}mm
                </span>
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <Button variant="primary" size="sm" icon="save" onClick={saveTemplate} disabled={busy}>{t.badgeSaveTemplate || "حفظ القالب"}</Button>
            {actionMenu}
          </div>
        </div>
      </GlassCard>

      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(250px,300px) minmax(520px,1fr) minmax(240px,280px)",
        gap: 12,
        alignItems: "stretch",
        minHeight: 0,
      }}>
        <GlassCard style={{ padding: 14, overflow: "auto" }}>
          <BadgePropertiesPanel
            field={designer.selectedField}
            onChange={designer.updateField}
            onRemove={designer.removeField}
          />
        </GlassCard>

        <div style={{
          borderRadius: 22,
          background: "linear-gradient(180deg,var(--rukn-bg-soft),var(--rukn-bg-card))",
          border: "1px solid var(--rukn-border-soft)",
          minWidth: 0,
          minHeight: 0,
          overflow: "auto",
        }}>
          <BadgeCanvas
            imageUrl={imageUrl}
            widthMm={draft.widthMm}
            heightMm={draft.heightMm}
            layout={designer.layout}
            selectedFieldId={designer.selectedFieldId}
            onSelectField={designer.setSelectedFieldId}
            onFieldChange={designer.updateField}
            onRemoveField={designer.removeField}
            onDropField={designer.addField}
          />
        </div>

        <GlassCard style={{ padding: 14, overflow: "auto" }}>
          <BadgeFieldPalette fields={designer.layout.fields} onAddField={designer.addField} />
        </GlassCard>
      </div>
    </div>
  );
}

const menuItemStyle = {
  width: "100%",
  border: "none",
  background: "transparent",
  color: "var(--rukn-text)",
  borderRadius: 9,
  padding: "9px 10px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "'Cairo',sans-serif",
  textAlign: "start",
};
