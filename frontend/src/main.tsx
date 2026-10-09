import { lazy, Suspense, useEffect, useState } from "react";
import { LazyMotion } from "motion/react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ListSkeleton } from "./components/ui";
import { api, PORTAL } from "./lib/api";
import { AuthProvider } from "./lib/auth";
import { LangProvider } from "./lib/lang";
import { ToastHost } from "./lib/toast";
import type { Role } from "./lib/types";
import "./styles/index.css";

// One page, three apps. The path decides which one loads, and each keeps its own sign in
// (a separate storage key), so you can be a patient, a doctor and management in one browser.
const PatientApp = lazy(() => import("./apps/PatientApp"));
const DoctorApp = lazy(() => import("./apps/DoctorApp"));
const AdminApp = lazy(() => import("./apps/AdminApp"));
const DemoPage = lazy(() => import("./pages/Demo"));
const DemoDock = lazy(() => import("./components/DemoDock").then((m) => ({ default: m.DemoDock })));

/** The demo switcher is a separate chunk. Normal visitors never download it. */
function DemoGate() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    api.meta().then((m) => setOn(m.demo)).catch(() => undefined);
  }, []);
  return on ? <Suspense fallback={null}><DemoDock /></Suspense> : null;
}

const isDemo = location.pathname.startsWith("/demo");
const App = isDemo ? DemoPage : PORTAL === "doctor" ? DoctorApp : PORTAL === "admin" ? AdminApp : PatientApp;
const base = PORTAL === "doctor" ? "/doctor" : PORTAL === "admin" ? "/management" : "/";
const allow: Role[] = PORTAL === "doctor" ? ["doctor"] : PORTAL === "admin" ? ["management"] : ["patient", "manager", "family"];

const features = () => (PORTAL === "admin" ? import("./lib/featuresLite") : import("./lib/featuresMax")).then((m) => m.default);

// No StrictMode: the live run screen opens a server-sent event stream and must open it once.
createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={base}>
    <LazyMotion features={features}>
      <LangProvider>
        <AuthProvider allow={allow}>
          <Suspense fallback={<ListSkeleton rows={3} />}>
            <App />
          </Suspense>
          <DemoGate />
          <ToastHost />
        </AuthProvider>
      </LangProvider>
    </LazyMotion>
  </BrowserRouter>,
);
