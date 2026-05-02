import React from "react";
import { Input, Select, Button, GlassCard } from "./UI";
import { PAYMENT_METHODS } from "../data/initialData";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import { formatCurrency } from "../utils/currency";

const normalizePaymentMethodKind = (value = "") => {
  const method = String(value).trim().toLowerCase();
  if (method.includes("شيك") || method.includes("chèque") || method.includes("cheque") || method.includes("check")) return "cheque";
  if (method.includes("تحويل") || method.includes("virement") || method.includes("transfer")) return "bank";
  return "cash";
};

export default function PaymentForm({ clientId, clientName, store, onSave, onCancel }) {
  const { getClientTotalPaid, clients, payments } = store;
  const { t, tr, lang } = useLang();
  const client    = clients.find(c => c.id === clientId);
  const salePrice = client ? (client.salePrice || client.price || 0) : 0;
  const totalPaid = getClientTotalPaid(clientId);
  const remaining = Math.max(0, salePrice - totalPaid);

  // Auto-generate receipt number
  const nextReceiptNo = "REC-" + String(payments.length + 1).padStart(3, "0");

  const [form, setForm] = React.useState({
    amount:    "",
    method:    t.paymentMethods ? t.paymentMethods[0] : "نقدًا",
    date:      new Date().toISOString().split("T")[0],
    receiptNo: nextReceiptNo,
    chequeNumber: "",
    paidBy:    "",
    note:      "",
  });
  const [errors, setErrors] = React.useState({});
  const set = k => e => setForm(f => ({...f, [k]: e.target.value}));
  const methodKind = normalizePaymentMethodKind(form.method);

  const handleSave = () => {
    const e = {};
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
      e.amount = t.amountError;
    if (Number(form.amount) > remaining + 1)
      e.amount = (t.amountExceedsError || "").replace("{remaining}", formatCurrency(remaining, lang));
    if (!form.date)      e.date = t.dateError;
    if (!form.receiptNo) e.receiptNo = t.receiptError;
    if (methodKind === "cheque" && !form.chequeNumber.trim())
      e.chequeNumber = t.chequeNumberRequired || "يرجى إدخال رقم الشيك";
    if ((methodKind === "cheque" || methodKind === "bank") && !form.paidBy.trim())
      e.paidBy = t.paidByRequired || "يرجى إدخال من طرف";
    if (Object.keys(e).length) { setErrors(e); return; }
    store.addPayment({
      clientId, amount: Number(form.amount),
      method: form.method, date: form.date,
      receiptNo: form.receiptNo,
      chequeNumber: form.chequeNumber.trim(),
      paidBy: form.paidBy.trim(),
      note: form.note,
    });
    onSave();
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
        <Input label={t.amountLabel} value={form.amount} onChange={set("amount")}
          type="number" required error={errors.amount}
          placeholder={t.amountPlaceholder} />
        <Select label={t.paymentMethodLabel} value={form.method} onChange={set("method")}
          options={t.paymentMethods || PAYMENT_METHODS} />
        <Input label={t.dateLabel} value={form.date} onChange={set("date")}
          type="date" required error={errors.date} />
        <Input label={t.receiptNoLabel} value={form.receiptNo} onChange={set("receiptNo")}
          placeholder={t.receiptPlaceholder} required error={errors.receiptNo}
          inputStyle={{ color: theme.colors.gold, fontWeight: 700 }} />
        {methodKind === "cheque" && (
          <Input label={t.chequeNumber || "رقم الشيك"} value={form.chequeNumber} onChange={set("chequeNumber")}
            placeholder={t.chequeNumberPlaceholder || "000000"} required error={errors.chequeNumber} />
        )}
        {(methodKind === "cheque" || methodKind === "bank") && (
          <Input label={t.paidBy || "من طرف"} value={form.paidBy} onChange={set("paidBy")}
            placeholder={t.paidByPlaceholder || "اسم الدافع"} required error={errors.paidBy} />
        )}
        <Input label={t.noteLabel} value={form.note} onChange={set("note")}
          placeholder={t.notePlaceholder} style={{ gridColumn:"1/-1" }} />
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <Button variant="success" onClick={handleSave} icon="save">{t.savePayment}</Button>
        <Button variant="ghost" onClick={onCancel}>{t.cancel}</Button>
      </div>
    </GlassCard>
  );
}
