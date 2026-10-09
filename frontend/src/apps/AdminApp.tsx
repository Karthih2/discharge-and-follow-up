import { ChartBar, ClockCounterClockwise, Gear, PhoneCall, Stack, Stethoscope, UsersThree } from "@phosphor-icons/react";
import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { DemoClock } from "../components/DemoClock";
import { StaffShell } from "../components/Layout";
import { Guard } from "../lib/auth";
import { useLang } from "../lib/lang";
import { SharedSignIn } from "../components/SharedSignIn";

// One chunk per screen. Recharts loads only with the overview charts.
const Overview = lazy(() => import("../pages/admin/Overview"));
const Reviews = lazy(() => import("../pages/admin/Reviews"));
const Doctors = lazy(() => import("../pages/admin/Doctors"));
const Callbacks = lazy(() => import("../pages/admin/Callbacks"));
const Patients = lazy(() => import("../pages/admin/Patients"));
const Settings = lazy(() => import("../pages/admin/Settings"));
const Audit = lazy(() => import("../pages/admin/Audit"));

export default function AdminApp() {
  const { t } = useLang();
  return (
    <Routes>
      <Route path="/login" element={<SharedSignIn />} />
      <Route
        element={
          <Guard roles={["management"]}>
            <StaffShell
              variant="admin"
              title={t("managementConsole")}
              extra={<div className="rounded-sm bg-surface p-2 text-ink"><DemoClock stack /></div>}
              nav={[
                { to: "/", label: t("overview"), Icon: ChartBar, end: true },
                { to: "/reviews", label: t("reviewAssignment"), Icon: Stack },
                { to: "/doctors", label: t("doctors"), Icon: Stethoscope },
                { to: "/callbacks", label: t("callbacks"), Icon: PhoneCall },
                { to: "/patients", label: t("patients"), Icon: UsersThree },
                { to: "/settings", label: t("settings"), Icon: Gear },
                { to: "/audit", label: t("auditLog"), Icon: ClockCounterClockwise },
              ]}
            />
          </Guard>
        }
      >
        <Route index element={<Overview />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="doctors" element={<Doctors />} />
        <Route path="callbacks" element={<Callbacks />} />
        <Route path="patients" element={<Patients />} />
        <Route path="settings" element={<Settings />} />
        <Route path="audit" element={<Audit />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
