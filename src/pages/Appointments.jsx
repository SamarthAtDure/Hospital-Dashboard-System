import React, { useState, useEffect } from "react";
import { Table, Tag, Button, Input, Select, DatePicker, TimePicker, Modal, notification, Popconfirm } from "antd";
import { useFormik } from "formik";
import * as Yup from "yup";
import dayjs from "dayjs";

const API = "http://localhost:5000";
const statusColor = { Confirmed: "green", Pending: "gold", Cancelled: "red" };

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [open, setOpen] = useState(false);
  const [api, contextHolder] = notification.useNotification();

  const appointmentSchema = Yup.object({
    patient: Yup.string()
      .trim()
      .required("Patient name is required")
      .min(2, "Name must be at least 2 characters"),
    department: Yup.string()
      .required("Department is required"),
    date: Yup.date()
      .typeError("Select a valid date")
      .required("Date is required")
      .min(dayjs().startOf("day").toDate(), "Date cannot be in the past"),
    time: Yup.string()
      .required("Time is required"),
  });

  const formik = useFormik({
    initialValues: { patient: "", department: "", date: null, time: null },
    validationSchema: appointmentSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      await fetch(`${API}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient: values.patient,
          department: values.department,
          date: dayjs(values.date).format("YYYY-MM-DD"),
          time: dayjs(values.time).format("HH:mm"),
          status: "Pending",
        }),
      });
      resetForm();
      setOpen(false);
      fetchAppointments();
      api.success({
        message: "Appointment Booked",
        description: `${values.patient} scheduled for ${values.department} on ${dayjs(values.date).format("MMM D, YYYY")} at ${dayjs(values.time).format("HH:mm")}.`,
        placement: "topRight",
        duration: 4,
      });
      setSubmitting(false);
    },
  });

  const fetchAppointments = async () => {
    const data = await fetch(`${API}/appointments`).then((r) => r.json());
    setAppointments(data);
  };

  useEffect(() => { fetchAppointments(); }, []);



  const updateStatus = async (id, status) => {
    await fetch(`${API}/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchAppointments();
    api[status === "Confirmed" ? "success" : "error"]({
      message: `Appointment ${status}`,
      placement: "topRight",
      duration: 3,
    });
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/appointments/${id}`, { method: "DELETE" });
    fetchAppointments();
    api.info({ message: "Appointment deleted", placement: "topRight", duration: 3 });
  };

  const columns = [
    { title: "Patient", dataIndex: "patient", sorter: (a, b) => a.patient.localeCompare(b.patient) },
    { title: "Department", dataIndex: "department" },
    { title: "Date", dataIndex: "date", sorter: (a, b) => new Date(a.date) - new Date(b.date) },
    { title: "Time", dataIndex: "time" },
    {
      title: "Status", dataIndex: "status",
      filters: [{ text: "Confirmed", value: "Confirmed" }, { text: "Pending", value: "Pending" }, { text: "Cancelled", value: "Cancelled" }],
      onFilter: (value, record) => record.status === value,
      render: (s) => <Tag color={statusColor[s]}>{s}</Tag>,
    },
    {
      title: "Action",
      render: (_, record) => (
        <div className="flex gap-2">
          {record.status === "Pending" && (
            <>
              <Button size="small" type="primary" onClick={() => updateStatus(record._id, "Confirmed")}>Approve</Button>
              <Button size="small" danger onClick={() => updateStatus(record._id, "Cancelled")}>Reject</Button>
            </>
          )}
          <Popconfirm title="Delete this appointment?" onConfirm={() => handleDelete(record._id)} okText="Yes" cancelText="No">
            <Button size="small">Delete</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      {contextHolder}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold">Appointments</h2>
          <p className="text-sm text-slate-500 mt-1">All scheduled patient appointments.</p>
        </div>
        <Button type="primary" onClick={() => setOpen(true)}>+ Book Appointment</Button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <Table columns={columns} dataSource={appointments} rowKey="_id" pagination={{ pageSize: 8 }} />
      </div>

      <Modal
        title="Book Appointment"
        open={open}
        onCancel={() => { setOpen(false); formik.resetForm(); }}
        footer={null}
      >
        <form onSubmit={formik.handleSubmit} noValidate className="mt-4">

          {/* Patient Name */}
          <div className="mb-3">
            <label className="block text-[13px] font-semibold mb-1">Patient Name</label>
            <Input
              name="patient"
              placeholder="Enter patient name"
              value={formik.values.patient}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              status={formik.touched.patient && formik.errors.patient ? "error" : ""}
            />
            {formik.touched.patient && formik.errors.patient && (
              <p className="text-red-500 text-xs mt-1">{formik.errors.patient}</p>
            )}
          </div>

          {/* Department */}
          <div className="mb-3">
            <label className="block text-[13px] font-semibold mb-1">Department</label>
            <Select
              className="w-full"
              placeholder="Select department"
              value={formik.values.department || undefined}
              onChange={(val) => formik.setFieldValue("department", val)}
              onBlur={() => formik.setFieldTouched("department", true)}
              status={formik.touched.department && formik.errors.department ? "error" : ""}
              options={[
                { value: "Cardiology", label: "Cardiology" },
                { value: "Neurology", label: "Neurology" },
                { value: "Orthopedics", label: "Orthopedics" },
                { value: "Pediatrics", label: "Pediatrics" },
                { value: "General", label: "General" },
              ]}
            />
            {formik.touched.department && formik.errors.department && (
              <p className="text-red-500 text-xs mt-1">{formik.errors.department}</p>
            )}
          </div>

          {/* Date */}
          <div className="mb-3">
            <label className="block text-[13px] font-semibold mb-1">Date</label>
            <DatePicker
              className="w-full"
              value={formik.values.date ? dayjs(formik.values.date) : null}
              onChange={(date) => formik.setFieldValue("date", date ? date.toDate() : null)}
              onBlur={() => formik.setFieldTouched("date", true)}
              status={formik.touched.date && formik.errors.date ? "error" : ""}
              disabledDate={(current) => current && current < dayjs().startOf("day")}
            />
            {formik.touched.date && formik.errors.date && (
              <p className="text-red-500 text-xs mt-1">{formik.errors.date}</p>
            )}
          </div>

          {/* Time */}
          <div className="mb-4">
            <label className="block text-[13px] font-semibold mb-1">Time</label>
            <TimePicker
              className="w-full"
              format="HH:mm"
              value={formik.values.time ? dayjs(formik.values.time) : null}
              onChange={(time) => formik.setFieldValue("time", time ? time.toDate() : null)}
              onBlur={() => formik.setFieldTouched("time", true)}
              status={formik.touched.time && formik.errors.time ? "error" : ""}
            />
            {formik.touched.time && formik.errors.time && (
              <p className="text-red-500 text-xs mt-1">{formik.errors.time}</p>
            )}
          </div>

          <Button type="primary" htmlType="submit" block loading={formik.isSubmitting}>
            Confirm Booking
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export default Appointments;
