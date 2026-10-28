import { Link, useLocation, useNavigate } from "react-router-dom";
import { LangToggle } from "../components/LangToggle";
import { SignInForm } from "../components/SignInForm";
import { api } from "../lib/api";
import { useFinishSignIn } from "../lib/auth";
import { useLang } from "../lib/lang";

export default function Login() {
  const finish = useFinishSignIn();
  const { lang, t } = useLang();
  const nav = useNavigate();
  const state = useLocation().state as { from?: string; expired?: boolean } | null;

  return (
    <section aria-labelledby="h-login" className="mx-auto max-w-lg space-y-5">
      <h1 id="h-login" className="text-4xl">{t("signIn")}</h1>
      <p className="text-muted">Sign in to access your discharge plans and care schedule.</p>
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <SignInForm
          notice={state?.expired ? t("sessionEnded") : null}
          submit={async (email, password) => {
            const to = finish(await api.signin(email, password, lang), state?.from);
            if (to) nav(to, { replace: true });
          }}
          extra={<LangToggle />}
          footer={<Link to="/register">{t("createAccount")}</Link>}
        />
      </div>
      <div className="rounded-2xl border border-line bg-surface/60 p-4 text-sm text-muted">
        <p>Doctors sign in at <a href="/doctor/login" className="text-primary underline">/doctor</a></p>
        <p>Management signs in at <a href="/management/login" className="text-primary underline">/management</a></p>
      </div>
    </section>
  );
}
