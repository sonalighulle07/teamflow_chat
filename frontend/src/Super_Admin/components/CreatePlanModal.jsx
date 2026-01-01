import { useState, useEffect } from "react";

export default function CreatePlanModal({ show, onClose, plan }) {
  const [formData, setFormData] = useState({
    name: "",
    days: "",
    price: "",
    size: "",
  });

  // Pre-fill form if editing
  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.plan || "",
        days: plan.days || "",
        price: plan.price || "",
        size: plan.size || "",
      });
    } else {
      setFormData({ name: "", days: "", price: "", size: "" });
    }
  }, [plan]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = () => {
    if (plan) {
      console.log("Update plan:", formData);
    } else {
      console.log("Create plan:", formData);
    }
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Card */}
      <div className="relative w-[460px] bg-[#F2F2F2] border border-[#c8c7c7] rounded-[12px] px-10 py-8">
        {/* Header */}
        <div className="relative text-center mb-6">
          <h2 className="text-[18px] text-[#696969]">
            {plan ? "Edit Plan" : "Create Plan"}
          </h2>
          <button
            onClick={onClose}
            className="absolute right-[-15px] top-[-15px] text-[#8a8a8a] text-xl"
          >
            ×
          </button>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">Name</label>
          <div className="flex items-center gap-2 bg-white h-[40px] rounded-[8px] px-3">
            <img
              src="/octicon_organization-24.png"
              alt=""
              className="w-5.5 h-5.5 opacity-60"
            />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter name"
              className="w-full text-sm text-gray-500 outline-none placeholder:text-[#b5b3b3]"
            />
          </div>
        </div>

        {/* Days */}
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">Days</label>
          <div className="flex items-center gap-2 bg-white h-[40px] rounded-[8px] px-3">
            <img
              src="/lineicons_calendar-days.png"
              alt=""
              className="w-6 h-6 opacity-60"
            />
            <input
              type="number"
              name="days"
              value={formData.days}
              onChange={handleChange}
              placeholder="Enter days"
              className="w-full text-sm text-gray-500 outline-none placeholder:text-[#b5b3b3]"
            />
          </div>
        </div>

        {/* Price */}
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">Price</label>
          <div className="flex items-center gap-2 bg-white h-[40px] rounded-[8px] px-3">
            <img
              src="/si_money_price.png"
              alt=""
              className="w-6 h-6 opacity-60"
            />
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="Enter price"
              className="w-full text-sm text-gray-500 outline-none placeholder:text-[#b5b3b3]"
            />
          </div>
        </div>

        {/* Media Size */}
        <div className="mb-6">
          <label className="block text-sm text-gray-600 mb-1">Media size</label>
          <div className="flex items-center gap-2 bg-white h-[40px] rounded-[8px] px-3">
            <img
              src="/material-symbols_perm-media-outline-rounded.png"
              alt=""
              className="w-5.5 h-5.5 opacity-60"
            />
            <input
              type="text"
              name="size"
              value={formData.size}
              onChange={handleChange}
              placeholder="Enter media size"
              className="w-full text-sm text-[#878686] outline-none placeholder:text-[#b5b3b3]"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSubmit}
          className="w-full h-[44px] bg-[#999EFA] hover:bg-[#8c92ff] text-white rounded-xl text-[17px]"
        >
          {plan ? "Update" : "Save"}
        </button>
      </div>
    </div>
  );
}
