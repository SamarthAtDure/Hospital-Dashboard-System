import React, { useState } from "react";
import { Table, Tag, Card, Popconfirm, message, Progress,
         Button, Modal, Form, Input, Select, Skeleton, TimePicker, Checkbox } from "antd";
import dayjs from "dayjs";
// import { useDoctors, isOnShift } from "../context/DoctorContext";
import { useDoctors, isOnShift } from "@context/DoctorContext";

const availColor  = { Available: "green", Busy: "gold", "On Leave": "red" };
const expToPercent = (exp) => Math.min(Math.round((parseInt(exp) / 20) * 100), 100);
const API = "http://localhost:5000";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEPTS = ["Cardiology","Neurology","Orthopedics","Pediatrics","General","Dermatology","Radiology","Oncology"];

function Doctors() {
  const { doctors, loading, fetchDoctors, updateWorkingHours } = useDoctors();

  const [addOpen,   setAddOpen]   = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [hoursDoc,  setHoursDoc]  = useState(null); // doctor being edited
  const [addForm]   = Form.useForm();
  const [hoursForm] = Form.useForm();

  const handleAdd = async (values) => {
    await fetch(`${API}/doctors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, availabilityStatus: values.availabilityStatus || "Available" }),
    });
    message.success("Doctor added");
    addForm.resetFields();
    setAddOpen(false);
    fetchDoctors();
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/doctors/${id}`, { method: "DELETE" });
    message.success("Doctor removed");
    fetchDoctors();
  };

  const openHours = (doc) => {
    setHoursDoc(doc);
    const wh = doc.workingHours;
    hoursForm.setFieldsValue({
      start: wh?.start ? dayjs(wh.start, "HH:mm") : null,
      end:   wh?.end   ? dayjs(wh.end,   "HH:mm") : null,
      days:  wh?.days  || ["Mon","Tue","Wed","Thu","Fri"],
    });
    setHoursOpen(true);
  };

  const handleSaveHours = async (values) => {
    const workingHours = {
      start: values.start?.format("HH:mm") || "",
      end:   values.end?.format("HH:mm")   || "",
      days:  values.days || [],
    };
    await updateWorkingHours(hoursDoc._id, workingHours);
    message.success("Working hours saved.");
    setHoursOpen(false);
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
    const pct = Math.min(count * 10, 100); // 10 patients = 100%
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

      {/* Cards — skeleton while loading */}
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

                  {/* Working hours + shift status */}
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

                  {/* Load bar */}
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

      {/* Table — skeleton while loading */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        {loading
          ? <Skeleton active paragraph={{ rows: 6 }} />
          : <Table columns={columns} dataSource={doctors} rowKey="_id" pagination={{ pageSize: 8 }} />
        }
      </div>

      {/* Add Doctor Modal */}
      <Modal title="Add Doctor" open={addOpen} onCancel={() => setAddOpen(false)} footer={null}>
        <Form form={addForm} layout="vertical" onFinish={handleAdd} className="mt-4">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Enter doctor name" />
          </Form.Item>
          <Form.Item name="specialization" label="Specialization" rules={[{ required: true }]}>
            <Input placeholder="e.g. Interventional Cardiology" />
          </Form.Item>
          <Form.Item name="department" label="Department" rules={[{ required: true }]}>
            <Select placeholder="Select department" options={DEPTS.map((d) => ({ value: d, label: d }))} />
          </Form.Item>
          <Form.Item name="experience" label="Experience" rules={[{ required: true }]}>
            <Input placeholder="e.g. 10 yrs" />
          </Form.Item>
          <Form.Item name="availabilityStatus" label="Availability" rules={[{ required: true }]}>
            <Select placeholder="Select status" options={[
              { value: "Available", label: "Available" },
              { value: "Busy",      label: "Busy" },
              { value: "On Leave",  label: "On Leave" },
            ]} />
          </Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block>Add Doctor</Button></Form.Item>
        </Form>
      </Modal>

      {/* Set Working Hours Modal */}
      <Modal
        title={`Working Hours — ${hoursDoc?.name}`}
        open={hoursOpen}
        onCancel={() => setHoursOpen(false)}
        footer={null}
      >
        <Form form={hoursForm} layout="vertical" onFinish={handleSaveHours} className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="start" label="Shift Start">
              <TimePicker format="HH:mm" className="w-full" minuteStep={15} />
            </Form.Item>
            <Form.Item name="end" label="Shift End">
              <TimePicker format="HH:mm" className="w-full" minuteStep={15} />
            </Form.Item>
          </div>
          <Form.Item name="days" label="Working Days">
            <Checkbox.Group options={DAYS} />
          </Form.Item>
          <Form.Item className="mb-0">
            <Button type="primary" htmlType="submit" block>Save Working Hours</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Doctors;
