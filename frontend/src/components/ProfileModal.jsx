import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaCamera, FaTrash, FaSignOutAlt, FaTimes } from "react-icons/fa";
import Register from "./Register";
import { URL } from "../config";

export default function ProfileModal({
  user,
  onClose,
  onLogout,
  setProfileImage,
}) {
  if (!user) return null;
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const navigate = useNavigate();

  const [preview, setPreview] = useState(() => {
    if (!user) return null;
    const stored = localStorage.getItem(`profileImage_${user.id}`);
    return (
      stored || (user.profile_image ? `${URL}${user.profile_image}` : null)
    );
  });

  useEffect(() => {
    if (!user) return setPreview(null);

    const stored = localStorage.getItem(`profileImage_${user.id}`);
    if (stored) setPreview(stored);
    else if (user.profile_image) setPreview(`${URL}${user.profile_image}`);
    else setPreview(null);
  }, [user?.id, user?.profile_image]);

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
  if (!window.confirm("This will delete your account permanently. Continue?")) return;

  setLoading(true);

  try {
    const token = sessionStorage.getItem("chatToken");
    const res = await fetch(`${URL}/api/users/delete-account`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ userId: user.id }),
    });

    if (!res.ok) {
      alert("You are not authorized. Please login again.");
      navigate("/login");
      return;
    }

    const data = await res.json();

    if (data.success) {
      // Clear storage
      sessionStorage.clear();
      localStorage.clear();

      // Reset profile image and preview
      setPreview(null);
      setProfileImage?.(null);

      // Update global store
      if (window.store) {
        window.store.dispatch({ type: "user/setCurrentUser", payload: null });
        window.store.dispatch({ type: "auth/setAuthenticated", payload: false });
      }

      // Navigate to login immediately
      navigate("/login");
    } else {
      alert(data.message || "Failed to delete account");
    }
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
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-none"
        onClick={onClose}
      ></div>

      <div className="relative mt-16 mr-4 w-72 bg-white shadow-xl rounded-xl p-5 pointer-events-auto animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4  right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <FaTimes size={15} />
        </button>

        <div className="flex flex-col items-center mt-3">
          {/* Avatar */}
          <div className="relative w-22 h-22 rounded-full overflow-hidden border-2 border-gray-200">
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
          </div>

          {/* Name */}
          <h2 className="mt-1 mb-2  text-lg font-semibold text-gray-700">
            {user.full_name?.charAt(0).toUpperCase() + user.full_name?.slice(1)}
          </h2>
          {/* Camera + Trash buttons side by side (flat minimalist style) */}
          <div className="mt-3 flex gap-3">
            {/* Upload / Change Profile */}
            <label className="flex items-center gap-1 px-3 py-1.5  cursor-pointer hover:bg-gray-100 transition   border border-gray-200 rounded-md">
              <FaCamera size={14} className="text-gray-500" />
              <span className="text-gray-500 text-sm font-medium">Upload</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={loading}
              />
            </label>

            {/* Remove / Trash */}
            {preview && (
              <button
                onClick={handleRemoveImage}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5  hover:bg-gray-100 transition border border-gray-200 rounded-md"
              >
                <FaTrash size={14} className="text-gray-500" />
                <span className="text-gray-500 text-sm font-medium">
                  Remove
                </span>
              </button>
            )}
          </div>
        </div>
        {/* Action Buttons */}
        <div className="mt-5 flex flex-col gap-2 ">
          <button
            onClick={onLogout}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-md bg-[#8c7bda] text-white hover:bg-[#7965d4] transition w-[200px] ml-6.5 text-sm"
          >
            <FaSignOutAlt size={14} /> Sign Out
          </button>

          <button
            onClick={handleDeleteAccount}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition w-[200px] ml-6.5 mb-3 text-sm"
          >
            <FaTrash size={14} /> Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
