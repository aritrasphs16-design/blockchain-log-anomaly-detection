"use client";

import { useState, useEffect, useMemo } from "react";
import { useSSE } from "../../components/SSEProvider";
import { CheckSquare, ShieldCheck, ShieldAlert, RefreshCw, Edit3, ArrowRight, Binary } from "lucide-react";
import { ethers } from "ethers";
import { PageHeader, Badge } from "../../components/ui";

// Pure native OpenZeppelin-compatible Merkle Tree calculation using Ethers
function hashPair(a, b) {
  const bufA = a.toLowerCase();
  const bufB = b.toLowerCase();
  if (bufA < bufB) {
    return ethers.keccak256(ethers.concat([a, b]));
  } else {
    return ethers.keccak256(ethers.concat([b, a]));
  }
}

function calculateMerkleRoot(leaves) {
  if (!leaves || leaves.length === 0) return "0x0000000000000000000000000000000000000000000000000000000000000000";
  let layer = [...leaves];
  while (layer.length > 1) {
    const nextLayer = [];
    for (let i = 0; i < layer.length; i += 2) {
      if (i + 1 < layer.length) {
        nextLayer.push(hashPair(layer[i], layer[i + 1]));
      } else {
        nextLayer.push(layer[i]);
      }
    }
    layer = nextLayer;
  }
  return layer[0];
}

