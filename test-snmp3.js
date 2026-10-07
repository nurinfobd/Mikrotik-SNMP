import pool from './server/db.js';
import snmp from 'net-snmp';

async function testWalk() {
  const [rows] = await pool.query('SELECT * FROM routers LIMIT 1');
  if (rows.length === 0) return console.log('No routers');
  
  const router = rows[0];
  console.log('Testing router:', router.ip, router.snmp_comm, router.snmp_version);
  
  const version = router.snmp_version === 'v1' ? snmp.Version1 : snmp.Version2c;
  const session = snmp.createSession(router.ip, router.snmp_comm, { version, timeouts: [2000, 2000] });
  
  session.subtree("1.3.6.1.2.1.2.2.1.2", 1, (varbinds) => {
    const oid = varbinds[0].oid;
    console.log(typeof oid, Array.isArray(oid), oid);
    session.close();
    process.exit(0);
  }, (error) => {
    
  });
}

testWalk().catch(console.error);
