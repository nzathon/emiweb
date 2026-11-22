// ===== MONITOR untuk BlockChat MF =====
// File UI ada di monitor.html

const S = script.settings;
const T = {
  inv: 'Tampilkan inventory', status: 'Tampilkan HP/lapar/XP', effects: 'Tampilkan efek',
  boss: 'Tampilkan bossbar', bar: 'Tampilkan action bar', title: 'Tampilkan title',
  subtitle: 'Tampilkan subtitle', icons: 'Ikon item', skin: 'Skin pemain',
};
const K = {
  iconSrc: 'Sumber ikon (pisah koma, {name} = id item)',
  skinSrc: 'Sumber skin (pisah koma, {name} = username)',
  history: 'Riwayat teks (jumlah)',
  dbl: 'Ketuk dua kali pada slot',
  debug: 'Debug log',
};
for (const key of Object.keys(T)) S.create(T[key], 'boolean', true);

S.create(K.iconSrc, 'text', [
  'https://blockrender.dev/render/item/{name}.png',
  'https://blockrender.dev/render/block/{name}.png',
  'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/assets/minecraft/textures/item/{name}.png',
  'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.8/assets/minecraft/textures/block/{name}.png',
  'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.8/assets/minecraft/textures/item/{name}.png',
  'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21.8/assets/minecraft/textures/block/{name}.png'
].join(', '));

S.create(K.skinSrc, 'text', 'https://mc-heads.net/body/{name}, https://minotar.net/armor/body/{name}/120.png');
S.create(K.history, 'number', 15);
S.create(K.dbl, 'choice', 'left', ['left', 'right', 'middle', 'shift', 'off']);
S.create(K.debug, 'boolean', false);

const on = (key) => !!S.get(T[key], true);
const log = (...a) => app.log('[Monitor]', ...a);
const dbg = (...a) => { if (S.get(K.debug, false)) app.log('[Monitor][debug]', ...a); };
const splitList = (s) => String(s || '').split(/[\s,]+/).filter(Boolean);

// ==========================================
// FUNGSI PENYELAMAT STRINGIFY (ANTI CRASH)
// ==========================================
function safeStringify(obj) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    // 1. Abaikan properti yang bikin melingkar (circular)
    if (key === 'window' || key === 'inventory' || key === 'bot' || key === 'client' || key === 'entity') {
      return undefined;
    }
    
    // 2. Ubah BigInt jadi teks biasa
    if (typeof value === 'bigint') {
      return String(value);
    }
    
    // 3. Tangani Circular Reference
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    
    return value;
  }, 2); // indentasi 2 spasi biar rapi
}

// ==========================================
// UBAH KOMPONEN TEKS MENJADI TEKS BERWARNA
// ==========================================
const COLORS = {
  black: '#000000', dark_blue: '#0000aa', dark_green: '#00aa00', dark_aqua: '#00aaaa',
  dark_red: '#aa0000', dark_purple: '#aa00aa', gold: '#ffaa00', gray: '#aaaaaa',
  dark_gray: '#555555', blue: '#5555ff', green: '#55ff55', aqua: '#55ffff',
  red: '#ff5555', light_purple: '#ff55ff', yellow: '#ffff55', white: '#ffffff',
};
const LEGACY = { 0: 'black', 1: 'dark_blue', 2: 'dark_green', 3: 'dark_aqua', 4: 'dark_red', 5: 'dark_purple',
  6: 'gold', 7: 'gray', 8: 'dark_gray', 9: 'blue', a: 'green', b: 'aqua', c: 'red', d: 'light_purple', e: 'yellow', f: 'white' };
const colorHex = (c) => {
  if (!c) return null;
  const s = String(c).toLowerCase();
  if (s[0] === '#') return s;
  return COLORS[s.replace('minecraft:', '')] || null;
};

function denbt(tag) {
  if (tag == null || typeof tag !== 'object') return tag;
  if (Array.isArray(tag)) return tag.map(denbt);
  const isTag = typeof tag.type === 'string' && 'value' in tag;
  if (!isTag) { const o = {}; for (const k of Object.keys(tag)) o[k] = denbt(tag[k]); return o; }
  const v = tag.value;
  if (tag.type === 'compound') { const o = {}; for (const k of Object.keys(v || {})) o[k] = denbt(v[k]); return o; }
  if (tag.type === 'list') {
    const inner = v && v.type;
    return ((v && v.value) || []).map((el) => (inner === 'compound' ? denbt({ type: 'compound', value: el }) : inner === 'list' ? denbt({ type: 'list', value: el }) : el));
  }
  return v;
}

