import pool from './server/db.js';

async function alterTelegramTable() {
  try {
    await pool.query(`
      ALTER TABLE telegram_alerts
      ADD COLUMN alert_usage BOOLEAN DEFAULT FALSE,
      ADD COLUMN alert_usage_threshold INT DEFAULT 90,
      ADD COLUMN alert_interface_down BOOLEAN DEFAULT FALSE,
      ADD COLUMN alert_router_down BOOLEAN DEFAULT FALSE
    `);
    console.log('Columns added successfully.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Columns already exist.');
    } else {
      console.error('Error:', err.message);
    }
  }
  process.exit(0);
}

alterTelegramTable();
