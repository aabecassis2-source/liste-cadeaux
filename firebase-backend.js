/* Liste de cadeaux — stockage partagé via Firebase (Firestore + Auth).
   `fb` est une petite façade créée par firebase-loader.js (remplaçable pour les tests). */

const CHUNK = 400;

export class FirebaseBackend {
  constructor(fb, core, opts) {
    this.fb = fb; this.core = core;
    this.mode = 'firebase'; this.needsEmail = true;
    this.adminEmail = String((opts && opts.adminEmail) || '').trim().toLowerCase();
    this.c = { config: null, gifts: new Map(), brands: new Map(), res: new Map(), likes: new Map(), messages: new Map() };
    this.loaded = new Set(); this.version = 0; this.subs = []; this.msgUnsub = null; this.user = null;
    this.imgCache = new Map();
    this.authError = '';
  }

  /* ---------- démarrage & écoute temps réel ---------- */
  async init() {
    this.user = await this.fb.waitAuth();
    if (!this.user) {
      try { this.user = await this.fb.signInAnon(); }
      catch (e) { this.authError = 'La connexion anonyme Firebase n’est pas activée : les visiteurs ne pourront pas réserver (voir README, étape 3).'; console.warn(e); }
    }
    this.fb.onAuth((u) => { this.user = u; this.watchMessages(); this.emit(); });
    const ready = new Promise((resolve, reject) => {
      const need = ['config', 'gifts', 'brands', 'res', 'likes'];
      const mark = (k) => { this.loaded.add(k); if (need.every(n => this.loaded.has(n))) resolve(); };
      const fail = (e) => { reject(new Error(this.explain(e, 'Lecture impossible'))); };
      this.fb.listenDoc('meta/config', (d) => { this.c.config = d; mark('config'); this.emit(); }, fail);
      const col = (name, key) => this.fb.listen(name, (docs) => {
        const m = new Map(); docs.forEach(d => m.set(d.id, d.data)); this.c[key] = m; mark(key); this.emit();
      }, fail);
      col('gifts', 'gifts'); col('brands', 'brands'); col('reservations', 'res'); col('likes', 'likes');
      setTimeout(() => reject(new Error('Firebase ne répond pas. Vérifiez config.js et votre connexion.')), 15000);
    });
    await ready;
    this.watchMessages();
    return this;
  }
  watchMessages() {
    if (this.msgUnsub) { this.msgUnsub(); this.msgUnsub = null; }
    this.c.messages = new Map();
    if (!this.isAdmin()) return;
    this.msgUnsub = this.fb.listen('messages', (docs) => { const m = new Map(); docs.forEach(d => m.set(d.id, d.data)); this.c.messages = m; this.emit(); }, () => {});
  }
  subscribe(cb) { this.subs.push(cb); }
  emit() {
    if (this.loaded.size < 5) return;
    this.version++;
    clearTimeout(this._t);
    this._t = setTimeout(() => { const s = this.state(); this.subs.forEach(cb => { try { cb(s); } catch (e) { console.error(e); } }); }, 30);
  }

  /* ---------- identité ---------- */
  uid() { return this.user ? this.user.uid : null; }
  email() { return this.user && this.user.email ? String(this.user.email).toLowerCase() : ''; }
  isAdmin() { return !!this.email() && (!this.adminEmail || this.email() === this.adminEmail); }

