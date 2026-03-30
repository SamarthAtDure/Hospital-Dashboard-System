import React, { useState } from "react";
import { Table, Tag, Drawer, Popconfirm, Progress,
         Button, Modal, Input, Select, Skeleton, TimePicker, Checkbox, Divider, Radio, Space, App } from "antd";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { fetchDoctors, updateWorkingHours, isOnShift, shiftHours } from "@store/doctorSlice";
import { useFormik } from "formik";
import * as Yup from "yup";

const availColor   = { Available: "green", Busy: "gold", "On Leave": "red" };
const availBg      = { Available: "#f0fdf4", Busy: "#fffbeb", "On Leave": "#fef2f2" };
const expToPercent = (exp) => Math.min(Math.round((parseInt(exp) / 20) * 100), 100);
const API   = "http://localhost:5000";
const DAYS  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEPTS = ["Cardiology","Neurology","Orthopedics","Pediatrics","General","Dermatology","Radiology","Oncology"];
const DR_TITLES = ["Dr.", "Prof."];
const toMin = (t) => { const [h, m] = (t || "").split(":").map(Number); return h * 60 + (m || 0); };

const SHIFT_PRESETS = {
  day:    { label: "Day Shift",   start: "08:00", end: "20:00", color: "#f59e0b" },
  night:  { label: "Night Shift", start: "20:00", end: "08:00", color: "#6366f1" },
  custom: { label: "Custom",      start: "",      end: "",      color: "#6b7280" },
};

const addDoctorSchema = Yup.object({
  title: Yup.string().required("Title is required"),
  name:  Yup.string().trim().required("Name is required").min(2)
           .matches(/^[a-zA-Z\s]+$/, "Letters only"),
  specialization: Yup.string().trim().required("Specialization is required").min(3),
  department:     Yup.string().required("Department is required"),
  experience:     Yup.number().typeError("Must be a number").required("Required").min(0).max(50),
  availabilityStatus: Yup.string().required("Required"),
});

const hoursSchema = Yup.object({
  start: Yup.string().nullable()
    .test("start-req", "Start required when end is set", function (v) { return !this.parent.end || !!v; }),
  end: Yup.string().nullable()
    .test("end-req", "End required when start is set", function (v) { return !this.parent.start || !!v; }),
  days: Yup.array()
    .test("days-req", "Select at least 1 day", function (v) {
      const { start, end } = this.parent;
      if (!start && !end) return true;
      return v && v.length > 0;
    }),
});

