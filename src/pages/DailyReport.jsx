import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { Table, Tag, Modal, Input, Select, DatePicker, Button, Timeline, Descriptions, Space, App } from "antd";
import dayjs from "dayjs";
import { useFormik } from "formik";
import * as Yup from "yup";

const API = "http://localhost:5000";
const statusColor = { Stable: "green", Recovering: "blue", Critical: "red" };

const F = ({ name, label, placeholder, rows, formik }) => {
  if (!formik) return null;
  return (
    <div>
      <label className="block text-[13px] font-semibold mb-1">{label}</label>
      {rows ? (
        <Input.TextArea name={name} rows={rows} placeholder={placeholder}
          value={formik.values[name]} onChange={formik.handleChange} onBlur={formik.handleBlur} />
      ) : (
        <Input name={name} placeholder={placeholder}
          value={formik.values[name]} onChange={formik.handleChange} onBlur={formik.handleBlur} />
      )}
    </div>
  );
};

const Err = ({ name, formik }) => {
  if (!formik) return null;
  return formik.touched[name] && formik.errors[name]
    ? <p className="text-red-500 text-[11px] mt-1">{formik.errors[name]}</p>
    : null;
};

function DailyReport() {
  const { message } = App.useApp();
  const user = useSelector((state) => state.auth.user) || {};
  const isAdmin = user.role === "admin";

  const [patients,  setPatients]  = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [reports,   setReports]   = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode,  setViewMode]  = useState("table");

  const dailyReportSchema = Yup.object({
    date: Yup.date()
      .typeError("Select a valid date")
      .required("Date is required")
      .max(dayjs().endOf("day").toDate(), "Date cannot be in the future"),
    visitSlot: Yup.string().required("Visit slot is required"),
    patientStatus: Yup.string().required("Patient status is required"),
    temperature: Yup.string().test("temp-range", "Temperature must be between 90 and 110 °F", (val) => {
      if (!val || val.trim() === "") return true;
      const n = parseFloat(val);
      return !isNaN(n) && n >= 90 && n <= 110;
    }),
    systolic: Yup.string().test("sys-range", "Systolic BP must be between 60 and 250", (val) => {
      if (!val || val.trim() === "") return true;
      const n = parseFloat(val);
      return !isNaN(n) && n >= 60 && n <= 250;
    }),
    diastolic: Yup.string().test("dia-range", "Diastolic BP must be between 40 and 150", (val) => {
      if (!val || val.trim() === "") return true;
      const n = parseFloat(val);
      return !isNaN(n) && n >= 40 && n <= 150;
    }),
    heartRate: Yup.string().test("hr-range", "Heart rate must be between 30 and 200", (val) => {
      if (!val || val.trim() === "") return true;
      const n = parseFloat(val);
      return !isNaN(n) && n >= 30 && n <= 200;
    }),
    oxygenLevel: Yup.string().test("spo2-range", "SpO₂ must be between 50 and 100", (val) => {
      if (!val || val.trim() === "") return true;
      const n = parseFloat(val);
      return !isNaN(n) && n >= 50 && n <= 100;
    }),
  });

  const EMPTY = {
    date: null, visitSlot: "", visitTime: "", patientStatus: "",
    temperature: "", systolic: "", diastolic: "", heartRate: "", oxygenLevel: "",
    symptoms: "", diagnosis: "", treatment: "", medicines: "", doctorRemarks: "",
  };

  const formik = useFormik({
    initialValues: EMPTY,
    validationSchema: dailyReportSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      const payload = {
        patientId:   selected._id,
        patientName: selected.name,
        doctorId:    user.id,
        doctorName:  user.name,
        department:  selected.department,
        ...values,
        bloodPressure: values.systolic && values.diastolic ? `${values.systolic}/${values.diastolic}` : "",
        date: dayjs(values.date).format("YYYY-MM-DD"),
      };
      const res = await fetch(`${API}/daily-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { message.error(json.message); setSubmitting(false); return; }
      message.success("Daily report saved.");
      resetForm();
      setModalOpen(false);
      fetchReports(selected._id);
      setSubmitting(false);
    },
  });

  const fetchPatients = useCallback(async () => {
    const url = isAdmin ? `${API}/patients` : `${API}/doctor/${user.id}/patients`;
    const data = await fetch(url).then((r) => r.json());
    setPatients(data.filter((p) => p.patientStatus !== "Discharged" || isAdmin));
  }, [isAdmin, user.id]);

  const fetchReports = useCallback(async (patientId) => {
    const data = await fetch(`${API}/daily-reports/${patientId}`).then((r) => r.json());
    setReports(data);
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const selectPatient = (p) => { setSelected(p); fetchReports(p._id); };

  const openAdd = () => {
    const now  = dayjs();
    const hour = now.hour();
    const slot = hour < 12 ? "Morning" : hour < 17 ? "Noon" : "Evening";
    formik.resetForm({ values: { ...EMPTY, date: new Date(), visitSlot: slot, visitTime: now.format("HH:mm") } });
    setModalOpen(true);
  };

  const reportColumns = [
    { title: "Date",       dataIndex: "date",         sorter: (a, b) => a.date.localeCompare(b.date) },
    { title: "Visit",      dataIndex: "visitSlot",    render: (s, r) => s ? `${s}${r.visitTime ? ` (${r.visitTime})` : ""}` : "—" },
    { title: "Temp (°F)",      dataIndex: "temperature",  render: (v) => v ? `${v} °F` : "—" },
    { title: "Systolic (mmHg)",  dataIndex: "bloodPressure", render: (v) => v ? `${v.split("/")[0]} mmHg` : "—" },
    { title: "Diastolic (mmHg)", dataIndex: "bloodPressure", render: (v) => v ? `${v.split("/")[1]} mmHg` : "—", key: "dia" },
    { title: "Heart Rate (bpm)", dataIndex: "heartRate",    render: (v) => v ? `${v} bpm` : "—" },
    { title: "SpO₂ (%)",        dataIndex: "oxygenLevel",  render: (v) => v ? `${v}%` : "—" },
    { title: "Diagnosis",  dataIndex: "diagnosis",    ellipsis: true },
    { title: "Treatment",  dataIndex: "treatment",    ellipsis: true },
    { title: "Status",     dataIndex: "patientStatus", render: (s) => <Tag color={statusColor[s] || "default"}>{s}</Tag> },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1d2e", margin: 0 }}>Daily Patient Reports</h2>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Record and track daily vitals and treatment notes.</p>
      </div>

      <div className="flex gap-5" style={{ minHeight: 520 }}>
        {/* Patient list */}
        <div style={{ width: 220, flexShrink: 0, background: "#fff", borderRadius: 14,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden",
                      display: "flex", flexDirection: "column" }}>
          <div className="px-4 py-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Patients</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {patients.map((p) => {
              const active = selected?._id === p._id;
              return (
                <div key={p._id} onClick={() => selectPatient(p)}
                  className={`px-4 py-3 cursor-pointer border-l-4 transition-all ${
                    active ? "border-blue-600 bg-blue-50" : "border-transparent hover:bg-slate-50"}`}>
                  <p className={`text-sm font-semibold truncate ${active ? "text-blue-700" : "text-slate-700"}`}>{p.name}</p>
                  <p className="text-xs text-slate-400">{p.department}</p>
                </div>
              );
            })}
            {patients.length === 0 && <p className="text-xs text-slate-400 p-4">No patients found.</p>}
          </div>
        </div>

        {/* Report panel */}
        <div style={{ flex: 1, minWidth: 0, background: "#fff", borderRadius: 14,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: 20,
                      display: "flex", flexDirection: "column", gap: 16 }}>
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
                  <Button size="small" onClick={() => setViewMode(viewMode === "table" ? "timeline" : "table")}>
                    {viewMode === "table" ? "Timeline View" : "Table View"}
                  </Button>
                  {!isAdmin && (
                    <Button type="primary" size="small" onClick={openAdd}>+ Add Today's Report</Button>
                  )}
                </div>
              </div>

              {viewMode === "table" ? (
                <Table columns={reportColumns} dataSource={reports} rowKey="_id"
                  size="small" pagination={{ pageSize: 10 }}
                  locale={{ emptyText: "No daily reports yet." }} />
              ) : (
                <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
                  {reports.length === 0 && <p className="text-slate-400 text-sm">No daily reports yet.</p>}
                  <Timeline items={reports.map((r) => ({
                    color: statusColor[r.patientStatus] || "gray",
                    children: (
                      <div className="bg-slate-50 rounded-lg p-3 mb-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm">{r.date}</span>
                          <div className="flex gap-1 items-center">
                            {r.visitSlot && <Tag color="purple">{r.visitSlot}{r.visitTime ? ` · ${r.visitTime}` : ""}</Tag>}
                            <Tag color={statusColor[r.patientStatus] || "default"}>{r.patientStatus}</Tag>
                          </div>
                        </div>
                        <Descriptions size="small" column={3}>
                          <Descriptions.Item label="Temp">{r.temperature ? `${r.temperature} °F` : "—"}</Descriptions.Item>
                          <Descriptions.Item label="Systolic BP">{r.bloodPressure ? `${r.bloodPressure.split("/")[0]} mmHg` : "—"}</Descriptions.Item>
                          <Descriptions.Item label="Diastolic BP">{r.bloodPressure ? `${r.bloodPressure.split("/")[1]} mmHg` : "—"}</Descriptions.Item>
                          <Descriptions.Item label="Heart Rate">{r.heartRate ? `${r.heartRate} bpm` : "—"}</Descriptions.Item>
                          <Descriptions.Item label="SpO₂">{r.oxygenLevel ? `${r.oxygenLevel}%` : "—"}</Descriptions.Item>
                          <Descriptions.Item label="Symptoms" span={2}>{r.symptoms || "—"}</Descriptions.Item>
                          <Descriptions.Item label="Diagnosis" span={3}>{r.diagnosis || "—"}</Descriptions.Item>
                          <Descriptions.Item label="Treatment" span={3}>{r.treatment || "—"}</Descriptions.Item>
                          {r.medicines && <Descriptions.Item label="Medicines" span={3}>{r.medicines}</Descriptions.Item>}
                          {r.doctorRemarks && <Descriptions.Item label="Remarks" span={3}>{r.doctorRemarks}</Descriptions.Item>}
                        </Descriptions>
                      </div>
                    ),
                  }))} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Add Daily Report Modal ── */}
      <Modal
        title={`Daily Report — ${selected?.name} (${dayjs().format("YYYY-MM-DD")})`}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); formik.resetForm(); }}
        footer={null}
        width={720}
      >
        <form onSubmit={formik.handleSubmit} noValidate className="mt-3 space-y-4">

          {/* ── Row 1: Date / Visit Slot / Status ── */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-semibold mb-1">Date</label>
              <DatePicker className="w-full"
                value={formik.values.date ? dayjs(formik.values.date) : null}
                onChange={(d) => formik.setFieldValue("date", d ? d.toDate() : null)}
                onBlur={() => formik.setFieldTouched("date", true)}
                status={formik.touched.date && formik.errors.date ? "error" : ""}
                disabledDate={(c) => c && c > dayjs().endOf("day")} />
              <Err name="date" formik={formik} />
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1">Visit Slot</label>
              <Select className="w-full" placeholder="Select slot"
                value={formik.values.visitSlot || undefined}
                onChange={(v) => formik.setFieldValue("visitSlot", v)}
                onBlur={() => formik.setFieldTouched("visitSlot", true)}
                status={formik.touched.visitSlot && formik.errors.visitSlot ? "error" : ""}
                options={["Morning", "Noon", "Evening"].map((v) => ({ value: v, label: v }))} />
              <Err name="visitSlot" formik={formik} />
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1">Patient Status</label>
              <Select className="w-full" placeholder="Select status"
                value={formik.values.patientStatus || undefined}
                onChange={(v) => formik.setFieldValue("patientStatus", v)}
                onBlur={() => formik.setFieldTouched("patientStatus", true)}
                status={formik.touched.patientStatus && formik.errors.patientStatus ? "error" : ""}
                options={["Stable", "Recovering", "Critical"].map((v) => ({ value: v, label: v }))} />
              <Err name="patientStatus" formik={formik} />
            </div>
          </div>

          {/* Vitals */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Vitals</p>
            <div className="grid grid-cols-5 gap-3">
              <div>
                <label className="block text-[13px] font-semibold mb-1">Temperature</label>
                <Space.Compact className="w-full">
                  <Input name="temperature" placeholder="98.6"
                    value={formik.values.temperature} onChange={formik.handleChange} onBlur={formik.handleBlur}
                    status={formik.touched.temperature && formik.errors.temperature ? "error" : ""} />
                  <Input disabled defaultValue="°F" style={{ width: 44, textAlign: "center", color: "#6b7280" }} />
                </Space.Compact>
                <Err name="temperature" formik={formik} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold mb-1">Systolic BP</label>
                <Space.Compact className="w-full">
                  <Input name="systolic" placeholder="120"
                    value={formik.values.systolic} onChange={formik.handleChange} onBlur={formik.handleBlur}
                    status={formik.touched.systolic && formik.errors.systolic ? "error" : ""} />
                  <Input disabled defaultValue="mmHg" style={{ width: 52, textAlign: "center", color: "#6b7280" }} />
                </Space.Compact>
                <Err name="systolic" formik={formik} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold mb-1">Diastolic BP</label>
                <Space.Compact className="w-full">
                  <Input name="diastolic" placeholder="80"
                    value={formik.values.diastolic} onChange={formik.handleChange} onBlur={formik.handleBlur}
                    status={formik.touched.diastolic && formik.errors.diastolic ? "error" : ""} />
                  <Input disabled defaultValue="mmHg" style={{ width: 52, textAlign: "center", color: "#6b7280" }} />
                </Space.Compact>
                <Err name="diastolic" formik={formik} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold mb-1">Heart Rate</label>
                <Space.Compact className="w-full">
                  <Input name="heartRate" placeholder="72"
                    value={formik.values.heartRate} onChange={formik.handleChange} onBlur={formik.handleBlur}
                    status={formik.touched.heartRate && formik.errors.heartRate ? "error" : ""} />
                  <Input disabled defaultValue="bpm" style={{ width: 44, textAlign: "center", color: "#6b7280" }} />
                </Space.Compact>
                <Err name="heartRate" formik={formik} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold mb-1">SpO₂</label>
                <Space.Compact className="w-full">
                  <Input name="oxygenLevel" placeholder="98"
                    value={formik.values.oxygenLevel} onChange={formik.handleChange} onBlur={formik.handleBlur}
                    status={formik.touched.oxygenLevel && formik.errors.oxygenLevel ? "error" : ""} />
                  <Input disabled defaultValue="%" style={{ width: 36, textAlign: "center", color: "#6b7280" }} />
                </Space.Compact>
                <Err name="oxygenLevel" formik={formik} />
              </div>
            </div>
          </div>

          {/* Clinical Notes */}
          <div className="grid grid-cols-2 gap-4">
            <F name="symptoms"  label="Symptoms Observed"  placeholder="e.g. Fever, chest pain, nausea..." rows={2} formik={formik} />
            <F name="diagnosis" label="Diagnosis / Update" placeholder="e.g. Improving, BP controlled..."  rows={2} formik={formik} />
            <F name="treatment" label="Treatment Given"    placeholder="e.g. IV fluids, O₂ therapy..."    rows={2} formik={formik} />
            <F name="medicines" label="Medicines Prescribed" placeholder="e.g. Paracetamol 500mg BD..."   rows={2} formik={formik} />
          </div>

          <F name="doctorRemarks" label="Doctor Remarks" placeholder="Additional observations or instructions..." rows={2} formik={formik} />

          <Button type="primary" htmlType="submit" block loading={formik.isSubmitting}>
            Save Daily Report
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export default DailyReport;
