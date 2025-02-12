from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np

app = Flask(__name__)
CORS(app) #allow requests from frontend

@app.route("/get-signal")
def get_signal():
    # Generate a test discrete-time signal (replace with actual MP3 processing)
    signal = np.sin(np.linspace(0, 10, 50)).tolist()
    return jsonify({"signal": signal})

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