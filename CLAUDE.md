# makecode-core

Ctrl Alt Code's fork of Microsoft's pxt (MakeCode's editor and server),
built into the `makecode-arcade` image for `arcade.ctrl-alt-code.uk`. Our
changes are in `webapp/src/ctrl-alt-code-custom/`, with small hooks into
Microsoft's files. Default branch `master`.

- **Check:** `make check` (types, lint, and our Mocha tests in `tests/ctrl-alt-code-test`). It needs `built/`
  from one `npm run build` first.
- **Run locally:** `npm run build`, then serve from `makecode-arcade`
  (its `DEVELOPMENT.md`). On localhost the user is `test-user`.
- **Release:** rebuild the `makecode-arcade` image, which copies this repo in.
- **Gotchas:**
  - Public repo: security problems go in `development/OPEN_ISSUES.md`.
  - Keep Microsoft's lockfile and Mocha; don't update their dependencies.
  - The child comes only from `/api/user-info` (the login headers nginx
    sets), loaded before any project; never keep a copy in `localStorage`.
