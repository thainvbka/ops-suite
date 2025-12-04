const authService = require("../services/authService");

exports.register = async (req, res) => {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json({ message: "User registered successfully", user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const token = await authService.loginUser(req.body);
    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

exports.logout = (req, res) => {
  // Handle logout logic (e.g., invalidate token)
  res.status(200).json({ message: "Logout successful" });
};

exports.changePassword = async (req, res) => {
  try {
    await authService.changeUserPassword(req.user.id, req.body);
    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
