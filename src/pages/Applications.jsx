import React, { useState } from "react";

const Applications = () => {

  const [link, setLink] = useState("");
  const [printedLink, setPrintedLink] = useState("");
  const [error, setError] = useState("");
  const [selectedEffect, setSelectedEffect] = useState(1);

  const handleLink = async () => {
    setError("");

    try {
      const response = await fetch("http://localhost:5000/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link: link, choice: selectedEffect }),
      });

      const data = await response.json();

      if (response.ok) {
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
        {printedLink && <p className="mt-2">You entered this link: {printedLink}</p>}
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    </>
  );
};

export default Applications;
