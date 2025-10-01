import { configureStore } from '@reduxjs/toolkit';
import userReducer from './Features/Users/userSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
  },
});
