import pool from './server/db.js';

async function alterTable() {
  try {
    await pool.query('ALTER TABLE interfaces ADD COLUMN max_traffic INT DEFAULT NULL');
    console.log('Column max_traffic added successfully.');
  } catch (err) {
    console.error('Error or column already exists:', err.message);
  }
  process.exit(0);
}

alterTable();
