import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, getToken, setToken, type AuthOut } from "./api";
import { useLang } from "./lang";
import type { Role, User } from "./types";

interface Ctx {
  user: User | null;
  ready: boolean;
  signIn: (out: AuthOut) => void;
  signOut: () => void;
}

const AuthContext = createContext<Ctx>(null as unknown as Ctx);
export const useAuth = () => useContext(AuthContext);

export const HOME: Record<Role, string> = {
  patient: "/patient",
  manager: "/family",
  family: "/family",
  doctor: "/",
  management: "/",
};

export const ROLE_LABEL: Record<Role, string> = {
  patient: "Patient",
  manager: "Hub manager",
  family: "Family viewer",
  doctor: "Doctor",
  management: "Management",
};

/** Each app accepts only its own roles. A token from another portal is dropped on load. */
export function AuthProvider({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const { setLang } = useLang();

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api
      .me()
      .then((u) => {
        if (!allow.includes(u.role)) {
          setToken(null);
          return;
        }
        setUser(u);
        setLang(u.language);
      })
      .catch(() => setToken(null))
      .finally(() => setReady(true));
    const out = () => setUser(null);
    window.addEventListener("cb-signed-out", out);
    return () => window.removeEventListener("cb-signed-out", out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = (o: AuthOut) => {
    setToken(o.token);
    setUser(o.user);
    setLang(o.user.language);
  };
  const signOut = () => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem("cb_last_doc");
    } catch {
      /* ignore */
    }
  };
  return <AuthContext.Provider value={{ user, ready, signIn, signOut }}>{children}</AuthContext.Provider>;
}

/** Route guard: sends visitors to sign in, or to their own home when the role does not fit. */
export function Guard({ roles, children, login = "/login" }: { roles?: Role[]; children: ReactNode; login?: string }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return null;
  if (!user) return <Navigate to={login} state={{ from: loc.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={HOME[user.role]} replace />;
  return <>{children}</>;
}
