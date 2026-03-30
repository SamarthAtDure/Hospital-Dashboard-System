import React from "react";
import { Skeleton } from "antd";

function StatCard({ icon, label, value, accent, iconBg, loading }) {
  return (
    <div style={{
      background: "#ffffff",
      borderRadius: 14,
      padding: "20px 24px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      borderLeft: `4px solid ${accent}`,
      display: "flex",
      alignItems: "center",
      gap: 16,
    }}>
      {loading ? (
        <Skeleton active paragraph={{ rows: 1 }} title={{ width: "60%" }} />
      ) : (
        <>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: iconBg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, flexShrink: 0,
          }}>{icon}</div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>{label}</p>
            <h3 style={{ fontSize: 26, fontWeight: 700, color: "#1a1d2e", margin: "2px 0 0", lineHeight: 1.2 }}>{value}</h3>
          </div>
        </>
      )}
    </div>
  );
}

export default StatCard;
