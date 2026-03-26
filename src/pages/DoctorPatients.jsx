import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Tag, Drawer, Modal, Form, Input,
         DatePicker, message, Button, Popconfirm, Tabs, Badge } from "antd";

const API = "http://localhost:5000";
const patientStatusColor = { Admitted: "gold", "In Operation": "red", Discharged: "green" };
const reqStatusColor     = { Pending: "gold", Accepted: "green", Rejected: "red" };

function DoctorPatients() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  const [patients,        setPatients]        = useState([]);
  const [requests,        setRequests]        = useState([]);
  const [selected,        setSelected]        = useState(null);
  const [dischargeTarget, setDischargeTarget] = useState(null);
  const [notesTarget,     setNotesTarget]     = useState(null);
  const [notesValue,      setNotesValue]      = useState("");
  const [dischargeForm]   = Form.useForm();

  const fetchPatients = useCallback(() =>
    fetch(`${API}/doctor/${user.id}/patients`)
      .then((r) => r.json())
      .then(setPatients)
      .catch(() => {}),
  [user.id]);

  const fetchRequests = useCallback(() =>
    fetch(`${API}/doctor/${user.id}/patient-requests`)
      .then((r) => r.json())
      .then((data) =>
        setRequests(data.map((r) => ({ ...r, _id: r._id?.toString?.() ?? String(r._id) })))
      )
      .catch(() => {}),
  [user.id]);

  useEffect(() => {
    fetchPatients();
    fetchRequests();
  }, [fetchPatients, fetchRequests]);

  // ── Accept / Reject ───────────────────────────────────────────────
  const handleAccept = async (reqId) => {
    const res = await fetch(`${API}/patient-requests/${reqId}/accept`, { method: "PATCH" });
    if (res.ok) {
      message.success("Patient accepted and admitted.");
      fetchPatients();
      fetchRequests();
    } else {
      message.error("Failed to accept patient.");
    }
  };

  const handleReject = async (reqId) => {
    const res = await fetch(`${API}/patient-requests/${reqId}/reject`, { method: "PATCH" });
    if (res.ok) {
      message.warning("Patient request rejected.");
      fetchRequests();
    } else {
      message.error("Failed to reject.");
    }
  };

  // ── Patient Status buttons ────────────────────────────────────────
  const handleStatusChange = async (patientId, newStatus, patient, e) => {
    e?.stopPropagation();
    await fetch(`${API}/patients/${patientId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientStatus: newStatus, doctorId: user.id }),
    });
    setPatients((prev) =>
      prev.map((p) => p._id === patientId ? { ...p, patientStatus: newStatus } : p)
    );
    if (newStatus === "Discharged") {
      dischargeForm.setFieldsValue({
        patientName: patient.name,
        doctorName:  user.name,
        diagnosis:   patient.disease || "",
      });
      setDischargeTarget(patient);
    } else {
      message.success(`Status updated to ${newStatus}`);
    }
  };

  // ── Notes ─────────────────────────────────────────────────────────
  const openNotes = (e, patient) => {
    e.stopPropagation();
    setNotesTarget(patient);
    setNotesValue(patient.notes || "");
  };

  const saveNotes = async () => {
    await fetch(`${API}/patients/${notesTarget._id}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notesValue }),
    });
    message.success("Notes saved.");
    setNotesTarget(null);
    fetchPatients();
  };

  // ── Discharge Report ──────────────────────────────────────────────
  const handleDischargeReport = async (values) => {
    await fetch(`${API}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId:   dischargeTarget._id,
        doctorId:    user.id,
        patientName: values.patientName || "",
        doctorName:  values.doctorName  || "",
        diagnosis:   values.diagnosis   || "",
        medicines:   values.medicines   || "",
        notes:       values.notes       || "",
        followUpDate: values.followUpDate?.format?.("YYYY-MM-DD") || "",
      }),
    });
    message.success("Discharge report saved.");
    dischargeForm.resetFields();
    setDischargeTarget(null);
    fetchPatients();
  };

  const pendingCount = requests.filter((r) => r.status === "Pending").length;

  // ── Status buttons renderer ───────────────────────────────────────
  const StatusButtons = ({ record }) => {
    const current = record.patientStatus || "Admitted";
    return (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <Button
          size="small"
          type={current === "Admitted" ? "primary" : "default"}
          style={current === "Admitted" ? { backgroundColor: "#d97706", borderColor: "#d97706" } : {}}
          onClick={(e) => handleStatusChange(record._id, "Admitted", record, e)}
        >
          Admitted
        </Button>
        <Button
          size="small"
          danger={current === "In Operation"}
          type={current === "In Operation" ? "primary" : "default"}
          onClick={(e) => handleStatusChange(record._id, "In Operation", record, e)}
        >
          In Operation
        </Button>
        <Button
          size="small"
          type={current === "Discharged" ? "primary" : "default"}
          style={current === "Discharged" ? { backgroundColor: "#16a34a", borderColor: "#16a34a" } : {}}
          onClick={(e) => handleStatusChange(record._id, "Discharged", record, e)}
        >
          Discharge
        </Button>
      </div>
    );
  };

  // ── Columns ───────────────────────────────────────────────────────
  const requestColumns = [
    { title: "Patient Name",   render: (_, r) => r.patient?.name          || "—" },
    { title: "Age",            render: (_, r) => r.patient?.age           || "—" },
    { title: "Disease",        dataIndex: "disease", render: (v) => v     || "—" },
    { title: "Department",     render: (_, r) => r.patient?.department    || "—" },
    { title: "Admission Date", render: (_, r) => r.patient?.admissionDate || "—" },
    {
      title: "Status",
      dataIndex: "status",
      render: (s) => <Tag color={reqStatusColor[s] || "default"}>{s}</Tag>,
    },
    {
      title: "Action",
      render: (_, record) => {
        const id = record._id?.toString?.() ?? String(record._id);
        return record.status === "Pending" ? (
          <div className="flex gap-2">
            <Popconfirm title="Accept this patient?" onConfirm={() => handleAccept(id)} okText="Accept" cancelText="No">
              <Button size="small" type="primary">Accept</Button>
            </Popconfirm>
            <Popconfirm title="Reject this patient?" onConfirm={() => handleReject(id)} okText="Reject" cancelText="No" okButtonProps={{ danger: true }}>
              <Button size="small" danger>Reject</Button>
            </Popconfirm>
          </div>
        ) : (
          <span className="text-slate-400 text-xs">{record.status}</span>
        );
      },
    },
  ];

  const patientColumns = [
    { title: "Name",       dataIndex: "name",       sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: "Age",        dataIndex: "age",         sorter: (a, b) => a.age - b.age },
    { title: "Disease",    dataIndex: "disease",     render: (v) => v || "—" },
    { title: "Department", dataIndex: "department" },
    {
      title: "Status",
      render: (_, record) => (
        <Tag color={patientStatusColor[record.patientStatus || "Admitted"]}>
          {record.patientStatus || "Admitted"}
        </Tag>
      ),
    },
    {
      title: "Update Status",
      render: (_, record) => <StatusButtons record={record} />,
    },
    {
      title: "Daily Report",
      render: (_, record) => (
        <Button
          size="small"
          onClick={(e) => { e.stopPropagation(); navigate("/doctor/daily-reports"); }}
        >
          Daily Report
        </Button>
      ),
    },
    {
      title: "Notes",
      render: (_, record) => (
        <Button size="small" onClick={(e) => openNotes(e, record)}>
          {record.notes ? "Edit Notes" : "Add Notes"}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[22px] font-bold">My Patients</h2>
        <p className="text-sm text-slate-500 mt-1">Review incoming requests and manage your patients.</p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <Tabs
          defaultActiveKey="requests"
          items={[
            {
              key: "requests",
              label: (
                <Badge count={pendingCount} size="small" offset={[8, -2]}>
                  <span className="pr-3">Patient Requests</span>
                </Badge>
              ),
              children: (
                <Table
                  columns={requestColumns}
                  dataSource={requests}
                  rowKey="_id"
                  pagination={{ pageSize: 10 }}
                  size="small"
                  locale={{ emptyText: "No patient requests yet." }}
                />
              ),
            },
            {
              key: "patients",
              label: `My Patients (${patients.length})`,
              children: (
                <Table
                  columns={patientColumns}
                  dataSource={patients}
                  rowKey="_id"
                  pagination={{ pageSize: 10 }}
                  size="small"
                  onRow={(record) => ({ onClick: () => setSelected(record), style: { cursor: "pointer" } })}
                  locale={{ emptyText: "No accepted patients yet." }}
                />
              ),
            },
          ]}
        />
      </div>

      {/* Patient Detail Drawer */}
      <Drawer title="Patient Details" open={!!selected} onClose={() => setSelected(null)} width={380}>
        {selected && (
          <div className="space-y-3 text-sm">
            {[
              ["Name",           selected.name],
              ["Age",            selected.age],
              ["Gender",         selected.gender       || "—"],
              ["Phone",          selected.phone        || "—"],
              ["Disease",        selected.disease      || "—"],
              ["Department",     selected.department],
              ["Admission Date", selected.admissionDate || "—"],
            ].map(([l, v]) => (
              <p key={l}>
                <span className="text-slate-500 w-36 inline-block">{l}:</span>
                <strong>{v}</strong>
              </p>
            ))}
            <p>
              <span className="text-slate-500 w-36 inline-block">Patient Status:</span>
              <Tag color={patientStatusColor[selected.patientStatus || "Admitted"]}>
                {selected.patientStatus || "Admitted"}
              </Tag>
            </p>
            {selected.notes && (
              <div>
                <p className="text-slate-500 mb-1">Notes:</p>
                <p className="bg-slate-50 rounded p-2 text-xs leading-relaxed">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Notes Modal */}
      <Modal
        title={`Notes — ${notesTarget?.name}`}
        open={!!notesTarget}
        onCancel={() => setNotesTarget(null)}
        onOk={saveNotes}
        okText="Save Notes"
      >
        <Input.TextArea
          rows={5}
          value={notesValue}
          onChange={(e) => setNotesValue(e.target.value)}
          placeholder="Enter clinical notes for this patient..."
          className="mt-3"
        />
      </Modal>

      {/* Discharge Modal — simple */}
      <Modal
        title={`Discharge — ${dischargeTarget?.name}`}
        open={!!dischargeTarget}
        onCancel={() => { setDischargeTarget(null); dischargeForm.resetFields(); }}
        footer={null}
        width={480}
      >
        <Form form={dischargeForm} layout="vertical" onFinish={handleDischargeReport} className="mt-3">
          <Form.Item name="patientName" hidden><Input /></Form.Item>
          <Form.Item name="doctorName"  hidden><Input /></Form.Item>
          <Form.Item name="diagnosis"   hidden><Input /></Form.Item>

          <Form.Item name="medicines" label="Medicines Prescribed">
            <Input.TextArea rows={3} placeholder="e.g. Paracetamol 500mg — twice daily for 5 days" />
          </Form.Item>

          <Form.Item name="notes" label="Home Care Instructions">
            <Input.TextArea rows={3} placeholder="e.g. Rest for 1 week, avoid cold food, stay hydrated..." />
          </Form.Item>

          <Form.Item name="followUpDate" label="Follow-up Date">
            <DatePicker className="w-full" placeholder="Select follow-up date" />
          </Form.Item>

          <Form.Item className="mb-0">
            <Button type="primary" htmlType="submit" block>Save &amp; Discharge</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default DoctorPatients;
