import React, { useState, useEffect } from "react";
import { Descriptions, Form, Input, Select, Button, message, Spin, Tag, TimePicker, Checkbox } from "antd";
import dayjs from "dayjs";
// import { useDoctors, isOnShift } from "../context/DoctorContext";
import { useDoctors, isOnShift } from "@context/DoctorContext";

const API = "http://localhost:5000";

const departments = ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "General", "Dermatology", "Radiology", "Oncology"];
const availColor  = { Available: "green", Busy: "orange", "On Leave": "red" };
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Admin profile (static, read-only) ──────────────────────────────
function AdminProfile() {
  const adminInfo = {
    name: "Admin", email: "admin@hospital.com",
    role: "Hospital Administrator", department: "Administration",
    phone: "—", location: "—", joined: "—", id: "ADM-001",
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[22px] font-bold">Profile</h2>
        <p className="text-sm text-slate-500 mt-1">Your account information.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Avatar card */}
        <div className="bg-white rounded-xl p-7 shadow-sm text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}
          >A</div>
          <h3 className="text-lg font-bold">{adminInfo.name}</h3>
          <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
            {adminInfo.role}
          </span>
          <p className="mt-2.5 text-[13px] text-slate-500">✉️ {adminInfo.email}</p>
        </div>

        {/* Details */}
        <div className="bg-white rounded-xl p-7 shadow-sm">
          <h3 className="text-base font-semibold mb-5 pb-3 border-b border-slate-100">Account Details</h3>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Full Name">{adminInfo.name}</Descriptions.Item>
            <Descriptions.Item label="Email">{adminInfo.email}</Descriptions.Item>
            <Descriptions.Item label="Role">{adminInfo.role}</Descriptions.Item>
            <Descriptions.Item label="Department">{adminInfo.department}</Descriptions.Item>
            <Descriptions.Item label="Phone">{adminInfo.phone}</Descriptions.Item>
            <Descriptions.Item label="Employee ID">{adminInfo.id}</Descriptions.Item>
          </Descriptions>
        </div>
      </div>
    </div>
  );
}

