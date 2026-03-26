import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const API = "http://localhost:5000";
const DoctorContext = createContext(null);

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// convert "HH:MM" to total minutes
const toMin = (t) => { const [h, m] = (t || "").split(":").map(Number); return h * 60 + (m || 0); };

// ── Is a doctor currently on shift? ──────────────────────────────
export function isOnShift(doctor) {
  const wh = doctor?.workingHours;
  if (!wh?.start || !wh?.end) return null; // not configured
  const now  = new Date();
  const cur  = now.getHours() * 60 + now.getMinutes();
  const day  = DAYS[now.getDay()];
  const inTime = cur >= toMin(wh.start) && cur <= toMin(wh.end);
  const inDay  = !wh.days?.length || wh.days.includes(day);
  return inTime && inDay;
}

// ── Round-robin load balancer ─────────────────────────────────────
// Returns the Available doctor in `department` with the lowest patient load
// who is currently within their working hours (if set).
export function pickBestDoctor(doctors, department) {
  const eligible = doctors.filter((d) => {
    if (d.department !== department) return false;
    if ((d.availabilityStatus || "Available") !== "Available") return false;
    const shift = isOnShift(d);
    return shift === null || shift === true; // null = no hours set → always eligible
  });
  if (!eligible.length) return null;
  // sort ascending by patient load → lowest load first
  return [...eligible].sort((a, b) => (a.patientCount || 0) - (b.patientCount || 0))[0];
}

export function DoctorProvider({ children }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const [docs, appts, patients] = await Promise.all([
        fetch(`${API}/doctors`).then((r) => r.json()),
        fetch(`${API}/appointments`).then((r) => r.json()),
        fetch(`${API}/patients`).then((r) => r.json()),
      ]);
      setDoctors(docs.map((doc) => {
        const id = doc._id?.toString();
        return {
          ...doc,
          patientCount: patients.filter((p) => p.doctorId === id).length,
          apptCount:    appts.filter((a) => a.doctorId === id).length,
        };
      }));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  const updateWorkingHours = useCallback(async (doctorId, workingHours) => {
    await fetch(`${API}/doctor/${doctorId}/working-hours`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workingHours }),
    });
    await fetchDoctors();
  }, [fetchDoctors]);

  return (
    <DoctorContext.Provider value={{ doctors, loading, fetchDoctors, updateWorkingHours }}>
      {children}
    </DoctorContext.Provider>
  );
}

export function useDoctors() {
  const ctx = useContext(DoctorContext);
  if (!ctx) throw new Error("useDoctors must be used inside DoctorProvider");
  return ctx;
}
