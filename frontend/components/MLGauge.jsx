"use client";

import { useSSE } from './SSEProvider';
import { motion } from 'framer-motion';

export function MLGauge() {
  const { latestEvent } = useSSE();
  
  const score = latestEvent ? latestEvent.final_score : 0;
  const risk = latestEvent ? latestEvent.risk : "LOW";
  const confidence = latestEvent ? latestEvent.confidence : 1.0;

  // Convert score (0-1) to an angle (-90 to 90 degrees) for the needle
  const angle = (score * 180) - 90;

  // Color mapping based on risk
  let colorHex = "#34d399";
  let glowColor = "var(--ok-bg)";
  if (risk === "MEDIUM") {
    colorHex = "#fbbf24";
    glowColor = "var(--warn-bg)";
  } else if (risk === "HIGH") {
    colorHex = "#fb923c";
    glowColor = "var(--warn-bg)";
  } else if (risk === "CRITICAL") {
    colorHex = "#fb7185";
    glowColor = "var(--crit-bg)";
  }

  return (
    <div className="card-glass w-full h-full flex flex-col p-4 relative overflow-hidden">
      <div className="row between items-start" style={{ marginBottom: '0.375rem' }}>
        <div style={{ minWidth: 0 }}>
          <p className="section-label" style={{ marginBottom: '0.25rem' }}>ML Confidence Engine</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Real-time anomaly scoring</p>
        </div>
        <span
          className="px-2 py-0.5 rounded mono-data text-[10px] font-bold shrink-0"
          style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
        >
          {(confidence * 100).toFixed(1)}% CONF
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        {/* SVG Speedometer */}
        <div className="relative w-[200px] h-[100px] overflow-hidden shrink-0">
          <svg viewBox="0 0 200 100" className="w-full h-full overflow-visible">
            <defs>
              <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background Arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="rgba(148,163,184,0.10)"
              strokeWidth="16"
              strokeLinecap="round"
            />

            {/* Zone tick highlights */}
            <path d="M 20 100 A 80 80 0 0 1 65 32" fill="none" stroke="#34d399" strokeWidth="16" strokeOpacity="0.14" strokeLinecap="round" />
            <path d="M 135 32 A 80 80 0 0 1 180 100" fill="none" stroke="#fb7185" strokeWidth="16" strokeOpacity="0.16" strokeLinecap="round" />

            {/* Active Arc Segment */}
            <motion.path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={colorHex}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray="251"
              filter="url(#gaugeGlow)"
              initial={{ strokeDashoffset: 251 }}
              animate={{ strokeDashoffset: 251 - (score * 251) }}
              transition={{ type: "spring", stiffness: 60, damping: 15 }}
            />

            {/* Needle Pivot Base */}
            <circle cx="100" cy="100" r="10" fill="var(--bg-elevated)" stroke="var(--border-default)" strokeWidth="2" />
            <circle cx="100" cy="100" r="4" fill={colorHex} />

            {/* Animated Needle */}
            <motion.polygon
              points="97,100 103,100 100,28"
              fill={colorHex}
              initial={{ rotate: -90, transformOrigin: "100px 100px" }}
              animate={{ rotate: angle, transformOrigin: "100px 100px" }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
            />
          </svg>
        </div>

        {/* Value Display */}
        <div className="flex flex-col items-center" style={{ marginTop: '0.5rem' }}>
          <motion.h2
            className="mono-data tracking-tight"
            style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.1 }}
            animate={{ color: colorHex }}
          >
            {score.toFixed(3)}
          </motion.h2>
          <motion.span
            className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{
              marginTop: '0.375rem',
              background: glowColor,
              border: `1px solid ${colorHex}40`,
              color: colorHex,
            }}
          >
            {risk} Risk Level
          </motion.span>
        </div>
      </div>
    </div>
  );
}
