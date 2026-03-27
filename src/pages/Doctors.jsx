import React, { useState } from "react";
import { Table, Tag, Card, Popconfirm, message, Progress,
         Button, Modal, Input, Select, Skeleton, TimePicker, Checkbox } from "antd";
import dayjs from "dayjs";
import { useDoctors, isOnShift } from "@context/DoctorContext";
import { useFormik } from "formik";
import * as Yup from "yup";

const availColor   = { Available: "green", Busy: "gold", "On Leave": "red" };
const expToPercent = (exp) => Math.min(Math.round((parseInt(exp) / 20) * 100), 100);
const API  = "http://localhost:5000";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEPTS = ["Cardiology","Neurology","Orthopedics","Pediatrics","General","Dermatology","Radiology","Oncology"];

// ── Yup schemas ───────────────────────────────────────────────────
const addDoctorSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Name is required")
    .min(2, "Name must be at least 2 characters")
    .matches(/^[a-zA-Z\s]+$/, "Name must contain only letters and spaces"),
  specialization: Yup.string()
    .trim()
    .required("Specialization is required")
    .min(3, "Specialization must be at least 3 characters"),
  department: Yup.string()
    .required("Department is required"),
  experience: Yup.number()
    .typeError("Experience must be a number")
    .required("Experience is required")
    .min(0, "Experience cannot be negative")
    .max(50, "Experience cannot exceed 50 years"),
  availabilityStatus: Yup.string()
    .required("Availability status is required"),
});

const hoursSchema = Yup.object({
  start: Yup.string().nullable()
    .test("start-required-if-end", "Shift start is required when end is set", function (val) {
      return !this.parent.end || !!val;
    }),
  end: Yup.string().nullable()
    .test("end-required-if-start", "Shift end is required when start is set", function (val) {
      return !this.parent.start || !!val;
    })
    .test("end-after-start", "Shift end must be after shift start", function (val) {
      const { start } = this.parent;
      if (!start || !val) return true;
      return dayjs(val, "HH:mm").isAfter(dayjs(start, "HH:mm"));
    }),
  days: Yup.array()
    .test("days-required-if-hours", "Select at least 1 working day", function (val) {
      const { start, end } = this.parent;
      if (!start && !end) return true;
      return val && val.length > 0;
    }),
});

