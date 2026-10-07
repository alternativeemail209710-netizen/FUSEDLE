# FUSEDLE Live (TikTok LIVE) - 7 Difficulty Levels, 8 Groups per Round, 24 Tiles on Screen

This folder is the complete, finished app. You do not need to edit any code.

> **v8.7 - four new difficulty levels: Very Hard, Extreme, Extremely Hard, Insane**
> - **Level 4 (Very Hard):** 3 fusion levels. **Level 5 (Extreme):** 4 fusion levels. **Level 6 (Extremely Hard):** 5 fusion levels. **Level 7 (Insane):** 6 fusion levels. Every level still has **8 groups per round** and **24 tiles on screen at a time**.
> - A "fusion level" is a fused tile that is made on the way to the finished group (Hard = up to 2, as before). So a Level 4 group is fused 4 times (13 tiles), Level 5 five times (16 tiles), Level 6 six times (19 tiles) and Level 7 seven times (22 tiles). A full round has 104 / 128 / 152 / 176 tiles.
> - **Pick the level** with the difficulty button in the top toolbar (now 1 to 7: green, lime, amber, orange, red, dark red, purple) or in **Settings > Game rules > Difficulty level**. Changing the level starts a new game at once.
> - **Legends explain every level.** The legend row under the floating guesses now has a heading for the current difficulty (for example "Level 6 (Extremely Hard): 5 fusion levels") and one colour chip for **each fusion level that can appear on that difficulty** (none on Easy, 1 on Moderate, up to 6 on Insane). Each chip says how many times the tile has been fused and whether it can fuse again or only needs 3 more tiles to finish the group. With 3, 5 or 6 chips the legend switches to a compact 3-column layout so it still fits on a phone.
> - **Six fused-tile colours.** Settings > *Fused tile colours* now has Levels 1 to 6 (defaults: Teal, Burgundy, Royal Blue, Orange, Violet, Lime). Levels 2 to 6 also get a different inner ring (solid, dashed, dotted, double, thick double) so levels differ by more than colour. *Tile text* (words inside fused tiles) and *Fused colour legend* (your own legend texts) have a switch / box for every level 1 to 6. Colours, texts and switches are saved on the device and included in Export / Import settings.
> - **New puzzle content: 40 deep chains** in the new `packs-deep/` folder (`01-deep-chains.js`). Each chain is a ladder of 7 fusions; Level 4 uses its bottom 4 fusions, Level 5 the bottom 5, Level 6 the bottom 6 and Level 7 all 7. Deep rounds always pick 8 different chains with no repeated word, give up to about 76 million different boards, and never repeat a board until all have been played. Add your own by copying a chain (see "Adding deep chains" below). The Puzzle Pack choice does not apply to Levels 4 to 7 (no single theme has 8 chains), so those rounds are always "Mixed Board".
> - Files changed: `puzzles.js`, `server.js`, `public/client.js`, `public/index.html`, `public/style.css`, `package.json`, `README.md`, `scripts/count-rounds.js`; new folder `packs-deep/`. Levels 1 to 3 and everything else work exactly as before.

> **v8.3 - bigger tile numbers, fused-colour legends, live chat box**
> - **Bigger, clearer tile numbers.** The number badge is now 24px (was 15-17px) in a clear Verdana-style font. Every tile measures its own width and height, so the number always stays **inside the tile border** and the word **never overlaps it**. A long word first gets slightly smaller letters; a very long word such as "Paddleboarding" moves the number above the word so it still reads well.
> - **Settings > Tile & display options > Tile numbers:** size (70-150%), font (Clear / Standard / Rounded / Serif / Typewriter), shape (circle, rounded square, square, none), extra bold, white ring, digit colour and background colour (Automatic or 7 / 13 swatches).
> - **Two legends under the tiles** explain the **Level 1** and **Level 2** fused colours (what they mean and that those tiles are still usable). The legend colours are read from Settings > Fused tile colours, so they always match the tiles. Settings > *Fused colour legend* turns them off and lets you change both texts.
> - **Live chat box under the tiles.** Every TikTok comment (and every Test-mode bot or Host console message) appears with the viewer photo, plus a tag showing the result of a number guess (fused / one away / wrong). The box has a message field so you can type from the page (a message such as `2 5 8 12` counts as a guess, like TikTok chat). **Hide/Show** button on the box; Settings > *Live chat box* sets height, text size, font, text and background colour, photos, guesses on/off, message box on/off, your chat name and **Clear the chat**. Hidden viewer names (Settings > Viewer names) also apply in the chat.
> - Files changed: `server.js` (chat log + `chat:send`), `public/client.js`, `public/index.html`, `public/style.css`. The first time v8.3 loads on a device the old "centre words on the whole tile" layout is switched off once, to give the larger numbers room (you can switch it back on).

