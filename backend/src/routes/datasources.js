const express = require("express");
const authenticateToken = require("../middleware/auth");
const dataSourceManager = require("../datasource/manager");

const router = express.Router();

// Get available data sources
router.get("/", authenticateToken, async (req, res) => {
  try {
    const connections = await dataSourceManager.testConnections();

    const datasources = [];

    if (connections.prometheus) {
      datasources.push({
        id: "prometheus",
        name: "Prometheus",
        type: "prometheus",
        status: "connected",
        description: "Time-series metrics database",
      });
    }

    if (connections.postgres) {
      datasources.push({
        id: "postgres",
        name: "PostgreSQL",
        type: "postgres",
        status: "connected",
        description: "Relational metrics database",
      });
    }

    res.json({ datasources });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch datasources" });
  }
});

// Get available metrics for a datasource
router.get("/:id/metrics", authenticateToken, async (req, res) => {
  try {
    const metrics = await dataSourceManager.getAvailableMetrics();
    const datasourceMetrics = metrics[req.params.id] || [];

    res.json({ metrics: datasourceMetrics });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

// Test datasource connection
router.post("/:id/test", authenticateToken, async (req, res) => {
  try {
    const ds = dataSourceManager.getDataSource(req.params.id);
    if (!ds) {
      return res.status(404).json({ error: "Data source not found" });
    }

    const connected = await ds.testConnection();
    res.json({ connected, datasource: req.params.id });
  } catch (err) {
    res.status(500).json({ error: "Test failed", connected: false });
  }
});

// Data source logs
router.get("/:id/logs", authenticateToken, (req, res) => {
  try {
    const logs = dataSourceManager.getLogs(req.params.id);
    if (!logs || logs.length === 0) {
      // add a friendly message if empty
      return res.json({
        logs: [
          {
            level: "info",
            message: "No logs yet for this datasource",
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }
    res.json({ logs: (logs || []).slice().reverse() });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch datasource logs" });
  }
});

router.delete("/:id/logs", authenticateToken, (req, res) => {
  try {
    dataSourceManager.clearLogs(req.params.id);
    res.json({ message: "Logs cleared" });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear logs" });
  }
});

module.exports = router;
