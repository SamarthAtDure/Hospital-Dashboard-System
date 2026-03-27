import React, { useState, useEffect, useCallback } from "react";
import { Table, Tag, Modal, Input, Select, DatePicker, Button, message, Timeline, Descriptions } from "antd";
import dayjs from "dayjs";
import { useFormik } from "formik";
import * as Yup from "yup";

const API = "http://localhost:5000";
const statusColor = { Stable: "green", Recovering: "blue", Critical: "red" };

function DailyReport() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "admin";

  const [patients,  setPatients]  = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [reports,   setReports]   = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode,  setViewMode]  = useState("table");

  // ── Yup schema ────────────────────────────────────────────────────
  const dailyReportSchema = Yup.object({
    date: Yup.date()
      .typeError("Select a valid date")
      .required("Date is required")
      .max(dayjs().endOf("day").toDate(), "Date cannot be in the future"),
    visitSlot: Yup.string()
      .required("Visit slot is required"),
    patientStatus: Yup.string()
      .required("Patient status is required"),
    temperature: Yup.string()
      .test("temp-range", "Temperature must be between 90 and 110 °F", (val) => {
        if (!val || val.trim() === "") return true;
        const n = parseFloat(val);
        return !isNaN(n) && n >= 90 && n <= 110;
      }),
    bloodPressure: Yup.string()
      .test("bp-format", "Format must be like 120/80", (val) => {
        if (!val || val.trim() === "") return true;
        return /^\d{2,3}\/\d{2,3}$/.test(val.trim());
      }),
    heartRate: Yup.string()
      .test("hr-range", "Heart rate must be between 30 and 200", (val) => {
        if (!val || val.trim() === "") return true;
        const n = parseFloat(val);
        return !isNaN(n) && n >= 30 && n <= 200;
      }),
    oxygenLevel: Yup.string()
      .test("spo2-range", "SpO₂ must be between 50 and 100", (val) => {
        if (!val || val.trim() === "") return true;
        const n = parseFloat(val);
        return !isNaN(n) && n >= 50 && n <= 100;
      }),
  });

  // ── Formik ────────────────────────────────────────────────────────
  const formik = useFormik({
    initialValues: {
      date: null, visitSlot: "", visitTime: "", patientStatus: "",
      temperature: "", bloodPressure: "", heartRate: "", oxygenLevel: "",
      symptoms: "", diagnosis: "", treatment: "", medicines: "", doctorRemarks: "",
    },
    validationSchema: dailyReportSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      const payload = {
        patientId:   selected._id,
        patientName: selected.name,
        doctorId:    user.id,
        doctorName:  user.name,
        department:  selected.department,
        ...values,
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
    const now = dayjs();
    const hour = now.hour();
    const slot = hour < 12 ? "Morning" : hour < 17 ? "Noon" : "Evening";
    formik.resetForm({
      values: {
        date: new Date(), visitSlot: slot, visitTime: now.format("HH:mm"), patientStatus: "",
        temperature: "", bloodPressure: "", heartRate: "", oxygenLevel: "",
        symptoms: "", diagnosis: "", treatment: "", medicines: "", doctorRemarks: "",
      },
    });
    setModalOpen(true);
  };

  const reportColumns = [
    { title: "Date",        dataIndex: "date",        sorter: (a, b) => a.date.localeCompare(b.date) },
    { title: "Visit", dataIndex: "visitSlot", render: (s, r) => s ? `${s}${r.visitTime ? ` (${r.visitTime})` : ""}` : "—" },
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
                            <div className="flex gap-1 items-center">
                              {r.visitSlot && <Tag color="purple">{r.visitSlot}{r.visitTime ? ` · ${r.visitTime}` : ""}</Tag>}
                              <Tag color={statusColor[r.patientStatus] || "default"}>{r.patientStatus}</Tag>
                            </div>
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
        onCancel={() => { setModalOpen(false); formik.resetForm(); }}
        footer={null}
        width={680}
      >
        <form onSubmit={formik.handleSubmit} noValidate className="mt-3">

          {/* Date + Visit Slot + Patient Status */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-semibold mb-1">Date</label>
              <DatePicker
                className="w-full"
                value={formik.values.date ? dayjs(formik.values.date) : null}
                onChange={(d) => formik.setFieldValue("date", d ? d.toDate() : null)}
                onBlur={() => formik.setFieldTouched("date", true)}
                status={formik.touched.date && formik.errors.date ? "error" : ""}
                disabledDate={(current) => current && current > dayjs().endOf("day")}
              />
              {formik.touched.date && formik.errors.date && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.date}</p>
              )}
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1">Visit Slot</label>
              <Select
                className="w-full"
                placeholder="Select slot"
                value={formik.values.visitSlot || undefined}
                onChange={(val) => formik.setFieldValue("visitSlot", val)}
                onBlur={() => formik.setFieldTouched("visitSlot", true)}
                status={formik.touched.visitSlot && formik.errors.visitSlot ? "error" : ""}
                options={["Morning", "Noon", "Evening"].map((v) => ({ value: v, label: v }))}
              />
              {formik.touched.visitSlot && formik.errors.visitSlot && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.visitSlot}</p>
              )}
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1">Patient Status</label>
              <Select
                className="w-full"
                placeholder="Select status"
                value={formik.values.patientStatus || undefined}
                onChange={(val) => formik.setFieldValue("patientStatus", val)}
                onBlur={() => formik.setFieldTouched("patientStatus", true)}
                status={formik.touched.patientStatus && formik.errors.patientStatus ? "error" : ""}
                options={["Stable", "Recovering", "Critical"].map((v) => ({ value: v, label: v }))}
              />
              {formik.touched.patientStatus && formik.errors.patientStatus && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.patientStatus}</p>
              )}
            </div>
          </div>

          {/* Vitals */}
          <p className="text-xs font-semibold text-slate-500 uppercase mt-4 mb-2">Vitals</p>
          <div className="grid grid-cols-4 gap-3">

            <div>
              <label className="block text-[13px] font-semibold mb-1">Temp (°F)</label>
              <Input
                name="temperature"
                placeholder="98.6"
                value={formik.values.temperature}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                status={formik.touched.temperature && formik.errors.temperature ? "error" : ""}
              />
              {formik.touched.temperature && formik.errors.temperature && (
                <p className="text-red-500 text-[11px] mt-1">{formik.errors.temperature}</p>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-semibold mb-1">BP</label>
              <Input
                name="bloodPressure"
                placeholder="120/80"
                value={formik.values.bloodPressure}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                status={formik.touched.bloodPressure && formik.errors.bloodPressure ? "error" : ""}
              />
              {formik.touched.bloodPressure && formik.errors.bloodPressure && (
                <p className="text-red-500 text-[11px] mt-1">{formik.errors.bloodPressure}</p>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-semibold mb-1">Heart Rate</label>
              <Input
                name="heartRate"
                placeholder="72"
                value={formik.values.heartRate}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                status={formik.touched.heartRate && formik.errors.heartRate ? "error" : ""}
              />
              {formik.touched.heartRate && formik.errors.heartRate && (
                <p className="text-red-500 text-[11px] mt-1">{formik.errors.heartRate}</p>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-semibold mb-1">SpO₂ (%)</label>
              <Input
                name="oxygenLevel"
                placeholder="98"
                value={formik.values.oxygenLevel}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                status={formik.touched.oxygenLevel && formik.errors.oxygenLevel ? "error" : ""}
              />
              {formik.touched.oxygenLevel && formik.errors.oxygenLevel && (
                <p className="text-red-500 text-[11px] mt-1">{formik.errors.oxygenLevel}</p>
              )}
            </div>
          </div>

          {/* Text areas */}
          {[
            { name: "symptoms",     label: "Symptoms" },
            { name: "diagnosis",    label: "Diagnosis" },
            { name: "treatment",    label: "Treatment" },
            { name: "medicines",    label: "Medicines" },
            { name: "doctorRemarks",label: "Doctor Remarks" },
          ].map(({ name, label }) => (
            <div key={name} className="mt-3">
              <label className="block text-[13px] font-semibold mb-1">{label}</label>
              <Input.TextArea
                name={name}
                rows={2}
                value={formik.values[name]}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
            </div>
          ))}

          <Button type="primary" htmlType="submit" block className="mt-4" loading={formik.isSubmitting}>
            Save Daily Report
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export default DailyReport;
