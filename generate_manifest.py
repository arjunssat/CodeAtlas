import os
import json
from pathlib import Path

def generate_manifest():
    print("Starting manifest generation...")
    output_dir = Path("output")
    viewer_public_dir = Path("viewer/public")
    
    # Ensure viewer/public exists (it might not if we haven't created the app yet, 
    # but we can create the dir structure for the manifest)
    viewer_public_dir.mkdir(parents=True, exist_ok=True)
    
    projects = []
    
    if not output_dir.exists():
        print(f"Warning: {output_dir} does not exist.")
        return

    for item in output_dir.iterdir():
        if item.is_dir():
            project_name = item.name
            files = []
            
            # Sort files to ensure consistent order (e.g. 01_, 02_)
            for file_path in sorted(item.glob("*.md")):
                # We need the path relative to the viewer's public directory 
                # or an absolute URL if we serve it differently. 
                # For simplicity in dev, we'll assume we copy output to public/output 
                # OR we configure Vite to serve ../output.
                # Let's go with serving ../output via Vite config or symlink for now.
                # Actually, simplest for now: The React app will fetch from /output/...
                # We will need to configure Vite to proxy or alias /output to the actual output dir.
                
                files.append({
                    "name": file_path.name,
                    "path": f"/output/{project_name}/{file_path.name}"
                })
            
            if files:
                projects.append({
                    "id": project_name,
                    "name": project_name.replace("_", " ").title(),
                    "files": files
                })
    
    manifest_path = viewer_public_dir / "projects.json"
    with open(manifest_path, "w") as f:
        json.dump(projects, f, indent=2)
    
    print(f"Generated manifest at {manifest_path} with {len(projects)} projects.")
    print("Manifest generation complete.")

    # No longer copying output files to viewer/public/output
    # They are served directly by the backend at /output
    # public_output_dir = viewer_public_dir / "output"
    # if public_output_dir.exists():
    #     shutil.rmtree(public_output_dir)
    # shutil.copytree(output_dir, public_output_dir)
    # print(f"Copied output files to {public_output_dir}")

if __name__ == "__main__":
    generate_manifest()
