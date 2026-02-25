/**
 * Cloud save button functionality for Ctrl-Alt-Code
 * Saves projects to cloud database via API
 */

import * as db from "./db";
import * as core from "../core";

/**
 * Convert Uint8Array to Base64 string using MakeCode's encoding
 * This is the recommended format for database storage
 */
function uint8ArrayToBase64(uint8Array: Uint8Array): string {
    // Use MakeCode's built-in encoding which matches their export format
    return ts.pxtc.encodeBase64(pxt.Util.uint8ArrayToString(uint8Array));
}

/**
 * Convert Base64 string back to Uint8Array using MakeCode's decoding
 * Use this when loading projects from the database
 */
export function base64ToUint8Array(base64: string): Uint8Array {
    // Use MakeCode's built-in decoding which matches their import format
    const decoded = ts.pxtc.decodeBase64(base64);
    return pxt.Util.stringToUint8Array(decoded);
}

/**
 * Main handler for custom save with project data
 * Receives Uint8Array from exportProjectToFileAsync()
 */
export async function handleCloudSaveWithData(projectName: string, projectData: Uint8Array): Promise<void> {
    console.log("🎮 Cloud Save Initiated");
    
    try {
        // Convert Uint8Array to Base64 for storage/transmission
        const base64Data = uint8ArrayToBase64(projectData);
        console.log("🔐 Base64 Size:", base64Data.length, "characters");
        
        // Get current user ID
        const userId = db.getCurrentUserId();
        
        // Save to cloud database
        const result = await db.saveProject(userId, projectName, base64Data);
        
        console.log("✅ Project saved to cloud:", result);
        core.infoNotification(lf("Project '{0}' saved to cloud!", projectName));
        
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("❌ Error saving to cloud:", error);
        core.errorNotification(lf("Failed to save '{0}': {1}", projectName, errorMsg));
        throw error;
    }
}

