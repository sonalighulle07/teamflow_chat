import { useEffect, useState } from "react";
import axios from "axios";
import { URL } from "../../config";
import { toast } from "react-toastify";

export default function CreateOrganizationForm({ organization, onSuccess }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    contact: "",
    address: "",
    status: "Active",
    plan: "Starter",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);

  const inputClass =
    "flex items-center h-[40px] bg-white border border-gray-200 rounded-lg px-3 text-sm text-[#5B5B5B] w-full";

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl bg-[#F2F2F2] p-8 rounded-[15px] border border-[#E4E4E4]">
        <h2 className="text-center text-gray-600 text-lg font-medium mb-6">
          {organization ? "Edit Organization" : "Create Organization"}
        </h2>

        <form className="grid grid-cols-2 gap-4 ">
          {/* Organization Name */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Organization Name
            </label>
            <div className={inputClass}>
              <img
                src="/octicon_organization-24.png"
                className="w-4 h-4 mr-2"
              />
              <input
                type="text"
                name="name"
                value={form.name}
                placeholder="Enter name"
                className="w-full outline-none"
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Username</label>
            <div className={inputClass}>
              <img src="/octicon_organization-24.png" className="w-4 h-4 mr-2" />
              <input
                type="text"
                placeholder="Enter username"
                className="w-full outline-none"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Organization Email
            </label>
            <div className={inputClass}>
              <img
                src="/material-symbols_mail-outline-rounded.png"
                className="w-4 h-4 mr-2"
              />
              <input
                type="email"
                name="email"
                value={form.email}
                placeholder="Enter email"
                className="w-full outline-none"
              />
            </div>
          </div>

          {/* Contact */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Contact</label>
            <div className={inputClass}>
              <img
                src="/material-symbols_call-outline-sharp.png"
                className="w-4 h-4 mr-2"
              />
              <input
                type="text"
                name="contact"
                value={form.contact}
                placeholder="Enter phone number"
                className="w-full outline-none"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Address</label>
            <div className={inputClass}>
              <img src="/akar-icons_location.png" className="w-4 h-4 mr-2" />
              <input
                type="text"
                name="address"
                value={form.address}
                placeholder="Enter address"
                className="w-full outline-none"
              />
            </div>
          </div>

          {/* User Role */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              User Role
            </label>
            <div className={inputClass}>
              <img src="/octicon_organization-24.png" className="w-4 h-4 mr-2" />
              <input
                type="text"
                placeholder="Enter user role"
                className="w-full outline-none"
              />
            </div>
          </div>

          {/* Status */}
          <div className="relative">
            <label className="block text-gray-600 mb-1 text-sm">Status</label>
            <div
              className="w-full bg-white border border-gray-200 rounded-lg flex items-center px-3 py-2 cursor-pointer"
              onClick={() => setStatusOpen(!statusOpen)}
            >
              {/* Placeholder with circular icon */}
              <span className="flex items-center text-sm text-[#5B5B5B]">
                <img
                  src="/fontisto_radio-btn-active.png" // replace with your icon
                  alt="icon"
                  className="w-4 h-4 rounded-full mr-2"
                />
                {form.status || "Select a status"}
              </span>
              <svg
                className="ml-auto w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>

            {statusOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                {["Active", "Inactive"].map((status) => (
                  <div
                    key={status}
                    className="flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      setForm({ ...form, status });
                      setStatusOpen(false);
                    }}
                  >
                    <span
                      className={`w-4 h-4 mr-3 rounded-full border flex items-center justify-center ${
                        status === "Active"
                          ? form.status === status
                            ? "border-green-500 bg-green-500"
                            : "border-green-500"
                          : form.status === status
                          ? "border-black bg-black"
                          : "border-black"
                      }`}
                    >
                      {form.status === status && (
                        <span className="w-2 h-2 bg-white rounded-full"></span>
                      )}
                    </span>
                    <span className="text-[#5B5B5B] text-sm">{status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Plan */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Plans</label>

            <select className={inputClass} value={form.plan}>
              
              <option>Starter</option>
              <option>Pro</option>
              <option>Enterprise</option>
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Password</label>
            <div className={inputClass}>
              <img src="/octicon_organization-24.png" className="w-4 h-4 mr-2" />
              <input
                type="password"
                placeholder="Enter password"
                className="w-full outline-none"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Confirm Password
            </label>
            <div className={inputClass}>
              <img src="/octicon_organization-24.png" className="w-4 h-4 mr-2" />
              <input
                type="password"
                placeholder="Confirm password"
                className="w-full outline-none"
              />
            </div>
          </div>
        </form>

        {/* Buttons */}
        <div className="flex justify-center ml-25 gap-4 mt-8">
          <button className="bg-[#999EFA] text-white px-8 py-2 rounded-lg text-sm">
            Save
          </button>
          <button className="bg-[#999EFA] text-white px-8 py-2 rounded-lg text-sm">
            Save & Send mail
          </button>
        </div>
      </div>
    </div>
  );
}
