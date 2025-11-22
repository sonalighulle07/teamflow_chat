import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { URL } from "../../../config";

export const fetchTeams = createAsyncThunk(
  "teams/fetchTeams",
  async (_, { rejectWithValue }) => {
    try {
      const token = sessionStorage.getItem("chatToken");
      const currentUser = JSON.parse(sessionStorage.getItem("chatUser"));

      if (!token || !currentUser?.id) return [];
      const res = await axios.get(`${URL}/api/teams?userId=${currentUser.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error("Failed to fetch teams:", err);
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// -------------------- FETCH MEMBERS OF SELECTED TEAM --------------------
export const fetchTeamMembers = createAsyncThunk(
  "teams/fetchTeamMembers",
  async (_, { getState, rejectWithValue }) => {
    try {
      console.log("fetchTeamMembers thunk called");
      const token = sessionStorage.getItem("chatToken");
      if (!token) return [];

      const state = getState();
      const selectedTeam = state.team.selectedTeam; 

      if (!selectedTeam?.id) {
        console.warn("No selected team found in state");
        return [];
      }
      const res = await axios.get(`${URL}/api/teams/${selectedTeam.id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error("Failed to fetch team members:", err);
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchTeamsSorted = (userId) => async (dispatch) => {
  try {
    const { data } = await axios.get(`${URL}/teams/user/${userId}/sorted`);
    dispatch(setTeamList(data)); 
  } catch (err) {
    console.error("Failed to fetch sorted teams:", err);
  }
};