import React, { useState, useEffect } from "react";
import { Table, Tag, Button, Input, Form, Select, DatePicker, TimePicker, Modal, notification, Popconfirm } from "antd";

const API = "http://localhost:5000";
const statusColor = { Confirmed: "green", Pending: "gold", Cancelled: "red" };

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [api, contextHolder] = notification.useNotification();

  const fetchAppointments = async () => {
    const data = await fetch(`${API}/appointments`).then((r) => r.json());
    setAppointments(data);
  };

  useEffect(() => { fetchAppointments(); }, []);

  const handleSubmit = async (values) => {
    await fetch(`${API}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient: values.patient,
        department: values.department,
        date: values.date.format("YYYY-MM-DD"),
        time: values.time.format("HH:mm"),
        status: "Pending",
      }),
    });
    form.resetFields();
    setOpen(false);
    fetchAppointments();
    api.success({
      message: "Appointment Booked",
      description: `${values.patient} scheduled for ${values.department} on ${values.date.format("MMM D, YYYY")} at ${values.time.format("HH:mm")}.`,
      placement: "topRight",
      duration: 4,
    });
  };

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

      <Modal title="Book Appointment" open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
          <Form.Item name="patient" label="Patient Name" rules={[{ required: true }]}>
            <Input placeholder="Enter patient name" />
          </Form.Item>
          <Form.Item name="department" label="Department" rules={[{ required: true }]}>
            <Select placeholder="Select department" options={[
              { value: "Cardiology", label: "Cardiology" },
              { value: "Neurology", label: "Neurology" },
              { value: "Orthopedics", label: "Orthopedics" },
              { value: "Pediatrics", label: "Pediatrics" },
              { value: "General", label: "General" },
            ]} />
          </Form.Item>
          <Form.Item name="date" label="Date" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="time" label="Time" rules={[{ required: true }]}>
            <TimePicker className="w-full" format="HH:mm" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>Confirm Booking</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Appointments;
