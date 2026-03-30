import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Avatar, Badge, Tooltip, Popover, List, Typography } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "@store/authSlice";
import { pushNotif, markAllRead, loadNotifs, deleteNotif } from "@store/notificationSlice";
import { useTheme } from "@context/ThemeContext";

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

const EMPTY = [];

function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { dark, toggle } = useTheme();
  const user = useSelector((state) => state.auth.user) || {};
  const profilePath = user.role === "doctor" ? "/doctor/profile" : "/profile";

  const target = user.role === "admin" ? "admin" : user.id;
  const notifs = useSelector((state) => state.notifications.cache[target] ?? EMPTY);
  const unread = notifs.filter((n) => !n.read).length;

  const [open, setOpen] = useState(false);

  // load notifications on mount so badge count is correct immediately
  useEffect(() => { dispatch(loadNotifs(target)); }, [target, dispatch]);

  const handleOpen = (visible) => {
    setOpen(visible);
    if (visible && unread > 0) dispatch(markAllRead(target));
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  const content = (
    <div style={{ width: 340, maxHeight: 420, overflowY: "auto" }}>
      <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-100 mb-1">
        <span className="text-xs text-slate-400">{notifs.length} notification{notifs.length !== 1 ? "s" : ""}</span>
        {unread > 0 && <span className="text-xs font-semibold text-blue-600">{unread} unread</span>}
      </div>
      {notifs.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-4">No notifications</p>
      ) : (
        <List
          size="small"
          dataSource={notifs}
          renderItem={(n) => (
            <List.Item style={{
              padding: "7px 6px", alignItems: "flex-start",
              background: n.read ? "transparent" : "#eff6ff",
              borderRadius: 6, marginBottom: 2, display: "flex", gap: 6,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="text-sm" style={{ fontWeight: n.read ? 400 : 600, color: n.read ? "#374151" : "#1d4ed8", margin: 0, wordBreak: "break-word" }}>
                  {!n.read && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#2563eb", marginRight: 6, verticalAlign: "middle" }} />}
                  {n.message}
                </p>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {new Date(n.time).toLocaleString()}
                </Typography.Text>
              </div>
              <button
                onClick={() => dispatch(deleteNotif({ target, id: n.id }))}
                style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer",
                         color: "#9ca3af", fontSize: 14, lineHeight: 1, padding: "2px 4px",
                         borderRadius: 4, marginTop: 1 }}
                title="Delete"
              >×</button>
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <div
      data-navbar
      style={{
        height: 60,
        borderBottom: "1px solid #e5e7ef",
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
        position: "sticky", top: 0, zIndex: 10,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
      <span style={{ fontSize: 16, fontWeight: 600 }}>{titles[pathname] || "MediDash"}</span>
      <div className="flex items-center gap-4">

        {/* ── theme toggle ── */}
        <Tooltip title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
          <button
            onClick={toggle}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 18, lineHeight: 1, padding: "4px 6px",
              borderRadius: 6, display: "flex", alignItems: "center",
            }}
            aria-label="Toggle theme"
          >
            {dark ? "☀️" : "🌙"}
          </button>
        </Tooltip>
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
          <Avatar style={{ backgroundColor: "#4b5563", cursor: "pointer" }} onClick={() => navigate(profilePath)}>
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
