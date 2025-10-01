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
  selectedUser: null,
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
      state.selectedUser = null;
      sessionStorage.removeItem("chatUser");
      sessionStorage.removeItem("chatToken");
    },
    rehydrateUser: (state) => {
      const saved = sessionStorage.getItem("chatUser");
      if (saved) state.currentUser = JSON.parse(saved);
    },
    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
    },
    setUserList: (state, action) => {
      const newList = action.payload || [];
      const merged = newList.map((newUser) => {
        const existing = state.userList.find((u) => u.id === newUser.id);
        return existing && shallowEqual(existing, newUser)
          ? existing
          : { ...existing, ...newUser };
      });
      state.userList = merged;
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
        state.currentUser = action.payload;
        sessionStorage.setItem("chatUser", JSON.stringify(action.payload));
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
        const newList = action.payload || [];
        const merged = newList.map((newUser) => {
          const existing = state.userList.find((u) => u.id === newUser.id);
          return existing && shallowEqual(existing, newUser)
            ? existing
            : { ...existing, ...newUser };
        });
        state.userList = merged;
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
} = userSlice.actions;
export default userSlice.reducer;

