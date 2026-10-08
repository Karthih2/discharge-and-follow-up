import { Phone } from "@phosphor-icons/react";
import type { Provider } from "../lib/types";

export const TYPE_LABEL: Record<string, string> = {
  hospital: "Hospital",
  clinic: "Clinic",
  lab: "Lab",
  pharmacy: "Pharmacy",
  physio: "Physiotherapy",
  home_care: "Home care",
};
const LANG_LABEL: Record<string, string> = { en: "English", ta: "Tamil", hi: "Hindi" };

export function ProviderCard({ p, reasons, rank }: { p: Provider; reasons?: string[]; rank?: number }) {
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-lg">
          {rank ? <span className="mr-2 text-muted">{rank}.</span> : null}
          {p.name}
        </h4>
        <span className="rounded-sm border border-line px-2 text-sm text-muted">{TYPE_LABEL[p.type] ?? p.type}</span>
      </div>
      <p className="text-muted">
        {p.city} {p.pincode}. Open {p.open_days}. {p.languages.map((l) => LANG_LABEL[l] ?? l).join(", ")}.
      </p>
      <p className="text-sm text-muted">{p.specialties.join(", ")}</p>
      {reasons && reasons.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-[0.95rem]">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      <p className="mt-2 flex items-center gap-2 font-semibold">
        <Phone size={18} aria-hidden /> {p.phone}
        <span className="ml-1 rounded-sm bg-bg px-1.5 text-xs font-normal text-muted">invented number</span>
      </p>
    </div>
  );
}
