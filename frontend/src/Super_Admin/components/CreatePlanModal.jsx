import { useState, useEffect } from "react";
import axios from "axios";

export default function CreatePlanModal({ show, onClose, plan, onSaved }) {
  const [formData, setFormData] = useState({
    name: "",
    days: "",
    price: "",
    size: "",
  });
  const [loading, setLoading] = useState(false);

  // Pre-fill form if editing
  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || "",
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

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (plan) {
        // Update existing plan
        await axios.put(`/api/plans/update/${plan.id}`, formData);
      } else {
        // Create new plan
        await axios.post("/api/plans/create", formData);
      }
      onSaved?.(); // Callback to refresh plan list in parent
      onClose();
    } catch (err) {
      console.error("Plan save error:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Failed to save plan");
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Card */}
      <div className="relative w-[460px] bg-[#F2F2F2] border border-[#E4E4E4] rounded-[12px] px-10 py-8">
        {/* Header */}
        <div className="relative text-center mb-6">
          <h2 className="text-[18px] text-[#696969]">
            {plan ? "Edit Plan Details" : "Create Plan"}
          </h2>
          <button
            onClick={onClose}
            className="absolute right-[-15px] top-[-15px] text-[#8a8a8a] text-xl"
          >
            ×
          </button>
        </div>

        {/* Name */}
        <InputField
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter name"
          icon="/Icons/octicon_organization-24.png"
        />

        {/* Days */}
        <InputField
          label="Days"
          name="days"
          value={formData.days}
          onChange={handleChange}
          placeholder="Enter days"
          type="number"
          icon="/Icons/lineicons_calendar-days.png"
        />

        {/* Price */}
        <InputField
          label="Price"
          name="price"
          value={formData.price}
          onChange={handleChange}
          placeholder="Enter price"
          type="number"
          icon="/Icons/si_money_price.png"
        />

        {/* Media Size */}
        <InputField
          label="Media size"
          name="size"
          value={formData.size}
          onChange={handleChange}
          placeholder="Enter media size"
          icon="/Icons/material-symbols_perm-media-outline-rounded.png"
        />

        {/* Save Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full h-[44px] ${loading ? "bg-gray-400" : "bg-[#999EFA] hover:bg-[#8c92ff]"} text-white rounded-xl text-[16px]`}
        >
          {loading ? "Saving..." : plan ? "Update" : "Save"}
        </button>
      </div>
    </div>
  );
}

// Reusable input component
function InputField({ label, icon, ...props }) {
  return (
    <div className="mb-4">
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <div className="flex items-center gap-2 bg-white h-[40px] rounded-[8px] px-3">
        {icon && <img src={icon} alt="" className="w-6 h-6 opacity-60" />}
        <input
          className="w-full text-sm text-gray-500 outline-none placeholder:text-[#b5b3b3]"
          {...props}
        />
      </div>
    </div>
  );
}
