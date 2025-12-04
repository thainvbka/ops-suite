const pool = require("../config/db");

// Ensure required tables/columns exist (lightweight migration for alerts)
async function runMigrations() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        dashboard_id INTEGER REFERENCES dashboards(id) ON DELETE CASCADE,
        panel_id INTEGER REFERENCES panels(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        message TEXT,
        state VARCHAR(50) DEFAULT 'ok',
        frequency VARCHAR(50),
        handler INTEGER DEFAULT 1,
        conditions JSONB,
        notifications JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_triggered TIMESTAMP
      );
    `);

    await pool.query(`
      ALTER TABLE alerts
        ADD COLUMN IF NOT EXISTS dashboard_id INTEGER REFERENCES dashboards(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS panel_id INTEGER REFERENCES panels(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT '' NOT NULL,
        ADD COLUMN IF NOT EXISTS message TEXT,
        ADD COLUMN IF NOT EXISTS state VARCHAR(50) DEFAULT 'ok',
        ADD COLUMN IF NOT EXISTS frequency VARCHAR(50),
        ADD COLUMN IF NOT EXISTS datasource VARCHAR(255),
        ADD COLUMN IF NOT EXISTS query TEXT DEFAULT '',
        ADD COLUMN IF NOT EXISTS conditions JSONB,
        ADD COLUMN IF NOT EXISTS notifications JSONB,
        ADD COLUMN IF NOT EXISTS comparator VARCHAR(10) DEFAULT '>',
        ADD COLUMN IF NOT EXISTS threshold DOUBLE PRECISION DEFAULT 0,
        ADD COLUMN IF NOT EXISTS time_window VARCHAR(20) DEFAULT '5m',
        ADD COLUMN IF NOT EXISTS eval_interval_seconds INTEGER DEFAULT 60,
        ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS last_value DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS last_state VARCHAR(50),
        ADD COLUMN IF NOT EXISTS last_evaluated_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS last_triggered TIMESTAMP;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS alert_history (
        id SERIAL PRIMARY KEY,
        alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
        state VARCHAR(50),
        message TEXT,
        data JSONB,
        triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure query column is nullable with default ''
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'alerts' AND column_name = 'query'
        ) THEN
          BEGIN
            EXECUTE 'ALTER TABLE alerts ALTER COLUMN query DROP NOT NULL';
            EXECUTE 'ALTER TABLE alerts ALTER COLUMN query SET DEFAULT ''''';
          EXCEPTION WHEN others THEN
            -- ignore
            NULL;
          END;
        END IF;
      END $$;
    `);
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'alerts' AND column_name = 'comparator'
        ) THEN
          BEGIN
            EXECUTE 'ALTER TABLE alerts ALTER COLUMN comparator DROP NOT NULL';
            EXECUTE 'ALTER TABLE alerts ALTER COLUMN comparator SET DEFAULT ''>''';
          EXCEPTION WHEN others THEN NULL;
          END;
        END IF;
      END $$;
    `);
  } catch (err) {
    console.error("Migration error:", err);
  }
}

module.exports = {
  runMigrations,
};
