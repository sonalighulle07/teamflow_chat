import { useEffect, useState } from "react";
import axios from "axios";
import { Users, UserCog, Layers } from "lucide-react";
import { URL } from "../../config";

const StatCard = ({ title, count, icon }) => (
  <div className="relative bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <h2 className="text-3xl font-semibold text-gray-800 mt-1">{count ?? 0}</h2>
      </div>
      <div className="p-3 rounded-xl bg-blue-50 text-blue-600">{icon}</div>
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState({ users: 0, admins: 0, teams: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = sessionStorage.getItem("chatToken");
        if (!token) throw new Error("No auth token found");

        const { data } = await axios.get(`${URL}/api/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });

        if (!data.success) throw new Error(data.message || "Failed to fetch stats");

        // Default to 0 if some fields are missing
        setStats({
          users: data.data.users || 0,
          admins: data.data.admins || 0,
          teams: data.data.teams || 0,
        });
      } catch (err) {
        console.error("Failed to load dashboard stats", err);
        setError(err.response?.data?.message || err.message || "Failed to fetch dashboard stats");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">Loading dashboard stats...</p>
      </div>
    );

  if (error)
    return (
      <div className="text-center text-red-600 font-medium mt-10">
        {error}
      </div>
    );

  const cards = [
    { title: "Users", count: stats.users, icon: <Users size={24} /> },
    { title: "Admins", count: stats.admins, icon: <UserCog size={24} /> },
    { title: "Teams", count: stats.teams, icon: <Layers size={24} /> },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Organization overview and quick actions
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            count={card.count}
            icon={card.icon}
          />
        ))}
      </div>
    </div>
  );
}
