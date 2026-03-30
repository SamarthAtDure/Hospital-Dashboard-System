import React, { useState, useEffect, useCallback } from "react";
import { Table, Drawer, Button, Empty, message } from "antd";
import dayjs from "dayjs";

const API = "http://localhost:5000";

/* ── palette ── report keeps blue; drawer is monochrome ── */
const HEADING_PRIMARY   = "#1d4ed8";
const HEADING_SECONDARY = "#2563eb";
const ACCENT            = HEADING_PRIMARY;
const DARK              = "#0f172a";
const BODY              = "#1e293b";
const MUTED             = "#64748b";
const FAINT             = "#94a3b8";
const BORDER            = "#e2e8f0";
const SURFACE           = "#f8fafc";

/* status dot colors — no background boxes, just a small dot + text */
const STATUS_COLOR = { Stable: "#16a34a", Recovering: "#0f766e", Critical: "#dc2626" };

const S = {
  page:      {
    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
    color: BODY,
    background: "#fff",
    padding: "34px 38px",
    maxWidth: 880,
    margin: "0 auto",
  },
  card:      {
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: "14px 16px",
    background: "#fff",
    boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
  },
  header:    {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: `2px solid ${BORDER}`,
    paddingBottom: 16,
    marginBottom: 28,
  },
  hospName:  { fontSize: 22, fontWeight: 800, color: DARK, margin: 0, letterSpacing: "-0.2px" },
  hospSub:   { fontSize: 11, color: MUTED, marginTop: 4, fontWeight: 500 },
  headerR:   { textAlign: "right", fontSize: 11, color: MUTED, lineHeight: 1.9 },
  reportTag: {
    fontSize: 11,
    fontWeight: 700,
    color: MUTED,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    display: "inline-block",
    marginBottom: 6,
    border: `1px solid ${BORDER}`,
    padding: "3px 9px",
    borderRadius: 4,
  },
  section:   { marginBottom: 24 },
  secTitle:  {
    fontSize: 11,
    fontWeight: 800,
    color: HEADING_PRIMARY,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  secLine:   {
    flex: 1,
    height: 1,
    borderRadius: 999,
    background: BORDER,
  },
  grid2:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  row:       {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 18,
    padding: "7px 0",
    borderBottom: `1px dashed ${BORDER}`,
    fontSize: 12.5,
  },
  rowLabel:  { color: MUTED, fontWeight: 500 },
  rowValue:  { fontWeight: 600, color: BODY, textAlign: "right", maxWidth: 370 },
  tableWrap: { overflowX: "auto" },
  table:     { width: "100%", borderCollapse: "collapse", fontSize: 11.5 },
  th:        {
    padding: "9px 11px",
    textAlign: "left",
    fontWeight: 700,
    color: HEADING_PRIMARY,
    borderBottom: `2px solid ${BORDER}`,
    whiteSpace: "nowrap",
    background: "#f1f5f9",
    fontSize: 11,
  },
  tdBase:    { padding: "8px 11px", borderBottom: `1px solid ${BORDER}`,
               verticalAlign: "top", color: BODY, fontSize: 12 },
  prose:     { fontSize: 12.5, color: BODY, lineHeight: 1.7, padding: "4px 0" },
  dayCard:   {
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    padding: "10px 12px",
    marginBottom: 10,
    background: "#fff",
    boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
  },
  dayHead:   { fontSize: 12.5, fontWeight: 700, color: DARK, marginBottom: 6 },
  bullet:    { margin: 0, paddingLeft: 18, color: BODY, fontSize: 12.5, lineHeight: 1.8 },
  sigGrid:   { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginTop: 8 },
  sigBox:    { paddingTop: 38, borderTop: `1.5px solid ${BODY}`, textAlign: "center" },
  sigName:   { fontSize: 13, fontWeight: 700, color: BODY },
  sigRole:   { fontSize: 11, color: MUTED, marginTop: 3 },
  footer:    { borderTop: `1px solid ${BORDER}`, marginTop: 36, paddingTop: 12,
               display: "flex", justifyContent: "space-between",
               fontSize: 10, color: FAINT, letterSpacing: 0.2 },
  footerC:   { fontWeight: 700, color: MUTED, letterSpacing: 0.8,
               textTransform: "uppercase", fontSize: 10 },
};

function Row({ label, value }) {
  return (
    <div style={S.row}>
      <span style={S.rowLabel}>{label}</span>
      <span style={S.rowValue}>{value}</span>
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

function hasValue(v) {
  return v !== undefined && v !== null && String(v).trim() !== "";
}

function normalizeDate(value) {
  if (!hasValue(value)) return "—";
  const d = dayjs(value);
  return d.isValid() ? d.format("DD MMM YYYY") : String(value);
}

function parseBloodPressure(bp) {
  if (!hasValue(bp)) return "—";
  const [sys, dia] = String(bp).split("/");
  if (!sys && !dia) return String(bp);
  return `${sys || "—"}/${dia || "—"}`;
}

function extractMedicineRows(rawList = []) {
  const rows = [];
  rawList.forEach((raw) => {
    if (!hasValue(raw)) return;
    String(raw)
      .split(/\n|;/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const parts = line.split(/\s+-\s+|\s+—\s+|\s+–\s+/);
        if (parts.length >= 3) {
          rows.push({ medicineName: parts[0], dosage: parts[1], duration: parts.slice(2).join(" - ") });
          return;
        }
        rows.push({ medicineName: line, dosage: "As advised", duration: "As advised" });
      });
  });

  const map = new Map();
  rows.forEach((r) => {
    const key = `${r.medicineName}__${r.dosage}__${r.duration}`;
    if (!map.has(key)) map.set(key, r);
  });
  return [...map.values()];
}

function resolvePatientAge(reportAge, patientAge) {
  if (hasValue(patientAge)) return patientAge;
  if (hasValue(reportAge)) return reportAge;
  return "—";
}

/* ─── build day-numbered entries from daily reports ─────────────────────── */
function buildDayEntries(dailyReports = []) {
  const dateOrder = [];
  const seen = new Map();
  dailyReports.forEach((d) => {
    const key = d.date || "";
    if (!seen.has(key)) { seen.set(key, dateOrder.length + 1); dateOrder.push(key); }
  });
  return dailyReports.map((d) => ({ ...d, dayNumber: seen.get(d.date || "") ?? 0 }));
}


async function downloadReport() {
  const el = document.getElementById("report");
  if (!el) return;
  const html2pdf = (await import("html2pdf.js")).default;
  html2pdf()
    .set({
      margin:      [10, 14, 10, 14],
      filename:    "Patient_Report.pdf",
      image:       { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF:       { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak:   { mode: ["avoid-all", "css", "legacy"] },
    })
    .from(el)
    .save();
}

function ReportContent({ report: r, patientDetails }) {
  const admDayjs  = dayjs(r.admissionDate);
  const disDayjs  = dayjs(r.dischargeDate);
  const totalDays = admDayjs.isValid() && disDayjs.isValid()
    ? disDayjs.diff(admDayjs, "day") + 1
    : hasValue(r.totalDaysStayed) ? Number(r.totalDaysStayed) : null;

  const reportId  = `MDH-${(r.patientId ?? "").slice(-6).toUpperCase() || "000000"}-${dayjs().format("YYYYMMDD")}`;
  const lastEntry = r.dailyReports?.at(-1) || null;
  const resolvedAge = resolvePatientAge(r.age, patientDetails?.age);

  const p = patientDetails || {};

  const patientRows = [
    ["Patient Name",          r.patientName || p.name || "—"],
    ["Age",                   resolvedAge],
    ["Gender",                r.gender || p.gender || "—"],
    ["Patient Suffering From",r.patientSufferingFrom || r.disease || p.disease || "—"],
    ["Admission Date",        normalizeDate(r.admissionDate || p.admissionDate)],
    hasValue(r.bedWardNumber || p.bedWardNumber || p.bedNumber) ? ["Bed/Ward Number", r.bedWardNumber || p.bedWardNumber || p.bedNumber] : null,
    hasValue(r.contactNumber || p.phone) ? ["Contact Number", r.contactNumber || p.phone] : null,
  ].filter(Boolean);

  const doctorRows = [
    ["Assigned Doctor", r.doctorName || "—"],
    ["Department", r.department || "—"],
    hasValue(r.treatmentSummary) ? ["Treatment Summary", r.treatmentSummary] : null,
    hasValue(r.proceduresPerformed) ? ["Procedures Performed", r.proceduresPerformed] : null,
    ["Patient Final Status", lastEntry?.patientStatus || r.patientFinalStatus || "Discharged"],
    hasValue(r.finalRemarks) ? ["Final Remarks", r.finalRemarks] : null,
  ].filter(Boolean);

  const stayRows = [
    ["Reason for Admission", r.reasonForAdmission || r.patientSufferingFrom || r.disease || "—"],
    ["Condition on Admission", r.conditionOnAdmission || "Admitted"],
    ["Condition on Discharge", r.conditionOnDischarge || lastEntry?.patientStatus || "Discharged"],
  ];

  const medicineRows = extractMedicineRows([
    ...(r.dailyReports ?? []).map((d) => d.medicines),
    r.medicinesPrescribed,
  ]);

  const followUpText = hasValue(r.followUpDate) ? normalizeDate(r.followUpDate) : "";

  return (
    <div id="report" style={S.page}>

      <div style={S.header}>
        <div>
          <p style={S.hospName}>MediDash Hospital</p>
          <p style={S.hospSub}>Advanced Healthcare &amp; Medical Services</p>
        </div>
        <div style={S.headerR}>
          <span style={S.reportTag}>Final Patient Stay Report</span>
          <span>Report ID: <strong style={{ color: BODY }}>{reportId}</strong></span><br />
          <span>Generated: {new Date().toLocaleString()}</span>
        </div>
      </div>

      <div style={{ ...S.grid2, marginBottom: 24 }}>
        <div>
          <SecTitle>Patient Information</SecTitle>
          {patientRows.map(([label, value]) => (
            <Row key={label} label={label} value={value} />
          ))}
        </div>
        <div>
          <SecTitle>Doctor Information</SecTitle>
          {doctorRows.map(([label, value]) => (
            <Row key={label} label={label} value={value} />
          ))}
        </div>
      </div>

      <div style={S.section}>
        <SecTitle>Day-by-Day Medical Report</SecTitle>
        <p style={{ ...S.prose, ...S.rowLabel, marginBottom: 8, fontWeight: 700 }}>Vitals Table</p>
        {r.dailyReports?.length > 0 ? (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  {["Date", "Temp", "BP", "HR", "SpO2", "Status"].map((h) => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.dailyReports.map((d, i) => {
                  const bg = i % 2 === 0 ? "#fff" : SURFACE;
                  const td = { ...S.tdBase, background: bg };
                  return (
                    <tr key={d._id ?? i}>
                      <td style={{ ...td, fontWeight: 600, whiteSpace: "nowrap" }}>{normalizeDate(d.date)}</td>
                      <td style={td}>{d.temperature || "—"}</td>
                      <td style={td}>{parseBloodPressure(d.bloodPressure)}</td>
                      <td style={td}>{d.heartRate || "—"}</td>
                      <td style={td}>{d.oxygenLevel || "—"}</td>
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

      <div style={S.section}>
        <p style={{ ...S.prose, ...S.rowLabel, marginBottom: 8, fontWeight: 700 }}>Daily Medical Notes</p>
        {r.dailyReports?.length > 0 ? (
          <div>
            {buildDayEntries(r.dailyReports).map((d, i) => (
              <div key={d._id ?? i} style={S.dayCard}>
                <p style={S.dayHead}>
                  Day {d.dayNumber} — {normalizeDate(d.date)}
                  {d.visitSlot ? <span style={{ fontWeight: 400, color: MUTED }}> ({d.visitSlot})</span> : null}
                </p>
                <p style={S.prose}><strong>Symptoms:</strong> {d.symptoms || "—"}</p>
                <p style={S.prose}><strong>Diagnosis:</strong> {d.diagnosis || "—"}</p>
                <p style={S.prose}><strong>Treatment:</strong> {d.treatment || "—"}</p>
                <p style={S.prose}><strong>Medicines:</strong> {d.medicines || "—"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: FAINT }}>No daily notes recorded.</p>
        )}
      </div>

      <div style={S.section}>
        <SecTitle>Medicines Prescribed</SecTitle>
        {medicineRows.length > 0 ? (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  {["Medicine Name", "Dosage", "Duration"].map((h) => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {medicineRows.map((m, idx) => (
                  <tr key={`${m.medicineName}-${idx}`}>
                    <td style={S.tdBase}>{m.medicineName}</td>
                    <td style={S.tdBase}>{m.dosage}</td>
                    <td style={S.tdBase}>{m.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: FAINT }}>No medicine details recorded.</p>
        )}
      </div>

      <div style={S.section}>
        <SecTitle>Final Remarks &amp; Advice</SecTitle>
        <Row label="Rest Advice" value={r.restAdvice || "Take sufficient rest and avoid overexertion."} />
        <Row label="Diet Advice" value={r.dietAdvice || "Maintain balanced diet and adequate hydration."} />
        {hasValue(followUpText) && <Row label="Follow-up" value={followUpText} />}
        <Row label="Restrictions Summary" value={r.restrictionsSummary || r.finalRemarks || "Follow doctor guidance and avoid self-medication."} />
      </div>

      <div style={S.section}>
        <SecTitle>Discharge Instructions</SecTitle>
        <ul style={S.bullet}>
          <li>Take proper rest</li>
          <li>Take medicines on time</li>
          <li>Follow doctor instructions</li>
          <li>Bring this report during follow-up visit</li>
          <li>Contact hospital if symptoms return</li>
        </ul>
      </div>

      <div style={S.section}>
        <SecTitle>Authorization Section</SecTitle>
        <div style={S.sigGrid}>
          <div style={S.sigBox}>
            <p style={S.sigName}>{r.doctorName || "Attending Physician"}</p>
            <p style={S.sigRole}>Doctor's Signature</p>
          </div>
          <div style={{ ...S.sigBox, borderTopStyle: "dashed", borderTopColor: BORDER }}>
            <p style={S.sigName}>MediDash Hospital</p>
            <p style={S.sigRole}>Hospital Stamp &amp; Seal</p>
          </div>
          <div style={S.sigBox}>
            <p style={S.sigName}>{normalizeDate(r.dischargeDate)}</p>
            <p style={S.sigRole}>Date</p>
          </div>
        </div>
      </div>

      <div style={S.footer}>
        <span>MediDash Hospital Management System · {new Date().getFullYear()}</span>
        <span style={S.footerC}>Confidential Medical Record</span>
        <span>Generated by MediDash System</span>
      </div>

    </div>
  );
}

/* ─── drawer label style ─────────────────────────────────────────────────── */
const DL = {
  fontSize: 10, fontWeight: 700, color: MUTED,
  textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 6,
};

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
    setReport(data ? { ...data, age: resolvePatientAge(data.age, patient.age) } : null);
    setLoading(false);
  };

  const generateReport = async () => {
    setGenerating(true);
    const [dailyReports, dischargeReports] = await Promise.all([
      fetch(`${API}/daily-reports/${selected._id}`).then(r => r.json()),
      fetch(`${API}/reports/${selected._id}`).then(r => r.json()),
    ]);
    const discharge = dischargeReports.at(0) ?? {};
    const latestPatient = patients.find((p) => p._id === selected._id) || selected;
    const payload = {
      patientId:        latestPatient._id,
      patientName:      latestPatient.name,
      age:              resolvePatientAge(null, latestPatient.age),
      gender:           latestPatient.gender,
      disease:          latestPatient.disease,
      patientSufferingFrom: latestPatient.disease,
      contactNumber:    latestPatient.phone || "",
      bloodGroup:       latestPatient.bloodGroup || "",
      address:          latestPatient.address || "",
      email:            latestPatient.email || "",
      bedWardNumber:    latestPatient.bedWardNumber || latestPatient.bedNumber || latestPatient.wardNumber || "",
      department:       latestPatient.department,
      admissionDate:    latestPatient.admissionDate || discharge.admissionDate || "",
      dischargeDate:    discharge.dischargeDate || latestPatient.dischargeDate || dailyReports.at(-1)?.date || "",
      totalDaysStayed:  (() => {
        const a = dayjs(latestPatient.admissionDate || discharge.admissionDate);
        const d = dayjs(discharge.dischargeDate || latestPatient.dischargeDate);
        return a.isValid() && d.isValid() ? d.diff(a, "day") + 1 : "";
      })(),
      doctorName:       discharge.doctorName || "",
      finalDiagnosis:   discharge.diagnosis || "",
      treatmentSummary: discharge.treatment || "",
      proceduresPerformed: discharge.operationDetails || "",
      patientFinalStatus: dailyReports.at(-1)?.patientStatus || "Discharged",
      reasonForAdmission: latestPatient.disease || "",
      conditionOnAdmission: "Admitted",
      conditionOnDischarge: dailyReports.at(-1)?.patientStatus || "Discharged",
      medicinesPrescribed: discharge.medicines || "",
      followUpDate:     discharge.followUpDate || "",
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

  const admD = report?.admissionDate ? dayjs(report.admissionDate) : null;
  const disD = report?.dischargeDate  ? dayjs(report.dischargeDate)  : null;
  const totalDays = admD?.isValid() && disD?.isValid()
    ? disD.diff(admD, "day") + 1
    : report?.totalDaysStayed != null ? Number(report.totalDaysStayed) : null;

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
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1d2e", margin: 0 }}>Final Stay Reports</h2>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Generate and download complete stay reports for discharged patients.</p>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
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
                Generate Final Report
              </Button>
            )}
            {report && (
              <Button type="primary" onClick={downloadReport}
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
                No report generated yet. Click <strong>Generate Final Report</strong> to create one.
              </span>
            }
          />
        )}

        {!loading && report && (
          <>
            {/* ── key dates strip ── */}
            <div style={{ display: "flex", gap: 32, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${BORDER}` }}>
              {[
                { label: "Admission",   value: normalizeDate(report.admissionDate) },
              ].map(s => (
                <div key={s.label}>
                  <p style={{ fontSize: 11, color: FAINT, margin: 0 }}>{s.label}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: DARK, margin: "2px 0 0" }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* ── patient + doctor ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <p style={DL}>Patient</p>
                <PreviewRow label="Name"               value={report.patientName || selected?.name} />
                <PreviewRow label="Age"                value={resolvePatientAge(report.age, selected?.age)} />
                <PreviewRow label="Gender"             value={report.gender || selected?.gender} />
                <PreviewRow label="Contact"            value={report.contactNumber || selected?.phone} />
                <PreviewRow label="Department"         value={report.department || selected?.department} />
                <PreviewRow label="Admission Date"     value={normalizeDate(report.admissionDate || selected?.admissionDate)} />
              </div>
              <div>
                <p style={DL}>Admission</p>
                <PreviewRow label="Reason for Admission" value={report.reasonForAdmission || report.disease || selected?.disease} />
                <PreviewRow label="Condition on Admission" value={report.conditionOnAdmission} />
                <PreviewRow label="Condition on Discharge" value={report.conditionOnDischarge} />
                <p style={{ ...DL, marginTop: 14 }}>Doctor</p>
                <PreviewRow label="Assigned Doctor"   value={report.doctorName} />
                <PreviewRow label="Final Diagnosis"   value={report.finalDiagnosis} />
              </div>
            </div>

            {/* ── treatment + remarks ── */}
            {[
              { label: "Treatment Summary", value: report.treatmentSummary },
              { label: "Final Remarks",     value: report.finalRemarks },
            ].map(({ label, value }) => value ? (
              <div key={label} style={{ marginBottom: 14 }}>
                <p style={DL}>{label}</p>
                <p style={{ fontSize: 13, color: BODY, lineHeight: 1.7,
                            padding: "10px 14px", background: SURFACE,
                            borderRadius: 8, border: `1px solid ${BORDER}`, margin: 0 }}>
                  {value}
                </p>
              </div>
            ) : null)}

            {/* ── daily entries ── */}
            <p style={{ ...DL, marginBottom: 10, marginTop: 4 }}>
              Day-by-Day Summary ({report.dailyReports?.length ?? 0} entries)
            </p>
            {report.dailyReports?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {buildDayEntries(report.dailyReports).map((d, i) => (
                  <div key={d._id ?? i}
                    style={{ border: `1px solid ${BORDER}`, borderRadius: 10,
                             padding: "12px 16px", background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between",
                                  alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: DARK }}>
                        Day {d.dayNumber} — {normalizeDate(d.date)}
                        {d.visitSlot && <span style={{ fontWeight: 400, color: MUTED, fontSize: 12 }}> ({d.visitSlot})</span>}
                      </span>
                      <StatusDot status={d.patientStatus} />
                    </div>
                    {/* row 2 — vitals */}
                    <div style={{ display: "flex", gap: 20, marginBottom: 8, fontSize: 12, color: BODY }}>
                      {[
                        { l: "Temp",  v: d.temperature },
                        { l: "BP",    v: d.bloodPressure },
                        { l: "HR",    v: d.heartRate },
                        { l: "SpO₂", v: d.oxygenLevel },
                      ].map(({ l, v }) => v ? (
                        <span key={l}>
                          <span style={{ color: FAINT }}>{l}: </span>
                          <span style={{ fontWeight: 600 }}>{v}</span>
                        </span>
                      ) : null)}
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
              <ReportContent report={report} patientDetails={selected} />
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}

export default FinalStayReport;
