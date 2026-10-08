import { ShieldCheck, Stethoscope } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { EcgLine } from "../components/Illustrations";
import { Logo } from "../components/Icons";
import { Skeleton } from "../components/Skeleton";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { HOSPITAL, HOSPITAL_FULL } from "../lib/brand";
import { useLoad, useMotionT } from "../lib/motion";
import type { Role } from "../lib/types";

/** Sign in for one staff portal. Accounts are created by the hospital's management team, so there is no sign up. */
export default function StaffLogin({ role }: { role: Extract<Role, "doctor" | "management"> }) {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const mt = useMotionT();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const doctor = role === "doctor";
  const { data: demo } = useLoad(() => api.staffDemo(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async (e: string, p: string) => {
    setBusy(true);
    setErr(null);
    try {
      const out = await api.staffLogin(e, p);
      if (out.user.role !== role) throw new Error("Email or password is not right");
      signIn(out);
      nav(from ?? "/", { replace: true });
    } catch (x) {
      setErr((x as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-[1fr_1.1fr]">
      <aside className={`flex flex-col justify-between gap-10 p-8 md:p-12 ${doctor ? "bg-primary" : "bg-ink"} text-surface`}>
        <div className="flex items-center gap-3"><Logo size={40} /><div className="leading-tight"><p className="font-heading text-2xl">{HOSPITAL}</p><p className="text-sm opacity-80">{HOSPITAL_FULL}</p></div></div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={mt(0.5)} className="space-y-4">
          {doctor ? <Stethoscope size={64} weight="duotone" aria-hidden /> : <ShieldCheck size={64} weight="duotone" aria-hidden />}
          <h1 className="text-4xl">{doctor ? "Doctor workspace" : "Management console"}</h1>
          <p className="max-w-md text-lg opacity-90">
            {doctor
              ? "Review the items the system held back. Confirm, correct or remove them. Only what is assigned to you appears here."
              : "Assign reviewers, handle fallback, run callbacks and watch the queue. Clinical text is never shown on this console."}
          </p>
        </motion.div>
        <EcgLine width={260} onDark />
      </aside>
      <main className="flex items-center p-8 md:p-12">
        <div className="mx-auto w-full max-w-md space-y-5">
          <h2 className="text-3xl">Staff sign in</h2>
          <p className="text-muted">Accounts are created by {HOSPITAL_FULL} management. There is no sign up here.</p>
          <form className="space-y-4" onSubmit={(ev) => { ev.preventDefault(); go(email, password); }}>
            <label className="block"><span className="mb-1 block font-semibold">Work email</span>
              <input className="field" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label className="block"><span className="mb-1 block font-semibold">Password</span>
              <input className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
            {err && <p role="alert" className="text-attention">{err}</p>}
            <button className="btn" disabled={busy}>Sign in</button>
          </form>
          <div className="space-y-2 border-t border-line pt-4">
            <p className="text-sm text-muted">Demo accounts (invented people)</p>
            {!demo && <Skeleton className="h-9 w-full" />}
            <ul className="space-y-1">
              {demo?.accounts.filter((a) => a.role === role).map((a) => (
                <li key={a.email}>
                  <button className="btn btn-quiet btn-sm w-full justify-between" disabled={busy} onClick={() => go(a.email, demo.password)}>
                    <span>{a.name}</span><span className="text-muted">{a.email}</span>
                  </button>
                </li>
              ))}
            </ul>
            {demo && <p className="text-xs text-muted">Demo password: <span className="font-mono">{demo.password}</span></p>}
          </div>
        </div>
      </main>
    </div>
  );
}
