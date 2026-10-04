# Fusion Associations (TikTok Live)

24 numbered tiles hide 6 groups of 4 words that share a link. Viewers type **4 tile numbers** in chat (e.g. `2 5 8 12`).
Right group = tiles fuse into a banner at the top and the viewer scores 40 points. Three of four right = "one away".

## Deploy (GitHub + Render)
1. Upload everything in this folder to a new GitHub repository (keep the folder contents at the repo root).
2. Render > New > Web Service > pick the repo.
3. Build Command: `npm install`   Start Command: `npm start`
4. Environment: add `TIKTOK_SIGN_API_KEY` (your eulerstream.com key). Optional: `START_PUZZLE` (0-7).
5. Open the Render URL on your phone.

## Going live
Start your TikTok LIVE first, then open the host panel (bottom), type your username, tap **Connect**.
Use **Test** (bots) to rehearse without going live. Tap tiles to fill the guess box.
