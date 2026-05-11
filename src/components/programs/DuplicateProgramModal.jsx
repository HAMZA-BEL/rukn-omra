import { Button, Input, Modal } from "../UI";
import { theme } from "../styles";

const tc = theme.colors;

export default function DuplicateProgramModal({ prompt, onNameChange, onCreate, onClose, lang, t }) {
  const duplicateTitle = t.programDuplicateAction || (lang === "fr" ? "Dupliquer le programme" : lang === "en" ? "Duplicate program" : "نسخ البرنامج");
  const createLabel = t.programDuplicateCreate || (lang === "fr" ? "Créer la copie" : lang === "en" ? "Create duplicate" : "إنشاء النسخة");
  const nameLabel = t.programDuplicateNameLabel || (lang === "fr" ? "Nouveau nom du programme" : lang === "en" ? "New program name" : "اسم البرنامج الجديد");
  const hint = t.programDuplicateHint || (
    lang === "fr"
      ? "La copie reprend uniquement la configuration du programme. Les pèlerins et les données financières ne sont pas copiés."
      : lang === "en"
        ? "The duplicate copies program configuration only. Pilgrims and financial data are not copied."
        : "سيتم نسخ إعدادات البرنامج فقط، بدون الحجاج/المعتمرين أو البيانات المالية."
  );

  return (
    <Modal open={!!prompt} onClose={onClose} title={duplicateTitle} width={480}>
      {prompt && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <p style={{ margin:0, color:tc.grey, fontSize:13, lineHeight:1.7 }}>
            {hint}
          </p>
          <Input
            label={nameLabel}
            value={prompt.name}
            onChange={onNameChange}
            required
            error={prompt.error}
            autoFocus
          />
          {prompt.error && (
            <p style={{ margin:0, color:tc.danger, fontSize:12, fontWeight:700 }}>
              {prompt.error}
            </p>
          )}
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, flexWrap:"wrap" }}>
            <Button variant="ghost" onClick={onClose}>
              {t.cancel || (lang === "fr" ? "Annuler" : lang === "en" ? "Cancel" : "إلغاء")}
            </Button>
            <Button variant="primary" icon="copy" onClick={onCreate}>
              {createLabel}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
