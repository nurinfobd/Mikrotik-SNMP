import { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { Server, Activity, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const [routers, setRouters] = useState([]);
  const [routerStats, setRouterStats] = useState({});
  const [interfaces, setInterfaces] = useState([]);
  const [trafficHistory, setTrafficHistory] = useState({});

  useEffect(() => {
    fetch('/api/routers').then(res => res.json()).then(setRouters);
    fetch('/api/interfaces').then(res => res.json()).then(setInterfaces);
    
    const pollData = () => {
      fetch('/api/routers/stats').then(res => res.json()).then(setRouterStats);
      fetch('/api/traffic/history').then(res => res.json()).then(setTrafficHistory);
    };
    pollData();
    const interval = setInterval(pollData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getRadialOptions = (color, label) => ({
    chart: { type: 'radialBar', sparkline: { enabled: true } },
    plotOptions: {
      radialBar: {
        hollow: { size: '60%' },
        track: { background: '#f1f5f9' },
        dataLabels: {
          name: { show: true, fontSize: '12px', color: 'var(--text-secondary)', offsetY: -5 },
          value: { show: true, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', offsetY: 5, formatter: (val) => val + (label === 'Temp' ? '°C' : '%') }
        }
      }
    },
    colors: [color],
    labels: [label],
    stroke: { lineCap: 'round' }
  });

  const getOverusedInterfaces = () => {
    const overused = [];
    for (const iface of interfaces) {
      if (!iface.max_traffic) continue;
      const key = `${iface.router_id}_${iface.name}`;
      const history = trafficHistory[key];
      if (history && history.length > 0) {
        const last = history[history.length - 1];
        const rxPct = (last.rx / iface.max_traffic) * 100;
        const txPct = (last.tx / iface.max_traffic) * 100;
        if (rxPct >= 90 || txPct >= 90) { // 90% threshold for "overused"
          overused.push({ ...iface, rx: last.rx, tx: last.tx, rxPct, txPct });
        }
      }
    }
    return overused.sort((a, b) => Math.max(b.rxPct, b.txPct) - Math.max(a.rxPct, a.txPct));
  };

  const overusedIfaces = getOverusedInterfaces();

  return (
    <div>
      <h2 style={{ marginBottom: '24px', fontSize: '1.5rem', fontWeight: 600 }}>System Dashboard</h2>
      
      <div className="grid grid-cols-2" style={{ marginBottom: '32px' }}>
        {routers.map(router => {
          const stats = routerStats[router.id] || { cpu: 0, temp: 0, uptime: 'Loading...', descr: 'Loading...' };
          const ifaceCount = interfaces.filter(i => i.router_id === router.id).length;
          const cpuColor = stats.cpu > 80 ? '#ef4444' : stats.cpu > 50 ? '#f59e0b' : '#10b981';
          const tempColor = stats.temp > 70 ? '#ef4444' : stats.temp > 50 ? '#f59e0b' : '#0284c7';

          return (
            <div key={router.id} className="card" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  <Server size={20} color="var(--accent-primary)" />
                  {router.identity}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px', lineHeight: '1.5' }}>
                  <div><strong>Model:</strong> {stats.descr.split(' ')[1] || stats.descr}</div>
                  <div><strong>Uptime:</strong> {stats.uptime}</div>
                  <div><strong>Monitored Interfaces:</strong> {ifaceCount}</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ width: '120px', height: '120px' }}>
                  <ReactApexChart options={getRadialOptions(cpuColor, 'CPU')} series={[stats.cpu]} type="radialBar" height={140} />
                </div>
                <div style={{ width: '120px', height: '120px' }}>
                  <ReactApexChart options={getRadialOptions(tempColor, 'Temp')} series={[stats.temp]} type="radialBar" height={140} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} color="var(--accent-danger)" />
            Overused Interfaces ( &gt; 90% Capacity )
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Router</th>
                <th>Interface</th>
                <th>Capacity</th>
                <th>RX Traffic</th>
                <th>TX Traffic</th>
              </tr>
            </thead>
            <tbody>
              {overusedIfaces.map(iface => (
                <tr key={`${iface.router_id}_${iface.id}`}>
                  <td style={{ fontWeight: 600 }}>{iface.router_name}</td>
                  <td style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>{iface.name}</td>
                  <td><span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>{iface.max_traffic} Mbps</span></td>
                  <td>
                    <div style={{ color: iface.rxPct > 90 ? '#ef4444' : '#0284c7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ArrowDownRight size={14} /> {iface.rx.toFixed(1)} Mbps ({iface.rxPct.toFixed(1)}%)
                    </div>
                  </td>
                  <td>
                    <div style={{ color: iface.txPct > 90 ? '#ef4444' : '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ArrowUpRight size={14} /> {iface.tx.toFixed(1)} Mbps ({iface.txPct.toFixed(1)}%)
                    </div>
                  </td>
                </tr>
              ))}
              {overusedIfaces.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--accent-success)', fontWeight: 500 }}>
                    ✅ All interfaces are operating within normal capacity.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
