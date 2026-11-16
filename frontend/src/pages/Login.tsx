import { Link, useLocation, useNavigate } from "react-router-dom";
import { LangToggle } from "../components/LangToggle";
import { SignInForm } from "../components/SignInForm";
import { Logo } from "../components/Icons";
import { api } from "../lib/api";
import { useFinishSignIn } from "../lib/auth";
import { useLang } from "../lib/lang";

export default function Login() {
  const finish = useFinishSignIn();
  const { lang, t } = useLang();
  const nav = useNavigate();
  const state = useLocation().state as { from?: string; expired?: boolean } | null;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <Logo size={28} />
          <span>CareBridge</span>
        </div>
        <h1 className="text-2xl font-bold">{t("signIn")}</h1>
        <p className="mt-1 text-sm text-muted">Sign in to access your discharge plans and care schedule.</p>
        <div className="mt-6">
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
        <div className="auth-divider">or</div>
        <div className="space-y-2 text-center text-sm text-muted">
          <p>Doctors sign in at <a href="/doctor/login" className="font-semibold text-brand-700 hover:underline">/doctor</a></p>
          <p>Management at <a href="/management/login" className="font-semibold text-brand-700 hover:underline">/management</a></p>
        </div>
      </div>
    </div>
  );
}
