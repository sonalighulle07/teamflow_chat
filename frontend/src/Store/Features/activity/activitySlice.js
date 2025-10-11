import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  activities: [], // array of notifications / reactions / calls etc
  loading: false,
  error: null,
};

const activitySlice = createSlice({
  name: "activity",
  initialState,
  reducers: {
    setActivities(state, action) {
      state.activities = action.payload;
    },
    addActivity(state, action) {
      state.activities.unshift(action.payload); // add latest on top
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
  },
});

export const { setActivities, addActivity, setLoading, setError } =
  activitySlice.actions;

export default activitySlice.reducer;
