import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Router as RouterIcon, Activity, Settings, Users } from 'lucide-react';

export default function Sidebar() {
  const links = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Routers', path: '/routers', icon: RouterIcon },
    { name: 'Monitoring', path: '/monitoring', icon: Activity },
    { name: 'Portal Users', path: '/users', icon: Users },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="sidebar">
      <div className="logo-container">
        <Activity size={28} />
        <span>MikroSNMP</span>
      </div>
      <div className="nav-menu">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.name}
              to={link.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              {link.name}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
