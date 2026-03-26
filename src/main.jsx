import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider } from "antd";
// import App from "./App";
// import { DoctorProvider } from "./context/DoctorContext";
// import "./index.css";
import App from "@/App";
import { DoctorProvider } from "@context/DoctorContext";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConfigProvider theme={{ token: { colorPrimary: "#2563eb", borderRadius: 8 } }}>
      <DoctorProvider>
        <App />
      </DoctorProvider>
    </ConfigProvider>
  </React.StrictMode>
);
