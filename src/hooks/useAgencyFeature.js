import React from "react";
import { isSupabaseEnabled, supabase } from "../lib/supabase";

export const AGENCY_FEATURES = {
  PROGRAM_POSTERS: "program_posters",
  BADGES: "badges",
  CONTRACTS: "contracts",
};

export function useAgencyFeature(agencyId, featureKey, options = {}) {
  const fallbackEnabled = Boolean(options.fallbackEnabled);
  const [state, setState] = React.useState({
    enabled: fallbackEnabled,
    loading: Boolean(isSupabaseEnabled && agencyId && featureKey),
  });

  React.useEffect(() => {
    let cancelled = false;

    if (!isSupabaseEnabled || !supabase || !agencyId || !featureKey) {
      setState({ enabled: fallbackEnabled, loading: false });
      return () => {
        cancelled = true;
      };
    }

    setState((current) => ({ ...current, enabled: fallbackEnabled, loading: true }));

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
          setState({ enabled: fallbackEnabled, loading: false });
          return;
        }
        setState({ enabled: data ? Boolean(data.enabled) : fallbackEnabled, loading: false });
      });

    return () => {
      cancelled = true;
    };
  }, [agencyId, fallbackEnabled, featureKey]);

  return state;
}
