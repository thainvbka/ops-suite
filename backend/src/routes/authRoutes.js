const express = require("express");
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// User registration route
router.post("/register", authController.register);

// User login route
router.post("/login", authController.login);

// User logout route
router.post("/logout", authMiddleware.verifyToken, authController.logout);

// Change password route
router.post(
  "/change-password",
  authMiddleware.verifyToken,
  authController.changePassword
);

module.exports = router;
