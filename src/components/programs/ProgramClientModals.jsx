import { Button, Modal } from "../UI";
import ClientDetail from "../ClientDetail";
import ClientForm from "../ClientForm";
import ImportClientsModal from "../ImportClientsModal";
import MRZReader from "../MRZReader";
import TransferClientModal from "./TransferClientModal";

export default function ProgramClientModals({
  store,
  onToast,
  t,
  tr,
  program,
  packages,
  participantTerms,
  completionLabels,
  participantExcelImportLabel,
  selectedClient,
  onCloseClientDetail,
  onEditClientFromDetail,
  isAddClientOpen,
  onCloseAddClient,
  onSaveAddClient,
  isExcelImportOpen,
  onCloseExcelImport,
  onExcelImportingChange,
  isPassportImportOpen,
  onClosePassportImport,
  editingClient,
  onCloseEditClient,
  onSaveEditClient,
  isTransferOpen,
  onCloseTransfer,
  transferClients,
  availablePrograms,
  programOccupancy,
  onConfirmTransfer,
  getClientPayments,
  onClientDataChanged,
  invoiceApi,
  isBulkDeleteOpen,
  onCloseBulkDelete,
  bulkDeleteSelectedCount,
  onConfirmBulkDelete,
}) {
  const programContext = {
    id: program.id,
    name: program.name,
    type: program.type,
    programType: program.programType,
    program_type: program.program_type,
    category: program.category,
    packages,
  };

  return (
    <>
      <Modal open={!!selectedClient} onClose={onCloseClientDetail} title={participantTerms.fileTitle || t.clientFile} width={640}>
        {selectedClient && (
          <ClientDetail
            client={selectedClient}
            store={store}
            onClose={onCloseClientDetail}
            onEdit={onEditClientFromDetail}
            onToast={onToast}
            onDataChanged={onClientDataChanged}
          />
        )}
      </Modal>
      <Modal open={isAddClientOpen} onClose={onCloseAddClient} title={participantTerms.addAction || t.addClient} width={600}>
        <ClientForm
          store={store}
          defaultProgramId={program.id}
          lockProgramId={program.id}
          onSave={onSaveAddClient}
          onCancel={onCloseAddClient}
        />
      </Modal>
      <Modal open={isExcelImportOpen} onClose={onCloseExcelImport} title={participantExcelImportLabel} width={920}>
        {isExcelImportOpen && (
          <ImportClientsModal
            store={store}
            onClose={onCloseExcelImport}
            onToast={onToast}
            onImportingChange={onExcelImportingChange}
            programContext={programContext}
          />
        )}
      </Modal>
      <Modal
        open={isPassportImportOpen}
        onClose={onClosePassportImport}
        title={participantTerms.passportImport || completionLabels.passportImport}
        width={1040}
      >
        {isPassportImportOpen && (
          <MRZReader
            store={store}
            onToast={onToast}
            onClose={onClosePassportImport}
            programContext={programContext}
          />
        )}
      </Modal>
      <Modal open={!!editingClient} onClose={onCloseEditClient} title={`${t.edit} — ${participantTerms.fileTitle || t.clientFile}`} width={600}>
        {editingClient && (
          <ClientForm
            client={editingClient}
            store={store}
            onSave={onSaveEditClient}
            onCancel={onCloseEditClient}
          />
        )}
      </Modal>
      <TransferClientModal
        isOpen={isTransferOpen}
        onClose={onCloseTransfer}
        clients={transferClients}
        availablePrograms={availablePrograms}
        occupancy={programOccupancy}
        onConfirm={onConfirmTransfer}
        getClientPayments={getClientPayments}
        invoiceApi={invoiceApi}
      />
      <Modal
        open={isBulkDeleteOpen}
        onClose={onCloseBulkDelete}
        title={t.confirmDeleteSelectedTitle || t.deleteSelected || "Delete selected"}
        width={440}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <p style={{
            margin: 0,
            color: "var(--rukn-text-strong)",
            fontSize: 14,
            lineHeight: 1.8,
          }}>
            {tr("confirmDeleteSelected", { count: bulkDeleteSelectedCount })}
          </p>
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            flexWrap: "wrap",
          }}>
            <Button variant="ghost" onClick={onCloseBulkDelete}>
              {t.cancel}
            </Button>
            <Button variant="danger" icon="trash" onClick={onConfirmBulkDelete}>
              {t.confirmDeleteSelectedAction || t.deleteSelected}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
