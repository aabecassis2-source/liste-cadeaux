/* Liste de cadeaux — application (GitHub Pages + Firebase, ou mode démo local) */
(() => {
'use strict';

/* ---------- Utilitaires ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};
const rand = (n) => { const a = new Uint8Array(n); if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a); else a.forEach((_, i) => { a[i] = Math.random() * 256; }); return Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); };
const ICON = {
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
};
const CAT_EMOJI = [['mode', '👗'], ['vêtement', '👗'], ['maison', '🏡'], ['déco', '🪴'], ['tech', '🎧'], ['beaut', '🧴'], ['livre', '📚'], ['culture', '🎭'], ['expérience', '🎟️'], ['sport', '🧘'], ['jeu', '🎲'], ['cuisine', '🍳'], ['voyage', '✈️'], ['enfant', '🧸'], ['bébé', '🍼'], ['bijou', '💍'], ['jardin', '🌿'], ['musique', '🎵'], ['vin', '🍷'], ['gourmand', '🍫']];
const catEmoji = (c) => { const k = String(c || '').toLowerCase(); const f = CAT_EMOJI.find(([w]) => k.includes(w)); return f ? f[1] : '🎁'; };
const OCC_EMOJI = { 'Anniversaire': '🎂', 'Noël': '🎄', 'Mariage': '💍', 'Naissance': '👶', 'Crémaillère': '🏡', 'Pot de départ': '👋', 'Fête': '🥂' };
const occEmoji = (o) => OCC_EMOJI[o] || '🎁';
const PALETTES = [['#ffe8cc', '#f08c00'], ['#e7f5ff', '#1c7ed6'], ['#f3f0ff', '#7048e8'], ['#ebfbee', '#2f9e44'], ['#fff0f6', '#d6336c'], ['#fff9db', '#e67700'], ['#e6fcf5', '#0c8599'], ['#f8f0fc', '#ae3ec9'], ['#fff5f5', '#e03131'], ['#edf2ff', '#3b5bdb']];
const SOFT = [['#f6e7d8', '#ecd2b8'], ['#e3eef7', '#c9dcec'], ['#ece6f6', '#d8cdee'], ['#e4f2e6', '#c8e3cc'], ['#f7e4ea', '#efc9d5'], ['#f6efd6', '#ecdfae'], ['#ddf1ee', '#bfe3dc']];
const hashStr = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const PRESET_COLORS = ['#d9480f', '#c2255c', '#7048e8', '#1c7ed6', '#0c8599', '#2f9e44', '#e8a33d', '#15130f'];

function money(v) {
  const c = (S.data && S.data.config.currency) || 'EUR';
  const n = Number(v) || 0; const int = Math.round(n) === n;
  try { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c, minimumFractionDigits: int ? 0 : 2, maximumFractionDigits: 2 }).format(n); }
  catch (e) { return n + ' ' + c; }
}
const curSym = () => money(0).replace(/[\d\s,.\u00a0\u202f]/g, '') || '€';
const fmtDate = (d) => { try { return new Date(d + (d.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return d; } };
const fmtDateTime = (d) => { try { return new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
function countdown(d) {
  if (!d) return '';
  const t = new Date(d + 'T00:00:00'); const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((t - today) / 864e5);
  if (days > 1) return 'J-' + days; if (days === 1) return 'C’est demain !'; if (days === 0) return 'C’est aujourd’hui 🎉'; return 'Événement passé';
}
function faviconFor(url) { try { return 'https://www.google.com/s2/favicons?sz=256&domain=' + new URL(url).hostname; } catch (e) { return ''; } }
function domainOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }

/* Images : URL classique, image importée (data:) ou image stockée dans Firebase (fs:ID) */
const imgReady = new Map();
function imgTag(src, alt, extra) {
  if (!src) return '';
  if (/^fs:/.test(src)) {
    const id = src.slice(3), v = imgReady.get(id);
    return v ? `<img src="${esc(v)}" alt="${esc(alt || '')}" ${extra || ''}>` : `<img data-fs="${esc(id)}" alt="${esc(alt || '')}" ${extra || ''}>`;
  }
  return `<img src="${esc(src)}" alt="${esc(alt || '')}" loading="lazy" referrerpolicy="no-referrer" ${extra || ''}>`;
}
function hydrateImages(root) {
  if (!backend || !backend.image) return;
  (root || document).querySelectorAll('img[data-fs]:not([src])').forEach(async (img) => {
    const id = img.getAttribute('data-fs');
    const v = await backend.image(id);
    if (v) { imgReady.set(id, v); img.src = v; } else img.classList.add('broken');
  });
}
new MutationObserver((muts) => { if (muts.some(m => m.addedNodes.length)) hydrateImages(); }).observe(document.documentElement, { childList: true, subtree: true });
function media(src, cat, alt) {
  const p = SOFT[hashStr(cat || alt || 'x') % SOFT.length];
  return `<div class="ph" style="--c1:${p[0]};--c2:${p[1]}"><span>${catEmoji(cat)}</span></div>` + imgTag(src, alt);
}
document.addEventListener('error', (e) => { const t = e.target; if (t && t.tagName === 'IMG') t.classList.add('broken'); }, true);

/* ---------- Stockage : Firebase (partagé) ou démo (ce navigateur) ---------- */
class LocalBackend {
  constructor(reason) {
    this.mode = 'local'; this.needsEmail = false; this.reason = reason || '';
    this.load();
    if (!this.db || !Array.isArray(this.db.gifts)) { this.db = GiftCore.seed(); this.db.auth = { hash: null }; this.save(); }
    this.admin = !!sessionStorage.getItem('gl-local-admin');
  }
  load() { this.db = store.get('gl-local-db', null); }
  save() { if (!store.set('gl-local-db', this.db)) throw new Error('Stockage du navigateur plein : utilisez des liens d’images plutôt que des imports.'); }
  async hash(s) {
    if (window.crypto && crypto.subtle) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('gl:' + s)); return Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join(''); }
    return 'h' + hashStr('gl:' + s);
  }
  state() { const s = GiftCore.publicState(this.db, this.admin); s.defaultPassword = !this.db.auth || !this.db.auth.hash; return s; }
  async getState() { this.load(); return this.state(); }
  async action(name, payload) {
    this.load();
    const before = JSON.stringify(this.db);
    try {
      const result = GiftCore.dispatch(this.db, name, payload, { admin: this.admin, newId: () => rand(6), newToken: () => rand(18), now: new Date().toISOString() });
      this.save();
      return { result, state: this.state() };
    } catch (e) { this.db = JSON.parse(before); throw e; }
  }
  async checkPw(pw) { return (this.db.auth && this.db.auth.hash) ? (await this.hash(pw)) === this.db.auth.hash : pw === 'cadeaux'; }
  async login(pw) {
    this.load();
    if (!(await this.checkPw(pw))) throw new Error('Mot de passe incorrect.');
    this.admin = true; sessionStorage.setItem('gl-local-admin', '1');
  }
  async logout() { this.admin = false; sessionStorage.removeItem('gl-local-admin'); }
  isAdmin() { return this.admin; }
  async changePassword(current, next) {
    this.load();
    if (!(await this.checkPw(current))) throw new Error('Mot de passe actuel incorrect.');
    if (String(next).length < 4) throw new Error('Le nouveau mot de passe doit faire au moins 4 caractères.');
    this.db.auth = { hash: await this.hash(next) }; this.save();
  }
  async upload(dataUrl) { return dataUrl; }
  subscribe(cb) { window.addEventListener('storage', (e) => { if (e.key === 'gl-local-db') { this.load(); cb(this.state()); } }); }
}

async function pickBackend() {
  const cfg = window.LISTE_CONFIG || {}, fbc = cfg.firebase || {};
  if (!fbc.apiKey || !fbc.projectId) return new LocalBackend();
  try {
    const [loader, mod] = await Promise.all([import('./firebase-loader.js'), import('./firebase-backend.js')]);
    const be = new mod.FirebaseBackend(loader.createFb(fbc), GiftCore, { adminEmail: cfg.adminEmail });
    await be.init();
    return be;
  } catch (e) {
    console.error(e);
    return new LocalBackend('Connexion à Firebase impossible (' + (e.message || e) + '). Affichage en mode démo.');
  }
}

/* ---------- État ---------- */
let backend;
const S = {
  data: null, view: null,
  f: { q: '', cat: '', price: '', status: 'all', fav: false, sort: 'reco' },
  bf: { cat: '', lvl: 0 },
  fd: { budget: 50, people: 1, cats: [], ran: false, idx: 0 },
  admin: { tab: 'gifts', q: '' },
  cfg: null, form: null, modal: null
};
const me = {
  likes: store.get('gl-likes', { gifts: {}, brands: {} }),
  res: store.get('gl-myres', {}),
  surprise: store.get('gl-surprise', false),
  name: store.get('gl-name', '')
};
if (!me.likes.gifts) me.likes.gifts = {}; if (!me.likes.brands) me.likes.brands = {};
const saveMe = () => { store.set('gl-likes', me.likes); store.set('gl-myres', me.res); store.set('gl-surprise', me.surprise); store.set('gl-name', me.name); };

const isMine = (r) => !!(r.mine || me.res[r.id]);
function gstat(g) {
  const qty = g.quantity || 1, taken = g.reservations.length, rem = Math.max(0, qty - taken);
  const mine = g.reservations.filter(isMine);
  return { qty, taken, rem, mine, full: rem <= 0 };
}
const giftById = (id) => S.data.gifts.find(g => g.id === id);
const brandById = (id) => S.data.brands.find(b => b.id === id);
const resNames = (g) => { const n = g.reservations.map(r => r.name).filter(Boolean); return n.length ? n.join(', ') : ''; };
function allCats(list) {
  const set = []; const add = (c) => { if (c && !set.includes(c)) set.push(c); };
  S.data.config.categories.forEach(c => { if (!list || list.some(x => x.category === c)) add(c); });
  (list || []).forEach(x => add(x.category));
  return set;
}

