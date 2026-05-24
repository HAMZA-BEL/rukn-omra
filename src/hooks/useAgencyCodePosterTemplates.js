import React from "react";
import { isSupabaseEnabled, supabase } from "../lib/supabase";
import {
  getCodePosterTemplateByKey,
  OFFICIAL_RUKN_CODE_TEMPLATE_KEY,
} from "../features/posterTemplates/codeTemplates/registry";

export function useAgencyCodePosterTemplates(agencyId) {
  const [state, setState] = React.useState({
    templates: [],
    loading: Boolean(isSupabaseEnabled && agencyId),
  });

  React.useEffect(() => {
    let cancelled = false;

    if (!isSupabaseEnabled || !supabase || !agencyId) {
      setState({ templates: [], loading: false });
      return () => {
        cancelled = true;
      };
    }

    setState((current) => ({ ...current, templates: [], loading: true }));

    supabase
      .from("agency_code_poster_templates")
      .select("template_key,is_default")
      .eq("agency_id", agencyId)
      .eq("enabled", true)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[AgencyCodePosterTemplates] Assignment lookup failed:", error);
          }
          setState({ templates: [], loading: false });
          return;
        }

        const templates = (Array.isArray(data) ? data : [])
          .map((row) => {
            const templateKey = String(row?.template_key || "").trim();
            if (!templateKey || templateKey === OFFICIAL_RUKN_CODE_TEMPLATE_KEY) return null;
            const registryEntry = getCodePosterTemplateByKey(templateKey);
            if (!registryEntry?.meta) return null;
            return {
              key: templateKey,
              isDefault: Boolean(row?.is_default),
              meta: registryEntry.meta,
            };
          })
          .filter(Boolean)
          .sort((a, b) => {
            if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
            return String(a.meta?.name?.ar || a.key).localeCompare(String(b.meta?.name?.ar || b.key), "ar");
          });

        setState({ templates, loading: false });
      });

    return () => {
      cancelled = true;
    };
  }, [agencyId]);

  return state;
}
