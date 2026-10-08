import { ChartBar, ClockCounterClockwise, PhoneCall, Stack, UsersThree } from "@phosphor-icons/react";
import { Navigate, Route, Routes } from "react-router-dom";
import { DemoClock } from "../components/DemoClock";
import { StaffShell } from "../components/Layout";
import { Guard } from "../lib/auth";
import { Audit, Callbacks, Overview, Queue, Reviewers } from "../pages/admin/Pages";
import StaffLogin from "../pages/StaffLogin";

export default function AdminApp() {
  return (
    <Routes>
      <Route path="/login" element={<StaffLogin role="management" />} />
      <Route
        element={
          <Guard roles={["management"]}>
            <StaffShell
              variant="admin"
              title="Management console"
              extra={<div className="rounded-sm bg-surface p-2 text-ink"><DemoClock stack /></div>}
              nav={[
                { to: "/", label: "Overview", Icon: ChartBar, end: true },
                { to: "/queue", label: "Review queue", Icon: Stack },
                { to: "/reviewers", label: "Reviewers", Icon: UsersThree },
                { to: "/callbacks", label: "Callbacks", Icon: PhoneCall },
                { to: "/audit", label: "Audit log", Icon: ClockCounterClockwise },
              ]}
            />
          </Guard>
        }
      >
        <Route index element={<Overview />} />
        <Route path="queue" element={<Queue />} />
        <Route path="reviewers" element={<Reviewers />} />
        <Route path="callbacks" element={<Callbacks />} />
        <Route path="audit" element={<Audit />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
