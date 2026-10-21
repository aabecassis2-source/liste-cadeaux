# 🎁 Liste de cadeaux — GitHub Pages + Firebase

Site 100 % statique (aucun serveur à gérer). Les pages sont hébergées gratuitement sur **GitHub Pages**. Les données partagées (cadeaux, réservations, favoris) sont enregistrées dans **Firebase**, avec l'offre gratuite « Spark », sans carte bancaire.

> Sans configuration, le site fonctionne en **mode démo** : les données restent dans votre navigateur. Pratique pour tester.

---

## Étape 1 — Créer le projet Firebase (5 min)
1. Allez sur https://console.firebase.google.com et connectez-vous avec un compte Google.
2. **Ajouter un projet** → donnez-lui un nom (ex. `liste-cadeaux`) → Google Analytics inutile → **Créer**.

## Étape 2 — Activer la base de données
1. Menu **Créer** → **Firestore Database** → **Créer une base de données**.
2. Emplacement : `eur3 (europe-west)` → mode **production** → **Créer**.

## Étape 3 — Activer la connexion
Menu **Créer** → **Authentication** → **Commencer**, puis dans l'onglet **Sign-in method** :
1. Activez **Adresse e-mail/Mot de passe**.
2. Activez **Anonyme**. C'est indispensable : c'est ce qui permet à chaque visiteur de réserver, puis d'annuler sa propre réservation.
3. Dans l'onglet **Users**, cliquez sur **Ajouter un utilisateur** : votre e-mail et un mot de passe (6 caractères minimum). Ce sera **le compte administrateur**.

## Étape 4 — Coller les règles de sécurité
1. **Firestore Database** → onglet **Règles**.
2. Remplacez tout le contenu par celui du fichier `firestore.rules`.
3. Remplacez `admin@exemple.fr` par l'e-mail administrateur de l'étape 3, **en minuscules**.
4. Cliquez sur **Publier**.

Ces règles garantissent que seul l'admin modifie la liste, que personne ne peut réserver deux fois le même exemplaire et que chacun n'annule que ses propres réservations.

## Étape 5 — Relier le site à Firebase
1. ⚙️ **Paramètres du projet** → **Vos applications** → icône **Web `</>`** → nommez l'application → **Enregistrer**. Inutile de cocher Firebase Hosting.
2. Copiez les valeurs de l'objet `firebaseConfig` affiché.
3. Ouvrez `config.js`, collez ces valeurs dans `firebase: { … }` et renseignez `adminEmail`.

> La clé `apiKey` peut être publique : c'est normal avec Firebase. La sécurité est assurée par les règles de l'étape 4.

## Étape 6 — Publier sur GitHub Pages
1. Créez un compte sur https://github.com si besoin.
2. **New repository** → nom `liste-cadeaux` → **Public** → **Create repository**.
3. Cliquez sur **uploading an existing file**, glissez **tous les fichiers de ce dossier** (pas le dossier lui-même) → **Commit changes**.
4. **Settings** → **Pages** → *Source* : **Deploy from a branch** → branche `main`, dossier `/ (root)` → **Save**.
5. Après une à deux minutes, le site est en ligne : `https://VOTRE-PSEUDO.github.io/liste-cadeaux/`

## Étape 7 — Autoriser votre adresse dans Firebase
**Authentication** → **Settings** → **Domaines autorisés** → **Ajouter un domaine** → `VOTRE-PSEUDO.github.io`.

## Étape 8 — Premier lancement
1. Ouvrez le site → ⚙️ → connectez-vous avec l'e-mail et le mot de passe admin.
2. Choisissez **Charger les exemples** ou **Liste vierge**, puis personnalisez la liste.
3. Partagez le lien ! 🎉

---

## Bon à savoir
- **Modifier le site** : dans GitHub, ouvrez le fichier → ✏️ → *Commit*. Le site se met à jour en une à deux minutes. Les données (dans Firebase) ne sont pas touchées.
- **Photos** : collez l'URL d'une image, ou utilisez « Importer ». L'image est alors compressée et stockée dans Firestore.
- **Sauvegarde** : Configuration → Sauvegarde → export/import JSON. Vous pouvez aussi préparer la liste en mode démo, l'exporter, puis l'importer une fois Firebase configuré.
- **Mot de passe oublié** : Firebase → Authentication → Users → ⋮ → réinitialiser le mot de passe.
- **Gratuité** : l'offre Spark de Firebase est gratuite et sans carte bancaire. Ses quotas quotidiens sont très au-dessus des besoins d'une liste de cadeaux. Le dépôt GitHub doit être public pour que GitHub Pages reste gratuit (le code est alors visible, mais ne contient aucun secret).

## Fichiers
| Fichier | Rôle |
|---|---|
| `index.html`, `styles.css` | page et design |
| `app.js` | application |
| `core.js` | règles métier + mode démo |
| `firebase-backend.js`, `firebase-loader.js` | stockage partagé Firebase |
| `config.js` | **votre configuration** (étape 5) |
| `firestore.rules` | règles de sécurité à coller dans Firebase (étape 4) |
