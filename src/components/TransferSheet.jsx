import React from "react";
import { createPortal } from "react-dom";
import { Button, GlassCard, SearchBar } from "./UI";
import { useLang } from "../hooks/useLang";
import { AppIcon } from "./Icon";
import { formatCurrency } from "../utils/currency";
import { getClientDisplayName } from "../utils/clientNames";
import { translatePaymentMethod } from "../utils/i18nValues";
import { readSavedInvoices } from "../utils/invoices";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import {
  formatProgramCapacityValue,
  getCapacityProgramId as getProgramId,
  getProgramCapacityInfo,
} from "../utils/programCapacity";

const getPaymentReceiptNo = (payment = {}) => (
  payment.receiptNo || payment.receipt_no || payment.receiptNumber || payment.receipt_number || ""
);

const getPaymentMethod = (payment = {}) => (
  payment.method || payment.paymentMethod || payment.payment_method || ""
);

const getClientProgramId = (client = {}) => client.programId || client.program_id || "";
const normalizeSearchText = (value) => String(value || "").trim().toLowerCase();
const isActiveDestinationProgram = (program = {}) => (
  Boolean(getProgramId(program))
  && program.deleted !== true
  && !program.deletedAt
  && !program.deleted_at
  && program.archived !== true
  && !program.archivedAt
  && !program.archived_at
  && normalizeSearchText(program.status || "active") !== "archived"
);

const getInvoiceClientId = (invoice = {}) => invoice.clientId || invoice.client_id || "";
const getInvoiceProgramId = (invoice = {}) => invoice.programId || invoice.program_id || "";
const getInvoiceNumber = (invoice = {}) => invoice.invoiceDisplayNumber || invoice.invoiceNumber || invoice.invoice_number || invoice.id || "";
const isActiveInvoice = (invoice = {}) => !["trashed", "deleted", "cancelled"].includes(String(invoice.status || "issued"));

const uniqueText = (items = []) => Array.from(new Set(items.map((item) => String(item || "").trim()).filter(Boolean)));
const getProgramSearchTerms = (program = {}) => {
  const kindSourceText = normalizeSearchText([
    program.name,
    program.nameFr,
    program.name_fr,
    program.type,
    program.programType,
    program.program_type,
    program.category,
  ].filter(Boolean).join(" "));
  const kindTerms = [];
  if (kindSourceText.includes("حج") || kindSourceText.includes("hajj") || kindSourceText.includes("hadj")) {
    kindTerms.push("حج", "حاج", "hajj", "hadj");
  }
  if (kindSourceText.includes("عمرة") || kindSourceText.includes("umrah") || kindSourceText.includes("omra") || kindSourceText.includes("omrah")) {
    kindTerms.push("عمرة", "umrah", "omra", "omrah");
  }
  return [
    program.name,
    program.nameFr,
    program.name_fr,
    program.type,
    program.programType,
    program.program_type,
    program.category,
    ...kindTerms,
  ].map(normalizeSearchText).filter(Boolean).join(" ");
};

const transferPaymentLabels = (lang, t = {}) => {
  if (lang === "fr") {
    return {
      checking: "Vérification des paiements...",
      noticeTitle: "Paiements existants",
      message: "Ce pèlerin a des paiements enregistrés. Il sera transféré vers le nouveau programme en conservant les mêmes paiements et reçus, qui resteront visibles dans son historique de paiement.",
      totalPaid: "Total payé",
      oldProgram: "Programme actuel",
      newProgram: "Nouveau programme",
      receipts: "Reçus",
      dates: "Dates",
      methods: "Modes de paiement",
      invoiceWarning: "Attention : des factures finales existent déjà pour l’ancien programme. Elles conservent leur instantané original et ne seront pas modifiées par ce transfert.",
      keepButton: "Transférer le pèlerin et conserver les paiements",
      multipleKeepButton: "Transférer les pèlerins et conserver les paiements",
      paymentFallback: "Paiement",
      noReceipt: "Sans numéro de reçu",
    };
  }
  if (lang === "en") {
    return {
      checking: "Checking payments...",
      noticeTitle: "Existing payments",
      message: "This pilgrim has registered payments. They will be transferred to the new program while keeping the same payments and receipts, and those payments will remain visible in the client payment history.",
      totalPaid: "Total paid",
      oldProgram: "Current program",
      newProgram: "New program",
      receipts: "Receipts",
      dates: "Dates",
      methods: "Payment methods",
      invoiceWarning: "Warning: final invoices already exist for the old program. They keep their original snapshot and will not be modified by this transfer.",
      keepButton: "Transfer pilgrim and keep payments",
      multipleKeepButton: "Transfer pilgrims and keep payments",
      paymentFallback: "Payment",
      noReceipt: "No receipt number",
    };
  }
  return {
    checking: "جاري فحص الدفعات...",
    noticeTitle: "دفعات مسجلة",
    message: "هذا المعتمر لديه دفعات مسجلة. سيتم نقله إلى البرنامج الجديد مع الاحتفاظ بنفس الدفعات والوصولات، وستظهر ضمن مدفوعاته في البرنامج الجديد.",
    totalPaid: "إجمالي المدفوع",
    oldProgram: "البرنامج الحالي",
    newProgram: "البرنامج الجديد",
    receipts: "أرقام الوصولات",
    dates: "تواريخ الدفع",
    methods: "طرق الدفع",
    invoiceWarning: "تنبيه: توجد فواتير نهائية مرتبطة بالبرنامج القديم. ستبقى الفواتير بنسختها الأصلية ولن يتم تعديلها بسبب هذا النقل.",
    keepButton: "نقل المعتمر والاحتفاظ بالدفعات",
    multipleKeepButton: "نقل المعتمرين والاحتفاظ بالدفعات",
    paymentFallback: "دفعة",
    noReceipt: "بدون رقم وصل",
  };
};

