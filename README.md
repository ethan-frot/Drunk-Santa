# Drunk-Santa ❄️🎁

Un mini-jeu d’arcade web en Next.js x Phaser où vous attrapez des objets, évitez les pièges et grimpez au classement. Le projet comprend une API REST minimale, une base de données Postgres (via Prisma) et un déploiement local prêt à l’emploi avec Docker.

## 🎯 Aperçu

- **Gameplay**: moteur Phaser sur un canvas (`app/components/GameCanvas.tsx`). Objets à attraper/éviter, pouvoirs comme le dash et le gel.
- **Classement**: top 10 général, meilleur score par joueur, rang calculé dynamiquement.
- **Notation**: chaque joueur peut attribuer une note 1–5.
- **API**: endpoints Next.js (`app/api/*`) pour gérer joueurs, scores, notes et logs client.
- **Base de données**: modèle Prisma `Player` (nom unique, meilleur score, note, timestamps).

## 📦 Fonctionnalités principales

- **Phaser 3** pour le rendu du jeu sur canvas
- **Next.js 15** (App Router) + **React 19**
- **Prisma** pour l’accès Postgres
- **Docker Compose** pour un Postgres local et **Adminer** (UI SQL)
- **Supabase JS** prêt (URL/clé publique) pour usages côté client si besoin

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+
- Docker (optionnel mais recommandé pour Postgres local)

### Installation

1. Installer les dépendances:

```bash
npm install
```

2. Variables d’environnement:

Copiez `env.example` vers `.env` et renseignez au minimum les variables publiques Supabase (facultatives pour jouer en local si non utilisées dans votre flux) et l’URL Postgres.

```bash
cp env.example .env
```

3. Lancer la base de données (Docker):

```bash
docker-compose up -d
```

4. Créer/synchroniser le schéma Prisma:

```bash
npx prisma db push
```

5. Démarrer le serveur de dev:

```bash
npm run dev
```

Application: `http://localhost:3000`

Adminer (SQL UI): `http://localhost:8080` (serveur: `database`, user: `postgres`, pass: `postgres`, db: `catch-game`)

## 🔧 Scripts

- `npm run dev` — serveur de développement
- `npm run build` — build production
- `npm run start` — serveur production

## 📚 API

Base: `http://localhost:3000/api`

- `GET /players`

  - Retourne la liste triée des noms de joueurs: `string[]`

- `GET /leaderboard?name=Alice`

  - Retourne `top` (top10) et, si `name` fourni et existant, l’info de `player` avec `rank` et `inTop`.

- `POST /score`

  - Corps JSON: `{ name: string, score: number }`
  - Crée le joueur s’il n’existe pas, met à jour `bestScore` uniquement si le nouveau score est supérieur.

- `GET /rating?name=Alice`

  - Retourne `{ rating: number }` (0 si joueur inconnu).

- `POST /rating`

  - Corps JSON: `{ name: string, rating: number }` (1–5)
  - Met à jour la note si la nouvelle valeur est supérieure (non rétrogradable), crée le joueur si nécessaire.

- `POST /log`
  - Corps JSON libre `{ level?: 'info'|'warn'|'error', message?: string, detail?: any }`
  - Écrit dans la console serveur (utile en dev si la BDD n’est pas lancée).

## 🖼️ Assets & Jeu

- Assets sous `public/assets/*` (personnages, items, étoiles, UI)
- Sons sous `public/sounds/*`
- Capacités: dash, gel, objets bonus/malus (ex. gift, vodka, snowflake)

Le cœur du gameplay est centralisé dans `app/components/GameCanvas.tsx`.

## 🧱 Technologies

- Next.js 15, React 19, TypeScript 5
- Phaser 3
- Prisma 6, PostgreSQL
- Supabase JS (client)
- Docker / Adminer

## 📝 Notes de développement

- Le runtime des routes API est forcé en Node.js (`export const runtime = 'nodejs'`) pour de bonnes perfs serveur.
- Les contrôles d’entrée de l’API valident nom/score/note et renvoient des erreurs 400/409 pertinentes.

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [`LICENSE`](./LICENSE) pour plus de détails.
