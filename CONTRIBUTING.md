# Contributing to glocalcloudapp

Welcome to the glocalcloudapp project! This guide will help you understand the project structure, development patterns, and contribution workflow.

## Project Architecture

glocalcloudapp is a monorepo containing three interconnected applications:

### 📱 Expo React Native App (`/app`)
- **Purpose**: Cross-platform mobile application (iOS/Android)
- **Tech Stack**: React Native, Expo Router, TypeScript
- **Key Features**: Map-based UI, push notifications, offline-first design
- **Entry Point**: `app/_layout.tsx`

### 🌐 Express API Server (`/server`)
- **Purpose**: REST API with spatial data capabilities
- **Tech Stack**: Node.js, Express, PostgreSQL with PostGIS, TypeScript
- **Key Features**: Geographic queries, event management, CMS proxy
- **Entry Point**: `server/src/server.ts`

### 📝 Strapi CMS (`/cms`)
- **Purpose**: Content management system for pages and metadata
- **Tech Stack**: Strapi v5, PostgreSQL, TypeScript
- **Key Features**: Page management, multi-tenant content, API generation
- **Entry Point**: `cms/src/index.ts`

## Plugin Patterns

### Strapi Content Types

When creating new Strapi content types, follow these patterns:

1. **Schema Structure** (`cms/src/api/{name}/content-types/{name}/schema.json`):
   ```json
   {
     "kind": "collectionType",
     "collectionName": "plural_name",
     "options": {
       "draftAndPublish": true,
       "indexes": [
         { "name": "idx_unique_constraint", "type": "unique", "columns": ["field1", "field2"] }
       ]
     },
     "attributes": {
       "tenant": { "type": "string", "default": "public" }
     }
   }
   ```

2. **Controllers** (`cms/src/api/{name}/controllers/{name}.ts`):
   - Always validate input parameters
   - Use Strapi's entity service for database operations
   - Handle multi-tenant filtering when applicable

3. **Lifecycle Hooks** (`cms/src/api/{name}/content-types/{name}/lifecycles.ts`):
   - Validate data before persistence
   - Implement soft business rules
   - Log important state changes

### Express API Routes

When adding new API endpoints:

1. **Use Zod for validation**:
   ```typescript
   const schema = z.object({
     lat: z.coerce.number().min(-90).max(90),
     lon: z.coerce.number().min(-180).max(180)
   });
   ```

2. **Implement proper error handling**:
   ```typescript
   try {
     const result = await query(sql, params);
     res.json(result.rows);
   } catch (error) {
     console.error('Query failed:', error);
     res.status(500).json({ error: 'Internal server error' });
   }
   ```

3. **Use parameterized queries** to prevent SQL injection
4. **Include spatial indexing** for geographic data

### React Native Components

When building mobile UI components:

1. **Follow Expo Router patterns** for navigation
2. **Use TypeScript interfaces** for props and state
3. **Implement proper loading states** and error boundaries
4. **Consider offline scenarios** for data fetching

## Development Setup

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- PostgreSQL with PostGIS extension

### Local Development

1. **Database Setup**:
   ```bash
   cd server
   docker compose up -d
   npm run migrate
   ```

2. **API Server**:
   ```bash
   cd server
   cp .env.example .env  # Configure DATABASE_URL and APP_API_KEY
   npm install
   npm run dev
   ```

3. **Strapi CMS**:
   ```bash
   cd cms
   cp .env.example .env  # Configure DATABASE_CLIENT=postgres, DATABASE_URL, DATABASE_SCHEMA=cms
   npm install
   npm run develop
   ```

4. **Mobile App**:
   ```bash
   cp .env.example .env  # Configure EXPO_PUBLIC_API_BASE and EXPO_PUBLIC_APP_API_KEY
   npm install
   npm run dev
   ```

### Environment Variables

Create `.env` files based on `.env.example` in each directory:

- **Root**: `GOOGLE_MAPS_API_KEY`, `EXPO_PUBLIC_API_BASE`, `EXPO_PUBLIC_APP_API_KEY`
- **Server**: `DATABASE_URL`, `APP_API_KEY`, `STRAPI_BASE_URL`, `STRAPI_TOKEN`
- **CMS**: `DATABASE_CLIENT`, `DATABASE_URL`, `DATABASE_SCHEMA`, `APP_KEYS`, `API_TOKEN_SALT`

## Testing Expectations

### Server Testing
- **Unit tests** for individual query functions
- **Integration tests** for API endpoints
- **Property-based tests** for spatial query invariants
- **Performance tests** for spatial index efficiency

Example test structure:
```typescript
describe('Events API', () => {
  test('should create event with valid coordinates', async () => {
    // Test implementation
  });
  
  test('should reject invalid geographic coordinates', async () => {
    // Property-based test for coordinate validation
  });
});
```

### CMS Testing
- **Content type validation** tests
- **Lifecycle hook** behavior verification
- **API endpoint** response validation

### Mobile App Testing
- **Component rendering** tests
- **Navigation flow** tests
- **API integration** tests with mocked responses

## Specification and ADR Traceability

### Architecture Decision Records (ADRs)

We maintain decision context in the following locations:

1. **Database Schema Decisions**: Document in `server/sql/` migration files
2. **API Design Decisions**: Comment complex endpoints in route handlers
3. **CMS Configuration**: Document content type choices in schema files
4. **Mobile App Patterns**: Document navigation and state management in `_layout.tsx`

### Specification Sources

- **API Specification**: OpenAPI-style comments in route handlers
- **Database Schema**: PostGIS spatial patterns documented in migration files
- **Component Interfaces**: TypeScript interfaces serve as contracts
- **Business Logic**: Documented in Strapi lifecycle hooks and validation schemas

