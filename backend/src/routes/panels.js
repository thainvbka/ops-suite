const express = require("express");
const authenticateToken = require("../middleware/auth");
const pool = require("../config/db");

const router = express.Router();

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { title, type, position, datasource, targets, options } = req.body;

    const result = await pool.query(
      "UPDATE panels SET title = $1, type = $2, position = $3, datasource = $4, targets = $5, options = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *",
      [
        title,
        type,
        JSON.stringify(position),
        datasource,
        JSON.stringify(targets),
        JSON.stringify(options),
        req.params.id,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update panel" });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    await pool.query("DELETE FROM panels WHERE id = $1", [req.params.id]);
    res.json({ message: "Panel deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete panel" });
  }
});

module.exports = router;
