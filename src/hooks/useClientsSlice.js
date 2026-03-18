import { useState, useCallback } from "react";

export function useClientsSlice() {
  const [clients, setClientsState] = useState([]);

  const setInitialClients = useCallback((items = []) => {
    if (!Array.isArray(items)) {
      setClientsState([]);
      return;
    }
    setClientsState(items);
  }, []);

  const addClientLocal = useCallback((client) => {
    if (!client || !client.id) return;
    setClientsState((prev) => [...prev, client]);
  }, []);

  const updateClientLocal = useCallback((id, patch) => {
    if (!id || !patch) return;
    setClientsState((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }, []);

  const upsertClient = useCallback((client) => {
    if (!client || !client.id) return;
    setClientsState((prev) => {
      const exists = prev.find((item) => item.id === client.id);
      if (exists) {
        return prev.map((item) => (item.id === client.id ? { ...item, ...client } : item));
      }
      return [...prev, client];
    });
  }, []);

  const removeClient = useCallback((id) => {
    if (!id) return;
    setClientsState((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const setClients = useCallback((next) => {
    if (typeof next === "function") {
      setClientsState((prev) => next(prev));
    } else if (Array.isArray(next)) {
      setClientsState(next);
    } else {
      setClientsState([]);
    }
  }, []);

  return {
    clients,
    setClients,
    setInitialClients,
    addClientLocal,
    updateClientLocal,
    upsertClient,
    removeClient,
  };
}
