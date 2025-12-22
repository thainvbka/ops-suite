export const METRIC_PRESETS = {
  prometheus: [
    {
      id: 'cpu_usage',
      label: 'CPU usage (%) - trung bình 5 phút',
      type: 'graph',
      query: `
100 - (avg by (instance) (
  irate(node_cpu_seconds_total{mode="idle"}[5m])
) * 100)
`.trim()
    },
    {
      id: 'memory_usage',
      label: 'RAM usage (%)',
      type: 'graph',
      query: `
100 * (
  1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)
)
`.trim()
    }
  ],

  postgres: [
    {
      id: 'cpu_usage_pg',
      label: 'CPU usage (PostgreSQL metrics table)',
      type: 'graph',
      query: `
SELECT
  timestamp AS "time",
  value AS "value"
FROM metrics
WHERE metric_name = 'cpu_usage'
  AND timestamp BETWEEN $__from AND $__to
ORDER BY timestamp
`.trim()
    },
    {
      id: 'memory_usage_pg',
      label: 'RAM usage (PostgreSQL metrics table)',
      type: 'graph',
      query: `
SELECT
  timestamp AS "time",
  value AS "value"
FROM metrics
WHERE metric_name = 'memory_usage'
  AND timestamp BETWEEN $__from AND $__to
ORDER BY timestamp
`.trim()
    }
  ],

  juiceShop: [
    {
      id: 'juice_cpu',
      title: 'Juice Shop - CPU Usage',
      label: 'CPU Usage (%) - Docker Stats',
      type: 'graph',
      datasource: 'postgres',
      query: `
SELECT
  timestamp AS "time",
  value AS "value"
FROM metrics
WHERE metric_name = 'cpu_usage'
  AND labels->>'container' = 'juice-shop'
  AND timestamp BETWEEN $__from AND $__to
ORDER BY timestamp
`.trim()
    },
    {
      id: 'juice_memory',
      title: 'Juice Shop - Memory Usage',
      label: 'Memory Usage (bytes) - Docker Stats',
      type: 'graph',
      datasource: 'postgres',
      query: `
SELECT
  timestamp AS "time",
  value AS "value"
FROM metrics
WHERE metric_name = 'memory_usage'
  AND labels->>'container' = 'juice-shop'
  AND timestamp BETWEEN $__from AND $__to
ORDER BY timestamp
`.trim()
    },
    {
      id: 'juice_network',
      title: 'Juice Shop - Network I/O',
      label: 'Network Bytes Transmitted (Docker Stats)',
      type: 'graph',
      datasource: 'postgres',
      query: `
SELECT
  timestamp AS "time",
  value AS "value"
FROM metrics
WHERE metric_name = 'network_tx_bytes'
  AND labels->>'container' = 'juice-shop'
  AND timestamp BETWEEN $__from AND $__to
ORDER BY timestamp
`.trim()
    },
    {
      id: 'juice_http_requests',
      title: 'Juice Shop - HTTP Requests Count',
      label: 'Total HTTP Requests',
      type: 'graph',
      datasource: 'prometheus',
      query: 'http_requests_count{job="juice-shop"}'
    },
    {
      id: 'juice_response_time',
      title: 'Juice Shop - Response Time (p95)',
      label: '95th Percentile Response Time (seconds)',
      type: 'graph',
      datasource: 'prometheus',
      query: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="juice-shop"}[5m]))'
    },
    {
      id: 'juice_heap',
      title: 'Juice Shop - Node.js Heap Size',
      label: 'Heap Memory Used (bytes)',
      type: 'graph',
      datasource: 'prometheus',
      query: 'nodejs_heap_size_used_bytes{job="juice-shop"}'
    }
  ],
};