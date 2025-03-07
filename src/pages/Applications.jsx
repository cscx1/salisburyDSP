import React, { useState } from "react";

const Applications = () => {

  const [link, setLink] = useState("");
  const [error, setError] = useState("")
  const [printedLink, setPrintedLink] = useState("");
  const [file_url, setFileUrl] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadExpired, setDownloadExpired] = useState(false);
  const [fftPlot, setFftPlot] = useState("");
  const [spectrogram, setSpectrogram] = useState("");
  const [plots, setPlots] = useState([]);

  {/* Function to reset inputs */}
  const resetInputs = () => {
    setLink("");
    setPrintedLink("");
    setFileUrl("");
    setStart("");
    setEnd("");
    setError("");
    setDownloadExpired(false);
    setFftPlot("");
    setSpectrogram("");
    setPlots([]);
  };

  {/* Array of effect objects */}
  const [effects, setEffects] = useState([
    { effectType: 1, start: "", end: "" }
  ]);

  const addEffectRow = () => {
    setEffects([...effects, { effectType: 1, start: "", end: "" }]);
  };

  const updateEffect = (index, field, value) => {
    const newEffects = effects.map((eff, i) =>
      i === index ? { ...eff, [field]: value } : eff
    );
    setEffects(newEffects);
  };

  const removeEffectRow = (index) => {
    setEffects(effects.filter((_, i) => i !== index));
  }

  {/* Download the file to the backend */}
  const handleLink = async () => {
    setError("");
    setLoading(true);
    setDownloadExpired(false);

    try {
      const response = await fetch("http://localhost:5000/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          link: link, 
          choice: effects
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setFileUrl(data.file_url)
        setPrintedLink(data.result);
        setError("");
        if (data.plots) setPlots(data.plots);
      } else {
        setPrintedLink("");
        setError(data.error);
      }
    } catch (err) {
      console.error("Error connecting to backend:", err);
      setError("Failed to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  // Function to handle cleanup and starting over
  const handleStartOver = async () => {
    if (file_url) {
      try {
        const deleteResponse = await fetch(
          `http://localhost:5000/delete_file/${file_url.split("/").pop()}`,
          { method: "POST" }
        );

        if (!deleteResponse.ok) {
          console.log("Error deleting file");
        }
      } catch (err) {
        console.error("Error during cleanup:", err);
      }
    }
    resetInputs();
  };

  return (
    <>
      {/* LINK FORM */}
      <div className="p-4">
        <h2 className="text-xl font-bold">Enter Youtube Link</h2>
  
        {/* YouTube Link Input */}
        <div className="flex items-center">
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Enter youtube link"
            className="border p-2 mr-2 flex-1"
          />
        </div>
  
      {/* Effects Section */}
      <div className="mt-4">
        <h3 className="font-bold">Effects:</h3>
        {effects.map((effect, index) => (
          <div key={index} className="flex items-center mt-2">

            {/* Dropdown for effect selection */}
            <select
              value={effect.effectType}
              onChange={(e) =>
                updateEffect(index, "effectType", parseInt(e.target.value))
              }
              className="border p-2 mr-2"
            >
              <option value={1}>Bass Boost</option>
              <option value={2}>Mids Boost</option>
              <option value={3}>High Boost</option>
            </select>

            {/* Input for effect start time */}
            <input
              type="number"
              placeholder="Start (s)"
              value={effect.start}
              onChange={(e) => updateEffect(index, "start", e.target.value)}
              className="border p-2 mr-2 w-24"
            />

            {/* Input for effect end time */}
            <input
              type="number"
              placeholder="End (s)"
              value={effect.end}
              onChange={(e) => updateEffect(index, "end", e.target.value)}
              className="border p-2 mr-2 w-24"
            />

            {/* Remove button */}
            <button 
              onClick={() => removeEffectRow(index)}
              className="bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600"
            >
              Remove
            </button>

          </div>
        ))}
        
        <div className="flex flex-col gap-4 mt-4">
          {/* Button to add a new effect row */}
          <button
            onClick={addEffectRow}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 w-fit"
          >
            New Row
          </button>
    
            {/* Submit Button */}
            <button
              onClick={handleLink}
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 w-fit"
            >
              Submit
            </button>
          </div>
        </div>
  
        {/* Error Message */}
        {error && (
          <div
            style={{
              color: "red",
              marginTop: "20px",
              fontWeight: "bold",
              textAlign: "center"
            }}
          >
            {error}
          </div>
        )}
  
        {/* Loading Animation */}
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
  
        {/* Download Button and Plots (only if file is available and not expired) */}
        {file_url && !downloadExpired && (
          <div className="mt-4 space-y-4">
            <div className="flex gap-4">
              <a
                href={file_url}
                download
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 block w-fit"
              >
                Download Processed File
              </a>
              
              {/* Add Start Over button */}
              <button
                onClick={handleStartOver}
                className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 block w-fit"
              >
                Start Over
              </button>
            </div>

            {plots.map((plot, index) => (
              <div key={index} className="mt-8 space-y-4">
                <h3 className="text-lg font-semibold">
                  Effect {index + 1}: Time Range {plot.time_range}s
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-md font-medium mb-2">Input Signal</h4>
                    <img 
                      src={plot.input_plot} 
                      alt="Input Signal" 
                      className="max-w-full h-auto rounded-lg shadow-lg"
                    />
                  </div>
                  
                  <div>
                    <h4 className="text-md font-medium mb-2">Output Signal</h4>
                    <img 
                      src={plot.output_plot} 
                      alt="Output Signal" 
                      className="max-w-full h-auto rounded-lg shadow-lg"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <h4 className="text-md font-medium mb-2">Spectrogram</h4>
                    <img 
                      src={plot.spectrogram} 
                      alt="Spectrogram" 
                      className="max-w-full h-auto rounded-lg shadow-lg"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
  };

export default Applications;