"use client";

import { Settings, ArrowDown, UserX, Globe, FileText, BrainCircuit, ShieldAlert, Database, Link as LinkIcon, CheckSquare } from "lucide-react";
import { PageHeader, Badge } from "../../components/ui";

export default function ArchitecturePage() {
  
  const nodes = [
    { icon: <UserX size={18} />, tone: 'var(--crit)', label: "USER / ATTACKER", desc: "Initiates web request (Normal or Malicious)." },
    { icon: <Globe size={18} />, tone: 'var(--info)', label: "WEB APPLICATION", desc: "Receives the request and routes it to the backend." },
    { icon: <FileText size={18} />, tone: 'var(--text-muted)', label: "STRUCTURED LOG", desc: "Generates a structured event log detailing endpoint, IP, and method." },
    { icon: <BrainCircuit size={18} />, tone: 'var(--violet)', label: "ML ENGINE", desc: "Analyzes the log using RF, IF, and LSTM sequence models." },
    { icon: <ShieldAlert size={18} />, tone: 'var(--warn)', label: "THREAT ALERT", desc: "If anomaly detected, risk score and classification broadcasted via SSE." },
    { icon: <Database size={18} />, tone: 'var(--ok)', label: "IPFS ARCHIVE", desc: "Event logs are batched and pinned to IPFS for immutable storage." },
    { icon: <LinkIcon size={18} />, tone: 'var(--accent)', label: "BLOCKCHAIN", desc: "Merkle Root of the IPFS batch is anchored to the smart contract." },
    { icon: <CheckSquare size={18} />, tone: 'var(--ok)', label: "AUDIT & VERIFY", desc: "Forensic dashboard proves evidence integrity before slashing." }
  ];

  return (
    <div className="stack stack-5 animate-fadeup" style={{ maxWidth: '52rem', margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <PageHeader
        eyebrow="System"
        title="System Architecture & Pipeline"
        description="The lifecycle an incoming web request follows through the BLAD zero-trust verification pipeline."
        icon={<Settings size={19} />}
        actions={<Badge tone="neutral">{nodes.length} Stages</Badge>}
      />

      <div className="card-glass p-6 md:p-8 flex flex-col items-center">
        
        {nodes.map((node, idx) => (
          <div key={idx} className="flex flex-col items-center w-full max-w-lg relative">
            <div 
              className="w-full flex items-center p-4 rounded-xl z-10 transition-all group"
              style={{ 
                background: 'var(--bg-elevated)', 
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: node.tone }}
              >
                {node.icon}
              </div>
              <div className="ml-4">
                <div className="row row-2">
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>STEP {idx + 1}</span>
                  <h4 className="font-bold text-xs tracking-wider mono-data" style={{ color: 'var(--text-primary)' }}>{node.label}</h4>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{node.desc}</p>
              </div>
            </div>
            
            {idx < nodes.length - 1 && (
              <div className="flex flex-col items-center my-1.5" style={{ color: 'var(--accent-strong)' }}>
                <div className="w-[2px] h-6" style={{ background: 'linear-gradient(180deg, var(--accent-strong), var(--accent))' }}></div>
                <ArrowDown size={14} style={{ marginTop: '-3px', color: 'var(--accent)' }} />
              </div>
            )}
          </div>
        ))}

      </div>

    </div>
  );
}
