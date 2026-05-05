export const getSupabaseLogoutStorageKeys = (agencyId) => {
  const keys = [
    "rukn_saved_invoices_v1",
    "rukn_invoice_registry_v1",
    "rukn-clearance-selected-program",
  ];

  const ns = String(agencyId || "").trim();
  if (ns) {
    keys.push(
      `umrah_agency_v4_${ns}`,
      `rukn_notifications_${ns}:items`,
      `rukn_notifications_${ns}:generated`,
      `rukn_notifications_${ns}:dismissed`
    );
  }

  return keys;
};

export const clearSupabaseLogoutAppStorage = (agencyId) => {
  if (typeof window === "undefined" || !window.localStorage) return [];

  const keys = getSupabaseLogoutStorageKeys(agencyId);
  keys.forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* Ignore storage errors during logout cleanup. */
    }
  });

  return keys;
};
