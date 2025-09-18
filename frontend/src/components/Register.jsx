import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerMsg, setRegisterMsg] = useState("");
  const [msgColor, setMsgColor] = useState("text-red-500"); // default error color

  const handleSubmit = async (e) => {
    e.preventDefault();

    const firstName = document.getElementById("regFirstName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const contact = document.getElementById("regContact").value.trim();
    const username = document.getElementById("regUsername").value.trim();
    const password = document.getElementById("regPassword").value.trim();
    const confirmPassword = document.getElementById("regConfirmPassword").value.trim();

    if (password !== confirmPassword) {
      setMsgColor("text-red-500");
      setRegisterMsg("Passwords do not match!");
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, email, contact, username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMsgColor("text-green-500");
        setRegisterMsg(data.message || "Registration successful!");

        sessionStorage.setItem("chatUserId", data.user.id);
        sessionStorage.setItem("chatUsername", data.user.username);
        sessionStorage.setItem("chatToken", data.token);

        setTimeout(() => {
          window.location.href = "index.html";
        }, 1500);
      } else {
        setMsgColor("text-red-500");
        setRegisterMsg(data.message || "Registration failed");
      }
    } catch (err) {
      console.error("Request failed:", err);
      setMsgColor("text-red-500");
      setRegisterMsg("Network error or server unavailable.");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-tl from-white to-purple-600 animate-fadeIn">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.7s ease-in-out; }
        .animate-slideUp { animation: slideUp 0.8s ease; }
      `}</style>

      <div className="w-[350px] rounded-2xl bg-white/20 p-10 shadow-xl backdrop-blur-md animate-slideUp">
        <h2 className="mb-5 text-center text-2xl font-semibold text-white tracking-wide">
          Register
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            id="regFirstName"
            placeholder="First Name"
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

          <div className="relative mb-4">
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

          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="regConfirmPassword"
              placeholder="Confirm Password"
              required
              className="w-full rounded-lg border-none bg-white/85 px-4 py-3 pr-10 text-sm text-gray-800 outline-none focus:border-2 focus:border-purple-400 focus:shadow-md focus:shadow-purple-500"
            />
            {showConfirmPassword ? (
              <EyeSlashIcon
                className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 cursor-pointer text-gray-700"
                onClick={() => setShowConfirmPassword(false)}
              />
            ) : (
              <EyeIcon
                className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 cursor-pointer text-gray-700"
                onClick={() => setShowConfirmPassword(true)}
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
          <p className={`mt-3 text-center font-semibold ${msgColor}`}>
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
