# Strapi Plugin Testing Suite

This directory contains comprehensive unit and integration tests for the Strapi plugins: `push`, `geolocation`, and `geofence`.

## Overview

The testing suite uses Jest and fast-check for property-based testing to ensure robust validation of plugin functionality. Each test references specific feature specification IDs as requested.

## Test Structure

### Test Files

- `__tests__/plugins/basic-tests.test.ts` - Core functionality tests that work reliably
- `__tests__/plugins/push/push.test.ts` - Comprehensive push plugin tests
- `__tests__/plugins/geolocation/geolocation.test.ts` - Geolocation plugin tests  
- `__tests__/plugins/geofence/geofence.test.ts` - Geofence plugin tests

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx jest __tests__/plugins/basic-tests.test.ts

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Feature Specification Mapping

### Push Plugin Tests

#### Registration & Token Management
- **PUSH-REG-001**: User device registration validation
- **PUSH-HASH-001**: Token hashing consistency and uniqueness
- **PUSH-ENC-001**: Token encryption with random IV
- **PUSH-ENC-002**: Token decryption correctness
- **PUSH-VAL-001**: Registration object validation

#### Messaging & Hub Operations
- **PUSH-SEND-001**: Single device message delivery
- **PUSH-SEND-002**: Multi-device user messaging with failure handling
- **PUSH-HUB-001**: Hub-based message broadcasting

### Geolocation Plugin Tests

#### Data Ingestion & Management
- **GEO-ING-001**: Location data ingestion with validation
- **GEO-ING-002**: Idempotency checking for duplicate prevention
- **GEO-PRU-001**: Data pruning with configurable retention periods
- **GEO-QUE-001**: User location queries with pagination
- **GEO-VAL-001**: Location coordinate validation

#### Hub Operations
- **GEO-HUB-001**: Hub creation and administration
- **GEO-HUB-002**: User hub membership management
- **GEO-HUB-003**: Hub membership removal
- **GEO-HUB-004**: Hub user listing

### Geofence Plugin Tests

#### Zone Management
- **GEO-ZONE-001**: Geofence zone creation with validation
- **GEO-ZONE-002**: Zone updates and modifications
- **GEO-ZONE-003**: Zone deletion with cleanup
- **GEO-VAL-002**: Zone parameter validation

#### Event Processing
- **GEO-CHECK-001**: Real-time geofence boundary checking
- **GEO-EVENT-001**: Geofence event creation (enter/exit)
- **GEO-CALC-001**: Distance calculation accuracy

#### Notification System
- **GEO-NOTIF-001**: Notification queue processing
- **GEO-SUPP-001**: Notification suppression mechanism
- **GEO-SUPP-002**: Suppression status checking

#### Batch & Cron Operations
- **GEO-BATCH-001**: Batch event processing with error handling
- **GEO-CRON-001**: Scheduled task execution (cleanup, queue processing)

## Test Types

### Unit Tests
- Individual function validation
- Input/output verification
- Error handling
- Edge case coverage

### Integration Tests
- End-to-end workflow testing
- Cross-plugin functionality
- Database interaction simulation
- Performance testing

### Property-Based Tests
- Uses fast-check for generating test cases
- Validates invariants across input ranges
- Ensures robust handling of edge cases
- Tests mathematical properties (distance calculation, hash uniqueness)

## Mock Strategy

### Strapi Instance Mocking
```typescript
const mockStrapi = {
  db: { query: jest.fn() },
  config: { get: jest.fn() },
  log: { info: jest.fn(), error: jest.fn() },
  plugin: jest.fn()
};
```

### Database Operations
- All database queries are mocked
- Simulates success/failure scenarios
- Tests transaction handling
- Validates query parameters

## Test Configuration

### Jest Setup
- TypeScript support via ts-jest
- Custom setup file for Strapi globals
- 10-second timeout for complex tests
- Coverage reporting enabled

### Coverage Targets
- Unit tests: >90% line coverage
- Integration tests: Critical path coverage
- Error scenarios: Exception handling verification

## Performance Considerations

### Scalability Tests
- Concurrent operation handling
- Large dataset processing
- Memory usage validation
- Response time verification

### Load Testing
- Multiple users simulation
- High-frequency operations
- Batch processing efficiency
- Resource cleanup verification

## Error Handling

### Resilience Testing
- Database connection failures
- Partial system failures
- Network timeout simulation
- Resource exhaustion scenarios

### Recovery Testing
- Graceful degradation
- Error logging verification
- Rollback mechanism testing
- Data consistency checks

## Dependencies

### Test Dependencies
- `jest`: Test framework
- `@types/jest`: TypeScript definitions
- `ts-jest`: TypeScript preprocessing
- `fast-check`: Property-based testing

### Plugin Dependencies
- `crypto`: Hashing and encryption
- `@strapi/strapi`: Core Strapi types

## Best Practices

### Test Organization
- Group tests by feature area
- Use descriptive test names with spec IDs
- Maintain consistent mock patterns
- Separate unit and integration tests

### Assertion Patterns
- Verify expected behavior first
- Test error conditions separately
- Use appropriate matchers
- Include meaningful error messages

### Maintainability
- Keep tests independent
- Use helper functions for common setups
- Document complex test scenarios
- Regular test review and updates

## Future Enhancements

### Additional Test Areas
- API endpoint testing
- Authentication/authorization
- Rate limiting validation
- Webhook functionality

### Test Infrastructure
- Automated test execution
- Performance benchmarking
- Test result reporting
- Continuous integration setup

## Troubleshooting

### Common Issues
- Mock function setup errors
- TypeScript compilation issues
- Async test handling
- Memory leaks in long-running tests

### Debugging Tips
- Use `--verbose` flag for detailed output
- Enable `--detectOpenHandles` for async issues
- Use `--runInBand` for debugging timing issues
- Check mock function call counts and arguments