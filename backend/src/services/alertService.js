const pool = require("../config/db");
const dataSourceManager = require("../datasource/manager");
const { extractLatestValue, evaluateCondition } = require("../utils/helpers");

const evaluateAlert = async (alert) => {
  try {
    const panelResult = await pool.query("SELECT * FROM panels WHERE id = $1", [
      alert.panel_id,
    ]);
    if (panelResult.rows.length === 0) return;
    const panel = panelResult.rows[0];

    let datasource = panel.datasource || "prometheus";
    let metric = panel.metric;
    let query = panel.query;

    try {
      const targets =
        typeof panel.targets === "string"
          ? JSON.parse(panel.targets)
          : panel.targets;
      const target = Array.isArray(targets) ? targets[0] : null;
      if (target) {
        datasource = target.datasource || datasource;
        metric = target.metric || metric;
        query = target.query || query;
      }
    } catch (err) {
      console.warn("Cannot parse panel targets for alert", err);
    }

    const result = await dataSourceManager.query({
      datasource,
      metric,
      query,
      from: "now-5m",
      to: "now",
    });

    const latest = extractLatestValue(result);
    const newState = evaluateCondition(latest, alert.conditions);
    const now = new Date();

    if (newState === "alerting") {
      await pool.query(
        "INSERT INTO alert_history (alert_id, state, message, data, triggered_at) VALUES ($1, $2, $3, $4, $5)",
        [
          alert.id,
          newState,
          alert.message || "",
          JSON.stringify({ value: latest }),
          now,
        ]
      );
    }

    if (newState !== alert.state) {
      await pool.query(
        "UPDATE alerts SET state = $1, last_triggered = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
        [
          newState,
          newState === "alerting" ? now : alert.last_triggered,
          alert.id,
        ]
      );
    }
  } catch (err) {
    console.error("Alert evaluate error:", err);
  }
};

const evaluateAllAlerts = async () => {
  try {
    const alerts = await pool.query("SELECT * FROM alerts");
    for (const alert of alerts.rows) {
      await evaluateAlert(alert);
    }
  } catch (err) {
    console.error("Evaluate alerts error:", err);
  }
};

module.exports = {
  evaluateAlert,
  evaluateAllAlerts,
};
