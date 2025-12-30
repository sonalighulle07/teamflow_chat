export default function StatCard({ title, desc, value, icon, square }) {
  return (
    <div
      className={`bg-white rounded-[6px] p-6 shadow-sm border border-gray-200 ${
        square ? "w-[257px] h-[195px]" : "flex-1 h-[195px]"
      }`}
    >
      <p className="text-[15px] text-gray-700 mb-1.5 ">{title}</p>

      {/* Fixed height for description to align cards */}
      <p className="text-[13px] text-gray-400 mt-1 h-[38px]">{desc}</p>

      {/* Value and icon in one line */}
      <div className="mt-7 flex items-center justify-between">
        <p className="text-[22px] text-gray-600 ">{value}</p>
        <div className="w-[65px] h-[65px] flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}
