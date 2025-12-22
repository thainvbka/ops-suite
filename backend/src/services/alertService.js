const pool = require("../config/db");
const dataSourceManager = require("../datasource/manager");
const notificationService = require("./notificationService");

/**
 * Extract numeric value from query result
 */
const extractLatestValue = (result) => {
  if (!result) return null;

  // Handle dataSourceManager formats: {type: 'timeseries'|'raw', data: [...]}
  if (result.type && result.data) {
    const data = result.data;

    // timeseries format: [{timestamp, value}, ...]
    if (result.type === 'timeseries' && Array.isArray(data) && data.length > 0) {
      const latest = data[data.length - 1]; // Get latest point
      if (latest && latest.value !== undefined) {
        return parseFloat(latest.value);
      }
    }

    // raw format: [{time, value}, ...] or other formats
    if (Array.isArray(data) && data.length > 0) {
      const latest = data[data.length - 1];
      if (latest && latest.value !== undefined) {
        return parseFloat(latest.value);
      }
      // Try other common field names
      if (latest && latest.val !== undefined) {
        return parseFloat(latest.val);
      }
    }
  }

  // Handle Prometheus response
  if (result.data?.result) {
    const series = result.data.result;
    if (series.length > 0 && series[0].value) {
      return parseFloat(series[0].value[1]);
    }
  }

  // Handle PostgreSQL direct response (legacy)
  if (Array.isArray(result) && result.length > 0) {
    if (result[0].value !== undefined) {
      return parseFloat(result[0].value);
    }
  }

  return null;
};

/**
 * Evaluate condition against value
 */
const evaluateCondition = (value, comparator, threshold, thresholdMax = null) => {
  if (value === null || value === undefined) {
    return false;
  }

  switch (comparator) {
    case '>':
    case 'above':
      return value > threshold;
    case '<':
    case 'below':
      return value < threshold;
    case '>=':
      return value >= threshold;
    case '<=':
      return value <= threshold;
    case '==':
      return value === threshold;
    case '!=':
      return value !== threshold;
    case 'outside_range':
      return value < threshold || value > thresholdMax;
    case 'within_range':
      return value >= threshold && value <= thresholdMax;
    default:
      return false;
  }
};

/**
 * Parse frequency to milliseconds
 */
const parseFrequencyToMs = (frequency) => {
  if (!frequency) return 60000; // default 1m
  const match = frequency.match(/^(\d+)(s|m|h)$/);
  if (!match) return 60000;

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    default: return 60000;
  }
};

/**
 * Parse time window to milliseconds (same as parseFrequencyToMs)
 */
const parseTimeWindow = (timeWindow) => {
  return parseFrequencyToMs(timeWindow);
};

/**
 * Evaluate a single alert
 */
