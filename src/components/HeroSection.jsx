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
        For the Spring 2025 semester, Aidan and Diego are undertaking an independent study research course under the guidance of Dr. Cone, focusing on applications of Digital Signal Processing and Linear Algebra...
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
