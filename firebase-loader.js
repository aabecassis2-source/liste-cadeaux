/* Chargement du SDK Firebase (CDN officiel) et petite façade utilisée par firebase-backend.js */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut,
  EmailAuthProvider, reauthenticateWithCredential, updatePassword
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, doc, collection, onSnapshot, setDoc, deleteDoc, getDoc, runTransaction, writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

export function createFb(firebaseConfig) {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const ref = (path) => doc(db, ...path.split('/'));

  return {
    waitAuth: () => new Promise((resolve) => { const off = onAuthStateChanged(auth, (u) => { off(); resolve(u); }); }),
    onAuth: (cb) => onAuthStateChanged(auth, cb),
    signInAnon: async () => (await signInAnonymously(auth)).user,
    signIn: async (email, pw) => (await signInWithEmailAndPassword(auth, email, pw)).user,
    signOut: () => signOut(auth),
    changePassword: async (current, next) => {
      const u = auth.currentUser;
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, current));
      await updatePassword(u, next);
    },
    listen: (col, cb, onErr) => onSnapshot(collection(db, col), (s) => cb(s.docs.map(d => ({ id: d.id, data: d.data() }))), onErr),
    listenDoc: (path, cb, onErr) => onSnapshot(ref(path), (s) => cb(s.exists() ? s.data() : null), onErr),
    get: async (path) => { const s = await getDoc(ref(path)); return s.exists() ? s.data() : null; },
    set: (path, data) => setDoc(ref(path), data),
    del: (path) => deleteDoc(ref(path)),
    /* création atomique : échoue si le document existe déjà (deux réservations simultanées) */
    create: (path, data) => runTransaction(db, async (tx) => {
      const r = ref(path); const s = await tx.get(r);
      if (s.exists()) { const e = new Error('exists'); e.code = 'exists'; throw e; }
      tx.set(r, data);
    }),
    batch: async (ops) => {
      const b = writeBatch(db);
      ops.forEach(o => { if (o.op === 'set') b.set(ref(o.path), o.data); else b.delete(ref(o.path)); });
      await b.commit();
    },
    newId: () => doc(collection(db, 'gifts')).id
  };
}
