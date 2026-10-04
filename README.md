# FUSEDLE Live (TikTok LIVE) - 8 Groups per Board, 2-Level and 3-Level Fusion

This folder is the complete, finished app. You do not need to edit any code.

**How the game works:** a board of numbered word tiles. Viewers type **four tile numbers** in chat, like `2 5 8 12`.
If all four belong together they are **destroyed and fuse into ONE brand-new tile** with a **new number**. That is the classic game.

On top of it, the new tile is a real tile that can be used again in the next fusion. **Every board has exactly 8 separate groups (no chains of groups).**
Each group is either a **2-level fusion** (7 starting tiles) or a **3-level fusion** (10 starting tiles). Harder difficulties simply have more 3-level groups.

> **Example (2-level group, 7 tiles)**
> - Level 1: viewers type the numbers of **Ford, Toyota, Honda, BMW**. Those 4 tiles vanish and one new tile **"Car"** appears with the next free number (for example 63).
> - Level 2: **Car (63) + Bus + Tram + Bicycle** fuse into the finished group **"Land Transport"**.
>
> **Example (3-level group, 10 tiles)**
> - Level 1: **Ford, Toyota, Honda, BMW** fuse into **"Car"**.
> - Level 2: **Car + Bus + Tram + Bicycle** fuse into **"Land Transport"**.
> - Level 3: **Land Transport + Boat + Plane + Rocket** fuse into the finished group **"Transport"**.
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
- **Difficulty** (pick a level from the toolbar badge, then tap the refresh button to start a new game). **Every level has exactly 8 groups.**
  Only the mix of 2-level groups (7 tiles each) and 3-level groups (10 tiles each) changes:

  | Level | Name    | 2-level groups | 3-level groups | Groups | Tiles at the start | Board (4 columns) | Fusions to finish |
  |-------|---------|----------------|----------------|--------|--------------------|-------------------|-------------------|
  | 1     | Warmup  | 8              | 0              | 8      | 56                 | 14 rows           | 16                |
  | 2     | Easy    | 6              | 2              | 8      | 62                 | 16 rows           | 18                |
  | 3     | Medium  | 4              | 4              | 8      | 68                 | 17 rows           | 20                |
  | 4     | Hard    | 2              | 6              | 8      | 74                 | 19 rows           | 22                |
  | 5     | Chaos   | 0              | 8              | 8      | 80                 | 20 rows           | 24                |

  The board scrolls on a phone. The round ends when all 8 groups are finished.

- **Tiles:** every tile has its number in a gray circle on the left (6 shades of gray, white ring, never over the word). Fused tiles are coloured by level (teal, violet, gold), show their new number and what is inside them. The last fusion of a group becomes its finished card.
- **Toolbar:** difficulty, new game, leaderboard, **Hint** (names one group you can fuse right now), **Peek** (tints tiles by group for
  a few seconds), **Reveal 1 Fusion**, theme, full screen, settings. Nobody earns points from hints or reveals.
- **Scoring:** points per fusion = **10 x fusion level x combo**. A level-1 fusion is worth 10, level 2 is worth 20, level 3 is worth 30.
  Fuse back-to-back for a combo: 1x, 2x, 3x, then 4x. A wrong guess resets the streak. There is a This Round and an All-Time board.
  (Change the base 10 in Settings > Timing.)
- **Viewer photos:** real TikTok profile pictures show in circles next to names in Live mode.
- **Host Console** at the bottom lets you type guesses yourself. Tap **Hide** to hide it.
- **Puzzle Pack:** 6 themes (Getting Around, Animal Kingdom, Food & Drink, Music Room, Game On, Around Town) or Mixed.
  Each theme has 10 three-level groups and 4 two-level groups (the middle part of every 3-level group can also be used as a 2-level group).
  Mixed pulls groups from all themes. No word or group name ever repeats on one board.

## Adding your own puzzles
Open `puzzles.js`. Every group has **exactly 4 children**. Words are written in one string, separated by commas (a word may contain spaces).
Add lines inside a pack's `three: [ ... ]` list (3-level groups) or `two: [ ... ]` list (2-level groups).

**2-level group (7 tiles):**
```js
D('Top name', 'Sub name', 'word1,word2,word3,word4', 'word5,word6,word7')
//  word1-4 fuse into "Sub name"; then "Sub name" + word5-7 fuse into "Top name"
```

**3-level group (10 tiles):**
```js
T('Transport', 'Land Transport', 'Car', 'Ford,Toyota,Honda,BMW', 'Bus,Tram,Bicycle', 'Boat,Plane,Rocket')
//  Ford+Toyota+Honda+BMW -> "Car"; "Car"+Bus+Tram+Bicycle -> "Land Transport"; "Land Transport"+Boat+Plane+Rocket -> "Transport"
```

**Rules the game checks when it starts** (it tells you in the log if one is broken): every group has 4 children, a `T(...)` has 10 words,
a `D(...)` has 7 words, and **no word or group name is used twice anywhere in the file**. Each pack needs at least 8 three-level groups
so that Chaos can be built from a single theme. The mix per difficulty is in `LEVEL_SPECS` near the bottom of `puzzles.js`
(`two` = number of 2-level groups, `three` = number of 3-level groups; they must add up to 8).

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
