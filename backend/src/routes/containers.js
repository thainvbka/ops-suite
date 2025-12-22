const express = require("express");
const authenticateToken = require("../middlewares/auth");
const { execSync } = require("child_process");

const router = express.Router();

/**
 * Get all containers status
 */
router.get("/", authenticateToken, async (req, res) => {
    try {
        // Get all containers (running and stopped)
        const psOutput = execSync(
            'docker ps -a --format "{{.ID}}|{{.Names}}|{{.Status}}|{{.State}}|{{.Image}}"',
            { encoding: "utf-8", maxBuffer: 5 * 1024 * 1024 }
        );

        const containers = psOutput
            .trim()
            .split("\n")
            .filter(line => line.trim())
            .map(line => {
                const [id, name, status, state, image] = line.split("|");

                // Parse uptime from status
                const uptimeMatch = status.match(/Up (.+?)(?:\s+\(|$)/);
                const uptime = uptimeMatch ? uptimeMatch[1] : null;

                // Determine health
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

                return {
                    id: id.substring(0, 12),
                    name,
                    status,
                    state,
                    health,
                    image,
                    uptime
                };
            });

        // Get stats for running containers
        try {
            const statsOutput = execSync(
                'docker stats --no-stream --format "{{.Container}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}"',
                { encoding: "utf-8", maxBuffer: 5 * 1024 * 1024, timeout: 5000 }
            );

            const statsMap = {};
            statsOutput
                .trim()
                .split("\n")
                .filter(line => line.trim())
                .forEach(line => {
                    const [containerId, cpu, memUsage, memPerc] = line.split("|");
                    statsMap[containerId.substring(0, 12)] = {
                        cpu: cpu.replace("%", ""),
                        memUsage,
                        memPerc: memPerc.replace("%", "")
                    };
                });

            // Merge stats with container info
            containers.forEach(container => {
                const stats = statsMap[container.id];
                if (stats) {
                    container.cpu = stats.cpu;
                    container.memUsage = stats.memUsage;
                    container.memPerc = stats.memPerc;
                }
            });
        } catch (statsErr) {
            console.warn("Failed to get container stats:", statsErr.message);
        }

        res.json({ containers, total: containers.length });
    } catch (err) {
        console.error("Error fetching containers:", err);
        res.status(500).json({
            error: "Failed to fetch containers",
            message: err.message
        });
    }
});

module.exports = router;
