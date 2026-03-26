import React, { useState, useEffect } from "react";
import { Table, Tag, Button, Select, Modal, Form, Input, message } from "antd";

const API = "http://localhost:5000";
const statusColor = { Confirmed: "green", Pending: "gold", Cancelled: "red", Completed: "blue" };
const { TextArea } = Input;

function DoctorAppointments() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [appointments, setAppointments] = useState([]);
  const [notesTarget, setNotesTarget] = useState(null); // appointment being edited
  const [form] = Form.useForm();

  const fetch_ = () =>
    fetch(`${API}/doctor/${user.id}/appointments`)
      .then((r) => r.json())
      .then(setAppointments);

  useEffect(() => { fetch_(); }, [user.id]);

  const updateStatus = async (id, status) => {
    await fetch(`${API}/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    message.success(`Status updated to ${status}`);
    fetch_();
  };

  const saveNotes = async (values) => {
    await fetch(`${API}/appointments/${notesTarget._id}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    message.success("Notes saved");
    setNotesTarget(null);
    fetch_();
  };

  const openNotes = (record) => {
    setNotesTarget(record);
    form.setFieldsValue({ notes: record.notes || "", prescription: record.prescription || "" });
  };

  const columns = [
    { title: "Patient",    dataIndex: "patient",    sorter: (a, b) => a.patient?.localeCompare(b.patient) },
    { title: "Department", dataIndex: "department" },
    { title: "Date",       dataIndex: "date",       sorter: (a, b) => new Date(a.date) - new Date(b.date) },
    { title: "Time",       dataIndex: "time" },
    {
      title: "Status", dataIndex: "status",
      render: (s, record) => (
        <Select
          value={s}
          size="small"
          style={{ width: 130 }}
          onChange={(val) => updateStatus(record._id, val)}
          options={[
            { value: "Pending",   label: <Tag color="gold">Pending</Tag> },
            { value: "Confirmed", label: <Tag color="green">Confirmed</Tag> },
            { value: "Completed", label: <Tag color="blue">Completed</Tag> },
            { value: "Cancelled", label: <Tag color="red">Cancelled</Tag> },
          ]}
        />
      ),
    },
    {
      title: "Notes",
      render: (_, record) => (
        <Button size="small" onClick={() => openNotes(record)}>
          {record.notes ? "Edit Notes" : "Add Notes"}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[22px] font-bold">My Appointments</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your patient appointments.</p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <Table columns={columns} dataSource={appointments} rowKey="_id" pagination={{ pageSize: 10 }} />
      </div>

      <Modal
        title="Notes & Prescription"
        open={!!notesTarget}
        onCancel={() => setNotesTarget(null)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={saveNotes} className="mt-4">
          <Form.Item name="notes" label="Clinical Notes">
            <TextArea rows={3} placeholder="Enter clinical notes..." />
          </Form.Item>
          <Form.Item name="prescription" label="Prescription">
            <TextArea rows={3} placeholder="Enter prescription..." />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>Save</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default DoctorAppointments;
