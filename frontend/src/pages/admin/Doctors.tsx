import { AnimatePresence, m as motion } from "motion/react";
import { useState } from "react";
import { Badge, Button, Card, Input, ListSkeleton, PageHead, Select } from "../../components/ui";
import { api } from "../../lib/api";
import { useLang } from "../../lib/lang";
import { useMotionT, useStagger } from "../../lib/motion";
import { invalidate, useQuery } from "../../lib/query";
import { toast } from "../../lib/toast";
import type { DoctorRow } from "../../lib/types";

const DEPARTMENTS = ["cardiology", "diabetology", "general medicine", "neurology", "orthopaedics", "pulmonology"];

function CreateDoctor() {
  const { t } = useLang();
  const [f, setF] = useState({ name: "", email: "", password: "", specialty: "general medicine" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setErrs({ ...errs, [k]: "" }); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (f.name.trim().length < 2) next.name = t("errName");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) next.email = t("errEmail");
    if (f.password.length < 8) next.password = t("errPassword8");
    setErrs(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await api.addDoctor(f);
      toast(t("toastDoctorAdded"));
      setF({ name: "", email: "", password: "", specialty: "general medicine" });
      invalidate("admin/doctors");
    } catch (x) {
      setErrs({ email: (x as Error).message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card as="section" className="p-4" aria-labelledby="h-new">
      <form onSubmit={submit} noValidate className="space-y-3">
        <h2 id="h-new" className="text-xl">{t("createDoctor")}</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Input label={t("name")} value={f.name} error={errs.name} onChange={set("name")} />
          <Input label={t("workEmail")} type="email" value={f.email} error={errs.email} onChange={set("email")} />
          <Input label={t("startingPassword")} type="password" autoComplete="new-password" showLabel={t("show")} hideLabel={t("hide")} value={f.password} error={errs.password} onChange={set("password")} />
          <Select label={t("department")} value={f.specialty} onChange={set("specialty")}>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </div>
        <Button type="submit" loading={busy}>{t("createDoctor")}</Button>
      </form>
    </Card>
  );
}

function DoctorCard({ d, all }: { d: DoctorRow; all: DoctorRow[] }) {
  const { t } = useLang();
  const mt = useMotionT();
  const [busy, setBusy] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async (kind: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(kind);
    setErr(null);
    try {
      await fn();
      toast(ok);
      invalidate("admin");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <motion.li layout transition={mt(0.2)}>
      <Card className={`space-y-3 p-4 ${d.active ? "" : "bg-bg"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-xl">{d.name}</h3>
            <p className="text-muted">{d.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!d.active && <Badge>{t("deactivated")}</Badge>}
            <Badge tone={d.available ? "good" : "warn"}>{d.available ? t("available") : t("unavailable")}</Badge>
            <Badge><span className="tnum">{d.open_items}</span>&nbsp;{t("open")}</Badge>
            {d.overdue_items > 0 && <Badge tone="warn"><span className="tnum">{d.overdue_items}</span>&nbsp;{t("overdue")}</Badge>}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Select label={t("department")} value={d.specialty} disabled={busy === "dept"}
            onChange={(e) => run("dept", () => api.editDoctor(d.id, { specialty: e.target.value }), t("toastSaved"))}>
            {[...new Set([...DEPARTMENTS, d.specialty])].map((x) => <option key={x} value={x}>{x}</option>)}
          </Select>
          <Select label={t("backupDoctor")} value={d.backup?.id ?? ""} disabled={busy === "backup"}
            onChange={(e) => run("backup", () => (e.target.value ? api.editDoctor(d.id, { backup_user_id: Number(e.target.value) }) : api.editDoctor(d.id, { clear_backup: true })), t("toastSaved"))}>
            <option value="">{t("none")}</option>
            {all.filter((x) => x.id !== d.id && x.active).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </Select>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Button small look="quiet" loading={busy === "avail"} onClick={() => run("avail", () => api.adminAvailability(d.id, !d.available), d.available ? t("toastUnavailable") : t("toastAvailable"))}>
            {d.available ? t("setUnavailable") : t("setAvailable")}
          </Button>
          <Button small look={d.active ? "attention" : "solid"} loading={busy === "active"}
            onClick={() => run("active", () => api.editDoctor(d.id, { active: !d.active }), d.active ? t("toastDeactivated") : t("toastReactivated"))}>
            {d.active ? t("deactivate") : t("reactivate")}
          </Button>
          {showPw ? (
            <>
              <div className="w-48"><Input label={t("newPassword")} type="password" autoComplete="new-password" showLabel={t("show")} hideLabel={t("hide")} value={pw} onChange={(e) => setPw(e.target.value)} /></div>
              <Button small loading={busy === "pw"} disabled={pw.length < 8} onClick={() => run("pw", async () => { await api.resetPassword(d.id, pw); setPw(""); setShowPw(false); }, t("toastPasswordReset"))}>{t("save")}</Button>
              <Button small look="quiet" onClick={() => { setShowPw(false); setPw(""); }}>{t("cancel")}</Button>
            </>
          ) : (
            <Button small look="quiet" onClick={() => setShowPw(true)}>{t("resetPassword")}</Button>
          )}
        </div>
        {err && <p role="alert" className="text-attention">{err}</p>}
      </Card>
    </motion.li>
  );
}

export default function Doctors() {
  const { t } = useLang();
  const docs = useQuery("admin/doctors", api.adminDoctors);
  const rise = useStagger("admin-doctors");
  return (
    <div className="space-y-6">
      <PageHead title={t("doctors")} text={t("doctorsIntro")} />
      <CreateDoctor />
      {docs.error && <p role="alert" className="text-attention">{docs.error}</p>}
      {docs.loading && <ListSkeleton rows={4} />}
      <motion.ul {...rise(0)} className="space-y-3">
        <AnimatePresence initial={false}>
          {docs.data?.map((d) => <DoctorCard key={d.id} d={d} all={docs.data!} />)}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}
