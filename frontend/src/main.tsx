import { lazy, Suspense } from "react";
import { LazyMotion } from "motion/react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ListSkeleton } from "./components/ui";
import { PORTAL } from "./lib/api";
import { AuthProvider } from "./lib/auth";
import { LangProvider } from "./lib/lang";
import { ToastHost } from "./lib/toast";
import type { Role } from "./lib/types";
import "./styles/index.css";

const PatientApp = lazy(() => import("./apps/PatientApp"));
const DoctorApp = lazy(() => import("./apps/DoctorApp"));
const AdminApp = lazy(() => import("./apps/AdminApp"));

const App = PORTAL === "doctor" ? DoctorApp : PORTAL === "admin" ? AdminApp : PatientApp;
const base = PORTAL === "doctor" ? "/doctor" : PORTAL === "admin" ? "/management" : "/";
const allow: Role[] = PORTAL === "doctor" ? ["doctor"] : PORTAL === "admin" ? ["management"] : ["patient", "manager", "family"];

const features = () => (PORTAL === "admin" ? import("./lib/featuresLite") : import("./lib/featuresMax")).then((m) => m.default);

createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={base}>
    <LazyMotion features={features}>
      <LangProvider>
        <AuthProvider allow={allow}>
          <Suspense fallback={<ListSkeleton rows={3} />}>
            <App />
          </Suspense>
          <ToastHost />
        </AuthProvider>
      </LangProvider>
    </LazyMotion>
  </BrowserRouter>,
);
