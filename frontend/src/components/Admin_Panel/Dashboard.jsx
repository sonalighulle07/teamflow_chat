import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function Dashboard() {
  const lineData = [
    { day: "M", value: 10 },
    { day: "T", value: 40 },
    { day: "W", value: 30 },
    { day: "T", value: 60 },
    { day: "F", value: 80 },
  ];

  const barData = [
    { day: "M", value: 80 },
    { day: "T", value: 90 },

    { day: "W", value: 60 },
    { day: "T", value: 50 },
    { day: "F", value: 85 },
  ];

  const pieData = [
    { name: "Active Users", value: 1345 },
    { name: "Inactive Users", value: 1244 },
  ];

  const pieColors = ["#D9F6FB", "#3ED6E8"];

  return (
    <div className="bg-[#F0F4FA] h-screen overflow-y-auto pt-3 p-7 space-y-6">
      {/* TOP GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Workspace Activity (Purple Card) */}
        <div className="bg-[#7266ED] rounded-[12px] p-4  text-white">
          <h3 className="text-[16px] pl-3 mb-6">Workspace Activity</h3>

          <div className="flex items-center gap-8 mb-6">
            <div className="flex items-center gap-2">
              <img
                src="/Icons/bi_person.png"
                alt="Total Users"
                className="w-5 h-5 object-contain ml-2"
              />
              <span>
                Total Users: <b>1345</b>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <img
                src="/Icons/nrk_radio-active.png"
                alt="Active Users Today"
                className="w-5 h-5 object-contain"
              />
              <span>
                Active Users Today: <b>1244</b>
              </span>
            </div>
          </div>

          <div className="h-32 w-[90%] mx-auto">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                  dot={false}
                />
                <XAxis
                  dataKey="day"
                  stroke="none"
                  tick={{ fill: "#EDEBFF", fontSize: 15 }}
                  interval={0}
                />
                <YAxis hide />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workspace Activity Pie */}
        <div className="bg-white rounded-[12px] p-6 shadow-sm flex justify-between items-center">
          <div>
            <h3 className="text-[16px]  text-[#737272] -mt-8 ">
              Workspace Activity
            </h3>

            <div className="space-y-3 text-sm text-gray-600 mt-28">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#D6F4F8]" />
                Active Users <span className="ml-4 ">1345</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full bg-[#3BDAEF]" />
                Inactive Users <span className=" ">1244</span>
              </div>
            </div>
          </div>

          <PieChart width={200} height={200}>
            {/* Outer border */}
            <Pie
              data={[{ value: 1 }]}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={81}
              fill="#D4D4D4"
              stroke="none"
            />

            {/* Inner border */}
            <Pie
              data={[{ value: 1 }]}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius={1}
              fill="#D4D4D4"
              stroke="none"
            />

            {/* Main pie */}
            <Pie
              data={pieData}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={1}
              outerRadius={80}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={pieColors[i]} />
              ))}
            </Pie>
          </PieChart>
        </div>
      </div>

      {/* BOTTOM GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Message Activity */}
        <div className="bg-white rounded-[12px] p-5 shadow-sm lg:col-span-1">
          <h3 className="text-[16px] text-[#737272] mb-4">
            Message Activity (Last 5 days)
          </h3>
          <div className="h-40">
            <div className="w-[90%] mx-auto h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barCategoryGap="10%">
                  <XAxis
                    dataKey="day"
                    axisLine={false} // hide X-axis line
                    tickLine={false} // hide tick marks
                    tick={{ fill: "#737272", fontSize: 15, dy: 6 }} // move letters down
                  />
                  <YAxis hide />
                  <Bar dataKey="value" radius={[7, 7, 0, 0]} barSize={26}>
                    {barData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={index % 2 === 0 ? "#A1A4F8" : "#B3C4FB"} // Light & Dark sequence
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="text-sm text-[#737272] mt-4">
            Messages sent (this week): 6000
          </p>
        </div>

        {/* Right Side Stats */}
        <div className="space-y-4 lg:col-span-1">
          {/* Uploaded Media */}
          <div className="bg-white rounded-[12px] p-4 shadow-sm h-[90px]">
            <h3 className="text-[15px] mb-2 text-[#737272] ">
              Uploaded media size
            </h3>

            <div className="w-full h-3.5 bg-[#6154E0] rounded-[5px] overflow-hidden">
              <div className="h-[15px] w-[75%] bg-[#15C0E5]" />
            </div>

            <p className="text-[11.5px] text-gray-400 mt-2">36 MB Used</p>
          </div>

          {/* Total Teams */}
          <div className="bg-white rounded-[12px] p-4 shadow-sm flex items-center justify-between h-[80px]">
            <div>
              <p className="text-[#737272] text-[15px]">Total Teams</p>
              <h2 className="text-[15px] pt-0.5 text-[#737272]">89</h2>
            </div>
            <img
              src="\Icons\Group 4.png"
              alt="Total Teams"
              className="w-10 h-10 object-contain mr-2 "
            />
          </div>

          {/* Total Admin */}
          <div className="bg-white rounded-[12px] p-4 shadow-sm flex items-center justify-between h-[80px]">
            <div>
              <p className="text-[#737272] text-[15px]">Total Admin</p>
              <h2 className="text-[15px] pt-0.5 text-[#737272]">23</h2>
            </div>
            <img
              src="\Icons\Group 3.png"
              alt="Total Admin"
              className="w-10 h-10 object-contain mr-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
