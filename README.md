# glocalcloudapp

Monorepo with:
- Expo app (expo-router)
- Node/Express API with PostGIS
- Strapi CMS (Postgres)

## Run everything locally

1) Database
- `cd server && docker compose up -d` to start PostGIS with migrations

2) Server
- Create `server/.env` (see `.env.example`), ensure `APP_API_KEY` is set
- `npm --prefix server install`
- `npm --prefix server run dev`

3) Strapi
- `cd cms`
- Create `.env` (see `.env.example`); for Postgres set `DATABASE_CLIENT=postgres`, `DATABASE_URL`, and `DATABASE_SCHEMA=cms`
- `npm install && npm run develop`
- Create an admin user and add some Pages (publish them)

4) App
- Ensure these Expo public env vars are set before `npm run dev` in the root:
	- `EXPO_PUBLIC_API_BASE` (default http://localhost:4000)
	- `EXPO_PUBLIC_APP_API_KEY` (must match server APP_API_KEY)
- `npm install` (root) and `npm run dev`
- Open the “Content” tab to fetch pages via the secured server proxy

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/aprintz/glocalcloudapp)