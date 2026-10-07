import pool from './server/db.js';
import snmp from 'net-snmp';

async function testWalk() {
  const [rows] = await pool.query('SELECT * FROM routers LIMIT 1');
  if (rows.length === 0) return console.log('No routers');
  
  const router = rows[0];
  console.log('Testing router:', router.ip, router.snmp_comm, router.snmp_version);
  
  const version = router.snmp_version === 'v1' ? snmp.Version1 : snmp.Version2c;
  const session = snmp.createSession(router.ip, router.snmp_comm, { version, timeouts: [2000, 2000] });
  
  const results = [];
  
  // Test exactly what the server uses now
  session.subtree("1.3.6.1.2.1.2.2.1.2", 1, (varbinds) => {
    for (let i = 0; i < varbinds.length; i++) {
      if (!snmp.isVarbindError(varbinds[i])) {
        results.push(varbinds[i].value.toString());
      }
    }
  }, (error) => {
    if (error) console.error('Walk error:', error.message);
    console.log('Total ifDescr found with maxRepetitions=1:', results.length);
    console.log('Results:', results);
    session.close();
    process.exit(0);
  });
}

testWalk().catch(console.error);
