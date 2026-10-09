import { CalendarBlank, Lock, MagnifyingGlass, UsersThree } from "@phosphor-icons/react";
import { AnimatePresence, m as motion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ActivityDots, DateTile, IconTile, MiniCalendar, Props, Stat, Tile } from "../components/Dash";
import { Badge, Button, EmptyState, Input, LinkButton, ListSkeleton, PageHead, Select, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useLang } from "../lib/lang";
import { fmtDate, useMotionT, useStagger } from "../lib/motion";
import { invalidate, useDebounced, useQuery } from "../lib/query";
import { toast } from "../lib/toast";
import type { FamilyHomeRow, Scope } from "../lib/types";

const SCOPE_KEY = { full: "scopeFull", appointments: "scopeAppointments", reminders: "scopeReminders", none: "scopeNone" } as const;

/** Grey card for something the patient chose not to share. It says why in plain words. */
function Locked({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-sm border border-line bg-bg p-3 text-muted">
      <Lock size={18} className="mt-0.5 shrink-0" aria-hidden />
      <p>{text}</p>
    </div>
  );
}

function PatientTile({ p }: { p: FamilyHomeRow }) {
  const { t } = useLang();
  const rows: [string, React.ReactNode][] = [
    [t("sharing"), <Badge>{t(SCOPE_KEY[p.scope as Exclude<Scope, "none">])}</Badge>],
    [t("todayStatus"), p.locked.status ? <Locked text={t("lockedStatusShort")} /> : <span className="font-mono">{p.today?.done ?? 0} / {p.today?.total ?? 0}</span>],
    [t("overdue"), p.locked.status ? "-" : <span className={`font-mono ${p.overdue ? "text-attention" : ""}`}>{p.overdue ?? 0}</span>],
    [t("openAlerts"), p.locked.alerts ? "-" : <span className={`font-mono ${p.open_alerts ? "text-attention" : ""}`}>{p.open_alerts ?? 0}</span>],
    [t("nextVisit"), p.next_event ? `${p.next_event.title}, ${fmtDate(p.next_event.due_at, { day: "numeric", month: "short" })}` : t("nothingBooked")],
  ];
  return (
    <Tile title={p.patient.name} aside={p.plans.length ? `${p.plans.length} ${t("plans")}` : undefined} className="h-full">
      <Props rows={rows} />
      {p.plans.length === 0 ? <p className="mt-2 text-sm text-muted">{t("noPlanAdded")}</p> : (
        <div className="mt-3 flex flex-wrap gap-2">
          {p.plans.map((pl) => <LinkButton key={pl.id} small look="quiet" to={`/plan/${pl.id}`}>{pl.title}</LinkButton>)}
        </div>
      )}
    </Tile>
  );
}

