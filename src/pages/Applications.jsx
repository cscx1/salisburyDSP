<<<<<<< Updated upstream
import React, { useState, useEffect } from "react";
=======
import React, { useState } from "react";
>>>>>>> Stashed changes
import SignalChart from "../components/SignalChart";

const Applications = () => {
  const [signalData, setSignalData] = useState([]);

<<<<<<< Updated upstream
  //simulate fetching processed MP3 data from backend
  useEffect(() => {
    fetch("http://localhost:5000/get-signal") // Replace with actual API endpoint
      .then(response => response.json())
      .then(data => setSignalData(data.signal))
      .catch(error => console.error("Error fetching signal data:", error));
  }, []);

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">Discrete-Time Signal</h1>
      <SignalChart data={signalData} />
    </div>
  );
};
=======
  const [link, setLink] = useState("");
  const [error, setError] = useState("")
  const [printedLink, setPrintedLink] = useState("");
  const [file_url, setFileUrl] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadExpired, setDownloadExpired] = useState(false);
  const [signalData, setSignalData] = useState([]);

  {/* Function to reset inputs */}
  const resetInputs = () => {
    setLink("");
    setPrintedLink("");
    setFileUrl("")
    setStart("");
    setEnd("");
    setError("");
    setDownloadExpired(false);
    setSignalData([]);
    setEffects([{ effectType: 1, start: "", end: ""}]);
  };
>>>>>>> Stashed changes

export default Applications;


{/*const Applications = () => {
  const [data, setData] = useState({});
  const [operation, setOperation] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/members")
      .then(res => res.json())
      .then(data => {
        setData(data);
        console.log(data);
      })
      .catch(error => console.error("Error fetching data:", error));
  }, []);

<<<<<<< Updated upstream
  const sendOperation = () => {
    fetch(`http://localhost:5000/data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ operation }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Operation result:", data);
        setResult(data.result);
      })
      .catch((error) => console.error("Error sending operation:", error));
=======
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
        setFileUrl(data.file_url);
        setPrintedLink(data.result);
        setError("");

        // Wait a brief moment for the file to be processed
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Fetch signal data for each effect
        try {
          const signalDataPromises = effects.map(effect => 
            fetch("http://localhost:5000/api/get_signal_data", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                effectType: effect.effectType,
                timeRange: { 
                  start: effect.start || 0, 
                  end: effect.end || 0 
                }
              })
            }).then(res => res.json())
          );

          const signalResults = await Promise.all(signalDataPromises);
          setSignalData(signalResults);
        } catch (err) {
          console.error("Error fetching signal data:", err);
          setError("Failed to fetch signal visualization data");
        }

        setTimeout(() => {
          setDownloadExpired(true);
          setFileUrl("");
          setPrintedLink("");
          setError("Download time expired -- the file has been deleted.")
        }, 30000);
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
>>>>>>> Stashed changes
  };

  // Helper function to get effect name
  const getEffectName = (effectType) => {
    switch (effectType) {
      case 1: return 'bass';
      case 2: return 'mid';
      case 3: return 'high';
      default: return 'unknown';
    }
  };

  return (
    <div>
      <h1>React + Flask Proof of Concept</h1>
      <div>
        <input
          type="text"
          value={operation}
          onChange={(e) => setOperation(e.target.value)}
          placeholder="Enter operation (e.g., 2+3)"
        />
        <button onClick={sendOperation}>Send Operation</button>
      </div>
<<<<<<< Updated upstream
      {result !== null && (
        <div>
          <h2>Result: {result}</h2>
        </div>
      )}
=======

      {/* Add Signal Charts */}
      {signalData.length > 0 && (
        <div className="mt-8">
          <h3 className="font-bold mb-4">Signal Visualizations:</h3>
          <div className="grid gap-4">
            {effects.map((effect, index) => (
              <div key={index} className="border p-4 rounded-lg">
                <h4 className="mb-2">
                  {getEffectName(effect.effectType)} Effect 
                  ({effect.start}s - {effect.end}s)
                </h4>
                <SignalChart 
                  data={signalData[index]?.signalData || []}
                  effectType={getEffectName(effect.effectType)}
                  timeRange={{ start: effect.start, end: effect.end }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
  };
>>>>>>> Stashed changes

      <h2 className="text-xl font-bold">Members List:</h2>
      {data.members ? (
        <ul className="list-disc ml-5">
          {data.members.map((member, index) => (
            <li key={index}>{member}</li>
          ))}
        </ul>
      ) : (
        <p>Loading members...</p>
      )}
    </div>
  );
};

export default Applications; */}