import { FilePlus } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Capsule, CategoryIcon, CountUp } from "../components/Fx";
import { Link } from "react-router-dom";
import { ListSkeleton } from "../components/Skeleton";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { fmtDate, useLoad, useMotionT } from "../lib/motion";

export default function PatientHome() {
  const { user } = useAuth();
  const mt = useMotionT();
  const { data: docs, error } = useLoad(() => api.documents(), []);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Hello, {user?.name.split(" ")[0]}</h1>
          <p className="text-muted">Your discharge plans are here. Add a summary to make a new plan.</p>
        </div>
        <Link to="/patient/upload" className="btn">
          <FilePlus size={20} aria-hidden /> Add a discharge summary
        </Link>
      </header>
      {error && <p className="text-attention">Could not load your plans. {error}</p>}
      {!docs && <ListSkeleton rows={2} />}
      {docs && docs.length === 0 && (
        <div className="card flex max-w-2xl items-center gap-5 p-6">
          <Capsule size={84} />
          <div className="space-y-3">
          <h2 className="text-2xl">No plan yet</h2>
          <p className="text-muted">Paste a synthetic discharge summary, upload a PDF, or start with a sample.</p>
          <Link to="/patient/upload" className="btn w-fit">Get started</Link>
          </div>
        </div>
      )}
      <ul className="space-y-3">
        {docs?.map((d, i) => (
          <motion.li key={d.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={mt(0.3, i * 0.07)} className="card flex flex-wrap items-center justify-between gap-4 p-4">
            <CategoryIcon category="appointment" size={26} />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl">{d.title}</h2>
              <p className="text-muted">
                {d.patient_alias}. Left hospital {fmtDate(d.discharge_date)}. <CountUp to={d.items ?? 0} /> instructions
                {d.needs_review ? `, ${d.needs_review} waiting for a doctor` : ""}.
              </p>
            </div>
            <div className="flex gap-2">
              <Link to={`/plan/${d.id}`} className="btn">Open plan</Link>
              <Link to={`/plan/${d.id}/print`} className="btn btn-quiet">Fridge sheet</Link>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
