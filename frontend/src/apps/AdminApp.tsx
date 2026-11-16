import { BarChart3, BellRing, History, Map as MapIcon, Settings as SettingsIcon, Phone, Layers, Stethoscope } from "lucide-react";
import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { StaffShell } from "../components/Layout";
import { Guard } from "../lib/auth";
import { useLang } from "../lib/lang";
import { StaffLogin } from "../components/StaffLogin";

const Overview = lazy(() => import("../pages/admin/Overview"));
const Reviews = lazy(() => import("../pages/admin/Reviews"));
const Doctors = lazy(() => import("../pages/admin/Doctors"));
const Callbacks = lazy(() => import("../pages/admin/Callbacks"));
const Patients = lazy(() => import("../pages/admin/Patients"));
const PatientDetail = lazy(() => import("../pages/admin/PatientDetail"));
const HospitalMap = lazy(() => import("../pages/admin/HospitalMap"));
const Settings = lazy(() => import("../pages/admin/Settings"));
const Audit = lazy(() => import("../pages/admin/Audit"));

export default function AdminApp() {
  const { t } = useLang();
  return (
    <Routes>
      <Route path="/login" element={<StaffLogin portalLabel="Management" />} />
      <Route
        element={
          <Guard roles={["management"]}>
            <StaffShell
              variant="admin"
              title={t("managementConsole")}
              nav={[
                { to: "/", label: t("needsYouNow"), Icon: BellRing, end: true },
                { to: "/overview", label: t("overview"), Icon: BarChart3 },
                { to: "/reviews", label: t("reviewAssignment"), Icon: Layers },
                { to: "/doctors", label: t("doctors"), Icon: Stethoscope },
                { to: "/map", label: t("hospitalMap"), Icon: MapIcon },
                { to: "/callbacks", label: t("callbacks"), Icon: Phone },
                { to: "/settings", label: t("settings"), Icon: SettingsIcon },
                { to: "/audit", label: t("auditLog"), Icon: History },
              ]}
            />
          </Guard>
        }
      >
        <Route index element={<Patients />} />
        <Route path="overview" element={<Overview />} />
        <Route path="map" element={<HospitalMap />} />
        <Route path="patients/:id" element={<PatientDetail />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="doctors" element={<Doctors />} />
        <Route path="callbacks" element={<Callbacks />} />
        <Route path="patients" element={<Navigate to="/?view=all" replace />} />
        <Route path="settings" element={<Settings />} />
        <Route path="audit" element={<Audit />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
