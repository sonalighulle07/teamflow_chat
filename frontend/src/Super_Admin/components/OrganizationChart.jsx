import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { year: "2018", level: 1 },
  { year: "2019", level: 2 },
  { year: "2020", level: 1.5 },
  { year: "2021", level: 3 },
  { year: "2022", level: 3.2 },
  { year: "2023", level: 3.3 },
  { year: "2024", level: 4 },
];

// Mapping Y-axis values to labels
const yAxisTicks = [
  { value: 1, label: "Starter" },
  { value: 2, label: "Pro" },
  { value: 3, label: "Advanced" },
  { value: 4, label: "Enterprise" },
];

export default function OrganizationChart() {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-[16px] text-gray-700  ">Organization Growth</h2>

        <div className="flex gap-4 text-sm">
          <span className="text-gray-600 font-medium border-b-2 border-gray-600 pb-0.5 cursor-pointer">
            Yearly
          </span>
          <span className="text-gray-400 cursor-pointer ">Monthly</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[260px] border-gray-200">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 70, left: 60, bottom: 30 }}
          >
            {/* X Axis */}
            <XAxis
              dataKey="year"
              tick={{ fill: "#6B7280", fontSize: 13 }}
              axisLine={{ stroke: "#D1D5DB" }}
              tickLine={false}
              label={{
                value: "Year",
                position: "insideBottom",
                offset: -15,
                fill: "#9CA3AF",
                fontSize: 14,
              }}
            />

            {/* Y Axis */}
            <YAxis
              type="number"
              domain={[1, 4]}
              ticks={[1, 2, 3, 4]}
              tickFormatter={(value) =>
                yAxisTicks.find((t) => t.value === value)?.label
              }
              tick={{ fill: "#9CA3AF", fontSize: 13 }}
              axisLine={{ stroke: "#D1D5DB" }}
              tickLine={false}
              label={{
                value: "Organization",
                angle: -90,
                position: "insideLeft",
                fill: "#9CA3AF",
                fontSize: 12,
                fontWeight: 400,
                offset: -35,
              }}
            />

            {/* Tooltip */}
            <Tooltip
              cursor={false}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
                fontSize: "13px",
              }}
            />

            {/* Line */}
            <Line
              type="linear" // <-- straight line
              dataKey="level"
              stroke="#38BDF8"
              strokeWidth={1}
              dot={{
                r: 4,
                fill: "#6366F1",
                stroke: "#6366F1",
              }}
              activeDot={{
                r: 6,
                fill: "#6366F1",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
