export async function signOutCurrentSession(auth) {
  if (!auth?.signOut) throw new Error("supabase_auth_unavailable");
  return auth.signOut({ scope: "local" });
}

export function beginSessionLogoutOnce(stateRef) {
  if (!stateRef || stateRef.current) return false;
  stateRef.current = true;
  return true;
}
