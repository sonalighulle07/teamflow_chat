import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { URL } from "../config";
import {
FaUser,
FaEnvelope,
FaPhone,
FaLock,
FaEye,
FaEyeSlash,
} from "react-icons/fa";
import { setCurrentUser } from "../Store/Features/Users/userSlice";
import { useDispatch } from "react-redux";

// Debounce helper
const debounce = (func, delay) => {
let timeout;
return (...args) => {
clearTimeout(timeout);
timeout = setTimeout(() => func(...args), delay);
};
};

export default function Register({ onRegister }) {
const dispatch = useDispatch();
const navigate = useNavigate();

// Toast
const [toastMsg, setToastMsg] = useState("");
const [toastColor, setToastColor] = useState("bg-red-500");
const [showToast, setShowToast] = useState(false);

// Form fields
const [fullName, setFullName] = useState("");
const [email, setEmail] = useState("");
const [username, setUsername] = useState("");
const [contact, setContact] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

// Errors
const [usernameError, setUsernameError] = useState("");
const [emailError, setEmailError] = useState("");
const [contactError, setContactError] = useState("");
const [passwordError, setPasswordError] = useState("");
const [confirmPasswordError, setConfirmPasswordError] = useState("");

// Visibility
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);

// Regex
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
const emailPattern = /^[^\s@]+@[^\s@]+.[^\s@]+$/;
const contactPattern = /^[0-9]{10,15}$/;

// Username availability
const checkUsernameAvailability = async (value) => {
if (!value) return setUsernameError("");
try {
const res = await fetch(`${URL}/api/auth/check-username?username=${value}`);
const data = await res.json();
setUsernameError(!data.available ? "Username already taken" : "");
} catch {
setUsernameError("Error checking username");
}
};

// Email availability
const checkEmailAvailability = async (value) => {
if (!value) return setEmailError("");
if (!emailPattern.test(value)) return setEmailError("Invalid email");
try {
const res = await fetch(`${URL}/api/auth/check-email?email=${value}`);
const data = await res.json();
setEmailError(!data.available ? "Email already used" : "");
} catch {
setEmailError("Error checking email");
}
};

// Field validation
const validateField = (field, value) => {
if (!value) return;

```
switch (field) {
  case "contact":
    setContactError(contactPattern.test(value) ? "" : "Invalid contact number");
    break;
  case "password":
    setPasswordError(
      passwordPattern.test(value)
        ? ""
        : "Password must be at least 8 characters and include a number"
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
```

};

// Debounced validations
const debouncedUsernameCheck = debounce(checkUsernameAvailability, 600);
const debouncedEmailCheck = debounce(checkEmailAvailability, 600);
const debouncedContactCheck = debounce((v) => validateField("contact", v), 600);
const debouncedPasswordCheck = debounce((v) => validateField("password", v), 600);
const debouncedConfirmPasswordCheck = debounce(
(v) => validateField("confirmPassword", v),
600
);

// Toast
const showToastMessage = (msg, color) => {
setToastMsg(msg);
setToastColor(color);
setShowToast(true);
setTimeout(() => setShowToast(false), 2000);
};

