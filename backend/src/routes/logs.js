const express = require("express");
const authenticateToken = require("../middlewares/auth");
const { logBuffer, MAX_LOGS } = require("../utils/logger");
const http = require("http");

const router = express.Router();

// Docker socket path
const DOCKER_SOCKET = process.env.DOCKER_SOCKET || "/var/run/docker.sock";

/**
 * Get logs from a Docker container using Docker Engine API
 */
async function getContainerLogs(containerName, tailLines = 100) {
  return new Promise((resolve, reject) => {
    const options = {
      socketPath: DOCKER_SOCKET,
      path: `/containers/${containerName}/logs?stdout=true&stderr=true&tail=${tailLines}`,
      method: "GET",
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => {
        chunks.push(chunk);
      });
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const lines = [];
        let offset = 0;

        while (offset < buffer.length) {
          if (offset + 8 > buffer.length) break;

          // Read the size (4 bytes, big-endian, at offset+4)
          const size = buffer.readUInt32BE(offset + 4);

          if (offset + 8 + size > buffer.length) break;

          // Extract the payload
          const line = buffer.slice(offset + 8, offset + 8 + size).toString();
          if (line.trim()) {
            lines.push(line.trim());
          }

          offset += 8 + size;
        }

        resolve(lines);
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.end();
  });
}

// Backend system logs (last 200 console entries)
router.get("/", authenticateToken, (req, res) => {
  res.json({ logs: logBuffer.slice(-MAX_LOGS).reverse() });
});

/**
 * Get Juice Shop container logs with filtering
 */
router.get("/juice-shop", authenticateToken, async (req, res) => {
  try {
    const lines = parseInt(req.query.lines) || 100;
    const filter = req.query.filter || "all"; // all, access, info, error

    // Get logs from Docker API
    const logLines = await getContainerLogs("juice-shop", lines);

    // Parse logs into structured format
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
    const lines = parseInt(req.query.lines) || 100;

    // Get logs from nginx proxy container using Docker API
    const logLines = await getContainerLogs("juice-shop-proxy", lines);

    // Parse nginx access logs
    const parsedLogs = logLines
      .filter(line => line.trim() && !line.includes('nginx'))
      .map((line, idx) => {
        // Parse nginx access log format
        // Example: 172.18.0.1 - - [22/Dec/2025:09:40:15 +0000] "GET / HTTP/1.1" 200 1234 "-" "Mozilla/5.0..." 0.005
        const accessMatch = line.match(/^([\d.]+) - (.*?) \[(.*?)\] "(.*?)" (\d+) (\d+) "(.*?)" "(.*?)"(.*)?/);

        if (accessMatch) {
          const [, ip, user, timestampStr, request, status, bytes, referer, userAgent, responseTime] = accessMatch;
          const [method, path, protocol] = request.split(' ');

          // Parse nginx timestamp format: 22/Dec/2025:09:40:15 +0000
          let parsedTimestamp = new Date().toISOString();
          try {
            const match = timestampStr.match(/(\d+)\/(\w+)\/(\d+):(\d+):(\d+):(\d+) ([+-]\d+)/);
            if (match) {
              const [, day, month, year, hour, minute, second, timezone] = match;
              const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
              const date = new Date(Date.UTC(
                parseInt(year),
                months[month],
                parseInt(day),
                parseInt(hour),
                parseInt(minute),
                parseInt(second)
              ));
              parsedTimestamp = date.toISOString();
            }
          } catch (e) {
            console.warn('Failed to parse nginx timestamp:', timestampStr);
          }

          return {
            id: idx,
            timestamp: parsedTimestamp,
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
