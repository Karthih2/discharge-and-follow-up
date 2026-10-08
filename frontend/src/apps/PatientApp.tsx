import { AnimatePresence, motion } from "motion/react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Footer, Header } from "../components/Layout";
import { Guard } from "../lib/auth";
import { useMotionT } from "../lib/motion";
import { FamilyHome, FamilyHub } from "../pages/FamilyHome";
import Fridge from "../pages/Fridge";
import Landing from "../pages/Landing";
import { Privacy, Safety, Terms } from "../pages/Legal";
import Login from "../pages/Login";
import PatientHome from "../pages/PatientHome";
import Plan from "../pages/Plan";
import Providers from "../pages/Providers";
import Register from "../pages/Register";
import Run from "../pages/Run";
import Sharing from "../pages/Sharing";
import Upload from "../pages/Upload";

export default function PatientApp() {
  const loc = useLocation();
  const mt = useMotionT();
  return (
    <>
      <a href="#main" className="no-print sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-surface focus:p-2">
        Skip to content
      </a>
      <Header />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          id="main"
          key={loc.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={mt(0.15)}
          className="mx-auto max-w-6xl px-5 py-10"
        >
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
            {/* family */}
            <Route path="/family" element={<Guard roles={["manager", "family"]}><FamilyHome /></Guard>} />
            <Route path="/family/hub" element={<Guard roles={["manager"]}><FamilyHub /></Guard>} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/safety" element={<Safety />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.main>
      </AnimatePresence>
      <Footer />
    </>
  );
}
