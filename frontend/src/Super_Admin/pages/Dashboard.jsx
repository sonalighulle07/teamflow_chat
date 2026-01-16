import { useEffect, useState } from "react";
import StatCard from "../components/StatCard";
import PackageCard from "../components/PackageCard";
import OrganizationChart from "../components/OrganizationChart";
import { URL } from "../../config";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    totalUsers: 0,
    orgActivity: 0,
  });

  const [packages, setPackages] = useState({
    starter: 0,
    pro: 0,
    enterprise: 0,
    advanced: 0,
  });

  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    // Total Organizations
    fetch(`${URL}/super-admin/dashboard/total-organizations`, { headers })
      .then((res) => res.json())
      .then((data) =>
        setStats((prev) => ({ ...prev, totalOrganizations: data.count }))
      );

    // Total Users
    fetch(`${URL}/super-admin/dashboard/total-users`, { headers })
      .then((res) => res.json())
      .then((data) =>
        setStats((prev) => ({ ...prev, totalUsers: data.count }))
      );

    // Organization Activity
    // Fetch Organization Activity
    fetch(`${URL}/super-admin/dashboard/org-activity`, { headers })
      .then((res) => res.json())
      .then((data) =>
        setStats((prev) => ({
          ...prev,
          totalOrganizations: data.totalOrgs,
          orgActivity: data.activePercentage,
          activeOrgs: data.activeOrgs,
          inactiveOrgs: data.inactiveOrgs,
        }))
      );
  }, []);
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await fetch(`${URL}/super-admin/dashboard/packages`, {
          headers,
        });
        const data = await res.json();
        console.log("Data received from backend:", data); // <-- Check what backend returns

        setPackages(data); // <-- store all packages as received from backend
      } catch (err) {
        console.error("Error fetching packages:", err);
      }
    };

    fetchPackages();
  }, []);

  return (
    <div className="h-[calc(100vh-64px)] overflow-y-auto p-4 hide-scrollbar">
      <h1 className="text-[16px] text-gray-600 mb-6">Dashboard</h1>

      {/* Top Cards */}
      <div className="flex flex-wrap -ml-[10px]">
        {/* Total Organizations */}
        <div className="ml-[10px] mb-3">
          <StatCard
            title="Total Organization"
            desc="Registered organizations on the platform"
            value={stats.totalOrganizations}
            icon={<img src="/Icons/Frame 249.png" className="" />}
            square
          />
        </div>

        {/* Total Users */}
        <div className="ml-[25px] mb-6">
          <StatCard
            title="Total Users"
            desc="Users across all organizations"
            value={stats.totalUsers}
            icon={<img src="/Icons/Frame 250.png" className="" />}
            square
          />
        </div>

        {/* Organization Activity */}
        <div className="ml-[25px] mb-6 flex-1">
          <div className="bg-white rounded-[6px] p-6 shadow-sm border border-gray-200 h-[194px]">
            <p className="text-[15px] text-gray-700 mb-4 ml-6">
              Organization Activity
            </p>

            <div className="flex items-center justify-between mb-4">
              {/* Active */}
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 mb-13 rounded-full ml-6 border-2 border-green-400 flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                </span>
                <div>
                  <p className="text-sm text-gray-600">Active Orgs</p>
                  <p className="text-[20px] text-gray-600 mt-1.5 mb-1.5">
                    {stats.orgActivity}%
                  </p>
                  <p className="text-xs text-gray-500 ml-1.5">
                    {stats.activeOrgs}
                  </p>
                </div>
              </div>

              {/* VS */}
              <div className="relative flex items-center justify-center">
                <span className="absolute top-[-27px] w-[2px] h-[24px] bg-gray-300" />
                <span className="w-9 h-9 rounded-full bg-[#A4A4A4] text-white text-[15px] flex items-center justify-center">
                  vs
                </span>
                <span className="absolute bottom-[-27px] w-[2px] h-[24px] bg-gray-300" />
              </div>

              {/* Inactive */}
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 mb-13 rounded-full border-2 border-[#A4A4A4] flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#A4A4A4]"></span>
                </span>
                <div>
                  <p className="text-sm mr-6 text-gray-600">Inactive Orgs</p>
                  <p className="text-[22px] mt-1.5 mb-1.5 text-gray-700">
                    {100 - stats.orgActivity}%
                  </p>
                  <p className="text-xs text-gray-500 ml-2">
                    {stats.inactiveOrgs}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="w-full h-[12px] bg-gray-200 rounded-[5px] overflow-hidden flex">
              <div
                className="bg-[#25D03F]"
                style={{ width: `${stats.orgActivity}%` }}
              />
              <div
                className="bg-[#A4A4A4]"
                style={{ width: `${100 - stats.orgActivity}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Packages Section */}
      <div className="bg-white rounded-[6px] p-6 shadow-sm border border-gray-200 mb-6">
        <h2 className="mb-5 text-[16px] text-gray-700">
          Organizations by packages
        </h2>

        {/* Scrollable container for package cards */}
        <div
          className="flex flex-wrap -ml-[10px] max-h-[130px] overflow-y-auto pr-2 scrollbar-rounded"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#ACACAC #EDEDED",
          }}
        >
          {Object.entries(packages).map(([packageName, count], index) => (
            <div
              key={packageName}
              className="ml-[20px] mb-6 flex-none w-[200px]"
            >
              <PackageCard
                title={
                  packageName.charAt(0).toUpperCase() + packageName.slice(1)
                }
                value={count}
                icon={<img src="\Icons\si_money.png" className="w-8 h-8 " />}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Organization Chart */}
      <OrganizationChart />
    </div>
  );
}
