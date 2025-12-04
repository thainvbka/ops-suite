const express = require("express");
const cors = require("cors");
const { PORT } = require("./config/env");
const pool = require("./config/db");
const { setupLogger } = require("./utils/logger");
const dataSourceManager = require("./datasources/manager");
const { runMigrations } = require("./services/migrationService");
const { evaluateAllAlerts } = require("./services/alertService");

// Routes
const authRoutes = require("./routes/auth");
const datasourceRoutes = require("./routes/datasources");
const metricRoutes = require("./routes/metrics");
const dashboardRoutes = require("./routes/dashboards");
const panelRoutes = require("./routes/panels");
const alertRoutes = require("./routes/alerts");
const logRoutes = require("./routes/logs");

const app = express();

// Initialize Logger
setupLogger();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize data sources
dataSourceManager.initialize().then(() => {
  console.log("Data sources initialized");
});

// Run migrations
runMigrations();

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/datasources", datasourceRoutes);
app.use("/api", metricRoutes); // /api/metrics and /api/query
app.use("/api/dashboards", dashboardRoutes);
app.use("/api/panels", panelRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/logs", logRoutes);

// Health check
app.get("/health", async (req, res) => {
  const connections = await dataSourceManager.testConnections();

  res.json({
    status: "OK",
    message: "Backend is running",
    timestamp: new Date(),
    uptime: process.uptime(),
    database: "connected",
    datasources: connections,
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`
  Server is running!
  Port: ${PORT}
  Health: http://localhost:${PORT}/health
  Auth: Enabled
  Database: PostgreSQL
  Data Sources: Prometheus, PostgreSQL, Mock
  `);
});

// Start alert evaluator loop
setInterval(evaluateAllAlerts, 30000);

// Cleanup on shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  await dataSourceManager.close();
  await pool.end();
  process.exit(0);
});
