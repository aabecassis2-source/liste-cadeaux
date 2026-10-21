/* Liste de cadeaux — règles métier (nettoyage des données, mode démo local) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GiftCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const OCCASIONS = ['Anniversaire', 'Noël', 'Mariage', 'Naissance', 'Crémaillère', 'Pot de départ', 'Fête', 'Autre'];
  const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD'];

  function err(status, message) { const e = new Error(message); e.status = status; return e; }
  function str(v, max) { return (v == null ? '' : String(v)).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max || 200); }
  function num(v, min, max, def) { const n = Number(String(v).replace(',', '.')); if (v === '' || v == null || !isFinite(n)) return def; return Math.min(max, Math.max(min, n)); }
  function bool(v) { return v === true || v === 'true' || v === 1 || v === 'on'; }

  function linkUrl(v) {
    let u = str(v, 1000);
    if (!u) return '';
    if (/^www\./i.test(u) || /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(u)) u = 'https://' + u;
    return /^https?:\/\/[^\s]+$/i.test(u) ? u : '';
  }
  function imageUrl(v) {
    const u = (v == null ? '' : String(v)).trim();
    if (!u) return '';
    if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(u) && u.length < 3000000) return u;
    if (/^fs:[A-Za-z0-9_-]{4,40}$/.test(u)) return u; // image stockée dans Firebase
    return linkUrl(u);
  }
  function dateStr(v) { const s = str(v, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; }
  function color(v, def) { const s = str(v, 7); return /^#[0-9a-f]{6}$/i.test(s) ? s.toLowerCase() : def; }

  function sanitizeConfig(c, prev) {
    c = c || {}; prev = prev || {};
    const cats = Array.isArray(c.categories) ? c.categories : (prev.categories || []);
    const seen = new Set(); const categories = [];
    cats.forEach(x => { const s = str(x, 40); const k = s.toLowerCase(); if (s && !seen.has(k)) { seen.add(k); categories.push(s); } });
    const recipient = str(c.recipient, 60) || 'Moi';
    return {
      recipient,
      title: str(c.title, 90) || ('La liste de ' + recipient),
      occasion: str(c.occasion, 40) || 'Anniversaire',
      eventDate: dateStr(c.eventDate),
      message: str(c.message, 600),
      heroImage: imageUrl(c.heroImage),
      accent: color(c.accent, '#d9480f'),
      currency: CURRENCIES.includes(c.currency) ? c.currency : 'EUR',
      categories: categories.slice(0, 24),
      showNames: c.showNames === undefined ? true : bool(c.showNames),
      allowMessages: c.allowMessages === undefined ? true : bool(c.allowMessages)
    };
  }

  function sanitizeReservation(r) {
    return { id: str(r.id, 60), name: str(r.name, 40), message: str(r.message, 300), date: str(r.date, 40), token: str(r.token, 80) };
  }

  function sanitizeGift(g, prev) {
    g = g || {}; prev = prev || {};
    const name = str(g.name, 120);
    if (!name) throw err(400, 'Le nom du cadeau est obligatoire.');
    const price = num(g.price, 0, 1000000, NaN);
    if (!isFinite(price)) throw err(400, 'Le prix est obligatoire (nombre).');
    return {
      id: prev.id || str(g.id, 40),
      name,
      brand: str(g.brand, 60),
      price: Math.round(price * 100) / 100,
      category: str(g.category, 40),
      image: imageUrl(g.image),
      url: linkUrl(g.url),
      description: str(g.description, 1500),
      priority: Math.round(num(g.priority, 1, 3, 1)),
      quantity: Math.round(num(g.quantity, 1, 99, 1)),
      likes: Math.round(num(prev.likes !== undefined ? prev.likes : g.likes, 0, 1e7, 0)),
      reservations: (prev.reservations || (Array.isArray(g.reservations) ? g.reservations : [])).map(sanitizeReservation).filter(r => r.id),
      createdAt: prev.createdAt || str(g.createdAt, 40) || new Date().toISOString()
    };
  }

  function sanitizeBrand(b, prev) {
    b = b || {}; prev = prev || {};
    const name = str(b.name, 80);
    if (!name) throw err(400, 'Le nom de la marque est obligatoire.');
    return {
      id: prev.id || str(b.id, 40),
      name,
      url: linkUrl(b.url),
      logo: imageUrl(b.logo),
      category: str(b.category, 40),
      priceLevel: Math.round(num(b.priceLevel, 1, 3, 2)),
      description: str(b.description, 500),
      likes: Math.round(num(prev.likes !== undefined ? prev.likes : b.likes, 0, 1e7, 0)),
      createdAt: prev.createdAt || str(b.createdAt, 40) || new Date().toISOString()
    };
  }

  function remaining(g) { return Math.max(0, (g.quantity || 1) - (g.reservations || []).length); }

  function find(list, id, label) {
    const i = list.findIndex(x => x.id === id);
    if (i < 0) throw err(404, label + ' introuvable (il a peut-être été supprimé).');
    return i;
  }

  /** Mode démo : applique une action sur la base locale. */
  function dispatch(db, action, p, ctx) {
    p = p || {};
    const now = ctx.now || new Date().toISOString();
    const needAdmin = () => { if (!ctx.admin) throw err(401, 'Accès réservé à l’administration de la liste.'); };
    let result = {};
    switch (action) {
      case 'reserve': {
        const g = db.gifts[find(db.gifts, p.id, 'Cadeau')];
        if (remaining(g) <= 0) throw err(409, 'Trop tard : ce cadeau vient d’être réservé par quelqu’un d’autre.');
        const r = { id: ctx.newId(), name: bool(p.anonymous) ? '' : str(p.name, 40), message: db.config.allowMessages ? str(p.message, 300) : '', date: now, token: ctx.newToken() };
        g.reservations.push(r);
        result = { reservationId: r.id, token: r.token };
        break;
      }
      case 'unreserve': {
        const g = db.gifts[find(db.gifts, p.id, 'Cadeau')];
        const i = g.reservations.findIndex(r => r.id === p.reservationId);
        if (i < 0) throw err(404, 'Réservation introuvable (déjà annulée ?).');
        if (!ctx.admin && g.reservations[i].token !== p.token) throw err(403, 'Seule la personne ayant réservé peut annuler.');
        g.reservations.splice(i, 1);
        break;
      }
      case 'like': {
        const list = p.type === 'brands' ? db.brands : db.gifts;
        const it = list[find(list, p.id, 'Élément')];
        it.likes = Math.max(0, (it.likes || 0) + (Number(p.delta) < 0 ? -1 : 1));
        result = { likes: it.likes };
        break;
      }
      case 'saveConfig': needAdmin(); db.config = sanitizeConfig(p.config, db.config); break;
      case 'saveGift': {
        needAdmin();
        if (p.gift && p.gift.id && db.gifts.some(x => x.id === p.gift.id)) {
          const i = find(db.gifts, p.gift.id, 'Cadeau');
          db.gifts[i] = sanitizeGift(p.gift, db.gifts[i]);
          result = { id: db.gifts[i].id };
        } else {
          const g = sanitizeGift(Object.assign({}, p.gift, { likes: 0, reservations: [] }), { id: ctx.newId(), createdAt: now, likes: 0, reservations: [] });
          db.gifts.unshift(g); result = { id: g.id };
        }
        break;
      }
      case 'deleteGift': needAdmin(); db.gifts.splice(find(db.gifts, p.id, 'Cadeau'), 1); break;
      case 'saveBrand': {
        needAdmin();
        if (p.brand && p.brand.id && db.brands.some(x => x.id === p.brand.id)) {
          const i = find(db.brands, p.brand.id, 'Marque');
          db.brands[i] = sanitizeBrand(p.brand, db.brands[i]);
          result = { id: db.brands[i].id };
        } else {
          const b = sanitizeBrand(Object.assign({}, p.brand, { likes: 0 }), { id: ctx.newId(), createdAt: now, likes: 0 });
          db.brands.unshift(b); result = { id: b.id };
        }
        break;
      }
      case 'deleteBrand': needAdmin(); db.brands.splice(find(db.brands, p.id, 'Marque'), 1); break;
      case 'importData': {
        needAdmin();
        const d = p.data || {};
        if (!d.config || !Array.isArray(d.gifts) || !Array.isArray(d.brands)) throw err(400, 'Fichier invalide : config, gifts et brands sont attendus.');
        const ids = new Set();
        const uid = (id) => { let x = str(id, 40); if (!x || ids.has(x)) x = ctx.newId(); ids.add(x); return x; };
        db.config = sanitizeConfig(d.config, db.config);
        db.gifts = d.gifts.map(g => { const s = sanitizeGift(g, {}); s.id = uid(g.id); s.reservations.forEach(r => { if (!r.token) r.token = ctx.newToken(); }); return s; });
        db.brands = d.brands.map(b => { const s = sanitizeBrand(b, {}); s.id = uid(b.id); return s; });
        break;
      }
      default: throw err(400, 'Action inconnue.');
    }
    db.version = (db.version || 0) + 1;
    db.updatedAt = now;
    return result;
  }

  function publicState(db, admin) {
    const showNames = admin || db.config.showNames;
    return {
      version: db.version || 0,
      admin: !!admin,
      config: JSON.parse(JSON.stringify(db.config)),
      gifts: db.gifts.map(g => Object.assign({}, g, {
        reservations: g.reservations.map(r => ({ id: r.id, name: showNames ? r.name : '', message: admin ? r.message : '', date: r.date }))
      })),
      brands: db.brands.map(b => Object.assign({}, b))
    };
  }

  function seed() {
    const t = Date.now();
    const iso = (k) => new Date(t - k * 3600e3).toISOString();
    const u = (id) => 'https://images.unsplash.com/' + id + '?auto=format&fit=crop&w=900&q=80';
    return {
      version: 1,
      config: sanitizeConfig({
        recipient: 'Léa', title: 'La liste de Léa', occasion: 'Anniversaire', eventDate: '2026-12-12',
        message: 'Merci d’avance pour vos attentions ! Réservez un cadeau pour éviter les doublons — et si rien ne vous inspire, jetez un œil à mes marques préférées.',
        accent: '#d9480f', currency: 'EUR',
        categories: ['Mode', 'Maison', 'Tech', 'Beauté', 'Livres & culture', 'Expériences', 'Sport'],
        showNames: true, allowMessages: true
      }),
      gifts: [
        { id: 'g1', name: 'Casque audio sans fil', brand: 'Exemple', price: 249, category: 'Tech', image: u('photo-1505740420928-5e560c06d30e'), url: '', description: 'Réduction de bruit active, idéal pour le train. Coloris clair de préférence.', priority: 3, quantity: 1, likes: 4, reservations: [], createdAt: iso(1) },
        { id: 'g2', name: 'Montre minimaliste', brand: 'Exemple', price: 129, category: 'Mode', image: u('photo-1523275335684-37898b6baf30'), url: '', description: 'Cadran blanc, bracelet cuir ou maille.', priority: 2, quantity: 1, likes: 2, reservations: [{ id: 'r1', name: 'Thomas', message: '', date: iso(5), token: 'seed-token-r1' }], createdAt: iso(2) },
        { id: 'g3', name: 'Appareil photo instantané', brand: 'Exemple', price: 119, category: 'Tech', image: u('photo-1526170375885-4d8ecf77b99f'), url: '', description: 'Pour les souvenirs de vacances. Avec un pack de films si possible.', priority: 3, quantity: 1, likes: 6, reservations: [], createdAt: iso(3) },
        { id: 'g4', name: 'Baskets en cuir blanc', brand: 'Exemple', price: 95, category: 'Mode', image: u('photo-1542291026-7eec264c27ff'), url: '', description: 'Pointure 39.', priority: 1, quantity: 1, likes: 1, reservations: [], createdAt: iso(4) },
        { id: 'g5', name: 'Coffret de romans', brand: 'Librairie de quartier', price: 45, category: 'Livres & culture', image: u('photo-1512820790803-83ca734da794'), url: '', description: 'Romans contemporains, plutôt en français.', priority: 2, quantity: 2, likes: 3, reservations: [], createdAt: iso(5) },
        { id: 'g6', name: 'Kit café de spécialité', brand: 'Torréfacteur', price: 59, category: 'Maison', image: u('photo-1495474472287-4d71bcdd2085'), url: '', description: 'Grains + filtre manuel.', priority: 1, quantity: 1, likes: 0, reservations: [], createdAt: iso(6) },
        { id: 'g7', name: 'Rituel soin visage', brand: 'Exemple', price: 68, category: 'Beauté', image: u('photo-1556228578-8c89e6adf883'), url: '', description: 'Peau sensible, sans parfum.', priority: 2, quantity: 1, likes: 2, reservations: [], createdAt: iso(7) },
        { id: 'g8', name: 'Atelier céramique pour deux', brand: 'Atelier local', price: 140, category: 'Expériences', image: '', url: '', description: 'Une initiation de 3 h, à Paris ou proche banlieue.', priority: 3, quantity: 1, likes: 5, reservations: [], createdAt: iso(8) },
        { id: 'g9', name: 'Tapis de yoga premium', brand: 'Exemple', price: 79, category: 'Sport', image: '', url: '', description: 'Antidérapant, coloris neutre.', priority: 1, quantity: 1, likes: 0, reservations: [], createdAt: iso(9) },
        { id: 'g10', name: 'Bougie parfumée', brand: 'Exemple', price: 32, category: 'Maison', image: '', url: '', description: 'Notes boisées ou figuier.', priority: 1, quantity: 3, likes: 1, reservations: [], createdAt: iso(10) }
      ],
      brands: [
        { id: 'b1', name: 'Sézane', url: 'https://www.sezane.com', logo: '', category: 'Mode', priceLevel: 2, description: 'Pulls, chemises et accessoires. Taille S / 36.', likes: 3, createdAt: iso(1) },
        { id: 'b2', name: 'Nature & Découvertes', url: 'https://www.natureetdecouvertes.com', logo: '', category: 'Maison', priceLevel: 1, description: 'Petits objets, thé, bien-être.', likes: 2, createdAt: iso(2) },
        { id: 'b3', name: 'Fnac', url: 'https://www.fnac.com', logo: '', category: 'Livres & culture', priceLevel: 1, description: 'Livres, vinyles, places de concert.', likes: 1, createdAt: iso(3) },
        { id: 'b4', name: 'Diptyque', url: 'https://www.diptyqueparis.com', logo: '', category: 'Beauté', priceLevel: 3, description: 'Bougies et parfums.', likes: 4, createdAt: iso(4) },
        { id: 'b5', name: 'Decathlon', url: 'https://www.decathlon.fr', logo: '', category: 'Sport', priceLevel: 1, description: 'Yoga, randonnée, natation.', likes: 0, createdAt: iso(5) },
        { id: 'b6', name: 'Smartbox', url: 'https://www.smartbox.com', logo: '', category: 'Expériences', priceLevel: 2, description: 'Coffrets séjour ou gastronomie.', likes: 2, createdAt: iso(6) },
        { id: 'b7', name: 'Muji', url: 'https://www.muji.com', logo: '', category: 'Maison', priceLevel: 1, description: 'Papeterie, rangement, textile.', likes: 1, createdAt: iso(7) },
        { id: 'b8', name: 'Apple', url: 'https://www.apple.com/fr', logo: '', category: 'Tech', priceLevel: 3, description: 'Accessoires et cartes cadeaux.', likes: 0, createdAt: iso(8) }
      ]
    };
  }

  return { OCCASIONS, CURRENCIES, dispatch, publicState, seed, remaining, sanitizeConfig, sanitizeGift, sanitizeBrand, imageUrl, linkUrl };
});
