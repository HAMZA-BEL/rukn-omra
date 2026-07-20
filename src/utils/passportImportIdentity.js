const text = (value) => String(value || "").trim();

export const getClientAgencyId = (client = {}) => text(
  client.agencyId
  || client.agency_id
  || client.agency?.id
);

export const filterClientsForCurrentAgency = (clients = [], currentAgencyId = "") => {
  const agencyId = text(currentAgencyId);
  if (!agencyId) return Array.isArray(clients) ? clients : [];
  return (Array.isArray(clients) ? clients : [])
    .filter((client) => getClientAgencyId(client) === agencyId);
};

export const getStoredClientCin = (client = {}) => text(
  client.cin
  || client.CIN
  || client.nationalId
  || client.national_id
  || client.passport?.cin
  || client.passport?.nationalId
  || client.passport?.national_id
);

/**
 * Moroccan passports use TD3 optional data for CIN. Do not generalize that
 * country-specific meaning to other issuers, and expose it only when the
 * optional-data check digit validates the exact fixed-position field.
 */
export const extractTrustedMoroccanCin = (parsed = {}) => {
  const engineResult = parsed.engineResult || {};
  const diagnostics = engineResult.diagnostics?.line2 || {};
  const fields = engineResult.fields || parsed.data || {};
  const checks = parsed.checks || engineResult.checks || {};
  const line1 = text(engineResult.raw?.line1 || parsed.raw?.line1 || parsed.data?.raw?.line1).toUpperCase();
  const issuer = text(parsed.data?.issuer || line1.slice(2, 5)).toUpperCase();
  const nationality = text(fields.nationality || parsed.data?.nationality).toUpperCase();
  const optionalData = text(
    diagnostics.fixedPositions?.optionalData?.value
    || engineResult.raw?.line2?.slice?.(28, 42)
    || parsed.raw?.line2?.slice?.(28, 42)
    || parsed.data?.raw?.line2?.slice?.(28, 42)
  ).toUpperCase();

  if (issuer !== "MAR" || nationality !== "MAR") return { value: "", trusted: false };
  if (diagnostics.reliable !== true || checks.optionalDataCheck?.valid !== true) {
    return { value: "", trusted: false };
  }

  const value = optionalData.replace(/<+$/g, "");
  if (!value || value.includes("<") || !/^[A-Z0-9]+$/.test(value)) {
    return { value: "", trusted: false };
  }
  return { value, trusted: true, source: "moroccan_td3_optional_data" };
};
