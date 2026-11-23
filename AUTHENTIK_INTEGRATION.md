# Logging in with Authentik

The arcade (`arcade.ctrl-alt-code.uk`) sits behind Authentik forward auth.
A child who isn't logged in is sent to the club's badge page; after a scan
they come back logged in. Plan: `makecode-store/docs/login-plan.md`.

## Who is logged in

- nginx adds `X-authentik-uid` and `X-authentik-username` to each request.
- `/api/user-info` (`cli/server.ts`) returns them as `{ userId, username }`.
- At start, before the workspace opens, the app calls `loadUserAsync()`
  (`webapp/src/ctrl-alt-code-custom/userInfo.ts`). If it gets no user, it
  shows "We couldn't check who you are" and loads nothing.
- Nothing about the user is kept in `localStorage`, so a failed lookup
  can't fall back to the last child on that laptop.
- On localhost the user is `test-user`.

## Projects

- **In the browser:** each child has their own IndexedDB database, named
  with their ID (`childDb.ts`, used by `webapp/src/idbworkspace.ts`).
  MakeCode's migrations, which copy projects from older databases, never
  run for a child.
- **Cloud save:** `db.ts` calls makecode-store at `/cloud/projects` on the
  same site. The store knows who is asking from the login, so no user ID is
  sent.

## Log out

The Log out button next to the child's name clears the arcade's login
(`/outpost.goauthentik.io/sign_out`), then opens the Authentik flow
`ctrl-alt-code-arcade-logout`, which ends the Authentik session and goes
back to the arcade. The next child on the laptop has to scan their badge.

## Tests

`make check` runs the Mocha tests in `tests/ctrl-alt-code-test`.
