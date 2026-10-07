import pool from './server/db.js';

async function addTelegramTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS telegram_alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        bot_token VARCHAR(255) NOT NULL,
        chat_id VARCHAR(255) NOT NULL,
        router_ids JSON NOT NULL
      )
    `);
    console.log('Table telegram_alerts created successfully.');
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

addTelegramTable();
