import { useEffect, useRef } from "react";
import * as d3 from "d3";

function BarChart({ data, title = "Patients per Department", dataKey = "patients" }) {
  const containerRef = useRef();
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;
    const margin = { top: 20, right: 20, bottom: 50, left: 45 };
    const totalWidth = containerRef.current.clientWidth;
    const width = totalWidth - margin.left - margin.right;
    const height = 260 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", totalWidth).attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(data.map((d) => d.department)).range([0, width]).padding(0.35);
    const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d[dataKey]) + 2]).range([height, 0]);

    g.append("g").attr("class", "grid")
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(""))
      .selectAll("line").attr("stroke", "#f1f5f9");
    g.select(".grid .domain").remove();

    g.selectAll("rect").data(data).enter().append("rect")
      .attr("x", (d) => x(d.department))
      .attr("y", (d) => y(d[dataKey]))
      .attr("width", x.bandwidth())
      .attr("height", (d) => height - y(d[dataKey]))
      .attr("fill", dataKey === "doctors" ? "#10b981" : "#3b82f6").attr("rx", 4);

    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x))
      .selectAll("text").attr("font-size", "12px").attr("fill", "#64748b");
    g.append("g").call(d3.axisLeft(y).ticks(5))
      .selectAll("text").attr("font-size", "12px").attr("fill", "#64748b");

    g.selectAll(".domain").attr("stroke", "#e2e8f0");
    g.selectAll(".tick line").attr("stroke", "#e2e8f0");
  }, [data, dataKey]);

  return (
    <div ref={containerRef} className="bg-white rounded-xl p-6 shadow-sm">
      <h3 className="text-[15px] font-semibold mb-4">{title}</h3>
      <svg ref={svgRef} className="w-full"></svg>
    </div>
  );
}

export default BarChart;
