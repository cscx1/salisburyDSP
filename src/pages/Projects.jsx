import React, { useState, useRef, useEffect } from 'react';
import SignalChart from '../components/SignalChart';

const Projects = () => {
  const [youtubeLink, setYoutubeLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [audioData, setAudioData] = useState(null);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [dominantFrequency, setDominantFrequency] = useState(null);
  
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyzerRef = useRef(null);
  const dataArrayRef = useRef(null);
  const frequencyDataRef = useRef(null);
  const animationFrameRef = useRef(null);
  const sourceRef = useRef(null);
  
  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (err) {
          console.error("Error disconnecting source:", err);
        }
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (err) {
          console.error("Error closing audio context:", err);
        }
      }
    };
  }, []);
  
  // Function to initialize AudioContext (must be triggered by user interaction)
  const initAudioContext = () => {
    try {
      // Create new AudioContext if one doesn't exist
      if (!audioContextRef.current) {
        // Safari requires a webkit prefix
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
        setDebugInfo(prev => prev + "\nAudioContext created");
      }
      
      return true;
    } catch (err) {
      setError(`Failed to initialize audio context: ${err.message}`);
      setDebugInfo(prev => prev + `\nError: ${err.message}`);
      return false;
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!youtubeLink) {
      setError('Please enter a YouTube link');
      return;
    }
    
    setLoading(true);
    setError('');
    setAudioFile(null);
    setAudioData(null);
    setDominantFrequency(null);
    setDebugInfo('Submitting request to backend...');
    
    try {
      const response = await fetch('http://localhost:5000/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          link: youtubeLink,
          choice: 1, // We're not applying effects, but backend requires a choice
          start_time: 0,
          end_time: ''
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process YouTube link');
      }
      
      setDebugInfo(prev => prev + `\nResponse received: ${JSON.stringify(data, null, 2)}`);
      
      // Use the original file URL for audio playback
      if (data.original_file_url) {
        setAudioFile(data.original_file_url);
        setDebugInfo(prev => prev + `\nSet audio file to: ${data.original_file_url}`);
      } else {
        setAudioFile(data.file_url);
        setDebugInfo(prev => prev + `\nSet audio file to: ${data.file_url}`);
      }
      
    } catch (err) {
      setError(`Error: ${err.message}`);
      setDebugInfo(prev => prev + `\nFetch error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Setup the audio analyzer when audio starts playing
  const setupAudioAnalyzer = () => {
    if (!audioRef.current || !audioRef.current.src) {
      setDebugInfo(prev => prev + "\nNo audio element or src found");
      return false;
    }
    
    try {
      // Initialize audio context (must happen in response to user action)
      if (!initAudioContext()) return false;
      
      // Create analyzer if it doesn't exist
      if (!analyzerRef.current) {
        analyzerRef.current = audioContextRef.current.createAnalyser();
        analyzerRef.current.fftSize = 2048; // Smaller for better performance
        analyzerRef.current.smoothingTimeConstant = 0.5; // Add smoothing
        
        const bufferLength = analyzerRef.current.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);
        frequencyDataRef.current = new Uint8Array(bufferLength);
        
        setDebugInfo(prev => prev + `\nAnalyzer created with buffer length: ${bufferLength}`);
      }
      
      // If we've already connected the source before, disconnect it
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
          setDebugInfo(prev => prev + "\nDisconnected previous source");
        } catch (err) {
          console.error("Error disconnecting source:", err);
        }
      }
      
      // Connect the audio element to the analyzer
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyzerRef.current);
      analyzerRef.current.connect(audioContextRef.current.destination);
      
      setDebugInfo(prev => prev + "\nAudio connected to analyzer");
      return true;
    } catch (err) {
      setError(`Audio analyzer setup failed: ${err.message}`);
      setDebugInfo(prev => prev + `\nSetup error: ${err.message}`);
      return false;
    }
  };
  
  // Calculate the dominant frequency from frequency data
  const calculateDominantFrequency = () => {
    if (!analyzerRef.current || !frequencyDataRef.current || !audioContextRef.current) return 0;
    
    // Get frequency data
    analyzerRef.current.getByteFrequencyData(frequencyDataRef.current);
    
    // Find the bin with the highest amplitude
    let maxBin = 0;
    let maxValue = 0;
    
    for (let i = 0; i < frequencyDataRef.current.length; i++) {
      if (frequencyDataRef.current[i] > maxValue) {
        maxValue = frequencyDataRef.current[i];
        maxBin = i;
      }
    }
    
    // Get sample rate from audio context
    const sampleRate = audioContextRef.current.sampleRate;
    
    // Calculate frequency in Hz
    // Formula: frequency = bin_index * sample_rate / fft_size
    const frequency = maxBin * sampleRate / analyzerRef.current.fftSize;
    
    // Return frequency rounded to nearest integer
    return Math.round(frequency);
  };
  
  // Start the visualization loop
  const visualize = () => {
    if (!analyzerRef.current || !dataArrayRef.current) {
      setDebugInfo(prev => prev + "\nCan't visualize: missing analyzer or data array");
      return;
    }
    
    try {
      // Get time domain data
      analyzerRef.current.getByteTimeDomainData(dataArrayRef.current);
      
      // Convert to normalized values (-1 to 1)
      const signalData = Array.from(dataArrayRef.current).map(value => (value / 128.0) - 1.0);
      
      // Calculate dominant frequency
      const frequency = calculateDominantFrequency();
      
      // Update state with new data
      setAudioData(signalData);
      setDominantFrequency(frequency);
      
      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(visualize);
    } catch (err) {
      setDebugInfo(prev => prev + `\nVisualization error: ${err.message}`);
      cancelAnimationFrame(animationFrameRef.current);
    }
  };
  
  // Handle play/pause button click
  const handlePlay = () => {
    if (!audioRef.current) {
      setDebugInfo("No audio element found");
      return;
    }
    
    if (playing) {
      // Pause playback
      audioRef.current.pause();
      
      // Stop animation loop
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      setPlaying(false);
      setDebugInfo(prev => prev + "\nAudio paused");
    } else {
      // Make sure the audio context is in the right state
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          setDebugInfo(prev => prev + "\nAudio context resumed");
        }).catch(err => {
          setDebugInfo(prev => prev + `\nError resuming context: ${err.message}`);
        });
      }
      
      // Setup analyzer only once when starting playback
      if (!sourceRef.current) {
        if (!setupAudioAnalyzer()) {
          setDebugInfo(prev => prev + "\nFailed to setup audio analyzer");
          return;
        }
      }
      
      // Start playback
      const playPromise = audioRef.current.play();
      
      // Handle the play promise
      if (playPromise !== undefined) {
        playPromise.then(() => {
          // Playback started successfully
          setPlaying(true);
          setDebugInfo(prev => prev + "\nAudio playback started");
          
          // Start visualization
          visualize();
        }).catch(err => {
          // Playback failed
          setError(`Playback failed: ${err.message}`);
          setDebugInfo(prev => prev + `\nPlay error: ${err.message}`);
        });
      }
    }
  };
  
  // Handle audio loading
  const handleAudioLoaded = () => {
    setAudioLoaded(true);
    setDebugInfo(prev => prev + "\nAudio file loaded");
  };
  
  // Handle audio error
  const handleAudioError = (e) => {
    setError(`Audio error: ${e.target.error ? e.target.error.message : 'Unknown error'}`);
    setDebugInfo(prev => prev + `\nAudio element error: ${e.target.error ? e.target.error.message : 'Unknown error'}`);
  };
  
  return (
    <div className="flex flex-col items-center max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">YouTube to MP3 with Live Waveform</h1>
      
      <form onSubmit={handleSubmit} className="w-full mb-8 bg-gray-900 p-6 rounded-lg shadow-lg">
        <div className="mb-4">
          <label htmlFor="youtube-link" className="block text-sm font-medium mb-2">
            Enter YouTube Link:
          </label>
          <input
            id="youtube-link"
            type="text"
            value={youtubeLink}
            onChange={(e) => setYoutubeLink(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 transition-colors"
        >
          {loading ? 'Processing...' : 'Convert and Show Waveform'}
        </button>
        
        {error && <p className="mt-4 text-red-500">{error}</p>}
      </form>
      
      {audioFile && (
        <div className="w-full bg-gray-900 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Audio Waveform Visualization</h2>
          
          <div className="flex items-center justify-center mb-6">
            <button
              onClick={handlePlay}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md mr-4 w-32"
            >
              {playing ? 'Pause' : 'Play'}
            </button>
            
            <audio
              ref={audioRef}
              src={audioFile}
              onLoadedData={handleAudioLoaded}
              onError={handleAudioError}
              crossOrigin="anonymous"
              onEnded={() => {
                setPlaying(false);
                if (animationFrameRef.current) {
                  cancelAnimationFrame(animationFrameRef.current);
                }
              }}
              className="hidden"
            />
            
            <a
              href={audioFile}
              download
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md w-32 text-center"
            >
              Download
            </a>
          </div>
          
          {/* Audio waveform visualization */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-semibold">Live Sine Wave Visualization</h3>
              {dominantFrequency !== null && (
                <div className="bg-blue-900 text-white px-4 py-2 rounded-lg font-mono">
                  <span className="text-gray-300 mr-2">Dominant Frequency:</span>
                  <span className="text-xl">{dominantFrequency}</span>
                  <span className="ml-1">Hz</span>
                </div>
              )}
            </div>
            <div className="h-64 w-full">
              {audioData ? (
                <SignalChart data={audioData} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400">
                    {playing ? 'Loading waveform...' : 'Press play to view waveform'}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Debug information */}
          <div className="mt-4 p-3 bg-gray-800 rounded text-xs font-mono text-gray-400 max-h-40 overflow-y-auto">
            <strong>Status:</strong> 
            {audioLoaded ? " Audio loaded ✓" : " Audio not loaded ✗"}
            {playing ? " | Playing ▶" : " | Paused ⏸"}
            {audioData ? " | Visualization data ready ✓" : " | No visualization data ✗"}
            <pre>{debugInfo}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;