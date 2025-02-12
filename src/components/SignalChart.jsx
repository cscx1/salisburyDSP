import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const SignalChart = ({ data }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .select("g")
      .remove(); // Clear previous SVG content

    const g = d3
      .select(svgRef.current)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X Scale - Discrete time steps
    const xScale = d3.scaleLinear()
      .domain([0, data.length - 1])
      .range([0, width]);

    // Y Scale - Amplitude values
    const yScale = d3.scaleLinear()
      .domain([d3.min(data), d3.max(data)])
      .range([height, 0]);

    // Line generator for discrete points
    const line = d3.line()
      .x((_, i) => xScale(i))
      .y(d => yScale(d))
      .curve(d3.curveStepAfter); // Step function for discrete-time signals

    // Draw axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale));

    g.append("g").call(d3.axisLeft(yScale));

    // Draw the signal path
    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Draw the discrete points
    g.selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (_, i) => xScale(i))
      .attr("cy", d => yScale(d))
      .attr("r", 4)
      .attr("fill", "red");

  }, [data]);

  return <svg ref={svgRef}></svg>;
};

export default SignalChart;
