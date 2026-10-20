"use client";

import { useSSE } from "../../components/SSEProvider";
import { Archive, Search, ArrowRight, ShieldCheck } from "lucide-react";
import Link from 'next/link';
import { PageHeader, Badge, EmptyState, StatCard } from "../../components/ui";

export default function EvidenceArchivePage() {
  const { evidenceBatches } = useSSE();

  const totalLogs = evidenceBatches.reduce((sum, b) => sum + (b.eventsCount || b.eventsData?.length || 0), 0);
  const totalAnomalies = evidenceBatches.reduce((sum, b) => sum + (b.anomaliesCount || 0), 0);

  return (
    <div className="stack stack-5 animate-fadeup">

      {/* Header and Search */}
      <PageHeader
        eyebrow="Evidence"
        title="Evidence Archive"
        description="Immutable cryptographic records of all security events anchored on Ethereum and IPFS."
        icon={<Archive size={19} />}
        actions={
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2" size={13} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by Batch ID or CID..."
              aria-label="Search evidence by batch ID or CID"
              className="dark-input pl-8"
              style={{ width: '15rem', maxWidth: '100%' }}
            />
          </div>
        }
      />

      {/* Summary */}
      <div className="page-grid page-grid-3">
        <StatCard label="Anchored Batches" value={evidenceBatches.length} meta="Cryptographically sealed" icon={<Archive size={15} />} tone="accent" />
        <StatCard label="Captured Log Events" value={totalLogs} meta="Across all batch windows" icon={<ShieldCheck size={15} />} tone="info" />
        <StatCard label="Anomalies Archived" value={totalAnomalies} meta="Intercepted before anchoring" icon={<ShieldCheck size={15} />} tone={totalAnomalies > 0 ? 'crit' : 'neutral'} />
      </div>

      {/* Archive Table */}
      <div className="card-glass overflow-hidden">
        <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Batch ID</th>
              <th>Timestamp</th>
              <th>IPFS CID</th>
              <th>Merkle Root</th>
              <th>Integrity</th>
              <th className="text-right">Details</th>
            </tr>
          </thead>
          <tbody>
            {evidenceBatches.length > 0 ? evidenceBatches.map((batch, idx) => (
              <tr key={idx}>
                <td className="mono-data font-bold" style={{ color: 'var(--text-primary)' }}>#{batch.id}</td>
                <td className="mono-data" style={{ color: 'var(--text-muted)' }}>{batch.time}</td>
                <td>
                  <span className="mono-data text-xs px-2 py-0.5 rounded font-bold" style={{ background: 'var(--info-bg)', color: 'var(--info)', border: '1px solid var(--info-border)' }}>
                    {batch.cid?.substring(0, 12)}...
                  </span>
                </td>
                <td className="mono-data text-xs truncate max-w-[160px]" style={{ color: 'var(--ok)' }}>
                  {batch.root ? `${batch.root.substring(0, 16)}...` : '0x0...'}
                </td>
                <td>
                  <Badge tone="ok" icon={<ShieldCheck size={11} />}>
                    {batch.status || "VERIFIED"}
                  </Badge>
                </td>
                <td className="text-right">
                  <Link
                    href={`/evidence/${batch.id}`}
                    className="inline-flex items-center justify-center p-1.5 rounded-lg transition-colors"
                    style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
                    title="Inspect evidence details"
                    aria-label={`Inspect evidence batch ${batch.id}`}
                  >
                    <ArrowRight size={14} />
                  </Link>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon={<Archive size={28} />}
                    title="Waiting for the first evidence batch to be anchored to the blockchain..."
                    description="Once the agent seals a Merkle root on-chain, the corresponding IPFS payload appears here for forensic inspection."
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
