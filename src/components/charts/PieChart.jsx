import { useEffect, useRef } from "react";
import * as d3 from "d3";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function PieChart({ data }) {
  const containerRef = useRef();
  const svgRef = useRef();

  useEffect(() => {
    const totalWidth = containerRef.current.clientWidth;
    const height = 260;
    const pieSize = height;
    const radius = pieSize / 2 - 16;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", totalWidth).attr("height", height);

    const g = svg.append("g").attr("transform", `translate(${pieSize / 2},${height / 2})`);

    const pie = d3.pie().value((d) => d.count).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.55).outerRadius(radius);
    const total = d3.sum(data, (d) => d.count);

    g.selectAll("path").data(pie(data)).enter().append("path")
      .attr("d", arc)
      .attr("fill", (d, i) => COLORS[i % COLORS.length])
      .attr("stroke", "#fff").attr("stroke-width", 2);

    g.append("text").attr("text-anchor", "middle").attr("dy", "-0.2em")
      .attr("font-size", "22px").attr("font-weight", "700").attr("fill", "#1e293b").text(total);
    g.append("text").attr("text-anchor", "middle").attr("dy", "1.2em")
      .attr("font-size", "11px").attr("fill", "#64748b").text("Total Cases");

    const legend = svg.append("g").attr("transform", `translate(${pieSize + 16}, ${height / 2 - (data.length * 26) / 2})`);
    data.forEach((d, i) => {
      const row = legend.append("g").attr("transform", `translate(0, ${i * 26})`);
      row.append("rect").attr("width", 12).attr("height", 12).attr("rx", 3).attr("fill", COLORS[i % COLORS.length]);
      row.append("text").attr("x", 18).attr("y", 10).attr("font-size", "13px").attr("fill", "#475569")
        .text(`${d.disease} (${d.count})`);
    });
  }, [data]);

  return (
    <div ref={containerRef} className="bg-white rounded-xl p-6 shadow-sm">
      <h3 className="text-[15px] font-semibold mb-4">Patient Status Distribution</h3>
      <svg ref={svgRef} className="w-full"></svg>
    </div>
  );
}

export default PieChart;
