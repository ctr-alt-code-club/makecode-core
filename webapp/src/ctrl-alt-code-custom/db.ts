/**
 * Database API client for Ctrl-Alt-Code cloud storage
 * Provides functions to interact with the makecode-store backend API
 */

/// <reference types="node" />

/**
 * Configuration for the API endpoint
 * Update this to match your deployed API URL
 * Can be set via environment variable or runtime configuration
 */
let API_BASE_URL = (typeof process !== 'undefined' && process.env && process.env.API_BASE_URL)
    ? process.env.API_BASE_URL
    : 'http://localhost:3001';

/**
 * Interface for project data stored in the database
 */
export interface DbProjectRecord {
    id?: number;
    userId: string;
    projectName: string;
    projectData: string;  // Base64 encoded Uint8Array
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Interface for project list item (without full data)
 */
export interface DbProjectListItem {
    id: number;
    project_name: string;
    created_at: string;
    updated_at: string;
}

/**
 * Save a project to the cloud database
 * @param userId - The user's unique identifier
 * @param projectName - The name of the project
 * @param projectData - Base64 encoded project data
 * @returns Promise with the saved project ID and timestamp
 */
export async function saveProject(
    userId: string,
    projectName: string,
    projectData: string
): Promise<{ success: boolean; id: number; createdAt: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                projectName,
                projectData
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save project');
        }

        const result = await response.json();
        console.log('✅ Project saved to cloud:', result);
        return result;
    } catch (error) {
        console.error('❌ Error saving project to cloud:', error);
        throw error;
    }
}

/**
 * Get all projects for a specific user
 * @param userId - The user's unique identifier
 * @returns Promise with array of project list items (without full data)
 */
export async function getUserProjects(userId: string): Promise<DbProjectListItem[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/user/${encodeURIComponent(userId)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch projects');
        }

        const projects = await response.json();
        console.log(`📋 Fetched ${projects.length} projects for user ${userId}`);
        return projects;
    } catch (error) {
        console.error('❌ Error fetching user projects:', error);
        throw error;
    }
}

/**
 * Get a single project with full data
 * @param projectId - The project's database ID
 * @param userId - The user's unique identifier (for authorization)
 * @returns Promise with the complete project data
 */
export async function getProject(projectId: number, userId: string): Promise<DbProjectRecord> {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/projects/${projectId}?userId=${encodeURIComponent(userId)}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch project');
        }

        const project = await response.json();
        console.log(`📥 Fetched project ${projectId}:`, project.project_name);
        return {
            id: project.id,
            userId: project.user_id,
            projectName: project.project_name,
            projectData: project.project_data,
            createdAt: project.created_at,
            updatedAt: project.updated_at
        };
    } catch (error) {
        console.error(`❌ Error fetching project ${projectId}:`, error);
        throw error;
    }
}

/**
 * Update an existing project
 * @param projectId - The project's database ID
 * @param userId - The user's unique identifier (for authorization)
 * @param projectName - Optional new project name
 * @param projectData - Optional new project data (Base64 encoded)
 * @returns Promise with the updated project info
 */
export async function updateProject(
    projectId: number,
    userId: string,
    projectName?: string,
    projectData?: string
): Promise<{ success: boolean; id: number; updatedAt: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                projectName,
                projectData
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update project');
        }

        const result = await response.json();
        console.log(`✅ Project ${projectId} updated:`, result);
        return result;
    } catch (error) {
        console.error(`❌ Error updating project ${projectId}:`, error);
        throw error;
    }
}

/**
 * Delete a project from the cloud
 * @param projectId - The project's database ID
 * @param userId - The user's unique identifier (for authorization)
 * @returns Promise with success status
 */
export async function deleteProject(projectId: number, userId: string): Promise<{ success: boolean; id: number }> {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/projects/${projectId}?userId=${encodeURIComponent(userId)}`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete project');
        }

        const result = await response.json();
        console.log(`🗑️  Project ${projectId} deleted`);
        return result;
    } catch (error) {
        console.error(`❌ Error deleting project ${projectId}:`, error);
        throw error;
    }
}

/**
 * Check if the API is available
 * @returns Promise with health status
 */
export async function checkApiHealth(): Promise<{ status: string; timestamp: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error('API health check failed');
        }

        const health = await response.json();
        console.log('✅ API is healthy:', health);
        return health;
    } catch (error) {
        console.error('❌ API health check failed:', error);
        throw error;
    }
}

/**
 * Get the current user ID
 * TODO: Implement proper user authentication
 * For now, returns a placeholder or stored user ID
 */
export function getCurrentUserId(): string {
    // TODO: Replace with actual authentication system
    // This could come from:
    // - OAuth token
    // - Session storage
    // - Local storage
    // - Cookie
    
    const storedUserId = localStorage.getItem('ctrlaltcode_user_id');
    if (storedUserId) {
        return storedUserId;
    }
        
    return 'test-user'; // Use this for testing
}

/**
 * Set the API base URL (useful for different environments)
 * @param url - The base URL for the API
 */
export function setApiBaseUrl(url: string): void {
    API_BASE_URL = url;
    console.log('🔧 API base URL set to:', url);
}

/**
 * Get the current API base URL
 * @returns The current API base URL
 */
export function getApiBaseUrl(): string {
    return API_BASE_URL;
}

// Made with Bob