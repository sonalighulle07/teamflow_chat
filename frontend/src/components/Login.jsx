import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loginMsg, setLoginMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        sessionStorage.setItem("chatUserId", data.id);
        sessionStorage.setItem("chatUsername", data.username);
        sessionStorage.setItem("chatToken", data.token);
        window.location.href = "index.html";
      } else {
        setLoginMsg(data.error || "Login failed");
      }
    } catch (err) {
      setLoginMsg("Server error, try again later.");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-tl from-white to-purple-600 animate-fadeIn">
      {/* Custom animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.7s ease-in-out;
        }
        .animate-slideUp {
          animation: slideUp 0.8s ease;
        }
      `}</style>

      <div className="w-[400px] rounded-2xl bg-white/20 p-10 shadow-xl backdrop-blur-md animate-slideUp">
        <h2 className="mb-5 text-center text-2xl font-semibold text-white tracking-wide">
          Login
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            id="loginUsername"
            placeholder="Username"
            required
            className="w-full rounded-lg border-none bg-white/85 px-4 py-3 text-sm text-gray-800 outline-none focus:border-2 focus:border-purple-400 focus:shadow-md focus:shadow-purple-500"
          />

          <div className="relative mt-4">
            <input
              type={showPassword ? "text" : "password"}
              id="loginPassword"
              placeholder="Password"
              required
              className="w-full rounded-lg border-none bg-white/85 px-4 py-3 pr-10 text-sm text-gray-800 outline-none focus:border-2 focus:border-purple-400 focus:shadow-md focus:shadow-purple-500"
            />
            {showPassword ? (
              <EyeSlashIcon
                className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 cursor-pointer text-gray-700"
                onClick={() => setShowPassword(false)}
              />
            ) : (
              <EyeIcon
                className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 cursor-pointer text-gray-700"
                onClick={() => setShowPassword(true)}
              />
            )}
          </div>

          <button
            type="submit"
            className="mt-5 w-full transform rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white shadow-lg transition duration-300 ease-in-out hover:scale-105 hover:bg-purple-700"
          >
            Login
          </button>
        </form>

        {loginMsg && (
          <p className="mt-3 text-center font-semibold text-red-500 hover:text-blue-600">
            {loginMsg}
          </p>
        )}

        <a
          href="register.html"
          className="mt-4 block text-center text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline"
        >
          Register here
        </a>
      </div>
    </div>
  );
}
