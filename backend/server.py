from flask import Flask, jsonify, request, send_file, after_this_request
from flask_cors import CORS
from validate import *
from dsp import *
from createImage import *
import os
import time

app = Flask(__name__)
CORS(app)

# Redirect to entering youtube link
@app.route("/link", methods=["POST"])
def print_link():
    data = request.get_json()
    link = data["link"]
    choice = data.get("choice", 1)
    start = data.get("start_time")
    end = data.get("end_time")

    timestamp = int(time.time())
    
    input_filename = f"input_{timestamp}.mp3"
    input_file_path = os.path.join("input", input_filename)

    output_filename = f"output_{timestamp}.mp3"
    output_file_path = os.path.join("output", output_filename)

    # max duration in seconds
    max_dur = 600

    # validate the entered content
    if not is_valid_yt(link):
        return jsonify({"result": "Not a valid link."}), 400

    if not is_valid_duration(link, max_dur):
        return jsonify({"result": f"Video exceeds maximum duration of {max_dur} seconds."}), 400

    # send the data to validate.py and reutn the result
    input(link, choice, output_file_path, input_file_path, start, end)

    # validate
    if not os.path.exists(output_file_path):
        print(f"Error: Processed file was not created: {file_path}")
        return jsonify({"error": "Processing failed; No file created"}), 500

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