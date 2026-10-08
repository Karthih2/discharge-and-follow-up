import { CheckCircle, Clock, WarningCircle } from "@phosphor-icons/react";
import { useLang } from "../lib/lang";

const STYLE: Record<string, string> = {
  Pending: "border-line text-muted",
  Completed: "border-secondary bg-secondary text-ink",
  "Needs Review": "border-attention bg-attention-tint text-attention",
};

const KEY = { Pending: "statusPending", Completed: "statusCompleted", "Needs Review": "statusNeedsReview" } as const;

export function StatusBadge({ status }: { status: "Pending" | "Completed" | "Needs Review" }) {
  const { t } = useLang();
  const Icon = status === "Completed" ? CheckCircle : status === "Needs Review" ? WarningCircle : Clock;
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-sm font-semibold ${STYLE[status]}`}>
      <Icon size={15} weight="bold" aria-hidden />
      {t(KEY[status])}
    </span>
  );
}
