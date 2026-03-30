import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Tag, Modal, Input, Button, Popconfirm, Tabs, Badge, App } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { pushNotif as pushNotifAction, setPendingRequestCount } from "@store/notificationSlice";

const API = "http://localhost:5000";
const patientStatusColor = { Admitted: "gold", "In Operation": "red", Discharged: "green" };
const reqStatusColor     = { Pending: "gold", Accepted: "green", Rejected: "red" };

function DoctorPatients() {
  const { message } = App.useApp();
  const user = useSelector((state) => state.auth.user) || {};
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const pushNotif = (target, msg) => dispatch(pushNotifAction({ target, message: msg }));

  const [patients,    setPatients]    = useState([]);
  const [requests,    setRequests]    = useState([]);
  const [notesTarget, setNotesTarget] = useState(null);
  const [notesValue,  setNotesValue]  = useState("");
  const [activeTab,   setActiveTab]   = useState("requests");

  const fetchPatients = useCallback(() =>
    fetch(`${API}/doctor/${user.id}/patients`)
      .then((r) => r.json())
      .then(setPatients)
      .catch(() => {}),
  [user.id]);

  const fetchRequests = useCallback(() =>
    fetch(`${API}/doctor/${user.id}/patient-requests`)
      .then((r) => r.json())
      .then((data) => {
        const normalized = data.map((r) => ({ ...r, _id: r._id?.toString?.() ?? String(r._id) }));
        setRequests(normalized);
        dispatch(setPendingRequestCount(normalized.filter((r) => r.status === "Pending").length));
      })
      .catch(() => {}),
  [user.id, dispatch]);

  useEffect(() => {
    fetchPatients();
    fetchRequests();
  }, [fetchPatients, fetchRequests]);

  // ── Accept / Reject ───────────────────────────────────────────────
  const handleAccept = async (reqId) => {
    const req = requests.find((r) => r._id === reqId);
    const res = await fetch(`${API}/patient-requests/${reqId}/accept`, { method: "PATCH" });
    if (res.ok) {
      // move the matching appointment to "In Work"
      if (req?.patient?.name) {
        const appts = await fetch(`${API}/doctor/${user.id}/appointments`).then((r) => r.json()).catch(() => []);
        const match = appts.find((a) => a.patient === req.patient.name && a.status !== "Completed");
        if (match) {
          await fetch(`${API}/appointments/${match._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "In Work" }),
          });
        }
      }
      message.success("Patient accepted and admitted.");
      await fetchPatients();
      fetchRequests();
      setActiveTab("patients");
    } else {
      message.error("Failed to accept patient.");
    }
  };

  const handleReject = async (reqId) => {
    const req = requests.find((r) => (r._id?.toString?.() ?? String(r._id)) === reqId);
    const res = await fetch(`${API}/patient-requests/${reqId}/reject`, { method: "PATCH" });
    if (res.ok) {
      if (req) {
        const patientName = req.patient?.name || req.disease || "Unknown patient";
        pushNotif("admin", `Dr. ${user.name} rejected patient request: ${patientName} (${req.patient?.department || ""}).`);
      }
      message.warning("Patient request rejected.");
      fetchRequests();
    } else {
      message.error("Failed to reject.");
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

  const pendingCount = requests.filter((r) => r.status === "Pending").length;

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
      title: "Notes",
      render: (_, record) => (
        <Button size="small" onClick={(e) => openNotes(e, record)}>
          {record.notes ? "Edit Notes" : "Add Notes"}
        </Button>
      ),
    },
    {
      title: "Daily Report",
      render: (_, record) => (
        <Button size="small" onClick={(e) => { e.stopPropagation(); navigate("/doctor/daily-reports"); }}>
          Daily Report
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1d2e", margin: 0 }}>My Patients</h2>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Review incoming requests and manage your patients.</p>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
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
                  onRow={(record) => ({ style: { cursor: "default" } })}
                  locale={{ emptyText: "No accepted patients yet." }}
                />
              ),
            },
          ]}
        />
      </div>

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


    </div>
  );
}

export default DoctorPatients;
