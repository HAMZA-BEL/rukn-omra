import React from "react";
import { createPortal } from "react-dom";
import { Input, Select, Button, GlassCard } from "./UI";
import { AppIcon } from "./Icon";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { PAYMENT_METHODS } from "../data/initialData";
import { formatCurrency } from "../utils/currency";
import { getClientDisplayName } from "../utils/clientNames";
import { getClientProgramId } from "../utils/clientCompletionStatus";
import { getClientServiceType } from "../utils/clientServiceTypes";
import {
  getClientEffectiveSalePrice,
  getClientRemainingAmount,
} from "../utils/clientPricing";
import {
  getProgramServiceCostingReferenceCost,
  getProgramStandaloneServiceSalePrice,
} from "./programs/programCosting";
import { printSharedReceipt } from "./PrintTemplates";
import { PAYMENT_TYPE_NORMAL, PAYMENT_TYPE_PREVIOUS } from "../utils/paymentRecords";

const tc = theme.colors;

const normalizePaymentMethodKind = (value = "") => {
  const method = String(value).trim().toLowerCase();
  if (method.includes("شيك") || method.includes("chèque") || method.includes("cheque") || method.includes("check")) return "cheque";
  if (
    method.includes("تحويل")
    || method.includes("virement")
    || method.includes("transfer")
    || method.includes("إيداع")
    || method.includes("ايداع")
    || method.includes("dépôt")
    || method.includes("depot")
    || method.includes("deposit")
  ) return "bank";
  return "cash";
};

const normalizeSearch = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/[ـًٌٍَُِّْ]/g, "")
  .replace(/\s+/g, " ");

const toCents = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 100);
};

const fromCents = (value) => Number((value / 100).toFixed(2));

const allocateEqual = (amount, ids) => {
  const totalCents = toCents(amount);
  if (!ids.length || totalCents <= 0) return {};
  const base = Math.floor(totalCents / ids.length);
  const remainder = totalCents - (base * ids.length);
  return ids.reduce((acc, id, index) => {
    acc[id] = fromCents(base + (index < remainder ? 1 : 0));
    return acc;
  }, {});
};

const firstText = (...values) => {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
};

const getClientPhone = (client = {}) => firstText(
  client.phone,
  client.phoneNumber,
  client.phone_number,
  client.mobile,
  client.tel,
);

const getClientPassport = (client = {}) => firstText(
  client.passportNo,
  client.passport_no,
  client.passportNumber,
  client.passport_number,
  client.passport?.number,
  client.passport?.passportNo,
);

const isSameProgram = (client = {}, programId = "") => {
  const clientProgramId = getClientProgramId(client);
  return !programId || !clientProgramId || clientProgramId === programId;
};

const getPaymentClientId = (payment = {}) => String(payment.clientId || payment.client_id || "").trim();

