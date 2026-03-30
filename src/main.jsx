import React from "react";
import ReactDOM from "react-dom/client";
import AppRoot from "@/App";
import { DoctorProvider } from "@context/DoctorContext";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DoctorProvider>
      <AppRoot />
    </DoctorProvider>
  </React.StrictMode>
);
