import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LangToggle } from "../components/LangToggle";
import { Skeleton } from "../components/Skeleton";
import { api } from "../lib/api";
import { HOME, ROLE_LABEL, useAuth } from "../lib/auth";
import { useLang } from "../lib/lang";
import { useLoad } from "../lib/motion";
import type { Role } from "../lib/types";

const ORDER: Role[] = ["patient", "manager", "family"];

export default function Login() {
  const { signIn } = useAuth();
  const { lang } = useLang();
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const { data: demo } = useLoad(() => api.demoAccounts(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async (e: string, p: string) => {
    setBusy(true);
    setErr(null);
    try {
      const out = await api.login(e, p, lang);
      signIn(out);
      nav(from && out.user.role === "patient" ? from : HOME[out.user.role], { replace: true });
    } catch (x) {
      setErr((x as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-12 lg:grid-cols-2">
      <section aria-labelledby="h-login" className="max-w-md space-y-5">
        <h1 id="h-login" className="text-4xl">Sign in</h1>
        <p className="text-muted">Sign in as a patient, a family hub manager or a family viewer.</p>
        <form
          className="space-y-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            go(email, password);
          }}
        >
          <label className="block">
            <span className="mb-1 block font-semibold">Email</span>
            <input className="field" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-1 block font-semibold">Password</span>
            <input className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <LangToggle />
          {err && <p role="alert" className="text-attention">{err}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn" disabled={busy}>Sign in</button>
            <Link to="/register">Create an account</Link>
          </div>
        </form>
      </section>

      <section aria-labelledby="h-demo" className="space-y-4">
        <h2 id="h-demo" className="text-2xl">Demo accounts</h2>
        <p className="text-muted">All people here are invented. Pick one to sign in with a single click.</p>
        {!demo && (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        )}
        {demo &&
          ORDER.map((role) => (
            <div key={role}>
              <h3 className="mb-1 text-lg">{ROLE_LABEL[role]}</h3>
              <ul className="space-y-1">
                {demo.accounts
                  .filter((a) => a.role === role)
                  .map((a) => (
                    <li key={a.email}>
                      <button className="btn btn-quiet btn-sm w-full justify-between" disabled={busy} onClick={() => go(a.email, demo.password)}>
                        <span>{a.name}</span>
                        <span className="text-muted">{a.email}</span>
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        {demo && <p className="text-sm text-muted">Demo password for every account: <span className="font-mono">{demo.password}</span></p>}
      </section>
    </div>
  );
}
