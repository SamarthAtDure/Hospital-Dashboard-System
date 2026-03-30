import { useEffect, useRef } from "react";
import * as d3 from "d3";

function BarChart({ data, title = "Patients per Department", dataKey = "patients" }) {
  const containerRef = useRef();
  const svgRef = useRef();
  const tooltipRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;
    const margin = { top: 20, right: 20, bottom: 50, left: 45 };
    const totalWidth = containerRef.current.clientWidth;
    const width = totalWidth - margin.left - margin.right;
    const height = 260 - margin.top - margin.bottom;
    const isGreen = dataKey === "doctors";
    const gradStart = isGreen ? "#34d399" : "#60a5fa";
    const gradEnd = isGreen ? "#059669" : "#2563eb";

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", totalWidth).attr("height", height + margin.top + margin.bottom);

    const defs = svg.append("defs");
    const grad = defs.append("linearGradient").attr("id", `bar-grad-${dataKey}`)
      .attr("x1", "0").attr("y1", "0").attr("x2", "0").attr("y2", "1");
    grad.append("stop").attr("offset", "0%").attr("stop-color", gradStart);
    grad.append("stop").attr("offset", "100%").attr("stop-color", gradEnd);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(data.map((d) => d.name)).range([0, width]).padding(0.4);
    const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d[dataKey]) * 1.2]).range([height, 0]);

    g.append("g").attr("class", "grid")
      .call(d3.axisLeft(y).tickSize(-width).tickFormat("").ticks(5))
      .selectAll("line").attr("stroke", "#f1f5f9").attr("stroke-dasharray", "4,3");
    g.select(".grid .domain").remove();

    const tooltip = d3.select(tooltipRef.current);

    g.selectAll("rect").data(data).enter().append("rect")
      .attr("x", (d) => x(d.name))
      .attr("y", height)
      .attr("width", x.bandwidth())
      .attr("height", 0)
      .attr("fill", `url(#bar-grad-${dataKey})`)
      .attr("rx", 6)
      .on("mouseover", (event, d) => {
        tooltip.style("opacity", 1)
          .html(`<span style="font-weight:600">${d.name}</span><br/>${d[dataKey]} ${dataKey}`)
          .style("left", event.clientX + 12 + "px")
          .style("top", event.clientY - 36 + "px");
        d3.select(event.currentTarget).attr("opacity", 0.82);
      })
      .on("mousemove", (event) => {
        tooltip.style("left", event.clientX + 12 + "px").style("top", event.clientY - 36 + "px");
      })
      .on("mouseout", (event) => {
        tooltip.style("opacity", 0);
        d3.select(event.currentTarget).attr("opacity", 1);
      })
      .transition().duration(600).ease(d3.easeCubicOut)
      .attr("y", (d) => y(d[dataKey]))
      .attr("height", (d) => height - y(d[dataKey]));

    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x))
      .selectAll("text").attr("font-size", "11px").attr("fill", "#64748b");
    g.append("g").call(d3.axisLeft(y).ticks(5))
      .selectAll("text").attr("font-size", "11px").attr("fill", "#64748b");

    g.selectAll(".domain").attr("stroke", "#e2e8f0");
    g.selectAll(".tick line").attr("stroke", "#e2e8f0");
  }, [data, dataKey]);

  return (
    <div ref={containerRef} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h3 className="text-[15px] font-semibold text-slate-700 mb-4">{title}</h3>
      <svg ref={svgRef} className="w-full"></svg>
      <div className="d3-tooltip" ref={tooltipRef}></div>
    </div>
  );
}

export default BarChart;
