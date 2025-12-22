const express = require("express");
const authenticateToken = require("../middlewares/auth");
const { logBuffer, MAX_LOGS } = require("../utils/logger");
const { execSync } = require("child_process");

const router = express.Router();

// Backend system logs (last 200 console entries)
router.get("/", authenticateToken, (req, res) => {
  res.json({ logs: logBuffer.slice(-MAX_LOGS).reverse() });
});

/**
 * Get Juice Shop container logs with filtering
 */
router.get("/juice-shop", authenticateToken, async (req, res) => {
  try {
    const lines = req.query.lines || 100;
    const filter = req.query.filter || "all"; // all, access, info, error

    // Get docker logs from juice-shop container
    const logs = execSync(`docker logs juice-shop --tail ${lines} 2>&1`, {
      encoding: "utf-8",
      maxBuffer: 5 * 1024 * 1024 // 5MB buffer
    });

    // Parse logs into structured format
    const logLines = logs.split("\n").filter(line => line.trim());
    let parsedLogs = logLines.map((line, idx) => {
      // Extract timestamp if present
      const timestampMatch = line.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);

      // Detect log level
      let level = "info";
      if (line.match(/\b(error|ERROR|Error)\b/)) level = "error";
      else if (line.match(/\b(warn|WARNING|Warning)\b/)) level = "warn";
      else if (line.match(/\b(debug|DEBUG|Debug)\b/)) level = "debug";

      // Detect HTTP requests (common patterns: GET, POST, status codes, etc.)
      const isHttpRequest = line.match(/\b(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/) ||
        line.match(/\b(200|201|204|301|302|304|400|401|403|404|500|502|503)\b/) ||
        line.match(/\/(api|rest|socket\.io|ftp|redirect)/i);

      return {
        id: idx,
        timestamp: timestampMatch ? timestampMatch[0] : new Date().toISOString(),
        level: level,
        message: line,
        source: "juice-shop",
        isHttpRequest: isHttpRequest
      };
    });

    // Apply filter
    if (filter === "access") {
      parsedLogs = parsedLogs.filter(log => log.isHttpRequest);
    } else if (filter === "info") {
      parsedLogs = parsedLogs.filter(log => log.level === "info");
    } else if (filter === "error") {
      parsedLogs = parsedLogs.filter(log => log.level === "error");
    }

    res.json({
      logs: parsedLogs.reverse(), // Most recent first
      total: parsedLogs.length,
      filter: filter
    });
  } catch (err) {
    console.error("Error fetching Juice Shop logs:", err);
    res.status(500).json({
      error: "Failed to fetch Juice Shop logs",
      message: err.message
    });
  }
});

/**
 * Get Juice Shop HTTP Access Logs from nginx proxy
 */
router.get("/juice-shop-access", authenticateToken, async (req, res) => {
  try {
    const lines = req.query.lines || 100;

    // Get logs from nginx proxy container
    const logs = execSync(`docker logs juice-shop-proxy --tail ${lines} 2>&1`, {
      encoding: "utf-8",
      maxBuffer: 5 * 1024 * 1024
    });

    // Parse nginx access logs
    const logLines = logs.split("\n").filter(line => line.trim() && !line.includes('nginx'));
    const parsedLogs = logLines.map((line, idx) => {
      // Parse nginx access log format
      // Example: 172.18.0.1 - - [22/Dec/2025:09:40:15 +0000] "GET / HTTP/1.1" 200 1234 "-" "Mozilla/5.0..." 0.005
      const accessMatch = line.match(/^([\d.]+) - (.*?) \[(.*?)\] "(.*?)" (\d+) (\d+) "(.*?)" "(.*?)"(.*)?/);

      if (accessMatch) {
        const [, ip, user, timestamp, request, status, bytes, referer, userAgent, responseTime] = accessMatch;
        const [method, path, protocol] = request.split(' ');

        return {
          id: idx,
          timestamp: new Date().toISOString(), // Use current time as fallback
          level: parseInt(status) >= 400 ? 'error' : 'info',
          message: line,
          source: 'nginx-access',
          ip,
          method,
          path,
          status: parseInt(status),
          bytes: parseInt(bytes),
          userAgent,
          responseTime: responseTime ? parseFloat(responseTime.trim()) : null
        };
      }

      // Fallback for non-matching lines
      return {
        id: idx,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: line,
        source: 'nginx'
      };
    });

    res.json({
      logs: parsedLogs.reverse(),
      total: parsedLogs.length
    });
  } catch (err) {
    console.error("Error fetching nginx access logs:", err);
    res.status(500).json({
      error: "Failed to fetch access logs",
      message: err.message
    });
  }
});

module.exports = router;
