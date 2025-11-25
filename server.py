import os
import subprocess
import asyncio
import json
import logging
from typing import List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import sys

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the output directory to serve generated files
app.mount("/output", StaticFiles(directory="output"), name="output")

# --- WebSocket Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error sending message: {e}")

manager = ConnectionManager()

# --- Models ---
class IngestRequest(BaseModel):
    type: str  # "repo" or "path"
    source: str
    name: str = None
    language: str = "english"

# --- Helper Functions ---
async def run_ingestion_process(request: IngestRequest):
    """Runs the main.py script as a subprocess and streams output to WebSockets."""
    
    cmd = [sys.executable, "main.py"]
    
    if request.type == "repo":
        cmd.extend(["--repo", request.source])
    elif request.type == "path":
        cmd.extend(["--dir", request.source])
    else:
        await manager.broadcast(json.dumps({"type": "error", "message": "Invalid source type"}))
        return

    if request.name:
        cmd.extend(["--name", request.name])
    
    if request.language:
        cmd.extend(["--language", request.language])

    # Add no-cache to ensure fresh generation if requested (optional, keeping default for now)
    
    await manager.broadcast(json.dumps({"type": "status", "status": "processing", "message": f"Starting ingestion for {request.source}..."}))

    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        async def read_stream(stream, channel):
            while True:
                line = await stream.readline()
                if not line:
                    break
                decoded_line = line.decode().strip()
                if decoded_line:
                    print(f"[{channel}] {decoded_line}")
                    await manager.broadcast(json.dumps({"type": "log", "channel": channel, "message": decoded_line}))

        await asyncio.gather(
            read_stream(process.stdout, "stdout"),
            read_stream(process.stderr, "stderr")
        )

        return_code = await process.wait()

        if return_code == 0:
            # Run generate_manifest.py to update the projects list
            await manager.broadcast(json.dumps({"type": "status", "status": "processing", "message": "Updating project manifest..."}))
            manifest_process = await asyncio.create_subprocess_exec(
                sys.executable, "generate_manifest.py",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            await manifest_process.wait()
            
            await manager.broadcast(json.dumps({"type": "status", "status": "complete", "message": "Ingestion completed successfully!"}))
        else:
            await manager.broadcast(json.dumps({"type": "status", "status": "error", "message": f"Ingestion failed with return code {return_code}"}))

    except Exception as e:
        logger.error(f"Ingestion error: {e}")
        await manager.broadcast(json.dumps({"type": "status", "status": "error", "message": str(e)}))

# --- Endpoints ---

@app.get("/api/projects")
async def get_projects():
    """Returns the list of projects from projects.json."""
    try:
        # Assuming generate_manifest.py outputs to viewer/public/projects.json
        # But we might need to read from the output directory directly or the manifest
        manifest_path = os.path.join("viewer", "public", "projects.json")
        if os.path.exists(manifest_path):
            with open(manifest_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ingest")
async def ingest_project(request: IngestRequest, background_tasks: BackgroundTasks):
    """Starts the ingestion process in the background."""
    background_tasks.add_task(run_ingestion_process, request)
    return {"message": "Ingestion started", "source": request.source}

@app.websocket("/ws/logs/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
