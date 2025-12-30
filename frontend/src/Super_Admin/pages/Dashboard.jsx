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
  });

  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    fetch(`${URL}/super-admin/dashboard/total-organizations`, { headers })
      .then((res) => res.json())
      .then((data) =>
        setStats((prev) => ({ ...prev, totalOrganizations: data.count }))
      );

    fetch(`${URL}/super-admin/dashboard/total-users`, { headers })
      .then((res) => res.json())
      .then((data) =>
        setStats((prev) => ({ ...prev, totalUsers: data.count }))
      );

    fetch(`${URL}/super-admin/dashboard/org-activity`, { headers })
      .then((res) => res.json())
      .then((data) =>
        setStats((prev) => ({ ...prev, orgActivity: data.activePercentage }))
      );

    fetch(`${URL}/super-admin/dashboard/packages`, { headers })
      .then((res) => res.json())
      .then((data) => setPackages(data));
  }, []);

  return (
    <>
      <h1 className="text-[16px] text-gray-600 mb-6">Dashboard</h1>

      {/* Top Cards */}
      <div className="flex flex-wrap  -ml-[10px]">
        {/* First Card */}
        <div className="ml-[10px] mb-3">
          <StatCard
            title="Total Organization"
            desc="Registered organizations on the platform"
            value={stats.totalOrganizations}
            icon={<img src="/Frame 249.png" className="" />}
            square
          />
        </div>

        {/* Second Card */}
        <div className="ml-[25px] mb-6">
          <StatCard
            title="Total Users"
            desc="Users across all organizations"
            value={stats.totalUsers}
            icon={<img src="/Frame 250.png" className="" />}
            square
          />
        </div>

        {/* Third Card */}
        <div className="ml-[25px] mb-6 flex-1">
          <div className="bg-white rounded-[6px] p-6 shadow-sm border border-gray-200 h-[194px]">
            <p className="text-[15px] text-gray-700 mb-4 ml-6">
              Organization Activity
            </p>

            <div className="flex items-center justify-between mb-4  ">
              {/* Active */}
              <div className="flex items-center gap-3 ">
                <span className="w-5 h-5 mb-13 rounded-full ml-6 border-2 border-green-400 flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full  bg-green-500"></span>
                </span>
                <div>
                  <p className="text-sm text-gray-600">Active Orgs</p>
                  <p className="text-[20px]  text-gray-600 mt-1.5 mb-1.5">
                    {stats.orgActivity}%
                  </p>
                  <p className="text-xs text-gray-400">823</p>
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
                  <span className="w-2.5 h-2.5 rounded-full bg-[#A4A4A4] "></span>
                </span>
                <div>
                  <p className="text-sm mr-6 text-gray-600">Inactive Orgs</p>
                  <p className="text-[22px] mt-1.5 mb-1.5 text-gray-700">
                    {100 - stats.orgActivity}%
                  </p>
                  <p className="text-xs text-gray-400">234</p>
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
                className="bg-gray-500"
                style={{ width: `${100 - stats.orgActivity}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Packages Section */}
      <div className="bg-white rounded-[6px] p-6 shadow-sm border border-gray-200 mb-6">
        <h2 className="mb-5 text-[16px] text-gray-700  ">
          Organizations by packages
        </h2>

        {/* Scrollable container */}
        <div className="flex flex-wrap -ml-[10px] max-h-[400px] overflow-y-auto mb-[-20px]">
          <div className="ml-[10px] mb-4 flex-1 min-w-[200px]">
            <PackageCard
              title="Starter"
              value={packages.starter}
              icon={<img src="/si_money-orange.png" className="w-8 h-8 mb-9" />}
            />
          </div>

          <div className="ml-[20px] mb-4 flex-1 min-w-[200px]">
            <PackageCard
              title="Pro"
              value={packages.pro}
              icon={<img src="/si_money.png" className="w-8 h-8 mb-9" />}
            />
          </div>

          <div className="ml-[20px] mb-4 flex-1 min-w-[200px]">
            <PackageCard
              title="Enterprise"
              value={packages.enterprise}
              icon={
                <img src="/si_green.png" className="w-8 h-8 mb-9" />
              }
            />
          </div>

          {/* New additional package */}
          <div className="ml-[20px] mb-4 flex-1 min-w-[200px]">
            <PackageCard
              title="Custom"
              value={packages.custom || 0}
              icon={<img src="/si_money.png" className="w-8 h-8 mb-9" />}
            />
          </div>
        </div>
      </div>

      {/* Organization Chart */}
      <OrganizationChart />
    </>
  );
}
