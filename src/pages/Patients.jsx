import React, { useState, useEffect, useMemo } from "react";
import { Table, Tag, Modal, Button, Input, Select,
         Popconfirm, Descriptions, App } from "antd";

const API = "http://localhost:5000";
const DEPARTMENTS = ["Cardiology","Neurology","Orthopedics","Pediatrics","General","Dermatology","Radiology","Oncology"];
const reqStatusColor     = { Pending: "gold", Accepted: "green", Rejected: "red", "—": "default" };
const patientStatusColor = { Admitted: "gold", "In Operation": "red", Discharged: "green", Pending: "default" };

function Patients() {
  const { message } = App.useApp();
  const [patients,    setPatients]    = useState([]);
  const [doctors,     setDoctors]     = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [search,      setSearch]      = useState("");
  const [deptFilter,  setDeptFilter]  = useState(null);
  const [doctorFilter,setDoctorFilter]= useState(null);

  const fetchAll = async () => {
    const [p, d] = await Promise.all([
      fetch(`${API}/patients`).then((r) => r.json()),
      fetch(`${API}/doctors`).then((r) => r.json()),
    ]);
    setPatients(p);
    setDoctors(d);
  };

  useEffect(() => { fetchAll(); }, []);

  const doctorName = (id) => {
    if (!id) return "—";
    const doc = doctors.find((d) => d._id?.toString() === id);
    return doc ? doc.name : "—";
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/patients/${id}`, { method: "DELETE" });
    message.success("Patient deleted");
    fetchAll();
  };

  const displayed = useMemo(() => patients.filter((p) => {
    const matchSearch = !search       || p.name?.toLowerCase().includes(search.toLowerCase());
    const matchDept   = !deptFilter   || p.department === deptFilter;
    const matchDoctor = !doctorFilter || p.doctorId   === doctorFilter;
    return matchSearch && matchDept && matchDoctor;
  }), [patients, search, deptFilter, doctorFilter]);

  const columns = [
    { title: "Name",       dataIndex: "name",       sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: "Age",        dataIndex: "age",         sorter: (a, b) => a.age - b.age },
    { title: "Gender",     dataIndex: "gender",      render: (v) => v || "—" },
    { title: "Disease",    dataIndex: "disease",     render: (v) => v || "—" },
    { title: "Department", dataIndex: "department" },
    { title: "Assigned Doctor", dataIndex: "doctorId", render: (id) => doctorName(id) },
    { title: "Request Status", dataIndex: "requestStatus",
      render: (s) => <Tag color={reqStatusColor[s] || "default"}>{s || "—"}</Tag> },
    { title: "Patient Status", dataIndex: "patientStatus",
      render: (s) => <Tag color={patientStatusColor[s || "Pending"]}>{s || "Pending"}</Tag> },
    {
      title: "Actions",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button size="small" type="primary" ghost onClick={(e) => { e.stopPropagation(); setSelected(record); }}>View Details</Button>
          <Popconfirm
            title="Delete this patient?"
            onConfirm={(e) => { e?.stopPropagation(); handleDelete(record._id); }}
            onCancel={(e) => e?.stopPropagation()}
            okText="Yes" cancelText="No"
          >
            <Button size="small" danger onClick={(e) => e.stopPropagation()}>Delete</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1d2e", margin: 0 }}>Patients</h2>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Manage all registered patients.</p>
      </div>

      {/* Search + Filters */}
      <div style={{ background: "#fff", borderRadius: 14, padding: "14px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <Input.Search placeholder="Search by patient name..." allowClear style={{ width: 240 }}
          onChange={(e) => setSearch(e.target.value)} onSearch={(v) => setSearch(v)} />
        <Select allowClear placeholder="Filter by Department" style={{ width: 190 }}
          onChange={setDeptFilter} options={DEPARTMENTS.map((d) => ({ value: d, label: d }))} />
        <Select allowClear placeholder="Filter by Doctor" style={{ width: 200 }}
          onChange={setDoctorFilter}
          options={doctors.map((d) => ({ value: d._id?.toString(), label: d.name }))} />
        <span className="text-xs text-slate-400 ml-auto">
          {displayed.length} patient{displayed.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <Table columns={columns} dataSource={displayed} rowKey="_id" pagination={{ pageSize: 10 }}
          onRow={() => ({})} />
      </div>

      {/* Patient Detail Modal — centered */}
      <Modal
        title={`Patient Details — ${selected?.name}`}
        open={!!selected}
        onCancel={() => setSelected(null)}
        footer={<Button onClick={() => setSelected(null)}>Close</Button>}
        width={520}
        centered
      >
        {selected && (
          <Descriptions column={1} size="small" bordered className="mt-3">
            <Descriptions.Item label="Name">{selected.name || "—"}</Descriptions.Item>
            <Descriptions.Item label="Age">{selected.age || "—"}</Descriptions.Item>
            <Descriptions.Item label="Gender">{selected.gender || "—"}</Descriptions.Item>
            <Descriptions.Item label="Phone">{selected.phone || "—"}</Descriptions.Item>
            <Descriptions.Item label="Disease">{selected.disease || "—"}</Descriptions.Item>
            <Descriptions.Item label="Department">{selected.department || "—"}</Descriptions.Item>
            <Descriptions.Item label="Admission Date">{selected.admissionDate || "—"}</Descriptions.Item>
            <Descriptions.Item label="Assigned Doctor">{doctorName(selected.doctorId)}</Descriptions.Item>
            <Descriptions.Item label="Request Status">
              <Tag color={reqStatusColor[selected.requestStatus] || "default"}>{selected.requestStatus || "—"}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Patient Status">
              <Tag color={patientStatusColor[selected.patientStatus || "Pending"]}>{selected.patientStatus || "Pending"}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>


    </div>
  );
}

export default Patients;
