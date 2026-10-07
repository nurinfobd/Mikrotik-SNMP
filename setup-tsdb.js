import pool from './server/db.js';

async function setupTSDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS traffic_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        interface_id INT NOT NULL,
        rx_mbps FLOAT NOT NULL,
        tx_mbps FLOAT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_interface_time (interface_id, timestamp),
        FOREIGN KEY (interface_id) REFERENCES interfaces(id) ON DELETE CASCADE
      )
    `);
    console.log('traffic_history table created successfully.');
  } catch (err) {
    console.error('Error creating table:', err.message);
  }
  process.exit(0);
}

setupTSDB();
