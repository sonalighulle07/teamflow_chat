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
//consistancy is important at the well place flase setLoading setError useState at the pl
  const [error, setError] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);

  useEffect(() => {
    if (organization) {
      setForm({
        name: organization.name || "",
        email: organization.email || "",
        contact: organization.contact || "",
        address: organization.address || "",
        status:
          organization.status?.charAt(0).toUpperCase() +
            organization.status?.slice(1) || "Active",
        plan:
          organization.plan?.charAt(0).toUpperCase() +
            organization.plan?.slice(1) || "Starter",
      });
    } else {
      setForm({
        name: "",
        email: "",
        contact: "",
        address: "",
        status: "Active",
        plan: "Starter",
      });
    }
  }, [organization]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      if (organization) {
        await axios.put(
          `${URL}/super-admin/organizations/${organization.id}`,
          form,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        toast.success("Organization updated successfully!", {
          autoClose: 3000,
          theme: "colored",
        });
      
      } else {
        await axios.post(`${URL}/super-admin/organizations`, form, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        toast.success("Organization created successfully!", {
          autoClose: 3000,
          theme: "colored",
        });
      }

      setForm({
        name: "",
        email: "",
        contact: "",
        address: "",
        status: "Active",
        plan: "Starter",
      });

      if (onSuccess) setTimeout(onSuccess, 100);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save organization");
      toast.error(
        err.response?.data?.message || "Failed to save organization",
        { autoClose: 3000, theme: "colored" }
      );
    } finally {
      setLoading(false);
    }
  };
//input class for here height  caoording to high quality is the [art purple class according to the view tu mithn ghat ka pani
//piya o re oiya ooooooiye re tumse na jsur re basra hain a according to content around the 40pc now i am happy with 40px const its about you 
  const inputClass =
    "flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 text-[#5B5B5B] text-sm placeholder-[#5B5B5B] w-full outline-none";

  return (
    <div className="flex justify-center items-start">
      <div className="w-full max-w-md bg-[#F2F2F2] p-9 rounded-[15px] border border-[#E4E4E4]">
        <h2 className="text-center text-gray-600 text-lg font-medium mb-5">
          {organization ? "Edit Organization" : "Create Organization"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-gray-600 mb-1 text-sm">
              Organization Name
            </label>
            <div className={inputClass}>
              <img
                src="/octicon_organization-24.png"
                className="w-4 h-4 mr-2"
                alt="icon"
              />
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter name"
                required
                className="w-full outline-none placeholder-[#5B5B5B]"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-600 mb-1 text-sm">
              Organization Email
            </label>
            <div className={inputClass}>
              <img
                src="/material-symbols_mail-outline-rounded.png"
                className="w-4 h-4 mr-2"
                alt="icon"
              />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter email"
                required
                className="w-full outline-none placeholder-[#5B5B5B]"
              />
            </div>
          </div>

          {/* Contact */}
          <div>
            <label className="block text-gray-600 mb-1 text-sm">Contact</label>
            <div className={inputClass}>
              <img
                src="/material-symbols_call-outline-sharp.png"
                className="w-4 h-4 mr-2"
                alt="icon"
              />
              <input
                type="text"
                name="contact"
                value={form.contact}
                onChange={handleChange}
                placeholder="Enter phone number"
                className="w-full outline-none placeholder-[#5B5B5B]"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-gray-600 mb-1 text-sm">Address</label>
            <div className={inputClass}>
              <img
                src="/akar-icons_location.png"
                className="w-4 h-4 mr-2"
                alt="icon"
              />
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Enter address"
                className="w-full outline-none placeholder-[#5B5B5B]"
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
            <label className="block text-gray-600 mb-1 text-sm">Plans</label>
            <div className={inputClass}>
              <img
                src="/layers-line.png"
                className="w-4 h-4 mr-2"
                alt="icon"
              />
              <select
                name="plan"
                value={form.plan}
                onChange={handleChange}
                className="w-full bg-white outline-none text-[#5B5B5B] text-sm"
              >
                <option value="Starter">Starter</option>
                <option value="Advanced">Pro</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          {error && <p className="text-red-500 text-center text-sm">{error}</p>}

          <div className="flex gap-2">
            {/* Main Create/Update button */}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#1924FF] text-white py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
            >
              {loading
                ? organization
                  ? "Updating..."
                  : "Creating..."
                : organization
                ? "Update"
                : "Create"}
            </button>

            {/* Send Mail button */}
            <button
              type="button"
              onClick={() => console.log("Send mail clicked")} // replace with your send mail logic
              className="flex-1 bg-[#F2F2F2] text-gray-500 font-semibold py-2 rounded-lg text-sm border border-gray-400 hover:bg-[#eeecec]"
            >
              Send Mail
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
