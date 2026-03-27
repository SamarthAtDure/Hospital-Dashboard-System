import express from "express";
import cors from "cors";
import { ObjectId } from "mongodb";
import { connectDB } from "./config/db.js";

const app = express();
app.use(cors());
app.use(express.json());

// ─── DEBUG: list all doctor emails (remove in production) ────────
app.get("/debug/doctors", async (req, res) => {
  const db = await connectDB();
  const data = await db.collection("doctors").find({}, { projection: { name: 1, email: 1, role: 1, availabilityStatus: 1 } }).toArray();
  res.json(data);
});

// ─── DEBUG: inspect patientRequests (remove in production) ──
app.get("/debug/patient-requests", async (req, res) => {
  const db = await connectDB();
  const data = await db.collection("patientRequests").find().toArray();
  res.json(data);
});

// ─── PATIENTS ───────────────────────────────────────────
app.get("/patients", async (req, res) => {
  const db = await connectDB();
  const patients = await db.collection("patients").find().toArray();
  // enrich each patient with their latest request status
  const requests = await db.collection("patientRequests").find().toArray();
  const enriched = patients.map((p) => {
    const req = requests.find((r) => r.patientId === p._id.toString());
    return { ...p, requestStatus: req?.status || "—" };
  });
  res.json(enriched);
});

app.post("/patients", async (req, res) => {
  const db = await connectDB();
  const result = await db.collection("patients").insertOne({
    ...req.body,
    patientStatus: "Pending",   // doctor sets this after accepting
    createdAt: new Date(),
  });
  const patientId = result.insertedId.toString();
  // create a patient request for the assigned doctor
  if (req.body.doctorId) {
    await db.collection("patientRequests").insertOne({
      patientId,
      doctorId:  req.body.doctorId,
      disease:   req.body.disease || "",
      status:    "Pending",
      createdAt: new Date(),
    });
  }
  res.json({ message: "Patient added", id: patientId });
});

app.delete("/patients/:id", async (req, res) => {
  const db = await connectDB();
  await db.collection("patients").deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ message: "Patient deleted" });
});

// update patient status (Admitted / In Operation / Discharged)
app.patch("/patients/:id/status", async (req, res) => {
  const db = await connectDB();
  await db.collection("patients").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { patientStatus: req.body.patientStatus, doctorId: req.body.doctorId } }
  );
  res.json({ message: "Patient status updated" });
});

// ─── DOCTORS ────────────────────────────────────────────
app.get("/doctors", async (req, res) => {
  const db = await connectDB();
  const data = await db.collection("doctors").find().toArray();
  res.json(data);
});

app.post("/doctors", async (req, res) => {
  const db = await connectDB();
  const result = await db.collection("doctors").insertOne(req.body);
  res.json({ message: "Doctor added", id: result.insertedId });
});

app.delete("/doctors/:id", async (req, res) => {
  const db = await connectDB();
  await db.collection("doctors").deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ message: "Doctor deleted" });
});

// ─── APPOINTMENTS ────────────────────────────────────────
app.get("/appointments", async (req, res) => {
  const db = await connectDB();
  const data = await db.collection("appointments").find().toArray();
  res.json(data);
});

app.post("/appointments", async (req, res) => {
  const db = await connectDB();
  const result = await db.collection("appointments").insertOne(req.body);
  res.json({ message: "Appointment added", id: result.insertedId });
});

app.delete("/appointments/:id", async (req, res) => {
  const db = await connectDB();
  await db.collection("appointments").deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ message: "Appointment deleted" });
});

// ─── DASHBOARD STATS ─────────────────────────────────────
app.get("/stats", async (req, res) => {
  const db = await connectDB();
  const totalPatients = await db.collection("patients").countDocuments();
  const totalDoctors = await db.collection("doctors").countDocuments();
  const appointments = await db.collection("appointments").countDocuments();
  res.json({ totalPatients, totalDoctors, appointments, revenue: "$52,400" });
});

