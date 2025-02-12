import React, { useState } from "react";

const Applications = () => {

  // PRINT LINK FUNCTION INSIDE APP
  const [link, setLink] = useState("");
  const [printedLink, setPrintedLink] = useState("");
  const [error, setError] = useState("");

  const handleLink = async () => {
    setError("");

    try {
      const response = await fetch("http://localhost:5000/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link: link }),
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
        <input
          type="text"
          value={link}
          onChange={(e) => {
            const newLink = e.target.value;
            setLink(newLink);
            handleLink(newLink);
          }}
          placeholder="Enter youtube link"
          className="border p-2 mr-2"
        />
        {printedLink && <p className="mt-2">You entered this link: {printedLink}</p>}
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    </>
  );
};
  
export default Applications;