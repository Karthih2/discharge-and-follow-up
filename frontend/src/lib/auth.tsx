import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, getToken, setToken, tokenKey, type AuthOut } from "./api";
import { useLang } from "./lang";
import { clearCache } from "./query";
import type { Role, User } from "./types";

interface Ctx {
  user: User | null;
  ready: boolean;
  expired: boolean;
  signIn: (out: AuthOut) => void;
  signOut: () => void;
  update: (u: User) => void;
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

/** One sign in for every role. Doctors and management go to their own app (each app keeps its own token); everyone else stays here. */
export function useFinishSignIn() {
  const { signIn } = useAuth();
  return (out: AuthOut, from?: string) => {
    const app = out.user.role === "doctor" ? ["doctor", "/doctor"] : out.user.role === "management" ? ["admin", "/management"] : null;
    if (app) {
      try {
        localStorage.setItem(tokenKey(app[0] as "doctor" | "admin"), out.token);
        localStorage.setItem("cb_lang", out.user.language);
      } catch { /* storage unavailable */ }
      window.location.assign(app[1] + "/");
      return;
    }
    signIn(out);
    return from ?? HOME[out.user.role];
  };
}

/** Each app accepts only its own roles. A token from another portal is dropped on load. */
export function AuthProvider({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
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
    const out = () => {
      clearCache();
      setExpired(true);
      setUser(null);
    };
    window.addEventListener("cb-signed-out", out);
    return () => window.removeEventListener("cb-signed-out", out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = (o: AuthOut) => {
    clearCache();
    setExpired(false);
    setToken(o.token);
    setUser(o.user);
    setLang(o.user.language);
  };
  const signOut = () => {
    clearCache();
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem("cb_last_doc");
    } catch {
      /* ignore */
    }
  };
  return <AuthContext.Provider value={{ user, ready, expired, signIn, signOut, update: setUser }}>{children}</AuthContext.Provider>;
}

/** Route guard: sends visitors to sign in, or to their own home when the role does not fit. */
export function Guard({ roles, children, login = "/login" }: { roles?: Role[]; children: ReactNode; login?: string }) {
  const { user, ready, expired } = useAuth();
  const loc = useLocation();
  if (!ready) return null;
  if (!user) return <Navigate to={login} state={{ from: loc.pathname + loc.search, expired }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={HOME[user.role]} replace />;
  return <>{children}</>;
}
