import { createSlice } from "@reduxjs/toolkit";
import { loginUser, fetchUsers } from "./userThunks";

const initialState = {
  currentUser: null,
  userList: [],
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    setCurrentUser: (state, action) => {
      state.currentUser = action.payload;
      sessionStorage.setItem("chatUser", JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.currentUser = null;
      state.userList = [];
      sessionStorage.removeItem("chatUser");
      sessionStorage.removeItem("chatToken");
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
        sessionStorage.setItem("chatUser", JSON.stringify(action.payload));
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Users
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.userList = action.payload || [];
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setCurrentUser, logout } = userSlice.actions;
export default userSlice.reducer;
