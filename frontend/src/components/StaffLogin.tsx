import { ArrowRight } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useLang } from "../lib/lang";
import { AuthField, AuthShell } from "./AuthShell";

/** Doctor and management sign in: the same painted panel, without the sign up tab. Staff accounts come from management. */
export function StaffLogin({ portalLabel }: { portalLabel: string }) {
  const { signIn } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    setError(null);
    try {
      signIn(await api.staffLogin(email.trim(), password));
      nav("/", { replace: true });
    } catch (x) {
      setError((x as Error).message);
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t("welcomeBackTitle")} subtitle={`${portalLabel} sign in`} tabs={false} back={null}>
      <form className="au-stack" onSubmit={onSubmit} noValidate>
        <AuthField icon="mail" label={t("workEmail")} type="email" autoComplete="username" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} />
        <AuthField icon="lock" label={t("password")} type="password" autoComplete="current-password" value={password} error={error} onChange={(e) => { setPassword(e.target.value); setError(null); }} />
        <div className="text-right"><button type="button" className="au-link" aria-expanded={help} onClick={() => setHelp(!help)}>{t("forgotPassword")}</button></div>
        {help && <p className="au-help" role="status">Ask the hospital's management team to reset your password.</p>}
        <button type="submit" className="au-submit" disabled={busy} aria-busy={busy}>
          {t("signIn")} {busy ? <span className="dots" aria-hidden><i /><i /><i /></span> : <ArrowRight size={20} aria-hidden />}
        </button>
      </form>
      <p className="au-foot" style={{ fontSize: "1rem" }}>{t("staffNoSignUp")}</p>
    </AuthShell>
  );
}
