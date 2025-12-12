const express = require("express");
const authenticateToken = require("../middleware/auth");
const { logBuffer, MAX_LOGS } = require("../utils/logger");

const router = express.Router();

// Logs (last 200 console entries)
router.get("/", authenticateToken, (req, res) => {
  res.json({ logs: logBuffer.slice(-MAX_LOGS).reverse() });
});

module.exports = router;
