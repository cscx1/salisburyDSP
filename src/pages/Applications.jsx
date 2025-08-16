import React, { useState } from "react";
import AudioVisualizer from "../components/AudioVisualizer";
import { v4 as uuidv4 } from "uuid";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const Applications = () => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [printedLink, setPrintedLink] = useState("");
  const [file_url, setFileUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadExpired, setDownloadExpired] = useState(false);
  const [visualizations, setVisualizations] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [visibleVisualizations, setVisibleVisualizations] = useState([]);
  const [customVisualization, setCustomVisualization] = useState(false);
  const [customTimeStart, setCustomTimeStart] = useState("");
  const [customTimeEnd, setCustomTimeEnd] = useState("");
  const [audioDuration, setAudioDuration] = useState(0);
  const [customVizData, setCustomVizData] = useState(null);
  const [loadingCustomViz, setLoadingCustomViz] = useState(false);

  const EFFECT_SETTINGS = {
    1: ["boost", "cutoff"],
    2: ["boost", "center_freq", "bandwidth"],
    3: ["boost", "cutoff", "threshold", "ratio", "attack", "release"],
    4: ["threshold", "ratio", "attack", "release"],
    5: ["delay_ms", "decay", "num_echoes"],
    6: ["depth_ms", "mod_freq", "mix"],
  };

  const LABELS = {
    boost: "Boost (dB)",
    cutoff: "Cutoff (Hz)",
    center_freq: "Center Freq (Hz)",
    bandwidth: "Bandwidth (Hz)",
    threshold: "Threshold (dB)",
    ratio: "Ratio",
    attack: "Attack (ms)",
    release: "Release (ms)",
    decay: "Decay",
    delay_ms: "Delay (ms)",
    num_echoes: "Echoes",
    depth_ms: "Depth (ms)",
    mod_freq: "Mod Freq (Hz)",
    mix: "Mix (0.0 - 1.0)",
  };

  const defaultSettingsByType = (type) => {
    const keys = EFFECT_SETTINGS[type] || [];
    const defaults = {};
    keys.forEach((key) => {
      if (key === "mix") defaults[key] = 0.3;
      else if (key === "threshold") defaults[key] = -20;
      else defaults[key] = 10;
    });
    return defaults;
  };

  const [effects, setEffects] = useState([
    {
      id: uuidv4(),
      effectType: 1,
      start: "",
      end: "",
      settings: defaultSettingsByType(1),
    },
  ]);

  const toggleSettings = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };  

  const updateEffect = (index, field, value, isNestedSetting = false) => {
    setEffects((prev) => {
      return prev.map((effect, i) => {
        if (i !== index) return effect;
  
        if (isNestedSetting) {
          return {
            ...effect,
            settings: {
              ...effect.settings,
              [field]: value === "" ? "" : value,
            },
          };
        } else {
          return {
            ...effect,
            [field]: value,
          };
        }
      });
    });
  };  
  
  const addEffectRow = () => {
    setEffects((prev) => [
      ...prev,
      {
        id: uuidv4(),
        effectType: 1,
        start: "",
        end: "",
        settings: defaultSettingsByType(1),
      },
    ]);
  };
  
  const removeEffectRow = (id) => {
    setEffects((prev) => prev.filter((e) => e.id !== id));
  };
  

  const resetInputs = () => {
    setLink("");
    setPrintedLink("");
    setFileUrl("");
    setError("");
    setDownloadExpired(false);
    setVisualizations([]);
    setEffects([
      {
        id: uuidv4(),
        effectType: 1,
        start: "",
        end: "",
        settings: defaultSettingsByType(1),
      },
    ]);
  };

  const handleLink = async () => {
    setError("");
    setLoading(true);
    setDownloadExpired(false);
    setVisibleVisualizations([]);
    setCustomVisualization(false);
    setCustomVizData(null);
    
    try {
      const response = await fetch(`${API_URL}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link, choice: effects }),
      });

      const data = await response.json();

      if (response.ok) {
        setFileUrl(data.file_url);
        setPrintedLink(data.result);
        if (data.visualizations) {
          console.log("Received visualizations:", data.visualizations);
          setVisualizations(data.visualizations);
        } else {
          console.warn("No visualizations received from backend");
        }
        
        // Store the audio duration for custom visualization validation
        if (data.duration) {
          setAudioDuration(data.duration);
        }
      } else {
        setError(data.error);
        setPrintedLink("");
      }
    } catch (err) {
      console.error("Backend error:", err);
      setError("Failed to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = async () => {
    if (file_url) {
      try {
        await fetch(
          `${API_URL}/delete_file/${file_url.split("/").pop()}`,
          { method: "POST" }
        );
        setFileUrl(null);
      } catch (err) {
        console.error("Error deleting file:", err);
      }
    }
    resetInputs();
  };

  // DND-kit config
  const sensors = useSensors(useSensor(PointerSensor));
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = effects.findIndex((e) => e.id === active.id);
    const newIndex = effects.findIndex((e) => e.id === over.id);
    setEffects((effects) => arrayMove(effects, oldIndex, newIndex));
  };

  // Sortable row component
  const SortableEffectRow = React.memo(({ effect }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: effect.id });
  
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
  
    const index = effects.findIndex((e) => e.id === effect.id);
  
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className="mb-4 p-3 border border-neutral-700 rounded bg-neutral-800 hover:bg-neutral-700 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <div
            {...listeners}
            className="cursor-grab px-2 text-neutral-400 text-xl"
            title="Drag to reorder"
          >
            ⋮⋮
          </div>
  
          <select
            value={effect.effectType}
            onChange={(e) =>
              updateEffect(index, "effectType", parseInt(e.target.value))
            }
            className="border p-2 flex-1"
          >
            <option value={1}>Bass Boost</option>
            <option value={2}>Mids Boost</option>
            <option value={3}>High Boost</option>
            <option value={4}>Compressor</option>
            <option value={5}>Reverb</option>
            <option value={6}>Chorus</option>
          </select>
  
          <input
            type="number"
            placeholder="Start (s)"
            value={effect.start ?? ""}
            onChange={(e) => updateEffect(index, "start", e.target.value)}
            className="border p-2 w-24"
          />
  
          <input
            type="number"
            placeholder="End (s)"
            value={effect.end ?? ""}
            onChange={(e) => updateEffect(index, "end", e.target.value)}
            className="border p-2 w-24"
          />
  
          <button
            onClick={() => toggleSettings(effect.id)}
            className="bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700"
          >
            {expandedId === effect.id ? "Hide" : "Settings"}
          </button>
  
          <button
            onClick={() => removeEffectRow(effect.id)}
            className="bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600"
          >
            Remove
          </button>
        </div>
  
        {expandedId === effect.id && (
          <div className="mt-2 p-2 border rounded bg-neutral-900 text-white grid grid-cols-2 md:grid-cols-4 gap-4">
            {(EFFECT_SETTINGS[effect.effectType] || []).map((field) => (
              <div key={field}>
                <label className="block text-sm mb-1">{LABELS[field]}</label>
                <input
                  type="number"
                  value={effect.settings[field] ?? ""}
                  onChange={(e) =>
                    updateEffect(index, field, e.target.value, true)
                  }
                  className="border p-1 rounded w-full text-white"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  });
  
  const toggleVisualization = (index) => {
    setVisibleVisualizations(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };
  
  const fetchCustomVisualization = async () => {
    if (!customTimeStart || !customTimeEnd) {
      setError("Please enter both start and end times for custom visualization");
      return;
    }
    
    const start = parseFloat(customTimeStart);
    const end = parseFloat(customTimeEnd);
    
    if (isNaN(start) || isNaN(end)) {
      setError("Start and end times must be valid numbers");
      return;
    }
    
    if (start >= end) {
      setError("Start time must be less than end time");
      return;
    }
    
    if (start < 0 || end > audioDuration) {
      setError(`Time range must be between 0 and ${audioDuration} seconds`);
      return;
    }
    
    setError("");
    setLoadingCustomViz(true);
    
    try {
      const response = await fetch(`${API_URL}/custom_visualization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_url: file_url.split("/").pop(),
          start_time: start,
          end_time: end
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.visualization) {
        setCustomVizData(data.visualization);
      } else {
        setError(data.error || "Failed to generate custom visualization");
      }
    } catch (err) {
      console.error("Error generating custom visualization:", err);
      setError("Server error while generating visualization");
    } finally {
      setLoadingCustomViz(false);
    }
  };

  return (
    <div className="p-4" style={{ fontFamily: "'Nunito Sans', sans-serif" }}>
      <h2 className="text-xl font-bold">Enter YouTube Link</h2>
      <input
        type="text"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="Enter YouTube link"
        className="border p-2 mr-2 w-full mb-4"
      />

      <div className="mt-4">
        <h3 className="font-bold">Effects:</h3>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={effects.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            {effects.map((effect) => (
              <SortableEffectRow key={effect.id} effect={effect} />
            ))}
          </SortableContext>
        </DndContext>

        <div className="flex space-x-4 mt-4">
          <button
            onClick={addEffectRow}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Add Effect
          </button>

          <button
            onClick={handleLink}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
          >
            Submit
          </button>
        </div>
      </div>

      {error && <div className="text-red-500 mt-4 text-center font-bold">{error}</div>}

      {loading && (
        <div className="flex justify-center items-center mt-4">
          <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            ></path>
          </svg>
          <span className="ml-2">Loading...</span>
        </div>
      )}

      {file_url && !downloadExpired && (
        <div className="mt-4 space-y-4">
          <div className="flex space-x-4">
            <a
              href={file_url}
              download
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
            >
              Download Processed File
            </a>
            <button
              onClick={handleStartOver}
              className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600"
            >
              Start Over
            </button>
          </div>

          {/* Custom Visualization Section */}
          <div className="mt-8 p-4 border rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                Custom Time Range Visualization
              </h3>
              <button
                onClick={() => setCustomVisualization(!customVisualization)}
                className={`px-4 py-2 rounded-md ${
                  customVisualization
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-blue-500 hover:bg-blue-600"
                } text-white`}
              >
                {customVisualization ? "Hide Custom Viz" : "Show Custom Viz"}
              </button>
            </div>
            
            {customVisualization && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Time (seconds)</label>
                    <input
                      type="number"
                      min="0"
                      max={audioDuration}
                      step="0.1"
                      value={customTimeStart}
                      onChange={(e) => setCustomTimeStart(e.target.value)}
                      className="border p-2 w-32"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Time (seconds)</label>
                    <input
                      type="number"
                      min="0"
                      max={audioDuration}
                      step="0.1"
                      value={customTimeEnd}
                      onChange={(e) => setCustomTimeEnd(e.target.value)}
                      className="border p-2 w-32"
                    />
                  </div>
                  <button
                    onClick={fetchCustomVisualization}
                    disabled={loadingCustomViz}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                  >
                    {loadingCustomViz ? "Loading..." : "Generate Visualization"}
                  </button>
                </div>
                
                {customVizData ? (
                  <AudioVisualizer 
                    data={customVizData} 
                    title={`Custom Visualization (${customTimeStart}s - ${customTimeEnd}s)`}
                  />
                ) : (
                  <div className="p-4 bg-gray-800 rounded text-white text-center">
                    Enter a time range and click "Generate Visualization" to see the visualization for that specific time window.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Effect-based Visualizations */}
          <h3 className="text-xl font-bold mt-8">Effect Visualizations</h3>
          {visualizations && visualizations.length > 0 ? (
            visualizations.map((vizData, index) => (
              <div key={index} className="mt-4 p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">
                    Effect {index + 1}: {vizData.effectInfo ? vizData.effectInfo.name : `Effect ${index + 1}`}
                    <span className="text-sm font-normal ml-2">
                      (Time Range: {effects[index] ? effects[index].start : 'N/A'}s - {effects[index] ? effects[index].end : 'N/A'}s)
                    </span>
                  </h3>
                  <button
                    onClick={() => toggleVisualization(index)}
                    className={`px-4 py-2 rounded-md ${
                      visibleVisualizations.includes(index)
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-blue-500 hover:bg-blue-600"
                    } text-white`}
                  >
                    {visibleVisualizations.includes(index) ? "Hide Visualization" : "Show Visualization"}
                  </button>
                </div>
                
                {visibleVisualizations.includes(index) && (
                  vizData && vizData.timeDomain ? (
                    <AudioVisualizer 
                      data={vizData} 
                      title={`Effect ${index + 1}: ${vizData.effectInfo ? vizData.effectInfo.name : 'Effect'}`}
                    />
                  ) : (
                    <div className="p-4 bg-red-800 rounded text-white">
                      Error: Missing visualization data for this effect
                    </div>
                  )
                )}
              </div>
            ))
          ) : (
            <div className="p-4 bg-yellow-800 rounded text-white">
              No visualization data available. The audio was processed successfully, but visualization data was not generated.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Applications;