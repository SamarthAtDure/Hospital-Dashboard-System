import React, { useState, useEffect, useCallback } from "react";
import { Table, Tag, Button, Modal, Input, DatePicker, App } from "antd";
import { useFormik } from "formik";
import * as Yup from "yup";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { pushNotif as pushNotifAction } from "@store/notificationSlice";

const API = "http://localhost:5000";
const patientStatusColor = { Admitted: "gold", "In Operation": "red", Discharged: "green" };
const apptStatusColor    = { "In Work": "blue", Completed: "green" };

function DoctorAppointments() {
  const { message } = App.useApp();
  const user     = useSelector((state) => state.auth.user) || {};
  const dispatch = useDispatch();
  const pushNotif = (target, msg) => dispatch(pushNotifAction({ target, message: msg }));

  const [appointments,    setAppointments]    = useState([]);
  const [patients,        setPatients]        = useState([]);
  const [dischargeTarget, setDischargeTarget] = useState(null);

  const dischargeSchema = Yup.object({
    dischargeDate: Yup.string().required(),
    medicines: Yup.string().trim().required("Medicines prescribed is required").max(500),
    notes:     Yup.string().trim().required("Home care instructions are required").max(500),
    followUpDate: Yup.date().nullable().typeError("Select a valid date")
      .min(dayjs().startOf("day").toDate(), "Must be today or future"),
  });

  const dischargeFormik = useFormik({
    initialValues: { dischargeDate: dayjs().format("YYYY-MM-DD"), medicines: "", notes: "", followUpDate: null },
    validationSchema: dischargeSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      await fetch(`${API}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId:    dischargeTarget.patientId || dischargeTarget._id,
          doctorId:     user.id,
          patientName:  dischargeTarget.patient  || "",
          doctorName:   user.name                || "",
          diagnosis:    dischargeTarget.disease  || "",
          medicines:    values.medicines,
          notes:        values.notes,
          dischargeDate: values.dischargeDate,
          followUpDate: values.followUpDate ? dayjs(values.followUpDate).format("YYYY-MM-DD") : "",
        }),
      });
      // update patient status + dischargeDate
      if (dischargeTarget.patientId) {
        await fetch(`${API}/patients/${dischargeTarget.patientId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientStatus: "Discharged", doctorId: user.id, dischargeDate: values.dischargeDate }),
        });
        pushNotif("admin", `Patient ${dischargeTarget.patient} has been discharged by Dr. ${user.name}.`);
      }
      message.success("Discharge report saved.");
      resetForm();
      setDischargeTarget(null);
      fetchAll();
      setSubmitting(false);
    },
  });

  const fetchAll = useCallback(() => {
    Promise.all([
      fetch(`${API}/doctor/${user.id}/appointments`).then((r) => r.json()),
      fetch(`${API}/doctor/${user.id}/patients`).then((r) => r.json()),
    ]).then(([appts, pts]) => {
      setAppointments(appts);
      setPatients(pts);
    }).catch(() => {});
  }, [user.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // find the patient record linked to an appointment
  const getPatient = (appt) =>
    patients.find((p) => p.name === appt.patient || p._id === appt.patientId) || null;

  const updateApptStatus = async (id, status) => {
    await fetch(`${API}/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    message.success(`Status updated to ${status}`);
    fetchAll();
  };

  const handleStatusChange = async (appt, newStatus) => {
    const patient = getPatient(appt);
    if (!patient) { message.warning("Patient record not found."); return; }

    if (newStatus === "Discharged") {
      // don't update patient status yet — form submit will do it with dischargeDate
      dischargeFormik.resetForm({ values: { dischargeDate: dayjs().format("YYYY-MM-DD"), medicines: "", notes: "", followUpDate: null } });
      setDischargeTarget({ ...appt, patientId: patient._id, disease: patient.disease });
    } else {
      await fetch(`${API}/patients/${patient._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientStatus: newStatus, doctorId: user.id }),
      });
      if (newStatus === "In Operation")
        pushNotif("admin", `Patient ${appt.patient} is now In Operation — Dr. ${user.name} (${appt.department}).`);
      message.success(`Status updated to ${newStatus}`);
      fetchAll();
    }
  };

  const StatusButtons = ({ appt }) => {
    const patient = getPatient(appt);
    const current = patient?.patientStatus || "Admitted";
    const isDischarged = current === "Discharged";
    return (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <Button size="small"
          type={current === "Admitted" ? "primary" : "default"}
          style={{ ...(current === "Admitted" ? { backgroundColor: "#d97706", borderColor: "#d97706" } : {}), ...(isDischarged ? { opacity: 0.35, pointerEvents: "none" } : {}) }}
          disabled={isDischarged}
          onClick={() => handleStatusChange(appt, "Admitted")}>Admitted</Button>
        <Button size="small"
          danger={current === "In Operation"}
          type={current === "In Operation" ? "primary" : "default"}
          style={isDischarged ? { opacity: 0.35, pointerEvents: "none" } : {}}
          disabled={isDischarged}
          onClick={() => handleStatusChange(appt, "In Operation")}>In Operation</Button>
        <Button size="small"
          type={current === "Discharged" ? "primary" : "default"}
          style={current === "Discharged" ? { backgroundColor: "#16a34a", borderColor: "#16a34a" } : {}}
          onClick={() => handleStatusChange(appt, "Discharged")}>Discharge</Button>
      </div>
    );
  };

  const columns = [
    { title: "Patient",    dataIndex: "patient",    sorter: (a, b) => a.patient?.localeCompare(b.patient) },
    { title: "Department", dataIndex: "department" },
    { title: "Date",       dataIndex: "date",       sorter: (a, b) => new Date(a.date) - new Date(b.date) },
    { title: "Time",       dataIndex: "time" },
    {
      title: "Appt Status", dataIndex: "status",
      render: (s, record) => (
        <div className="flex gap-1">
          {["In Work", "Completed"].map((opt) => (
            <Button key={opt} size="small"
              type={s === opt ? "primary" : "default"}
              style={s === opt && opt === "In Work"      ? { backgroundColor: "#3b82f6", borderColor: "#3b82f6" } :
                     s === opt && opt === "Completed"    ? { backgroundColor: "#16a34a", borderColor: "#16a34a" } : {}}
              onClick={() => updateApptStatus(record._id, opt)}>
              {opt}
            </Button>
          ))}
        </div>
      ),
    },
    {
      title: "Patient Status",
      render: (_, record) => {
        const patient = getPatient(record);
        const s = patient?.patientStatus || "Admitted";
        return <Tag color={patientStatusColor[s]}>{s}</Tag>;
      },
    },
    {
      title: "Update Status",
      render: (_, record) => <StatusButtons appt={record} />,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1d2e", margin: 0 }}>My Appointments</h2>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Manage your patient appointments and update patient status.</p>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <Table columns={columns} dataSource={appointments} rowKey="_id" pagination={{ pageSize: 10 }} />
      </div>

      {/* Discharge Modal */}
      <Modal
        title={`Discharge — ${dischargeTarget?.patient}`}
        open={!!dischargeTarget}
        onCancel={() => { setDischargeTarget(null); dischargeFormik.resetForm(); }}
        footer={null}
        width={480}
      >
        <form onSubmit={dischargeFormik.handleSubmit} noValidate className="mt-3">

          {/* Discharge Date — read-only, set to today */}
          <div className="mb-3">
            <label className="block text-[13px] font-semibold mb-1">Discharge Date</label>
            <input
              readOnly
              value={dayjs(dischargeFormik.values.dischargeDate).format("DD MMM YYYY")}
              style={{
                width: "100%", padding: "6px 11px", fontSize: 13,
                border: "1px solid #d9d9d9", borderRadius: 6,
                background: "#f8fafc", color: "#475569", cursor: "default",
              }}
            />
          </div>

          <div className="mb-3">
            <label className="block text-[13px] font-semibold mb-1">Medicines Prescribed</label>
            <Input.TextArea name="medicines" rows={3} placeholder="e.g. Paracetamol 500mg — twice daily for 5 days"
              value={dischargeFormik.values.medicines}
              onChange={dischargeFormik.handleChange}
              onBlur={dischargeFormik.handleBlur}
              status={dischargeFormik.touched.medicines && dischargeFormik.errors.medicines ? "error" : ""} />
            <div className="flex justify-between mt-1">
              {dischargeFormik.touched.medicines && dischargeFormik.errors.medicines
                ? <p className="text-red-500 text-xs">{dischargeFormik.errors.medicines}</p> : <span />}
              <span className="text-xs text-slate-400 ml-auto">{(dischargeFormik.values.medicines || "").length}/500</span>
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-[13px] font-semibold mb-1">Home Care Instructions</label>
            <Input.TextArea name="notes" rows={3} placeholder="e.g. Rest for 1 week, stay hydrated..."
              value={dischargeFormik.values.notes}
              onChange={dischargeFormik.handleChange}
              onBlur={dischargeFormik.handleBlur}
              status={dischargeFormik.touched.notes && dischargeFormik.errors.notes ? "error" : ""} />
            <div className="flex justify-between mt-1">
              {dischargeFormik.touched.notes && dischargeFormik.errors.notes
                ? <p className="text-red-500 text-xs">{dischargeFormik.errors.notes}</p> : <span />}
              <span className="text-xs text-slate-400 ml-auto">{(dischargeFormik.values.notes || "").length}/500</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[13px] font-semibold mb-1">
              Follow-up Date <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <DatePicker className="w-full"
              value={dischargeFormik.values.followUpDate ? dayjs(dischargeFormik.values.followUpDate) : null}
              onChange={(d) => dischargeFormik.setFieldValue("followUpDate", d ? d.toDate() : null)}
              onBlur={() => dischargeFormik.setFieldTouched("followUpDate", true)}
              status={dischargeFormik.touched.followUpDate && dischargeFormik.errors.followUpDate ? "error" : ""}
              disabledDate={(c) => c && c < dayjs().startOf("day")} />
            {dischargeFormik.touched.followUpDate && dischargeFormik.errors.followUpDate && (
              <p className="text-red-500 text-xs mt-1">{dischargeFormik.errors.followUpDate}</p>
            )}
          </div>

          <Button type="primary" htmlType="submit" block loading={dischargeFormik.isSubmitting}>
            Save &amp; Discharge
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export default DoctorAppointments;
