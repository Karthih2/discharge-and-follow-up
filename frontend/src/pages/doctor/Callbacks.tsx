import { PhoneCall } from "@phosphor-icons/react";
import { ListSkeleton } from "../../components/Skeleton";
import { api } from "../../lib/api";
import { useLoad } from "../../lib/motion";

export default function DoctorCallbacks() {
  const cbs = useLoad(() => api.callbacks(), []);
  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <h1 className="text-4xl">Callbacks</h1>
        <p className="mt-2 text-muted">Patients who asked about an item you review. Management runs the masked call. Only invented numbers are used and no real call is made.</p>
      </header>
      {!cbs.data && <ListSkeleton rows={3} />}
      {cbs.data?.length === 0 && <p className="card p-6 text-muted">No callback requests.</p>}
      <ul className="space-y-2">
        {cbs.data?.map((c) => (
          <li key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <span className="flex min-w-0 items-center gap-3">
              <PhoneCall size={26} weight="duotone" className="shrink-0 text-primary" aria-hidden />
              <span><strong>{c.patient_alias}</strong> asked about {c.item_title}.<span className="block font-mono text-sm text-muted">{c.masked_number}</span></span>
            </span>
            <span className="rounded-sm border border-line px-2 text-sm text-muted">{c.state}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
