const express = require("express");
const cors = require("cors");
const { PORT } = require("./config/env");
const pool = require("./config/db");
const { setupLogger } = require("./utils/logger");
const { runMigrations } = require("./services/migrationService");
const { evaluateAllAlerts } = require("./services/alertService");

// Routes
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboards");
const alertRoutes = require("./routes/alerts");
const panelRoutes = require("./routes/panels");
const logRoutes = require("./routes/logs");
const datasourceRoutes = require("./routes/datasources");

const app = express();

// Setup Logger
setupLogger();

// Middleware
app.use(cors());
app.use(express.json());

//init data source manager

// Run migrations
runMigrations();

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboards", dashboardRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/panels", panelRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/datasources", datasourceRoutes);

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
