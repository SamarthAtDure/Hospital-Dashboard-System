import { useEffect, useRef } from "react";
import * as d3 from "d3";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function PieChart({ data }) {
  const containerRef = useRef();
  const svgRef = useRef();
  const tooltipRef = useRef();

  useEffect(() => {
    const totalWidth = containerRef.current.clientWidth;
    const height = 260;
    const pieSize = height;
    const radius = pieSize / 2 - 16;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", totalWidth).attr("height", height);

    const g = svg.append("g").attr("transform", `translate(${pieSize / 2},${height / 2})`);

    const pie = d3.pie().value((d) => d.count).sort(null).padAngle(0.03);
    const arc = d3.arc().innerRadius(radius * 0.58).outerRadius(radius).cornerRadius(4);
    const arcHover = d3.arc().innerRadius(radius * 0.58).outerRadius(radius + 8).cornerRadius(4);
    const total = d3.sum(data, (d) => d.count);

    const tooltip = d3.select(tooltipRef.current);

    const paths = g.selectAll("path").data(pie(data)).enter().append("path")
      .attr("fill", (d, i) => COLORS[i % COLORS.length])
      .attr("stroke", "#fff").attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this).transition().duration(150).attr("d", arcHover);
        const pct = ((d.data.count / total) * 100).toFixed(1);
        tooltip.style("opacity", 1)
          .html(`<span style="font-weight:600">${d.data.disease}</span><br/>${d.data.count} cases (${pct}%)`)
          .style("left", event.clientX + 12 + "px").style("top", event.clientY - 36 + "px");
      })
      .on("mousemove", (event) => {
        tooltip.style("left", event.clientX + 12 + "px").style("top", event.clientY - 36 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).transition().duration(150).attr("d", arc);
        tooltip.style("opacity", 0);
      });

    paths.transition().duration(700).ease(d3.easeCubicOut)
      .attrTween("d", function (d) {
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return (t) => arc(i(t));
      });

    g.append("text").attr("text-anchor", "middle").attr("dy", "-0.2em")
      .attr("font-size", "22px").attr("font-weight", "700").attr("fill", "#1e293b").text(total);
    g.append("text").attr("text-anchor", "middle").attr("dy", "1.2em")
      .attr("font-size", "11px").attr("fill", "#64748b").text("Total Cases");

    const legend = svg.append("g").attr("transform", `translate(${pieSize + 16}, ${height / 2 - (data.length * 26) / 2})`);
    data.forEach((d, i) => {
      const row = legend.append("g").attr("transform", `translate(0, ${i * 26})`);
      row.append("rect").attr("width", 10).attr("height", 10).attr("rx", 3).attr("fill", COLORS[i % COLORS.length]);
      row.append("text").attr("x", 16).attr("y", 9).attr("font-size", "12px").attr("fill", "#475569")
        .text(`${d.disease} (${d.count})`);
    });
  }, [data]);

  return (
    <div ref={containerRef} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h3 className="text-[15px] font-semibold text-slate-700 mb-4">Patient Status Distribution</h3>
      <svg ref={svgRef} className="w-full"></svg>
      <div className="d3-tooltip" ref={tooltipRef}></div>
    </div>
  );
}

export default PieChart;
