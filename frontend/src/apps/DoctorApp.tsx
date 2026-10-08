import { PhoneCall, Stack } from "@phosphor-icons/react";
import { Navigate, Route, Routes } from "react-router-dom";
import { StaffShell } from "../components/Layout";
import { Guard } from "../lib/auth";
import DoctorCallbacks from "../pages/doctor/Callbacks";
import DoctorQueue from "../pages/doctor/Queue";
import StaffLogin from "../pages/StaffLogin";

export default function DoctorApp() {
  return (
    <Routes>
      <Route path="/login" element={<StaffLogin role="doctor" />} />
      <Route
        element={
          <Guard roles={["doctor"]}>
            <StaffShell variant="doctor" title="Doctor workspace" nav={[{ to: "/", label: "Review queue", Icon: Stack, end: true }, { to: "/callbacks", label: "Callbacks", Icon: PhoneCall }]} />
          </Guard>
        }
      >
        <Route index element={<DoctorQueue />} />
        <Route path="callbacks" element={<DoctorCallbacks />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
