import { Bell, List, SignOut, X, type Icon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { ROLE_LABEL, useAuth } from "../lib/auth";
import { HOSPITAL, HOSPITAL_FULL, PRODUCT } from "../lib/brand";
import { useMotionT } from "../lib/motion";
import type { Notice, Role } from "../lib/types";
import { Logo } from "./Icons";
import { LangToggle } from "./LangToggle";

const link = "tab-press relative whitespace-nowrap rounded-sm px-2.5 py-1.5 text-ink hover:underline aria-[current=page]:font-semibold aria-[current=page]:text-primary";

const NAV: Partial<Record<Role, { to: string; label: string }[]>> = {
  patient: [
    { to: "/patient", label: "My plans" },
    { to: "/patient/upload", label: "Add summary" },
    { to: "/patient/sharing", label: "Sharing" },
    { to: "/providers", label: "Providers" },
  ],
  manager: [
    { to: "/family", label: "My family" },
    { to: "/family/hub", label: "Hub" },
  ],
  family: [{ to: "/family", label: "My family" }],
};

const SITE_LINKS = [
  { href: "/#process", label: "How it works" },
  { href: "/#people", label: "Who it is for" },
  { href: "/#safety", label: "Safety" },
  { href: "/#faq", label: "Questions" },
];

export function BellMenu({ dark = false }: { dark?: boolean }) {
  const [list, setList] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const load = () => api.notifications().then(setList).catch(() => undefined);
  useEffect(() => {
    load();
    const id = window.setInterval(load, 20000);
    window.addEventListener("cb-plan-refresh", load);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("cb-plan-refresh", load);
    };
  }, []);
  const unread = list.filter((n) => !n.read).length;
  return (
    <div className="relative">
      <button
        className={`btn btn-sm ${dark ? "btn-ghost-dark" : "btn-quiet"}`}
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          if (!open && unread) api.readNotifications().then(load);
        }}
      >
        <motion.span key={unread} initial={{ rotate: -18 }} animate={{ rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 8 }} className="inline-flex">
          <Bell size={18} weight="duotone" aria-hidden />
        </motion.span>
        {unread > 0 && <span className="font-bold text-attention">{unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 z-30 mt-1 max-h-96 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-md border border-line bg-surface p-2 text-ink">
            {list.length === 0 && <p className="p-2 text-muted">Nothing yet.</p>}
            <ul className="space-y-1">
              {list.map((n) => (
                <li key={n.id} className={`rounded-sm p-2 text-sm ${n.level !== "info" ? "bg-attention-tint" : "bg-bg"}`}>
                  {n.message}
                  <span className="block text-xs text-muted">{new Date(n.created_at).toLocaleString("en-IN")}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Website style header for the patient and hub site. Public links before sign in, app links after. */
export function Header() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [menu, setMenu] = useState(false);
  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 140, damping: 28 });
  useEffect(() => setMenu(false), [loc.pathname, loc.hash]);
  const items = user ? NAV[user.role] ?? [] : [];
  return (
    <header className="no-print sticky top-0 z-20 border-b border-line bg-surface">
      <motion.div className="absolute inset-x-0 bottom-[-1px] h-[3px] origin-left bg-secondary" style={{ scaleX: bar }} aria-hidden />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
        <Link to={user ? (user.role === "patient" ? "/patient" : "/family") : "/"} className="flex min-w-0 items-center gap-2 text-ink no-underline hover:no-underline">
          <Logo size={32} />
          <span className="min-w-0 leading-tight">
            <span className="block font-heading text-xl font-semibold">{PRODUCT}</span>
            <span className="block truncate text-xs text-muted">by {HOSPITAL_FULL}</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {user
            ? items.map((n) => <NavLink key={n.to} to={n.to} end className={link}>{n.label}</NavLink>)
            : SITE_LINKS.map((n) => <a key={n.href} href={n.href} className={link.replace("aria-[current=page]:font-semibold aria-[current=page]:text-primary", "")}>{n.label}</a>)}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {user && <LangToggle compact />}
          {user ? (
            <>
              <BellMenu />
              <span className="whitespace-nowrap text-sm leading-tight"><strong>{user.name}</strong><span className="block text-xs text-muted">{ROLE_LABEL[user.role]}</span></span>
              <button className="btn btn-quiet btn-sm whitespace-nowrap" onClick={() => { signOut(); nav("/"); }}><SignOut size={16} aria-hidden /> Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-quiet btn-sm">Sign in</Link>
              <Link to="/register" className="btn btn-sm">Create account</Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          {user && <BellMenu />}
          <button className="btn btn-quiet btn-sm" aria-expanded={menu} aria-label="Menu" onClick={() => setMenu(!menu)}>
            {menu ? <X size={20} aria-hidden /> : <List size={20} aria-hidden />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {menu && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-line lg:hidden">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3">
              {user ? (
                <>
                  {items.map((n) => <NavLink key={n.to} to={n.to} end className={link}>{n.label}</NavLink>)}
                  <div className="flex flex-wrap items-center gap-2 py-2"><LangToggle compact /></div>
                  <button className="btn btn-quiet btn-sm w-fit" onClick={() => { signOut(); nav("/"); }}><SignOut size={16} aria-hidden /> Sign out ({user.name})</button>
                </>
              ) : (
                <>
                  {SITE_LINKS.map((n) => <a key={n.href} href={n.href} className="px-2.5 py-2">{n.label}</a>)}
                  <div className="flex gap-2 py-2"><Link to="/login" className="btn btn-quiet btn-sm">Sign in</Link><Link to="/register" className="btn btn-sm">Create account</Link></div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="no-print mt-20 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 md:grid-cols-[1.4fr_1fr]">
        <div className="max-w-xl space-y-2">
          <p className="font-heading text-xl">{PRODUCT} <span className="text-muted">by {HOSPITAL_FULL}</span></p>
          <p className="text-muted">
            This tool organizes your discharge instructions. It does not give medical advice. Ask your doctor about anything unclear.
          </p>
          <p className="text-sm text-muted">{HOSPITAL} Hospital owns and runs this service. Its doctors and staff are added by the hospital's management team. All data in this demo is synthetic.</p>
        </div>
        <nav className="flex flex-col gap-1 md:items-end" aria-label="Legal">
          <Link to="/terms">Terms of Use</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/safety">Safety &amp; Limitations</Link>
        </nav>
      </div>
    </footer>
  );
}

export interface StaffNavItem { to: string; label: string; Icon: Icon; end?: boolean }

/** Sidebar shell used by the doctor workspace and the management console. */
export function StaffShell({ variant, title, nav, extra }: { variant: "doctor" | "admin"; title: string; nav: StaffNavItem[]; extra?: ReactNode }) {
  const { user, signOut } = useAuth();
  const go = useNavigate();
  const loc = useLocation();
  const mt = useMotionT();
  const dark = variant === "admin";
  const side = dark ? "bg-ink text-surface" : "bg-primary text-surface";
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className={`no-print flex shrink-0 flex-col gap-3 p-4 md:sticky md:top-0 md:h-screen md:w-64 ${side}`}>
        <div className="flex items-center gap-2">
          <Logo size={34} />
          <div className="leading-tight">
            <p className="font-heading text-lg">{HOSPITAL}</p>
            <p className="text-xs opacity-80">{title}</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible" aria-label={title}>
          {nav.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="side-link tab-press relative whitespace-nowrap rounded-sm px-3 py-2">
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId={`side-${variant}`} className="absolute inset-0 rounded-sm" style={{ background: "rgba(246,252,250,0.22)" }} transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                  <span className="relative flex items-center gap-2 font-semibold" style={{ color: "var(--surface)" }}><Icon size={20} weight="duotone" aria-hidden /> {label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden space-y-2 md:block">
          {extra}
          <div className="flex items-center justify-between gap-2 pt-3" style={{ borderTop: "1px solid rgba(246,252,250,0.28)" }}>
            <span className="min-w-0 text-sm leading-tight"><strong className="block truncate">{user?.name}</strong><span className="text-xs opacity-80">{user ? ROLE_LABEL[user.role] : ""}</span></span>
            <BellMenu dark />
          </div>
          <button className="btn btn-sm btn-ghost-dark w-full justify-center" onClick={() => { signOut(); go("/login"); }}><SignOut size={16} aria-hidden /> Sign out</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-5 py-8 md:px-10">
        <div className="mb-4 flex items-center justify-between gap-3 md:hidden no-print">
          <span className="text-sm">{user?.name}</span>
          <button className="btn btn-quiet btn-sm" onClick={() => { signOut(); go("/login"); }}><SignOut size={16} aria-hidden /> Sign out</button>
        </div>
        <motion.div key={loc.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={mt(0.25)} className="mx-auto max-w-5xl">
          <Outlet />
        </motion.div>
        <p className="mx-auto mt-12 max-w-5xl text-xs text-muted">{HOSPITAL_FULL} staff workspace. Synthetic data only. This tool organizes instructions and gives no medical advice.</p>
      </main>
    </div>
  );
}
