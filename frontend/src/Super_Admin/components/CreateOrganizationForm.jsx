import { useEffect, useState } from "react";
import axios from "axios";
import { URL } from "../../config";
import { toast } from "react-toastify";
import { HiEye, HiEyeOff } from "react-icons/hi";
import { FaUser } from "react-icons/fa";
export default function CreateOrganizationForm({ organization, onSuccess }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    contact: "",
    address: "",
    status: "Active",
    plan: "Starter",
    role: "User",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const token = localStorage.getItem("token"); // or wherever you store it
  const [packagesList, setPackagesList] = useState([]);
  const [planOpen, setPlanOpen] = useState(false);

  // Pre-fill form if editing
  useEffect(() => {
    if (organization) {
      setForm({
        name: organization.name || "",
        email: organization.email || "",
        contact: organization.contact || "",
        address: organization.address || "",
        status: organization.status || "Active",
        plan: organization.plan || "Starter",
        role: organization.role || "User",
        username: organization.admin_username || "", // <-- matches backend field
        password: "", // always empty
        confirmPassword: "",
      });
    }
  }, [organization]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await axios.get(`${URL}/super-admin/dashboard/packages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPackagesList(Object.keys(res.data)); // store all package names
      } catch (err) {
        console.error("Error fetching packages", err);
      }
    };

    fetchPackages();
  }, []);

  const handleSubmit = async (sendMail = false) => {
    try {
      if (form.password !== form.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }

      setLoading(true);

      const payload = {
        name: form.name,
        email: form.email,
        contact: form.contact,
        address: form.address,
        status: form.status.toLowerCase(), // active / inactive
        plan_id: getPlanId(form.plan),
        username: form.username, // ✅ ADD
        password: form.password,
        role: "org-admin",
      };

      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      };

      if (organization) {
        // Update organization
        await axios.put(
          `${URL}/super-admin/organizations/${organization.id}`,
          payload,
          config
        );
      } else {
        // Create organization
        await axios.post(`${URL}/super-admin/organizations`, payload, config);
        toast.success("Organization created successfully");

        if (sendMail) {
          await axios.post(
            `${URL}/super-admin/organizations/send-mail`,
            { email: form.email },
            config
          );
          toast.success("Mail sent successfully");
        }
      }

      onSuccess?.();
      setForm({
        name: "",
        email: "",
        contact: "",
        address: "",
        status: "Active",
        plan: "Starter",
        role: "User",
        username: "",
        password: "",
        confirmPassword: "",
      });
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const getPlanId = (planName) => {
    switch (planName) {
      case "Starter":
        return 9;
      case "Pro":
        return 10;
      case "Enterprise":
        return 11;
      case "Advanced":
        return 12;
      default:
        return 9;
    }
  };
  const inputClass =
    "flex items-center h-[40px] bg-white border border-gray-200 rounded-lg px-3 text-sm text-[#5B5B5B] w-full pr-10 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 outline-none";

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl bg-[#F2F2F2] p-8 rounded-[15px] border border-[#E4E4E4]">
        <h2 className="text-center text-[#696969] text-lg font-medium mb-8">
          {organization ? "Edit Organization" : "Create Organization"}
        </h2>

        <form
          className="grid grid-cols-2 gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          {/* All your existing fields remain unchanged */}
          {/* Name */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Organization Name
            </label>
            <div className="relative w-full">
              <img
                src="/Icons/octicon_organization-24.png"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none"
              />
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter name"
                className={inputClass + " pl-10"} // add left padding for icon
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Username</label>
            <div className="relative w-full">
              <img
                src="/Icons/octicon_organization-24.png"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none"
              />
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Enter username"
                className={inputClass + " pl-10"} // left padding for icon
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Organization Email
            </label>
            <div className="relative w-full">
              <img
                src="/Icons/material-symbols_mail-outline-rounded.png"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none"
              />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter email"
                className={inputClass + " pl-10"}
              />
            </div>
          </div>

          {/* Contact */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Contact</label>
            <div className="relative w-full">
              <img
                src="/Icons/material-symbols_call-outline-sharp.png"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none"
              />
              <input
                type="text"
                name="contact"
                value={form.contact}
                onChange={handleChange}
                placeholder="Enter phone number"
                className={inputClass + " pl-10"}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Address</label>
            <div className="relative w-full">
              <img
                src="/Icons/akar-icons_location.png"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none"
              />
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Enter address"
                className={inputClass + " pl-10"}
              />
            </div>
          </div>

          {/* Role */}
          <div className="relative">
            <label className="text-sm text-gray-600 mb-1 block">
              User Role
            </label>
            <div
              className={`w-full bg-white border rounded-lg flex items-center justify-between px-3 py-2 cursor-pointer ${
                roleOpen
                  ? "border-gray-300 ring-1 ring-gray-300"
                  : "border-gray-200"
              }`}
              onClick={() => setRoleOpen(!roleOpen)}
            >
              <div className="flex items-center gap-2">
                {/* Role icon */}
                <img
                  src={
                    form.role === "Admin"
                      ? "/Icons/octicon_organization-24.png"
                      : "/Icons/octicon_organization-24.png"
                  }
                  alt={form.role}
                  className="w-4 h-4"
                />
                {/* Selected text */}
                <span className="text-gray-400 text-[13px]">{form.role}</span>
              </div>

              {/* Arrow */}
              <img
                src={
                  roleOpen
                    ? "/Icons/ep_arrow-up-bold (1).png"
                    : "/Icons/ep_arrow-up-bold.png"
                }
                alt="toggle"
                className="w-3 h-3"
              />
            </div>

            {/* Dropdown options */}
            {roleOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border text-[12px] text-gray-500 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {["Admin", "User"].map((role) => (
                  <div
                    key={role}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      setForm({ ...form, role });
                      setRoleOpen(false);
                    }}
                  >
                    {/* Option icon option and the leg of the way juhtek tshe iygsonags according thjh*/}
                    <img
                      src={
                        role === "Admin"
                          ? "/Icons/octicon_organization-24.png"
                          : "/Icons/octicon_organization-24.png"
                      }
                      alt={role}
                      className="w-4 h-4"
                    />
                    <span>{role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Status */}
          <div className="relative">
            <label className="block text-gray-600 mb-1 text-sm">Status</label>
            <div
              className={`w-full bg-white border rounded-lg flex items-center justify-between px-3 py-2 cursor-pointer ${
                statusOpen
                  ? "border-gray-300 ring-1 ring-gray-300"
                  : "border-gray-200"
              }`}
              onClick={() => setStatusOpen(!statusOpen)}
            >
              <span className="flex items-center gap-2 text-sm text-[#5B5B5B]">
                {/* Show selected status image */}
                <img
                  src={
                    form.status === "Active"
                      ? "/Icons/fontisto_radio-btn-active (1).png"
                      : form.status === "Inactive"
                      ? "/Icons/fontisto_radio-btn-active.png"
                      : "" // fallback if nothing selected
                  }
                  alt={form.status}
                  className="w-4 h-4"
                />
                <span>{form.status || "Select status"}</span>
              </span>

              {/* Arrow */}
              <img
                src={
                  statusOpen
                    ? "/Icons/ep_arrow-up-bold (1).png"
                    : "/Icons/ep_arrow-up-bold.png"
                }
                alt="toggle"
                className="w-3 h-3"
              />
            </div>

            {statusOpen && (
              <div className="absolute z-10 w-full mt-1 text-[14px] text-[#5B5B5B] bg-white border border-gray-200 rounded-lg shadow-lg">
                {["Active", "Inactive"].map((status) => (
                  <div
                    key={status}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      setForm({ ...form, status });
                      setStatusOpen(false);
                    }}
                  >
                    <img
                      src={
                        status === "Active"
                          ? "/Icons/fontisto_radio-btn-active (1).png"
                          : "/Icons/fontisto_radio-btn-active.png"
                      }
                      alt={status}
                      className="w-4 h-4"
                    />
                    <span>{status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Plan */}
          <div className="relative">
            <label className="text-sm text-gray-600 mb-1 block">Plans</label>
            <div
              className={`w-full bg-white border rounded-lg flex items-center justify-between px-3 py-2 cursor-pointer ${
                planOpen
                  ? "border-gray-300 ring-1 ring-gray-300"
                  : "border-gray-200"
              }`}
              onClick={() => setPlanOpen(!planOpen)}
            >
              <div className="flex items-center gap-2">
                {/* Left icon */}
                <img
                  src="/Icons/si_layers-line.png"
                  alt="plan"
                  className="w-4.5 h-4.5"
                />
                {/* Selected text */}
                <span className="text-gray-500 text-[13px]">
                  {form.plan
                    ? form.plan.charAt(0).toUpperCase() + form.plan.slice(1)
                    : "Select a plan"}
                </span>
              </div>

              {/* Arrow */}
              <img
                src={
                  planOpen
                    ? "/Icons/ep_arrow-up-bold (1).png"
                    : "/Icons/ep_arrow-up-bold.png"
                }
                alt="toggle"
                className="w-3 h-3"
              />
            </div>

            {/* Dropdown options */}
            {planOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border text-[12px] text-gray-500 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {packagesList.map((plan) => (
                  <div
                    key={plan}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      setForm({ ...form, plan });
                      setPlanOpen(false);
                    }}
                  >
                    {/* Dynamic image for plan */}
                    <img
                      src="/Icons/si_layers-line.png"
                      alt="plan"
                      className="w-4 h-4"
                    />

                    <span>{plan.charAt(0).toUpperCase() + plan.slice(1)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Password</label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter password"
                className={inputClass}
              />
              <span
                className="absolute right-3 cursor-pointer text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <HiEyeOff size={18} /> : <HiEye size={18} />}
              </span>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Confirm Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                className={inputClass}
              />
              <span
                className="absolute right-3 cursor-pointer text-gray-500"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <HiEyeOff size={18} />
                ) : (
                  <HiEye size={18} />
                )}
              </span>
            </div>
          </div>
        </form>

        {/* Buttons */}
        <div className="flex justify-center ml-30 gap-4 mt-8 w-full   max-w-[400px]">
          <button
            type="button"
            className="bg-[#999EFA] hover:bg-[#848afe] text-white py-2 rounded-lg text-sm flex-1"
            onClick={() => handleSubmit(false)}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </button>
          {!organization && (
            <button
              type="button"
              className="bg-[#999EFA] hover:bg-[#848afe] text-white py-2 rounded-lg text-sm flex-1"
              onClick={() => handleSubmit(true)}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save & Send mail"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