/* ---------- UI génériques ---------- */
function toast(msg, err) {
  const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, err ? 4500 : 3000);
}
function confetti() {
  const colors = [getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#d9480f', '#ffd43b', '#2f9e44', '#1c7ed6', '#e64980', '#15130f'];
  for (let i = 0; i < 90; i++) {
    const c = document.createElement('i'); c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw'; c.style.background = colors[i % colors.length];
    c.style.setProperty('--dx', (Math.random() * 200 - 100) + 'px'); c.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg');
    c.style.animationDuration = (1.6 + Math.random() * 1.6) + 's'; c.style.animationDelay = Math.random() * .3 + 's';
    document.body.appendChild(c); setTimeout(() => c.remove(), 3800);
  }
}
function openModal(html, cls, meta) {
  S.modal = meta || { type: 'generic' };
  $('#modalRoot').innerHTML = `<div class="overlay" data-act="overlay"><div class="modal ${cls || ''}" role="dialog" aria-modal="true">${html}</div></div>`;
  document.body.style.overflow = 'hidden';
  const f = $('#modalRoot [autofocus]'); if (f) setTimeout(() => f.focus(), 50);
}
function closeModal() {
  $('#modalRoot').innerHTML = ''; document.body.style.overflow = ''; S.modal = null; S.form = null;
  if (/^#\/cadeau\//.test(location.hash)) history.replaceState(null, '', '#/');
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (x) { /* */ } ta.remove(); return ok;
  }
}
async function busy(btn, fn) {
  if (btn && btn.disabled) return;
  const label = btn ? btn.innerHTML : '';
  if (btn) btn.disabled = true;
  try { await fn(); }
  catch (e) { toast(e.message || 'Une erreur est survenue.', true); }
  finally { if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = label; } }
}
function resizeImage(file, max, type) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) return reject(new Error('Choisissez un fichier image.'));
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const r = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        const ctx = c.getContext('2d');
        if (type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
        ctx.drawImage(img, 0, 0, c.width, c.height);
        let out = c.toDataURL(type, .82);
        if (out.length > 850000 && type === 'image/jpeg') out = c.toDataURL(type, .6);
        resolve(out);
      };
      img.onerror = () => reject(new Error('Image illisible.'));
      img.src = fr.result;
    };
    fr.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    fr.readAsDataURL(file);
  });
}

