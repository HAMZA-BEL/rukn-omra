import { formatProgramTypeForDocument } from "../documentDisplay";
import { trimInvoiceValue } from "./invoiceNumbering";

export const getInvoiceProgramDisplayName = (program = {}, language = "ar") => (
  formatProgramTypeForDocument(program, language)
);

export const getInvoiceProgramDisplayNameFromSnapshot = (programSnapshot = {}, language = "ar") => (
  getInvoiceProgramDisplayName({
    type: trimInvoiceValue(programSnapshot.programKind || programSnapshot.type),
    programKind: trimInvoiceValue(programSnapshot.programKind),
    name: trimInvoiceValue(programSnapshot.programName),
    programName: trimInvoiceValue(programSnapshot.programName),
  }, language)
);
