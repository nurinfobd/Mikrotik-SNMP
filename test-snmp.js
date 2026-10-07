import snmp from 'net-snmp';

const session = snmp.createSession("103.120.44.128", "nocteam", { version: snmp.Version2c });

session.get(["1.3.6.1.2.1.1.3.0", "1.3.6.1.2.1.1.1.0"], (err, varbinds) => {
  if (err) {
    console.error("GET Error:", err);
  } else {
    for (let i = 0; i < varbinds.length; i++) {
      if (snmp.isVarbindError(varbinds[i])) {
        console.error(snmp.varbindError(varbinds[i]));
      } else {
        console.log(varbinds[i].oid + " = " + varbinds[i].value);
      }
    }
  }
});

function getSubtree(oid) {
  session.subtree(oid, 20, (varbinds) => {
    for (let i = 0; i < varbinds.length; i++) {
      if (!snmp.isVarbindError(varbinds[i])) {
        console.log("Subtree " + oid + " -> " + varbinds[i].oid + " = " + varbinds[i].value);
      }
    }
  }, (err) => {
    if (err) console.error("Subtree error for", oid, err);
    console.log("Subtree done for", oid);
  });
}

getSubtree("1.3.6.1.2.1.25.3.3.1.2"); // CPU
getSubtree("1.3.6.1.4.1.14988.1.1.3.10"); // Temp