  /* ---------- état au format de l’application ---------- */
  state() {
    const core = this.core, admin = this.isAdmin(), uid = this.uid();
    const config = core.sanitizeConfig(this.c.config || {});
    const showNames = admin || config.showNames;
    const likeCount = {}; const myLikes = { gifts: {}, brands: {} };
    this.c.likes.forEach((l) => {
      const k = l.type + ':' + l.itemId; likeCount[k] = (likeCount[k] || 0) + 1;
      if (l.uid === uid && myLikes[l.type]) myLikes[l.type][l.itemId] = 1;
    });
    const byGift = {};
    this.c.res.forEach((r, id) => { (byGift[r.giftId] = byGift[r.giftId] || []).push(Object.assign({ id }, r)); });
    const gifts = [];
    this.c.gifts.forEach((g, id) => {
      let s; try { s = core.sanitizeGift(Object.assign({}, g, { reservations: [] }), {}); } catch (e) { return; }
      s.id = id; s.createdAt = g.createdAt || '';
      s.likes = likeCount['gifts:' + id] || 0;
      s.reservations = (byGift[id] || []).sort((a, b) => String(a.date).localeCompare(String(b.date))).map(r => ({
        id: r.id, name: showNames ? (r.name || '') : '', date: r.date || '',
        message: admin ? ((this.c.messages.get(r.id) || {}).text || '') : '',
        mine: !!uid && r.uid === uid
      }));
      gifts.push(s);
    });
    gifts.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const brands = [];
    this.c.brands.forEach((b, id) => {
      let s; try { s = core.sanitizeBrand(b, {}); } catch (e) { return; }
      s.id = id; s.createdAt = b.createdAt || ''; s.likes = likeCount['brands:' + id] || 0; brands.push(s);
    });
    brands.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return { version: this.version, admin, config, gifts, brands, myLikes, empty: !this.c.config, defaultPassword: false, authError: this.authError };
  }
  async getState() { return this.state(); }

  /* ---------- actions ---------- */
  explain(e, fallback) {
    const code = (e && (e.code || '')) + '';
    if (/permission/.test(code)) return this.isAdmin() ? 'Action refusée par Firebase : vérifiez l’e-mail admin dans les règles (README, étape 4).' : 'Action refusée. Rechargez la page et réessayez.';
    if (/unavailable|network/.test(code)) return 'Connexion à Firebase impossible. Vérifiez votre réseau.';
    if (/wrong-password|invalid-credential|user-not-found|invalid-login/.test(code)) return 'E-mail ou mot de passe incorrect.';
    if (/too-many-requests/.test(code)) return 'Trop de tentatives. Réessayez dans quelques minutes.';
    if (/requires-recent-login/.test(code)) return 'Reconnectez-vous puis réessayez.';
    if (/weak-password/.test(code)) return 'Mot de passe trop faible (6 caractères minimum).';
    return (e && e.message) || fallback || 'Une erreur est survenue.';
  }
  err(status, msg) { const e = new Error(msg); e.status = status; return e; }
  needAdmin() { if (!this.isAdmin()) throw this.err(401, 'Accès réservé à l’administration de la liste.'); }
  giftDoc(g) {
    return { name: g.name, brand: g.brand, price: g.price, category: g.category, image: g.image, url: g.url, description: g.description, priority: g.priority, quantity: g.quantity, createdAt: g.createdAt };
  }
  brandDoc(b) { return { name: b.name, url: b.url, logo: b.logo, category: b.category, priceLevel: b.priceLevel, description: b.description, createdAt: b.createdAt }; }
  async batch(ops) { for (let i = 0; i < ops.length; i += CHUNK) await this.fb.batch(ops.slice(i, i + CHUNK)); }
  relatedOps(type, id) {
    const ops = [];
    if (type === 'gifts') this.c.res.forEach((r, rid) => { if (r.giftId === id) { ops.push({ op: 'del', path: 'reservations/' + rid }); ops.push({ op: 'del', path: 'messages/' + rid }); } });
    this.c.likes.forEach((l, lid) => { if (l.type === type && l.itemId === id) ops.push({ op: 'del', path: 'likes/' + lid }); });
    return ops;
  }
  imgOp(v) { return /^fs:/.test(v || '') ? [{ op: 'del', path: 'images/' + v.slice(3) }] : []; }

