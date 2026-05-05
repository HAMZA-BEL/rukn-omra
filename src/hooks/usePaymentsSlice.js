import { useState, useCallback } from "react";

export function usePaymentsSlice() {
  const [payments, setPayments] = useState([]);
  const [deletedPayments, setDeletedPayments] = useState([]);

  const mapPaymentRow = useCallback((row) => {
    if (!row) return null;
    const method = row.method || row.payment_method || "";
    const receiptNo = row.receipt_no || row.receipt_number || "";
    const chequeNumber = row.cheque_number || row.check_number || "";
    const note = row.note || row.notes || "";
    return {
      id: row.id,
      clientId: row.client_id || row.clientId,
      amount: Number(row.amount),
      date: row.date,
      method,
      paymentMethod: method,
      payment_method: method,
      receiptNo,
      receipt_no: receiptNo,
      receiptNumber: receiptNo,
      receipt_number: receiptNo,
      receiptSequence: row.receipt_sequence ?? row.receiptSequence ?? null,
      receipt_sequence: row.receipt_sequence ?? row.receiptSequence ?? null,
      note,
      notes: note,
      chequeNumber,
      cheque_number: chequeNumber,
      checkNumber: chequeNumber,
      check_number: chequeNumber,
      paidBy: row.paid_by || row.paidBy || "",
      paid_by: row.paid_by || row.paidBy || "",
      status: row.status || "active",
      trashedAt: row.trashed_at || row.trashedAt || "",
      trashed_at: row.trashed_at || row.trashedAt || "",
      deletedAt: row.deleted_at || row.deletedAt || "",
      deleted_at: row.deleted_at || row.deletedAt || "",
    };
  }, []);

  const setInitialPayments = useCallback((items = []) => {
    setPayments(Array.isArray(items) ? items : []);
  }, []);

  const setInitialDeletedPayments = useCallback((items = []) => {
    setDeletedPayments(Array.isArray(items) ? items : []);
  }, []);

  const replacePayments = useCallback((items = []) => {
    setPayments(Array.isArray(items) ? items : []);
  }, []);

  const handleRealtimeUpsert = useCallback((row) => {
    if (!row) return;
    const mapped = mapPaymentRow(row);
    if (!mapped) return;
    if (mapped.status === "trashed") {
      setPayments((prev) => prev.filter((p) => p.id !== mapped.id));
      setDeletedPayments((prev) => {
        const exists = prev.find((p) => p.id === mapped.id);
        if (exists) return prev.map((p) => (p.id === mapped.id ? { ...p, ...mapped } : p));
        return [mapped, ...prev];
      });
      return;
    }
    if (mapped.status === "deleted") {
      setPayments((prev) => prev.filter((p) => p.id !== mapped.id));
      setDeletedPayments((prev) => prev.filter((p) => p.id !== mapped.id));
      return;
    }
    setDeletedPayments((prev) => prev.filter((p) => p.id !== mapped.id));
    setPayments((prev) => {
      const exists = prev.find((p) => p.id === mapped.id);
      if (exists) return prev.map((p) => (p.id === mapped.id ? { ...p, ...mapped } : p));
      return [...prev, mapped];
    });
  }, [mapPaymentRow]);

  const handleRealtimeDelete = useCallback((id) => {
    if (!id) return;
    setPayments((prev) => prev.filter((p) => p.id !== id));
    setDeletedPayments((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addPaymentLocal = useCallback((payment) => {
    setPayments((prev) => {
      const exists = prev.find((p) => p.id === payment.id);
      if (exists) return prev.map((p) => (p.id === payment.id ? { ...p, ...payment } : p));
      return [...prev, payment];
    });
  }, []);

  const removePaymentLocal = useCallback((id) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const trashPaymentLocal = useCallback((id) => {
    const now = new Date().toISOString();
    setPayments((prev) => {
      const payment = prev.find((p) => p.id === id);
      if (!payment) return prev;
      const trashed = { ...payment, status: "trashed", trashedAt: now, trashed_at: now, deletedAt: "", deleted_at: "" };
      setDeletedPayments((deletedPrev) => {
        const exists = deletedPrev.find((p) => p.id === id);
        return exists
          ? deletedPrev.map((p) => (p.id === id ? { ...p, ...trashed } : p))
          : [trashed, ...deletedPrev];
      });
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const restorePaymentLocal = useCallback((id) => {
    setDeletedPayments((prev) => {
      const payment = prev.find((p) => p.id === id);
      if (!payment) return prev;
      const restored = { ...payment, status: "active", trashedAt: "", trashed_at: "", deletedAt: "", deleted_at: "" };
      setPayments((paymentPrev) => {
        const exists = paymentPrev.find((p) => p.id === id);
        return exists
          ? paymentPrev.map((p) => (p.id === id ? { ...p, ...restored } : p))
          : [...paymentPrev, restored];
      });
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const purgePaymentLocal = useCallback((id) => {
    setDeletedPayments((prev) => prev.filter((p) => p.id !== id));
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const removePaymentsByClient = useCallback((clientIdOrIds) => {
    if (Array.isArray(clientIdOrIds)) {
      const idSet = new Set(clientIdOrIds);
      setPayments((prev) => prev.filter((p) => !idSet.has(p.clientId)));
    } else {
      setPayments((prev) => prev.filter((p) => p.clientId !== clientIdOrIds));
    }
  }, []);

  const getClientPayments = useCallback(
    (clientId) => payments.filter((p) => p.clientId === clientId),
    [payments]
  );

  const getClientTotalPaid = useCallback(
    (clientId) => payments.reduce((sum, p) => (p.clientId === clientId ? sum + p.amount : sum), 0),
    [payments]
  );

  const getClientLastPayment = useCallback(
    (clientId) => {
      const cp = payments
        .filter((p) => p.clientId === clientId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      return cp[0] || null;
    },
    [payments]
  );

  return {
    payments,
    deletedPayments,
    setInitialPayments,
    setInitialDeletedPayments,
    replacePayments,
    handleRealtimeUpsert,
    handleRealtimeDelete,
    addPaymentLocal,
    removePaymentLocal,
    trashPaymentLocal,
    restorePaymentLocal,
    purgePaymentLocal,
    removePaymentsByClient,
    getClientPayments,
    getClientTotalPaid,
    getClientLastPayment,
  };
}
