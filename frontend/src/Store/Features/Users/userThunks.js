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
        credentials: "include", 
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();


      if (!res.ok || !data.success) {
        return rejectWithValue(data.message || "Login failed");
      }
      sessionStorage.setItem("chatUser", JSON.stringify(data.user));
      sessionStorage.setItem("chatToken", data.token);
      localStorage.setItem("chatUser", JSON.stringify(data.user));
      localStorage.setItem("chatToken", data.token);

      return data.user; 
    } catch (err) {
      return rejectWithValue("Server error, try again later.");
    }
  }
);

// ---------------------- FETCH USERS ----------------------
export const fetchUsers = createAsyncThunk(
  "user/fetchUsers",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const currentUser = state.user.currentUser;

      if (!currentUser) throw new Error("No current user found.");

      const orgId = currentUser.organization_id;
      const currentUserId = currentUser.id;

      console.log("Fetching users for org:", orgId);
      const res = await fetch(`${URL}/api/users?organization_id=${orgId}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch users");

      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid response format");

      //  Remove current user from the list
      return data.filter((u) => u.id !== currentUserId);
    } catch (err) {
      return rejectWithValue(err.message || "Server error while fetching users.");
    }
  }
);

