from flask import Flask, jsonify, request
from flask_cors import CORS
<<<<<<< Updated upstream
import numpy as np
=======
from validate import *
import soundfile as sf
import scipy.io.wavfile as wav
from scipy import signal
import numpy as np
import librosa
import os
import time
from threading import Timer
>>>>>>> Stashed changes

app = Flask(__name__)
CORS(app) #allow requests from frontend

<<<<<<< Updated upstream
@app.route("/get-signal")
def get_signal():
    # Generate a test discrete-time signal (replace with actual MP3 processing)
    signal = np.sin(np.linspace(0, 10, 50)).tolist()
    return jsonify({"signal": signal})
=======
# First, install the new dependencies in your virtual environment:
# pip install soundfile scipy numpy librosa flask flask-cors

# Check to see if file exists 
def wait_for_file(filepath, timeout=15):
    start_time = time.time()
    while not os.path.exists(filepath):
        if time.time - start_time > timeout:
            raise TimeoutError(f"File {filepath} did not appear within {timeout} seconds")
        time.sleep(0.1)

# Schedule deletion of files after 30 seconds
def schedule_deletion(outputFile, inputFile, delay):
    def delete_files():
        for file in [outputFile, inputFile]:
            try:
                if os.path.exists(file):
                    os.remove(file)
                    print(f"Deleted {file} after {delay} seconds.")
            except Exception as e:
                print(f"Error deleting {file}: {e}")

    Timer(delay, delete_files).start()

# Function to apply effects
def apply_effects(link, effects, inputFile, outputFile):
    try:
        # Download the YouTube video as audio
        os.system(f'yt-dlp -x --audio-format wav -o "{inputFile}" {link}')
        
        # Process each effect
        for effect in effects:
            # Load the audio file
            data, samplerate = sf.read(inputFile)
            
            # Make sure data is 2D array
            if len(data.shape) > 1:
                data = data.mean(axis=1)  # Convert stereo to mono if needed
            
            # Convert time to samples
            start_sample = max(0, int(float(effect.get("start", 0)) * samplerate))
            end_sample = min(len(data), int(float(effect.get("end", len(data)/samplerate)) * samplerate))
            
            # Get the segment we want to process
            segment = data[start_sample:end_sample]
            
            # Skip processing if segment is too short
            if len(segment) < 100:  # Minimum 100 samples required
                continue
                
            effect_type = effect["effectType"]
            
            try:
                if effect_type == 1:  # Bass boost
                    # Simple low-pass filter
                    b, a = signal.butter(2, 150/(samplerate/2), btype='lowpass')
                    filtered = signal.lfilter(b, a, segment)  # Using lfilter instead of filtfilt
                    boost_amount = 2.0
                    
                elif effect_type == 2:  # Mid boost
                    # Simple band-pass filter
                    b, a = signal.butter(2, [500/(samplerate/2), 2000/(samplerate/2)], btype='band')
                    filtered = signal.lfilter(b, a, segment)
                    boost_amount = 1.5
                    
                elif effect_type == 3:  # High boost
                    # Simple high-pass filter
                    b, a = signal.butter(2, 2000/(samplerate/2), btype='highpass')
                    filtered = signal.lfilter(b, a, segment)
                    boost_amount = 1.5
                
                # Apply the boost and update the segment
                data[start_sample:end_sample] = filtered * boost_amount
                
            except Exception as filter_error:
                print(f"Warning: Filter failed for effect {effect_type}, skipping: {str(filter_error)}")
                continue
            
            # Write the modified audio
            sf.write(outputFile, data, samplerate)
            
            # Update input file for next effect
            if inputFile != outputFile:
                inputFile = outputFile
                
    except Exception as e:
        print(f"Error in apply_effects: {str(e)}")
        raise e

