import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./Features/Users/userSlice";
import activityReducer from "./Features/activity/activitySlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    activity: activityReducer, // ✅ important
  },
});
