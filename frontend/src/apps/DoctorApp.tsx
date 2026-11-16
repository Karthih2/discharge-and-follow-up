import { CalendarDays, Home as HomeIcon, Phone, Layers, Users } from "lucide-react";
import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { StaffShell } from "../components/Layout";
import { Guard } from "../lib/auth";
import { useLang } from "../lib/lang";
import { StaffLogin } from "../components/StaffLogin";

const Home = lazy(() => import("../pages/doctor/Home"));
const Queue = lazy(() => import("../pages/doctor/Queue"));
const DoctorCalendar = lazy(() => import("../pages/doctor/Calendar"));
const Callbacks = lazy(() => import("../pages/doctor/Callbacks"));
const Patients = lazy(() => import("../pages/doctor/Patients").then((m) => ({ default: m.DoctorPatients })));
const Patient = lazy(() => import("../pages/doctor/Patients").then((m) => ({ default: m.DoctorPatient })));

export default function DoctorApp() {
  const { t } = useLang();
  return (
    <Routes>
      <Route path="/login" element={<StaffLogin portalLabel="Doctor" />} />
      <Route
        element={
          <Guard roles={["doctor"]}>
            <StaffShell
              variant="doctor"
              title={t("doctorWorkspace")}
              nav={[
                { to: "/", label: t("myDay"), Icon: HomeIcon, end: true },
                { to: "/queue", label: t("reviewQueue"), Icon: Layers },
                { to: "/calendar", label: t("doctorCalendar"), Icon: CalendarDays },
                { to: "/patients", label: t("patients"), Icon: Users },
                { to: "/callbacks", label: t("callbacks"), Icon: Phone },
              ]}
            />
          </Guard>
        }
      >
        <Route index element={<Home />} />
        <Route path="queue" element={<Queue />} />
        <Route path="calendar" element={<DoctorCalendar />} />
        <Route path="patients" element={<Patients />} />
        <Route path="patients/:id" element={<Patient />} />
        <Route path="callbacks" element={<Callbacks />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
