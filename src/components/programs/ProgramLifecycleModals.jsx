import { Button, GlassCard, Modal } from "../UI";
import { AppIcon } from "../Icon";

export default function ProgramLifecycleModals({
  archivePrompt,
  bulkTrashPrompt,
  deletePrompt,
  onCloseArchive,
  onCloseBulkTrash,
  onCloseDelete,
  onConfirmArchive,
  onConfirmBulkTrash,
  onConfirmDelete,
  t,
  tr,
  tc,
}) {
  return (
    <>
      <Modal
        open={!!archivePrompt}
        onClose={onCloseArchive}
        title={t.programArchiveTitle}
        width={560}
      >
        {archivePrompt && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <p style={{ fontSize:15, fontWeight:800, color:"var(--rukn-text-strong)", marginBottom:8 }}>
                {tr("programArchiveQuestion", { name: archivePrompt.program.name })}
              </p>
              <p style={{ fontSize:13, color:"var(--rukn-text-muted)", lineHeight:1.7 }}>
                {t.programArchiveHiddenFromPrograms}
              </p>
            </div>
            <GlassCard style={{ padding:12, background:"var(--rukn-bg-soft)", borderColor:"var(--rukn-border-soft)" }}>
              <div style={{ display:"grid", gap:9 }}>
                {[
                  ["shieldCheck", t.programArchiveNotDeletion],
                  ["archive", t.programArchiveDataSafe],
                  ["restore", t.programArchiveRestoreLater],
                ].map(([icon, label]) => (
                  <div key={icon} style={{ display:"flex", alignItems:"flex-start", gap:9, color:"var(--rukn-text)", fontSize:12.5, lineHeight:1.55 }}>
                    <AppIcon name={icon} size={15} color={tc.gold} style={{ marginTop:2 }} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:12, flexWrap:"wrap" }}>
              <Button variant="ghost" onClick={onCloseArchive}>
                {t.cancel}
              </Button>
              <Button variant="secondary" icon="archive" onClick={onConfirmArchive}>
                {t.programArchiveConfirm}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        open={!!bulkTrashPrompt}
        onClose={onCloseBulkTrash}
        title={t.programBulkTrashTitle}
        width={560}
      >
        {bulkTrashPrompt && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <p style={{ fontSize:14, color:"var(--rukn-text)", lineHeight:1.7 }}>
              {t.programBulkTrashBody}
            </p>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:12, flexWrap:"wrap" }}>
              <Button variant="ghost" onClick={onCloseBulkTrash}>
                {t.cancel}
              </Button>
              <Button variant="danger" icon="trash" onClick={onConfirmBulkTrash}>
                {t.programBulkTrashConfirmAction}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        open={!!deletePrompt}
        onClose={onCloseDelete}
        title={t.programTrashTitle}
        width={520}
      >
        {deletePrompt && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <p style={{ fontSize:14, color:tc.white }}>
              {tr("programTrashMessage", { name: deletePrompt.program.name })}
            </p>
            {deletePrompt.clients.length > 0 && (
              <GlassCard style={{ padding:12, background:"rgba(239,68,68,.08)", borderColor:"rgba(239,68,68,.3)" }}>
                <p style={{ margin:0, fontSize:13, color:tc.danger }}>
                  {tr("programTrashClientsWarning", { count: deletePrompt.clients.length })}
                </p>
              </GlassCard>
            )}
            <div style={{ display:"flex", justifyContent:"flex-end", gap:12 }}>
              <Button variant="ghost" onClick={onCloseDelete}>
                {t.cancel}
              </Button>
              <Button variant="danger" onClick={onConfirmDelete}>
                {t.programTrashConfirm || t.delete}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