const evaluateAlert = async (alert) => {
  try {
    console.log(`[alert] Evaluating alert: ${alert.name} (ID: ${alert.id})`);

    // Get datasource and query from alert or panel
    let datasource = alert.datasource || 'prometheus';
    let query = alert.query || '';

    // If no query in alert, try to get from panel
    if (!query) {
      const panelResult = await pool.query(
        "SELECT datasource, targets FROM panels WHERE id = $1",
        [alert.panel_id]
      );

      if (panelResult.rows.length > 0) {
        const panel = panelResult.rows[0];
        datasource = panel.datasource || datasource;

        try {
          const targets = typeof panel.targets === 'string'
            ? JSON.parse(panel.targets)
            : panel.targets;

          if (Array.isArray(targets) && targets[0]?.query) {
            query = targets[0].query;
          }
        } catch (err) {
          console.warn("[alert] Cannot parse panel targets:", err);
        }
      }
    }

    if (!query) {
      console.warn(`[alert] No query found for alert ${alert.id}`);
      return;
    }

    // Execute query
    const timeWindow = alert.time_window || '5m';

    const result = await dataSourceManager.query({
      datasource,
      query: query,  // Don't interpolate here, let manager handle it
      from: `now-${timeWindow}`,
      to: 'now'
    });

    console.log(`[alert] Query result for ${alert.name}:`, JSON.stringify(result).substring(0, 200));

    // Extract value
    const value = extractLatestValue(result);
    console.log(`[alert] ${alert.name}: value=${value}, threshold=${alert.threshold}, comparator=${alert.comparator}`);

    if (value === null) {
      console.warn(`[alert] No value returned for alert ${alert.id}`);
      return;
    }

    // Evaluate condition
    const thresholdMax = alert.conditions?.evaluator?.params?.[1] || null;
    const isFiring = evaluateCondition(
      value,
      alert.comparator,
      alert.threshold,
      thresholdMax
    );

    const newState = isFiring ? 'alerting' : 'ok';
    const prevState = alert.state || 'pending';
    const now = new Date();

    // Record history if alerting
    if (isFiring) {
      await pool.query(
        `INSERT INTO alert_history
         (alert_id, state, message, value, threshold, triggered_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [alert.id, newState, alert.message || '', value, alert.threshold, now]
      );
    }

    // Update alert state if changed
    if (newState !== prevState) {
      console.log(`[alert] State change: ${prevState} -> ${newState}`);

      await pool.query(
        `UPDATE alerts 
         SET state = $1, 
             last_triggered = $2,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3`,
        [newState, isFiring ? now : alert.last_triggered, alert.id]
      );

      // Send notifications on state change
      // Parse notifications if it's a string (from JSONB)
      let channelIds = alert.notifications;
      if (typeof channelIds === 'string') {
        try {
          channelIds = JSON.parse(channelIds);
        } catch (e) {
          console.error('[alert] Failed to parse notifications:', e);
          channelIds = [];
        }
      }

      if (Array.isArray(channelIds) && channelIds.length > 0) {
        console.log(`[alert] Sending notifications to ${channelIds.length} channel(s):`, channelIds);

        const payload = {
          alertName: alert.name,
          message: alert.message || `Alert ${newState}`,
          state: newState,
          value: value,
          threshold: alert.threshold,
          timestamp: now.toISOString()
        };

        try {
          await notificationService.sendToChannels(channelIds, payload);
          console.log('[alert] Notifications sent successfully');

          // Update history with notification sent
          await pool.query(
            `UPDATE alert_history 
             SET notification_sent = TRUE, 
                 notification_channels = $1 
             WHERE alert_id = $2 AND triggered_at = $3`,
            [JSON.stringify(channelIds), alert.id, now]
          );
        } catch (err) {
          console.error('[alert] Failed to send notifications:', err);
        }
      } else {
        console.log('[alert] No notification channels configured');
      }
    }
  } catch (err) {
    console.error(`[alert] Error evaluating alert ${alert.id}:`, err);
  }
};

/**
 * Evaluate all enabled alerts
 */
const evaluateAllAlerts = async () => {
  try {
    const result = await pool.query(
      `SELECT * FROM alerts 
       WHERE is_enabled = TRUE 
       ORDER BY id`
    );

    const now = new Date();
    console.log(`[alert] Evaluating ${result.rows.length} enabled alerts`);

    for (const alert of result.rows) {
      // Check if it's time to evaluate based on frequency
      const freqMs = parseFrequencyToMs(alert.frequency || '1m');
      const lastEval = alert.last_evaluated_at
        ? new Date(alert.last_evaluated_at).getTime()
        : 0;

      if (lastEval && now.getTime() - lastEval < freqMs) {
        continue; // Skip, not time yet
      }

      // Evaluate alert
      await evaluateAlert(alert);

      // Update last evaluated time
      await pool.query(
        "UPDATE alerts SET last_evaluated_at = $1 WHERE id = $2",
        [now, alert.id]
      );
    }
  } catch (err) {
    console.error("[alert] Error in evaluateAllAlerts:", err);
  }
};

module.exports = {
  evaluateAlert,
  evaluateAllAlerts
};
