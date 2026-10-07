import { useState, useEffect } from 'react';
import { Save, Bell, Plus, Trash2, Edit2, Server } from 'lucide-react';

export default function Settings() {
  const [alerts, setAlerts] = useState([]);
  const [routers, setRouters] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', bot_token: '', chat_id: '', router_ids: [],
    alert_usage: false, alert_usage_threshold: 90,
    alert_interface_down: false, alert_router_down: false
  });

  useEffect(() => {
    fetchAlerts();
    fetchRouters();
  }, []);

  const fetchAlerts = () => {
    fetch('/api/telegram-alerts')
      .then(res => res.json())
      .then(data => setAlerts(data));
  };

  const fetchRouters = () => {
    fetch('/api/routers')
      .then(res => res.json())
      .then(data => setRouters(data));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await fetch('/api/telegram-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    setIsModalOpen(false);
    fetchAlerts();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this alert profile?')) return;
    await fetch(`/api/telegram-alerts/${id}`, { method: 'DELETE' });
    fetchAlerts();
  };

  const openModal = (alert = null) => {
    if (alert) {
      setEditingAlert(alert);
      setFormData({ 
        id: alert.id, 
        name: alert.name, 
        bot_token: alert.bot_token, 
        chat_id: alert.chat_id, 
        router_ids: alert.router_ids || [],
        alert_usage: alert.alert_usage === 1 || alert.alert_usage === true,
        alert_usage_threshold: alert.alert_usage_threshold || 90,
        alert_interface_down: alert.alert_interface_down === 1 || alert.alert_interface_down === true,
        alert_router_down: alert.alert_router_down === 1 || alert.alert_router_down === true
      });
    } else {
      setEditingAlert(null);
      setFormData({ 
        name: '', bot_token: '', chat_id: '', router_ids: [],
        alert_usage: false, alert_usage_threshold: 90,
        alert_interface_down: false, alert_router_down: false
      });
    }
    setIsModalOpen(true);
  };

  const toggleRouterSelection = (routerId) => {
    setFormData(prev => {
      const isSelected = prev.router_ids.includes(routerId);
      return {
        ...prev,
        router_ids: isSelected 
          ? prev.router_ids.filter(id => id !== routerId)
          : [...prev.router_ids, routerId]
      };
    });
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Telegram Alert Profiles</h2>
        <button className="btn btn-primary" onClick={() => openModal()} style={{ padding: '8px 16px', borderRadius: '8px' }}>
          <Plus size={18} /> Add Alert Profile
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {alerts.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <Bell size={48} color="#94a3b8" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>No Alert Profiles Yet</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Create a Telegram alert profile to receive notifications for specific routers.</p>
          </div>
        ) : alerts.map(alert => (
          <div key={alert.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '50%' }}>
                  <Bell size={20} color="var(--accent-primary)" />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{alert.name}</h3>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn" style={{ padding: '6px', color: 'var(--text-secondary)', background: '#f1f5f9', borderRadius: '8px' }} onClick={() => openModal(alert)}>
                  <Edit2 size={16} />
                </button>
                <button className="btn" style={{ padding: '6px', color: '#ef4444', background: '#fef2f2', borderRadius: '8px' }} onClick={() => handleDelete(alert.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {(alert.alert_router_down === 1 || alert.alert_router_down === true) && <span style={{ background: '#fef2f2', color: '#ef4444', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>Router Down</span>}
                {(alert.alert_interface_down === 1 || alert.alert_interface_down === true) && <span style={{ background: '#fffbeb', color: '#f59e0b', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>Interface Down</span>}
                {(alert.alert_usage === 1 || alert.alert_usage === true) && <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>Usage &gt; {alert.alert_usage_threshold}%</span>}
                {(!alert.alert_router_down && !alert.alert_interface_down && !alert.alert_usage) && <span style={{ background: '#f1f5f9', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500 }}>No Triggers</span>}
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Chat ID:</p>
              <p style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '12px' }}>{alert.chat_id}</p>
              
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Monitored Routers ({alert.router_ids?.length || 0}):</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(alert.router_ids || []).map(rId => {
                  const r = routers.find(r => r.id === rId);
                  return (
                    <span key={rId} style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {r ? r.identity : `Router #${rId}`}
                    </span>
                  );
                })}
                {(!alert.router_ids || alert.router_ids.length === 0) && (
                  <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 500 }}>None selected</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px' }}>
              {editingAlert ? 'Edit Alert Profile' : 'New Alert Profile'}
            </h3>
            
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Profile Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Core Network Alerts" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Bot Token</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="e.g. 1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ" 
                  value={formData.bot_token}
                  onChange={e => setFormData({...formData, bot_token: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Chat ID</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. -1001234567890" 
                  value={formData.chat_id}
                  onChange={e => setFormData({...formData, chat_id: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Alert Triggers</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontWeight: 500, color: 'var(--text-primary)' }}>
                    <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }} checked={formData.alert_router_down} onChange={e => setFormData({...formData, alert_router_down: e.target.checked})} />
                    Router down alert (SNMP unreachable)
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontWeight: 500, color: 'var(--text-primary)' }}>
                    <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }} checked={formData.alert_interface_down} onChange={e => setFormData({...formData, alert_interface_down: e.target.checked})} />
                    Interface down alert
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontWeight: 500, color: 'var(--text-primary)' }}>
                      <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }} checked={formData.alert_usage} onChange={e => setFormData({...formData, alert_usage: e.target.checked})} />
                      Interface usage more than
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', background: formData.alert_usage ? '#ffffff' : '#f1f5f9', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden', opacity: formData.alert_usage ? 1 : 0.6 }}>
                      <input type="number" style={{ width: '60px', padding: '4px 8px', border: 'none', outline: 'none', fontSize: '0.9rem', background: 'transparent' }} min="1" max="100" value={formData.alert_usage_threshold} onChange={e => setFormData({...formData, alert_usage_threshold: parseInt(e.target.value) || 90})} disabled={!formData.alert_usage} />
                      <span style={{ padding: '4px 8px', background: '#f1f5f9', color: 'var(--text-secondary)', borderLeft: '1px solid var(--border-color)', fontSize: '0.85rem' }}>%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Assign Routers to this Profile</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '8px' }}>
                  {routers.map(router => {
                    const isSelected = formData.router_ids.includes(router.id);
                    return (
                      <div 
                        key={router.id}
                        onClick={() => toggleRouterSelection(router.id)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px', 
                          padding: '12px', 
                          borderRadius: '8px', 
                          border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          background: isSelected ? 'rgba(59, 130, 246, 0.05)' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Server size={16} color={isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                          <span style={{ fontWeight: isSelected ? 600 : 500, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{router.identity}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '32px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" style={{ background: '#f1f5f9', color: 'var(--text-secondary)' }} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 20px', borderRadius: '8px' }}>
                  <Save size={18} /> Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
