import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./Features/Users/userSlice";
import activityReducer from "./Features/activity/activitySlice";
import teamReducer from "./Features/Teams/teamSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    activity: activityReducer, // ✅ important
    team:teamReducer
  },
});
