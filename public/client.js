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
  const FUSED_DEFAULTS = { 1: '#1F7A72', 2: '#9B2C4F' };       // 'none' = same as the other tiles
  const hexOk = (v) => /^#[0-9a-f]{6}$/i.test(String(v || ''));
  let fusedPrefs = (function () {
    const p = readJson('fusedle-fused'), o = {};
    [1, 2].forEach((k) => { o[k] = (p[k] === 'none' || hexOk(p[k])) ? p[k] : FUSED_DEFAULTS[k]; });
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
    [1, 2].forEach((k) => {
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
  }
  function buildFusedPickers() {
    [1, 2].forEach((k) => {
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
    $('fcResetBtn').addEventListener('click', () => { fusedPrefs = { 1: FUSED_DEFAULTS[1], 2: FUSED_DEFAULTS[2] }; applyFusedColors(); });
    applyFusedColors();
  }
  buildFusedPickers();

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
      li.appendChild(avatarImg(r.avatar, r.uniqueId, r.name, big ? 'lg' : ''));
      const nm = document.createElement('span'); nm.className = big ? 'round-end-name' : 'lb-name'; nm.textContent = r.name; li.appendChild(nm);
      if (r.streak >= 2) { const b = document.createElement('span'); b.className = 'streak-badge'; b.textContent = '\u{1F525}\u00D7' + r.streak; li.appendChild(b); }
      const pts = document.createElement('span'); pts.className = big ? 'round-end-points' : 'lb-points'; pts.textContent = big ? r.points + (r.points === 1 ? ' pt' : ' pts') : r.points; li.appendChild(pts);
      el.appendChild(li);
    });
  }
  function renderLists() {
    fillList($('liveRoundList'), lb.round, false, 5); fillList($('liveAllTimeList'), lb.allTime, false, 5);
    fillList($('leaderboardList'), lb.round, false); fillList($('allTimeLeaderboardList'), lb.allTime, false);
    fillList($('leaderboardModalRoundList'), lb.round, true); fillList($('leaderboardModalAllTimeList'), lb.allTime, true);
  }

  // ---- Board -------------------------------------------------------------
  // Colour per group (peek tint + finished-group cards) and per fusion level (fused tiles).
  // Soft, cute-but-mature pastel colours for finished groups (all used with dark text, so letters stay easy to read).
  const GROUP_COLORS = ['#F4B6C2', '#B7D9B0', '#CDB4E6', '#FFE29A', '#FFC4A3', '#A9D4EE', '#D9C3A5', '#B9BEF2'];
  const groupColor = (g) => GROUP_COLORS[Math.abs(Number(g) || 0) % GROUP_COLORS.length];
  let wrongNums = [], wrongTimer = null;
  const tileEls = new Map();      // tile number -> button element (kept between renders so animations play once)
  let renderedStart = null;

  function mk(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }

  // A finished group is one small card: category name, the viewer who fused it (round TikTok photo + name)
  // and only the 4 latest words that made it. It stays compact so tiles and scores never leave the screen.
  function solvedCard(g, isNew, idx) {
    const d = mk('div', 'solved-card' + (isNew ? ' is-new' : '')); d.style.setProperty('--gc', GROUP_COLORS[(idx || 0) % GROUP_COLORS.length]);   // each finished group gets the next colour, so no two cards look alike
    const by = g.by || null;
    d.appendChild(by ? avatarImg(by.avatar, by.uniqueId, by.name, 'sm') : mk('span', 'solved-host', '\u2728'));
    const t = mk('div', 'solved-text');
    t.appendChild(mk('b', 'solved-cat', '\u{1F3C6} ' + g.name));
    const sub = mk('span', 'solved-sub');
    sub.appendChild(mk('span', 'solved-by', by ? by.name : 'Host reveal'));
    sub.appendChild(mk('span', 'solved-words', (g.words || []).join(' \u00B7 ')));
    t.appendChild(sub);
    d.appendChild(t);
    return d;
  }

  function makeTile(t, fresh) {
    const b = mk('button', 'tile'); b.type = 'button'; b.dataset.n = t.n;
    b.dataset.s = String(Number(t.n) % 6);                 // 6 shades of gray for the number circle
    b.appendChild(mk('i', '', t.n));                      // number circle (its own column, never over the word)
    const body = mk('span', 'tile-text');
    if (t.f) {
      b.classList.add('fused'); b.dataset.f = Math.min(4, t.f);
      body.appendChild(mk('span', 'tile-name', t.w));
      body.appendChild(mk('span', 'tile-sub', t.sub || ''));
      if (fresh) b.classList.add('fresh');
    } else {
      body.appendChild(mk('span', 'tile-word', t.w));
    }
    // font size follows the longest single word, so a word is never cut in the middle
    const longest = String(t.w || '').split(/\s+/).reduce((m, x) => Math.max(m, x.length), 4);
    b.style.setProperty('--k', (1 / (0.69 * Math.max(4, longest))).toFixed(4));
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
    const merging = removed.length > 0 && removed.length <= 12 && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    selected = selected.filter((n) => present.has(n));
    const rank = new Map(); S.tiles.slice().sort((a, b) => a.s - b.s).forEach((t, i) => rank.set(t.n, i));
    S.tiles.forEach((t) => {
      let el = tileEls.get(t.n);
      if (!el) {
        const fresh = !!(S.lastFusion && S.lastFusion.newN === t.n && (S.now - S.lastFusion.at) < 3000);
        el = makeTile(t, fresh); tileEls.set(t.n, el);
        if (!newRound && !t.f) el.classList.add('drop');   // a waiting tile drops into a freed space
        if (merging) el.style.animationDelay = t.f ? '.5s' : '.6s';   // wait until the merging tiles have arrived
        grid.appendChild(el);
      }
      const pos = rank.get(t.n);   // tiles are packed upward: they fill every space the earlier tiles left behind
      el.style.gridColumn = String((pos % (S.cols || 4)) + 1); el.style.gridRow = String(Math.floor(pos / (S.cols || 4)) + 1);
      el.classList.toggle('sel', selected.includes(t.n));
      el.classList.toggle('wrong', wrongNums.includes(t.n));
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
    const t = S.tiktok, el = $('liveStatusMini');
    let cls = 'status-idle', txt = '\u25CF ' + (S.mode === 'test' ? 'Test' : S.mode === 'offline' ? 'Offline' : 'Live: waiting');
    if (t.connected) { cls = 'status-connected'; txt = '\u25CF ' + (S.mode === 'live' ? 'Live \u00B7 @' + (t.uniqueId || '') : 'Connected (chat paused)'); }
    else if (t.connecting) { cls = 'status-connecting'; txt = '\u25CF Connecting...'; }
    else if (t.lastError) { cls = 'status-error'; txt = '\u25CF Not connected'; }
    el.className = 'live-status-mini ' + cls; el.textContent = txt;
    const ls = $('liveStatus'); ls.className = 'status-line ' + (t.connected ? 'status-connected' : t.connecting ? 'status-connecting' : t.lastError ? 'status-error' : 'status-idle');
    ls.textContent = t.statusText || 'Not connected.';
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
        const combo = r.streak >= 2 ? ' (\u{1F525}\u00D7' + Math.min(4, r.streak) + ')' : '';
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
    clearToast();
    const t = document.createElement('div'); t.className = 'guess-toast toast-' + d.tone;
    t.appendChild(avatarImg(r.avatar, r.uniqueId, r.name));
    const n = document.createElement('span'); n.className = 'guess-name'; n.textContent = r.name; t.appendChild(n);
    if (r.kind === 'correct' && r.streak >= 2) { const b = document.createElement('span'); b.className = 'streak-badge'; b.textContent = '\u{1F525}\u00D7' + r.streak; t.appendChild(b); }
    const dt = document.createElement('span'); dt.className = 'guess-detail'; dt.textContent = d.text; t.appendChild(dt);
    if (d.points) { const p = document.createElement('span'); p.className = 'guess-points'; p.textContent = d.points; t.appendChild(p); }
    $('liveGuessToastArea').appendChild(t); scheduleToastRemoval(t);
  }
  function noticeToast(text) {
    clearToast(); const t = document.createElement('div'); t.className = 'guess-toast toast-notice';
    const n = document.createElement('span'); n.className = 'guess-name'; n.textContent = text; t.appendChild(n);
    $('liveGuessToastArea').appendChild(t); scheduleToastRemoval(t);
  }
  function feedItem(r, d) {
    const li = document.createElement('li'); li.className = 'feed-row ' + (d.tone === 'correct' ? 'feed-correct' : d.tone === 'wrong' ? 'feed-wrong' : 'feed-info');
    li.appendChild(avatarImg(r.avatar, r.uniqueId, r.name, 'sm'));
    const sp = document.createElement('span'); sp.className = 'feed-text';
    const who = document.createElement('span'); who.className = 'feed-user'; who.textContent = r.name + ': '; sp.appendChild(who); sp.appendChild(document.createTextNode(d.feed));
    li.appendChild(sp); const f = $('feedList'); f.insertBefore(li, f.firstChild); while (f.children.length > 40) f.removeChild(f.lastChild);
  }
  socket.on('guessResult', (r) => {
    const d = describe(r); feedItem(r, d); guessToast(r, d);
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
  const openSettings = () => { $('settingsOverlay').hidden = false; };
  const closeSettings = () => { $('settingsOverlay').hidden = true; };
  $('settingsBtn').addEventListener('click', openSettings);
  $('closeSettingsBtn').addEventListener('click', closeSettings);
  $('settingsBackdrop').addEventListener('click', closeSettings);
  function showPanels(mode) {
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
    document.querySelectorAll('.panel[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== mode; });
  }
  document.querySelectorAll('.mode-btn').forEach((b) => b.addEventListener('click', () => { showPanels(b.dataset.mode); socket.emit('host:setMode', { mode: b.dataset.mode }); }));

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
    $('toastDurationInput').value = timingPrefs.toastSeconds; $('roundWindowDurationInput').value = timingPrefs.roundWindowSeconds; $('allTimeWindowDurationInput').value = timingPrefs.allTimeWindowSeconds;
  }
  function pushSettings() {
    const num = (id, d) => { const v = parseFloat($(id).value); return Number.isFinite(v) ? v : d; };
    timingPrefs.toastSeconds = num('toastDurationInput', 4); timingPrefs.roundWindowSeconds = num('roundWindowDurationInput', 8); timingPrefs.allTimeWindowSeconds = num('allTimeWindowDurationInput', 8);
    writeJson('fusedle-timing', timingPrefs);
    socket.emit('host:setAutoNext', { enabled: $('autoNextToggle').checked, delaySeconds: num('autoNextDelayInput', 8) });
    socket.emit('host:setTiming', { autoNextDelaySeconds: num('autoNextDelayInput', 8), mismatchSeconds: num('mismatchDelayInput', 2), peekSeconds: num('peekDurationInput', 4), pointsPerGroup: num('pointsInput', 1) });
  }
  function confirmMsg(text) { const c = $('saveSettingsConfirm'); c.textContent = text; c.hidden = false; setTimeout(() => { c.hidden = true; }, 3500); }
  $('saveSettingsBtn').addEventListener('click', () => { pushSettings(); confirmMsg('Settings applied.'); });
  $('saveDefaultSettingsBtn').addEventListener('click', () => {
    pushSettings();
    writeJson('fusedle-defaults', {
      theme: currentTheme(), mode: S ? S.mode : 'test', pack: S ? S.pack : 'mixed',
      autoNext: $('autoNextToggle').checked, autoNextDelaySeconds: parseFloat($('autoNextDelayInput').value) || 8,
      mismatchSeconds: parseFloat($('mismatchDelayInput').value) || 2, peekSeconds: parseFloat($('peekDurationInput').value) || 4,
      pointsPerGroup: parseFloat($('pointsInput').value) || 1, bots: $('botsToggle').checked, username: $('tiktokUsername').value.trim(),
    });
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
  $('connectLiveBtn').addEventListener('click', () => {
    const u = $('tiktokUsername').value.trim(); try { localStorage.setItem('fusedle-username', u); } catch (e) { /* ignore */ }
    socket.emit('tiktok:connect', { uniqueId: u, apiKey: $('tiktokApiKey').value.trim() });
  });
  $('disconnectLiveBtn').addEventListener('click', () => socket.emit('tiktok:disconnect'));

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
    $('liveKeyHintManual').hidden = !!c.hasDefaultSignApiKey; $('liveKeyHintDefault').hidden = !c.hasDefaultSignApiKey; $('tiktokApiKey').hidden = !!c.hasDefaultSignApiKey;
    if (!$('tiktokUsername').value) $('tiktokUsername').value = c.defaultUsername || localStorage.getItem('fusedle-username') || '';
    renderPacks();
  });
  socket.on('leaderboard', (d) => { lb = d; renderLists(); });
  socket.on('state', (s) => {
    const first = !S; S = s;
    renderBoard(); renderStatus(); renderPacks(); syncControls(); showPanelsOnce();
    $('playerGuessBar').hidden = s.mode !== 'offline';
    $('rawEventCount').textContent = s.rawEventCount;
    const ev = s.lastEvent; $('lastReceived').textContent = ev && ev.text ? ev.user + ': "' + ev.text + '" \u2192 ' + (ev.read ? 'read as ' + ev.read + ' (' + ev.kind + ')' : ev.kind) : '(none yet)';
    tick();
    if (first && !appliedDefaults) {
      appliedDefaults = true; const d = readJson('fusedle-defaults');
      if (d && d.mode) { if (d.theme) applyTheme(d.theme); socket.emit('host:applyDefaults', d); }
    }
  });
  let panelsMode = null;
  function showPanelsOnce() { if (panelsMode !== S.mode) { panelsMode = S.mode; showPanels(S.mode); } }
})();
