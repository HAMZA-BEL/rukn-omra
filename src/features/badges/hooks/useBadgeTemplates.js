import React from "react";
import {
  createBadgeTemplateId,
  deleteBadgeTemplate,
  fetchBadgeTemplates,
  saveBadgeTemplate,
  setDefaultBadgeTemplate,
} from "../services/badgeTemplatesApi";

export function useBadgeTemplates({ agencyId, onError } = {}) {
  const [templates, setTemplates] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const onErrorRef = React.useRef(onError);

  React.useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await fetchBadgeTemplates({ agencyId });
      if (error) throw error;
      setTemplates(data || []);
      return data || [];
    } catch (error) {
      setError(error);
      onErrorRef.current?.(error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const save = React.useCallback(async (template) => {
    const payload = { ...template, id: template.id || createBadgeTemplateId() };
    const { data, error } = await saveBadgeTemplate({ agencyId, template: payload });
    if (error) throw error;
    await refresh();
    return data || payload;
  }, [agencyId, refresh]);

  const remove = React.useCallback(async (id) => {
    const { error } = await deleteBadgeTemplate({ agencyId, id });
    if (error) throw error;
    await refresh();
  }, [agencyId, refresh]);

  const makeDefault = React.useCallback(async (id) => {
    const { error } = await setDefaultBadgeTemplate({ agencyId, id });
    if (error) throw error;
    await refresh();
  }, [agencyId, refresh]);

  return { templates, loading, error, refresh, save, remove, makeDefault };
}
