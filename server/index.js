import express from 'express';
import cors from 'cors';
import pool from './db.js';
import snmp from 'net-snmp';
import authRouter from './auth.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);

// Get all routers
app.get('/api/routers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM routers');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test SNMP connection
app.post('/api/routers/test', (req, res) => {
  const { ip, snmp_comm, snmp_version } = req.body;
  
  const version = snmp_version === 'v1' ? snmp.Version1 : snmp.Version2c;
  const session = snmp.createSession(ip, snmp_comm, { version, timeouts: [1000, 1000] });

  // OID for sysDescr.0
  const oids = ["1.3.6.1.2.1.1.1.0"];

  session.get(oids, (error, varbinds) => {
    if (error) {
      session.close();
      return res.status(400).json({ success: false, message: error.message });
    }

    if (snmp.isVarbindError(varbinds[0])) {
      session.close();
      return res.status(400).json({ success: false, message: snmp.varbindError(varbinds[0]) });
    }

    session.close();
    res.json({ success: true, message: varbinds[0].value.toString() });
  });
});

// Add a router
app.post('/api/routers', async (req, res) => {
  const { identity, ip, snmp_comm, snmp_version, os_version } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO routers (identity, ip, snmp_comm, snmp_version, os_version) VALUES (?, ?, ?, ?, ?)',
      [identity, ip, snmp_comm, snmp_version || 'v2c', os_version || 'v7.0']
    );
    res.json({ id: result.insertId, identity, ip, snmp_comm, snmp_version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a router
app.delete('/api/routers/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM routers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch live interfaces from router via SNMP
app.get('/api/routers/:id/interfaces/sync', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM routers WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Router not found' });
    const router = rows[0];

    const version = router.snmp_version === 'v1' ? snmp.Version1 : snmp.Version2c;
    const session = snmp.createSession(router.ip, router.snmp_comm, { version, timeouts: [1000, 1000] });
    
    const ifData = {};

    session.subtree("1.3.6.1.2.1.2.2.1.2", 1, (varbinds) => {
      for (let i = 0; i < varbinds.length; i++) {
        if (!snmp.isVarbindError(varbinds[i])) {
          const oidString = varbinds[i].oid;
          const index = oidString.substring(oidString.lastIndexOf('.') + 1);
          ifData[index] = { name: varbinds[i].value.toString(), status: 'unknown' };
        }
      }
    }, (error) => {
      if (error) console.error("Walk ifDescr error:", error.message);
      
      session.subtree("1.3.6.1.2.1.2.2.1.8", 1, (varbinds) => {
        for (let i = 0; i < varbinds.length; i++) {
          if (!snmp.isVarbindError(varbinds[i])) {
            const oidString = varbinds[i].oid;
            const index = oidString.substring(oidString.lastIndexOf('.') + 1);
            if (ifData[index]) {
              ifData[index].status = varbinds[i].value === 1 ? 'up' : 'down';
            }
          }
        }
      }, (error2) => {
        session.close();
        if (error2) console.error("Walk ifOperStatus error:", error2.message);
        res.json({ success: true, interfaces: Object.values(ifData) });
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save monitored interfaces for a router
app.post('/api/routers/:id/interfaces', async (req, res) => {
  const routerId = req.params.id;
  const { interfaces } = req.body;
  
  try {
    if (interfaces && interfaces.length > 0) {
      for (const ifaceName of interfaces) {
        const [existing] = await pool.query('SELECT id FROM interfaces WHERE router_id = ? AND name = ?', [routerId, ifaceName]);
        if (existing.length > 0) {
          await pool.query('UPDATE interfaces SET is_monitored = true WHERE id = ?', [existing[0].id]);
        } else {
          await pool.query('INSERT INTO interfaces (router_id, name, is_monitored) VALUES (?, ?, ?)', [routerId, ifaceName, true]);
        }
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get interfaces for monitoring
app.get('/api/interfaces', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.*, r.identity as router_name 
      FROM interfaces i 
      JOIN routers r ON i.router_id = r.id 
      WHERE i.is_monitored = true
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update interface settings (max traffic and description)
app.post('/api/interfaces/:id/update', async (req, res) => {
  try {
    const { max_traffic, description } = req.body;
    await pool.query(
      'UPDATE interfaces SET max_traffic = ?, description = ? WHERE id = ?', 
      [max_traffic || null, description || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove interface from monitoring
app.post('/api/interfaces/:id/unmonitor', async (req, res) => {
  try {
    await pool.query('UPDATE interfaces SET is_monitored = false WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get settings
app.get('/api/settings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM settings LIMIT 1');
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update settings
app.post('/api/settings', async (req, res) => {
  const { telegram_enabled, bot_token, chat_id } = req.body;
  try {
    await pool.query('UPDATE settings SET telegram_enabled = ?, bot_token = ?, chat_id = ?', [telegram_enabled, bot_token, chat_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Telegram Alerts
app.get('/api/telegram-alerts', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM telegram_alerts');
    res.json(rows.map(r => ({ ...r, router_ids: typeof r.router_ids === 'string' ? JSON.parse(r.router_ids) : r.router_ids })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create/Update Telegram Alert
app.post('/api/telegram-alerts', async (req, res) => {
  try {
    const { id, name, bot_token, chat_id, router_ids, alert_usage, alert_usage_threshold, alert_interface_down, alert_router_down } = req.body;
    if (id) {
      await pool.query(
        'UPDATE telegram_alerts SET name = ?, bot_token = ?, chat_id = ?, router_ids = ?, alert_usage = ?, alert_usage_threshold = ?, alert_interface_down = ?, alert_router_down = ? WHERE id = ?',
        [name, bot_token, chat_id, JSON.stringify(router_ids), alert_usage || false, alert_usage_threshold || 90, alert_interface_down || false, alert_router_down || false, id]
      );
      res.json({ success: true });
    } else {
      const [result] = await pool.query(
        'INSERT INTO telegram_alerts (name, bot_token, chat_id, router_ids, alert_usage, alert_usage_threshold, alert_interface_down, alert_router_down) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [name, bot_token, chat_id, JSON.stringify(router_ids), alert_usage || false, alert_usage_threshold || 90, alert_interface_down || false, alert_router_down || false]
      );
      res.json({ success: true, id: result.insertId });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Telegram Alert
app.delete('/api/telegram-alerts/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM telegram_alerts WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/routers/stats', (req, res) => res.json(routerStats));

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Start traffic polling loops
  setInterval(pollTraffic, 5000); // 5 seconds
  setInterval(pollRouterStats, 10000); // 10 seconds
});

// --- Traffic Polling Engine ---
const trafficHistory = {}; // { routerId_ifName: [{ time, rx, tx }] }
const lastCounters = {}; // { routerId_ifName: { rx, tx, timestamp } }
const interfaceIndexCache = {}; // { routerId: { ifName: index } }
const routerStats = {}; // { routerId: { uptime, descr, cpu, temp, cpuHistory, tempHistory } }
const lastAlertSent = {}; // { alertKey: timestamp }
const lastInterfaceStatus = {}; // { routerId_ifName: status_integer }

function getSubtree(session, oid) {
  return new Promise((resolve) => {
    const results = [];
    session.subtree(oid, 20, (varbinds) => {
      for (let i = 0; i < varbinds.length; i++) {
        if (!snmp.isVarbindError(varbinds[i])) results.push(varbinds[i]);
      }
    }, () => resolve(results));
  });
}

function getOid(session, oid) {
  return new Promise((resolve) => {
    session.get([oid], (err, varbinds) => {
      if (err || snmp.isVarbindError(varbinds[0])) resolve(null);
      else resolve(varbinds[0].value);
    });
  });
}

async function pollRouterStats() {
  console.log("Running pollRouterStats...");
  try {
    const [routers] = await pool.query('SELECT * FROM routers');
    console.log("Found routers:", routers.length);
    for (const router of routers) {
      const version = router.snmp_version === 'v1' ? snmp.Version1 : snmp.Version2c;
      const session = snmp.createSession(router.ip, router.snmp_comm, { version, timeouts: [1500, 1500] });
      
      const uptimeRaw = await getOid(session, "1.3.6.1.2.1.1.3.0");
      const descrRaw = await getOid(session, "1.3.6.1.2.1.1.1.0");
      const cpuLoads = await getSubtree(session, "1.3.6.1.2.1.25.3.3.1.2");
      const temps = await getSubtree(session, "1.3.6.1.4.1.14988.1.1.3.10"); 
      
      let cpuAvg = 0;
      if (cpuLoads && cpuLoads.length > 0) {
        let sum = 0;
        cpuLoads.forEach(vb => sum += parseInt(vb.value));
        cpuAvg = Math.round(sum / cpuLoads.length);
      }
      
      let tempC = 0;
      if (temps && temps.length > 0) {
        tempC = parseInt(temps[0].value) / 10;
      }
      
      let uptime = "N/A";
      if (uptimeRaw !== null) {
        const secs = parseInt(uptimeRaw) / 100;
        const d = Math.floor(secs / 86400);
        const h = Math.floor((secs % 86400) / 3600);
        const m = Math.floor((secs % 3600) / 60);
        uptime = `${d}d ${h}h ${m}m`;
      }
      
      let descr = "Unknown Mikrotik";
      if (descrRaw !== null) descr = descrRaw.toString();
      
      const now = Date.now();
      if (!routerStats[router.id]) {
        routerStats[router.id] = { uptime: 'N/A', descr: '', cpu: 0, temp: 0, cpuHistory: [], tempHistory: [] };
      }
      
      const rs = routerStats[router.id];
      rs.uptime = uptime;
      rs.descr = descr;
      rs.cpu = cpuAvg;
      rs.temp = tempC;
      rs.cpuHistory.push({ time: now, val: cpuAvg });
      rs.tempHistory.push({ time: now, val: tempC });
      
      if (rs.cpuHistory.length > 30) rs.cpuHistory.shift();
      if (rs.tempHistory.length > 30) rs.tempHistory.shift();
      
      console.log(`Router ${router.id} stats updated: CPU ${cpuAvg}%, Temp ${tempC}C`);
      session.close();
    }
  } catch(err) {
    console.error("Router Stats Poll Error:", err);
  }
}



// Helper to convert Buffer to BigInt for 64-bit counters
function parseCounter64(buffer) {
  if (Buffer.isBuffer(buffer)) {
    return BigInt('0x' + buffer.toString('hex'));
  }
  return BigInt(buffer);
}

async function buildIndexCache(router) {
  return new Promise((resolve) => {
    const version = router.snmp_version === 'v1' ? snmp.Version1 : snmp.Version2c;
    const session = snmp.createSession(router.ip, router.snmp_comm, { version, timeouts: [2000, 2000] });
    const cache = {};
    session.subtree("1.3.6.1.2.1.2.2.1.2", 1, (varbinds) => {
      for (let i = 0; i < varbinds.length; i++) {
        if (!snmp.isVarbindError(varbinds[i])) {
          const oidString = varbinds[i].oid;
          const index = oidString.substring(oidString.lastIndexOf('.') + 1);
          cache[varbinds[i].value.toString()] = index;
        }
      }
    }, (err) => {
      session.close();
      interfaceIndexCache[router.id] = cache;
      resolve(cache);
    });
  });
}

async function pollTraffic() {
  try {
    const [routers] = await pool.query('SELECT * FROM routers');
    const [interfaces] = await pool.query('SELECT * FROM interfaces WHERE is_monitored = true');
    const [alerts] = await pool.query('SELECT * FROM telegram_alerts');
    
    for (const router of routers) {
      let cache = interfaceIndexCache[router.id];
      if (!cache) {
        cache = await buildIndexCache(router);
      }
      
      const routerInterfaces = interfaces.filter(i => i.router_id === router.id);
      if (routerInterfaces.length === 0) continue;
      
      const version = router.snmp_version === 'v1' ? snmp.Version1 : snmp.Version2c;
      const session = snmp.createSession(router.ip, router.snmp_comm, { version, timeouts: [2000, 2000] });
      
      if (routerInterfaces.length > 0) {
        // Chunk requests by interface to avoid splitting an interface's OIDs across different requests
        // Max 5 interfaces (15 OIDs) per chunk is safe for MTU limits
        const interfaceChunks = [];
        for (let i = 0; i < routerInterfaces.length; i += 5) interfaceChunks.push(routerInterfaces.slice(i, i + 5));
        
        const oidToIfName = {};
        for (const ifaceChunk of interfaceChunks) {
          const chunkOids = [];
          for (const iface of ifaceChunk) {
            const index = cache[iface.name];
            if (index) {
              const rxOid = `1.3.6.1.2.1.31.1.1.1.6.${index}`;
              const txOid = `1.3.6.1.2.1.31.1.1.1.10.${index}`;
              const statusOid = `1.3.6.1.2.1.2.2.1.8.${index}`;
              chunkOids.push(rxOid, txOid, statusOid);
              oidToIfName[rxOid] = { name: iface.name, type: 'rx', routerId: router.id, ifaceId: iface.id };
              oidToIfName[txOid] = { name: iface.name, type: 'tx', routerId: router.id, ifaceId: iface.id };
              oidToIfName[statusOid] = { name: iface.name, type: 'status', routerId: router.id, ifaceId: iface.id };
            }
          }
          
          if (chunkOids.length === 0) continue;
          
          session.get(chunkOids, (err, varbinds) => {
            if (err) return;
            const now = Date.now();
            const currentReading = {};
            
            for (let i = 0; i < varbinds.length; i++) {
              if (snmp.isVarbindError(varbinds[i])) continue;
              
              const oid = varbinds[i].oid;
              const meta = oidToIfName[oid];
              if (!meta) continue;
              
              const key = `${meta.routerId}_${meta.name}`;
              if (!currentReading[key]) currentReading[key] = { rxBytes: null, txBytes: null, status: null, ifaceId: meta.ifaceId };
              
              if (meta.type === 'status') {
                currentReading[key].status = parseInt(varbinds[i].value);
              } else {
                const val = parseCounter64(varbinds[i].value);
                if (meta.type === 'rx') currentReading[key].rxBytes = val;
                if (meta.type === 'tx') currentReading[key].txBytes = val;
              }
            }
            
            for (const key in currentReading) {
              const reading = currentReading[key];
              const iface = routerInterfaces.find(i => i.id === reading.ifaceId);
              
              // Handle Interface Up/Down Alert
              if (reading.status !== null && iface) {
                const currentStatus = reading.status;
                const prevStatus = lastInterfaceStatus[key];
                
                if (prevStatus !== undefined && prevStatus !== currentStatus) {
                  // Status changed! 1 = up, 2 = down
                  const applicableAlerts = alerts.filter(a => {
                    const rIds = typeof a.router_ids === 'string' ? JSON.parse(a.router_ids) : a.router_ids;
                    return rIds.includes(router.id) && (a.alert_interface_down === 1 || a.alert_interface_down === true);
                  });
                  
                  for (const alert of applicableAlerts) {
                    const timeStr = new Date(now).toLocaleString();
                    const stateIcon = currentStatus === 1 ? '✅' : '❌';
                    const stateText = currentStatus === 1 ? 'UP' : 'DOWN';
                    const msg = `${stateIcon} INTERFACE STATUS CHANGED ${stateIcon}\nRouter: ${router.identity}\nInterface: ${iface.name}\nNew State: ${stateText}\nTime: ${timeStr}`;
                    
                    fetch(`https://api.telegram.org/bot${alert.bot_token}/sendMessage`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ chat_id: alert.chat_id, text: msg })
                    }).catch(e => console.error("Telegram up/down send error:", e.message));
                  }
                }
                lastInterfaceStatus[key] = currentStatus;
              }
              if (reading.rxBytes !== null && reading.txBytes !== null) {
                const prev = lastCounters[key];
                if (prev) {
                  const timeDiffSec = (now - prev.timestamp) / 1000;
                  if (timeDiffSec > 0) {
                    // Megabits per second = (Bytes * 8) / 1,000,000 / seconds
                    let rxMbps = Number((reading.rxBytes - prev.rx) * 8n) / 1000000 / timeDiffSec;
                    let txMbps = Number((reading.txBytes - prev.tx) * 8n) / 1000000 / timeDiffSec;
                    
                    // Handle counter wraps / anomalies
                    if (rxMbps < 0) rxMbps = 0;
                    if (txMbps < 0) txMbps = 0;
                    
                    if (!trafficHistory[key]) trafficHistory[key] = [];
                    trafficHistory[key].push({ time: now, rx: rxMbps, tx: txMbps });
                    
                    // Keep last 60 points (~5 mins at 5s interval)
                    if (trafficHistory[key].length > 60) {
                      trafficHistory[key].shift();
                    }
                    
                    // Check Telegram Alerts for Usage
                    const maxMbps = Math.max(rxMbps, txMbps);
                    if (iface && iface.max_traffic > 0) {
                      const usagePercent = (maxMbps / iface.max_traffic) * 100;
                      
                      const applicableAlerts = alerts.filter(a => {
                        const rIds = typeof a.router_ids === 'string' ? JSON.parse(a.router_ids) : a.router_ids;
                        return rIds.includes(router.id) && (a.alert_usage === 1 || a.alert_usage === true);
                      });
                      
                      for (const alert of applicableAlerts) {
                        if (usagePercent > alert.alert_usage_threshold) {
                          const alertKey = `${alert.id}_${router.id}_${iface.name}_usage`;
                          const lastSent = lastAlertSent[alertKey] || 0;
                          if (now - lastSent > 60 * 1000) { // 1 minute debounce
                            const rxPct = (rxMbps / iface.max_traffic) * 100;
                            const txPct = (txMbps / iface.max_traffic) * 100;
                            const timeStr = new Date(now).toLocaleString();
                            const msg = `🚨 HIGH USAGE ALERT 🚨\nRouter: ${router.identity}\nInterface: ${iface.name}\nTime: ${timeStr}\nThreshold: >${alert.alert_usage_threshold}%\nCapacity: ${iface.max_traffic} Mbps\n\n📊 Current Bandwidth:\n🔽 RX: ${rxMbps.toFixed(1)} Mbps (${rxPct.toFixed(1)}%)\n🔼 TX: ${txMbps.toFixed(1)} Mbps (${txPct.toFixed(1)}%)`;
                            fetch(`https://api.telegram.org/bot${alert.bot_token}/sendMessage`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ chat_id: alert.chat_id, text: msg })
                            }).catch(e => console.error("Telegram send error:", e.message));
                            lastAlertSent[alertKey] = now;
                          }
                        }
                      }
                    }
                    
                    // Save to MySQL TSDB
                    pool.query(
                      'INSERT INTO traffic_history (interface_id, rx_mbps, tx_mbps, timestamp) VALUES (?, ?, ?, FROM_UNIXTIME(?))', 
                      [reading.ifaceId, rxMbps, txMbps, Math.floor(now/1000)]
                    ).catch(e => console.error("DB Insert error:", e.message));
                  }
                }
                lastCounters[key] = { rx: reading.rxBytes, tx: reading.txBytes, timestamp: now };
              }
            }
          });
        }
      }
    }
  } catch (err) {
    console.error("Traffic polling error:", err);
  }
}

// Endpoint to get traffic history
app.get('/api/traffic/history', (req, res) => {
  res.json(trafficHistory);
});

// Endpoint to get TSDB aggregated historical data
app.get('/api/interfaces/:id/historical', async (req, res) => {
  const { id } = req.params;
  const { period } = req.query; // daily, weekly, monthly, 6months
  
  let query = '';
  
  try {
    if (period === 'daily') {
      // Last 24 hours grouped by minute
      query = `SELECT DATE_FORMAT(timestamp, '%H:%i') as category, AVG(rx_mbps) as rx, AVG(tx_mbps) as tx 
               FROM traffic_history WHERE interface_id = ? AND timestamp >= NOW() - INTERVAL 1 DAY 
               GROUP BY DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:00') ORDER BY MIN(timestamp) ASC`;
    } else if (period === 'weekly') {
      // Last 7 days grouped by 15-minute (to keep point count reasonable but extremely detailed)
      query = `SELECT DATE_FORMAT(FROM_UNIXTIME(UNIX_TIMESTAMP(timestamp) DIV 900 * 900), '%b %d %H:%i') as category, AVG(rx_mbps) as rx, AVG(tx_mbps) as tx 
               FROM traffic_history WHERE interface_id = ? AND timestamp >= NOW() - INTERVAL 7 DAY 
               GROUP BY UNIX_TIMESTAMP(timestamp) DIV 900 ORDER BY MIN(timestamp) ASC`;
    } else if (period === 'monthly') {
      // Last 30 days grouped by hour
      query = `SELECT DATE_FORMAT(timestamp, '%b %d %H:00') as category, AVG(rx_mbps) as rx, AVG(tx_mbps) as tx 
               FROM traffic_history WHERE interface_id = ? AND timestamp >= NOW() - INTERVAL 30 DAY 
               GROUP BY DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') ORDER BY MIN(timestamp) ASC`;
    } else if (period === '6months') {
      // Last 6 months grouped by day
      query = `SELECT DATE_FORMAT(timestamp, '%b %d, %Y') as category, AVG(rx_mbps) as rx, AVG(tx_mbps) as tx 
               FROM traffic_history WHERE interface_id = ? AND timestamp >= NOW() - INTERVAL 6 MONTH 
               GROUP BY DATE(timestamp) ORDER BY MIN(timestamp) ASC`;
    } else if (period === 'custom') {
      const { startDate, endDate } = req.query;
      // Convert 'YYYY-MM-DDTHH:MM' to 'YYYY-MM-DD HH:MM:SS'
      const startStr = startDate.includes('T') ? startDate.replace('T', ' ') + ':00' : `${startDate} 00:00:00`;
      const endStr = endDate.includes('T') ? endDate.replace('T', ' ') + ':59' : `${endDate} 23:59:59`;
      
      const start = new Date(startStr);
      const end = new Date(endStr);
      const diffHours = (end - start) / (1000 * 60 * 60);

      let groupBy = '';
      let format = '';
      
      if (diffHours <= 24) {
        // Group by minute for ranges up to 24 hours
        groupBy = `DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:00')`;
        format = `'%b %d %H:%i'`;
      } else if (diffHours <= 24 * 7) {
        // Group by hour for ranges up to 7 days
        groupBy = `DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00')`;
        format = `'%b %d %H:00'`;
      } else {
        // Group by day for longer ranges
        groupBy = `DATE(timestamp)`;
        format = `'%b %d'`;
      }
      
      query = `SELECT DATE_FORMAT(timestamp, ${format}) as category, AVG(rx_mbps) as rx, AVG(tx_mbps) as tx 
               FROM traffic_history WHERE interface_id = ? AND timestamp >= ? AND timestamp <= ? 
               GROUP BY ${groupBy} ORDER BY MIN(timestamp) ASC`;
      const [rows] = await pool.query(query, [id, startStr, endStr]);
      return res.json(rows);
    }
    
    if (query) {
      const [rows] = await pool.query(query, [id]);
      res.json(rows);
    } else {
      res.json([]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
