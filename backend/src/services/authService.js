const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const saltRounds = 10;

const hashPassword = async (password) => {
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

const validateUserCredentials = async (email, password) => {
  const user = await User.findByEmail(email);
  if (user && (await comparePassword(password, user.password))) {
    return user;
  }
  throw new Error("Invalid credentials");
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  validateUserCredentials,
};
