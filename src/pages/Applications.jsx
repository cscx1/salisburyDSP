import React, { useState } from "react";
import AudioVisualizer from "../components/AudioVisualizer";
import ProgressDisplay from "../components/ProgressDisplay";
import TimeInput from "../components/TimeInput.jsx";
import SortableEffectRow from "../components/SortableEffectRow";
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
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [printedLink, setPrintedLink] = useState("");
  const [file_url, setFileUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadExpired, setDownloadExpired] = useState(false);
  const [visualizations, setVisualizations] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentEffectId, setCurrentEffectId] = useState(null);
  
  const EFFECT_SETTINGS = {
    1: ["boost", "cutoff"],
    2: ["boost", "center_freq", "bandwidth"],
    3: ["boost", "cutoff"],
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

  const handleLink = () => {
    setError("");
    setLoading(true);
    setDownloadExpired(false);
    setIsDownloading(true);
    setCurrentEffectId(null);

    const params = new URLSearchParams({
      link,
      effects: JSON.stringify(effects),
    });
  
    const eventSource = new EventSource(`http://localhost:5000/link?${params}`);
  
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
  
      if (data.status === "downloading") {
        setIsDownloading(true);
        setCurrentEffectId(null);
      } else if (data.status === "processing") {
        setIsDownloading(false);
        setCurrentEffectId(data.effect_id);
      } else if (data.status === "done") {
        setFileUrl(data.file_url);
        setPrintedLink(data.result);
        setIsDownloading(false);
        setCurrentEffectId(null);
        setLoading(false);
        eventSource.close();
      } else if (data.status === "error") {
        setError(data.message);
        setIsDownloading(false);
        setCurrentEffectId(null);
        setLoading(false);
        eventSource.close();
      }
    };
  
    eventSource.onerror = (err) => {
      console.error("SSE connection error:", err);
      setError("Failed to connect to backend.");
      setLoading(false);
      setIsDownloading(false);
      eventSource.close();
    };
  };


  const handleStartOver = async () => {
    if (file_url) {
      try {
        await fetch(
          `http://localhost:5000/delete_file/${file_url.split("/").pop()}`,
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
  
  return (
    <div className="p-4">
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
            {effects.map((effect, index) => (
              <SortableEffectRow
                key={effect.id}
                effect={effect}
                index={index}
                updateEffect={updateEffect}
                toggleSettings={toggleSettings}
                removeEffectRow={removeEffectRow}
                expandedId={expandedId}
                EFFECT_SETTINGS={EFFECT_SETTINGS}
                LABELS={LABELS}
              />
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

      <ProgressDisplay
        loading={loading}
        isDownloading={isDownloading}
        effectId={currentEffectId}
      />

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

          {visualizations.map((vizData, index) => (
            <div key={index} className="mt-8 p-4 border rounded-lg">
              <h3 className="text-xl font-semibold mb-4">
                Effect {index + 1}: {vizData.effectInfo.name}
                <span className="text-sm font-normal ml-2">
                  (Time Range: {effects[index].start}s - {effects[index].end}s)
                </span>
              </h3>
              <AudioVisualizer data={vizData} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Applications;