# glocalcloudapp

Monorepo with:
- Expo app (expo-router)
- Node/Express API with PostGIS
- Strapi CMS (Postgres)

## Security Features

This application implements comprehensive security features including:
- **Azure Key Vault Integration**: Production secrets are stored in Azure Key Vault
- **Least Privilege Database Access**: Restricted database permissions for service users
- **Environment-based Configuration**: Automatic fallback to environment variables for local development
- **Secure Secret Management**: Runtime secret retrieval with caching

See [SECURITY.md](SECURITY.md) for detailed security policies and configuration guidelines.

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

## Production Setup with Azure Key Vault

For production deployments, the application uses Azure Key Vault for secure secret management:

### 1. Create Azure Key Vault

```bash
# Create resource group
az group create --name your-rg --location eastus

# Create Key Vault
az keyvault create --name your-keyvault-name --resource-group your-rg --location eastus
```

### 2. Store Secrets

```bash
# Server secrets
az keyvault secret set --vault-name your-keyvault-name --name "database-url" --value "postgres://user:password@server:5432/db"
az keyvault secret set --vault-name your-keyvault-name --name "app-api-key" --value "your-strong-api-key"
az keyvault secret set --vault-name your-keyvault-name --name "strapi-token" --value "your-strapi-readonly-token"

# CMS secrets
az keyvault secret set --vault-name your-keyvault-name --name "cms-app-keys" --value "key1,key2,key3,key4"
az keyvault secret set --vault-name your-keyvault-name --name "cms-api-token-salt" --value "your-salt"
az keyvault secret set --vault-name your-keyvault-name --name "cms-admin-jwt-secret" --value "your-admin-secret"
az keyvault secret set --vault-name your-keyvault-name --name "cms-jwt-secret" --value "your-jwt-secret"
```

### 3. Configure Access

```bash
# For App Service with Managed Identity
az webapp identity assign --name your-app --resource-group your-rg
az keyvault set-policy --name your-keyvault-name --object-id <managed-identity-id> --secret-permissions get list
```

### 4. Set Environment Variables

```bash
# Set Key Vault URL in your App Service
az webapp config appsettings set --name your-app --resource-group your-rg --settings AZURE_KEY_VAULT_URL=https://your-keyvault-name.vault.azure.net/
```

The application automatically detects the Key Vault configuration and uses it in production, while falling back to environment variables for local development.

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/aprintz/glocalcloudapp)