import { useState, useEffect } from "react";
import {
  FaBuilding,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { URL } from "../../config";

// Debounce helper
const debounce = (func, delay) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => func(...args), delay);
  };
};

export default function OrgCreateModal({ open, onClose, editData }) {
  if (!open) return null;

  // ========= NEW ADDED formData =========
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contact: "",
    address: "",
    status: "active",
  });

  // Individual states (kept because your logic depends on them)
  const [name, setName] = useState("");

  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("active");
  

  // Errors
  const [nameError, setNameError] = useState("");

  const [emailError, setEmailError] = useState("");
  const [contactError, setContactError] = useState("");

  // Toast
  const [toastMsg, setToastMsg] = useState("");
  const [toastColor, setToastColor] = useState("bg-red-500");
  const [showToast, setShowToast] = useState(false);
   const token = sessionStorage.getItem("chatToken");


 
  const showToastMessage = (msg, color = "bg-red-500") => {
    setToastMsg(msg);
    setToastColor(color);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1500);
  };

  // Regex patterns
  const namePattern = /^[A-Za-z0-9 ]{3,}$/;
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;
  const contactPattern = /^[6-9]\d{9}$/;
  

  const isEdit = !!editData;

  // Fill values when editing
  useEffect(() => {
    if (editData) {
      setName(editData.name || "");
   
      setEmail(editData.email || "");
      setContact(editData.contact || "");
      setAddress(editData.address || "");
      setStatus(editData.status || "active");

      setFormData({
        name: editData.name || "",
        email: editData.email || "",
        contact: editData.contact || "",
        address: editData.address || "",
      
        status: editData.status || "active",
      });
    } else {
      setName("");
      setEmail("");
      setContact("");
      setAddress("");
      setStatus("active");

      setFormData({
        name: "",
        email: "",
        contact: "",
        address: "",
      
        status: "active",
      });
    }
  }, [editData, open]);

  // Validate fields
  const validateField = (field, value) => {
    switch (field) {
      case "name":
        setNameError(namePattern.test(value) ? "" : "Enter a valid name");
        break;
      case "email":
        setEmailError(emailPattern.test(value) ? "" : "Invalid email format");
        break;
      case "contact":
        setContactError(contactPattern.test(value) ? "" : "Invalid mobile number");
        break;
      default:
        break;
    }
  };
  // Debounced Validators
  const debouncedNameCheck = debounce((v) => validateField("name", v), 500);
  const debouncedEmailCheck = debounce((v) => validateField("email", v), 500);
  const debouncedContactCheck = debounce((v) => validateField("contact", v), 500);
 
  // ================= HANDLE INPUTS WITH formData =================
  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });

    // Sync old states (because your logic depends on them separately)
    if (field === "name") setName(value);
    if (field === "email") setEmail(value);
    if (field === "contact") setContact(value);
    if (field === "address") setAddress(value);
    
    if (field === "status") setStatus(value);
  };

    console.log("TOKEN:", token);
  // Submit handler
const handleSubmit = async (e) => {
  e.preventDefault();

  if (!formData.name || !formData.email || !formData.contact || !formData.address) {
    return showToastMessage("All fields are required!");
  }

  if (nameError || emailError || contactError) {
    return showToastMessage("Fix all errors before submitting!");
  }

  // Extract domain from email
  const domainExtract = formData.email.split("@")[1]?.toLowerCase();
  if (!domainExtract) {
    return showToastMessage("Invalid email, domain missing!");
  }

  const payload = {
    ...formData,
    domain: domainExtract,
  };

  try {
    const url = isEdit
      ? `${URL}/super-admin/organizations/${editData.id}`
      : `${URL}/super-admin/organizations`;

    const method = isEdit ? "PUT" : "POST";

    // ** TOKEN ADDED HERE **
   

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,   // 🔥 Required
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    showToastMessage(data.message, res.ok ? "bg-green-500" : "bg-red-500");

    if (res.ok) setTimeout(onClose, 800);

  } catch (error) {
    console.error(error);
    showToastMessage("Server error, try later.");
  }

};

