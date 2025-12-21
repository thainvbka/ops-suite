const express = require("express");
const authenticateToken = require("../middlewares/auth");
const pool = require("../config/db");
const { generateUID } = require("../utils/helpers");

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT d.*, u.username as created_by_username FROM dashboards d LEFT JOIN users u ON d.created_by = u.id ORDER BY d.updated_at DESC"
    );
    res.json({ dashboards: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch dashboards" });
  }
});

router.get("/:uid", authenticateToken, async (req, res) => {
  try {
    const dashResult = await pool.query(
      "SELECT * FROM dashboards WHERE uid = $1",
      [req.params.uid]
    );

    if (dashResult.rows.length === 0) {
      return res.status(404).json({ error: "Dashboard not found" });
    }

    const dashboard = dashResult.rows[0];
    const panelsResult = await pool.query(
      "SELECT * FROM panels WHERE dashboard_id = $1",
      [dashboard.id]
    );

    res.json({
      ...dashboard,
      panels: panelsResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  try {
    const { title, description, tags, data } = req.body;
    const uid = generateUID();

    const result = await pool.query(
      "INSERT INTO dashboards (uid, title, description, tags, created_by, data) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [uid, title, description, tags, req.user.id, data]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create dashboard" });
  }
});

router.put("/:uid", authenticateToken, async (req, res) => {
  try {
    const { title, description, tags, data } = req.body;

    const result = await pool.query(
      "UPDATE dashboards SET title = $1, description = $2, tags = $3, data = $4, updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE uid = $5 RETURNING *",
      [title, description, tags, data, req.params.uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Dashboard not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update dashboard" });
  }
});

router.delete("/:uid", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM dashboards WHERE uid = $1 RETURNING id",
      [req.params.uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Dashboard not found" });
    }

    res.json({ message: "Dashboard deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete dashboard" });
  }
});

// Panels sub-routes

router.get("/:id/panels", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM panels WHERE dashboard_id = $1",
      [req.params.id]
    );
    res.json({ panels: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch panels" });
  }
});

router.post("/:id/panels", authenticateToken, async (req, res) => {
  try {
    const { title, type, position, datasource, targets, options } = req.body;

    const result = await pool.query(
      "INSERT INTO panels (dashboard_id, title, type, position, datasource, targets, options) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [
        req.params.id,
        title,
        type,
        JSON.stringify(position),
        datasource,
        JSON.stringify(targets),
        JSON.stringify(options),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create panel" });
  }
});

module.exports = router;
