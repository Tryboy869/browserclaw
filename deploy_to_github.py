#!/usr/bin/env python3
"""
BrowserWasp — GitHub Deployment Script (Google Colab)
======================================================
This script:
1. Installs required dependencies
2. Shows a file upload button for the project ZIP
3. Extracts the ZIP
4. Creates a GitHub repo via the API
5. Pushes all files to the repo

HOW TO USE:
-----------
1. Open this file in Google Colab
2. Replace YOUR_GITHUB_TOKEN and YOUR_GITHUB_USERNAME below
3. Run the cell (Shift+Enter)
4. Click "Select ZIP File" when prompted
5. Wait for the push to complete
"""

# ─── CONFIGURATION — FILL IN BEFORE RUNNING ─────────────────────────────────

GITHUB_TOKEN    = "YOUR_GITHUB_TOKEN_HERE"       # ← paste your token here
GITHUB_USERNAME = "YOUR_GITHUB_USERNAME_HERE"    # ← paste your username here
REPO_NAME       = "browserclaw"                  # ← change repo name if needed
REPO_DESCRIPTION = "🐝 BrowserWasp — AI Agent Ecosystem Running Entirely in Your Browser"
REPO_PRIVATE    = False                           # ← True for private repo
BRANCH          = "main"

# ─────────────────────────────────────────────────────────────────────────────

import subprocess
import sys
import os

def install_deps():
    """Install required Python packages."""
    packages = ["requests", "ipywidgets"]
    for pkg in packages:
        subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q"])

install_deps()

import zipfile
import base64
import json
import time
import tempfile
import shutil
import requests
from pathlib import Path

# Check if running in Colab
try:
    from google.colab import files as colab_files
    import ipywidgets as widgets
    from IPython.display import display, HTML, clear_output
    IN_COLAB = True
except ImportError:
    IN_COLAB = False
    print("⚠️  Not running in Colab — some features limited.")

# ─── Helpers ─────────────────────────────────────────────────────────────────

def validate_config():
    """Validate that the user filled in their credentials."""
    errors = []
    if GITHUB_TOKEN == "YOUR_GITHUB_TOKEN_HERE":
        errors.append("❌ GITHUB_TOKEN not set — replace it at the top of the script")
    if GITHUB_USERNAME == "YOUR_GITHUB_USERNAME_HERE":
        errors.append("❌ GITHUB_USERNAME not set — replace it at the top of the script")
    if errors:
        for e in errors:
            print(e)
        print("\n🛑 Fix the above and re-run.")
        return False
    return True

def github_headers():
    return {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
    }

def api_get(url):
    return requests.get(url, headers=github_headers())

def api_post(url, data):
    return requests.post(url, headers=github_headers(), json=data)

def api_put(url, data):
    return requests.put(url, headers=github_headers(), json=data)

def create_github_repo():
    """Create the GitHub repository if it doesn't exist."""
    print(f"\n📦 Creating GitHub repository '{REPO_NAME}'...")

    # Check if repo already exists
    check = api_get(f"https://api.github.com/repos/{GITHUB_USERNAME}/{REPO_NAME}")
    if check.status_code == 200:
        print(f"   ✅ Repo already exists — will push to it")
        return True

    # Create repo
    resp = api_post("https://api.github.com/user/repos", {
        "name": REPO_NAME,
        "description": REPO_DESCRIPTION,
        "private": REPO_PRIVATE,
        "auto_init": False,
        "has_issues": True,
        "has_projects": False,
        "has_wiki": False,
    })

    if resp.status_code == 201:
        data = resp.json()
        print(f"   ✅ Repo created: {data['html_url']}")
        time.sleep(2)  # Wait for GitHub to initialize
        return True
    else:
        print(f"   ❌ Failed to create repo: {resp.status_code} — {resp.text}")
        return False

def get_file_sha(path):
    """Get the SHA of an existing file in the repo (needed for updates)."""
    url = f"https://api.github.com/repos/{GITHUB_USERNAME}/{REPO_NAME}/contents/{path}"
    resp = api_get(url)
    if resp.status_code == 200:
        return resp.json().get("sha")
    return None

def push_file(file_path, repo_path, commit_message):
    """Push a single file to GitHub via Contents API."""
    url = f"https://api.github.com/repos/{GITHUB_USERNAME}/{REPO_NAME}/contents/{repo_path}"

    # Read and encode
    with open(file_path, "rb") as f:
        content = base64.b64encode(f.read()).decode("utf-8")

    data = {
        "message": commit_message,
        "content": content,
        "branch": BRANCH,
    }

    # Check if file exists (for update vs create)
    existing_sha = get_file_sha(repo_path)
    if existing_sha:
        data["sha"] = existing_sha

    resp = api_put(url, data)

    if resp.status_code in (200, 201):
        return True
    else:
        print(f"   ⚠️  Failed to push {repo_path}: {resp.status_code}")
        return False

