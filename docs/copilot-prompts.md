# Copilot Prompt Library for glocalcloudapp

This document contains pre-written prompts for common development tasks in the glocalcloudapp project. Copy and paste these prompts to GitHub Copilot Chat for faster development.

## Strapi Plugin Development

### Creating a New Plugin

```
Create a new Strapi plugin called [PLUGIN_NAME] with the following structure:
- Server-side controller with CRUD operations
- Service layer for business logic  
- TypeScript interfaces for data models
- Admin UI components for management
- Proper error handling and validation

Follow the patterns established in the existing geolocation and push-notifications plugins.
```

### Adding PostGIS Spatial Queries

```
Create a Strapi service method that uses PostGIS to find locations within a radius. The method should:
- Accept latitude, longitude, and radius parameters
- Use ST_DWithin for efficient spatial filtering
- Return results ordered by distance
- Include proper TypeScript types
- Handle coordinate system SRID 4326
```

### Plugin API Endpoint

```
Create a custom Strapi API endpoint for [FUNCTIONALITY] that:
- Follows REST conventions
- Includes proper authentication middleware
- Validates input parameters using Joi or similar
- Returns consistent JSON response format
- Includes error handling with appropriate HTTP status codes
```

## Mobile App Development

### Location-Based Feature

```
Create a React Native component that:
- Requests location permissions on mount
- Gets current user location using expo-location
- Displays location on expo-maps with markers
- Handles loading and error states
- Uses TypeScript with proper interfaces
- Follows React hooks best practices
```

### API Integration Hook

```
Create a custom React hook for fetching data from the Strapi API that:
- Manages loading, data, and error states
- Includes retry logic for failed requests
- Uses TypeScript for type safety
- Implements proper cleanup to prevent memory leaks
- Caches responses when appropriate
```

### Navigation Setup

```
Set up expo-router navigation for a new feature with:
- Tab navigation for main screens
- Stack navigation for detail views
- TypeScript route parameter definitions
- Proper deep linking configuration
- Loading and error boundary components
```

## Database Operations

### PostGIS Migration

```
Create a PostgreSQL migration script that:
- Adds PostGIS extension if not exists
- Creates a table with geometry column for storing locations
- Adds spatial indexes for performance
- Includes sample data insertion
- Uses proper SRID for GPS coordinates (4326)
```

### Strapi Content Type

```
Define a Strapi content type schema for [ENTITY_NAME] with:
- Proper field types and validations
- Relationships to other content types
- Admin panel display configuration
- API permissions setup
- TypeScript interface generation
```

## Push Notifications

### Notification Service

```
Create a push notification service that:
- Integrates with Expo push notification service
- Stores notification templates in Strapi
- Supports location-triggered notifications
- Handles batch sending for multiple users
- Includes delivery status tracking
```

### Geofencing Logic

```
Implement geofencing functionality that:
- Monitors user location changes
- Triggers notifications when entering/exiting zones
- Uses efficient PostGIS spatial queries
- Manages background location updates
- Respects battery optimization and permissions
```

## Testing

### Plugin Unit Tests

```
Create unit tests for the [PLUGIN_NAME] Strapi plugin that:
- Test all service methods with various inputs
- Mock database connections and external APIs
- Verify error handling scenarios
- Use Jest with TypeScript support
- Include test data factories for consistent setup
```

### Mobile App E2E Tests

```
Create end-to-end tests for the mobile app feature [FEATURE_NAME] that:
- Use Detox or similar React Native testing framework
- Test user flows from start to finish
- Mock API responses for consistent testing
- Include screenshot capture for visual regression
- Run on both iOS and Android simulators
```

## DevOps & Configuration

### Environment Setup

```
Create environment configuration for [ENVIRONMENT] that:
- Defines all required environment variables
- Includes database connection strings
- Sets up API keys for external services
- Configures Strapi plugins properly
- Includes Docker compose if needed
```

### Deployment Script

```
Create a deployment script for the Strapi backend that:
- Builds the application with TypeScript compilation
- Runs database migrations
- Handles environment-specific configurations
- Includes rollback capability
- Performs health checks after deployment
```

## Debugging & Troubleshooting

### API Debugging

```
Help me debug this Strapi API issue: [DESCRIBE_ISSUE]
Check for:
- Plugin registration and bootstrap issues
- Database connection and query problems
- Authentication and permission errors
- Route conflicts or middleware issues
- TypeScript compilation errors
```

### Mobile App Performance

```
Analyze and optimize the performance of this React Native component: [COMPONENT_CODE]
Focus on:
- Unnecessary re-renders and state updates
- Memory leaks and cleanup issues
- Expensive operations on main thread
- Bundle size and lazy loading opportunities
- Native module usage optimization
```

## Code Review & Refactoring

### Code Quality Check

```
Review this code for best practices and suggest improvements: [CODE_BLOCK]
Check for:
- TypeScript type safety and proper interfaces
- Error handling and edge cases
- Performance optimizations
- Code organization and modularity
- Security considerations and validation
```

### Migration Planning

```
Plan the migration of [FEATURE] from Express server to Strapi plugin:
- Identify dependencies and data models
- Map existing API endpoints to plugin structure
- Plan database schema changes
- Consider backward compatibility
- Estimate effort and risks
```

## Documentation

### API Documentation

```
Generate API documentation for the [PLUGIN_NAME] plugin including:
- Endpoint descriptions with parameters
- Request/response examples
- Authentication requirements
- Error codes and messages
- Usage examples in TypeScript
```

### Component Documentation

```
Create documentation for the React Native component [COMPONENT_NAME] including:
- Props interface with descriptions
- Usage examples
- Integration with other components
- Performance considerations
- Accessibility features
```

## Quick Fixes

### Common Issues

```
Fix this common Strapi plugin issue: [ERROR_MESSAGE]
Provide:
- Root cause analysis
- Step-by-step solution
- Prevention strategies
- Related documentation links
- Test cases to verify fix
```

### Mobile App Bugs

```
Debug this React Native issue: [BUG_DESCRIPTION]
Check:
- Platform-specific problems (iOS/Android)
- Expo SDK version compatibility
- Native module configuration
- Metro bundler cache issues
- Development vs production differences
```

---

## Usage Tips

1. **Be Specific**: Replace placeholders like [PLUGIN_NAME] with actual names
2. **Provide Context**: Include relevant code snippets when asking for help
3. **Iterative Development**: Use these prompts as starting points and refine based on results
4. **Stay Updated**: Update prompts as the project evolves and new patterns emerge

For more specific guidance, refer to:
- `.github/COPILOT_INSTRUCTIONS.md` for detailed development guidelines
- `docs/adr/ADR-0001-consolidate-cms-api.md` for architectural decisions
- Individual plugin documentation in `cms/src/plugins/*/README.md`