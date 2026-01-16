import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { URL } from "../../config";
import { toast } from "react-toastify"; // ✅ use react-toastify

export default function ViewPlanModal({ planId, onClose }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const modalRef = useRef(null); // Ref for outside click

  // Fetch plan data
  useEffect(() => {
    if (!planId) return;

    const fetchPlan = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${URL}/api/plans/${planId}`);
        if (res.data.success) {
          setPlan(res.data.data);
        }
      } catch (err) {
        console.error("Fetch plan error:", err);
        toast.error("Failed to load plan"); // ✅ toast on error
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [planId]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Helper to format date as DD/MM/YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Helper to format status
  const formatStatus = (status) => {
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (!planId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" />

      <div
        ref={modalRef} // Attach ref here
        className="relative w-full max-w-[342px] bg-white rounded-lg shadow-xl p-6"
      >
        <h3 className="text-lg font-medium text-[#4A4A4A] mb-5 ml-7">
          Plan Details
        </h3>

        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <div className="grid grid-cols-2 gap-y-3  ml-8 text-sm text-gray-600">
            <p>
              <span className="font-medium">Name :</span> {plan.name}
            </p>
            <p>
              <span className="font-medium">Days :</span> {plan.days}
            </p>
            <p>
              <span className="font-medium">Price :</span> ₹
              {plan.price.toLocaleString()}
            </p>
            <p>
              <span className="font-medium">Size :</span> {plan.size}
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute top-3 right-5 text-gray-400 hover:text-gray-600 text-[13px]"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
