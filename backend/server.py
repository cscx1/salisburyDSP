from flask import Flask, jsonify, request, send_file, after_this_request
from flask_cors import CORS
from validate import *
from dsp import *
from createImage import *
import os
import time
from threading import Timer

app = Flask(__name__)
CORS(app)

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
    # Process the first effect: download and apply the effect.
    print("Processing first effect:", effects[0]["effectType"])
    inputInfo(link, effects[0]["effectType"], inputFile, outputFile,
              effects[0].get("start", 0), effects[0].get("end"), do_download=True)
    
    # Process any subsequent effects in place using the same file for both input and output.
    for effect in effects[1:]:
        print(f"Processing effect {effect['effectType']} in place on file: {outputFile}")
        inputInfo(link, effect["effectType"], outputFile, outputFile,
                  effect.get("start", 0), effect.get("end"), do_download=False)

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
    input_filename = f"input_{timestamp}.mp3"
    input_file_path = os.path.join("input", input_filename)
    output_filename = f"output_{timestamp}.mp3"
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

if __name__ == "__main__":
    app.run(debug=True)