# Authentik Integration for User Authentication

## Overview
This document describes the integration of Authentik authentication headers into the MakeCode application to identify users for cloud project storage.

## Implementation

### 1. Server-Side API Endpoint (`cli/server.ts`)

Added a new API endpoint `/api/user-info` that reads Authentik headers from the ingress and returns user information:

```typescript
if (elts[1] == "user-info") {
    const userInfo = {
        userId: req.headers['x-authentik-uid'] as string || null,
        username: req.headers['x-authentik-username'] as string || null,
        email: req.headers['x-authentik-email'] as string || null,
        groups: req.headers['x-authentik-groups'] as string || null
    };
    
    res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(JSON.stringify(userInfo));
    return;
}
```

**Location**: `makecode-core/cli/server.ts` (after line 1142)

### 2. Client-Side User ID Management (`webapp/src/ctrl-alt-code-custom/db.ts`)

Added two new functions:

#### `initializeUserId()`
- Fetches user information from `/api/user-info` endpoint
- Caches the user ID in memory and localStorage
- Logs authentication status
- Called once when the app loads

#### `getCurrentUserId()` (updated)
- Returns cached user ID from Authentik
- Falls back to localStorage if cache is empty
- Falls back to 'test-user' for development/testing

**Location**: `makecode-core/webapp/src/ctrl-alt-code-custom/db.ts` (lines 249-296)

### 3. App Initialization (`webapp/src/app.tsx`)

Added initialization call in the `componentDidMount()` lifecycle method:

```typescript
// Initialize user ID from Authentik headers
initializeUserId().catch((err: any) => {
    console.error('Failed to initialize user ID from Authentik:', err);
});
```

**Location**: `makecode-core/webapp/src/app.tsx` (in componentDidMount method)

## Authentik Headers

The following headers are passed from Authentik through the ingress:

- `x-authentik-uid` - Unique user identifier (used as userId)
- `x-authentik-username` - Username
- `x-authentik-email` - User email
- `x-authentik-groups` - User groups (pipe-separated)

## Flow

1. User accesses the application through Authentik-protected ingress
2. Ingress adds Authentik headers to the request
3. On app load, `initializeUserId()` is called
4. Client fetches `/api/user-info` from the server
5. Server reads Authentik headers and returns user info
6. Client caches the user ID in memory and localStorage
7. All database operations use `getCurrentUserId()` to get the authenticated user ID

## Testing

### Debug Endpoint
A debug endpoint is available at `/api/debug-headers` to view all headers being sent:

```bash
curl https://arcade.ctrl-alt-code.uk/api/debug-headers
```

### Console Logs
When authenticated, you should see:
```
✅ User authenticated via Authentik: akadmin (UID: 6715dd0b70ff22bec779dd0ffdcc4a4422352d36cbd77bc0d623bb7e2ac609a5)
```

When not authenticated (development):
```
⚠️ No authenticated user, using test-user fallback
```

## Fallback Behavior

If Authentik headers are not present (e.g., local development):
- The system falls back to 'test-user' as the user ID
- This allows development without requiring Authentik
- Production deployments should always have Authentik headers

## Security Notes

- User ID comes from server-side headers (cannot be spoofed by client)
- Headers are set by the ingress controller (trusted source)
- No sensitive data is stored in localStorage (only the UID)
- Cache-Control headers prevent caching of user info

## Files Modified

1. `makecode-core/cli/server.ts` - Added `/api/user-info` endpoint
2. `makecode-core/webapp/src/ctrl-alt-code-custom/db.ts` - Added user ID initialization
3. `makecode-core/webapp/src/app.tsx` - Added initialization call on app load