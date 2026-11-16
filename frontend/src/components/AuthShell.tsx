import { ArrowLeft, Eye, EyeOff, Lock, Mail, User, type LucideIcon } from "lucide-react";
import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useLang } from "../lib/lang";
import { PRODUCT } from "../lib/brand";
import { Logo } from "./Icons";
import "../styles/auth.css";

/**
 * The sign in screens: one rounded split panel over a blurred pointillist countryside.
 * Left, the painted family; right, a quiet ivory form. Nothing else on the page.
 */
export function AuthShell({ title, subtitle, tabs = true, back = "/", children }: { title: string; subtitle: string; tabs?: boolean; back?: string | null; children: ReactNode }) {
  const { t } = useLang();
  return (
    <div className="au-page">
      <div className="au-panel">
        <figure className="au-art">
          <img src="/art/care-family-pointillist.webp" alt="A grandfather resting outside the hospital, smiling with his daughter and granddaughter" width={732} height={706} />
        </figure>
        <section className="au-form" aria-labelledby="au-title">
          {back !== null && (
            back.startsWith("/") && !back.startsWith("/doctor") && !back.startsWith("/management")
              ? <Link to={back} className="au-back"><ArrowLeft size={18} aria-hidden /> {t("back")}</Link>
              : <a href={back} className="au-back"><ArrowLeft size={18} aria-hidden /> {t("back")}</a>
          )}
          <div className="au-inner">
            <p className="au-brand"><Logo size={30} /> <span>{PRODUCT}</span></p>
            <h1 id="au-title" className="au-title">{title}</h1>
            <p className="au-sub">{subtitle}</p>
            {tabs && (
              <nav className="au-tabs" aria-label={`${t("tabLogin")} / ${t("tabSignUp")}`}>
                <NavLink to="/login" replace>{t("tabLogin")}</NavLink>
                <NavLink to="/register" replace>{t("tabSignUp")}</NavLink>
              </nav>
            )}
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: "mail" | "lock" | "user";
  error?: string | null;
}
const ICONS: Record<FieldProps["icon"], LucideIcon> = { mail: Mail, lock: Lock, user: User };

/** Input with a leading icon. The label is visually hidden; the placeholder repeats it. Passwords get a show/hide toggle. */
export const AuthField = forwardRef<HTMLInputElement, FieldProps>(function AuthField({ label, icon, error, type, id, ...rest }, ref) {
  const { t } = useLang();
  const auto = useId();
  const fid = id ?? auto;
  const [shown, setShown] = useState(false);
  const pw = type === "password";
  const Icon = ICONS[icon];
  return (
    <div>
      <label htmlFor={fid} className="sr-only">{label}</label>
      <div className={`au-field ${error ? "is-error" : ""}`}>
        <Icon size={19} className="au-field-ic" aria-hidden />
        <input ref={ref} id={fid} type={pw && shown ? "text" : type} placeholder={label} aria-invalid={!!error} aria-describedby={error ? `${fid}-e` : undefined} {...rest} />
        {pw && (
          <button type="button" className="au-eye" onClick={() => setShown(!shown)} aria-pressed={shown} aria-label={shown ? t("hide") : t("show")}>
            {shown ? <EyeOff size={19} aria-hidden /> : <Eye size={19} aria-hidden />}
          </button>
        )}
      </div>
      {error && <p id={`${fid}-e`} role="alert" className="mt-1.5 text-sm text-attention">{error}</p>}
    </div>
  );
});
