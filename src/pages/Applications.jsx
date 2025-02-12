import React, { useState, useEffect } from "react";
import SignalChart from "../components/SignalChart";

const Applications = () => {
  const [signalData, setSignalData] = useState([]);

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
      {result !== null && (
        <div>
          <h2>Result: {result}</h2>
        </div>
      )}

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