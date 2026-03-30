  import React from "react";
  import { Button, App } from "antd";
  import { useNavigate } from "react-router-dom";
  import { useFormik } from "formik";
  import * as Yup from "yup";
  import { useDispatch } from "react-redux";
  import { loginSuccess } from "@store/authSlice";

  const API = "http://localhost:5000";

  const loginSchema = Yup.object({
    email: Yup.string()
      .trim()
      .required("Email is required")
      .email("Enter a valid email address"),
    password: Yup.string()
      .required("Password is required")
      .min(6, "Password must be at least 6 characters"),
  });

  function LoginInner() {
    const navigate = useNavigate();
    const { message } = App.useApp();
    const dispatch = useDispatch();

    const formik = useFormik({
      initialValues: { email: "", password: "" },
      validationSchema: loginSchema,
      onSubmit: async (values, { setSubmitting }) => {
        try {
          const res = await fetch(`${API}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: values.email.trim(), password: values.password }),
          });
          if (!res.ok) throw new Error("Invalid credentials");
          const user = await res.json();
          dispatch(loginSuccess(user));
          message.success("Login successful! Redirecting...");
          setTimeout(() => {
            navigate(user.role === "doctor" ? "/doctor/dashboard" : "/dashboard");
          }, 800);
        } catch {
          message.error("Invalid email or password. Please try again.");
        } finally {
          setSubmitting(false);
        }
      },
    });

    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #e8eaf6 0%, #e3f2fd 100%)" }}
      >
        {/* Split Card */}
        <div
          style={{
            display: "flex",
            width: "860px",
            minHeight: "520px",
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(45,53,97,0.18)",
          }}
        >
          {/* ── Left Panel ── */}
          <div
            style={{
              flex: 1,
              background: "linear-gradient(160deg, #1a1d2e 0%, #2d3561 60%, #4361ee 100%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "48px 36px",
              gap: "24px",
            }}
          >
            {/* Medical SVG Illustration */}
            <svg width="180" height="180" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Doctor silhouette */}
              <circle cx="100" cy="60" r="30" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
              <circle cx="100" cy="60" r="22" fill="rgba(255,255,255,0.25)" />
              {/* Head */}
              <ellipse cx="100" cy="56" rx="13" ry="15" fill="#fde8d8" />
              {/* Body */}
              <path d="M72 130 Q72 100 100 98 Q128 100 128 130 L128 155 Q100 160 72 155 Z" fill="white" opacity="0.9" />
              {/* Stethoscope */}
              <path d="M88 112 Q84 125 88 132 Q94 140 100 138 Q106 140 112 132 Q116 125 112 112" stroke="#4361ee" strokeWidth="3" fill="none" strokeLinecap="round" />
              <circle cx="100" cy="140" r="5" fill="#4361ee" />
              {/* Cross symbol */}
              <rect x="91" y="168" width="18" height="6" rx="3" fill="rgba(255,255,255,0.7)" />
              <rect x="97" y="162" width="6" height="18" rx="3" fill="rgba(255,255,255,0.7)" />
              {/* Decorative circles */}
              <circle cx="30" cy="40" r="8" fill="rgba(255,255,255,0.07)" />
              <circle cx="170" cy="160" r="14" fill="rgba(255,255,255,0.07)" />
              <circle cx="160" cy="30" r="6" fill="rgba(255,255,255,0.1)" />
            </svg>

            <div style={{ textAlign: "center" }}>
              <h2 style={{ color: "#fff", fontSize: "22px", fontWeight: 700, margin: 0 }}>MediDash</h2>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px", marginTop: "8px" }}>
                Your trusted healthcare analytics platform
              </p>
            </div>

            {/* Feature pills */}
            {["Patient Management", "Doctor Scheduling", "Analytics"].map((f) => (
              <div
                key={f}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "20px",
                  padding: "6px 18px",
                  color: "rgba(255,255,255,0.85)",
                  fontSize: "12px",
                }}
              >
                ✦ {f}
              </div>
            ))}
          </div>

          {/* ── Right Panel ── */}
          <div
            style={{
              flex: 1,
              background: "#fff",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "52px 44px",
            }}
          >
            <div style={{ marginBottom: "28px" }}>
              <h3 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "#1a1d2e" }}>Welcome back</h3>
              <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "6px" }}>Sign in to your account</p>
            </div>

            <form onSubmit={formik.handleSubmit} noValidate>
              {/* Email */}
              <label className="block text-[13px] font-semibold mt-4 mb-1.5">Email Address</label>
              <input
                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none ${
                  formik.touched.email && formik.errors.email
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-300 focus:border-blue-600"
                }`}
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.email && formik.errors.email && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.email}</p>
              )}

              {/* Password */}
              <label className="block text-[13px] font-semibold mt-4 mb-1.5">Password</label>
              <input
                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none ${
                  formik.touched.password && formik.errors.password
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-300 focus:border-blue-600"
                }`}
                type="password"
                name="password"
                placeholder="••••••••"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.password && formik.errors.password && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.password}</p>
              )}

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={formik.isSubmitting}
                style={{
                  marginTop: "24px",
                  height: "46px",
                  borderRadius: "10px",
                  background: "linear-gradient(90deg, #2d3561, #4361ee)",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "15px",
                  letterSpacing: "0.3px",
                }}
              >
                Sign In
              </Button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-5">
              Are you a doctor?{" "}
              <span className="text-blue-600 cursor-pointer font-medium" onClick={() => navigate("/register")}>
                Register here
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  function Login() {
    return <App><LoginInner /></App>;
  }

  export default Login;
