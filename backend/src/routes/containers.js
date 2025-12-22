const express = require("express");
const authenticateToken = require("../middlewares/auth");
const http = require("http");

const router = express.Router();

// Docker socket path
const DOCKER_SOCKET = process.env.DOCKER_SOCKET || "/var/run/docker.sock";

/**
 * List all Docker containers using Docker Engine API
 */
async function listContainers() {
    return new Promise((resolve, reject) => {
        const options = {
            socketPath: DOCKER_SOCKET,
            path: "/containers/json?all=true",
            method: "GET",
        };

        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => {
                data += chunk.toString();
            });
            res.on("end", () => {
                try {
                    const containers = JSON.parse(data);
                    resolve(containers);
                } catch (err) {
                    reject(err);
                }
            });
        });

        req.on("error", (err) => {
            reject(err);
        });

        req.end();
    });
}

/**
 * Get container stats using Docker Engine API
 */
async function getContainerStats(containerId) {
    return new Promise((resolve, reject) => {
        const options = {
            socketPath: DOCKER_SOCKET,
            path: `/containers/${containerId}/stats?stream=false`,
            method: "GET",
        };

        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => {
                data += chunk.toString();
            });
            res.on("end", () => {
                try {
                    const stats = JSON.parse(data);
                    resolve(stats);
                } catch (err) {
                    reject(err);
                }
            });
        });

        req.on("error", (err) => {
            reject(err);
        });

        req.end();
    });
}

/**
 * Calculate CPU percentage from Docker stats
 */
function calculateCpuPercent(stats) {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage -
        (stats.precpu_stats.cpu_usage?.total_usage || 0);
    const systemDelta = stats.cpu_stats.system_cpu_usage -
        (stats.precpu_stats.system_cpu_usage || 0);
    const onlineCpus = stats.cpu_stats.online_cpus || 1;

    if (cpuDelta > 0 && systemDelta > 0) {
        return (cpuDelta / systemDelta) * onlineCpus * 100;
    }
    return 0;
}

/**
 * GET /api/containers - List all Docker containers
 */
router.get("/", authenticateToken, async (req, res) => {
    try {
        const containers = await listContainers();

        // Transform Docker API response to match expected format
        const formattedContainers = containers.map((container) => {
            const state = container.State;
            const status = container.Status || "";

            // Determine health based on state and status
            let health = "unknown";
            if (state === "running") {
                if (status.includes("(healthy)")) health = "healthy";
                else if (status.includes("(unhealthy)")) health = "unhealthy";
                else if (status.includes("(starting)")) health = "starting";
                else health = "running";
            } else if (state === "exited") {
                health = "stopped";
            } else if (state === "restarting") {
                health = "restarting";
            }

            // Parse uptime from status
            let uptime = null;
            const uptimeMatch = status.match(/Up (.+?)(?:\s+\(|$)/);
            if (uptimeMatch) {
                uptime = uptimeMatch[1];
            }

            return {
                id: container.Id.substring(0, 12),
                name: container.Names[0].replace("/", ""),
                status: status,
                state: state,
                health: health,
                image: container.Image,
                created: container.Created,
                uptime: uptime,
                ports: container.Ports || [],
                labels: container.Labels || {}
            };
        });

        res.json({ containers: formattedContainers, total: formattedContainers.length });
    } catch (err) {
        console.error("Error fetching containers:", err);
        res.status(500).json({
            error: "Failed to fetch containers",
            message: err.message
        });
    }
});

/**
 * GET /api/containers/:id/stats - Get container stats
 */
router.get("/:id/stats", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const stats = await getContainerStats(id);

        // Calculate metrics
        const cpuPercent = calculateCpuPercent(stats);
        const memoryUsage = stats.memory_stats.usage || 0;
        const memoryLimit = stats.memory_stats.limit || 0;
        const memoryPercent = memoryLimit > 0
            ? (memoryUsage / memoryLimit) * 100
            : 0;

        // Network stats
        let networkRx = 0;
        let networkTx = 0;
        if (stats.networks) {
            Object.values(stats.networks).forEach((network) => {
                networkRx += network.rx_bytes || 0;
                networkTx += network.tx_bytes || 0;
            });
        }

        res.json({
            cpu_percent: cpuPercent.toFixed(2),
            memory_usage: memoryUsage,
            memory_limit: memoryLimit,
            memory_percent: memoryPercent.toFixed(2),
            network_rx: networkRx,
            network_tx: networkTx,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error("Error fetching container stats:", err);
        res.status(500).json({
            error: "Failed to fetch container stats",
            message: err.message
        });
    }
});

module.exports = router;
