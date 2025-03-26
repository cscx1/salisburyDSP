import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const SignalChart = ({ data }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Clear previous SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = 800 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X Scale - Linear for continuous waveform display
    const xScale = d3.scaleLinear()
      .domain([0, data.length - 1])
      .range([0, width]);

    // Y Scale - Amplitude values typically between -1 and 1 for audio waveforms
    const yScale = d3.scaleLinear()
      .domain([-1, 1])  // Fixed domain for consistent wave display
      .range([height, 0]);

    // Create line generator for smooth waveform
    const line = d3.line()
      .x((_, i) => xScale(i))
      .y(d => yScale(d))
      .curve(d3.curveCardinal);  // Use cardinal curve for smoother line

    // Add zero line (horizontal center line)
    svg.append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0))
      .attr("stroke", "#444")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3");

    // Draw the waveform path
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")  // Blue color to match the button
      .attr("stroke-width", 2)
      .attr("d", line);

    // Optional: Add vertical lines to show time segments
    for (let i = 0; i <= 10; i++) {
      const x = width * (i / 10);
      svg.append("line")
        .attr("x1", x)
        .attr("x2", x)
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "#333")
        .attr("stroke-width", 1)
        .attr("opacity", 0.3);
    }

    // Optional: Add amplitude markers
    svg.append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", yScale(0.5))
      .attr("y2", yScale(0.5))
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("opacity", 0.3);

    svg.append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", yScale(-0.5))
      .attr("y2", yScale(-0.5))
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("opacity", 0.3);

    // Add subtle gradient background for visual appeal
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "waveform-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#3b82f6")
      .attr("stop-opacity", 0.2);

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#1f1f1f")
      .attr("stop-opacity", 0);

    // Add gradient area under the waveform
    const area = d3.area()
      .x((_, i) => xScale(i))
      .y0(height)
      .y1(d => yScale(d))
      .curve(d3.curveCardinal);

    svg.append("path")
      .datum(data)
      .attr("fill", "url(#waveform-gradient)")
      .attr("d", area);

  }, [data]);

  return (
    <svg 
      ref={svgRef} 
      width="100%" 
      height="100%" 
      preserveAspectRatio="xMidYMid meet" 
      viewBox="0 0 800 300"
      className="bg-gray-900 rounded-lg"
    ></svg>
  );
};

export default SignalChart;
