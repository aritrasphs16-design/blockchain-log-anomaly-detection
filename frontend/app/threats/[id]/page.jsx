"use client";

import { useMemo } from "react";
import { useSSE } from "../../../components/SSEProvider";
import { ShieldAlert, ArrowLeft, Database, Link as LinkIcon, ExternalLink, Activity } from "lucide-react";
import Link from 'next/link';
import { PageHeader, Badge } from "../../../components/ui";

export default function ThreatDetailsPage({ params }) {
  const { latestEvent, rawLogs, evidenceBatches } = useSSE();
  
  // Dynamically look up the threat by params.id from live logs and on-chain batches
  const event = useMemo(() => {
    const id = params?.id;
    if (id) {
      for (const batch of evidenceBatches || []) {
        const found = (batch.eventsData || []).find(e => e.eventId === id || e.raw_line?.includes(id));
        if (found) {
          return {
            ...found,
            merkleRoot: batch.root || batch.hash,
            ipfsCid: batch.cid,
            integrity: "VERIFIED ON-CHAIN"
          };
        }
      }
      const inRaw = (rawLogs || []).find(e => e.eventId === id || e.raw_line?.includes(id));
      if (inRaw) return inRaw;
    }
    return latestEvent || {
      eventId: "EVT-LISTENING",
      timestamp: new Date().toISOString(),
      source: "127.0.0.1",
      endpoint: "/analyze",
      attack_type: "Monitoring Active Stream",
      rf_score: 0.0,
      behavior_score: 0.0,
      sequence_score: 0.0,
      final_score: 0.0,
      risk: "LOW",
      ipfsCid: "N/A",
      merkleRoot: "Awaiting Next Batch...",
      integrity: "UNVERIFIED"
    };
  }, [params?.id, latestEvent, rawLogs, evidenceBatches]);

  return (
    <div className="stack stack-5 animate-fadeup" style={{ maxWidth: '64rem', margin: '0 auto', width: '100%' }}>
      
      {/* Header */}
      <PageHeader
        eyebrow="Incident Forensics"
        title="Threat Forensics"
        description={event.attack_type || event.attackType || "Malicious incident deep-dive"}
        icon={
          <Link 
            href="/threats" 
            className="topbar-icon-btn"
            title="Back to Threats"
          >
            <ArrowLeft size={16} />
          </Link>
        }
        actions={
          <Badge tone={event.risk === 'CRITICAL' ? 'crit' : 'warn'}>
            {event.risk} RISK
          </Badge>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Core Metadata */}
        <div className="card-glass p-5 md:col-span-2">
          <p className="section-label mb-4">Event Metadata</p>
          
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 font-mono text-xs">
            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <p className="section-label mb-1">Detected Time</p>
              <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{new Date(event.timestamp || Date.now()).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <p className="section-label mb-1">Source IP</p>
              <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{event.source || "192.168.1.104"}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <p className="section-label mb-1">Target Endpoint</p>
              <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{event.endpoint}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <p className="section-label mb-1">Event ID</p>
              <p className="font-bold text-xs text-rose-400">{event.eventId || `EVT-${Math.floor(Math.random()*10000)}`}</p>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="card-glass p-5 flex flex-col justify-between" style={{ background: 'rgba(244,63,94,0.04)', borderColor: 'rgba(244,63,94,0.2)' }}>
          <div>
            <p className="section-label mb-3 text-rose-400">Required Action</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              This {event.attack_type || event.attackType} event breached threshold criteria. The host server is subject to slashing.
            </p>
          </div>
          <Link 
            href="/audit" 
            className="w-full py-2.5 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-2 shadow-md mt-6 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)', color: '#ffffff', border: '1px solid rgba(244,63,94,0.3)' }}
          >
            <ShieldAlert size={14} /> Proceed to Slashing Terminal
          </Link>
        </div>

        {/* ML Analysis */}
        <div className="card-glass p-5 md:col-span-2">
          <p className="section-label mb-4 flex items-center gap-1.5 text-purple-400">
            <Activity size={13} /> ML Engine Analysis Breakdown
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Random Forest</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Supervised Request Classification</p>
              </div>
              <div className="mono-data text-sm font-bold text-blue-400">{event.rf_score?.toFixed(3) || "0.000"}</div>
            </div>

            <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Isolation Forest</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Unsupervised Behavioral Anomaly Detection</p>
              </div>
              <div className="mono-data text-sm font-bold text-amber-400">{event.behavior_score?.toFixed(3) || "0.000"}</div>
            </div>

            <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Sequence Model (MLP Proxy)</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Temporal Window Analysis</p>
              </div>
              <div className="mono-data text-sm font-bold text-purple-400">{event.sequence_score?.toFixed(3) || "0.000"}</div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Combined Ensemble Risk Score</span>
              <span className={`mono-data text-lg font-black ${event.final_score > 0.75 ? 'text-rose-400' : 'text-amber-400'}`}>
                {event.final_score?.toFixed(3) || "0.000"}
              </span>
            </div>
          </div>
        </div>

        {/* Evidence Links */}
        <div className="card-glass p-5 flex flex-col justify-between">
          <div>
            <p className="section-label mb-4">Evidence Chain</p>
            <div className="space-y-3 font-mono text-xs">
              
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex justify-between items-start mb-1">
                  <span className="section-label">IPFS CID</span>
                  <Database size={12} className="text-emerald-400" />
                </div>
                <p className="mono-data text-xs truncate text-blue-400">{event.ipfsCid || "QmYwAPJzv5CZsnA625s3Xf2sm5DyaRvPuFS"}</p>
              </div>

              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex justify-between items-start mb-1">
                  <span className="section-label">Merkle Root</span>
                  <LinkIcon size={12} className="text-cyan-400" />
                </div>
                <p className="mono-data text-xs truncate text-emerald-400">{event.merkleRoot || "0x8f9d4..."}</p>
              </div>

            </div>
          </div>

          <Link 
            href="/evidence" 
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-colors mt-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          >
            View Evidence Vault <ExternalLink size={12} />
          </Link>
        </div>

      </div>
    </div>
  );
}
