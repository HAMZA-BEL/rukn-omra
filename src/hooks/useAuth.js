import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, isSupabaseEnabled } from "../lib/supabase";
import { db } from "../lib/db";
import { clearSupabaseLogoutAppStorage } from "../utils/localStorageHardening";
import { resolveAgencyAccessError } from "../utils/agencyAccess";

const debugAuthAgencyLoad = ({ authUser, profile, agency }) => {
  if (process.env.NODE_ENV !== "development") return;
  console.debug("[Rukn Auth Debug] auth user:", {
    id: authUser?.id || null,
    email: authUser?.email || null,
  });
  console.debug("[Rukn Auth Debug] profile:", {
    id: profile?.id || null,
    email: profile?.email || null,
    status: profile?.status || null,
    agency_id: profile?.agency_id || null,
  });
  console.debug("[Rukn Auth Debug] agency loaded:", agency ? {
    id: agency.id || null,
    status: agency.status || null,
    name_ar: agency.nameAr || agency.name_ar || null,
    name_fr: agency.nameFr || agency.name_fr || null,
  } : null);
  console.debug(
    "[Rukn Auth Debug] agency match:",
    Boolean(agency?.id && profile?.agency_id && agency.id === profile.agency_id)
  );
};

const formatSupabaseError = (error) => (
  error ? {
    code: error.code || null,
    message: error.message || null,
    details: error.details || null,
    hint: error.hint || null,
  } : null
);

const debugAgencyFetchAttempt = async (agencyId) => {
  if (process.env.NODE_ENV !== "development") return;
  console.debug("[Rukn Auth Debug] fetching agency id:", agencyId || null);
  try {
    const { data, error } = await supabase.rpc("get_agency_id");
    console.debug("[Rukn Auth Debug] public.get_agency_id result:", {
      data: data || null,
      error: formatSupabaseError(error),
      matchesProfileAgencyId: Boolean(data && agencyId && data === agencyId),
    });
  } catch (error) {
    console.debug("[Rukn Auth Debug] public.get_agency_id threw:", formatSupabaseError(error) || error);
  }
};

const debugAgencyFetchResult = ({ profileAgencyId, agency, error }) => {
  if (process.env.NODE_ENV !== "development") return;
  const formattedError = formatSupabaseError(error);
  console.debug("[Rukn Auth Debug] agency fetch result data/error:", {
    data: agency ? {
      id: agency.id || null,
      status: agency.status || null,
      name_ar: agency.nameAr || agency.name_ar || null,
      name_fr: agency.nameFr || agency.name_fr || null,
    } : null,
    error: formattedError,
  });
  if (formattedError) {
    console.warn("[Rukn Auth Debug] agency fetch returned Supabase error:", formattedError);
    return;
  }
  if (!agency && profileAgencyId) {
    console.warn(
      "[Rukn Auth Debug] agency fetch returned empty data with no error. This usually means RLS hid the agencies row, public.get_agency_id() returned null, or the agency row is missing.",
      { profileAgencyId }
    );
  }
};

/**
 * useAuth — handles Supabase authentication and user profile loading.
 * In local-only mode (no Supabase env vars), user = null and agencyId = null
 * throughout, and the rest of the app runs in localStorage-only mode.
 */
