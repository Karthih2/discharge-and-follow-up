import { useState, type FormEvent, type ReactNode } from "react";
import { useDemoAccounts } from "../lib/demo";
import { useLang } from "../lib/lang";
import { Button, Input } from "./ui";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Email and password with inline errors, a loading button and demo chips that fill the form. */
export function SignInForm({ staff, roles, roleLabels, submit, notice, extra, footer, emailLabel }: {
  staff: boolean | "all";
  roles?: string[];
  roleLabels: Record<string, string>;
  submit: (email: string, password: string) => Promise<void>;
  notice?: string | null;
  extra?: ReactNode;
  footer?: ReactNode;
  emailLabel?: string;
}) {
  const { t } = useLang();
  const demo = useDemoAccounts(staff);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errs, setErrs] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const next: typeof errs = {};
    if (!EMAIL.test(email.trim())) next.email = t("errEmail");
    if (!password) next.password = t("errPassword");
    setErrs(next);
    if (next.email || next.password) return;
    setBusy(true);
    try {
      await submit(email.trim(), password);
    } catch (x) {
      setErrs({ password: (x as Error).message });
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {notice && <p role="status" className="rounded-sm border border-attention bg-attention-tint p-3 text-attention">{notice}</p>}
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Input label={emailLabel ?? t("email")} type="email" autoComplete="username" value={email} error={errs.email}
          onChange={(e) => { setEmail(e.target.value); setErrs({ ...errs, email: undefined }); }} />
        <Input label={t("password")} type="password" autoComplete="current-password" value={password} error={errs.password} showLabel={t("show")} hideLabel={t("hide")}
          onChange={(e) => { setPassword(e.target.value); setErrs({ ...errs, password: undefined }); }} />
        {extra}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={busy}>{t("signIn")}</Button>
          {footer}
        </div>
      </form>
      {demo && (
        <div className="space-y-2 border-t border-line pt-4">
          <p className="text-sm text-muted">{t("demoChips")}</p>
          <ul className="flex flex-wrap gap-2">
            {demo.accounts.filter((a) => !roles || roles.includes(a.role)).map((a) => (
              <li key={a.email}>
                <button type="button" className="rounded-sm border border-line bg-surface px-2.5 py-1 text-sm hover:border-primary hover:text-primary"
                  onClick={() => { setEmail(a.email); setPassword(demo.password); setErrs({}); }}>
                  <span className="font-semibold">{a.name.replace(/ \(.*\)/, "")}</span>
                  <span className="ml-1 text-muted">{roleLabels[a.role] ?? a.role}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