// computed from real patients collection
app.get("/patientsPerDepartment", async (req, res) => {
  const db = await connectDB();
  const patients = await db.collection("patients").find().toArray();
  const map = {};
  patients.forEach((p) => {
    map[p.department] = (map[p.department] || 0) + 1;
  });
  const data = Object.entries(map).map(([department, patients]) => ({ department, patients }));
  res.json(data);
});

// computed from real doctors collection
app.get("/doctorsPerDepartment", async (req, res) => {
  const db = await connectDB();
  const doctors = await db.collection("doctors").find().toArray();
  const map = {};
  doctors.forEach((d) => {
    map[d.department] = (map[d.department] || 0) + 1;
  });
  const data = Object.entries(map).map(([department, doctors]) => ({ department, doctors }));
  res.json(data);
});

// computed from real patients collection — status breakdown for pie chart
app.get("/patientsByStatus", async (req, res) => {
  const db = await connectDB();
  const patients = await db.collection("patients").find().toArray();
  const map = {};
  patients.forEach((p) => {
    map[p.status] = (map[p.status] || 0) + 1;
  });
  const data = Object.entries(map).map(([disease, count]) => ({ disease, count }));
  res.json(data);
});
app.patch("/appointments/:id", async (req, res) => {
  const db = await connectDB();
  await db.collection("appointments").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { status: req.body.status } }
  );
  res.json({ message: "Status updated" });
});

// ─── DOCTOR REGISTRATION REQUESTS ──────────────────────────
app.post("/register/doctor", async (req, res) => {
  const db = await connectDB();
  const existing = await db.collection("doctor_requests").findOne({ email: req.body.email });
  if (existing) return res.status(409).json({ message: "A request with this email already exists." });

  // explicitly pick only the fields we want — ignore any stray status field from the form
  const { name, email, password, phone, department, specialization, experience, qualification, bio } = req.body;
  await db.collection("doctor_requests").insertOne({
    name, email, password, phone, department, specialization, experience, qualification, bio,
    status: "pending",
    createdAt: new Date(),
  });
  res.json({ message: "Registration request submitted. Awaiting admin approval." });
});

app.get("/doctor-requests", async (req, res) => {
  const db = await connectDB();
  const data = await db.collection("doctor_requests").find({ status: "pending" }).toArray();
  res.json(data);
});

app.patch("/doctor-requests/:id/approve", async (req, res) => {
  const db = await connectDB();
  const request = await db.collection("doctor_requests").findOne({ _id: new ObjectId(req.params.id) });
  if (!request) return res.status(404).json({ message: "Request not found" });

  // strip internal request fields, keep all doctor profile fields
  const { _id, status, createdAt, ...doctorData } = request;

  await db.collection("doctors").insertOne({
    name:             doctorData.name,
    email:            doctorData.email,
    password:         doctorData.password,
    phone:            doctorData.phone            || "",
    department:       doctorData.department,
    specialization:   doctorData.specialization   || "",
    experience:       doctorData.experience       || "",
    qualification:    doctorData.qualification    || "",
    bio:              doctorData.bio              || "",
    role:             "doctor",
    availabilityStatus: "Available",             // always start as Available
    approvedAt:       new Date(),
  });

  await db.collection("doctor_requests").deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ message: "Doctor approved and added." });
});

app.delete("/doctor-requests/:id", async (req, res) => {
  const db = await connectDB();
  await db.collection("doctor_requests").deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ message: "Request rejected and removed." });
});

// ─── AUTH LOGIN ──────────────────────────────────────────
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Admin static check
  if (email === "admin@hospital.com" && password === "admin123") {
    return res.json({ role: "admin", name: "Admin", id: "admin" });
  }

  // Doctor login — check doctors collection
  const db = await connectDB();
  const doctor = await db.collection("doctors").findOne({ email, password });
  if (!doctor) return res.status(401).json({ message: "Invalid credentials" });

  res.json({
    role: "doctor",
    name: doctor.name,
    id: doctor._id.toString(),
    email: doctor.email,
    department: doctor.department,
  });
});

