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

  const [data, setData] = useState([{}]) 
  useEffect(() => {
    fetch("http://localhost:5000/members") //use full backend URL
      .then(res => res.json())
      .then(data => {
        setData(data);
        console.log(data); //checking if data is retrieved in the console
      })//if not error message
      .catch(error => console.error("Error fetching data:", error));
  }, []);

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

  <div className="container">
    <div className="chatbot-popup">
      {/*Chatbot header*/}
      <div className="chat-header">
        <div className="header-info">
          <ChatbotIcon />
          <h2 className="logo-text">Chatbot</h2>
        </div>
        <button className="material-symbols-rounded">keyboard_arrow_down</button>
      </div>

      {/*Chatbot body*/}
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

  <div>
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

  </>
  );
};

export default App
