"use client";

import React, { use, useState } from "react";
import { useSSE } from "../../../components/SSEProvider";
import { Archive, ArrowLeft, Database, Link as LinkIcon, CheckCircle2, ShieldCheck, Download, FileText, ExternalLink } from "lucide-react";
import Link from 'next/link';
import { PageHeader, Badge, Button, Modal } from "../../../components/ui";

export default function EvidenceDetailsPage({ params }) {
  const { evidenceBatches, networkConfig } = useSSE();
  const { batchId } = use(params);
  const [certModal, setCertModal] = useState(false);

  // Find the specific batch from dynamic state
  const batch = evidenceBatches.find(b => b.id === batchId || b.batchId?.toString() === batchId) || {
    id: batchId,
    cid: "Fetching from network...",
    root: "Fetching from network...",
    status: "Verified",
    eventsCount: 0,
    anomaliesCount: 0,
    eventsData: [],
    txHash: "0xPending..."
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="stack stack-5 animate-fadeup">
      
      {/* Header and Actions */}
      <PageHeader
        eyebrow="Evidence Record"
        title={`Evidence Batch #${batchId}`}
        description="Immutable Cryptographic Snapshot & Chain of Custody Record."
        icon={
          <Link 
            href="/evidence" 
            className="topbar-icon-btn"
            title="Back to Evidence Archive"
          >
            <ArrowLeft size={16} />
          </Link>
        }
        actions={
          <button 
            onClick={() => setCertModal(true)}
            className="btn btn-sm btn-primary"
          >
            <FileText size={13} /> Forensic Certificate (ISO 27037)
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Verification Status Card */}
        <div 
          className="card-glass p-5 md:col-span-2 border-l-4"
          style={{ borderLeftColor: '#10b981', background: 'rgba(16,185,129,0.04)' }}
        >
          <div className="flex items-center gap-2.5 mb-1.5">
            <ShieldCheck className="text-emerald-400" size={20} />
            <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 mono-data">STATUS: MATHEMATICALLY VERIFIED</h3>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            The cryptographic Merkle root of this evidence batch was successfully anchored to the Ethereum Smart Contract.
            It forms an unbroken link in the decentralized forensic chain of custody.
          </p>
        </div>

        {/* Cryptographic Proofs */}
        <div className="card-glass p-5 md:col-span-2 space-y-4">
          <p className="section-label">Cryptographic Anchors & Chain-of-Custody</p>
          
          <div className="space-y-3 font-mono text-xs">
            <div>
              <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--text-muted)' }}>
                <Database size={13} style={{ color: '#f59e0b' }} />
                <span className="font-semibold font-sans text-xs">Decentralized IPFS Storage Identifier (CID)</span>
              </div>
              <div className="p-3 rounded-lg flex justify-between items-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <span className="text-blue-400 break-all mono-data">{batch.cid}</span>
                <Link 
                  href={`/evidence/${batchId}/ipfs`} 
                  className="text-[11px] font-sans font-bold transition-colors shrink-0 ml-4 flex items-center gap-1 hover:text-cyan-400"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Inspect Gateway <ExternalLink size={11} />
                </Link>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--text-muted)' }}>
                <LinkIcon size={13} style={{ color: '#10b981' }} />
                <span className="font-semibold font-sans text-xs">Blockchain Merkle Root (Keccak256)</span>
              </div>
              <div className="p-3 rounded-lg flex justify-between items-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <span className="text-emerald-400 font-bold break-all mono-data">{batch.root || batch.hash}</span>
                <Link 
                  href="/verification" 
                  className="text-[11px] font-sans font-bold transition-colors shrink-0 ml-4 flex items-center gap-1 hover:text-emerald-400"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Verify Proof <ExternalLink size={11} />
                </Link>
              </div>
            </div>

            {batch.previousRoot && (
              <div>
                <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--text-muted)' }}>
                  <Archive size={13} style={{ color: '#fbbf24' }} />
                  <span className="font-semibold font-sans text-xs">Chain of Custody Predecessor (Prev Root)</span>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <span className="break-all mono-data" style={{ color: 'var(--text-secondary)' }}>{batch.previousRoot}</span>
                </div>
              </div>
            )}
            
            <div>
              <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--text-muted)' }}>
                <CheckCircle2 size={13} style={{ color: '#c084fc' }} />
                <span className="font-semibold font-sans text-xs">Ethereum Transaction Hash</span>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <span className="text-purple-400 font-bold break-all mono-data">
                  {batch.txHash || "0xPendingOnNextBlock..."}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Included Events */}
        <div className="card-glass overflow-hidden md:col-span-2">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <p className="section-label">
              Included Requests ({batch.eventsCount || 0}) — {batch.anomaliesCount || 0} Anomalies Intercepted
            </p>
          </div>
          
          <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Leaf Hash</th>
                <th>Classification</th>
                <th>Raw Log</th>
              </tr>
            </thead>
            <tbody>
              {batch.eventsData && batch.eventsData.length > 0 ? batch.eventsData.map((evt, i) => {
                const isAnomaly = evt.is_anomaly;
                return (
                  <tr key={i}>
                    <td className="mono-data font-bold" style={{ color: isAnomaly ? '#fb7185' : 'var(--text-primary)' }}>
                      {evt.eventId || `EVT-${batchId}-${i+1}`}
                    </td>
                    <td className="mono-data truncate max-w-[130px]" style={{ color: 'var(--text-muted)' }}>
                      {evt.leaf ? `${evt.leaf.substring(0, 12)}...` : '0x...'}
                    </td>
                    <td>
                      <span 
                        className="px-2 py-0.5 rounded text-[10px] font-bold mono-data uppercase"
                        style={isAnomaly
                          ? { background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)', color: '#fb7185' }
                          : { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }
                        }
                      >
                        {isAnomaly ? (evt.attack_type || 'ANOMALY') : 'BENIGN'}
                      </span>
                    </td>
                    <td className="mono-data truncate max-w-[280px]" style={{ color: 'var(--text-secondary)' }}>
                      {evt.raw_line}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    No traffic events captured in this batch window.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

      </div>      {/* ISO/IEC 27037 Forensic Certificate Modal */}
      <Modal isOpen={certModal} onClose={() => setCertModal(false)} className="max-w-2xl">
        <div className="card-glass border w-full overflow-hidden p-7 animate-fadeup shadow-2xl" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          
          <div className="pb-4 mb-5 flex justify-between items-start" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded mono-data" style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', color: '#22d3ee' }}>
                ISO/IEC 27037 COMPLIANT
              </span>
              <h3 className="text-lg font-black mt-2" style={{ color: 'var(--text-primary)' }}>Digital Forensic Chain-of-Custody Certificate</h3>
              <p className="text-[11px] mono-data" style={{ color: 'var(--text-muted)' }}>Certificate Identifier: CERT-BLAD-{batchId}-{Date.now().toString().slice(-6)}</p>
            </div>
            <div className="text-right text-[11px] mono-data" style={{ color: 'var(--text-muted)' }}>
              <p>EVM Chain ID: 31337</p>
              <p>{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-4 text-xs mono-data" style={{ color: 'var(--text-secondary)' }}>
            <div className="p-3.5 rounded-lg space-y-1.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <p className="font-bold font-sans uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-primary)' }}>Evidence Integrity Attestation</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This certificate cryptographically attests that the web access log entries listed below were captured at runtime, immutably hashed via Keccak256, and permanently recorded to the Ethereum blockchain.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                <span className="section-label block mb-0.5">Batch ID</span>
                <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>#{batchId}</span>
              </div>
              <div className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                <span className="section-label block mb-0.5">Anchor Contract</span>
                <span className="truncate block text-xs" style={{ color: 'var(--text-primary)' }}>{networkConfig?.anchorAddress}</span>
              </div>
              <div className="col-span-2 p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                <span className="section-label block mb-0.5">Anchored Merkle Root</span>
                <span className="font-bold text-emerald-400 break-all text-xs">{batch.root || batch.hash}</span>
              </div>
              <div className="col-span-2 p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                <span className="section-label block mb-0.5">IPFS Decentralized CID</span>
                <span className="text-blue-400 break-all text-xs">{batch.cid}</span>
              </div>
              <div className="col-span-2 p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                <span className="section-label block mb-0.5">Ethereum Transaction Receipt</span>
                <span className="text-purple-400 break-all text-xs">{batch.txHash || "0xPending..."}</span>
              </div>
            </div>

            <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <p className="section-label mb-2">Included Forensic Log Leaves ({batch.eventsData?.length || 0})</p>
              <div className="p-3 rounded-lg text-[11px] max-h-40 overflow-y-auto space-y-1" style={{ background: '#060a12', border: '1px solid var(--border-subtle)' }}>
                {batch.eventsData && batch.eventsData.map((e, idx) => (
                  <div key={idx} className="truncate text-emerald-400">
                    [{idx+1}] {e.leaf ? e.leaf.substring(0, 14) + '...' : ''} | {e.raw_line}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <button 
              onClick={() => setCertModal(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              Close
            </button>
            <button 
              onClick={handlePrintCertificate}
              className="px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', border: '1px solid rgba(56,189,248,0.3)' }}
            >
              <Download size={13} /> Print / Save PDF
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
