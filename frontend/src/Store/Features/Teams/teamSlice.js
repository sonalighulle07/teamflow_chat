import { createSlice } from "@reduxjs/toolkit";
import { fetchTeams,fetchTeamMembers } from "./teamThunk";

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
      state.teamList = action.payload;
    }   ,
    setSelectedTeam: (state, action) => {
      state.selectedTeam = action.payload;
      console.log("Setting State selected team to:", state.selectedTeam);
    },
    clearTeams: (state) => {
      state.teamList = [];
      state.selectedTeam = null;
    },  
    },  
    extraReducers: (builder) => {
    builder
      .addCase(fetchTeams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.loading = false;
        state.teamList = action.payload;
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchTeamMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeamMembers.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedTeamMembers = action.payload;
        console.log("Fetched team members:", action.payload);
        // Handle team members if needed
      })
      .addCase(fetchTeamMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
      
  },
});

export const { setTeamList, setSelectedTeam, clearTeams } = teamSlice.actions;
export default teamSlice.reducer;