export default function VerificationPage() {
  const { evidenceBatches } = useSSE();
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [editedLogs, setEditedLogs] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);

  // Default to first batch if none selected
  const activeBatchId = selectedBatchId || (evidenceBatches && evidenceBatches.length > 0 ? evidenceBatches[0].id : null);
  const activeBatch = evidenceBatches?.find(b => b.id === activeBatchId || b.batchId?.toString() === activeBatchId);

  // Initialize or reset edited logs when batch changes
  useEffect(() => {
    if (activeBatch && activeBatch.eventsData) {
      setEditedLogs(activeBatch.eventsData.map(e => e.raw_line || ""));
      setEditingIndex(null);
    }
  }, [activeBatchId, activeBatch]);

  // Compute live Merkle tree from the current state of editedLogs
  const verificationResult = useMemo(() => {
    if (!editedLogs || editedLogs.length === 0 || !activeBatch) {
      return { computedRoot: "N/A", isValid: false, leaves: [] };
    }

    try {
      const leaves = editedLogs.map(line => ethers.keccak256(ethers.toUtf8Bytes(line)));
      const computedRoot = calculateMerkleRoot(leaves);
      const storedRoot = activeBatch.root || activeBatch.hash || "0x0";
      
      const isValid = computedRoot.toLowerCase() === storedRoot.toLowerCase();
      
      return {
        computedRoot,
        storedRoot,
        isValid,
        leaves
      };
    } catch (e) {
      console.error("Merkle computation error:", e);
      return { computedRoot: "Error", isValid: false, leaves: [] };
    }
  }, [editedLogs, activeBatch]);

  const handleLogChange = (index, newText) => {
    setEditedLogs(prev => {
      const updated = [...prev];
      updated[index] = newText;
      return updated;
    });
  };

  const resetToAuthentic = () => {
    if (activeBatch && activeBatch.eventsData) {
      setEditedLogs(activeBatch.eventsData.map(e => e.raw_line || ""));
      setEditingIndex(null);
    }
  };

  const simulateHackerTamper = () => {
    if (editedLogs.length > 0) {
      // Modify first log line to simulate erasing evidence
      const original = editedLogs[0];
      const tampered = original.replace(/(OR 1=1|admin'|<script>|401|500)/i, '200') + " [ERASED_BY_ATTACKER]";
      handleLogChange(0, tampered);
    }
  };

  return (
    <div className="stack stack-5 animate-fadeup">
      
      {/* Header and Controls */}
      <PageHeader
        eyebrow="Verification"
        title="Interactive Merkle Integrity Verifier"
        description="Independently re-compute Keccak256 cryptographic hashes in your browser to verify or prove log tampering."
        icon={<CheckSquare size={19} style={{ color: 'var(--ok)' }} />}
        actions={
          <div className="toolbar">
            <button 
              onClick={resetToAuthentic}
              className="btn btn-sm"
              title="Reset Authentic"
            >
              <RefreshCw size={12} /> Reset Authentic
            </button>
            <button 
              onClick={simulateHackerTamper}
              className="btn btn-sm btn-danger"
              title="Inject Hacker Tampering"
            >
              <Edit3 size={12} /> Inject Hacker Tampering
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Verification Engine Status Card */}
        <div 
          className="card-glass p-5 md:col-span-2 border-l-4 transition-all"
          style={{
            borderLeftColor: verificationResult.isValid ? '#10b981' : '#f43f5e',
            background: verificationResult.isValid ? 'rgba(16,185,129,0.04)' : 'rgba(244,63,94,0.06)'
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                {verificationResult.isValid ? (
                  <ShieldCheck className="text-emerald-400" size={20} />
                ) : (
                  <ShieldAlert className="text-rose-500 animate-pulse" size={20} />
                )}
                <h3 
                  className="text-sm font-black tracking-wider uppercase mono-data"
                  style={{ color: verificationResult.isValid ? '#34d399' : '#fb7185' }}
                >
                  {verificationResult.isValid 
                    ? "STATUS: CRYPTOGRAPHIC INTEGRITY CONFIRMED" 
                    : "STATUS: TAMPER DETECTED — REJECTED ON BLOCKCHAIN"}
                </h3>
              </div>
              <p className="text-xs mono-data" style={{ color: 'var(--text-muted)' }}>
                {verificationResult.isValid 
                  ? "Every single log entry's Keccak256 hash matches the immutable root anchored on Ethereum."
                  : "One or more log bytes have been modified! The resulting root diverges from the smart contract anchor."}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-sans" style={{ color: 'var(--text-muted)' }}>Batch:</span>
              <select 
                value={activeBatchId || ""}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="dark-input py-1.5 px-3 text-xs w-auto cursor-pointer"
              >
                {(!evidenceBatches || evidenceBatches.length === 0) && (
                  <option value="">Waiting for batches...</option>
                )}
                {evidenceBatches && evidenceBatches.map(b => (
                  <option key={b.id} value={b.id} style={{ background: '#0d1424' }}>Batch #{b.id} ({b.time || b.timestamp?.substring(11, 19)})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-4 font-mono text-xs" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <p className="section-label mb-1">Stored On-Chain Root (Smart Contract)</p>
              <p className="font-bold text-emerald-400 break-all">{verificationResult.storedRoot || "Waiting for batch..."}</p>
            </div>
            <div 
              className="p-3 rounded-lg"
              style={{ 
                background: verificationResult.isValid ? 'var(--bg-elevated)' : 'rgba(244,63,94,0.1)',
                border: verificationResult.isValid ? '1px solid var(--border-subtle)' : '1px solid rgba(244,63,94,0.3)'
              }}
            >
              <p className="section-label mb-1">Computed Merkle Root (Client Browser)</p>
              <p className="font-bold break-all" style={{ color: verificationResult.isValid ? '#34d399' : '#fb7185' }}>
                {verificationResult.computedRoot}
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Leaf Editor */}
        <div className="card-glass p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="section-label flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <Binary size={14} className="text-cyan-400" /> Log Leaves in Batch ({editedLogs.length})
            </p>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Type in any field to test instant cryptographic divergence</span>
          </div>

          <div className="space-y-3">
            {editedLogs.map((logLine, idx) => {
              const authenticLine = activeBatch?.eventsData?.[idx]?.raw_line || "";
              const isModified = logLine !== authenticLine;
              const leafHash = verificationResult.leaves?.[idx] || "0x0";

              return (
                <div 
                  key={idx} 
                  className="p-3.5 rounded-xl transition-all"
                  style={{
                    background: isModified ? 'rgba(244,63,94,0.06)' : 'var(--bg-elevated)',
                    border: isModified ? '1px solid rgba(244,63,94,0.35)' : '1px solid var(--border-subtle)'
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mono-data" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}>
                        {idx + 1}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>Leaf Keccak256:</span>
                      <span className="font-bold mono-data" style={{ color: isModified ? '#fb7185' : '#38bdf8' }}>
                        {leafHash.substring(0, 18)}...{leafHash.substring(leafHash.length - 6)}
                      </span>
                    </div>
                    {isModified && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mono-data" style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#fb7185' }}>
                        TAMPERED LOG BYTE
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input 
                      type="text" 
                      value={logLine} 
                      onChange={(e) => handleLogChange(idx, e.target.value)}
                      className="dark-input"
                      style={isModified ? { borderColor: 'rgba(244,63,94,0.5)', color: '#fb7185' } : {}}
                    />
                  </div>

                  {isModified && (
                    <div className="mt-2 text-[11px] font-mono flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                      <span className="font-sans">Authentic Original:</span>
                      <span className="truncate max-w-xl px-2 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>{authenticLine}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
