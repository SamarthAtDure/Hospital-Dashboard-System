import React from "react";
import { Input, Select, Button, message } from "antd";
import RPI from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
const PhoneInput = RPI.default ?? RPI;
import { useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useDispatch } from "react-redux";
import { pushNotif as pushNotifAction } from "@store/notificationSlice";

const API = "http://localhost:5000";

const DEPARTMENTS = [
  "Cardiology", "Neurology", "Orthopedics", "Pediatrics",
  "General", "Dermatology", "Radiology", "Oncology",
];

const DR_TITLES = ["Dr.", "Prof."];

const registerSchema = Yup.object({
  title: Yup.string().required("Title is required"),
  name: Yup.string()
    .trim()
    .required("Full name is required")
    .min(2, "Name must be at least 2 characters")
    .matches(/^[a-zA-Z\s]+$/, "Name must contain only letters and spaces"),

  phone: Yup.string()
    .required("Phone number is required")
    .test("phone-valid", "Enter a valid phone number (subscriber number cannot start with 1–5)", (val) => {
      if (!val) return false;
      // strip country code digits, last 10 digits must start with 6-9
      const subscriber = val.slice(-10);
      return /^[6-9]\d{9}$/.test(subscriber);
    }),

  email: Yup.string()
    .trim()
    .required("Email is required")
    .email("Enter a valid email address"),

  password: Yup.string()
    .required("Password is required")
    .min(8, "Password must be at least 8 characters")
    .matches(/[A-Z]/, "Must contain at least 1 uppercase letter")
    .matches(/[0-9]/, "Must contain at least 1 number")
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Must contain at least 1 special character"),

  department: Yup.string()
    .required("Department is required")
    .oneOf(DEPARTMENTS, "Select a valid department"),

  specialization: Yup.string()
    .trim()
    .required("Specialization is required")
    .min(3, "Specialization must be at least 3 characters"),

  experience: Yup.number()
    .typeError("Experience must be a number")
    .required("Experience is required")
    .min(1, "Experience must be at least 1 year")
    .max(50, "Experience cannot exceed 50 years"),

  qualification: Yup.string()
    .trim()
    .required("Qualification is required")
    .min(2, "Qualification must be at least 2 characters"),

  bio: Yup.string()
    .max(300, "Bio cannot exceed 300 characters"),
});

// helper — red border class
const inputClass = (touched, error) =>
  touched && error ? "border-red-500" : "";

