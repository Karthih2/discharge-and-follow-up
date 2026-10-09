import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LangToggle } from "../components/LangToggle";
import { api } from "../lib/api";
import { HOME, useAuth } from "../lib/auth";
import { useLang } from "../lib/lang";
import { Button } from "../components/ui";

export default function Register() {
  const { signIn } = useAuth();
  const { lang, t } = useLang();
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
      <h1 className="text-4xl">{t("createAnAccount")}</h1>
      <p className="text-muted">{t("registerIntro")}</p>
      <label className="block">
        <span className="mb-1 block font-semibold">{t("name")}</span>
        <input className="field" value={f.name} onChange={set("name")} required minLength={2} />
      </label>
      <label className="block">
        <span className="mb-1 block font-semibold">{t("email")}</span>
        <input className="field" type="email" value={f.email} onChange={set("email")} required />
      </label>
      <label className="block">
        <span className="mb-1 block font-semibold">{t("password6")}</span>
        <input className="field" type="password" value={f.password} onChange={set("password")} required minLength={6} autoComplete="new-password" />
      </label>
      <label className="block">
        <span className="mb-1 block font-semibold">{t("iAmA")}</span>
        <select className="field" value={f.role} onChange={set("role")}>
          <option value="patient">{t("rolePatient")}</option>
          <option value="manager">{t("managerCaregiver")}</option>
        </select>
      </label>
      <LangToggle />
      {err && <p role="alert" className="text-attention">{err}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>{t("createAnAccount")}</Button>
        <Link to="/login">{t("haveAccount")}</Link>
      </div>
    </form>
  );
}
