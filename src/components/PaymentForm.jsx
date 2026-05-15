import React from "react";
import { Input, Select, Button, GlassCard } from "./UI";
import { PAYMENT_METHODS } from "../data/initialData";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { formatCurrency } from "../utils/currency";
import {
  getProgramServiceCostingReferenceCost,
  getProgramStandaloneServiceSalePrice,
} from "./programs/programCosting";
import { getClientEffectiveSalePrice, getClientRemainingAmount } from "../utils/clientPricing";
import { getClientServiceType } from "../utils/clientServiceTypes";
import { PAYMENT_TYPE_NORMAL, PAYMENT_TYPE_PREVIOUS } from "../utils/paymentRecords";

const normalizePaymentMethodKind = (value = "") => {
  const method = String(value).trim().toLowerCase();
  if (method.includes("شيك") || method.includes("chèque") || method.includes("cheque") || method.includes("check")) return "cheque";
  if (method.includes("تحويل") || method.includes("virement") || method.includes("transfer") || method.includes("إيداع") || method.includes("ايداع") || method.includes("dépôt") || method.includes("depot") || method.includes("deposit")) return "bank";
  return "cash";
};

const getProjectedOverpaymentText = (amount, lang) => {
  const formatted = formatCurrency(amount, lang);
  if (lang === "fr") return `Il y aura un trop-perçu de ${formatted}`;
  if (lang === "en") return `This will create an overpayment of ${formatted}`;
  return `سيصبح هناك مبلغ زائد قدره ${formatted}`;
};

