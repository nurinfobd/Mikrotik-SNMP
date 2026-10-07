import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { LogOut } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const user = JSON.parse(localStorage.getItem('user') || '{"username":"Admin"}');

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <div className="header">
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>SNMP Portal v1.0</div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <span>{user.username}</span>
            <button onClick={handleLogout} className="btn" style={{ padding: '8px', background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }} title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </div>
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
