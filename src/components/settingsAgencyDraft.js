import React from "react";

const normalizeAgencyDraftScalar = (value) => (value === null || value === undefined ? "" : value);

const areDraftValuesEqual = (first, second) => {
  if (first && second && typeof first === "object" && typeof second === "object") {
    return areAgencyDraftsEqual(first, second);
  }
  return normalizeAgencyDraftScalar(first) === normalizeAgencyDraftScalar(second);
};

export const areAgencyDraftsEqual = (first = {}, second = {}) => {
  const keys = new Set([...Object.keys(first || {}), ...Object.keys(second || {})]);
  for (const key of keys) {
    if (!areDraftValuesEqual(first?.[key], second?.[key])) return false;
  }
  return true;
};

export function useAgencySettingsDraft(agency = {}, agencyId = "") {
  const initialAgency = agency || {};
  const [form, setForm] = React.useState(() => ({ ...initialAgency }));
  const [isDirty, setIsDirty] = React.useState(false);
  const [hasServerConflict, setHasServerConflict] = React.useState(false);
  const hydratedAgencyIdRef = React.useRef(agencyId || "");
  const baselineRef = React.useRef({ ...initialAgency });
  const revisionRef = React.useRef(0);
  const isDirtyRef = React.useRef(false);
  const acceptedServerSnapshotRef = React.useRef(null);

  const updateDirty = React.useCallback((nextDirty) => {
    isDirtyRef.current = nextDirty;
    setIsDirty(nextDirty);
  }, []);

  React.useEffect(() => {
    if (!agency) return;
    const nextAgencyId = agencyId || agency.id || agency.agencyId || agency.agency_id || "";
    const agencyChanged = hydratedAgencyIdRef.current !== nextAgencyId;
    if (agencyChanged || !hydratedAgencyIdRef.current) {
      hydratedAgencyIdRef.current = nextAgencyId;
      baselineRef.current = { ...agency };
      revisionRef.current = 0;
      acceptedServerSnapshotRef.current = null;
      setForm({ ...agency });
      updateDirty(false);
      setHasServerConflict(false);
      return;
    }
    if (isDirtyRef.current) {
      if (
        acceptedServerSnapshotRef.current
        && areAgencyDraftsEqual(agency, acceptedServerSnapshotRef.current)
      ) {
        acceptedServerSnapshotRef.current = null;
        return;
      }
      setHasServerConflict(true);
      return;
    }
    baselineRef.current = { ...agency };
    setForm({ ...agency });
    setHasServerConflict(false);
  }, [agency, agencyId, updateDirty]);

  const updateForm = React.useCallback((updater) => {
    setForm((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      if (areAgencyDraftsEqual(current, next)) return current;
      revisionRef.current += 1;
      updateDirty(!areAgencyDraftsEqual(next, baselineRef.current));
      return next;
    });
  }, [updateDirty]);

  const beginSave = React.useCallback(() => ({
    revision: revisionRef.current,
    draft: { ...form },
    hadServerConflict: hasServerConflict,
  }), [form, hasServerConflict]);

  const completeSave = React.useCallback((savedAgency, savedRevision, hadServerConflict = false) => {
    const canonical = { ...(savedAgency || {}) };
    baselineRef.current = canonical;
    if (revisionRef.current === savedRevision) {
      setForm(canonical);
      updateDirty(false);
      setHasServerConflict(false);
      return true;
    }
    acceptedServerSnapshotRef.current = canonical;
    updateDirty(true);
    setHasServerConflict(hadServerConflict);
    return false;
  }, [updateDirty]);

  const applySavedFields = React.useCallback((fields = {}, acceptedServerSnapshot = null) => {
    if (acceptedServerSnapshot) acceptedServerSnapshotRef.current = { ...acceptedServerSnapshot };
    baselineRef.current = { ...baselineRef.current, ...fields };
    setForm((current) => {
      const next = { ...current, ...fields };
      updateDirty(!areAgencyDraftsEqual(next, baselineRef.current));
      return next;
    });
  }, [updateDirty]);

  return {
    form,
    setForm: updateForm,
    isDirty,
    hasServerConflict,
    beginSave,
    completeSave,
    applySavedFields,
    revisionRef,
  };
}