export default function PaymentForm({ clientId, clientName, store, onSave, onCancel }) {
  const { getClientTotalPaid, clients, payments, programs = [] } = store;
  const { t, tr, lang } = useLang();
  const usesServerReceipt = Boolean(store.isSupabaseEnabled && store.agencyId);
  const client    = clients.find(c => c.id === clientId);
  const clientProgram = client ? programs.find((program) => program.id === client.programId) : null;
  const serviceType = getClientServiceType(client);
  const referencePrice = getProgramServiceCostingReferenceCost(clientProgram, serviceType);
  const standaloneSalePrice = getProgramStandaloneServiceSalePrice(clientProgram, serviceType);
  const pricingOptions = { referencePrice, standaloneSalePrice, program: clientProgram };
  const salePrice = client ? getClientEffectiveSalePrice(client, pricingOptions) : 0;
  const totalPaid = getClientTotalPaid(clientId);
  const remaining = client ? getClientRemainingAmount(client, totalPaid, pricingOptions) : Math.max(0, salePrice - totalPaid);

  // Auto-generate receipt number
  const nextReceiptNo = "REC-" + String(payments.length + 1).padStart(3, "0");

  const [form, setForm] = React.useState({
    paymentType: PAYMENT_TYPE_NORMAL,
    amount:    "",
    method:    t.paymentMethods ? t.paymentMethods[0] : "نقدًا",
    date:      new Date().toISOString().split("T")[0],
    receiptNo: nextReceiptNo,
    legacyReceiptNumber: "",
    chequeNumber: "",
    paidBy:    "",
    note:      "",
  });
  const [errors, setErrors] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  const set = k => e => setForm(f => ({...f, [k]: e.target.value}));
  const enteredAmount = Number(form.amount);
  const projectedOverpayment = Number.isFinite(enteredAmount) && enteredAmount > 0
    ? Math.max(0, totalPaid + enteredAmount - salePrice)
    : 0;
  const isPreviousPayment = form.paymentType === PAYMENT_TYPE_PREVIOUS;
  const paymentTypeLabel = t.paymentTypeLabel || (lang === "fr" ? "Type de paiement" : lang === "en" ? "Payment type" : "نوع الدفعة");
  const normalPaymentLabel = t.normalPayment || (lang === "fr" ? "Paiement normal" : lang === "en" ? "Normal payment" : "دفعة عادية");
  const previousPaymentLabel = t.previousPayment || (lang === "fr" ? "Paiement antérieur" : lang === "en" ? "Previous payment" : "دفعة سابقة");
  const oldReceiptNumberLabel = t.oldReceiptNumber || (lang === "fr" ? "Ancien numéro de reçu" : lang === "en" ? "Old receipt number" : "رقم الوصل القديم");
  const previousPaymentNotePlaceholder = t.previousPaymentNotePlaceholder
    || (lang === "fr" ? "Exemple : paiement effectué avant l’utilisation du système" : lang === "en" ? "Example: payment made before using the system" : "مثال: دفعة قبل إدخال البرنامج للنظام");
  const paymentTypeOptions = [
    { value: PAYMENT_TYPE_NORMAL, label: normalPaymentLabel },
    { value: PAYMENT_TYPE_PREVIOUS, label: previousPaymentLabel },
  ];
  const handlePaymentTypeChange = (event) => {
    const nextType = event.target.value;
    setForm((current) => ({
      ...current,
      paymentType: nextType,
      receiptNo: nextType === PAYMENT_TYPE_PREVIOUS ? "" : (current.receiptNo || nextReceiptNo),
    }));
    setErrors((current) => ({ ...current, receiptNo: "" }));
  };
  const methodKind = normalizePaymentMethodKind(form.method);

  const handleSave = async () => {
    if (saving) return;
    const e = {};
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
      e.amount = t.amountError;
    if (Number(form.amount) > remaining + 1)
      e.amount = (t.amountExceedsError || "").replace("{remaining}", formatCurrency(remaining, lang));
    if (!form.date)      e.date = t.dateError;
    if (!isPreviousPayment && !usesServerReceipt && !form.receiptNo) e.receiptNo = t.receiptError;
    if (methodKind === "cheque" && !form.chequeNumber.trim())
      e.chequeNumber = t.chequeNumberRequired || "يرجى إدخال رقم الشيك";
    if ((methodKind === "cheque" || methodKind === "bank") && !form.paidBy.trim())
      e.paidBy = t.paidByRequired || "يرجى إدخال من طرف";
    if (Object.keys(e).length) { setErrors(e); return; }
    const chequeNumber = form.chequeNumber.trim();
    const paidBy = form.paidBy.trim();
    setSaving(true);
    let saved = null;
    try {
      saved = await store.addPayment({
        clientId, amount: Number(form.amount),
        method: form.method, payment_method: form.method, date: form.date,
        paymentType: form.paymentType,
        payment_type: form.paymentType,
        isPreviousPayment,
        is_previous_payment: isPreviousPayment,
        legacyReceiptNumber: isPreviousPayment ? form.legacyReceiptNumber.trim() : "",
        legacy_receipt_number: isPreviousPayment ? form.legacyReceiptNumber.trim() : "",
        ...((usesServerReceipt || isPreviousPayment) ? {} : {
          receiptNo: form.receiptNo, receipt_no: form.receiptNo,
          receiptNumber: form.receiptNo, receipt_number: form.receiptNo,
        }),
        chequeNumber, cheque_number: chequeNumber,
        checkNumber: chequeNumber, check_number: chequeNumber,
        paidBy, paid_by: paidBy,
        note: form.note, notes: form.note,
      });
    } finally {
      setSaving(false);
    }
    if (saved) onSave();
  };

  return (
    <GlassCard style={{ padding: 16, marginBottom: 14 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: theme.colors.gold, marginBottom: 10 }}>
        {tr("addPaymentTitle", { clientName }) || `${t.addPayment} — ${clientName}`}
      </p>
      <p style={{ fontSize: 12, color: theme.colors.grey, marginBottom: 14 }}>
        {t.remainingLabel} <strong style={{ color: theme.colors.warning }}>
          {formatCurrency(remaining, lang)}
        </strong>
      </p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        <Select label={paymentTypeLabel} value={form.paymentType} onChange={handlePaymentTypeChange}
          options={paymentTypeOptions} />
        <Input label={t.amountLabel} value={form.amount} onChange={set("amount")}
          type="number" required error={errors.amount}
          placeholder={t.amountPlaceholder} />
        <Select label={t.paymentMethodLabel} value={form.method} onChange={set("method")}
          options={t.paymentMethods || PAYMENT_METHODS} />
        <Input label={t.dateLabel} value={form.date} onChange={set("date")}
          type="date" required error={errors.date} />
        {isPreviousPayment ? (
          <Input label={oldReceiptNumberLabel} value={form.legacyReceiptNumber} onChange={set("legacyReceiptNumber")}
            placeholder={oldReceiptNumberLabel}
            inputStyle={{ color: theme.colors.gold, fontWeight: 700 }} />
        ) : (
          <Input label={t.receiptNoLabel} value={form.receiptNo} onChange={set("receiptNo")}
            placeholder={t.receiptPlaceholder} required error={errors.receiptNo}
            inputStyle={{ color: theme.colors.gold, fontWeight: 700 }} />
        )}
        {methodKind === "cheque" && (
          <Input label={t.chequeNumber || "رقم الشيك"} value={form.chequeNumber} onChange={set("chequeNumber")}
            placeholder={t.chequeNumberPlaceholder || "000000"} required error={errors.chequeNumber} />
        )}
        {(methodKind === "cheque" || methodKind === "bank") && (
          <Input label={t.paidBy || "من طرف"} value={form.paidBy} onChange={set("paidBy")}
            placeholder={t.paidByPlaceholder || "اسم الدافع"} required error={errors.paidBy} />
        )}
        <Input label={t.noteLabel} value={form.note} onChange={set("note")}
          placeholder={isPreviousPayment ? previousPaymentNotePlaceholder : t.notePlaceholder} style={{ gridColumn:"1/-1" }} />
      </div>
      {projectedOverpayment > 0 && (
        <p style={{
          fontSize:11.5,
          color:theme.colors.grey,
          margin:"-4px 0 10px",
          fontWeight:700,
        }}>
          {getProjectedOverpaymentText(projectedOverpayment, lang)}
        </p>
      )}
      <div style={{ display:"flex", gap:8 }}>
        <Button variant="success" onClick={handleSave} icon="save" disabled={saving}>{t.savePayment}</Button>
        <Button variant="ghost" onClick={onCancel}>{t.cancel}</Button>
      </div>
    </GlassCard>
  );
}
