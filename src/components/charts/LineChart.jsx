import { useEffect, useRef } from "react";
import * as d3 from "d3";

function LineChart({ data }) {
  const containerRef = useRef();
  const svgRef = useRef();
  const tooltipRef = useRef();

  useEffect(() => {
    const margin = { top: 20, right: 20, bottom: 40, left: 45 };
    const totalWidth = containerRef.current.clientWidth;
    const width = totalWidth - margin.left - margin.right;
    const height = 260 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", totalWidth).attr("height", height + margin.top + margin.bottom);

    const defs = svg.append("defs");
    const areaGrad = defs.append("linearGradient").attr("id", "line-area-grad")
      .attr("x1", "0").attr("y1", "0").attr("x2", "0").attr("y2", "1");
    areaGrad.append("stop").attr("offset", "0%").attr("stop-color", "#3b82f6").attr("stop-opacity", 0.18);
    areaGrad.append("stop").attr("offset", "100%").attr("stop-color", "#3b82f6").attr("stop-opacity", 0);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint().domain(data.map((d) => d.month)).range([0, width]);
    const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d.patients) * 1.2]).range([height, 0]);

    g.append("g").attr("class", "grid")
      .call(d3.axisLeft(y).tickSize(-width).tickFormat("").ticks(5))
      .selectAll("line").attr("stroke", "#f1f5f9").attr("stroke-dasharray", "4,3");
    g.select(".grid .domain").remove();

    const area = d3.area().x((d) => x(d.month)).y0(height).y1((d) => y(d.patients)).curve(d3.curveMonotoneX);
    g.append("path").datum(data).attr("fill", "url(#line-area-grad)").attr("d", area);

    const line = d3.line().x((d) => x(d.month)).y((d) => y(d.patients)).curve(d3.curveMonotoneX);
    const path = g.append("path").datum(data)
      .attr("fill", "none").attr("stroke", "#3b82f6").attr("stroke-width", 2.5)
      .attr("stroke-linecap", "round").attr("d", line);

    const totalLength = path.node().getTotalLength();
    path.attr("stroke-dasharray", totalLength).attr("stroke-dashoffset", totalLength)
      .transition().duration(900).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0);

    const tooltip = d3.select(tooltipRef.current);
    g.selectAll("circle").data(data).enter().append("circle")
      .attr("cx", (d) => x(d.month)).attr("cy", (d) => y(d.patients))
      .attr("r", 4.5).attr("fill", "#fff").attr("stroke", "#3b82f6").attr("stroke-width", 2.5)
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).attr("r", 6).attr("fill", "#3b82f6");
        tooltip.style("opacity", 1)
          .html(`<span style="font-weight:600">${d.month}</span><br/>${d.patients} patients`)
          .style("left", event.clientX + 12 + "px").style("top", event.clientY - 36 + "px");
      })
      .on("mousemove", (event) => {
        tooltip.style("left", event.clientX + 12 + "px").style("top", event.clientY - 36 + "px");
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget).attr("r", 4.5).attr("fill", "#fff");
        tooltip.style("opacity", 0);
      });

    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x))
      .selectAll("text").attr("font-size", "11px").attr("fill", "#64748b");
    g.append("g").call(d3.axisLeft(y).ticks(5))
      .selectAll("text").attr("font-size", "11px").attr("fill", "#64748b");

    g.selectAll(".domain").attr("stroke", "#e2e8f0");
    g.selectAll(".tick line").attr("stroke", "#e2e8f0");
  }, [data]);

  return (
    <div ref={containerRef} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h3 className="text-[15px] font-semibold text-slate-700 mb-4">Patients per Month</h3>
      <svg ref={svgRef} className="w-full"></svg>
      <div className="d3-tooltip" ref={tooltipRef}></div>
    </div>
  );
}

export default LineChart;
