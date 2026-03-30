import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { useEffect } from "react";
import { ConfigProvider, App as AntApp, theme as antdTheme } from "antd";
import store from "@store/store";
import { useSelector, useDispatch } from "react-redux";
import { fetchDoctors } from "@store/doctorSlice";
import { ThemeProvider, useTheme } from "@context/ThemeContext";
import { getThemeConfig } from "@/theme";
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

function AppInit({ children }) {
  const dispatch = useDispatch();
  useEffect(() => { dispatch(fetchDoctors()); }, [dispatch]);
  return children;
}

function ProtectedRoute({ children, role }) {
  const user = useSelector((state) => state.auth.user);
  if (!user?.role) return <Navigate to="/" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
}

function ThemedApp() {
  const { dark } = useTheme();
  const themeConfig = getThemeConfig(dark);

  return (
    <ConfigProvider
      theme={{
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        ...themeConfig,
        cssVar: true,
      }}
    >
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<DoctorRegister />} />

            {/* ── Admin routes ── */}
            <Route path="/dashboard"       element={<ProtectedRoute role="admin"><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/patients"        element={<ProtectedRoute role="admin"><Layout><Patients /></Layout></ProtectedRoute>} />
            <Route path="/doctors"         element={<ProtectedRoute role="admin"><Layout><Doctors /></Layout></ProtectedRoute>} />
            <Route path="/appointments"    element={<ProtectedRoute role="admin"><Layout><Appointments /></Layout></ProtectedRoute>} />
            <Route path="/profile"         element={<ProtectedRoute role="admin"><Layout><Profile /></Layout></ProtectedRoute>} />
            <Route path="/doctor-requests" element={<ProtectedRoute role="admin"><Layout><DoctorRequests /></Layout></ProtectedRoute>} />
            <Route path="/departments"     element={<ProtectedRoute role="admin"><Layout><Departments /></Layout></ProtectedRoute>} />
            <Route path="/daily-reports"   element={<ProtectedRoute role="admin"><Layout><DailyReport /></Layout></ProtectedRoute>} />
            <Route path="/final-reports"   element={<ProtectedRoute role="admin"><Layout><FinalStayReport /></Layout></ProtectedRoute>} />

            {/* ── Doctor routes ── */}
            <Route path="/doctor/dashboard"     element={<ProtectedRoute role="doctor"><Layout><DoctorDashboard /></Layout></ProtectedRoute>} />
            <Route path="/doctor/appointments"  element={<ProtectedRoute role="doctor"><Layout><DoctorAppointments /></Layout></ProtectedRoute>} />
            <Route path="/doctor/patients"      element={<ProtectedRoute role="doctor"><Layout><DoctorPatients /></Layout></ProtectedRoute>} />
            <Route path="/doctor/profile"       element={<ProtectedRoute role="doctor"><Layout><Profile /></Layout></ProtectedRoute>} />
            <Route path="/doctor/daily-reports" element={<ProtectedRoute role="doctor"><Layout><DailyReport /></Layout></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AppInit>
          <ThemedApp />
        </AppInit>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
