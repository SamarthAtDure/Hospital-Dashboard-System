import React, { useState, useEffect, useMemo } from "react";
import { Table, Tag, Button, Input, Select, DatePicker, TimePicker,
         notification, Popconfirm, Alert, Space } from "antd";
import RPI from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
const PhoneInput = RPI.default ?? RPI;
import { useFormik } from "formik";
import * as Yup from "yup";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { pickBestDoctor, isOnShift } from "@store/doctorSlice";
import { pushNotif as pushNotifAction } from "@store/notificationSlice";

const API = "http://localhost:5000";
const statusColor  = { Confirmed: "green", Pending: "gold", Cancelled: "red", Completed: "blue" };
const DEPARTMENTS  = ["Cardiology","Neurology","Orthopedics","Pediatrics","General","Dermatology","Radiology","Oncology"];
const PATIENT_TITLES = ["Mr.", "Mrs.", "Ms."];

const F = ({ label, error, children }) => (
  <div>
    <label className="block text-[12px] font-semibold mb-1 text-slate-600">{label}</label>
    {children}
    {error && <p className="text-red-500 text-[11px] mt-0.5">{error}</p>}
  </div>
);

function Appointments() {
  const dispatch       = useDispatch();
  const contextDoctors = useSelector((s) => s.doctors.doctors);
  const pushNotif      = (target, msg) => dispatch(pushNotifAction({ target, message: msg }));

  const [appointments, setAppointments] = useState([]);
  const [doctors,      setDoctors]      = useState([]);
  const [suggested,    setSuggested]    = useState(null);
  const [formDept,     setFormDept]     = useState(null);
  const [slotConflict, setSlotConflict] = useState(null);
  const [api, contextHolder] = notification.useNotification();

  const filteredDoctors = useMemo(
    () => formDept ? doctors.filter((d) => d.department === formDept) : [],
    [formDept, doctors]
  );

  const schema = Yup.object({
    title:         Yup.string().required("Title is required"),
    name:          Yup.string().trim().required("Patient name is required").min(2, "Min 2 characters")
                     .matches(/^[a-zA-Z\s]+$/, "Letters only"),
    age:           Yup.number().typeError("Must be a number").required("Age is required").min(0).max(150),
    gender:        Yup.string().required("Gender is required"),
    phone:         Yup.string().required("Phone is required")
                     .test("phone-valid", "Enter a valid phone number", (val) => {
                       if (!val) return false;
                       const sub = val.slice(-10);
                       return /^[6-9]\d{9}$/.test(sub);
                     }),
    disease:       Yup.string().trim().required("Disease / Diagnosis is required").min(3),
    department:    Yup.string().required("Department is required"),
    doctorId:      Yup.string().required("Please assign a doctor"),
    admissionDate: Yup.date().typeError("Select a valid date").required("Admission date is required")
                     .min(dayjs().subtract(1, "year").toDate(), "Too far in the past")
                     .max(dayjs().add(7, "day").toDate(), "Max 7 days ahead"),
    apptDate:      Yup.date().typeError("Select a valid date").required("Appointment date is required")
                     .min(dayjs().startOf("day").toDate(), "Date cannot be in the past"),
    apptTime:      Yup.string().required("Appointment time is required"),
  });

  const formik = useFormik({
    initialValues: {
      title: "", name: "", age: "", gender: "", phone: "",
      disease: "", department: "", doctorId: "", admissionDate: null,
      apptDate: null, apptTime: null,
    },
    validationSchema: schema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      const patRes = await fetch(`${API}/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:          `${values.title} ${values.name}`,
          age:           values.age,
          gender:        values.gender,
          phone:         `+${values.phone}`,
          disease:       values.disease,
          department:    values.department,
          doctorId:      values.doctorId,
          admissionDate: values.admissionDate ? dayjs(values.admissionDate).format("YYYY-MM-DD") : "",
        }),
      });

      const assignedDoc = doctors.find((d) => d._id?.toString() === values.doctorId);
      await fetch(`${API}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient:    `${values.title} ${values.name}`,
          department: values.department,
          doctorId:   values.doctorId,
          doctor:     assignedDoc?.name || "",
          date:       dayjs(values.apptDate).format("YYYY-MM-DD"),
          time:       dayjs(values.apptTime).format("HH:mm"),
          status:     "Pending",
        }),
      });

      if (patRes.ok) {
        if (assignedDoc) {
          pushNotif(assignedDoc._id.toString(), `New patient assigned: ${values.name} (${values.disease}, ${values.department})`);
        }
        api.success({
          message: "Patient Registered & Appointment Booked",
          description: `${values.title} ${values.name} scheduled for ${values.department} on ${dayjs(values.apptDate).format("MMM D, YYYY")} at ${dayjs(values.apptTime).format("HH:mm")}.`,
          placement: "topRight",
          duration: 4,
        });
        resetForm();
        setFormDept(null);
        setSuggested(null);
        setSlotConflict(null);
        fetchAll();
      } else {
        api.error({ message: "Failed to register patient.", placement: "topRight" });
      }
      setSubmitting(false);
    },
  });

  const fetchAll = async () => {
    const [appts, docs] = await Promise.all([
      fetch(`${API}/appointments`).then((r) => r.json()),
      fetch(`${API}/doctors`).then((r) => r.json()),
    ]);
    setAppointments(appts);
    setDoctors(docs);
  };

  useEffect(() => { fetchAll(); }, []);

  const checkSlotConflict = (doctorId, date, time) => {
    if (!doctorId || !date || !time) { setSlotConflict(null); return; }
    const dateStr = dayjs(date).format("YYYY-MM-DD");
    const timeStr = dayjs(time).format("HH:mm");
    const conflict = appointments.find(
      (a) => a.doctorId === doctorId && a.date === dateStr && a.time === timeStr && a.status !== "Cancelled"
    );
    if (conflict) {
      const alt = contextDoctors.find(
        (d) => d._id?.toString() !== doctorId &&
               d.department === formDept &&
               (d.availabilityStatus || "Available") !== "On Leave" &&
               !appointments.find(
                 (a) => a.doctorId === d._id?.toString() && a.date === dateStr &&
                        a.time === timeStr && a.status !== "Cancelled"
               )
      );
      const busyDoc = doctors.find((d) => d._id?.toString() === doctorId);
      setSlotConflict({ busyDoc, altDoc: alt || null });
    } else {
      setSlotConflict(null);
    }
  };

  const handleDeptChange = (val) => {
    setFormDept(val);
    formik.setFieldValue("department", val || "");
    formik.setFieldValue("doctorId", "");
    setSuggested(null);
    setSlotConflict(null);
    if (!val) return;
    const best = pickBestDoctor(contextDoctors, val);
    if (best) { setSuggested(best); formik.setFieldValue("doctorId", best._id?.toString()); }
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/appointments/${id}`, { method: "DELETE" });
    fetchAll();
    api.info({ message: "Appointment deleted", placement: "topRight", duration: 3 });
  };

  const columns = [
    { title: "Patient",    dataIndex: "patient",    sorter: (a, b) => a.patient?.localeCompare(b.patient) },
    { title: "Department", dataIndex: "department" },
    { title: "Date",       dataIndex: "date",       sorter: (a, b) => new Date(a.date) - new Date(b.date) },
    { title: "Time",       dataIndex: "time" },
    {
      title: "Status", dataIndex: "status",
      filters: [
        { text: "Confirmed", value: "Confirmed" },
        { text: "Pending",   value: "Pending" },
        { text: "Cancelled", value: "Cancelled" },
        { text: "Completed", value: "Completed" },
      ],
      onFilter: (v, r) => r.status === v,
      render: (s) => <Tag color={statusColor[s]}>{s}</Tag>,
    },
    {
      title: "Action",
      render: (_, record) => (
        <Popconfirm title="Delete this appointment?" onConfirm={() => handleDelete(record._id)} okText="Yes" cancelText="No">
          <Button size="small" danger>Delete</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      {contextHolder}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1d2e", margin: 0 }}>Appointments</h2>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Register patients and book appointments.</p>
      </div>

      <div className="flex gap-5" style={{ alignItems: "flex-start" }}>

        {/* ── Left: Registration Form ── */}
        <div style={{ width: 340, flexShrink: 0, background: "#fff", borderRadius: 14,
                      padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <p className="text-[13px] font-bold text-slate-700 mb-4 pb-2 border-b border-slate-100">
            Register Patient & Book Appointment
          </p>

          <form onSubmit={formik.handleSubmit} noValidate className="space-y-3">

            {/* Name */}
            <F name="name" label="Patient Name"
               error={(formik.touched.title && formik.errors.title) || (formik.touched.name && formik.errors.name)
                 ? (formik.errors.title || formik.errors.name) : null}>
              <Space.Compact className="w-full">
                <Select value={formik.values.title || undefined}
                  onChange={(v) => formik.setFieldValue("title", v)}
                  options={PATIENT_TITLES.map((t) => ({ value: t, label: t }))}
                  placeholder="Title" style={{ width: 90 }}
                  status={(formik.touched.title && formik.errors.title) ? "error" : ""} />
                <Input name="name" placeholder="Full name" style={{ flex: 1 }}
                  value={formik.values.name}
                  onChange={formik.handleChange} onBlur={formik.handleBlur}
                  status={(formik.touched.name && formik.errors.name) ? "error" : ""} />
              </Space.Compact>
            </F>

            {/* Age + Gender */}
            <div className="grid grid-cols-2 gap-3">
              <F name="age" label="Age" error={formik.touched.age && formik.errors.age}>
                <Input name="age" type="number" placeholder="Age"
                  value={formik.values.age} onChange={formik.handleChange} onBlur={formik.handleBlur}
                  status={formik.touched.age && formik.errors.age ? "error" : ""} />
              </F>
              <F name="gender" label="Gender" error={formik.touched.gender && formik.errors.gender}>
                <Select className="w-full" placeholder="Gender"
                  value={formik.values.gender || undefined}
                  onChange={(v) => formik.setFieldValue("gender", v)}
                  onBlur={() => formik.setFieldTouched("gender", true)}
                  status={formik.touched.gender && formik.errors.gender ? "error" : ""}
                  options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }, { value: "Other", label: "Other" }]} />
              </F>
            </div>

            {/* Phone */}
            <F name="phone" label="Phone" error={formik.touched.phone && formik.errors.phone}>
              <PhoneInput country="in" value={formik.values.phone}
                onChange={(v) => formik.setFieldValue("phone", v)}
                onBlur={() => formik.setFieldTouched("phone", true)}
                inputStyle={{ width: "100%", borderColor: formik.touched.phone && formik.errors.phone ? "#ff4d4f" : undefined }}
                containerStyle={{ width: "100%" }} enableSearch />
            </F>

            {/* Disease */}
            <F name="disease" label="Disease / Diagnosis" error={formik.touched.disease && formik.errors.disease}>
              <Input name="disease" placeholder="e.g. Hypertension, Fracture..."
                value={formik.values.disease} onChange={formik.handleChange} onBlur={formik.handleBlur}
                status={formik.touched.disease && formik.errors.disease ? "error" : ""} />
            </F>

            {/* Department + Doctor */}
            <F name="department" label="Department" error={formik.touched.department && formik.errors.department}>
              <Select className="w-full" placeholder="Select department"
                value={formik.values.department || undefined}
                onChange={handleDeptChange}
                onBlur={() => formik.setFieldTouched("department", true)}
                status={formik.touched.department && formik.errors.department ? "error" : ""}
                options={DEPARTMENTS.map((d) => ({ value: d, label: d }))} />
            </F>

            <F name="doctorId" label="Assign Doctor" error={formik.touched.doctorId && formik.errors.doctorId}>
              <Select className="w-full"
                placeholder={formDept ? "Select doctor" : "Select department first"}
                disabled={!formDept}
                value={formik.values.doctorId || undefined}
                onChange={(val) => {
                  formik.setFieldValue("doctorId", val);
                  setSuggested(null);
                  checkSlotConflict(val, formik.values.apptDate, formik.values.apptTime);
                }}
                onBlur={() => formik.setFieldTouched("doctorId", true)}
                status={formik.touched.doctorId && formik.errors.doctorId ? "error" : ""}
                options={filteredDoctors.map((d) => {
                  const on = isOnShift(d);
                  return {
                    value: d._id?.toString(),
                    label: (
                      <span className="flex items-center gap-1 text-xs">
                        {d.name}
                        <Tag color={d.availabilityStatus === "Available" ? "green" : d.availabilityStatus === "Busy" ? "gold" : "red"}
                          className="!ml-1 !text-[10px]">{d.availabilityStatus || "Available"}</Tag>
                        {on !== null && <Tag color={on ? "green" : "default"} className="!text-[10px] !m-0">{on ? "On Shift" : "Off"}</Tag>}
                        <span className="text-slate-400 ml-1">{d.patientCount || 0} pts</span>
                      </span>
                    ),
                  };
                })}
              />
            </F>

            {slotConflict && (
              <Alert type="error" showIcon
                message={
                  <span className="text-xs">
                    <strong>{slotConflict.busyDoc?.name}</strong> is already booked at this slot.
                    {slotConflict.altDoc
                      ? <> Try: <strong className="text-blue-600 cursor-pointer underline"
                          onClick={() => { formik.setFieldValue("doctorId", slotConflict.altDoc._id?.toString()); setSlotConflict(null); setSuggested(slotConflict.altDoc); }}>
                          {slotConflict.altDoc.name}</strong> (click to assign).</>
                      : " No other doctor available for this slot."}
                  </span>
                }
              />
            )}
            {!slotConflict && suggested && (
              <Alert type="info" showIcon
                message={<span className="text-xs">Auto-assigned <strong>{suggested.name}</strong> — lowest load. You can change above.</span>} />
            )}
            {!slotConflict && formDept && !suggested && (
              <Alert type="warning" showIcon
                message={<span className="text-xs">No available doctor on shift. Please assign manually.</span>} />
            )}

            {/* Admission Date */}
            <F name="admissionDate" label="Admission Date" error={formik.touched.admissionDate && formik.errors.admissionDate}>
              <DatePicker className="w-full"
                value={formik.values.admissionDate ? dayjs(formik.values.admissionDate) : null}
                onChange={(d) => formik.setFieldValue("admissionDate", d ? d.toDate() : null)}
                onBlur={() => formik.setFieldTouched("admissionDate", true)}
                status={formik.touched.admissionDate && formik.errors.admissionDate ? "error" : ""}
                disabledDate={(c) => c && (c < dayjs().subtract(1, "year").startOf("day") || c > dayjs().add(7, "day").endOf("day"))} />
            </F>

            {/* Appt Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <F name="apptDate" label="Appt. Date" error={formik.touched.apptDate && formik.errors.apptDate}>
                <DatePicker className="w-full"
                  value={formik.values.apptDate ? dayjs(formik.values.apptDate) : null}
                  onChange={(d) => { const v = d ? d.toDate() : null; formik.setFieldValue("apptDate", v); checkSlotConflict(formik.values.doctorId, v, formik.values.apptTime); }}
                  onBlur={() => formik.setFieldTouched("apptDate", true)}
                  status={formik.touched.apptDate && formik.errors.apptDate ? "error" : ""}
                  disabledDate={(c) => c && c < dayjs().startOf("day")} />
              </F>
              <F name="apptTime" label="Appt. Time" error={formik.touched.apptTime && formik.errors.apptTime}>
                <TimePicker className="w-full" format="HH:mm"
                  value={formik.values.apptTime ? dayjs(formik.values.apptTime) : null}
                  onChange={(t) => { const v = t ? t.toDate() : null; formik.setFieldValue("apptTime", v); checkSlotConflict(formik.values.doctorId, formik.values.apptDate, v); }}
                  onBlur={() => formik.setFieldTouched("apptTime", true)}
                  status={formik.touched.apptTime && formik.errors.apptTime ? "error" : ""} />
              </F>
            </div>

            <Button type="primary" htmlType="submit" block loading={formik.isSubmitting} className="!mt-4">
              Register Patient & Book Appointment
            </Button>
          </form>
        </div>

        {/* ── Right: Appointments Table ── */}
        <div style={{ flex: 1, minWidth: 0, background: "#fff", borderRadius: 14,
                      padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <p className="text-[13px] font-bold text-slate-700 mb-4 pb-2 border-b border-slate-100">
            All Appointments
          </p>
          <Table columns={columns} dataSource={appointments} rowKey="_id"
            pagination={{ pageSize: 10 }} size="small" />
        </div>

      </div>
    </div>
  );
}

export default Appointments;
