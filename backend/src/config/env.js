const PORT = process.env.PORT || 4000;
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

module.exports = {
  PORT,
  JWT_SECRET,
};
