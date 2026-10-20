"use client";

import { useState } from "react";
import { ShieldAlert, Gavel, CheckCircle2, ShieldCheck, ArrowRight, ExternalLink, Flame, ShieldX, Clock, X } from "lucide-react";
import { useSSE } from "../../components/SSEProvider";
import { PageHeader, Badge, Modal } from "../../components/ui";

export default function AuditPage() {
  const { rawLogs, evidenceBatches, networkConfig, refreshBalance, account } = useSSE();
  const [activeEvent, setActiveEvent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [slashing, setSlashing] = useState(false);
  const [slashed, setSlashed] = useState({});
  const [lastTxHash, setLastTxHash] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // 1. Collect all anomalies that have been anchored in batches (guaranteed to have real Merkle proofs & roots)
  const batchAnomalies = (evidenceBatches || []).flatMap(b => 
    (b.eventsData || [])
      .filter(e => e.is_anomaly)
      .map(e => ({
        ...e,
        eventId: e.eventId || ("EVT-" + Math.abs((e.raw_line||'').split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)).toString().substring(0,5)),
        source: (e.raw_line || '').split(' ')[0] || "127.0.0.1",
        serverAddress: e.serverAddress || b.serverAddress || networkConfig?.serverAddress || "Node Address Pending",
        root: b.root || b.hash,
        batchId: b.id || b.batchId,
        isAnchored: true
      }))
  );

  // 2. Match rawLogs anomalies against evidenceBatches
  const rawAnomalies = [...(rawLogs || [])].reverse().filter(e => e.is_anomaly).map(evt => {
    const matchingBatch = (evidenceBatches || []).find(b => 
      (b.eventsData || []).some(d => d.raw_line === evt.raw_line || d.eventId === evt.eventId)
    );
    const matched = matchingBatch?.eventsData?.find(d => d.raw_line === evt.raw_line || d.eventId === evt.eventId);

    const eventId = evt.eventId || matched?.eventId || ("EVT-" + Math.abs((evt.raw_line||'').split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)).toString().substring(0,5));
    const source = (evt.raw_line || '').split(' ')[0] || "127.0.0.1";
    const serverAddress = evt.serverAddress || matched?.serverAddress || matchingBatch?.serverAddress || networkConfig?.serverAddress || "Node Address Pending";
    const root = evt.root || matched?.root || matchingBatch?.root || matchingBatch?.hash;
    const proof = evt.proof || matched?.proof;
    const leaf = evt.leaf || matched?.leaf;

    return {
      ...evt,
      eventId,
      source,
      serverAddress,
      root,
      proof,
      leaf,
      batchId: evt.batchId || matchingBatch?.id,
      isAnchored: Boolean(root && leaf)
    };
  });

  // 3. Deduplicate
  const anomalyMap = new Map();
  batchAnomalies.forEach(a => anomalyMap.set(a.raw_line || a.eventId, a));
  rawAnomalies.forEach(a => {
    const key = a.raw_line || a.eventId;
    if (!anomalyMap.has(key)) {
      anomalyMap.set(key, a);
    }
  });

  const anomalyEvents = Array.from(anomalyMap.values());

  const handleSlash = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed! Please install MetaMask to interact with the blockchain.");
      return;
    }

    if (!activeEvent) return;

    setSlashing(true);
    setErrorMessage(null);

    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const serverAddress = activeEvent.serverAddress || networkConfig?.serverAddress;
      const anchorAddress = networkConfig?.anchorAddress;
      if (!anchorAddress) {
        throw new Error("Smart contract anchor address not found. Please ensure contracts are deployed.");
      }
      const anchorAbi = networkConfig?.anchorAbi || [
        "function verifyAndSlashWithRoot(address serverAddress, bytes32 root, bytes32[] calldata proof, bytes32 maliciousLogLeaf) public",
        "function verifyAndSlash(address serverAddress, bytes32[] calldata proof, bytes32 maliciousLogLeaf) external",
        "function servers(address) view returns (bool, bytes32, uint256, string)"
      ];

      const anchorContract = new ethers.Contract(anchorAddress, anchorAbi, signer);

      // Verify server is currently staked
      const serverInfo = await anchorContract.servers(serverAddress);
      if (!serverInfo[0]) {
        throw new Error("Server stake has already been slashed for this network breach.");
      }

      // Determine the leaf hash
      let leaf = activeEvent.leaf;
      if (!leaf && activeEvent.raw_line) {
        const { keccak256 } = await import("ethers");
        leaf = keccak256(ethers.toUtf8Bytes(activeEvent.raw_line));
      }

      // Determine Merkle proof and root
      let proof = activeEvent.proof;
      let root = activeEvent.root;

      // If proof is missing or incomplete, attempt lookup in evidenceBatches
      if (!proof || proof.length === 0 || !root) {
        const matchingBatch = (evidenceBatches || []).find(b => 
          (b.eventsData || []).some(d => d.raw_line === activeEvent.raw_line || d.eventId === activeEvent.eventId)
        );
        if (matchingBatch) {
          root = matchingBatch.root || matchingBatch.hash;
          const foundEvt = matchingBatch.eventsData.find(d => d.raw_line === activeEvent.raw_line || d.eventId === activeEvent.eventId);
          if (foundEvt) {
            proof = foundEvt.proof;
            leaf = foundEvt.leaf || leaf;
          }
        }
      }

      if (!root) {
        throw new Error("This event has not been anchored to a blockchain batch yet. Please wait 1-2 seconds for the block anchor.");
      }

      console.log(`[Audit] Executing on-chain slash on Contract: ${anchorAddress}...`);
      console.log(`[Audit] Target Server: ${serverAddress}`);
      console.log(`[Audit] Root: ${root}`);
      console.log(`[Audit] Leaf: ${leaf}`);
      console.log(`[Audit] Proof:`, proof);

      let tx;
      if (typeof anchorContract.verifyAndSlashWithRoot === 'function') {
        tx = await anchorContract.verifyAndSlashWithRoot(serverAddress, root, proof || [], leaf);
      } else {
        tx = await anchorContract.verifyAndSlash(serverAddress, proof || [], leaf);
      }

      console.log(`[Audit] Transaction broadcasted. Tx: ${tx.hash}. Waiting for block confirmation...`);
      const receipt = await tx.wait();
      console.log(`[Audit] Transaction confirmed in block: ${receipt.blockNumber}`);

      setLastTxHash(tx.hash);
      setSlashed(prev => ({ ...prev, [activeEvent.eventId]: tx.hash }));

      // Trigger Autonomous Firewall block for this malicious IP
      try {
        const targetUrl = process.env.NEXT_PUBLIC_TARGET_URL || "http://localhost:8080";
        await fetch(`${targetUrl}/firewall/block`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ip: activeEvent.source,
            reason: `Slashed by Smart Contract (${activeEvent.attackType || activeEvent.attack_type})`,
            txHash: tx.hash
          })
        });
      } catch (fwErr) {
        console.warn("Autonomous firewall notify warning:", fwErr.message);
      }

      // Refresh on-chain token balance of the connected auditor
      await refreshBalance(account);
      setModalOpen(false);

    } catch (error) {
      console.error("Real on-chain slashing call error:", error);
      setErrorMessage(error?.reason || error?.message || "Transaction was rejected or reverted by smart contract.");
    } finally {
      setSlashing(false);
    }
  };

  return (
    <div className="stack stack-5 animate-fadeup">
      
      {/* Header */}
      <PageHeader
        eyebrow="Forensics & Slashing"
        title="Decentralized Audit & Slashing Terminal"
        description="Submit mathematical Merkle proofs of unmitigated cyber attacks directly to the Ethereum smart contract to confiscate server stakes."
        icon={<Gavel size={19} style={{ color: 'var(--warn)' }} />}
        actions={
          lastTxHash ? (
            <Badge tone="ok" icon={<CheckCircle2 size={11} />}>
              Last Slash · {lastTxHash.substring(0, 10)}...
            </Badge>
          ) : null
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Audit Details */}
        <div className="card-glass p-5 md:col-span-2">
          
          {anomalyEvents.length > 0 ? (
            <div className="space-y-4">
              {anomalyEvents.map((evt, idx) => {
                const eventId = evt.eventId;
                const source = evt.source;
                const attackType = evt.attack_type || evt.attackType || "Cyber Attack Anomaly";
                const isSlashed = slashed[eventId];
                const proofCount = evt.proof ? evt.proof.length : 0;
                const isReady = evt.isAnchored || (evt.root && evt.proof);

                return (
                  <div 
                    key={idx} 
                    className="p-5 rounded-xl transition-all"
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      borderRight: '1px solid var(--border-subtle)',
                      borderBottom: '1px solid var(--border-subtle)',
                      borderLeft: `4px solid ${isSlashed ? '#10b981' : '#f59e0b'}`,
                      background: isSlashed ? 'rgba(16,185,129,0.04)' : 'var(--bg-elevated)'
                    }}
                  >
                    <div className="space-y-2.5 font-mono text-xs">
                      <div className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <span className="section-label">Event ID</span>
                        <span className="text-rose-400 font-bold mono-data">{eventId}</span>
                      </div>
                      <div className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <span className="section-label">Target Node</span>
                        <span className="mono-data" style={{ color: 'var(--text-secondary)' }}>{evt.serverAddress || networkConfig?.serverAddress || "Detecting..."}</span>
                      </div>
                      <div className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <span className="section-label">Attacker IP</span>
                        <span className="mono-data font-bold" style={{ color: 'var(--text-primary)' }}>{source}</span>
                      </div>
                      <div className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <span className="section-label">Attack Classification</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold mono-data" style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)', color: '#fb7185' }}>{attackType}</span>
                      </div>
                      <div className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <span className="section-label">At-Risk Server Stake</span>
                        <span className="text-blue-400 font-bold mono-data">500.0 LOG</span>
                      </div>
                      <div className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <span className="section-label">Auditor Bounty Reward</span>
                        <span className="text-emerald-400 font-bold mono-data">+100.0 LOG</span>
                      </div>
                      <div className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <span className="section-label">Cryptographic Proof</span>
                        {isReady ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1 text-xs mono-data">
                            <ShieldCheck size={13} /> Anchored ({proofCount} Merkle branches)
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold flex items-center gap-1 text-xs mono-data animate-pulse">
                            <Clock size={13} /> Anchoring to Blockchain...
                          </span>
                        )}
                      </div>
                      <div className="py-2">
                        <span className="section-label block mb-1">Raw Payload</span>
                        <div className="p-2.5 rounded-lg text-xs overflow-x-auto mono-data" style={{ background: '#05080f', border: '1px solid var(--border-subtle)', color: '#34d399' }}>
                          <code>{evt.raw_line}</code>
                        </div>
                      </div>
                    </div>

                    {!isSlashed ? (
                      <button 
                        onClick={() => {
                          if (!account) {
                            alert("⚠️ Authorization Denied: Please connect your MetaMask Auditor Wallet in the top-right corner to authorize slashing penalties.");
                            return;
                          }
                          setActiveEvent({ 
                            eventId, 
                            source, 
                            attackType, 
                            raw_line: evt.raw_line,
                            leaf: evt.leaf,
                            proof: evt.proof,
                            root: evt.root,
                            isAnchored: evt.isAnchored,
                            serverAddress: networkConfig?.serverAddress
                          });
                          setErrorMessage(null);
                          setModalOpen(true);
                        }}
                        disabled={!isReady}
                        className="mt-4 w-full py-2.5 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-2 shadow-lg cursor-pointer disabled:cursor-not-allowed"
                        style={isReady 
                          ? { background: 'linear-gradient(135deg, #d97706 0%, #dc2626 100%)', color: '#ffffff', border: '1px solid rgba(251,191,36,0.3)' }
                          : { background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }
                        }
                      >
                        {isReady ? (
                          <>
                            <Flame size={15} /> Execute Slashing on Smart Contract <ArrowRight size={14} />
                          </>
                        ) : (
                          <>
                            <Clock size={14} className="animate-spin" /> Forming Blockchain Anchor...
                          </>
                        )}
                      </button>
                    ) : (
                      <div 
                        className="mt-4 p-3.5 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs mono-data"
                        style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-400" />
                          <span className="font-bold">SLASHER SUCCESS: Server penalized 500 LOG. 100 LOG bounty minted to your wallet.</span>
                        </div>
                        <span className="break-all" style={{ color: 'var(--text-muted)' }}>Tx: {typeof isSlashed === 'string' ? isSlashed.substring(0, 16) + '...' : 'Confirmed'}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 px-4 rounded-xl border border-dashed" style={{ borderColor: 'var(--border-subtle)', background: 'rgba(255,255,255,0.01)' }}>
              <ShieldCheck className="mx-auto text-emerald-400 mb-2" size={36} />
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>No Anomalies to Audit</p>
              <p className="text-xs mt-1 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
                All server logs match safe baseline traffic. Trigger an attack simulation from the Overview Dashboard to test the live stake & slash mechanism!
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Confirmation Modal */}
      <Modal isOpen={modalOpen && Boolean(activeEvent)} onClose={() => setModalOpen(false)} className="max-w-lg">
        <div className="card-glass border w-full overflow-hidden shadow-2xl animate-fadeup" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          <div className="p-4 flex items-center justify-between" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <ShieldAlert className="text-rose-500" size={18} />
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Confirm On-Chain Slashing Transaction</h3>
            </div>
            <button
              onClick={() => setModalOpen(false)}
              className="topbar-icon-btn"
              aria-label="Close dialog"
            >
              <X size={15} />
            </button>
          </div>
          
          <div className="p-5 space-y-3 font-mono text-xs">
            <div className="p-3.5 rounded-lg space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex justify-between">
                <span className="font-sans" style={{ color: 'var(--text-muted)' }}>Smart Contract:</span>
                <span className="text-cyan-400 font-bold">{networkConfig?.anchorAddress || "Contract Pending..."}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans" style={{ color: 'var(--text-muted)' }}>Target Server:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{activeEvent?.serverAddress || networkConfig?.serverAddress || "Detecting..."}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans" style={{ color: 'var(--text-muted)' }}>Offense:</span>
                <span className="text-rose-400 font-bold">{activeEvent?.attackType || activeEvent?.attack_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans" style={{ color: 'var(--text-muted)' }}>Penalty:</span>
                <span className="text-rose-400 font-bold">-500.0 $LOG</span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans" style={{ color: 'var(--text-muted)' }}>Auditor Reward:</span>
                <span className="text-emerald-400 font-bold">+100.0 $LOG</span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans" style={{ color: 'var(--text-muted)' }}>Proof Branches:</span>
                <span className="text-emerald-400 font-bold">{Array.isArray(activeEvent?.proof) ? `${activeEvent.proof.length} sibling hashes` : "Anchored"}</span>
              </div>
            </div>

            {activeEvent?.leaf && (
              <div>
                <p className="section-label mb-1">Calculated Leaf Hash (Keccak256)</p>
                <p className="p-2 rounded text-xs break-all" style={{ background: '#05080f', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>{activeEvent.leaf}</p>
              </div>
            )}

            {activeEvent?.root && (
              <div>
                <p className="section-label mb-1">Anchored Batch Merkle Root</p>
                <p className="p-2 rounded text-xs break-all" style={{ background: '#05080f', border: '1px solid var(--border-subtle)', color: '#34d399' }}>{activeEvent.root}</p>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded text-rose-400 flex items-start gap-2" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)' }}>
                <ShieldX size={15} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <div className="p-4 flex justify-end gap-3" style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-subtle)' }}>
            <button 
              onClick={() => setModalOpen(false)}
              disabled={slashing}
              className="px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
            <button 
              onClick={handleSlash}
              disabled={slashing}
              className="px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)', color: '#ffffff', border: '1px solid rgba(244,63,94,0.3)' }}
            >
              {slashing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Sign & Confirm with MetaMask...
                </>
              ) : (
                <>
                  <Gavel size={13} /> Authorize Slashing on Blockchain
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
