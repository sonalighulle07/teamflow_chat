// userThunks.js
import { createAsyncThunk } from "@reduxjs/toolkit";
import { setCurrentUser } from "./userSlice";
import {URL} from '../../../config';


// ---------------------- LOGIN USER ----------------------
export const loginUser = createAsyncThunk(
  "user/login",
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // important for cookies/session
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return rejectWithValue(data.message || "Login failed");
      }

      // Persist session locally
      sessionStorage.setItem("chatUser", JSON.stringify(data.user));
      sessionStorage.setItem("chatToken", data.token);

      return data.user; // returned to slice
    } catch (err) {
      return rejectWithValue("Server error, try again later.");
    }
  }
);

// ---------------------- FETCH USERS ----------------------
export const fetchUsers = createAsyncThunk(
  "user/fetchUsers",
  async (currentUserId, { rejectWithValue }) => {
    try {
      const res = await fetch(`${URL}/api/users`, {
        credentials: "include", // include cookies if needed
      });

      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("Invalid response format");
      }

      // Filter out current user
      return currentUserId
        ? data.filter((u) => u.id !== currentUserId)
        : data;
    } catch (err) {
      return rejectWithValue(err.message || "Server error while fetching users.");
    }
  }
);
