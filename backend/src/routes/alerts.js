const express = require("express");
const authenticateToken = require("../middlewares/auth");
const pool = require("../config/db");

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT a.*, d.title as dashboard_title, p.title as panel_title FROM alerts a JOIN dashboards d ON a.dashboard_id = d.id JOIN panels p ON a.panel_id = p.id ORDER BY a.updated_at DESC"
    );
    res.json({ alerts: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      dashboardId,
      panelId,
      name,
      message,
      frequency,
      conditions,
      notifications,
    } = req.body;
    const dashId = Number(dashboardId);
    const pnlId = Number(panelId);
    if (!dashId || !pnlId) {
      return res
        .status(400)
        .json({ error: "dashboardId and panelId are required" });
    }
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    // verify dashboard/panel exist and match
    const panelCheck = await pool.query(
      "SELECT p.id, p.dashboard_id, p.datasource, p.targets FROM panels p WHERE p.id = $1",
      [pnlId]
    );
    if (panelCheck.rows.length === 0) {
      return res.status(400).json({ error: "Panel not found" });
    }
    if (panelCheck.rows[0].dashboard_id !== dashId) {
      return res
        .status(400)
        .json({ error: "Panel does not belong to dashboard" });
    }
    let alertDatasource = panelCheck.rows[0].datasource || "prometheus";
    let alertQuery = "";
    // try to read from targets if missing
    if ((!alertDatasource || !alertQuery) && panelCheck.rows[0].targets) {
      try {
        const targets =
          typeof panelCheck.rows[0].targets === "string"
            ? JSON.parse(panelCheck.rows[0].targets)
            : panelCheck.rows[0].targets;
        if (Array.isArray(targets) && targets[0]?.datasource) {
          alertDatasource = targets[0].datasource;
        }
        if (Array.isArray(targets) && targets[0]?.query) {
          alertQuery = targets[0].query;
        }
      } catch (e) {
        console.warn("Cannot parse targets for alert datasource");
      }
    }
    if (!alertDatasource) alertDatasource = "prometheus";
    if (!alertQuery) {
      alertQuery = "";
    }

    const result = await pool.query(
      "INSERT INTO alerts (dashboard_id, panel_id, name, message, frequency, datasource, query, comparator, threshold, time_window, eval_interval_seconds, is_enabled, conditions, notifications, state) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *",
      [
        dashId,
        pnlId,
        name,
        message || "",
        frequency || "1m",
        alertDatasource,
        alertQuery || "",
        conditions?.evaluator?.type === "below"
          ? "<"
          : conditions?.evaluator?.type === "above"
          ? ">"
          : conditions?.evaluator?.type === "outside_range"
          ? "outside"
          : "within",
        Array.isArray(conditions?.evaluator?.params)
          ? Number(conditions.evaluator.params[0])
          : Number(conditions?.evaluator?.params) || 0,
        frequency && typeof frequency === "string" ? frequency : "5m",
        conditions?.eval_interval_seconds
          ? Number(conditions.eval_interval_seconds)
          : 60,
        true,
        conditions || {},
        notifications || [],
        "pending",
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Failed to create alert:", err);
    res.status(500).json({ error: err.message || "Failed to create alert" });
  }
});

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { name, message, state, frequency, conditions, notifications } =
      req.body;

    const result = await pool.query(
      "UPDATE alerts SET name = $1, message = $2, state = $3, frequency = $4, conditions = $5, notifications = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *",
      [
        name,
        message,
        state || "pending",
        frequency,
        conditions,
        notifications,
        req.params.id,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update alert" });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    await pool.query("DELETE FROM alerts WHERE id = $1", [req.params.id]);
    res.json({ message: "Alert deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete alert" });
  }
});

// Get alert history
router.get("/:id/history", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM alert_history WHERE alert_id = $1 ORDER BY triggered_at DESC LIMIT 100",
      [req.params.id]
    );
    res.json({ history: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch alert history" });
  }
});

module.exports = router;
