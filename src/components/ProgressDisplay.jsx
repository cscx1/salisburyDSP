import React from "react";

const EFFECT_NAMES = {
  1: "Low Shelf Filter",
  2: "Midrange Peak Filter",
  3: "High Shelf + Compressor",
  4: "Compressor",
  5: "Reverb",
  6: "Chorus",
};

function ProgressDisplay({ loading, isDownloading, effectId }) {
  if (!loading) return null;

  let message = "Preparing...";
  if (isDownloading) {
    message = "Downloading from YouTube...";
  } else if (effectId && EFFECT_NAMES[effectId]) {
    message = `Applying Effect [${effectId}]: ${EFFECT_NAMES[effectId]}`;
  }

  return (
    <div className="text-center mt-2 text-md text-gray-300 animate-pulse">
      {message}
    </div>
  );
}

export default ProgressDisplay;
