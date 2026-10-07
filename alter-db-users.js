import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

async function initDB() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'miksnmp_db'
    });

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        requires_password_change BOOLEAN DEFAULT true
      )
    `);

    const [rows] = await connection.query(`SELECT * FROM users WHERE username = 'admin'`);
    if (rows.length === 0) {
      const defaultPasswordHash = await bcrypt.hash('admin', 10);
      await connection.query(`
        INSERT INTO users (username, password_hash, requires_password_change)
        VALUES ('admin', ?, true)
      `, [defaultPasswordHash]);
      console.log('Added default admin user (admin/admin)');
    } else {
      console.log('Admin user already exists');
    }

    console.log('Users table created/verified successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing users table:', error);
    process.exit(1);
  }
}

initDB();