// ─── DOCTOR DASHBOARD STATS ──────────────────────────────
app.get("/doctor/:id/stats", async (req, res) => {
  const db = await connectDB();
  const doctorId = req.params.id;
  const [all, patientReqs] = await Promise.all([
    db.collection("appointments").find({ doctorId }).toArray(),
    db.collection("patientRequests").find({ doctorId }).toArray(),
  ]);
  const acceptedPatients = patientReqs.filter((r) => r.status === "Accepted");
  res.json({
    totalAppointments:      all.length,
    totalPatients:          acceptedPatients.length,
    pendingAppointments:    all.filter((a) => a.status === "Pending").length,
    completedAppointments:  all.filter((a) => a.status === "Completed").length,
    pendingPatientRequests: patientReqs.filter((r) => r.status === "Pending").length,
  });
});

// ─── DOCTOR APPOINTMENTS ─────────────────────────────────
app.get("/doctor/:id/appointments", async (req, res) => {
  const db = await connectDB();
  const data = await db.collection("appointments").find({ doctorId: req.params.id }).toArray();
  res.json(data);
});

// ─── PATIENT REQUESTS FOR DOCTOR ─────────────────────────
app.get("/doctor/:id/patient-requests", async (req, res) => {
  const db = await connectDB();
  const doctorId = req.params.id;
  console.log("[patient-requests] doctorId:", doctorId);
  const requests = await db.collection("patientRequests")
    .find({ doctorId })
    .sort({ createdAt: -1 })
    .toArray();
  console.log("[patient-requests] found:", requests.length);
  const enriched = await Promise.all(requests.map(async (r) => {
    let patient = null;
    try {
      patient = await db.collection("patients").findOne({ _id: new ObjectId(r.patientId) });
    } catch {}
    return { ...r, _id: r._id.toString(), patient };
  }));
  res.json(enriched);
});

// ─── DOCTOR PATIENTS (accepted only) ────────────────────
app.get("/doctor/:id/patients", async (req, res) => {
  const db = await connectDB();
  const doctorId = req.params.id;
  console.log("[doctor-patients] doctorId:", doctorId);
  const accepted = await db.collection("patientRequests")
    .find({ doctorId, status: "Accepted" })
    .toArray();
  console.log("[doctor-patients] accepted requests:", accepted.length);
  const ids = accepted
    .map((r) => { try { return new ObjectId(r.patientId); } catch { return null; } })
    .filter(Boolean);
  if (!ids.length) return res.json([]);
  const patients = await db.collection("patients").find({ _id: { $in: ids } }).toArray();
  res.json(patients);
});

// accept patient request
app.patch("/patient-requests/:id/accept", async (req, res) => {
  const db = await connectDB();
  let oid;
  try { oid = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: "Invalid id" }); }
  const request = await db.collection("patientRequests").findOne({ _id: oid });
  if (!request) return res.status(404).json({ message: "Request not found" });
  await db.collection("patientRequests").updateOne({ _id: oid }, { $set: { status: "Accepted" } });
  // set doctorId + patientStatus = Admitted on the patient document
  try {
    await db.collection("patients").updateOne(
      { _id: new ObjectId(request.patientId) },
      { $set: { doctorId: request.doctorId, patientStatus: "Admitted" } }
    );
  } catch {}
  res.json({ message: "Patient accepted" });
});

// reject patient request
app.patch("/patient-requests/:id/reject", async (req, res) => {
  const db = await connectDB();
  let oid;
  try { oid = new ObjectId(req.params.id); } catch { return res.status(400).json({ message: "Invalid id" }); }
  await db.collection("patientRequests").updateOne({ _id: oid }, { $set: { status: "Rejected" } });
  res.json({ message: "Patient rejected" });
});

// patient notes
app.patch("/patients/:id/notes", async (req, res) => {
  const db = await connectDB();
  await db.collection("patients").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { notes: req.body.notes } }
  );
  res.json({ message: "Notes saved" });
});

