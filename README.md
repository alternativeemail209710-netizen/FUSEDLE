# FUSEDLE Live (TikTok LIVE) - Classic Board + Multi-Level Fusion

This folder is the complete, finished app. You do not need to edit any code.

**How the game works:** a board of numbered word tiles. Viewers type **four tile numbers** in chat, like `2 5 8 12`.
If all four belong together they are **destroyed and fuse into ONE brand-new tile** with a **new number**. That is the classic game.

On top of it, the new tile is a real tile that can be used again in the next fusion, so **chains go 4 levels deep on every difficulty**.

> **Example**
> - Level 1: viewers type the numbers of **Ford, Toyota, Honda, BMW**. Those 4 tiles vanish and one new tile **"Car"** appears with the next free number (for example 17).
> - Level 2: **Car (17) + Bus + Truck + Motorbike** fuse into **"Road Vehicle"**.
> - Level 3: **Road Vehicle + Train + Tram + Bicycle** fuse into **"Land Transport"**.
> - Level 4: **Land Transport + Boat + Plane + Rocket** fuse into the final group **"Transportation"**.
>
> You cannot skip ahead: "Car" does not exist until the car brands are fused. Trying it early shows "one away" or "not on the board".

**When a group is completely finished** it shows as one small card: the category name, the viewer who fused it (their round TikTok
photo and name) and only the **4 latest words** that made it. The cards stay small (two per row on a phone), so the unsolved tiles and
the leaderboards stay on the screen. If the host used Reveal, the card says "Host reveal".

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
- **Difficulty** (pick a level from the toolbar badge, then tap the refresh button to start a new game). Every level has a FIXED
  number of starting tiles in 4 columns, and every board contains at least one chain that is **4 levels deep**:

  | Level | Name    | Board                   | Tiles at the start | Top-level groups on the board |
  |-------|---------|-------------------------|--------------------|-------------------------------|
  | 1     | Warmup  | 4 columns x 4 rows      | 16                 | 1 (one big chain)             |
  | 2     | Easy    | 4 columns x 5 rows      | 20                 | 2                             |
  | 3     | Medium  | 4 columns x 6 rows      | 24                 | 3                             |
  | 4     | Hard    | 4 columns x 7 rows      | 28                 | 4                             |
  | 5     | Chaos   | 4 columns x 8 rows      | 32                 | 2 huge chains, or 5 groups    |

  The round ends when every top-level group is finished. Groups that are not part of the 4-level chain are shorter chains or plain groups of 4.

- **Fused tiles** are coloured by level (L1 teal, L2 violet, L3 gold), show their new number and what is inside them. The last fusion of a group becomes its finished card.
- **Toolbar:** difficulty, new game, leaderboard, **Hint** (names one group you can fuse right now), **Peek** (tints tiles by group for
  a few seconds), **Reveal 1 Fusion**, theme, full screen, settings. Nobody earns points from hints or reveals.
- **Scoring:** points per fusion = **10 x fusion level x combo**. A level-1 fusion is worth 10, level 2 is worth 20, level 3 is worth 30, level 4 is worth 40.
  Fuse back-to-back for a combo: 1x, 2x, 3x, then 4x. A wrong guess resets the streak. There is a This Round and an All-Time board.
  (Change the base 10 in Settings > Timing.)
- **Viewer photos:** real TikTok profile pictures show in circles next to names in Live mode.
- **Host Console** at the bottom lets you type guesses yourself. Tap **Hide** to hide it.
- **Puzzle Pack:** 6 themes (Getting Around, Animal Kingdom, Food & Drink, Music Room, Game On, Around Town) or Mixed.
  Each theme has ordinary groups and fusion chains for every difficulty level. Mixed pulls groups from all themes.

## Adding your own puzzles
Open `puzzles.js`. Everything is a group of **exactly 4 children**, and a child is either a word or another group.
Add lines inside a pack's `trees: [ ... ]` list. More lines means more variety.

**Plain group of 4 (4 tiles):**
```js
N('Fuels', 'Petrol', 'Diesel', 'Kerosene', 'Ethanol')
```

**Fusion chain (the nesting depth is the number of levels):**
```js
N('Transportation',                                   // level 4
  N('Land Transport',                                 // level 3
    N('Road Vehicle',                                 // level 2
      N('Car', 'Ford', 'Toyota', 'Honda', 'BMW'),     // level 1
      'Bus', 'Truck', 'Motorbike'),
    'Train', 'Tram', 'Bicycle'),
  'Boat', 'Plane', 'Rocket')
```

**The tile count must add up.** A chain with G groups in total has 3 x G + 1 words (a chain 4 levels deep with one group per level has 13,
with one extra plain group inside it 16, with two extra groups 19). The board builder combines trees so the total is exactly
16, 20, 24, 28 or 32 tiles, never repeats a word or group name on a board, and always includes at least one chain 4 levels deep.
To make sure all difficulties keep working, keep some 4-level chains of 13, 16 and 19 words in the list (the file has 21 of them).
The game checks `puzzles.js` when it starts and tells you in the log if a group does not have exactly 4 children or a word is repeated.
The tile counts and group counts per difficulty are in `LEVEL_SPECS` near the bottom of `puzzles.js`.

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
