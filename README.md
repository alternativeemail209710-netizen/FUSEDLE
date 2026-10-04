# FUSEDLE Live (TikTok LIVE) - Multi-Level Fusion

This folder is the complete, finished app. You do not need to edit any code.

**How the game works:** a board of numbered word tiles. Viewers type **four tile numbers** in chat, like `2 5 8 12`.
If all four belong together they are **destroyed and fuse into ONE brand-new tile** with a **new number**.
That new tile is a real tile: it can be used again in the next fusion. Chains go 2, 3 or even 4 levels deep.

> **Example (2 levels)**
> - Level 1: viewers type the numbers of **Ford, Toyota, Honda, BMW**. Those 4 tiles vanish and one new tile **"Car"** appears with the next free number (for example 17).
> - Level 2: viewers now fuse **Car (17) + Boat + Plane + Train** into the final group **"Transportation"**.
>
> You cannot skip ahead: "Car" does not exist until the car brands are fused, so Car + Boat + Plane + Train
> only works after level 1. Trying it early shows "one away" or "not on the board".

Deeper puzzles exist too, for example **Mammal -> Vertebrate -> Animal -> Life on Earth** (4 levels).
When a chain is finished it is shown as nested boxes, with the final group on the outside and the original words in the middle.

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
- **Difficulty** (pick a level from the toolbar badge, then tap the refresh button to start a new game):

  | Level | Name   | Fusion levels | Tiles at the start |
  |-------|--------|---------------|--------------------|
  | 1     | Warmup | 2             | 7                  |
  | 2     | Easy   | 2             | 10                 |
  | 3     | Medium | 3             | 10                 |
  | 4     | Hard   | 3 or 4        | 13 to 22           |
  | 5     | Chaos  | 2 or 3 different chains mixed on one board | 20 to 29 |

- **Fused tiles** are coloured by level (L1 teal, L2 violet, L3 gold, L4 pink), show their new number and what is inside them.
- **Toolbar:** difficulty, new game, leaderboard, **Hint** (names one group you can fuse right now), **Peek** (tints tiles by group for
  a few seconds), **Reveal 1 Fusion**, theme, full screen, settings. Nobody earns points from hints or reveals.
- **Scoring:** points per fusion = **10 x fusion level x combo**. A level-1 fusion is worth 10, level 2 is worth 20, level 3 is worth 30.
  Fuse back-to-back for a combo: 1x, 2x, 3x, then 4x. A wrong guess resets the streak. There is a This Round and an All-Time board.
  (Change the base 10 in Settings > Timing.)
- **Viewer photos:** real TikTok profile pictures show in circles next to names in Live mode.
- **Host Console** at the bottom lets you type guesses yourself. Tap **Hide** to hide it.
- **Puzzle Pack:** 6 themes (Getting Around, Animal Kingdom, Food & Drink, Music Room, Game On, Around Town) or Mixed.
  Each theme has a puzzle for every difficulty level.

## Adding your own puzzles
Open `puzzles.js`. A puzzle is a tree. Every group has **exactly 4 children**, and a child is either a word or another group:

```js
N('Transportation',
  N('Car', 'Ford', 'Toyota', 'Honda', 'BMW'),   // level 1: these 4 words fuse into "Car"
  'Boat', 'Plane', 'Train')                      // level 2: Car + these 3 words fuse into "Transportation"
```

Nest groups inside groups to go deeper. Add the line inside a pack's `trees: [ ... ]` list. The game checks `puzzles.js` when it
starts and tells you in the log if a group does not have exactly 4 children or a word is repeated.

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
