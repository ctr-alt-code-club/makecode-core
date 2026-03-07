import * as db from "./db";

/**
 * Delete cloud projects for the current user that match a local project name.
 * This is resilient by design: failures are logged but not rethrown.
 */
export async function deleteCloudProjectsByName(projectName: string): Promise<void> {
    console.log("🎮 Cloud Deleteion Initiated - " + projectName);
    try {
        const userId = db.getCurrentUserId();
        const projects = await db.getUserProjects(userId);
        const matchingProjects = projects.filter(project => project.project_name === projectName);

        for (const project of matchingProjects) {
            await db.deleteProject(project.id, userId);
        }
    } catch (error) {
        console.error(`❌ Error deleting cloud project '${projectName}':`, error);
    }
}
