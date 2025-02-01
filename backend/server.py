from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app) #allow requests from frontend

@app.route("/members")
def members():
    return jsonify({"members": ["Member1", "Member2", "Member3"]})

if __name__ == "__main__":
    app.run(debug=True)
#backend: install: in terminal(source venv/bin/activate (venv)) pip install flask-cors, python server.py
# front end: (locate src folder), run in terminal: npm run dev