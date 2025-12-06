// Simple in-memory log buffer
const logBuffer = [];
const MAX_LOGS = 200;

function setupLogger() {
  ["log", "warn", "error"].forEach((level) => {
    const original = console[level];
    console[level] = (...args) => {
      const entry = {
        level,
        message: args
          .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
          .join(" "),
        timestamp: new Date().toISOString(),
      };
      logBuffer.push(entry);
      if (logBuffer.length > MAX_LOGS) {
        logBuffer.shift();
      }
      original.apply(console, args);
    };
  });
}

module.exports = {
  logBuffer,
  MAX_LOGS,
  setupLogger,
};
