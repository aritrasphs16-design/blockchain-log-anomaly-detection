"use client";

import { useSSE } from './SSEProvider';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiveDot } from './ui';

export function MatrixTerminal() {
  const { rawLogs } = useSSE();
  const terminalRef = useRef(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [rawLogs]);

  return (
    <div className="card-glass w-full h-full flex flex-col shadow-inner overflow-hidden font-mono" style={{ background: '#060a11' }}>
      {/* Terminal Header */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 shrink-0" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--crit)', opacity: 0.75 }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--warn)', opacity: 0.75 }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--ok)', opacity: 0.75 }} />
        </div>
        <span className="text-[10px] mono-data font-semibold ml-1 truncate" style={{ color: 'var(--text-muted)' }}>
          root@agent:~# tail -f access.log
        </span>
        <span className="ml-auto text-[9px] mono-data flex items-center gap-1.5 font-bold uppercase tracking-wider shrink-0" style={{ color: 'var(--ok)' }}>
          <LiveDot tone="live" />
          Streaming
        </span>
      </div>

      {/* Terminal Output */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 space-y-1 text-[11px] leading-relaxed scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        <AnimatePresence initial={false}>
          {rawLogs.map((log, idx) => (
            <motion.div
              key={idx + log.raw_line}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-2 break-all"
            >
              <span
                className="shrink-0 mono-data"
                style={{ color: log.is_anomaly ? 'var(--crit)' : 'var(--text-faint)' }}
              >
                {log.is_anomaly ? '!' : '›'}
              </span>
              <span
                className="min-w-0"
                style={{
                  color: log.is_anomaly ? 'var(--crit)' : 'var(--ok)',
                  fontWeight: log.is_anomaly ? 600 : 400,
                }}
              >
                {log.raw_line}
              </span>
              {log.is_anomaly && (
                <span
                  className="shrink-0 px-1.5 py-0.5 mono-data text-[9px] uppercase tracking-wider"
                  style={{
                    background: 'var(--crit-bg)',
                    border: '1px solid var(--crit-border)',
                    color: 'var(--crit)',
                    borderRadius: 'var(--radius-badge)',
                  }}
                >
                  {log.attack_type} Blocked
                </span>
              )}
            </motion.div>
          ))}
          {rawLogs.length === 0 && (
            <div className="mono-data" style={{ color: 'var(--text-faint)' }}>
              $ listening on inbound traffic stream…
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
