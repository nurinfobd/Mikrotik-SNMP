import pool from './server/db.js';

async function setDefaultMaxTraffic() {
  try {
    await pool.query('ALTER TABLE interfaces MODIFY COLUMN max_traffic INT DEFAULT 1000');
    await pool.query('UPDATE interfaces SET max_traffic = 1000 WHERE max_traffic IS NULL');
    console.log('Default max_traffic set to 1000 successfully.');
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

setDefaultMaxTraffic();
