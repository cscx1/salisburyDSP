import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const AudioVisualizer = ({ data }) => {
    const timeRef = useRef();
    const fftRef = useRef();

    useEffect(() => {
        if (!data) return;

        // Clear previous visualizations
        d3.select(timeRef.current).selectAll("*").remove();
        d3.select(fftRef.current).selectAll("*").remove();

        // Common dimensions and margins
        const margin = { top: 40, right: 60, bottom: 80, left: 90 };
        const width = 900 - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;

        // Create Time Domain Plot (Discrete)
        const timeSvg = d3.select(timeRef.current)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Downsample the data more aggressively
        const downsampleFactor = Math.ceil(data.timeDomain.time.length / 50); // Reduced number of points
        const downsampledTime = data.timeDomain.time.filter((_, i) => i % downsampleFactor === 0);
        const downsampledInput = data.timeDomain.input.filter((_, i) => i % downsampleFactor === 0);
        const downsampledOutput = data.timeDomain.output.filter((_, i) => i % downsampleFactor === 0);

        // Time domain scales
        const xScaleTime = d3.scaleLinear()
            .domain([downsampledTime[0], downsampledTime[downsampledTime.length - 1]])
            .range([0, width]);

        const yScaleTime = d3.scaleLinear()
            .domain([
                Math.min(d3.min(downsampledInput), d3.min(downsampledOutput)) * 1.2,
                Math.max(d3.max(downsampledInput), d3.max(downsampledOutput)) * 1.2
            ])
            .range([height, 0]);

        // Draw stems for input signal
        downsampledTime.forEach((t, i) => {
            timeSvg.append("line")
                .attr("x1", xScaleTime(t))
                .attr("x2", xScaleTime(t))
                .attr("y1", yScaleTime(0))
                .attr("y2", yScaleTime(downsampledInput[i]))
                .attr("stroke", "#2563eb")
                .attr("stroke-width", 1);

            timeSvg.append("circle")
                .attr("cx", xScaleTime(t))
                .attr("cy", yScaleTime(downsampledInput[i]))
                .attr("r", 3)
                .attr("fill", "#2563eb");
        });

        // Draw stems for output signal
        downsampledTime.forEach((t, i) => {
            timeSvg.append("line")
                .attr("x1", xScaleTime(t))
                .attr("x2", xScaleTime(t))
                .attr("y1", yScaleTime(0))
                .attr("y2", yScaleTime(downsampledOutput[i]))
                .attr("stroke", "#dc2626")
                .attr("stroke-width", 1)
                .attr("opacity", 0.6);

            timeSvg.append("circle")
                .attr("cx", xScaleTime(t))
                .attr("cy", yScaleTime(downsampledOutput[i]))
                .attr("r", 3)
                .attr("fill", "#dc2626")
                .attr("opacity", 0.6);
        });

        // Add time domain axes with white text
        timeSvg.append("g")
            .attr("transform", `translate(0,${height/2})`)
            .call(d3.axisBottom(xScaleTime)
                .ticks(10)
                .tickFormat(d => d.toFixed(2)))
            .selectAll("text")
            .style("fill", "white");

        timeSvg.append("g")
            .call(d3.axisLeft(yScaleTime)
                .ticks(5)
                .tickFormat(d => d.toFixed(2)))
            .selectAll("text")
            .style("fill", "white");

        // Add axis labels in white
        timeSvg.append("text")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom / 2)
            .attr("text-anchor", "middle")
            .style("fill", "white")
            .text("Time (seconds)");

        timeSvg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 20)
            .attr("text-anchor", "middle")
            .style("fill", "white")
            .text("Amplitude");

        // Create FFT Plot
        const fftSvg = d3.select(fftRef.current)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Filter out zero and negative frequencies
        const validFreqIndices = data.frequencyDomain.frequencies.map((f, i) => ({ f, i }))
            .filter(({ f }) => f > 20 && f <= 20000);
        
        const frequencies = validFreqIndices.map(({ f }) => f);
        const powerInput = validFreqIndices.map(({ i }) => data.frequencyDomain.powerInput[i]);
        const powerOutput = validFreqIndices.map(({ i }) => data.frequencyDomain.powerOutput[i]);

        // FFT scales
        const xScaleFFT = d3.scaleLog()
            .domain([20, 20000])
            .range([0, width]);

        const yScaleFFT = d3.scaleLinear()
            .domain([
                Math.min(d3.min(powerInput), d3.min(powerOutput)) - 10,
                Math.max(d3.max(powerInput), d3.max(powerOutput)) + 10
            ])
            .range([height, 0]);

        // Draw FFT lines
        const lineFFT = d3.line()
            .x((d, i) => xScaleFFT(frequencies[i]))
            .y(d => yScaleFFT(d))
            .curve(d3.curveMonotoneX);

        // Draw input FFT
        fftSvg.append("path")
            .datum(powerInput)
            .attr("fill", "none")
            .attr("stroke", "#2563eb")
            .attr("stroke-width", 2)
            .attr("d", lineFFT);

        // Draw output FFT
        fftSvg.append("path")
            .datum(powerOutput)
            .attr("fill", "none")
            .attr("stroke", "#dc2626")
            .attr("stroke-width", 2)
            .attr("d", lineFFT);

        // Highlight effect frequency range
        const [minFreq, maxFreq] = data.effectInfo.range;
        fftSvg.append("rect")
            .attr("x", xScaleFFT(minFreq))
            .attr("y", 0)
            .attr("width", xScaleFFT(maxFreq) - xScaleFFT(minFreq))
            .attr("height", height)
            .attr("fill", "#9ca3af")
            .attr("opacity", 0.1);

        // Add FFT axes with white text and fewer ticks
        fftSvg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScaleFFT)
                .tickValues([20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000])
                .tickFormat(d => d))
            .selectAll("text")
            .style("fill", "white")
            .attr("transform", "rotate(-45)")
            .attr("text-anchor", "end");

        fftSvg.append("g")
            .call(d3.axisLeft(yScaleFFT)
                .ticks(5)
                .tickFormat(d => d.toFixed(0)))
            .selectAll("text")
            .style("fill", "white");

        // Add FFT axis labels in white
        fftSvg.append("text")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 5)
            .attr("text-anchor", "middle")
            .style("fill", "white")
            .text("Frequency (Hz)");

        fftSvg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 20)
            .attr("text-anchor", "middle")
            .style("fill", "white")
            .text("Magnitude (dB)");

        // Add legend for both plots in white
        const addLegend = (svg) => {
            const legend = svg.append("g")
                .attr("transform", `translate(${width - 100}, -20)`);

            legend.append("line")
                .attr("x1", 0)
                .attr("x2", 20)
                .attr("y1", 0)
                .attr("y2", 0)
                .attr("stroke", "#2563eb")
                .attr("stroke-width", 2);

            legend.append("line")
                .attr("x1", 70)
                .attr("x2", 90)
                .attr("y1", 0)
                .attr("y2", 0)
                .attr("stroke", "#dc2626")
                .attr("stroke-width", 2);

            legend.append("text")
                .attr("x", 25)
                .attr("y", 4)
                .text("Input")
                .style("font-size", "12px")
                .style("fill", "white");

            legend.append("text")
                .attr("x", 95)
                .attr("y", 4)
                .text("Output")
                .style("font-size", "12px")
                .style("fill", "white");
        };

        addLegend(timeSvg);
        addLegend(fftSvg);

    }, [data]);

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-semibold mb-2 text-white">Discrete-Time Signal</h3>
                <div ref={timeRef}></div>
            </div>
            <div>
                <h3 className="text-lg font-semibold mb-2 text-white">Frequency Spectrum</h3>
                <div ref={fftRef}></div>
            </div>
        </div>
    );
};

export default AudioVisualizer;
