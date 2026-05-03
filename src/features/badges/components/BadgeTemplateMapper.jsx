import React from "react";
import { Button, GlassCard, Input } from "../../../components/UI";
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

export function BadgeTemplateMapper({ template, onSave, onDelete, onDefault, onClose, busy }) {
  const [draft, setDraft] = React.useState(template);
  const [imageUrl, setImageUrl] = React.useState("");
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

  if (!draft) {
    return (
      <GlassCard style={{ padding: 18 }}>
        <p style={{ color: "var(--rukn-text-muted)", fontSize: 13 }}>
          اختر قالباً أو أنشئ قالباً جديداً للبدء.
        </p>
      </GlassCard>
    );
  }

  const saveTemplate = () => onSave?.({
    ...draft,
    layout: normalizeBadgeLayout(designer.layout),
  });

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <GlassCard style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 260px" }}>
            <Input
              label="اسم القالب"
              value={draft.name || ""}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
            <Button variant="ghost" size="sm" onClick={() => onDefault?.(draft)} disabled={busy}>تعيين كافتراضي</Button>
            <Button variant="danger" size="sm" icon="trash" onClick={() => onDelete?.(draft)} disabled={busy}>حذف</Button>
            <Button variant="primary" size="sm" icon="save" onClick={saveTemplate} disabled={busy}>حفظ القالب</Button>
            {onClose && <Button variant="ghost" size="sm" onClick={onClose}>إغلاق</Button>}
          </div>
        </div>
      </GlassCard>

      <div style={{
        display: "grid",
        gridTemplateColumns: "280px minmax(420px,1fr) 260px",
        gap: 14,
        alignItems: "stretch",
      }}>
        <GlassCard style={{ padding: 14 }}>
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
        }}>
          <BadgeCanvas
            imageUrl={imageUrl}
            widthMm={draft.widthMm}
            heightMm={draft.heightMm}
            layout={designer.layout}
            selectedFieldId={designer.selectedFieldId}
            onSelectField={designer.setSelectedFieldId}
            onFieldChange={designer.updateField}
          />
        </div>

        <GlassCard style={{ padding: 14 }}>
          <BadgeFieldPalette fields={designer.layout.fields} onAddField={designer.addField} />
        </GlassCard>
      </div>
    </div>
  );
}