> **v8.2 - 38 new themes (46 in total), over 9 million new rounds**
> - **38 new Puzzle Packs** across many subjects: *Physics Lab, Chemistry Class, Biology Basics, Medicine & Health, Deep Space, Mathematics, Computer Corner, Online World, Robots & AI, Gadgets & Phones, Building Site, Factory Floor, Ancient World, Middle Ages, Modern History, Myths & Legends, World Beliefs, Explorers & Discovery, Books & Writing, Language & Words, Art Studio, Architecture, Movies & Cinema, Stage & Dance, Fashion & Style, TV & Media, Politics & Government, Law & Order, Business & Money, Learning & Education, Jobs & Careers, Mind & Emotions, Cooking Skills, World Cuisine, Garden & Plants, Hobbies & Crafts, Festivals & Parties, Environment & Climate.*
> - Each new theme has **12 three-level groups and 4 two-level groups** (608 new groups, 5,624 new starting words in total). Every word and group name is unique across the whole game, so no board can ever contain a clash.
> - **Every new theme on its own builds 245,025 different rounds** (about 9.3 million for the 38 new themes, one theme per round). Mixed rounds add far more. Run `npm run count-rounds` for the exact and estimated figures.
> - **New `packs/` folder:** every `.js` file in it is loaded automatically at start-up. To add your own theme, drop a new file in `packs/` (see "Adding your own puzzles").
> - The **Puzzle Pack** list in Settings now scrolls inside its own box because it is longer. The round counter was rewritten so it still finishes quickly with 46 themes. Files changed: `puzzles.js`, `scripts/count-rounds.js`, `public/style.css`, new `packs/` folder. Server and game rules are untouched.

> **v8.1 - more host customisation (new Settings boxes, all under Tile & display options)**
> - **Quick styles:** one tap sets many look options at once: *Standard* (all defaults), *Clean stream* (hides the chat-format line and counter, 3 leaderboard rows, no flames, no word line on cards), *Big & bold* (large rounded capital text, big number circles) and *Show details* (words inside fused tiles). Every option can still be changed afterwards.
> - **Branding & colours:** your own **game title** (up to 24 letters, also used as the browser tab title), your own **instruction line** under the title (up to 90 letters), an **accent colour** for buttons and chosen options (letters on it switch between dark and white by themselves), and the **highlight colour of a tapped tile**. Empty box / "theme default" = the built-in look.
> - **Hide viewer names:** type words separated by commas. Any viewer name that contains one of them shows as "Viewer" on your screen (leaderboards, guess pop-ups, chat feed, finished-group cards, round-end list). Capitals, spaces and symbols are ignored. It only changes what is shown; scores still count.
> - **Keep the screen on:** stops the phone from dimming or locking while you stream (needs a browser that supports it; a note appears if it does not).
> - All of these are saved on the device, included in **Export / Import settings**, and cleared by **Reset tile & display options**. Only `public/client.js`, `public/index.html` and `public/style.css` changed; server and puzzles are untouched.

> **v8.0 - finished group colours (new Settings box)**
> - Settings now has a **Finished group colours** box, right under *Fused tile colours*. It controls the cards that appear when a group is completely fused.
> - **Colour mode:** *Automatic* (the 8 soft pastels in order, as before), *Pick each card* (choose a colour for finished group 1 to 8 separately), or *One colour* (every card the same).
> - Tap a numbered chip, then tap one of 24 colours (soft pastels and stronger shades) or use **Custom colour** for any shade. Cards already on the screen change at once.
> - **Letters on the cards:** *Automatic* picks dark or white, whichever reads better on the colour; *Dark* and *White* force one.
> - Saved on this device, included in **Export / Import settings**, and **Reset finished group colours** brings the pastels back. The Peek tint is unchanged.
> - Files changed: `public/client.js`, `public/index.html`, `public/style.css` (server and puzzles untouched).

