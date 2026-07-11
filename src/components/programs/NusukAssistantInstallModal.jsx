import React from "react";
import { Button, Modal } from "../UI";

export default function NusukAssistantInstallModal({
  isOpen,
  onClose,
  onInstall,
}) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="الرفع إلى نسك"
      width={520}
    >
      <div style={{ display: "grid", gap: 18, direction: "rtl" }}>
        <div style={{ display: "grid", gap: 10 }}>
          <p style={{ margin: 0, color: "var(--rukn-text-strong)", fontSize: 14, fontWeight: 800, lineHeight: 1.8 }}>
            ثبّت مساعد ركن لتفعيل الرفع المباشر إلى منصة نسك.
          </p>
          <p style={{ margin: 0, color: "var(--rukn-text-muted)", fontSize: 13, lineHeight: 1.8 }}>
            بعد التثبيت، ستتمكن من رفع البرامج والمعتمرين من ركن مباشرة.
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="primary" icon="download" onClick={onInstall}>
            تثبيت مساعد ركن
          </Button>
        </div>
      </div>
    </Modal>
  );
}

