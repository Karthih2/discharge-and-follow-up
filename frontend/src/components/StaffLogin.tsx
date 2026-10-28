import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useLang } from "../lib/lang";
import { Button, Input } from "./ui";
import { Logo } from "./Icons";

export function StaffLogin({ portalLabel }: { portalLabel: string }) {
  const { signIn } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const out = await api.staffLogin(email.trim(), password);
      signIn(out);
      nav("/", { replace: true });
    } catch (x) {
      setError((x as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <form className="w-full max-w-sm space-y-6 rounded-lg border border-line bg-surface p-6 sm:p-8" onSubmit={onSubmit} noValidate>
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <span className="font-heading text-xl">CareBridge</span>
        </div>
        <h1 className="text-2xl">{portalLabel} Sign In</h1>
        <Input label={t("email")} type="email" autoComplete="username" value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); }} />
        <Input label={t("password")} type="password" autoComplete="current-password" value={password}
          onChange={(e) => { setPassword(e.target.value); setError(null); }} />
        {error && <p role="alert" className="text-sm text-attention">{error}</p>}
        <Button type="submit" loading={busy} className="w-full">{t("signIn")}</Button>
        <p className="text-center text-sm text-muted">Staff accounts are created by management.</p>
      </form>
    </div>
  );
}
