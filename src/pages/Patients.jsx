import React, { useState, useEffect, useMemo } from "react";
import { Table, Tag, Drawer, Button, Modal, Form, Input, Select,
         Popconfirm, message, DatePicker, Descriptions, Empty, Alert } from "antd";
// import { useDoctors, pickBestDoctor, isOnShift } from "../context/DoctorContext";
import { useDoctors, pickBestDoctor, isOnShift } from "@context/DoctorContext";

const API = "http://localhost:5000";
const DEPARTMENTS = ["Cardiology","Neurology","Orthopedics","Pediatrics","General","Dermatology","Radiology","Oncology"];
const reqStatusColor     = { Pending: "gold", Accepted: "green", Rejected: "red", "—": "default" };
const patientStatusColor = { Admitted: "gold", "In Operation": "red", Discharged: "green", Pending: "default" };

// ── Printable report component ────────────────────────────────────
function ReportPrint({ report: r }) {
  const row = (label, value) => value ? (
    <div style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13 }}>
      <span style={{ color: "#64748b", minWidth: 160 }}>{label}:</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  ) : null;
  return (
    <div id="discharge-report-print" style={{ fontFamily: "Arial, sans-serif", padding: 32, color: "#1e293b" }}>
      <div style={{ textAlign: "center", borderBottom: "2px solid #2563eb", paddingBottom: 16, marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#2563eb" }}>MediDash Hospital</h1>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "6px 0 0" }}>Discharge Report</h2>
        <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>Generated: {new Date(r.createdAt).toLocaleString()}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 20 }}>
        <div>
          <p style={{ fontWeight: 700, marginBottom: 8, color: "#2563eb" }}>Patient Information</p>
          {row("Patient Name", r.patientName)}{row("Admission Date", r.admissionDate)}
          {row("Discharge Date", r.dischargeDate)}{row("Follow-up Date", r.followUpDate)}
        </div>
        <div>
          <p style={{ fontWeight: 700, marginBottom: 8, color: "#2563eb" }}>Doctor Information</p>
          {row("Attending Doctor", r.doctorName)}{row("Blood Pressure", r.bloodPressure)}
          {row("Temperature", r.temperature)}{row("Weight", r.weight)}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 700, marginBottom: 8, color: "#2563eb" }}>Clinical Details</p>
        {row("Diagnosis", r.diagnosis)}{row("Allergies", r.allergies)}
      </div>
      {r.treatment && <div style={{ marginBottom: 12 }}><p style={{ fontWeight: 600, marginBottom: 4 }}>Treatment Given</p><p style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: 6, fontSize: 13 }}>{r.treatment}</p></div>}
      {r.medicines && <div style={{ marginBottom: 12 }}><p style={{ fontWeight: 600, marginBottom: 4 }}>Medicines Prescribed</p><p style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: 6, fontSize: 13 }}>{r.medicines}</p></div>}
      {r.operationDetails && <div style={{ marginBottom: 12 }}><p style={{ fontWeight: 600, marginBottom: 4 }}>Operation Details</p><p style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: 6, fontSize: 13 }}>{r.operationDetails}</p></div>}
      {r.notes && <div style={{ marginBottom: 12 }}><p style={{ fontWeight: 600, marginBottom: 4 }}>Additional Notes</p><p style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: 6, fontSize: 13 }}>{r.notes}</p></div>}
      <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 24, paddingTop: 12, fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
        MediDash Hospital Management System — Confidential Medical Record
      </div>
    </div>
  );
}