  async action(name, p) {
    p = p || {};
    const core = this.core, now = new Date().toISOString();
    let result = {};
    try {
      switch (name) {
        case 'reserve': {
          if (!this.uid()) throw this.err(401, this.authError || 'Connexion indisponible, rechargez la page.');
          const g = this.c.gifts.get(p.id);
          if (!g) throw this.err(404, 'Cadeau introuvable (il a peut-être été supprimé).');
          const qty = Math.max(1, Math.min(99, Number(g.quantity) || 1));
          const taken = new Set(); this.c.res.forEach(r => { if (r.giftId === p.id) taken.add(r.slot); });
          const anon = p.anonymous === true || p.anonymous === 'true';
          const doc = { giftId: p.id, uid: this.uid(), name: anon ? '' : String(p.name || '').trim().slice(0, 40), date: now };
          let rid = null;
          for (let slot = 0; slot < qty && !rid; slot++) {
            if (taken.has(slot)) continue;
            try { await this.fb.create('reservations/' + p.id + '_' + slot, Object.assign({ slot }, doc)); rid = p.id + '_' + slot; }
            catch (e) { if (!/exists|permission|aborted/.test(String(e.code || e.message))) throw e; }
          }
          if (!rid) throw this.err(409, 'Trop tard : ce cadeau vient d’être réservé par quelqu’un d’autre.');
          const cfg = core.sanitizeConfig(this.c.config || {});
          const msg = String(p.message || '').trim().slice(0, 300);
          if (cfg.allowMessages && msg) { try { await this.fb.set('messages/' + rid, { uid: this.uid(), text: msg }); } catch (e) { console.warn(e); } }
          result = { reservationId: rid, token: '' };
          break;
        }
        case 'unreserve': {
          const r = this.c.res.get(p.reservationId);
          if (!r) throw this.err(404, 'Réservation introuvable (déjà annulée ?).');
          if (!this.isAdmin() && r.uid !== this.uid()) throw this.err(403, 'Seule la personne ayant réservé peut annuler.');
          await this.fb.del('reservations/' + p.reservationId);
          try { await this.fb.del('messages/' + p.reservationId); } catch (e) { /* pas de message */ }
          break;
        }
        case 'like': {
          if (!this.uid()) throw this.err(401, this.authError || 'Connexion indisponible.');
          const type = p.type === 'brands' ? 'brands' : 'gifts';
          const lid = type + '_' + p.id + '_' + this.uid();
          if (Number(p.delta) < 0) await this.fb.del('likes/' + lid);
          else if (!this.c.likes.has(lid)) await this.fb.set('likes/' + lid, { type, itemId: p.id, uid: this.uid() });
          break;
        }
        case 'saveConfig': this.needAdmin(); await this.fb.set('meta/config', core.sanitizeConfig(p.config, this.c.config || {})); break;
        case 'saveGift': {
          this.needAdmin();
          const g0 = p.gift || {};
          const exists = g0.id && this.c.gifts.has(g0.id);
          const id = exists ? g0.id : this.fb.newId();
          const prev = exists ? this.c.gifts.get(id) : null;
          const s = core.sanitizeGift(g0, { id, createdAt: exists ? prev.createdAt : now, likes: 0, reservations: [] });
          await this.fb.set('gifts/' + id, this.giftDoc(s));
          if (prev && prev.image !== s.image) { try { await this.batch(this.imgOp(prev.image)); } catch (e) { /* */ } }
          result = { id };
          break;
        }
        case 'deleteGift': {
          this.needAdmin();
          const g = this.c.gifts.get(p.id); if (!g) throw this.err(404, 'Cadeau introuvable.');
          await this.batch([{ op: 'del', path: 'gifts/' + p.id }].concat(this.relatedOps('gifts', p.id), this.imgOp(g.image)));
          break;
        }
        case 'saveBrand': {
          this.needAdmin();
          const b0 = p.brand || {};
          const exists = b0.id && this.c.brands.has(b0.id);
          const id = exists ? b0.id : this.fb.newId();
          const prev = exists ? this.c.brands.get(id) : null;
          const s = core.sanitizeBrand(b0, { id, createdAt: exists ? prev.createdAt : now, likes: 0 });
          await this.fb.set('brands/' + id, this.brandDoc(s));
          if (prev && prev.logo !== s.logo) { try { await this.batch(this.imgOp(prev.logo)); } catch (e) { /* */ } }
          result = { id };
          break;
        }
        case 'deleteBrand': {
          this.needAdmin();
          const b = this.c.brands.get(p.id); if (!b) throw this.err(404, 'Marque introuvable.');
          await this.batch([{ op: 'del', path: 'brands/' + p.id }].concat(this.relatedOps('brands', p.id), this.imgOp(b.logo)));
          break;
        }
        case 'importData': {
          this.needAdmin();
          const d = p.data || {};
          if (!d.config || !Array.isArray(d.gifts) || !Array.isArray(d.brands)) throw this.err(400, 'Fichier invalide : config, gifts et brands sont attendus.');
          const ops = [];
          this.c.gifts.forEach((_, id) => ops.push({ op: 'del', path: 'gifts/' + id }));
          this.c.brands.forEach((_, id) => ops.push({ op: 'del', path: 'brands/' + id }));
          this.c.res.forEach((_, id) => { ops.push({ op: 'del', path: 'reservations/' + id }); ops.push({ op: 'del', path: 'messages/' + id }); });
          this.c.likes.forEach((_, id) => ops.push({ op: 'del', path: 'likes/' + id }));
          ops.push({ op: 'set', path: 'meta/config', data: core.sanitizeConfig(d.config, this.c.config || {}) });
          const used = new Set();
          const newId = (id) => { let x = String(id || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40); if (!x || used.has(x)) x = this.fb.newId(); used.add(x); return x; };
          d.gifts.forEach((g) => {
            const s = core.sanitizeGift(Object.assign({}, g, { reservations: [] }), {});
            const id = newId(g.id); s.createdAt = s.createdAt || now;
            ops.push({ op: 'set', path: 'gifts/' + id, data: this.giftDoc(s) });
            (Array.isArray(g.reservations) ? g.reservations : []).slice(0, s.quantity).forEach((r, slot) => {
              ops.push({ op: 'set', path: 'reservations/' + id + '_' + slot, data: { giftId: id, slot, uid: this.uid(), name: String(r.name || '').slice(0, 40), date: String(r.date || now) } });
            });
          });
          d.brands.forEach((b) => { const s = core.sanitizeBrand(b, {}); s.createdAt = s.createdAt || now; ops.push({ op: 'set', path: 'brands/' + newId(b.id), data: this.brandDoc(s) }); });
          await this.batch(ops);
          break;
        }
        default: throw this.err(400, 'Action inconnue.');
      }
    } catch (e) {
      if (e.status) throw e;
      throw new Error(this.explain(e));
    }
    await new Promise(r => setTimeout(r, 60));
    return { result, state: this.state() };
  }