> **v7.9 - tiles stay put, mode button, TikTok connection window**
> - **Tiles no longer disappear after a wrong guess.** A tile that had dropped in or been fused kept its "arrive" animation for the whole round; when the red wrong-guess mark
>   ended, that animation played again from invisible, so the tile vanished for about a second. The arrive animation now plays once and is switched off.
> - **New Mode button in the top toolbar** (first button, shows the current mode). Pick **Offline**, **Test** or **Live**. A small dot on it shows the Live connection:
>   green = connected, amber = connecting, red = not connected.
> - **Choosing Live opens a floating TikTok connection window by itself.** Type your TikTok username (and your EulerStream key if the server has none), press **Connect**.
>   The window shows the result clearly: **Connected** (green, with the room ID and a comment counter), **Connecting**, **Retrying** (with a countdown), or **Failed** (red) with the
>   reason and what to do: not live yet, username not found, key rejected, rate limit, network problem, timed out. Tap the status line on the board any time to reopen it.
>   If the page opens in Live mode and nothing is connected, the window opens by itself. If the server connects on start (both Render variables set) it stays out of the way.
> - **Connector fixes behind it:** the quick retries after a failed first attempt never actually ran (the status stayed on "Retry 1 of 3" forever), an empty username could crash
>   the connector and block every later Connect, and a Connect that never answered stayed on "Connecting..." forever (now a clear timeout after 25 seconds).
>   A wrong key or an unknown username now stops with a clear message instead of retrying again and again.

> **v7.8 - host customisation (new Settings boxes)**
> - **Words inside fused tiles can be hidden.** Settings > *Tile & display options* > *Tile text* has one switch for **Level 1** tiles (e.g. "Car") and one for
>   **Level 2** tiles (e.g. "Land Transport"). Off (the default) = only the name is shown and it sits in the exact centre of the tile. On = the small
>   "Ford - Toyota - Honda - BMW" line appears under the name. Three sample tiles at the top of the box show the result at once.
> - **Words are centred on the whole tile.** The number circle now floats at the left edge and the word is centred on the full tile (switch: *Centre words on the whole tile*).
>   A very long word such as "Paddleboarding" would become tiny if it had to stay centred, so by default that one tile uses the wider layout (switch: *Give very long words extra room*).
> - **Words never get cut off.** Tile text is now sized from the real width of the longest word in the chosen font (before, about 13 words such as "Mammoth" or "Lemonade" were clipped on a 390px phone).
> - **More look options (saved on this device, change at once):** text size 70-125%, font (Standard / Rounded / Serif / Typewriter), CAPITAL LETTERS, tile corners, number-circle size;
>   finished-group cards (show or hide the 4 words, viewer name, viewer photo); screen items (Chat format line, fusions counter, timer, both leaderboards, leaderboard rows 3 or 5,
>   guess pop-ups, streak flames, animations); **sound effects** with volume; **Export / Import settings** file and a reset button.
> - **Game rules box (shared by every screen):** groups per round (1-8) and how many are 2-level, combo streak on/off and its biggest multiplier (1-10),
>   "one away" message on/off, bonus points for finishing a group, and a guess cooldown per viewer (the host is never limited).
>   Scoring rules work at once; the round shape is used from the next game. *Save & Apply as Default* also remembers the rules.

> **v7.7.1 - theme menu fix:** the theme (round colour button) menu was opening partly off the right edge of the phone, so names were cut off and it covered
> the right side of the board. It is now placed under the button, always fully inside the screen, and scrolls inside itself on short phones.
> The numbers in the "Chat format" line also use the phone's own monospace font, so they are no longer tiny on Android.

