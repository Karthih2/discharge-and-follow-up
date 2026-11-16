import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useLang } from "../lib/lang";

const STYLE: Record<string, string> = {
  Pending: "border-line bg-gray-50 text-muted",
  Completed: "border-accent/30 bg-green-50 text-green-700",
  "Needs Review": "border-amber-300 bg-amber-50 text-amber-700",
};

const KEY = { Pending: "statusPending", Completed: "statusCompleted", "Needs Review": "statusNeedsReview" } as const;

export function StatusBadge({ status }: { status: "Pending" | "Completed" | "Needs Review" }) {
  const { t } = useLang();
  const Icon = status === "Completed" ? CheckCircle2 : status === "Needs Review" ? AlertCircle : Clock;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-semibold ${STYLE[status]}`}>
      <Icon size={14} aria-hidden />
      {t(KEY[status])}
    </span>
  );
}
