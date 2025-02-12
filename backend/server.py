from flask import Flask, jsonify, request
from flask_cors import CORS
from validate import *

app = Flask(__name__)
CORS(app)

@app.route("/link", methods=["POST"])
def print_link():
    data = request.get_json()
    link = data["link"]

    if is_valid_yt(link):
        return jsonify({"result": link})
    else:
        result = "Error: Not a valid link."
        return jsonify({"result": result}), 400

if __name__ == "__main__":
    app.run(debug=True)
#backend: install: in terminal(source venv/bin/activate (venv)) pip install flask-cors, python server.py
# front end: (locate src folder), run in terminal: npm run dev
