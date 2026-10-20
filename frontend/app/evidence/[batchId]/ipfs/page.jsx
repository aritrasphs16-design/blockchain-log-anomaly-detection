"use client";

import React, { use, useState, useEffect } from "react";
import { useSSE } from "../../../../components/SSEProvider";
import { ArrowLeft, ExternalLink, RefreshCw, Copy, Check } from "lucide-react";
import Link from 'next/link';

export default function IPFSSimulationPage({ params }) {
  const { evidenceBatches } = useSSE();
  const { batchId } = use(params);
  const [ipfsData, setIpfsData] = useState(null);
  const [copied, setCopied] = useState(false);

  const batch = evidenceBatches.find(b => b.id === batchId || b.batchId?.toString() === batchId);

  useEffect(() => {
    if (batch && batch.cid && batch.cid !== "N/A") {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:4000";
      fetch(`${agentUrl}/ipfs/${batch.cid}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error("Local gateway cache miss");
        })
        .then(data => setIpfsData(data))
        .catch(() => {
          // Fallback to reconstructed batch payload if server restarted
          setIpfsData({
            batchId: batch.id,
            timestamp: batch.timestamp || batch.time,
            totalLogs: batch.eventsCount,
            anomalyCount: batch.anomaliesCount,
            merkleRoot: batch.root,
            previousRoot: batch.previousRoot || "0x0000000000000000000000000000000000000000",
            chainedCustodyHash: batch.chainedCustodyHash,
            logs: batch.eventsData ? batch.eventsData.map(evt => evt.raw_line) : []
          });
        });
    }
  }, [batch]);

  if (!batch) {
    return (
      <div className="p-12 text-center text-slate-500 font-mono">
        404 - Evidence Batch #{batchId} Not Found
      </div>
    );
  }

  const handleCopy = () => {
    if (ipfsData) {
      navigator.clipboard.writeText(JSON.stringify(ipfsData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="stack stack-5 max-w-4xl mx-auto animate-fadeup">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>IPFS Decentralized Storage Gateway</h1>
          </div>
          <p className="text-xs mt-1 mono-data break-all" style={{ color: 'var(--text-muted)' }}>CID: {batch.cid}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="btn btn-sm"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy Raw JSON"}
          </button>
          <Link 
            href={`/evidence/${batchId}`} 
            className="btn btn-sm btn-ghost"
          >
            <ArrowLeft size={12} /> Back
          </Link>
        </div>
      </div>
      
      <div className="card-glass p-5 rounded-xl overflow-x-auto shadow-2xl" style={{ background: '#050912' }}>
        <pre className="text-xs leading-relaxed mono-data" style={{ color: '#34d399' }}>
          {ipfsData ? JSON.stringify(ipfsData, null, 2) : "Fetching decentralized payload from IPFS node..."}
        </pre>
      </div>
    </div>
  );
}
