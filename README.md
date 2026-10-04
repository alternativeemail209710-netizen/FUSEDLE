# FUSEDLE Live (TikTok LIVE) - Classic Board + Multi-Level Fusion

This folder is the complete, finished app. You do not need to edit any code.

**How the game works:** every round is a board of numbered word tiles hiding **4 groups**. Viewers type **four tile numbers**
in chat, like `2 5 8 12`. If all four belong together, those tiles are **destroyed and fuse into ONE brand-new tile** with a **new number**.

That is the classic game. On top of it, **some groups are fusion chains**: the new tile is a real tile and can be used again
in the next fusion, up to 4 levels deep. Harder boards mix ordinary groups of 4 with deeper chains.

> **Example (2 levels)**
> - Level 1: viewers type the numbers of **Ford, Toyota, Honda, BMW**. Those 4 tiles vanish and one new tile **"Car"** appears with the next free number (for example 17).
> - Level 2: viewers now fuse **Car (17) + Boat + Plane + Train** into the final group **"Transportation"**.
>
> You cannot skip ahead: "Car" does not exist until the car brands are fused. Trying it early shows "one away" or "not on the board".

A deeper chain looks like **Mammal -> Vertebrate -> Animal -> Life on Earth** (4 levels), sitting on the same board as other groups.
When a group is finished it is shown as nested boxes, with the final group on the outside and the original words in the middle.
The round ends when all 4 groups are done.

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
- **Difficulty** (pick a level from the toolbar badge, then tap the refresh button to start a new game). Every board has 4 groups:

  | Level | Name    | What is on the board                                   | Tiles at the start |
  |-------|---------|--------------------------------------------------------|--------------------|
  | 1     | Classic | 4 ordinary groups of 4 (the original game)             | 16                 |
  | 2     | Easy    | 1 fusion chain (2 levels) + 3 ordinary groups          | 19                 |
  | 3     | Medium  | 2 fusion chains (2 levels) + 2 ordinary groups         | 22 to 25           |
  | 4     | Hard    | chains up to 3 levels deep + ordinary groups           | 28                 |
  | 5     | Chaos   | chains up to 4 levels deep, 4 groups on a huge board   | 31 to 34           |

- **Fused tiles** are coloured by level (L1 teal, L2 violet, L3 gold, L4 pink), show their new number and what is inside them.
- **Toolbar:** difficulty, new game, leaderboard, **Hint** (names one group you can fuse right now), **Peek** (tints tiles by group for
  a few seconds), **Reveal 1 Fusion**, theme, full screen, settings. Nobody earns points from hints or reveals.
- **Scoring:** points per fusion = **10 x fusion level x combo**. A level-1 fusion is worth 10, level 2 is worth 20, level 3 is worth 30.
  Fuse back-to-back for a combo: 1x, 2x, 3x, then 4x. A wrong guess resets the streak. There is a This Round and an All-Time board.
  (Change the base 10 in Settings > Timing.)
- **Viewer photos:** real TikTok profile pictures show in circles next to names in Live mode.
- **Host Console** at the bottom lets you type guesses yourself. Tap **Hide** to hide it.
- **Puzzle Pack:** 6 themes (Getting Around, Animal Kingdom, Food & Drink, Music Room, Game On, Around Town) or Mixed.
  Each theme has ordinary groups and fusion chains for every difficulty level. Mixed pulls groups from all themes.

## Adding your own puzzles
Open `puzzles.js`. Everything is a group of **exactly 4 children**, and a child is either a word or another group.
Add lines inside a pack's `trees: [ ... ]` list. The game builds each board from 4 of these, so more lines means more variety.

**Ordinary group (classic, level 1):**
```js
N('Fuels', 'Petrol', 'Diesel', 'Kerosene', 'Ethanol')
```

**Fusion chain (2 or more levels):**
```js
N('Transportation',
  N('Car', 'Ford', 'Toyota', 'Honda', 'BMW'),   // level 1: these 4 words fuse into "Car"
  'Boat', 'Plane', 'Train')                      // level 2: Car + these 3 words fuse into "Transportation"
```

Nest groups inside groups to go deeper. The board builder never puts the same word or group name on a board twice.
The game checks `puzzles.js` when it starts and tells you in the log if a group does not have exactly 4 children or a word is repeated.
How many ordinary groups and chains each difficulty uses is set in `LEVEL_SPECS` near the bottom of `puzzles.js`.

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
