import React, { useState, useEffect } from "react";
import { Spin } from "antd";
import StatCard from "@components/StatCard";
import BarChart from "@charts/BarChart";
import PieChart from "@charts/PieChart";
import { getDepartments, refreshDepartmentsFromAPI } from "@/utils/departmentDB";

const API = "http://localhost:5000";

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [patientsPerDepartment, setPatientsPerDepartment] = useState([]);
  const [doctorsPerDepartment, setDoctorsPerDepartment] = useState([]);
  const [patientsByStatus, setPatientsByStatus] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [s, pbs] = await Promise.all([
        fetch(`${API}/stats`).then((r) => r.json()),
        fetch(`${API}/patientsByStatus`).then((r) => r.json()),
      ]);
      setStats(s);
      setPatientsByStatus(pbs);

      // Read department chart data from IndexedDB
      // If IndexedDB is empty (first load), refresh from API first
      let depts = await getDepartments();
      if (!depts.length) depts = await refreshDepartmentsFromAPI();
      setPatientsPerDepartment(depts.map((d) => ({ name: d.name, patients: d.patients ?? 0 })));
      setDoctorsPerDepartment(depts.map((d) => ({ name: d.name, doctors: d.doctors ?? 0 })));

      setLoading(false);
    };
    fetchAll();
  }, []);

  const statCards = [
    { label: "Total Patients", value: stats.totalPatients ?? "—", accent: "#3b82f6", iconBg: "#eff6ff" },
    { label: "Total Doctors",  value: stats.totalDoctors  ?? "—", accent: "#10b981", iconBg: "#f0fdf4" },
    { label: "Revenue",        value: stats.revenue       ?? "—", accent: "#8b5cf6", iconBg: "#f5f3ff" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1d2e", margin: 0 }}>Overview</h2>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Welcome back, Admin. Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-7">
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} loading={loading} />
        ))}
      </div>

      <Spin spinning={loading} description="Loading charts..." size="large">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
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
