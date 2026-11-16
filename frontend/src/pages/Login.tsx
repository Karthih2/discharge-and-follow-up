import { ArrowRight } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthField, AuthShell } from "../components/AuthShell";
import { api } from "../lib/api";
import { useFinishSignIn } from "../lib/auth";
import { useLang } from "../lib/lang";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function Login() {
  const finish = useFinishSignIn();
  const { lang, t } = useLang();
  const nav = useNavigate();
  const state = useLocation().state as { from?: string; expired?: boolean } | null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errs, setErrs] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const next: typeof errs = {};
    if (!EMAIL.test(email.trim())) next.email = t("errEmail");
    if (!password) next.password = t("errPassword");
    setErrs(next);
    if (next.email || next.password) return;
    setBusy(true);
    try {
      const to = finish(await api.signin(email.trim(), password, lang), state?.from);
      if (to) nav(to, { replace: true });
    } catch (x) {
      setErrs({ password: (x as Error).message });
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t("welcomeBackTitle")} subtitle={t("continueJourney")}>
      <form className="au-stack" onSubmit={submit} noValidate>
        {state?.expired && <p role="status" className="au-notice">{t("sessionEnded")}</p>}
        <AuthField icon="mail" label={t("emailAddress")} type="email" autoComplete="username" value={email} error={errs.email}
          onChange={(e) => { setEmail(e.target.value); setErrs({ ...errs, email: undefined }); }} />
        <AuthField icon="lock" label={t("password")} type="password" autoComplete="current-password" value={password} error={errs.password}
          onChange={(e) => { setPassword(e.target.value); setErrs({ ...errs, password: undefined }); }} />
        <div className="text-right">
          <button type="button" className="au-link" aria-expanded={help} onClick={() => setHelp(!help)}>{t("forgotPassword")}</button>
        </div>
        {help && <p className="au-help" role="status">{t("forgotHelp")}</p>}
        <button type="submit" className="au-submit" disabled={busy} aria-busy={busy}>
          {t("signIn")} {busy ? <span className="dots" aria-hidden><i /><i /><i /></span> : <ArrowRight size={20} aria-hidden />}
        </button>
      </form>
      <p className="au-foot">{t("noAccount")}<Link to="/register" replace>{t("tabSignUp")}</Link></p>
    </AuthShell>
  );
}
