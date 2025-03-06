import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const SignalChart = ({ data, effectType, timeRange }) => {
  const svgRef = useRef();

  useEffect(() => {
    // Add validation check
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log("No valid data for chart");
      return;
    }

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

    // Modified scales to account for time range
    const xScale = d3.scaleLinear()
      .domain([timeRange.start, timeRange.end])
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

    // Add effect type label
    g.append("text")
      .attr("x", width / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .attr("fill", getEffectColor(effectType))
      .text(`${effectType} Effect`);

    // Modified signal path with effect-specific styling
    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", getEffectColor(effectType))
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

  }, [data, effectType, timeRange]);

  // Helper function to determine color based on effect type
  const getEffectColor = (effect) => {
    switch (effect.toLowerCase()) {
      case 'high': return '#ff4444';
      case 'mid': return '#44ff44';
      case 'bass': return '#4444ff';
      default: return 'steelblue';
    }
  };

  return <svg ref={svgRef}></svg>;
};

export default SignalChart;
