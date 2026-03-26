import React from "react";
import { Skeleton } from "antd";

function StatCard({ icon, label, value, accent, iconBg, loading }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm flex items-center gap-4" style={{ borderLeft: `4px solid ${accent}` }}>
      {/* Skeleton — shown while loading is true */}
      {loading ? (
        <Skeleton active paragraph={{ rows: 1 }} title={{ width: "60%" }} />
      ) : (
        <>
          <div className="text-2xl w-[50px] h-[50px] rounded-xl flex items-center justify-center" style={{ background: iconBg }}>{icon}</div>
          <div>
            <p className="text-xs text-slate-500 uppercase">{label}</p>
            <h3 className="text-2xl font-bold">{value}</h3>
          </div>
        </>
      )}
    </div>
  );
}

export default StatCard;
