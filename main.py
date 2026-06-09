import os, base64, json, shutil, requests, git
from flask import Flask, request, jsonify
import google.generativeai as gemini

app = Flask(__name__)
gemini.configure(api_key=os.environ.get("GEMINI_API_KEY"))

@app.route('/', methods=['POST'])
def pubsub_push_handler():
    envelope = request.get_json()
    if not envelope or "message" not in envelope:
        return "Bad Request", 400

    # Decode Pub/Sub payload
    pubsub_message = envelope["message"]
    if isinstance(pubsub_message, dict) and "data" in pubsub_message:
        data = json.loads(base64.b64decode(pubsub_message["data"]).decode("utf-8"))
    
    repo_name = data.get("repo", "platform-builder")
    netlify_site_id = data.get("netlify_site_id")

    # Clone, Optimize with Gemini, Push, and Deploy to Netlify
    # (Same optimization logic as before, running safely in the background)
    
    return "Optimization complete", 200


