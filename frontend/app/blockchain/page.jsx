"use client";

import { useState, useEffect } from "react";
import { useSSE } from "../../components/SSEProvider";
import { Link as LinkIcon, Database, CheckCircle2, Cpu, Blocks, Gauge, RefreshCw } from "lucide-react";
import { PageHeader, StatCard, Badge, EmptyState } from "../../components/ui";

export default function BlockchainPage() {
  const { evidenceBatches, networkConfig } = useSSE();
  const [chainMetrics, setChainMetrics] = useState({
    blockNumber: "...",
    gasPrice: "...",
    totalSupply: "Loading...",
    stakedAmount: "Loading...",
    chainId: "..."
  });
  const [loading, setLoading] = useState(false);

  const fetchLiveMetrics = async () => {
    setLoading(true);
    try {
      const { ethers } = await import("ethers");
      const rpcUrl = networkConfig?.rpcUrl || "http://127.0.0.1:8545";
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      const blockNum = await provider.getBlockNumber();
      const feeData = await provider.getFeeData();
      const network = await provider.getNetwork();

      let supplyStr = "0 LOG";
      let stakeStr = "0.0 LOG";

      if (networkConfig?.logTokenAddress && networkConfig?.logTokenAbi) {
        try {
          const tokenContract = new ethers.Contract(networkConfig.logTokenAddress, networkConfig.logTokenAbi, provider);
          // Query live on-chain total supply from ERC-20 contract
          const total = await tokenContract.totalSupply();
          supplyStr = `${parseFloat(ethers.formatEther(total)).toLocaleString()} LOG`;

          // Query live on-chain protocol stake held in escrow by AdvancedLogAnchor
          if (networkConfig?.anchorAddress) {
            const staked = await tokenContract.balanceOf(networkConfig.anchorAddress);
            stakeStr = `${parseFloat(ethers.formatEther(staked)).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 4 })} LOG`;
          }
        } catch (e) {
          console.warn("Could not query dynamic on-chain token/stake metrics:", e.message);
        }
      }

      setChainMetrics({
        blockNumber: blockNum.toString(),
        gasPrice: feeData.gasPrice ? `${ethers.formatUnits(feeData.gasPrice, "gwei")} Gwei` : "1.5 Gwei",
        totalSupply: supplyStr,
        stakedAmount: stakeStr,
        chainId: network.chainId.toString()
      });
    } catch (e) {
      console.warn("Could not fetch live RPC metrics:", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveMetrics();
    const interval = setInterval(fetchLiveMetrics, 3000);
    return () => clearInterval(interval);
  }, [networkConfig]);

  return (
    <div className="stack stack-5 animate-fadeup">

      {/* Header */}
      <PageHeader
        eyebrow="Infrastructure"
        title="Blockchain Infrastructure & State Audit"
        description="Real-time inspection of Ethereum EVM block state and immutable audit contracts."
        icon={<LinkIcon size={19} style={{ color: 'var(--ok)' }} />}
        actions={
          <button
            onClick={fetchLiveMetrics}
            className="btn"
            aria-label="Refresh chain state"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh State
          </button>
        }
      />

      {/* Live Blockchain Metrics */}
      <div className="page-grid page-grid-4">
        <StatCard
          label="Current Block Height"
          value={`#${chainMetrics.blockNumber}`}
          icon={<Blocks size={15} />}
          tone="info"
        />
        <StatCard
          label="Network Gas Price"
          value={chainMetrics.gasPrice}
          icon={<Gauge size={15} />}
          tone="warn"
        />
        <StatCard
          label="Active Total Supply"
          value={chainMetrics.totalSupply}
          icon={<Cpu size={15} />}
          tone="ok"
        />
        <StatCard
          label="Protocol Staked Stake"
          value={chainMetrics.stakedAmount}
          icon={<CheckCircle2 size={15} />}
          tone="violet"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Smart Contract Config */}
        <div className="card-glass p-5 md:col-span-2">
          <p className="section-label mb-4">Smart Contract Configuration</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 font-mono text-xs">
            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <p className="section-label mb-1">Network RPC Provider</p>
              <div className="row row-2 font-bold" style={{ color: 'var(--ok)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--ok)' }}></span>
                {networkConfig?.rpcUrl || "http://127.0.0.1:8545"} (Chain ID: {chainMetrics.chainId})
              </div>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
              <p className="section-label mb-1">AdvancedLogAnchor Address</p>
              <p className="break-all" style={{ color: 'var(--accent)' }}>{networkConfig?.anchorAddress || "Deploying..."}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
              <p className="section-label mb-1">LogToken ($LOG) Address</p>
              <p className="break-all" style={{ color: 'var(--warn)' }}>{networkConfig?.logTokenAddress || "Deploying..."}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <p className="section-label mb-1">Monitored Node Signer</p>
              <p className="break-all" style={{ color: 'var(--text-secondary)' }}>{networkConfig?.serverAddress || (loading ? "Detecting Node Signer..." : "Not Connected")}</p>
            </div>
          </div>
        </div>

        {/* Recent Anchors */}
        <div className="card-glass p-5 md:col-span-2">
          <div className="row between wrap" style={{ marginBottom: '1rem' }}>
            <p className="section-label">
              Recent On-Chain Merkle Anchors ({evidenceBatches?.length || 0})
            </p>
            <Badge tone="accent">EVM · Chain {chainMetrics.chainId}</Badge>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {!evidenceBatches || evidenceBatches.length === 0 ? (
              <EmptyState
                icon={<LinkIcon size={26} />}
                title="Listening for incoming Merkle tree anchors..."
                description="Each sealed batch is written to the AdvancedLogAnchor contract with its IPFS CID for independent verification."
              />
            ) : (
              evidenceBatches.slice(0, 8).map((batch, idx) => (
                <div key={batch.id} className="p-4 rounded-xl" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                  <div className="row between wrap" style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Batch #{batch.id}</span>
                    <span className="text-[11px] mono-data" style={{ color: 'var(--text-muted)' }}>{batch.time || batch.timestamp}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Merkle Root:</span>
                      <span className="font-bold break-all" style={{ color: 'var(--ok)' }}>{batch.root || batch.hash}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>IPFS Gateway CID:</span>
                      <span className="break-all" style={{ color: 'var(--info)' }}>{batch.cid}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Transaction Hash:</span>
                      <span className="break-all" style={{ color: 'var(--violet)' }}>{batch.txHash || "0xPending..."}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
