import { Bell, CalendarDays, ClipboardList, FilePlus, Home, LogOut, MapPin, MoreHorizontal, Printer, Share2, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { AnimatePresence, m as motion } from "motion/react";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { ROLE_LABEL, useAuth } from "../lib/auth";
import { useLang } from "../lib/lang";
import type { StringKey } from "../i18n/strings";
import { HOSPITAL, HOSPITAL_FULL, PRODUCT } from "../lib/brand";
import { useQuery } from "../lib/query";
import { useMotionT } from "../lib/motion";
import type { Notice, Role } from "../lib/types";
import { Logo } from "./Icons";
import { Button, LinkButton, ListSkeleton } from "./ui";
import { LangToggle } from "./LangToggle";

const link = "relative whitespace-nowrap rounded-input px-3 py-2 text-[0.9375rem] font-medium text-text hover:bg-brand-50 hover:text-ink hover:no-underline aria-[current=page]:bg-brand-50 aria-[current=page]:text-brand-700 aria-[current=page]:font-semibold";

interface NavItem { to: string; label: StringKey; Icon: LucideIcon; end?: boolean }

/** Patients get five places. Everything used less often sits under More. */
function useNav(role: Role | undefined, planId: number | undefined): { main: NavItem[]; more: NavItem[] } {
  if (role === "patient") {
    return {
      main: [
        { to: "/patient", label: "navHome", Icon: Home, end: true },
        { to: "/calendar", label: "calendar", Icon: CalendarDays },
        { to: planId ? `/plan/${planId}` : "/patient/upload", label: "navPlan", Icon: ClipboardList },
        { to: "/providers", label: "navProviders", Icon: MapPin },
      ],
      more: [
        { to: "/patient/upload", label: "navAdd", Icon: FilePlus },
        { to: "/patient/sharing", label: "sharing", Icon: Share2 },
        ...(planId ? [{ to: `/plan/${planId}/print`, label: "fridgeSheet" as StringKey, Icon: Printer }] : []),
        { to: "/safety", label: "legalLinks", Icon: ShieldCheck },
      ],
    };
  }
  if (role === "manager") {
    return {
      main: [
        { to: "/family", label: "myFamily", Icon: Home, end: true },
        { to: "/calendar", label: "calendar", Icon: CalendarDays },
        { to: "/family/hub", label: "familyHub", Icon: Users },
      ],
      more: [{ to: "/safety", label: "legalLinks", Icon: ShieldCheck }],
    };
  }
  if (role === "family") {
    return {
      main: [
        { to: "/family", label: "myFamily", Icon: Home, end: true },
        { to: "/calendar", label: "calendar", Icon: CalendarDays },
      ],
      more: [{ to: "/safety", label: "legalLinks", Icon: ShieldCheck }],
    };
  }
  return { main: [], more: [] };
}

function usePlanId(role: Role | undefined) {
  const docs = useQuery(role === "patient" ? "documents" : null, api.documents);
  return docs.data?.[0]?.id;
}

/** A small menu that closes on outside click and Escape. */
function Menu({ label, children, align = "right", button }: { label: string; children: ReactNode; align?: "left" | "right"; button: ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", off);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button type="button" className={link} aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen(!open)}>{button}</button>
      <AnimatePresence>
        {open && (
          <motion.div role="menu" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }}
            className={`absolute ${align === "right" ? "right-0" : "left-0"} z-40 mt-2 w-64 rounded-card border border-line bg-surface p-1.5 shadow-popover`}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const menuItem = "flex w-full items-center gap-2.5 rounded-input px-3 py-2 text-left text-[0.9375rem] text-ink hover:bg-brand-50 hover:no-underline";

function BellMenu({ dark = false }: { dark?: boolean }) {
  const [list, setList] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  let failed = 0;
  const load = () => {
    if (document.hidden || failed >= 3) return;
    api.notifications().then((l) => { failed = 0; setList(l); }).catch(() => { failed++; });
  };
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
          <Bell size={18} aria-hidden />
        </motion.span>
        {unread > 0 && <span className="font-bold text-attention">{unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="absolute right-0 z-30 mt-1 max-h-96 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-card border border-line bg-surface p-2 shadow-popover text-ink">
            {list.length === 0 && <p className="p-2 text-muted">Nothing yet.</p>}
            <ul className="space-y-1">
              {list.map((n) => (
                <li key={n.id} className={`rounded-lg p-2 text-sm transition-colors ${n.level !== "info" ? "bg-red-50" : "bg-canvas hover:bg-gray-50"}`}>
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

export function Header() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const { t } = useLang();
  const planId = usePlanId(user?.role);
  const { main, more } = useNav(user?.role, planId);
  const home = user ? (user.role === "patient" ? "/patient" : "/family") : "/";
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-wide items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-10">
        <Link to={home} className="flex min-w-0 items-center gap-2.5 text-ink no-underline hover:no-underline">
          <Logo size={30} />
          <span className="min-w-0 leading-tight">
            <span className="block text-[1.05rem] font-semibold">{PRODUCT}</span>
            <span className="hidden truncate text-xs text-muted sm:block">{HOSPITAL_FULL}</span>
          </span>
        </Link>
        {user && (
          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main">
            {main.map((n) => (
              <NavLink key={n.label} to={n.to} end={n.end} className={link}>
                <span className="inline-flex items-center gap-2"><n.Icon size={17} aria-hidden /> {t(n.label)}</span>
              </NavLink>
            ))}
            {more.length > 0 && (
              <Menu label={t("more")} button={<span className="inline-flex items-center gap-1.5"><MoreHorizontal size={17} aria-hidden /> {t("more")}</span>}>
                {more.map((n) => <NavLink key={n.label} to={n.to} role="menuitem" className={menuItem}><n.Icon size={17} className="text-brand-700" aria-hidden /> {t(n.label)}</NavLink>)}
              </Menu>
            )}
          </nav>
        )}
        <div className="flex items-center gap-1.5">
          {user ? (
            <>
              <BellMenu />
              <Menu label={user.name} button={<span className="inline-flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">{user.name.slice(0, 1)}</span><span className="hidden text-left text-sm leading-tight lg:block"><strong className="block font-semibold text-ink">{user.name.split(" ")[0]}</strong><span className="text-xs text-muted">{ROLE_LABEL[user.role]}</span></span></span>}>
                <div className="px-3 py-2"><LangToggle /></div>
                <div className="my-1 border-t border-line" />
                <button type="button" role="menuitem" className={menuItem} onClick={() => { signOut(); nav("/"); }}><LogOut size={17} aria-hidden /> {t("signOut")}</button>
              </Menu>
            </>
          ) : (
            <>
              <LinkButton to="/login" look="quiet" small>{t("signIn")}</LinkButton>
              <LinkButton to="/register" small>{t("createAccount")}</LinkButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/** Phones get a bottom tab bar instead of a hamburger: the same places, one thumb away. */
export function TabBar() {
  const { user } = useAuth();
  const { t } = useLang();
  const planId = usePlanId(user?.role);
  const { main, more } = useNav(user?.role, planId);
  const [sheet, setSheet] = useState(false);
  const loc = useLocation();
  useEffect(() => setSheet(false), [loc.pathname]);
  if (!user || main.length === 0) return null;
  return (
    <>
      <nav className="tabbar no-print md:hidden" aria-label="Main" style={{ gridTemplateColumns: `repeat(${main.length + (more.length ? 1 : 0)}, 1fr)` }}>
        {main.map((n) => (
          <NavLink key={n.label} to={n.to} end={n.end}><n.Icon size={22} aria-hidden /><span>{t(n.label)}</span></NavLink>
        ))}
        {more.length > 0 && (
          <button type="button" className={sheet ? "on" : ""} aria-expanded={sheet} onClick={() => setSheet(!sheet)}><MoreHorizontal size={22} aria-hidden /><span>{t("more")}</span></button>
        )}
      </nav>
      <AnimatePresence>
        {sheet && (
          <>
            <motion.div className="fixed inset-0 z-30 bg-ink/30 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(false)} />
            <motion.div role="dialog" aria-label={t("more")} className="fixed inset-x-0 bottom-0 z-40 rounded-t-panel border-t border-line bg-surface p-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] shadow-popover md:hidden"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 420, damping: 38 }}>
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line-strong" style={{ background: "var(--line-strong)" }} />
              {more.map((n) => <NavLink key={n.label} to={n.to} className={menuItem}><n.Icon size={19} className="text-brand-700" aria-hidden /> {t(n.label)}</NavLink>)}
              <div className="px-3 py-2"><LangToggle /></div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export function Footer() {
  const { t } = useLang();
  return (
    <footer className="no-print mt-16 border-t border-line bg-white/70">
      <div className="mx-auto flex max-w-wide flex-wrap items-start justify-between gap-6 px-4 py-8 sm:px-6 lg:px-10">
        <div className="max-w-xl space-y-1.5">
          <p className="font-semibold text-ink">{PRODUCT} <span className="font-normal text-muted">by {HOSPITAL_FULL}</span></p>
          <p className="text-sm text-muted">{t("footerNote")}</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label="Legal">
          <Link to="/terms">{t("terms")}</Link>
          <Link to="/privacy">{t("privacy")}</Link>
          <Link to="/safety">{t("safetyLimits")}</Link>
        </nav>
      </div>
    </footer>
  );
}

interface StaffNavItem { to: string; label: string; Icon: LucideIcon; end?: boolean }

export function StaffShell({ variant, title, nav, extra }: { variant: "doctor" | "admin"; title: string; nav: StaffNavItem[]; extra?: ReactNode }) {
  const { user, signOut } = useAuth();
  const { t } = useLang();
  const loc = useLocation();
  const mt = useMotionT();
  const dark = variant === "admin";
  const side = dark ? "staff-aside-admin text-white" : "staff-aside-doctor text-white";
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className={`no-print flex shrink-0 flex-col gap-3 p-4 md:sticky md:top-0 md:h-screen md:max-h-screen md:w-64 md:self-start md:overflow-y-auto ${side}`}>
        <div className="staff-sidebar-brand">
          <Logo size={34} />
          <div className="leading-tight">
            <p className="text-lg font-semibold">{HOSPITAL}</p>
            <p className="text-xs opacity-80">{title}</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible" aria-label={title}>
          {nav.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="side-link relative whitespace-nowrap rounded-input px-3 py-2">
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId={`side-${variant}`} className="absolute inset-0 rounded-input bg-white/[0.14] shadow-[inset_3px_0_0_#02C39A]" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                  <span className="relative flex items-center gap-2.5 font-medium text-white"><Icon size={19} aria-hidden /> {label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden space-y-2 md:block">
          {extra}
          <div className="flex items-center justify-between gap-2 border-t border-white/20 pt-3">
            <span className="min-w-0 text-sm leading-tight"><strong className="block truncate">{user?.name}</strong><span className="text-xs opacity-80">{user ? ROLE_LABEL[user.role] : ""}</span></span>
            <BellMenu dark />
          </div>
          <Button small className="btn-ghost-dark w-full justify-center" onClick={() => { signOut(); window.location.assign("/login"); }}><LogOut size={16} aria-hidden /> {t("signOut")}</Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:px-10 md:py-8">
        <div className="mb-4 flex items-center justify-between gap-3 md:hidden no-print">
          <span className="text-sm">{user?.name}</span>
          <Button look="quiet" small onClick={() => { signOut(); window.location.assign("/login"); }}><LogOut size={16} aria-hidden /> {t("signOut")}</Button>
        </div>
        <motion.div key={loc.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={mt(0.15)} className="mx-auto max-w-wide">
          <Suspense fallback={<ListSkeleton rows={4} />}>
            <Outlet />
          </Suspense>
        </motion.div>
        <p className="mx-auto mt-12 max-w-wide text-xs text-muted">{HOSPITAL_FULL} staff workspace. This tool organizes discharge instructions and gives no medical advice.</p>
      </main>
    </div>
  );
}
