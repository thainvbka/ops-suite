const express = require("express");
const cors = require("cors");
const { PORT } = require("./config/env");
const pool = require("./config/db");
const { setupLogger } = require("./utils/logger");
const { runMigrations } = require("./services/migrationService");
const { evaluateAllAlerts } = require("./services/alertService");
const dataSourceManager = require("./datasource/manager");

// Routes
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboards");
const alertRoutes = require("./routes/alerts");
const panelRoutes = require("./routes/panels");
const logRoutes = require("./routes/logs");
const datasourceRoutes = require("./routes/datasources");
const metricRoutes = require("./routes/metrics");
const notificationChannelRoutes = require("./routes/notificationChannels");
const containerRoutes = require("./routes/containers");

const app = express();

// Setup Logger
setupLogger();

// Middleware
app.use(cors());
app.use(express.json());

//init data source manager
dataSourceManager.initialize();

// Run migrations
runMigrations();

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboards", dashboardRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/panels", panelRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/datasources", datasourceRoutes);
app.use("/api/notification-channels", notificationChannelRoutes);
app.use("/api/containers", containerRoutes);
app.use("/api", metricRoutes);

//health check endpoint
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
