# Traffic Polling Engine Implementation Plan

## 1. Backend Updates (`server/index.js`)
- [ ] Initialize an in-memory `trafficHistory` store.
- [ ] Add a polling function `pollTraffic()` that runs every 5-10 seconds using `setInterval`.
- [ ] In the polling loop:
  - Fetch all active routers and their monitored interfaces from the database.
  - Dynamically cache the SNMP Index for each interface name (by performing an `ifDescr` walk once per router if the cache is empty).
  - Use `session.get` to fetch the specific `ifHCInOctets` (1.3.6.1.2.1.31.1.1.1.6) and `ifHCOutOctets` (1.3.6.1.2.1.31.1.1.1.10) for those precise indexes.
  - Compute the Delta: `(Current Bytes - Previous Bytes) * 8 / TimeElapsed` to get the live bps.
  - Store the computed RX and TX bps into the `trafficHistory` array (maintaining a maximum of 60 data points for 1 minute).
- [ ] Expose an endpoint `GET /api/traffic/history` that returns the 1-minute historical buffer for the dashboard thumbnail graphs.
- [ ] Expose a lightweight endpoint `GET /api/traffic/live/:routerId/:ifaceName` that the frontend modal can hit every 1 second for instant realtime metrics.

## 2. Frontend Updates (`Monitoring.jsx`)
- [ ] **Thumbnails**: Update the dashboard to query `/api/traffic/history` on load, mapping the real RX/TX points to the `ApexCharts` series instead of random Math.random() data.
- [ ] **Modal Expansion**: When an interface card is clicked, open a detailed modal graph.
- [ ] **Live Per-Second Polling**: Inside the modal component, implement a `useEffect` with a `setInterval(fetchLiveTraffic, 1000)` that pings the live API endpoint and dynamically updates the expanded chart's state, giving the user a true per-second realtime view!
