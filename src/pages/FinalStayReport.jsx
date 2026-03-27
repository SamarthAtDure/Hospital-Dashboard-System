import React, { useState, useEffect, useCallback } from "react";
import { Table, Drawer, Button, Empty, message } from "antd";
import dayjs from "dayjs";

const API = "http://localhost:5000";

/* ─── palette ───────────────────────────────────────────────────────────────
   #0f766e  teal accent   (headings, labels, accents)
   #134e4a  teal dark     (header text)
   #1e293b  slate-800     (body text)
   #475569  slate-600     (secondary text)
   #94a3b8  slate-400     (muted / placeholders)
   #e2e8f0  slate-200     (borders)
   #f8fafc  slate-50      (section backgrounds)
   #ffffff  white         (page / card bg)
──────────────────────────────────────────────────────────────────────────── */

const ACCENT   = "#0f766e";
const DARK     = "#134e4a";
const BODY     = "#1e293b";
const MUTED    = "#475569";
const FAINT    = "#94a3b8";
const BORDER   = "#e2e8f0";
const SURFACE  = "#f8fafc";

/* status dot colors — no background boxes, just a small dot + text */
const STATUS_COLOR = { Stable: "#16a34a", Recovering: "#0f766e", Critical: "#dc2626" };

/* ─── shared style tokens ─────────────────────────────────────────────────── */
const S = {
  page:      { fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", color: BODY,
               background: "#fff", padding: "40px 44px", maxWidth: 880, margin: "0 auto" },

  /* header */
  header:    { display: "flex", justifyContent: "space-between", alignItems: "flex-end",
               borderBottom: `2px solid ${DARK}`, paddingBottom: 18, marginBottom: 32 },
  hospName:  { fontSize: 21, fontWeight: 800, color: DARK, margin: 0, letterSpacing: "-0.3px" },
  hospSub:   { fontSize: 11, color: MUTED, marginTop: 3, fontWeight: 400 },
  headerR:   { textAlign: "right", fontSize: 11, color: MUTED, lineHeight: 1.8 },
  reportTag: { fontSize: 12, fontWeight: 700, color: ACCENT, letterSpacing: 1,
               textTransform: "uppercase", display: "block", marginBottom: 2 },

  /* section */
  section:   { marginBottom: 28 },
  secTitle:  { fontSize: 10, fontWeight: 700, color: ACCENT, textTransform: "uppercase",
               letterSpacing: 1.4, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 },
  secLine:   { flex: 1, height: 1, background: BORDER },

  /* two-col grid */
  grid2:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },

  /* info row */
  row:       { display: "flex", justifyContent: "space-between", alignItems: "baseline",
               padding: "7px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 },
  rowLabel:  { color: MUTED, fontWeight: 400 },
  rowValue:  { fontWeight: 600, color: BODY, textAlign: "right", maxWidth: 230 },

  /* table */
  tableWrap: { overflowX: "auto" },
  table:     { width: "100%", borderCollapse: "collapse", fontSize: 11.5 },
  th:        { padding: "9px 11px", textAlign: "left", fontWeight: 600, color: ACCENT,
               borderBottom: `2px solid ${BORDER}`, whiteSpace: "nowrap",
               background: SURFACE, fontSize: 11 },
  tdBase:    { padding: "8px 11px", borderBottom: `1px solid ${BORDER}`,
               verticalAlign: "top", color: BODY, fontSize: 12 },

  /* text block */
  prose:     { fontSize: 13, color: BODY, lineHeight: 1.7, padding: "10px 0" },

  /* instruction row */
  instrRow:  { display: "flex", gap: 12, padding: "9px 0",
               borderBottom: `1px solid ${BORDER}`, fontSize: 13 },
  instrNum:  { fontSize: 11, fontWeight: 700, color: ACCENT, minWidth: 18, paddingTop: 1 },

  /* signature */
  sigGrid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginTop: 8 },
  sigBox:    { paddingTop: 40, borderTop: `1.5px solid ${BODY}`, textAlign: "center" },
  sigName:   { fontSize: 13, fontWeight: 700, color: BODY },
  sigRole:   { fontSize: 11, color: MUTED, marginTop: 3 },

  /* footer */
  footer:    { borderTop: `1px solid ${BORDER}`, marginTop: 36, paddingTop: 12,
               display: "flex", justifyContent: "space-between",
               fontSize: 10, color: FAINT, letterSpacing: 0.2 },
  footerC:   { fontWeight: 700, color: MUTED, letterSpacing: 0.8,
               textTransform: "uppercase", fontSize: 10 },
};

