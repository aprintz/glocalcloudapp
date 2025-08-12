# Observability and Metrics for Strapi Plugins

This documentation describes the observability features implemented for the Strapi plugins and services, including metrics collection, structured logging, error tracking, and Azure Monitor integration.

## Features Implemented

### 1. Structured Logging

All components now emit structured JSON logs with consistent fields:

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "info",
  "message": "Request completed",
  "requestId": "req_1704110400000_abc123",
  "userId": "user123",
  "specId": "spec456",
  "method": "GET",
  "path": "/api/pages",
  "statusCode": 200,
  "duration": 45
}
```

#### Key Fields:
- `requestId`: Unique identifier for each request
- `userId`: User identifier from headers (`x-user-id` or JWT token)
- `specId`: Specification identifier from headers (`x-spec-id`) or query parameter
- `duration`: Request duration in milliseconds
- `statusCode`: HTTP response status code

### 2. Performance Metrics

The following metrics are collected automatically:

#### HTTP Request Metrics
- `http_requests_total` (counter): Total number of HTTP requests
- `http_request_duration_ms` (histogram): Request duration distribution
- `http_request_errors_total` (counter): Total number of failed requests

#### CMS Operations Metrics
- `cms_requests_total` (counter): Total CMS API requests
- `cms_request_duration_ms` (histogram): CMS request duration
- `cms_cache_hits_total` (counter): Cache hits
- `cms_cache_misses_total` (counter): Cache misses

#### Event Ingestion Metrics
- `event_ingest_total` (counter): Total events ingested
- `event_ingest_duration_ms` (histogram): Event ingestion duration
- `event_ingest_errors_total` (counter): Event ingestion failures

#### Geospatial Query Metrics
- `geo_queries_total` (counter): Total geospatial queries
- `geo_query_duration_ms` (histogram): Query execution time
- `geo_query_results_count` (histogram): Number of results returned

#### Database Metrics
- `db_queries_total` (counter): Total database queries
- `db_query_duration_ms` (histogram): Database query duration
- `db_connection_errors_total` (counter): Database connection errors

#### Notification Metrics (placeholder)
- `notifications_sent_total` (counter): Total notifications sent
- `notification_errors_total` (counter): Notification failures

### 3. Error Tracking

All errors are captured with:
- Unique error IDs for correlation
- Full stack traces (in development)
- Request context (user, endpoint, parameters)
- Error categorization by type

### 4. OpenTelemetry-like Tracing

Simplified distributed tracing for key operations:
- Database queries
- CMS operations
- Event ingestion
- Geospatial queries

Each span includes:
- Trace ID and Span ID
- Operation metadata
- Performance timing
- Error information

## Endpoints

### Metrics Endpoint
`GET /metrics` - Returns metrics in Prometheus format for scraping

Example output:
```
# TYPE http_requests_total counter
http_requests_total 1523

# TYPE http_request_duration_ms histogram
http_request_duration_ms_count 1523
http_request_duration_ms_sum 45230
http_request_duration_ms_min 12
http_request_duration_ms_max 2340
http_request_duration_ms_avg 29.7
```

### Health Check Endpoint
`GET /health/detailed` - Returns detailed health status with observability metrics

Example response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "observability": {
    "logging": true,
    "metrics": true,
    "tracing": true,
    "errorTracking": true
  },
  "metrics": {
    "totalErrors": 5,
    "counters": { "http_requests_total": 1523 },
    "histograms": { "http_request_duration_ms": { "count": 1523, "avg": 29.7 } }
  }
}
```

## Azure Monitor Integration

### Log Analytics Workspace Setup

1. **Create Log Analytics Workspace** in Azure Portal
2. **Configure Log Ingestion** using one of the following methods:

#### Method 1: Application Insights (Recommended)
```javascript
// Add to your application
import { ApplicationInsights } from '@azure/monitor-opentelemetry';

ApplicationInsights.setup()
  .setAutoCollectRequests(true)
  .setAutoCollectPerformance(true)
  .setAutoCollectExceptions(true)
  .start();
```

#### Method 2: Custom Log Collection
Use Azure Log Analytics Data Collector API to send structured logs:

```bash
# Example log ingestion
curl -X POST \
  -H "Authorization: SharedKey <WorkspaceId>:<SharedKey>" \
  -H "Content-Type: application/json" \
  -H "Log-Type: GlocalCloudApp" \
  -H "time-generated-field: timestamp" \
  -d @logs.json \
  "https://<WorkspaceId>.ods.opinsights.azure.com/api/logs?api-version=2016-04-01"
```

### Metrics Collection

