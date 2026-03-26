import React, { useState, useEffect, useCallback } from "react";
import { Table, Tag, Modal, Form, Input, Select, DatePicker, Button, message, Timeline, Descriptions } from "antd";
import dayjs from "dayjs";

const API = "http://localhost:5000";
const statusColor = { Stable: "green", Recovering: "blue", Critical: "red" };

function DailyReport() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "admin";

  const [patients, setPatients]       = useState([]);
  const [selected, setSelected]       = useState(null);
  const [reports,  setReports]        = useState([]);
  const [modalOpen, setModalOpen]     = useState(false);
  const [viewMode, setViewMode]       = useState("table"); // "table" | "timeline"
  const [form] = Form.useForm();

  const fetchPatients = useCallback(async () => {
    const url = isAdmin
      ? `${API}/patients`
      : `${API}/doctor/${user.id}/patients`;
    const data = await fetch(url).then((r) => r.json());
    // only admitted / in-operation patients need daily reports
    setPatients(data.filter((p) => p.patientStatus !== "Discharged" || isAdmin));
  }, [isAdmin, user.id]);

  const fetchReports = useCallback(async (patientId) => {
    const data = await fetch(`${API}/daily-reports/${patientId}`).then((r) => r.json());
    setReports(data);
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const selectPatient = (p) => {
    setSelected(p);
    fetchReports(p._id);
  };

  const openAdd = () => {
    form.resetFields();
    form.setFieldsValue({
      patientId:   selected._id,
      patientName: selected.name,
      doctorId:    user.id,
      doctorName:  user.name,
      department:  selected.department,
      date:        dayjs(),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    const payload = {
      ...values,
      date: values.date.format("YYYY-MM-DD"),
    };
    const res = await fetch(`${API}/daily-reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) { message.error(json.message); return; }
    message.success("Daily report saved.");
    setModalOpen(false);
    fetchReports(selected._id);
  };

  const reportColumns = [
    { title: "Date",        dataIndex: "date",        sorter: (a, b) => a.date.localeCompare(b.date) },
    { title: "Temp (°F)",   dataIndex: "temperature" },
    { title: "BP",          dataIndex: "bloodPressure" },
    { title: "Heart Rate",  dataIndex: "heartRate" },
    { title: "SpO₂ (%)",    dataIndex: "oxygenLevel" },
    { title: "Diagnosis",   dataIndex: "diagnosis",   ellipsis: true },
    { title: "Treatment",   dataIndex: "treatment",   ellipsis: true },
    {
      title: "Status",
      dataIndex: "patientStatus",
      render: (s) => <Tag color={statusColor[s] || "default"}>{s}</Tag>,
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[22px] font-bold">Daily Patient Reports</h2>
        <p className="text-sm text-slate-500 mt-1">Record and track daily vitals and treatment notes.</p>
      </div>

      <div className="flex gap-5" style={{ minHeight: 520 }}>
        {/* Patient list */}
        <div className="w-[220px] shrink-0 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Patients</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {patients.map((p) => {
              const active = selected?._id === p._id;
              return (
                <div
                  key={p._id}
                  onClick={() => selectPatient(p)}
                  className={`px-4 py-3 cursor-pointer border-l-4 transition-all ${
                    active ? "border-blue-600 bg-blue-50" : "border-transparent hover:bg-slate-50"
                  }`}
                >
                  <p className={`text-sm font-semibold truncate ${active ? "text-blue-700" : "text-slate-700"}`}>{p.name}</p>
                  <p className="text-xs text-slate-400">{p.department}</p>
                </div>
              );
            })}
            {patients.length === 0 && (
              <p className="text-xs text-slate-400 p-4">No patients found.</p>
            )}
          </div>
        </div>

        {/* Report panel */}
        <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm p-5 flex flex-col gap-4">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Select a patient to view or add daily reports.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">{selected.name}</h3>
                  <p className="text-xs text-slate-400">{selected.department} · {selected.disease || "—"}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="small"
                    onClick={() => setViewMode(viewMode === "table" ? "timeline" : "table")}
                  >
                    {viewMode === "table" ? "Timeline View" : "Table View"}
                  </Button>
                  {!isAdmin && (
                    <Button type="primary" size="small" onClick={openAdd}>+ Add Today's Report</Button>
                  )}
                </div>
              </div>

              {viewMode === "table" ? (
                <Table
                  columns={reportColumns}
                  dataSource={reports}
                  rowKey="_id"
                  size="small"
                  pagination={{ pageSize: 10 }}
                  locale={{ emptyText: "No daily reports yet." }}
                />
              ) : (
                <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
                  {reports.length === 0 && (
                    <p className="text-slate-400 text-sm">No daily reports yet.</p>
                  )}
                  <Timeline
                    items={reports.map((r) => ({
                      color: statusColor[r.patientStatus] || "gray",
                      children: (
                        <div className="bg-slate-50 rounded-lg p-3 mb-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm">{r.date}</span>
                            <Tag color={statusColor[r.patientStatus] || "default"}>{r.patientStatus}</Tag>
                          </div>
                          <Descriptions size="small" column={3}>
                            <Descriptions.Item label="Temp">{r.temperature || "—"}</Descriptions.Item>
                            <Descriptions.Item label="BP">{r.bloodPressure || "—"}</Descriptions.Item>
                            <Descriptions.Item label="HR">{r.heartRate || "—"}</Descriptions.Item>
                            <Descriptions.Item label="SpO₂">{r.oxygenLevel || "—"}</Descriptions.Item>
                            <Descriptions.Item label="Symptoms" span={2}>{r.symptoms || "—"}</Descriptions.Item>
                            <Descriptions.Item label="Diagnosis" span={3}>{r.diagnosis || "—"}</Descriptions.Item>
                            <Descriptions.Item label="Treatment" span={3}>{r.treatment || "—"}</Descriptions.Item>
                            <Descriptions.Item label="Medicines" span={3}>{r.medicines || "—"}</Descriptions.Item>
                            {r.doctorRemarks && (
                              <Descriptions.Item label="Remarks" span={3}>{r.doctorRemarks}</Descriptions.Item>
                            )}
                          </Descriptions>
                        </div>
                      ),
                    }))}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Daily Report Modal */}
      <Modal
        title={`Daily Report — ${selected?.name} (${dayjs().format("YYYY-MM-DD")})`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={680}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-3">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="patientId"   hidden><Input /></Form.Item>
            <Form.Item name="patientName" hidden><Input /></Form.Item>
            <Form.Item name="doctorId"    hidden><Input /></Form.Item>
            <Form.Item name="doctorName"  hidden><Input /></Form.Item>
            <Form.Item name="department"  hidden><Input /></Form.Item>

            <Form.Item name="date" label="Date" rules={[{ required: true }]}>
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item name="patientStatus" label="Patient Status" rules={[{ required: true }]}>
              <Select options={["Stable", "Recovering", "Critical"].map((v) => ({ value: v, label: v }))} />
            </Form.Item>
          </div>

          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Vitals</p>
          <div className="grid grid-cols-4 gap-3">
            <Form.Item name="temperature"   label="Temp (°F)"><Input placeholder="98.6" /></Form.Item>
            <Form.Item name="bloodPressure" label="BP"><Input placeholder="120/80" /></Form.Item>
            <Form.Item name="heartRate"     label="Heart Rate"><Input placeholder="72 bpm" /></Form.Item>
            <Form.Item name="oxygenLevel"   label="SpO₂ (%)"><Input placeholder="98" /></Form.Item>
          </div>

          <Form.Item name="symptoms"  label="Symptoms"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="diagnosis" label="Diagnosis"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="treatment" label="Treatment"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="medicines" label="Medicines"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="doctorRemarks" label="Doctor Remarks"><Input.TextArea rows={2} /></Form.Item>

          <Form.Item className="mb-0">
            <Button type="primary" htmlType="submit" block>Save Daily Report</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default DailyReport;