/* ─── tiny helpers ────────────────────────────────────────────────────────── */
function Row({ label, value }) {
  return (
    <div style={S.row}>
      <span style={S.rowLabel}>{label}</span>
      <span style={S.rowValue}>{value || "—"}</span>
    </div>
  );
}

function SecTitle({ children }) {
  return (
    <div style={S.secTitle}>
      {children}
      <span style={S.secLine} />
    </div>
  );
}

function StatusDot({ status }) {
  const color = STATUS_COLOR[status] || FAINT;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%",
                     background: color, display: "inline-block" }} />
      <span style={{ color, fontWeight: 600 }}>{status || "—"}</span>
    </span>
  );
}

/* ─── print ───────────────────────────────────────────────────────────────── */
function printReport(patientId) {
  const el = document.getElementById(`fsr-${patientId}`);
  if (!el) return;
  const w = window.open("", "_blank", "width=920,height=1060");
  w.document.write(`<!DOCTYPE html><html><head>
    <title>Final Stay Report — MediDash Hospital</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      @page{size:A4;margin:12mm 14mm;}
    </style>
    </head><body>${el.innerHTML}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 500);
}

/* ─── PDF report layout ───────────────────────────────────────────────────── */
function ReportContent({ report: r }) {
  const totalDays = r.admissionDate && r.dischargeDate
    ? dayjs(r.dischargeDate).diff(dayjs(r.admissionDate), "day")
    : null;

  const reportId  = `MDH-${(r.patientId ?? "").slice(-6).toUpperCase() || "000000"}-${dayjs().format("YYYYMMDD")}`;
  const lastEntry = r.dailyReports?.at(-1);

  const allMeds = [...new Set(
    (r.dailyReports ?? []).map(d => d.medicines).filter(Boolean)
  )].join("; ") || "—";

  const TH = ["Date","Temp °F","BP","HR","SpO₂ %","Symptoms","Diagnosis","Treatment","Medicines","Remarks","Status"];

  return (
    <div id={`fsr-${r.patientId}`} style={S.page}>

      {/* ── HEADER ── */}
      <div style={S.header}>
        <div>
          <p style={S.hospName}>MediDash Hospital</p>
          <p style={S.hospSub}>Advanced Healthcare &amp; Medical Services</p>
        </div>
        <div style={S.headerR}>
          <span style={S.reportTag}>Final Stay Report</span>
          <span>Report ID: <strong style={{ color: BODY }}>{reportId}</strong></span><br />
          <span>Generated: {new Date().toLocaleString()}</span>
        </div>
      </div>

      {/* ── PATIENT + DOCTOR ── */}
      <div style={{ ...S.grid2, marginBottom: 28 }}>
        <div>
          <SecTitle>Patient Information</SecTitle>
          <Row label="Full Name"         value={r.patientName} />
          <Row label="Department"        value={r.department} />
          <Row label="Admission Date"    value={r.admissionDate} />
          <Row label="Discharge Date"    value={r.dischargeDate} />
          <Row label="Total Days Stayed" value={totalDays != null ? `${totalDays} days` : "—"} />
        </div>
        <div>
          <SecTitle>Doctor Information</SecTitle>
          <Row label="Assigned Doctor"   value={r.doctorName} />
          <Row label="Final Diagnosis"   value={r.finalDiagnosis} />
          <Row label="Treatment Summary" value={r.treatmentSummary} />
          <Row label="Final Remarks"     value={r.finalRemarks} />
        </div>
      </div>

      {/* ── ADMISSION SUMMARY ── */}
      <div style={S.section}>
        <SecTitle>Admission &amp; Stay Summary</SecTitle>
        <Row label="Admission Date"    value={r.admissionDate} />
        <Row label="Discharge Date"    value={r.dischargeDate} />
        <Row label="Total Days Stayed" value={totalDays != null ? `${totalDays} days` : "—"} />
        <Row label="Final Diagnosis"   value={r.finalDiagnosis} />
        <div style={S.row}>
          <span style={S.rowLabel}>Patient Final Status</span>
          <StatusDot status={lastEntry?.patientStatus} />
        </div>
      </div>

      {/* ── DAY-BY-DAY TABLE ── */}
      <div style={S.section}>
        <SecTitle>Day-by-Day Medical Report ({r.dailyReports?.length ?? 0} entries)</SecTitle>
        {r.dailyReports?.length > 0 ? (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>{TH.map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {r.dailyReports.map((d, i) => {
                  const bg = i % 2 === 0 ? "#fff" : SURFACE;
                  const td = { ...S.tdBase, background: bg };
                  return (
                    <tr key={d._id ?? i}>
                      <td style={{ ...td, fontWeight: 600, whiteSpace: "nowrap" }}>{d.date}</td>
                      <td style={td}>{d.temperature  || "—"}</td>
                      <td style={td}>{d.bloodPressure || "—"}</td>
                      <td style={td}>{d.heartRate     || "—"}</td>
                      <td style={td}>{d.oxygenLevel   || "—"}</td>
                      <td style={td}>{d.symptoms      || "—"}</td>
                      <td style={td}>{d.diagnosis     || "—"}</td>
                      <td style={td}>{d.treatment     || "—"}</td>
                      <td style={td}>{d.medicines     || "—"}</td>
                      <td style={td}>{d.doctorRemarks || "—"}</td>
                      <td style={td}><StatusDot status={d.patientStatus} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: FAINT }}>No daily reports recorded.</p>
        )}
      </div>

      {/* ── FINAL TREATMENT SUMMARY ── */}
      <div style={S.section}>
        <SecTitle>Final Treatment Summary</SecTitle>
        <p style={{ ...S.prose, ...S.rowLabel, fontSize: 11, marginBottom: 2 }}>Treatment Summary</p>
        <p style={S.prose}>{r.treatmentSummary || "—"}</p>
        <p style={{ ...S.prose, ...S.rowLabel, fontSize: 11, marginBottom: 2, marginTop: 10 }}>Medicines Prescribed</p>
        <p style={S.prose}>{allMeds}</p>
      </div>

      {/* ── FINAL REMARKS ── */}
      <div style={S.section}>
        <SecTitle>Final Remarks</SecTitle>
        <p style={S.prose}>{r.finalRemarks || "—"}</p>
      </div>

      {/* ── DISCHARGE INSTRUCTIONS ── */}
      <div style={S.section}>
        <SecTitle>Discharge Instructions</SecTitle>
        {[
          { n: "01", label: "Rest",        text: "Complete bed rest for 5–7 days. Avoid strenuous physical activity until follow-up clearance." },
          { n: "02", label: "Follow-Up",   text: "Schedule a follow-up appointment within 7 days of discharge. Bring this report to your next visit." },
          { n: "03", label: "Precautions", text: "Take all prescribed medicines on time. Avoid self-medication. Contact the hospital immediately if symptoms recur." },
        ].map(({ n, label, text }) => (
          <div key={n} style={S.instrRow}>
            <span style={S.instrNum}>{n}</span>
            <span>
              <strong style={{ color: BODY }}>{label} — </strong>
              <span style={{ color: MUTED }}>{text}</span>
            </span>
          </div>
        ))}
      </div>

      {/* ── SIGNATURE ── */}
      <div style={S.section}>
        <SecTitle>Authorisation</SecTitle>
        <div style={S.sigGrid}>
          <div style={S.sigBox}>
            <p style={S.sigName}>{r.doctorName || "Attending Physician"}</p>
            <p style={S.sigRole}>Doctor's Signature</p>
          </div>
          <div style={{ ...S.sigBox, borderTopStyle: "dashed", borderTopColor: ACCENT }}>
            <p style={S.sigName}>MediDash Hospital</p>
            <p style={S.sigRole}>Hospital Stamp &amp; Seal</p>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={S.footer}>
        <span>MediDash Hospital Management System · {new Date().getFullYear()}</span>
        <span style={S.footerC}>Confidential Medical Record</span>
        <span>Generated by MediDash System</span>
      </div>

    </div>
  );
}

/* ─── drawer preview card ─────────────────────────────────────────────────── */
function PreviewRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between",
                  padding: "6px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
      <span style={{ color: MUTED }}>{label}</span>
      <span style={{ fontWeight: 600, color: BODY }}>{value || "—"}</span>
    </div>
  );
}

/* ─── main page ───────────────────────────────────────────────────────────── */
function FinalStayReport() {
  const [patients,   setPatients]   = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [report,     setReport]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchPatients = useCallback(async () => {
    const data = await fetch(`${API}/patients`).then(r => r.json());
    setPatients(data.filter(p => p.patientStatus === "Discharged"));
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const openReport = async (patient) => {
    setSelected(patient);
    setReport(null);
    setLoading(true);
    const data = await fetch(`${API}/final-reports/${patient._id}`).then(r => r.json());
    setReport(data);
    setLoading(false);
  };

  const generateReport = async () => {
    setGenerating(true);
    const [dailyReports, dischargeReports] = await Promise.all([
      fetch(`${API}/daily-reports/${selected._id}`).then(r => r.json()),
      fetch(`${API}/reports/${selected._id}`).then(r => r.json()),
    ]);
    const discharge = dischargeReports.at(-1) ?? {};
    const payload = {
      patientId:        selected._id,
      patientName:      selected.name,
      department:       selected.department,
      admissionDate:    selected.admissionDate || discharge.admissionDate || "",
      dischargeDate:    discharge.dischargeDate || "",
      doctorName:       discharge.doctorName || "",
      finalDiagnosis:   discharge.diagnosis || "",
      treatmentSummary: discharge.treatment || "",
      finalRemarks:     discharge.notes || "",
      dailyReports,
    };
    const res = await fetch(`${API}/final-reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) { message.success("Report generated."); setReport(payload); }
    else          message.error("Failed to generate report.");
    setGenerating(false);
  };

  const totalDays = report?.admissionDate && report?.dischargeDate
    ? dayjs(report.dischargeDate).diff(dayjs(report.admissionDate), "day")
    : null;

  const columns = [
    { title: "Name",           dataIndex: "name",         sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: "Age",            dataIndex: "age" },
    { title: "Department",     dataIndex: "department" },
    { title: "Admission Date", dataIndex: "admissionDate", render: v => v || "—" },
    { title: "Disease",        dataIndex: "disease",       render: v => v || "—" },
    {
      title: "Action",
      render: (_, record) => (
        <Button size="small" type="primary" ghost onClick={() => openReport(record)}>
          View / Generate
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* page heading */}
      <div className="mb-6">
        <h2 className="text-[22px] font-bold">Final Stay Reports</h2>
        <p className="text-sm text-slate-500 mt-1">
          Generate and download complete stay reports for discharged patients.
        </p>
      </div>

      {/* patients table */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <Table
          columns={columns}
          dataSource={patients}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "No discharged patients found." }}
        />
      </div>

      {/* drawer */}
      <Drawer
        title={
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            Final Stay Report
            {selected && <span style={{ color: MUTED, fontWeight: 400, fontSize: 13 }}> — {selected.name}</span>}
          </span>
        }
        open={!!selected}
        onClose={() => { setSelected(null); setReport(null); }}
        size="large"
        extra={
          <div style={{ display: "flex", gap: 8 }}>
            {!report && !loading && (
              <Button type="primary" loading={generating} onClick={generateReport}
                style={{ background: ACCENT, borderColor: ACCENT }}>
                Generate Report
              </Button>
            )}
            {report && (
              <Button type="primary" onClick={() => printReport(selected._id)}
                style={{ background: DARK, borderColor: DARK }}>
                Download PDF
              </Button>
            )}
          </div>
        }
      >
        {loading && (
          <p style={{ color: FAINT, fontSize: 13 }}>Loading report…</p>
        )}

        {!loading && !report && (
          <Empty
            description={
              <span style={{ color: MUTED, fontSize: 13 }}>
                No report generated yet. Click <strong>Generate Report</strong> to create one.
              </span>
            }
          />
        )}

        {!loading && report && (
          <>
            {/* ── quick stats strip ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)",
                          gap: 1, background: BORDER, borderRadius: 10,
                          overflow: "hidden", marginBottom: 24 }}>
              {[
                { label: "Total Days",     value: totalDays != null ? `${totalDays} days` : "—" },
                { label: "Admission Date", value: report.admissionDate || "—" },
                { label: "Discharge Date", value: report.dischargeDate || "—" },
              ].map(s => (
                <div key={s.label} style={{ background: "#fff", padding: "14px 18px", textAlign: "center" }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: DARK, margin: 0 }}>{s.value}</p>
                  <p style={{ fontSize: 11, color: FAINT, marginTop: 3 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* ── patient + doctor ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: ACCENT, textTransform: "uppercase",
                            letterSpacing: 1.2, marginBottom: 8 }}>Patient</p>
                <PreviewRow label="Name"       value={report.patientName} />
                <PreviewRow label="Department" value={report.department} />
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: ACCENT, textTransform: "uppercase",
                            letterSpacing: 1.2, marginBottom: 8 }}>Doctor</p>
                <PreviewRow label="Assigned Doctor" value={report.doctorName} />
                <PreviewRow label="Final Diagnosis" value={report.finalDiagnosis} />
              </div>
            </div>

            {/* ── treatment + remarks ── */}
            {[
              { label: "Treatment Summary", value: report.treatmentSummary },
              { label: "Final Remarks",     value: report.finalRemarks },
            ].map(({ label, value }) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: ACCENT, textTransform: "uppercase",
                            letterSpacing: 1.2, marginBottom: 6 }}>{label}</p>
                <p style={{ fontSize: 13, color: BODY, lineHeight: 1.7,
                            padding: "10px 14px", background: SURFACE,
                            borderRadius: 8, border: `1px solid ${BORDER}` }}>
                  {value || "—"}
                </p>
              </div>
            ))}

            {/* ── daily entries ── */}
            <p style={{ fontSize: 10, fontWeight: 700, color: ACCENT, textTransform: "uppercase",
                        letterSpacing: 1.2, marginBottom: 10, marginTop: 4 }}>
              Day-by-Day Summary ({report.dailyReports?.length ?? 0} entries)
            </p>
            {report.dailyReports?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {report.dailyReports.map((d, i) => (
                  <div key={d._id ?? i}
                    style={{ border: `1px solid ${BORDER}`, borderRadius: 10,
                             padding: "12px 16px", background: "#fff" }}>
                    {/* row 1 — date + status */}
                    <div style={{ display: "flex", justifyContent: "space-between",
                                  alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: DARK }}>{d.date}</span>
                      <StatusDot status={d.patientStatus} />
                    </div>
                    {/* row 2 — vitals */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)",
                                  gap: 8, marginBottom: 10 }}>
                      {[
                        { l: "Temp",  v: d.temperature },
                        { l: "BP",    v: d.bloodPressure },
                        { l: "HR",    v: d.heartRate },
                        { l: "SpO₂", v: d.oxygenLevel },
                      ].map(({ l, v }) => (
                        <div key={l} style={{ background: SURFACE, borderRadius: 7,
                                              padding: "7px 10px", textAlign: "center" }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: BODY, margin: 0 }}>{v || "—"}</p>
                          <p style={{ fontSize: 10, color: FAINT, marginTop: 2 }}>{l}</p>
                        </div>
                      ))}
                    </div>
                    {/* row 3 — clinical */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {[
                        { l: "Symptoms",  v: d.symptoms },
                        { l: "Diagnosis", v: d.diagnosis },
                        { l: "Treatment", v: d.treatment },
                        { l: "Medicines", v: d.medicines },
                        { l: "Remarks",   v: d.doctorRemarks },
                      ].filter(x => x.v).map(({ l, v }) => (
                        <div key={l} style={{ fontSize: 12, color: BODY }}>
                          <span style={{ color: MUTED, fontWeight: 500 }}>{l}: </span>{v}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: FAINT }}>No daily reports recorded.</p>
            )}

            {/* hidden printable */}
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