function Patients() {
  const { doctors: contextDoctors } = useDoctors();

  const [patients,      setPatients]      = useState([]);
  const [doctors,       setDoctors]       = useState([]);
  const [selected,      setSelected]      = useState(null);
  const [open,          setOpen]          = useState(false);
  const [reportPatient, setReportPatient] = useState(null);
  const [report,        setReport]        = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [suggested,     setSuggested]     = useState(null); // round-robin suggestion
  const [form] = Form.useForm();

  const [search,       setSearch]       = useState("");
  const [deptFilter,   setDeptFilter]   = useState(null);
  const [doctorFilter, setDoctorFilter] = useState(null);
  const [formDept,     setFormDept]     = useState(null);

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

  const filteredDoctors = useMemo(
    () => formDept ? doctors.filter((d) => d.department === formDept) : [],
    [formDept, doctors]
  );

  // ── Round-robin: when dept selected, auto-pick best doctor ────────
  const handleDeptChange = (val) => {
    setFormDept(val);
    form.setFieldValue("doctorId", undefined);
    setSuggested(null);
    if (!val) return;
    const best = pickBestDoctor(contextDoctors, val);
    if (best) {
      setSuggested(best);
      form.setFieldValue("doctorId", best._id?.toString());
    }
  };

  // ── Open report drawer ────────────────────────────────────────────
  const openReport = async (e, patient) => {
    e.stopPropagation();
    setReportPatient(patient);
    setReport(null);
    setReportLoading(true);
    const data = await fetch(`${API}/reports/${patient._id}`).then((r) => r.json());
    setReport(data.length > 0 ? data[data.length - 1] : null);
    setReportLoading(false);
  };

  // ── Download PDF ──────────────────────────────────────────────────
  const handleDownload = () => {
    const content = document.getElementById("discharge-report-print");
    if (!content) return;
    const w = window.open("", "_blank", "width=800,height=900");
    w.document.write(`<html><head><title>Discharge Report — ${report?.patientName || ""}</title>
      <style>body{margin:0;font-family:Arial,sans-serif;}@media print{body{-webkit-print-color-adjust:exact;}}</style>
      </head><body>${content.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  };

  // ── Add patient ───────────────────────────────────────────────────
  const handleAdd = async (values) => {
    const res = await fetch(`${API}/patients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name, age: values.age, gender: values.gender,
        phone: values.phone, disease: values.disease,
        department: values.department, doctorId: values.doctorId,
        admissionDate: values.admissionDate?.format("YYYY-MM-DD"),
      }),
    });
    if (res.ok) {
      message.success("Patient added and request sent to doctor.");
      form.resetFields(); setFormDept(null); setSuggested(null); setOpen(false);
      fetchAll();
    } else {
      message.error("Failed to add patient.");
    }
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
      title: "Report",
      render: (_, record) => record.patientStatus === "Discharged"
        ? <Button size="small" type="primary" ghost onClick={(e) => openReport(e, record)}>View Report</Button>
        : <span className="text-slate-300 text-xs">—</span>,
    },
    {
      title: "Action",
      render: (_, record) => (
        <Popconfirm title="Delete this patient?" onConfirm={() => handleDelete(record._id)} okText="Yes" cancelText="No">
          <Button size="small" danger>Delete</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold">Patients</h2>
          <p className="text-sm text-slate-500 mt-1">Manage all registered patients.</p>
        </div>
        <Button type="primary" onClick={() => setOpen(true)}>+ Add Patient</Button>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-5 flex flex-wrap gap-3 items-center">
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
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <Table columns={columns} dataSource={displayed} rowKey="_id" pagination={{ pageSize: 10 }}
          onRow={(record) => ({ onClick: () => setSelected(record), style: { cursor: "pointer" } })} />
      </div>

      {/* Patient Detail Drawer */}
      <Drawer title="Patient Details" open={!!selected} onClose={() => setSelected(null)} width={380}>
        {selected && (
          <div className="space-y-3 text-sm">
            {[["Name", selected.name], ["Age", selected.age], ["Gender", selected.gender || "—"],
              ["Phone", selected.phone || "—"], ["Disease", selected.disease || "—"],
              ["Department", selected.department], ["Admission Date", selected.admissionDate || "—"],
              ["Assigned Doctor", doctorName(selected.doctorId)]
            ].map(([l, v]) => (
              <p key={l}><span className="text-slate-500 w-36 inline-block">{l}:</span><strong>{v}</strong></p>
            ))}
            <p><span className="text-slate-500 w-36 inline-block">Request Status:</span>
              <Tag color={reqStatusColor[selected.requestStatus] || "default"}>{selected.requestStatus || "—"}</Tag></p>
            <p><span className="text-slate-500 w-36 inline-block">Patient Status:</span>
              <Tag color={patientStatusColor[selected.patientStatus || "Pending"]}>{selected.patientStatus || "Pending"}</Tag></p>
          </div>
        )}
      </Drawer>

      {/* Discharge Report Drawer */}
      <Drawer
        title={`Discharge Report — ${reportPatient?.name}`}
        open={!!reportPatient}
        onClose={() => { setReportPatient(null); setReport(null); }}
        width={680}
        extra={report && <Button type="primary" onClick={handleDownload}>Download PDF</Button>}
      >
        {reportLoading && <p className="text-slate-400 text-sm">Loading report...</p>}
        {!reportLoading && !report && <Empty description="No discharge report found for this patient." />}
        {!reportLoading && report && (
          <>
            <div style={{ display: "none" }}><ReportPrint report={report} /></div>
            <div id="discharge-report-print">
              <div className="text-center border-b-2 border-blue-600 pb-4 mb-6">
                <h2 className="text-xl font-bold text-blue-600 m-0">MediDash Hospital</h2>
                <p className="text-sm font-semibold mt-1">Discharge Report</p>
                <p className="text-xs text-slate-400 mt-1">Generated: {new Date(report.createdAt).toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-6 mb-5">
                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase mb-2">Patient Information</p>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Patient Name">{report.patientName || "—"}</Descriptions.Item>
                    <Descriptions.Item label="Admission Date">{report.admissionDate || "—"}</Descriptions.Item>
                    <Descriptions.Item label="Discharge Date">{report.dischargeDate || "—"}</Descriptions.Item>
                    <Descriptions.Item label="Follow-up Date">{report.followUpDate || "—"}</Descriptions.Item>
                  </Descriptions>
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase mb-2">Doctor & Vitals</p>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Doctor">{report.doctorName || "—"}</Descriptions.Item>
                    <Descriptions.Item label="Blood Pressure">{report.bloodPressure || "—"}</Descriptions.Item>
                    <Descriptions.Item label="Temperature">{report.temperature || "—"}</Descriptions.Item>
                    <Descriptions.Item label="Weight">{report.weight || "—"}</Descriptions.Item>
                  </Descriptions>
                </div>
              </div>
              <Descriptions column={1} size="small" bordered className="mb-4">
                <Descriptions.Item label="Diagnosis">{report.diagnosis || "—"}</Descriptions.Item>
                <Descriptions.Item label="Allergies">{report.allergies || "—"}</Descriptions.Item>
                <Descriptions.Item label="Treatment Given"><span className="whitespace-pre-wrap">{report.treatment || "—"}</span></Descriptions.Item>
                <Descriptions.Item label="Medicines Prescribed"><span className="whitespace-pre-wrap">{report.medicines || "—"}</span></Descriptions.Item>
                {report.operationDetails && <Descriptions.Item label="Operation Details"><span className="whitespace-pre-wrap">{report.operationDetails}</span></Descriptions.Item>}
                {report.notes && <Descriptions.Item label="Additional Notes"><span className="whitespace-pre-wrap">{report.notes}</span></Descriptions.Item>}
              </Descriptions>
              <p className="text-center text-xs text-slate-400 border-t pt-3 mt-4">
                MediDash Hospital Management System — Confidential Medical Record
              </p>
            </div>
          </>
        )}
      </Drawer>

      {/* Add Patient Modal */}
      <Modal title="Add Patient" open={open}
        onCancel={() => { setOpen(false); form.resetFields(); setFormDept(null); setSuggested(null); }}
        footer={null} width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleAdd} className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="name" label="Patient Name" rules={[{ required: true }]}>
              <Input placeholder="Full name" />
            </Form.Item>
            <Form.Item name="age" label="Age" rules={[{ required: true }]}>
              <Input type="number" placeholder="Age" />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="gender" label="Gender" rules={[{ required: true }]}>
              <Select placeholder="Select gender" options={[
                { value: "Male", label: "Male" },
                { value: "Female", label: "Female" },
                { value: "Other", label: "Other" },
              ]} />
            </Form.Item>
            <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
              <Input placeholder="+1 234 567 8900" />
            </Form.Item>
          </div>
          <Form.Item name="disease" label="Disease / Diagnosis" rules={[{ required: true }]}>
            <Input placeholder="e.g. Hypertension, Fracture..." />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="department" label="Department" rules={[{ required: true }]}>
              <Select
                placeholder="Select department"
                options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
                onChange={handleDeptChange}
              />
            </Form.Item>
            <Form.Item name="doctorId" label="Assign Doctor" rules={[{ required: true }]}>
              <Select
                placeholder={formDept ? "Select doctor" : "Select department first"}
                disabled={!formDept}
                onChange={() => setSuggested(null)}
                options={filteredDoctors.map((d) => {
                  const on = isOnShift(d);
                  return {
                    value: d._id?.toString(),
                    label: (
                      <span className="flex items-center gap-1">
                        {d.name}
                        <Tag color={d.availabilityStatus === "Available" ? "green" : d.availabilityStatus === "Busy" ? "gold" : "red"}
                          className="!ml-1 !text-xs">{d.availabilityStatus || "Available"}</Tag>
                        {on !== null && (
                          <Tag color={on ? "green" : "default"} className="!text-[10px] !m-0">
                            {on ? "On Shift" : "Off"}
                          </Tag>
                        )}
                        <span className="text-slate-400 text-xs ml-1">{d.patientCount || 0} pts</span>
                      </span>
                    ),
                  };
                })}
              />
            </Form.Item>
          </div>

          {/* Round-robin suggestion banner */}
          {suggested && (
            <Alert
              type="info"
              showIcon
              className="mb-3"
              message={
                <span className="text-xs">
                  Auto-assigned <strong>{suggested.name}</strong> — lowest load
                  ({suggested.patientCount || 0} patients)
                  {isOnShift(suggested) ? ", currently on shift" : ""}.
                  You can change this above.
                </span>
              }
            />
          )}
          {formDept && !suggested && (
            <Alert type="warning" showIcon className="mb-3"
              message={<span className="text-xs">No available doctor on shift for this department. Please assign manually.</span>} />
          )}

          <Form.Item name="admissionDate" label="Admission Date" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item className="mb-0">
            <Button type="primary" htmlType="submit" block>Add Patient & Send Request</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Patients;
