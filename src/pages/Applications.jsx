import React, { useState } from "react";

const Applications = () => {

  const [link, setLink] = useState("");
  const [error, setError] = useState("")
  const [printedLink, setPrintedLink] = useState("");
  const [selectedEffect, setSelectedEffect] = useState(1);
  const [file_url, setFileUrl] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  {/* Function to reset inputs */}
  const resetInputs = () => {
    setLink("");
    setPrintedLink("");
    setFileUrl("")
    setStart("");
    setEnd("");
    setError("");
  };

  {/* Download the file to the backend */}
  const handleLink = async () => {
    setError("");
    try {
      const response = await fetch("http://localhost:5000/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          link: link, 
          choice: selectedEffect,
          start_time: start ? parseInt(start) : 0,
          end_time: end ? parseInt(end) : null
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setFileUrl(data.file_url)
        setPrintedLink(data.result);
        setError("");
      } else {
        setPrintedLink("");
        setError(data.result);
      }
    } catch (err) {
      console.error("Error connecting to backend:", err);
      setError("Failed to connect to backend.");
    }
  };

  return (
    <>
      {/* LINK FORM */}
      <div className="p-4">
        <h2 className="text-xl font-bold">Enter Youtube Link</h2>
        <div className="flex items-center">
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Enter youtube link"
            className="border p-2 mr-2 flex-1"
          />

          {/* Dropdown Menu for Effect Selection */}
          <select
            value={selectedEffect}
            onChange={(e) => setSelectedEffect(parseInt(e.target.value))}
            className="border p-2 mr-2"
          >
            <option value={1}>Bass Boost</option>
            <option value={2}>Mids Boost</option>
            <option value={3}>High Boost</option>
          </select>

          <button
            onClick={handleLink}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Submit
          </button>
        </div>

        {/* Two enter fields for timestamp */}
        <div className="mt-4 flex items-center">

          <label className="mr-2">Start Time (s):</label>
          <input
            type="number"
            min="0"
            step="1"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            placeholder="Start time"
            className="border p-2 mr-4 w-24"
          />

          <label className="mr-2">End Time (s):</label>
          <input
            type="number"
            min="0"
            step="1"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            placeholder="End time"
            className="border p-2 mr-4 w-24"
          />
        
        </div>


        {/* Download button only if file is available */}
        {file_url && (
          <div className="mt-4">
            <a
              href={file_url}
              download
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
              onClick={async () => {
                await new Promise(resolve => setTimeout(resolve, 5000));
                fetch(`http://localhost:5000/delete_file/${file_url.split("/").pop()}`, {
                  method: "POST",
                });

                if(response.ok) {
                  console.log("File successfully deleted");
                }

              }}
            >
              Download Processed File
            </a>
          </div>
        )}

      </div>
    </>
  );
};

export default Applications;