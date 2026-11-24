// Each child's login and projects stay theirs on a shared laptop.
import "mocha";
import { expect } from "chai";

import { workspaceDbName } from "../../webapp/src/ctrl-alt-code-custom/childDb";
import * as db from "../../webapp/src/ctrl-alt-code-custom/db";
import { getCurrentUserId, loadUserAsync, logOutAsync } from "../../webapp/src/ctrl-alt-code-custom/userInfo";

// The one fake for fetch: answers each call with the next reply, and keeps the calls.
type Reply = { status: number, body?: unknown } | Error;
let replies: Reply[] = [];
let calls: { url: string, init?: RequestInit }[] = [];
(globalThis as any).fetch = async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const reply = replies.shift();
    if (reply instanceof Error) throw reply;
    return new Response(reply.body === undefined ? "" : JSON.stringify(reply.body), { status: reply.status });
};

const stored = new Map<string, string>();
(globalThis as any).window = {
    location: { hostname: "arcade.ctrl-alt-code.uk", href: "" },
    localStorage: { removeItem: (key: string) => stored.delete(key) },
};

beforeEach(() => {
    replies = [];
    calls = [];
});

describe("browser database per child", () => {
    it("names a database for each child, apart from the shared one", () => {
        const names = ["child-a", "child-b", ""].map(id => workspaceDbName("arcade", id, "v1"));
        expect(new Set(names).size).to.equal(3);
        expect(names[2]).to.equal("__pxt_idb_workspace_arcade_v1"); // MakeCode's own name
    });
});

describe("who is logged in", () => {
    const cases: { name: string, reply: Reply, userId: string }[] = [
        { name: "a logged-in child", reply: { status: 200, body: { userId: "child-a", username: "Ada" } }, userId: "child-a" },
        { name: "no login headers", reply: { status: 200, body: { userId: null, username: null } }, userId: "" },
        { name: "a server error", reply: { status: 500 }, userId: "" },
        { name: "no network", reply: new Error("offline"), userId: "" },
    ];
    for (const c of cases) {
        it(c.name, async () => {
            replies = [c.reply];
            await loadUserAsync();
            expect(getCurrentUserId()).to.equal(c.userId);
        });
    }

    it("doesn't fall back to the last child when the lookup fails", async () => {
        stored.set("ctrlaltcode_user_info", JSON.stringify({ userId: "child-a" }));
        replies = [{ status: 200, body: { userId: "child-a" } }, new Error("offline")];
        await loadUserAsync();
        expect(await loadUserAsync()).to.equal(null);
        expect(getCurrentUserId()).to.equal("");
        expect(stored.has("ctrlaltcode_user_info")).to.equal(false);
    });

    it("logs out of the arcade and then of Authentik", async () => {
        replies = [{ status: 302 }];
        await logOutAsync();
        expect(calls.map(c => c.url)).to.deep.equal(["/outpost.goauthentik.io/sign_out"]);
        expect((globalThis as any).window.location.href).to.equal("https://authentik.ctrl-alt-code.uk/flows/-/default/invalidation/");
    });
});

describe("cloud save", () => {
    it("calls the store on this site without saying who the child is", async () => {
        replies = [{ status: 200, body: { success: true, id: 1 } }, { status: 200, body: [] }];
        await db.saveProject("Space game", "AAAA");
        await db.getUserProjects();
        expect(calls.map(c => c.url)).to.deep.equal(["/cloud/projects", "/cloud/projects"]);
        expect(JSON.parse(calls[0].init.body as string)).to.deep.equal({ projectName: "Space game", projectData: "AAAA" });
    });

    it("says to log in again when the login has run out", async () => {
        replies = [{ status: 401 }];
        const error = await db.getUserProjects().catch((e: Error) => e);
        expect((error as Error).message).to.match(/log in again/);
    });
});
