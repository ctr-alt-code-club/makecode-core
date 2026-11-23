/**
 * Each child gets their own browser database on a shared laptop, named
 * with their ID. (idbworkspace.ts also skips MakeCode's migrations for a
 * child, so projects from the old shared databases stay out.)
 */
export function workspaceDbName(storageId: string, userId: string, prefix: string): string {
    return userId
        ? `__pxt_idb_workspace_${storageId}_child_${userId}_${prefix}`
        : `__pxt_idb_workspace_${storageId}_${prefix}`;
}
