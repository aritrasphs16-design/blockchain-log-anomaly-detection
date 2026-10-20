"use client";

import { useSSE } from "../components/SSEProvider";
import { ThreatChart } from "../components/ThreatChart";
import { ThreatGlobe } from "../components/ThreatGlobe";
import { MLGauge } from "../components/MLGauge";
import { MatrixTerminal } from "../components/MatrixTerminal";
import { BlockchainVisualizer } from "../components/BlockchainVisualizer";
import { Activity, ShieldAlert, CheckCircle2, ShieldX, Server, Database, Link as LinkIcon, Cpu, Zap, LayoutDashboard, Radio } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader, StatCard, Badge, LiveDot, EmptyState } from "../components/ui";

export default function Dashboard() {
  const { status, anomalies, latestEvent, logs, threatsList, connectionStatus, totalRequests, chartData, blockchainStatus, ipfsStatus, mlStatus } = useSSE();

  const isCritical = status === "ANOMALY DETECTED" || status === "SLASHED";
  
  // Calculate dynamic metrics
  const requestsPerMinute = chartData ? chartData.reduce((sum, point) => sum + (point.Traffic || 0), 0) : 0;
  const criticalEventsCount = threatsList ? threatsList.length : 0;
  const anchoredBatchesCount = logs ? logs.filter(l => l.msg.includes('BLOCKCHAIN')).length : 0;

  const triggerSimulate = async (attackType) => {
    try {
      const targetUrl = process.env.NEXT_PUBLIC_TARGET_URL || "http://localhost:8080";
      await fetch(`${targetUrl}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attack: attackType })
      });
    } catch (err) {
      console.error("Failed to trigger simulation:", err);
    }
  };

  const triggerStop = async () => {
    try {
      const targetUrl = process.env.NEXT_PUBLIC_TARGET_URL || "http://localhost:8080";
      await fetch(`${targetUrl}/stop`, {
        method: "POST"
      });
    } catch (err) {
      console.error("Failed to stop simulation:", err);
    }
  };

  return (
    <div className="stack stack-5 animate-fadeup">

      {/* Page header */}
      <PageHeader
        eyebrow="Overview"
        title="Security Overview"
        description="Real-time threat monitoring · Evidence anchoring · Blockchain forensics"
        icon={<LayoutDashboard size={19} />}
        actions={
          <Badge
            tone={isCritical ? 'crit' : 'ok'}
            icon={<LiveDot tone={isCritical ? 'crit' : 'live'} />}
          >
            {status}
          </Badge>
        }
      />

      {/* KPI Cards */}
      <div className="page-grid page-grid-4">
        <StatCard
          label="Total Requests"
          value={totalRequests.toLocaleString()}
          meta={`+${requestsPerMinute} /min`}
          icon={<Activity size={15} />}
          tone="info"
        />
        <StatCard
          label="Threats Detected"
          value={anomalies}
          meta="Since last reset"
          icon={<ShieldAlert size={15} />}
          tone={anomalies > 0 ? 'warn' : 'neutral'}
        />
        <StatCard
          label="Critical Events"
          value={criticalEventsCount}
          meta="Unresolved alerts"
          icon={<ShieldX size={15} />}
          tone={criticalEventsCount > 0 ? 'crit' : 'neutral'}
        />
        <StatCard
          label="Anchored Batches"
          value={anchoredBatchesCount}
          meta="On smart contract"
          icon={<CheckCircle2 size={15} />}
          tone="ok"
        />
      </div>

      {/* Hero row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-[440px] lg:h-[500px]"><ThreatGlobe /></div>
        <div className="flex flex-col gap-4 h-[440px] lg:h-[500px]">
          <div className="h-[210px] shrink-0"><MLGauge /></div>
          <div className="flex-1 min-h-[250px] overflow-hidden"><BlockchainVisualizer /></div>
        </div>
      </div>

      {/* System status + terminal row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* System Status + Simulator */}
        <div className="card-glass p-5 col-span-1 min-h-[460px] flex flex-col justify-between">
          <div>
            <p className="section-label mb-3">System Status</p>
            <div className="space-y-2">
              {[
                { label: 'ML Engine', icon: <Cpu size={14} />, status: mlStatus || 'ONLINE', ok: mlStatus !== 'OFFLINE' },
                { label: 'Log Monitor', icon: <Server size={14} />, status: connectionStatus, ok: connectionStatus === 'ONLINE' },
                { label: 'IPFS Node', icon: <Database size={14} />, status: ipfsStatus || 'STANDBY', ok: ipfsStatus === 'CONNECTED' },
                { label: 'Blockchain', icon: <LinkIcon size={14} />, status: blockchainStatus || 'CONNECTING...', ok: blockchainStatus === 'CONNECTED' },
              ].map(({ label, icon, status: st, ok }) => (
                <div key={label} className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                  <span className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'inline-flex' }}>{icon}</span>
                    {label}
                  </span>
                  <span className="row row-2 text-[10px] font-bold mono-data" style={{ color: ok ? 'var(--ok)' : 'var(--warn)' }}>
                    <LiveDot tone={ok ? 'live' : 'warn'} />
                    {st}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center justify-between mb-2.5">
              <p className="section-label flex items-center gap-1.5"><Zap size={11} style={{ color: 'var(--warn)' }} /> Attack Simulator</p>
              <button onClick={triggerStop} className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded transition-colors cursor-pointer hover:text-white" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                Stop All
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'Normal Traffic', type: 'normal', color: 'var(--ok)' },
                { label: 'SQL Injection', type: 'sqli', color: 'var(--crit)' },
                { label: 'Brute Force', type: 'bruteforce', color: 'var(--crit)' },
                { label: 'Slow Brute', type: 'slowbruteforce', color: 'var(--warn)' },
                { label: 'XSS Attack', type: 'xss', color: 'var(--crit)' },
                { label: 'Path Traversal', type: 'path', color: 'var(--crit)' },
              ].map(({ label, type, color }) => (
                <button key={type} onClick={() => triggerSimulate(type)} className="px-2 py-1.5 rounded text-[10px] font-bold transition-all text-left truncate cursor-pointer hover:border-slate-500" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart + Terminal */}
        <div className="col-span-1 lg:col-span-2 min-h-[460px] flex flex-col gap-4">
          <div className="card-glass p-5 flex-1 min-h-[250px] flex flex-col">
            <ThreatChart />
          </div>
          <div style={{ height: '190px' }} className="shrink-0">
            <MatrixTerminal />
          </div>
        </div>
      </div>

      {/* Events table */}
      <div className="card-glass overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <p className="section-label">Historical Security Events</p>
        </div>
        <div className="table-wrap" style={{ maxHeight: '320px', overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Service</th>
                <th>Event</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice().reverse().map((log, idx) => {
                let severity = 'Info', eventType = 'System Event', service = 'Network Stream', color = 'var(--text-muted)';
                if (log.msg.includes('🚨')) { severity = 'Critical'; eventType = log.msg.replace('🚨', '').trim(); service = 'ML Engine'; color = '#fb7185'; }
                else if (log.msg.includes('CRYPTOGRAPHY')) { severity = 'High'; eventType = 'Evidence Archived'; service = 'IPFS'; color = '#60a5fa'; }
                else if (log.msg.includes('BLOCKCHAIN')) { severity = 'High'; eventType = 'Root Anchored'; service = 'Blockchain'; color = '#34d399'; }
                else if (log.msg.includes('Agent Connected')) { eventType = 'Agent Connected'; service = 'Log Monitor'; }
                return (
                  <motion.tr key={idx} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
                    <td className="mono-data" style={{ color: 'var(--text-muted)' }}>{log.time}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{service}</td>
                    <td style={{ color }}>{eventType}</td>
                    <td>
                      <Badge tone={severity === 'Critical' ? 'crit' : severity === 'High' ? 'info' : 'neutral'}>
                        {severity}
                      </Badge>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          {logs.length === 0 && (
            <EmptyState
              icon={<Activity size={24} />}
              title="No events yet"
              description="Waiting for agent connection. Inbound access logs will stream here in real-time."
            />
          )}
        </div>
      </div>
    </div>
  );
}
