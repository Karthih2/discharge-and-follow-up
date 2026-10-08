import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LangToggle } from "../components/LangToggle";
import { api } from "../lib/api";
import { HOME, useAuth } from "../lib/auth";
import { useLang } from "../lib/lang";

export default function Register() {
  const { signIn } = useAuth();
  const { lang } = useLang();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "", role: "patient" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <form
      className="max-w-md space-y-4"
      onSubmit={async (ev) => {
        ev.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          const out = await api.register({ ...f, language: lang });
          signIn(out);
          nav(HOME[out.user.role], { replace: true });
        } catch (x) {
          setErr((x as Error).message);
          setBusy(false);
        }
      }}
    >
      <h1 className="text-4xl">Create an account</h1>
      <p className="text-muted">Use invented details only. Doctors and management accounts are created by management.</p>
      <label className="block">
        <span className="mb-1 block font-semibold">Name</span>
        <input className="field" value={f.name} onChange={set("name")} required minLength={2} />
      </label>
      <label className="block">
        <span className="mb-1 block font-semibold">Email</span>
        <input className="field" type="email" value={f.email} onChange={set("email")} required />
      </label>
      <label className="block">
        <span className="mb-1 block font-semibold">Password (6 or more characters)</span>
        <input className="field" type="password" value={f.password} onChange={set("password")} required minLength={6} autoComplete="new-password" />
      </label>
      <label className="block">
        <span className="mb-1 block font-semibold">I am a</span>
        <select className="field" value={f.role} onChange={set("role")}>
          <option value="patient">Patient</option>
          <option value="manager">Family hub manager (caregiver)</option>
        </select>
      </label>
      <LangToggle />
      {err && <p role="alert" className="text-attention">{err}</p>}
      <div className="flex items-center gap-3">
        <button className="btn" disabled={busy}>Create account</button>
        <Link to="/login">I already have an account</Link>
      </div>
    </form>
  );
}
