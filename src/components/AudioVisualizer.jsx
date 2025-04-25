import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const AudioVisualizer = ({ data, title }) => {
    const timeRef = useRef();
    const fftRef = useRef();
    const [error, setError] = useState(null);
    const [info, setInfo] = useState({timePoints: 0, freqPoints: 0});
    const [metrics, setMetrics] = useState(null);
    const [debugMode, setDebugMode] = useState(false);
    
    // Determine if this is a custom time range visualization
    const isCustomViz = data?.effectInfo?.type === 0;

    // Calculate metrics for signal comparison
    const calculateMetrics = (input, output) => {
        if (!input || !output || input.length === 0 || output.length === 0) return null;
        
        // Ensure arrays are the same length
        const length = Math.min(input.length, output.length);
        
        // Calculate RMSE (Root Mean Square Error)
        let sumSquaredDiff = 0;
        let maxDiff = 0;
        let sumInput = 0;
        let sumOutput = 0;
        let sumInputSquared = 0;
        let sumOutputSquared = 0;
        let sumInputOutput = 0;
        
        for (let i = 0; i < length; i++) {
            const diff = input[i] - output[i];
            sumSquaredDiff += diff * diff;
            maxDiff = Math.max(maxDiff, Math.abs(diff));
            
            // For correlation calculation
            sumInput += input[i];
            sumOutput += output[i];
            sumInputSquared += input[i] * input[i];
            sumOutputSquared += output[i] * output[i];
            sumInputOutput += input[i] * output[i];
        }
        
        const rmse = Math.sqrt(sumSquaredDiff / length);
        
        // Calculate Pearson correlation coefficient
        const meanInput = sumInput / length;
        const meanOutput = sumOutput / length;
        const numerator = sumInputOutput - length * meanInput * meanOutput;
        const denominator = Math.sqrt(
            (sumInputSquared - length * meanInput * meanInput) * 
            (sumOutputSquared - length * meanOutput * meanOutput)
        );
        
        const correlation = denominator !== 0 ? numerator / denominator : 0;
        
        // Calculate SNR (Signal-to-Noise Ratio) in dB
        const signalPower = sumInputSquared / length;
        const noisePower = sumSquaredDiff / length;
        const snr = noisePower > 0 ? 10 * Math.log10(signalPower / noisePower) : Infinity;
        
        return {
            rmse: rmse.toFixed(6),
            correlation: correlation.toFixed(6),
            maxDiff: maxDiff.toFixed(6),
            snr: snr === Infinity ? "∞" : snr.toFixed(2) + " dB"
        };
    };

    // Generate a quality report based on the data and metrics
    const generateQualityReport = () => {
        if (!data || !metrics) return [];
        
        const issues = [];
        
        // Check for correlation issues
        const correlation = parseFloat(metrics.correlation);
        if (isNaN(correlation)) {
            issues.push({
                severity: 'error',
                message: 'Unable to calculate correlation between input and output signals.'
            });
        } else if (correlation < 0.8) {
            issues.push({
                severity: 'error',
                message: `Low correlation (${correlation.toFixed(4)}) between input and output signals. The signals should be highly correlated.`
            });
        } else if (correlation < 0.95) {
            issues.push({
                severity: 'warning',
                message: `Moderate correlation (${correlation.toFixed(4)}) between input and output signals.`
            });
        } else if (correlation < 0.99) {
            issues.push({
                severity: 'info',
                message: `Good correlation (${correlation.toFixed(4)}) between input and output signals.`
            });
        } else {
            issues.push({
                severity: 'success',
                message: `Excellent correlation (${correlation.toFixed(4)}) between input and output signals.`
            });
        }
        
        // Check for RMSE issues
        const rmse = parseFloat(metrics.rmse);
        if (isNaN(rmse)) {
            issues.push({
                severity: 'error',
                message: 'Unable to calculate RMSE between input and output signals.'
            });
        } else if (rmse > 0.5) {
            issues.push({
                severity: 'error',
                message: `High RMSE (${rmse.toFixed(6)}) indicates significant differences between signals.`
            });
        } else if (rmse > 0.1) {
            issues.push({
                severity: 'warning',
                message: `Moderate RMSE (${rmse.toFixed(6)}) between signals.`
            });
        } else if (rmse > 0.01) {
            issues.push({
                severity: 'info',
                message: `Low RMSE (${rmse.toFixed(6)}) between signals.`
            });
        } else {
            issues.push({
                severity: 'success',
                message: `Very low RMSE (${rmse.toFixed(6)}) indicates signals are very similar.`
            });
        }
        
        // Check data points quantity
        if (data.timeDomain.time.length < 10) {
            issues.push({
                severity: 'error',
                message: `Insufficient time domain data points (${data.timeDomain.time.length}). This may lead to inaccurate visualization.`
            });
        } else if (data.timeDomain.time.length < 50) {
            issues.push({
                severity: 'warning',
                message: `Low number of time domain data points (${data.timeDomain.time.length}). More points would provide better visualization.`
            });
        }
        
        // Check for NaN or Infinity values
        const hasNanInput = data.timeDomain.input.some(val => isNaN(val) || !isFinite(val));
        const hasNanOutput = data.timeDomain.output.some(val => isNaN(val) || !isFinite(val));
        if (hasNanInput || hasNanOutput) {
            issues.push({
                severity: 'error',
                message: 'Data contains NaN or Infinity values. This indicates calculation errors in the signal processing.'
            });
        }
        
        return issues;
    };

    useEffect(() => {
        try {
            if (!data) {
                console.error("No data provided to AudioVisualizer");
                setError("No visualization data provided");
                return;
            }

            console.log("AudioVisualizer received data:", data);

            // Check if timeDomain data exists and has the expected structure
            if (!data.timeDomain || !data.timeDomain.time || !data.timeDomain.input || !data.timeDomain.output) {
                console.error("Missing or invalid timeDomain data:", data.timeDomain);
                setError("Missing time domain data");
                return;
            }

            if (data.timeDomain.time.length === 0 || data.timeDomain.input.length === 0 || data.timeDomain.output.length === 0) {
                console.error("Time domain arrays are empty");
                setError("Time domain arrays are empty");
                return;
            }

            // Use backend metrics if available, otherwise calculate on the frontend
            if (data.validationMetrics) {
                console.log("Using backend-calculated metrics:", data.validationMetrics);
                setMetrics({
                    rmse: data.validationMetrics.rmse.toFixed(6),
                    correlation: data.validationMetrics.correlation.toFixed(6),
                    maxDiff: data.validationMetrics.maxDiff.toFixed(6),
                    snr: data.validationMetrics.snr.toFixed(2) + " dB",
                    // Add the frequency range metrics
                    avgChange: data.validationMetrics.freqRangeMetrics.avgChange.toFixed(2) + " dB",
                    maxChange: data.validationMetrics.freqRangeMetrics.maxChange.toFixed(2) + " dB",
                    minChange: data.validationMetrics.freqRangeMetrics.minChange.toFixed(2) + " dB"
                });
            } else {
                // Calculate metrics on the frontend
                const signalMetrics = calculateMetrics(data.timeDomain.input, data.timeDomain.output);
                setMetrics(signalMetrics);
            }

            // Clear previous visualizations and errors
            setError(null);
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
                .attr("style", "display: block; margin: 0 auto;")
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            // Downsample the data more aggressively
            const downsampleFactor = Math.ceil(data.timeDomain.time.length / 50); // Reduced number of points
            const downsampledTime = data.timeDomain.time.filter((_, i) => i % downsampleFactor === 0);
            const downsampledInput = data.timeDomain.input.filter((_, i) => i % downsampleFactor === 0);
            const downsampledOutput = data.timeDomain.output.filter((_, i) => i % downsampleFactor === 0);

            console.log("Downsampled data points:", downsampledTime.length);
            setInfo(prev => ({...prev, timePoints: downsampledTime.length}));

            // Time domain scales
            const xScaleTime = d3.scaleLinear()
                .domain([downsampledTime[0], downsampledTime[downsampledTime.length - 1]])
                .range([0, width]);

            // Ensure y-scale always includes positive and negative values around zero
            // Find the maximum absolute amplitude value
            const maxAbsValue = Math.max(
                Math.abs(d3.min(downsampledInput)), 
                Math.abs(d3.max(downsampledInput)),
                Math.abs(d3.min(downsampledOutput)), 
                Math.abs(d3.max(downsampledOutput))
            ) * 1.2; // Add 20% margin
            
            // Ensure we have at least some domain range even with all zero values
            const yDomainExtent = maxAbsValue > 0.001 ? maxAbsValue : 1.0;

            const yScaleTime = d3.scaleLinear()
                .domain([-yDomainExtent, yDomainExtent]) // Symmetrical domain around zero
                .range([height, 0]);

            console.log("Y-scale domain:", yScaleTime.domain());

            // Calculate the midpoint for y-axis for better centering
            const yMidpoint = (yScaleTime.domain()[0] + yScaleTime.domain()[1]) / 2;
            const yZeroPosition = yScaleTime(0);
            
            try {
                // Add a horizontal zero line if zero is within the domain
                timeSvg.append("line")
                    .attr("x1", 0)
                    .attr("x2", width)
                    .attr("y1", yScaleTime(0))
                    .attr("y2", yScaleTime(0))
                    .attr("stroke", "#6b7280")
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "4");
                
                // Draw stems for input signal
                downsampledTime.forEach((t, i) => {
                    // Use the zero line as the base for stems
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
            } catch (error) {
                console.error("Error drawing time domain plot:", error);
                setError(`Error drawing time domain plot: ${error.message}`);
                return;
            }

            // Add time domain axes with white text
            // Position the x-axis at the zero line
            timeSvg.append("g")
                .attr("transform", `translate(0,${yScaleTime(0)})`)
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
                
            // Check if frequency domain data exists
            if (!data.frequencyDomain || !data.frequencyDomain.frequencies || 
                !data.frequencyDomain.powerInput || !data.frequencyDomain.powerOutput) {
                console.error("Missing or invalid frequency domain data");
                return; // Still show time domain, but skip FFT plot
            }

            // Create FFT Plot
            const fftSvg = d3.select(fftRef.current)
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .attr("style", "display: block; margin: 0 auto;")
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            try {
                // Filter out zero and negative frequencies
                const validFreqIndices = data.frequencyDomain.frequencies.map((f, i) => ({ f, i }))
                    .filter(({ f }) => f > 20 && f <= 20000);
                
                const frequencies = validFreqIndices.map(({ f }) => f);
                const powerInput = validFreqIndices.map(({ i }) => data.frequencyDomain.powerInput[i]);
                const powerOutput = validFreqIndices.map(({ i }) => data.frequencyDomain.powerOutput[i]);
                
                setInfo(prev => ({...prev, freqPoints: frequencies.length}));

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
                if (data.effectInfo && data.effectInfo.range) {
                    const [minFreq, maxFreq] = data.effectInfo.range;
                    fftSvg.append("rect")
                        .attr("x", xScaleFFT(minFreq))
                        .attr("y", 0)
                        .attr("width", xScaleFFT(maxFreq) - xScaleFFT(minFreq))
                        .attr("height", height)
                        .attr("fill", "#9ca3af")
                        .attr("opacity", 0.1);
                }

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
                
            } catch (error) {
                console.error("Error drawing frequency domain plot:", error);
                setError(prev => prev ? `${prev}, Error drawing frequency plot: ${error.message}` : `Error drawing frequency plot: ${error.message}`);
            }
        } catch (error) {
            console.error("Visualization error:", error);
            setError(`Visualization error: ${error.message}`);
        }
    }, [data]);

    // Determine the time range description
    const timeRange = data && data.timeDomain && data.timeDomain.time && data.timeDomain.time.length > 0
        ? `${data.timeDomain.time[0].toFixed(2)}s - ${data.timeDomain.time[data.timeDomain.time.length-1].toFixed(2)}s`
        : "N/A";

    return (
        <div className={`space-y-8 p-5 rounded-lg ${isCustomViz ? 'bg-gray-900' : ''}`}>
            <div className="flex justify-between items-center">
                {title && (
                    <h2 className="text-2xl font-bold text-white">{title}</h2>
                )}
                <button 
                    onClick={() => setDebugMode(!debugMode)}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
                >
                    {debugMode ? "Hide Debug Info" : "Show Debug Info"}
                </button>
            </div>
            
            {error && (
                <div className="p-4 bg-red-800 rounded text-white">
                    Error: {error}
                </div>
            )}
            
            {/* Debug mode display */}
            {debugMode && data && (
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-700 overflow-auto max-h-[500px]">
                    <h3 className="text-lg font-semibold mb-3 text-white">Debug Information</h3>
                    
                    {/* Quality report section */}
                    <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Quality Report</h4>
                        <div className="bg-gray-800 p-3 rounded">
                            {generateQualityReport().map((issue, i) => (
                                <div 
                                    key={i} 
                                    className={`mb-1 px-3 py-2 rounded text-sm ${
                                        issue.severity === 'error' ? 'bg-red-900/50 text-red-200' :
                                        issue.severity === 'warning' ? 'bg-yellow-900/50 text-yellow-200' :
                                        issue.severity === 'info' ? 'bg-blue-900/50 text-blue-200' :
                                        'bg-green-900/50 text-green-200'
                                    }`}
                                >
                                    {issue.message}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Normalization statistics if available */}
                    {data.validationMetrics && data.validationMetrics.normalizationStats && (
                        <div className="mb-4">
                            <h4 className="text-sm font-semibold text-gray-400 mb-2">Normalization Statistics</h4>
                            <div className="bg-gray-800 p-3 rounded">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div>
                                        <h5 className="text-xs font-semibold text-gray-400 mb-2">Original Signal</h5>
                                        <table className="w-full text-sm text-left text-gray-400">
                                            <thead className="text-xs uppercase bg-gray-700 text-gray-400">
                                                <tr>
                                                    <th className="px-3 py-2">Metric</th>
                                                    <th className="px-3 py-2">Input</th>
                                                    <th className="px-3 py-2">Output</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-b border-gray-700">
                                                    <td className="px-3 py-2">Max</td>
                                                    <td className="px-3 py-2">{data.validationMetrics.normalizationStats.original.input.max.toFixed(4)}</td>
                                                    <td className="px-3 py-2">{data.validationMetrics.normalizationStats.original.output.max.toFixed(4)}</td>
                                                </tr>
                                                <tr className="border-b border-gray-700">
                                                    <td className="px-3 py-2">Mean</td>
                                                    <td className="px-3 py-2">{data.validationMetrics.normalizationStats.original.input.mean.toFixed(4)}</td>
                                                    <td className="px-3 py-2">{data.validationMetrics.normalizationStats.original.output.mean.toFixed(4)}</td>
                                                </tr>
                                                <tr className="border-b border-gray-700">
                                                    <td className="px-3 py-2">StdDev</td>
                                                    <td className="px-3 py-2">{data.validationMetrics.normalizationStats.original.input.std.toFixed(4)}</td>
                                                    <td className="px-3 py-2">{data.validationMetrics.normalizationStats.original.output.std.toFixed(4)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div>
                                        <h5 className="text-xs font-semibold text-gray-400 mb-2">Normalized Signal</h5>
                                        <table className="w-full text-sm text-left text-gray-400">
                                            <thead className="text-xs uppercase bg-gray-700 text-gray-400">
                                                <tr>
                                                    <th className="px-3 py-2">Metric</th>
                                                    <th className="px-3 py-2">Input</th>
                                                    <th className="px-3 py-2">Output</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-b border-gray-700">
                                                    <td className="px-3 py-2">Max</td>
                                                    <td className="px-3 py-2">{data.validationMetrics.normalizationStats.normalized.input.max.toFixed(4)}</td>
                                                    <td className="px-3 py-2">{data.validationMetrics.normalizationStats.normalized.output.max.toFixed(4)}</td>
                                                </tr>
                                                <tr className="border-b border-gray-700">
                                                    <td className="px-3 py-2">Mean</td>
                                                    <td className="px-3 py-2">{data.validationMetrics.normalizationStats.normalized.input.mean.toFixed(4)}</td>
                                                    <td className="px-3 py-2">{data.validationMetrics.normalizationStats.normalized.output.mean.toFixed(4)}</td>
                                                </tr>
                                                <tr className="border-b border-gray-700">
                                                    <td className="px-3 py-2">StdDev</td>
                                                    <td className="px-3 py-2">{data.validationMetrics.normalizationStats.normalized.input.std.toFixed(4)}</td>
                                                    <td className="px-3 py-2">{data.validationMetrics.normalizationStats.normalized.output.std.toFixed(4)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-400 mb-2">Time Domain (First 10 samples)</h4>
                            <table className="w-full text-sm text-left text-gray-400">
                                <thead className="text-xs uppercase bg-gray-700 text-gray-400">
                                    <tr>
                                        <th className="px-3 py-2">Time</th>
                                        <th className="px-3 py-2">Input</th>
                                        <th className="px-3 py-2">Output</th>
                                        <th className="px-3 py-2">Diff</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.timeDomain.time.slice(0, 10).map((t, i) => (
                                        <tr key={i} className="border-b border-gray-700">
                                            <td className="px-3 py-2">{t.toFixed(4)}</td>
                                            <td className="px-3 py-2">{data.timeDomain.input[i].toFixed(4)}</td>
                                            <td className="px-3 py-2">{data.timeDomain.output[i].toFixed(4)}</td>
                                            <td className="px-3 py-2">{(data.timeDomain.input[i] - data.timeDomain.output[i]).toFixed(4)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-gray-400 mb-2">Data Info</h4>
                            <div className="bg-gray-800 p-3 rounded">
                                <p className="text-xs text-gray-300 mb-1">Total Time Points: {data.timeDomain.time.length}</p>
                                <p className="text-xs text-gray-300 mb-1">Total Freq Points: {data.frequencyDomain?.frequencies?.length || 0}</p>
                                <p className="text-xs text-gray-300 mb-1">Effect Type: {data.effectInfo?.type} ({data.effectInfo?.name})</p>
                                <p className="text-xs text-gray-300 mb-1">Freq Range: {data.effectInfo?.range?.[0]} - {data.effectInfo?.range?.[1]} Hz</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Signal Metrics Display */}
            {metrics && (
                <div className="p-4 bg-gray-800 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3 text-white">Signal Analysis Metrics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div className="text-center">
                            <h4 className="text-sm font-semibold text-gray-400">RMSE</h4>
                            <p className="text-lg font-bold text-white">{metrics.rmse}</p>
                            <p className="text-xs text-gray-400">Lower is better (0 = identical)</p>
                        </div>
                        <div className="text-center">
                            <h4 className="text-sm font-semibold text-gray-400">Correlation</h4>
                            <p className="text-lg font-bold text-white">{metrics.correlation}</p>
                            <p className="text-xs text-gray-400">Higher is better (1 = identical)</p>
                        </div>
                        <div className="text-center">
                            <h4 className="text-sm font-semibold text-gray-400">Max Difference</h4>
                            <p className="text-lg font-bold text-white">{metrics.maxDiff}</p>
                            <p className="text-xs text-gray-400">Lower is better (0 = identical)</p>
                        </div>
                        <div className="text-center">
                            <h4 className="text-sm font-semibold text-gray-400">SNR</h4>
                            <p className="text-lg font-bold text-white">{metrics.snr}</p>
                            <p className="text-xs text-gray-400">Higher is better (∞ = identical)</p>
                        </div>
                    </div>
                    
                    {/* Display additional frequency-specific metrics if available */}
                    {metrics.avgChange && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                            <h4 className="text-sm font-semibold text-gray-400 mb-2 text-center">
                                Effect Frequency Range Analysis ({data?.effectInfo?.name})
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <h4 className="text-sm font-semibold text-gray-400">Average Change</h4>
                                    <p className="text-lg font-bold text-white">{metrics.avgChange}</p>
                                </div>
                                <div className="text-center">
                                    <h4 className="text-sm font-semibold text-gray-400">Max Boost</h4>
                                    <p className="text-lg font-bold text-white">{metrics.maxChange}</p>
                                </div>
                                <div className="text-center">
                                    <h4 className="text-sm font-semibold text-gray-400">Min Change</h4>
                                    <p className="text-lg font-bold text-white">{metrics.minChange}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            <div className="mb-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold mb-2 text-white">
                        Discrete-Time Signal 
                        {info.timePoints > 0 && <span className="text-sm font-normal ml-2">({info.timePoints} points)</span>}
                    </h3>
                    <span className="text-sm text-gray-400">Time Range: {timeRange}</span>
                </div>
                <div ref={timeRef} className="border border-gray-700 rounded-lg p-2 bg-black text-center"></div>
            </div>
            
            <div>
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold mb-2 text-white">
                        Frequency Spectrum
                        {info.freqPoints > 0 && <span className="text-sm font-normal ml-2">({info.freqPoints} points)</span>}
                    </h3>
                    {data?.effectInfo?.name && (
                        <span className="text-sm text-gray-400">
                            {isCustomViz ? "Full Spectrum Analysis" : data.effectInfo.name}
                        </span>
                    )}
                </div>
                <div ref={fftRef} className="border border-gray-700 rounded-lg p-2 bg-black text-center"></div>
            </div>
        </div>
    );
};

export default AudioVisualizer;
