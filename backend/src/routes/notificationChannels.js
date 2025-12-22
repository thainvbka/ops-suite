const express = require("express");
const authenticateToken = require("../middlewares/auth");
const pool = require("../config/db");

const router = express.Router();

// Get all notification channels
router.get("/", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM notification_channels ORDER BY created_at DESC"
        );
        res.json({ channels: result.rows });
    } catch (err) {
        console.error("Error fetching notification channels:", err);
        res.status(500).json({ error: "Failed to fetch notification channels" });
    }
});

// Create notification channel
router.post("/", authenticateToken, async (req, res) => {
    try {
        const { name, type, config, is_enabled = true } = req.body;

        if (!name || !type || !config) {
            return res.status(400).json({ error: "name, type, and config are required" });
        }

        // Validate type
        const validTypes = ["email", "slack", "webhook", "discord"];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                error: `Invalid type. Must be one of: ${validTypes.join(", ")}`
            });
        }

        // Validate config based on type
        if (type === "email" && !config.recipients) {
            return res.status(400).json({ error: "Email config must include recipients" });
        }
        if ((type === "slack" || type === "webhook" || type === "discord") && !config.url) {
            return res.status(400).json({ error: `${type} config must include url` });
        }

        const result = await pool.query(
            `INSERT INTO notification_channels (name, type, config, is_enabled) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
            [name, type, JSON.stringify(config), is_enabled]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Error creating notification channel:", err);
        res.status(500).json({ error: "Failed to create notification channel" });
    }
});

// Update notification channel
router.put("/:id", authenticateToken, async (req, res) => {
    try {
        const { name, type, config, is_enabled } = req.body;

        const result = await pool.query(
            `UPDATE notification_channels 
       SET name = COALESCE($1, name), 
           type = COALESCE($2, type), 
           config = COALESCE($3, config),
           is_enabled = COALESCE($4, is_enabled),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5 RETURNING *`,
            [name, type, config ? JSON.stringify(config) : null, is_enabled, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Notification channel not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error updating notification channel:", err);
        res.status(500).json({ error: "Failed to update notification channel" });
    }
});

// Delete notification channel
router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        await pool.query("DELETE FROM notification_channels WHERE id = $1", [req.params.id]);
        res.json({ message: "Notification channel deleted" });
    } catch (err) {
        console.error("Error deleting notification channel:", err);
        res.status(500).json({ error: "Failed to delete notification channel" });
    }
});

// Test notification channel
router.post("/:id/test", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM notification_channels WHERE id = $1",
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Notification channel not found" });
        }

        const channel = result.rows[0];
        const notificationService = require("../services/notificationService");

        const testPayload = {
            alertName: "Test Alert",
            message: "This is a test notification from Gauge monitoring system",
            state: "firing",
            value: 95.5,
            threshold: 80,
            timestamp: new Date().toISOString()
        };

        await notificationService.sendNotification(channel, testPayload);

        res.json({ message: "Test notification sent successfully" });
    } catch (err) {
        console.error("Error sending test notification:", err);
        res.status(500).json({
            error: err.message || "Failed to send test notification"
        });
    }
});

module.exports = router;