const getClientPaidTotal = (clientId, payments = []) => (
  payments.reduce((sum, payment) => {
    if (getPaymentClientId(payment) !== String(clientId)) return sum;
    const amount = Number(payment.amount || 0);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0)
);

const getPaymentStatusLabel = (paid, salePrice, t) => {
  if (paid <= 0) return t.status_unpaid || t.unpaid || "Unpaid";
  if (salePrice > 0 && paid >= salePrice) return t.status_cleared || "Cleared";
  return t.status_partial || "Partial";
};

const getServerReceiptNotice = (lang) => {
  if (lang === "fr") return "Le numéro de reçu sera généré automatiquement après l’enregistrement du paiement";
  if (lang === "en") return "Receipt number will be generated automatically after saving the payment";
  return "سيتم توليد رقم الوصل تلقائيًا بعد حفظ الدفعة";
};

export default function SharedReceiptModal({
  open,
  onClose,
  payerClient,
  program,
  agency,
  clients = [],
  payments = [],
  onToast,
  usesServerReceipt = false,
}) {
  const { t, lang, dir } = useLang();
  const isRTL = dir === "rtl";
  const programId = String(program?.id || getClientProgramId(payerClient) || "").trim();
  const payerId = String(payerClient?.id || "");
  const methodOptions = t.paymentMethods || PAYMENT_METHODS;
  const defaultMethod = methodOptions[0] || PAYMENT_METHODS[0];
  const [form, setForm] = React.useState({
    paymentType: PAYMENT_TYPE_NORMAL,
    amount: "",
    method: defaultMethod,
    date: new Date().toISOString().split("T")[0],
    legacyReceiptNumber: "",
    chequeNumber: "",
    paidBy: "",
    note: "",
    distributionMode: "equal",
  });
  const [selectedIds, setSelectedIds] = React.useState(() => (payerId ? [payerId] : []));
  const [manualAllocations, setManualAllocations] = React.useState({});
  const [search, setSearch] = React.useState("");
  const [selectorOpen, setSelectorOpen] = React.useState(false);
  const [receiptDraft, setReceiptDraft] = React.useState(null);
  const [errors, setErrors] = React.useState({});
  const selectorRef = React.useRef(null);

  const eligibleClients = React.useMemo(() => {
    const byId = new Map();
    if (payerClient?.id) byId.set(String(payerClient.id), payerClient);
    clients.forEach((client) => {
      if (!client?.id || !isSameProgram(client, programId)) return;
      byId.set(String(client.id), client);
    });
    return Array.from(byId.values());
  }, [clients, payerClient, programId]);

  const clientsById = React.useMemo(() => {
    const map = new Map();
    eligibleClients.forEach((client) => map.set(String(client.id), client));
    return map;
  }, [eligibleClients]);

  React.useEffect(() => {
    if (!open) return;
    const nextMethodOptions = t.paymentMethods || PAYMENT_METHODS;
    setForm({
      paymentType: PAYMENT_TYPE_NORMAL,
      amount: "",
      method: nextMethodOptions[0] || PAYMENT_METHODS[0],
      date: new Date().toISOString().split("T")[0],
      legacyReceiptNumber: "",
      chequeNumber: "",
      paidBy: "",
      note: "",
      distributionMode: "equal",
    });
    setSelectedIds(payerId ? [payerId] : []);
    setManualAllocations({});
    setSearch("");
    setSelectorOpen(false);
    setReceiptDraft(null);
    setErrors({});
  }, [open, payerId, t.paymentMethods]);

  React.useEffect(() => {
    if (!payerId) return;
    setSelectedIds((current) => (current.includes(payerId) ? current : [payerId, ...current]));
  }, [payerId]);

  React.useEffect(() => {
    if (!selectorOpen || typeof document === "undefined") return undefined;
    const closeIfOutside = (event) => {
      if (selectorRef.current?.contains(event.target)) return;
      setSelectorOpen(false);
    };
    document.addEventListener("mousedown", closeIfOutside, true);
    document.addEventListener("touchstart", closeIfOutside, true);
    return () => {
      document.removeEventListener("mousedown", closeIfOutside, true);
      document.removeEventListener("touchstart", closeIfOutside, true);
    };
  }, [selectorOpen]);

  const setField = (key) => (event) => {
    const value = event?.target?.value ?? "";
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const totalAmount = Number(form.amount);
  const totalCents = toCents(form.amount);
  const methodKind = normalizePaymentMethodKind(form.method);
  const isPreviousPayment = form.paymentType === PAYMENT_TYPE_PREVIOUS;
  const paymentTypeLabel = t.paymentTypeLabel || (lang === "fr" ? "Type de paiement" : lang === "en" ? "Payment type" : "نوع الدفعة");
  const normalPaymentLabel = t.normalPayment || (lang === "fr" ? "Paiement normal" : lang === "en" ? "Normal payment" : "دفعة عادية");
  const previousPaymentLabel = t.previousPayment || (lang === "fr" ? "Paiement antérieur" : lang === "en" ? "Previous payment" : "دفعة سابقة");
  const oldReceiptNumberLabel = t.oldReceiptNumber || (lang === "fr" ? "Ancien numéro de reçu" : lang === "en" ? "Old receipt number" : "رقم الوصل القديم");
  const previewReceiptNumber = t.sharedReceiptPreviewNumber || "PREVIEW";
  const paymentTypeOptions = [
    { value: PAYMENT_TYPE_NORMAL, label: normalPaymentLabel },
    { value: PAYMENT_TYPE_PREVIOUS, label: previousPaymentLabel },
  ];
  const equalAllocations = React.useMemo(
    () => allocateEqual(form.amount, selectedIds),
    [form.amount, selectedIds],
  );

  React.useEffect(() => {
    if (form.distributionMode !== "manual") return;
    setManualAllocations((current) => {
      const seeded = allocateEqual(form.amount, selectedIds);
      const next = {};
      selectedIds.forEach((id) => {
        next[id] = current[id] ?? seeded[id] ?? "";
      });
      return next;
    });
  }, [form.amount, form.distributionMode, selectedIds]);

  const getPricingOptions = React.useCallback((client) => {
    const serviceType = getClientServiceType(client);
    return {
      referencePrice: getProgramServiceCostingReferenceCost(program, serviceType),
      standaloneSalePrice: getProgramStandaloneServiceSalePrice(program, serviceType),
      program,
    };
  }, [program]);

  const selectedClients = React.useMemo(
    () => selectedIds.map((id) => clientsById.get(id)).filter(Boolean),
    [clientsById, selectedIds],
  );

  const allocationRows = React.useMemo(() => (
    selectedClients.map((client) => {
      const id = String(client.id);
      const paidBefore = getClientPaidTotal(id, payments);
      const pricingOptions = getPricingOptions(client);
      const totalPrice = getClientEffectiveSalePrice(client, pricingOptions);
      const allocatedAmount = form.distributionMode === "manual"
        ? Number(manualAllocations[id] || 0)
        : Number(equalAllocations[id] || 0);
      const remainingBefore = getClientRemainingAmount(client, paidBefore, pricingOptions);
      return {
        id,
        client,
        name: getClientDisplayName(client),
        phone: getClientPhone(client),
        passport: getClientPassport(client),
        totalPrice,
        paidBefore,
        remainingBefore,
        allocatedAmount: Number.isFinite(allocatedAmount) ? allocatedAmount : 0,
        remainingAfter: Math.max(0, totalPrice - paidBefore - (Number.isFinite(allocatedAmount) ? allocatedAmount : 0)),
        statusLabel: getPaymentStatusLabel(paidBefore, totalPrice, t),
      };
    })
  ), [equalAllocations, form.distributionMode, getPricingOptions, manualAllocations, payments, selectedClients, t]);

  const allocatedCents = allocationRows.reduce((sum, row) => sum + toCents(row.allocatedAmount), 0);
  const allocationDiffCents = totalCents - allocatedCents;
  const filteredClients = React.useMemo(() => {
    const query = normalizeSearch(search);
    if (!query) return eligibleClients;
    return eligibleClients.filter((client) => normalizeSearch([
      getClientDisplayName(client),
      getClientPhone(client),
      getClientPassport(client),
    ].join(" ")).includes(query));
  }, [eligibleClients, search]);

  const toggleClient = (clientId) => {
    const id = String(clientId || "");
    if (!id) return;
    setSelectedIds((current) => {
      if (current.includes(id)) {
        if (id === payerId) return current;
        return current.filter((item) => item !== id);
      }
      return [...current, id];
    });
    setErrors((current) => ({ ...current, covered: "" }));
  };

  const removeClient = (clientId) => {
    const id = String(clientId || "");
    if (!id || id === payerId) return;
    setSelectedIds((current) => current.filter((item) => item !== id));
  };

  const setManualAllocation = (clientId) => (event) => {
    const value = event.target.value;
    setManualAllocations((current) => ({ ...current, [clientId]: value }));
    setErrors((current) => ({ ...current, allocations: "" }));
  };

  const handlePaymentTypeChange = (event) => {
    const nextType = event.target.value;
    setForm((current) => ({
      ...current,
      paymentType: nextType,
      legacyReceiptNumber: nextType === PAYMENT_TYPE_PREVIOUS ? current.legacyReceiptNumber : "",
    }));
    setErrors((current) => ({ ...current, legacyReceiptNumber: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.amount || !Number.isFinite(totalAmount) || totalAmount <= 0) {
      nextErrors.amount = t.sharedReceiptTotalRequired || t.amountError || "Enter a valid amount";
    }
    if (!form.method) {
      nextErrors.method = t.sharedReceiptMethodRequired || t.paymentMethodLabel || "Payment method is required";
    }
    if (!form.date) {
      nextErrors.date = t.dateError || "Enter the date";
    }
    if (isPreviousPayment && !form.legacyReceiptNumber.trim()) {
      nextErrors.legacyReceiptNumber = t.receiptError || "Receipt number required";
    }
    if (methodKind === "cheque" && !form.chequeNumber.trim()) {
      nextErrors.chequeNumber = t.chequeNumberRequired || "Please enter the cheque number";
    }
    if ((methodKind === "cheque" || methodKind === "bank") && !form.paidBy.trim()) {
      nextErrors.paidBy = t.paidByRequired || "Please enter who paid";
    }
    if (!selectedIds.length) {
      nextErrors.covered = t.sharedReceiptCoveredRequired || "Select at least one pilgrim";
    }
    if (allocationRows.some((row) => Number(row.allocatedAmount) < 0)) {
      nextErrors.allocations = t.sharedReceiptNegativeAllocation || "Allocated amounts cannot be negative";
    } else if (totalCents > 0 && allocatedCents !== totalCents) {
      nextErrors.allocations = t.sharedReceiptAllocationMismatch || "The allocated total must equal the shared receipt total.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildReceiptDraft = () => ({
    receiptNo: isPreviousPayment ? form.legacyReceiptNumber.trim() : previewReceiptNumber,
    paymentType: form.paymentType,
    paymentTypeLabel: isPreviousPayment ? previousPaymentLabel : normalPaymentLabel,
    payerName: getClientDisplayName(payerClient),
    amount: totalAmount,
    method: form.method,
    date: form.date,
    legacyReceiptNumber: form.legacyReceiptNumber.trim(),
    paidBy: form.paidBy.trim(),
    chequeNumber: form.chequeNumber.trim(),
    note: form.note.trim(),
    allocations: allocationRows,
  });

  const handlePreview = () => {
    if (!validate()) return;
    setReceiptDraft(buildReceiptDraft());
  };

  const closeReceiptCopySelector = React.useCallback(() => {
    setReceiptDraft(null);
  }, []);

  const handleReceiptCopySelect = React.useCallback((receiptType) => {
    if (!receiptDraft) return;
    const printed = printSharedReceipt({
      receipt: receiptDraft,
      program,
      agency,
      lang,
      receiptType,
    });
    if (!printed) {
      onToast?.(
        t.printWindowBlocked || (
          lang === "fr"
            ? "Impossible d'ouvrir la fenêtre d'impression."
            : lang === "en"
              ? "Unable to open the print window."
              : "تعذر فتح نافذة الطباعة."
        ),
        "error",
      );
    }
    setReceiptDraft(null);
  }, [agency, lang, onToast, program, receiptDraft, t.printWindowBlocked]);

  const labels = {
    title: t.sharedReceiptTitle || (lang === "fr" ? "Reçu commun" : lang === "en" ? "Shared receipt" : "وصل مشترك"),
    payer: t.sharedReceiptPayer || (lang === "fr" ? "Payeur" : lang === "en" ? "Payer" : "الدافع"),
    covered: t.sharedReceiptCoveredPilgrims || (lang === "fr" ? "Pèlerins couverts" : lang === "en" ? "Covered pilgrims" : "المعتمرون المشمولون"),
    search: t.sharedReceiptSearchPlaceholder || (lang === "fr" ? "Rechercher par nom, téléphone ou passeport" : lang === "en" ? "Search by name, phone, or passport" : "ابحث بالاسم أو الهاتف أو الجواز"),
    noCovered: t.sharedReceiptNoCovered || (lang === "fr" ? "Aucun pèlerin trouvé" : lang === "en" ? "No pilgrims found" : "لا يوجد معتمرون مطابقون"),
    equal: t.sharedReceiptEqualDistribution || (lang === "fr" ? "Répartition égale" : lang === "en" ? "Equal distribution" : "توزيع بالتساوي"),
    manual: t.sharedReceiptManualDistribution || (lang === "fr" ? "Répartition manuelle" : lang === "en" ? "Manual distribution" : "توزيع يدوي"),
    preview: t.sharedReceiptPreview || (lang === "fr" ? "Prévisualiser le reçu" : lang === "en" ? "Preview receipt" : "معاينة الوصل"),
  };

  if (!open) return null;

  return (
    <GlassCard style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: theme.colors.gold }}>
          {labels.title} — {getClientDisplayName(payerClient)}
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 12,
        }}>
          <Select
            label={paymentTypeLabel}
            value={form.paymentType}
            onChange={handlePaymentTypeChange}
            options={paymentTypeOptions}
          />
          <Input
            label={labels.payer}
            value={getClientDisplayName(payerClient)}
            onChange={() => {}}
            disabled
            inputStyle={{ color: "var(--rukn-text-strong)", fontWeight: 700, opacity: 0.85 }}
          />
          <Input
            label={t.sharedReceiptTotalAmount || t.amountLabel || "Total amount"}
            value={form.amount}
            onChange={setField("amount")}
            type="number"
            required
            error={errors.amount}
            placeholder={t.amountPlaceholder}
          />
          <Select
            label={t.paymentMethodLabel}
            value={form.method}
            onChange={setField("method")}
            options={methodOptions}
          />
          <Input
            label={t.dateLabel}
            value={form.date}
            onChange={setField("date")}
            type="date"
            required
            error={errors.date}
          />
          {isPreviousPayment ? (
            <Input
              label={oldReceiptNumberLabel}
              value={form.legacyReceiptNumber}
              onChange={setField("legacyReceiptNumber")}
              placeholder={oldReceiptNumberLabel}
              required
              error={errors.legacyReceiptNumber}
              inputStyle={{ color: theme.colors.gold, fontWeight: 700 }}
            />
          ) : usesServerReceipt ? (
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={{ fontSize:13, fontWeight:600, color:theme.colors.grey }}>
                {t.receiptNoLabel}
              </label>
              <div style={{
                minHeight:42,
                display:"flex",
                alignItems:"center",
                gap:8,
                padding:"9px 12px",
                borderRadius:10,
                border:"1px solid rgba(212,175,55,.18)",
                background:"linear-gradient(135deg,rgba(212,175,55,.07),rgba(255,255,255,.025))",
                color:"var(--rukn-text-muted)",
                boxShadow:"inset 0 1px 0 rgba(255,255,255,.04)",
                fontSize:12.5,
                fontWeight:500,
                lineHeight:1.4,
              }}>
                <span style={{
                  width:24,
                  height:24,
                  flex:"0 0 24px",
                  display:"inline-flex",
                  alignItems:"center",
                  justifyContent:"center",
                  borderRadius:8,
                  background:"rgba(212,175,55,.1)",
                  color:"var(--rukn-gold)",
                }}>
                  <AppIcon name="receipt" size={14} />
                </span>
                <span>{getServerReceiptNotice(lang)}</span>
              </div>
            </div>
          ) : (
            <Input
              label={t.receiptNoLabel}
              value={previewReceiptNumber}
              onChange={() => {}}
              disabled
              inputStyle={{ color: theme.colors.gold, fontWeight: 700, opacity: 0.85 }}
            />
          )}
          {methodKind === "cheque" && (
            <Input
              label={t.chequeNumber || "رقم الشيك"}
              value={form.chequeNumber}
              onChange={setField("chequeNumber")}
              placeholder={t.chequeNumberPlaceholder || "000000"}
              required
              error={errors.chequeNumber}
            />
          )}
          {(methodKind === "cheque" || methodKind === "bank") && (
            <Input
              label={t.paidBy || "من طرف"}
              value={form.paidBy}
              onChange={setField("paidBy")}
              placeholder={t.paidByPlaceholder || "اسم الدافع"}
              required
              error={errors.paidBy}
            />
          )}
          <Input
            label={t.noteLabel}
            value={form.note}
            onChange={setField("note")}
            placeholder={t.notePlaceholder}
            style={{ gridColumn: "1/-1" }}
          />
        </div>

        <section>
          <p style={{ fontSize: 13, fontWeight: 800, color: tc.gold, marginBottom: 8 }}>
            {labels.covered}
          </p>
          <div ref={selectorRef} style={{ position: "relative" }}>
            <div style={{
              minHeight: 44,
              border: `1px solid ${errors.covered ? tc.danger : "var(--rukn-border-input)"}`,
              borderRadius: 12,
              background: "var(--rukn-bg-input)",
              padding: 8,
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 7,
            }}>
              {selectedClients.map((client) => {
                const id = String(client.id);
                return (
                  <span
                    key={id}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      maxWidth: "100%",
                      padding: "4px 8px",
                      borderRadius: 999,
                      background: "rgba(212,175,55,.12)",
                      color: "var(--rukn-text-strong)",
                      border: "1px solid rgba(212,175,55,.22)",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {getClientDisplayName(client)}
                    </span>
                    {id !== payerId && (
                      <button
                        type="button"
                        onClick={() => removeClient(id)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 18,
                          height: 18,
                          borderRadius: 999,
                          border: 0,
                          background: "rgba(255,255,255,.08)",
                          color: "currentColor",
                          cursor: "pointer",
                        }}
                      >
                        <AppIcon name="x" size={12} />
                      </button>
                    )}
                  </span>
                );
              })}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 180px", minWidth: 150 }}>
                <AppIcon name="search" size={15} color={tc.grey} />
                <input
                  value={search}
                  onFocus={() => setSelectorOpen(true)}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setSelectorOpen(true);
                  }}
                  placeholder={labels.search}
                  style={{
                    width: "100%",
                    border: 0,
                    outline: "none",
                    background: "transparent",
                    color: "var(--rukn-text-strong)",
                    fontSize: 13,
                    fontFamily: "'Cairo',sans-serif",
                    direction: dir,
                  }}
                />
              </div>
            </div>
            {errors.covered && <span style={{ display: "block", marginTop: 5, fontSize: 12, color: tc.danger }}>{errors.covered}</span>}
            {selectorOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  maxHeight: 270,
                  overflowY: "auto",
                  borderRadius: 12,
                  border: "1px solid var(--rukn-menu-border)",
                  background: "var(--rukn-menu-bg)",
                  boxShadow: "var(--rukn-menu-shadow)",
                  padding: 6,
                }}
              >
                {filteredClients.length === 0 ? (
                  <div style={{ padding: 12, color: tc.grey, fontSize: 12, textAlign: "center" }}>
                    {labels.noCovered}
                  </div>
                ) : filteredClients.map((client) => {
                  const id = String(client.id);
                  const selected = selectedIds.includes(id);
                  const paid = getClientPaidTotal(id, payments);
                  const pricingOptions = getPricingOptions(client);
                  const totalPrice = getClientEffectiveSalePrice(client, pricingOptions);
                  const remaining = getClientRemainingAmount(client, paid, pricingOptions);
                  return (
                    <button
                      key={id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => toggleClient(id)}
                      style={{
                        width: "100%",
                        display: "grid",
                        gridTemplateColumns: "auto minmax(0,1fr) auto",
                        gap: 10,
                        alignItems: "center",
                        border: 0,
                        borderRadius: 10,
                        padding: "8px 9px",
                        background: selected ? "var(--rukn-gold-dim)" : "transparent",
                        color: "var(--rukn-text-strong)",
                        cursor: "pointer",
                        fontFamily: "'Cairo',sans-serif",
                        textAlign: "start",
                      }}
                    >
                      <AppIcon name={selected ? "checked" : "user"} size={16} color={selected ? tc.gold : tc.grey} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 13, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {getClientDisplayName(client)}
                        </span>
                        <span style={{ display: "block", fontSize: 11, color: tc.grey, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {[getClientPhone(client), getClientPassport(client)].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span style={{ fontSize: 11, color: tc.grey, lineHeight: 1.45, textAlign: isRTL ? "left" : "right" }}>
                        {t.salePrice}: {formatCurrency(totalPrice, lang)}<br />
                        {t.paid}: {formatCurrency(paid, lang)} · {t.remaining}: {formatCurrency(remaining, lang)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section>
          <p style={{ fontSize: 13, fontWeight: 800, color: tc.gold, marginBottom: 8 }}>
            {t.sharedReceiptDistribution || (lang === "fr" ? "Répartition" : lang === "en" ? "Distribution" : "التوزيع")}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {[
              ["equal", labels.equal],
              ["manual", labels.manual],
            ].map(([value, labelText]) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm((current) => ({ ...current, distributionMode: value }))}
                style={{
                  border: `1px solid ${form.distributionMode === value ? tc.gold : "var(--rukn-border-input)"}`,
                  borderRadius: 10,
                  background: form.distributionMode === value ? "rgba(212,175,55,.14)" : "var(--rukn-bg-input)",
                  color: form.distributionMode === value ? tc.gold : "var(--rukn-text-strong)",
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 850,
                  fontFamily: "'Cairo',sans-serif",
                  cursor: "pointer",
                }}
              >
                {labelText}
              </button>
            ))}
          </div>
          <div style={{ border: "1px solid var(--rukn-border-soft)", borderRadius: 12, overflow: "hidden" }}>
            {allocationRows.map((row) => (
              <div
                key={row.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: form.distributionMode === "manual"
                    ? "minmax(0,1fr) minmax(130px,170px)"
                    : "minmax(0,1fr) auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "9px 11px",
                  borderBottom: "1px solid var(--rukn-border-soft)",
                  background: "rgba(255,255,255,.025)",
                }}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 850, color: "var(--rukn-text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.name}
                  </span>
                  <span style={{ display: "block", fontSize: 11, color: tc.grey }}>
                    {row.statusLabel} · {t.sharedReceiptRemainingAfterPayment || t.remaining}: {formatCurrency(row.remainingAfter, lang)}
                  </span>
                </span>
                {form.distributionMode === "manual" ? (
                  <Input
                    value={manualAllocations[row.id] ?? ""}
                    onChange={setManualAllocation(row.id)}
                    type="number"
                    inputStyle={{ textAlign: isRTL ? "right" : "left" }}
                  />
                ) : (
                  <strong style={{ fontSize: 13, color: tc.gold, whiteSpace: "nowrap" }}>
                    {formatCurrency(row.allocatedAmount, lang)}
                  </strong>
                )}
              </div>
            ))}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              padding: "10px 11px",
              background: "rgba(212,175,55,.08)",
              fontSize: 13,
              fontWeight: 900,
              color: "var(--rukn-text-strong)",
            }}>
              <span>{t.sharedReceiptTotalAllocated || (lang === "fr" ? "Total réparti" : lang === "en" ? "Total allocated" : "مجموع التوزيع")}</span>
              <span style={{ color: allocatedCents === totalCents && totalCents > 0 ? tc.greenLight : tc.warning }}>
                {formatCurrency(fromCents(allocatedCents), lang)}
              </span>
            </div>
          </div>
          {allocationDiffCents !== 0 && totalCents > 0 && (
            <p style={{ fontSize: 11.5, color: tc.grey, marginTop: 6 }}>
              {t.sharedReceiptAllocationDifference || (lang === "fr" ? "Écart" : lang === "en" ? "Difference" : "الفرق")}: {formatCurrency(fromCents(allocationDiffCents), lang)}
            </p>
          )}
          {errors.allocations && <p style={{ fontSize: 12, color: tc.danger, marginTop: 6 }}>{errors.allocations}</p>}
        </section>

        <p style={{ fontSize: 11.5, color: tc.grey, lineHeight: 1.6 }}>
          {t.sharedReceiptNoPersistenceNote || (
            lang === "fr"
              ? "Phase 1 : ce reçu est une prévisualisation imprimable. Aucun paiement n’est enregistré."
              : lang === "en"
                ? "Phase 1: this is a printable preview only. No payments are saved."
                : "المرحلة الأولى: هذا وصل للمعاينة والطباعة فقط، ولا يتم حفظ أي دفعات."
          )}
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={onClose}>{t.cancel}</Button>
          <Button variant="primary" icon="print" onClick={handlePreview}>
            {labels.preview}
          </Button>
        </div>
      </div>
      <SharedReceiptCopySelector
        open={Boolean(receiptDraft)}
        onClose={closeReceiptCopySelector}
        onSelect={handleReceiptCopySelect}
        t={t}
        lang={lang}
      />
    </GlassCard>
  );
}

function SharedReceiptCopySelector({ open, onClose, onSelect, t, lang }) {
  React.useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  const labels = {
    title: t.receiptTypeTitle || (lang === "fr" ? "Choisir le type de reçu" : lang === "en" ? "Choose receipt type" : "اختر نوع الوصل"),
    agency: t.agencyReceipt || (lang === "fr" ? "Reçu agence" : lang === "en" ? "Agency receipt" : "وصل الوكالة"),
    client: t.pilgrimReceipt || (lang === "fr" ? "Reçu pèlerin" : lang === "en" ? "Pilgrim receipt" : "وصل المعتمر"),
    cancel: t.cancel || (lang === "fr" ? "Annuler" : lang === "en" ? "Cancel" : "إلغاء"),
  };

  return createPortal(
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 13050,
        background: "rgba(2,6,23,.62)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={labels.title}
        style={{
          width: "min(420px, 100%)",
          background: "var(--rukn-bg-modal)",
          border: "1px solid var(--rukn-border-soft)",
          borderRadius: 18,
          boxShadow: "0 32px 80px rgba(0,0,0,.5)",
          padding: 18,
          direction: lang === "ar" ? "rtl" : "ltr",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "var(--rukn-text-strong)" }}>
            {labels.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.cancel}
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              border: "1px solid var(--rukn-border-soft)",
              background: "var(--rukn-bg-soft)",
              color: "var(--rukn-text-muted)",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 16,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <Button variant="secondary" icon="receipt" onClick={() => onSelect("agency")}
            style={{ justifyContent: "center", width: "100%", minHeight: 42 }}>
            {labels.agency}
          </Button>
          <Button variant="primary" icon="receipt" onClick={() => onSelect("client")}
            style={{ justifyContent: "center", width: "100%", minHeight: 42 }}>
            {labels.client}
          </Button>
          <Button variant="ghost" onClick={onClose}
            style={{ justifyContent: "center", width: "100%", minHeight: 38 }}>
            {labels.cancel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
