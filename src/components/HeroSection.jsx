
import { useState } from "react";

const HeroSection = () => {

  return (
    <div className="flex flex-col items-center mt-6 lg:mt-20">
      <h1 className="text-4xl sm:text-6xl lg:text-7xl text-center tracking-wide">
      Unlocking the Power of
        <span className="bg-gradient-to-r from-red-600 to-red-800 text-transparent bg-clip-text">
          {" "}
      Digital Signal Processing
        </span>
      </h1>
      <p className="mt-10 text-lg text-center text-neutral-500 max-w-4xl">
      For the Spring 2025 semester, Aiden and Diego are undertaking an independent study research course under the guidance of Dr. Cone, focusing on Digital Signal Processing and Linear Algebra. Their work will explore filter design, frequency-domain analysis, and the mathematical principles behind these processes, including the use of formulas for signal transformations and frequency responses. This study will serve as the foundation for their research project in audio signal processing and sensing.
      </p>

      <div className="flex justify-center my-10">
        <a
          href="#"
          className="bg-gradient-to-r from-red-600 to-red-800 py-3 px-4 mx-3 rounded-md"
        >
          Start Testing
        </a>
      </div>
     
    </div>
  );
};

export default HeroSection;
