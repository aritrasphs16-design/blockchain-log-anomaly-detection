"use client";

import { useState } from "react";
import { Wallet, Bell, Search, ShieldCheck, AlertTriangle, Coins, RefreshCw, Menu } from 'lucide-react';
import { useSSE } from './SSEProvider';
import Link from 'next/link';
import { LiveDot } from './ui';

export function Topbar({ onToggleNav }) {
  const { status, anomalies, tokenBalance, refreshBalance, account, setAccount, networkConfig, networkInfo, blockchainStatus } = useSSE();
  const [faucetLoading, setFaucetLoading] = useState(false);

  const connectWallet = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          refreshBalance(accounts[0]);
        }
      } catch (error) {
        console.warn("User rejected wallet connection:", error.message);
      }
    } else {
      alert("Please install MetaMask to interact with the Blockchain!");
    }
  };

  const handleClaimFaucet = async () => {
    if (!account) {
      alert("Please connect your MetaMask wallet first!");
      return;
    }
    setFaucetLoading(true);
    try {
      const { ethers } = await import("ethers");
      const rpcUrl = networkConfig?.rpcUrl || "http://127.0.0.1:8545";
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      // Hardhat Account #0 default private key
      const deployerWallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
      
      // 1. Send 5 ETH for transaction gas fees
      const ethTx = await deployerWallet.sendTransaction({
        to: account,
        value: ethers.parseEther("5")
      });
      await ethTx.wait();

      // 2. Send 200 $LOG tokens
      const tokenContract = new ethers.Contract(networkConfig.logTokenAddress, networkConfig.logTokenAbi, deployerWallet);
      const tx = await tokenContract.transfer(account, ethers.parseEther("200"));
      await tx.wait();
      
      await refreshBalance(account);
      alert(`Success! Sent 5.0 ETH (for gas) & 200 $LOG to ${account.substring(0, 8)}...`);
    } catch (err) {
      console.error("Faucet transfer failed:", err);
      alert("Faucet transfer failed: " + (err.reason || err.message));
    } finally {
      setFaucetLoading(false);
    }
  };

  const isSecure = status === 'SECURE';
  const isChainUp = blockchainStatus === 'CONNECTED';

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Mobile navigation toggle */}
        {onToggleNav ? (
          <button
            type="button"
            onClick={onToggleNav}
            className="topbar-icon-btn topbar-hide-lg"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
        ) : null}

        <div className="topbar-search">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2" size={13} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search hashes, IPs, CIDs..."
            aria-label="Search hashes, IPs and CIDs"
          />
        </div>

        <div className="topbar-chip topbar-hide-sm">
          <LiveDot tone={isChainUp ? 'live' : 'warn'} />
          {isChainUp
            ? `Chain ${networkInfo?.chainId || '31337'} · ${networkInfo?.name || 'Localhost'}`
            : 'EVM Connecting...'}
        </div>
      </div>

      <div className="topbar-right">
        {/* Security Status */}
        <div
          className="topbar-chip topbar-hide-sm"
          style={isSecure
            ? { background: 'var(--ok-bg)', borderColor: 'var(--ok-border)', color: 'var(--ok)' }
            : { background: 'var(--crit-bg)', borderColor: 'var(--crit-border)', color: 'var(--crit)' }
          }
        >
          {isSecure ? <ShieldCheck size={12} /> : <AlertTriangle size={12} />}
          {status}
        </div>

        {/* Notifications */}
        <Link href="/threats" className="topbar-icon-btn" aria-label={`Threats${anomalies > 0 ? ` (${anomalies} active)` : ''}`}>
          <Bell size={15} />
          {anomalies > 0 && <span className="topbar-notification-dot" />}
        </Link>

        <div className="topbar-divider topbar-hide-sm" />

        {/* $LOG Balance */}
        <div className="topbar-balance">
          <Coins size={12} />
          <span>{tokenBalance} LOG</span>
          <button onClick={() => refreshBalance()} title="Refresh balance" aria-label="Refresh balance">
            <RefreshCw size={10} />
          </button>
        </div>

        {/* Faucet */}
        {account && (
          <button
            onClick={handleClaimFaucet}
            disabled={faucetLoading}
            className="btn btn-sm topbar-hide-sm"
            style={{ background: 'var(--info-bg)', borderColor: 'var(--info-border)', color: 'var(--info)', fontWeight: 700 }}
            title="Claim demo $LOG tokens"
          >
            {faucetLoading ? 'Minting...' : '+ Faucet'}
          </button>
        )}

        {/* Connect Wallet */}
        <button
          onClick={connectWallet}
          className={`topbar-wallet ${account ? 'is-connected' : ''}`}
        >
          <Wallet size={13} style={{ color: account ? 'var(--ok)' : 'var(--warn)' }} />
          <span className="topbar-hide-sm">
            {account ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}` : 'Connect Wallet'}
          </span>
        </button>
      </div>
    </header>
  );
}