function legacySpans(text, st) {
  const out = [];
  let cur = { ...st }, buf = '';
  const flush = () => { if (buf) { out.push({ t: buf, ...cur }); buf = ''; } };
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\u00a7' && i + 1 < text.length) {
      flush();
      const code = text[i + 1].toLowerCase();
      if (LEGACY[code]) cur = { ...cur, c: COLORS[LEGACY[code]] };
      else if (code === 'r') cur = { ...st };
      else if (code === 'l') cur = { ...cur, b: true };
      else if (code === 'o') cur = { ...cur, i: true };
      i++;
    } else buf += text[i];
  }
  flush();
  return out;
}

function spansOf(x, st = {}) {
  if (x == null) return [];
  if (typeof x === 'string') {
    const t = x.trim();
    if (t[0] === '{' || t[0] === '[') { try { return spansOf(JSON.parse(t), st); } catch (e) { /* bukan JSON */ } }
    return legacySpans(x, st);
  }
  if (typeof x === 'number' || typeof x === 'boolean') return [{ t: String(x), ...st }];
  if (Array.isArray(x)) return x.flatMap((e) => spansOf(e, st));
  if (typeof x === 'object') {
    if (x.constructor && x.constructor.name === 'ChatMessage') { try { return spansOf(x.json || x.toString(), st); } catch (e) { return [{ t: String(x), ...st }]; } }
    if (typeof x.type === 'string' && 'value' in x && Object.keys(x).length <= 3) return spansOf(denbt(x), st);
    const me = { ...st };
    const c = colorHex(x.color); if (c) me.c = c;
    if (x.bold === true || x.bold === 1) me.b = true;
    if (x.italic === true || x.italic === 1) me.i = true;
    let out = [];
    if (x.text != null) out = out.concat(spansOf(String(x.text), me));
    else if (x.translate) out.push({ t: String(x.translate), ...me });
    if (x.extra) out = out.concat(spansOf(x.extra, me));
    return out;
  }
  return [];
}
const plain = (x) => spansOf(x).map((s) => s.t).join('');

// ==========================================
// DETAIL ITEM & SKIN HEAD
// ==========================================
const stripName = (n) => String(n || '').replace('minecraft:', '');

function getSkullHash(it) {
  try {
    const rawStr = safeStringify(it.components || '') + safeStringify(it.nbt || '');
    const urlMatch = rawStr.match(/textures\.minecraft\.net\/texture\/([a-zA-Z0-9]+)/);
    if (urlMatch) return urlMatch[1];

    const b64Regex = /(eyJ0ZXh0dXJlcyI6[A-Za-z0-9+/=]+)/g;
    let match;
    while ((match = b64Regex.exec(rawStr)) !== null) {
      try {
        const decoded = Buffer.from(match[1], 'base64').toString('utf8');
        const hashMatch = decoded.match(/textures\.minecraft\.net\/texture\/([a-zA-Z0-9]+)/);
        if (hashMatch) return hashMatch[1];
      } catch(e) {}
    }
  } catch(e) {}
  return null;
}

function itemParts(item) {
  let nameC = null, loreC = null;
  try {
    if (Array.isArray(item.components)) {
      for (const c of item.components) {
        const t = String((c && (c.type || c.id || c.name)) || '').toLowerCase();
        const d = c ? (c.data !== undefined ? c.data : c.value) : null;
        if (t.includes('lore')) loreC = d;
        else if (t.includes('custom_name')) nameC = d;
        else if (t.includes('item_name') && nameC == null) nameC = d;
      }
    }
  } catch (e) { /* abaikan */ }
  try { if (nameC == null && item.customName) nameC = item.customName; } catch (e) { /* abaikan */ }
  try { if (loreC == null && item.customLore) loreC = item.customLore; } catch (e) { /* abaikan */ }
  try { if (item.nbt && !item.components) {
    const n = denbt(item.nbt); const d = n && n.display;
    if (d) { if (nameC == null && d.Name) nameC = d.Name; if (loreC == null && d.Lore) loreC = d.Lore; }
  } } catch (e) { /* abaikan */ }
  return { nameC, loreC };
}
function loreLinesOf(loreC) {
  if (loreC == null) return [];
  let d = loreC;
  if (d && typeof d === 'object' && !Array.isArray(d) && typeof d.type === 'string' && 'value' in d) d = denbt(d);
  if (!Array.isArray(d)) d = [d];
  return d.map((line) => spansOf(line));
}

