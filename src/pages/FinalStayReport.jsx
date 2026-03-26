import React, { useState, useEffect, useCallback } from "react";
import { Table, Tag, Drawer, Button, Empty, Descriptions, message } from "antd";
import dayjs from "dayjs";

const API = "http://localhost:5000";
const statusColor = { Stable: "green", Recovering: "blue", Critical: "red" };

function printReport(patientId) {
  const el = document.getElementById(`final-report-${patientId}`);
  if (!el) return;
  const w = window.open("", "_blank", "width=860,height=960");
  w.document.write(`<html><head><title>Final Stay Report</title>
    <style>body{margin:0;font-family:Arial,sans-serif;}table{width:100%;border-collapse:collapse;}
    td,th{border:1px solid #e2e8f0;padding:6px 10px;font-size:12px;}
    @media print{body{-webkit-print-color-adjust:exact;}}</style>
    </head><body>${el.innerHTML}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 400);
}

function ReportContent({ report: r }) {
  const totalDays = r.admissionDate && r.dischargeDate
    ? dayjs(r.dischargeDate).diff(dayjs(r.admissionDate), "day")
    : "—";

  return (
    <div id={`final-report-${r.patientId}`} style={{ fontFamily: "Arial, sans-serif", color: "#1e293b" }}>
      {/* Header */}
      <div style={{ textAlign: "center", borderBottom: "2px solid #2563eb", paddingBottom: 14, marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#2563eb" }}>MediDash Hospital</h1>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: "6px 0 0" }}>Final Stay Report</h2>
        <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0" }}>
          Generated: {new Date().toLocaleString()}
        </p>
      </div>

      {/* Patient & Doctor info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 18 }}>
        <div>
          <p style={{ fontWeight: 700, color: "#2563eb", marginBottom: 6 }}>Patient Information</p>
          {[["Name", r.patientName], ["Department", r.department],
            ["Admission Date", r.admissionDate], ["Discharge Date", r.dischargeDate],
            ["Total Days Stayed", totalDays]
          ].map(([l, v]) => (
            <div key={l} style={{ display: "flex", gap: 8, marginBottom: 4, fontSize: 13 }}>
              <span style={{ color: "#64748b", minWidth: 140 }}>{l}:</span>
              <span style={{ fontWeight: 600 }}>{v || "—"}</span>
            </div>
          ))}
        </div>
        <div>
          <p style={{ fontWeight: 700, color: "#2563eb", marginBottom: 6 }}>Doctor Information</p>
          {[["Assigned Doctor", r.doctorName],
            ["Final Diagnosis", r.finalDiagnosis],
            ["Treatment Summary", r.treatmentSummary],
            ["Final Remarks", r.finalRemarks]
          ].map(([l, v]) => (
            <div key={l} style={{ display: "flex", gap: 8, marginBottom: 4, fontSize: 13 }}>
              <span style={{ color: "#64748b", minWidth: 140 }}>{l}:</span>
              <span style={{ fontWeight: 600 }}>{v || "—"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day-by-day summary */}
      <p style={{ fontWeight: 700, color: "#2563eb", marginBottom: 8 }}>Day-by-Day Summary</p>
      {r.dailyReports?.length > 0 ? (
        <table>
          <thead>
            <tr style={{ background: "#eff6ff" }}>
              {["Date", "Temp", "BP", "HR", "SpO₂", "Symptoms", "Diagnosis", "Treatment", "Medicines", "Remarks", "Status"].map((h) => (
                <th key={h} style={{ textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {r.dailyReports.map((d) => (
              <tr key={d._id}>
                <td>{d.date}</td>
                <td>{d.temperature || "—"}</td>
                <td>{d.bloodPressure || "—"}</td>
                <td>{d.heartRate || "—"}</td>
                <td>{d.oxygenLevel || "—"}</td>
                <td>{d.symptoms || "—"}</td>
                <td>{d.diagnosis || "—"}</td>
                <td>{d.treatment || "—"}</td>
                <td>{d.medicines || "—"}</td>
                <td>{d.doctorRemarks || "—"}</td>
                <td>{d.patientStatus || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ fontSize: 12, color: "#94a3b8" }}>No daily reports recorded.</p>
      )}

      <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 20, paddingTop: 10, fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
        MediDash Hospital Management System — Confidential Medical Record
      </div>
    </div>
  );
}

function FinalStayReport() {
  const [patients,  setPatients]  = useState([]);
  const [selected,  setSelected]  = useState(null); // patient for drawer
  const [report,    setReport]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchPatients = useCallback(async () => {
    const data = await fetch(`${API}/patients`).then((r) => r.json());
    setPatients(data.filter((p) => p.patientStatus === "Discharged"));
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const openReport = async (patient) => {
    setSelected(patient);
    setReport(null);
    setLoading(true);
    const data = await fetch(`${API}/final-reports/${patient._id}`).then((r) => r.json());
    setReport(data);
    setLoading(false);
  };

  const generateReport = async () => {
    setGenerating(true);
    // fetch daily reports + discharge report for this patient
    const [dailyReports, dischargeReports] = await Promise.all([
      fetch(`${API}/daily-reports/${selected._id}`).then((r) => r.json()),
      fetch(`${API}/reports/${selected._id}`).then((r) => r.json()),
    ]);
    const discharge = dischargeReports[dischargeReports.length - 1] || {};

    const payload = {
      patientId:       selected._id,
      patientName:     selected.name,
      department:      selected.department,
      admissionDate:   selected.admissionDate || discharge.admissionDate || "",
      dischargeDate:   discharge.dischargeDate || "",
      doctorName:      discharge.doctorName || "",
      finalDiagnosis:  discharge.diagnosis || "",
      treatmentSummary: discharge.treatment || "",
      finalRemarks:    discharge.notes || "",
      dailyReports,
    };

    const res = await fetch(`${API}/final-reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      message.success("Final report generated and saved.");
      setReport(payload);
    } else {
      message.error("Failed to generate report.");
    }
    setGenerating(false);
  };

  const columns = [
    { title: "Name",           dataIndex: "name",          sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: "Age",            dataIndex: "age" },
    { title: "Department",     dataIndex: "department" },
    { title: "Admission Date", dataIndex: "admissionDate",  render: (v) => v || "—" },
    { title: "Disease",        dataIndex: "disease",        render: (v) => v || "—" },
    {
      title: "Action",
      render: (_, record) => (
        <Button size="small" type="primary" ghost onClick={() => openReport(record)}>
          View / Generate Report
        </Button>
      ),
    },
  ];

  const totalDays = report?.admissionDate && report?.dischargeDate
    ? dayjs(report.dischargeDate).diff(dayjs(report.admissionDate), "day")
    : "—";

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[22px] font-bold">Final Stay Reports</h2>
        <p className="text-sm text-slate-500 mt-1">Generate and download complete stay reports for discharged patients.</p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <Table
          columns={columns}
          dataSource={patients}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "No discharged patients found." }}
        />
      </div>

      <Drawer
        title={`Final Stay Report — ${selected?.name}`}
        open={!!selected}
        onClose={() => { setSelected(null); setReport(null); }}
        size="large"
        extra={
          <div className="flex gap-2">
            {!report && !loading && (
              <Button type="primary" loading={generating} onClick={generateReport}>
                Generate Report
              </Button>
            )}
            {report && (
              <Button type="primary" onClick={() => printReport(selected._id)}>
                Download PDF
              </Button>
            )}
          </div>
        }
      >
        {loading && <p className="text-slate-400 text-sm">Loading...</p>}

        {!loading && !report && (
          <Empty description="No final report generated yet. Click 'Generate Report' to create one." />
        )}

        {!loading && report && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                { label: "Total Days Stayed", value: totalDays },
                { label: "Admission Date",    value: report.admissionDate || "—" },
                { label: "Discharge Date",    value: report.dischargeDate || "—" },
              ].map((s) => (
                <div key={s.label} className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-blue-600">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Patient & Doctor */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-600 uppercase mb-2">Patient</p>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Name">{report.patientName}</Descriptions.Item>
                  <Descriptions.Item label="Department">{report.department}</Descriptions.Item>
                </Descriptions>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-600 uppercase mb-2">Doctor</p>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Doctor">{report.doctorName || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Final Diagnosis">{report.finalDiagnosis || "—"}</Descriptions.Item>
                </Descriptions>
              </div>
            </div>

            {/* Treatment & Remarks */}
            <Descriptions column={1} size="small" bordered className="mb-5">
              <Descriptions.Item label="Treatment Summary">
                <span className="whitespace-pre-wrap">{report.treatmentSummary || "—"}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Final Remarks">
                <span className="whitespace-pre-wrap">{report.finalRemarks || "—"}</span>
              </Descriptions.Item>
            </Descriptions>

            {/* Day-by-day */}
            <p className="text-xs font-bold text-blue-600 uppercase mb-3">Day-by-Day Summary ({report.dailyReports?.length || 0} entries)</p>
            {report.dailyReports?.length > 0 ? (
              <div className="space-y-3">
                {report.dailyReports.map((d) => (
                  <div key={d._id} className="border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{d.date}</span>
                      <Tag color={statusColor[d.patientStatus] || "default"}>{d.patientStatus}</Tag>
                    </div>
                    <Descriptions size="small" column={4}>
                      <Descriptions.Item label="Temp">{d.temperature || "—"}</Descriptions.Item>
                      <Descriptions.Item label="BP">{d.bloodPressure || "—"}</Descriptions.Item>
                      <Descriptions.Item label="HR">{d.heartRate || "—"}</Descriptions.Item>
                      <Descriptions.Item label="SpO₂">{d.oxygenLevel || "—"}</Descriptions.Item>
                      <Descriptions.Item label="Symptoms" span={4}>{d.symptoms || "—"}</Descriptions.Item>
                      <Descriptions.Item label="Diagnosis" span={2}>{d.diagnosis || "—"}</Descriptions.Item>
                      <Descriptions.Item label="Treatment" span={2}>{d.treatment || "—"}</Descriptions.Item>
                      {d.medicines && <Descriptions.Item label="Medicines" span={4}>{d.medicines}</Descriptions.Item>}
                      {d.doctorRemarks && <Descriptions.Item label="Remarks" span={4}>{d.doctorRemarks}</Descriptions.Item>}
                    </Descriptions>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">No daily reports recorded for this patient.</p>
            )}

            {/* Hidden printable version */}
            <div style={{ display: "none" }}>
              <ReportContent report={report} />
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}

export default FinalStayReport;