export function FamilyHome() {
  const { user } = useAuth();
  const { t } = useLang();
  const mt = useMotionT();
  const home = useQuery("family/home", api.familyHome);
  const alerts = useQuery("family/alerts", api.familyAlerts);
  const cal = useQuery("calendar/now", () => api.calendar("now"));
  const rise = useStagger("family-home");
  const [busy, setBusy] = useState<number | null>(null);

  const ack = async (id: number) => {
    setBusy(id);
    try {
      await api.ackAlert(id);
      toast(t("toastAck"));
      invalidate("family");
    } finally {
      setBusy(null);
    }
  };

  if (home.loading) return <div className="grid gap-3 lg:grid-cols-12" role="status" aria-label="Loading">{[3, 3, 6, 6, 6].map((c, i) => <div key={i} className={`card p-3 ${c === 3 ? "lg:col-span-3" : "lg:col-span-6"}`}><Skeleton className="h-5 w-1/3" /><Skeleton className="mt-3 h-28 w-full" /></div>)}</div>;
  if (home.error) return <p role="alert" className="text-attention">{home.error}</p>;
  const rows = home.data ?? [];
  const today = cal.data?.today ?? new Date().toISOString().slice(0, 10);
  const open = alerts.data?.filter((a) => !a.acknowledged_at).length ?? 0;
  const late = rows.reduce((n, p) => n + (p.overdue ?? 0), 0);
  const hidden = rows.some((p) => p.locked.alerts) && !alerts.data?.length;

  return (
    <div className="grid auto-rows-min gap-3 lg:grid-flow-dense lg:grid-cols-12">
      <motion.div {...rise(0)} className="lg:col-span-3 lg:row-span-2"><DateTile today={today} hello={t("myFamily")} sub={user?.role === "manager" ? t("roleManager") : t("roleFamily")} /></motion.div>
      <motion.div {...rise(1)} className="lg:col-span-3">
        <Tile title={t("calendar")} className="h-full">{cal.data ? <MiniCalendar tasks={cal.data.tasks} today={today} /> : <Skeleton className="h-44 w-full" />}</Tile>
      </motion.div>
      <motion.div {...rise(2)} className="lg:col-span-6">
        <Tile className="h-full">
          <p className="mb-3 text-sm text-muted">{t("familyIntro")} {user?.role === "manager" ? t("familyManagerCan") : t("familyViewerCan")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <IconTile icon={<CalendarBlank size={24} weight="duotone" />} label={t("calendar")} to="/calendar" />
            {user?.role === "manager" && <IconTile icon={<UsersThree size={24} weight="duotone" />} label={t("familyHub")} to="/family/hub" />}
            <Stat n={rows.length} label={t("patients")} />
            <Stat n={open} label={t("openAlerts")} warn={open > 0} />
            <Stat n={late} label={t("overdue")} warn={late > 0} />
          </div>
        </Tile>
      </motion.div>

      {home.data && rows.length === 0 && <div className="lg:col-span-9"><EmptyState title={t("nobodyShared")} text={t("nobodySharedText")} /></div>}
      {rows.map((p, i) => <motion.div key={p.patient.id} {...rise(3 + i)} className="lg:col-span-4"><PatientTile p={p} /></motion.div>)}

      <motion.div {...rise(12)} className="lg:col-span-6">
        <Tile title={t("alerts")} aside={open} className="h-full">
          {alerts.loading && <Skeleton className="h-16 w-full" />}
          {hidden && <Locked text={t("lockedAlerts")} />}
          {alerts.data && alerts.data.length === 0 && !hidden && <p className="text-muted">{t("noAlertsText")}</p>}
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {alerts.data?.slice(0, 8).map((a) => (
                <motion.li layout key={a.id} transition={mt(0.2)} className={`flex items-start justify-between gap-2 rounded-sm border px-2 py-1.5 text-sm ${a.acknowledged_at ? "border-line text-muted" : a.level === "urgent" ? "border-attention bg-attention-tint" : "border-line"}`}>
                  <span className="min-w-0"><strong>{a.patient}</strong> {a.level === "urgent" && !a.acknowledged_at && <Badge tone="solid">{t("urgent")}</Badge>}<br />{a.message}<br /><span className="font-mono text-xs text-muted">{fmtDate(a.created_at, { day: "numeric", month: "short" })}</span></span>
                  {!a.acknowledged_at && a.can_ack && <Button small look="quiet" loading={busy === a.id} onClick={() => ack(a.id)}>{t("acknowledge")}</Button>}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </Tile>
      </motion.div>

      <motion.div {...rise(13)} className="lg:col-span-3">
        <Tile title={t("activity")} className="h-full">{cal.data ? <ActivityDots tasks={cal.data.tasks} today={today} /> : <Skeleton className="h-16 w-full" />}</Tile>
      </motion.div>
    </div>
  );
}

export function FamilyHub() {
  const { t } = useLang();
  const hub = useQuery("hub", api.hub);
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim(), 250);
  const found = useQuery(q.length >= 3 ? `hub-search/${q}` : null, () => api.hubSearch(q));
  const [f, setF] = useState({ name: "", email: "", role: "family" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | "new" | null>(null);
  const [manual, setManual] = useState(false);
  const roleLabel = { manager: t("roleManager"), family: t("roleFamily"), patient: t("rolePatient") };

  const done = () => {
    toast(t("toastAdded"));
    invalidate("hub");
    invalidate("family");
    invalidate("calendar");
  };
  const addFound = async (id: number) => {
    setErr(null);
    setBusy(id);
    try {
      await api.addMember({ user_id: id });
      setSearch("");
      done();
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const addNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy("new");
    try {
      await api.addMember(f);
      setF({ name: "", email: "", role: "family" });
      done();
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-3 lg:grid-cols-12">
      <div className="lg:col-span-12"><PageHead title={hub.data?.hub?.name ?? t("familyHub")} text={t("hubIntro")} /></div>
      <Tile title={t("findPerson")} className="lg:col-span-7">
        <div className="relative">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input className="field pl-10" placeholder={t("searchPeople")} aria-label={t("findPerson")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {found.loading && q.length >= 3 && <Skeleton className="mt-3 h-10 w-full" />}
        {found.data && found.data.length === 0 && <p className="mt-3 text-muted">{t("noOneFound")}</p>}
        <ul className="rule-list mt-2">
          {found.data?.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span><strong>{p.name}</strong> <span className="font-mono text-xs text-muted">{p.email}</span> <Badge>{roleLabel[p.role as keyof typeof roleLabel]}</Badge></span>
              <Button small loading={busy === p.id} onClick={() => addFound(p.id)}>{t("addToHub")}</Button>
            </li>
          ))}
        </ul>
        {err && <p role="alert" className="mt-2 text-attention">{err}</p>}
        <p className="mt-3 text-sm">
          <button className="font-semibold text-primary hover:underline" onClick={() => setManual(!manual)} aria-expanded={manual}>{t("notFoundInvite")}</button>
        </p>
        {manual && (
          <form className="mt-3 space-y-3 border-t border-line pt-3" onSubmit={addNew}>
            <div className="grid gap-3 md:grid-cols-3">
              <Input label={t("name")} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
              <Input label={t("email")} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
              <Select label={t("role")} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
                <option value="family">{t("roleFamily")}</option>
                <option value="patient">{t("rolePatient")}</option>
                <option value="manager">{t("anotherManager")}</option>
              </Select>
            </div>
            <Button type="submit" loading={busy === "new"}>{t("addToHub")}</Button>
          </form>
        )}
      </Tile>
      <Tile title={t("inThisHub")} aside={hub.data?.members.length} className="lg:col-span-5">
        {hub.loading && <ListSkeleton rows={3} />}
        <ul className="rule-list">
          {hub.data?.members.map((m) => (
            <li key={m.member_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span><strong>{m.name}</strong><br /><span className="font-mono text-xs text-muted">{m.email}</span></span>
              <Badge>{roleLabel[m.role]}</Badge>
            </li>
          ))}
        </ul>
      </Tile>
      <p className="lg:col-span-12"><Link to="/family">{t("backToFamily")}</Link></p>
    </div>
  );
}
