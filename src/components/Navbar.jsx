import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Avatar, Badge, Tooltip, Popover, List, Typography } from "antd";
import { useNotifications } from "@context/NotificationContext";

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

  const { getNotifs, markAllRead } = useNotifications();
  const target = user.role === "admin" ? "admin" : user.id;
  const notifs = target ? getNotifs(target) : [];
  const unread = notifs.filter((n) => !n.read).length;

  const [open, setOpen] = useState(false);

  const handleOpen = (visible) => {
    setOpen(visible);
    if (visible && unread > 0) markAllRead(target);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const content = (
    <div style={{ width: 300 }}>
      {notifs.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-4">No notifications</p>
      ) : (
        <List
          size="small"
          dataSource={notifs.slice(0, 10)}
          renderItem={(n) => (
            <List.Item style={{ padding: "8px 0" }}>
              <div>
                <p className="text-sm text-slate-700">{n.message}</p>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {new Date(n.time).toLocaleString()}
                </Typography.Text>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-7 sticky top-0 z-10">
      <span className="text-lg font-semibold">{titles[pathname] || "MediDash"}</span>
      <div className="flex items-center gap-4">
        <Popover
          content={content}
          title="Notifications"
          trigger="click"
          open={open}
          onOpenChange={handleOpen}
          placement="bottomRight"
        >
          <Badge count={unread} size="small">
            <span className="text-xl cursor-pointer">🔔</span>
          </Badge>
        </Popover>

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