return (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3">
    <div className="relative w-full max-w-lg rounded-2xl bg-white/20 p-8 shadow-2xl backdrop-blur-2xl border border-white/30">

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-2xl hover:scale-110 transition"
      >
        ✕
      </button>

      <h2 className="text-center text-xl font-bold text-white mb-6 tracking-wide">
        {isEdit ? "Edit Organization" : "Create Organization"}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3">

        {/* NAME */}
        <div className="w-full flex flex-col items-center">
          <label className="text-white text-sm font-semibold mb-1.5 ml-6  self-start">
            Organization Name
          </label>
          <div className="relative w-[90%]">
            <FaBuilding className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
            <input
              type="text"
              placeholder="Enter name"
              value={formData.name}
              onChange={(e) => {
                handleChange("name", e.target.value);
                debouncedNameCheck(e.target.value);
              }}
              className={`w-full bg-white/95 px-10 py-2 rounded-lg border text-sm placeholder:text-sm 
                focus:ring-2 focus:ring-purple-400 shadow ${nameError ? "border-red-500" : "border-gray-300"}`}
            />
          </div>
          {nameError && <p className="text-sm text-red-600 mt-1 mr-[60%]">{nameError}</p>}
        </div>

        {/* EMAIL */}
        <div className="w-full flex flex-col items-center">
          <label className="text-white text-sm font-semibold mb-1.5 ml-6 self-start">Email</label>
          <div className="relative w-[90%]">
            <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
            <input
              type="email"
              placeholder="Enter email"
              value={formData.email}
              onChange={(e) => {
                handleChange("email", e.target.value);
                debouncedEmailCheck(e.target.value);
              }}
              className={`w-full bg-white/95 px-10 py-2 rounded-lg border text-sm placeholder:text-sm 
                focus:ring-2 focus:ring-purple-400 shadow ${emailError ? "border-red-500" : "border-gray-300"}`}
            />
          </div>
          {emailError && <p className="text-sm  text-red-600 mt-1 mr-[60%]">{emailError}</p>}
        </div>

        {/* CONTACT */}
        <div className="w-full flex flex-col items-center">
          <label className="text-white text-sm font-semibold mb-1.5  ml-6 self-start">Contact</label>
          <div className="relative w-[90%]">
            <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
            <input
              type="text"
              placeholder="Phone"
              value={formData.contact}
              onChange={(e) => {
                handleChange("contact", e.target.value);
                debouncedContactCheck(e.target.value);
              }}
              className={`w-full bg-white/95 px-10 py-2 rounded-lg border text-sm placeholder:text-sm 
                focus:ring-2 focus:ring-purple-400 shadow ${contactError ? "border-red-500" : "border-gray-300"}`}
            />
          </div>
          {contactError && <p className="text-sm  text-red-600 mt-1 mr-[60%]">{contactError}</p>}
        </div>

        {/* ADDRESS */}
        <div className="w-full flex flex-col items-center">
          <label className="text-white text-sm font-semibold mb-1.5 ml-6 self-start">Address</label>
          <div className="relative w-[90%]">
            <FaMapMarkerAlt className="absolute left-4 top-3 text-gray-400 text-base" />
            <textarea
              rows={2}
              placeholder="Address"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              className="w-full bg-white/95 px-10 py-2 rounded-lg border border-gray-300 
              text-sm placeholder:text-sm focus:ring-2 focus:ring-purple-400 resize-none shadow"
            />
          </div>
        </div>

        {/* STATUS */}
        <div className="w-full flex flex-col items-center">
          <label className="text-white text-sm font-semibold mb-1.5 ml-6  self-start">Status</label>
          <select
            value={formData.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="w-[90%] bg-white/95 px-4 py-2 rounded-lg border border-gray-300 text-sm 
            focus:ring-2 focus:ring-purple-400 shadow"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={
            !name || !email || !contact || !address ||
            nameError || emailError || contactError
          }
          className="w-[92%] bg-purple-600 text-white py-3 rounded-lg font-semibold shadow-md 
          hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
        >
          {isEdit ? "Update Organization" : "Create Organization"}
        </button>
      </form>

      {/* Toast */}
      {showToast && (
        <div
          className={`absolute top-[-60px] left-1/2 -translate-x-1/2 px-5 py-3 rounded-md text-white shadow-lg text-lg ${toastColor}
          animate-[fadeIn_0.4s_ease-out]`}
        >
          {toastMsg}
        </div>
      )}
    </div>
  </div>
);

}
