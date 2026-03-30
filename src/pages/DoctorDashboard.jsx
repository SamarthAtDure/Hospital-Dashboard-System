import React, { useState, useEffect, useCallback } from "react";
import { Table, Tag, Radio, message, Skeleton } from "antd";
// import StatCard from "../components/StatCard";
// import LineChart from "../components/charts/LineChart";
// import { useDoctors, isOnShift } from "../context/DoctorContext";
import StatCard from "@components/StatCard";
import LineChart from "@charts/LineChart";
import { useDispatch, useSelector } from "react-redux";
import { fetchDoctors, isOnShift } from "@store/doctorSlice";

const API = "http://localhost:5000";
const apptStatusColor = { Confirmed: "green", Pending: "gold", Cancelled: "red", Completed: "blue" };
const availColor      = { Available: "green", Busy: "orange", "On Leave": "red" };
const DAYS            = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function DoctorDashboard() {
  const user = useSelector((state) => state.auth.user) || {};
  const dispatch = useDispatch();
  const doctors = useSelector((state) => state.doctors.doctors);

  const [stats,        setStats]        = useState({});
  const [todayAppts,   setTodayAppts]   = useState([]);
  const [chartData,    setChartData]    = useState([]);
  const [availability, setAvailability] = useState("Available");
  const [loading,      setLoading]      = useState(true);
  const [avLoading,    setAvLoading]    = useState(false);
  const [nowTime,      setNowTime]      = useState(new Date()); // live clock

  // live clock — ticks every minute to update shift status
  useEffect(() => {
    const t = setInterval(() => setNowTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const fetchData = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    Promise.all([
      fetch(`${API}/doctor/${user.id}/stats`).then((r) => r.json()),
      fetch(`${API}/doctor/${user.id}/appointments`).then((r) => r.json()),
      fetch(`${API}/doctor/${user.id}/patientStats`).then((r) => r.json()),
    ]).then(([s, appts, chart]) => {
      setStats(s);
      setTodayAppts(appts.filter((a) => a.date === today));
      setChartData(chart);
      setLoading(false);
    });
  }, [user.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // sync availability from context doctors list
  useEffect(() => {
    const me = doctors.find((d) => d._id?.toString() === user.id);
    if (me?.availabilityStatus) setAvailability(me.availabilityStatus);
  }, [doctors, user.id]);

  const handleAvailability = async (val) => {
    setAvailability(val);
    setAvLoading(true);
    try {
      await fetch(`${API}/doctor/${user.id}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availabilityStatus: val }),
      });
      message.success(`Status set to ${val}`);
    } catch {
      message.error("Failed to update status");
    } finally {
      setAvLoading(false);
    }
  };

  // get this doctor's full data from context
  const me = doctors.find((d) => d._id?.toString() === user.id);
  const wh = me?.workingHours;
  const onShift = me ? isOnShift(me) : null;

  const statCards = [
    { label: "Total Patients",       value: stats.totalPatients          ?? "—", accent: "#3b82f6", iconBg: "#eff6ff", icon: "👤" },
    { label: "Total Appointments",   value: stats.totalAppointments      ?? "—", accent: "#10b981", iconBg: "#f0fdf4", icon: "📅" },
    { label: "Pending Appointments", value: stats.pendingAppointments    ?? "—", accent: "#f59e0b", iconBg: "#fffbeb", icon: "⏳" },
    { label: "Completed",            value: stats.completedAppointments  ?? "—", accent: "#8b5cf6", iconBg: "#f5f3ff", icon: "✅" },
    { label: "Patient Requests",     value: stats.pendingPatientRequests ?? "—", accent: "#ef4444", iconBg: "#fef2f2", icon: "🔔" },
  ];

  const columns = [
    { title: "Patient",    dataIndex: "patient" },
    { title: "Department", dataIndex: "department" },
    { title: "Time",       dataIndex: "time" },
    { title: "Status",     dataIndex: "status", render: (s) => <Tag color={apptStatusColor[s]}>{s}</Tag> },
  ];

  return (
    <div>
      {/* Header row */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-[22px] font-bold">Welcome, {user.name}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {nowTime.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            {" · "}
            {nowTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {/* Availability selector */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "12px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 16 }}>
          <span className="text-sm font-semibold text-slate-600">My Availability:</span>
          <Tag color={availColor[availability]} className="!text-sm !px-3 !py-0.5 !m-0">{availability}</Tag>
          <Radio.Group
            value={availability}
            onChange={(e) => handleAvailability(e.target.value)}
            disabled={avLoading}
            optionType="button"
            buttonStyle="solid"
            size="small"
          >
            <Radio.Button value="Available">Available</Radio.Button>
            <Radio.Button value="Busy">Busy</Radio.Button>
            <Radio.Button value="On Leave">On Leave</Radio.Button>
          </Radio.Group>
        </div>
      </div>

      {/* Stat Cards — skeleton while loading */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <Skeleton active paragraph={{ rows: 1 }} title={{ width: "60%" }} />
              </div>
            ))
          : statCards.map((s) => <StatCard key={s.label} {...s} loading={false} />)
        }
      </div>

      {/* Working Hours Card */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 24 }}>
        {!me ? (
          <Skeleton active paragraph={{ rows: 2 }} />
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-1">My Working Hours</p>
              {wh?.start && wh?.end ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-base font-bold text-blue-600">{wh.start} – {wh.end}</span>
                  <div className="flex gap-1 flex-wrap">
                    {DAYS.map((d) => (
                      <span
                        key={d}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          wh.days?.includes(d)
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >{d}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Not configured — ask admin to set your working hours.</p>
              )}
            </div>

            {/* Live shift status */}
            <div className="flex items-center gap-3">
              {onShift === null ? (
                <Tag color="default">Hours Not Set</Tag>
              ) : onShift ? (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  <Tag color="green" className="!text-sm">Currently On Shift</Tag>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
                  <Tag color="default" className="!text-sm">Off Shift</Tag>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chart + Today's Appointments */}
      <div className="grid grid-cols-2 gap-6">
        {loading ? (
          <>
            <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}><Skeleton active paragraph={{ rows: 5 }} /></div>
            <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}><Skeleton active paragraph={{ rows: 5 }} /></div>
          </>
        ) : (
          <>
            {chartData.length > 0
              ? <LineChart data={chartData} />
              : (
                <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#9ca3af" }}>
                  No appointment history to chart yet.
                </div>
              )
            }
            <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <h3 className="text-[15px] font-semibold mb-4">Today's Appointments</h3>
              {todayAppts.length === 0
                ? <p className="text-slate-400 text-sm">No appointments scheduled for today.</p>
                : <Table columns={columns} dataSource={todayAppts} rowKey="_id" pagination={false} size="small" />
              }
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DoctorDashboard;
