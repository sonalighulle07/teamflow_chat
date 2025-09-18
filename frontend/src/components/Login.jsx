import { useState } from "react";

export default function Login({ onLogin, onSwitch }) {
  const [toastMsg, setToastMsg] = useState("");
  const [toastColor, setToastColor] = useState("bg-red-500");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    try {
      const res = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      // Show message
      setToastColor(res.ok && data.success ? "bg-green-500" : "bg-red-500");
      setToastMsg(data.message || (res.ok ? "Login successful!" : "Login failed!"));

      // Auto-hide after 2 seconds
      setTimeout(() => setToastMsg(""), 2000);

      if (res.ok && data.success) {
        sessionStorage.setItem("chatUserId", data.user.id);
        sessionStorage.setItem("chatUsername", data.user.username);
        sessionStorage.setItem("chatToken", data.token);

        // Switch to chat component after short delay (so user sees message)
        setTimeout(() => onLogin(), 1000);
      }
    } catch (err) {
      setToastColor("bg-red-500");
      setToastMsg("Server error, try again later.");
      setTimeout(() => setToastMsg(""), 2000);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-tl from-white to-purple-600 animate-fadeIn relative">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.7s ease-in-out; }
        .animate-slideUp { animation: slideUp 0.8s ease; }
      `}</style>

      <div className="w-[400px] rounded-2xl bg-white/20 p-10 shadow-xl backdrop-blur-md animate-slideUp relative">
        <h2 className="mb-5 text-center text-2xl font-semibold text-white tracking-wide">
          Login
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            id="loginUsername"
            placeholder="Username"
            required
            className="w-full rounded-lg border-none bg-white/85 px-4 py-3 mb-4 text-sm text-gray-800 outline-none focus:border-2 focus:border-purple-400 focus:shadow-md focus:shadow-purple-500"
          />

          <input
            type="password"
            id="loginPassword"
            placeholder="Password"
            required
            className="w-full rounded-lg border-none bg-white/85 px-4 py-3 text-sm text-gray-800 outline-none focus:border-2 focus:border-purple-400 focus:shadow-md focus:shadow-purple-500"
          />

          <button
            type="submit"
            className="mt-5 w-full transform rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white shadow-lg transition duration-300 ease-in-out hover:scale-105 hover:bg-purple-700"
          >
            Login
          </button>
        </form>

        <p
          className="mt-4 text-center text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          onClick={onSwitch}
        >
          Don't have an account? Register
        </p>

        {/* Inline message */}
        {toastMsg && (
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
