import { AnimatePresence, m as motion } from "motion/react";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Footer, Header } from "../components/Layout";
import { ListSkeleton } from "../components/ui";
import { Welcome } from "../components/Welcome";
import { Guard } from "../lib/auth";
import { useMotionT } from "../lib/motion";

// Every screen is its own chunk. Visitors download only the page they open.
const Landing = lazy(() => import("../pages/Landing"));
const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const PatientHome = lazy(() => import("../pages/PatientHome"));
const Calendar = lazy(() => import("../pages/Calendar"));
const Upload = lazy(() => import("../pages/Upload"));
const Run = lazy(() => import("../pages/Run"));
const Sharing = lazy(() => import("../pages/Sharing"));
const Providers = lazy(() => import("../pages/Providers"));
const Fridge = lazy(() => import("../pages/Fridge"));
const Plan = lazy(() => import("../pages/Plan"));
const FamilyHome = lazy(() => import("../pages/FamilyHome").then((m) => ({ default: m.FamilyHome })));
const FamilyHub = lazy(() => import("../pages/FamilyHome").then((m) => ({ default: m.FamilyHub })));
const Terms = lazy(() => import("../pages/Legal").then((m) => ({ default: m.Terms })));
const Privacy = lazy(() => import("../pages/Legal").then((m) => ({ default: m.Privacy })));
const Safety = lazy(() => import("../pages/Legal").then((m) => ({ default: m.Safety })));

export default function PatientApp() {
  const loc = useLocation();
  const mt = useMotionT();
  return (
    <>
      <a href="#main" className="no-print sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-surface focus:p-2">
        Skip to content
      </a>
      <Header />
      <Welcome />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          id="main"
          key={loc.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={mt(0.15)}
          className="mx-auto max-w-[1480px] px-5 py-10"
        >
          <Suspense fallback={<ListSkeleton rows={3} />}>
            <Routes location={loc}>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              {/* patient */}
              <Route path="/patient" element={<Guard roles={["patient"]}><PatientHome /></Guard>} />
              <Route path="/patient/upload" element={<Guard roles={["patient"]}><Upload /></Guard>} />
              <Route path="/patient/run/:id" element={<Guard roles={["patient"]}><Run /></Guard>} />
              <Route path="/patient/sharing" element={<Guard roles={["patient"]}><Sharing /></Guard>} />
              <Route path="/providers" element={<Guard roles={["patient"]}><Providers /></Guard>} />
              <Route path="/plan/:id/providers" element={<Guard roles={["patient"]}><Providers /></Guard>} />
              <Route path="/plan/:id/print" element={<Guard roles={["patient"]}><Fridge /></Guard>} />
              {/* shared plan screen: the server decides what each role sees */}
              <Route path="/plan/:id" element={<Guard roles={["patient", "manager", "family"]}><Plan /></Guard>} />
              <Route path="/calendar" element={<Guard roles={["patient", "manager", "family"]}><Calendar /></Guard>} />
              {/* family */}
              <Route path="/family" element={<Guard roles={["manager", "family"]}><FamilyHome /></Guard>} />
              <Route path="/family/hub" element={<Guard roles={["manager"]}><FamilyHub /></Guard>} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/safety" element={<Safety />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </motion.main>
      </AnimatePresence>
      <Footer />
    </>
  );
}
