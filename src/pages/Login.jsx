import React, { useState } from "react";
import { Button, App } from "antd";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:5000";

function LoginInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { message } = App.useApp();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
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
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f)" }}>
      <div className="bg-white rounded-2xl p-10 w-[380px] shadow-2xl">
        <div className="text-center mb-7">
          <h2 className="text-[22px] font-bold">MediDash</h2>
          <p className="text-[13px] text-slate-500">Healthcare Analytics Dashboard</p>
        </div>
        <form onSubmit={handleLogin}>
          <label className="block text-[13px] font-semibold mt-4 mb-1.5">Email Address</label>
          <input
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:outline-none"
            type="email" placeholder="Enter your email"
            value={email} onChange={(e) => setEmail(e.target.value)} required
          />
          <label className="block text-[13px] font-semibold mt-4 mb-1.5">Password</label>
          <input
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:outline-none"
            type="password" placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)} required
          />
          <Button type="primary" htmlType="submit" className="w-full mt-6" size="large" block loading={loading}>
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
