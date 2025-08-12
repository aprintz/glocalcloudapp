# Strapi Application with Custom Plugins

A [Strapi](https://strapi.io) application with custom plugins for geolocation, push notifications, and geofencing.

## Plugins

This application includes three custom plugins:

### Push Plugin
- Device registration and token management
- Message delivery to individual devices and users
- Hub-based broadcasting
- Token encryption and hashing
- Feature specs: PUSH-REG-001, PUSH-HASH-001, PUSH-ENC-001, PUSH-SEND-001, PUSH-HUB-001

### Geolocation Plugin  
- Location data ingestion with idempotency
- Data pruning and retention management
- Hub creation and membership
- Location querying and validation
- Feature specs: GEO-ING-001, GEO-PRU-001, GEO-HUB-001, GEO-VAL-001

### Geofence Plugin
- Zone creation and management
- Real-time boundary checking
- Notification processing with suppression
- Batch operations and cron tasks
- Feature specs: GEO-ZONE-001, GEO-CHECK-001, GEO-NOTIF-001, GEO-BATCH-001, GEO-CRON-001

## Testing

Comprehensive test suite using Jest and fast-check for property-based testing.

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode  
npm run test:watch
```

See `__tests__/README.md` for detailed testing documentation and feature specification mappings.

---

# 🚀 Getting started with Strapi

Strapi comes with a full featured [Command Line Interface](https://docs.strapi.io/dev-docs/cli) (CLI) which lets you scaffold and manage your project in seconds.

### `develop`

Start your Strapi application with autoReload enabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-develop)

```
npm run develop
# or
yarn develop
```

### `start`

Start your Strapi application with autoReload disabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-start)

```
npm run start
# or
yarn start
```

### `build`

Build your admin panel. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-build)

```
npm run build
# or
yarn build
```

## ⚙️ Deployment

Strapi gives you many possible deployment options for your project including [Strapi Cloud](https://cloud.strapi.io). Browse the [deployment section of the documentation](https://docs.strapi.io/dev-docs/deployment) to find the best solution for your use case.

```
yarn strapi deploy
```

## 📚 Learn more

- [Resource center](https://strapi.io/resource-center) - Strapi resource center.
- [Strapi documentation](https://docs.strapi.io) - Official Strapi documentation.
- [Strapi tutorials](https://strapi.io/tutorials) - List of tutorials made by the core team and the community.
- [Strapi blog](https://strapi.io/blog) - Official Strapi blog containing articles made by the Strapi team and the community.
- [Changelog](https://strapi.io/changelog) - Find out about the Strapi product updates, new features and general improvements.

Feel free to check out the [Strapi GitHub repository](https://github.com/strapi/strapi). Your feedback and contributions are welcome!

## ✨ Community

- [Discord](https://discord.strapi.io) - Come chat with the Strapi community including the core team.
- [Forum](https://forum.strapi.io/) - Place to discuss, ask questions and find answers, show your Strapi project and get feedback or just talk with other Community members.
- [Awesome Strapi](https://github.com/strapi/awesome-strapi) - A curated list of awesome things related to Strapi.

---

<sub>🤫 Psst! [Strapi is hiring](https://strapi.io/careers).</sub>
