import { useState, useEffect } from "react";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaLock,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

// Debounce helper
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

export default function Register({ onRegister, onSwitch }) {
  const [toastMsg, setToastMsg] = useState("");
  const [toastColor, setToastColor] = useState("bg-red-500");
  const [showToast, setShowToast] = useState(false);

  // Form states
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Error states
  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [contactError, setContactError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Regex patterns
  const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const contactPattern = /^[0-9]{10,15}$/;

  // Username availability
  const checkUsernameAvailability = async (username) => {
    if (!username) {
      setUsernameError("");
      return;
    }
    try {
      const res = await fetch(
        `http://localhost:3000/api/auth/check-username?username=${username}`
      );
      const data = await res.json();
      setUsernameError(!data.available ? "Username already taken" : "");
    } catch {
      setUsernameError("Error checking username");
    }
  };

  // Email availability
  const checkEmailAvailability = async (email) => {
    if (!email) {
      setEmailError("");
      return;
    }
    try {
      const res = await fetch(
        `http://localhost:3000/api/auth/check-email?email=${email}`
      );
      const data = await res.json();
      if (!data.available || !emailPattern.test(email)) {
        setEmailError("Invalid or already used email");
      } else {
        setEmailError("");
      }
    } catch {
      setEmailError("Error checking email");
    }
  };

  // Validation
  const validateField = (field, value) => {
    if (!value) {
      // remove error if empty
      if (field === "contact") setContactError("");
      if (field === "password") setPasswordError("");
      if (field === "confirmPassword") setConfirmPasswordError("");
      return;
    }

    switch (field) {
      case "contact":
        setContactError(
          contactPattern.test(value) ? "" : "Invalid contact number"
        );
        break;
      case "password":
        setPasswordError(
          passwordPattern.test(value)
            ? ""
            : "Password must be 8+ chars with numbers"
        );
        break;
      case "confirmPassword":
        setConfirmPasswordError(
          value === password ? "" : "Passwords do not match"
        );
        break;
      default:
        break;
    }
  };

  // Debounced checks
  const debouncedUsernameCheck = debounce(checkUsernameAvailability, 600);
  const debouncedEmailCheck = debounce(checkEmailAvailability, 600);
  const debouncedContactCheck = debounce(
    (value) => validateField("contact", value),
    600
  );
  const debouncedPasswordCheck = debounce(
    (value) => validateField("password", value),
    600
  );
  const debouncedConfirmPasswordCheck = debounce(
    (value) => validateField("confirmPassword", value),
    600
  );

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const full_name = document.getElementById("regFullName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const username = document.getElementById("regUsername").value.trim();

    if (
      !full_name ||
      !email ||
      !contact ||
      !username ||
      !password ||
      !confirmPassword
    ) {
      showToastMessage("All fields are required!", "bg-red-500");
      return;
    }

    if (
      usernameError ||
      emailError ||
      contactError ||
      passwordError ||
      confirmPasswordError
    ) {
      showToastMessage("Fix the errors before submitting!", "bg-red-500");
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name, email, contact, username, password }),
      });

      const data = await res.json();
      const color = res.ok && data.success ? "bg-green-500" : "bg-red-500";
      showToastMessage(data.message || "Registration failed!", color);

      if (res.ok && data.success) {
        sessionStorage.setItem("chatUserId", data.user.id);
        sessionStorage.setItem("chatUsername", data.user.username);
        sessionStorage.setItem("chatToken", data.token);
        setTimeout(() => onRegister(), 1000);
      }
    } catch {
      showToastMessage("Server error, try again later.", "bg-red-500");
    }
  };

  const showToastMessage = (msg, color) => {
    setToastMsg(msg);
    setToastColor(color);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-tl from-white to-purple-600 animate-fadeIn p-2">
      <div className="w-full max-w-md rounded-2xl bg-white/20 p-6 sm:p-8 shadow-xl backdrop-blur-md animate-slideUp relative">
        <h2 className="mb-6 text-center text-2xl font-bold text-white tracking-wide">
          Register
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Full Name */}
          <div className="flex flex-col">
            <label
              htmlFor="regFullName"
              className="text-white font-medium text-sm mb-1"
            >
              Full Name
            </label>
            <div className="relative">
              <FaUser className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                id="regFullName"
                placeholder="Enter full name"
                className="w-full pl-8 rounded-lg bg-white/85 px-3 py-2 text-gray-600 text-sm border border-gray-300 outline-none focus:border-purple-400 transition duration-200"
              />
            </div>
          </div>

          {/* Username */}
          <div className="flex flex-col">
            <label
              htmlFor="regUsername"
              className="text-white font-medium text-sm mb-1"
            >
              Username
            </label>
            <div className="relative">
              <FaUser className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                id="regUsername"
                placeholder="Enter username"
                className={`w-full pl-8 rounded-lg bg-white/85 px-3 py-2 text-gray-600 text-sm border outline-none focus:border-purple-400 transition duration-200 ${
                  usernameError ? "border-red-500" : "border-gray-300"
                }`}
                onChange={(e) => debouncedUsernameCheck(e.target.value.trim())}
              />
            </div>
            {usernameError && (
              <span className="text-xs text-red-600 mt-1">{usernameError}</span>
            )}
          </div>

          {/* Email + Contact */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <label
                htmlFor="regEmail"
                className="text-white font-medium text-sm mb-1"
              >
                Email
              </label>
              <div className="relative">
                <FaEnvelope className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="email"
                  id="regEmail"
                  placeholder="Enter email"
                  className={`w-full pl-8 rounded-lg bg-white/85 px-3 py-2 text-gray-600 text-sm border outline-none focus:border-purple-400 transition duration-200 ${
                    emailError ? "border-red-500" : "border-gray-300"
                  }`}
                  onChange={(e) => debouncedEmailCheck(e.target.value.trim())}
                />
              </div>
              {emailError && (
                <span className="text-xs text-red-600 mt-1">{emailError}</span>
              )}
            </div>

            <div className="flex flex-col">
              <label
                htmlFor="regContact"
                className="text-white font-medium text-sm mb-1"
              >
                Contact
              </label>
              <div className="relative">
                <FaPhone className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="text"
                  id="regContact"
                  value={contact}
                  onChange={(e) => {
                    setContact(e.target.value.trim());
                    debouncedContactCheck(e.target.value.trim());
                  }}
                  placeholder="Enter contact number"
                  className={`w-full pl-8 rounded-lg bg-white/85 px-3 py-2 text-gray-600 text-sm border outline-none focus:border-purple-400 transition duration-200 ${
                    contactError ? "border-red-500" : "border-gray-300"
                  }`}
                />
              </div>
              {contactError && (
                <span className="text-xs text-red-600 mt-1">
                  {contactError}
                </span>
              )}
            </div>
          </div>

          {/* Password + Confirm Password */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <label
                htmlFor="regPassword"
                className="text-white font-medium text-sm mb-1"
              >
                Password
              </label>
              <div className="relative">
                <FaLock className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="regPassword"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    debouncedPasswordCheck(e.target.value);
                  }}
                  placeholder="Enter password"
                  className={`w-full pl-8 pr-8 rounded-lg bg-white/85 px-3 py-2 text-gray-600 text-sm border outline-none focus:border-purple-400 transition duration-200 ${
                    passwordError ? "border-red-500" : "border-gray-300"
                  }`}
                />
                <span
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
              {passwordError && (
                <span className="text-xs text-red-600 mt-1">
                  {passwordError}
                </span>
              )}
            </div>

            <div className="flex flex-col">
              <label
                htmlFor="regConfirmPassword"
                className="text-white font-medium text-sm mb-1"
              >
                Confirm Password
              </label>
              <div className="relative">
                <FaLock className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="regConfirmPassword"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    debouncedConfirmPasswordCheck(e.target.value);
                  }}
                  placeholder="Confirm password"
                  className={`w-full pl-8 pr-8 rounded-lg bg-white/85 px-3 py-2 text-gray-600 text-sm border outline-none focus:border-purple-400 transition duration-200 ${
                    confirmPasswordError ? "border-red-500" : "border-gray-300"
                  }`}
                />
                <span
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
              {confirmPasswordError && (
                <span className="text-xs text-red-600 mt-1">
                  {confirmPasswordError}
                </span>
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white shadow-lg mt-4 hover:scale-105 hover:bg-purple-700 transition duration-300"
          >
            Register
          </button>
        </form>

        <p className="mt-5 text-center text-[15px] mb-[15px] font-semibold text-white">
          Already have an account?{" "}
          <span
            className="text-blue-500 cursor-pointer hover:text-blue-700 hover:underline"
            onClick={onSwitch}
          >
            Login
          </span>
        </p>

        {showToast && (
          <div
            className={`absolute top-[-50px] left-1/2 -translate-x-1/2 px-3 py-2 rounded-md text-white font-semibold shadow-lg ${toastColor} animate-toast`}
          >
            {toastMsg}
          </div>
        )}
      </div>
    </div>
  );
}
