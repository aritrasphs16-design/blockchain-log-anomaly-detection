"use client";

import { useState } from "react";
import { useSSE } from "../../components/SSEProvider";
import { ShieldAlert, ArrowRight, Gavel, ShieldX, CheckCircle2, Search } from "lucide-react";
import Link from 'next/link';
import { PageHeader, Badge, EmptyState, Button } from "../../components/ui";

export default function ThreatsPage() {
  const { threatsList } = useSSE();
  const [selectedRisk, setSelectedRisk] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [quarantined, setQuarantined] = useState({});

  const threatLogs = threatsList ? [...threatsList].reverse() : [];

  const handleQuarantine = async (ip, attackType) => {
    try {
      const targetUrl = process.env.NEXT_PUBLIC_TARGET_URL || "http://localhost:8080";
      await fetch(`${targetUrl}/firewall/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip, reason: `Manual Quarantine (${attackType})` })
      });
      setQuarantined(prev => ({ ...prev, [ip]: true }));
    } catch (e) {
      alert("Could not reach firewall endpoint.");
    }
  };

  const filteredThreats = threatLogs.filter(threat => {
    const riskMatch = threat.msg.match(/Risk:\s*([A-Z]+)/);
    const risk = riskMatch ? riskMatch[1] : "HIGH";
    const matchesRisk = selectedRisk === "ALL" || risk === selectedRisk;
    const matchesSearch = !searchQuery || threat.msg.toLowerCase().includes(searchQuery.toLowerCase()) || (threat.raw_line && threat.raw_line.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRisk && matchesSearch;
  });

  return (
    <div className="stack stack-5 animate-fadeup">

      {/* Header and Filter Controls */}
      <PageHeader
        eyebrow="Threat Intelligence"
        title="Threat Intelligence & Response"
        description="Review AI-intercepted malicious events and execute immediate countermeasures."
        icon={<ShieldAlert size={19} style={{ color: 'var(--crit)' }} />}
        actions={
          <div className="toolbar">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2" size={13} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search IP, endpoint, payload..."
                aria-label="Search threats"
                className="dark-input pl-8"
                style={{ width: '15rem', maxWidth: '100%' }}
              />
            </div>
            <div className="segmented" role="group" aria-label="Filter by risk level">
              {["ALL", "CRITICAL", "HIGH"].map(r => (
                <button
                  key={r}
                  onClick={() => setSelectedRisk(r)}
                  className={selectedRisk === r ? 'is-active' : ''}
                  aria-pressed={selectedRisk === r}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* Summary strip */}
      <div className="row row-4 wrap" style={{ gap: '0.75rem' }}>
        <Badge tone="neutral">Total · {threatLogs.length}</Badge>
        <Badge tone="crit">Critical · {threatLogs.filter(t => (t.msg.match(/Risk:\s*([A-Z]+)/)?.[1] || 'HIGH') === 'CRITICAL').length}</Badge>
        <Badge tone="warn">High · {threatLogs.filter(t => (t.msg.match(/Risk:\s*([A-Z]+)/)?.[1] || 'HIGH') === 'HIGH').length}</Badge>
        <Badge tone="accent">Quarantined · {Object.keys(quarantined).length}</Badge>
      </div>

      {/* Threats Table */}
      <div className="card-glass overflow-hidden">
        <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Attacker IP</th>
              <th>Endpoint</th>
              <th>Attack Vector</th>
              <th>Risk Level</th>
              <th className="text-right">Countermeasures</th>
            </tr>
          </thead>
          <tbody>
            {filteredThreats.length > 0 ? filteredThreats.map((threat, idx) => {
              const attackTypeMatch = threat.msg.match(/🚨\s*(.*?)\s*detected/);
              const attackType = attackTypeMatch ? attackTypeMatch[1] : "ANOMALOUS_EVENT";
              
              const endpointMatch = threat.msg.match(/detected on\s*([^\s(]+)/);
              const endpoint = endpointMatch ? endpointMatch[1] : "/";

              const riskMatch = threat.msg.match(/Risk:\s*([A-Z]+)/);
              const risk = riskMatch ? riskMatch[1] : "HIGH";

              const ip = threat.raw_line ? threat.raw_line.split(' ')[0] : "127.0.0.1";
              const isBlocked = quarantined[ip];

              return (
                <tr key={idx}>
                  <td className="mono-data" style={{ color: 'var(--text-muted)' }}>{threat.time}</td>
                  <td className="mono-data font-bold" style={{ color: 'var(--text-primary)' }}>{ip}</td>
                  <td className="mono-data truncate max-w-[160px]" style={{ color: 'var(--text-secondary)' }}>{endpoint}</td>
                  <td>
                    <span className="font-semibold text-rose-400 mono-data">{attackType}</span>
                  </td>
                  <td>
                    <Badge tone={risk === 'CRITICAL' ? 'crit' : 'warn'}>
                      {risk}
                    </Badge>
                  </td>
                  <td className="text-right">
                    <div className="row row-2 end">
                      <button
                        onClick={() => handleQuarantine(ip, attackType)}
                        disabled={isBlocked}
                        className="btn btn-sm"
                        style={isBlocked
                          ? { background: 'var(--bg-inset)', color: 'var(--text-muted)', borderColor: 'var(--border-subtle)', cursor: 'not-allowed' }
                          : { background: 'var(--crit-bg)', color: 'var(--crit)', borderColor: 'var(--crit-border)' }
                        }
                      >
                        {isBlocked ? <CheckCircle2 size={12} /> : <ShieldX size={12} />}
                        {isBlocked ? 'Quarantined' : 'Block IP'}
                      </button>
                      <Link
                        href="/audit"
                        className="btn btn-sm"
                        style={{ background: 'var(--warn-bg)', borderColor: 'var(--warn-border)', color: 'var(--warn)', fontWeight: 700 }}
                      >
                        <Gavel size={12} /> Slash Stake
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon={<ShieldAlert size={28} />}
                    title="No threats found matching the current criteria."
                    description="Adjust the risk filter or search query, or trigger an attack simulation from the dashboard to observe live interception."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
