# ADR-0001: Consolidate Express API into Strapi CMS

**Status**: Accepted  
**Date**: 2024-08-12  
**Deciders**: Development Team  

## Context

The glocalcloudapp project currently maintains two separate backend services:

1. **Express API Server** (`server/`) - Handles geolocation features with PostGIS, push notifications, and API routing
2. **Strapi CMS** (`cms/`) - Manages content and provides admin interface

This dual-backend architecture introduces several challenges:
- Increased infrastructure complexity and deployment overhead
- Data synchronization issues between services
- Duplicated authentication and authorization logic
- Higher maintenance burden with two codebases
- More complex development setup for contributors

## Decision

We will consolidate the Express API functionality into Strapi as custom plugins, creating a single-backend architecture.

### Migration Plan

1. **Geolocation Plugin**: Convert PostGIS geolocation features from Express into a Strapi plugin
   - Migrate geofencing logic
   - Preserve PostGIS integration for spatial queries
   - Maintain REST API compatibility for mobile app

2. **Push Notifications Plugin**: Transform push notification service into Strapi plugin
   - Integrate with Strapi's user management
   - Leverage Strapi's content types for notification templates
   - Maintain existing notification delivery mechanisms

3. **API Consolidation**: 
   - Migrate custom Express routes to Strapi API extensions
   - Preserve existing API contracts to avoid breaking mobile app
   - Implement authentication through Strapi's users-permissions plugin

## Consequences

### Positive
- **Simplified Architecture**: Single backend service reduces operational complexity
- **Unified Data Model**: All data managed through Strapi's ORM with consistent relationships
- **Better Admin Experience**: Geolocation and push notification management through Strapi admin UI
- **Reduced Infrastructure Costs**: Single service deployment and database
- **Improved Developer Experience**: One codebase, unified development environment
- **Enhanced Content Management**: Location-based content and push notifications as first-class citizens

### Negative
- **Migration Effort**: Significant development time required for plugin development
- **Learning Curve**: Team needs to become proficient with Strapi plugin architecture
- **Potential Performance Impact**: Strapi overhead for high-frequency geolocation operations
- **Vendor Lock-in**: Increased dependency on Strapi ecosystem

### Risks & Mitigations
- **Data Migration**: Comprehensive backup and migration scripts with rollback capability
- **API Compatibility**: Thorough testing to ensure mobile app continues functioning
- **Performance**: Performance testing and optimization of Strapi plugins
- **Timeline**: Phased migration approach to reduce risk

## Implementation Details

### Technology Stack
- **Backend**: Strapi 5.x with TypeScript
- **Database**: PostgreSQL with PostGIS extension
- **Plugins**: Custom TypeScript plugins for geolocation and push notifications
- **API**: REST/GraphQL through Strapi with custom endpoints as needed

### Plugin Structure
```
cms/src/plugins/
├── geolocation/
│   ├── admin/           # Admin UI components
│   ├── server/          # Business logic
│   └── strapi-server.ts # Plugin entry point
└── push-notifications/
    ├── admin/           # Admin UI components  
    ├── server/          # Business logic
    └── strapi-server.ts # Plugin entry point
```

### Database Schema
- Leverage Strapi content types for core entities
- Custom database tables through plugins for complex geospatial operations
- Maintain PostGIS functions and triggers

## Alternatives Considered

1. **Keep Dual Backend**: Maintain status quo
   - Rejected due to operational complexity and maintenance burden

2. **Microservices Architecture**: Split into more specialized services
   - Rejected as overkill for current scale and team size

3. **Custom Node.js Framework**: Build unified API from scratch
   - Rejected due to time investment and loss of Strapi's built-in features

## Review Date

This decision should be reviewed in 6 months (February 2025) to assess:
- Plugin performance and maintainability
- Developer productivity impact
- Operational benefits realization
- Any need for architectural adjustments

## References

- [Strapi Plugin Development Guide](https://docs.strapi.io/dev-docs/plugins-development)
- [PostGIS with Strapi](https://docs.strapi.io/dev-docs/database)
- Current codebase: `server/src/` and `cms/src/`