> **v7.7 - fused tile colours:** Settings has a new **Fused tile colours** box. Level 1 fused tiles (e.g. "Car") and level 2 fused tiles
> (e.g. "Land Transport") each get their own colour, chosen from 18 shades or any custom colour, or "same as other tiles" to switch it off.
> Defaults are Teal (level 1) and Burgundy (level 2), so fused tiles stand out from tiles that are still waiting. Level 2 also has a thin inner ring,
> so the two levels differ by more than colour. Letters switch between dark and white automatically (at least 4.5:1 on every palette colour).
> The choice is saved on the device.

> **v7.6 - phone fit + dark-theme readability**
> - The game area now sizes itself to the phone: tile rows (54px down to 32px) and the finished-group cards (normal, slim, or two per row) shrink only as far as needed, so the status row, tiles, both leaderboards and the console all stay on screen from 360x640 phones up. Only a very short phone (about 320x568) with many finished groups may scroll inside the game box.
> - The status line keeps the timer fully visible (long words are dropped on narrow screens), and the Offline guess bar is now one slim row.
> - Night Wool and Dark: every text colour is at least 4.5:1 against its real background. A tapped tile is now bright cream with dark letters, and plain (non-yarn) tiles use light letters. Light themes got small contrast fixes too.

**How the game works:** a board of numbered word tiles. Viewers type **four tile numbers** in chat, like `2 5 8 12`.
If all four belong together they are **destroyed and fuse into ONE brand-new tile** with a **new number**. That is the classic game.

On top of it, the new tile is a real tile that can be used again in the next fusion. **Every round has exactly 8 separate groups (no chains of groups).**
Each group is either a **2-level fusion** (7 starting tiles) or a **3-level fusion** (10 starting tiles).

> **Example (2-level group, 7 tiles)**
> - Level 1: viewers type the numbers of **Ford, Toyota, Honda, BMW**. Those 4 tiles vanish and one new tile **"Car"** appears with the next free number (for example 25).
> - Level 2: **Car (63) + Bus + Tram + Bicycle** fuse into the finished group **"Land Transport"**.
>
> **Example (3-level group, 10 tiles)**
> - Level 1: **Ford, Toyota, Honda, BMW** fuse into **"Car"**.
> - Level 2: **Car + Bus + Tram + Bicycle** fuse into **"Land Transport"**.
> - Level 3: **Land Transport + Boat + Plane + Rocket** fuse into the finished group **"Transport"**.
>
> You cannot skip ahead: "Car" does not exist until the car brands are fused. Trying it early shows "one away" or "not on the board".

> **Phone screen fit:** the page is exactly one phone screen tall. The "Chat format" line stays at the top, and both leaderboards (top 5 each) stay
> under the game, with the host console at the very bottom. **Tiles always keep their full size.** When tiles fuse, the remaining tiles move up to fill
> the empty spaces, so the board only uses the rows it needs. Every finished group has its own row. If a phone is too short to show everything at once,
> only the game area (finished groups + tiles) scrolls inside its own box; the top line and leaderboards never move.

> **Finished-group colors:** soft pastel colors (pink, sage, lavender, butter, peach, sky, latte, periwinkle) with dark text. Every card keeps at least an 8:1 contrast ratio, so the letters stay easy to read. Each finished group gets the next color in order.

> **Knitting look (learned from WORD SHUFFLE):** the whole game is knitted. The page is a knitted-fabric background, the toolbar buttons are round yarn balls
> with a stitch ring, the other buttons are yarn pills, every box has a stitched (dashed) edge, and the tiles are balls of multicolour wool with dark
> letters. Pick a theme with the round colour button in the top bar (or in Settings): 7 **Wool** themes (Cream, Sky Blue, Meadow Green, Blossom Pink,
> Lavender, Honey Gold and a dark Night Wool) have the knitted background, and the 8 original themes keep their colours with a plain background.
> The default is Cream Wool. Settings has a switch for the multicolour yarn tiles (Off = one plain wool colour). Sizes and positions are unchanged.

**When a group is completely finished** it shows as one small card: the category name, the viewer who fused it (their round TikTok
photo and name) and only the **4 latest words** that made it. Each card takes one row of its own and stays small, so the unsolved tiles and
the leaderboards stay on the screen. If the host used Reveal, the card says "Host reveal".

