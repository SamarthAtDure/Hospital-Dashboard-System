import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Badge } from "antd";
import { useSelector } from "react-redux";
import { useTheme } from "@context/ThemeContext";

const API = "http://localhost:5000";

function Sidebar() {
  const user = useSelector((state) => state.auth.user) || {};
  const isDoctor = user.role === "doctor";
  const { dark } = useTheme();

  const bg       = dark ? "#0d0f1a" : "#1a1d2e";
  const border   = dark ? "#1e2235" : "#252840";
  const hoverBg  = dark ? "#1a1d2e" : "#252840";

  const [adminBadge, setAdminBadge] = useState(0);
  const doctorBadge = useSelector((s) => s.notifications.pendingRequestCount);

  useEffect(() => {
    if (!isDoctor) {
      const load = () =>
        fetch(`${API}/doctor-requests`)
          .then((r) => r.json())
          .then((data) => setAdminBadge(data.length))
          .catch(() => {});
      load();
      const t = setInterval(load, 30000);
      return () => clearInterval(t);
    }
  }, [isDoctor]);

  const adminLinks = [
    { to: "/dashboard",       label: "Dashboard" },
    { to: "/patients",        label: "Patients" },
    { to: "/doctors",         label: "Doctors" },
    { to: "/appointments",    label: "Appointments" },
    { to: "/doctor-requests", label: "Doctor Requests", badge: adminBadge },
    { to: "/departments",     label: "Departments" },
    { to: "/daily-reports",    label: "Daily Reports" },
    { to: "/final-reports",    label: "Final Stay Reports" },
    { to: "/profile",         label: "Profile" },
  ];

  const doctorLinks = [
    { to: "/doctor/dashboard",    label: "Doctor Dashboard" },
    { to: "/doctor/patients",     label: "My Patients",     badge: doctorBadge },
    { to: "/doctor/appointments", label: "My Appointments" },
    { to: "/doctor/daily-reports",label: "Daily Reports" },
    { to: "/doctor/profile",      label: "Profile" },
  ];

  const links = isDoctor ? doctorLinks : adminLinks;

  return (
    <div
      data-sidebar
      style={{ width: 230, flexShrink: 0, height: "100vh", background: bg, display: "flex", flexDirection: "column", padding: "0 12px", overflowY: "auto" }}>
      {/* Logo */}
      <div style={{ padding: "24px 12px 20px", borderBottom: `1px solid ${border}` }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.3px" }}>🏥 MediDash</span>
      </div>

      {/* Role badge */}
      <div style={{ padding: "12px 12px 8px" }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {isDoctor ? "Doctor Panel" : "Admin Panel"}
        </span>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              padding: "9px 12px",
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "#ffffff" : "#a0a8c0",
              background: isActive ? "#4361ee" : "transparent",
              textDecoration: "none",
              transition: "all 0.15s",
            })}
            onMouseEnter={(e) => { if (!e.currentTarget.style.background.includes("4361ee")) { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = "#ffffff"; } }}
            onMouseLeave={(e) => { if (!e.currentTarget.style.background.includes("4361ee")) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#a0a8c0"; } }}
          >
            <span>{link.label}</span>
            {link.badge > 0 && (
              <Badge count={link.badge} size="small" style={{ backgroundColor: "#f59e0b" }} />
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom user hint */}
      <div style={{ padding: "16px 12px", borderTop: `1px solid ${border}`, marginTop: 8 }}>
        <span style={{ fontSize: 11, color: "#4b5563" }}>MediDash v1.0</span>
      </div>
    </div>
  );
}

export default Sidebar;
