# FUSEDLE Live (TikTok LIVE)

This folder is the complete, finished app. You do not need to edit any code.

**How the game works:** a board of numbered word tiles hides several groups of 4 words that share a link
(for example Nimbus, Cumulus, Cirrus, Stratus = Clouds). Viewers type **four tile numbers** in chat,
like `2 5 8 12`. If all four belong together they **fuse** into a coloured banner that names the group and
the viewer scores points. Three of four right shows "one away".

> **Before you go live:** in the TikTok app open LIVE settings, then **Comments > Filtered**, and turn **OFF**
> the **Spam filter** and **Potentially unkind words**. TikTok can quietly hide short number comments.

## First time: put it online
1. Create a new empty repository on GitHub.
2. Upload everything from this folder to it. Keep the `public` folder as it is.
3. On Render.com click **New +**, then **Web Service**, and pick that repository.
4. Environment: Node. Build Command: `npm install`. Start Command: `npm start`. Instance Type: Free is fine.
5. Click **Create Web Service**. Render gives you a link such as `https://your-game.onrender.com`.

## Set your TikTok key once
On Render, open your service, go to **Environment**, and add:
- `EULERSTREAM_SIGN_API_KEY` = your free key from eulerstream.com
- `TIKTOK_USERNAME` = your TikTok name, no @

With both set, the game connects to your LIVE by itself every time it starts. The key stays on Render.

## Already online? Update it
Upload every file from this folder again on top of the old ones (same names, same `public` folder).
Render updates the game by itself in a minute or two.

## Using it
- **Settings (gear):** theme (8 looks), mode (**Offline**, **Test**, **Live**), TikTok connect, Puzzle Pack,
  Hints and Reveals, Reset Scores, Auto Next Game, Timing, difficulty, and Save & Apply as Default.
- **Modes:** *Offline* = you play alone with the Player Guess Bar (tap 4 tiles or type them). *Test* = fake
  viewers (turn on **Auto-Play Bots**) so you can rehearse. *Live* = real TikTok chat counts.
- **Difficulty:** 1 Warmup (12 tiles), 2 Easy (16), 3 Medium (20), 4 Hard (24), 5 Chaos (32, groups mixed from every puzzle).
  Pick a level from the toolbar badge, then tap the refresh button to start a new game at that level.
- **Toolbar:** difficulty, new game, leaderboard, **Hint** (names one group), **Peek** (tints tiles by group for
  a few seconds), **Reveal 1 Group**, theme, full screen, settings. Nobody earns points from hints or reveals.
- **Scoring:** 10 points per fused group (change it in Settings > Timing). Fuse groups back-to-back for a
  combo: 1x, 2x, 3x, then 4x. A wrong guess resets the streak. There is a This Round and an All-Time board.
- **Viewer photos:** real TikTok profile pictures show in circles next to names in Live mode.
- **Host Console** at the bottom lets you type guesses yourself. Tap **Hide** to hide it.
- **Puzzle Pack:** 8 themes (Around Town, In the Kitchen, Nature Walk, Wild Animals, Music Room, Food Market,
  Game On, Science Lab) or Mixed. To add puzzles, upload this folder back to Claude and ask.

## Keep it awake while you stream
Render's free plan sleeps after about 15 minutes with no visitors, which drops the TikTok connection.
Point a free monitor (UptimeRobot or cron-job.org) at `https://your-game.onrender.com/healthz` every 5 to 10 minutes.

## If something looks wrong
- **Chat Comments Received stays at 0 in Live mode:** wrong username or key, or you are not live yet.
  The Settings > Live message shows the real reason. Go LIVE first, then connect (it keeps retrying by itself).
- **All-Time scores** are saved to a file and survive sleep, but reset on a new deploy on the free plan.
- **First load is slow:** free Render games sleep. Wait about 30 seconds.
- **Run on your own computer:** `npm install`, then `npm start`, then open http://localhost:3000.
  To use your key there, copy `env.example` to `.env` and fill it in. Never upload `.env`.
- **The `_gitignore` file:** if you use git on your computer, rename it to `.gitignore`.
