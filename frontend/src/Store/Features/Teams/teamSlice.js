import { createSlice } from "@reduxjs/toolkit";
import { fetchTeams, fetchTeamMembers, silentFetchTeams } from "./teamThunk";

const initialState = {
  teamList: [],
  selectedTeam: null,
  selectedTeamMembers: [],
  loading: false,
  error: null,
};

const teamSlice = createSlice({
  name: "teams",
  initialState,

  reducers: {
    setTeamList: (state, action) => {
      state.teamList = [...action.payload];
    },

    setSelectedTeam: (state, action) => {
      state.selectedTeam = action.payload;
      console.log("Setting State selected team to:", state.selectedTeam);
    },

    clearTeams: (state) => {
      state.teamList = [];
      state.selectedTeam = null;
      state.selectedTeamMembers = [];
    },
  },

  extraReducers: (builder) => {
    builder
      // ---------------- TEAMS LIST ----------------
      .addCase(fetchTeams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.loading = false;
        state.teamList = [...action.payload];
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ---------------- TEAM MEMBERS ----------------
      .addCase(fetchTeamMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeamMembers.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedTeamMembers = action.payload;
      })
      .addCase(fetchTeamMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ---------------- SILENT FETCH (background) ----------------
      .addCase(silentFetchTeams.fulfilled, (state, action) => {
        state.teamList = action.payload || [];
      });
  },
});

export const { setTeamList, setSelectedTeam, clearTeams } = teamSlice.actions;
export default teamSlice.reducer;
