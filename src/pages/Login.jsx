import React from "react";
import { Button, App } from "antd";
import { useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";

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
        localStorage.setItem("user", JSON.stringify(user));
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f)" }}>
      <div className="bg-white rounded-2xl p-10 w-[380px] shadow-2xl">
        <div className="text-center mb-7">
          <h2 className="text-[22px] font-bold">MediDash</h2>
          <p className="text-[13px] text-slate-500">Healthcare Analytics Dashboard</p>
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
            className="w-full mt-6"
            size="large"
            block
            loading={formik.isSubmitting}
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
  );
}

function Login() {
  return <App><LoginInner /></App>;
}

export default Login;
