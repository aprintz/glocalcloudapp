# glocalcloudapp

Monorepo with:
- Expo app (expo-router)
- Node/Express API with PostGIS
- Strapi CMS (Postgres)

## Privacy & Data Retention

**NEW**: This application now includes comprehensive privacy and data retention features:

- **Automatic Location Purge**: User location data is automatically purged after 30 days
- **GDPR Compliance**: Complete user data deletion endpoints
- **Audit Logging**: All privacy operations are logged for compliance
- **Scheduled Jobs**: Nightly background jobs for data maintenance

See [docs/privacy.md](docs/privacy.md) for complete privacy policy and technical details.

### Privacy API Endpoints

- `POST /user-locations` - Create user location record
- `GET /user-locations` - Retrieve user location data  
- `DELETE /privacy/user-data/:userId` - Delete all user data (GDPR)
- `POST /privacy/purge-locations` - Manual location purge (admin)
- `GET /privacy/audit-log` - Privacy audit trail
- `POST /privacy/trigger-purge` - Trigger purge job manually

All privacy endpoints require API key authentication.

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

### Maps API Key (Android)

The Google Maps key is now injected via environment variable to avoid committing secrets.

1. Copy `.env.example` to `.env` in the project root.
2. Add your key: `GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE` (must have Maps SDK for Android enabled in Google Cloud).
3. Rebuild the native app after adding or changing the key:
	- `npx expo prebuild --clean`
	- `npx expo run:android` (or `run:ios` if later using Google on iOS)
4. If rotating the key, update `.env` and rebuild (a simple re-run with dev client is fine if native code unchanged).

The static key that was previously inside `app.json` has been removed; `app.config.ts` now loads it from `process.env.GOOGLE_MAPS_API_KEY`.

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/aprintz/glocalcloudapp)