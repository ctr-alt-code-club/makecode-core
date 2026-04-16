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
 * Authentik authentication flow URL
 */
const AUTHENTIK_FLOW_URL = 'https://authentik.ctrl-alt-code.uk/if/flow/ctrl-alt-code-authentication-flow/';

/**
 * Check if running on localhost
 */
export function isLocalhost(): boolean {
    return window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname === '';
}

/**
 * Check if user is authenticated (has valid user info)
 */
export function isAuthenticated(): boolean {
    if (isLocalhost()) {
        return true; // Always authenticated on localhost
    }
    return cachedUserInfo !== null || localStorage.getItem('ctrlaltcode_user_info') !== null;
}

/**
 * Redirect to Authentik login flow
 */
export function redirectToLogin(): void {
    // Store the current URL to return to after login
    const returnUrl = window.location.href;
    sessionStorage.setItem('ctrlaltcode_return_url', returnUrl);
    
    // Redirect to Authentik
    window.location.href = AUTHENTIK_FLOW_URL;
}

/**
 * Clear cached user information
 * Should be called when user logs out or when you want to force a refresh
 */
export function clearUserInfo(): void {
    cachedUserInfo = null;
    localStorage.removeItem('ctrlaltcode_user_info');
    console.log('🧹 User info cache cleared');
}

/**
 * Initialize user information by fetching from server (which reads Authentik headers)
 * Should be called once when the app loads, or when user logs in
 * @param forceRefresh - If true, clears cache before fetching
 */
export async function initializeUserId(forceRefresh: boolean = false): Promise<void> {
    if (forceRefresh) {
        clearUserInfo();
    }
    
    try {
        const response = await fetch('/api/user-info', {
            // Add cache-busting to ensure fresh data
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
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
 * Returns the Authentik UID if authenticated, otherwise falls back to test-user on localhost
 */
export function getCurrentUserId(): string {
    // On localhost, always use test-user
    if (isLocalhost()) {
        return 'test-user';
    }
    
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
    
    // Not authenticated and not on localhost - user needs to log in
    console.warn('⚠️ No authenticated user - login required');
    return '';
}

/**
 * Get the current username
 * Returns the Authentik username if authenticated, otherwise falls back to 'Test User' on localhost
 */
export function getCurrentUsername(): string {
    // On localhost, always use Test User
    if (isLocalhost()) {
        return 'Test User';
    }
    
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
    
    // Not authenticated - return empty string
    return '';
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
