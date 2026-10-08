import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { DemoDock } from "./components/DemoDock";
import { PORTAL } from "./lib/api";
import { AuthProvider } from "./lib/auth";
import { LangProvider } from "./lib/lang";
import { installRipple } from "./lib/ripple";
import type { Role } from "./lib/types";
import "./styles/index.css";

// One page, three apps. The path decides which one loads, and each keeps its own sign in
// (a separate storage key), so you can be a patient, a doctor and management in one browser.
const PatientApp = lazy(() => import("./apps/PatientApp"));
const DoctorApp = lazy(() => import("./apps/DoctorApp"));
const AdminApp = lazy(() => import("./apps/AdminApp"));
const DemoPage = lazy(() => import("./pages/Demo"));

const isDemo = location.pathname.startsWith("/demo");
const App = isDemo ? DemoPage : PORTAL === "doctor" ? DoctorApp : PORTAL === "admin" ? AdminApp : PatientApp;
const base = PORTAL === "doctor" ? "/doctor" : PORTAL === "admin" ? "/management" : "/";
const allow: Role[] = PORTAL === "doctor" ? ["doctor"] : PORTAL === "admin" ? ["management"] : ["patient", "manager", "family"];

installRipple();
// No StrictMode: the live run screen opens a server-sent event stream and must open it once.
createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={base}>
    <LangProvider>
      <AuthProvider allow={allow}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
        <DemoDock />
      </AuthProvider>
    </LangProvider>
  </BrowserRouter>,
);
