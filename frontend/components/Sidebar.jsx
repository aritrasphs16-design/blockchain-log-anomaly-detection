"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShieldAlert,
  Server,
  BrainCircuit,
  Archive,
  CheckSquare,
  Link as LinkIcon,
  Activity,
  Settings,
  Shield,
  Database,
  X
} from 'lucide-react';
import { useSSE } from './SSEProvider';
import { LiveDot } from './ui';

export function Sidebar({ open = false, onClose }) {
  const pathname = usePathname();
  const { connectionStatus, status, anomalies } = useSSE();

  const navItems = [
    { section: 'OVERVIEW', items: [
      { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={17} /> },
      { name: 'Threats', path: '/threats', icon: <ShieldAlert size={17} />, badge: anomalies > 0 ? anomalies : null },
      { name: 'Servers', path: '/servers', icon: <Server size={17} /> },
      { name: 'ML Analysis', path: '/ml', icon: <BrainCircuit size={17} /> },
    ]},
    { section: 'EVIDENCE', items: [
      { name: 'Evidence Archive', path: '/evidence', icon: <Archive size={17} /> },
      { name: 'Merkle Verification', path: '/verification', icon: <CheckSquare size={17} /> },
      { name: 'Blockchain', path: '/blockchain', icon: <LinkIcon size={17} /> },
    ]},
    { section: 'SYSTEM', items: [
      { name: 'Live Events', path: '/audit', icon: <Activity size={17} /> },
      { name: 'Architecture', path: '/architecture', icon: <Settings size={17} /> },
    ]}
  ];

  const isOnline = connectionStatus === 'ONLINE';
  const isSecure = status === 'SECURE';

  return (
    <aside className={`shell-sidebar ${open ? 'is-open' : ''}`} aria-label="Primary navigation">
      {/* Brand */}
      <div className="nav-brand">
        <div className="nav-brand-mark">
          <Shield size={18} strokeWidth={2.5} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 className="nav-brand-name">BLAD</h1>
          <p className="nav-brand-sub">Security Platform</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="topbar-icon-btn nav-close"
          style={{ marginLeft: 'auto' }}
          aria-label="Close navigation"
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="nav-scroll">
        {navItems.map((group) => (
          <div className="nav-group" key={group.section}>
            <p className="nav-group-label">{group.section}</p>
            <div className="stack stack-2" style={{ gap: '0.125rem' }}>
              {group.items.map((item) => {
                const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    onClick={onClose}
                    className={`nav-item ${isActive ? 'is-active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.icon}
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </span>
                    {item.badge ? <span className="nav-item-badge">{item.badge}</span> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Status Footer */}
      <div className="nav-footer">
        <div className="nav-status-row">
          <LiveDot tone={isOnline ? 'live' : 'crit'} />
          <span>Agent</span>
          <span style={{ marginLeft: 'auto', color: isOnline ? 'var(--ok)' : 'var(--crit)' }}>
            {connectionStatus}
          </span>
        </div>

        <div className="nav-status-list">
          {[
            { icon: <BrainCircuit size={12} />, label: 'ML Engine', val: 'ACTIVE', color: 'var(--ok)' },
            { icon: <LinkIcon size={12} />, label: 'Blockchain', val: 'SYNCED', color: 'var(--ok)' },
            { icon: <Database size={12} />, label: 'IPFS Node', val: 'LIVE', color: 'var(--ok)' },
          ].map(({ icon, label, val, color }) => (
            <div key={label} className="nav-status-item">
              <span className="nav-status-item-label">
                <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>{icon}</span>
                {label}
              </span>
              <span className="nav-status-item-value" style={{ color }}>{val}</span>
            </div>
          ))}
        </div>

        <div
          className="nav-status-item"
          style={{ marginTop: '0.625rem' }}
        >
          <span className="nav-status-item-label">
            <LiveDot tone={isSecure ? 'live' : 'crit'} />
            Posture
          </span>
          <span className="nav-status-item-value" style={{ color: isSecure ? 'var(--ok)' : 'var(--crit)' }}>
            {status}
          </span>
        </div>
      </div>
    </aside>
  );
}

