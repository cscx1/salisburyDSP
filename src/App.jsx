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
  </>
  );
};
 
export default App