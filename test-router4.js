import snmp from 'net-snmp';

const session = snmp.createSession("138.252.15.103", "team@snmp", { version: snmp.Version2c });

const ifName = "5.VLAN-774_FNA_BAS";
let index = null;

console.log("Fetching interfaces...");
session.subtree("1.3.6.1.2.1.2.2.1.2", 1, (varbinds) => {
  for (let i = 0; i < varbinds.length; i++) {
    if (!snmp.isVarbindError(varbinds[i])) {
      const name = varbinds[i].value.toString();
      const oidString = varbinds[i].oid;
      const idx = oidString.substring(oidString.lastIndexOf('.') + 1);
      if (name === ifName) {
         index = idx;
         console.log("Found index:", index, "for", name);
      }
    }
  }
}, (err) => {
  if (err) console.error("Error:", err);
  if (index) {
     const rxOid = `1.3.6.1.2.1.31.1.1.1.6.${index}`;
     const txOid = `1.3.6.1.2.1.31.1.1.1.10.${index}`;
     console.log("Getting", rxOid, txOid);
     session.get([rxOid, txOid], (err, varbinds) => {
        if (err) console.error("GET Error:", err);
        else {
           varbinds.forEach(vb => {
              if (snmp.isVarbindError(vb)) console.error(snmp.varbindError(vb));
              else console.log(vb.oid + " = " + vb.value.toString('hex') + " (Buffer? " + Buffer.isBuffer(vb.value) + ")");
           });
        }
        session.close();
     });
  } else {
     console.log("Interface not found");
     session.close();
  }
});
