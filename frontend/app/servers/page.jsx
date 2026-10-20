"use client";

import { useState, useEffect } from "react";
import { useSSE } from "../../components/SSEProvider";
import { Server, Activity, ShieldCheck, ShieldAlert, Plus, ShieldX, RefreshCw, Radio } from "lucide-react";
import { PageHeader, Badge, EmptyState, Modal } from "../../components/ui";

export default function ServersPage() {
  const { totalRequests, anomalies, status, networkConfig, account, refreshBalance } = useSSE();
  const [servers, setServers] = useState([]);
  const [firewallStatus, setFirewallStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stakeModal, setStakeModal] = useState(false);
  const [newNodeId, setNewNodeId] = useState("");
  const [stakingLoading, setStakingLoading] = useState(false);

  const fetchServersAndFirewall = async () => {
    setLoading(true);
    try {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:4000";
      const targetUrl = process.env.NEXT_PUBLIC_TARGET_URL || "http://localhost:8080";

      // 1. Fetch servers from agent
      const srvRes = await fetch(`${agentUrl}/servers`).catch(() => null);
      if (srvRes && srvRes.ok) {
        const srvData = await srvRes.json();
        setServers(srvData);
      }

      // 2. Fetch firewall status from target website
      const fwRes = await fetch(`${targetUrl}/firewall/status`).catch(() => null);
      if (fwRes && fwRes.ok) {
        const fwData = await fwRes.json();
        setFirewallStatus(fwData);
      }
    } catch (e) {
      console.warn("Could not fetch server fleet info:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServersAndFirewall();
    const interval = setInterval(fetchServersAndFirewall, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStakeNewServer = async () => {
    if (!account) {
      alert("Please connect your MetaMask wallet to stake a server!");
      return;
    }
    if (!newNodeId.trim()) {
      alert("Please enter a Node Name or ID.");
      return;
    }

    setStakingLoading(true);
    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const anchorAddress = networkConfig?.anchorAddress;
      const tokenAddress = networkConfig?.logTokenAddress;
      
      if (!anchorAddress || !tokenAddress) {
        throw new Error("Smart contract configuration is not loaded yet. Please wait for agent connection.");
      }
      
      const tokenContract = new ethers.Contract(tokenAddress, networkConfig.logTokenAbi, signer);
      const anchorContract = new ethers.Contract(anchorAddress, networkConfig.anchorAbi, signer);

      // Approve 500 LOG
      console.log("Approving 500 LOG for staking...");
      const approveTx = await tokenContract.approve(anchorAddress, ethers.parseEther("500"));
      await approveTx.wait();

      // Stake Server
      console.log("Staking server on-chain...");
      const stakeTx = await anchorContract.stakeServer(newNodeId.trim());
      await stakeTx.wait();

      alert(`Success! Node '${newNodeId}' has been staked with 500 $LOG on the blockchain.`);
      setStakeModal(false);
      setNewNodeId("");
      await refreshBalance(account);
      await fetchServersAndFirewall();
    } catch (err) {
      console.error("Staking failed:", err);
      alert(`Staking failed: ${err?.reason || err?.message}`);
    } finally {
      setStakingLoading(false);
    }
  };

  return (
    <div className="stack stack-5 animate-fadeup">
      
      {/* Header */}
      <PageHeader
        eyebrow="Fleet"
        title="Monitored Fleet & Autonomous Defense"
        description="Real-time inventory of all staked edge nodes and active blockchain firewall quarantines."
        icon={<Server size={19} style={{ color: 'var(--accent)' }} />}
        actions={
          <div className="toolbar">
            <button 
              onClick={fetchServersAndFirewall}
              className="btn btn-sm"
              title="Refresh Fleet"
              aria-label="Refresh Fleet"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button 
              onClick={() => setStakeModal(true)}
              className="btn btn-sm btn-primary"
            >
              <Plus size={13} /> Stake New Edge Node
            </button>
          </div>
        }
      />

      {/* Fleet Grid */}
      <div className="grid grid-cols-1 gap-4">
        {servers.length > 0 ? servers.map((srv, idx) => {
          const isSlashed = !srv.isStaked;
          return (
            <div 
              key={idx} 
              className="card-glass p-5 border-l-4 transition-all"
              style={{
                borderLeftColor: isSlashed ? '#f43f5e' : '#10b981',
                background: isSlashed ? 'rgba(244,63,94,0.04)' : 'var(--bg-surface)'
              }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3 className="text-sm font-black mono-data flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <Radio size={14} className={isSlashed ? "text-rose-500" : "text-emerald-400 animate-pulse"} />
                      {srv.serverId || `node-${srv.address.substring(0, 6)}`}
                    </h3>
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase mono-data"
                      style={isSlashed 
                        ? { background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)', color: '#fb7185' }
                        : { background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }
                      }
                    >
                      {isSlashed ? 'STAKE SLASHED' : 'ACTIVE & STAKED'}
                    </span>
                  </div>
                  <p className="text-xs mono-data" style={{ color: 'var(--text-muted)' }}>
                    Node Signer: <span style={{ color: 'var(--text-secondary)' }}>{srv.address}</span>
                  </p>
                  <p className="text-[11px] mono-data mt-1 truncate max-w-lg" style={{ color: 'var(--text-muted)' }}>
                    Anchor Root: <span style={{ color: '#38bdf8' }}>{srv.currentMerkleRoot || "Awaiting first batch..."}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 text-xs mono-data">
                  <div className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                    <span className="section-label block mb-1">Stake Status</span>
                    <span className="font-bold text-sm" style={{ color: isSlashed ? '#fb7185' : '#34d399' }}>
                      {srv.stakeAmount || (isSlashed ? '0 LOG' : '500.0 LOG')}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                    <span className="section-label block mb-1">Threat Count</span>
                    <span className="font-bold text-sm" style={{ color: anomalies > 0 ? '#fbbf24' : 'var(--text-primary)' }}>{anomalies}</span>
                  </div>
                  <div className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                    <span className="section-label block mb-1">Requests</span>
                    <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{totalRequests}</span>
                  </div>
                  <div className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                    <span className="section-label block mb-1">Node Uptime</span>
                    <span className="font-bold text-sm text-emerald-400">99.98%</span>
                  </div>
                </div>

              </div>
            </div>
          );
        }) : (
          <div className="card-glass p-8">
            <EmptyState
              icon={<Server size={28} />}
              title="Connecting to Server Fleet telemetry..."
              description="Listening for heartbeat reports and registered nodes from the agent network."
            />
          </div>
        )}
      </div>

      {/* Autonomous Firewall Card */}
      <div className="card-glass p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(244,63,94,0.1)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.2)' }}>
              <ShieldX size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Autonomous Blockchain Firewall</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Live IP quarantine enforcement synced with smart contract slashing events.</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded text-xs font-bold mono-data" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
            Quarantined: <span className="text-rose-400">{firewallStatus?.quarantinedCount || 0}</span> IPs
          </span>
        </div>

        {firewallStatus && firewallStatus.history && firewallStatus.history.length > 0 ? (
          <div className="space-y-2 mt-3 mono-data text-xs">
            {firewallStatus.history.map((ev, i) => (
              <div key={i} className="p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider" style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)', color: '#fb7185' }}>BLOCKED</span>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{ev.ip}</span>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>— {ev.reason}</span>
                </div>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{new Date(ev.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-xs mono-data rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            No active IP quarantines. Any smart contract slash event will instantly trigger automated gateway-level blocking here.
          </div>
        )}
      </div>      {/* Staking Modal */}
      <Modal isOpen={stakeModal} onClose={() => setStakeModal(false)} className="max-w-md">
        <div className="card-glass border w-full overflow-hidden p-6 animate-fadeup shadow-2xl" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl" style={{ background: 'rgba(6,182,212,0.1)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.2)' }}>
              <Server size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Stake New Edge Server</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Deposit 500 $LOG into the LogAnchor contract.</p>
            </div>
          </div>

          <div className="space-y-4 text-xs mono-data">
            <div>
              <label className="block mb-1.5 font-sans font-medium" style={{ color: 'var(--text-secondary)' }}>Server Identifier</label>
              <input 
                type="text" 
                value={newNodeId}
                onChange={(e) => setNewNodeId(e.target.value)}
                placeholder="e.g. edge-eu-central-1" 
                className="dark-input"
              />
            </div>

            <div className="p-3.5 rounded-lg space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex justify-between">
                <span className="font-sans" style={{ color: 'var(--text-muted)' }}>Required Stake:</span>
                <span className="text-cyan-400 font-bold">500.0 $LOG</span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans" style={{ color: 'var(--text-muted)' }}>Lock Mechanism:</span>
                <span style={{ color: 'var(--text-secondary)' }}>OpenZeppelin ERC-20 Escrow</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button 
              onClick={() => setStakeModal(false)}
              disabled={stakingLoading}
              className="px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
            <button 
              onClick={handleStakeNewServer}
              disabled={stakingLoading}
              className="px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-md"
              style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', border: '1px solid rgba(56,189,248,0.3)' }}
            >
              {stakingLoading ? "Authorizing Staking..." : "Approve & Stake 500 LOG"}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
