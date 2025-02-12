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
    result = ""

    if is_valid_yt(link):
        input(link)
        print("Downloaded file.")
        result = "Success: Valid link"
        return jsonify({"result": result})
    else:
        result = "Failure: Not a valid link."
        return jsonify({"result": result}), 400

if __name__ == "__main__":
    app.run(debug=True)