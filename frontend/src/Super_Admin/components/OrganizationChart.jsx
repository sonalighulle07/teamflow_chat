import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { URL } from "../../config";

const YEARS = Array.from({ length: 9 }, (_, i) => 2025 + i);
const BAR_COLORS = ["#8174FF", "#6DD8EF"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];


/* ---------- Custom Tooltip ---------- */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-md px-3 py-2 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-700">
        {payload[0].name}: {payload[0].value}
      </p>
    </div>
  );
}

export default function OrganizationChart() {
  const [type, setType] = useState("yearly");
  const [chartData, setChartData] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [planOpen, setPlanOpen] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch(`${URL}/super-admin/dashboard/org-growth?type=${type}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setChartData(data.data || []);
        setPlans(data.plans || []);
        setSelectedPlan(data.plans?.[0] || "");
      });
  }, [type]);

  return (
    <div className="bg-white rounded-[12px] p-6 mb-8 shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-[16px] text-gray-700 ">
          Organization Growth
        </h2>

        <div className="flex items-center gap-6 text-sm">
          {/* Year / Month */}
          <div className="flex gap-4">
            <span
              onClick={() => setType("yearly")}
              className={`cursor-pointer pb-1 ${
                type === "yearly"
                  ? "text-gray-700 border-b-2 border-gray-600"
                  : "text-gray-500"
              }`}
            >
              Yearly
            </span>
            <span
              onClick={() => setType("monthly")}
              className={`cursor-pointer pb-1 ${
                type === "monthly"
                  ? "text-gray-700 border-b-2 border-gray-600"
                  : "text-gray-500"
              }`}
            >
              Monthly
            </span>
          </div>

          {/* Plans Dropdown */}
          <div className="relative w-33 ">
            <div
              className={`bg-white border  rounded-[12px] flex items-center justify-between px-3 py-2 cursor-pointer ${
                planOpen
                  ? "border-gray-300 ring-1 ring-gray-300"
                  : "border-gray-200"
              }`}
              onClick={() => setPlanOpen(!planOpen)}
            >
              <div className="flex items-center gap-2">
                <img
                  src="/Icons/si_layers-line.png"
                  alt="plan"
                  className="w-4 h-4"
                />
                <span className="text-gray-500 text-[13px]">
                  {selectedPlan
                    ? selectedPlan.charAt(0).toUpperCase() +
                      selectedPlan.slice(1)
                    : "Select a plan"}
                </span>
              </div>

              <img
                src={
                  planOpen
                    ? "/Icons/ep_arrow-up-bold (1).png"
                    : "/Icons/ep_arrow-up-bold.png"
                }
                alt="toggle"
                className="w-3 h-3"
              />
            </div>

            {planOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg text-[12px] text-gray-500">
                {plans.map((plan) => (
                  <div
                    key={plan}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      setSelectedPlan(plan);
                      setPlanOpen(false);
                    }}
                  >
                    <img
                      src="/Icons/si_layers-line.png"
                      alt="plan"
                      className="w-4 h-4"
                    />
                    <span>{plan.charAt(0).toUpperCase() + plan.slice(1)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-[260px]">
        <ResponsiveContainer width="85%" height="95%">
          <BarChart data={chartData} barCategoryGap={10} barGap={4}>
            <XAxis
              dataKey={type === "yearly" ? "year" : "month"}
              ticks={type === "yearly" ? YEARS : undefined}
              tickFormatter={(value) =>
                type === "monthly" ? MONTHS[value - 1] || value : value
              }
              axisLine={{ stroke: "#D0D0D0" }}
              tickLine={false}
              tick={{ fill: "#9CA3AF", fontSize: 12 }}
              label={{
                value: type === "yearly" ? "Years" : "Months",
                position: "insideBottom",
                offset: -5,
                fill: "#6B7280",
                fontSize: 14,
              }}
            />

            <YAxis
              axisLine={{ stroke: "#D0D0D0" }}
              tickLine={false}
              tick={{ fill: "#9CA3AF", fontSize: 12}}
              domain={[0, "dataMax + 5"]}
              label={{
                value: "Organizations",
                angle: -90,
                position: "insideLeft",
                fill: "#6B7280",
                fontSize: 13,
              }}
            />

            <Tooltip content={<CustomTooltip />} cursor={false} />

            {selectedPlan && (
              <Bar
                dataKey={selectedPlan.toLowerCase()}
                name={selectedPlan}
                barSize={40}
                radius={[6, 6, 0, 0]}
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={BAR_COLORS[index % BAR_COLORS.length]}
                  />
                ))}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