export function useAuth() {
  // Capture URL hash 'type' BEFORE Supabase SDK clears the fragment.
  // 'invite'   → first-time user following an invitation link
  // 'recovery' → user following a password-reset link
  const [urlType] = useState(() => {
    try {
      return new URLSearchParams(window.location.hash.slice(1)).get("type");
    } catch { return null; }
  });

  const [user,             setUser]             = useState(null);
  const [agencyId,         setAgencyId]         = useState(null);
  const [currentAgency,    setCurrentAgency]    = useState(null);
  const [loading,          setLoading]          = useState(isSupabaseEnabled);
  const [needsPasswordSet, setNeedsPasswordSet] = useState(false);
  const [profileError,     setProfileError]     = useState(null);
  const [profileLoading,   setProfileLoading]   = useState(false);
  const [profileChecked,   setProfileChecked]   = useState(!isSupabaseEnabled);
  const userRef = useRef(null);
  const agencyIdRef = useRef(null);
  const currentAgencyRef = useRef(null);
  const profileErrorRef = useRef(null);
  const profileCheckedRef = useRef(!isSupabaseEnabled);
  const profileLoadRef = useRef({ userId: null, promise: null });

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { agencyIdRef.current = agencyId; }, [agencyId]);
  useEffect(() => { currentAgencyRef.current = currentAgency; }, [currentAgency]);
  useEffect(() => { profileErrorRef.current = profileError; }, [profileError]);
  useEffect(() => { profileCheckedRef.current = profileChecked; }, [profileChecked]);

  const loadProfile = useCallback(async (authUser, { force = false, silent = false } = {}) => {
    if (!authUser) {
      setUser(null);
      setAgencyId(null);
      setCurrentAgency(null);
      setProfileError(null);
      setProfileLoading(false);
      setProfileChecked(true);
      return;
    }

    const currentUser = userRef.current;
    const sameCheckedUser = Boolean(
      !force
      && profileCheckedRef.current
      && currentUser?.id
      && currentUser.id === authUser.id
      && (
        (agencyIdRef.current && currentAgencyRef.current?.id === agencyIdRef.current)
        || profileErrorRef.current
      )
    );

    if (sameCheckedUser) {
      setUser((prev) => (
        prev?.id === authUser.id
          ? { ...authUser, profile: prev.profile }
          : prev
      ));
      return;
    }

    const loadUserId = authUser.id;
    if (profileLoadRef.current.promise && profileLoadRef.current.userId === loadUserId) {
      return profileLoadRef.current.promise;
    }

    if (!silent) {
      setProfileLoading(true);
      setProfileChecked(false);
    }
    setProfileError(null);

    const promise = (async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const resolvedAuthUser = authData?.user || authUser;
      if (authError || !resolvedAuthUser?.id) {
        setUser(null);
        setAgencyId(null);
        setCurrentAgency(null);
        setProfileError("no_profile");
        return;
      }

      const { data, error } = await db.users.fetchProfile(resolvedAuthUser.id);
      if (error || !data) {
        debugAuthAgencyLoad({ authUser: resolvedAuthUser, profile: data, agency: null });
        setUser(resolvedAuthUser);
        setAgencyId(null);
        setCurrentAgency(null);
        setProfileError("no_profile");
        return;
      }

      if (!data.agency_id) {
        debugAuthAgencyLoad({ authUser: resolvedAuthUser, profile: data, agency: null });
        setUser({ ...resolvedAuthUser, profile: data });
        setAgencyId(null);
        setCurrentAgency(null);
        setProfileError("no_agency");
        return;
      }

      if ((data.status || "").toLowerCase() === "disabled") {
        setUser(null);
        setAgencyId(null);
        setCurrentAgency(null);
        setProfileError("disabled");
        try {
          await supabase.auth.signOut();
          clearSupabaseLogoutAppStorage(data.agency_id);
        } catch {}
        return;
      }

      if ((data.status || "").toLowerCase() === "invited") {
        setUser({ ...resolvedAuthUser, profile: data });
        setAgencyId(null);
        setCurrentAgency(null);
        setProfileError(null);
        setNeedsPasswordSet(true);
        return;
      }

      const { data: agencySnapshot, error: agencySnapshotError } = await db.agency.fetchAccessSnapshot();
      if (agencySnapshotError) {
        setUser({ ...resolvedAuthUser, profile: data });
        setAgencyId(data.agency_id);
        setCurrentAgency(null);
        setProfileError("agency_access_unavailable");
        return;
      }
      if (!agencySnapshot) {
        setUser({ ...resolvedAuthUser, profile: data });
        setAgencyId(null);
        setCurrentAgency(null);
        setProfileError("no_agency");
        return;
      }
      const accessError = resolveAgencyAccessError(data.agency_id, agencySnapshot);
      if (accessError) {
        setUser({ ...resolvedAuthUser, profile: data });
        setAgencyId(data.agency_id);
        setCurrentAgency(agencySnapshot);
        setProfileError(accessError);
        return;
      }

      await debugAgencyFetchAttempt(data.agency_id);
      const { data: agency, error: agencyError } = await db.agency.fetch(data.agency_id);
      debugAgencyFetchResult({ profileAgencyId: data.agency_id, agency, error: agencyError });
      debugAuthAgencyLoad({ authUser: resolvedAuthUser, profile: data, agency });

      if (agencyError) {
        setUser({ ...resolvedAuthUser, profile: data });
        setAgencyId(data.agency_id);
        setCurrentAgency(null);
        setProfileError("agency_access_unavailable");
        return;
      }

      if (!agency) {
        // The agency may have changed to a blocked status between the safe
        // snapshot and the RLS-protected full read. Recheck before calling it missing.
        const { data: latestSnapshot, error: latestSnapshotError } = await db.agency.fetchAccessSnapshot();
        if (latestSnapshotError) {
          setUser({ ...resolvedAuthUser, profile: data });
          setAgencyId(data.agency_id);
          setCurrentAgency(null);
          setProfileError("agency_access_unavailable");
          return;
        }
        if (!latestSnapshot) {
          setUser({ ...resolvedAuthUser, profile: data });
          setAgencyId(null);
          setCurrentAgency(null);
          setProfileError("no_agency");
          return;
        }
        const latestAccessError = resolveAgencyAccessError(data.agency_id, latestSnapshot);
        setUser({ ...resolvedAuthUser, profile: data });
        setAgencyId(data.agency_id);
        setCurrentAgency(latestSnapshot);
        setProfileError(latestAccessError || "agency_access_unavailable");
        return;
      }

      if (agency.id !== data.agency_id) {
        setUser({ ...resolvedAuthUser, profile: data });
        setAgencyId(null);
        setCurrentAgency(null);
        setProfileError("agency_mismatch");
        return;
      }

      const agencyAccessError = resolveAgencyAccessError(data.agency_id, agency);
      if (agencyAccessError) {
        setUser({ ...resolvedAuthUser, profile: data });
        setCurrentAgency(agency);
        setAgencyId(data.agency_id);
        setProfileError(agencyAccessError);
        return;
      }

      setProfileError(null);
      setUser({ ...resolvedAuthUser, profile: data });
      setCurrentAgency(agency);
      setAgencyId(data.agency_id);
    })()
      .catch(() => {
        setUser(authUser);
        setAgencyId(null);
        setCurrentAgency(null);
        setProfileError("no_profile");
      })
      .finally(() => {
        setProfileLoading(false);
        setProfileChecked(true);
        if (profileLoadRef.current.userId === loadUserId) {
          profileLoadRef.current = { userId: null, promise: null };
        }
      });

    profileLoadRef.current = { userId: loadUserId, promise };
    return promise;
  }, []);

  useEffect(() => {
    if (!isSupabaseEnabled) {
      setProfileLoading(false);
      setProfileChecked(true);
      setLoading(false);
      return;
    }

    // Restore existing user on mount (normal login / page refresh)
    supabase.auth.getUser().then(({ data: { user: restoredUser } }) => {
      // If the URL had a magic-link type the onAuthStateChange handler
      // will fire first and set needsPasswordSet — skip restore logic.
      if (restoredUser && urlType !== "invite" && urlType !== "recovery") {
        loadProfile(restoredUser).finally(() => setLoading(false));
      } else if (!urlType) {
        setProfileLoading(false);
        setProfileChecked(true);
        setLoading(false);
      }
      // else: wait for onAuthStateChange to call setLoading(false)
    });

    // Listen for auth changes (login / logout / token refresh / magic links)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          // Password-reset link → ask user to set new password
          setNeedsPasswordSet(true);
          if (session?.user) loadProfile(session.user).finally(() => setLoading(false));
          else {
            setProfileLoading(false);
            setProfileChecked(true);
            setLoading(false);
          }
        } else if (event === "SIGNED_IN" && urlType === "invite") {
          // First-time invite link → ask user to set their password
          setNeedsPasswordSet(true);
          if (session?.user) loadProfile(session.user).finally(() => setLoading(false));
          else {
            setProfileLoading(false);
            setProfileChecked(true);
            setLoading(false);
          }
        } else if (event === "USER_UPDATED") {
          // Password was successfully updated → clear the set-password gate
          setNeedsPasswordSet(false);
          if (session?.user) loadProfile(session.user).finally(() => setLoading(false));
          else setLoading(false);
        } else if (event === "TOKEN_REFRESHED") {
          if (session?.user && session.user.id !== userRef.current?.id) {
            loadProfile(session.user).finally(() => setLoading(false));
          } else {
            setLoading(false);
          }
        } else if (event === "SIGNED_IN") {
          if (session?.user) loadProfile(session.user).finally(() => setLoading(false));
          else setLoading(false);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setAgencyId(null);
          setCurrentAgency(null);
          setProfileError(null);
          setProfileLoading(false);
          setProfileChecked(true);
          setLoading(false);
        } else if (session?.user) {
          loadProfile(session.user).finally(() => setLoading(false));
        } else {
          setUser(null);
          setAgencyId(null);
          setCurrentAgency(null);
          setProfileError(null);
          setProfileLoading(false);
          setProfileChecked(true);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile, urlType]);

  useEffect(() => {
    if (!isSupabaseEnabled || !user?.id || !agencyId) return undefined;
    const refreshAgencyAccess = () => loadProfile(userRef.current, { force: true, silent: true });
    const intervalId = window.setInterval(refreshAgencyAccess, 60000);
    const channel = supabase
      .channel(`agency-access-${agencyId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "agencies", filter: `id=eq.${agencyId}` },
        refreshAgencyAccess
      )
      .subscribe();
    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [agencyId, loadProfile, user?.id]);

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await loadProfile(data.user);
    return data;
  }, [loadProfile]);

  const retryAgencyAccess = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return;
    await loadProfile(data.user, { force: true, silent: true });
  }, [loadProfile]);

  const logout = useCallback(async () => {
    const currentAgencyId = agencyId;
    await supabase.auth.signOut();
    clearSupabaseLogoutAppStorage(currentAgencyId);
    setUser(null);
    setAgencyId(null);
    setCurrentAgency(null);
    setProfileError(null);
    setProfileLoading(false);
    setProfileChecked(true);
  }, [agencyId]);

  return {
    user,
    agencyId,
    currentAgency,
    loading,
    login,
    logout,
    needsPasswordSet,
    profileError,
    profileLoading,
    profileChecked,
    retryAgencyAccess,
  };
}