def get_all_files(directory):
    """Recursively list all files in a directory."""
    files = []
    base = Path(directory)
    for path in base.rglob("*"):
        if path.is_file():
            # Skip node_modules and .git
            parts = path.parts
            if "node_modules" in parts or ".git" in parts:
                continue
            files.append(path)
    return files

def push_project(project_dir):
    """Push all project files to GitHub."""
    all_files = get_all_files(project_dir)
    total = len(all_files)
    print(f"\n🚀 Pushing {total} files to GitHub...")
    print(f"   Target: https://github.com/{GITHUB_USERNAME}/{REPO_NAME}\n")

    success = 0
    failed  = []

    # First commit — README and key files
    priority = ["README.md", "package.json", "index.html", "vite.config.ts"]

    def sort_key(p):
        rel = str(p.relative_to(project_dir))
        for i, name in enumerate(priority):
            if rel == name or rel.endswith(f"/{name}"):
                return i
        return len(priority)

    all_files.sort(key=sort_key)

    for i, path in enumerate(all_files):
        rel_path = str(path.relative_to(project_dir)).replace("\\", "/")
        commit_msg = f"feat: add {rel_path}" if i > 0 else "🐝 Initial BrowserWasp commit"

        print(f"   [{i+1:3d}/{total}] {rel_path}", end=" ")

        ok = push_file(str(path), rel_path, commit_msg)
        if ok:
            success += 1
            print("✅")
        else:
            failed.append(rel_path)
            print("❌")

        # Rate limit — GitHub API allows ~5000 requests/hour
        # Small delay every 10 files to be safe
        if (i + 1) % 10 == 0:
            time.sleep(0.5)

    print(f"\n{'='*50}")
    print(f"✅ Pushed: {success}/{total} files")
    if failed:
        print(f"❌ Failed: {len(failed)} files")
        for f in failed:
            print(f"   - {f}")
    print(f"\n🌐 Repository: https://github.com/{GITHUB_USERNAME}/{REPO_NAME}")
    print(f"🚀 To deploy: enable GitHub Pages in repo Settings → Pages → Deploy from branch 'main' → /dist")

# ─── Main Upload Flow ─────────────────────────────────────────────────────────

def run():
    if not validate_config():
        return

    print("=" * 55)
    print("🐝  BrowserWasp — GitHub Deployment Script")
    print("=" * 55)

    if not IN_COLAB:
        # Local fallback — prompt for zip path
        zip_path = input("\nEnter path to ZIP file: ").strip()
        if not zip_path or not os.path.exists(zip_path):
            print("❌ File not found.")
            return
        process_zip(zip_path)
        return

    # Colab — show upload button
    print("\n📂 Click the button below to upload your BrowserWasp ZIP file:\n")

    upload_btn = widgets.Button(
        description="📁 Select ZIP File",
        button_style="warning",
        layout=widgets.Layout(width="200px", height="40px"),
        style={"button_color": "#F59E0B", "font_weight": "bold"},
    )

    status_out = widgets.Output()

    def on_upload_click(b):
        upload_btn.disabled = True
        upload_btn.description = "⏳ Waiting..."
        with status_out:
            clear_output()
            print("⏳ Opening file picker...")

        uploaded = colab_files.upload()
        if not uploaded:
            with status_out:
                print("❌ No file selected.")
            upload_btn.disabled = False
            upload_btn.description = "📁 Select ZIP File"
            return

        zip_name = list(uploaded.keys())[0]
        with status_out:
            clear_output()
            print(f"✅ Uploaded: {zip_name} ({len(uploaded[zip_name]):,} bytes)")
            process_zip(zip_name)

    upload_btn.on_click(on_upload_click)
    display(upload_btn, status_out)


def process_zip(zip_path):
    """Extract ZIP and push to GitHub."""
    extract_dir = tempfile.mkdtemp(prefix="browserclaw_")

    try:
        print(f"\n📦 Extracting ZIP...")
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(extract_dir)

        # Find the actual project root (handle nested folders)
        entries = list(Path(extract_dir).iterdir())
        if len(entries) == 1 and entries[0].is_dir():
            project_dir = str(entries[0])
        else:
            project_dir = extract_dir

        print(f"   ✅ Extracted to: {project_dir}")

        # Count files
        all_files = get_all_files(project_dir)
        print(f"   📁 Found {len(all_files)} files")

        # Create repo and push
        if not create_github_repo():
            return

        push_project(project_dir)

    except zipfile.BadZipFile:
        print("❌ Invalid ZIP file — please check your file and try again.")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        shutil.rmtree(extract_dir, ignore_errors=True)


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__" or IN_COLAB:
    run()