  /* ---------- administration ---------- */
  async login(pw, email) {
    email = String(email || this.adminEmail || '').trim();
    if (!email) throw new Error('Indiquez votre e-mail administrateur.');
    try { this.user = await this.fb.signIn(email, pw); }
    catch (e) { throw new Error(this.explain(e)); }
    if (!this.isAdmin()) { await this.logout(); throw new Error('Ce compte n’est pas l’administrateur de la liste.'); }
    this.watchMessages();
  }
  async logout() {
    try { await this.fb.signOut(); } catch (e) { /* */ }
    try { this.user = await this.fb.signInAnon(); } catch (e) { this.user = null; }
    this.watchMessages();
  }
  async changePassword(current, next) {
    if (String(next).length < 6) throw new Error('Le nouveau mot de passe doit faire au moins 6 caractères.');
    try { await this.fb.changePassword(current, next); } catch (e) { throw new Error(this.explain(e)); }
  }
  async upload(dataUrl) {
    this.needAdmin();
    if (dataUrl.length > 900000) throw new Error('Image trop lourde après compression. Essayez une image plus petite.');
    const id = this.fb.newId();
    try { await this.fb.set('images/' + id, { data: dataUrl }); } catch (e) { throw new Error(this.explain(e)); }
    this.imgCache.set(id, dataUrl);
    return 'fs:' + id;
  }
  async image(id) {
    if (this.imgCache.has(id)) return this.imgCache.get(id);
    const p = this.fb.get('images/' + id).then(d => (d && d.data) || '').catch(() => '');
    this.imgCache.set(id, p);
    const v = await p; this.imgCache.set(id, v); return v;
  }
}