> **Before you go live:** in the TikTok app open LIVE settings, then **Comments > Filtered**, and turn **OFF**
> the **Spam filter** and **Potentially unkind words**. TikTok can quietly hide short number comments.

## Difficulty levels (7 levels since 8.7)

Choose the level with the **difficulty button in the top toolbar** (the coloured number next to the mode button) or in **Settings > Game rules > Difficulty level**. Changing the level starts a new game at once (it asks first if a round is in progress). Every level has 8 groups per round and 24 tiles on screen at a time.

| Level | Name | What a round has | Tiles |
| --- | --- | --- | --- |
| 1 | Easy | No fusion level: 8 groups of 4 words each, one fusion finishes a group | 32 |
| 2 | Moderate | 1 fusion level: 8 groups, each makes one fused tile that then finishes the group | 56 |
| 3 | Hard | Up to 2 fusion levels: 4 groups with 1 and 4 groups with 2 (the original game, still the default) | 68 |
| 4 | Very Hard | 3 fusion levels: every group is fused 4 times | 104 |
| 5 | Extreme | 4 fusion levels: every group is fused 5 times | 128 |
| 6 | Extremely Hard | 5 fusion levels: every group is fused 6 times | 152 |
| 7 | Insane | 6 fusion levels: every group is fused 7 times | 176 |

The colour legends only show the fusion levels that can appear: none on Easy, "fused once" on Moderate, Levels 1-2 on Hard, 1-3 on Very Hard, 1-4 on Extreme, 1-5 on Extremely Hard and 1-6 on Insane. Easy and Moderate rounds are cut from the groups already in the packs, so adding your own puzzles still works the same way. Levels 4 to 7 use the deep chains in `packs-deep/`.

## What is new in 8.4

- **Legends** now sit in their own row directly under the floating guesses, above the game, so they never overlap anything.
- **Live chat** now sits under the leaderboards.
- **Settings > Live chat box**: *Chat lines visible* (1 to 12) sets how many lines the chat shows, and *Messages kept in the chat* (last 10 to 80) sets how many recent messages stay in it.
- **Any text** shows in the chat: letters in any language, symbols, emojis, emoticons such as :) and the shrug face, and TikTok emotes (small pictures). Long emojis are never cut in half, and comments that contain only emotes now show too.

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
- **Mode button (toolbar):** switch **Offline**, **Test** or **Live**; Live opens the TikTok connection window.
- **Settings (gear):** theme (8 looks), Fused tile colours, Finished group colours, Tile & display options (Quick styles, Branding & colours, Viewer names & screen), Game rules, mode (**Offline**, **Test**, **Live**), TikTok connection window, Puzzle Pack,
  Hints and Reveals, Reset Scores, Auto Next Game, Timing, and Save & Apply as Default.
- **Modes:** *Offline* = you play alone with the Player Guess Bar (tap 4 tiles or type them). *Test* = fake
  viewers (turn on **Auto-Play Bots**) so you can rehearse. *Live* = real TikTok chat counts.
- **Default build (Level 3 Hard):** by default every round has **8 groups**: **4 two-level** groups (7 tiles each) and
  **4 three-level** groups (10 tiles each), so **68 tiles** and **20 fusions** in total. (Settings > Game rules can change the number of groups and the 2-level / 3-level mix.)
  **Only 24 tiles (4 columns x 6 rows) are on the screen at any moment.** When viewers fuse a group, 4 tiles disappear and 1 new fused tile
  takes the first freed space; the other freed spaces are filled by **new tiles dropping in** from the waiting pile, until every tile of
  the round has appeared and all 8 groups are discovered. The counter above the board shows how many tiles are still to come.
  The words of one group arrive lowest level first (for example the 4 car brands before Bus, Tram, Bicycle), and the game guarantees
  the full board always contains at least one group that can be fused, so a round can never get stuck.
  Tile numbers keep counting up (1, 2, 3 ... as tiles appear) and are never reused, so a late chat message can never hit the wrong tile.

