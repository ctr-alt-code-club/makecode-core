
import * as workspace from "../workspace";
import * as core from "../core";
import * as db from "./db";
import { base64ToUint8Array } from "./cloudSaveButton";

/**
 * Interface for cloud project data
 */
interface CloudProjectData {
    projectName: string;
    projectData: string;  // Base64 encoded Uint8Array
    createdAt?: string;
}

/**
 * Sync projects from cloud to local workspace
 * Downloads the current user's files and adds them to the dashboard
 * Local files trump cloud files
 */
export async function syncFromCloud(): Promise<void> {
    console.log("🔄 Starting cloud sync...");
    
    try {
        // Get current user ID
        const userId = db.getCurrentUserId();
        
        // Fetch all user's projects from cloud
        const cloudProjects = await db.getUserProjects(userId);
        
        if (cloudProjects.length === 0) {
            console.log("📭 No cloud projects found");
            core.infoNotification(lf("No cloud projects to sync"));
            return;
        }
        
        console.log(`📦 Found ${cloudProjects.length} cloud projects`);
        
        // Import each project
        let importedCount = 0;
        let skippedCount = 0;
        
        for (const projectInfo of cloudProjects) {
            try {
                // Fetch full project data
                const fullProject = await db.getProject(projectInfo.id, userId);
                
                const cloudData: CloudProjectData = {
                    projectName: fullProject.projectName,
                    projectData: fullProject.projectData,
                    createdAt: fullProject.createdAt
                };
                
                const wasImported = await importCloudProject(cloudData);
                if (wasImported) {
                    importedCount++;
                } else {
                    skippedCount++;
                }
            } catch (error) {
                console.error(`❌ Failed to import project ${projectInfo.project_name}:`, error);
                // Continue with other projects
            }
        }
        
        console.log(`✅ Cloud sync complete! Imported: ${importedCount}, Skipped: ${skippedCount}`);
        
        if (importedCount > 0) {
            core.infoNotification(lf("Synced {0} project(s) from cloud", importedCount));
        } else if (skippedCount > 0) {
            core.infoNotification(lf("All {0} cloud project(s) already exist locally", skippedCount));
        }
        
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("❌ Cloud sync failed:", error);
        core.errorNotification(lf("Cloud sync failed: {0}", errorMsg));
    }
}

/**
 * Import a single project from cloud data
 */
export async function importCloudProject(cloudData: CloudProjectData): Promise<boolean> {
    console.log(`📥 Importing project: ${cloudData.projectName}`);
    
    try {
        // Step 1: Convert Base64 back to Uint8Array
        const uint8Array = base64ToUint8Array(cloudData.projectData);
        
        // Step 2: Decompress the LZMA compressed data
        const decompressedJson = await pxt.lzmaDecompressAsync(uint8Array);
        
        // Step 3: Parse the project JSON
        const projectData: any = JSON.parse(decompressedJson);
        
        // Handle different project formats
        let text: pxt.workspace.ScriptText;
        let header: any;
        
        if (projectData.source && typeof projectData.source === 'string') {
            // Format 1: Has 'source' property (JSON string of files)
            text = JSON.parse(projectData.source);
            header = projectData.meta;
        } else if (projectData.text && typeof projectData.text === 'object') {
            // Format 2: Has 'text' property (object of files)
            text = projectData.text;
            header = projectData.header;
        } else {
            console.error("❌ Unknown project format!");
            console.error("   Project keys:", Object.keys(projectData));
            console.error("   Project structure:", projectData);
            throw new Error("Invalid project structure: expected 'source' or 'text' property");
        }
        
        // Validate we have the required files
        if (!text[pxt.CONFIG_NAME]) {
            throw new Error(`Invalid project structure: missing '${pxt.CONFIG_NAME}' file`);
        }
                
        // Step 4: Check if project already exists locally
        const existingHeaders = workspace.getHeaders(false);
        const existingProject = existingHeaders.find((h: pxt.workspace.Header) => h.name === cloudData.projectName);
        
        if (existingProject) {
            console.log(`⚠️  Project "${cloudData.projectName}" already exists locally`);
            console.log("   Local files trump cloud files - skipping import");
            // TODO: Add an icon to indicate this file is also in the cloud
            return false;
        }
        
        // Step 5: Prepare header for installation
              
        // Parse the config to get proper metadata
        const config = JSON.parse(text[pxt.CONFIG_NAME]) as pxt.PackageConfig;
        
        const installHeader: pxt.workspace.InstallHeader = {
            target: pxt.appTarget.id,
            targetVersion: header?.targetVersions?.target || header?.targetVersion,
            editor: config.preferredEditor || header?.editor || pxt.BLOCKS_PROJECT_NAME,
            name: cloudData.projectName,
            meta: header?.meta || {},
            pubId: header?.pubId || "",
            pubCurrent: false
        };
        
        // Install the project
        const installedHeader = await workspace.installAsync(installHeader, text);
        
        console.log(`✅ Successfully imported project: ${cloudData.projectName}`);
        
        // Refresh the workspace UI
        if (typeof (window as any).refreshWorkspace === 'function') {
            (window as any).refreshWorkspace();
        }
        
        return true;
        
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to import project "${cloudData.projectName}":`, error);
        core.errorNotification(lf("Failed to import '{0}': {1}", cloudData.projectName, errorMsg));
        throw error;
    }
}
