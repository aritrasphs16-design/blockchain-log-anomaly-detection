"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSSE } from './SSEProvider';
import { LiveDot } from './ui';

export function ThreatGlobe() {
  const { latestEvent, status } = useSSE();
  const [attacks, setAttacks] = useState([]);

  useEffect(() => {
    if (latestEvent && latestEvent.is_anomaly) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 100 + Math.random() * 50; // Random distance from center
      const startX = 200 + Math.cos(angle) * radius;
      const startY = 200 + Math.sin(angle) * radius;
      
      const ip = latestEvent.raw_line ? latestEvent.raw_line.split(' ')[0] : 'UNKNOWN_IP';

      const newAttack = {
        id: Date.now() + Math.random(),
        startX,
        startY,
        type: latestEvent.attack_type,
        ip: ip,
        color: latestEvent.risk === 'CRITICAL' ? '#fb7185' : '#fb923c'
      };

      setAttacks(prev => [...prev, newAttack].slice(-10)); // Keep last 10 lasers

      // Remove after animation completes
      setTimeout(() => {
        setAttacks(prev => prev.filter(a => a.id !== newAttack.id));
      }, 2000);
    }
  }, [latestEvent]);

  return (
    <div className="card-glass w-full h-full flex flex-col relative overflow-hidden p-5 shadow-inner">
      <div className="row between items-center" style={{ marginBottom: '0.5rem', zIndex: 10 }}>
        <p className="section-label">Cyber Threat Radar</p>
        <span className="row row-2 text-[10px] mono-data font-bold uppercase tracking-wider" style={{ color: 'var(--ok)' }}>
          <LiveDot tone="live" />
          Live Scanner
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center relative min-h-0 overflow-hidden">
        <svg viewBox="0 0 400 400" className="w-full h-full object-contain" style={{ maxHeight: '100%' }}>
          {/* Abstract Globe / Radar Rings */}
          <circle cx="200" cy="200" r="150" fill="none" stroke="rgba(148,163,184,0.10)" strokeWidth="1.5" strokeDasharray="4 4" />
          <circle cx="200" cy="200" r="100" fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth="1.5" />
          <circle cx="200" cy="200" r="50" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="1.5" strokeDasharray="2 2" />

          <line x1="50" y1="200" x2="350" y2="200" stroke="rgba(148,163,184,0.08)" strokeWidth="1" />
          <line x1="200" y1="50" x2="200" y2="350" stroke="rgba(148,163,184,0.08)" strokeWidth="1" />

          {/* Center Target (Server) */}
          <circle cx="200" cy="200" r="4" fill={status === "ANOMALY DETECTED" ? "#fb7185" : "#34d399"} />
          <circle cx="200" cy="200" r="12" fill="none" stroke={status === "ANOMALY DETECTED" ? "#fb7185" : "#34d399"} strokeWidth="1.5" className={status === "ANOMALY DETECTED" ? "animate-pulse" : ""} />

          {status === "ANOMALY DETECTED" && (
            <motion.circle
              cx="200" cy="200" r="4" fill="none" stroke="#fb7185" strokeWidth="2"
              animate={{ r: 80, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}

          {/* Laser Beams */}
          <AnimatePresence>
            {attacks.map((attack) => (
              <g key={attack.id}>
                {/* Attacker Origin Node */}
                <motion.circle
                  initial={{ r: 0, opacity: 0 }}
                  animate={{ r: 4, opacity: 1 }}
                  exit={{ r: 0, opacity: 0 }}
                  cx={attack.startX}
                  cy={attack.startY}
                  fill={attack.color}
                />
                <motion.circle
                  initial={{ r: 0, opacity: 0 }}
                  animate={{ r: 25, opacity: 0 }}
                  transition={{ duration: 1, repeat: Infinity }}
                  cx={attack.startX}
                  cy={attack.startY}
                  fill="none"
                  stroke={attack.color}
                  strokeWidth="1"
                />

                {/* Attacker Info Label */}
                <motion.text
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  x={attack.startX + 15}
                  y={attack.startY + 5}
                  fill={attack.color}
                  fontSize="12"
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight="bold"
                  style={{ filter: `drop-shadow(0 0 6px rgba(0,0,0,0.9))` }}
                >
                  [{attack.ip}] {attack.type}
                </motion.text>

                {/* Laser Trajectory */}
                <motion.path
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.8 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  d={`M ${attack.startX} ${attack.startY} L 200 200`}
                  fill="none"
                  stroke={attack.color}
                  strokeWidth="2"
                  style={{ filter: `drop-shadow(0 0 8px ${attack.color})` }}
                />
              </g>
            ))}
          </AnimatePresence>
        </svg>
      </div>

      <div className="row wrap gap-6" style={{ marginTop: 'auto', paddingTop: '0.875rem', zIndex: 10, borderTop: '1px solid var(--border-subtle)' }}>
        <div className="row row-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--ok)', boxShadow: '0 0 8px rgba(52,211,153,0.5)' }} />
          <span className="text-[10px] mono-data uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Target Host Protected</span>
        </div>
        <div className="row row-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--crit)', boxShadow: '0 0 8px rgba(244,63,94,0.5)' }} />
          <span className="text-[10px] mono-data uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Vector Intercepted</span>
        </div>
      </div>
    </div>
  );
}