// ── Doctor profile (live data + editable) ──────────────────────────
function DoctorProfile() {
  const { updateWorkingHours } = useDoctors();
  const sessionUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [doctor, setDoctor]   = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [hoursEditing, setHoursEditing] = useState(false);
  const [form]      = Form.useForm();
  const [hoursForm] = Form.useForm();

  // fetch latest doctor data from DB
  const fetchDoctor = () =>
    fetch(`${API}/doctors`)
      .then((r) => r.json())
      .then((docs) => {
        const me = docs.find((d) => d._id?.toString() === sessionUser.id);
        if (me) setDoctor(me);
        setLoading(false);
      });

  useEffect(() => { fetchDoctor(); }, [sessionUser.id]);

  const startEdit = () => {
    form.setFieldsValue({
      name:           doctor.name,
      phone:          doctor.phone || "",
      specialization: doctor.specialization || "",
      department:     doctor.department,
      experience:     doctor.experience,
      qualification:  doctor.qualification || "",
      bio:            doctor.bio || "",
    });
    setEditing(true);
  };

  const startHoursEdit = () => {
    const wh = doctor.workingHours;
    hoursForm.setFieldsValue({
      start: wh?.start ? dayjs(wh.start, "HH:mm") : null,
      end:   wh?.end   ? dayjs(wh.end,   "HH:mm") : null,
      days:  wh?.days  || ["Mon","Tue","Wed","Thu","Fri"],
    });
    setHoursEditing(true);
  };

  const handleSaveHours = async (values) => {
    setSaving(true);
    try {
      await updateWorkingHours(sessionUser.id, {
        start: values.start?.format("HH:mm") || "",
        end:   values.end?.format("HH:mm")   || "",
        days:  values.days || [],
      });
      message.success("Working hours updated!");
      setHoursEditing(false);
      fetchDoctor();
    } catch {
      message.error("Failed to update working hours.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/doctor/${sessionUser.id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error();
      // update localStorage name if changed
      if (values.name !== sessionUser.name) {
        localStorage.setItem("user", JSON.stringify({ ...sessionUser, name: values.name }));
      }
      message.success("Profile updated successfully!");
      setEditing(false);
      fetchDoctor();
    } catch {
      message.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center mt-20"><Spin size="large" /></div>;
  if (!doctor)  return <p className="text-slate-500 mt-10 text-center">Could not load profile.</p>;

  const initial = (doctor.name || "D")[0].toUpperCase();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold">My Profile</h2>
          <p className="text-sm text-slate-500 mt-1">View and update your professional information.</p>
        </div>
        {!editing && (
          <Button type="primary" onClick={startEdit}>Edit Profile</Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Avatar card */}
        <div className="bg-white rounded-xl p-7 shadow-sm text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}
          >{initial}</div>
          <h3 className="text-lg font-bold">{doctor.name}</h3>
          <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
            {doctor.specialization || doctor.department}
          </span>
          <p className="mt-2.5 text-[13px] text-slate-500">✉️ {doctor.email}</p>
          {doctor.availabilityStatus && (
            <div className="mt-3">
              <Tag color={availColor[doctor.availabilityStatus]}>{doctor.availabilityStatus}</Tag>
            </div>
          )}
          {doctor.bio && (
            <p className="mt-3 text-xs text-slate-400 leading-relaxed">{doctor.bio}</p>
          )}
        </div>

        {/* Details / Edit form */}
        <div className="bg-white rounded-xl p-7 shadow-sm">
          {!editing ? (
            <>
              <h3 className="text-base font-semibold mb-5 pb-3 border-b border-slate-100">Professional Details</h3>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Full Name">{doctor.name}</Descriptions.Item>
                <Descriptions.Item label="Email">{doctor.email}</Descriptions.Item>
                <Descriptions.Item label="Phone">{doctor.phone || "—"}</Descriptions.Item>
                <Descriptions.Item label="Department">{doctor.department}</Descriptions.Item>
                <Descriptions.Item label="Specialization">{doctor.specialization || "—"}</Descriptions.Item>
                <Descriptions.Item label="Experience">{doctor.experience}</Descriptions.Item>
                <Descriptions.Item label="Qualification">{doctor.qualification || "—"}</Descriptions.Item>
                <Descriptions.Item label="Availability">
                  <Tag color={availColor[doctor.availabilityStatus || "Available"]}>
                    {doctor.availabilityStatus || "Available"}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Working Hours">
                  {doctor.workingHours?.start ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{doctor.workingHours.start} – {doctor.workingHours.end}</span>
                      <span className="text-slate-400 text-xs">{(doctor.workingHours.days || []).join(", ")}</span>
                      <Tag color={isOnShift(doctor) ? "green" : "default"} className="!text-xs">
                        {isOnShift(doctor) ? "On Shift" : "Off Shift"}
                      </Tag>
                    </div>
                  ) : (
                    <span className="text-slate-400">Not configured</span>
                  )}
                </Descriptions.Item>
              </Descriptions>
              <div className="mt-4">
                <Button onClick={startHoursEdit}>Edit Working Hours</Button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-base font-semibold mb-5 pb-3 border-b border-slate-100">Edit Profile</h3>
              <Form form={form} layout="vertical" onFinish={handleSave}>
                <div className="grid grid-cols-2 gap-4">
                  <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="phone" label="Phone Number">
                    <Input placeholder="+1 234 567 8900" />
                  </Form.Item>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Form.Item name="department" label="Department" rules={[{ required: true }]}>
                    <Select options={departments.map((d) => ({ value: d, label: d }))} />
                  </Form.Item>
                  <Form.Item name="specialization" label="Specialization">
                    <Input placeholder="e.g. Interventional Cardiology" />
                  </Form.Item>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Form.Item name="experience" label="Experience" rules={[{ required: true }]}>
                    <Input placeholder="e.g. 8 yrs" />
                  </Form.Item>
                  <Form.Item name="qualification" label="Qualification">
                    <Input placeholder="e.g. MBBS, MD" />
                  </Form.Item>
                </div>

                <Form.Item name="bio" label="Short Bio">
                  <Input.TextArea rows={2} placeholder="Brief professional summary" />
                </Form.Item>

                <div className="flex gap-3">
                  <Button type="primary" htmlType="submit" loading={saving}>Save Changes</Button>
                  <Button onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </Form>
            </>
          )}
        </div>
      </div>

      {/* Working Hours Modal */}
      {hoursEditing && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 w-[420px] shadow-2xl">
            <h3 className="text-base font-semibold mb-5">Edit Working Hours</h3>
            <Form form={hoursForm} layout="vertical" onFinish={handleSaveHours}>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="start" label="Shift Start">
                  <TimePicker format="HH:mm" className="w-full" minuteStep={15} />
                </Form.Item>
                <Form.Item name="end" label="Shift End">
                  <TimePicker format="HH:mm" className="w-full" minuteStep={15} />
                </Form.Item>
              </div>
              <Form.Item name="days" label="Working Days">
                <Checkbox.Group options={DAYS} />
              </Form.Item>
              <div className="flex gap-3 mt-2">
                <Button type="primary" htmlType="submit" loading={saving} block>Save Hours</Button>
                <Button onClick={() => setHoursEditing(false)} block>Cancel</Button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root export: picks the right profile based on role ─────────────
function Profile() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return user.role === "doctor" ? <DoctorProfile /> : <AdminProfile />;
}

export default Profile;