export default function TransferSheet({
  open,
  onClose,
  clients = [],
  programs = [],
  occupancy = new Map(),
  programSummaryById = null,
  onConfirm,
  getClientPayments,
  invoiceApi,
}) {
  const { t, dir, lang } = useLang();
  useBodyScrollLock(open);
  const isRTL = dir === "rtl";
  const [search, setSearch] = React.useState("");
  const [selectedProgramId, setSelectedProgramId] = React.useState(null);
  const [paymentConfirmationVisible, setPaymentConfirmationVisible] = React.useState(false);
  const [linkedInvoices, setLinkedInvoices] = React.useState([]);
  const [invoiceCheckBusy, setInvoiceCheckBusy] = React.useState(false);
  const dragStartRef = React.useRef(null);
  const dragOffsetRef = React.useRef(0);
  const [dragOffset, setDragOffset] = React.useState(0);
  const handleProgramPick = React.useCallback((programId, disabled) => {
    if (disabled) return;
    setSelectedProgramId(String(programId || ""));
    setPaymentConfirmationVisible(false);
    setLinkedInvoices([]);
  }, [setSelectedProgramId]);

  const updateOffset = React.useCallback((value) => {
    dragOffsetRef.current = value;
    setDragOffset(value);
  }, []);

  React.useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedProgramId(null);
      setPaymentConfirmationVisible(false);
      setLinkedInvoices([]);
      setInvoiceCheckBusy(false);
      updateOffset(0);
    }
  }, [open, updateOffset]);

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handlePointerMove = React.useCallback((event) => {
    if (dragStartRef.current === null) return;
    const delta = event.clientY - dragStartRef.current;
    updateOffset(delta > 0 ? delta : 0);
  }, [updateOffset]);

  const handlePointerUp = React.useCallback(() => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    if (dragOffsetRef.current > 140) {
      onClose();
    } else {
      updateOffset(0);
    }
    dragStartRef.current = null;
  }, [handlePointerMove, onClose, updateOffset]);

  const handlePointerDown = React.useCallback((event) => {
    dragStartRef.current = event.clientY;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }, [handlePointerMove, handlePointerUp]);

  React.useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  if (!open) return null;

  const q = normalizeSearchText(search);
  const uniquePrograms = new Set(clients.map((client) => String(getClientProgramId(client) || "")).filter(Boolean));
  const excludedIds = uniquePrograms.size === 1 ? uniquePrograms : new Set();
  const occupancyByProgramId = new Map(
    Array.from(occupancy instanceof Map ? occupancy.entries() : Object.entries(occupancy || {}))
      .map(([programId, count]) => [String(programId || ""), Number(count) || 0])
  );
  const summaryByProgramId = programSummaryById instanceof Map
    ? programSummaryById
    : new Map(Object.entries(programSummaryById || {}));
  const getRegisteredCount = (program) => {
    const programId = getProgramId(program);
    const summaryCount = Number(summaryByProgramId.get(programId)?.registeredCount);
    if (Number.isFinite(summaryCount)) return summaryCount;
    return occupancyByProgramId.get(programId) || 0;
  };

  const destinationProgramRows = programs
    .filter(isActiveDestinationProgram)
    .filter((program) => !excludedIds.has(getProgramId(program)))
    .map((program) => {
      const registered = getRegisteredCount(program);
      const programId = getProgramId(program);
      const incomingCount = clients.filter((client) => String(getClientProgramId(client) || "") !== programId).length;
      const capacityInfo = getProgramCapacityInfo(program, registered, incomingCount);
      return {
        program,
        programId,
        registered,
        capacityInfo,
        capacityValue: formatProgramCapacityValue(program, registered),
      };
    });
  const availableProgramRows = destinationProgramRows.filter((row) => row.capacityInfo.canAddRequested);
  const filteredProgramRows = availableProgramRows
    .filter(({ program }) => !q || getProgramSearchTerms(program).includes(q));
  const emptyTransferMessage = availableProgramRows.length === 0
    ? (
        t.transferNoAvailablePrograms
        || (lang === "fr"
          ? "Aucun programme disponible pour le transfert. Augmentez d’abord le nombre de places dans l’un des programmes."
          : lang === "en"
            ? "No programs available for transfer. Increase the number of seats in one of the programs first."
            : "لا توجد برامج متاحة للنقل. زد عدد المقاعد في أحد البرامج أولا.")
      )
    : (t.noResults || t.noProgramsTitle || "لا توجد برامج متاحة");
  const selectedProgramRow = selectedProgramId
    ? availableProgramRows.find((row) => row.programId === String(selectedProgramId))
    : null;
  const selectedProgram = selectedProgramRow?.program || null;
  const programById = new Map(programs.map((program) => [getProgramId(program), program]));
  const labels = transferPaymentLabels(lang, t);
  const paymentSummary = clients.reduce((summary, client) => {
    const payments = typeof getClientPayments === "function" ? getClientPayments(client.id) : [];
    if (!payments.length) return summary;
    const total = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
    const oldProgramName = programById.get(getClientProgramId(client))?.name || getClientProgramId(client) || "—";
    summary.totalPaid += total;
    summary.rows.push({ client, payments, total, oldProgramName });
    payments.forEach((payment) => {
      const receiptNo = getPaymentReceiptNo(payment);
      const date = payment.date || payment.paymentDate || payment.payment_date || "";
      const method = getPaymentMethod(payment);
      if (receiptNo) summary.receipts.push(receiptNo);
      if (date) summary.dates.push(date);
      if (method) summary.methods.push(translatePaymentMethod(method, lang) || method);
    });
    summary.oldProgramNames.push(oldProgramName);
    return summary;
  }, { totalPaid: 0, rows: [], receipts: [], dates: [], methods: [], oldProgramNames: [] });
  const hasPayments = paymentSummary.totalPaid > 0;

  const fetchLinkedInvoices = async () => {
    const oldProgramByClientId = new Map(clients.map((client) => [client.id, getClientProgramId(client)]));
    const matchesSelectedClientOldProgram = (invoice) => {
      if (!isActiveInvoice(invoice)) return false;
      const clientId = getInvoiceClientId(invoice);
      if (!oldProgramByClientId.has(clientId)) return false;
      const invoiceProgramId = getInvoiceProgramId(invoice);
      return !invoiceProgramId || invoiceProgramId === oldProgramByClientId.get(clientId);
    };
    const dedupe = new Set();
    const collect = (items = []) => items.filter(matchesSelectedClientOldProgram).filter((invoice) => {
      const key = invoice.id || invoice.invoiceKey || getInvoiceNumber(invoice);
      if (!key || dedupe.has(key)) return false;
      dedupe.add(key);
      return true;
    });

    const localInvoices = collect(readSavedInvoices());
    if (!invoiceApi?.isRemote || typeof invoiceApi.fetchFinalInvoices !== "function") return localInvoices;
    const result = await invoiceApi.fetchFinalInvoices();
    if (result?.error) return localInvoices;
    return [...localInvoices, ...collect(result.data || [])];
  };

  const subtitle = t.transferSheetSubtitle
    ? t.transferSheetSubtitle.replace("{count}", clients.length)
    : `${clients.length} selected`;

  const handleConfirm = async () => {
    if (!selectedProgramId || !selectedProgram) return;
    if (hasPayments && !paymentConfirmationVisible) {
      setInvoiceCheckBusy(true);
      try {
        setLinkedInvoices(await fetchLinkedInvoices());
      } finally {
        setInvoiceCheckBusy(false);
        setPaymentConfirmationVisible(true);
      }
      return;
    }
    onConfirm?.(selectedProgramId);
  };

  return createPortal(
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "var(--rukn-overlay)", zIndex: 9998, backdropFilter: "blur(5px)" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.transferSheetTitle || "اختر البرنامج"}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          transform: `translateY(${dragOffset}px)`,
          transition: dragStartRef.current ? "none" : "transform .25s ease",
        }}
      >
        <div
          style={{
            margin: "0 auto",
            background: "var(--rukn-bg-modal)",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            border: "1px solid var(--rukn-border)",
            maxWidth: 640,
            width: "100%",
            maxHeight: "calc(100vh - 48px)",
            minHeight: "38vh",
            overflow: "hidden",
            boxShadow: "var(--rukn-shadow-card-hover)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ flexShrink: 0, padding: "16px 18px 0", position: "relative" }}>
            <div
              onPointerDown={handlePointerDown}
              style={{
                width: 60,
                height: 5,
                borderRadius: 999,
                background: "var(--rukn-border-soft)",
                margin: "0 auto 18px",
                cursor: "grab",
              }}
            />
            <button
              onClick={onClose}
              aria-label={t.close || t.cancel || "Close"}
              style={{
                position: "absolute",
                top: 16,
                right: isRTL ? "auto" : 20,
                left: isRTL ? 20 : "auto",
                width: 34,
                height: 34,
                borderRadius: "50%",
                border: "1px solid var(--rukn-border-soft)",
                background: "var(--rukn-bg-soft)",
                color: "var(--rukn-text-muted)",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ×
            </button>
            <div style={{ marginBottom: 16, paddingInlineEnd: 40 }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: "var(--rukn-text-strong)", marginBottom: 4 }}>
                {t.transferSheetTitle || "اختر البرنامج"}
              </p>
              <p style={{ fontSize: 12, color: "var(--rukn-text-muted)" }}>{subtitle}</p>
            </div>
          </div>
          <div
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              overflowY: "auto",
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
              padding: "0 18px 16px",
            }}
          >
            {clients.length === 0 ? (
              <p style={{ color: "var(--rukn-text-muted)", fontSize: 13 }}>
                {t.noClientsSelected || "يرجى اختيار معتمر واحد على الأقل"}
              </p>
            ) : (
              <>
              <SearchBar
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.transferSearchPlaceholder || "ابحث عن اسم البرنامج..."}
                style={{ marginBottom: 14 }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  paddingInline: 4,
                }}
              >
                {filteredProgramRows.length === 0 ? (
                  <p
                    style={{
                      textAlign: "center",
                      color: "var(--rukn-text-muted)",
                      fontSize: 13,
                      padding: "24px 0",
                    }}
                  >
                    {emptyTransferMessage}
                  </p>
                ) : (
                  filteredProgramRows.map(({ program, programId, capacityValue }) => {
                    const selected = String(selectedProgramId || "") === programId;
                    return (
                      <GlassCard
                        key={program.id}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selected}
                        style={{
                          padding: 14,
                          cursor: "pointer",
                          border: selected
                            ? "1px solid var(--rukn-border-hover)"
                            : "1px solid var(--rukn-border-soft)",
                          transition: "border .2s, transform .2s",
                          transform: selected ? "translateY(-2px)" : "none",
                          outline: selected ? "2px solid var(--rukn-gold-dim)" : "none",
                        }}
                        onClick={() => handleProgramPick(programId, false)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleProgramPick(programId, false);
                          }
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <p
                              style={{
                                fontSize: 15,
                                fontWeight: 700,
                                color: "var(--rukn-text-strong)",
                                marginBottom: 4,
                              }}
                            >
                              {program.name}
                            </p>
                            <p style={{ fontSize: 11, color: "var(--rukn-text-muted)" }}>
                              {program.departure || "—"} • {program.returnDate || "—"}
                            </p>
                          </div>
                          {selected && (
                            <span
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: "50%",
                                border: "1px solid var(--rukn-border-hover)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--rukn-gold)",
                                fontWeight: 800,
                                fontSize: 14,
                              }}
                            >
                              <AppIcon name="check" size={14} color="var(--rukn-gold)" />
                            </span>
                          )}
                          <div style={{ textAlign: isRTL ? "left" : "right" }}>
                            <p style={{ fontSize: 11, color: "var(--rukn-text-muted)" }}>
                              {t.registered || "Registered"}
                            </p>
                            <p style={{ fontSize: 15, fontWeight: 800, color: "var(--rukn-gold)" }}>
                              {capacityValue}
                            </p>
                          </div>
                        </div>
                      </GlassCard>
                    );
                  })
                )}
              </div>
              {paymentConfirmationVisible && hasPayments && (
                  <GlassCard
                    style={{
                      marginTop: 14,
                      padding: 14,
                      background: "rgba(245,158,11,.08)",
                      border: "1px solid rgba(245,158,11,.24)",
                    }}
                  >
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <AppIcon name="receipt" size={17} color="var(--rukn-warning)" />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ margin: 0, color: "var(--rukn-text-strong)", fontSize: 13, fontWeight: 900 }}>
                          {labels.noticeTitle}
                        </p>
                        <p style={{ margin: "6px 0 10px", color: "var(--rukn-text-muted)", fontSize: 12, lineHeight: 1.8 }}>
                          {labels.message}
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginBottom: 10 }}>
                          {[
                            [labels.totalPaid, formatCurrency(paymentSummary.totalPaid, lang)],
                            [labels.oldProgram, uniqueText(paymentSummary.oldProgramNames).join("، ") || "—"],
                            [labels.newProgram, selectedProgram?.name || "—"],
                            [labels.receipts, uniqueText(paymentSummary.receipts).join("، ") || "—"],
                            [labels.dates, uniqueText(paymentSummary.dates).join("، ") || "—"],
                            [labels.methods, uniqueText(paymentSummary.methods).join("، ") || "—"],
                          ].map(([label, value]) => (
                            <div key={label} style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid var(--rukn-border-soft)" }}>
                              <p style={{ margin: 0, color: "var(--rukn-text-muted)", fontSize: 10, fontWeight: 800 }}>{label}</p>
                              <p style={{ margin: "3px 0 0", color: "var(--rukn-text-strong)", fontSize: 12, fontWeight: 800, overflowWrap: "anywhere" }}>{value}</p>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 120, overflow: "auto" }}>
                          {paymentSummary.rows.map(({ client, payments, total }) => (
                            <div key={client.id} style={{ borderRadius: 10, padding: "8px 10px", background: "rgba(0,0,0,.12)" }}>
                              <p style={{ margin: 0, color: "var(--rukn-text-strong)", fontSize: 12, fontWeight: 900 }}>
                                {getClientDisplayName(client, client.name || client.id, lang)} · {formatCurrency(total, lang)}
                              </p>
                              <p style={{ margin: "4px 0 0", color: "var(--rukn-text-muted)", fontSize: 11, lineHeight: 1.7 }}>
                                {payments.map((payment) => {
                                  const receiptNo = getPaymentReceiptNo(payment) || labels.noReceipt;
                                  const method = getPaymentMethod(payment);
                                  return [
                                    receiptNo,
                                    payment.date,
                                    method ? (translatePaymentMethod(method, lang) || method) : "",
                                  ].filter(Boolean).join(" · ");
                                }).join(" | ")}
                              </p>
                            </div>
                          ))}
                        </div>
                        {linkedInvoices.length > 0 && (
                          <p style={{ margin: "10px 0 0", color: "var(--rukn-warning)", fontSize: 12, lineHeight: 1.75, fontWeight: 800 }}>
                            {labels.invoiceWarning} ({linkedInvoices.map(getInvoiceNumber).filter(Boolean).join("، ")})
                          </p>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                )}
              </>
            )}
          </div>
          {clients.length > 0 && (
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                padding: "12px 18px 18px",
                borderTop: "1px solid var(--rukn-border-soft)",
                background: "var(--rukn-bg-modal)",
                boxShadow: "0 -10px 22px rgba(0,0,0,.16)",
              }}
            >
                <Button
                  variant="primary"
                  size="md"
                  style={{ flex: 1, minWidth: 160 }}
                  disabled={!selectedProgram || invoiceCheckBusy}
                  onClick={handleConfirm}
                >
                  {invoiceCheckBusy
                    ? labels.checking
                    : paymentConfirmationVisible && hasPayments
                      ? (clients.length > 1 ? labels.multipleKeepButton : labels.keepButton)
                      : (t.transferConfirm || "تأكيد النقل")}
                </Button>
                <Button variant="ghost" size="md" onClick={onClose}>
                  {t.cancel}
                </Button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