function DoctorRegister() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const dispatch = useDispatch();
  const pushNotif = (target, msg) => dispatch(pushNotifAction({ target, message: msg }));

  const formik = useFormik({
    initialValues: {
      title: "", name: "", phone: "", email: "", password: "",
      department: "", specialization: "", experience: "", qualification: "", bio: "",
    },
    validationSchema: registerSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        const res = await fetch(`${API}/register/doctor`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, name: `${values.title} ${values.name}`, phone: `+${values.phone}`, status: "Available" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        pushNotif("admin", `New doctor registration request from ${values.name} (${values.department})`);
        messageApi.success("Registration submitted! Awaiting admin approval.");
        resetForm();
        setTimeout(() => navigate("/"), 1800);
      } catch (err) {
        messageApi.error(err.message || "Submission failed. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  // helper to show error text
  const ErrMsg = ({ name }) =>
    formik.touched[name] && formik.errors[name]
      ? <p className="text-red-500 text-xs mt-1">{formik.errors[name]}</p>
      : null;

  return (
    <div
      className="min-h-screen flex items-center justify-center py-10"
      style={{ background: "linear-gradient(135deg, #1a1d2e 0%, #2d3561 100%)" }}
    >
      {contextHolder}
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px", width: 480, boxShadow: "0 8px 40px rgba(67,97,238,0.15)" }}>

        {/* Header */}
        <div className="text-center mb-7">
          <h2 className="text-[22px] font-bold">MediDash</h2>
          <p className="text-[13px] text-slate-500 mt-1">Doctor Registration Request</p>
          <p className="text-xs text-slate-400 mt-1">Your request will be reviewed by the admin before activation.</p>
        </div>

        <form onSubmit={formik.handleSubmit} noValidate>

          {/* Row 1 — Name + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-semibold mb-1">Full Name</label>
              <Input
                name="name"
                placeholder="John Smith"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                status={(formik.touched.name && formik.errors.name) || (formik.touched.title && formik.errors.title) ? "error" : ""}
                addonBefore={
                  <Select
                    value={formik.values.title || undefined}
                    onChange={(val) => formik.setFieldValue("title", val)}
                    options={DR_TITLES.map((t) => ({ value: t, label: t }))}
                    placeholder="Title"
                    style={{ width: 80 }}
                  />
                }
              />
              <ErrMsg name="title" />
              <ErrMsg name="name" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1">Phone Number</label>
              <PhoneInput
                country="in"
                value={formik.values.phone}
                onChange={(val) => formik.setFieldValue("phone", val)}
                onBlur={() => formik.setFieldTouched("phone", true)}
                inputStyle={{ width: "100%", borderColor: formik.touched.phone && formik.errors.phone ? "#ff4d4f" : undefined }}
                containerStyle={{ width: "100%" }}
                enableSearch
              />
              <ErrMsg name="phone" />
            </div>
          </div>

          {/* Row 2 — Email + Password */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-[13px] font-semibold mb-1">Email Address</label>
              <Input
                name="email"
                placeholder="doctor@hospital.com"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                status={formik.touched.email && formik.errors.email ? "error" : ""}
              />
              <ErrMsg name="email" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1">Password</label>
              <Input.Password
                name="password"
                placeholder="••••••••"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                status={formik.touched.password && formik.errors.password ? "error" : ""}
              />
              <ErrMsg name="password" />
            </div>
          </div>

          {/* Row 3 — Department + Specialization */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-[13px] font-semibold mb-1">Department</label>
              <Select
                placeholder="Select department"
                className="w-full"
                value={formik.values.department || undefined}
                onChange={(val) => formik.setFieldValue("department", val)}
                onBlur={() => formik.setFieldTouched("department", true)}
                status={formik.touched.department && formik.errors.department ? "error" : ""}
                options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
              />
              <ErrMsg name="department" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1">Specialization</label>
              <Input
                name="specialization"
                placeholder="e.g. Interventional Cardiology"
                value={formik.values.specialization}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                status={formik.touched.specialization && formik.errors.specialization ? "error" : ""}
              />
              <ErrMsg name="specialization" />
            </div>
          </div>

          {/* Row 4 — Experience + Qualification */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-[13px] font-semibold mb-1">Experience (years)</label>
              <Input
                name="experience"
                type="number"
                placeholder="e.g. 8"
                value={formik.values.experience}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                status={formik.touched.experience && formik.errors.experience ? "error" : ""}
              />
              <ErrMsg name="experience" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1">Qualification</label>
              <Input
                name="qualification"
                placeholder="e.g. MBBS, MD"
                value={formik.values.qualification}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                status={formik.touched.qualification && formik.errors.qualification ? "error" : ""}
              />
              <ErrMsg name="qualification" />
            </div>
          </div>

          {/* Bio */}
          <div className="mt-4">
            <label className="block text-[13px] font-semibold mb-1">
              Short Bio <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <Input.TextArea
              name="bio"
              rows={2}
              placeholder="Brief professional summary (optional)"
              value={formik.values.bio}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              status={formik.touched.bio && formik.errors.bio ? "error" : ""}
            />
            <div className="flex justify-between items-center mt-1">
              <ErrMsg name="bio" />
              <span className="text-xs text-slate-400 ml-auto">{formik.values.bio.length}/300</span>
            </div>
          </div>

          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            className="mt-6"
            loading={formik.isSubmitting}
          >
            Submit Registration Request
          </Button>

          <p className="text-center text-xs text-slate-400 mt-4">
            Already registered?{" "}
            <span className="text-blue-600 cursor-pointer font-medium" onClick={() => navigate("/")}>
              Sign In
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}

export default DoctorRegister;
