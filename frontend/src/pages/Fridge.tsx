import { Printer } from "@phosphor-icons/react";
import { QRCodeSVG } from "qrcode.react";
import { Link, useParams } from "react-router-dom";
import { CalendarIcon, Logo, SLOT_ICON } from "../components/Icons";
import { LangToggle } from "../components/LangToggle";
import { Skeleton } from "../components/Skeleton";
import { api } from "../lib/api";
import { useLang } from "../lib/lang";
import { fmtDate, useLoad } from "../lib/motion";

const SLOTS = ["morning", "afternoon", "night"] as const;

function Dot() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-label="Take" role="img">
      <circle cx="9" cy="9" r="7" fill="var(--primary)" />
    </svg>
  );
}

export default function Fridge() {
  const id = Number(useParams().id);
  const { lang, t } = useLang();
  const { data: plan, error } = useLoad(() => api.plan(id, lang), [id, lang]);

  if (error) return <p className="text-attention">Could not load this plan.</p>;
  if (!plan)
    return (
      <div className="sheet space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );

  const meds = plan.items.filter((i) => i.category === "medication" && !i.safe_message && i.time_of_day);
  const held = plan.items.filter((i) => i.status === "Needs Review" && i.category !== "warning_sign");
  const upcoming = plan.items
    .filter((i) => ["appointment", "test", "referral", "rehab", "wound_care"].includes(i.category) && i.date_resolved && !i.safe_message)
    .sort((a, b) => a.date_resolved!.localeCompare(b.date_resolved!))
    .slice(0, 6);
  const warnings = plan.items.filter((i) => i.category === "warning_sign");
  const url = `${window.location.origin}/plan/${id}`;

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link to={`/plan/${id}`}>Back to the plan</Link>
        <div className="flex flex-wrap items-center gap-3">
          <LangToggle />
          <button className="btn" onClick={() => window.print()}>
            <Printer size={20} aria-hidden /> {t("printSave")}
          </button>
        </div>
      </div>

      <article className="sheet lang-text flex flex-col gap-4" aria-label={t("fridgeSheet")}>
        <header className="flex items-center justify-between gap-4 border-b border-line pb-3">
          <div>
            <h1 className="text-3xl">{t("planTitle")}</h1>
            <p className="text-muted">
              {plan.document.patient_alias}. {t("discharged")} {fmtDate(plan.document.discharge_date)}.
            </p>
          </div>
          <div className="flex items-center gap-2 text-muted">
            <Logo size={24} /> <span className="font-heading text-lg">CareBridge</span>
          </div>
        </header>

        <section aria-label={t("medicines")}>
          <h2 className="mb-1 text-xl">{t("medicines")}</h2>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="py-1 pr-2 font-semibold"> </th>
                {SLOTS.map((s) => {
                  const Icon = SLOT_ICON[s];
                  return (
                    <th key={s} className="w-24 py-1 text-center font-semibold text-primary">
                      <Icon size={30} className="mx-auto" />
                      {t(s)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {meds.map((m) => (
                <tr key={m.id} className="border-b border-line">
                  <td className="py-1.5 pr-2 font-semibold">{m.title}</td>
                  {SLOTS.map((s) => (
                    <td key={s} className="text-center">
                      {(m.time_of_day ?? "").includes(s) ? <span className="inline-block"><Dot /></span> : null}
                    </td>
                  ))}
                </tr>
              ))}
              {meds.length === 0 && (
                <tr>
                  <td className="py-2 text-muted" colSpan={4}>{t("careTeamConfirm")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section aria-label={t("upcoming")}>
          <h2 className="mb-1 text-xl">{t("upcoming")}</h2>
          <ul className="space-y-1">
            {upcoming.map((u) => (
              <li key={u.id} className="flex items-center gap-3">
                <CalendarIcon size={22} className="shrink-0 text-primary" />
                <span className="w-24 shrink-0 font-semibold">{fmtDate(u.date_resolved!, { day: "numeric", month: "short" })}</span>
                <span>{u.title}</span>
              </li>
            ))}
            {held.slice(0, 4).map((h) => (
              <li key={h.id} className="flex items-center gap-3 text-attention">
                <CalendarIcon size={22} className="shrink-0" />
                <span>{h.title}. {t("careTeamConfirm")}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label={t("warningSigns")} className="rounded-md border-2 border-attention p-3">
          <h2 className="text-xl text-attention">{t("warningIntro")}</h2>
          <ul className="mt-1 list-disc space-y-0.5 pl-6">
            {warnings.map((w) => (
              <li key={w.id}>{w.simple_text ?? w.original_text}</li>
            ))}
          </ul>
        </section>

        <footer className="mt-auto flex items-end justify-between gap-4 border-t border-line pt-3">
          <p className="font-heading text-3xl text-attention">{t("emergency")}</p>
          <div className="flex items-center gap-3">
            <p className="max-w-[9rem] text-right text-sm text-muted">{t("scanQr")}</p>
            <QRCodeSVG value={url} size={92} bgColor="#F6FCFA" fgColor="#0B2E2D" />
          </div>
        </footer>
      </article>
    </div>
  );
}
