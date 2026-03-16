import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseEnabled } from "../lib/supabase";
import { db } from "../lib/db";

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

  const loadProfile = useCallback(async (authUser) => {
    if (!authUser) { setUser(null); setAgencyId(null); setProfileError(null); return; }
    try {
      const { data, error } = await db.users.fetchProfile(authUser.id);
      if (error || !data?.agency_id) {
        // Auth succeeded but no profile row in public.users
        setUser(authUser);
        setAgencyId(null);
        setProfileError("no_profile");
      } else {
        setProfileError(null);
        setUser({ ...authUser, profile: data });
        setAgencyId(data.agency_id);
      }
    } catch {
      setUser(authUser);
      setAgencyId(null);
      setProfileError("no_profile");
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseEnabled) { setLoading(false); return; }

    // Restore existing session on mount (normal login / page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      // If the URL had a magic-link type the onAuthStateChange handler
      // will fire first and set needsPasswordSet — skip getSession logic.
      if (session?.user && urlType !== "invite" && urlType !== "recovery") {
        loadProfile(session.user).finally(() => setLoading(false));
      } else if (!urlType) {
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
          if (session?.user) loadProfile(session.user);
          setLoading(false);
        } else if (event === "SIGNED_IN" && urlType === "invite") {
          // First-time invite link → ask user to set their password
          setNeedsPasswordSet(true);
          if (session?.user) loadProfile(session.user);
          setLoading(false);
        } else if (event === "USER_UPDATED") {
          // Password was successfully updated → clear the set-password gate
          setNeedsPasswordSet(false);
          if (session?.user) loadProfile(session.user).finally(() => setLoading(false));
          else setLoading(false);
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          if (session?.user) loadProfile(session.user).finally(() => setLoading(false));
          else setLoading(false);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setAgencyId(null);
          setLoading(false);
        } else if (session?.user) {
          loadProfile(session.user).finally(() => setLoading(false));
        } else {
          setUser(null);
          setAgencyId(null);
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
    await supabase.auth.signOut();
    setUser(null);
    setAgencyId(null);
  }, []);

  return { user, agencyId, loading, login, logout, needsPasswordSet, profileError };
}
