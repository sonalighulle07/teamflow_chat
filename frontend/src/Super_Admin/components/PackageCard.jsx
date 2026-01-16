export default function PackageCard({ title, value, icon }) {
  return (
    <div className="bg-gradient-to-br from-white to-[#EFF3F9] border border-gray-300 rounded-[10px]  p-7 flex justify-between items-center h-[120px]">
      <div>
        <p className="text-[16px] text-gray-600 ">{title}</p>
        <p className="text-[20px] text-gray-600  mt-10">{value}</p>
      </div>

      {/* Icon with circular background */}
      <div className="flex items-center justify-center ">
        <div className="w-13 h-13 rounded-full bg-white flex items-center justify-center mb-12">
          {icon}
        </div>
      </div>
    </div>
  );
}