function isItemEnchanted(it) {
  try {
    if (it.enchants && it.enchants.length > 0) return true;
    if (Array.isArray(it.components)) {
      for (let c of it.components) {
        let t = String((c && (c.type || c.id || c.name)) || '').toLowerCase();
        if (t.includes('enchantment') || t.includes('enchantments')) return true;
      }
    }
    const rawStr = safeStringify(it);
    if (/enchantment|enchantments|"ench"|"glint"/i.test(rawStr)) return true;
    if (rawStr.includes('glint":true') || rawStr.includes('glint":1')) return true;
  } catch(e) {}
  return false;
}

function slotLite(it) {
  if (!it) return null;
  const o = { n: stripName(it.name), c: it.count };
  try { if (it.maxDurability && it.durabilityUsed != null) o.d = [it.durabilityUsed, it.maxDurability]; } catch (e) { /* abaikan */ }
  try { const t = it.displayName; if (t) o.t = String(t); } catch (e) { /* abaikan */ }
  if (o.n === 'player_head' || o.n === 'head') {
    const hash = getSkullHash(it);
    if (hash) o.hash = hash;
  }
  if (isItemEnchanted(it)) o.e = true;
  return o;
}

function itemDetail(slot, it) {
  if (!it) return { type: 'detail', slot, item: null };
  const { nameC, loreC } = itemParts(it);
  let raw = '';
  
  // --- UBAH DISINI: Kirim seluruh objek item (it) ke safeStringify ---
  try { 
    raw = safeStringify(it) || ''; 
  } catch (e) { 
    raw = '(tidak bisa dibaca: ' + e.message + ')'; 
  }
  
  let ench = [];
  try { ench = (it.enchants || []).map((e) => ({ name: String(e.name), lvl: e.lvl })); } catch (e) { /* abaikan */ }
  const info = {
    id: stripName(it.name), label: String(it.displayName || it.name), count: it.count,
    title: spansOf(nameC), lore: loreLinesOf(loreC), ench, raw: raw,
  };
  try { if (it.maxDurability && it.durabilityUsed != null) info.dur = [it.durabilityUsed, it.maxDurability]; } catch (e) { /* abaikan */ }
  if (info.id === 'player_head' || info.id === 'head') {
    const hash = getSkullHash(it);
    if (hash) info.hash = hash;
  }
  if (isItemEnchanted(it)) info.e = true;
  return { type: 'detail', slot, item: info };
}

// ==========================================
// TAB & EVENT
// ==========================================
const tab = app.tab({ id: 'monitor', title: 'Monitor', file: 'monitor.html' });

const send = (m) => { try { tab.send(m); } catch (e) { dbg('gagal kirim ke tab:', e.message); } };
const note = (text) => send({ type: 'note', text });

function cfgMessage() {
  const cfg = {};
  for (const key of Object.keys(T)) cfg[key] = on(key);
  return { 
    type: 'cfg', 
    cfg, 
    iconSrc: splitList(S.get(K.iconSrc, '')), 
    skinSrc: splitList(S.get(K.skinSrc, '')), 
    dbl: String(S.get(K.dbl, 'left')),
    name: (bot.username || (bot.player && bot.player.username) || 'Steve')
  };
}

