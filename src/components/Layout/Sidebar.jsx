import { NavLink } from 'react-router-dom';
import { Home, FileText, Monitor, BarChart3, Zap, History } from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/prep', icon: FileText, label: 'Preparation' },
  { to: '/interview', icon: Monitor, label: 'Mock Interview' },
  { to: '/results', icon: BarChart3, label: 'Analytics' },
  { to: '/history', icon: History, label: 'History' },
];

export default function Sidebar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        <div className="navbar-logo">
          <Zap size={18} />
        </div>
        <span className="navbar-title">Interview<span>IQ</span></span>
      </NavLink>

      <div className="navbar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <item.icon size={16} />
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="navbar-status">
        <span className="status-dot" />
        AI Ready
      </div>
    </nav>
  );
}
