import { useState, useCallback } from "react";

export function usePaymentsSlice() {
  const [payments, setPayments] = useState([]);

  const setInitialPayments = useCallback((items = []) => {
    setPayments(Array.isArray(items) ? items : []);
  }, []);

  const replacePayments = useCallback((items = []) => {
    setPayments(Array.isArray(items) ? items : []);
  }, []);

  const handleRealtimeUpsert = useCallback((row) => {
    if (!row) return;
    const mapped = {
      id: row.id,
      clientId: row.client_id,
      amount: Number(row.amount),
      date: row.date,
      method: row.method,
      receiptNo: row.receipt_no,
      note: row.note,
      chequeNumber: row.cheque_number || "",
      paidBy: row.paid_by || "",
    };
    setPayments((prev) => {
      const exists = prev.find((p) => p.id === mapped.id);
      if (exists) return prev.map((p) => (p.id === mapped.id ? { ...p, ...mapped } : p));
      return [...prev, mapped];
    });
  }, []);

  const handleRealtimeDelete = useCallback((id) => {
    if (!id) return;
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addPaymentLocal = useCallback((payment) => {
    setPayments((prev) => [...prev, payment]);
  }, []);

  const removePaymentLocal = useCallback((id) => {
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
    setInitialPayments,
    replacePayments,
    handleRealtimeUpsert,
    handleRealtimeDelete,
    addPaymentLocal,
    removePaymentLocal,
    removePaymentsByClient,
    getClientPayments,
    getClientTotalPaid,
    getClientLastPayment,
  };
}
