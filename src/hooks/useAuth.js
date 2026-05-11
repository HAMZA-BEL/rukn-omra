import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, isSupabaseEnabled } from "../lib/supabase";
import { db } from "../lib/db";
import { clearSupabaseLogoutAppStorage } from "../utils/localStorageHardening";

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
  const [loading,          setLoading]          = useState(isSupabaseEnabled);
  const [needsPasswordSet, setNeedsPasswordSet] = useState(false);
  const [profileError,     setProfileError]     = useState(null);
  const [profileLoading,   setProfileLoading]   = useState(false);
  const [profileChecked,   setProfileChecked]   = useState(!isSupabaseEnabled);
  const userRef = useRef(null);
  const agencyIdRef = useRef(null);
  const profileErrorRef = useRef(null);
  const profileCheckedRef = useRef(!isSupabaseEnabled);
  const profileLoadRef = useRef({ userId: null, promise: null });

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { agencyIdRef.current = agencyId; }, [agencyId]);
  useEffect(() => { profileErrorRef.current = profileError; }, [profileError]);
  useEffect(() => { profileCheckedRef.current = profileChecked; }, [profileChecked]);

  const loadProfile = useCallback(async (authUser, { force = false, silent = false } = {}) => {
    if (!authUser) {
      setUser(null);
      setAgencyId(null);
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
      && (agencyIdRef.current || profileErrorRef.current)
    );

    if (sameCheckedUser) {
      setUser((prev) => (
        prev?.id === authUser.id
          ? { ...authUser, profile: prev.profile }
          : prev
      ));
      return;
    }

    if (profileLoadRef.current.promise && profileLoadRef.current.userId === authUser.id) {
      return profileLoadRef.current.promise;
    }

    if (!silent) {
      setProfileLoading(true);
      setProfileChecked(false);
    }
    setProfileError(null);

    const promise = (async () => {
      const { data, error } = await db.users.fetchProfile(authUser.id);
      if (error || !data?.agency_id) {
        setUser(authUser);
        setAgencyId(null);
        setProfileError("no_profile");
      } else if ((data.status || "").toLowerCase() === "disabled") {
        setUser(null);
        setAgencyId(null);
        setProfileError("disabled");
        try {
          await supabase.auth.signOut();
          clearSupabaseLogoutAppStorage(data.agency_id);
        } catch {}
      } else if ((data.status || "").toLowerCase() === "invited") {
        setUser({ ...authUser, profile: data });
        setAgencyId(null);
        setProfileError(null);
        setNeedsPasswordSet(true);
      } else {
        setProfileError(null);
        setUser({ ...authUser, profile: data });
        setAgencyId(data.agency_id);
      }
    })()
      .catch(() => {
        setUser(authUser);
        setAgencyId(null);
        setProfileError("no_profile");
      })
      .finally(() => {
        setProfileLoading(false);
        setProfileChecked(true);
        if (profileLoadRef.current.userId === authUser.id) {
          profileLoadRef.current = { userId: null, promise: null };
        }
      });

    profileLoadRef.current = { userId: authUser.id, promise };
    return promise;
  }, []);

  useEffect(() => {
    if (!isSupabaseEnabled) {
      setProfileLoading(false);
      setProfileChecked(true);
      setLoading(false);
      return;
    }

    // Restore existing session on mount (normal login / page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      // If the URL had a magic-link type the onAuthStateChange handler
      // will fire first and set needsPasswordSet — skip getSession logic.
      if (session?.user && urlType !== "invite" && urlType !== "recovery") {
        loadProfile(session.user).finally(() => setLoading(false));
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
          setProfileError(null);
          setProfileLoading(false);
          setProfileChecked(true);
          setLoading(false);
        } else if (session?.user) {
          loadProfile(session.user).finally(() => setLoading(false));
        } else {
          setUser(null);
          setAgencyId(null);
          setProfileError(null);
          setProfileLoading(false);
          setProfileChecked(true);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile, urlType]);

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await loadProfile(data.user);
    return data;
  }, [loadProfile]);

  const logout = useCallback(async () => {
    const currentAgencyId = agencyId;
    await supabase.auth.signOut();
    clearSupabaseLogoutAppStorage(currentAgencyId);
    setUser(null);
    setAgencyId(null);
    setProfileError(null);
    setProfileLoading(false);
    setProfileChecked(true);
  }, [agencyId]);

  return {
    user,
    agencyId,
    loading,
    login,
    logout,
    needsPasswordSet,
    profileError,
    profileLoading,
    profileChecked,
  };
}
