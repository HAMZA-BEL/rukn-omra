import { Modal } from "../UI";
import ProgramForm from "./ProgramForm";

export default function ProgramEditorModal({
  open,
  program,
  store,
  title,
  onSaved,
  onClose,
  badgesEnabled = true,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={620}>
      <ProgramForm
        key={program?.id || "new-program"}
        program={program}
        store={store}
        badgesEnabled={badgesEnabled}
        onSave={onSaved}
        onCancel={onClose}
      />
    </Modal>
  );
}
