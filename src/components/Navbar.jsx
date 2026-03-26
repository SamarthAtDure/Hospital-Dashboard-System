import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Avatar, Badge, Tooltip } from "antd";

const titles = {
  "/dashboard":             "Dashboard",
  "/patients":              "Patients",
  "/doctors":               "Doctors",
  "/appointments":          "Appointments",
  "/profile":               "Profile",
  "/doctor/dashboard":      "Doctor Dashboard",
  "/doctor/patients":       "My Patients",
  "/doctor/appointments":   "My Appointments",
  "/doctor/profile":        "Profile",
};

function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const profilePath = user.role === "doctor" ? "/doctor/profile" : "/profile";

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-7 sticky top-0 z-10">
      <span className="text-lg font-semibold">{titles[pathname] || "MediDash"}</span>
      <div className="flex items-center gap-4">
        <Tooltip title="3 new notifications">
          <Badge count={3} size="small">
            <span className="text-xl cursor-pointer">🔔</span>
          </Badge>
        </Tooltip>

        <Tooltip title={user.name || "User"}>
          <Avatar style={{ backgroundColor: "#2563eb", cursor: "pointer" }} onClick={() => navigate(profilePath)}>
            {(user.name || "U")[0].toUpperCase()}
          </Avatar>
        </Tooltip>

        <span className="text-sm">{user.name || "User"}</span>

        <Tooltip title="Logout of MediDash">
          <Button danger type="primary" onClick={handleLogout}>Logout</Button>
        </Tooltip>
      </div>
    </div>
  );
}

export default Navbar;
