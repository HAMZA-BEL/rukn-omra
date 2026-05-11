import { Modal } from "../UI";
import ProgramForm from "./ProgramForm";

export default function ProgramEditorModal({ open, program, store, title, onSaved, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={620}>
      <ProgramForm
        program={program}
        store={store}
        onSave={onSaved}
        onCancel={onClose}
      />
    </Modal>
  );
}
