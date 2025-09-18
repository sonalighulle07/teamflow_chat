import { useState } from "react";
import { FaUser, FaEnvelope, FaPhone, FaLock } from "react-icons/fa";
import { FaEye, FaEyeSlash } from "react-icons/fa";

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
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Tooltip messages
  const [hoverMsg, setHoverMsg] = useState({
    username: "",
    email: "",
    contact: "",
    password: "",
    confirmPassword: "",
  });

  // Regex patterns
  const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const contactPattern = /^[0-9]{10,15}$/;

  // Show tooltip
  const showHoverMsg = (field, msg) => {
    setHoverMsg((prev) => ({ ...prev, [field]: msg }));
    setTimeout(() => setHoverMsg((prev) => ({ ...prev, [field]: "" })), 3000);
  };

  // Check username availability
  const checkUsernameAvailability = async (username) => {
    if (!username) {
      setUsernameAvailable(null);
      return;
    }
    try {
      const res = await fetch(
        `http://localhost:3000/api/auth/check-username?username=${username}`
      );
      const data = await res.json();
      setUsernameAvailable(data.available);
      showHoverMsg(
        "username",
        data.available ? "Username available ✅" : "Username taken ❌"
      );
    } catch (err) {
      console.error(err);
      showHoverMsg("username", "Error checking username");
    }
  };

  // Check email availability
  const checkEmailAvailability = async (email) => {
    if (!email) {
      setEmailAvailable(null);
      return;
    }
    try {
      const res = await fetch(
        `http://localhost:3000/api/auth/check-email?email=${email}`
      );
      const data = await res.json();
      const valid = data.available && emailPattern.test(email);
      setEmailAvailable(valid);
      showHoverMsg(
        "email",
        valid ? "Email available ✅" : "Email invalid or taken ❌"
      );
    } catch (err) {
      console.error(err);
      showHoverMsg("email", "Error checking email");
    }
  };

  // Field validation
  const handleBlurValidation = (field, value) => {
    switch (field) {
      case "contact":
        showHoverMsg(
          "contact",
          contactPattern.test(value) ? "Valid contact ✅" : "Invalid contact ❌"
        );
        break;
      case "password":
        showHoverMsg(
          "password",
          passwordPattern.test(value)
            ? "Valid password ✅"
            : "Password must be 8+ chars, letters & numbers ❌"
        );
        break;
      case "confirmPassword":
        showHoverMsg(
          "confirmPassword",
          password === confirmPassword
            ? "Passwords match ✅"
            : "Passwords do not match ❌"
        );
        break;
    }
  };

  // Debounced validation
  const debouncedUsernameCheck = debounce(checkUsernameAvailability, 500);
  const debouncedEmailCheck = debounce(checkEmailAvailability, 500);
  const debouncedContactCheck = debounce(
    (value) => handleBlurValidation("contact", value),
    500
  );
  const debouncedPasswordCheck = debounce(
    (value) => handleBlurValidation("password", value),
    500
  );
  const debouncedConfirmPasswordCheck = debounce(
    (value) => handleBlurValidation("confirmPassword", value),
    500
  );

  // Form submission
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

    if (usernameAvailable === false) {
      showToastMessage("Username already taken!", "bg-red-500");
      return;
    }

    if (emailAvailable === false) {
      showToastMessage("Email already registered or invalid!", "bg-red-500");
      return;
    }

    if (!contactPattern.test(contact)) {
      showToastMessage("Invalid contact number!", "bg-red-500");
      return;
    }

    if (!passwordPattern.test(password)) {
      showToastMessage(
        "Password must be 8+ chars, include letters & numbers, no symbols!",
        "bg-red-500"
      );
      return;
    }

    if (password !== confirmPassword) {
      showToastMessage("Passwords do not match!", "bg-red-500");
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
    } catch (err) {
      console.error(err);
      showToastMessage("Server error, try again later.", "bg-red-500");
    }
  };

  const showToastMessage = (msg, color) => {
    setToastMsg(msg);
    setToastColor(color);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const renderTooltip = (msg) => {
    if (!msg) return null;
    const isError = msg.includes("❌");
    return (
      <div
        className={`absolute right-0 top-1/2 -translate-y-1/2 px-2 py-1 rounded shadow-lg z-10 whitespace-nowrap text-xs font-semibold ${
          isError ? "bg-red-500 text-white" : "bg-green-500 text-white"
        }`}
      >
        {msg}
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-tl from-white to-purple-600 animate-fadeIn p-2">
      <div className="w-full max-w-md rounded-2xl bg-white/20 p-6 sm:p-8 shadow-xl backdrop-blur-md animate-slideUp relative">
        <h2 className="mb-6 text-center text-2xl font-bold text-white tracking-wide">
          Register
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Full Name */}
          <div className="relative flex flex-col">
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
                className="w-full pl-8 rounded-lg bg-white/85 px-3 py-2 text-gray-500 text-sm border-2 border-transparent outline-none focus:border-purple-300 focus:shadow-md focus:shadow-purple-300 transition duration-200"
              />
            </div>
          </div>

          {/* Username */}
          <div className="relative flex flex-col">
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
                className={`w-full pl-8 rounded-lg bg-white/85 px-3 py-2 text-gray-500 text-sm border-2 border-transparent outline-none focus:border-purple-300 focus:shadow-md focus:shadow-purple-300 transition duration-200 ${
                  usernameAvailable === false
                    ? "border-red-500"
                    : usernameAvailable
                    ? "border-green-500"
                    : ""
                }`}
                onChange={(e) => debouncedUsernameCheck(e.target.value.trim())}
              />
              {hoverMsg.username && renderTooltip(hoverMsg.username)}
            </div>
          </div>

          {/* Email + Contact */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative flex flex-col">
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
                  className={`w-full pl-8 rounded-lg bg-white/85 px-3 py-2 text-gray-500 text-sm border-2 border-transparent outline-none focus:border-purple-300 focus:shadow-md focus:shadow-purple-300 transition duration-200 ${
                    emailAvailable === false
                      ? "border-red-500"
                      : emailAvailable
                      ? "border-green-500"
                      : ""
                  }`}
                  onChange={(e) => debouncedEmailCheck(e.target.value.trim())}
                />
              </div>
              {hoverMsg.email && renderTooltip(hoverMsg.email)}
            </div>

            <div className="relative flex flex-col">
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
                  className="w-full pl-8 rounded-lg bg-white/85 px-3 py-2 text-gray-500 text-sm border-2 border-transparent outline-none focus:border-purple-300 focus:shadow-md focus:shadow-purple-300 transition duration-200"
                />
              </div>
            </div>
          </div>

          {/* Password + Confirm Password */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative flex flex-col">
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
                  className="w-full pl-8 pr-8 rounded-lg bg-white/85 px-3 py-2 text-gray-500 text-sm border-2 border-transparent outline-none focus:border-purple-300 focus:shadow-md focus:shadow-purple-300 transition duration-200"
                />
              </div>
              {hoverMsg.password && renderTooltip(hoverMsg.password)}
            </div>

            <div className="relative flex flex-col">
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
                  className="w-full pl-8 pr-8 rounded-lg bg-white/85 px-3 py-2 text-gray-500 text-sm border-2 border-transparent outline-none focus:border-purple-300 focus:shadow-md focus:shadow-purple-300 transition duration-200"
                />
              </div>
              {hoverMsg.confirmPassword &&
                renderTooltip(hoverMsg.confirmPassword)}
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
