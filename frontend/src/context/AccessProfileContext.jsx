import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";

const AccessProfileContext = createContext(null);
const STORAGE_KEY = "access_view_profile_v1";

// Role ranks mirror the backend (read_only < manager < accountant < owner).
export const ROLE_RANK = { read_only: 0, manager: 1, accountant: 2, owner: 3 };

export const ROLE_OPTIONS = [
  { value: "owner", label: "Owner", desc: "Full access to everything" },
  { value: "accountant", label: "Accountant", desc: "Finances, imports & reports" },
  { value: "manager", label: "Manager", desc: "Day-to-day data & actions" },
  { value: "read_only", label: "Read only", desc: "View dashboards, no changes" },
];

/**
 * IMPORTANT: this is a *view* profile, not a security boundary. The backend
 * always enforces the real team_role on every request. Switching the view
 * profile only changes which controls the UI offers, so an owner can preview
 * what a manager / accountant / read-only member experiences. A non-owner can
 * never raise their view above their real role.
 */
export function AccessProfileProvider({ children }) {
  const { user } = useAuth();
  const realRole = user?.team_role || "owner";

  const [viewRole, setViewRole] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved || realRole;
    } catch (_) {
      return realRole;
    }
  });

  // Never allow the view profile to exceed the real role.
  useEffect(() => {
    if ((ROLE_RANK[viewRole] ?? 3) > (ROLE_RANK[realRole] ?? 3)) {
      setViewRole(realRole);
    }
  }, [realRole, viewRole]);

  const changeViewRole = useCallback((next) => {
    // Clamp to the real role — preview down, never up.
    const clamped = (ROLE_RANK[next] ?? 0) > (ROLE_RANK[realRole] ?? 3) ? realRole : next;
    setViewRole(clamped);
    try { localStorage.setItem(STORAGE_KEY, clamped); } catch (_) { /* ignore */ }
  }, [realRole]);

  const reset = useCallback(() => {
    setViewRole(realRole);
    try { localStorage.setItem(STORAGE_KEY, realRole); } catch (_) { /* ignore */ }
  }, [realRole]);

  // Helper any component can use to gate an affordance.
  const can = useCallback(
    (minimum) => (ROLE_RANK[viewRole] ?? 0) >= (ROLE_RANK[minimum] ?? 0),
    [viewRole]
  );

  const value = useMemo(
    () => ({
      realRole,
      viewRole,
      isPreviewing: viewRole !== realRole,
      canSwitch: realRole === "owner", // only the owner may preview other roles
      changeViewRole,
      reset,
      can,
    }),
    [realRole, viewRole, changeViewRole, reset, can]
  );

  return <AccessProfileContext.Provider value={value}>{children}</AccessProfileContext.Provider>;
}

export function useAccessProfile() {
  const ctx = useContext(AccessProfileContext);
  if (!ctx) {
    // Safe fallback so components don't crash if the provider is absent.
    return {
      realRole: "owner", viewRole: "owner", isPreviewing: false, canSwitch: false,
      changeViewRole: () => {}, reset: () => {}, can: () => true,
    };
  }
  return ctx;
}