function Doctors() {
  const { doctors, loading, fetchDoctors, updateWorkingHours } = useDoctors();

  const [addOpen,   setAddOpen]   = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [hoursDoc,  setHoursDoc]  = useState(null);

  // ── Add Doctor formik ─────────────────────────────────────────────
  const addFormik = useFormik({
    initialValues: { name: "", specialization: "", department: "", experience: "", availabilityStatus: "" },
    validationSchema: addDoctorSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      await fetch(`${API}/doctors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, availabilityStatus: values.availabilityStatus || "Available" }),
      });
      message.success("Doctor added");
      resetForm();
      setAddOpen(false);
      fetchDoctors();
      setSubmitting(false);
    },
  });

  // ── Working Hours formik ──────────────────────────────────────────
  const hoursFormik = useFormik({
    initialValues: { start: "", end: "", days: ["Mon","Tue","Wed","Thu","Fri"] },
    validationSchema: hoursSchema,
    onSubmit: async (values, { setSubmitting }) => {
      await updateWorkingHours(hoursDoc._id, {
        start: values.start || "",
        end:   values.end   || "",
        days:  values.days  || [],
      });
      message.success("Working hours saved.");
      setHoursOpen(false);
      setSubmitting(false);
    },
  });

  const handleDelete = async (id) => {
    await fetch(`${API}/doctors/${id}`, { method: "DELETE" });
    message.success("Doctor removed");
    fetchDoctors();
  };

  const openHours = (doc) => {
    setHoursDoc(doc);
    const wh = doc.workingHours;
    hoursFormik.resetForm({
      values: {
        start: wh?.start || "",
        end:   wh?.end   || "",
        days:  wh?.days  || ["Mon","Tue","Wed","Thu","Fri"],
      },
    });
    setHoursOpen(true);
  };

  // ── Working hours display helper ──────────────────────────────────
  const WorkingHoursCell = ({ doc }) => {
    const wh = doc.workingHours;
    if (!wh?.start || !wh?.end) return <span className="text-slate-400 text-xs">Not set</span>;
    const on = isOnShift(doc);
    return (
      <div className="text-xs">
        <span className="font-medium">{wh.start} – {wh.end}</span>
        <div className="text-slate-400 mt-0.5">{(wh.days || []).join(", ")}</div>
        <Tag color={on ? "green" : "default"} className="!mt-1 !text-[10px]">
          {on ? "On Shift" : "Off Shift"}
        </Tag>
      </div>
    );
  };

  // ── Load bar helper ───────────────────────────────────────────────
  const LoadBar = ({ count }) => {
    const pct = Math.min(count * 10, 100);
    const color = pct < 40 ? "#10b981" : pct < 70 ? "#f59e0b" : "#ef4444";
    return (
      <div className="flex items-center gap-2">
        <Progress percent={pct} size="small" strokeColor={color} showInfo={false} style={{ width: 70 }} />
        <span className="text-xs font-semibold" style={{ color }}>{count}</span>
      </div>
    );
  };

  const columns = [
    { title: "Name",           dataIndex: "name",           sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: "Specialization", dataIndex: "specialization", render: (v) => v || <span className="text-slate-400">—</span> },
    { title: "Department",     dataIndex: "department" },
    { title: "Experience",     dataIndex: "experience" },
    {
      title: "Availability",
      dataIndex: "availabilityStatus",
      filters: [
        { text: "Available", value: "Available" },
        { text: "Busy",      value: "Busy" },
        { text: "On Leave",  value: "On Leave" },
      ],
      onFilter: (v, r) => (r.availabilityStatus || "Available") === v,
      render: (s) => <Tag color={availColor[s || "Available"]}>{s || "Available"}</Tag>,
    },
    {
      title: "Working Hours",
      render: (_, doc) => <WorkingHoursCell doc={doc} />,
    },
    {
      title: "Patient Load",
      dataIndex: "patientCount",
      sorter: (a, b) => (a.patientCount || 0) - (b.patientCount || 0),
      render: (v) => <LoadBar count={v || 0} />,
    },
    {
      title: "Appointments",
      dataIndex: "apptCount",
      sorter: (a, b) => (a.apptCount || 0) - (b.apptCount || 0),
      render: (v) => <span className="font-semibold text-emerald-600">{v || 0}</span>,
    },
    {
      title: "Actions",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => openHours(record)}>Set Hours</Button>
          <Popconfirm title="Remove this doctor?" onConfirm={() => handleDelete(record._id)} okText="Yes" cancelText="No">
            <Button size="small" danger>Remove</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold">Doctors</h2>
          <p className="text-sm text-slate-500 mt-1">Manage doctors, working hours and patient load.</p>
        </div>
        <Button type="primary" onClick={() => setAddOpen(true)}>+ Add Doctor</Button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} size="small">
                <Skeleton active paragraph={{ rows: 3 }} />
              </Card>
            ))
          : doctors.map((doc) => {
              const on = isOnShift(doc);
              return (
                <Card
                  key={doc._id}
                  title={doc.name}
                  extra={<Tag color={availColor[doc.availabilityStatus || "Available"]}>{doc.availabilityStatus || "Available"}</Tag>}
                  size="small"
                  actions={[
                    <span key="hours" className="text-blue-600 text-xs cursor-pointer" onClick={() => openHours(doc)}>
                      Set Hours
                    </span>,
                    <Popconfirm key="del" title="Remove this doctor?" onConfirm={() => handleDelete(doc._id)} okText="Yes" cancelText="No">
                      <span className="text-red-500 text-xs cursor-pointer">Remove</span>
                    </Popconfirm>,
                  ]}
                >
                  <p className="text-sm text-slate-500">{doc.department}</p>
                  {doc.specialization && <p className="text-xs text-slate-400 mt-0.5">{doc.specialization}</p>}
                  <p className="text-xs text-slate-400 mt-1 mb-1">Experience: {doc.experience}</p>
                  <Progress percent={expToPercent(doc.experience)} size="small" strokeColor="#2563eb" />
                  {doc.workingHours?.start ? (
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <span>{doc.workingHours.start} – {doc.workingHours.end}</span>
                      <Tag color={on ? "green" : "default"} className="!text-[10px] !m-0">
                        {on ? "On Shift" : "Off Shift"}
                      </Tag>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-300 mt-2">No hours set</p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <span>Load:</span>
                    <Progress
                      percent={Math.min((doc.patientCount || 0) * 10, 100)}
                      size="small"
                      strokeColor={
                        (doc.patientCount || 0) < 4 ? "#10b981"
                        : (doc.patientCount || 0) < 7 ? "#f59e0b"
                        : "#ef4444"
                      }
                      showInfo={false}
                      style={{ flex: 1 }}
                    />
                    <span className="font-semibold">{doc.patientCount || 0} pts</span>
                  </div>
                </Card>
              );
            })
        }
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        {loading
          ? <Skeleton active paragraph={{ rows: 6 }} />
          : <Table columns={columns} dataSource={doctors} rowKey="_id" pagination={{ pageSize: 8 }} />
        }
      </div>

      {/* Add Doctor Modal */}
      <Modal
        title="Add Doctor"
        open={addOpen}
        onCancel={() => { setAddOpen(false); addFormik.resetForm(); }}
        footer={null}
      >
        <form onSubmit={addFormik.handleSubmit} noValidate className="mt-4">

          <div className="mb-3">
            <label className="block text-[13px] font-semibold mb-1">Name</label>
            <Input
              name="name"
              placeholder="Enter doctor name"
              value={addFormik.values.name}
              onChange={addFormik.handleChange}
              onBlur={addFormik.handleBlur}
              status={addFormik.touched.name && addFormik.errors.name ? "error" : ""}
            />
            {addFormik.touched.name && addFormik.errors.name && (
              <p className="text-red-500 text-xs mt-1">{addFormik.errors.name}</p>
            )}
          </div>

          <div className="mb-3">
            <label className="block text-[13px] font-semibold mb-1">Specialization</label>
            <Input
              name="specialization"
              placeholder="e.g. Interventional Cardiology"
              value={addFormik.values.specialization}
              onChange={addFormik.handleChange}
              onBlur={addFormik.handleBlur}
              status={addFormik.touched.specialization && addFormik.errors.specialization ? "error" : ""}
            />
            {addFormik.touched.specialization && addFormik.errors.specialization && (
              <p className="text-red-500 text-xs mt-1">{addFormik.errors.specialization}</p>
            )}
          </div>

          <div className="mb-3">
            <label className="block text-[13px] font-semibold mb-1">Department</label>
            <Select
              className="w-full"
              placeholder="Select department"
              value={addFormik.values.department || undefined}
              onChange={(val) => addFormik.setFieldValue("department", val)}
              onBlur={() => addFormik.setFieldTouched("department", true)}
              status={addFormik.touched.department && addFormik.errors.department ? "error" : ""}
              options={DEPTS.map((d) => ({ value: d, label: d }))}
            />
            {addFormik.touched.department && addFormik.errors.department && (
              <p className="text-red-500 text-xs mt-1">{addFormik.errors.department}</p>
            )}
          </div>

          <div className="mb-3">
            <label className="block text-[13px] font-semibold mb-1">Experience (years)</label>
            <Input
              name="experience"
              type="number"
              placeholder="e.g. 10"
              value={addFormik.values.experience}
              onChange={addFormik.handleChange}
              onBlur={addFormik.handleBlur}
              status={addFormik.touched.experience && addFormik.errors.experience ? "error" : ""}
            />
            {addFormik.touched.experience && addFormik.errors.experience && (
              <p className="text-red-500 text-xs mt-1">{addFormik.errors.experience}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-[13px] font-semibold mb-1">Availability</label>
            <Select
              className="w-full"
              placeholder="Select status"
              value={addFormik.values.availabilityStatus || undefined}
              onChange={(val) => addFormik.setFieldValue("availabilityStatus", val)}
              onBlur={() => addFormik.setFieldTouched("availabilityStatus", true)}
              status={addFormik.touched.availabilityStatus && addFormik.errors.availabilityStatus ? "error" : ""}
              options={[
                { value: "Available", label: "Available" },
                { value: "Busy",      label: "Busy" },
                { value: "On Leave",  label: "On Leave" },
              ]}
            />
            {addFormik.touched.availabilityStatus && addFormik.errors.availabilityStatus && (
              <p className="text-red-500 text-xs mt-1">{addFormik.errors.availabilityStatus}</p>
            )}
          </div>

          <Button type="primary" htmlType="submit" block loading={addFormik.isSubmitting}>
            Add Doctor
          </Button>
        </form>
      </Modal>

      {/* Set Working Hours Modal */}
      <Modal
        title={`Working Hours — ${hoursDoc?.name}`}
        open={hoursOpen}
        onCancel={() => setHoursOpen(false)}
        footer={null}
      >
        <form onSubmit={hoursFormik.handleSubmit} noValidate className="mt-4">
          <div className="grid grid-cols-2 gap-4">

            <div>
              <label className="block text-[13px] font-semibold mb-1">Shift Start</label>
              <TimePicker
                format="HH:mm"
                className="w-full"
                minuteStep={15}
                value={hoursFormik.values.start ? dayjs(hoursFormik.values.start, "HH:mm") : null}
                onChange={(t) => hoursFormik.setFieldValue("start", t ? t.format("HH:mm") : "")}
                onBlur={() => hoursFormik.setFieldTouched("start", true)}
                status={hoursFormik.touched.start && hoursFormik.errors.start ? "error" : ""}
              />
              {hoursFormik.touched.start && hoursFormik.errors.start && (
                <p className="text-red-500 text-xs mt-1">{hoursFormik.errors.start}</p>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-semibold mb-1">Shift End</label>
              <TimePicker
                format="HH:mm"
                className="w-full"
                minuteStep={15}
                value={hoursFormik.values.end ? dayjs(hoursFormik.values.end, "HH:mm") : null}
                onChange={(t) => hoursFormik.setFieldValue("end", t ? t.format("HH:mm") : "")}
                onBlur={() => hoursFormik.setFieldTouched("end", true)}
                status={hoursFormik.touched.end && hoursFormik.errors.end ? "error" : ""}
              />
              {hoursFormik.touched.end && hoursFormik.errors.end && (
                <p className="text-red-500 text-xs mt-1">{hoursFormik.errors.end}</p>
              )}
            </div>
          </div>

          <div className="mt-3 mb-4">
            <label className="block text-[13px] font-semibold mb-2">Working Days</label>
            <Checkbox.Group
              options={DAYS}
              value={hoursFormik.values.days}
              onChange={(val) => hoursFormik.setFieldValue("days", val)}
            />
            {hoursFormik.touched.days && hoursFormik.errors.days && (
              <p className="text-red-500 text-xs mt-1">{hoursFormik.errors.days}</p>
            )}
          </div>

          <Button type="primary" htmlType="submit" block loading={hoursFormik.isSubmitting}>
            Save Working Hours
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export default Doctors;