// ... (Sisa kode di bawahnya persis sama, dari buildInv sampai app.onUnload) ...
function buildInv() {
  const win = bot.currentWindow;
  const slots = win ? win.slots : bot.inventory.slots;
  let invStart = 0, hotStart = 36, title = 'Menu server';
  if (win) {
    invStart = Number.isInteger(win.inventoryStart) ? win.inventoryStart : Math.max(0, slots.length - 36);
    hotStart = Number.isInteger(win.hotbarStart) ? win.hotbarStart : invStart + 27;
    try { title = plain(win.title) || 'Menu server'; } catch (e) { /* abaikan */ }
  }
  const cursorItem = (win || bot.inventory).selectedItem;
  return { type: 'inv', gui: !!win, title, inv: invStart, hot: hotStart, held: bot.quickBarSlot || 0,
    slots: slots.map(slotLite), cursor: slotLite(cursorItem) };
}
let lastInv = '', invTimer = null;
function sendInv(force) {
  if (!on('inv') || !app.online() || !bot.inventory) return;
  const m = buildInv();
  const key = JSON.stringify(m);
  if (!force && key === lastInv) return;
  lastInv = key;
  send(m);
}
const schedInv = () => { if (invTimer) return; invTimer = setTimeout(() => { invTimer = null; try { sendInv(false); } catch (e) { dbg(e.message); } }, 120); };

const effTrack = {};   
function effName(id, amp) {
  let n = '#' + id;
  try { const e = bot.registry.effects[id]; if (e) n = e.displayName || e.name || n; } catch (e) { /* abaikan */ }
  const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const lvl = (amp || 0) + 1;
  return n + ' ' + (roman[lvl] || lvl);
}
function noteEffect(id, amp, duration) { effTrack[id] = { amp, endsAt: duration > 0 ? Date.now() + duration * 50 : null }; }
bot.on('entityEffect', (entity, e) => { if (bot.entity && entity === bot.entity && e) noteEffect(e.id, e.amplifier, e.duration); });
bot.on('entityEffectEnd', (entity, e) => { if (bot.entity && entity === bot.entity && e) delete effTrack[e.id]; });
function effectsList() {
  const ids = new Set(Object.keys(effTrack));
  try { for (const k of Object.keys((bot.entity && bot.entity.effects) || {})) ids.add(k); } catch (e) { /* abaikan */ }
  const out = [];
  for (const id of ids) {
    const t = effTrack[id];
    let amp = t ? t.amp : 0;
    try { const e = bot.entity.effects[id]; if (e) amp = e.amplifier; } catch (e) { /* abaikan */ }
    out.push({ name: effName(Number(id), amp), ms: t && t.endsAt ? Math.max(0, t.endsAt - Date.now()) : null });
  }
  return out;
}

const BOSS_COLORS = { pink: '#ff6fb5', blue: '#4c8bf5', red: '#e5493a', green: '#4cd964', yellow: '#ffd60a', purple: '#a45bd6', white: '#ffffff' };
function bossList() {
  const out = [];
  try {
    const bars = bot.bossBars || [];
    for (const b of bars) {
      let title = [];
      try { title = spansOf(b.title && (b.title.json || b.title)); } catch (e) { title = [{ t: String(b.title) }]; }
      out.push({ title, hp: Number(b.health) || 0, color: BOSS_COLORS[String(b.color)] || null });
    }
  } catch (e) { /* abaikan */ }
  return out;
}

function buildStatus() {
  const s = { type: 'status' };
  if (on('status')) {
    s.hp = typeof bot.health === 'number' ? bot.health : null;
    s.food = typeof bot.food === 'number' ? bot.food : null;
    s.sat = typeof bot.foodSaturation === 'number' ? bot.foodSaturation : null;
    s.xp = bot.experience ? { level: bot.experience.level || 0, progress: bot.experience.progress || 0, points: bot.experience.points || 0 } : { level: 0, progress: 0, points: 0 };
    try {
      const p = bot.entity.position, g = bot.game || {};
      s.info = 'x ' + p.x.toFixed(1) + '  y ' + p.y.toFixed(1) + '  z ' + p.z.toFixed(1) + '  |  ' + (g.dimension || '?') + '  |  ' + (g.gameMode || '?') + (bot.player && bot.player.ping != null ? '  |  ping ' + bot.player.ping + ' ms' : '');
    } catch (e) { s.info = ''; }
  }
  s.effects = on('effects') ? effectsList() : [];
  s.boss = on('boss') ? bossList() : [];
  return s;
}
let lastStatus = '';
function sendStatus(force) {
  if (!app.online()) return;
  const m = buildStatus();
  const key = JSON.stringify(m);
  if (!force && key === lastStatus) return;
  lastStatus = key;
  send(m);
}

