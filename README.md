# glocalcloudapp

Expo app with:
- Expo app (expo-router)
- Strapi CMS (Postgres)

## Run locally

1) Strapi
- `cd cms`
- Create `.env` (see `.env.example`); for Postgres set `DATABASE_CLIENT=postgres`, `DATABASE_URL`, and `DATABASE_SCHEMA=cms`
- `npm install && npm run develop`
- Create an admin user and add some Pages (publish them)

2) App
- `npm install` (root) and `npm run dev`

### Maps API Key (Android)

The Google Maps key is now injected via environment variable to avoid committing secrets.

1. Copy `.env.example` to `.env` in the project root.
2. Add your key: `GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE` (must have Maps SDK for Android enabled in Google Cloud).
3. Rebuild the native app after adding or changing the key:
	- `npx expo prebuild --clean`
	- `npx expo run:android` (or `run:ios` if later using Google on iOS)
4. If rotating the key, update `.env` and rebuild (a simple re-run with dev client is fine if native code unchanged).

The static key that was previously inside `app.json` has been removed; `app.config.ts` now loads it from `process.env.GOOGLE_MAPS_API_KEY`.

## Note on Express Server

The Express server that was previously part of this monorepo has been removed as part of cleanup and deprecation. The server provided geospatial event management and CMS proxy functionality. See `ARCHIVED_EXPRESS_SERVER.md` for complete documentation of the removed functionality.

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/aprintz/glocalcloudapp)