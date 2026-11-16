import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";

const cx = (...p: (string | false | null | undefined)[]) => p.filter(Boolean).join(" ");

type Look = "solid" | "quiet" | "attention";
const look: Record<Look, string> = { solid: "", quiet: "btn-quiet", attention: "btn-attention" };

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  look?: Look;
  small?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button({ look: l = "solid", small, loading, className, children, disabled, type = "button", ...rest }, ref) {
  return (
    <button ref={ref} type={type} className={cx("btn", look[l], small && "btn-sm", className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {children}
      {loading && <span className="dots" aria-hidden><i /><i /><i /></span>}
    </button>
  );
});

export function LinkButton({ look: l = "solid", small, className, ...rest }: LinkProps & { look?: Look; small?: boolean }) {
  return <Link className={cx("btn", look[l], small && "btn-sm", className)} {...rest} />;
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  hint?: string;
  showLabel?: string;
  hideLabel?: string;
}

export const Input = forwardRef<HTMLInputElement, FieldProps>(function Input({ label, error, hint, showLabel = "Show", hideLabel = "Hide", className, type, id, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  const [shown, setShown] = useState(false);
  const pw = type === "password";
  return (
    <div className="block">
      <label htmlFor={fid} className="mb-1 block text-small font-semibold text-ink">{label}</label>
      <div className="relative">
        <input ref={ref} id={fid} type={pw && shown ? "text" : type} aria-invalid={!!error} aria-describedby={error ? `${fid}-e` : hint ? `${fid}-h` : undefined}
          className={cx("field", error && "field-error", pw && "pr-16", className)} {...rest} />
        {pw && (
          <button type="button" className="absolute inset-y-0 right-0 flex items-center gap-1 px-3 text-sm font-semibold text-brand-700 hover:underline" onClick={() => setShown(!shown)} aria-pressed={shown}>
            {shown ? <><EyeOff size={16} className="inline" aria-hidden />{hideLabel}</> : <><Eye size={16} className="inline" aria-hidden />{showLabel}</>}
          </button>
        )}
      </div>
      {error ? <p id={`${fid}-e`} role="alert" className="mt-1 text-sm text-attention">{error}</p> : hint ? <p id={`${fid}-h`} className="mt-1 text-sm text-muted">{hint}</p> : null}
    </div>
  );
});

export function Select({ label, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId();
  return (
    <div className="block">
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-ink">{label}</label>
      <select id={id} className={cx("field", className)} {...rest}>{children}</select>
    </div>
  );
}

export function Textarea({ label, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const id = useId();
  return (
    <div className="block">
      <label htmlFor={id} className="mb-1 block font-semibold text-ink">{label}</label>
      <textarea id={id} className={cx("field", className)} {...rest} />
    </div>
  );
}

export function Card({ as: Tag = "div", className, children, ...rest }: { as?: "div" | "section" | "li" | "article"; className?: string; children: ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return <Tag className={cx("card", className)} {...(rest as object)}>{children}</Tag>;
}

type Tone = "plain" | "good" | "warn" | "solid" | "mark";
const tone: Record<Tone, string> = {
  plain: "border-line text-muted",
  good: "border-accent/30 bg-green-50 text-green-700",
  warn: "border-amber-300 bg-amber-50 text-amber-700",
  solid: "border-attention bg-attention text-white",
  mark: "border-brand-500 text-brand-700",
};

export function Badge({ tone: t = "plain", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold", tone[t], className)}>{children}</span>;
}

export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center">
      {icon && <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-700">{icon}</div>}
      <h2 className="text-h2">{title}</h2>
      {text && <p className="measure text-muted">{text}</p>}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function PlanSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading">
      <div className="space-y-3">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
      </div>
      {[0, 1].map((s) => (
        <div key={s} className="space-y-3">
          <Skeleton className="h-7 w-40" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-4 space-y-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div className="space-y-3" role="status" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card space-y-2 p-4">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Loading">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card space-y-2 p-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-4 w-2/3" /></div>
      ))}
    </div>
  );
}

export function PageHead({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        <h1 className="text-h1">{title}</h1>
        {text && <p className="mt-2 text-muted">{text}</p>}
      </div>
      {children}
    </header>
  );
}

export function Pager({ offset, limit, total, onPage, labels }: { offset: number; limit: number; total: number; onPage: (offset: number) => void; labels: { prev: string; next: string; of: string } }) {
  if (total <= limit) return null;
  return (
    <nav className="flex flex-wrap items-center justify-between gap-2 pt-2" aria-label="Pages">
      <span className="text-sm text-muted tnum">{offset + 1} to {Math.min(offset + limit, total)} {labels.of} {total}</span>
      <span className="flex gap-2">
        <Button small look="quiet" disabled={offset === 0} onClick={() => onPage(Math.max(0, offset - limit))}>{labels.prev}</Button>
        <Button small look="quiet" disabled={offset + limit >= total} onClick={() => onPage(offset + limit)}>{labels.next}</Button>
      </span>
    </nav>
  );
}
