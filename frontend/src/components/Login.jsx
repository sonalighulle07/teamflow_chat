import { useState, useEffect } from "react";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../Store/Features/Users/userThunks";

export default function Login({ onLogin }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading } = useSelector((state) => state.user);

  const [toastMsg, setToastMsg] = useState("");
  const [toastColor, setToastColor] = useState("bg-red-500");
  const [showToast, setShowToast] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [usernameValue, setUsernameValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");

  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setUsernameError(
        usernameValue && usernameValue.length < 3 ? "Incorrect username!" : ""
      );
    }, 800);
    return () => clearTimeout(handler);
  }, [usernameValue]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setPasswordError(
        passwordValue && passwordValue.length < 6 ? "Incorrect password!" : ""
      );
    }, 800);
    return () => clearTimeout(handler);
  }, [passwordValue]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usernameValue.trim() || !passwordValue.trim()) {
      showToastMessage("All fields are required!", "bg-red-500");
      return;
    }
    if (passwordValue.trim().length < 6) {
      showToastMessage("Password must be at least 6 characters!", "bg-red-500");
      return;
    }

    try {
      const resultAction = await dispatch(
        loginUser({ username: usernameValue, password: passwordValue })
      );

      if (loginUser.fulfilled.match(resultAction)) {
        showToastMessage("Login successful!", "bg-green-500");
        onLogin?.();

        const redirectPath = location.state?.from || "/";
        setTimeout(() => navigate(redirectPath), 500);
      } else {
        showToastMessage(resultAction.payload || "Login failed!", "bg-red-500");
      }
    } catch (err) {
      showToastMessage(err.message || "Login failed!", "bg-red-500");
    }
  };

  const showToastMessage = (msg, color) => {
    setToastMsg(msg);
    setToastColor(color);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-tl from-white to-purple-600 p-2">
      <div className="w-full max-w-md rounded-2xl bg-white/20 p-6 sm:p-8 shadow-xl backdrop-blur-md relative">
        <h2 className="mb-6 text-center text-2xl font-bold text-white">
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
                className="w-full pl-8 rounded-lg bg-white/85 px-3 py-2 text-gray-500 text-sm border-2 border-transparent outline-none focus:border-purple-400 focus:shadow-md transition duration-200"
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
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-8 pr-8 rounded-lg bg-white/85 px-3 py-2 text-gray-500 text-sm border-2 border-transparent outline-none focus:border-purple-400 focus:shadow-md transition duration-200"
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

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-purple-600 px-4 py-2 text-white shadow-lg hover:scale-105 hover:bg-purple-700 transition duration-300 disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-5 mb-3.5 text-center text-[15px] font-semibold text-white">
          Don't have an account?{" "}
          <span
            className="text-blue-500 cursor-pointer hover:text-blue-700 hover:underline"
            onClick={() => navigate("/register")}
          >
            Register
          </span>
        </p>

        {showToast && (
          <div
            className={`absolute top-[-50px] left-1/2 -translate-x-1/2 px-4 py-2 rounded-md text-white font-semibold shadow-lg ${toastColor}`}
          >
            {toastMsg}
          </div>
        )}
      </div>
    </div>
  );
}
