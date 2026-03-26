import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Tag, Badge } from "antd";

const API = "http://localhost:5000";

function Sidebar() {
  const user     = JSON.parse(localStorage.getItem("user") || "{}");
  const isDoctor = user.role === "doctor";

  const [adminBadge,  setAdminBadge]  = useState(0); // pending doctor registrations
  const [doctorBadge, setDoctorBadge] = useState(0); // pending patient requests

  useEffect(() => {
    if (isDoctor) {
      // poll pending patient requests for doctor
      const load = () =>
        fetch(`${API}/doctor/${user.id}/patient-requests`)
          .then((r) => r.json())
          .then((data) => setDoctorBadge(data.filter((r) => r.status === "Pending").length))
          .catch(() => {});
      load();
      const t = setInterval(load, 30000);
      return () => clearInterval(t);
    } else {
      // poll pending doctor registration requests for admin
      const load = () =>
        fetch(`${API}/doctor-requests`)
          .then((r) => r.json())
          .then((data) => setAdminBadge(data.length))
          .catch(() => {});
      load();
      const t = setInterval(load, 30000);
      return () => clearInterval(t);
    }
  }, [isDoctor, user.id]);

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
    <div className="w-[230px] shrink-0 h-screen bg-slate-900 px-4 py-6 flex flex-col overflow-y-auto">
      <div className="flex items-center gap-2 mb-8 px-1">
        <span className="text-[17px] font-bold text-white">MediDash</span>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              }`
            }
          >
            <span>{link.label}</span>
            {link.badge > 0 && (
              <Badge count={link.badge} size="small" style={{ backgroundColor: "#f59e0b" }} />
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default Sidebar;
