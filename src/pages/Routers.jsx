import { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, RefreshCw, X, CheckCircle, AlertCircle, Activity, Thermometer } from 'lucide-react';
import ReactApexChart from 'react-apexcharts';

export default function Routers() {
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editRouterId, setEditRouterId] = useState(null);
  
  const [selectedRouter, setSelectedRouter] = useState(null);
  const [routers, setRouters] = useState([]);
  
  // Add/Edit Router Form State
  const [formData, setFormData] = useState({ identity: '', ip: '', snmp_version: 'v2c', snmp_comm: 'public' });
  const [testStatus, setTestStatus] = useState(null); // 'testing', 'success', 'error'
  const [testMessage, setTestMessage] = useState('');
  
  const [syncInterfaces, setSyncInterfaces] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedInterfaces, setSelectedInterfaces] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchRouters();
    const fetchStats = () => {
      fetch('/api/routers/stats')
        .then(res => res.json())
        .then(data => setStats(data))
        .catch(err => console.error(err));
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchRouters = async () => {
    const res = await fetch('/api/routers');
    const data = await res.json();
    setRouters(data);
  };

  const deleteRouter = async (id) => {
    if (confirm('Are you sure you want to delete this router?')) {
      await fetch(`/api/routers/${id}`, { method: 'DELETE' });
      fetchRouters();
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    try {
      const res = await fetch('/api/routers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus('success');
        setTestMessage('Connection successful: ' + data.message);
      } else {
        setTestStatus('error');
        setTestMessage(data.message || 'Connection failed');
      }
    } catch (err) {
      setTestStatus('error');
      setTestMessage(err.message);
    }
  };

  const handleSaveRouter = async (e) => {
    e.preventDefault();
    if (testStatus !== 'success') {
      alert('Please test connection successfully before saving!');
      return;
    }
    
    if (isEditMode) {
      await fetch(`/api/routers/${editRouterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    } else {
      await fetch('/api/routers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    }
    
    setIsAddModalOpen(false);
    setIsEditMode(false);
    setEditRouterId(null);
    setFormData({ identity: '', ip: '', snmp_version: 'v2c', snmp_comm: 'public' });
    setTestStatus(null);
    fetchRouters();
  };

  const openEditRouter = (router) => {
    setIsEditMode(true);
    setEditRouterId(router.id);
    setFormData({
      identity: router.identity,
      ip: router.ip,
      snmp_version: router.snmp_version || 'v2c',
      snmp_comm: router.snmp_comm
    });
    setTestStatus(null);
    setTestMessage('');
    setIsAddModalOpen(true);
  };


  const openInterfaceSync = async (router) => {
    setSelectedRouter(router);
    setSelectedInterfaces([]);
    setSyncInterfaces([]);
    setSearchTerm('');
    setCurrentPage(1);
    setIsSyncModalOpen(true);
    setIsSyncing(true);
    
    try {
      const res = await fetch(`/api/routers/${router.id}/interfaces/sync`);
      const data = await res.json();
      if (data.success && data.interfaces) {
        setSyncInterfaces(data.interfaces);
      } else {
        alert(data.message || 'Failed to sync interfaces');
      }
    } catch (err) {
      alert('Error fetching interfaces: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const submitInterfacesForMonitoring = async () => {
    if (!selectedRouter) return;
    try {
      await fetch(`/api/routers/${selectedRouter.id}/interfaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interfaces: selectedInterfaces })
      });
      alert('Interfaces successfully saved for monitoring!');
      setIsSyncModalOpen(false);
    } catch (err) {
      alert('Error saving interfaces: ' + err.message);
    }
  };

  const handleInterfaceToggle = (iface) => {
    setSelectedInterfaces(prev => 
      prev.includes(iface) ? prev.filter(i => i !== iface) : [...prev, iface]
    );
  };

  const filteredInterfaces = syncInterfaces.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const paginatedInterfaces = filteredInterfaces.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const totalPages = Math.ceil(filteredInterfaces.length / rowsPerPage) || 1;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedInterfaces(syncInterfaces.map(i => i.name));
    } else {
      setSelectedInterfaces([]);
    }
  };

  const isAllSelected = syncInterfaces.length > 0 && selectedInterfaces.length === syncInterfaces.length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Mikrotik Routers</h2>
        <button className="btn btn-primary" onClick={() => { setIsEditMode(false); setFormData({ identity: '', ip: '', snmp_version: 'v2c', snmp_comm: 'public' }); setTestStatus(null); setIsAddModalOpen(true); }}><Plus size={18} /> Add Router</button>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Identity</th>
                <th>OS & Model</th>
                <th>Uptime</th>
                <th>CPU Load</th>
                <th>Temperature</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {routers.map(router => {
                const rs = stats[router.id] || {};
                
                // Parse Model and OS
                let model = 'Unknown';
                let osVersion = router.snmp_version || 'v2c';
                if (rs.descr) {
                  // E.g. "RouterOS CCR1009-7G-1C-1S+" or "MikroTik RouterOS 7.12.1"
                  if (rs.descr.includes('RouterOS')) {
                    model = rs.descr.replace('MikroTik', '').replace('RouterOS', '').trim();
                  } else {
                    model = rs.descr.substring(0, 30);
                  }
                }

                const cpuSeries = [{ name: 'CPU', data: (rs.cpuHistory || []).map(h => h.val) }];
                const tempSeries = [{ name: 'Temp', data: (rs.tempHistory || []).map(h => h.val) }];
                
                const sparklineOptions = (color) => ({
                  chart: { type: 'area', sparkline: { enabled: true }, animations: { enabled: false } },
                  stroke: { curve: 'smooth', width: 2 },
                  fill: { opacity: 0.2 },
                  colors: [color],
                  tooltip: { fixed: { enabled: false }, x: { show: false }, y: { title: { formatter: () => '' } }, marker: { show: false } }
                });

                return (
                  <tr key={router.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{router.identity}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{router.ip}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{model}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>SNMP {osVersion}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{rs.uptime || 'N/A'}</div>
                    </td>
                    <td style={{ minWidth: '150px' }}>
                      {rs.cpuHistory ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '60px' }}>
                            <ReactApexChart options={sparklineOptions('#3b82f6')} series={cpuSeries} type="area" height={30} />
                          </div>
                          <span style={{ fontWeight: 600, color: rs.cpu > 80 ? '#ef4444' : '#3b82f6', width: '40px' }}>{rs.cpu}%</span>
                        </div>
                      ) : <span style={{ color: 'var(--text-secondary)' }}>Loading...</span>}
                    </td>
                    <td style={{ minWidth: '150px' }}>
                      {rs.tempHistory ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '60px' }}>
                            <ReactApexChart options={sparklineOptions('#f59e0b')} series={tempSeries} type="area" height={30} />
                          </div>
                          <span style={{ fontWeight: 600, color: rs.temp > 70 ? '#ef4444' : '#f59e0b', width: '40px' }}>{rs.temp}°C</span>
                        </div>
                      ) : <span style={{ color: 'var(--text-secondary)' }}>Loading...</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn" style={{ padding: '6px 10px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)' }} title="Sync Interfaces" onClick={() => openInterfaceSync(router)}><RefreshCw size={16} /></button>
                        <button className="btn" style={{ padding: '6px 10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)' }} title="Edit" onClick={() => openEditRouter(router)}><Edit2 size={16} /></button>
                        <button className="btn btn-danger" style={{ padding: '6px 10px' }} title="Delete" onClick={() => deleteRouter(router.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {routers.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px' }}>No routers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Router Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <button className="modal-close" onClick={() => setIsAddModalOpen(false)}><X size={24} /></button>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>{isEditMode ? 'Edit Router' : 'Add New Router'}</h3>
            
            <form onSubmit={handleSaveRouter}>
              <div className="form-group">
                <label>Name (Identity)</label>
                <input required className="form-input" value={formData.identity} onChange={e => setFormData({...formData, identity: e.target.value})} placeholder="Core-Router-01" />
              </div>
              <div className="form-group">
                <label>IP Address</label>
                <input required className="form-input" value={formData.ip} onChange={e => setFormData({...formData, ip: e.target.value})} placeholder="192.168.88.1" />
              </div>
              <div className="form-group">
                <label>SNMP Version</label>
                <select className="form-input" value={formData.snmp_version} onChange={e => setFormData({...formData, snmp_version: e.target.value})} style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: 'var(--text-primary)' }}>
                  <option value="v1">v1</option>
                  <option value="v2c">v2c</option>
                </select>
              </div>
              <div className="form-group">
                <label>SNMP Community</label>
                <input required className="form-input" value={formData.snmp_comm} onChange={e => setFormData({...formData, snmp_comm: e.target.value})} placeholder="public" />
              </div>

              {testStatus && (
                <div style={{ padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', 
                  backgroundColor: testStatus === 'success' ? 'rgba(16, 185, 129, 0.1)' : testStatus === 'error' ? 'rgba(239, 68, 68, 0.1)' : '#f1f5f9',
                  color: testStatus === 'success' ? 'var(--accent-success)' : testStatus === 'error' ? 'var(--accent-danger)' : 'var(--text-primary)'
                }}>
                  {testStatus === 'success' && <CheckCircle size={18} />}
                  {testStatus === 'error' && <AlertCircle size={18} />}
                  {testStatus === 'testing' && <RefreshCw size={18} className="animate-spin" />}
                  <span style={{ fontSize: '0.875rem' }}>{testStatus === 'testing' ? 'Testing connection...' : testMessage}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" style={{ background: 'rgba(59, 130, 246, 0.2)' }} onClick={handleTestConnection}>Test Connection</button>
                <button type="submit" className="btn btn-primary" disabled={testStatus !== 'success'}>Save Router</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sync Interfaces Modal */}
      {isSyncModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <button className="modal-close" onClick={() => setIsSyncModalOpen(false)}><X size={24} /></button>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Sync Interfaces: {selectedRouter?.identity}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Select interfaces to add for monitoring.</p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <input 
                type="text" 
                placeholder="Search interfaces..." 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                className="form-input" 
                style={{ width: '250px', padding: '8px 12px' }} 
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Rows per page:</span>
                <select 
                  className="form-input" 
                  value={rowsPerPage} 
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} 
                  style={{ width: 'auto', padding: '6px 28px 6px 12px' }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px', maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              {isSyncing ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ marginRight: '12px' }} />
                  Walking SNMP Interface MIB...
                </div>
              ) : syncInterfaces.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No interfaces found.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', width: '40px', textAlign: 'center' }}>
                        <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} style={{ width: '14px', height: '14px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }} />
                      </th>
                      <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 600 }}>Interface Name</th>
                      <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 600, width: '100px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedInterfaces.map(iface => (
                      <tr key={iface.name} style={{ background: selectedInterfaces.includes(iface.name) ? 'rgba(2, 132, 199, 0.05)' : '#ffffff', borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '6px 12px', borderRight: '1px solid var(--border-color)', textAlign: 'center' }}>
                          <input type="checkbox" checked={selectedInterfaces.includes(iface.name)} onChange={() => handleInterfaceToggle(iface.name)} style={{ width: '14px', height: '14px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }} />
                        </td>
                        <td style={{ padding: '6px 12px', borderRight: '1px solid var(--border-color)', fontWeight: 500 }}>{iface.name}</td>
                        <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontSize: '0.65rem', 
                            fontWeight: 600, 
                            textTransform: 'uppercase',
                            backgroundColor: iface.status === 'up' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: iface.status === 'up' ? 'var(--accent-success)' : 'var(--accent-danger)'
                          }}>
                            {iface.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {paginatedInterfaces.length === 0 && (
                      <tr><td colSpan="3" style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)' }}>No interfaces match search.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            {syncInterfaces.length > 0 && !isSyncing && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <div>Showing {filteredInterfaces.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredInterfaces.length)} of {filteredInterfaces.length} entries</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn" 
                    style={{ padding: '4px 8px', background: currentPage === 1 ? 'transparent' : 'rgba(2, 132, 199, 0.1)', color: currentPage === 1 ? 'var(--text-secondary)' : 'var(--accent-primary)', border: '1px solid var(--border-color)' }}
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >Previous</button>
                  <button 
                    className="btn" 
                    style={{ padding: '4px 8px', background: currentPage >= totalPages ? 'transparent' : 'rgba(2, 132, 199, 0.1)', color: currentPage >= totalPages ? 'var(--text-secondary)' : 'var(--accent-primary)', border: '1px solid var(--border-color)' }}
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >Next</button>
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn" style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={() => setIsSyncModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={isSyncing} onClick={submitInterfacesForMonitoring}>Submit for Monitoring</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
