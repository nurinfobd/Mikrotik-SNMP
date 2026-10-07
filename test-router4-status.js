import snmp from 'net-snmp';

const session = snmp.createSession("138.252.15.103", "team@snmp", { version: snmp.Version2c });
const index = 14;

const rxOid = `1.3.6.1.2.1.31.1.1.1.6.${index}`;
const txOid = `1.3.6.1.2.1.31.1.1.1.10.${index}`;
const statusOid = `1.3.6.1.2.1.2.2.1.8.${index}`;

session.get([rxOid, txOid, statusOid], (err, varbinds) => {
  if (err) console.error("GET Error:", err);
  else {
     varbinds.forEach(vb => {
        if (snmp.isVarbindError(vb)) console.error(snmp.varbindError(vb));
        else console.log(vb.oid + " = " + vb.value);
     });
  }
  session.close();
});