// ─── APPOINTMENT NOTES / PRESCRIPTION ────────────────────
app.patch("/appointments/:id/notes", async (req, res) => {
  const db = await connectDB();
  await db.collection("appointments").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { notes: req.body.notes, prescription: req.body.prescription } }
  );
  res.json({ message: "Notes updated" });
});

// ─── DOCTOR AVAILABILITY ─────────────────────────────────
app.patch("/doctor/:id/availability", async (req, res) => {
  const db = await connectDB();
  await db.collection("doctors").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { availabilityStatus: req.body.availabilityStatus } }
  );
  res.json({ message: "Availability updated" });
});

// ─── DOCTOR WORKING HOURS ──────────────────────────────
// workingHours: { start: "09:00", end: "17:00", days: ["Mon","Tue",...] }
app.patch("/doctor/:id/working-hours", async (req, res) => {
  const db = await connectDB();
  await db.collection("doctors").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { workingHours: req.body.workingHours } }
  );
  res.json({ message: "Working hours updated" });
});

// ─── DOCTOR PROFILE UPDATE ───────────────────────────────
app.patch("/doctor/:id/profile", async (req, res) => {
  const db = await connectDB();
  const { name, phone, specialization, department, experience, qualification, bio } = req.body;
  await db.collection("doctors").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { name, phone, specialization, department, experience, qualification, bio } }
  );
  res.json({ message: "Profile updated" });
});

// ─── DOCTOR PATIENT STATS (appointments per month) ───────
app.get("/doctor/:id/patientStats", async (req, res) => {
  const db = await connectDB();
  const appts = await db.collection("appointments").find({ doctorId: req.params.id }).toArray();
  // group by month label from date field (YYYY-MM-DD)
  const monthMap = {};
  appts.forEach((a) => {
    if (!a.date) return;
    const label = a.date.slice(0, 7); // "2024-08"
    monthMap[label] = (monthMap[label] || 0) + 1;
  });
  const data = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, patients]) => ({ month, patients }));
  res.json(data);
});

// ─── DEPARTMENTS ────────────────────────────────────────
app.get("/departments", async (req, res) => {
  const db = await connectDB();
  const [saved, doctors, patients] = await Promise.all([
    db.collection("departments").find().toArray(),
    db.collection("doctors").find({}, { projection: { department: 1 } }).toArray(),
    db.collection("patients").find({}, { projection: { department: 1 } }).toArray(),
  ]);

  const docMap = {};
  doctors.forEach((d) => { if (d.department) docMap[d.department] = (docMap[d.department] || 0) + 1; });
  const patMap = {};
  patients.forEach((p) => { if (p.department) patMap[p.department] = (patMap[p.department] || 0) + 1; });

  // union of saved departments + those used in doctors/patients collections
  const allNames = [...new Set([
    ...saved.map((s) => s.name),
    ...Object.keys(docMap),
    ...Object.keys(patMap),
  ])];

  const result = allNames.map((name) => {
    const existing = saved.find((s) => s.name === name);
    return {
      _id:         existing ? existing._id.toString() : name,
      name,
      description: existing?.description || "",
      doctors:     docMap[name]  || 0,
      patients:    patMap[name]  || 0,
      fromDB:      !!existing,
    };
  });

  res.json(result);
});

// Returns each department with full doctor list + patient count
app.get("/departments/with-doctors", async (req, res) => {
  const db = await connectDB();
  const [saved, doctors, patients] = await Promise.all([
    db.collection("departments").find().toArray(),
    db.collection("doctors").find({}, { projection: { name: 1, department: 1, specialization: 1, availabilityStatus: 1 } }).toArray(),
    db.collection("patients").find({}, { projection: { department: 1 } }).toArray(),
  ]);

  const patMap = {};
  patients.forEach((p) => { if (p.department) patMap[p.department] = (patMap[p.department] || 0) + 1; });

  const docsByDept = {};
  doctors.forEach((d) => {
    if (!d.department) return;
    if (!docsByDept[d.department]) docsByDept[d.department] = [];
    docsByDept[d.department].push({ _id: d._id.toString(), name: d.name, specialization: d.specialization || "", availabilityStatus: d.availabilityStatus || "Available" });
  });

  const allNames = [...new Set([
    ...saved.map((s) => s.name),
    ...Object.keys(docsByDept),
    ...Object.keys(patMap),
  ])];

  const result = allNames.map((name) => {
    const existing = saved.find((s) => s.name === name);
    return {
      _id:         existing ? existing._id.toString() : name,
      name,
      description: existing?.description || "",
      doctorList:  docsByDept[name] || [],
      doctors:     (docsByDept[name] || []).length,
      patients:    patMap[name] || 0,
      fromDB:      !!existing,
    };
  });

  res.json(result);
});

