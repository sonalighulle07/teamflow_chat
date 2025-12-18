// src/pages/OrgAdminDashboard.jsx
import { Routes, Route } from "react-router-dom";
import OrgAdminLayout from "@/components/admin/OrgAdminLayout";
import AdminOrgUsersPage from "@/components/admin/AdminOrgUsersPage";
import OrganizationAdminTeamsModule from "@/components/admin/OrganizationAdminTeamsModule";
import { URL } from "../../config";
// import other modules like OrganizationUsersModule, OrgAdminsModule if needed

export default function OrgAdminDashboard({ orgId, adminId }) {
  return (
    <Routes>
      <Route path="/" element={<OrgAdminLayout />}>
        {/* Dashboard default page */}
        <Route index element={<div>Welcome to Org Admin Dashboard</div>} />

        {/* Users tab */}
        <Route
          path="users"
          element={<AdminOrgUsersPage orgId={orgId} />}
        />

        {/* Teams tab */}
        <Route
          path="teams"
          element={<OrganizationAdminTeamsModule adminId={adminId} />}
        />

        {/* Add more tabs like Admins, Organization Settings */}
      </Route>
    </Routes>
  );
}
