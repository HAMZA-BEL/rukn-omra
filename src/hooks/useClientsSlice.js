import { useState, useCallback } from "react";

export function useClientsSlice() {
  const [clients, setClientsState] = useState([]);
  const [deletedClients, setDeletedClientsState] = useState([]);

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

  const archiveClientLocal = useCallback((ids, archivedAt) => {
    if (!ids || !ids.length) return;
    const stamp = archivedAt || new Date().toISOString();
    const idSet = new Set(ids);
    setClientsState((prev) =>
      prev.map((item) =>
        idSet.has(item.id) ? { ...item, archived: true, archivedAt: stamp } : item
      )
    );
  }, []);

  const restoreArchivedClientLocal = useCallback((id) => {
    if (!id) return;
    setClientsState((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, archived: false, archivedAt: null } : item
      )
    );
  }, []);

  const softDeleteClientsLocal = useCallback((entries, deletedAt, batchId) => {
    if (!entries || !entries.length) return;
    const idSet = new Set(entries.map((c) => c.id));
    const stamp = deletedAt || new Date().toISOString();
    const batch = batchId || null;
    setClientsState((prev) => prev.filter((item) => !idSet.has(item.id)));
    setDeletedClientsState((prev) => {
      const filtered = prev.filter((item) => !idSet.has(item.id));
      const payload = entries.map((client) => ({
        ...client,
        deleted: true,
        deletedAt: stamp,
        deletedBatchId: batch,
      }));
      return [...payload, ...filtered];
    });
  }, []);

  const transferClientsLocal = useCallback((ids, programId, lastModified) => {
    if (!Array.isArray(ids) || ids.length === 0 || !programId) return;
    const stamp = lastModified || new Date().toISOString().split("T")[0];
    const idSet = new Set(ids);
    setClientsState((prev) =>
      prev.map((item) =>
        idSet.has(item.id)
          ? { ...item, programId, lastModified: stamp }
          : item
      )
    );
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

  const setDeletedClients = useCallback((next) => {
    if (typeof next === "function") {
      setDeletedClientsState((prev) => next(prev));
    } else if (Array.isArray(next)) {
      setDeletedClientsState(next);
    } else {
      setDeletedClientsState([]);
    }
  }, []);

  return {
    clients,
    deletedClients,
    setClients,
    setDeletedClients,
    setInitialClients,
    addClientLocal,
    updateClientLocal,
    archiveClientLocal,
    restoreArchivedClientLocal,
    softDeleteClientsLocal,
    transferClientsLocal,
    upsertClient,
    removeClient,
  };
}
