# Fusion Associations Live

Multi-level association game for **TikTok Live** (Mobile Gaming screen share), with three modes.
One folder, one GitHub repo, one Render Web Service: Express + Socket.io serves the built React app.

## How it plays
Tiles on the board carry big number badges. Players type numbers (`2 5 8 12`, any order, any group size).
A correct group fuses into a new tile (new, higher number) or, for a `category_solve` recipe, moves to the Solved area.
When the board is empty: victory screen, then the next puzzle loads by itself.
A guess with exactly one wrong tile makes the board glow amber ("so close"). There are no automatic hints.

## The three modes

| Mode | TikTok chat | Who plays | Use it for |
|---|---|---|---|
| **Test** (pill: TEST) | off | simulated viewers (bots) | Checking everything before going live, or after you change/add puzzles. Walks through every puzzle in file order. |
| **Live** (pill: LIVE) | **on** | your TikTok viewers | The real stream. Nothing but TikTok chat can submit guesses. |
| **Offline** (pill: SOLO) | off | you | Playing on your own. A guess box at the bottom: type the numbers and press Enter / **Fuse!**, or tap the tiles. **Skip puzzle** moves on. |

Switching mode resets scores and starts a fresh puzzle, so test scores never leak into a live session.

**Choose the mode in two ways**
1. `MODE` environment variable (`test`, `live` or `offline`): what the server starts with. Set `MODE=live` on Render for streaming days, so an automatic restart keeps you live.
2. The control panel at **`/control`** (log in with `ADMIN_KEY`): switch instantly without redeploying. Open it on another device or tab, never on the screen you share.

## Control panel (`/control`)
- Mode switch (asks for confirmation).
- Pick / restart / skip a puzzle, and **Reload puzzles.json** without restarting.
- Test tools: turn simulated viewers on/off and set their speed, **Solve next group** (preview animations), send a guess as "Tester".
- **Answer key** (private): which tiles belong together right now.
- **Self-test**: checks every puzzle (structure, missing image files, and a full automatic play-through to an empty board). Run it after every change to `puzzles.json`.

## Deploy (GitHub -> Render)
1. Push this folder to a GitHub repo.
2. Render -> New -> Web Service -> pick the repo (or New -> Blueprint to use `render.yaml`).
   - Build command: `npm install` (the React build runs automatically via the `postinstall` script)
   - Start command: `npm start`
   - Instance type: Starter or higher (free instances sleep and drop the chat connection)
3. Environment variables:
   - `MODE` = `live` (or `test` / `offline`)
   - `TIKTOK_USERNAME` = your handle without `@`
   - `ADMIN_KEY` = your control-panel password (the Blueprint generates one; view it in Render > Environment)
   - Optional: `TIKTOK_SESSION_ID`, `TEST_BOT`, `TEST_BOT_MS`, `VICTORY_MS`
4. Recommended routine: deploy, open `/control`, run **Self-test**, watch **Test** mode for a minute, then switch to **Live**.
5. On the Android phone open `https://YOUR-APP.onrender.com/` in Chrome (sound switches on at the first touch), then go LIVE with TikTok Mobile Gaming and share the screen.

## Local use
```
npm install
cp .env.example .env     # set MODE=test (or offline), ADMIN_KEY=...
npm run dev              # game: http://localhost:5173/   control: http://localhost:5173/control
```
Or for the production build: `npm install && npm start` then open `http://localhost:3001/` and `/control`.
For solo play at home: `MODE=offline`.

## Adding puzzles (server/puzzles.json)
- `initialBoard`: `{ id, type: "text"|"emoji"|"image", content, label? }` (image content = URL or `/images/x.svg` from `public/`)
- `recipes`: `{ id, requires: [tile ids], kind: "fuse"|"category_solve", yields: {id,type,content,label} }`
- `fuse` yields a new tile; `category_solve` yields a Solved entry.
- Every tile (initial or yielded by a fuse) must be consumed by exactly one recipe. A group can have at most 12 tiles.
- Put your own images in `public/images/` and reference them as `/images/name.svg` (png/jpg/svg all work).
- Broken puzzles are skipped at startup (see logs). Use **Self-test** in the control panel to see exactly why.
- `fuse` recipes can feed other recipes, so chains can be as deep as you like (the sample "Move It" puzzle is 4 levels).

## Notes
- `tiktok-live-connector` is an unofficial library. If TikTok rate-limits or blocks it, set `TIKTOK_SESSION_ID`.
- `/healthz` reports mode and chat connection status.
- Layout zones: top 20% / board 45% / feed 20% / instructions 15%; the right 15% of the text zones is kept clear of TikTok's side icons.
- Removed in this version: automatic hints (`HINT_AFTER_MS`), `DEBUG_MODE`, `DEMO_BOT`, `?debug=1`, `?play=1` (replaced by the modes above).
