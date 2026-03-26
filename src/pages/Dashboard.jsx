import React, { useState, useEffect } from "react";
import { Spin, Alert } from "antd";
import { useNavigate } from "react-router-dom";
// import StatCard from "../components/StatCard";
// import BarChart from "../components/charts/BarChart";
// import PieChart from "../components/charts/PieChart";
import StatCard from "@components/StatCard";
import BarChart from "@charts/BarChart";
import PieChart from "@charts/PieChart";

const API = "http://localhost:5000";

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [alertVisible, setAlertVisible] = useState(false);
  const [stats, setStats] = useState({});
  const [patientsPerDepartment, setPatientsPerDepartment] = useState([]);
  const [doctorsPerDepartment, setDoctorsPerDepartment] = useState([]);
  const [patientsByStatus, setPatientsByStatus] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      const [s, ppd, dpd, pbs, appts] = await Promise.all([
        fetch(`${API}/stats`).then((r) => r.json()),
        fetch(`${API}/patientsPerDepartment`).then((r) => r.json()),
        fetch(`${API}/doctorsPerDepartment`).then((r) => r.json()),
        fetch(`${API}/patientsByStatus`).then((r) => r.json()),
        fetch(`${API}/appointments`).then((r) => r.json()),
      ]);
      setStats(s);
      setPatientsPerDepartment(ppd);
      setDoctorsPerDepartment(dpd);
      setPatientsByStatus(pbs);
      const pending = appts.filter((a) => a.status === "Pending").length;
      setPendingCount(pending);
      setAlertVisible(pending > 0);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const statCards = [
    { label: "Total Patients", value: stats.totalPatients ?? "—", accent: "#3b82f6", iconBg: "#eff6ff" },
    { label: "Total Doctors", value: stats.totalDoctors ?? "—", accent: "#10b981", iconBg: "#f0fdf4" },
    { label: "Appointments", value: stats.appointments ?? "—", accent: "#f59e0b", iconBg: "#fffbeb" },
    { label: "Revenue", value: stats.revenue ?? "—", accent: "#8b5cf6", iconBg: "#f5f3ff" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[22px] font-bold">Overview</h2>
        <p className="text-sm text-slate-500 mt-1">Welcome back, Admin. Here's what's happening today.</p>
      </div>

      {alertVisible && (
        <Alert
          message="Pending Appointments"
          description={
            <span>
              {pendingCount} appointment{pendingCount > 1 ? "s are" : " is"} pending confirmation.{" "}
              <span className="text-blue-600 underline cursor-pointer font-medium" onClick={() => navigate("/appointments")}>
                Go to Appointments to approve.
              </span>
            </span>
          }
          type="warning"
          showIcon
          closable
          onClose={() => setAlertVisible(false)}
          className="mb-6"
        />
      )}

      <div className="grid grid-cols-4 gap-5 mb-7">
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} loading={loading} />
        ))}
      </div>

      <Spin spinning={loading} tip="Loading charts..." size="large">
        <div className="grid grid-cols-2 gap-6">
          <BarChart data={patientsPerDepartment} title="Patients per Department" dataKey="patients" />
          <BarChart data={doctorsPerDepartment} title="Doctors per Department" dataKey="doctors" />
          <div className="col-span-2">
            <PieChart data={patientsByStatus} />
          </div>
        </div>
      </Spin>
    </div>
  );
}

export default Dashboard;
