# Fusion Associations Live

Automated multi-level association game for **TikTok Live** (Mobile Gaming screen share).
One folder, one GitHub repo, one Render Web Service: Express + Socket.io serves the built React app.

## How it plays
Tiles on the board carry big number badges. Viewers type numbers in chat (`2 5 8 12`, any order, any group size).
A correct group fuses into a new tile (new, higher number) or, for a `category_solve` recipe, moves to the Solved area.
When the board is empty: victory screen, then the next puzzle loads by itself.

## Deploy (GitHub -> Render)
1. Push this folder to a GitHub repo.
2. Render -> New -> Web Service -> pick the repo (or New -> Blueprint to use `render.yaml`).
   - Build command: `npm install` (the React build runs automatically via the `postinstall` script)
   - Start command: `npm start`
   - Instance type: Starter or higher (free instances sleep and drop the chat connection)
3. Environment: `TIKTOK_USERNAME` = your handle without `@`. Optional: `TIKTOK_SESSION_ID`, `ADMIN_KEY`.
4. On the Android phone open `https://YOUR-APP.onrender.com/?autostart=1` in Chrome, tap Start if shown
   (needed once for sound/fullscreen), then go LIVE with TikTok Mobile Gaming and share the screen.

## Local preview
```
npm install
cp .env.example .env     # set DEMO_BOT=true and DEBUG_MODE=true
npm run dev              # open http://localhost:5173/?debug=1
```
`DEMO_BOT=true` makes fake viewers solve puzzles so you can see every animation without a stream.

## Adding puzzles (server/puzzles.json)
- `initialBoard`: `{ id, type: "text"|"emoji"|"image", content, label? }` (image content = URL or `/images/x.svg` from `public/`)
- `recipes`: `{ id, requires: [tile ids], kind: "fuse"|"category_solve", yields: {id,type,content,label} }`
- `fuse` yields a new tile; `category_solve` yields a Solved entry.
- Every tile (initial or yielded by a fuse) must be consumed by exactly one recipe. The server validates this at startup and skips broken puzzles (see logs).

## Notes
- `tiktok-live-connector` is an unofficial library. If TikTok rate-limits or blocks it, set `TIKTOK_SESSION_ID` and check the library's docs for signing options.
- `POST /admin/skip?key=ADMIN_KEY` skips the current puzzle. `/healthz` reports chat connection status.
- Layout zones: top 20% / board 45% / feed 20% / instructions 15%; the right 15% of the text zones is kept clear of TikTok's side icons.
