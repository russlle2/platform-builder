import os
import shutil
import requests
from flask import Flask, request, jsonify
from git import Repo
from google.cloud import secretmanager
import vertexai
from vertexai.generative_models import GenerativeModel

app = Flask(__name__)

def get_secret(secret_name):
    client = secretmanager.SecretManagerServiceClient()
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "site-ai-optimizer")
    name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
    return client.access_secret_version(request={"name": name}).payload.data.decode("UTF-8")

@app.route("/optimize", methods=["POST"])
def optimize():
    try:
        data = request.get_json() or {}
        repo_url = data.get("repo_url")
        netlify_site_id = data.get("netlify_site_id")
        
        # 1. Retrieve Secrets
        gh_token = get_secret("GITHUB_ACCESS_TOKEN")
        netlify_token = get_secret("NETLIFY_ACCESS_TOKEN")

        # 2. Clone Repository
        local_dir = "/tmp/repo"
        if os.path.exists(local_dir):
            shutil.rmtree(local_dir)
        
        auth_url = repo_url.replace("https://", f"https://x-access-token:{gh_token}@")
        repo = Repo.clone_from(auth_url, local_dir)

        # 3. Analyze & Optimize with Gemini
        vertexai.init(project=os.environ.get("GOOGLE_CLOUD_PROJECT"), location="us-central1")
        model = GenerativeModel("gemini-1.5-flash")
        
        target_file = os.path.join(local_dir, "index.html")
        if os.path.exists(target_file):
            with open(target_file, "r") as f:
                code = f.read()
            
            prompt = f"Optimize this HTML for SEO, accessibility, and performance. Return ONLY the optimized code:\n\n{code}"
            response = model.generate_content(prompt)
            
            with open(target_file, "w") as f:
                f.write(response.text.strip())

        # 4. Commit and Push Changes
        repo.git.add(all=True)
        if repo.is_dirty():
            repo.index.commit("AI optimization patch applied")
            repo.remote(name="origin").push()

        # 5. Trigger Netlify Deploy
        headers = {"Authorization": f"Bearer {netlify_token}"}
        requests.post(f"https://api.netlify.com/api/v1/sites/{netlify_site_id}/builds", headers=headers)

        return jsonify({"status": "success", "message": "Optimization complete and deploy triggered."}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))

