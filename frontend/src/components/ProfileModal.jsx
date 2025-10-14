import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCamera,
  FaTrash,
  FaSignOutAlt,
  FaUserPlus,
  FaTimes,
} from "react-icons/fa";
import Register from "./Register";
import { URL } from "../config";
 
export default function ProfileModal({
  user,
  onClose,
  onLogout,
  setProfileImage,
}) {
  if (!user) return null;
 
  const [showRegister, setShowRegister] = useState(false);
  const [preview, setPreview] = useState(() => {
    return (
      localStorage.getItem("profileImage") ||
      (user.profile_image ? `${URL}${user.profile_image}` : null)
    );
  });
 
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    // Use a user-specific key for localStorage
    const stored = localStorage.getItem(`profileImage_${user.id}`);
    if (stored) setPreview(stored);
    else if (user.profile_image) setPreview(`${URL}${user.profile_image}`);
    else setPreview(null);
  }, [user.id, user.profile_image]);
 
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("profile_image", file);
      formData.append("userId", user.id);
 
      const res = await fetch(`${URL}/api/users/avatar`, {
        method: "POST",
        body: formData,
      });
 
      const data = await res.json();
 
      if (!data.error && data.profile_image) {
        const newPath = `${URL}${data.profile_image}`;
        setPreview(newPath);
 
        // Save in user-specific localStorage key
        setProfileImage?.(newPath);
        localStorage.setItem(`profileImage_${user.id}`, newPath);
      } else {
        alert(data.message || "Failed to upload image");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading image");
    } finally {
      setLoading(false);
    }
  };
 
  const handleRemoveImage = async () => {
    if (!preview) return;
    if (!window.confirm("Are you sure you want to remove your profile photo?"))
      return;
    setLoading(true);
    try {
      const res = await fetch(`${URL}/api/users/remove-avatar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        setPreview(null);
        setProfileImage?.(null);
      } else alert(data.message || "Failed to remove avatar");
    } catch (err) {
      console.error(err);
      alert("Error removing avatar");
    } finally {
      setLoading(false);
    }
  };
 
  const handleDeleteAccount = async () => {
    if (!window.confirm("This will delete your account permanently. Continue?"))
      return;
    setLoading(true);
    try {
      const res = await fetch(`${URL}/api/users/delete-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        setPreview(null);
        setProfileImage?.(null);
        navigate("/register");
      } else alert(data.message || "Failed to delete account");
    } catch (err) {
      console.error(err);
      alert("Error deleting account");
    } finally {
      setLoading(false);
    }
  };
 
  if (showRegister)
    return (
      <Register onRegister={onClose} onSwitch={() => setShowRegister(false)} />
    );
 
  return (
    <div className="fixed inset-0 z-50 flex justify-end items-start pointer-events-none">
      {/* Background blur overlay */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-none  "
        onClick={onClose}
      ></div>
 
      {/* Panel */}
      <div className="relative mt-16 mr-4 w-72 bg-white shadow-xl rounded-xl p-5 pointer-events-auto animate-fadeIn">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition"
        >
          <FaTimes size={18} />
        </button>
 
        {/* Avatar */}
        <div className="flex flex-col items-center mt-3">
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
            {preview ? (
              <img
                src={preview}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-gray-300 text-gray-600 text-3xl font-bold">
                {user.username?.[0]?.toUpperCase() || ""}
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition">
              <FaCamera size={14} />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={loading}
              />
            </label>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-gray-800">
            {user.full_name}
          </h2>
          {user.username && (
            <p className="text-gray-500 text-sm">@{user.username}</p>
          )}
        </div>
 
        {/* Action Buttons */}
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={handleRemoveImage}
            disabled={!preview || loading}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaTrash /> Remove Photo
          </button>
 
          <button
            onClick={onLogout}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-red-500 text-white hover:bg-red-600 transition"
          >
            <FaSignOutAlt /> Sign Out
          </button>
 
          <button
            onClick={handleDeleteAccount}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-gray-800 text-white hover:bg-gray-900 transition"
          >
            <FaTrash /> Delete Account
          </button>
 
          <button
            onClick={() => setShowRegister(true)}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <FaUserPlus /> Add / Register Account
          </button>
        </div>
      </div>
    </div>
  );
}