import { ArrowRight, ChevronDown, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthField, AuthShell } from "../components/AuthShell";
import { api } from "../lib/api";
import { HOME, useAuth } from "../lib/auth";
import { useLang } from "../lib/lang";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function Register() {
  const { signIn } = useAuth();
  const { lang, t } = useLang();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "", role: "patient" });
  const [errs, setErrs] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setErrs({ ...errs, [k]: undefined }); };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const next: Record<string, string> = {};
    if (f.name.trim().length < 2) next.name = t("errName");
    if (!EMAIL.test(f.email.trim())) next.email = t("errEmail");
    if (f.password.length < 8) next.password = t("errPassword8");
    setErrs(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const out = await api.register({ ...f, name: f.name.trim(), email: f.email.trim(), language: lang });
      signIn(out);
      nav(HOME[out.user.role], { replace: true });
    } catch (x) {
      setErrs({ email: (x as Error).message });
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t("joinTitle")} subtitle={t("startJourney")}>
      <form className="au-stack" onSubmit={submit} noValidate>
        <AuthField icon="user" label={t("fullName")} autoComplete="name" value={f.name} error={errs.name} onChange={set("name")} />
        <AuthField icon="mail" label={t("emailAddress")} type="email" autoComplete="email" value={f.email} error={errs.email} onChange={set("email")} />
        <AuthField icon="lock" label={t("password")} type="password" autoComplete="new-password" value={f.password} error={errs.password} onChange={set("password")} />
        <div>
          <label htmlFor="au-role" className="sr-only">{t("iAmA")}</label>
          <div className="au-field">
            <Users size={19} className="au-field-ic" aria-hidden />
            <select id="au-role" value={f.role} onChange={set("role")}>
              <option value="patient">{t("iAmA")}: {t("rolePatient")}</option>
              <option value="manager">{t("iAmA")}: {t("managerCaregiver")}</option>
            </select>
            <ChevronDown size={18} className="pointer-events-none absolute right-4 text-[#3e4b42]" aria-hidden />
          </div>
        </div>
        <button type="submit" className="au-submit" disabled={busy} aria-busy={busy}>
          {t("createAnAccount")} {busy ? <span className="dots" aria-hidden><i /><i /><i /></span> : <ArrowRight size={20} aria-hidden />}
        </button>
      </form>
      <p className="au-foot">{t("haveAccountQ")}<Link to="/login" replace>{t("tabLogin")}</Link></p>
    </AuthShell>
  );
}
