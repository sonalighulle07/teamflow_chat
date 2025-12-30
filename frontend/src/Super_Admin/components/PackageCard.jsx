export default function PackageCard({ title, value, icon }) {
  return (
    <div className="bg-gradient-to-br from-white to-[#e3ebf8] border border-gray-300 rounded-xl p-7 flex justify-between items-center h-[120px]">
      <div>
        <p className="text-[15px] text-gray-600">{title}</p>
        <p className="text-[22px] text-gray-600  mt-3">
          {value}
        </p>
      </div>

      {/* Icon only */}
      <div className="flex items-center justify-center">
        {icon}
      </div>
    </div>
  );
}
