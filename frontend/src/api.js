const API_BASE =
  (process.env.REACT_APP_API_URL || "http://localhost:4000").replace(/\/$/, "");

// Unified API prefix for frontend calls
const API_URL = `${API_BASE}/api`;

export { API_URL };