app.post("/departments", async (req, res) => {
  const db = await connectDB();
  const result = await db.collection("departments").insertOne({ ...req.body, createdAt: new Date() });
  res.json({ message: "Department added", id: result.insertedId });
});

app.patch("/departments/:id", async (req, res) => {
  const db = await connectDB();
  await db.collection("departments").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: req.body }
  );
  res.json({ message: "Department updated" });
});

app.delete("/departments/:id", async (req, res) => {
  const db = await connectDB();
  await db.collection("departments").deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ message: "Department deleted" });
});

// ─── DAILY PATIENT REPORTS ──────────────────────────────
// One daily report per patient per date per visit slot
app.post("/daily-reports", async (req, res) => {
  const db = await connectDB();
  const { patientId, date, visitSlot } = req.body;
  const existing = await db.collection("dailyReports").findOne({ patientId, date, visitSlot });
  if (existing) return res.status(409).json({ message: `A ${visitSlot} report for this patient on ${date} already exists.` });
  const result = await db.collection("dailyReports").insertOne({ ...req.body, createdAt: new Date() });
  res.json({ message: "Daily report saved", id: result.insertedId });
});

app.get("/daily-reports/:patientId", async (req, res) => {
  const db = await connectDB();
  const data = await db.collection("dailyReports")
    .find({ patientId: req.params.patientId })
    .sort({ date: 1 })
    .toArray();
  res.json(data);
});

// ─── FINAL STAY REPORTS ───────────────────────────────────
app.post("/final-reports", async (req, res) => {
  const db = await connectDB();
  const { patientId } = req.body;
  // upsert — overwrite if already exists
  await db.collection("finalReports").updateOne(
    { patientId },
    { $set: { ...req.body, updatedAt: new Date() } },
    { upsert: true }
  );
  res.json({ message: "Final report saved" });
});

app.get("/final-reports", async (req, res) => {
  const db = await connectDB();
  const data = await db.collection("finalReports").find().sort({ updatedAt: -1 }).toArray();
  res.json(data);
});

app.get("/final-reports/:patientId", async (req, res) => {
  const db = await connectDB();
  const data = await db.collection("finalReports").findOne({ patientId: req.params.patientId });
  res.json(data || null);
});

// ─── REPORTS ─────────────────────────────────────────────
app.post("/reports", async (req, res) => {
  const db = await connectDB();
  const {
    patientId, doctorId, patientName, doctorName,
    diagnosis, treatment, medicines, operationDetails,
    admissionDate, dischargeDate, followUpDate,
    bloodPressure, temperature, weight, allergies, notes,
  } = req.body;
  await db.collection("reports").insertOne({
    patientId, doctorId, patientName, doctorName,
    diagnosis, treatment, medicines, operationDetails,
    admissionDate, dischargeDate, followUpDate,
    bloodPressure, temperature, weight, allergies, notes,
    createdAt: new Date(),
  });
  res.json({ message: "Report saved" });
});

// all reports (admin)
app.get("/reports", async (req, res) => {
  const db = await connectDB();
  const data = await db.collection("reports").find().sort({ createdAt: -1 }).toArray();
  res.json(data);
});

// reports for a specific patient
app.get("/reports/:patientId", async (req, res) => {
  const db = await connectDB();
  const data = await db.collection("reports").find({ patientId: req.params.patientId }).toArray();
  res.json(data);
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
