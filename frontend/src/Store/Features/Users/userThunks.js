import { createAsyncThunk } from "@reduxjs/toolkit";
import { setCurrentUser } from "./userSlice";

// Login user
export const loginUser = createAsyncThunk(
  "user/login",
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const res = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return rejectWithValue(data.message || "Login failed");
      }

      // Persist session
      sessionStorage.setItem("chatUser", JSON.stringify(data.user));
      sessionStorage.setItem("chatToken", data.token);

      return data.user; // Pass user back to slice

    } catch (err) {
      return rejectWithValue("Server error, try again later.");
    }
  }
);

// userThunks.js
export const fetchUsers = createAsyncThunk(
  "user/fetchUsers",
  async (currentUserId, { rejectWithValue }) => {
    console.log("Request taken by thunk...")
    try {
      const res = await fetch("/api/users");
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("Invalid response format");
      }

      // ✅ filter current user only if we have one
      return currentUserId
        ? data.filter((u) => u.id !== currentUserId)
        : data;
    } catch (err) {
      return rejectWithValue(err.message || "Server error while fetching users.");
    }
  }
);

