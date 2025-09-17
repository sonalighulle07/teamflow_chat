import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [registerMsg, setRegisterMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const username = document.getElementById("regUsername").value.trim();
    const password = document.getElementById("regPassword").value.trim();

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      let data = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch (err) {
        console.warn("Response was not JSON:", err);
      }

      if (res.ok) {
        sessionStorage.setItem("chatUserId", data.id);
        sessionStorage.setItem("chatUsername", data.username);
        sessionStorage.setItem("chatToken", data.token);
        window.location.href = "index.html";
      } else {
        setRegisterMsg(data.error || "Registration failed");
      }
    } catch (err) {
      console.error("Request failed:", err);
      setRegisterMsg("Network error or server unavailable.");
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

      <div className="w-[350px] rounded-2xl bg-white/20 p-10 shadow-xl backdrop-blur-md animate-slideUp">
        <h2 className="mb-5 text-center text-2xl font-semibold text-white tracking-wide">
          Register
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            id="regUsername"
            placeholder="Username"
            required
            className="w-full rounded-lg border-none bg-white/85 px-4 py-3 text-sm text-gray-800 outline-none focus:border-2 focus:border-purple-400 focus:shadow-md focus:shadow-purple-500"
          />

          <div className="relative mt-4">
            <input
              type={showPassword ? "text" : "password"}
              id="regPassword"
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
            Register
          </button>
        </form>

        {registerMsg && (
          <p className="mt-3 text-center font-semibold text-red-500">
            {registerMsg}
          </p>
        )}

        <a
          href="login.html"
          className="mt-4 block text-center text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline"
        >
          Login here
        </a>
      </div>
    </div>
  );
}
