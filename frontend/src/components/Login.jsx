import { useState, useEffect } from "react";
import { FaUser, FaLock } from "react-icons/fa";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../Store/Features/Users/userThunks";

export default function Login({ onLogin, onSwitch }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { currentUser, loading, error } = useSelector((state) => state.user);

  const [toastMsg, setToastMsg] = useState("");
  const [toastColor, setToastColor] = useState("bg-red-500");
  const [showToast, setShowToast] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [usernameValue, setUsernameValue] = useState("");

  // Validation states
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Debounce username validation
  useEffect(() => {
    const handler = setTimeout(() => {
      if (usernameValue && usernameValue.length < 3) {
        setUsernameError("Incorrect username!");
      } else {
        setUsernameError("");
      }
    }, 800);
    return () => clearTimeout(handler);
  }, [usernameValue]);

  // Debounce password validation
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

  // Handle submit with thunk
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

    const resultAction = await dispatch(loginUser({ username, password }));


    if (loginUser.fulfilled.match(resultAction)) {
      showToastMessage("Login successful!", "bg-green-500");
      console.log("current user : "+JSON.stringify(currentUser));
      setTimeout(() => {
        onLogin?.();
        setTimeout(()=>{navigate("/")},10000);
        
      }, 1000);
    } else {
      showToastMessage(resultAction.payload || "Login failed!", "bg-red-500");
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
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white shadow-lg hover:scale-105 hover:bg-purple-700 transition duration-300 disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
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
