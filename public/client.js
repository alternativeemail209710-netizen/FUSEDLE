(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const socket = io();
  let S = null;                 // latest game state
  let cfg = { hasDefaultSignApiKey: false, defaultUsername: '', packs: [] };
  let lb = { round: [], allTime: [] };
  let selected = [];            // tiles tapped in the guess bar
  let appliedDefaults = false;
  let lbTab = 'round';

  // ---- Device-saved preferences ------------------------------------------
  const TIMING_DEFAULTS = { toastSeconds: 4, roundWindowSeconds: 8, allTimeWindowSeconds: 8 };
  const timingPrefs = Object.assign({}, TIMING_DEFAULTS, readJson('fusedle-timing'));
  function readJson(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } }
  function writeJson(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }

  // The 7 difficulty levels (fusionLevels = fused tiles a group passes through; fusions = fusions needed to finish a group on Levels 4 to 7)
  const LEVEL_INFO = {
    1: { name: 'Easy', note: 'no fusion level', fusionLevels: 0, fusions: 1 },
    2: { name: 'Moderate', note: '1 fusion level', fusionLevels: 1, fusions: 2 },
    3: { name: 'Hard', note: 'up to 2 fusion levels', fusionLevels: 2, fusions: 3 },
    4: { name: 'Very Hard', note: '3 fusion levels', fusionLevels: 3, fusions: 4 },
    5: { name: 'Extreme', note: '4 fusion levels', fusionLevels: 4, fusions: 5 },
    6: { name: 'Extremely Hard', note: '5 fusion levels', fusionLevels: 5, fusions: 6 },
    7: { name: 'Insane', note: '6 fusion levels', fusionLevels: 6, fusions: 7 }
  };
  // Fusion levels: a fused tile has a level 1 to 6 (how many times it has been fused on the way to the finished group).
  const FUSED_LEVELS = [1, 2, 3, 4, 5, 6];
  const TIMES_WORD = { 1: 'once', 2: 'twice', 3: '3 times', 4: '4 times', 5: '5 times', 6: '6 times' };
  // Built-in legend text for fusion level k. `last` = the highest fusion level on this difficulty (its tile only needs 3 more tiles to finish the group).
  function legendDefault(k, last, compact) {
    if (compact) return last ? 'Add 3 more to finish.' : 'Add 3 more tiles.';
    return 'Fused ' + TIMES_WORD[k] + '. ' + (last ? 'Add 3 more tiles to finish the group.' : 'Still usable: add 3 more tiles to fuse again.');
  }

  // ---- Themes -------------------------------------------------------------
  const KNIT_THEMES = { knit_cream: 'Cream Wool', knit_blue: 'Sky Blue Wool', knit_green: 'Meadow Green Wool', knit_pink: 'Blossom Pink Wool', knit_violet: 'Lavender Wool', knit_honey: 'Honey Gold Wool', knit_night: 'Night Wool (dark)' };
  const THEMES = Object.assign({}, KNIT_THEMES, { dark: 'Dark', light: 'Light', cream: 'Cream', sky: 'Sky Blue', meadow: 'Meadow Green', blossom: 'Blossom Pink', lavender: 'Lavender Violet', honey: 'Honey Gold' });
  const DEFAULT_THEME = 'knit_cream';
  function applyTheme(t) {
    if (!THEMES[t]) t = DEFAULT_THEME;
    const root = document.documentElement;
    root.setAttribute('data-theme', t);
    root.classList.toggle('knit-bg', !!KNIT_THEMES[t]);   // wool themes = knitted fabric background; original themes = plain colour
    try { localStorage.setItem('fusedle-theme', t); } catch (e) { /* ignore */ }
    $('themeDropdownIcon').className = 'theme-swatch swatch-' + t;
    $('themeDropdownBtn').title = 'Theme: ' + THEMES[t]; $('themeDropdownBtn').setAttribute('aria-label', 'Theme: ' + THEMES[t]);
    document.querySelectorAll('#themeDropdownMenu li[data-value]').forEach((li) => {
      const on = li.dataset.value === t; li.classList.toggle('dd-active', on); li.setAttribute('aria-selected', on);
    });
    document.querySelectorAll('.theme-choice-btn').forEach((b) => b.classList.toggle('active', b.dataset.themeChoice === t));
  }
  const currentTheme = () => document.documentElement.getAttribute('data-theme') || DEFAULT_THEME;
  // first time with the knitting version: the old saved theme is dropped once, so the knitting look shows up
  try {
    if (localStorage.getItem('fusedle-knit-v') !== '1') {
      localStorage.removeItem('fusedle-theme');
      const d = readJson('fusedle-defaults'); if (d && d.theme) { delete d.theme; writeJson('fusedle-defaults', d); }
      localStorage.setItem('fusedle-knit-v', '1');
    }
  } catch (e) { /* ignore */ }
  applyTheme(localStorage.getItem('fusedle-theme') || DEFAULT_THEME);

  // multicolour yarn tiles (on/off, remembered on this device)
  function applyYarn(on) {
    document.documentElement.classList.toggle('yarn', !!on);
    const cb = $('yarnToggle'); if (cb) cb.checked = !!on;
    try { localStorage.setItem('fusedle-yarn', on ? '1' : '0'); } catch (e) { /* ignore */ }
  }
  applyYarn(localStorage.getItem('fusedle-yarn') !== '0');
  $('yarnToggle').addEventListener('change', (e) => applyYarn(e.target.checked));

  // ---- Fused tile colours (level 1 and level 2 can each get their own colour) ----
  const FUSED_PALETTE = [
    ['Teal', '#1F7A72'], ['Aqua', '#2EC4B6'], ['Sky', '#3A9AD9'], ['Royal Blue', '#2F5DA8'], ['Navy', '#1F3A5F'],
    ['Forest', '#2F6B3A'], ['Lime', '#9ACD32'], ['Gold', '#E8B100'], ['Orange', '#E8731A'], ['Red', '#D13438'],
    ['Burgundy', '#9B2C4F'], ['Hot Pink', '#E0457B'], ['Violet', '#5B3A9E'], ['Lilac', '#B79CE8'],
    ['Chocolate', '#5B3A21'], ['Charcoal', '#3A3F47'], ['Silver', '#CBD2D9'], ['White', '#FFFFFF']
  ];
  const FUSED_DEFAULTS = { 1: '#1F7A72', 2: '#9B2C4F', 3: '#2F5DA8', 4: '#E8731A', 5: '#5B3A9E', 6: '#9ACD32' };       // Teal, Burgundy, Royal Blue, Orange, Violet, Lime. 'none' = same as the other tiles
  const hexOk = (v) => /^#[0-9a-f]{6}$/i.test(String(v || ''));
  let fusedPrefs = (function () {
    const p = readJson('fusedle-fused'), o = {};
    FUSED_LEVELS.forEach((k) => { o[k] = (p[k] === 'none' || hexOk(p[k])) ? p[k] : FUSED_DEFAULTS[k]; });
    return o;
  })();
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgbToHex(c) { return '#' + c.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join(''); }
  function mixRgb(a, b, t) { return a.map((x, i) => x + (b[i] - x) * t); }
  function lum(c) { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); }
  function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  // Letters: dark or white, whichever reads better on this colour.
  // Dark letters sit on a slightly lighter gradient, white letters on a slightly darker one, so contrast never drops.
  function fusedStyle(hex) {
    const base = hexToRgb(hex), dark = [30, 20, 8], white = [255, 255, 255];
    const lightTop = mixRgb(base, white, 0.18), darkBot = mixRgb(base, [0, 0, 0], 0.14);
    const useDark = Math.min(contrast(base, dark), contrast(lightTop, dark)) >= Math.min(contrast(base, white), contrast(darkBot, white));
    const top = useDark ? lightTop : base, bot = useDark ? base : darkBot, edge = mixRgb(base, [0, 0, 0], 0.38);
    const inkRgb = useDark ? dark : white;
    return { b1: rgbToHex(top), b2: rgbToHex(bot), be: rgbToHex(edge), tx: useDark ? '#1E1408' : '#FFFFFF', ok: Math.min(contrast(top, inkRgb), contrast(bot, inkRgb)) };
  }
  function applyFusedColors() {
    const root = document.documentElement;
    FUSED_LEVELS.forEach((k) => {
      const v = fusedPrefs[k], on = hexOk(v);
      root.classList.toggle('fc' + k, on);
      if (on) {
        const st = fusedStyle(v);
        root.style.setProperty('--f' + k + '-b1', st.b1); root.style.setProperty('--f' + k + '-b2', st.b2);
        root.style.setProperty('--f' + k + '-be', st.be); root.style.setProperty('--f' + k + '-tx', st.tx);
      } else ['b1', 'b2', 'be', 'tx'].forEach((n) => root.style.removeProperty('--f' + k + '-' + n));
      const pv = $('fcPreview' + k);
      if (pv) { pv.classList.toggle('plain', !on); if (on) { const st = fusedStyle(v); pv.style.background = 'linear-gradient(' + st.b1 + ',' + st.b2 + ')'; pv.style.borderColor = st.be; pv.style.color = st.tx; } else { pv.style.background = ''; pv.style.borderColor = ''; pv.style.color = ''; } }
      const cp = $('fcCustom' + k); if (cp && on) cp.value = v.toLowerCase();
      document.querySelectorAll('#fcSwatches' + k + ' .fc-sw').forEach((b) => {
        const sel = (b.dataset.c === 'none' && v === 'none') || (hexOk(v) && b.dataset.c && b.dataset.c.toLowerCase() === v.toLowerCase());
        b.classList.toggle('active', !!sel); b.setAttribute('aria-checked', sel ? 'true' : 'false');
      });
    });
    writeJson('fusedle-fused', fusedPrefs);
    renderLegend();
  }
  function buildFusedPickers() {
    FUSED_LEVELS.forEach((k) => {
      const box = $('fcSwatches' + k); if (!box) return;
      const mkSw = (name, c) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'fc-sw' + (c === 'none' ? ' fc-none' : '');
        b.dataset.c = c; b.title = name; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', name);
        if (c !== 'none') b.style.background = c;
        b.addEventListener('click', () => { fusedPrefs[k] = c; applyFusedColors(); });
        box.appendChild(b);
      };
      mkSw('Same as other tiles', 'none');
      FUSED_PALETTE.forEach((p) => mkSw(p[0], p[1]));
      $('fcCustom' + k).addEventListener('input', (e) => { fusedPrefs[k] = e.target.value; applyFusedColors(); });
    });
    $('fcResetBtn').addEventListener('click', () => { fusedPrefs = Object.assign({}, FUSED_DEFAULTS); applyFusedColors(); });
    applyFusedColors();
  }
  buildFusedPickers();

  // ---- Finished-group card colours (each finished group card can get its own colour) ----
  // Modes: auto = the 8 soft pastels in order (default) | custom = pick a colour for each of the 8 cards | single = one colour for every card.
  const CARD_DEFAULT_COLORS = ['#F4B6C2', '#B7D9B0', '#CDB4E6', '#FFE29A', '#FFC4A3', '#A9D4EE', '#D9C3A5', '#B9BEF2'];
  const CARD_PALETTE = [
    ['Rose', '#F4B6C2'], ['Sage', '#B7D9B0'], ['Lavender', '#CDB4E6'], ['Butter', '#FFE29A'], ['Peach', '#FFC4A3'], ['Sky', '#A9D4EE'], ['Latte', '#D9C3A5'], ['Periwinkle', '#B9BEF2'],
    ['Mint', '#B8EBD0'], ['Coral', '#FF9E9E'], ['Lemon', '#FFF3A3'], ['Aqua', '#A6E6E3'], ['Blush', '#F7C6E0'], ['Silver', '#CBD2D9'],
    ['Teal', '#1F7A72'], ['Burgundy', '#9B2C4F'], ['Royal Blue', '#2F5DA8'], ['Forest', '#2F6B3A'], ['Gold', '#E8B100'], ['Orange', '#E8731A'],
    ['Violet', '#5B3A9E'], ['Charcoal', '#3A3F47'], ['Chocolate', '#5B3A21'], ['White', '#FFFFFF']
  ];
  const CARD_DARK_INK = '#2a2231';
  function cardCleanPrefs(p) {
    p = p || {};
    return {
      mode: ['auto', 'custom', 'single'].indexOf(p.mode) >= 0 ? p.mode : 'auto',
      slots: CARD_DEFAULT_COLORS.map((d, i) => (p.slots && hexOk(p.slots[i])) ? p.slots[i] : d),
      single: hexOk(p.single) ? p.single : CARD_DEFAULT_COLORS[0],
      text: ['auto', 'dark', 'white'].indexOf(p.text) >= 0 ? p.text : 'auto'
    };
  }
  let cardPrefs = cardCleanPrefs(readJson('fusedle-cards'));
  let cardSel = 0;
  function cardColorFor(idx) {
    const i = Math.abs(Number(idx) || 0) % CARD_DEFAULT_COLORS.length;
    if (cardPrefs.mode === 'single') return cardPrefs.single;
    if (cardPrefs.mode === 'custom') return cardPrefs.slots[i];
    return CARD_DEFAULT_COLORS[i];
  }
  // Letters on a card: dark or white (whichever reads better) unless the host forces one.
  function cardInk(hex) {
    if (cardPrefs.text === 'dark') return CARD_DARK_INK;
    if (cardPrefs.text === 'white') return '#FFFFFF';
    const c = hexToRgb(hex);
    return contrast(c, [42, 34, 49]) >= contrast(c, [255, 255, 255]) ? CARD_DARK_INK : '#FFFFFF';
  }
  function styleCard(el, idx) { const c = cardColorFor(idx); el.style.setProperty('--gc', c); el.style.setProperty('--gc-tx', cardInk(c)); }
  function renderCardUi() {
    const m = cardPrefs.mode;
    document.querySelectorAll('#gcModes .gc-mode').forEach((b) => { const on = b.dataset.mode === m; b.classList.toggle('active', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
    document.querySelectorAll('#gcText .gc-mode').forEach((b) => { const on = b.dataset.text === cardPrefs.text; b.classList.toggle('active', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
    if (m === 'single') cardSel = 0;
    const box = $('gcSlots'); if (!box) return;
    box.innerHTML = '';
    const n = m === 'single' ? 1 : CARD_DEFAULT_COLORS.length;
    for (let i = 0; i < n; i++) {
      const c = cardColorFor(i), b = mk('button', 'gc-chip' + (m !== 'auto' && i === cardSel ? ' active' : ''), m === 'single' ? 'All' : String(i + 1));
      b.type = 'button'; b.style.background = c; b.style.color = cardInk(c); b.disabled = (m === 'auto');
      b.title = m === 'single' ? 'All finished groups' : 'Finished group ' + (i + 1);
      b.addEventListener('click', () => { cardSel = i; renderCardUi(); });
      box.appendChild(b);
    }
    $('gcEditor').hidden = (m === 'auto');
    if (m !== 'auto') {
      const cur = m === 'single' ? cardPrefs.single : cardPrefs.slots[cardSel];
      $('gcEditing').textContent = m === 'single' ? 'Colour for every finished group' : 'Colour for finished group ' + (cardSel + 1);
      document.querySelectorAll('#gcSwatches .fc-sw').forEach((b) => { const on = b.dataset.c.toLowerCase() === cur.toLowerCase(); b.classList.toggle('active', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
      $('gcCustom').value = cur.toLowerCase();
    }
    const note = $('gcNote'); if (note) note.hidden = (m !== 'custom');
  }
  function applyCardColors() {
    document.querySelectorAll('#solvedList .solved-card').forEach((el, i) => styleCard(el, i));   // cards already on screen change at once
    renderCardUi();
    writeJson('fusedle-cards', cardPrefs);
  }
  function setCardColor(c) {
    if (!hexOk(c)) return;
    if (cardPrefs.mode === 'single') cardPrefs.single = c; else if (cardPrefs.mode === 'custom') cardPrefs.slots[cardSel] = c;
    applyCardColors();
  }
  function buildCardPickers() {
    const sw = $('gcSwatches'); if (!sw) return;
    CARD_PALETTE.forEach((p) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'fc-sw'; b.dataset.c = p[1]; b.title = p[0];
      b.setAttribute('role', 'radio'); b.setAttribute('aria-label', p[0]); b.style.background = p[1];
      b.addEventListener('click', () => setCardColor(p[1]));
      sw.appendChild(b);
    });
    $('gcCustom').addEventListener('input', (e) => setCardColor(e.target.value));
    document.querySelectorAll('#gcModes .gc-mode').forEach((b) => b.addEventListener('click', () => { cardPrefs.mode = b.dataset.mode; applyCardColors(); }));
    document.querySelectorAll('#gcText .gc-mode').forEach((b) => b.addEventListener('click', () => { cardPrefs.text = b.dataset.text; applyCardColors(); }));
    $('gcResetBtn').addEventListener('click', () => { cardPrefs = cardCleanPrefs({}); cardSel = 0; applyCardColors(); });
    applyCardColors();
  }
  buildCardPickers();

  // ---- Tile & display options (saved on this device) ------------------------
  // Every option is a class or a variable on <html>; style.css (PART 19) does the rest.
  const DISPLAY_DEFAULTS = {
    sub1: false, sub2: false, sub3: false, sub4: false, sub5: false, sub6: false,   // show the words inside Level 1 to 6 fused tiles (off = name sits in the exact centre)
    center: false,                       // centre the word on the whole tile (number floats at the left edge). Off = word centred beside the (larger) number
    longWide: true,                      // a word that would get tiny when centred may use the wider layout (off = always centred, smaller)
    tsize: 100, font: 'system', upper: false, corner: 'soft',
    numSize: 100, numFont: 'clear', numShape: 'circle', numBold: true, numRing: true, numColor: '', numBg: '',   // tile number: size %, font, shape, digits colour ('' = automatic), background colour ('' = default)
    legendShow: true, legend1: '', legend2: '', legend3: '', legend4: '', legend5: '', legend6: '',            // the fused-colour legends (up to 6)
    chatShow: true, chatLines: 4, chatKeep: 40, chatSize: 100, chatFont: 'system', chatColor: '', chatBg: '', chatAvatar: true, chatGuesses: true, chatInput: true, chatName: '',   // live chat box
    cardWords: true, cardPlayer: true, cardAvatar: true,
    showChatFmt: true, showCounter: true, showTimer: true, showScores: true, sbRows: 5, showToasts: true, showStreak: true, anim: true,
    sound: false, volume: 60,
    title: '', hintText: '', accent: '', selColor: '', wake: false, blocked: '',   // host branding, colours, screen-awake, hidden viewer names
  };
  // Colour-emoji and symbol fonts, so every emoji / emoticon / symbol a viewer types has a font to draw it with.
  const EMOJI_FONTS = '"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji","Noto Sans Symbols","Noto Sans Symbols 2","Noto Sans CJK SC","Noto Sans Arabic",sans-serif';
  const FONT_STACKS = {
    system: 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
    clear: 'Verdana,"DejaVu Sans",Tahoma,"Segoe UI",system-ui,sans-serif',
    rounded: 'ui-rounded,"Nunito","Varela Round","Trebuchet MS",system-ui,sans-serif',
    serif: 'Georgia,"Times New Roman",serif',
    mono: 'ui-monospace,"Roboto Mono","SF Mono",Menlo,Consolas,monospace',
  };
  // Width of a word in "em" (1 = as wide as the font size), measured with the font the tile really uses.
  const measCtx = document.createElement('canvas').getContext('2d');
  function emWidth(word) {
    measCtx.font = '900 100px ' + (FONT_STACKS[displayPrefs.font] || FONT_STACKS.system);
    return measCtx.measureText(displayPrefs.upper ? String(word).toUpperCase() : String(word)).width / 100;
  }
  function longestEm(text) { return String(text || '').split(/\s+/).reduce((m, x) => (x ? Math.max(m, emWidth(x)) : m), 1.2); }
  const kFor = (text) => (1 / (longestEm(text) * 1.04)).toFixed(4);   // 4% safety margin
  // Re-measure every tile (after a font / number / size change, a resize, or a new board).
  // Each tile gets its OWN pixel font size and number size, worked out from the tile's real width and height, so that
  //   - the number sits fully inside the tile border,
  //   - the word never touches or hides under the number,
  //   - the word is never cut off (a very long word gets a slightly smaller number first, then smaller letters).
  const NUM_BASE = 24;   // px at 100%
  function fitTile(el) {
    if (el._w === undefined) return;
    const W = el.clientWidth, H = el.clientHeight; if (!W || !H) return;
    const d = displayPrefs, ts = d.tsize / 100;
    const text = String(el._w), words = text.split(/\s+/).filter(Boolean).length || 1;
    const emLong = longestEm(text), emAll = emWidth(text);
    const subEl = el.querySelector('.tile-sub'), subOn = !!(subEl && subEl.textContent && getComputedStyle(subEl).display !== 'none');
    const maxFs = Math.min(15 * ts, 20);
    const heightRoom = H - 6 - (subOn ? 11 : 0);
    function calc(bd, mode) {   // mode: 'side' (number beside the word, or centred word), 'wide' (centred layout fallback), 'stack' (number above the word)
      let avail, room = heightRoom;
      if (mode === 'stack') { avail = W - 14; room = H - 8 - bd - 3 - (subOn ? 11 : 0); }
      else avail = (d.center && mode !== 'wide') ? W - 2 * (bd + 8) - 4 : W - bd - 17;
      if (avail <= 4 || room <= 4) return { fs: 5, avail: 4 };
      let fs = Math.min(maxFs, avail / (emLong * 1.04));
      for (let i = 0; i < 3; i++) {                                   // two-word names may wrap onto 2 lines: keep them inside the height
        const lines = Math.min(words, Math.max(1, Math.ceil(emAll * fs * 1.04 / avail)));
        const byH = room / (lines * 1.1);
        if (fs <= byH) break; fs = byH;
      }
      return { fs: Math.max(5, fs), avail };
    }
    let bd = Math.max(14, Math.min(NUM_BASE * d.numSize / 100, H - 10)), mode = 'side', r = calc(bd, 'side');
    if (d.center && d.longWide && r.fs < 8.5) { const w2 = calc(bd, 'wide'); if (w2.fs > r.fs + 0.4) { mode = 'wide'; r = w2; } }
    if (r.fs < 8 && bd > 17) {                                       // long word: give it room by trimming the number a little (never below 16px)
      const bd2 = Math.max(16, Math.round(bd * 0.75)), r2 = calc(bd2, mode);
      if (r2.fs > r.fs + 0.3) { bd = bd2; r = r2; }
    }
    if (r.fs < 8.5 && H >= 34) {                                     // still tiny (e.g. "Paddleboarding"): number goes above the word, word gets the full tile width
      const bd3 = Math.max(16, Math.min(bd, 20)), r3 = calc(bd3, 'stack');
      if (r3.fs > r.fs + 0.6) { mode = 'stack'; bd = bd3; r = r3; }
    }
    el.style.setProperty('--fs', r.fs.toFixed(2) + 'px');
    el.style.setProperty('--bd', bd.toFixed(1) + 'px');
    el.classList.add('fit'); el.classList.toggle('wide', mode === 'wide'); el.classList.toggle('stack', mode === 'stack');
  }
  function refitTiles() { document.querySelectorAll('#tileGrid .tile, #tilePreview .tile').forEach(fitTile); }
  const clampNum = (v, a, b) => Math.min(b, Math.max(a, v));
  function cleanDisplay(src) {
    const o = Object.assign({}, DISPLAY_DEFAULTS); src = src || {};
    if (src.chatLines === undefined && src.chatHeight) src = Object.assign({}, src, { chatLines: { s: 3, m: 5, l: 8 }[src.chatHeight] || 4 });   // older saved setting (Small/Medium/Large)
    Object.keys(DISPLAY_DEFAULTS).forEach((k) => {
      const dv = DISPLAY_DEFAULTS[k], v = src[k];
      if (typeof dv === 'boolean') { if (typeof v === 'boolean') o[k] = v; }
      else if (typeof dv === 'number') { const n = Number(v); if (v !== undefined && v !== null && v !== '' && Number.isFinite(n)) o[k] = n; }
      else if (typeof v === 'string') o[k] = v;
    });
    o.tsize = clampNum(o.tsize, 70, 125); o.volume = clampNum(o.volume, 0, 100); o.sbRows = o.sbRows >= 5 ? 5 : 3;
    if (!FONT_STACKS[o.font]) o.font = 'system';
    if (['square', 'soft', 'round'].indexOf(o.corner) < 0) o.corner = 'soft';
    o.numSize = clampNum(o.numSize, 70, 150); o.chatSize = clampNum(o.chatSize, 80, 150);
    if (['circle', 'rounded', 'square', 'none'].indexOf(o.numShape) < 0) o.numShape = 'circle';
    o.chatLines = Math.round(clampNum(o.chatLines, 1, 12)); o.chatKeep = Math.round(clampNum(o.chatKeep, 5, 80));
    FUSED_LEVELS.forEach((k) => { o['legend' + k] = String(o['legend' + k] || '').slice(0, 80); }); o.chatName = String(o.chatName || '').slice(0, 24);
    ['numColor', 'numBg', 'chatColor', 'chatBg'].forEach((k) => { if (!hexOk(o[k])) o[k] = ''; });
    o.title = String(o.title || '').slice(0, 24); o.hintText = String(o.hintText || '').slice(0, 90);
    o.blocked = String(o.blocked || '').slice(0, 600);
    if (!hexOk(o.accent)) o.accent = ''; if (!hexOk(o.selColor)) o.selColor = '';
    return o;
  }
  // Viewer names the host chose to hide: any name that contains one of the blocked words shows as "Viewer".
  let blockedCache = { src: null, list: [] };
  const squash = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9\u00C0-\uFFFF]+/g, '');
  function dn(name) {
    const src = displayPrefs.blocked || '';
    if (!src) return name;
    if (blockedCache.src !== src) blockedCache = { src, list: src.split(/[,\n;]+/).map((w) => squash(w)).filter((w) => w.length >= 2).slice(0, 60) };
    if (!blockedCache.list.length) return name;
    const n = squash(name);
    return blockedCache.list.some((w) => n.indexOf(w) >= 0) ? 'Viewer' : name;
  }
  (function () {   // v3.2: larger numbers need the roomier layout; devices that saved the old centred layout get the new default once
    try { if (localStorage.getItem('fusedle-num-v') !== '1') { const d = readJson('fusedle-display'); delete d.center; delete d.badge; writeJson('fusedle-display', d); localStorage.setItem('fusedle-num-v', '1'); } } catch (e) { /* ignore */ }
  })();
  let displayPrefs = cleanDisplay(readJson('fusedle-display'));

  function buildTilePreview() {
    const box = $('tilePreview'); if (!box) return;
    box.innerHTML = '';
    [{ n: 7, w: 'Ford' },
     { n: 25, w: 'Car', f: 1, sub: 'Ford \u00B7 Toyota \u00B7 Honda \u00B7 BMW' },
     { n: 41, w: 'Land Transport', f: 2, sub: 'Car \u00B7 Bus \u00B7 Tram \u00B7 Bicycle' },
     { n: 58, w: 'Motor Vehicle', f: 3, sub: 'Passenger Car \u00B7 Lorry \u00B7 Motorbike \u00B7 Minibus' },
     { n: 73, w: 'Wheeled Vehicle', f: 4, sub: 'Motor Vehicle \u00B7 Skateboard \u00B7 Pushchair \u00B7 Wheelchair' },
     { n: 96, w: 'Land Travel', f: 5, sub: 'Wheeled Vehicle \u00B7 Hiking \u00B7 Horse Riding \u00B7 Dog Sledding' },
     { n: 112, w: 'Journey', f: 6, sub: 'Land Travel \u00B7 Sea Voyage \u00B7 Air Flight \u00B7 Space Mission' }].forEach((t) => box.appendChild(makeTile(t, false)));
  }
  var H1_DEFAULT = null, HINT_DEFAULT = null, DOC_TITLE_DEFAULT = document.title, lastBlocked = null, wakeLock = null;
  // keep the phone screen on while the game is open (needs a browser that supports it)
  function syncWake() {
    const note = $('wakeNote'); if (note) note.hidden = !!(navigator.wakeLock);
    if (!navigator.wakeLock) return;
    if (displayPrefs.wake && !wakeLock && document.visibilityState === 'visible') {
      navigator.wakeLock.request('screen').then((l) => { wakeLock = l; l.addEventListener('release', () => { wakeLock = null; }); }).catch(() => { wakeLock = null; });
    } else if (!displayPrefs.wake && wakeLock) { try { wakeLock.release(); } catch (e) { /* ignore */ } wakeLock = null; }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncWake(); });
  function applyDisplay(save) {
    const d = displayPrefs, root = document.documentElement, st = root.style;
    const tg = (c, on) => root.classList.toggle(c, !!on);
    FUSED_LEVELS.forEach((k) => tg('nosub' + k, !d['sub' + k])); tg('ctr', d.center); tg('upper', d.upper);
    tg('hide-chatfmt', !d.showChatFmt); tg('hide-counter', !d.showCounter); tg('hide-timer', !d.showTimer); tg('hide-scores', !d.showScores);
    tg('hide-toasts', !d.showToasts); tg('nostreak', !d.showStreak); tg('noanim', !d.anim);
    tg('nocardwords', !d.cardWords); tg('nocardplayer', !d.cardPlayer); tg('nocardavatar', !d.cardAvatar);
    const ts = d.tsize / 100;
    st.setProperty('--ts', String(ts)); st.setProperty('--tsl', String(Math.min(1, ts)));
    if (d.font === 'system') st.removeProperty('--tile-font'); else st.setProperty('--tile-font', FONT_STACKS[d.font]);
    if (d.corner === 'soft') st.removeProperty('--tile-r'); else st.setProperty('--tile-r', d.corner === 'square' ? '4px' : '20px');
    // tile number look (size is worked out per tile in fitTile)
    st.setProperty('--num-font', FONT_STACKS[d.numFont] || FONT_STACKS.clear);
    st.setProperty('--num-w', d.numBold ? '800' : '600');
    st.setProperty('--num-r', d.numShape === 'circle' ? '50%' : d.numShape === 'rounded' ? '32%' : '3px');
    tg('num-none', d.numShape === 'none'); tg('num-noring', !d.numRing); tg('num-custombg', !!d.numBg); tg('num-customfg', !!d.numColor);
    if (d.numBg) st.setProperty('--num-bg', d.numBg); else st.removeProperty('--num-bg');
    if (d.numColor) st.setProperty('--num-fg', d.numColor);
    else if (d.numBg) st.setProperty('--num-fg', contrast(hexToRgb(d.numBg), [255, 255, 255]) >= contrast(hexToRgb(d.numBg), [30, 20, 8]) ? '#FFFFFF' : '#1E1408');
    else st.removeProperty('--num-fg');
    // legends + chat box
    tg('chat-custom', !!(d.chatBg || d.chatColor)); tg('hide-legend', !d.legendShow); tg('hide-chat', !d.chatShow); tg('chat-noinput', !d.chatInput); tg('chat-noavatar', !d.chatAvatar);
    st.setProperty('--chat-fs', (13 * d.chatSize / 100).toFixed(2) + 'px');
    st.setProperty('--chat-font', (FONT_STACKS[d.chatFont] || FONT_STACKS.system) + ',' + EMOJI_FONTS);
    st.setProperty('--chat-lines', String(d.chatLines));
    if (d.chatColor) st.setProperty('--chat-fg', d.chatColor); else st.removeProperty('--chat-fg');
    if (d.chatBg) {
      st.setProperty('--chat-bg', d.chatBg);
      if (!d.chatColor) st.setProperty('--chat-fg', contrast(hexToRgb(d.chatBg), [255, 255, 255]) >= contrast(hexToRgb(d.chatBg), [30, 20, 8]) ? '#FFFFFF' : '#1E1408');
    } else st.removeProperty('--chat-bg');
    renderLegend();
    // host branding: own title and own instruction line (empty = the built-in text)
    const h1 = document.querySelector('.top-bar h1');
    if (h1) { if (H1_DEFAULT === null) H1_DEFAULT = h1.innerHTML; const t = d.title.trim(); if (t) h1.textContent = t; else h1.innerHTML = H1_DEFAULT; }
    document.title = d.title.trim() || DOC_TITLE_DEFAULT;
    const hint = $('chatFormatHint');
    if (hint) { if (HINT_DEFAULT === null) HINT_DEFAULT = hint.innerHTML; const t = d.hintText.trim(); if (t) hint.textContent = t; else hint.innerHTML = HINT_DEFAULT; }
    // accent colour (buttons, active choices) and tapped-tile highlight colour
    if (d.accent) {
      const a = hexToRgb(d.accent), ink = contrast(a, [255, 255, 255]) >= contrast(a, [27, 10, 16]) ? '#FFFFFF' : '#1B0A10';
      st.setProperty('--pink', d.accent); st.setProperty('--on-pink', ink);
    } else { st.removeProperty('--pink'); st.removeProperty('--on-pink'); }
    if (d.selColor) st.setProperty('--sel-c', d.selColor); else st.removeProperty('--sel-c');
    document.querySelectorAll('#accentSwatches .fc-sw').forEach((b) => { const on = (b.dataset.c || '').toLowerCase() === d.accent.toLowerCase(); b.classList.toggle('active', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
    document.querySelectorAll('#selSwatches .fc-sw').forEach((b) => { const on = (b.dataset.c || '').toLowerCase() === d.selColor.toLowerCase(); b.classList.toggle('active', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
    syncWake();
    if (lastBlocked !== d.blocked) {   // hidden-name list changed: redraw the finished-group cards
      lastBlocked = d.blocked;
      const sl0 = $('solvedList'); if (sl0) sl0.dataset.sig = '';
      if (S && S.solved && typeof renderBoard === 'function') { try { renderBoard(); } catch (e) { /* ignore */ } }
    }
    // sync the controls in Settings
    document.querySelectorAll('[data-pref]').forEach((el) => {
      const k = el.dataset.pref, v = d[k];
      if (el.type === 'checkbox') el.checked = !!v; else if (document.activeElement !== el || el.tagName === 'SELECT') el.value = String(v);
    });
    const tv = $('tsizeVal'); if (tv) tv.textContent = d.tsize + '%';
    const nv = $('numSizeVal'); if (nv) nv.textContent = d.numSize + '%';
    const cv = $('chatSizeVal'); if (cv) cv.textContent = d.chatSize + '%';
    const clv = $('chatLinesVal'); if (clv) clv.textContent = String(d.chatLines);
    ['numColor', 'numBg', 'chatColor', 'chatBg'].forEach((k) => document.querySelectorAll('#' + k + 'Swatches .fc-sw').forEach((b) => { const on = (b.dataset.c || '').toLowerCase() === d[k].toLowerCase(); b.classList.toggle('active', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); }));
    if (typeof applyChatLayout === 'function') applyChatLayout();
    const vv = $('volumeVal'); if (vv) vv.textContent = d.volume + '%';
    buildTilePreview();
    refitTiles();
    if (save !== false) writeJson('fusedle-display', displayPrefs);
    if (typeof renderLists === 'function') renderLists();
    queueFit();
  }
  document.querySelectorAll('[data-pref]').forEach((el) => {
    const k = el.dataset.pref;
    const onChange = () => {
      let v;
      if (el.type === 'checkbox') v = el.checked;
      else if (typeof DISPLAY_DEFAULTS[k] === 'number') v = Number(el.value);
      else v = el.value;
      displayPrefs[k] = v; displayPrefs = cleanDisplay(displayPrefs);
      if (k === 'sound' && v) { audio(); }
      applyDisplay();
    };
    el.addEventListener('input', onChange); el.addEventListener('change', onChange);
  });

  // ---- Host branding colours + quick styles ----
  const ACCENT_PALETTE = [['Teal', '#1F7A72'], ['Royal Blue', '#2F5DA8'], ['Navy', '#1F3A5F'], ['Forest', '#2F6B3A'], ['Burgundy', '#9B2C4F'], ['Red', '#C0392B'], ['Orange', '#C25E0E'], ['Violet', '#5B3A9E'], ['Hot Pink', '#C2185B'], ['Chocolate', '#5B3A21'], ['Charcoal', '#3A3F47']];
  const SEL_PALETTE = [['Amber', '#B45309'], ['Red', '#D13438'], ['Blue', '#2F5DA8'], ['Green', '#2F6B3A'], ['Violet', '#5B3A9E'], ['Hot Pink', '#E0457B'], ['Black', '#111111'], ['White', '#FFFFFF']];
  const NUM_FG_PALETTE = [['White', '#FFFFFF'], ['Cream', '#FFF1D6'], ['Yellow', '#FFE066'], ['Black', '#111111'], ['Dark brown', '#2E1E10'], ['Navy', '#1F3A5F'], ['Red', '#B3261E']];
  const NUM_BG_PALETTE = [['Dark brown', '#5B4636'], ['Black', '#111111'], ['Charcoal', '#3A3F47'], ['Navy', '#1F3A5F'], ['Royal Blue', '#2F5DA8'], ['Teal', '#1F7A72'], ['Forest', '#2F6B3A'], ['Burgundy', '#9B2C4F'], ['Violet', '#5B3A9E'], ['Orange', '#C25E0E'], ['White', '#FFFFFF'], ['Cream', '#FFF1D6'], ['Yellow', '#FFE066']];
  const CHAT_BG_PALETTE = [['White', '#FFFFFF'], ['Cream', '#FFF8E8'], ['Light grey', '#E9ECEF'], ['Sky', '#E3F2FB'], ['Mint', '#E4F5DC'], ['Black', '#111111'], ['Charcoal', '#2B2F36'], ['Navy', '#14253F']];
  function buildBrandPickers() {
    const mkAll = (boxId, palette, key) => {
      const box = $(boxId); if (!box) return;
      const add = (name, c) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'fc-sw' + (c === '' ? ' fc-none' : ''); b.dataset.c = c; b.title = name;
        b.setAttribute('role', 'radio'); b.setAttribute('aria-label', name); if (c) b.style.background = c;
        b.addEventListener('click', () => { displayPrefs[key] = c; displayPrefs = cleanDisplay(displayPrefs); applyDisplay(); });
        box.appendChild(b);
      };
      add('Theme default', ''); palette.forEach((p) => add(p[0], p[1]));
    };
    mkAll('accentSwatches', ACCENT_PALETTE, 'accent'); mkAll('selSwatches', SEL_PALETTE, 'selColor');
    mkAll('numColorSwatches', NUM_FG_PALETTE, 'numColor'); mkAll('numBgSwatches', NUM_BG_PALETTE, 'numBg');
    mkAll('chatColorSwatches', NUM_FG_PALETTE, 'chatColor'); mkAll('chatBgSwatches', CHAT_BG_PALETTE, 'chatBg');
    const PRESETS = {
      standard: { tsize: 100, font: 'system', upper: false, corner: 'soft', numSize: 100, numFont: 'clear', numShape: 'circle', numBold: true, numRing: true, numColor: '', numBg: '', legendShow: true, chatShow: true, chatLines: 4, sub1: false, sub2: false, sub3: false, sub4: false, sub5: false, sub6: false, showChatFmt: true, showCounter: true, showTimer: true, showScores: true, sbRows: 5, showToasts: true, showStreak: true, anim: true, cardWords: true, cardPlayer: true, cardAvatar: true },
      clean: { showChatFmt: false, showCounter: false, showTimer: true, showScores: true, sbRows: 3, showToasts: true, showStreak: false, cardWords: false },
      bold: { tsize: 115, font: 'rounded', upper: true, corner: 'round', numSize: 130, numBold: true, sbRows: 3 },
      detail: { tsize: 90, sub1: true, sub2: true, sub3: true, sub4: true, sub5: true, sub6: true, cardWords: true, cardPlayer: true, sbRows: 5 }
    };
    document.querySelectorAll('#presetBtns [data-preset]').forEach((b) => b.addEventListener('click', () => {
      displayPrefs = cleanDisplay(Object.assign({}, displayPrefs, PRESETS[b.dataset.preset] || {}));
      applyDisplay(); backupMsg('Style applied: ' + b.textContent.trim().split('\n')[0] + '.');
    }));
  }

  // ---- Sound effects (little tones made in the browser, no files needed) ----
  let audioCtx = null;
  function audio() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { audioCtx = null; }
    return audioCtx;
  }
  function tone(freq, at, dur, type, vol) {
    const c = audio(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at, v = Math.max(0.0002, (displayPrefs.volume / 100) * (vol || 0.25));
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function playSound(kind) {
    if (!displayPrefs.sound || displayPrefs.volume <= 0) return;
    if (kind === 'fuse') { tone(523, 0, 0.14, 'triangle'); tone(784, 0.1, 0.22, 'triangle'); }
    else if (kind === 'final') { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.28, 'triangle', 0.28)); }
    else if (kind === 'near') { tone(440, 0, 0.12, 'sine'); tone(440, 0.16, 0.12, 'sine'); }
    else if (kind === 'wrong') { tone(190, 0, 0.22, 'sawtooth', 0.14); }
  }
  $('soundTestBtn').addEventListener('click', () => {
    const was = displayPrefs.sound; displayPrefs.sound = true;
    audio(); playSound('fuse'); setTimeout(() => playSound('final'), 500); setTimeout(() => playSound('near'), 1500); setTimeout(() => playSound('wrong'), 2000);
    displayPrefs.sound = was;
  });
  document.addEventListener('pointerdown', () => { if (displayPrefs.sound) audio(); }, { passive: true });

  // ---- Game rules (shared by every screen; the server keeps them) ----
  const RULE_DEFAULTS = { difficulty: 3, groupsPerRound: 8, twoLevel: 4, comboEnabled: true, comboMax: 4, showNear: true, finalBonus: 0, guessCooldown: 0 };
  function rulesPayload() {
    const num = (id, d) => { const v = parseFloat($(id).value); return Number.isFinite(v) ? v : d; };
    const groups = clampNum(Math.round(num('rulesGroups', 8)), 1, 8);
    return {
      difficulty: clampNum(Math.round(num('rulesLevel', 3)), 1, 7),
      groupsPerRound: groups, twoLevel: clampNum(Math.round(num('rulesTwo', 4)), 0, groups),
      comboEnabled: $('comboToggle').checked, comboMax: clampNum(Math.round(num('comboMaxInput', 4)), 1, 10),
      showNear: $('nearToggle').checked, finalBonus: clampNum(Math.round(num('finalBonusInput', 0)), 0, 100),
      guessCooldown: clampNum(num('cooldownInput', 0), 0, 30),
    };
  }
  function updateRulesShape() {
    const r = rulesPayload(), g = r.groupsPerRound;
    const two = r.difficulty === 3 ? r.twoLevel : 0, three = r.difficulty === 3 ? g - r.twoLevel : 0;
    const tw = $('rulesTwoField'); if (tw) tw.hidden = r.difficulty !== 3;
    let txt;
    if (r.difficulty === 1) txt = 'Level 1 (Easy, no fusion level), next game: ' + g + ' groups of 4 words = ' + (g * 4) + ' tiles and ' + g + ' fusions.';
    else if (r.difficulty === 2) txt = 'Level 2 (Moderate, 1 fusion level), next game: ' + g + ' groups, each with one fused tile on the way = ' + (g * 7) + ' tiles and ' + (g * 2) + ' fusions.';
    else if (r.difficulty >= 4) {
      const lv = LEVEL_INFO[r.difficulty], f = lv.fusions;   // fusions per group: Level 4 = 4 ... Level 7 = 7
      txt = 'Level ' + r.difficulty + ' (' + lv.name + ', ' + lv.fusionLevels + ' fusion levels), next game: ' + g + ' groups, each fused ' + f + ' times (' + (3 * f + 1) + ' tiles per group) = ' + (g * (3 * f + 1)) + ' tiles and ' + (g * f) + ' fusions.';
    }
    else txt = 'Level 3 (Hard, up to 2 fusion levels), next game: ' + g + ' groups (' + two + ' two-level + ' + three + ' three-level) = ' + (two * 7 + three * 10) + ' tiles and ' + (two * 2 + three * 3) + ' fusions.';
    const el = $('rulesShape'); if (el) el.textContent = txt;
  }
  ['rulesGroups', 'rulesTwo', 'comboMaxInput', 'finalBonusInput', 'cooldownInput', 'comboToggle', 'nearToggle'].forEach((id) => {
    $(id).addEventListener('input', updateRulesShape);
    $(id).addEventListener('change', () => { updateRulesShape(); socket.emit('host:setRules', rulesPayload()); });
  });
  $('rulesLevel').addEventListener('change', () => { if (!pickLevel($('rulesLevel').value) && S) $('rulesLevel').value = String(S.difficulty); updateRulesShape(); });
  function fillRules(r) {
    $('rulesLevel').value = String(r.difficulty || 3); $('rulesGroups').value = r.groupsPerRound; $('rulesTwo').value = r.twoLevel; $('comboToggle').checked = !!r.comboEnabled;
    $('comboMaxInput').value = r.comboMax; $('nearToggle').checked = !!r.showNear; $('finalBonusInput').value = r.finalBonus; $('cooldownInput').value = r.guessCooldown;
    updateRulesShape();
  }
  $('resetRulesBtn').addEventListener('click', () => { fillRules(RULE_DEFAULTS); socket.emit('host:setRules', rulesPayload()); });

  // ---- Backup / reset of the look settings ----
  function backupMsg(t) { const c = $('backupMsg'); c.textContent = t; c.hidden = false; setTimeout(() => { c.hidden = true; }, 4000); }
  $('exportSettingsBtn').addEventListener('click', () => {
    const data = { app: 'fusedle-live', version: 1, display: displayPrefs, fusedColours: fusedPrefs, cardColours: cardPrefs, timing: timingPrefs, theme: currentTheme(), yarn: document.documentElement.classList.contains('yarn'), rules: rulesPayload() };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'fusedle-settings.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    backupMsg('Settings file created.');
  });
  $('importSettingsBtn').addEventListener('click', () => $('importSettingsFile').click());
  $('importSettingsFile').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(String(rd.result || '{}'));
        if (!d || d.app !== 'fusedle-live') throw new Error('not a FUSEDLE settings file');
        if (d.display) { displayPrefs = cleanDisplay(d.display); }
        if (d.fusedColours) FUSED_LEVELS.forEach((k) => { const v = d.fusedColours[k]; if (v === 'none' || hexOk(v)) fusedPrefs[k] = v; });
        if (d.cardColours) cardPrefs = cardCleanPrefs(d.cardColours);
        if (d.timing) { ['toastSeconds', 'roundWindowSeconds', 'allTimeWindowSeconds'].forEach((k) => { const n = Number(d.timing[k]); if (Number.isFinite(n) && n > 0 && n <= 60) timingPrefs[k] = n; }); writeJson('fusedle-timing', timingPrefs); syncTimingInputs(); }
        if (typeof d.theme === 'string') applyTheme(d.theme);
        if (typeof d.yarn === 'boolean') applyYarn(d.yarn);
        applyFusedColors(); applyCardColors(); applyDisplay();
        if (d.rules) { fillRules(Object.assign({}, RULE_DEFAULTS, d.rules)); socket.emit('host:setRules', rulesPayload()); }
        backupMsg('Settings loaded.');
      } catch (err) { backupMsg('That file could not be read: ' + err.message); }
    };
    rd.readAsText(f); e.target.value = '';
  });
  $('resetDisplayBtn').addEventListener('click', () => { if (confirm('Reset all tile & display options to the defaults?')) { displayPrefs = cleanDisplay({}); applyDisplay(); backupMsg('Tile & display options reset.'); } });

  // ---- Dropdowns ----------------------------------------------------------
  function wireDropdown(rootId, onPick) {
    const root = $(rootId), btn = root.querySelector('.toolbar-dropdown-trigger'), menu = root.querySelector('.toolbar-dropdown-menu');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menu.hidden; closeMenus(); menu.hidden = !open; btn.setAttribute('aria-expanded', String(open));
      if (open) placeMenu(btn, menu);
    });
    menu.addEventListener('click', (e) => {
      const li = e.target.closest('li'); if (!li) return;
      onPick(li.dataset.value); closeMenus();
    });
  }
  // The menu is position:fixed, so it must be placed by hand: right edge under the button, never past the screen edge,
  // never taller than the space below the toolbar (it scrolls inside itself instead).
  function placeMenu(btn, menu) {
    const vv = window.visualViewport, vw = Math.round(vv ? vv.width : window.innerWidth), vh = Math.round(vv ? vv.height : window.innerHeight);
    const pad = 8, r = btn.getBoundingClientRect();
    menu.style.maxWidth = (vw - pad * 2) + 'px';
    const top = Math.round(r.bottom + 6);
    menu.style.top = top + 'px'; menu.style.bottom = 'auto'; menu.style.right = 'auto';
    menu.style.maxHeight = Math.max(120, vh - top - pad) + 'px';
    const w = menu.offsetWidth;
    menu.style.left = Math.round(Math.max(pad, Math.min(r.right - w, vw - w - pad))) + 'px';
  }
  window.addEventListener('resize', () => closeMenus());
  function closeMenus() { document.querySelectorAll('.toolbar-dropdown-menu').forEach((m) => { m.hidden = true; }); }
  document.addEventListener('click', closeMenus);
  wireDropdown('themeDropdown', applyTheme);
  document.querySelectorAll('.theme-choice-btn').forEach((b) => b.addEventListener('click', () => applyTheme(b.dataset.themeChoice)));

  // ---- Mode button (top toolbar) -------------------------------------------------
  const MODES = { offline: { icon: '\u{1F3AE}', label: 'Offline (solo)' }, test: { icon: '\u{1F9EA}', label: 'Test (fake viewers)' }, live: { icon: '\u{1F4E1}', label: 'Live (TikTok chat)' } };
  function pickMode(m) {
    if (!MODES[m]) return;
    showPanels(m); socket.emit('host:setMode', { mode: m });
    if (m === 'live') openLive();      // choosing Live opens the TikTok connection window straight away
  }
  wireDropdown('modeDropdown', pickMode);

  // ---- Difficulty button (top toolbar) -------------------------------------------
  // Switching level builds a new game at once. Returns false if the host backed out (so a settings control can reset itself).
  function pickLevel(v) {
    v = Math.round(Number(v)); if (!LEVEL_INFO[v]) return false;
    if (S && S.difficulty === v) return true;
    if (S && !S.solvedAt && S.fusionsDone > 0 && !confirm('Switch to Level ' + v + ' (' + LEVEL_INFO[v].name + ')? This starts a new game and the round in progress is lost.')) return false;
    socket.emit('host:setRules', { difficulty: v });
    return true;
  }
  wireDropdown('levelDropdown', pickLevel);
  function renderLevelButton() {
    const lv = S && LEVEL_INFO[S.difficulty] ? S.difficulty : 3, btn = $('levelDropdownBtn'), ic = $('levelDropdownIcon');
    ic.textContent = String(lv); ic.className = 'diff-badge dl-' + lv;
    btn.title = 'Difficulty: Level ' + lv + ' (' + LEVEL_INFO[lv].name + ') - tap to change'; btn.setAttribute('aria-label', btn.title);
    document.querySelectorAll('#levelDropdownMenu li[data-value]').forEach((li) => { const on = Number(li.dataset.value) === lv; li.classList.toggle('dd-active', on); li.setAttribute('aria-selected', on); });
  }
  function renderModeButton(phase) {
    const m = S ? S.mode : 'test', btn = $('modeDropdownBtn');
    $('modeDropdownIcon').textContent = MODES[m].icon;
    btn.title = 'Mode: ' + MODES[m].label + ' - tap to change'; btn.setAttribute('aria-label', btn.title);
    btn.classList.toggle('active', m === 'live');
    btn.dataset.dot = m === 'live' ? (phase === 'connected' ? 'ok' : (phase === 'connecting' || phase === 'retrying') ? 'wait' : 'bad') : '';
    document.querySelectorAll('#modeDropdownMenu li[data-value]').forEach((li) => { const on = li.dataset.value === m; li.classList.toggle('dd-active', on); li.setAttribute('aria-selected', on); });
  }

  // ---- TikTok connection window (floating popup) --------------------------------
  let liveOpen = false, autoPromptDone = false, serverOnline = true, tiktokSeenAt = Date.now(), lastPhase = null, autoCloseTimer = null;
  const savedKey = () => { try { return localStorage.getItem('fusedle-key') || ''; } catch (e) { return ''; } };
  function openLive() {
    liveOpen = true; autoPromptDone = true; clearTimeout(autoCloseTimer);
    const u = $('tiktokUsername'), k = $('tiktokApiKey');
    if (!u.value) u.value = (S && S.tiktok && S.tiktok.username) || cfg.defaultUsername || (function () { try { return localStorage.getItem('fusedle-username') || ''; } catch (e) { return ''; } })();
    if (!k.value && !cfg.hasDefaultSignApiKey) k.value = savedKey();
    $('liveOverlay').hidden = false;
    renderLiveModal();
    setTimeout(() => { try { (u.value ? $('connectLiveBtn') : u).focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 60);
  }
  function closeLive() { liveOpen = false; clearTimeout(autoCloseTimer); $('liveOverlay').hidden = true; }
  const LIVE_ICONS = { idle: '\u26AA', connecting: '\u23F3', retrying: '\u{1F504}', connected: '\u2705', failed: '\u274C', disconnected: '\u26AA', server: '\u{1F50C}', input: '\u26A0\uFE0F' };
  let liveInputError = '';
  function renderLiveModal() {
    if (!liveOpen || !S) return;
    const t = S.tiktok, phase0 = t.phase || (t.connected ? 'connected' : t.connecting ? 'connecting' : t.lastError ? 'failed' : 'idle');
    let phase = phase0, title = '', reason = '', hint = '', meta = '';
    const user = t.uniqueId || t.username || $('tiktokUsername').value.trim().replace(/^@/, '');
    if (!serverOnline) {
      phase = 'server'; title = 'Cannot reach the game server';
      reason = 'The connection between this page and the game server was lost.';
      hint = 'If the game is hosted on Render\'s free plan it may be waking up (about 30 seconds). This page reconnects by itself - then press Connect.';
    } else if (liveInputError) {
      phase = 'input'; title = 'Check your details'; reason = liveInputError; hint = '';
    } else if (phase0 === 'connected') {
      title = 'Connected to @' + user;
      reason = S.mode === 'live' ? 'Success! Viewer comments from your LIVE are now counted as guesses.' : 'Connected, but the game is in ' + MODES[S.mode].label + ' mode, so chat is ignored. Choose Live in the mode button.';
      meta = (t.roomId ? 'Room ID ' + t.roomId + '  \u00B7  ' : '') + 'Comments received: ' + (S.rawEventCount || 0);
      if (S.lastEvent && S.lastEvent.text) meta += '  \u00B7  Last: ' + S.lastEvent.user + ': \u201C' + S.lastEvent.text + '\u201D';
    } else if (phase0 === 'connecting') {
      title = 'Connecting to @' + user + '...'; reason = t.statusText || ''; hint = 'This can take up to 25 seconds.';
    } else if (phase0 === 'retrying') {
      const left = Math.max(0, Math.ceil((t.retryInSeconds || 0) - (Date.now() - tiktokSeenAt) / 1000));
      title = 'Not connected yet - trying again' + (left ? ' in ' + left + 's' : '...');
      reason = t.reason || t.statusText || ''; hint = t.hint || ''; meta = t.attempt ? 'Attempt ' + t.attempt : '';
    } else if (phase0 === 'failed') {
      title = 'Connection failed'; reason = t.reason || t.statusText || 'Unknown error.'; hint = t.hint || '';
    } else if (phase0 === 'disconnected') {
      title = 'Disconnected'; reason = t.reason || ''; hint = t.hint || 'Press Connect to join your LIVE chat again.';
    } else {
      title = 'Not connected'; reason = 'Enter your TikTok username' + (cfg.hasDefaultSignApiKey ? '' : ' and your Sign API Key') + ', then press Connect.';
    }
    const box = $('liveStatusBox'); box.className = 'live-status-box phase-' + phase;
    $('liveStatusIcon').textContent = LIVE_ICONS[phase] || '\u26AA';
    $('liveStatusTitle').textContent = title; $('liveStatusReason').textContent = reason; $('liveStatusHint').textContent = hint; $('liveStatusMeta').textContent = meta;
    $('liveStatusReason').hidden = !reason; $('liveStatusHint').hidden = !hint; $('liveStatusMeta').hidden = !meta;
    const showDetail = (phase0 === 'failed' || phase0 === 'retrying') && !!t.detail && serverOnline && !liveInputError;
    $('liveStatusDetails').hidden = !showDetail; $('liveStatusDetailText').textContent = showDetail ? t.detail + (t.code ? '\n(code: ' + t.code + ')' : '') : '';
    const busy = phase0 === 'connecting', active = t.connected || t.connecting;
    $('connectLiveBtn').disabled = busy || !serverOnline; $('connectLiveBtn').textContent = busy ? 'Connecting...' : t.connected ? 'Reconnect' : phase0 === 'retrying' ? 'Try again now' : 'Connect';
    $('disconnectLiveBtn').hidden = !active;
    $('liveModalDoneBtn').textContent = phase0 === 'connected' ? 'Done' : 'Close';
    $('liveModalDoneBtn').className = 'btn ' + (phase0 === 'connected' ? 'btn-primary' : 'btn-secondary');
    $('liveModalTitle').textContent = '\u{1F4E1} TikTok LIVE connection';
  }
  function doConnect() {
    const u = $('tiktokUsername').value.trim().replace(/^@/, ''), k = $('tiktokApiKey').value.trim();
    $('tiktokUsername').value = u;
    if (!serverOnline) { renderLiveModal(); return; }
    liveInputError = '';
    if (!u && !cfg.defaultUsername) liveInputError = 'Please type your TikTok username (the name after the @).';
    else if (u && !/^[A-Za-z0-9._]{2,24}$/.test(u)) liveInputError = 'A TikTok username only has letters, numbers, dots and underscores (no spaces, no @).';
    else if (!k && !cfg.hasDefaultSignApiKey) liveInputError = 'Please paste your EulerStream Sign API Key (free at eulerstream.com).';
    if (liveInputError) { renderLiveModal(); return; }
    try {
      if ($('liveRemember').checked) { localStorage.setItem('fusedle-username', u); if (k) localStorage.setItem('fusedle-key', k); }
      else { localStorage.removeItem('fusedle-key'); }
    } catch (e) { /* private mode */ }
    clearTimeout(autoCloseTimer);
    socket.emit('tiktok:connect', { uniqueId: u, apiKey: k });
  }
  $('connectLiveBtn').addEventListener('click', doConnect);
  $('disconnectLiveBtn').addEventListener('click', () => { clearTimeout(autoCloseTimer); socket.emit('tiktok:disconnect'); });
  $('liveModalCloseBtn').addEventListener('click', closeLive);
  $('liveModalDoneBtn').addEventListener('click', closeLive);
  $('liveOverlay').addEventListener('click', (e) => { if (e.target === $('liveOverlay')) closeLive(); });
  ['tiktokUsername', 'tiktokApiKey'].forEach((id) => {
    $(id).addEventListener('input', () => { if (liveInputError) { liveInputError = ''; renderLiveModal(); } });
    $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') doConnect(); });
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && liveOpen) closeLive(); });
  $('liveOverlay').addEventListener('pointerdown', () => clearTimeout(autoCloseTimer), { passive: true });
  $('liveStatusMini').addEventListener('click', openLive);
  $('openLiveModalBtn').addEventListener('click', openLive);
  socket.on('connect', () => { serverOnline = true; renderLiveModal(); });
  socket.on('disconnect', () => { serverOnline = false; renderLiveModal(); });
  socket.on('connect_error', () => { serverOnline = false; renderLiveModal(); });
  // Called on every new game state: refresh the window, close it a moment after a success, open it if Live mode has no connection
  function onTikTokState() {
    const t = S.tiktok, phase = t.phase || 'idle';
    if (phase !== lastPhase || t.updatedAt !== onTikTokState.at) tiktokSeenAt = Date.now();
    onTikTokState.at = t.updatedAt;
    if (liveOpen && phase === 'connected' && lastPhase !== 'connected') { clearTimeout(autoCloseTimer); autoCloseTimer = setTimeout(closeLive, 3500); }
    if (phase !== 'connected') clearTimeout(autoCloseTimer);
    lastPhase = phase;
    if (!autoPromptDone && S.mode === 'live' && (phase === 'idle' || phase === 'disconnected' || phase === 'failed')) openLive();
    renderLiveModal();
  }
  setInterval(() => { if (liveOpen && S && S.tiktok.phase === 'retrying') renderLiveModal(); }, 1000);

  // ---- Avatars (real TikTok photo, initials circle as backup) -------------
  function hue(str) { let h = 0; str = String(str || '?'); for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h % 360; }
  function initials(name) {
    const p = String(name || '?').trim().split(/\s+/); let i = (p[0] || '?').charAt(0); if (p.length > 1) i += p[p.length - 1].charAt(0);
    i = i.toUpperCase(); return /^[\p{L}\p{N}]+$/u.test(i) ? i : '?';
  }
  function fallbackAvatar(seed, name) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="hsl(' + hue(seed || name) + ',55%,45%)"/><text x="32" y="41" font-family="Arial,sans-serif" font-size="26" font-weight="700" fill="#fff" text-anchor="middle">' + initials(name).replace(/[<&]/g, '?') + '</text></svg>';
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }
  function avatarImg(url, uid, name, size) {
    const img = document.createElement('img'); img.className = 'avatar-circle' + (size ? ' ' + size : ''); img.alt = ''; img.referrerPolicy = 'no-referrer';
    const fb = fallbackAvatar(uid, name); img.src = url || fb; let retried = false;
    img.addEventListener('error', () => {
      if (img.src === fb) return;
      if (!retried && url && url.indexOf('/avatar/') === 0) { retried = true; setTimeout(() => { img.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'r=1'; }, 2500); return; }
      img.src = fb;
    });
    return img;
  }

  // ---- Score lists ----------------------------------------------------------
  const medal = (i) => (i < 3 ? ['\u{1F947}', '\u{1F948}', '\u{1F949}'][i] : String(i + 1));
  function fillList(el, list, big, limit) {
    el.innerHTML = '';
    if (!list || !list.length) { const li = document.createElement('li'); li.className = 'lb-empty'; li.textContent = big ? 'No scorers yet.' : 'No groups fused yet'; el.appendChild(li); return; }
    list.slice(0, limit || list.length).forEach((r, i) => {
      const li = document.createElement('li');
      const rank = document.createElement('span');
      rank.className = (big ? 'round-end-rank' : 'inline-rank') + (i < 3 ? (big ? ' round-end-rank-medal' : ' inline-rank-medal') : '');
      rank.textContent = medal(i); li.appendChild(rank);
      li.appendChild(avatarImg(r.avatar, r.uniqueId, dn(r.name), big ? 'lg' : ''));
      const nm = document.createElement('span'); nm.className = big ? 'round-end-name' : 'lb-name'; nm.textContent = dn(r.name); li.appendChild(nm);
      if (r.streak >= 2) { const b = document.createElement('span'); b.className = 'streak-badge'; b.textContent = '\u{1F525}\u00D7' + r.streak; li.appendChild(b); }
      const pts = document.createElement('span'); pts.className = big ? 'round-end-points' : 'lb-points'; pts.textContent = big ? r.points + (r.points === 1 ? ' pt' : ' pts') : r.points; li.appendChild(pts);
      el.appendChild(li);
    });
  }
  function renderLists() {
    const rows = displayPrefs.sbRows || 5; fillList($('liveRoundList'), lb.round, false, rows); fillList($('liveAllTimeList'), lb.allTime, false, rows);
    fillList($('leaderboardList'), lb.round, false); fillList($('allTimeLeaderboardList'), lb.allTime, false);
    fillList($('leaderboardModalRoundList'), lb.round, true); fillList($('leaderboardModalAllTimeList'), lb.allTime, true);
  }

  // ---- Board -------------------------------------------------------------
  // Colour per group (peek tint + finished-group cards) and per fusion level (fused tiles).
  // Soft, cute-but-mature pastel colours for finished groups (all used with dark text, so letters stay easy to read).
  const GROUP_COLORS = CARD_DEFAULT_COLORS;   // peek tint keeps the pastels; finished-group cards use cardColorFor() (Settings > Finished group colours)
  const groupColor = (g) => GROUP_COLORS[Math.abs(Number(g) || 0) % GROUP_COLORS.length];
  let wrongNums = [], wrongTimer = null;
  const tileEls = new Map();      // tile number -> button element (kept between renders so animations play once)
  let renderedStart = null;

  // ---- One-shot tile animations -------------------------------------------------
  // BUG FIXED HERE: a tile that dropped in (class "drop") or was just fused (class "fresh") kept that class for the whole round.
  // When the same tile was later marked "wrong", the CSS swapped its animation to the shake; when the red mark was removed the
  // animation swapped BACK, so the entry animation started again from "invisible" (plus the leftover start delay). The tile
  // vanished for about a second after every wrong guess. Now the entry classes are removed as soon as the animation is over
  // (and always before a tile is marked wrong), so an entry animation can never play twice.
  function settleTile(el) {
    if (!el || !el._anim) return;
    el._anim = false; clearTimeout(el._settleT);
    el.style.animationDelay = '';
    const wasFresh = el.classList.contains('fresh');
    el.classList.remove('drop', 'fresh');
    if (wasFresh) el.classList.add('fresh-done');     // keeps the soft ring around a newly fused tile
  }
  function armSettle(el) {
    if (!el.classList.contains('drop') && !el.classList.contains('fresh')) return;
    el._anim = true;
    el.addEventListener('animationend', (e) => { if (e.target === el && (e.animationName === 'tileDrop' || e.animationName === 'fuseIn')) settleTile(el); });
    el._settleT = setTimeout(() => settleTile(el), 2500);   // safety net (animations off, reduced motion, background tab)
  }

  function mk(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }

  // A finished group is one small card: category name, the viewer who fused it (round TikTok photo + name)
  // and only the 4 latest words that made it. It stays compact so tiles and scores never leave the screen.
  function solvedCard(g, isNew, idx) {
    const d = mk('div', 'solved-card' + (isNew ? ' is-new' : '')); styleCard(d, idx || 0);   // each finished group gets the next colour (or the colour the host chose in Settings)
    const by = g.by || null;
    d.appendChild(by ? avatarImg(by.avatar, by.uniqueId, dn(by.name), 'sm') : mk('span', 'solved-host', '\u2728'));
    const t = mk('div', 'solved-text');
    t.appendChild(mk('b', 'solved-cat', '\u{1F3C6} ' + g.name));
    const sub = mk('span', 'solved-sub');
    sub.appendChild(mk('span', 'solved-by', by ? dn(by.name) : 'Host reveal'));
    sub.appendChild(mk('span', 'solved-words', (g.words || []).join(' \u00B7 ')));
    t.appendChild(sub);
    d.appendChild(t);
    return d;
  }

  function makeTile(t, fresh) {
    const b = mk('button', 'tile'); b.type = 'button'; b.dataset.n = t.n;
    b.dataset.s = String(Number(t.n) % 6);                 // 6 shades of gray for the number circle
    const nb = mk('i', 'd' + Math.min(3, String(t.n).length), t.n); b.appendChild(nb);   // number badge (kept inside the tile, never over the word)
    const body = mk('span', 'tile-text');
    if (t.f) {
      b.classList.add('fused'); b.dataset.f = Math.min(6, t.f);
      body.appendChild(mk('span', 'tile-name', t.w));
      body.appendChild(mk('span', 'tile-sub', t.sub || ''));
      if (fresh) b.classList.add('fresh');
    } else {
      body.appendChild(mk('span', 'tile-word', t.w));
    }
    // font size follows the REAL width of the longest single word (measured in the tile's own font), so a word is never cut off
    b._w = t.w; b.style.setProperty('--k', kFor(t.w));
    b.appendChild(body);
    return b;
  }

  function renderBoard() {
    const live = S.mode === 'live';

    // finished groups (rebuild only when the list changes; only the newest card animates)
    const sig = S.startedAt + '|' + S.solved.map((x) => x.name + (x.by ? x.by.uniqueId : '')).join(',');
    const sl = $('solvedList');
    if (sl.dataset.sig !== sig) {
      const prev = sl.dataset.start === String(S.startedAt) ? Number(sl.dataset.count || 0) : 0;
      sl.dataset.sig = sig; sl.dataset.start = String(S.startedAt); sl.dataset.count = String(S.solved.length); sl.innerHTML = '';
      S.solved.forEach((g, i) => sl.appendChild(solvedCard(g, i >= prev, i)));
    }

    // tile grid: keyed diff so only NEW fused tiles animate and nothing flickers
    const grid = $('tileGrid'); grid.classList.toggle('live-view', live);
    const newRound = renderedStart !== S.startedAt;   // first draw of this round: nothing animates in
    if (newRound) { grid.innerHTML = ''; tileEls.clear(); renderedStart = S.startedAt; }
    const present = new Set(S.tiles.map((t) => t.n));
    // tiles that just left the board: remember a copy + position so they can fly into the new tile
    const removed = [];
    tileEls.forEach((el, n) => {
      if (!present.has(n)) { removed.push({ node: el.cloneNode(true), r: el.getBoundingClientRect(), fused: el.classList.contains('fused') }); el.remove(); tileEls.delete(n); }
    });
    const merging = displayPrefs.anim && removed.length > 0 && removed.length <= 12 && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    selected = selected.filter((n) => present.has(n));
    const rank = new Map(); S.tiles.slice().sort((a, b) => a.s - b.s).forEach((t, i) => rank.set(t.n, i));
    S.tiles.forEach((t) => {
      let el = tileEls.get(t.n);
      if (!el) {
        const fresh = !!(S.lastFusion && S.lastFusion.newN === t.n && (S.now - S.lastFusion.at) < 3000);
        el = makeTile(t, fresh); tileEls.set(t.n, el);
        if (!newRound && !t.f) el.classList.add('drop');   // a waiting tile drops into a freed space
        if (merging) el.style.animationDelay = t.f ? '.5s' : '.6s';   // wait until the merging tiles have arrived
        grid.appendChild(el); armSettle(el);
      }
      const pos = rank.get(t.n);   // tiles are packed upward: they fill every space the earlier tiles left behind
      el.style.gridColumn = String((pos % (S.cols || 4)) + 1); el.style.gridRow = String(Math.floor(pos / (S.cols || 4)) + 1);
      el.classList.toggle('sel', selected.includes(t.n));
      const isWrong = wrongNums.includes(t.n);
      if (isWrong) settleTile(el);                       // never let the red mark interrupt (and later replay) an entry animation
      el.classList.toggle('wrong', isWrong);
      const peeking = S.peeking && t.g !== undefined;
      el.classList.toggle('peek', peeking);
      if (peeking) el.style.setProperty('--gc', groupColor(t.g)); else el.style.removeProperty('--gc');
    });

    if (merging) playMerge(removed);

    // only as many rows as the packed tiles need (full-size rows, never smaller)
    const cols = S.cols || 4;
    const rowsShown = Math.max(1, Math.ceil(S.tiles.length / cols));
    grid.style.gridTemplateRows = 'repeat(' + rowsShown + ', var(--row-h))';
    const pc = $('pairsCounter'); pc.textContent = '';
    const add = (t, c) => { const e = document.createElement('span'); if (c) e.className = c; e.textContent = t; pc.appendChild(e); };
    add('\u26A1 ' + S.fusionsDone + '/' + S.fusionsTotal); add(' fusions', 'lbl');
    add(' \u00B7 \u{1F9E9} ' + S.chainsDone + '/' + S.chainsTotal); add(' groups', 'lbl');
    if (S.waiting > 0) { add(' \u00B7 \u23EC ' + S.waiting); add(' more to come', 'lbl'); }
    $('solvedBanner').hidden = !S.solvedAt;
    const hl = $('hintLine'); hl.hidden = !S.hint; hl.textContent = S.hint || '';
    fitLayout();
  }

  // ---- Keep the page exactly one phone screen tall ---------------------------
  // The top line, leaderboards and console never leave the screen. The game area
  // (finished groups + tiles) sizes ITSELF to the space that is left: it tries the
  // roomiest layout first and only shrinks as far as it must, in this order:
  //   n = normal finished cards, c = slim finished cards, d = slim cards two per row
  // (each paired with a tile-row height). Only if even the smallest layout does not
  // fit (very short phone) does the game area scroll inside its own box.
  const FIT_STEPS = [];
  [['n', [54, 50, 46, 44]], ['c', [54, 50, 46, 42, 40]], ['d', [54, 50, 46, 42, 38, 34, 32]]].forEach((m) => m[1].forEach((h) => FIT_STEPS.push([m[0], h])));
  function fitLayout() {
    const shell = document.querySelector('.app-shell'), fb = $('fusedBoard'), grid = $('tileGrid'), sl = $('solvedList');
    if (!shell || !fb || !grid || !sl) return;
    if (!document.fullscreenElement) shell.style.setProperty('--app-h', Math.round(window.innerHeight) + 'px');
    const prevFlex = fb.style.flex; fb.style.flex = '1 1 0';          // measure: the game area takes ALL the free space
    let chosen = FIT_STEPS[FIT_STEPS.length - 1], fits = false;
    for (let k = 0; k < FIT_STEPS.length; k++) {
      sl.dataset.mode = FIT_STEPS[k][0]; grid.style.setProperty('--row-h', FIT_STEPS[k][1] + 'px');
      if (fb.scrollHeight <= fb.clientHeight + 1) { chosen = FIT_STEPS[k]; fits = true; break; }
    }
    if (!fits) { sl.dataset.mode = chosen[0]; grid.style.setProperty('--row-h', chosen[1] + 'px'); }
    fb.style.flex = prevFlex;
    // topline: drop the long words (keep icons + numbers) if the counter would not fit next to the timer
    const pc = $('pairsCounter'); pc.classList.remove('tight'); pc.style.fontSize = '';
    if (pc.scrollWidth > pc.clientWidth + 1) pc.classList.add('tight');
    let fs = parseFloat(getComputedStyle(pc).fontSize) || 12;
    while (pc.scrollWidth > pc.clientWidth + 1 && fs > 8.5) { fs -= 0.5; pc.style.fontSize = fs + 'px'; }
    if (fb.scrollHeight > fb.clientHeight + 1) fb.scrollTop = fb.scrollHeight;
    refitTiles();
  }
  let fitQueued = false;
  function queueFit() { if (fitQueued) return; fitQueued = true; requestAnimationFrame(() => { fitQueued = false; if (S) fitLayout(); }); }
  window.addEventListener('resize', queueFit);
  window.addEventListener('orientationchange', () => setTimeout(queueFit, 200));
  document.addEventListener('fullscreenchange', () => { setTimeout(queueFit, 50); setTimeout(queueFit, 400); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', queueFit);
  window.addEventListener('load', () => { queueFit(); setTimeout(queueFit, 300); });
  if (window.ResizeObserver) { const st = document.querySelector('.board-stage'); if (st) new ResizeObserver(queueFit).observe(st); }

  // Merge animation: the 4 fused tiles slide together into the new tile (or into the finished-group card).
  function playMerge(removed) {
    const fresh = S.lastFusion && tileEls.get(S.lastFusion.newN);
    const card = document.querySelector('#solvedList .solved-card.is-new:last-child');
    let target = fresh && fresh.classList.contains('fresh') ? fresh : card;
    if (!target) return;
    if (target === card) card.style.animationDelay = '.5s';
    const tr = target.getBoundingClientRect(), tx = tr.left + tr.width / 2, ty = tr.top + tr.height / 2;
    const shell = document.querySelector('.app-shell') || document.body;   // inside the shell so it also shows in full screen
    const ghosts = removed.map((g, i) => {
      const c = g.node; c.className = 'tile ghost' + (g.fused ? ' fused' : '');
      c.style.cssText = (g.node.style.cssText || '').replace(/grid-(column|row):[^;]*;?/g, '');
      c.style.left = g.r.left + 'px'; c.style.top = g.r.top + 'px'; c.style.width = g.r.width + 'px'; c.style.height = g.r.height + 'px';
      c.style.transitionDelay = (i * 50) + 'ms';
      shell.appendChild(c);
      return { c, dx: tx - (g.r.left + g.r.width / 2), dy: ty - (g.r.top + g.r.height / 2) };
    });
    void shell.offsetWidth;   // lock the start position, then slide
    ghosts.forEach((g) => { g.c.style.transform = 'translate(' + g.dx + 'px,' + g.dy + 'px) scale(.3)'; g.c.style.opacity = '0.2'; });
    setTimeout(() => ghosts.forEach((g) => g.c.remove()), 900);
  }

  $('tileGrid').addEventListener('click', (e) => {
    const b = e.target.closest('.tile'); if (!b || !S || S.mode === 'live' || S.solvedAt) return;
    const n = Number(b.dataset.n), k = selected.indexOf(n);
    if (k >= 0) selected.splice(k, 1); else if (selected.length < 4) selected.push(n);
    $('offlineGuessInput').value = selected.join(' ');
    b.classList.toggle('sel', selected.includes(n));
    if (selected.length === 4) { sendGuess(selected.join(' ')); selected = []; $('offlineGuessInput').value = ''; }
  });
  function sendGuess(text) { if (String(text).trim()) socket.emit('host:manualInput', { user: 'Host', text: text }); }

  // ---- Top bar / status ----------------------------------------------------
  function renderStatus() {
    const t = S.tiktok, el = $('liveStatusMini'), live = S.mode === 'live';
    const phase = t.phase || (t.connected ? 'connected' : t.connecting ? 'connecting' : t.lastError ? 'failed' : 'idle');
    let cls = 'status-idle', txt = '\u25CF ' + (S.mode === 'test' ? 'Test' : S.mode === 'offline' ? 'Offline' : 'Live: not connected');
    if (phase === 'connected') { cls = 'status-connected'; txt = '\u25CF ' + (live ? 'Live \u00B7 @' + (t.uniqueId || '') : 'Connected (chat paused)'); }
    else if (phase === 'connecting') { cls = 'status-connecting'; txt = '\u25CF Connecting...'; }
    else if (phase === 'retrying') { cls = 'status-connecting'; txt = '\u25CF Retrying...'; }
    else if (phase === 'failed') { cls = 'status-error'; txt = '\u25CF Not connected'; }
    else if (live) { cls = 'status-error'; }
    el.className = 'live-status-mini ' + cls + (live || phase !== 'idle' ? ' clickable' : ''); el.textContent = txt;
    el.hidden = !(live || t.connected || t.connecting);   // shown in Live mode (tap it to open the connection window)
    el.title = 'TikTok connection - tap to open';
    const ls = $('liveStatus'); ls.className = 'status-line ' + (t.connected ? 'status-connected' : t.connecting ? 'status-connecting' : (phase === 'failed') ? 'status-error' : 'status-idle');
    ls.textContent = (t.statusText || 'Not connected.') + (t.reason && phase !== 'connected' ? '  \u2014 ' + t.reason : '');
    renderModeButton(phase);
  }
  function tick() {
    if (!S) return;
    const end = S.solvedAt || Date.now() + (S.now ? 0 : 0);
    const sec = Math.max(0, Math.floor((end - S.startedAt) / 1000));
    $('stopwatch').textContent = '\u23F1 ' + String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
    const left = S.autoNextAt ? Math.max(0, Math.ceil((S.autoNextAt - Date.now()) / 1000)) : 0;
    const cd = $('autoNextCountdown'), rc = $('roundEndCountdown');
    if (S.solvedAt && S.autoNext && S.autoNextAt && left > 0) { cd.hidden = false; cd.textContent = 'Next puzzle in ' + left + 's'; rc.hidden = false; rc.textContent = 'Next puzzle in ' + left + 's'; }
    else { cd.hidden = true; rc.hidden = true; }
  }
  setInterval(tick, 500);

  // ---- Toasts & feed ---------------------------------------------------------
  let toastTimer = null;
  function describe(r) {
    const nums = r.nums ? r.nums.join(' ') : '';
    switch (r.kind) {
      case 'correct': {
        const combo = r.streak >= 2 ? ' (\u{1F525}\u00D7' + Math.min((S && S.comboMax) || 4, r.streak) + ')' : '';
        if (r.final) return { tone: 'correct', text: '\u{1F3C6} completed ' + r.group + '!', feed: nums + ' \u2014 completed ' + r.group + '! +' + r.gained + combo, points: '+' + r.gained };
        return { tone: 'correct', text: 'fused ' + r.group + ' \u2192 new tile ' + r.newN, feed: nums + ' \u2014 fused ' + r.group + ' \u2192 new tile #' + r.newN + ' (level ' + r.height + ') +' + r.gained + combo, points: '+' + r.gained };
      }
      case 'near': return { tone: 'info', text: nums + ' \u2014 one away!', feed: nums + ' \u2014 one away' };
      case 'wrong': return { tone: 'wrong', text: nums + ' \u2014 not a group', feed: nums + ' \u2014 not a group' };
      case 'invalid': return { tone: 'wrong', text: 'not on the board', feed: '"' + r.text + '" \u2014 tile not on the board (it may already be fused)' };
      case 'busy': return { tone: 'info', text: 'puzzle finished', feed: 'puzzle already finished' };
      default: return { tone: 'format', text: 'send 4 tile numbers', feed: '"' + r.text + '" \u2014 not four tile numbers' };
    }
  }
  function clearToast() { if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; } const a = $('liveGuessToastArea'); while (a.firstChild) a.removeChild(a.firstChild); }
  function scheduleToastRemoval(t) {
    toastTimer = setTimeout(() => { t.classList.add('leaving'); setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 350); }, Math.round(timingPrefs.toastSeconds * 1000));
  }
  function guessToast(r, d) {
    clearToast(); if (!displayPrefs.showToasts) return;
    const t = document.createElement('div'); t.className = 'guess-toast toast-' + d.tone;
    t.appendChild(avatarImg(r.avatar, r.uniqueId, dn(r.name)));
    const n = document.createElement('span'); n.className = 'guess-name'; n.textContent = dn(r.name); t.appendChild(n);
    if (r.kind === 'correct' && r.streak >= 2) { const b = document.createElement('span'); b.className = 'streak-badge'; b.textContent = '\u{1F525}\u00D7' + r.streak; t.appendChild(b); }
    const dt = document.createElement('span'); dt.className = 'guess-detail'; dt.textContent = d.text; t.appendChild(dt);
    if (d.points) { const p = document.createElement('span'); p.className = 'guess-points'; p.textContent = d.points; t.appendChild(p); }
    $('liveGuessToastArea').appendChild(t); scheduleToastRemoval(t);
  }
  function noticeToast(text) {
    clearToast(); if (!displayPrefs.showToasts) return; const t = document.createElement('div'); t.className = 'guess-toast toast-notice';
    const n = document.createElement('span'); n.className = 'guess-name'; n.textContent = text; t.appendChild(n);
    $('liveGuessToastArea').appendChild(t); scheduleToastRemoval(t);
  }
  function feedItem(r, d) {
    const li = document.createElement('li'); li.className = 'feed-row ' + (d.tone === 'correct' ? 'feed-correct' : d.tone === 'wrong' ? 'feed-wrong' : 'feed-info');
    li.appendChild(avatarImg(r.avatar, r.uniqueId, dn(r.name), 'sm'));
    const sp = document.createElement('span'); sp.className = 'feed-text';
    const who = document.createElement('span'); who.className = 'feed-user'; who.textContent = dn(r.name) + ': '; sp.appendChild(who); sp.appendChild(document.createTextNode(d.feed));
    li.appendChild(sp); const f = $('feedList'); f.insertBefore(li, f.firstChild); while (f.children.length > 40) f.removeChild(f.lastChild);
  }
  socket.on('guessResult', (r) => {
    const d = describe(r); feedItem(r, d); guessToast(r, d);
    playSound(r.kind === 'correct' ? (r.final ? 'final' : 'fuse') : r.kind === 'near' ? 'near' : (r.kind === 'wrong' || r.kind === 'invalid') ? 'wrong' : '');
    if (r.kind === 'wrong' || r.kind === 'near') {
      wrongNums = r.nums || []; if (S) renderBoard();
      clearTimeout(wrongTimer); wrongTimer = setTimeout(() => { wrongNums = []; if (S) renderBoard(); }, ((S && S.mismatchSeconds) || 2) * 1000);
    }
  });
  socket.on('notice', (n) => noticeToast(n.text));
  socket.on('newGame', () => { $('feedList').innerHTML = ''; wrongNums = []; selected = []; closeRoundEnd(); });

  // ---- Round-end window: round scorers, then all-time, then closes ------------
  let reTimers = [];
  function closeRoundEnd() { reTimers.forEach(clearTimeout); reTimers = []; $('roundEndOverlay').hidden = true; }
  socket.on('roundEnd', (d) => {
    closeRoundEnd();
    $('roundEndTitle').textContent = "This Round's Top Scorers";
    $('roundEndSummary').textContent = 'Puzzle: ' + d.title;
    fillList($('roundEndList'), d.round, true, 10); $('roundEndOverlay').hidden = false;
    reTimers.push(setTimeout(() => {
      $('roundEndTitle').textContent = 'All-Time Top Scorers'; $('roundEndSummary').textContent = '';
      fillList($('roundEndList'), d.allTime, true, 20);
      reTimers.push(setTimeout(closeRoundEnd, timingPrefs.allTimeWindowSeconds * 1000));
    }, timingPrefs.roundWindowSeconds * 1000));
  });
  $('roundEndCloseBtn').addEventListener('click', closeRoundEnd);
  $('roundEndNewGameBtn').addEventListener('click', () => { closeRoundEnd(); socket.emit('host:newGame', {}); });

  // ---- Leaderboard window ----------------------------------------------------
  function showLbTab(t) {
    lbTab = t;
    document.querySelectorAll('.lb-modal-tab').forEach((b) => b.classList.toggle('active', b.dataset.lbTab === t));
    $('leaderboardModalRoundList').hidden = t !== 'round'; $('leaderboardModalAllTimeList').hidden = t !== 'alltime';
  }
  document.querySelectorAll('.lb-modal-tab').forEach((b) => { if (b.dataset.lbTab !== 'teams') b.addEventListener('click', () => showLbTab(b.dataset.lbTab)); });
  $('leaderboardTopBtn').addEventListener('click', () => { showLbTab('round'); $('leaderboardOverlay').hidden = false; });
  $('leaderboardModalCloseBtn').addEventListener('click', () => { $('leaderboardOverlay').hidden = true; });
  $('lbResetBtn').addEventListener('click', () => {
    if (lbTab === 'round') { if (confirm('Reset the This Round scores?')) socket.emit('host:resetRoundScores'); }
    else if (confirm('Reset ALL-TIME scores? This cannot be undone.')) socket.emit('host:resetAllTimeScores');
  });

  // ---- Settings drawer -------------------------------------------------------
  const openSettings = () => { $('settingsOverlay').hidden = false; setTimeout(refitTiles, 30); setTimeout(refitTiles, 300); };
  const closeSettings = () => { $('settingsOverlay').hidden = true; };
  $('settingsBtn').addEventListener('click', openSettings);
  $('closeSettingsBtn').addEventListener('click', closeSettings);
  $('settingsBackdrop').addEventListener('click', closeSettings);
  function showPanels(mode) {
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
    document.querySelectorAll('.panel[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== mode; });
  }
  document.querySelectorAll('.mode-btn').forEach((b) => b.addEventListener('click', () => pickMode(b.dataset.mode)));

  function renderPacks() {
    const g = $('packGrid'); if (!g || !S) return; g.innerHTML = '';
    cfg.packs.forEach((p) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'emoji-pack-btn' + (p.id === S.pack ? ' active' : ''); b.textContent = p.label;
      b.addEventListener('click', () => socket.emit('host:setPack', { pack: p.id })); g.appendChild(b);
    });
  }
  function syncControls() {
    if (document.activeElement && /INPUT/.test(document.activeElement.tagName) && $('settingsOverlay').contains(document.activeElement)) return;
    $('autoNextToggle').checked = S.autoNext; $('botsToggle').checked = S.bots;
    $('autoNextDelayInput').value = S.autoNextDelaySeconds; $('mismatchDelayInput').value = S.mismatchSeconds;
    $('peekDurationInput').value = S.peekSeconds; $('pointsInput').value = S.pointsPerGroup;
    fillRules({ difficulty: S.difficulty, groupsPerRound: S.groupsPerRound, twoLevel: S.twoLevel, comboEnabled: S.comboEnabled, comboMax: S.comboMax, showNear: S.showNear, finalBonus: S.finalBonus, guessCooldown: S.guessCooldown });
    $('toastDurationInput').value = timingPrefs.toastSeconds; $('roundWindowDurationInput').value = timingPrefs.roundWindowSeconds; $('allTimeWindowDurationInput').value = timingPrefs.allTimeWindowSeconds;
  }
  function pushSettings() {
    const num = (id, d) => { const v = parseFloat($(id).value); return Number.isFinite(v) ? v : d; };
    timingPrefs.toastSeconds = num('toastDurationInput', 4); timingPrefs.roundWindowSeconds = num('roundWindowDurationInput', 8); timingPrefs.allTimeWindowSeconds = num('allTimeWindowDurationInput', 8);
    writeJson('fusedle-timing', timingPrefs);
    socket.emit('host:setAutoNext', { enabled: $('autoNextToggle').checked, delaySeconds: num('autoNextDelayInput', 8) });
    socket.emit('host:setRules', rulesPayload());
    socket.emit('host:setTiming', { autoNextDelaySeconds: num('autoNextDelayInput', 8), mismatchSeconds: num('mismatchDelayInput', 2), peekSeconds: num('peekDurationInput', 4), pointsPerGroup: num('pointsInput', 1) });
  }
  function confirmMsg(text) { const c = $('saveSettingsConfirm'); c.textContent = text; c.hidden = false; setTimeout(() => { c.hidden = true; }, 3500); }
  $('saveSettingsBtn').addEventListener('click', () => { pushSettings(); confirmMsg('Settings applied.'); });
  $('saveDefaultSettingsBtn').addEventListener('click', () => {
    pushSettings();
    writeJson('fusedle-defaults', Object.assign({
      theme: currentTheme(), mode: S ? S.mode : 'test', pack: S ? S.pack : 'mixed',
      autoNext: $('autoNextToggle').checked, autoNextDelaySeconds: parseFloat($('autoNextDelayInput').value) || 8,
      mismatchSeconds: parseFloat($('mismatchDelayInput').value) || 2, peekSeconds: parseFloat($('peekDurationInput').value) || 4,
      pointsPerGroup: parseFloat($('pointsInput').value) || 1, bots: $('botsToggle').checked, username: $('tiktokUsername').value.trim(),
    }, rulesPayload()));
    confirmMsg('Saved. These settings are re-applied whenever this page opens on a fresh server.');
  });
  $('clearDefaultSettingsBtn').addEventListener('click', () => { try { localStorage.removeItem('fusedle-defaults'); } catch (e) { /* ignore */ } confirmMsg('Saved default cleared.'); });
  $('resetTimingBtn').addEventListener('click', () => {
    Object.assign(timingPrefs, TIMING_DEFAULTS); writeJson('fusedle-timing', timingPrefs);
    $('autoNextDelayInput').value = 8; $('mismatchDelayInput').value = 2; $('peekDurationInput').value = 4; $('pointsInput').value = 1; syncTimingInputs(); pushSettings();
  });
  function syncTimingInputs() { $('toastDurationInput').value = timingPrefs.toastSeconds; $('roundWindowDurationInput').value = timingPrefs.roundWindowSeconds; $('allTimeWindowDurationInput').value = timingPrefs.allTimeWindowSeconds; }
  $('botsToggle').addEventListener('change', () => socket.emit('host:setBots', { enabled: $('botsToggle').checked }));
  $('autoNextToggle').addEventListener('change', () => socket.emit('host:setAutoNext', { enabled: $('autoNextToggle').checked, delaySeconds: parseFloat($('autoNextDelayInput').value) || 8 }));
  const newGame = () => socket.emit('host:newGame', {});
  $('newGameBtn').addEventListener('click', () => { newGame(); closeSettings(); });
  $('newGameTopBtn').addEventListener('click', newGame);

  // ---- Host tools ---------------------------------------------------------------
  const peek = () => socket.emit('host:peek'), hint = () => socket.emit('host:hint');
  $('peekTopBtn').addEventListener('click', peek); $('peekBtn').addEventListener('click', peek);
  $('hintTopBtn').addEventListener('click', hint); $('hintBtn').addEventListener('click', hint);
  $('revealPairTopBtn').addEventListener('click', () => socket.emit('host:revealGroup', { count: 1 }));
  $('revealPairBtn').addEventListener('click', () => socket.emit('host:revealGroup', { count: 1 }));
  $('revealThreeBtn').addEventListener('click', () => socket.emit('host:revealGroup', { count: 3 }));
  $('revealBoardBtn').addEventListener('click', () => { if (confirm('Reveal the whole board? This ends the puzzle.')) socket.emit('host:revealBoard'); });
  $('resetRoundBtn').addEventListener('click', () => { if (confirm('Reset the This Round scores?')) socket.emit('host:resetRoundScores'); });
  $('resetAllTimeBtn').addEventListener('click', () => { if (confirm('Reset ALL-TIME scores? This cannot be undone.')) socket.emit('host:resetAllTimeScores'); });

  // ---- Test / Live panels ---------------------------------------------------------
  $('simulateBtn').addEventListener('click', () => socket.emit('test:simulate'));
  const sendTest = () => { const v = $('testCustomText').value.trim(); if (v) { socket.emit('host:manualInput', { user: 'Test Viewer', text: v }); $('testCustomText').value = ''; } };
  $('testCustomBtn').addEventListener('click', sendTest);
  $('testCustomText').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendTest(); });

  // ---- Guess bar (Offline) and Host console ---------------------------------------
  const submitBar = () => { const v = $('offlineGuessInput').value; sendGuess(v); $('offlineGuessInput').value = ''; selected = []; if (S) renderBoard(); };
  $('offlineGuessBtn').addEventListener('click', submitBar);
  $('offlineGuessInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitBar(); });
  $('playerGuessBarToggle').addEventListener('click', () => {
    const bar = $('playerGuessBar'), c = bar.classList.toggle('collapsed'); $('playerGuessBarToggle').innerHTML = c ? '&#9660; Show' : '&#9650; Hide';
  });
  const sendHost = () => { const v = $('hostConsoleInput').value; sendGuess(v); $('hostConsoleInput').value = ''; };
  $('hostConsoleBtn').addEventListener('click', sendHost);
  $('hostConsoleInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendHost(); });
  $('hostConsoleToggle').addEventListener('click', () => { $('hostConsoleBar').hidden = true; $('hostConsoleShowBtn').hidden = false; });
  $('hostConsoleShowBtn').addEventListener('click', () => { $('hostConsoleBar').hidden = false; $('hostConsoleShowBtn').hidden = true; });
  document.querySelector('.live-scoreboard').addEventListener('click', () => { if ($('detailsPanel').hidden) $('detailsToggle').click(); });
  $('detailsCloseBtn').addEventListener('click', () => $('detailsToggle').click());
  $('detailsToggle').addEventListener('click', () => { const p = $('detailsPanel'); p.hidden = !p.hidden; $('detailsToggle').innerHTML = (p.hidden ? '&#9660;' : '&#9650;') + ' Leaderboard &amp; Activity'; });

  // ---- Full screen -----------------------------------------------------------------
  $('fullscreenBtn').addEventListener('click', () => {
    const el = document.querySelector('.app-shell');
    if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  });

  // ---- Socket events ----------------------------------------------------------------
  socket.on('liveConfig', (c) => {
    cfg = c;
    $('liveKeyHintManual').hidden = !!c.hasDefaultSignApiKey; $('liveKeyHintDefault').hidden = !c.hasDefaultSignApiKey; $('liveKeyField').hidden = !!c.hasDefaultSignApiKey;
    if (!$('tiktokUsername').value) $('tiktokUsername').value = c.defaultUsername || localStorage.getItem('fusedle-username') || '';
    if (!c.hasDefaultSignApiKey && !$('tiktokApiKey').value) $('tiktokApiKey').value = savedKey();
    renderLiveModal();
    renderPacks();
  });
  socket.on('leaderboard', (d) => { lb = d; renderLists(); });
  socket.on('state', (s) => {
    const first = !S; S = s;
    renderBoard(); renderStatus(); renderPacks(); syncControls(); showPanelsOnce(); onTikTokState(); renderLegend(); renderLevelButton();
    $('playerGuessBar').hidden = s.mode !== 'offline';
    $('rawEventCount').textContent = s.rawEventCount;
    const ev = s.lastEvent; $('lastReceived').textContent = ev && ev.text ? ev.user + ': "' + ev.text + '" \u2192 ' + (ev.read ? 'read as ' + ev.read + ' (' + ev.kind + ')' : ev.kind) : '(none yet)';
    tick();
    if (first && !appliedDefaults) {
      appliedDefaults = true; const d = readJson('fusedle-defaults');
      if (d && d.mode) { if (d.theme) applyTheme(d.theme); socket.emit('host:applyDefaults', d); }
    }
  });

  // ---- Legends for the fused-tile colours (always the colours picked in Settings > Fused tile colours) ----
  // The legend explains the current difficulty level and ONLY the fusion levels that can really appear on it:
  //   Easy = no fused tiles (legend hidden), Moderate = Level 1, Hard = Levels 1-2, Very Hard = 1-3, Extreme = 1-4, Extremely Hard = 1-5, Insane = 1-6.
  function renderLegend() {
    const lg = $('fusedLegend');
    const diff = S && LEVEL_INFO[S.difficulty] ? S.difficulty : 3, info = LEVEL_INFO[diff];
    // S.maxLevels = the number of fusions of the deepest group on this board, so the highest fused-tile level is one less.
    const topFused = S ? Math.max(0, (S.maxLevels || 0) - 1) : info.fusionLevels;
    const cols = (topFused === 3 || topFused >= 5) ? 3 : topFused >= 2 ? 2 : 1;   // 3, 5 or 6 items sit in 3 columns, 2 or 4 items in 2 columns
    const compact = cols === 3;   // 3 columns: shorter built-in texts so the legend stays small on a phone
    FUSED_LEVELS.forEach((k) => {
      const sw = $('flSw' + k); if (!sw) return;
      const v = fusedPrefs[k], on = hexOk(v);
      if (on) { const st = fusedStyle(v); sw.style.background = 'linear-gradient(' + st.b1 + ',' + st.b2 + ')'; sw.style.borderColor = st.be; sw.style.outlineColor = st.be; sw.style.color = st.tx; sw.classList.remove('plain'); }
      else { sw.style.background = ''; sw.style.borderColor = ''; sw.style.outlineColor = ''; sw.style.color = ''; sw.classList.add('plain'); }
      let custom = ''; try { custom = String(displayPrefs['legend' + k] || '').trim(); } catch (e) { /* prefs not read yet */ }
      const body = $('flBody' + k); if (body) body.textContent = custom || legendDefault(k, k === topFused, compact);
      const ttl = $('flTitle' + k); if (ttl) ttl.textContent = (compact && !custom) ? 'Fused ' + TIMES_WORD[k] : 'Level ' + k;   // compact legend (3 columns): the swatch number is the level, the title says how often it was fused
      const it = sw.parentNode; if (it) { it.title = on ? '' : 'Same colour as the other tiles (chosen in Settings)'; it.hidden = k > topFused; }
    });
    const head = $('flHead');
    if (head) {
      head.textContent = 'Level ' + diff + ' (' + info.name + '): ' + info.note + (topFused > 0 ? (compact ? '. Colour = times fused.' : '. Each colour shows how many times a tile has been fused.') : '.');
    }
    if (lg) {
      lg.hidden = topFused < 1;
      lg.dataset.items = String(Math.max(0, topFused));
      lg.dataset.cols = String(cols);
    }
    if (typeof queueFit === 'function' && S) queueFit();
  }

  // ---- Live chat box under the tiles ----
  const chatMsgs = [];
  let chatCollapsed = false, chatSig = '';
  try { chatCollapsed = localStorage.getItem('fusedle-chat-collapsed') === '1'; } catch (e) { /* ignore */ }
  const CHAT_TAGS = { correct: ['\u2705', 'fused'], near: ['\u{1F90F}', 'one away'], wrong: ['\u274C', 'wrong'], invalid: ['\u274C', 'not on board'], cooldown: ['\u23F3', 'wait'], busy: ['\u23F8', 'round over'] };
  // Writes a comment into the page as plain text (never as HTML), so any letters, symbols, emojis, emoticons and
  // other languages show exactly as typed. TikTok emotes (small pictures) are placed where the viewer put them.
  function fillChatText(el, text, emotes) {
    text = String(text == null ? '' : text);
    const list = Array.isArray(emotes) ? emotes.filter((e) => e && typeof e.url === 'string' && /^https?:\/\//i.test(e.url)) : [];
    if (!list.length) { el.textContent = text; return; }
    const chars = Array.from(text);
    const at = {};
    list.forEach((e) => { const p = Math.max(0, Math.min(chars.length, Number.isFinite(Number(e.pos)) ? Math.floor(Number(e.pos)) : chars.length)); (at[p] = at[p] || []).push(e.url); });
    const addImgs = (p) => (at[p] || []).forEach((u) => {
      const im = document.createElement('img'); im.className = 'chat-emote'; im.src = u; im.alt = ''; im.loading = 'lazy'; im.referrerPolicy = 'no-referrer';
      im.addEventListener('error', () => { im.remove(); });
      el.appendChild(im);
    });
    let buf = '';
    for (let i = 0; i <= chars.length; i++) {
      if (at[i]) { if (buf) { el.appendChild(document.createTextNode(buf)); buf = ''; } addImgs(i); }
      if (i < chars.length) buf += chars[i];
    }
    if (buf) el.appendChild(document.createTextNode(buf));
  }
  function chatLi(m) {
    const li = document.createElement('li'); li.className = 'chat-msg' + (m.guess ? ' is-guess' : '') + (m.kind ? ' k-' + m.kind : '');
    li.appendChild(avatarImg(m.avatar, m.uniqueId, dn(m.name), 'sm'));
    const body = document.createElement('span'); body.className = 'chat-body-text';
    const nm = document.createElement('b'); nm.className = 'chat-name'; nm.textContent = dn(m.name); body.appendChild(nm);
    const tx = document.createElement('span'); tx.className = 'chat-text'; fillChatText(tx, m.text, m.emotes); body.appendChild(tx);
    const tag = m.guess && CHAT_TAGS[m.kind];
    if (tag) { const t = document.createElement('span'); t.className = 'chat-tag'; t.textContent = tag[0] + ' ' + tag[1]; body.appendChild(t); }
    li.appendChild(body);
    return li;
  }
  const chatVisible = (m) => displayPrefs.chatGuesses || !m.guess;
  function chatStuck(log) { return log.scrollTop + log.clientHeight >= log.scrollHeight - 28; }
  function renderChatAll() {
    const log = $('chatLog'); if (!log) return;
    log.innerHTML = '';
    chatMsgs.filter(chatVisible).slice(-displayPrefs.chatKeep).forEach((m) => log.appendChild(chatLi(m)));
    log.scrollTop = log.scrollHeight;
    const c = $('chatCount'); if (c) c.textContent = log.children.length ? String(log.children.length) : '';
    chatSig = displayPrefs.chatGuesses + '|' + displayPrefs.blocked + '|' + displayPrefs.chatKeep;
  }
  function addChat(m) {
    chatMsgs.push(m); while (chatMsgs.length > 120) chatMsgs.shift();
    const log = $('chatLog'); if (!log || !chatVisible(m)) return;
    const stick = chatStuck(log);
    log.appendChild(chatLi(m));
    while (log.children.length > displayPrefs.chatKeep) log.removeChild(log.firstChild);
    if (stick) log.scrollTop = log.scrollHeight;
    const c = $('chatCount'); if (c) c.textContent = String(log.children.length);
  }
  function applyChatLayout() {
    const box = $('chatBox'); if (!box) return;
    box.classList.toggle('collapsed', chatCollapsed);
    const t = $('chatToggle'); if (t) { t.innerHTML = chatCollapsed ? '&#9650; Show' : '&#9660; Hide'; t.setAttribute('aria-expanded', chatCollapsed ? 'false' : 'true'); t.setAttribute('aria-label', chatCollapsed ? 'Show chat' : 'Hide chat'); }
    const ph = $('chatInput'); if (ph && displayPrefs.chatName) ph.placeholder = 'Message as ' + displayPrefs.chatName; else if (ph) ph.placeholder = 'Message or guess';
    if (chatSig && chatSig !== displayPrefs.chatGuesses + '|' + displayPrefs.blocked + '|' + displayPrefs.chatKeep) renderChatAll();
    if (typeof queueFit === 'function' && S) queueFit();
  }
  function sendChat() {
    const inp = $('chatInput'); const v = inp.value.trim(); if (!v) return;
    socket.emit('chat:send', { user: displayPrefs.chatName.trim() || 'Host', text: v }); inp.value = '';
  }
  $('chatSendBtn').addEventListener('click', sendChat);
  $('chatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) sendChat(); });   // not while an emoji / Chinese / Japanese / Korean suggestion is being picked
  $('chatToggle').addEventListener('click', () => { chatCollapsed = !chatCollapsed; try { localStorage.setItem('fusedle-chat-collapsed', chatCollapsed ? '1' : '0'); } catch (e) { /* ignore */ } applyChatLayout(); });
  $('chatClearBtn').addEventListener('click', () => socket.emit('host:clearChat'));
  socket.on('chat', addChat);
  socket.on('chatHistory', (list) => { chatMsgs.length = 0; (list || []).forEach((m) => chatMsgs.push(m)); renderChatAll(); });
  if (window.ResizeObserver) { const pv = $('tilePreview'); if (pv) new ResizeObserver(refitTiles).observe(pv); }

  buildBrandPickers();
  applyDisplay(false);
  let panelsMode = null;
  function showPanelsOnce() { if (panelsMode !== S.mode) { panelsMode = S.mode; showPanels(S.mode); } }
})();
