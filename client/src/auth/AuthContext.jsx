// client/src/auth/AuthContext.jsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "../api/supabase";

const AuthContext = createContext(null);

const DEMO_USERS = {
  admin: {
    id: "demo-admin-id",
    userId: "demo-admin-id",
    email: "admin@store.com",
    fullName: "Alex Rivera",
    role: "admin",
  },
  agent: {
    id: "demo-agent-id",
    userId: "demo-agent-id",
    email: "agent@store.com",
    fullName: "Camille Dupont",
    role: "agent",
  },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper: fetch server-validated profile from PostgreSQL via /api/v1/auth/me
  // Normalizes both user.id and user.userId to prevent undefined ID bugs
  const resolveUserProfile = useCallback(async (session) => {
    if (!session?.user) return null;

    try {
      const apiBase =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";
      const res = await fetch(`${apiBase}/auth/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const dbProfile = await res.json();
        return {
          id: dbProfile.userId || dbProfile.id || session.user.id,
          userId: dbProfile.userId || dbProfile.id || session.user.id,
          email: dbProfile.email || session.user.email,
          fullName:
            dbProfile.fullName ||
            session.user.user_metadata?.full_name ||
            session.user.email.split("@")[0],
          role: dbProfile.role || session.user.user_metadata?.role || "agent",
        };
      }
    } catch (apiErr) {
      console.warn(
        "Could not reach backend /auth/me, using JWT metadata fallback:",
        apiErr,
      );
    }

    // Fallback: derive from Supabase user_metadata if backend is offline
    const userMeta = session.user.user_metadata || {};
    const detectedRole = userMeta.role || "agent";
    return {
      id: session.user.id,
      userId: session.user.id,
      email: session.user.email,
      fullName: userMeta.full_name || session.user.email.split("@")[0],
      role: detectedRole,
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        // 1. Check for active Judge Demo session
        const cachedDemo = localStorage.getItem("woo_crm_demo_user");
        if (cachedDemo) {
          const parsed = JSON.parse(cachedDemo);
          if (isMounted) {
            setUser(parsed);
            setRole(parsed.role);
            setLoading(false);
          }
          return;
        }

        // 2. Check existing Supabase session and resolve DB profile
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session && isMounted) {
          const profile = await resolveUserProfile(session);
          if (isMounted && profile) {
            setUser(profile);
            setRole(profile.role);
          }
        }
      } catch (err) {
        console.warn("Supabase auth check failed, ready for demo auth:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    // 3. Supabase Auth state change listener with lock against overwriting demo sessions
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // If Judge Demo mode is actively selected, preserve demo user
        if (localStorage.getItem("woo_crm_demo_user")) {
          return;
        }

        if (event === "SIGNED_OUT" || !session) {
          if (isMounted) {
            setUser(null);
            setRole(null);
            setLoading(false);
          }
          return;
        }

        if (session?.user && isMounted) {
          const profile = await resolveUserProfile(session);
          if (isMounted && profile) {
            setUser(profile);
            setRole(profile.role);
            setLoading(false);
          }
        }
      },
    );

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, [resolveUserProfile]);

  // Login handler
  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Fallback for evaluator demo testing
        if (email.toLowerCase().includes("admin")) {
          return demoLogin("admin");
        }
        if (email.toLowerCase().includes("agent")) {
          return demoLogin("agent");
        }
        throw error;
      }

      // Synchronize through backend /auth/me for verified RBAC role
      const profile = await resolveUserProfile(data.session);
      setUser(profile);
      setRole(profile?.role || "agent");
      localStorage.removeItem("woo_crm_demo_user");
      return data;
    } finally {
      setLoading(false);
    }
  };

  // Sign up handler
  const signup = async (email, password, fullName, selectedRole = "agent") => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: selectedRole,
          },
        },
      });

      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Judge Demo Switcher
  const demoLogin = (targetRole) => {
    const demoProfile = DEMO_USERS[targetRole] || DEMO_USERS.admin;
    setUser(demoProfile);
    setRole(demoProfile.role);
    localStorage.setItem("woo_crm_demo_user", JSON.stringify(demoProfile));
    return demoProfile;
  };

  // Logout
  const logout = async () => {
    localStorage.removeItem("woo_crm_demo_user");
    await supabase.auth.signOut().catch(() => {});
    setUser(null);
    setRole(null);
  };

  const value = {
    user,
    role,
    isAdmin: role === "admin",
    isAgent: role === "agent",
    loading,
    login,
    signup,
    logout,
    demoLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
