import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./Features/Users/userSlice";
import teamReducer from "./Features/Teams/teamSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    team: teamReducer,
  },
});
