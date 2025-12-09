import { createAsyncThunk } from "@reduxjs/toolkit";
import { URL } from "../../../config";

// ---------------------- LOGIN USER ----------------------
export const loginUser = createAsyncThunk(
  "user/login",
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return rejectWithValue(data.message || "Login failed");
      }

      // backend sends { success, token, user }
      const { token, user } = data;

      // Save token + user
      sessionStorage.setItem("chatUser", JSON.stringify(user));
      sessionStorage.setItem("chatToken", token);

      return { user, token }; // Redux will store token
    } catch (err) {
      return rejectWithValue("Server error, try again.");
    }
  }
);

// ---------------------- FETCH USERS (Org Based) ----------------------
export const fetchUsers = createAsyncThunk(
  "user/fetchUsers",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const currentUser = state.user.currentUser;

      if (!currentUser) {
        throw new Error("No current user found.");
      }

      // Super Admin does NOT fetch org users
      if (currentUser.role === "super_admin") {
        return []; // super admin dashboard has its own APIs
      }

      const orgId = currentUser.organization_id;
      const currentUserId = currentUser.id;

      const token = sessionStorage.getItem("chatToken");

      const res = await fetch(`${URL}/api/users?organization_id=${orgId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        throw new Error("Invalid response format");
      }

      return data.filter((u) => u.id !== currentUserId);
    } catch (err) {
      return rejectWithValue(err.message || "Failed to fetch users.");
    }
  }
);
