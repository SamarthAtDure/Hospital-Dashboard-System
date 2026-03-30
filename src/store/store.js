import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import notificationReducer from "./notificationSlice";
import doctorReducer from "./doctorSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    notifications: notificationReducer,
    doctors: doctorReducer,
  },
});

export default store;
