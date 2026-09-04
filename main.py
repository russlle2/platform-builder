import os, base64, json, shutil, requests, git
from flask import Flask, request, jsonify
import vertexai
from vertexai.generative_models import GenerativeModel

app = Flask(__name__)

# Initialize Vertex AI with your project and region
vertexai.init(project=os.environ.get("GCP_PROJECT", "site-ai-optimizer"), location="us-central1")

@app.route('/', methods=['POST'])
def pubsub_push_handler():
    try:
        envelope = request.get_json()
        if not envelope or "message" not in envelope:
            return "Bad Request", 400

        pubsub_message = envelope["message"]
        data = json.loads(base64.b64decode(pubsub_message["data"]).decode("utf-8"))
        
        repo_name = data.get("repo", "platform-builder")
        netlify_site_id = data.get("netlify_site_id")
        
        # Initialize Gemini 1.5 Pro model
        model = GenerativeModel("gemini-1.5-pro")
        
        # 1. Clone Repo
        repo_url = f"https://{os.environ['GITHUB_ACCESS_TOKEN']}@github.com/{repo_name}.git"
        repo_dir = "/tmp/repo"
        if os.path.exists(repo_dir): 
            shutil.rmtree(repo_dir)
        repo = git.Repo.clone_from(repo_url, repo_dir)

        # 2. Analyze & Optimize with Gemini
        for root, _, files in os.walk(repo_dir):
            for file in files:
                if file.endswith(('.js', '.html', '.css', '.py', '.ts', '.tsx')):
                    path = os.path.join(root, file)
                    with open(path, 'r') as f: 
                        code = f.read()
                    
                    # Call Vertex AI Gemini
                    response = model.generate_content(
                        f"Optimize this code for SEO, performance, and accessibility. Return ONLY the optimized code:\n\n{code}"
                    )
                    
                    with open(path, 'w') as f: 
                        f.write(response.text)

        # 3. Push Changes
        repo.git.add(A=True)
        repo.index.commit("AI Optimization Patch")
        repo.git.push('origin', 'main')

        # 4. Update Netlify Env
        requests.post(
            f"https://api.netlify.com/api/v1/sites/{netlify_site_id}/env",
            headers={"Authorization": f"Bearer {os.environ['NETLIFY_ACCESS_TOKEN']}"},
            json={"OPTIMIZED_BY": "VertexAI"}
        )
        
        return "Optimization complete", 200
    except Exception as e:
        print(f"Error: {e}")
        return f"Error: {e}", 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
