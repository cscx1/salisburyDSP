from flask import Flask, jsonify, request, send_file, after_this_request
from flask_cors import CORS
from validate import *
from dsp import DSP
import os
import time
from threading import Timer
import shutil

app = Flask(__name__)
CORS(app)

dsp = DSP()

def wait_for_file(filepath, timeout=15):
    start_time = time.time()
    while not os.path.exists(filepath):
        if (time.time() - start_time) > timeout:
            raise TimeoutError(f"File {filepath} did not appear within {timeout} seconds")
        time.sleep(0.1)
        
def schedule_deletion(outputFile, inputFile, originalFile, delay):
    def delete_files():
        for file in [outputFile, inputFile, originalFile]:
            try:
                if os.path.exists(file):
                    os.remove(file)
                    print(f"Deleted {file} after {delay} seconds.")
            except Exception as e:
                print(f"Error deleting {file}: {e}")
    Timer(delay, delete_files).start()

def apply_effects(link, effects, inputFile, outputFile):
    print("Downloading file...")
    dsp.inputInfo(
        link,
        effects[0]["effectType"],
        inputFile,
        outputFile,
        effects[0].get("start", 0),
        effects[0].get("end"),
        do_download=True,
        **effects[0].get("settings", {})
    )
    original_filename = os.path.basename(outputFile).replace('output_', 'original_')
    original_file_path = os.path.join('output', original_filename)
    shutil.copy2(inputFile, original_file_path)
    print("Processing first effect:", effects[0]["effectType"])
    dsp.inputInfo(
        link,
        effects[0]["effectType"],
        inputFile,
        outputFile,
        effects[0].get("start", 0),
        effects[0].get("end"),
        do_download=False,
        **effects[0].get("settings", {})
    )
    for effect in effects[1:]:
        print(f"Processing effect {effect['effectType']} in place on file: {outputFile}")
        dsp.inputInfo(
            link,
            effect["effectType"],
            outputFile,
            outputFile,
            effect.get("start", 0),
            effect.get("end"),
            do_download=False,
            **effect.get("settings", {})
        )
    return inputFile, original_file_path

@app.route("/link", methods=["POST"])
def print_link():
    data = request.get_json()
    link = data["link"]
    if not is_valid_yt(link):
        return jsonify({"error": "Not a valid link."}), 400
    effects = data.get("effects")
    if not effects:
        choice = data.get("choice", 1)
        effects = choice if isinstance(choice, list) else [{
            "effectType": choice,
            "start": data.get("start_time", 0),
            "end": data.get("end_time")
        }]
    timestamp = int(time.time())
    input_filename = f"input_{timestamp}.mp3"
    input_file_path = os.path.join("input", input_filename)
    output_filename = f"output_{timestamp}.mp3"
    output_file_path = os.path.join("output", output_filename)
    original_filename = f"original_{timestamp}.mp3"
    original_file_path = os.path.join("output", original_filename)
    max_dur = 600
    duration = video_duration(link)
    for effect in effects:
        s = effect.get("start")
        en = effect.get("end")
        effect["start"] = 0 if s in (None, "") else int(s)
        effect["end"] = int(duration) if en in (None, "") else int(en)
        if effect["start"] < 0 or effect["end"] > duration or effect["end"] < 0:
            return jsonify({"error": "Invalid timestamp(s) in one of the effects."}), 400
    if duration > max_dur:
        return jsonify({"error": f"Video exceeds maximum duration of {max_dur} seconds."}), 400
    try:
        input_file, original_file_path = apply_effects(link, effects, input_file_path, output_file_path)
        visualizations = []
        for effect in effects:
            settings = effect.get("settings", {})
            viz_data = analyze_audio(
                input_file,
                output_file_path,
                effect["effectType"],
                effect["start"],
                effect["end"],
                **settings
            )
            visualizations.append(viz_data)
        return jsonify({
            "result": "Success", 
            "file_url": f"http://localhost:5000/download/{output_filename}",
            "original_file_url": f"http://localhost:5000/download/{original_filename}",
            "visualizations": visualizations
        })
    except Exception as e:
        print(f"Error generating plots: {e}")
        return jsonify({
            "result": "Success", 
            "file_url": f"http://localhost:5000/download/{output_filename}",
            "original_file_url": f"http://localhost:5000/download/{original_filename}"
        })

@app.route("/download/<filename>", methods=["GET"])
def download_file(filename):
    output_file_path = os.path.join("output", filename)
    if not os.path.exists(output_file_path):
        return jsonify({"error": "File not found"}), 404
    response = send_file(output_file_path, as_attachment=True)
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
    return response

@app.route("/delete_file/<filename>", methods=["POST"])
def delete_file(filename):
    output_file_path = os.path.join("output", filename)
    if filename.startswith("output_"):
        input_file_path = os.path.join("input", filename.replace("output_", "input_"))
        original_file_path = os.path.join("output", filename.replace("output_", "original_"))
        files_to_delete = [output_file_path, input_file_path, original_file_path]
    elif filename.startswith("original_"):
        files_to_delete = [output_file_path]
    else:
        files_to_delete = [output_file_path]
    for file_path in files_to_delete:
        try:
            os.remove(file_path)
            print(f"Deleted file {file_path}")
        except FileNotFoundError:
            print(f"File already deleted: {file_path}")
        except Exception as e:
            print(f"Error deleting file {file_path}: {e}")
    return jsonify({"message": "File deleted"}), 200

@app.route("/plot/<filename>", methods=["GET"])
def serve_plot(filename):
    plot_path = os.path.join("DSPoutput", filename)
    if not os.path.exists(plot_path):
        plot_path = os.path.join("DSPinput", filename)
        if not os.path.exists(plot_path):
            return jsonify({"error": "Plot not found"}), 404
    return send_file(plot_path, mimetype='image/png')

if __name__ == "__main__":
    app.run(debug=True)