/* ---------- Thème, bannières ---------- */
function inkFor(hex) { const n = parseInt(hex.slice(1), 16); const L = (0.299 * (n >> 16) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; return L > 0.62 ? '#15130f' : '#ffffff'; }
function applyTheme(cfg) {
  cfg = cfg || S.data.config;
  const r = document.documentElement.style;
  r.setProperty('--accent', cfg.accent); r.setProperty('--accent-ink', inkFor(cfg.accent)); r.setProperty('--accent-soft', cfg.accent + '1f');
  document.title = cfg.title + ' · ' + cfg.occasion;
  $('#logoMark').textContent = (cfg.recipient || '🎁').trim().charAt(0).toUpperCase() || '🎁';
  $('#logoText').textContent = cfg.title;
  $('#footLeft').textContent = occEmoji(cfg.occasion) + ' ' + cfg.title + (cfg.eventDate ? ' · ' + fmtDate(cfg.eventDate) : '');
  $('#footRight').textContent = backend.mode === 'firebase' ? 'Réservations et favoris partagés en temps réel ✓' : 'Mode démo — données enregistrées dans ce navigateur';
}
function renderBanners() {
  let h = '';
  if (backend.mode === 'local') h += `<div class="mode-banner ${backend.reason ? 'err' : ''}">${backend.reason ? esc(backend.reason) : 'Mode démo : la liste est enregistrée dans ce navigateur uniquement. Pour la partager, renseignez Firebase dans config.js (voir README).'}</div>`;
  if (S.data && S.data.authError) h += `<div class="mode-banner err">${esc(S.data.authError)}</div>`;
  if (me.surprise) h += `<div class="surprise-banner">🙈 Mode surprise actif sur cet appareil : les réservations sont masquées.<button data-act="surprise-off">Désactiver</button></div>`;
  $('#banners').innerHTML = h;
}

/* ---------- Cartes ---------- */
function giftCard(g, opt) {
  opt = opt || {};
  const st = gstat(g), sur = me.surprise && !opt.preview;
  const full = !sur && st.full, mine = !sur && st.mine.length > 0;
  const liked = !!me.likes.gifts[g.id];
  const names = resNames(g);
  let cta;
  if (opt.preview) cta = `<span class="btn accent sm">Réserver ce cadeau</span>`;
  else if (mine) cta = `<button class="btn ghost sm" data-act="cancel" data-id="${g.id}">Annuler ma réservation</button>`;
  else if (full) cta = `<button class="btn ghost sm" disabled>Déjà réservé</button>`;
  else cta = `<button class="btn accent sm" data-act="reserve" data-id="${g.id}">Réserver ce cadeau</button>`;
  const stamp = (full || mine) ? `<div class="stamp"><div><strong>✓ ${mine ? 'Vous l’offrez' : 'Réservé'}</strong><small>${mine ? (st.mine.length > 1 ? st.mine.length + ' exemplaires' : 'Merci pour ce cadeau !') : (names ? 'par ' + esc(names) : 'par un invité')}</small></div></div>` : '';
  const progress = (st.qty > 1 && !sur) ? `<div class="progress"><i style="width:${Math.round(st.taken / st.qty * 100)}%"></i></div><div class="qty-note">${st.taken} sur ${st.qty} réservé${st.taken > 1 ? 's' : ''}${st.rem ? ' · encore ' + st.rem + ' disponible' + (st.rem > 1 ? 's' : '') : ''}</div>` : '';
  const badges = (g.priority === 3 ? '<span class="badge hot">★ Coup de cœur</span>' : g.priority === 2 ? '<span class="badge">Fait très envie</span>' : '') + (st.qty > 1 ? `<span class="badge">×${st.qty}</span>` : '');
  return `<article class="card ${full ? 'is-reserved' : ''} ${mine ? 'is-mine' : ''}" ${opt.preview ? '' : `data-act="open" data-id="${g.id}" tabindex="0"`}>
    <div class="card-media">${media(g.image, g.category, g.name)}
      <div class="badges">${badges}</div>
      <button class="like ${liked ? 'on' : ''}" ${opt.preview ? '' : `data-act="like" data-type="gifts" data-id="${g.id}"`} aria-label="Ajouter aux favoris">${ICON.heart}<span>${g.likes || 0}</span></button>
      ${stamp}
    </div>
    <div class="card-body">
      <div class="card-brand">${esc(g.brand)}</div>
      <h3>${esc(g.name)}</h3>
      <div class="card-row"><span class="price">${money(g.price)}</span><span class="cat">${esc(g.category)}</span></div>
      ${progress}
      <div class="card-cta">${cta}</div>
    </div>
  </article>`;
}
function lvlHTML(n) { return `<span class="lvl">${[1, 2, 3].map(i => i <= n ? curSym() : `<i>${curSym()}</i>`).join('')}</span>`; }
function brandTile(b, opt) {
  opt = opt || {};
  const p = PALETTES[hashStr(b.name) % PALETTES.length];
  const logo = b.logo || faviconFor(b.url);
  const liked = !!me.likes.brands[b.id];
  return `<article class="brand-tile">
    <div class="brand-visual" style="--c1:${p[0]};--c2:${p[1]}">
      <div class="logo-wrap"><span class="mono">${esc(b.name.charAt(0).toUpperCase())}</span>${imgTag(logo, b.name)}</div>
      <button class="like ${liked ? 'on' : ''}" ${opt.preview ? '' : `data-act="like" data-type="brands" data-id="${b.id}"`} aria-label="Ajouter aux favoris">${ICON.heart}<span>${b.likes || 0}</span></button>
    </div>
    <div class="brand-body">
      <div class="brand-meta">${esc(b.category || 'Marque')} · ${lvlHTML(b.priceLevel)}</div>
      <h3>${esc(b.name)}</h3>
      ${b.url ? `<div class="domain">${esc(domainOf(b.url))}</div>` : ''}
      <p>${esc(b.description)}</p>
      ${b.url ? `<a class="btn ghost sm" href="${esc(b.url)}" target="_blank" rel="noopener noreferrer">Visiter le site ↗</a>` : ''}
    </div>
  </article>`;
}

/* ---------- Page Cadeaux ---------- */
function heroHTML() {
  const c = S.data.config, gifts = S.data.gifts;
  const avail = gifts.filter(g => gstat(g).rem > 0).length;
  const reservedN = gifts.length - avail;
  let imgs = c.heroImage ? [{ image: c.heroImage, category: '', name: '' }] : gifts.filter(g => g.image).sort((a, b) => b.priority - a.priority || (b.likes || 0) - (a.likes || 0)).slice(0, 3);
  if (!c.heroImage && imgs.length < 3) { const cats = allCats(gifts); while (imgs.length < 3) imgs.push({ image: '', category: cats[imgs.length] || '', name: 'x' + imgs.length }); }
  const collage = imgs.length === 1 ? `<div class="c single">${media(imgs[0].image, '', '')}</div>` : imgs.map((g, i) => `<div class="c c${i + 1}">${media(g.image, g.category, g.name)}</div>`).join('');
  const title = esc(c.title).replace(esc(c.recipient), `<em>${esc(c.recipient)}</em>`);
  const cd = countdown(c.eventDate);
  return `<section class="wrap hero" id="hero">
    <div>
      <div class="eyebrow">${occEmoji(c.occasion)} ${esc(c.occasion)}${c.eventDate ? `<span class="dot"></span>${fmtDate(c.eventDate)}` : ''}</div>
      <h1>${title}</h1>
      ${c.message ? `<p class="lead">${esc(c.message)}</p>` : ''}
      <div class="hero-meta">
        ${cd ? `<span class="pill countdown">⏳ ${cd}</span>` : ''}
        <span class="pill"><b>${gifts.length}</b> idée${gifts.length > 1 ? 's' : ''}</span>
        ${me.surprise ? '' : `<span class="pill"><b>${avail}</b> disponible${avail > 1 ? 's' : ''} · <b>${reservedN}</b> réservé${reservedN > 1 ? 's' : ''}</span>`}
        <a class="btn accent" href="#/idee">✨ Une idée selon mon budget</a>
      </div>
    </div>
    <div class="collage">${collage}</div>
  </section>`;
}
function priceBuckets() { return [[0, 30], [30, 75], [75, 150], [150, 300], [300, Infinity]]; }
function bucketLabel(b) { return b[1] === Infinity ? money(b[0]) + ' et +' : b[0] === 0 ? 'Moins de ' + money(b[1]) : money(b[0]) + ' – ' + money(b[1]); }
function filteredGifts() {
  const f = S.f, words = norm(f.q).split(/\s+/).filter(Boolean);
  const list = S.data.gifts.filter(g => {
    if (f.cat && g.category !== f.cat) return false;
    if (f.price !== '') { const b = priceBuckets()[f.price]; if (g.price < b[0] || g.price >= b[1]) return false; }
    if (f.fav && g.priority < 3) return false;
    if (!me.surprise) {
      if (f.status === 'available' && gstat(g).full) return false;
      if (f.status === 'reserved' && g.reservations.length === 0) return false;
    }
    if (words.length) { const hay = norm([g.name, g.brand, g.category, g.description].join(' ')); if (!words.every(w => hay.includes(w))) return false; }
    return true;
  });
  const by = {
    reco: (a, b) => (me.surprise ? 0 : (gstat(a).full - gstat(b).full)) || b.priority - a.priority || (b.likes || 0) - (a.likes || 0) || String(b.createdAt).localeCompare(String(a.createdAt)),
    asc: (a, b) => a.price - b.price, desc: (a, b) => b.price - a.price,
    pop: (a, b) => (b.likes || 0) - (a.likes || 0), new: (a, b) => String(b.createdAt).localeCompare(String(a.createdAt))
  };
  return list.sort(by[f.sort] || by.reco);
}
function filterControlsHTML() {
  const f = S.f, gifts = S.data.gifts, cats = allCats(gifts);
  return `<div class="filters-row" style="margin-bottom:10px">
      <div class="search">${ICON.search}<input id="q" data-f="q" type="search" placeholder="Rechercher un cadeau, une marque…" value="${esc(f.q)}" aria-label="Rechercher"></div>
      <div class="chips" style="flex:1">
        <button class="chip ${!f.cat ? 'on' : ''}" data-act="f-cat" data-v="">Tout <span class="n">${gifts.length}</span></button>
        ${cats.map(c => `<button class="chip ${f.cat === c ? 'on' : ''}" data-act="f-cat" data-v="${esc(c)}">${catEmoji(c)} ${esc(c)} <span class="n">${gifts.filter(g => g.category === c).length}</span></button>`).join('')}
      </div>
    </div>
    <div class="filters-row" id="filterRow2">${filterRow2HTML()}</div>`;
}
function filterRow2HTML() {
  const f = S.f;
  return `<select class="select" data-f="price" aria-label="Prix">
        <option value="">Tous les prix</option>
        ${priceBuckets().map((b, i) => `<option value="${i}" ${String(f.price) === String(i) ? 'selected' : ''}>${bucketLabel(b)}</option>`).join('')}
      </select>
      ${me.surprise ? '' : `<div class="seg" role="group" aria-label="Disponibilité">
        <button class="${f.status === 'all' ? 'on' : ''}" data-act="f-status" data-v="all">Tous</button>
        <button class="${f.status === 'available' ? 'on' : ''}" data-act="f-status" data-v="available">Disponibles</button>
        <button class="${f.status === 'reserved' ? 'on' : ''}" data-act="f-status" data-v="reserved">Réservés</button>
      </div>`}
      <button class="chip ${f.fav ? 'on' : ''}" data-act="f-fav">★ Coups de cœur</button>
      <span class="spacer"></span>
      <select class="select" data-f="sort" aria-label="Trier">
        <option value="reco" ${f.sort === 'reco' ? 'selected' : ''}>Recommandés</option>
        <option value="asc" ${f.sort === 'asc' ? 'selected' : ''}>Prix croissant</option>
        <option value="desc" ${f.sort === 'desc' ? 'selected' : ''}>Prix décroissant</option>
        <option value="pop" ${f.sort === 'pop' ? 'selected' : ''}>Les plus aimés</option>
        <option value="new" ${f.sort === 'new' ? 'selected' : ''}>Nouveautés</option>
      </select>`;
}
function renderGifts() {
  $('#app').innerHTML = heroHTML() + `<section class="filters"><div class="wrap" id="filterWrap">${filterControlsHTML()}</div></section>
    <div class="wrap"><div class="result-line" id="resultLine"></div><div class="grid" id="grid"></div></div>`;
  updateGrid();
}
function filtersActive() { const f = S.f; return !!(f.q || f.cat || f.price !== '' || f.fav || f.status !== 'all'); }
function updateGrid() {
  const list = filteredGifts();
  const avail = list.filter(g => !gstat(g).full).length;
  $('#resultLine').innerHTML = `<span><b>${list.length}</b> cadeau${list.length > 1 ? 'x' : ''}${me.surprise ? '' : ` · ${avail} disponible${avail > 1 ? 's' : ''}`}</span>${filtersActive() ? '<button class="link-btn" data-act="f-reset">Réinitialiser les filtres</button>' : ''}`;
  $('#grid').innerHTML = list.length ? list.map(g => giftCard(g)).join('') :
    (S.data.gifts.length ? `<div class="empty" style="grid-column:1/-1"><div class="big">🔍</div><h3>Aucun cadeau ne correspond</h3><p>Essayez d’élargir vos filtres, ou découvrez les <a href="#/marques">marques préférées</a>.</p><button class="btn ghost" data-act="f-reset">Réinitialiser les filtres</button></div>`
      : `<div class="empty" style="grid-column:1/-1"><div class="big">🎁</div><h3>La liste est encore vide</h3><p>Revenez bientôt, ou jetez un œil aux <a href="#/marques">marques préférées</a>.</p></div>`);
}
function refreshGifts() {
  const hero = $('#hero'); if (hero) hero.outerHTML = heroHTML();
  const fw = $('#filterWrap');
  if (fw) { const q = $('#q'); if (document.activeElement === q) $('#filterRow2').innerHTML = filterRow2HTML(); else fw.innerHTML = filterControlsHTML(); }
  updateGrid();
}

/* ---------- Détail & réservation ---------- */
function detailHTML(g) {
  const st = gstat(g), sur = me.surprise, liked = !!me.likes.gifts[g.id];
  let status = '';
  if (!sur && st.mine.length) status = `<div class="res-ok mine">🎁 Vous offrez ce cadeau${st.mine.length > 1 ? ' (' + st.mine.length + ')' : ''} — merci !</div>`;
  else if (!sur && st.full) status = `<div class="res-ok">✓ Déjà réservé${resNames(g) ? ' par ' + esc(resNames(g)) : ''}</div>`;
  let actions = '';
  if (!sur && st.mine.length) actions += `<button class="btn ghost block" data-act="cancel" data-id="${g.id}">Annuler ma réservation</button>`;
  if (sur || !st.full) actions += `<button class="btn accent block" data-act="reserve" data-id="${g.id}">${st.mine.length && !sur ? 'Réserver un exemplaire de plus' : 'Réserver ce cadeau'}</button>`;
  if (g.url) actions += `<a class="btn ghost block" href="${esc(g.url)}" target="_blank" rel="noopener noreferrer">Voir sur le site ${g.brand ? esc(g.brand) : ''} ↗</a>`;
  const others = (!sur && g.reservations.length) ? `<div class="res-list"><b style="color:var(--ink)">Réservations (${st.taken}/${st.qty})</b>${g.reservations.map(r => `<div><span>${isMine(r) ? 'Vous' : esc(r.name || 'Un invité')}</span><span>${fmtDateTime(r.date)}</span></div>`).join('')}</div>` : '';
  return `<button class="close" data-act="close" aria-label="Fermer">✕</button>
  <div class="detail">
    <div class="media">${media(g.image, g.category, g.name)}
      <div class="badges">${g.priority === 3 ? '<span class="badge hot">★ Coup de cœur</span>' : g.priority === 2 ? '<span class="badge">Fait très envie</span>' : ''}</div>
    </div>
    <div class="info">
      <div class="eyebrow">${esc(g.brand || g.category || 'Cadeau')}</div>
      <h2>${esc(g.name)}</h2>
      <div class="price">${money(g.price)}</div>
      <div class="hero-meta" style="margin-bottom:18px">
        ${g.category ? `<span class="pill">${catEmoji(g.category)} ${esc(g.category)}</span>` : ''}
        ${st.qty > 1 ? `<span class="pill">Quantité souhaitée : <b>${st.qty}</b></span>` : ''}
        <button class="like ${liked ? 'on' : ''}" style="position:static;border:1px solid var(--line)" data-act="like" data-type="gifts" data-id="${g.id}">${ICON.heart}<span>${g.likes || 0}</span></button>
      </div>
      ${g.description ? `<p class="desc">${esc(g.description)}</p>` : ''}
      ${status}
      <div class="actions" style="margin-top:22px">${actions}
        <button class="link-btn" style="align-self:center;margin-top:6px" data-act="copy-gift" data-id="${g.id}">Copier le lien de ce cadeau</button>
      </div>
      ${others}
    </div>
  </div>`;
}
function openDetail(id) {
  const g = giftById(id); if (!g) { toast('Ce cadeau n’existe plus.', true); return; }
  openModal(detailHTML(g), 'wide', { type: 'detail', id });
}
function openReserve(id) {
  const g = giftById(id); if (!g) return;
  const c = S.data.config, st = gstat(g);
  if (st.full && !me.surprise) { toast('Ce cadeau est déjà réservé.', true); return; }
  openModal(`<button class="close" data-act="close" aria-label="Fermer">✕</button>
  <div class="modal-pad">
    <div class="eyebrow">Réservation</div>
    <h2 style="margin-top:10px">${esc(g.name)}</h2>
    <p class="sub">${money(g.price)}${st.qty > 1 ? ` · encore ${st.rem} exemplaire${st.rem > 1 ? 's' : ''} disponible${st.rem > 1 ? 's' : ''}` : ''}. Une fois réservé, il apparaîtra comme pris pour tous les visiteurs.</p>
    <form id="reserveForm" data-id="${g.id}">
      <div class="field"><label for="rName">Votre prénom</label>
        <input class="input" id="rName" maxlength="40" value="${esc(me.name)}" placeholder="Ex. Camille" autofocus autocomplete="given-name">
        <div class="hint">${c.showNames ? 'Visible par les autres invités pour éviter les doublons.' : 'Seul l’organisateur de la liste le verra.'}</div></div>
      <label class="check" style="margin-bottom:18px"><input type="checkbox" id="rAnon"> Rester anonyme</label>
      ${c.allowMessages ? `<div class="field"><label for="rMsg">Un petit mot pour l’organisateur <span style="color:var(--muted);font-weight:400">(facultatif)</span></label><textarea class="textarea" id="rMsg" maxlength="300" placeholder="Ex. Je l’achète en bleu, ça te va ?"></textarea></div>` : ''}
      <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap">
        <button type="button" class="btn ghost" data-act="close">Annuler</button>
        <button type="submit" class="btn accent" id="rSubmit">Confirmer la réservation</button>
      </div>
      <p class="hint" style="font-size:12.5px;color:var(--muted);margin:14px 0 0">Vous pourrez annuler depuis cet appareil si besoin.</p>
    </form>
  </div>`, '', { type: 'reserve', id });
}
async function submitReserve(form) {
  const id = form.dataset.id, anon = $('#rAnon').checked, name = $('#rName').value.trim();
  if (!anon && !name) { toast('Indiquez votre prénom ou cochez « Rester anonyme ».', true); $('#rName').focus(); return; }
  await busy($('#rSubmit'), async () => {
    const msg = $('#rMsg') ? $('#rMsg').value : '';
    const d = await backend.action('reserve', { id, name, anonymous: anon, message: msg });
    if (d.result.token) me.res[d.result.reservationId] = { giftId: id, token: d.result.token };
    if (name && !anon) me.name = name;
    saveMe(); closeModal(); applyState(d.state); confetti();
    toast('🎉 C’est réservé ! Tout le monde voit maintenant que ce cadeau est pris.');
  });
}
async function cancelReservation(id, btn) {
  const g = giftById(id); if (!g) return;
  const r = g.reservations.find(isMine); if (!r) return;
  if (!confirm(`Annuler votre réservation de « ${g.name} » ?`)) return;
  await busy(btn, async () => {
    try {
      const d = await backend.action('unreserve', { id, reservationId: r.id, token: (me.res[r.id] || {}).token || '' });
      delete me.res[r.id]; saveMe(); applyState(d.state); toast('Réservation annulée. Le cadeau est de nouveau disponible.');
    } catch (e) { if (/introuvable/.test(e.message)) { delete me.res[r.id]; saveMe(); await reload(); } throw e; }
  });
}
async function toggleLike(type, id, btn) {
  const liked = !!me.likes[type][id];
  await busy(btn, async () => {
    const d = await backend.action('like', { type, id, delta: liked ? -1 : 1 });
    if (liked) delete me.likes[type][id]; else me.likes[type][id] = 1;
    saveMe(); applyState(d.state);
    if (!liked) document.querySelectorAll(`[data-act="like"][data-type="${type}"][data-id="${id}"]`).forEach(b => b.classList.add('pop'));
  });
}

/* ---------- Page Marques ---------- */
function renderBrands() {
  const c = S.data.config;
  $('#app').innerHTML = `<section class="wrap page-head">
      <div class="eyebrow">Pour élargir le champ des possibles</div>
      <h1>Marques &amp; boutiques <em style="color:var(--accent)">préférées</em></h1>
      <p>Pas d’idée précise ? Voici les enseignes que ${esc(c.recipient)} adore. Une carte cadeau ou une trouvaille dans l’une d’elles fera forcément plaisir.</p>
    </section>
    <section class="filters"><div class="wrap filters-row" id="brandFilters"></div></section>
    <div class="wrap"><div class="result-line" id="brandLine"></div><div class="brand-grid" id="brandGrid"></div></div>`;
  updateBrands();
}
function updateBrands() {
  const bf = S.bf, brands = S.data.brands, cats = allCats(brands);
  $('#brandFilters').innerHTML = `<div class="chips" style="flex:1">
      <button class="chip ${!bf.cat ? 'on' : ''}" data-act="b-cat" data-v="">Toutes <span class="n">${brands.length}</span></button>
      ${cats.map(x => `<button class="chip ${bf.cat === x ? 'on' : ''}" data-act="b-cat" data-v="${esc(x)}">${catEmoji(x)} ${esc(x)}</button>`).join('')}
    </div>
    <div class="seg">${[0, 1, 2, 3].map(l => `<button class="${bf.lvl === l ? 'on' : ''}" data-act="b-lvl" data-v="${l}">${l ? curSym().repeat(l) : 'Tous budgets'}</button>`).join('')}</div>`;
  const list = brands.filter(b => (!bf.cat || b.category === bf.cat) && (!bf.lvl || b.priceLevel === bf.lvl))
    .sort((a, b) => (b.likes || 0) - (a.likes || 0) || a.name.localeCompare(b.name));
  $('#brandLine').innerHTML = `<span><b>${list.length}</b> marque${list.length > 1 ? 's' : ''}</span><span>${curSym()} moins de ${money(50)} · ${curSym().repeat(2)} ${money(50)}–${money(150)} · ${curSym().repeat(3)} plus de ${money(150)}</span>`;
  $('#brandGrid').innerHTML = list.length ? list.map(b => brandTile(b)).join('') : `<div class="empty" style="grid-column:1/-1"><div class="big">🛍️</div><h3>Aucune marque ici</h3><p>Essayez une autre catégorie ou un autre budget.</p></div>`;
}

/* ---------- Idée cadeau (mini-algo) ---------- */
function brandLevelFor(total) { return total < 50 ? 1 : total < 150 ? 2 : 3; }
function findIdeas() {
  const fd = S.fd, total = Math.max(0, fd.budget) * fd.people, cats = fd.cats, catSel = cats.length > 0;
  const gifts = S.data.gifts, avail = gifts.filter(g => gstat(g).rem > 0);
  const inBudget = avail.filter(g => g.price <= total);
  const reservedInBudget = gifts.filter(g => g.price <= total && gstat(g).rem <= 0).length;
  const inCat = catSel ? inBudget.filter(g => cats.includes(g.category)) : inBudget;
  const pool = inCat.length ? inCat : inBudget;
  const score = (g) => 0.45 * (total ? g.price / total : 0) + 0.30 * ((g.priority - 1) / 2) + 0.15 * Math.min(g.likes || 0, 10) / 10 + (catSel && cats.includes(g.category) ? 0.1 : 0);
  const ranked = pool.slice().sort((a, b) => score(b) - score(a) || b.price - a.price);
  const above = avail.filter(g => g.price > total && (!catSel || cats.includes(g.category))).sort((a, b) => a.price - b.price)[0]
    || avail.filter(g => g.price > total).sort((a, b) => a.price - b.price)[0];
  const lvl = brandLevelFor(total);
  const brands = S.data.brands.filter(b => b.priceLevel <= lvl)
    .sort((a, b) => ((catSel && cats.includes(b.category)) ? 0 : 1) - ((catSel && cats.includes(a.category)) ? 0 : 1) || b.priceLevel - a.priceLevel || (b.likes || 0) - (a.likes || 0)).slice(0, 4);
  return { total, ranked, inBudget: inBudget.length, inCat: inCat.length, catSel, catFallback: catSel && !inCat.length && inBudget.length > 0, reservedInBudget, above, brands };
}
function renderFinder() {
  $('#app').innerHTML = `<section class="wrap page-head">
      <div class="eyebrow">Le petit assistant</div>
      <h1>Trouvez <em style="color:var(--accent)">le</em> bon cadeau</h1>
      <p>Indiquez votre budget, on vous propose le cadeau disponible le plus adapté — ou, à défaut, les boutiques où chercher.</p>
    </section>
    <div class="wrap finder"><aside class="panel" id="finderForm"></aside><section id="finderResult"></section></div>`;
  renderFinderForm(); renderFinderResult();
}
function renderFinderForm() {
  const fd = S.fd, cats = allCats(S.data.gifts.concat(S.data.brands));
  $('#finderForm').innerHTML = `
    <div class="field"><label for="fdBudget">${fd.people > 1 ? 'Budget par personne' : 'Votre budget maximum'}</label>
      <div class="money"><input class="input" id="fdBudget" data-fd="budget" type="number" min="0" step="5" inputmode="decimal" value="${fd.budget}"><span>${curSym()}</span></div>
      <div class="wrap-chips" style="margin-top:10px">${[20, 30, 50, 100, 150, 250].map(v => `<button class="chip ${fd.budget === v ? 'on' : ''}" data-act="fd-budget" data-v="${v}">${money(v)}</button>`).join('')}</div>
    </div>
    <div class="field"><span class="label">Vous offrez</span>
      <div class="seg full"><button class="${fd.people === 1 ? 'on' : ''}" data-act="fd-solo">Seul·e</button><button class="${fd.people > 1 ? 'on' : ''}" data-act="fd-group">À plusieurs</button></div>
      ${fd.people > 1 ? `<div style="display:flex;align-items:center;gap:12px;margin-top:12px"><div class="stepper"><button data-act="fd-people" data-v="-1" aria-label="Moins">−</button><span>${fd.people}</span><button data-act="fd-people" data-v="1" aria-label="Plus">+</button></div><span style="color:var(--muted);font-size:14px">personnes</span></div>` : ''}
    </div>
    ${fd.people > 1 ? `<div class="total-line">Budget total : <b>${money(fd.budget * fd.people)}</b></div>` : ''}
    <div class="field"><span class="label">Plutôt quel type de cadeau ? <span style="color:var(--muted);font-weight:400">(facultatif)</span></span>
      <div class="wrap-chips">${cats.map(c => `<button class="chip ${fd.cats.includes(c) ? 'on' : ''}" data-act="fd-cat" data-v="${esc(c)}">${catEmoji(c)} ${esc(c)}</button>`).join('')}</div>
    </div>
    <button class="btn accent block" data-act="fd-run" style="padding:15px">✨ Trouver une idée</button>`;
}
function renderFinderResult() {
  const box = $('#finderResult'); if (!box) return;
  const fd = S.fd, rc = S.data.config.recipient;
  if (!fd.ran) { box.innerHTML = `<div class="finder-empty"><div class="big">🎯</div><h3>Votre budget, notre suggestion</h3><p>Le choix tient compte des coups de cœur de ${esc(rc)}, des cadeaux encore disponibles et de ce que les invités aiment.</p></div>`; return; }
  const r = findIdeas();
  const brandBlock = (title, sub) => r.brands.length ? `<h3 class="h-sub">${title}</h3><p style="color:var(--muted);margin:0">${sub}</p><div class="brand-grid" style="margin-top:16px;padding-bottom:0">${r.brands.map(b => brandTile(b)).join('')}</div>`
    : `<h3 class="h-sub">${title}</h3><p style="color:var(--muted)">Aucune marque référencée dans ce budget pour l’instant. <a href="#/marques">Voir toutes les marques</a>.</p>`;
  if (!r.ranked.length) {
    const n = r.above && fd.budget > 0 ? Math.ceil(r.above.price / Math.max(fd.budget, 1)) : 0;
    box.innerHTML = `<div class="notice warn"><span class="ico">😕</span><div><b>Plus aucun cadeau disponible jusqu’à ${money(r.total)}.</b>${r.reservedInBudget ? `<br>${r.reservedInBudget} cadeau${r.reservedInBudget > 1 ? 'x' : ''} de ce budget ${r.reservedInBudget > 1 ? 'ont' : 'a'} déjà été réservé${r.reservedInBudget > 1 ? 's' : ''}.` : ''}</div></div>
      ${r.above ? `<div class="notice info"><span class="ico">🤝</span><div>Le cadeau disponible le plus proche est <b>${esc(r.above.name)}</b> à <b>${money(r.above.price)}</b>. ${n > fd.people ? `À ${n}, avec ${money(fd.budget)} chacun, c’est possible !` : ''}<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn sm" data-act="open" data-id="${r.above.id}">Voir ce cadeau</button>${n > fd.people ? `<button class="btn ghost sm" data-act="fd-group-for" data-v="${n}">Calculer à ${n}</button>` : ''}</div></div></div>` : ''}
      ${brandBlock('Nos sites de référence pour ce budget', 'Des enseignes appréciées, où vous trouverez forcément quelque chose dans votre budget.')}`;
    return;
  }
  const idx = fd.idx % r.ranked.length, g = r.ranked[idx];
  const alts = r.ranked.filter(x => x.id !== g.id).slice(0, 4);
  const pct = r.total ? Math.round(g.price / r.total * 100) : 100;
  const reasons = [];
  if (g.priority === 3) reasons.push('★ Coup de cœur de ' + esc(rc)); else if (g.priority === 2) reasons.push('Fait très envie à ' + esc(rc));
  if (r.catSel && fd.cats.includes(g.category)) reasons.push(catEmoji(g.category) + ' ' + esc(g.category));
  if (g.likes) reasons.push('♥ ' + g.likes + ' invité' + (g.likes > 1 ? 's' : '') + ' aime' + (g.likes > 1 ? 'nt' : ''));
  if (fd.people > 1) reasons.push(money(Math.ceil(g.price / fd.people * 100) / 100) + ' par personne');
  let notice;
  if (r.ranked.length === 1 && !r.catFallback) notice = `<div class="notice warn"><span class="ico">⚡</span><div><b>C’est le seul cadeau encore disponible dans votre budget</b>${r.catSel ? ' et vos catégories' : ''} — ne tardez pas !</div></div>`;
  else notice = `<div class="notice"><span class="ico">✅</span><div><b>${r.inBudget} cadeau${r.inBudget > 1 ? 'x' : ''} encore disponible${r.inBudget > 1 ? 's' : ''}</b> jusqu’à ${money(r.total)}${r.catSel && !r.catFallback ? `, dont ${r.inCat} dans vos catégories` : ''}.${r.reservedInBudget ? ` (${r.reservedInBudget} déjà réservé${r.reservedInBudget > 1 ? 's' : ''})` : ''}</div></div>`;
  if (r.catFallback) notice = `<div class="notice info"><span class="ico">ℹ️</span><div>Rien dans les catégories choisies pour ce budget : voici la meilleure option parmi les ${r.inBudget} cadeau${r.inBudget > 1 ? 'x' : ''} disponible${r.inBudget > 1 ? 's' : ''}.</div></div>`;
  box.innerHTML = notice + `<div class="result-hero">
      <div class="media">${media(g.image, g.category, g.name)}</div>
      <div class="info">
        <div class="eyebrow">Notre suggestion${r.ranked.length > 1 ? ` · ${idx + 1}/${r.ranked.length}` : ''}</div>
        <h2>${esc(g.name)}</h2>
        <div class="card-brand">${esc(g.brand)}</div>
        <div class="price" style="font-size:28px;margin-top:8px">${money(g.price)}</div>
        <div class="meter"><i style="width:${Math.min(100, pct)}%"></i></div>
        <div style="font-size:13px;color:var(--muted)">Utilise ${pct} % de votre budget</div>
        <div class="reasons">${reasons.map(x => `<span>${x}</span>`).join('')}</div>
        ${g.description ? `<p style="color:var(--muted);margin:0 0 20px">${esc(g.description)}</p>` : ''}
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:auto">
          <button class="btn accent" data-act="reserve" data-id="${g.id}">Réserver ce cadeau</button>
          <button class="btn ghost" data-act="open" data-id="${g.id}">Détails</button>
          ${r.ranked.length > 1 ? '<button class="btn ghost" data-act="fd-next">↻ Une autre idée</button>' : ''}
        </div>
      </div>
    </div>
    ${alts.length ? `<h3 class="h-sub">Autres options dans votre budget</h3><div class="alt-grid">${alts.map(a => `<div class="mini" data-act="open" data-id="${a.id}"><div class="card-media">${media(a.image, a.category, a.name)}</div><h4>${esc(a.name)}</h4><span class="price" style="font-size:15px">${money(a.price)}</span></div>`).join('')}</div>` : ''}
    ${brandBlock('Ou laissez-vous inspirer', 'Ces marques préférées correspondent aussi à votre budget.')}`;
}

/* ---------- Administration ---------- */
function renderAdmin() {
  if (!backend.isAdmin()) {
    const fbMode = backend.needsEmail;
    const adminEmail = (window.LISTE_CONFIG || {}).adminEmail || '';
    $('#app').innerHTML = `<div class="wrap login"><div class="panel">
      <div class="eyebrow">Espace organisateur</div><h1>Configuration</h1>
      <p style="color:var(--muted);margin:0 0 22px">Ajoutez des cadeaux, des marques et personnalisez la liste.</p>
      <form id="loginForm">
        ${fbMode ? `<div class="field"><label for="em">E-mail administrateur</label><input class="input" id="em" type="email" autocomplete="username" value="${esc(adminEmail)}"></div>` : ''}
        <div class="field"><label for="pw">Mot de passe</label><input class="input" id="pw" type="password" autocomplete="current-password" autofocus></div>
        <button class="btn accent block" id="loginBtn" type="submit">Se connecter</button></form>
      ${!fbMode && S.data.defaultPassword ? `<p class="hint" style="font-size:13px;color:var(--muted);margin:16px 0 0">Mode démo : le mot de passe par défaut est <b>cadeaux</b>.</p>` : ''}
    </div></div>`;
    setTimeout(() => { const p = $('#pw'); if (p) p.focus(); }, 30);
    return;
  }
  const tabs = [['gifts', 'Cadeaux', S.data.gifts.length], ['brands', 'Marques', S.data.brands.length], ['res', 'Réservations', S.data.gifts.reduce((n, g) => n + g.reservations.length, 0)], ['config', 'Personnalisation'], ['backup', 'Sauvegarde']];
  $('#app').innerHTML = `<div class="wrap">
    <div class="admin-head"><div><div class="eyebrow">Espace organisateur</div><h1>Configuration</h1></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn ghost" href="#/">Voir la liste</a><button class="btn ghost" data-act="share">Partager le lien</button><button class="btn ghost" data-act="logout">Se déconnecter</button></div></div>
    ${S.data.empty ? `<div class="warn-box"><span>👋 Bienvenue ! La base Firebase est vide. Partez des exemples (modifiables) ou d’une liste vierge.</span><span style="display:flex;gap:8px"><button class="btn sm" data-act="demo-first">Charger les exemples</button><button class="btn ghost sm" data-act="start-empty" style="background:#fff">Liste vierge</button></span></div>` : ''}
    ${S.data.defaultPassword ? `<div class="warn-box"><span>🔐 Vous utilisez encore le mot de passe par défaut. Changez-le dans Personnalisation.</span><button class="btn sm" data-act="a-tab" data-v="config">Changer le mot de passe</button></div>` : ''}
    <div id="kpis"></div>
    <div class="tabs">${tabs.map(t => `<button class="chip ${S.admin.tab === t[0] ? 'on' : ''}" data-act="a-tab" data-v="${t[0]}">${t[1]}${t[2] !== undefined ? ` <span class="n">${t[2]}</span>` : ''}</button>`).join('')}</div>
    <div id="adminBody"></div></div>`;
  renderKpis(); renderAdminBody();
}
function renderKpis() {
  const k = $('#kpis'); if (!k) return;
  const g = S.data.gifts, full = g.filter(x => gstat(x).full).length, value = g.reduce((s, x) => s + x.price * (x.quantity || 1), 0);
  k.innerHTML = `<div class="kpis"><div class="kpi"><b>${g.length}</b><span>cadeaux</span></div><div class="kpi"><b>${me.surprise ? '🙈' : full}</b><span>entièrement réservés</span></div><div class="kpi"><b>${S.data.brands.length}</b><span>marques</span></div><div class="kpi"><b>${money(Math.round(value))}</b><span>valeur totale</span></div></div>`;
}
function statusBadge(g) {
  if (me.surprise) return '<span class="status res">🙈 Masqué</span>';
  const st = gstat(g);
  if (st.full) return '<span class="status res">✓ Réservé</span>';
  if (st.taken) return `<span class="status part">${st.taken}/${st.qty} réservé${st.taken > 1 ? 's' : ''}</span>`;
  return '<span class="status">Disponible</span>';
}
function renderAdminBody() {
  const body = $('#adminBody'); if (!body) return;
  const t = S.admin.tab;
  if (t === 'gifts') {
    const q = norm(S.admin.q);
    const list = S.data.gifts.filter(g => !q || norm(g.name + ' ' + g.brand + ' ' + g.category).includes(q));
    body.innerHTML = `<div class="toolbar"><button class="btn accent" data-act="g-new">+ Ajouter un cadeau</button><div class="search" style="max-width:320px">${ICON.search}<input data-f="adminq" type="search" placeholder="Filtrer…" value="${esc(S.admin.q)}"></div></div>
      <div class="list" id="adminList">${list.length ? list.map(g => `<div class="row">
        <div class="thumb">${media(g.image, g.category, g.name)}</div>
        <div><div class="t">${esc(g.name)}</div><div class="s">${esc([g.brand, g.category].filter(Boolean).join(' · '))}${g.priority === 3 ? ' · ★ Coup de cœur' : ''}</div></div>
        <div class="hide-m"><b>${money(g.price)}</b>${g.quantity > 1 ? `<div class="s">×${g.quantity}</div>` : ''}</div>
        <div class="hide-m">${statusBadge(g)}</div>
        <div class="hide-m s">♥ ${g.likes || 0}</div>
        <div class="acts"><button class="btn ghost sm" data-act="g-edit" data-id="${g.id}">Modifier</button><button class="btn danger sm" data-act="g-del" data-id="${g.id}" aria-label="Supprimer">✕</button></div>
      </div>`).join('') : `<div class="empty"><div class="big">🎁</div><h3>${S.data.gifts.length ? 'Aucun résultat' : 'Aucun cadeau pour l’instant'}</h3>${S.data.gifts.length ? '' : '<button class="btn accent" data-act="g-new">+ Ajouter le premier cadeau</button>'}</div>`}</div>`;
  } else if (t === 'brands') {
    body.innerHTML = `<div class="toolbar"><button class="btn accent" data-act="b-new">+ Ajouter une marque</button></div>
      <div class="list">${S.data.brands.length ? S.data.brands.map(b => { const p = PALETTES[hashStr(b.name) % PALETTES.length]; const logo = b.logo || faviconFor(b.url); return `<div class="row">
        <div class="thumb logo-thumb" style="--c1:${p[0]};--c2:${p[1]}"><span class="mono">${esc(b.name.charAt(0).toUpperCase())}</span>${imgTag(logo, '')}</div>
        <div><div class="t">${esc(b.name)}</div><div class="s">${esc(domainOf(b.url) || 'Pas de site')}</div></div>
        <div class="hide-m s">${esc(b.category)}</div><div class="hide-m">${lvlHTML(b.priceLevel)}</div><div class="hide-m s">♥ ${b.likes || 0}</div>
        <div class="acts"><button class="btn ghost sm" data-act="b-edit" data-id="${b.id}">Modifier</button><button class="btn danger sm" data-act="b-del" data-id="${b.id}" aria-label="Supprimer">✕</button></div>
      </div>`; }).join('') : `<div class="empty"><div class="big">🛍️</div><h3>Aucune marque</h3><button class="btn accent" data-act="b-new">+ Ajouter une marque</button></div>`}</div>`;
  } else if (t === 'res') {
    const all = [];
    S.data.gifts.forEach(g => g.reservations.forEach(r => all.push({ g, r })));
    all.sort((a, b) => String(b.r.date).localeCompare(String(a.r.date)));
    body.innerHTML = `<div class="panel" style="margin-bottom:18px"><label class="switch"><span><b>Mode surprise sur cet appareil</b><small>Masque qui a réservé quoi sur ce navigateur (pratique si la liste est la vôtre). Les invités voient toujours les réservations.</small></span><input type="checkbox" data-act="surprise-toggle" ${me.surprise ? 'checked' : ''}></label></div>
      ${me.surprise ? `<div class="empty"><div class="big">🙈</div><h3>Les réservations sont masquées</h3><p>Désactivez le mode surprise pour les afficher.</p></div>` :
        `<div class="list res-table">${all.length ? all.map(({ g, r }) => `<div class="row">
          <div class="thumb">${media(g.image, g.category, g.name)}</div>
          <div><div class="t">${esc(g.name)}</div><div class="s">${money(g.price)}</div></div>
          <div><b>${esc(r.name || 'Anonyme')}</b></div>
          <div class="hide-m s">${r.message ? '“' + esc(r.message) + '”' : '—'}</div>
          <div class="hide-m s">${fmtDateTime(r.date)}</div>
          <div class="acts"><button class="btn danger sm" data-act="r-del" data-gid="${g.id}" data-rid="${r.id}">Annuler</button></div>
        </div>`).join('') : `<div class="empty"><div class="big">📭</div><h3>Aucune réservation pour l’instant</h3><p>Partagez le lien de la liste à vos proches !</p></div>`}</div>`}`;
  } else if (t === 'config') {
    if (!S.cfg) S.cfg = JSON.parse(JSON.stringify(S.data.config));
    renderConfig();
  } else if (t === 'backup') {
    body.innerHTML = `<div class="settings">
      <div class="panel"><h3>Exporter</h3><p style="color:var(--muted);margin-top:0">Téléchargez toute la liste (configuration, cadeaux, marques, réservations) au format JSON.</p><button class="btn" data-act="export">⬇ Télécharger la sauvegarde</button></div>
      <div class="panel"><h3>Importer</h3><p style="color:var(--muted);margin-top:0">Remplace la liste actuelle par une sauvegarde (ex. préparée en mode démo). Les réservations importées ne pourront être annulées que par vous.</p><label class="btn ghost">⬆ Choisir un fichier JSON<input type="file" accept="application/json,.json" data-upload="import" class="sr"></label></div>
      <div class="panel"><h3>Stockage</h3><p style="color:var(--muted);margin-top:0">${backend.mode === 'firebase' ? '✅ Les données sont enregistrées dans Firebase : réservations, favoris et ajouts sont partagés en temps réel avec tous les visiteurs.' : '⚠️ Mode démo : les données sont enregistrées dans ce navigateur uniquement. Renseignez Firebase dans config.js pour partager la liste.'}</p></div>
      <div class="panel"><h3>Repartir de zéro</h3><p style="color:var(--muted);margin-top:0">Supprime tous les cadeaux, marques et réservations (la personnalisation est conservée).</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn danger" data-act="wipe">Vider la liste</button><button class="btn ghost" data-act="demo">Recharger les exemples</button></div></div>
    </div>`;
  }
}
function renderConfig() {
  const c = S.cfg, body = $('#adminBody');
  const fbMode = backend.mode === 'firebase';
  body.innerHTML = `<div class="settings">
    <div class="panel"><h3>La liste</h3>
      <div class="two"><div class="field"><label>Pour qui ?</label><input class="input" data-cf="recipient" value="${esc(c.recipient)}" maxlength="60" placeholder="Prénom"></div>
      <div class="field"><label>Occasion</label><select class="select full" data-cf="occasion">${GiftCore.OCCASIONS.concat(GiftCore.OCCASIONS.includes(c.occasion) ? [] : [c.occasion]).map(o => `<option ${o === c.occasion ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div></div>
      ${c.occasion === 'Autre' || !GiftCore.OCCASIONS.includes(c.occasion) ? `<div class="field"><label>Nom de l’occasion</label><input class="input" data-cf="occasionCustom" value="${c.occasion === 'Autre' ? '' : esc(c.occasion)}" maxlength="40" placeholder="Ex. Baptême, Diplôme…"></div>` : ''}
      <div class="field"><label>Titre de la liste</label><input class="input" data-cf="title" value="${esc(c.title)}" maxlength="90" placeholder="La liste de ${esc(c.recipient)}"></div>
      <div class="field"><label>Date de l’événement</label><input class="input" type="date" data-cf="eventDate" value="${esc(c.eventDate)}"><div class="hint">Affiche un compte à rebours sur la page d’accueil.</div></div>
      <div class="field"><label>Message d’accueil</label><textarea class="textarea" data-cf="message" maxlength="600">${esc(c.message)}</textarea></div>
      <div class="field"><label>Image d’accueil <span style="color:var(--muted);font-weight:400">(facultatif — sinon collage automatique des cadeaux)</span></label>
        <div class="img-field"><input class="input" data-cf="heroImage" value="${/^(data|fs):/.test(c.heroImage) ? '' : esc(c.heroImage)}" placeholder="${/^(data|fs):/.test(c.heroImage) ? 'Image importée ✓' : 'https://…'}"><label class="btn ghost">Importer<input type="file" accept="image/*" class="sr" data-upload="hero"></label>${c.heroImage ? '<button class="btn ghost" data-act="cf-clear-hero">Retirer</button>' : ''}</div></div>
    </div>
    <div>
      <div class="panel" style="margin-bottom:24px"><h3>Apparence</h3>
        <div class="field"><span class="label">Couleur principale</span><div class="swatches">${PRESET_COLORS.map(col => `<button class="swatch ${c.accent === col ? 'on' : ''}" style="background:${col}" data-act="cf-color" data-v="${col}" aria-label="${col}"></button>`).join('')}<input type="color" data-cf="accent" value="${c.accent}" aria-label="Couleur personnalisée"></div></div>
        <div class="field"><label>Devise</label><select class="select full" data-cf="currency">${GiftCore.CURRENCIES.map(x => `<option ${x === c.currency ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      </div>
      <div class="panel" style="margin-bottom:24px"><h3>Catégories</h3>
        <div class="tag-edit">${c.categories.map((x, i) => `<span class="tag">${catEmoji(x)} ${esc(x)}<button data-act="cf-tag-del" data-v="${i}" aria-label="Retirer">✕</button></span>`).join('')}<input id="tagInput" placeholder="Ajouter + Entrée" maxlength="40"></div>
        <div class="hint" style="font-size:12.5px;color:var(--muted);margin-top:8px">Utilisées pour les filtres. Une catégorie saisie sur un cadeau est ajoutée automatiquement.</div>
      </div>
      <div class="panel" style="margin-bottom:24px"><h3>Réservations</h3>
        <label class="switch"><span><b>Afficher le nom des personnes</b><small>Sinon les invités voient seulement « Réservé ».</small></span><input type="checkbox" data-cf="showNames" ${c.showNames ? 'checked' : ''}></label>
        <label class="switch"><span><b>Autoriser un petit mot</b><small>Visible uniquement dans cet espace.</small></span><input type="checkbox" data-cf="allowMessages" ${c.allowMessages ? 'checked' : ''}></label>
      </div>
      <div class="panel"><h3>Mot de passe</h3>
        <form id="pwForm"><div class="field"><input class="input" type="password" id="pwCur" placeholder="Mot de passe actuel" autocomplete="current-password"></div>
        <div class="two"><input class="input" type="password" id="pwNew" placeholder="Nouveau${fbMode ? ' (6 car. min.)' : ''}" autocomplete="new-password"><input class="input" type="password" id="pwNew2" placeholder="Confirmer" autocomplete="new-password"></div>
        <button class="btn ghost" style="margin-top:14px" type="submit" id="pwBtn">Changer le mot de passe</button></form>
      </div>
    </div>
  </div>
  <div style="position:sticky;bottom:16px;display:flex;justify-content:flex-end;gap:10px;margin:-36px 0 60px"><button class="btn ghost" data-act="cf-reset" style="background:#fff">Annuler les modifications</button><button class="btn accent" data-act="cf-save" id="cfSave">Enregistrer la personnalisation</button></div>`;
}

/* --- Formulaires cadeau / marque --- */
const imgPlaceholder = (v, def) => /^(data|fs):/.test(v || '') ? 'Image importée ✓' : def;
const imgValue = (v) => /^(data|fs):/.test(v || '') ? '' : (v || '');
function giftFormHTML() {
  const d = S.form.data, cats = allCats(S.data.gifts);
  return `<button class="close" data-act="close" aria-label="Fermer">✕</button><div class="modal-pad">
    <h2>${d.id ? 'Modifier le cadeau' : 'Nouveau cadeau'}</h2><p class="sub">Les modifications sont visibles immédiatement par tous.</p>
    <form id="itemForm" class="form-grid"><div>
      <div class="field"><label>Nom du cadeau *</label><input class="input" data-ff="name" value="${esc(d.name)}" maxlength="120" required autofocus placeholder="Ex. Casque audio sans fil"></div>
      <div class="three"><div class="field"><label>Prix (${curSym()}) *</label><input class="input" data-ff="price" type="number" min="0" step="0.01" inputmode="decimal" value="${d.price === '' ? '' : esc(d.price)}" required></div>
        <div class="field"><label>Marque / boutique</label><input class="input" data-ff="brand" value="${esc(d.brand)}" maxlength="60"></div>
        <div class="field"><label>Catégorie</label><input class="input" data-ff="category" list="catList" value="${esc(d.category)}" maxlength="40" placeholder="Choisir ou saisir"><datalist id="catList">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist></div></div>
      <div class="field"><label>Photo</label><div class="img-field"><input class="input" data-ff="image" value="${esc(imgValue(d.image))}" placeholder="${imgPlaceholder(d.image, 'Collez l’URL d’une image…')}"><label class="btn ghost">Importer<input type="file" accept="image/*" class="sr" data-upload="image"></label></div><div class="hint">Astuce : sur la page produit, clic droit sur la photo → « Copier l’adresse de l’image ».</div></div>
      <div class="field"><label>Lien d’achat</label><input class="input" data-ff="url" value="${esc(d.url)}" placeholder="https://…"></div>
      <div class="field"><label>Description / précisions</label><textarea class="textarea" data-ff="description" maxlength="1500" placeholder="Taille, couleur, modèle…">${esc(d.description)}</textarea></div>
      <div class="two"><div class="field"><span class="label">Envie</span><div class="stars">${[[1, 'Sympa'], [2, 'Très envie'], [3, '★ Coup de cœur']].map(([v, l]) => `<button type="button" class="${Number(d.priority) === v ? 'on' : ''}" data-act="ff-set" data-k="priority" data-v="${v}">${l}</button>`).join('')}</div></div>
        <div class="field"><label>Quantité souhaitée</label><input class="input" data-ff="quantity" type="number" min="1" max="99" value="${esc(d.quantity)}"><div class="hint">Plusieurs invités peuvent alors réserver.</div></div></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:6px"><button type="button" class="btn ghost" data-act="close">Annuler</button><button type="submit" class="btn accent" id="formSave">${d.id ? 'Enregistrer' : 'Ajouter le cadeau'}</button></div>
    </div><div class="preview-col"><span class="label">Aperçu</span><div id="formPreview"></div></div></form></div>`;
}
function brandFormHTML() {
  const d = S.form.data, cats = allCats(S.data.brands.concat(S.data.gifts));
  return `<button class="close" data-act="close" aria-label="Fermer">✕</button><div class="modal-pad">
    <h2>${d.id ? 'Modifier la marque' : 'Nouvelle marque'}</h2><p class="sub">Une enseigne ou un site où chercher un cadeau.</p>
    <form id="itemForm" class="form-grid"><div>
      <div class="two"><div class="field"><label>Nom *</label><input class="input" data-ff="name" value="${esc(d.name)}" maxlength="80" required autofocus placeholder="Ex. Sézane"></div>
        <div class="field"><label>Site web</label><input class="input" data-ff="url" value="${esc(d.url)}" placeholder="https://…"></div></div>
      <div class="field"><label>Logo <span style="color:var(--muted);font-weight:400">(facultatif — récupéré automatiquement depuis le site)</span></label><div class="img-field"><input class="input" data-ff="logo" value="${esc(imgValue(d.logo))}" placeholder="${imgPlaceholder(d.logo, 'URL d’un logo…')}"><label class="btn ghost">Importer<input type="file" accept="image/*" class="sr" data-upload="logo"></label></div></div>
      <div class="two"><div class="field"><label>Catégorie</label><input class="input" data-ff="category" list="catList2" value="${esc(d.category)}" maxlength="40"><datalist id="catList2">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
        <div class="field"><span class="label">Gamme de prix</span><div class="stars">${[1, 2, 3].map(v => `<button type="button" class="${Number(d.priceLevel) === v ? 'on' : ''}" data-act="ff-set" data-k="priceLevel" data-v="${v}">${curSym().repeat(v)}</button>`).join('')}</div></div></div>
      <div class="field"><label>Pourquoi cette marque ?</label><textarea class="textarea" data-ff="description" maxlength="500" placeholder="Taille, style préféré, rayons…">${esc(d.description)}</textarea></div>
      <div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn ghost" data-act="close">Annuler</button><button type="submit" class="btn accent" id="formSave">${d.id ? 'Enregistrer' : 'Ajouter la marque'}</button></div>
    </div><div class="preview-col"><span class="label">Aperçu</span><div id="formPreview"></div></div></form></div>`;
}
function openForm(kind, id) {
  if (kind === 'gift') {
    const g = id ? giftById(id) : null;
    S.form = { kind, data: g ? JSON.parse(JSON.stringify(g)) : { name: '', price: '', brand: '', category: S.f.cat || '', image: '', url: '', description: '', priority: 1, quantity: 1, likes: 0, reservations: [] } };
    const form = S.form;
    openModal(giftFormHTML(), 'form', { type: 'form' }); S.form = form;
  } else {
    const b = id ? brandById(id) : null;
    S.form = { kind, data: b ? JSON.parse(JSON.stringify(b)) : { name: '', url: '', logo: '', category: '', priceLevel: 2, description: '', likes: 0 } };
    const form = S.form;
    openModal(brandFormHTML(), 'form', { type: 'form' }); S.form = form;
  }
  updatePreview();
}
function updatePreview() {
  const p = $('#formPreview'); if (!p || !S.form) return;
  const d = S.form.data;
  if (S.form.kind === 'gift') {
    const g = Object.assign({}, d, { id: d.id || 'preview', name: d.name || 'Nom du cadeau', price: Number(d.price) || 0, priority: Number(d.priority) || 1, quantity: Math.max(1, Number(d.quantity) || 1), image: GiftCore.imageUrl(d.image), reservations: d.reservations || [] });
    p.innerHTML = giftCard(g, { preview: true });
  } else {
    const b = Object.assign({}, d, { name: d.name || 'Marque', url: GiftCore.linkUrl(d.url), logo: GiftCore.imageUrl(d.logo), priceLevel: Number(d.priceLevel) || 2 });
    p.innerHTML = brandTile(b, { preview: true });
  }
}
async function saveForm() {
  const f = S.form; if (!f) return;
  await busy($('#formSave'), async () => {
    let d;
    if (f.kind === 'gift') {
      d = await backend.action('saveGift', { gift: f.data });
      const cat = (f.data.category || '').trim();
      if (cat && !d.state.config.categories.some(c => c.toLowerCase() === cat.toLowerCase())) {
        const cfg = Object.assign({}, d.state.config, { categories: d.state.config.categories.concat(cat) });
        d = await backend.action('saveConfig', { config: cfg });
        if (S.cfg) S.cfg.categories = d.state.config.categories.slice();
      }
      toast(f.data.id ? 'Cadeau mis à jour ✓' : 'Cadeau ajouté ✓');
    } else {
      d = await backend.action('saveBrand', { brand: f.data });
      toast(f.data.id ? 'Marque mise à jour ✓' : 'Marque ajoutée ✓');
    }
    closeModal(); applyState(d.state);
  });
}

/* ---------- Rendu global ---------- */
function setNav() { document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.route === S.view)); }
function render() {
  setNav();
  if (S.view === 'brands') renderBrands();
  else if (S.view === 'finder') renderFinder();
  else if (S.view === 'admin') renderAdmin();
  else renderGifts();
}
function softRefresh() {
  applyTheme(); renderBanners();
  if (S.view === 'gifts') refreshGifts();
  else if (S.view === 'brands') updateBrands();
  else if (S.view === 'finder') renderFinderResult();
  else if (S.view === 'admin') {
    const loginShown = !!$('#loginForm');
    if (!backend.isAdmin() || loginShown) { if (!(loginShown && !backend.isAdmin())) renderAdmin(); }
    else {
      renderKpis();
      document.querySelectorAll('.tabs .n').forEach((n, i) => { const v = [S.data.gifts.length, S.data.brands.length, S.data.gifts.reduce((s, g) => s + g.reservations.length, 0)][i]; if (v !== undefined) n.textContent = v; });
      const active = document.activeElement;
      if (S.admin.tab !== 'config' && !(active && active.dataset && active.dataset.f === 'adminq')) renderAdminBody();
    }
  }
  if (S.modal && S.modal.type === 'detail') {
    const g = giftById(S.modal.id); const m = $('#modalRoot .modal');
    if (!g) closeModal(); else if (m) m.innerHTML = detailHTML(g);
  }
}
function applyState(state) {
  S.data = state;
  if (state.myLikes) me.likes = { gifts: Object.assign({}, state.myLikes.gifts), brands: Object.assign({}, state.myLikes.brands) };
  const ids = new Set(); state.gifts.forEach(g => g.reservations.forEach(r => ids.add(r.id)));
  let changed = false; Object.keys(me.res).forEach(k => { if (!ids.has(k)) { delete me.res[k]; changed = true; } });
  if (changed || state.myLikes) saveMe();
  softRefresh();
}
async function reload() { applyState(await backend.getState()); }

function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [p, arg] = h.split('/');
  const view = p === 'marques' ? 'brands' : p === 'idee' ? 'finder' : p === 'admin' ? 'admin' : 'gifts';
  if (!(p === 'cadeau' && S.modal && S.modal.type === 'detail')) { if (S.modal) closeModal(); }
  if (view !== S.view) { S.view = view; if (view !== 'admin') S.cfg = null; render(); window.scrollTo(0, 0); }
  else setNav();
  if (p === 'cadeau' && arg) openDetail(decodeURIComponent(arg));
}

/* ---------- Événements ---------- */
const actions = {
  close: () => closeModal(),
  open: (el) => openDetail(el.dataset.id),
  reserve: (el) => openReserve(el.dataset.id),
  cancel: (el) => cancelReservation(el.dataset.id, el),
  like: (el) => toggleLike(el.dataset.type, el.dataset.id, el),
  share: async () => {
    const url = location.href.split('#')[0];
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) { try { await navigator.share({ title: S.data.config.title, url }); return; } catch (e) { /* annulé */ } }
    toast(await copyText(url) ? '🔗 Lien de la liste copié !' : url);
  },
  'copy-gift': async (el) => { const url = location.href.split('#')[0] + '#/cadeau/' + el.dataset.id; toast(await copyText(url) ? '🔗 Lien du cadeau copié !' : url); },
  'surprise-off': () => { me.surprise = false; saveMe(); softRefresh(); if (S.view === 'gifts') renderGifts(); },
  'surprise-toggle': (el) => { me.surprise = el.checked; saveMe(); renderBanners(); renderKpis(); renderAdminBody(); },
  'f-cat': (el) => { S.f.cat = el.dataset.v; $('#filterWrap').innerHTML = filterControlsHTML(); updateGrid(); },
  'f-status': (el) => { S.f.status = el.dataset.v; $('#filterRow2').innerHTML = filterRow2HTML(); updateGrid(); },
  'f-fav': () => { S.f.fav = !S.f.fav; $('#filterRow2').innerHTML = filterRow2HTML(); updateGrid(); },
  'f-reset': () => { S.f = { q: '', cat: '', price: '', status: 'all', fav: false, sort: S.f.sort }; $('#filterWrap').innerHTML = filterControlsHTML(); updateGrid(); },
  'b-cat': (el) => { S.bf.cat = el.dataset.v; updateBrands(); },
  'b-lvl': (el) => { S.bf.lvl = Number(el.dataset.v); updateBrands(); },
  'fd-budget': (el) => { S.fd.budget = Number(el.dataset.v); S.fd.idx = 0; renderFinderForm(); if (S.fd.ran) renderFinderResult(); },
  'fd-solo': () => { S.fd.people = 1; S.fd.idx = 0; renderFinderForm(); if (S.fd.ran) renderFinderResult(); },
  'fd-group': () => { if (S.fd.people === 1) S.fd.people = 2; S.fd.idx = 0; renderFinderForm(); if (S.fd.ran) renderFinderResult(); },
  'fd-group-for': (el) => { S.fd.people = Math.min(30, Math.max(2, Number(el.dataset.v))); S.fd.idx = 0; renderFinderForm(); renderFinderResult(); },
  'fd-people': (el) => { S.fd.people = Math.min(30, Math.max(2, S.fd.people + Number(el.dataset.v))); S.fd.idx = 0; renderFinderForm(); if (S.fd.ran) renderFinderResult(); },
  'fd-cat': (el) => { const c = el.dataset.v, i = S.fd.cats.indexOf(c); if (i >= 0) S.fd.cats.splice(i, 1); else S.fd.cats.push(c); S.fd.idx = 0; renderFinderForm(); if (S.fd.ran) renderFinderResult(); },
  'fd-run': () => { S.fd.ran = true; S.fd.idx = 0; renderFinderResult(); if (window.innerWidth < 1000) $('#finderResult').scrollIntoView({ behavior: 'smooth' }); },
  'fd-next': () => { S.fd.idx++; renderFinderResult(); },
  logout: async () => { await backend.logout(); S.cfg = null; await reload().catch(() => {}); renderAdmin(); toast('Déconnecté.'); },
  'a-tab': (el) => { S.admin.tab = el.dataset.v; if (el.dataset.v !== 'config') S.cfg = null; renderAdmin(); },
  'g-new': () => openForm('gift'),
  'g-edit': (el) => openForm('gift', el.dataset.id),
  'g-del': (el) => {
    const g = giftById(el.dataset.id); if (!g) return;
    if (!confirm(`Supprimer « ${g.name} »${g.reservations.length ? ' (déjà réservé !)' : ''} ?`)) return;
    busy(el, async () => { const d = await backend.action('deleteGift', { id: g.id }); applyState(d.state); toast('Cadeau supprimé.'); });
  },
  'b-new': () => openForm('brand'),
  'b-edit': (el) => openForm('brand', el.dataset.id),
  'b-del': (el) => {
    const b = brandById(el.dataset.id); if (!b) return;
    if (!confirm(`Supprimer la marque « ${b.name} » ?`)) return;
    busy(el, async () => { const d = await backend.action('deleteBrand', { id: b.id }); applyState(d.state); toast('Marque supprimée.'); });
  },
  'r-del': (el) => {
    if (!confirm('Annuler cette réservation ? Le cadeau redeviendra disponible.')) return;
    busy(el, async () => { const d = await backend.action('unreserve', { id: el.dataset.gid, reservationId: el.dataset.rid }); applyState(d.state); toast('Réservation annulée.'); });
  },
  'ff-set': (el) => { S.form.data[el.dataset.k] = Number(el.dataset.v); el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); updatePreview(); },
  'cf-color': (el) => { S.cfg.accent = el.dataset.v; applyTheme(Object.assign({}, S.data.config, { accent: S.cfg.accent })); renderConfig(); },
  'cf-tag-del': (el) => { S.cfg.categories.splice(Number(el.dataset.v), 1); renderConfig(); },
  'cf-clear-hero': () => { S.cfg.heroImage = ''; renderConfig(); },
  'cf-reset': () => { S.cfg = JSON.parse(JSON.stringify(S.data.config)); applyTheme(); renderConfig(); toast('Modifications annulées.'); },
  'cf-save': (el) => busy(el, async () => {
    const pending = $('#tagInput') && $('#tagInput').value.trim(); if (pending) addTag(pending);
    const d = await backend.action('saveConfig', { config: S.cfg });
    S.cfg = JSON.parse(JSON.stringify(d.state.config)); applyState(d.state); renderConfig(); toast('Personnalisation enregistrée ✓');
  }),
  export: () => {
    const data = { exportedAt: new Date().toISOString(), config: S.data.config, gifts: S.data.gifts, brands: S.data.brands };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'liste-cadeaux-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  wipe: (el) => { if (!confirm('Supprimer TOUS les cadeaux, marques et réservations ?')) return; busy(el, async () => { const d = await backend.action('importData', { data: { config: S.data.config, gifts: [], brands: [] } }); applyState(d.state); toast('Liste vidée.'); }); },
  demo: (el) => { if (!confirm('Remplacer la liste actuelle par les exemples ?')) return; busy(el, async () => { const d = await backend.action('importData', { data: GiftCore.seed() }); applyState(d.state); renderAdmin(); toast('Exemples chargés.'); }); },
  'demo-first': (el) => busy(el, async () => { const d = await backend.action('importData', { data: GiftCore.seed() }); applyState(d.state); renderAdmin(); toast('Exemples chargés — modifiez-les à votre guise.'); }),
  'start-empty': (el) => busy(el, async () => { const d = await backend.action('importData', { data: { config: { recipient: 'Moi', categories: ['Mode', 'Maison', 'Tech', 'Livres & culture', 'Expériences'] }, gifts: [], brands: [] } }); applyState(d.state); S.admin.tab = 'config'; S.cfg = null; renderAdmin(); toast('Liste créée. Commencez par la personnaliser.'); })
};
function addTag(v) { v = v.trim().slice(0, 40); if (v && !S.cfg.categories.some(c => c.toLowerCase() === v.toLowerCase())) S.cfg.categories.push(v); }

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  if (el.dataset.act === 'overlay') { if (e.target === el) closeModal(); return; }
  const fn = actions[el.dataset.act]; if (!fn) return;
  if (el.tagName === 'INPUT') { fn(el, e); return; }
  if (el.tagName !== 'A' || !el.getAttribute('href')) e.preventDefault();
  fn(el, e);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && S.modal) closeModal();
  if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('card') && e.target.dataset.act === 'open') openDetail(e.target.dataset.id);
  if (e.key === 'Enter' && e.target.id === 'tagInput') { e.preventDefault(); addTag(e.target.value); renderConfig(); const t = $('#tagInput'); if (t) t.focus(); }
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.fd === 'budget') { e.preventDefault(); actions['fd-run'](); }
});
let qTimer;
document.addEventListener('input', (e) => {
  const t = e.target, ds = t.dataset || {};
  if (ds.f === 'q') { S.f.q = t.value; clearTimeout(qTimer); qTimer = setTimeout(updateGrid, 120); }
  else if (ds.f === 'adminq') { S.admin.q = t.value; const pos = t.selectionStart; renderAdminBody(); const n = $('[data-f="adminq"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { /* */ } } }
  else if (ds.ff && S.form) { S.form.data[ds.ff] = t.value; updatePreview(); }
  else if (ds.fd === 'budget') { S.fd.budget = Math.max(0, Number(t.value) || 0); S.fd.idx = 0; }
  else if (ds.cf && S.cfg) {
    if (t.type === 'checkbox') return;
    if (ds.cf === 'occasionCustom') S.cfg.occasion = t.value.trim() || 'Autre';
    else S.cfg[ds.cf] = t.value;
    if (ds.cf === 'accent') applyTheme(Object.assign({}, S.data.config, { accent: t.value }));
  }
});
document.addEventListener('change', async (e) => {
  const t = e.target, ds = t.dataset || {};
  if (ds.f === 'price') { S.f.price = t.value; updateGrid(); }
  else if (ds.f === 'sort') { S.f.sort = t.value; updateGrid(); }
  else if (ds.fd === 'budget') { renderFinderForm(); if (S.fd.ran) renderFinderResult(); }
  else if (ds.cf && S.cfg) {
    if (t.type === 'checkbox') S.cfg[ds.cf] = t.checked;
    else if (ds.cf === 'occasion') { S.cfg.occasion = t.value; renderConfig(); }
    else if (ds.cf === 'accent') renderConfig();
  }
  else if (ds.upload) {
    const file = t.files && t.files[0]; t.value = ''; if (!file) return;
    if (ds.upload === 'import') {
      try {
        const data = JSON.parse(await file.text());
        if (!confirm('Remplacer toute la liste par le contenu de ce fichier ?')) return;
        const d = await backend.action('importData', { data }); applyState(d.state); toast('Sauvegarde importée ✓');
      } catch (x) { toast(x instanceof SyntaxError ? 'Fichier JSON invalide.' : x.message, true); }
      return;
    }
    try {
      toast('Import de l’image…');
      const isLogo = ds.upload === 'logo';
      const dataUrl = await resizeImage(file, isLogo ? 400 : (backend.mode === 'local' ? 900 : 1200), isLogo ? 'image/png' : 'image/jpeg');
      const url = await backend.upload(dataUrl);
      if (/^fs:/.test(url)) imgReady.set(url.slice(3), dataUrl);
      if (ds.upload === 'hero') { S.cfg.heroImage = url; renderConfig(); }
      else if (S.form) {
        S.form.data[ds.upload] = url;
        const inp = $(`[data-ff="${ds.upload}"]`); if (inp) { inp.value = ''; inp.placeholder = 'Image importée ✓'; }
        updatePreview();
      }
      toast('Image ajoutée ✓');
    } catch (x) { toast(x.message, true); }
  }
});
document.addEventListener('submit', async (e) => {
  const f = e.target; e.preventDefault();
  if (f.id === 'reserveForm') submitReserve(f);
  else if (f.id === 'itemForm') saveForm();
  else if (f.id === 'loginForm') {
    await busy($('#loginBtn'), async () => { await backend.login($('#pw').value, $('#em') ? $('#em').value : ''); await reload(); renderAdmin(); toast('Bienvenue 👋'); });
    const p = $('#pw'); if (p && !backend.isAdmin()) { p.value = ''; p.focus(); }
  } else if (f.id === 'pwForm') {
    const cur = $('#pwCur').value, n1 = $('#pwNew').value, n2 = $('#pwNew2').value;
    if (n1 !== n2) { toast('Les deux nouveaux mots de passe ne correspondent pas.', true); return; }
    await busy($('#pwBtn'), async () => { await backend.changePassword(cur, n1); f.reset(); await reload(); renderAdmin(); toast('Mot de passe modifié ✓'); });
  }
});
window.addEventListener('scroll', () => $('#topbar').classList.toggle('scrolled', window.scrollY > 10), { passive: true });
window.addEventListener('hashchange', route);

/* ---------- Démarrage ---------- */
(async function init() {
  try {
    backend = await pickBackend();
    S.data = await backend.getState();
    if (S.data.myLikes) me.likes = S.data.myLikes;
    applyTheme(); renderBanners(); route();
    backend.subscribe((st) => applyState(st));
  } catch (e) {
    console.error(e);
    $('#app').innerHTML = `<div class="empty"><div class="big">⚠️</div><h3>Impossible de charger la liste</h3><p>${esc(e.message)}</p><button class="btn" onclick="location.reload()">Réessayer</button></div>`;
  }
})();
})();
