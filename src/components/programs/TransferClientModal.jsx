import TransferSheet from "../TransferSheet";

export default function TransferClientModal({
  isOpen,
  onClose,
  clients,
  availablePrograms,
  occupancy,
  programSummaryById,
  onConfirm,
  getClientPayments,
  invoiceApi,
}) {
  return (
    <TransferSheet
      open={isOpen}
      onClose={onClose}
      clients={clients}
      programs={availablePrograms}
      occupancy={occupancy}
      programSummaryById={programSummaryById}
      onConfirm={onConfirm}
      getClientPayments={getClientPayments}
      invoiceApi={invoiceApi}
    />
  );
}
