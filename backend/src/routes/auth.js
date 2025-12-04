const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { JWT_SECRET } = require("../config/env");
const authenticateToken = require("../middleware/auth");
const dataSourceManager = require("../datasources/manager");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (username, email, password_hash, full_name) VALUES ($1, $2, $3, $4) RETURNING id, username, email, full_name, role",
      [username, email, hashedPassword, fullName]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(400).json({ error: "User already exists or invalid data" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    await pool.query(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    await pool.query(
      "INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours')",
      [user.id, token]
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", authenticateToken, async (req, res) => {
  try {
    const token = req.headers["authorization"].split(" ")[1];
    await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ error: "Logout failed" });
  }
});

// Change password
router.post("/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current and new password are required" });
    }
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "New password must be at least 6 characters" });
    }

    const userResult = await pool.query(
      "SELECT id, password_hash FROM users WHERE id = $1",
      [req.user.id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = userResult.rows[0];
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [newHash, user.id]
    );

    // log to datasource log buffer
    try {
      dataSourceManager.pushLog("postgres", `User ${user.id} changed password`);
    } catch (e) {
      // ignore logging failure
    }

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    try {
      dataSourceManager.pushLog(
        "postgres",
        `Change password error: ${err.message}`,
        "error"
      );
    } catch (e) {
      // ignore logging failure
    }
    res.status(500).json({ error: "Failed to change password" });
  }
});

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email, full_name, role FROM users WHERE id = $1",
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to get user info" });
  }
});

module.exports = router;
