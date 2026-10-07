import pool from './server/db.js';

async function run() {
  try {
    console.log('Adding snmp_version and os_version to routers table...');
    
    try {
      await pool.query("ALTER TABLE routers ADD COLUMN snmp_version VARCHAR(10) DEFAULT 'v2c'");
      console.log('Added snmp_version column.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('snmp_version already exists.');
      else throw e;
    }

    try {
      await pool.query("ALTER TABLE routers ADD COLUMN os_version VARCHAR(255) DEFAULT 'v7.0'");
      console.log('Added os_version column.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('os_version already exists.');
      else throw e;
    }

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
