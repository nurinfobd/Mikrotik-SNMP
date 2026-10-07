import mysql from 'mysql2/promise';

async function initDB() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS miksnmp_db`);
    await connection.query(`USE miksnmp_db`);

    // Create routers table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS routers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        identity VARCHAR(255) NOT NULL,
        ip VARCHAR(255) NOT NULL,
        snmp_comm VARCHAR(255) NOT NULL,
        os_version VARCHAR(255) DEFAULT 'v7.0',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create interfaces table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS interfaces (
        id INT AUTO_INCREMENT PRIMARY KEY,
        router_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        is_monitored BOOLEAN DEFAULT true,
        FOREIGN KEY (router_id) REFERENCES routers(id) ON DELETE CASCADE
      )
    `);

    // Create settings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        telegram_enabled BOOLEAN DEFAULT true,
        bot_token VARCHAR(255),
        chat_id VARCHAR(255)
      )
    `);

    // Insert initial settings if empty
    const [rows] = await connection.query(`SELECT * FROM settings`);
    if (rows.length === 0) {
      await connection.query(`
        INSERT INTO settings (telegram_enabled, bot_token, chat_id)
        VALUES (true, '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz', '-1009876543210')
      `);
    }

    // Insert dummy routers if empty
    const [routers] = await connection.query(`SELECT * FROM routers`);
    if (routers.length === 0) {
      await connection.query(`
        INSERT INTO routers (identity, ip, snmp_comm, os_version)
        VALUES 
        ('Core-Router-01', '192.168.1.1', 'public', 'v7.11.2'),
        ('Dist-Switch-01', '192.168.1.2', 'public', 'v6.49.8')
      `);
      
      await connection.query(`
        INSERT INTO interfaces (router_id, name, is_monitored)
        VALUES 
        (1, 'ether1', true),
        (1, 'sfp1', true),
        (2, 'ether24', true)
      `);
    }

    console.log('Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDB();