#### Option 1: Prometheus Scraping
Configure Azure Monitor to scrape the `/metrics` endpoint:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'glocalcloudapp'
    static_configs:
      - targets: ['your-app-domain.com:4000']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

#### Option 2: Custom Metrics API
Send metrics directly to Azure Monitor:

```javascript
// Example metric submission
const { MetricsAdvisorAdministrationClient } = require("@azure/cognitiveservices-metricsadvisor");

const client = new MetricsAdvisorAdministrationClient(endpoint, credential);
await client.createMetricFeedback({
  metricId: "your-metric-id",
  feedbackType: "anomaly",
  value: metricValue,
  timestamp: new Date()
});
```

### KQL Queries for Analysis

Example queries for Azure Monitor Log Analytics:

#### Request Performance Analysis
```kql
GlocalCloudApp_CL
| where message_s == "Request completed"
| summarize avg(duration_d), max(duration_d), min(duration_d) by path_s
| order by avg_duration_d desc
```

#### Error Rate Analysis
```kql
GlocalCloudApp_CL
| where level_s == "error"
| summarize ErrorCount = count() by bin(timestamp_t, 5m), path_s
| render timechart
```

#### Geospatial Query Performance
```kql
GlocalCloudApp_CL
| where message_s contains "geo query"
| summarize avg(duration_d), count() by bin(timestamp_t, 1h)
| render columnchart
```

#### CMS Cache Hit Ratio
```kql
GlocalCloudApp_CL
| where message_s contains "cache"
| summarize 
    Hits = countif(message_s contains "hit"),
    Misses = countif(message_s contains "miss")
| extend HitRatio = Hits * 100.0 / (Hits + Misses)
```

### Alerting Rules

Configure alerts in Azure Monitor for:

1. **High Error Rate**
   ```kql
   GlocalCloudApp_CL
   | where level_s == "error"
   | summarize ErrorCount = count() by bin(timestamp_t, 5m)
   | where ErrorCount > 10
   ```

2. **High Response Time**
   ```kql
   GlocalCloudApp_CL
   | where message_s == "Request completed"
   | summarize AvgDuration = avg(duration_d) by bin(timestamp_t, 5m)
   | where AvgDuration > 1000
   ```

3. **Database Connection Issues**
   ```kql
   GlocalCloudApp_CL
   | where message_s contains "Database" and level_s == "error"
   | summarize count() by bin(timestamp_t, 5m)
   | where count_ > 0
   ```

### Dashboard Configuration

Create Azure Monitor Workbooks with:

1. **Application Health Overview**
   - Request rate and error rate
   - Response time percentiles
   - Database connection status

2. **Performance Metrics**
   - CMS operation performance
   - Geospatial query performance
   - Cache hit ratios

3. **Error Analysis**
   - Error trends over time
   - Error distribution by endpoint
   - Top error messages

### Environment Variables

Configure the following environment variables for observability:

```bash
# Enable debug logging
STRAPI_DEBUG=1

# Log level (debug, info, warn, error)
LOG_LEVEL=info

# Azure Monitor configuration
AZURE_MONITOR_WORKSPACE_ID=your-workspace-id
AZURE_MONITOR_SHARED_KEY=your-shared-key
AZURE_APPLICATION_INSIGHTS_KEY=your-app-insights-key

# Enable/disable specific observability features
ENABLE_METRICS=true
ENABLE_TRACING=true
ENABLE_STRUCTURED_LOGGING=true
```

## Usage Examples

### Adding Custom Metrics
```javascript
import { metrics } from './observability';

// Increment a counter
metrics.notificationsSent.increment(1, { type: 'email', status: 'success' });

// Record a histogram value
metrics.eventIngestDuration.record(250, { event_type: 'location_update' });
```

### Custom Tracing
```javascript
import { tracer, tracing } from './observability';

// Trace an async operation
const result = await tracing.traceEventIngest('location_update', async () => {
  // Your operation here
  return await processLocationUpdate(data);
});

// Manual span creation
const span = tracer.startSpan('custom_operation');
span.setAttributes({ user_id: '123', operation_type: 'batch_process' });
try {
  // Your operation
  span.setStatus('ok');
} catch (error) {
  span.setStatus('error');
  span.setAttribute('error.message', error.message);
} finally {
  span.end();
}
```

### Custom Logging
```javascript
import { logger } from './observability';

// Set context for current operation
logger.setContext({ userId: '123', specId: 'ABC' });

// Log with additional context
logger.info('Operation completed', { 
  itemsProcessed: 50, 
  duration: 1230 
});

// Clear context when done
logger.clearContext();
```

This observability implementation provides comprehensive monitoring capabilities for your Strapi application while maintaining performance and being easily configurable for Azure Monitor integration.