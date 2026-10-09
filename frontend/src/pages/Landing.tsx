import { Prohibit } from "@phosphor-icons/react";
import { m as motion } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { HeroScene } from "../components/HeroScene";
import { StepArt } from "../components/Illustrations";
import { SignInForm } from "../components/SignInForm";
import { LinkButton } from "../components/ui";
import { api } from "../lib/api";
import { HOME, useAuth, useFinishSignIn } from "../lib/auth";
import { useLang } from "../lib/lang";
import { useMotionT } from "../lib/motion";

const STEPS = [["step1T", "step1D"], ["step2T", "step2D"], ["step3T", "step3D"], ["step4T", "step4D"]] as const;
const NEVER = ["never1", "never2", "never3", "never4"] as const;

export default function Landing() {
  const { user } = useAuth();
  const finish = useFinishSignIn();
  const { lang, t } = useLang();
  const nav = useNavigate();
  const mt = useMotionT();
  const home = user ? HOME[user.role] : null;

  return (
    <div className="space-y-16">
      <section className="grid items-center gap-8 md:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={mt(0.18)} className="text-4xl font-extrabold leading-tight md:text-5xl">
            {t("landingTitle")}
          </motion.h1>
          <p className="measure text-lg text-muted">{t("landingText")}</p>
          <div className="flex flex-wrap gap-3">
            {home ? <LinkButton to={home} className="px-6 py-3 text-lg">{t("goMyPlans")}</LinkButton> : <LinkButton to="/register" className="px-6 py-3 text-lg">{t("createAccount")}</LinkButton>}
            <a href="#start" className="px-2 py-3 font-semibold">{home ? t("howItWorks") : t("signInBelow")}</a>
          </div>
        </div>
        <HeroScene />
      </section>

      <section id="start" className="grid gap-10 md:grid-cols-[1.2fr_1fr]" aria-labelledby="how">
        <div className="space-y-5">
          <h2 id="how" className="text-3xl">{t("howItWorks")}</h2>
          <ol className="rule-list">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="flex gap-4 py-4">
                <StepArt n={i + 1} size={44} />
                <div><h3 className="text-xl">{t(title)}</h3><p className="measure text-muted">{t(text)}</p></div>
              </li>
            ))}
          </ol>
        </div>
        <div className="space-y-4">
          {user ? (
            <div className="card space-y-3 p-5">
              <h2 className="text-2xl">{t("welcomeBack")}, {user.name.split(" ")[0]}</h2>
              <LinkButton to={HOME[user.role]}>{t("openMyHome")}</LinkButton>
            </div>
          ) : (
            <div className="card space-y-4 p-5">
              <h2 className="text-2xl">{t("signIn")}</h2>
              <SignInForm
                staff="all"
                roleLabels={{ patient: t("rolePatient"), manager: t("roleManager"), family: t("roleFamily"), doctor: t("roleDoctor"), management: t("roleManagement") }}
                submit={async (email, password) => {
                  const to = finish(await api.signin(email, password, lang));
                  if (to) nav(to, { replace: true });
                }}
                footer={<Link to="/register">{t("createAccount")}</Link>}
              />
            </div>
          )}
          <div className="card p-5">
            <h2 id="safety" className="mb-2 text-xl">{t("itNeverWill")}</h2>
            <ul className="rule-list">
              {NEVER.map((x) => <li key={x} className="flex items-center gap-2 py-2"><Prohibit size={20} weight="duotone" className="shrink-0 text-attention" aria-hidden /> {t(x)}</li>)}
            </ul>
            <p className="mt-3 text-sm text-muted">{t("neverNote")} <Link to="/safety">{t("safetyLimits")}</Link></p>
          </div>
        </div>
      </section>
    </div>
  );
}
