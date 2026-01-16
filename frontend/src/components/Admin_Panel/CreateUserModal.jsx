import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setCurrentUser } from "../../Store/Features/Users/userSlice";
import { URL } from "../../config";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaUserCheck,
} from "react-icons/fa";

export default function CreateUserModal({
  onClose,
  onUserCreated,
  defaultRole,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // --- Form fields ---
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState(defaultRole || "user");

  // --- Errors ---
  const [fullNameError, setFullNameError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [contactError, setContactError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  // --- Password visibility ---
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // --- Toast ---
  const [toastMsg, setToastMsg] = useState("");
  const [toastColor, setToastColor] = useState("bg-red-500");
  const [showToast, setShowToast] = useState(false);

  // --- Debounce helper ---
  const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  // --- Regex patterns ---
  const namePattern = /^[A-Za-z ]{3,}$/;
  const usernamePattern = /^[a-zA-Z0-9_]{3,}$/;
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;
  const contactPattern = /^[6-9]\d{9}$/;
  const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

  // --- Field validation function ---
  const validateField = (field, value, passwordValue = "") => {
    switch (field) {
      case "fullName":
        return namePattern.test(value) ? "" : "Enter a valid full name";

      case "username":
        return usernamePattern.test(value) ? "" : "Invalid username";

      case "email":
        return emailPattern.test(value) ? "" : "Invalid email address";

      case "contact":
        return contactPattern.test(value) ? "" : "Invalid mobile number";

      case "password":
        return passwordPattern.test(value)
          ? ""
          : "Password must be 8+ characters and include a number";

      case "confirmPassword":
        return value === passwordValue ? "" : "Passwords do not match";

      default:
        return "";
    }
  };

  // --- Debounced validations ---
  const debouncedFullNameCheck = debounce(
    (v) => setFullNameError(validateField("fullName", v)),
    500
  );
  const debouncedUsernameCheck = debounce(
    (v) => setUsernameError(validateField("username", v)),
    500
  );
  const debouncedEmailCheck = debounce(
    (v) => setEmailError(validateField("email", v)),
    500
  );
  const debouncedContactCheck = debounce(
    (v) => setContactError(validateField("contact", v)),
    500
  );
  const debouncedPasswordCheck = debounce(
    (v) => setPasswordError(validateField("password", v)),
    500
  );
  const debouncedConfirmPasswordCheck = debounce(
    (v) =>
      setConfirmPasswordError(validateField("confirmPassword", v, password)),
    500
  );

  // --- Toast helper ---
  const showToastMessage = (msg, color = "bg-red-500") => {
    setToastMsg(msg);
    setToastColor(color);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // --- Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields before submitting
    const fNameErr = validateField("fullName", fullName);
    const usernameErr = validateField("username", username);
    const emailErr = validateField("email", email);
    const contactErr = validateField("contact", contact);
    const passErr = validateField("password", password);
    const confirmPassErr = validateField(
      "confirmPassword",
      confirmPassword,
      password
    );

    setFullNameError(fNameErr);
    setUsernameError(usernameErr);
    setEmailError(emailErr);
    setContactError(contactErr);
    setPasswordError(passErr);
    setConfirmPasswordError(confirmPassErr);

    if (
      fNameErr ||
      usernameErr ||
      emailErr ||
      contactErr ||
      passErr ||
      confirmPassErr
    ) {
      showToastMessage("Fix the errors before submitting!");
      return;
    }

    if (role === "super_admin") {
      showToastMessage("Super Admin cannot be created!");
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
          role,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onUserCreated?.();
        onClose?.();
      } else {
        showToastMessage(data.message || "Failed to create user");
      }
    } catch (err) {
      console.error(err);
      showToastMessage("Server error, try again later!");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Card */}
      <div className="relative w-[460px] bg-[#F2F2F2] border border-[#E4E4E4] rounded-[12px] px-10 py-8">
        {/* Header */}
        <div className="relative text-center mb-6">
          <h2 className="text-[18px] text-[#696969]">Create User</h2>
          <button
            onClick={onClose}
            className="absolute right-[-15px] top-[-15px] text-[#8a8a8a] text-xl"
          >
            ×
          </button>
        </div>

        {/* Full Name */}
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">Full Name</label>
          <div className="flex items-center gap-2 bg-white h-[40px] rounded-[8px] px-3">
            <FaUser className="text-gray-400 text-sm" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                debouncedFullNameCheck(e.target.value);
              }}
              placeholder="Enter full name"
              className="w-full text-sm text-gray-500 outline-none placeholder:text-[#b5b3b3]"
            />
          </div>
          {fullNameError && (
            <p className="text-xs text-red-600 mt-1">{fullNameError}</p>
          )}
        </div>

        {/* Username */}
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">Username</label>
          <div className="flex items-center gap-2 bg-white h-[40px] rounded-[8px] px-3">
            <FaUserCheck className="text-gray-400 text-sm" />
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                debouncedUsernameCheck(e.target.value);
              }}
              placeholder="Enter username"
              className="w-full text-sm text-gray-500 outline-none placeholder:text-[#b5b3b3]"
            />
          </div>
          {usernameError && (
            <p className="text-xs text-red-600 mt-1">{usernameError}</p>
          )}
        </div>

        {/* Email & Contact */}
        <div className="grid grid-cols-2 gap-3">
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <div className="flex items-center gap-2 bg-white h-[40px] rounded-[8px] px-3">
              <FaEnvelope className="text-gray-400 text-sm" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  debouncedEmailCheck(e.target.value);
                }}
                placeholder="Enter email"
                className="w-full text-sm text-gray-500 outline-none placeholder:text-[#b5b3b3]"
              />
            </div>
            {emailError && (
              <p className="text-xs text-red-600 mt-1">{emailError}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">Contact</label>
            <div className="flex items-center gap-2 bg-white h-[40px] rounded-[8px] px-3">
              <FaPhone className="text-gray-400 text-sm rotate-90" />
              <input
                type="text"
                value={contact}
                onChange={(e) => {
                  setContact(e.target.value);
                  debouncedContactCheck(e.target.value);
                }}
                placeholder="Enter mobile"
                className="w-full text-sm text-gray-500 outline-none placeholder:text-[#b5b3b3]"
              />
            </div>
            {contactError && (
              <p className="text-xs text-red-600 mt-1">{contactError}</p>
            )}
          </div>
        </div>

        {/* Passwords */}
        <div className="grid grid-cols-2 gap-3">
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <div className="flex items-center gap-2 bg-white h-[40px] rounded-[8px] px-3">
              <FaLock className="text-gray-400 text-sm" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  debouncedPasswordCheck(e.target.value);
                }}
                placeholder="Enter password"
                className="w-full text-sm text-gray-500 outline-none"
              />
              <span
                className="cursor-pointer text-gray-400"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            {passwordError && (
              <p className="text-xs text-red-600 mt-1">{passwordError}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">
              Confirm Password
            </label>
            <div className="flex items-center gap-2 bg-white h-[40px] rounded-[8px] px-3">
              <FaLock className="text-gray-400 text-sm" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  debouncedConfirmPasswordCheck(e.target.value);
                }}
                placeholder="Confirm password"
                className="w-full text-sm text-gray-500 outline-none"
              />
              <span
                className="cursor-pointer text-gray-400"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            {confirmPasswordError && (
              <p className="text-xs text-red-600 mt-1">
                {confirmPasswordError}
              </p>
            )}
          </div>
        </div>

        {/* Role */}
        <div className="mb-6">
          <label className="block text-sm text-gray-600 mb-1">
            Select Role
          </label>
          <select
            disabled
            value={role}
            className="w-full h-[40px] rounded-[8px] bg-white px-3 text-sm text-gray-600 cursor-not-allowed "
          >
            <option value={role}>
              {role === "org_admin" ? "Organization Admin" : "User"}
            </option>
          </select>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            onClick={handleSubmit}
            className="w-full h-[44px] rounded-[8px] bg-[#999EFA] hover:bg-[#8c92ff] text-white"
          >
            Save
          </button>
        </div>

        {/* Toast */}
        {showToast && (
          <div
            className={`absolute top-[-50px] left-1/2 -translate-x-1/2 px-3 py-2 rounded-md text-white font-semibold shadow-lg ${toastColor}`}
          >
            {toastMsg}
          </div>
        )}
      </div>
    </div>
  );
}
