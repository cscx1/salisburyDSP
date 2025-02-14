from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from validate import *
from dsp import *
import os

app = Flask(__name__)
CORS(app)

# Redirect to entering youtube link
@app.route("/link", methods=["POST"])
def print_link():
    data = request.get_json()
    link = data["link"]
    choice = data.get("choice", 1)
    filename = "output"
    result = ""

    # max duration in seconds
    max_dur = 600

    # validate the entered content
    if not is_valid_yt(link):
        return jsonify({"result": "Not a valid link."}), 400

    if not is_valid_duration(link, max_dur):
        return jsonify({"result": f"Video exceeds maximum duration of {max_dur} seconds."}), 400

    # send the data to validate.py and reutn the result
    input(link, choice)
    print("Downloaded file.")
    return jsonify({"result": "Success", "file_url": f"http://localhost:5000/download"})

# Redirect to downloading file
@app.route("/download", methods=["GET"])
def download_file():
    file_path = os.path.join("output", "output.mp3")

    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    else:
        return jsonify({"error": "File not found"}), 404

if __name__ == "__main__":
    app.run(debug=True)