import React, { useState } from "react";
import { Form, Input, Select, Button, message } from "antd";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:5000";

const departments = ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "General", "Dermatology", "Radiology", "Oncology"];

function DoctorRegister() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/register/doctor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, status: "Available" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      messageApi.success("Registration submitted! Awaiting admin approval.");
      form.resetFields();
      setTimeout(() => navigate("/"), 1800);
    } catch (err) {
      messageApi.error(err.message || "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-10"
      style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f)" }}
    >
      {contextHolder}
      <div className="bg-white rounded-2xl p-10 w-[480px] shadow-2xl">
        {/* Header */}
        <div className="text-center mb-7">
          <h2 className="text-[22px] font-bold">MediDash</h2>
          <p className="text-[13px] text-slate-500 mt-1">Doctor Registration Request</p>
          <p className="text-xs text-slate-400 mt-1">Your request will be reviewed by the admin before activation.</p>
        </div>

        <Form form={form} layout="vertical" onFinish={handleSubmit}>

          {/* Row 1 — Name + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="name" label="Full Name" rules={[{ required: true, message: "Enter your full name" }]}>
              <Input placeholder="Dr. John Smith" />
            </Form.Item>
            <Form.Item name="phone" label="Phone Number" rules={[{ required: true, message: "Enter phone number" }]}>
              <Input placeholder="+1 234 567 8900" />
            </Form.Item>
          </div>

          {/* Row 2 — Email + Password */}
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="email" label="Email Address" rules={[{ required: true, type: "email", message: "Enter a valid email" }]}>
              <Input placeholder="doctor@hospital.com" />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true, min: 6, message: "Min 6 characters" }]}>
              <Input.Password placeholder="••••••••" />
            </Form.Item>
          </div>

          {/* Row 3 — Department + Specialization */}
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="department" label="Department" rules={[{ required: true, message: "Select department" }]}>
              <Select placeholder="Select department">
                {departments.map((d) => <Select.Option key={d} value={d}>{d}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="specialization" label="Specialization" rules={[{ required: true, message: "Enter specialization" }]}>
              <Input placeholder="e.g. Interventional Cardiology" />
            </Form.Item>
          </div>

          {/* Row 4 — Experience + Qualification */}
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="experience" label="Experience" rules={[{ required: true, message: "Enter experience" }]}>
              <Input placeholder="e.g. 8 yrs" />
            </Form.Item>
            <Form.Item name="qualification" label="Qualification" rules={[{ required: true, message: "Enter qualification" }]}>
              <Input placeholder="e.g. MBBS, MD" />
            </Form.Item>
          </div>

          {/* Bio */}
          <Form.Item name="bio" label="Short Bio">
            <Input.TextArea rows={2} placeholder="Brief professional summary (optional)" />
          </Form.Item>

          <Form.Item className="mb-2">
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              Submit Registration Request
            </Button>
          </Form.Item>

          <p className="text-center text-xs text-slate-400 mt-2">
            Already registered?{" "}
            <span className="text-blue-600 cursor-pointer font-medium" onClick={() => navigate("/")}>
              Sign In
            </span>
          </p>
        </Form>
      </div>
    </div>
  );
}

export default DoctorRegister;
