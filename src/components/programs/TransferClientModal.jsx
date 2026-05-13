import TransferSheet from "../TransferSheet";

export default function TransferClientModal({
  isOpen,
  onClose,
  clients,
  availablePrograms,
  occupancy,
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
      onConfirm={onConfirm}
      getClientPayments={getClientPayments}
      invoiceApi={invoiceApi}
    />
  );
}
