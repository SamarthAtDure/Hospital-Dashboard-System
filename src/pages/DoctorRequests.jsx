import React, { useState, useEffect } from "react";
import { Table, Button, Popconfirm, message, Tag, Drawer } from "antd";

const API = "http://localhost:5000";

function DoctorRequests() {
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);

  const fetchRequests = () =>
    fetch(`${API}/doctor-requests`).then((r) => r.json()).then(setRequests);

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (id) => {
    const res = await fetch(`${API}/doctor-requests/${id}/approve`, { method: "PATCH" });
    const data = await res.json();
    message.success(data.message);
    setSelected(null);
    fetchRequests();
  };

  const handleReject = async (id) => {
    const res = await fetch(`${API}/doctor-requests/${id}`, { method: "DELETE" });
    const data = await res.json();
    message.error(data.message);
    setSelected(null);
    fetchRequests();
  };

  const columns = [
    { title: "Name",           dataIndex: "name",           sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: "Email",          dataIndex: "email" },
    { title: "Department",     dataIndex: "department" },
    { title: "Specialization", dataIndex: "specialization" },
    { title: "Experience",     dataIndex: "experience" },
    {
      title: "Status",
      render: () => <Tag color="gold">Pending</Tag>,
    },
    {
      title: "Actions",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => setSelected(record)}>View</Button>
          <Popconfirm
            title="Approve this doctor?"
            description="They will be added to the doctors list and can log in."
            onConfirm={() => handleApprove(record._id)}
            okText="Approve"
            cancelText="Cancel"
            okButtonProps={{ type: "primary" }}
          >
            <Button size="small" type="primary">Approve</Button>
          </Popconfirm>
          <Popconfirm
            title="Reject this request?"
            description="This request will be permanently removed."
            onConfirm={() => handleReject(record._id)}
            okText="Reject"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger>Reject</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1d2e", margin: 0 }}>Doctor Requests</h2>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Pending doctor registration requests awaiting your approval.</p>
        </div>
        {requests.length > 0 && (
          <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1 rounded-full">
            {requests.length} Pending
          </span>
        )}
      </div>

      <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        {requests.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-sm">No pending registration requests.</p>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={requests}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </div>

      {/* Detail Drawer */}
      <Drawer
        title="Registration Details"
        open={!!selected}
        onClose={() => setSelected(null)}
        size="default"
        footer={
          selected && (
            <div className="flex gap-3">
              <Popconfirm
                title="Approve this doctor?"
                onConfirm={() => handleApprove(selected._id)}
                okText="Yes" cancelText="No"
              >
                <Button type="primary" block>Approve</Button>
              </Popconfirm>
              <Popconfirm
                title="Reject this request?"
                onConfirm={() => handleReject(selected._id)}
                okText="Yes" cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button danger block>Reject</Button>
              </Popconfirm>
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-3 text-sm">
            {[
              ["Full Name",       selected.name],
              ["Email",           selected.email],
              ["Phone",           selected.phone],
              ["Department",      selected.department],
              ["Specialization",  selected.specialization],
              ["Experience",      selected.experience],
              ["Qualification",   selected.qualification],
              ["Bio",             selected.bio || "—"],
              ["Submitted",       selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "—"],
            ].map(([label, val]) => (
              <div key={label} className="flex gap-2">
                <span className="text-slate-500 w-32 shrink-0">{label}:</span>
                <strong className="break-all">{val}</strong>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}

export default DoctorRequests;
