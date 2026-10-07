import mysql from 'mysql2/promise';

async function alterDB() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'miksnmp_db'
    });

    // Check if name column exists
    const [columns] = await connection.query(`SHOW COLUMNS FROM users LIKE 'name'`);
    if (columns.length === 0) {
      await connection.query(`ALTER TABLE users ADD COLUMN name VARCHAR(255) DEFAULT '' AFTER id`);
      console.log('Added name column to users table');
    } else {
      console.log('name column already exists');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error altering users table:', error);
    process.exit(1);
  }
}

alterDB();