# Redirect to entering youtube link
@app.route("/link", methods=["POST"])
def print_link():

    # getting info
    data = request.get_json()
    link = data["link"]

    # Link validtion
    if not is_valid_yt(link):
        return jsonify({"error": "Not a valid link."}), 400

    effects = data.get("effects")

    if not effects:
        choice = data.get("choice", 1)
        if isinstance(choice, list):
            effects = choice 
        else:
            effects = [{
                "effectType": data.get("choice", 1),
                "start": data.get("start_time", 0),
                "end": data.get("end_time")
            }]

    start = data.get("start_time")
    end = data.get("end_time")

    # naming file
    timestamp = int(time.time())
    input_filename = f"input_{timestamp}.wav"
    input_file_path = os.path.join("input", input_filename)
    output_filename = f"output_{timestamp}.wav"
    output_file_path = os.path.join("output", output_filename)

    # variables needed for validity
    max_dur = 600
    duration = video_duration(link)

    # Validate each timestamp 
    for effect in effects:
        # Get the start and end values from the dictionary.
        s = effect.get("start")
        en = effect.get("end")
        
        # If the values are missing or empty, assign defaults.
        if s in (None, ""):
            effect["start"] = 0
        else:
            try:
                effect["start"] = int(s)
            except ValueError:
                effect["start"] = 0

        if en in (None, ""):
            effect["end"] = int(duration)
        else:
            try:
                effect["end"] = int(en)
            except ValueError:
                effect["end"] = int(duration)

        if effect["start"] < 0 or effect["end"] > duration or effect["end"] < 0 or effect["end"] > duration:
            return jsonify({"error": "Invalid timestamp(s) in one of the effects."}), 400

    if duration > max_dur:
        return jsonify({"error": f"Video exceeds maximum duration of {max_dur} seconds."}), 400

    # send the data to validate.py and reutn the result
    try:
        apply_effects(link, effects, input_file_path, output_file_path)
    except Exception as e:
        print(f"Error during processing: {e}")
        return jsonify({"error": "Processing failed."}), 500

    # validate the file was outputted correctly
    if not os.path.exists(output_file_path):
        print(f"Error: Processed file was not created: {output_file_path}")
        return jsonify({"error": "Processing failed; No file created"}), 500

    # Schedule deletion of files
    delay = 30
    schedule_deletion(output_file_path, input_file_path, delay)

    print("Downloaded file.")
    return jsonify({"result": "Success", "file_url": f"http://localhost:5000/download/{output_filename}"})

# Redirect to downloading file
@app.route("/download/<filename>", methods=["GET"])
def download_file(filename):
    output_file_path = os.path.join("output", filename)
    
    if not os.path.exists(output_file_path):
        return jsonify({"error": "File not found"}), 404

    # call fft plot in the future

    return send_file(output_file_path, as_attachment=True)

# Delete file after client confirms download
@app.route("/delete_file/<filename>", methods=["POST"])
def delete_file(filename):
    output_file_path = os.path.join("output", filename)
    input_file_path = os.path.join("input", filename.replace("output", "input"))

    try:
        os.remove(output_file_path)
        print(f"Deleted file {output_file_path}")
    except FileNotFoundError:
        print(f"File already deleted: {output_file_path}")
    except Exception as e:
        print(f"Error deleting file {output_file_path}: {e}")

    try:
        os.remove(input_file_path)
        print(f"Deleted file {input_file_path}")
    except FileNotFoundError:
        print(f"File already deleted: {input_file_path}")
    except Exception as e:
        print(f"Error deleting file {input_file_path}: {e}")

    return jsonify({"message": "File deleted"}), 200
>>>>>>> Stashed changes

@app.route('/api/get_signal_data', methods=['POST'])
def get_signal_data():
    try:
        data = request.json
        effect_type = data['effectType']
        start_time = float(data['timeRange']['start'])
        end_time = float(data['timeRange']['end'])
        
        # Get the most recent processed file
        output_dir = "output"
        files = [f for f in os.listdir(output_dir) if f.startswith('output_')]
        if not files:
            return jsonify({"error": "No processed audio file found"}), 404
            
        latest_file = max(files, key=lambda x: os.path.getctime(os.path.join(output_dir, x)))
        audio_path = os.path.join(output_dir, latest_file)
        
        # Load the audio file
        audio_data, sr = sf.read(audio_path)
        
        # Convert time to samples
        start_idx = int(start_time * sr)
        end_idx = int(end_time * sr)
        segment = audio_data[start_idx:end_idx]
        
        # Downsample for visualization
        target_length = 100
        downsampled = signal.resample(segment, target_length)
        
        return jsonify({
            'signalData': downsampled.tolist(),
            'effectType': effect_type,
            'timeRange': {'start': start_time, 'end': end_time}
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)

"""
@app.route("/members")
def members():
    return jsonify({"members": ["Member1", "Member2", "Member3"]})

@app.route("/data", methods=["POST"])
def receive_data():
    data = request.get_json()
    print(f"Received data: {data}")

    try:
        result = eval(data["operation"])
        return jsonify({'message': 'Operation successful', 'result': result})
    except Exception as e:
        return jsonify({'message': 'There was an error.', 'error': str(e)})

if __name__ == "__main__":
    app.run(debug=True)
#backend: install: in terminal(source venv/bin/activate (venv)) pip install flask-cors, python server.py
# front end: (locate src folder), run in terminal: npm run dev
#instead of flask use Apache (use a module on top of this)
#Consider NGINX
"""