import React, { useEffect, useRef, useState } from "react";
import { Button, Modal, Input, Popconfirm, message, Skeleton, Tag, Avatar, Tooltip } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useFormik } from "formik";
import * as Yup from "yup";

const API          = "http://localhost:5000";
const REFRESH_MS   = 1 * 60 * 1000; // 5 minutes
const availColor   = { Available: "green", Busy: "gold", "On Leave": "red" };

function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false); // silent bg refresh indicator
  const [lastUpdated, setLastUpdated] = useState(null);  // Date object
  const [selected,    setSelected]    = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const timerRef = useRef(null);

  // ── Yup schema ────────────────────────────────────────────────────
  const deptSchema = Yup.object({
    name: Yup.string()
      .trim()
      .required("Department name is required")
      .min(2, "Name must be at least 2 characters")
      .matches(/^[a-zA-Z0-9\s]+$/, "Name must not contain special characters"),
    description: Yup.string()
      .max(300, "Description cannot exceed 300 characters"),
  });

  // ── Formik ────────────────────────────────────────────────────────
  const formik = useFormik({
    initialValues: { name: "", description: "" },
    validationSchema: deptSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      if (editing) {
        await fetch(`${API}/departments/${editing._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        message.success("Department updated");
      } else {
        await fetch(`${API}/departments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        message.success("Department added");
      }
      resetForm();
      setModalOpen(false);
      fetchDepts(true);
      setSubmitting(false);
    },
  });

  // silent=true → no full-page skeleton, just a small spinner in the header
  const fetchDepts = (silent = false) => {
    if (silent) setRefreshing(true);
    else        setLoading(true);

    fetch(`${API}/departments/with-doctors`)
      .then((r) => r.json())
      .then((data) => {
        setDepartments(data);
        setLastUpdated(new Date());
        // keep selected in sync — re-find by name so counts update
        setSelected((prev) =>
          prev ? (data.find((d) => d.name === prev.name) || data[0]) : data[0]
        );
      })
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  // initial load + auto-refresh every 5 min
  useEffect(() => {
    fetchDepts(false);
    timerRef.current = setInterval(() => fetchDepts(true), REFRESH_MS);
    return () => clearInterval(timerRef.current);
  }, []);

  const formatTime = (date) =>
    date ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  // ── CRUD ──────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    formik.resetForm({ values: { name: "", description: "" } });
    setModalOpen(true);
  };

  const openEdit = (dept, e) => {
    e.stopPropagation();
    setEditing(dept);
    formik.resetForm({ values: { name: dept.name, description: dept.description || "" } });
    setModalOpen(true);
  };

  const handleDelete = async (dept, e) => {
    e.stopPropagation();
    await fetch(`${API}/departments/${dept._id}`, { method: "DELETE" });
    message.success("Department deleted");
    if (selected?.name === dept.name) setSelected(null);
    fetchDepts(true);
  };

  // ── Summary totals ────────────────────────────────────────────────
  const totalDoctors  = departments.reduce((s, d) => s + d.doctors,  0);
  const totalPatients = departments.reduce((s, d) => s + d.patients, 0);

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold">Departments</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage departments and view assigned doctors.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            {refreshing ? "Refreshing…" : `Last updated: ${formatTime(lastUpdated)}`}
          </span>
          <Tooltip title="Refresh now">
            <Button
              icon={<ReloadOutlined spin={refreshing} />}
              onClick={() => fetchDepts(true)}
              disabled={refreshing}
            />
          </Tooltip>
          <Button type="primary" onClick={openAdd}>+ Add Department</Button>
        </div>
      </div>

      {/* ── Top stat cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "Total Departments", value: departments.length, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Total Doctors",     value: totalDoctors,       color: "text-blue-600",   bg: "bg-blue-50"   },
          { label: "Total Patients",    value: totalPatients,      color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center`}>
              <span className={`text-2xl font-bold ${s.color}`}>{loading ? "—" : s.value}</span>
            </div>
            <p className="text-sm text-slate-500 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Main two-panel layout ────────────────────────────────── */}
      <div className="flex gap-5" style={{ minHeight: 520 }}>

        {/* Left: department list */}
        <div className="w-[230px] shrink-0 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">All Departments</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading
              ? <div className="p-4"><Skeleton active paragraph={{ rows: 6 }} /></div>
              : departments.map((dept) => {
                  const isActive = selected?.name === dept.name;
                  return (
                    <div
                      key={dept._id}
                      onClick={() => setSelected(dept)}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer border-l-4 transition-all ${
                        isActive
                          ? "border-blue-600 bg-blue-50"
                          : "border-transparent hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                          isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                        }`}>
                          {dept.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold truncate ${isActive ? "text-blue-700" : "text-slate-700"}`}>
                            {dept.name}
                          </p>
                          <p className="text-xs text-slate-400">{dept.doctors} doctor{dept.doctors !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </div>

        {/* Right: department detail */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {!selected && !loading && (
            <div className="bg-white rounded-xl shadow-sm flex-1 flex items-center justify-center text-slate-400 text-sm">
              Select a department to view details.
            </div>
          )}

          {selected && (
            <>
              {/* Dept header card */}
              <div className="bg-white rounded-xl shadow-sm px-6 py-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                      {selected.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold">{selected.name}</h3>
                        {!selected.fromDB && (
                          <Tag color="orange" className="!text-[10px]">Auto-discovered</Tag>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">
                        {selected.description || "No description added yet."}
                      </p>
                    </div>
                  </div>
                  {selected.fromDB && (
                    <div className="flex gap-2">
                      <Button size="small" onClick={(e) => openEdit(selected, e)}>Edit</Button>
                      <Popconfirm
                        title="Delete this department?"
                        onConfirm={(e) => handleDelete(selected, e)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button size="small" danger>Delete</Button>
                      </Popconfirm>
                    </div>
                  )}
                </div>

                {/* Mini stats row */}
                <div className="grid grid-cols-4 gap-3 mt-5">
                  {[
                    { label: "Total Doctors",     value: selected.doctors,                                                                                                    color: "text-blue-600"    },
                    { label: "Total Patients",    value: selected.patients,                                                                                                   color: "text-emerald-600" },
                    { label: "Available",         value: (selected.doctorList || []).filter((d) => (d.availabilityStatus || "Available") === "Available").length,             color: "text-green-600"   },
                    { label: "Busy / On Leave",   value: (selected.doctorList || []).filter((d) => d.availabilityStatus === "Busy" || d.availabilityStatus === "On Leave").length, color: "text-amber-500"   },
                  ].map((s) => (
                    <div key={s.label} className="bg-slate-50 rounded-lg px-4 py-3">
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Doctors list */}
              <div className="bg-white rounded-xl shadow-sm flex-1">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[15px]">Doctors in {selected.name}</span>
                    <span className="ml-2 text-xs text-slate-400">({selected.doctors} total)</span>
                  </div>
                  <span className="text-xs text-slate-400">Auto-refreshes every 5 min</span>
                </div>

                {(selected.doctorList || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-2xl">👨‍⚕️</div>
                    <p className="text-sm font-medium">No doctors assigned yet</p>
                    <p className="text-xs mt-1">Doctors assigned to <strong>{selected.name}</strong> will appear here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {(selected.doctorList || []).map((doc, idx) => (
                      <div key={doc._id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                        {/* Left: avatar + info */}
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Avatar
                              size={44}
                              style={{ backgroundColor: `hsl(${(idx * 47) % 360}, 60%, 50%)` }}
                              className="font-bold text-base"
                            >
                              {doc.name.charAt(0)}
                            </Avatar>
                            {/* online dot */}
                            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                              (doc.availabilityStatus || "Available") === "Available" ? "bg-green-500" :
                              doc.availabilityStatus === "Busy" ? "bg-amber-400" : "bg-red-400"
                            }`} />
                          </div>
                          <div>
                            <p className="font-semibold text-[14px] text-slate-800">Dr. {doc.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {doc.specialization || "General Practitioner"} &nbsp;·&nbsp; {selected.name}
                            </p>
                          </div>
                        </div>

                        {/* Right: status tag */}
                        <Tag
                          color={availColor[doc.availabilityStatus || "Available"]}
                          className="!text-xs !px-3 !py-0.5"
                        >
                          {doc.availabilityStatus || "Available"}
                        </Tag>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────── */}
      <Modal
        title={editing ? "Edit Department" : "Add Department"}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); formik.resetForm(); }}
        footer={null}
      >
        <form onSubmit={formik.handleSubmit} noValidate className="mt-4">

          {/* Department Name */}
          <div className="mb-3">
            <label className="block text-[13px] font-semibold mb-1">Department Name</label>
            <Input
              name="name"
              placeholder="e.g. Cardiology"
              disabled={!!editing}
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              status={formik.touched.name && formik.errors.name ? "error" : ""}
            />
            {formik.touched.name && formik.errors.name && (
              <p className="text-red-500 text-xs mt-1">{formik.errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-[13px] font-semibold mb-1">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <Input.TextArea
              name="description"
              rows={3}
              placeholder="Brief description (optional)"
              value={formik.values.description}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              status={formik.touched.description && formik.errors.description ? "error" : ""}
            />
            <div className="flex justify-between items-center mt-1">
              {formik.touched.description && formik.errors.description
                ? <p className="text-red-500 text-xs">{formik.errors.description}</p>
                : <span />}
              <span className="text-xs text-slate-400 ml-auto">
                {(formik.values.description || "").length}/300
              </span>
            </div>
          </div>

          <Button type="primary" htmlType="submit" block loading={formik.isSubmitting}>
            {editing ? "Update Department" : "Add Department"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export default Departments;
