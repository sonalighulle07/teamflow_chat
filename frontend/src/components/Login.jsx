import { useState, useEffect } from "react";
import { FaUser, FaLock } from "react-icons/fa";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function Login({ onLogin, onSwitch }) {
  const [toastMsg, setToastMsg] = useState("");
  const [toastColor, setToastColor] = useState("bg-red-500");
  const [showToast, setShowToast] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [usernameValue, setUsernameValue] = useState("");

  // New states for inline validation errors
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Debounce validation (runs after user stops typing)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (usernameValue && usernameValue.length < 3) {
        setUsernameError("Incorrect username!");
      } else {
        setUsernameError("");
      }
    }, 800); // 800ms after typing stops

    return () => clearTimeout(handler);
  }, [usernameValue]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (passwordValue && passwordValue.length < 6) {
        setPasswordError("Incorrect password!");
      } else {
        setPasswordError("");
      }
    }, 800);

    return () => clearTimeout(handler);
  }, [passwordValue]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const username = usernameValue.trim();
    const password = passwordValue.trim();

    if (!username || !password) {
      showToastMessage("All fields are required!", "bg-red-500");
      return;
    }
    if (password.length < 6) {
      showToastMessage("Password must be at least 6 characters!", "bg-red-500");
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      const color = res.ok && data.success ? "bg-green-500" : "bg-red-500";
      showToastMessage(
        data.message || (res.ok ? "Login successful!" : "Login failed!"),
        color
      );

      if (res.ok && data.success) {
        console.log("after login user : "+JSON.stringify(data.user))
        console.log("after login token : "+data.token)

        sessionStorage.setItem("chatUser", JSON.stringify(data.user));
        sessionStorage.setItem("chatToken", data.token);

        setTimeout(() => onLogin(), 1000);
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

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-tl from-white to-purple-600 animate-fadeIn overflow-hidden p-2">
      <div className="w-full max-w-md rounded-2xl bg-white/20 p-6 sm:p-8 shadow-xl backdrop-blur-md animate-slideUp relative">
        <h2 className="mb-6 text-center text-2xl font-bold text-white tracking-wide">
          Login
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Username */}
          <div className="relative flex flex-col">
            <label
              htmlFor="loginUsername"
              className="text-white font-medium text-sm mb-1"
            >
              Username
            </label>
            <div className="relative">
              <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <FaUser className="text-gray-400 text-sm" />
              </div>
              <input
                type="text"
                id="loginUsername"
                value={usernameValue}
                onChange={(e) => setUsernameValue(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-8 rounded-lg bg-white/85 px-3 py-2 text-gray-500 text-sm border-2 border-transparent outline-none focus:border-purple-400 focus:shadow-md focus:shadow-purple-400 transition duration-200"
              />
            </div>
            {usernameError && (
              <span className="text-red-500 text-xs mt-1">{usernameError}</span>
            )}
          </div>

          {/* Password */}
          <div className="relative flex flex-col">
            <label
              htmlFor="loginPassword"
              className="text-white font-medium text-sm mb-1"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <FaLock className="text-gray-400 text-sm" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                id="loginPassword"
                placeholder="Enter password"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                className="w-full pl-8 pr-8 rounded-lg bg-white/85 px-3 py-2 text-gray-500 text-sm border-2 border-transparent outline-none focus:border-purple-400 focus:shadow-md focus:shadow-purple-400 transition duration-200"
              />
              {passwordValue && (
                <div
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 hover:text-purple-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </div>
              )}
            </div>
            {passwordError && (
              <span className="text-red-500 text-xs mt-1">{passwordError}</span>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white shadow-lg hover:scale-105 hover:bg-purple-700 transition duration-300"
          >
            Login
          </button>
        </form>

        {/* Switch to register */}
        <p className="mt-5 mb-3.5 text-center text-[15px] font-semibold text-white">
          Don't have an account?{" "}
          <span
            className="text-blue-500 cursor-pointer hover:text-blue-700 hover:underline"
            onClick={onSwitch}
          >
            Register
          </span>
        </p>

        {/* Toast Notification */}
        {showToast && (
          <div
            className={`absolute top-[-50px] left-1/2 -translate-x-1/2 px-4 py-2 rounded-md text-white font-semibold shadow-lg ${toastColor} animate-toast`}
          >
            {toastMsg}
          </div>
        )}
      </div>
    </div>
  );
}
