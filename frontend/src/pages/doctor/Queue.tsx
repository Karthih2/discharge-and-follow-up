import { Pulse } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { AuditTable } from "../../components/AuditTable";
import { CountUp } from "../../components/Fx";
import { ReviewCard } from "../../components/ReviewCard";
import { ListSkeleton } from "../../components/Skeleton";
import { api } from "../../lib/api";
import { useLoad } from "../../lib/motion";

export default function DoctorQueue() {
  const [show, setShow] = useState<"open" | "all">("open");
  const [docFilter, setDocFilter] = useState<number | undefined>();
  const me = useLoad(() => api.doctorMe(), []);
  const queue = useLoad(() => api.review(docFilter, show), [show, docFilter]);
  const audit = useLoad(() => (docFilter ? api.audit(docFilter) : Promise.resolve(null)), [docFilter]);
  const plans = Array.from(new Map((queue.data ?? []).map((r) => [r.document_id, r.patient_alias])));
  const open = (queue.data ?? []).filter((r) => r.state === "open");

  const toggle = async () => {
    await api.setAvailability(!me.data!.available);
    me.reload();
    queue.reload();
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-4xl">Review queue</h1>
          <p className="mt-2 text-muted">Oldest first. Check each item against the source line, then confirm, correct or remove it. The system never decides for you.</p>
        </div>
        {me.data && (
          <div className="card flex items-center gap-3 p-3">
            <span className="relative inline-flex">
              {me.data.available && <span className="pulse-ring absolute inset-0 rounded-full bg-secondary" aria-hidden />}
              <Pulse size={28} weight="duotone" className={`relative ${me.data.available ? "text-primary" : "text-muted"}`} aria-hidden />
            </span>
            <div className="leading-tight"><p className="font-semibold">{me.data.name}</p><p className="text-sm text-muted">{me.data.specialty}</p></div>
            <button className={`btn btn-sm ${me.data.available ? "" : "btn-attention"}`} onClick={toggle} aria-pressed={me.data.available}>
              {me.data.available ? "Available" : "Unavailable"}
            </button>
          </div>
        )}
      </header>
      {me.data && !me.data.available && (
        <p className="rounded-sm border border-attention bg-attention-tint p-3 text-attention">You are unavailable. Your open items moved to their backup reviewers.</p>
      )}

      <p className="border-y border-line py-4 text-lg tnum">
        <strong className="font-heading text-3xl"><CountUp to={open.length} /></strong> waiting for you
        {open.some((r) => r.severity === "high") && <span className="text-attention">, <CountUp to={open.filter((r) => r.severity === "high").length} /> high severity</span>}
        {open.length > 0 && <span className="text-muted">. Oldest has waited {Math.max(...open.map((r) => r.age_hours)).toFixed(0)} h.</span>}
      </p>

      <section aria-labelledby="h-q" className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="h-q" className="text-2xl">Items</h2>
          <select className="field w-auto max-w-full" aria-label="Filter by plan" value={docFilter ?? ""} onChange={(e) => setDocFilter(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">All plans</option>
            {plans.map(([id, alias]) => <option key={id} value={id}>#{id} {alias}</option>)}
          </select>
          <button className="btn btn-quiet btn-sm" onClick={() => setShow(show === "open" ? "all" : "open")}>{show === "open" ? "Show resolved too" : "Hide resolved"}</button>
        </div>
        {queue.error && <p className="text-attention">{queue.error}</p>}
        {!queue.data && <ListSkeleton />}
        {queue.data?.length === 0 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-6 text-muted">Nothing is waiting for you.</motion.p>
        )}
        <ul className="space-y-4">
          <AnimatePresence initial={false}>
            {queue.data?.map((r) => <ReviewCard key={r.id} r={r} onDone={queue.reload} />)}
          </AnimatePresence>
        </ul>
      </section>

      {docFilter && audit.data && (
        <section aria-labelledby="h-au" className="space-y-3">
          <h2 id="h-au" className="text-2xl">Audit log for plan #{docFilter}</h2>
          <AuditTable rows={audit.data} />
        </section>
      )}
    </div>
  );
}
