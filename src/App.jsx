// import React from 'react'
import HeroSection from './components/HeroSection';
import Navbar from './components/Navbar'
import ChatbotIcon from './components/ChatbotIcon';
import { Routes, Route } from "react-router-dom";
import Footer from "./components/Footer";
 
import React, { useState, useEffect } from 'react'
 
import Theory from "./pages/Theory";
import Applications from "./pages/Applications";
import Projects from "./pages/Projects";
 
const App = () => {
 
  const [data, setData] = useState({});
  const [operation, setOperation] = useState("");
  const [result, setResult] = useState(null);
 
 
    /*
    Backand end front end connect
    */
 
    useEffect(() => {
      fetch("http://localhost:5000/members") 
        .then(res => res.json())
        .then(data => {
          setData(data);
          console.log(data);
        })
        .catch(error => console.error("Error fetching data:", error));
    }, []);
 
    /*
    Communicate in both directions, backend and frontend
    */
 
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
  <>
    <Navbar />
      <div className="max-w-7xl mx-auto pt-20 px-6">
        <Routes> {/*connecting to other pages. Navbat stays present*/}
          <Route path="/" element={<HeroSection />} />
          <Route path="/theory" element={<Theory />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/projects" element={<Projects />} />
        </Routes>
        <Footer />
      </div>
 
 {/*
  <div className="container">
    <div className="chatbot-popup">
      Chatbot header
      <div className="chat-header">
        <div className="header-info">
          <ChatbotIcon />
          <h2 className="logo-text">Chatbot</h2>
        </div>
        <button className="material-symbols-rounded">keyboard_arrow_down</button>
      </div>
 
      Chatbot body
      <div className="chat-body">
        <div className="message bot-message">
        <ChatbotIcon />
        <p className="message-text">
          Hey there! <br /> Ask me about DSP
        </p>
        </div>
    </div>
    </div>
  </div> 
 */}
 
  </>
  );
};
 
export default App