const express = require("express");
const authenticateToken = require("../middlewares/auth");
const dataSourceManager = require("../datasource/manager");

const router = express.Router();

// Query metrics from any datasource
router.get("/metrics", authenticateToken, async (req, res) => {
  try {
    const result = await dataSourceManager.query(req.query);
    res.json(result);
  } catch (err) {
    console.error("Metrics query error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Execute custom query
router.post("/query", authenticateToken, async (req, res) => {
  try {
    const { datasource, query, metric } = req.body;

    const result = await dataSourceManager.query({
      datasource,
      query,
      metric,
      ...req.body,
    });

    res.json({ result });
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