// Submit
const handleSubmit = async (e) => {
e.preventDefault();

if (
  !fullName ||
  !email ||
  !username ||
  !contact ||
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
  const res = await fetch(`${URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      full_name: fullName,
      email,
      contact,
      username,
      password,
    }),
  });

  const data = await res.json();
  const color = res.ok && data.success ? "bg-green-500" : "bg-red-500";

  showToastMessage(data.message || "Registration failed!", color);

  if (res.ok && data.success) {
    dispatch(setCurrentUser(data.user));
    sessionStorage.setItem("chatToken", data.token);
    onRegister?.();

    setTimeout(() => {
      navigate("/");
    }, 1000);
  }
} catch {
  showToastMessage("Server error, try again later.", "bg-red-500");
}

};


return ( <div className="flex h-screen w-full items-center justify-center bg-gradient-to-tl from-white to-purple-600 animate-fadeIn p-1"> <div className="w-full max-w-md rounded-2xl bg-white/20 p-4 sm:p-8 shadow-xl backdrop-blur-md animate-slideUp relative">


    <h2 className="mb-4 text-center text-2xl font-bold text-white tracking-wide">Register</h2>

    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {/* Full Name */}
      <div className="flex flex-col">
        <label className="text-white font-medium text-sm mb-1">Full Name</label>
        <div className="relative">
          <FaUser className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter full name"
            className="w-full pl-8 rounded-lg bg-white/85 px-3 py-2 text-gray-600 text-sm border border-gray-300 outline-none focus:border-purple-400"
          />
        </div>
      </div>

      {/* Username */}
      <div className="flex flex-col">
        <label className="text-white font-medium text-sm mb-1">Username</label>
        <div className="relative">
          <FaUser className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              debouncedUsernameCheck(e.target.value);
            }}
            placeholder="Enter username"
            className={`w-full pl-8 rounded-lg bg-white/85 px-3 py-2 text-gray-600 text-sm border outline-none focus:border-purple-400 ${
              usernameError ? "border-red-500" : "border-gray-300"
            }`}
          />
        </div>
        {usernameError && <span className="text-xs text-red-600 mt-1">{usernameError}</span>}
      </div>

      {/* Email + Contact */}
      <div className="grid grid-cols-2 gap-2">

        {/* Email */}
        <div className="flex flex-col">
          <label className="text-white font-medium text-sm mb-1">Email</label>
          <div className="relative">
            <FaEnvelope className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                debouncedEmailCheck(e.target.value);
              }}
              placeholder="Enter email"
              className={`w-full pl-8 rounded-lg bg-white/85 px-3 py-2 text-gray-600 text-sm border outline-none focus:border-purple-400 ${
                emailError ? "border-red-500" : "border-gray-300"
              }`}
            />
          </div>
          {emailError && <span className="text-xs text-red-600 mt-1">{emailError}</span>}
        </div>

        {/* Contact */}
        <div className="flex flex-col">
          <label className="text-white font-medium text-sm mb-1">Contact</label>
          <div className="relative">
            <FaPhone className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              value={contact}
              onChange={(e) => {
                setContact(e.target.value);
                debouncedContactCheck(e.target.value);
              }}
              placeholder="Enter contact"
              className={`w-full pl-8 rounded-lg bg-white/85 px-3 py-2 text-gray-600 text-sm border outline-none focus:border-purple-400 ${
                contactError ? "border-red-500" : "border-gray-300"
              }`}
            />
          </div>
          {contactError && <span className="text-xs text-red-600 mt-1">{contactError}</span>}
        </div>
      </div>

      {/* Password + Confirm */}
      <div className="grid grid-cols-2 gap-2">

        {/* Password */}
        <div className="flex flex-col">
          <label className="text-white font-medium text-sm mb-1">Password</label>
          <div className="relative">
            <FaLock className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                debouncedPasswordCheck(e.target.value);
              }}
              placeholder="Enter password"
              className={`w-full pl-8 pr-8 rounded-lg bg-white/85 px-3 py-2 text-gray-600 text-sm border outline-none focus:border-purple-400 ${
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
          {passwordError && <span className="text-xs text-red-600 mt-1">{passwordError}</span>}
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col">
          <label className="text-white font-medium text-sm mb-1">Confirm Password</label>
          <div className="relative">
            <FaLock className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                debouncedConfirmPasswordCheck(e.target.value);
              }}
              placeholder="Confirm password"
              className={`w-full pl-8 pr-8 rounded-lg bg-white/85 px-3 py-2 text-gray-600 text-sm border outline-none focus:border-purple-400 ${
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
            <span className="text-xs text-red-600 mt-1">{confirmPasswordError}</span>
          )}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={
          !fullName ||
          !email ||
          !username ||
          !contact ||
          !password ||
          !confirmPassword ||
          usernameError ||
          emailError ||
          contactError ||
          passwordError ||
          confirmPasswordError
        }
        className="w-full rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white shadow-lg mt-2 hover:scale-105 hover:bg-purple-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Register
      </button>

    </form>

    <p className="mt-5 text-center text-[15px] mb-[15px] font-semibold text-white">
      Already have an account?{" "}
      <span
        className="text-blue-500 cursor-pointer hover:text-blue-700 hover:underline"
        onClick={() => navigate("/login")}
      >
        Login
      </span>
    </p>

    {/* Toast */}
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
