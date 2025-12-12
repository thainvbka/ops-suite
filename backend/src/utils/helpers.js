const parseFrequencyToMs = (freq = "1m") => {
  const match = String(freq).match(/(\d+)(s|m|h)/i);
  if (!match) return 60000;
  const val = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const mult = unit === "s" ? 1000 : unit === "m" ? 60000 : 3600000;
  return val * mult;
};

const extractLatestValue = (result) => {
  if (!result) return null;
  if (Array.isArray(result.data)) {
    const arr = result.data;
    if (arr.length === 0) return null;
    const last = arr[arr.length - 1];
    return last?.value ?? null;
  }
  if (Array.isArray(result.series) && result.series.length > 0) {
    const series = result.series[0]?.data || [];
    if (series.length === 0) return null;
    const last = series[series.length - 1];
    return last?.value ?? null;
  }
  return null;
};

const evaluateCondition = (value, condition) => {
  if (value === null || value === undefined) return "no_data";
  const evaluator = condition?.evaluator || {};
  const type = evaluator.type || "above";
  const params = Array.isArray(evaluator.params)
    ? evaluator.params
    : [evaluator.params];

  switch (type) {
    case "above":
      return value > Number(params[0]) ? "alerting" : "ok";
    case "below":
      return value < Number(params[0]) ? "alerting" : "ok";
    case "outside_range": {
      const [min, max] = params;
      return value < Number(min) || value > Number(max) ? "alerting" : "ok";
    }
    case "within_range": {
      const [min, max] = params;
      return value >= Number(min) && value <= Number(max) ? "alerting" : "ok";
    }
    case "no_value":
      return value === null ? "alerting" : "ok";
    default:
      return "ok";
  }
};

function generateUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

module.exports = {
  parseFrequencyToMs,
  extractLatestValue,
  evaluateCondition,
  generateUID,
};
