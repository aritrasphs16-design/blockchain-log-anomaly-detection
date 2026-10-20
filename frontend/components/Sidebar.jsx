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
      {/* Brand Header */}
      <div className="nav-brand-container">
        <Link href="/" onClick={onClose} className="nav-brand-content" style={{ textDecoration: 'none' }}>
          <div className="nav-brand-emblem-wrap">
            <svg
              className="nav-brand-emblem"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="emblemGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
                <linearGradient id="emblemPlate" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#080f1d" />
                </linearGradient>
              </defs>
              {/* Outer Hex Shield Plate */}
              <path
                d="M16 2.5L27 7.5V15.5C27 22.2 22.3 28.2 16 30C9.7 28.2 5 22.2 5 15.5V7.5L16 2.5Z"
                fill="url(#emblemPlate)"
                stroke="url(#emblemGlow)"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              {/* Hexagonal Inner Perimeter */}
              <polygon
                points="16,8.5 21.5,11.5 21.5,17.5 16,20.5 10.5,17.5 10.5,11.5"
                fill="none"
                stroke="rgba(56, 189, 248, 0.45)"
                strokeWidth="1.1"
              />
              {/* Cryptographic Core / Node */}
              <circle cx="16" cy="14.5" r="2.5" fill="#38bdf8" />
              <path
                d="M16 8.5V12M16 17V20.5M10.5 14.5H13.5M18.5 14.5H21.5"
                stroke="#38bdf8"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <span className="nav-brand-pulse-dot" title="Core Sentinel Active" />
          </div>

          <div className="nav-brand-meta">
            <div className="nav-brand-row">
              <span className="nav-brand-title">BLAD</span>
              <span className="nav-brand-pill">v2.4</span>
            </div>
            <p className="nav-brand-subtitle">SECURITY PLATFORM</p>
          </div>
        </Link>

        {/* Strictly mobile-only drawer close button */}
        <button
          type="button"
          onClick={onClose}
          className="sidebar-close-btn"
          aria-label="Close navigation"
        >
          <X size={15} />
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