function Doctors() {
  const { message } = App.useApp();
  const dispatch   = useDispatch();
  const doctors    = useSelector((s) => s.doctors.doctors);
  const loading    = useSelector((s) => s.doctors.loading);
  const refresh    = () => dispatch(fetchDoctors());
  const saveHours  = (id, wh) => dispatch(updateWorkingHours({ doctorId: id, workingHours: wh }));

  const [addOpen,    setAddOpen]    = useState(false);
  const [drawerDoc,  setDrawerDoc]  = useState(null);   // currently open drawer doctor
  const [shiftType,  setShiftType]  = useState("custom");
  const [savingAvail, setSavingAvail] = useState(false);

  // ── Add Doctor formik ─────────────────────────────────────────────
  const addFormik = useFormik({
    initialValues: { title: "", name: "", specialization: "", department: "", experience: "", availabilityStatus: "" },
    validationSchema: addDoctorSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      await fetch(`${API}/doctors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, name: `${values.title} ${values.name}`, availabilityStatus: values.availabilityStatus || "Available" }),
      });
      message.success("Doctor added");
      resetForm();
      setAddOpen(false);
      refresh();
      setSubmitting(false);
    },
  });

  // ── Working Hours formik ──────────────────────────────────────────
  const hoursFormik = useFormik({
    initialValues: { start: "", end: "", days: ["Mon","Tue","Wed","Thu","Fri"] },
    validationSchema: hoursSchema,
    onSubmit: async (values, { setSubmitting }) => {
      await saveHours(drawerDoc._id, { start: values.start || "", end: values.end || "", days: values.days || [] });
      message.success("Working hours saved.");
      // update local drawerDoc so drawer reflects new hours immediately
      setDrawerDoc((prev) => ({ ...prev, workingHours: { start: values.start, end: values.end, days: values.days } }));
      setSubmitting(false);
    },
  });

  const handleDelete = async (id) => {
    await fetch(`${API}/doctors/${id}`, { method: "DELETE" });
    message.success("Doctor removed");
    setDrawerDoc(null);
    refresh();
  };

  const openDrawer = (doc) => {
    setDrawerDoc(doc);
    // init hours form
    const wh = doc.workingHours;
    const s = wh?.start || "", e = wh?.end || "";
    let detected = "custom";
    if (s === "08:00" && e === "20:00") detected = "day";
    else if (s === "20:00" && e === "08:00") detected = "night";
    setShiftType(detected);
    hoursFormik.resetForm({ values: { start: s, end: e, days: wh?.days || ["Mon","Tue","Wed","Thu","Fri"] } });
  };

  const applyPreset = (type) => {
    setShiftType(type);
    if (type !== "custom") {
      hoursFormik.setFieldValue("start", SHIFT_PRESETS[type].start);
      hoursFormik.setFieldValue("end",   SHIFT_PRESETS[type].end);
    }
  };

  const handleAvailChange = async (val) => {
    setSavingAvail(true);
    await fetch(`${API}/doctor/${drawerDoc._id}/availability`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availabilityStatus: val }),
    });
    setDrawerDoc((prev) => ({ ...prev, availabilityStatus: val }));
    refresh();
    setSavingAvail(false);
    message.success(`Status set to ${val}`);
  };

  // ── Table columns — clean & minimal ──────────────────────────────
  const columns = [
    {
      title: "Doctor",
      render: (_, doc) => (
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => openDrawer(doc)}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#4b5563,#6b7280)" }}>
            {(doc.name || "D")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 hover:underline leading-tight">{doc.name}</p>
            <p className="text-xs text-slate-400">{doc.specialization || doc.department}</p>
          </div>
        </div>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    { title: "Department", dataIndex: "department", render: (v) => <span className="text-sm">{v}</span> },
    { title: "Exp.", dataIndex: "experience", render: (v) => <span className="text-sm">{v} yrs</span> },
    {
      title: "Availability",
      dataIndex: "availabilityStatus",
      filters: [{ text: "Available", value: "Available" }, { text: "Busy", value: "Busy" }, { text: "On Leave", value: "On Leave" }],
      onFilter: (v, r) => (r.availabilityStatus || "Available") === v,
      render: (s) => <Tag color={availColor[s || "Available"]}>{s || "Available"}</Tag>,
    },
    {
      title: "Shift",
      render: (_, doc) => {
        const wh = doc.workingHours;
        if (!wh?.start) return <span className="text-slate-400 text-xs">Not set</span>;
        const night = toMin(wh.end) < toMin(wh.start);
        const on    = isOnShift(doc);
        return (
          <div className="text-xs">
            <Tag color={night ? "purple" : "orange"} className="!text-[10px]">{night ? "Night" : "Day"}</Tag>
            <span className="text-slate-500">{wh.start}–{wh.end}</span>
            <div><Tag color={on ? "green" : "default"} className="!text-[10px] !mt-0.5">{on ? "On Shift" : "Off"}</Tag></div>
          </div>
        );
      },
    },
    {
      title: "Load",
      dataIndex: "patientCount",
      sorter: (a, b) => (a.patientCount || 0) - (b.patientCount || 0),
      render: (v) => {
        const pct = Math.min((v || 0) * 10, 100);
        const color = pct < 40 ? "#10b981" : pct < 70 ? "#f59e0b" : "#ef4444";
        return (
          <div className="flex items-center gap-2">
            <Progress percent={pct} size="small" strokeColor={color} showInfo={false} style={{ width: 60 }} />
            <span className="text-xs font-semibold" style={{ color }}>{v || 0}</span>
          </div>
        );
      },
    },
    {
      title: "",
      render: (_, doc) => (
        <Button size="small" type="text" onClick={() => openDrawer(doc)} style={{ color: "#6b7280" }}>Manage →</Button>
      ),
    },
  ];

  // ── Drawer content ────────────────────────────────────────────────
  const doc = drawerDoc;
  const wh  = doc?.workingHours;
  const on  = doc ? isOnShift(doc) : null;
  const hrs = doc ? shiftHours(doc) : 0;
  const isNightShift = wh?.start && wh?.end && toMin(wh.end) < toMin(wh.start);

  // duration preview inside hours form
  const previewHrs = (() => {
    const s = hoursFormik.values.start, e = hoursFormik.values.end;
    if (!s || !e) return null;
    const sm = toMin(s), em = toMin(e);
    const mins = sm <= em ? em - sm : (1440 - sm) + em;
    return { hrs: Math.round((mins / 60) * 10) / 10, isNight: em < sm };
  })();

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1d2e", margin: 0 }}>Doctors</h2>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Click on a doctor to manage their profile, shift and availability.</p>
        </div>
        <Button type="primary" onClick={() => setAddOpen(true)}>+ Add Doctor</Button>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        {loading
          ? <Skeleton active paragraph={{ rows: 6 }} />
          : <Table columns={columns} dataSource={doctors} rowKey="_id" pagination={{ pageSize: 10 }}
              onRow={(doc) => ({ onClick: () => openDrawer(doc), style: { cursor: "pointer" } })} />
        }
      </div>

      {/* ── Doctor Drawer ── */}
      <Drawer
        open={!!drawerDoc}
        onClose={() => setDrawerDoc(null)}
        size="large"
        title={null}
        styles={{ body: { padding: 0 } }}
      >
        {doc && (
          <div>
            {/* Header */}
            <div style={{ background: "linear-gradient(135deg,#374151,#6b7280)", padding: "28px 24px 20px" }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
                  {(doc.name || "D")[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-white text-lg font-bold leading-tight">{doc.name}</h3>
                  <p className="text-slate-200 text-sm">{doc.specialization || "—"}</p>
                  <p className="text-slate-300 text-xs mt-0.5">{doc.department} · {doc.experience} yrs exp</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Tag color={availColor[doc.availabilityStatus || "Available"]}
                  style={{ background: availBg[doc.availabilityStatus || "Available"] }}>
                  {doc.availabilityStatus || "Available"}
                </Tag>
                {wh?.start && (
                  <Tag color={isNightShift ? "purple" : "orange"}>
                    {isNightShift ? "Night" : "Day"} · {wh.start}–{wh.end} · {hrs}h
                  </Tag>
                )}
                {on !== null && (
                  <Tag color={on ? "green" : "default"}>{on ? "On Shift" : "Off Shift"}</Tag>
                )}
              </div>
            </div>

            <div style={{ padding: "20px 24px" }} className="space-y-6">

              {/* ── Stats row ── */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Patients",     value: doc.patientCount || 0, color: "#4b5563" },
                  { label: "Appointments", value: doc.apptCount    || 0, color: "#10b981" },
                  { label: "Shift Hours",  value: hrs ? `${hrs}h`  : "—", color: "#4b5563" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl p-3 text-center" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <p className="text-xl font-bold" style={{ color }}>{value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              <Divider className="!my-0" />

              {/* ── Availability ── */}
              <div>
                <p className="text-[13px] font-bold text-slate-700 mb-3">Availability Status</p>
                <Radio.Group value={doc.availabilityStatus || "Available"}
                  onChange={(e) => handleAvailChange(e.target.value)}
                  disabled={savingAvail}
                  optionType="button" buttonStyle="solid" size="middle">
                  <Radio.Button value="Available">Available</Radio.Button>
                  <Radio.Button value="Busy">Busy</Radio.Button>
                  <Radio.Button value="On Leave">On Leave</Radio.Button>
                </Radio.Group>
              </div>

              <Divider className="!my-0" />

              {/* ── Working Hours ── */}
              <div>
                <p className="text-[13px] font-bold text-slate-700 mb-3">Working Hours & Shift</p>
                <form onSubmit={hoursFormik.handleSubmit} noValidate className="space-y-3">

                  {/* Preset buttons */}
                  <div className="flex gap-2">
                    {Object.entries(SHIFT_PRESETS).map(([key, p]) => (
                      <button key={key} type="button" onClick={() => applyPreset(key)}
                        className="flex-1 py-2 px-2 rounded-lg border text-xs font-semibold transition-all"
                        style={{
                          borderColor: shiftType === key ? p.color : "#e5e7eb",
                          background:  shiftType === key ? p.color + "18" : "#fff",
                          color:       shiftType === key ? p.color : "#6b7280",
                        }}>
                        {p.label}
                        {key !== "custom" && <div className="text-[10px] font-normal opacity-60 mt-0.5">{p.start}–{p.end}</div>}
                      </button>
                    ))}
                  </div>

                  {/* Time pickers */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-semibold mb-1 text-slate-500">Shift Start</label>
                      <TimePicker format="HH:mm" className="w-full" minuteStep={15}
                        value={hoursFormik.values.start ? dayjs(hoursFormik.values.start, "HH:mm") : null}
                        onChange={(t) => hoursFormik.setFieldValue("start", t ? t.format("HH:mm") : "")}
                        disabled={shiftType !== "custom"}
                        status={hoursFormik.touched.start && hoursFormik.errors.start ? "error" : ""} />
                      {hoursFormik.touched.start && hoursFormik.errors.start &&
                        <p className="text-red-500 text-[11px] mt-0.5">{hoursFormik.errors.start}</p>}
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold mb-1 text-slate-500">Shift End</label>
                      <TimePicker format="HH:mm" className="w-full" minuteStep={15}
                        value={hoursFormik.values.end ? dayjs(hoursFormik.values.end, "HH:mm") : null}
                        onChange={(t) => hoursFormik.setFieldValue("end", t ? t.format("HH:mm") : "")}
                        disabled={shiftType !== "custom"}
                        status={hoursFormik.touched.end && hoursFormik.errors.end ? "error" : ""} />
                      {hoursFormik.touched.end && hoursFormik.errors.end &&
                        <p className="text-red-500 text-[11px] mt-0.5">{hoursFormik.errors.end}</p>}
                    </div>
                  </div>

                  {/* Duration preview */}
                  {previewHrs && (
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg" style={{ background: previewHrs.isNight ? "#f5f3ff" : "#fffbeb" }}>
                      <Tag color={previewHrs.isNight ? "purple" : "orange"} className="!m-0">
                        {previewHrs.isNight ? "Night Shift" : "Day Shift"}
                      </Tag>
                      <span className="text-xs text-slate-600">Duration: <strong>{previewHrs.hrs} hours</strong></span>
                    </div>
                  )}

                  {/* Working days */}
                  <div>
                    <label className="block text-[12px] font-semibold mb-2 text-slate-500">Working Days</label>
                    <Checkbox.Group options={DAYS} value={hoursFormik.values.days}
                      onChange={(v) => hoursFormik.setFieldValue("days", v)} />
                    {hoursFormik.touched.days && hoursFormik.errors.days &&
                      <p className="text-red-500 text-[11px] mt-0.5">{hoursFormik.errors.days}</p>}
                  </div>

                  <Button type="primary" htmlType="submit" block loading={hoursFormik.isSubmitting}>
                    Save Working Hours
                  </Button>
                </form>
              </div>

              <Divider className="!my-0" />

              {/* ── Danger zone ── */}
              <div>
                <p className="text-[13px] font-bold text-red-500 mb-3">Danger Zone</p>
                <Popconfirm title="Remove this doctor?" description="This action cannot be undone."
                  onConfirm={() => handleDelete(doc._id)} okText="Remove" cancelText="Cancel" okButtonProps={{ danger: true }}>
                  <Button danger block>Remove Doctor</Button>
                </Popconfirm>
              </div>

            </div>
          </div>
        )}
      </Drawer>

      {/* ── Add Doctor Modal ── */}
      <Modal title="Add Doctor" open={addOpen}
        onCancel={() => { setAddOpen(false); addFormik.resetForm(); }} footer={null}>
        <form onSubmit={addFormik.handleSubmit} noValidate className="mt-4 space-y-3">

          <div>
            <label className="block text-[13px] font-semibold mb-1">Name</label>
            <Space.Compact className="w-full">
              <Select value={addFormik.values.title || undefined}
                onChange={(v) => addFormik.setFieldValue("title", v)}
                options={DR_TITLES.map((t) => ({ value: t, label: t }))}
                placeholder="Title" style={{ width: 90 }}
                status={(addFormik.touched.title && addFormik.errors.title) ? "error" : ""} />
              <Input name="name" placeholder="Doctor name" style={{ flex: 1 }}
                value={addFormik.values.name} onChange={addFormik.handleChange} onBlur={addFormik.handleBlur}
                status={(addFormik.touched.name && addFormik.errors.name) ? "error" : ""} />
            </Space.Compact>
            {addFormik.touched.title && addFormik.errors.title && <p className="text-red-500 text-xs mt-1">{addFormik.errors.title}</p>}
            {addFormik.touched.name  && addFormik.errors.name  && <p className="text-red-500 text-xs mt-1">{addFormik.errors.name}</p>}
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-1">Specialization</label>
            <Input name="specialization" placeholder="e.g. Interventional Cardiology"
              value={addFormik.values.specialization} onChange={addFormik.handleChange} onBlur={addFormik.handleBlur}
              status={addFormik.touched.specialization && addFormik.errors.specialization ? "error" : ""} />
            {addFormik.touched.specialization && addFormik.errors.specialization && <p className="text-red-500 text-xs mt-1">{addFormik.errors.specialization}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold mb-1">Department</label>
              <Select className="w-full" placeholder="Select"
                value={addFormik.values.department || undefined}
                onChange={(v) => addFormik.setFieldValue("department", v)}
                onBlur={() => addFormik.setFieldTouched("department", true)}
                status={addFormik.touched.department && addFormik.errors.department ? "error" : ""}
                options={DEPTS.map((d) => ({ value: d, label: d }))} />
              {addFormik.touched.department && addFormik.errors.department && <p className="text-red-500 text-xs mt-1">{addFormik.errors.department}</p>}
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1">Experience (yrs)</label>
              <Input name="experience" type="number" placeholder="e.g. 10"
                value={addFormik.values.experience} onChange={addFormik.handleChange} onBlur={addFormik.handleBlur}
                status={addFormik.touched.experience && addFormik.errors.experience ? "error" : ""} />
              {addFormik.touched.experience && addFormik.errors.experience && <p className="text-red-500 text-xs mt-1">{addFormik.errors.experience}</p>}
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-1">Availability</label>
            <Select className="w-full" placeholder="Select status"
              value={addFormik.values.availabilityStatus || undefined}
              onChange={(v) => addFormik.setFieldValue("availabilityStatus", v)}
              onBlur={() => addFormik.setFieldTouched("availabilityStatus", true)}
              status={addFormik.touched.availabilityStatus && addFormik.errors.availabilityStatus ? "error" : ""}
              options={[{ value: "Available", label: "Available" }, { value: "Busy", label: "Busy" }, { value: "On Leave", label: "On Leave" }]} />
            {addFormik.touched.availabilityStatus && addFormik.errors.availabilityStatus && <p className="text-red-500 text-xs mt-1">{addFormik.errors.availabilityStatus}</p>}
          </div>

          <Button type="primary" htmlType="submit" block loading={addFormik.isSubmitting} className="!mt-2">
            Add Doctor
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export default Doctors;
