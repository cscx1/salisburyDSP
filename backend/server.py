from flask import Flask, jsonify, request
from flask_cors import CORS
from validate import *
from dsp import *

app = Flask(__name__)
CORS(app)

@app.route("/link", methods=["POST"])
def print_link():
    data = request.get_json()
    link = data["link"]
    choice = data.get("choice", 1)
    result = ""

    # max duration in seconds
    max_dur = 600

    if not is_valid_yt(link):
        return jsonify({"result": "Not a valid link."}), 400

    if not is_valid_duration(link, max_dur):
        return jsonify({"result": f"Video exceeds maximum duration of {max_dur} seconds."}), 400

    input(link, choice)
    print("Downloaded file.")
    return jsonify({"result": "Success: Valid link"})

if __name__ == "__main__":
    app.run(debug=True)