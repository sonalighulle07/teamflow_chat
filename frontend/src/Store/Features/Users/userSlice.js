import { createSlice } from "@reduxjs/toolkit";
import { loginUser, fetchUsers } from "./userThunks";

function shallowEqual(objA, objB) {
  if (objA === objB) return true;
  if (!objA || !objB) return false;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;
  for (let key of keysA) {
    if (objA[key] !== objB[key]) return false;
  }
  return true;
}

const initialState = {
  currentUser: null,
  userList: [],
  organizationList: [],   // <-- ADDED for super admin
  selectedUser: null,
  activeNav: "Chat",
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

    setOrganizationList: (state, action) => {
      state.organizationList = action.payload || [];
    },

    setActiveNav: (state, action) => {
      state.activeNav = action.payload;
    },

    logout: (state) => {
      state.currentUser = null;
      state.userList = [];
      state.organizationList = [];
      state.selectedUser = null;

      sessionStorage.removeItem("chatUser");
      sessionStorage.removeItem("chatToken");
      localStorage.removeItem("chatUser");
      localStorage.removeItem("chatToken");
    },
rehydrateUser: (state, action) => {
  state.currentUser = action.payload;
},

    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
    },

    setUserList: (state, action) => {
      state.userList = [...(action.payload || [])];
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;

        // backend sends: { token, user }
        state.currentUser = action.payload.user;

        // save user
        sessionStorage.setItem("chatUser", JSON.stringify(action.payload.user));

        // save token
        sessionStorage.setItem("chatToken", action.payload.token);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.userList = [...(action.payload || [])];
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setCurrentUser,
  logout,
  rehydrateUser,
  setSelectedUser,
  setUserList,
  setOrganizationList,
  setActiveNav,
} = userSlice.actions;

export default userSlice.reducer;
