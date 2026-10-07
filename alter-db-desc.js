import pool from './server/db.js';

async function addDescriptionColumn() {
  try {
    await pool.query('ALTER TABLE interfaces ADD COLUMN description VARCHAR(255) DEFAULT NULL');
    console.log('Column description added successfully.');
  } catch (err) {
    console.error('Error or column already exists:', err.message);
  }
  process.exit(0);
}

addDescriptionColumn();
