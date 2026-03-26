import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import Layout from "./components/Layout";
// import Login from "./pages/Login";
// import Dashboard from "./pages/Dashboard";
// import Patients from "./pages/Patients";
// import Doctors from "./pages/Doctors";
// import Appointments from "./pages/Appointments";
// import Profile from "./pages/Profile";
// import DoctorDashboard from "./pages/DoctorDashboard";
// import DoctorAppointments from "./pages/DoctorAppointments";
// import DoctorPatients from "./pages/DoctorPatients";
// import DoctorRegister from "./pages/DoctorRegister";
// import DoctorRequests from "./pages/DoctorRequests";
import Layout from "@components/Layout";
import Login from "@pages/Login";
import Dashboard from "@pages/Dashboard";
import Patients from "@pages/Patients";
import Doctors from "@pages/Doctors";
import Appointments from "@pages/Appointments";
import Profile from "@pages/Profile";
import DoctorDashboard from "@pages/DoctorDashboard";
import DoctorAppointments from "@pages/DoctorAppointments";
import DoctorPatients from "@pages/DoctorPatients";
import DoctorRegister from "@pages/DoctorRegister";
import DoctorRequests from "@pages/DoctorRequests";
import Departments from "@pages/Departments";
import DailyReport from "@pages/DailyReport";
import FinalStayReport from "@pages/FinalStayReport";

// Redirects to / if not logged in, or if role doesn't match
function ProtectedRoute({ children, role }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user.role) return <Navigate to="/" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<DoctorRegister />} />

        {/* ── Admin routes ── */}
        <Route path="/dashboard"    element={<ProtectedRoute role="admin"><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/patients"     element={<ProtectedRoute role="admin"><Layout><Patients /></Layout></ProtectedRoute>} />
        <Route path="/doctors"      element={<ProtectedRoute role="admin"><Layout><Doctors /></Layout></ProtectedRoute>} />
        <Route path="/appointments" element={<ProtectedRoute role="admin"><Layout><Appointments /></Layout></ProtectedRoute>} />
        <Route path="/profile"      element={<ProtectedRoute role="admin"><Layout><Profile /></Layout></ProtectedRoute>} />
        <Route path="/doctor-requests" element={<ProtectedRoute role="admin"><Layout><DoctorRequests /></Layout></ProtectedRoute>} />
        <Route path="/departments"     element={<ProtectedRoute role="admin"><Layout><Departments /></Layout></ProtectedRoute>} />
        <Route path="/daily-reports"    element={<ProtectedRoute role="admin"><Layout><DailyReport /></Layout></ProtectedRoute>} />
        <Route path="/final-reports"    element={<ProtectedRoute role="admin"><Layout><FinalStayReport /></Layout></ProtectedRoute>} />

        {/* ── Doctor routes ── */}
        <Route path="/doctor/dashboard"    element={<ProtectedRoute role="doctor"><Layout><DoctorDashboard /></Layout></ProtectedRoute>} />
        <Route path="/doctor/appointments" element={<ProtectedRoute role="doctor"><Layout><DoctorAppointments /></Layout></ProtectedRoute>} />
        <Route path="/doctor/patients"     element={<ProtectedRoute role="doctor"><Layout><DoctorPatients /></Layout></ProtectedRoute>} />
        <Route path="/doctor/profile"      element={<ProtectedRoute role="doctor"><Layout><Profile /></Layout></ProtectedRoute>} />
        <Route path="/doctor/daily-reports" element={<ProtectedRoute role="doctor"><Layout><DailyReport /></Layout></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
