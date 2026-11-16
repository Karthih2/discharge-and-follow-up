import * as Dialog from "@radix-ui/react-dialog";
import { Building2, ChevronRight, HeartHandshake, Stethoscope, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useL } from "../i18n/landing";

/**
 * Get started: three large doors, one per role. Patients stay in this app; doctors and management have their own
 * apps with their own sign in, so those are full page links.
 */
export function RolePicker({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const L = useL();
  const roles = [
    { key: "patient", Icon: HeartHandshake, title: L("r1t"), text: L("pickPatient"), href: "/login", spa: true, tint: "from-[#e9f8f2] to-white" },
    { key: "doctor", Icon: Stethoscope, title: L("r2t"), text: L("pickDoctor"), href: "/doctor/login", spa: false, tint: "from-[#e8f3fa] to-white" },
    { key: "admin", Icon: Building2, title: L("r3t"), text: L("pickAdmin"), href: "/management/login", spa: false, tint: "from-[#f6f7df] to-white" },
  ];
  const row = "group flex items-center gap-4 rounded-card border border-line bg-gradient-to-r p-4 text-left text-ink no-underline transition-[border-color,box-shadow] hover:border-primary/50 hover:no-underline hover:shadow-card-hover focus-visible:outline-2";
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="lp-overlay fixed inset-0 z-[70] bg-ink/40 backdrop-blur-[2px]" />
        <Dialog.Content className="lp-sheet fixed z-[71] bg-white shadow-popover focus:outline-none" aria-describedby="rp-sub">
          <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-[#cbd5e1] sm:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-semibold text-ink">{L("pickTitle")}</Dialog.Title>
              <Dialog.Description id="rp-sub" className="mt-1 text-sm text-muted">{L("pickSub")}</Dialog.Description>
            </div>
            <Dialog.Close className="rounded-input p-2 text-muted hover:bg-brand-50 hover:text-ink" aria-label={L("close")}><X size={20} /></Dialog.Close>
          </div>
          <ul className="mt-5 space-y-3">
            {roles.map(({ key, Icon, title, text, href, spa, tint }) => {
              const body = (
                <>
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-input bg-white text-brand-700 shadow-card"><Icon size={24} aria-hidden /></span>
                  <span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span><span className="block text-sm text-muted">{text}</span></span>
                  <ChevronRight size={20} className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-700" aria-hidden />
                </>
              );
              return (
                <li key={key}>
                  {spa
                    ? <Link to={href} className={`${row} ${tint}`} onClick={() => onOpenChange(false)}>{body}</Link>
                    : <a href={href} className={`${row} ${tint}`}>{body}</a>}
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-center text-sm"><Link to="/register" onClick={() => onOpenChange(false)}>{L("newPatient")}</Link></p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
