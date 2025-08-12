# Server (PostgreSQL + PostGIS + Express)

This folder contains a minimal TypeScript API server and SQL schema for geospatial queries (radius, polygon, nearest).

## Local quickstart

1. Start PostGIS locally (Docker required):

```bash
cd server
docker compose up -d
```

This loads the `001_init.sql` migration automatically and enables PostGIS.

2. Install and run the server:

```bash
npm --prefix server install
npm --prefix server run dev
```

The server expects `DATABASE_URL`. For Docker defaults, create `server/.env`:

```
DATABASE_URL=postgres://user:password@localhost:5432/glocal
PORT=4000
DATABASE_SSL=disable
```

3. Try endpoints:

- Health: `GET http://localhost:4000/health`
- Create event: `POST http://localhost:4000/events` with JSON:
  `{ "title": "Ping", "lon": 12.5683, "lat": 55.6761, "payload": {"tag":"demo"} }`
- Radius: `GET /events/radius?lat=55.6761&lon=12.5683&meters=3000`
- Nearest: `GET /events/nearest?lat=55.6761&lon=12.5683&limit=20`
- Polygon: `POST /events/polygon` with body `{ "polygon": {"type":"Polygon","coordinates":[[[lon,lat],...]]} }`
- Bounding box: `GET /events/bbox?w=-122.52&s=37.70&e=-122.35&n=37.83`
- Get by id: `GET /events/:id`
- Update: `PATCH /events/:id` with any of `{ title, payload, lon, lat }`
- Delete: `DELETE /events/:id`
- Bulk insert: `POST /events/bulk` with an array of items `{ title, lon, lat, payload? }`
- List recent: `GET /events?limit=100&sinceHours=24`
- Optional payload filter for most queries: pass `payload={"tag":"demo"}` (URL-encoded)

## Azure setup (PostgreSQL Flexible Server)

1. Create a server (choose a name, region, admin, password). In the Azure Portal or CLI.
   - Enable **Public access** initially for simplicity, or set up VNet/private if you prefer.
   - Choose version 16+.

2. Connect with `psql` and enable extensions in your database:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

3. Run migration `001_init.sql` against your DB.

4. Configure the app with `DATABASE_URL` like:

```
postgres://<admin>:<password>@<server-name>.postgres.database.azure.com:5432/<db>
```

And set `DATABASE_SSL=require` in env for the server to enable TLS.

5. Deploy: any Node hosting (Azure App Service/Container Apps). Set env vars and start with `npm run start` after `npm run build`.

## Notes
- Use the `geography` type for meter-accurate distances.
- Add application filters (categories, time windows) with standard indexes.
- For scale-out, consider Azure Cosmos DB for PostgreSQL (Citus) or region-based sharding.

## CMS (Strapi) integration
- Local dev: Strapi lives under `cms/` (TypeScript). Start with `cd cms && npm run develop` and create an admin user.
- Content type `Page` exists with fields: title, slug, content, tenant and a composite unique index `(tenant, slug)`.
- Server exposes secured proxy routes (requires `APP_API_KEY` via header `x-app-key` or `Authorization: Bearer <key>`):
  - `GET /cms/pages` — list latest published pages
  - `GET /cms/pages/:slug` — get first published page by slug
  - `GET /cms/pages/:tenant/:slug` — disambiguated fetch when slugs repeat per tenant
- Configure env in `server/.env`:
  - `STRAPI_BASE_URL=http://localhost:1337`
  - Optionally `STRAPI_TOKEN` for private Strapi reads (Read-Only API Token)
  - `APP_API_KEY=replace-with-a-strong-shared-secret`
  - `CMS_CACHE_TTL_MS=15000`

### Making Strapi content readable

You have two choices:

1. Public role permissions (fast, less secure): In Strapi admin go to Settings → Users & Permissions Plugin → Roles → Public → enable `find` and `findOne` for Page → Save. Leave `STRAPI_TOKEN` unset.
2. API Token (recommended): Settings → API Tokens → Create new → Read-only → Copy token once → set `STRAPI_TOKEN=<token>` in `server/.env` and restart the Node server. Keep Public role permissions for Page disabled.

Pages must be Published (not draft) to appear because we query with `publicationState=live`.

### Troubleshooting 502 errors from /cms/pages

`502` from the server usually wraps a Strapi error:
- 403 in Strapi → Public role lacks permission and no valid `STRAPI_TOKEN` provided.
- Network/connection refused → Check `STRAPI_BASE_URL`, ensure Strapi is running.
- Token invalid/expired → Regenerate API token, update `STRAPI_TOKEN`, restart server.

To debug, temporarily add logging in `server/src/cms.ts` before throwing (or check server console) and hit the Strapi URL directly with curl.
