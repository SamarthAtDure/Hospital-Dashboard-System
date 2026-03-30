import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const API = "http://localhost:5000";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const toMin = (t) => { const [h, m] = (t || "").split(":").map(Number); return h * 60 + (m || 0); };

export function isOnShift(doctor) {
  const wh = doctor?.workingHours;
  if (!wh?.start || !wh?.end) return null;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const day = DAYS[now.getDay()];
  const s = toMin(wh.start), e = toMin(wh.end);
  // night shift: end < start (e.g. 22:00 – 06:00)
  const inTime = s <= e ? (cur >= s && cur <= e) : (cur >= s || cur <= e);
  const inDay = !wh.days?.length || wh.days.includes(day);
  return inTime && inDay;
}

// returns shift duration in hours (handles overnight)
export function shiftHours(doctor) {
  const wh = doctor?.workingHours;
  if (!wh?.start || !wh?.end) return 0;
  const s = toMin(wh.start), e = toMin(wh.end);
  const mins = s <= e ? e - s : (1440 - s) + e;
  return Math.round((mins / 60) * 10) / 10;
}

export function pickBestDoctor(doctors, department) {
  const eligible = doctors.filter((d) => {
    if (d.department !== department) return false;
    if ((d.availabilityStatus || "Available") !== "Available") return false;
    const shift = isOnShift(d);
    return shift === null || shift === true;
  });
  if (!eligible.length) return null;
  return [...eligible].sort((a, b) => (a.patientCount || 0) - (b.patientCount || 0))[0];
}

export const fetchDoctors = createAsyncThunk("doctors/fetchAll", async () => {
  const [docs, appts, patients] = await Promise.all([
    fetch(`${API}/doctors`).then((r) => r.json()),
    fetch(`${API}/appointments`).then((r) => r.json()),
    fetch(`${API}/patients`).then((r) => r.json()),
  ]);
  return docs.map((doc) => {
    const id = doc._id?.toString();
    return {
      ...doc,
      patientCount: patients.filter((p) => p.doctorId === id).length,
      apptCount: appts.filter((a) => a.doctorId === id).length,
    };
  });
});

export const updateWorkingHours = createAsyncThunk(
  "doctors/updateWorkingHours",
  async ({ doctorId, workingHours }, { dispatch }) => {
    await fetch(`${API}/doctor/${doctorId}/working-hours`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workingHours }),
    });
    dispatch(fetchDoctors());
  }
);

const doctorSlice = createSlice({
  name: "doctors",
  initialState: { doctors: [], loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDoctors.pending, (state) => { state.loading = true; })
      .addCase(fetchDoctors.fulfilled, (state, action) => {
        state.loading = false;
        state.doctors = action.payload;
      })
      .addCase(fetchDoctors.rejected, (state) => { state.loading = false; });
  },
});

export default doctorSlice.reducer;
