/**
 * Who is using the arcade. The server reads the login headers nginx sets
 * (`/api/user-info`), and the app asks it once at start, before any project
 * loads, because each child's browser projects are kept under their ID.
 *
 * No copy is kept in localStorage: on a shared laptop, a failed lookup must
 * never fall back to the last child who used it.
 */

export interface UserInfo {
    userId: string;
    username: string;
}

const LOCAL_USER: UserInfo = { userId: "test-user", username: "Test User" };

// Authentik's own log-out link: it opens the brand's default logout flow,
// which ends the child's Authentik session.
const LOGOUT_FLOW_URL = "https://authentik.ctrl-alt-code.uk/flows/-/default/invalidation/";

let current: UserInfo | null = null;

export function isLocalhost(): boolean {
    const host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1";
}

/** Asks the server who this is. Null if it can't tell. */
export async function loadUserAsync(): Promise<UserInfo | null> {
    current = null;
    // Older versions kept the last child here.
    window.localStorage?.removeItem("ctrlaltcode_user_info");
    if (isLocalhost()) return current = LOCAL_USER;
    try {
        const response = await fetch("/api/user-info", { cache: "no-store" });
        const user: Partial<UserInfo> = response.ok ? await response.json() : {};
        if (user.userId) current = { userId: user.userId, username: user.username || "" };
    } catch (error) {
        console.warn("Could not get the user from /api/user-info:", error);
    }
    return current;
}

export function getCurrentUserId(): string {
    return current?.userId ?? "";
}

export function getCurrentUsername(): string {
    return current?.username ?? "";
}

/**
 * Logs the child out of the arcade and of Authentik, so the next child on
 * this laptop has to scan their own badge.
 */
export async function logOutAsync(): Promise<void> {
    try {
        // Clears the arcade's own login cookie. The answer is a redirect we
        // don't follow: the cookie change is all we need.
        await fetch("/outpost.goauthentik.io/sign_out", { redirect: "manual" });
    } catch (error) {
        console.warn("Could not clear the arcade login:", error);
    }
    window.location.href = LOGOUT_FLOW_URL;
}

/** A page for when the app can't tell who is logged in. */
export function showLoginProblem(): void {
    const page = document.createElement("div");
    page.style.cssText = "max-width: 32em; margin: 4em auto; padding: 0 1em; font-family: sans-serif;";
    const add = (tag: string, text: string, parent: HTMLElement = page) => {
        const element = parent.appendChild(document.createElement(tag));
        element.textContent = text;
        return element;
    };
    add("h1", "We couldn't check who you are");
    add("p", "Please try again. If it keeps happening, ask a club leader for help.");
    const retry = add("a", "Try again", add("p", "")) as HTMLAnchorElement;
    retry.href = "/";
    retry.className = "ui primary button";
    const details = add("details", "");
    add("summary", "Details", details);
    add("p", "/api/user-info didn't return a user ID, so no projects were loaded.", details);
    document.body.textContent = "";
    document.body.appendChild(page);
}
