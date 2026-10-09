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
  const roleLabels = { patient: t("rolePatient"), manager: t("roleManager"), family: t("roleFamily"), doctor: t("roleDoctor"), management: t("roleManagement") };

  return (
    <section aria-labelledby="h-login" className="mx-auto max-w-lg space-y-5">
      <h1 id="h-login" className="text-4xl">{t("signIn")}</h1>
      <p className="text-muted">{t("signInAnyone")}</p>
      <SignInForm
        staff="all"
        roleLabels={roleLabels}
        notice={state?.expired ? t("sessionEnded") : null}
        submit={async (email, password) => {
          const to = finish(await api.signin(email, password, lang), state?.from);
          if (to) nav(to, { replace: true });
        }}
        extra={<LangToggle />}
        footer={<Link to="/register">{t("createAccount")}</Link>}
      />
    </section>
  );
}
