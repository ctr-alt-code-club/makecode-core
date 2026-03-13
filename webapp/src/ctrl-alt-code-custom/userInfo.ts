/**
 * User information management for Ctrl-Alt-Code
 * Handles authentication and user data from Authentik
 */

/// <reference types="node" />

/**
 * Interface for user information from Authentik
 */
export interface UserInfo {
    userId: string;
    username: string;
    email: string;
    groups: string;
}

/**
 * Cached user information from Authentik
 */
let cachedUserInfo: UserInfo | null = null;

/**
 * Initialize user information by fetching from server (which reads Authentik headers)
 * Should be called once when the app loads
 */
export async function initializeUserId(): Promise<void> {
    try {
        const response = await fetch('/api/user-info');
        if (response.ok) {
            const userInfo: UserInfo = await response.json();
            if (userInfo.userId) {
                cachedUserInfo = userInfo;
                // Store in localStorage for persistence
                localStorage.setItem('ctrlaltcode_user_info', JSON.stringify(userInfo));
                console.log('✅ User authenticated via Authentik:', userInfo.username, '(UID:', userInfo.userId, ')');
            } else {
                console.warn('⚠️ No user ID received from Authentik headers');
            }
        } else {
            console.warn('⚠️ Could not fetch user info from server');
        }
    } catch (error) {
        console.warn('⚠️ Error fetching user info, using fallback:', error);
    }
}

/**
 * Get the current user ID
 * Returns the Authentik UID if authenticated, otherwise falls back to test-user
 */
export function getCurrentUserId(): string {
    // Try cached value first (from initializeUserId)
    if (cachedUserInfo) {
        return cachedUserInfo.userId;
    }
    
    // Try localStorage (persisted from previous session)
    const storedUserInfo = localStorage.getItem('ctrlaltcode_user_info');
    if (storedUserInfo) {
        try {
            cachedUserInfo = JSON.parse(storedUserInfo);
            return cachedUserInfo!.userId;
        } catch (error) {
            console.warn('⚠️ Failed to parse stored user info:', error);
        }
    }
    
    // Fallback for development/testing (when not behind Authentik)
    console.warn('⚠️ No authenticated user, using test-user fallback');
    return 'test-user';
}

/**
 * Get the current username
 * Returns the Authentik username if authenticated, otherwise falls back to 'Test User'
 */
export function getCurrentUsername(): string {
    // Try cached value first
    if (cachedUserInfo) {
        return cachedUserInfo.username;
    }
    
    // Try localStorage
    const storedUserInfo = localStorage.getItem('ctrlaltcode_user_info');
    if (storedUserInfo) {
        try {
            cachedUserInfo = JSON.parse(storedUserInfo);
            return cachedUserInfo!.username;
        } catch (error) {
            console.warn('⚠️ Failed to parse stored user info:', error);
        }
    }
    
    // Fallback
    return 'Test User';
}

/**
 * Get the current user's email
 * Returns the Authentik email if authenticated, otherwise returns empty string
 */
export function getCurrentUserEmail(): string {
    // Try cached value first
    if (cachedUserInfo) {
        return cachedUserInfo.email;
    }
    
    // Try localStorage
    const storedUserInfo = localStorage.getItem('ctrlaltcode_user_info');
    if (storedUserInfo) {
        try {
            cachedUserInfo = JSON.parse(storedUserInfo);
            return cachedUserInfo!.email;
        } catch (error) {
            console.warn('⚠️ Failed to parse stored user info:', error);
        }
    }
    
    // Fallback
    return '';
}

/**
 * Get the current user's groups
 * Returns the Authentik groups if authenticated, otherwise returns empty string
 */
export function getCurrentUserGroups(): string {
    // Try cached value first
    if (cachedUserInfo) {
        return cachedUserInfo.groups;
    }
    
    // Try localStorage
    const storedUserInfo = localStorage.getItem('ctrlaltcode_user_info');
    if (storedUserInfo) {
        try {
            cachedUserInfo = JSON.parse(storedUserInfo);
            return cachedUserInfo!.groups;
        } catch (error) {
            console.warn('⚠️ Failed to parse stored user info:', error);
        }
    }
    
    // Fallback
    return '';
}

/**
 * Get all current user information
 * Returns the complete UserInfo object if authenticated, otherwise returns fallback values
 */
export function getCurrentUserInfo(): UserInfo {
    // Try cached value first
    if (cachedUserInfo) {
        return cachedUserInfo;
    }
    
    // Try localStorage
    const storedUserInfo = localStorage.getItem('ctrlaltcode_user_info');
    if (storedUserInfo) {
        try {
            cachedUserInfo = JSON.parse(storedUserInfo);
            return cachedUserInfo!;
        } catch (error) {
            console.warn('⚠️ Failed to parse stored user info:', error);
        }
    }
    
    // Fallback
    return {
        userId: 'test-user',
        username: 'Test User',
        email: '',
        groups: ''
    };
}
