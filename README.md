# Fusion Associations Live

Word-only association game for **TikTok Live** (Mobile Gaming screen share), with a host toolbar.
One folder, one GitHub repo, one Render Web Service: Express + Socket.io serves the built React app.

## How it plays
- Every round shows **24 word tiles in a fixed 4 x 6 grid**, each with a number badge.
- Players type numbers in chat (`2 5 8 12`, any order, any group size). A correct group fuses into a new word tile
  (new, higher number); the final group solves the round's category. Fusions can be several levels deep
  (e.g. 24 words -> 6 groups -> 3 bigger groups -> the category).
- When the board is empty: victory screen, then the next puzzle loads by itself.
- A guess with exactly one wrong tile makes the board glow amber ("so close", can be switched off). No automatic hints.

## Host toolbar (one row: game name + every button)
The toolbar sits above the game screen: **game name - mode pill - chat status - Mode - Puzzles - Settings - Answers - Self-test - Test tools - Stream view**.
(On narrow screens the row scrolls sideways and shows icons only.) Each button opens a side panel.

**Unlocking it:** open the game page once with `?host` (e.g. `https://YOUR-APP.onrender.com/?host`) and enter your `ADMIN_KEY`.
That browser remembers it. Other browsers (and viewers) never see the toolbar.
**Stream view** hides the toolbar so only the clean 9:16 game is shown; a faint gear in the top-left corner brings it back.
For the best setup, run the toolbar on a second device or a computer and keep the streaming phone in Stream view.

| Button | What it does |
|---|---|
| **Mode** | Switch Test / Live / Offline (asks first; scores reset) |
| **Puzzles** | Jump to a puzzle, restart, skip, reload `puzzles.json` without restarting |
| **Settings** | All host settings (below) |
| **Answers** | Private answer key: which tiles belong together right now |
| **Self-test** | Checks every puzzle and plays it through automatically |
| **Test tools** | Simulated viewers on/off, "Solve next group", send a guess (Test mode only) |
| **Stream view** | Hide the toolbar for the stream |

## Modes
| Mode | TikTok chat | Who plays |
|---|---|---|
| **Test** (TEST) | off | Simulated viewers. Walks through every puzzle in file order. Use before going live or after editing puzzles. |
| **Live** (LIVE) | on | Your TikTok viewers. Nothing else can submit guesses. |
| **Offline** (SOLO) | off | You: a guess box at the bottom (type numbers + Enter / **Fuse!**, or tap tiles). **Skip puzzle** moves on. |

The `MODE` environment variable sets the starting mode. Set `MODE=live` on Render for stream days so an automatic restart keeps you live.

## Settings
Display: game name, keep right side clear for TikTok icons, show leaderboard, feed rows, sound volume.
Gameplay: puzzle order, victory screen time, auto-skip stalled puzzle (Live), "so close" feedback, points per tile, final-category bonus.
TikTok chat: guess cooldown, TikTok username (reconnects instantly), session ID (write-only).
Offline: your leaderboard name. Test: simulated viewers on/off, speed, accuracy.
Changes apply immediately to the game screen. They are saved in `data/settings.json`. Render wipes files on restart/redeploy
unless you attach a persistent disk (set `DATA_DIR` to its mount path), so keep the important values in environment variables too
(`TIKTOK_USERNAME`, `GAME_NAME`, `VICTORY_MS`, ...). Order of priority: defaults < environment variables < saved settings.

## Deploy (GitHub -> Render)
1. Push this folder to a GitHub repo.
2. Render -> New -> Web Service -> pick the repo (or New -> Blueprint to use `render.yaml`).
   - Build command: `npm install` (the React build runs automatically via the `postinstall` script)
   - Start command: `npm start`
   - Instance type: Starter or higher (free instances sleep and drop the chat connection)
3. Environment variables: `MODE` (`live`), `TIKTOK_USERNAME` (no `@`), `ADMIN_KEY` (the Blueprint generates one; see Render > Environment).
4. Open `https://YOUR-APP.onrender.com/?host`, unlock, run **Self-test**, watch **Test** mode for a minute, then switch to **Live**.
5. On the Android phone open the game page (not `?host`) in Chrome, then go LIVE with TikTok Mobile Gaming and share the screen. Sound switches on at the first touch.

## Local use
```
npm install
cp .env.example .env     # set MODE=test (or offline), ADMIN_KEY=...
npm run dev              # http://localhost:5173/?host
```
Production build: `npm install && npm start`, then open `http://localhost:3001/?host`.

## Adding puzzles (server/puzzles.json)
Each puzzle needs **exactly 24 starting tiles**, all words (`"type": "text"`). Example shape:
- `initialBoard`: 24 x `{ id, type: "text", content: "Sedan" }`
- `recipes`: `{ id, requires: [tile ids], kind: "fuse"|"category_solve", yields: {id, type: "text", content, label} }`
  - `fuse` yields a new word tile (it can feed another recipe); `category_solve` ends the chain.
- Every tile (starting or fused) must be used by exactly one recipe. A group has 2 to 12 tiles.
- No word may appear twice in a puzzle. Keep words to about 10 characters or less so they stay readable on a 4-column board.
- Broken puzzles are skipped at startup. Use **Self-test** in the toolbar to see exactly why, then **Reload puzzles.json**.
The included 8 puzzles (Move It, Dinner Time, Nature Walk, Music Hall, School Day, Animal Kingdom, Tech Talk, Holiday Time) are examples to copy.

## Notes
- This version is word-only; the validator rejects image/emoji tiles (the display code for them is still there for later).
- `tiktok-live-connector` is an unofficial library. If TikTok rate-limits or blocks it, add a session ID in Settings.
- `/healthz` reports mode and chat status.
- Layout: top 16% / board 53% / feed 18% / instructions 13%.
