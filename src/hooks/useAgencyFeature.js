import React from "react";
import { isSupabaseEnabled, supabase } from "../lib/supabase";

export const AGENCY_FEATURES = {
  PROGRAM_POSTERS: "program_posters",
};

export function useAgencyFeature(agencyId, featureKey) {
  const [state, setState] = React.useState({
    enabled: false,
    loading: Boolean(isSupabaseEnabled && agencyId && featureKey),
  });

  React.useEffect(() => {
    let cancelled = false;

    if (!isSupabaseEnabled || !supabase || !agencyId || !featureKey) {
      setState({ enabled: false, loading: false });
      return () => {
        cancelled = true;
      };
    }

    setState((current) => ({ ...current, enabled: false, loading: true }));

    supabase
      .from("agency_features")
      .select("enabled")
      .eq("agency_id", agencyId)
      .eq("feature_key", featureKey)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[AgencyFeature] Feature check failed:", featureKey, error);
          }
          setState({ enabled: false, loading: false });
          return;
        }
        setState({ enabled: Boolean(data?.enabled), loading: false });
      });

    return () => {
      cancelled = true;
    };
  }, [agencyId, featureKey]);

  return state;
}

