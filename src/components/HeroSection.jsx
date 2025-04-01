import { Link } from "react-router-dom";

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
      Our research project implements audio filters in Python without relying on external DSP (Digital Signal Processing) libraries, reinforcing a deep understanding of signal manipulation. We visualize frequency domain transformations in DSP through custom JavaScript and D3 programming code.  Our research group also has developed a web-based interface into these analytic tools wherein users can input a YouTube link, apply audio effects such as bass boost, chorus, and reverb, and then download the processed audio. Discrete time graphs are generated to help visualize how each DSP effect transforms the waveform. This tool not only demonstrates core DSP concepts but also serves as a foundation for accessible, real time processing platforms.
      </p>

      <div className="flex justify-center my-10">
        <Link
          to="/applications"
          className="bg-gradient-to-r from-red-600 to-red-800 py-3 px-4 mx-3 rounded-md text-white hover:opacity-90 transition"
        >
          Start Testing
        </Link>
      </div>
    </div>
  );
};

export default HeroSection;