const feed = { bar: { cur: null, hist: [] }, title: { cur: null, hist: [] }, subtitle: { cur: null, hist: [] } };
const lastSeen = {};
function pushFeed(ch, comp) {
  if (!on(ch)) return;
  const spans = spansOf(comp);
  const text = spans.map((s) => s.t).join('');
  const now = Date.now();
  if (lastSeen[ch] && lastSeen[ch].text === text && now - lastSeen[ch].at < 400) return;
  lastSeen[ch] = { text, at: now };
  const f = feed[ch];
  f.cur = spans;
  if (text.trim() !== '') {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    f.hist.push({ time: pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()), spans });
    const max = Math.max(1, Number(S.get(K.history, 15)) || 15);
    while (f.hist.length > max) f.hist.shift();
  }
  send({ type: 'feed', feed });
}
bot.on('actionBar', (m) => pushFeed('bar', m));
bot.on('title', (t, kind) => pushFeed(kind === 'subtitle' ? 'subtitle' : 'title', t));
bot.on('message', (m, pos) => { if (pos === 'game_info') pushFeed('bar', m); });
let hooked = null;
function hookRaw() {
  const c = bot._client;
  if (!c || c === hooked) return;
  hooked = c;
  c.on('set_title_text', (p) => pushFeed('title', p.text));
  c.on('set_title_subtitle', (p) => pushFeed('subtitle', p.text));
  c.on('action_bar', (p) => pushFeed('bar', p.text));
  c.on('system_chat', (p) => { if (p.isActionBar || p.overlay) pushFeed('bar', p.content); });
  c.on('entity_effect', (p) => { if (bot.entity && p.entityId === bot.entity.id) noteEffect(p.effectId, p.amplifier, p.duration); });
  c.on('remove_entity_effect', (p) => { if (bot.entity && p.entityId === bot.entity.id) delete effTrack[p.effectId]; });
}

let hookedInv = null;
function hookInventory() {
  if (bot.inventory && bot.inventory !== hookedInv) {
    hookedInv = bot.inventory;
    try { bot.inventory.on('updateSlot', schedInv); } catch (e) { /* abaikan */ }
  }
}
bot.on('login', hookRaw);
bot.on('spawn', () => { hookRaw(); hookInventory(); app.after(500, () => { send(cfgMessage()); sendInv(true); sendStatus(true); }); });
bot.on('windowOpen', (w) => {
  try { w.on('updateSlot', schedInv); } catch (e) { /* abaikan */ }
  log('menu dibuka: ' + (plain(w.title) || '(tanpa judul)'));
  app.after(100, () => sendInv(true));
});
bot.on('windowClose', () => { log('menu ditutup'); app.after(100, () => sendInv(true)); });
bot.on('heldItemChanged', schedInv);
bot.on('bossBarCreated', () => sendStatus(false));
bot.on('bossBarUpdated', () => sendStatus(false));
bot.on('bossBarDeleted', () => sendStatus(false));
bot.on('health', () => sendStatus(false));
bot.on('experience', () => sendStatus(false));
if (app.online()) { hookRaw(); hookInventory(); }

app.on('status', (st) => {
  if (st === 'online') { hookRaw(); hookInventory(); app.after(700, () => { send(cfgMessage()); sendInv(true); sendStatus(true); }); }
  else note('Bot: ' + st);
});

const poll = setInterval(() => {
  try { if (app.online()) { hookRaw(); hookInventory(); sendInv(false); sendStatus(false); } } catch (e) { dbg('poll:', e.message); }
}, 1000);

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('server tidak merespons (timeout)')), ms))]);
const TOGGLE_KEYS = Object.keys(T);
let busy = false;

async function doClick(slot, kind) {
  switch (kind) {
    case 'left': return bot.clickWindow(slot, 0, 0);
    case 'right': return bot.clickWindow(slot, 1, 0);
    case 'middle': {
      const win = bot.currentWindow || bot.inventory;
      const hadCursor = !!win.selectedItem;
      try {
        await bot.clickWindow(slot, 2, 3);
      } finally {
        if (!hadCursor && win.selectedItem) { try { win.selectedItem = null; } catch (e) { /* abaikan */ } }
      }
      return;
    }
    case 'shift': return bot.clickWindow(slot, 0, 1);
    case 'drop1': return bot.clickWindow(slot, 0, 4);
    case 'dropall': return bot.clickWindow(slot, 1, 4);
    case 'offhand': return bot.clickWindow(slot, 40, 2);
    default: throw new Error('aksi tidak dikenal: ' + kind);
  }
}