- **Tiles:** every tile has its number in a gray circle on the left (6 shades of gray, white ring, never over the word). Fused tiles have the same colour as every other tile (no colour per level); they show their new number and what is inside them. The last fusion of a group becomes its finished card.
- **Toolbar:** new game, leaderboard, **Hint** (names one group you can fuse right now), **Peek** (tints tiles by group for
  a few seconds), **Reveal 1 Fusion**, theme, full screen, settings. Nobody earns points from hints or reveals.
- **Scoring:** every fusion is worth **1 point**, whatever its fusion level. Extra points come only from the streak combo:
  1st fusion in a row = 1 point, 2nd = 2, 3rd = 3, 4th and beyond = 4. A wrong guess resets the streak. There is a This Round and an All-Time board.
  (Change the base 1 in Settings > Timing.)
- **Viewer photos:** real TikTok profile pictures show in circles next to names in Live mode.
- **Host Console** at the bottom lets you type guesses yourself. Tap **Hide** to hide it.
- **Puzzle Pack:** 46 themes (the 8 original ones: Getting Around, Animal Kingdom, Food & Drink, Music Room, Game On, Around Town, Planet Earth, Home & Body, plus the 38 new ones listed in the v8.2 note) or Mixed.
  Each original theme has 8 three-level groups and 4 two-level groups; each new theme has 12 and 4 (the middle part of every 3-level group can also be used as a 2-level group). Every fusion is a plain "kind of / part of" link made from everyday words.
  Mixed pulls groups from all themes. No word or group name ever repeats in one round.

## How many different rounds are there?
Run `npm run count-rounds` for the numbers. A round is a set of 8 groups; two rounds differ when their set of groups differs.
- Each of the 38 new themes alone builds **245,025** different rounds (exact count), about **9.3 million** in total for the new themes one theme per round.
- Rounds that mix several themes are counted by sampling and run into the billions of billions, so you will not run out.
- The game remembers the boards it has played (file `played-boards.json`, saved next to the all-time scores) and never repeats an exact board until all of them have been played.

## Adding your own puzzles
**Easiest way:** create a new file in the `packs/` folder (copy `packs/07-lifestyle-world.js` as a template). It exports a function that returns a list of packs; the `T(...)` and `D(...)` helpers are passed in. Files load in alphabetical order. You can also edit `puzzles.js` directly. Good groups: all 4 pieces clearly belong to the new tile's name, with everyday words and no piece that also fits another group. Every group has **exactly 4 children**. Words are written in one string, separated by commas (a word may contain spaces).
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
so that a round can be built from a single theme. The mix for the round is `BOARD` near the bottom of `puzzles.js`
(`two` = number of 2-level groups, `three` = number of 3-level groups; they must add up to 8). The 24-tile screen size is `COLS` and `ROWS` at the top of `server.js`.

## Adding deep chains (Levels 4 to 7)
Create a new `.js` file in `packs-deep/` (or add lines to `01-deep-chains.js`). A chain is 7 lines read from the bottom up: the first line has **4 words**, every later line has **3 words** and the previous line's tile fuses with them:
```js
L('Getting Around',
  'Supercar: Ferrari,Lamborghini,McLaren,Bugatti',      // 4 words -> "Supercar"
  'Passenger Car: Saloon,Hatchback,Estate',              // "Supercar" + 3 words -> "Passenger Car"
  'Motor Vehicle: Lorry,Motorbike,Minibus',              // ... -> "Motor Vehicle"
  'Wheeled Vehicle: Skateboard,Pushchair,Wheelchair',
  'Land Travel: Hiking,Horse Riding,Dog Sledding',
  'Journey: Sea Voyage,Air Flight,Space Mission',
  'Travel: Tourism,Commuting,Migration')                 // finished group on Level 7
```
Every step must be a plain "kind of / part of / example of" link, and every word and name must be unique across all chains (the game checks this at start-up). You need at least 8 chains. Each level is cut from the bottom of the chain: Level 4 stops at the 4th line ("Wheeled Vehicle"), Level 5 at the 5th, Level 6 at the 6th and Level 7 uses all 7.

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
