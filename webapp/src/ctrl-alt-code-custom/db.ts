/**
 * Cloud save, through makecode-store at /cloud/projects on this same site.
 * The store knows who is asking from the login, so no user ID is sent.
 */

export interface DbProjectRecord {
    id: number;
    projectName: string;
    projectData: string;  // Base64 encoded Uint8Array
    createdAt: string;
}

export interface DbProjectListItem {
    id: number;
    project_name: string;
    created_at: string;
    updated_at: string;
}

const PROJECTS_URL = "/cloud/projects";

async function callStoreAsync<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(PROJECTS_URL + path, {
        ...init,
        headers: { "Content-Type": "application/json" },
    });
    if (response.status === 401) {
        throw new Error("Your login has run out. Reload the page and log in again.");
    }
    const body = await response.json().catch((): null => null);
    if (!response.ok) {
        throw new Error(body?.error || `The cloud save didn't work (error ${response.status}).`);
    }
    return body as T;
}

/** Saves the project with this name: updates it, or adds it. */
export function saveProject(projectName: string, projectData: string): Promise<{ success: boolean; id: number; createdAt: string }> {
    return callStoreAsync("", { method: "POST", body: JSON.stringify({ projectName, projectData }) });
}

/** The child's projects, newest first, without their data. */
export function getUserProjects(): Promise<DbProjectListItem[]> {
    return callStoreAsync("");
}

export async function getProject(projectId: number): Promise<DbProjectRecord> {
    const project = await callStoreAsync<{ id: number; project_name: string; project_data: string; created_at: string }>(`/${projectId}`);
    return {
        id: project.id,
        projectName: project.project_name,
        projectData: project.project_data,
        createdAt: project.created_at,
    };
}

export function deleteProject(projectId: number): Promise<{ success: boolean; id: number }> {
    return callStoreAsync(`/${projectId}`, { method: "DELETE" });
}
