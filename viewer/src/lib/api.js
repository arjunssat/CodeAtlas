const API_BASE_URL = '/api';

export async function getProjects() {
    try {
        // Try fetching from the new backend first
        const response = await fetch(`${API_BASE_URL}/projects`);
        if (response.ok) {
            return await response.json();
        }
        throw new Error('Backend not available');
    } catch (e) {
        // Fallback to static file for dev/demo without backend
        const response = await fetch('/projects.json');
        if (!response.ok) throw new Error('Failed to load projects');
        return await response.json();
    }
}

export async function getMarkdown(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Failed to load markdown content');
    return await response.text();
}

export async function ingestProject(data) {
    const response = await fetch(`${API_BASE_URL}/ingest`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to start ingestion');
    return await response.json();
}