tab.on('message', async (data) => {
  if (!data || !data.action) return;
  try {
    if (data.action === 'ready') { send(cfgMessage()); if (app.online()) { sendInv(true); sendStatus(true); } else note('Bot offline'); send({ type: 'feed', feed }); return; }
    if (data.action === 'toggle') {
      if (!TOGGLE_KEYS.includes(data.key)) return;
      S.set(T[data.key], !on(data.key));
      send(cfgMessage()); lastInv = ''; lastStatus = '';
      if (app.online()) { sendInv(true); sendStatus(true); }
      return;
    }
    if (data.action === 'clearFeed') { for (const k of Object.keys(feed)) { feed[k].cur = null; feed[k].hist = []; } send({ type: 'feed', feed }); return; }
    if (!app.online()) { note('Bot belum online'); return; }
    if (data.action === 'refresh') { sendInv(true); sendStatus(true); return; }
    if (data.action === 'detail') {
      const win = bot.currentWindow;
      const slots = win ? win.slots : bot.inventory.slots;
      const slot = Number(data.slot);
      if (!Number.isInteger(slot) || slot < 0 || slot >= slots.length) throw new Error('slot tidak valid');
      send(itemDetail(slot, slots[slot]));
      return;
    }
    if (busy) { note('Tunggu aksi sebelumnya selesai...'); return; }
    busy = true;
    try {
      if (data.action === 'click') {
        const win = bot.currentWindow;
        const slots = win ? win.slots : bot.inventory.slots;
        const slot = Number(data.slot);
        if (!Number.isInteger(slot) || slot < 0 || slot >= slots.length) throw new Error('slot tidak valid');
        if (data.kind === 'middle') {
          await Promise.race([doClick(slot, 'middle'), new Promise((r) => setTimeout(r, 900))]);
        } else {
          await withTimeout(doClick(slot, String(data.kind)), 3000);
        }
        note('Aksi "' + data.kind + '" pada slot ' + slot + ' dikirim');
        await app.sleep(200);
        sendInv(true);
        send(itemDetail(slot, (bot.currentWindow ? bot.currentWindow.slots : bot.inventory.slots)[slot]));
      } else if (data.action === 'select') {
        const n = Number(data.slot);
        if (!Number.isInteger(n) || n < 0 || n > 8) throw new Error('hotbar tidak valid');
        bot.setQuickBarSlot(n);
        note('Hotbar ' + (n + 1) + ' dipilih');
        await app.sleep(100); sendInv(true);
      } else if (data.action === 'use') {
        const n = Number(data.slot);
        if (!Number.isInteger(n) || n < 0 || n > 8) throw new Error('hotbar tidak valid');
        if (bot.currentWindow) throw new Error('tutup menu dulu sebelum memakai item');
        bot.setQuickBarSlot(n);
        await app.sleep(150);
        bot.activateItem();
        note('Memakai item hotbar ' + (n + 1));
        await app.sleep(300); sendInv(true);
      } else if (data.action === 'close') {
        if (bot.currentWindow) { bot.closeWindow(bot.currentWindow); note('Menutup menu...'); } else note('Tidak ada menu terbuka');
        await app.sleep(150); sendInv(true);
      }
    } finally { busy = false; }
  } catch (err) {
    note('Error: ' + (err && err.message ? err.message : err));
    log('aksi gagal:', err && err.stack ? err.stack : err);
  }
});

tab.on('open', () => { send(cfgMessage()); send({ type: 'feed', feed }); if (app.online()) { sendInv(true); sendStatus(true); } });

app.onUnload(() => {
  clearInterval(poll);
  if (invTimer) clearTimeout(invTimer);
  try { tab.close(); } catch (e) { /* abaikan */ }
  log('script dimatikan');
});
log('dimuat. Buka tab "Monitor".');