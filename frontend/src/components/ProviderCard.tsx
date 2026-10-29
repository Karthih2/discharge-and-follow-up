import type { Icon as PhIcon } from "@phosphor-icons/react";
import { FirstAid, Flask, Heartbeat, Horse, House, Phone, Pill, MapPin } from "@phosphor-icons/react";
import type { Provider } from "../lib/types";
import { Card } from ".//ui";

export const TYPE_LABEL: Record<string, string> = {
  hospital: "Hospital",
  clinic: "Clinic",
  lab: "Lab",
  pharmacy: "Pharmacy",
  physio: "Physiotherapy",
  home_care: "Home care",
};
const TYPE_ICON: Record<string, PhIcon> = {
  hospital: FirstAid,
  clinic: Heartbeat,
  lab: Flask,
  pharmacy: Pill,
  physio: Horse,
  home_care: House,
};
const TYPE_COLOR: Record<string, string> = {
  hospital: "bg-attention/10 text-attention border-attention/20",
  clinic: "bg-primary/10 text-primary border-primary/20",
  lab: "bg-ink/8 text-ink border-ink/15",
  pharmacy: "bg-secondary/20 text-ink border-secondary/30",
  physio: "bg-primary/10 text-primary border-primary/20",
  home_care: "bg-secondary/20 text-ink border-secondary/30",
};
const LANG_LABEL: Record<string, string> = { en: "English", ta: "Tamil", hi: "Hindi", kn: "Kannada", te: "Telugu", ml: "Malayalam" };

export function ProviderCard({ p, reasons, rank, compact }: { p: Provider; reasons?: string[]; rank?: number; compact?: boolean }) {
  const Icon = TYPE_ICON[p.type] ?? FirstAid;
  const colors = TYPE_COLOR[p.type] ?? "bg-primary/10 text-primary border-primary/20";

  return (
    <Card className={`provider-card ${compact ? "p-3" : "p-4"} transition-shadow hover:shadow-md`}>
      <div className="flex items-start gap-3">
        <span className={`provider-type-icon mt-0.5 flex shrink-0 items-center justify-center rounded-[10px] border ${colors} ${compact ? "h-9 w-9" : "h-10 w-10"}`}>
          <Icon size={compact ? 18 : 20} weight="duotone" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-1">
            <h4 className={compact ? "text-base font-semibold" : "text-lg font-semibold"}>
              {rank ? <span className="mr-1.5 text-muted font-normal">{rank}.</span> : null}
              {p.name}
            </h4>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${colors}`}>
              {TYPE_LABEL[p.type] ?? p.type}
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
            <MapPin size={14} weight="bold" aria-hidden className="shrink-0" />
            {p.city} {p.pincode} · {p.open_days}
          </p>
          {!compact && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.specialties.slice(0, 4).map((s) => (
                <span key={s} className="rounded-md bg-bg px-2 py-0.5 text-xs text-muted">{s}</span>
              ))}
              {p.specialties.length > 4 && <span className="text-xs text-muted">+{p.specialties.length - 4}</span>}
            </div>
          )}
          {!compact && (
            <p className="mt-1 text-xs text-muted">
              {p.languages.map((l) => LANG_LABEL[l] ?? l).join(", ")}
            </p>
          )}
          {reasons && reasons.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-sm">
              {reasons.map((r) => (
                <li key={r} className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {r}
                </li>
              ))}
            </ul>
          )}
          <a href={`tel:${p.phone}`} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary no-underline hover:underline">
            <Phone size={16} weight="fill" aria-hidden /> {p.phone}
          </a>
          {p.synthetic && <span className="ml-2 text-xs text-muted">(demo)</span>}
        </div>
      </div>
    </Card>
  );
}
