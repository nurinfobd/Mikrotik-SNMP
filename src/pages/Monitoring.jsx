import { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { X, Maximize2, Edit2, Activity, ArrowDownRight, ArrowUpRight, Server, Network, EyeOff } from 'lucide-react';

export default function Monitoring() {
  const [selectedGraph, setSelectedGraph] = useState(null);
  const [historicalGraph, setHistoricalGraph] = useState(null);
  const [historicalTab, setHistoricalTab] = useState('daily');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [historicalData, setHistoricalData] = useState([]);
  const [editingMax, setEditingMax] = useState(null);
  const [maxValue, setMaxValue] = useState('');
  const [descriptionValue, setDescriptionValue] = useState('');
  const [interfaces, setInterfaces] = useState([]);
  const [trafficHistory, setTrafficHistory] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRouterFilter, setSelectedRouterFilter] = useState('');
  const [routers, setRouters] = useState([]);

  const fetchInterfaces = () => {
    fetch('http://localhost:3001/api/interfaces')
      .then(res => res.json())
      .then(data => setInterfaces(data));
  };

  const fetchRouters = () => {
    fetch('http://localhost:3001/api/routers')
      .then(res => res.json())
      .then(data => setRouters(data));
  };

  useEffect(() => {
    // Fetch initial interface metadata and routers
    fetchInterfaces();
    fetchRouters();

    // Poll backend for real-time traffic history every 5 seconds
    const fetchTraffic = () => {
      fetch('http://localhost:3001/api/traffic/history')
        .then(res => res.json())
        .then(data => setTrafficHistory(data));
    };

    fetchTraffic();
    const interval = setInterval(fetchTraffic, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (historicalGraph) {
      if (historicalTab === 'custom' && (!appliedStartDate || !appliedEndDate)) return;
      
      const queryParams = historicalTab === 'custom' 
        ? `?period=custom&startDate=${appliedStartDate}&endDate=${appliedEndDate}`
        : `?period=${historicalTab}`;
        
      fetch(`http://localhost:3001/api/interfaces/${historicalGraph.id}/historical${queryParams}`)
        .then(res => res.json())
        .then(data => setHistoricalData(data))
        .catch(err => setHistoricalData([]));
    }
  }, [historicalGraph, historicalTab, appliedStartDate, appliedEndDate]);

  const getPreviewOptions = (isOverloaded) => ({
    chart: { type: 'area', sparkline: { enabled: true }, animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 1000 } } },
    stroke: { curve: 'smooth', width: 2 },
    fill: { opacity: 0.2 },
    colors: [isOverloaded ? '#ef4444' : '#0284c7'],
    tooltip: { fixed: { enabled: false }, x: { show: false }, marker: { show: false } }
  });

  const getFullGraphOptions = (title, categories) => ({
    chart: { type: 'area', background: 'transparent', toolbar: { show: true }, animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 1000 } } },
    theme: { mode: 'light' },
    title: { text: title, style: { fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' } },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1, stops: [0, 90, 100] } },
    colors: ['#0284c7', '#f59e0b'], // RX: Blue, TX: Amber
    dataLabels: { enabled: false },
    xaxis: { 
      categories: categories, 
      labels: { style: { colors: 'var(--text-secondary)' } },
      tickAmount: 6
    },
    yaxis: { 
      title: { text: 'Traffic (Mbps)', style: { color: 'var(--text-secondary)' } }, 
      labels: { style: { colors: 'var(--text-secondary)' }, formatter: (val) => val.toFixed(1) },
      min: 0
    },
    grid: { borderColor: 'var(--border-color)', strokeDashArray: 4 },
    legend: { labels: { colors: 'var(--text-primary)' } }
  });

  const renderPremiumStats = (maxT, dataArray) => {
    const hasData = dataArray.length > 0;
    const rxVals = dataArray.map(d => Number(d.rx));
    const txVals = dataArray.map(d => Number(d.tx));
    
    const rxMin = hasData ? Math.min(...rxVals).toFixed(2) : '0.00';
    const rxAvg = hasData ? (rxVals.reduce((a, b) => a + b, 0) / rxVals.length).toFixed(2) : '0.00';
    const rxMax = hasData ? Math.max(...rxVals).toFixed(2) : '0.00';
    
    const txMin = hasData ? Math.min(...txVals).toFixed(2) : '0.00';
    const txAvg = hasData ? (txVals.reduce((a, b) => a + b, 0) / txVals.length).toFixed(2) : '0.00';
    const txMax = hasData ? Math.max(...txVals).toFixed(2) : '0.00';

    const StatItem = ({ label, value, color }) => (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>
          {value} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Mbps</span>
        </div>
      </div>
    );

    return (
      <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: '#f1f5f9', padding: '6px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)' }}>
            <Activity size={14} /> Link Capacity: {maxT || 1000} Mbps
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ background: 'rgba(2, 132, 199, 0.05)', border: '1px solid rgba(2, 132, 199, 0.15)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
              <ArrowDownRight size={16} /> Download Statistics (RX)
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <StatItem label="Minimum" value={rxMin} color="#0284c7" />
              <StatItem label="Average" value={rxAvg} color="#0284c7" />
              <StatItem label="Maximum" value={rxMax} color="#0284c7" />
            </div>
          </div>
          
          <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
              <ArrowUpRight size={16} /> Upload Statistics (TX)
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <StatItem label="Minimum" value={txMin} color="#f59e0b" />
              <StatItem label="Average" value={txAvg} color="#f59e0b" />
              <StatItem label="Maximum" value={txMax} color="#f59e0b" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getHistoricalGraphOptions = (title, categories) => {
    return {
      chart: { type: 'area', background: 'transparent', toolbar: { show: true } },
      theme: { mode: 'light' },
      title: { text: title, style: { fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' } },
      stroke: { curve: 'smooth', width: 2 },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1, stops: [0, 90, 100] } },
      colors: ['#0284c7', '#f59e0b'],
      dataLabels: { enabled: false },
      markers: { size: 4, strokeWidth: 2, hover: { size: 6 } },
      xaxis: { categories: categories, labels: { style: { colors: 'var(--text-secondary)' } }, tickAmount: Math.min(10, categories.length) },
      yaxis: { title: { text: 'Traffic (Mbps)', style: { color: 'var(--text-secondary)' } }, labels: { style: { colors: 'var(--text-secondary)' }, formatter: val => val.toFixed(1) }, min: 0 },
      grid: { borderColor: 'var(--border-color)', strokeDashArray: 4 }
    };
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    if (!editingMax) return;
    
    try {
      await fetch(`http://localhost:3001/api/interfaces/${editingMax.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_traffic: maxValue || null, description: descriptionValue || null })
      });
      setEditingMax(null);
      fetchInterfaces();
    } catch (err) {
      alert('Error saving settings');
    }
  };

  const removeInterface = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this interface from Monitoring?')) return;
    
    try {
      await fetch(`http://localhost:3001/api/interfaces/${id}/unmonitor`, { method: 'POST' });
      fetchInterfaces();
    } catch (err) {
      alert('Error removing interface');
    }
  };

  const filteredInterfaces = interfaces.filter(iface => {
    const matchesSearch = iface.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (iface.description && iface.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRouter = selectedRouterFilter === '' || iface.router_id.toString() === selectedRouterFilter.toString();
    return matchesSearch && matchesRouter;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Live Monitoring</h2>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-secondary)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <input
              type="text"
              className="form-input"
              placeholder="Search interfaces..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ minWidth: '280px', paddingLeft: '40px' }}
            />
          </div>
          <select
            className="form-input"
            value={selectedRouterFilter}
            onChange={(e) => setSelectedRouterFilter(e.target.value)}
            style={{ minWidth: '220px', cursor: 'pointer' }}
          >
            <option value="">All Routers</option>
            {routers.map(r => (
              <option key={r.id} value={r.id}>{r.identity}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-3">
        {filteredInterfaces.map(iface => {
          const key = `${iface.router_id}_${iface.name}`;
          const history = trafficHistory[key] || [];
          const lastPoint = history.length > 0 ? history[history.length - 1] : { rx: 0, tx: 0 };
          const rxData = history.map(h => h.rx.toFixed(2));
          const maxT = iface.max_traffic || 1000;
          
          const rxPercent = (lastPoint.rx / maxT) * 100;
          const txPercent = (lastPoint.tx / maxT) * 100;
          const rxOverloaded = rxPercent > 100;
          const txOverloaded = txPercent > 100;
          const isOverloaded = rxOverloaded || txOverloaded;

          return (
            <div key={iface.id} className="card" style={{ cursor: 'pointer', position: 'relative' }} onClick={() => setSelectedGraph({ ...iface, history })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    <Network size={18} style={{ color: 'var(--accent-primary)' }} />
                    {iface.name}
                  </div>
                  {iface.description && (
                    <div style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                      {iface.description}
                    </div>
                  )}
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                    <Server size={14} />
                    {iface.router_name}
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#f1f5f9', borderRadius: '12px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                      Cap: {maxT}M
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px', background: '#f8fafc', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <button className="btn" style={{ padding: '4px', background: 'transparent', color: 'var(--text-secondary)' }} onClick={(e) => { e.stopPropagation(); setHistoricalGraph(iface); }} title="Historical Data"><Activity size={16} /></button>
                  <button className="btn" style={{ padding: '4px', background: 'transparent', color: 'var(--text-secondary)' }} onClick={(e) => { e.stopPropagation(); setMaxValue(iface.max_traffic || ''); setDescriptionValue(iface.description || ''); setEditingMax(iface); }} title="Edit Settings"><Edit2 size={16} /></button>
                  <button className="btn" style={{ padding: '4px', background: 'transparent', color: 'var(--text-secondary)' }} onClick={(e) => { e.stopPropagation(); setSelectedGraph({ ...iface, history }); }} title="Live View"><Maximize2 size={16} /></button>
                  <button className="btn" style={{ padding: '4px', background: 'transparent', color: '#ef4444' }} onClick={(e) => removeInterface(e, iface.id)} title="Remove from Monitoring"><EyeOff size={16} /></button>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                <div style={{ flex: 1, background: 'rgba(2, 132, 199, 0.05)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(2, 132, 199, 0.1)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: 600 }}>
                    <ArrowDownRight size={14} color="#0284c7" /> RX / Download
                  </div>
                  <div style={{ color: rxOverloaded ? '#ef4444' : '#0284c7', fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    {lastPoint.rx.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Mbps</span>
                    <span style={{ fontSize: '0.75rem', marginLeft: 'auto', opacity: 0.8, fontWeight: 600 }}>{rxPercent.toFixed(1)}%</span>
                  </div>
                </div>
                <div style={{ flex: 1, background: 'rgba(245, 158, 11, 0.05)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: 600 }}>
                    <ArrowUpRight size={14} color="#f59e0b" /> TX / Upload
                  </div>
                  <div style={{ color: txOverloaded ? '#ef4444' : '#f59e0b', fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    {lastPoint.tx.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Mbps</span>
                    <span style={{ fontSize: '0.75rem', marginLeft: 'auto', opacity: 0.8, fontWeight: 600 }}>{txPercent.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              
              <div className={isOverloaded ? "blink-slow" : ""}>
                <ReactApexChart options={getPreviewOptions(isOverloaded)} series={[{ name: 'RX Traffic', data: rxData }]} type="area" height={80} />
              </div>
            </div>
          );
        })}
        {interfaces.length === 0 && (
          <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>No interfaces are currently being monitored. Add some from the Routers page!</div>
        )}
      </div>

      {selectedGraph && (() => {
        const key = `${selectedGraph.router_id}_${selectedGraph.name}`;
        const history = trafficHistory[key] || [];
        const timeCategories = history.map(h => new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        const rxData = history.map(h => h.rx.toFixed(2));
        const txData = history.map(h => h.tx.toFixed(2));

        return (
          <div className="modal-overlay" onClick={() => setSelectedGraph(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '1000px', width: '95%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <Maximize2 size={22} color="var(--accent-primary)" />
                  {selectedGraph.router_name} - {selectedGraph.name}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', marginLeft: '8px' }}>Live Traffic</span>
                </div>
                <button className="btn" style={{ padding: '6px', background: 'rgba(0,0,0,0.05)', borderRadius: '50%', color: 'var(--text-secondary)' }} onClick={() => setSelectedGraph(null)}><X size={18} /></button>
              </div>
              
              <ReactApexChart 
                options={getFullGraphOptions(``, timeCategories)} 
                series={[
                  { name: 'RX (Download) Mbps', data: rxData },
                  { name: 'TX (Upload) Mbps', data: txData }
                ]} 
                type="area" 
                height={500} 
              />
              
              {renderPremiumStats(selectedGraph.max_traffic, history)}
            </div>
          </div>
        );
      })()}

      {historicalGraph && (() => {
        let displayData = [...historicalData];
        // ApexCharts needs at least 2 points to draw a line. If we only have 1 (new DB), prepend a zero point.
        if (displayData.length === 1) {
          displayData.unshift({ category: 'Start', rx: 0, tx: 0 });
        } else if (displayData.length === 0) {
          displayData = [{ category: 'Past', rx: 0, tx: 0 }, { category: 'Present', rx: 0, tx: 0 }];
        }
        
        const categories = displayData.map(d => d.category);
        const rxData = displayData.map(d => Number(d.rx).toFixed(2));
        const txData = displayData.map(d => Number(d.tx).toFixed(2));

        return (
          <div className="modal-overlay" onClick={() => setHistoricalGraph(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '1000px', width: '95%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <Activity size={22} color="var(--accent-primary)" />
                  {historicalGraph.router_name} - {historicalGraph.name}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', marginLeft: '8px' }}>Historical Traffic</span>
                </div>
                <button className="btn" style={{ padding: '6px', background: 'rgba(0,0,0,0.05)', borderRadius: '50%', color: 'var(--text-secondary)' }} onClick={() => setHistoricalGraph(null)}><X size={18} /></button>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['daily', 'weekly', 'monthly', '6months', 'custom'].map(tab => (
                    <button 
                      key={tab}
                      className="btn" 
                      style={{ 
                        padding: '6px 16px',
                        borderRadius: '8px',
                        background: historicalTab === tab ? '#ffffff' : 'transparent',
                        boxShadow: historicalTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        color: historicalTab === tab ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontWeight: historicalTab === tab ? 600 : 500,
                        fontSize: '0.85rem',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => setHistoricalTab(tab)}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
                
                {historicalTab === 'custom' && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingRight: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '2px 8px' }}>
                      <input 
                        type="datetime-local" 
                        style={{ border: 'none', background: 'transparent', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none', padding: '4px' }}
                        value={customStartDate}
                        onChange={e => setCustomStartDate(e.target.value)}
                      />
                      <span style={{ color: 'var(--text-secondary)', margin: '0 4px', fontSize: '0.8rem' }}>→</span>
                      <input 
                        type="datetime-local" 
                        style={{ border: 'none', background: 'transparent', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none', padding: '4px' }}
                        value={customEndDate}
                        onChange={e => setCustomEndDate(e.target.value)}
                      />
                    </div>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '0.8rem' }}
                      onClick={() => {
                        if(customStartDate && customEndDate) {
                          setAppliedStartDate(customStartDate);
                          setAppliedEndDate(customEndDate);
                        }
                      }}
                    >
                      Apply Filter
                    </button>
                  </div>
                )}
              </div>

              {historicalData.length > 0 ? (
                <>
                  <ReactApexChart 
                    options={getHistoricalGraphOptions(`${historicalGraph.router_name} - ${historicalGraph.name} Historical (${historicalTab})`, categories)} 
                    series={[
                      { name: 'RX (Download) Mbps', data: rxData },
                      { name: 'TX (Upload) Mbps', data: txData }
                    ]} 
                    type="area" 
                    height={500} 
                  />
                  
                  {renderPremiumStats(historicalGraph.max_traffic, historicalData)}
                </>
              ) : (
                <div style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  Gathering historical data... (Check back in a few minutes)
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {editingMax && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <button className="modal-close" onClick={() => setEditingMax(null)}><X size={24} /></button>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Interface Settings</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.875rem' }}>
              Update settings for <strong>{editingMax.name}</strong>.
            </p>
            
            <form onSubmit={saveSettings}>
              <div className="form-group">
                <label>Description Alias (Optional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Uplink to ISP 1" 
                  value={descriptionValue} 
                  onChange={e => setDescriptionValue(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label>Max Traffic Capacity (Mbps)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="e.g. 1000 for 1Gbps" 
                  value={maxValue} 
                  onChange={e => setMaxValue(e.target.value)} 
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={() => setEditingMax(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Settings</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
