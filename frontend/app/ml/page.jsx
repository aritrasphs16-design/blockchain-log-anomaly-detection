"use client";

import { BrainCircuit, Activity, LineChart, Network, Zap, CheckCircle2, ChevronRight } from "lucide-react";
import { PageHeader, Badge, LiveDot } from "../../components/ui";

export default function MLAnalysisPage() {
  
  return (
    <div className="stack stack-5 animate-fadeup">

      {/* Header Section */}
      <PageHeader
        eyebrow="Machine Learning"
        title="ML Detection Architecture"
        description="Inside the AI ensemble powering the BLAD anomaly detection engine. Traffic is evaluated in real-time across three parallel neural and statistical models."
        icon={<BrainCircuit size={19} style={{ color: 'var(--violet)' }} />}
        actions={
          <Badge tone="ok" icon={<LiveDot tone="live" />}>
            All Models Active
          </Badge>
        }
      />

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* RF Model */}
        <div className="card-glass p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa' }}>
              <Network size={20} />
            </div>
            <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded mono-data" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
              <CheckCircle2 size={11} /> ONLINE
            </span>
          </div>

          <h3 className="text-sm font-black mono-data mb-1.5" style={{ color: 'var(--text-primary)' }}>Random Forest</h3>
          <p className="text-xs mb-5 leading-relaxed h-14" style={{ color: 'var(--text-muted)' }}>
            Supervised classification model trained to identify known attack signatures (SQLi, XSS, Path Traversal) based on payload characteristics.
          </p>
          
          <div className="space-y-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <div className="flex justify-between text-[10px] uppercase font-bold mono-data mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>Precision</span>
                <span className="text-blue-400">94.2%</span>
              </div>
              <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-1.5 rounded-full" style={{ width: '94.2%', background: '#3b82f6', boxShadow: '0 0 8px rgba(59,130,246,0.5)' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] uppercase font-bold mono-data mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>Recall</span>
                <span className="text-blue-400">92.8%</span>
              </div>
              <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-1.5 rounded-full" style={{ width: '92.8%', background: '#60a5fa' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* IF Model */}
        <div className="card-glass p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' }}>
              <Activity size={20} />
            </div>
            <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded mono-data" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
              <CheckCircle2 size={11} /> ONLINE
            </span>
          </div>

          <h3 className="text-sm font-black mono-data mb-1.5" style={{ color: 'var(--text-primary)' }}>Isolation Forest</h3>
          <p className="text-xs mb-5 leading-relaxed h-14" style={{ color: 'var(--text-muted)' }}>
            Unsupervised behavioral detector that establishes a baseline of normal traffic and flags structural anomalies without predefined rules.
          </p>
          
          <div className="space-y-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <div className="flex justify-between text-[10px] uppercase font-bold mono-data mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>Precision</span>
                <span className="text-amber-400">88.5%</span>
              </div>
              <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-1.5 rounded-full" style={{ width: '88.5%', background: '#f59e0b', boxShadow: '0 0 8px rgba(245,158,11,0.5)' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] uppercase font-bold mono-data mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>Recall</span>
                <span className="text-amber-400">95.1%</span>
              </div>
              <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-1.5 rounded-full" style={{ width: '95.1%', background: '#fbbf24' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Sequence Model */}
        <div className="card-glass p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)', color: '#c084fc' }}>
              <LineChart size={20} />
            </div>
            <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded mono-data" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
              <CheckCircle2 size={11} /> ONLINE
            </span>
          </div>

          <h3 className="text-sm font-black mono-data mb-1.5" style={{ color: 'var(--text-primary)' }}>Sequence Model (MLP)</h3>
          <p className="text-xs mb-5 leading-relaxed h-14" style={{ color: 'var(--text-muted)' }}>
            Temporal window model analyzing the rolling request sequence to detect slow, distributed, or sequential attacks like Brute Force.
          </p>
          
          <div className="space-y-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <div className="flex justify-between text-[10px] uppercase font-bold mono-data mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>Precision</span>
                <span className="text-purple-400">91.4%</span>
              </div>
              <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-1.5 rounded-full" style={{ width: '91.4%', background: '#a855f7', boxShadow: '0 0 8px rgba(168,85,247,0.5)' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] uppercase font-bold mono-data mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>Recall</span>
                <span className="text-purple-400">89.9%</span>
              </div>
              <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-1.5 rounded-full" style={{ width: '89.9%', background: '#c084fc' }}></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Score Fusion Engine Visual */}
      <div className="card-glass p-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          
          <div className="md:w-1/3">
            <p className="section-label mb-2 flex items-center gap-1.5">
              <Zap size={12} className="text-amber-400" /> Score Fusion Engine
            </p>
            <h4 className="text-base font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Ensemble Weighting</h4>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              The ML API calculates a combined risk score by applying a weighted average across all three models. This prevents a single false-positive from triggering an alert.
            </p>

            <div className="mt-5 flex items-center gap-3 p-3.5 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs mono-data" style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)', color: '#fb7185' }}>
                0.75
              </div>
              <div>
                <h4 className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>Critical Threshold Limit</h4>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Combined Risk {'>'} 0.75 flags attack to blockchain.</p>
              </div>
            </div>
          </div>

          <div className="md:w-2/3">
            <div className="space-y-4 rounded-xl p-5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              
              {/* Weight Bars */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Random Forest</span>
                    <span className="text-[10px] ml-2" style={{ color: 'var(--text-muted)' }}>(Supervised Classification)</span>
                  </div>
                  <span className="text-xs font-bold text-blue-400 mono-data">50% Weight</span>
                </div>
                <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '50%', boxShadow: '0 0 8px rgba(59,130,246,0.4)' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Isolation Forest</span>
                    <span className="text-[10px] ml-2" style={{ color: 'var(--text-muted)' }}>(Structural Behavioral)</span>
                  </div>
                  <span className="text-xs font-bold text-amber-400 mono-data">25% Weight</span>
                </div>
                <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: '25%', boxShadow: '0 0 8px rgba(245,158,11,0.4)' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Sequence Model</span>
                    <span className="text-[10px] ml-2" style={{ color: 'var(--text-muted)' }}>(Temporal Request Chain)</span>
                  </div>
                  <span className="text-xs font-bold text-purple-400 mono-data">25% Weight</span>
                </div>
                <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '25%', boxShadow: '0 0 8px rgba(168,85,247,0.4)' }}></div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