### Traceability Workflow

1. **Feature Request** → Document requirements in issue
2. **Technical Design** → Update relevant schema/interface files
3. **Implementation** → Reference issue number in commit messages
4. **Testing** → Verify requirements with property-based tests
5. **Documentation** → Update relevant README files and code comments

## Pull Request Checklist for Copilot-Driven Development

When submitting PRs, especially those developed with GitHub Copilot assistance:

### 🔍 Code Review Checklist

#### Security & Validation
- [ ] All user inputs validated with Zod schemas
- [ ] SQL queries use parameterized statements (no string concatenation)
- [ ] API endpoints require proper authentication
- [ ] Coordinate values validated within geographic bounds (-90 to 90 lat, -180 to 180 lon)
- [ ] Error messages don't expose sensitive information

#### Spatial Data Integrity
- [ ] PostGIS queries use appropriate spatial indexes
- [ ] Geographic data uses consistent SRID (4326)
- [ ] Spatial query results are within expected bounds
- [ ] Distance calculations use geography type for accuracy

#### Performance Considerations
- [ ] Database queries include appropriate `LIMIT` clauses
- [ ] Spatial queries use indexed columns
- [ ] Large datasets are paginated
- [ ] API responses include relevant caching headers

#### Code Quality
- [ ] TypeScript types are properly defined
- [ ] Error handling follows project patterns
- [ ] Logging includes sufficient context for debugging
- [ ] Code follows existing formatting conventions

### 🧪 Testing Requirements

#### Automated Tests
- [ ] Unit tests for new functions/methods
- [ ] Integration tests for new API endpoints
- [ ] Property-based tests for spatial operations
- [ ] Error case testing for invalid inputs

#### Manual Testing
- [ ] API endpoints tested with realistic data
- [ ] Mobile app tested on both iOS and Android simulators
- [ ] Edge cases tested (empty results, boundary conditions)
- [ ] Performance tested with larger datasets

### 📝 Documentation Updates

#### Code Documentation
- [ ] Complex algorithms include explanatory comments
- [ ] PostGIS queries include purpose and expected results
- [ ] Public APIs include JSDoc comments
- [ ] Configuration changes documented in relevant README files

#### Traceability
- [ ] Commit messages reference issue numbers
- [ ] Breaking changes are clearly documented
- [ ] Database schema changes include migration files
- [ ] API changes maintain backward compatibility where possible

### 🤖 Copilot-Specific Considerations

When using GitHub Copilot for development:

#### Code Review Vigilance
- [ ] Verify Copilot-generated spatial queries for correctness
- [ ] Check that suggested coordinate systems match project standards
- [ ] Validate that error handling patterns match project conventions
- [ ] Ensure suggested database operations use proper transaction handling

#### Pattern Consistency
- [ ] Copilot suggestions align with existing project patterns
- [ ] Generated code follows established naming conventions
- [ ] Suggested dependencies are appropriate for the project
- [ ] Code complexity is reasonable for maintainability

#### Testing Generated Code
- [ ] Property-based tests verify spatial operation invariants
- [ ] Edge cases are explicitly tested (not just happy path)
- [ ] Performance characteristics are validated
- [ ] Error scenarios are thoroughly covered

## Common Development Patterns

### Adding a New Spatial Query

1. **Define the query in server**:
   ```typescript
   // server/src/spatial-queries.ts
   export const findEventsNearRoute = async (routeGeoJSON: any, bufferMeters: number) => {
     const sql = `
       SELECT id, title, payload, created_at
       FROM events
       WHERE ST_DWithin(
         geog,
         ST_Buffer(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography, $2)
       )
       LIMIT 500
     `;
     return await pool.query(sql, [JSON.stringify(routeGeoJSON), bufferMeters]);
   };
   ```

2. **Add validation schema**:
   ```typescript
   const RouteSearchSchema = z.object({
     route: z.any(), // GeoJSON LineString
     buffer: z.coerce.number().positive().max(10000)
   });
   ```

3. **Create API endpoint**:
   ```typescript
   app.post('/events/near-route', async (req, res) => {
     const validation = RouteSearchSchema.safeParse(req.body);
     if (!validation.success) {
       return res.status(400).json(validation.error.flatten());
     }
     // Implementation
   });
   ```

4. **Write tests**:
   ```typescript
   describe('Route proximity search', () => {
     test('should find events within buffer distance of route', async () => {
       // Property-based test implementation
     });
   });
   ```

### Adding a New Strapi Content Type

1. **Create schema** in `cms/src/api/{name}/content-types/{name}/schema.json`
2. **Add validation hooks** in `lifecycles.ts`
3. **Create custom controllers** if needed
4. **Update server proxy** if the content type needs mobile app access
5. **Add TypeScript interfaces** for the mobile app

## Getting Help

- **Architecture Questions**: Review existing patterns in similar components
- **PostGIS Issues**: Check the spatial query examples in `docs/copilot-prompts.md`
- **Strapi Configuration**: Refer to existing content types in `cms/src/api/`
- **Mobile Development**: Follow Expo Router patterns in `app/`

## Code Style

- **TypeScript**: Strict mode enabled, prefer interfaces over types
- **Formatting**: Use Prettier with project configuration
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Imports**: Group external libraries, then internal modules
- **Comments**: Focus on "why" rather than "what", especially for spatial operations

---

For more specific development patterns and Copilot prompts, see [`docs/copilot-prompts.md`](./docs/copilot-prompts.md).