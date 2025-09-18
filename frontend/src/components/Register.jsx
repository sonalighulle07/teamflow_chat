import { useState } from "react";

export default function Register({ onRegister, onSwitch }) {
  const [toastMsg, setToastMsg] = useState("");
  const [toastColor, setToastColor] = useState("bg-red-500");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const full_name = document.getElementById("regFullName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const contact = document.getElementById("regContact").value.trim();
    const username = document.getElementById("regUsername").value.trim();
    const password = document.getElementById("regPassword").value.trim();
    const confirmPassword = document.getElementById("regConfirmPassword").value.trim();

    if (password !== confirmPassword) {
      setToastColor("bg-red-500");
      setToastMsg("Passwords do not match!");
      setTimeout(() => setToastMsg(""), 2000);
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name, email, contact, username, password }),
      });

      const data = await res.json();

      setToastColor(res.ok && data.success ? "bg-green-500" : "bg-red-500");
      setToastMsg(data.message || (res.ok ? "Registration successful!" : "Registration failed!"));

      // Auto-hide message
      setTimeout(() => setToastMsg(""), 2000);

      if (res.ok && data.success) {
        sessionStorage.setItem("chatUserId", data.user.id);
        sessionStorage.setItem("chatUsername", data.user.username);
        sessionStorage.setItem("chatToken", data.token);

        // Switch to chat component after short delay
        setTimeout(() => onRegister(), 1000);
      }
    } catch (err) {
      console.error(err);
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
          Register
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            id="regFullName"
            placeholder="Full Name"
            required
            className="w-full rounded-lg border-none bg-white/85 px-4 py-3 mb-4 text-sm text-gray-800 outline-none focus:border-2 focus:border-purple-400 focus:shadow-md focus:shadow-purple-500"
          />
          <input
            type="email"
            id="regEmail"
            placeholder="Email"
            required
            className="w-full rounded-lg border-none bg-white/85 px-4 py-3 mb-4 text-sm text-gray-800 outline-none focus:border-2 focus:border-purple-400 focus:shadow-md focus:shadow-purple-500"
          />
          <input
            type="text"
            id="regContact"
            placeholder="Contact"
            required
            className="w-full rounded-lg border-none bg-white/85 px-4 py-3 mb-4 text-sm text-gray-800 outline-none focus:border-2 focus:border-purple-400 focus:shadow-md focus:shadow-purple-500"
          />
          <input
            type="text"
            id="regUsername"
            placeholder="Username"
            required
            className="w-full rounded-lg border-none bg-white/85 px-4 py-3 mb-4 text-sm text-gray-800 outline-none focus:border-2 focus:border-purple-400 focus:shadow-md focus:shadow-purple-500"
          />
          <input
            type="password"
            id="regPassword"
            placeholder="Password"
            required
            className="w-full rounded-lg border-none bg-white/85 px-4 py-3 mb-4 text-sm text-gray-800 outline-none focus:border-2 focus:border-purple-400 focus:shadow-md focus:shadow-purple-500"
          />
          <input
            type="password"
            id="regConfirmPassword"
            placeholder="Confirm Password"
            required
            className="w-full rounded-lg border-none bg-white/85 px-4 py-3 text-sm text-gray-800 outline-none focus:border-2 focus:border-purple-400 focus:shadow-md focus:shadow-purple-500"
          />

          <button
            type="submit"
            className="mt-5 w-full transform rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white shadow-lg transition duration-300 ease-in-out hover:scale-105 hover:bg-purple-700"
          >
            Register
          </button>
        </form>

        <p
          className="mt-4 text-center text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          onClick={onSwitch}
        >
          Already have an account? Login
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
