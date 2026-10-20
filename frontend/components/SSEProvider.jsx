"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import deployedContracts from '../contracts/deployedContracts.json';

const SSEContext = createContext();

export function useSSE() {
  return useContext(SSEContext);
}

export function SSEProvider({ children }) {
  const [status, setStatus] = useState("SECURE");
  const [hash, setHash] = useState("0x0000...0000");
  const [cid, setCid] = useState("N/A");
  const [anomalies, setAnomalies] = useState(0);
  const [latestEvent, setLatestEvent] = useState(null);
  const [logs, setLogs] = useState([]);
  const [rawLogs, setRawLogs] = useState([]);
  const [threatsList, setThreatsList] = useState([]);
  const [evidenceBatches, setEvidenceBatches] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("CONNECTING...");
  const [networkConfig, setNetworkConfig] = useState(deployedContracts);
  
  const [totalRequests, setTotalRequests] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [account, setAccount] = useState("");
  const [tokenBalance, setTokenBalance] = useState("0.0");
  const [networkInfo, setNetworkInfo] = useState({ chainId: "31337", name: "Hardhat Localhost" });
  const [blockchainStatus, setBlockchainStatus] = useState("CHECKING...");
  const [ipfsStatus, setIpfsStatus] = useState("STANDBY");
  const [mlStatus, setMlStatus] = useState("ONLINE");

  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:4000";

  // Live RPC health and network info checker
  useEffect(() => {
    let cancelled = false;
    const checkNetwork = async () => {
      try {
        const { ethers } = await import("ethers");
        const rpcUrl = networkConfig?.rpcUrl || "http://127.0.0.1:8545";
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const net = await provider.getNetwork();
        if (!cancelled) {
          setBlockchainStatus("CONNECTED");
          setNetworkInfo({
            chainId: net.chainId.toString(),
            name: net.chainId === 31337n ? "Hardhat Localhost" : (net.name || `Chain ${net.chainId.toString()}`)
          });
        }
      } catch (err) {
        if (!cancelled) {
          setBlockchainStatus("DISCONNECTED");
        }
      }
    };
    checkNetwork();
    const interval = setInterval(checkNetwork, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [networkConfig?.rpcUrl]);

  // Update IPFS dynamic status when CIDs appear
  useEffect(() => {
    if (cid && cid !== "N/A") {
      setIpfsStatus("CONNECTED");
    }
  }, [cid]);

  // Dynamic on-chain balance fetching using Ethers
  const refreshBalance = useCallback(async (targetAccount = account) => {
    if (!targetAccount) return;
    try {
      const { ethers } = await import("ethers");
      let provider;
      if (typeof window !== "undefined" && window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        provider = new ethers.JsonRpcProvider(networkConfig?.rpcUrl || "http://127.0.0.1:8545");
      }

      if (networkConfig?.logTokenAddress && networkConfig?.logTokenAbi) {
        const tokenContract = new ethers.Contract(networkConfig.logTokenAddress, networkConfig.logTokenAbi, provider);
        const bal = await tokenContract.balanceOf(targetAccount);
        setTokenBalance(parseFloat(ethers.formatEther(bal)).toFixed(1));
      }
    } catch (e) {
      console.warn("Could not fetch on-chain token balance:", e.message);
    }
  }, [account, networkConfig]);

  // Initial load of historical batches from agent REST endpoint
  useEffect(() => {
    fetch(`${agentUrl}/batches`)
      .then(res => res.json())
      .then(batches => {
        if (Array.isArray(batches) && batches.length > 0) {
          setEvidenceBatches(batches.reverse());
        }
      })
      .catch(() => {});
  }, [agentUrl]);

  // Auto-connect wallet if previously authorized
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" })
        .then(accounts => {
          if (accounts && accounts.length > 0) {
            setAccount(accounts[0]);
            refreshBalance(accounts[0]);
          }
        })
        .catch(() => {});

      const handleAccountsChanged = (accs) => {
        if (accs.length > 0) {
          setAccount(accs[0]);
          refreshBalance(accs[0]);
        } else {
          setAccount("");
          setTokenBalance("0.0");
        }
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        }
      };
    }
  }, [refreshBalance]);

  useEffect(() => {
    if (account) {
      refreshBalance(account);
    }
  }, [account, refreshBalance]);

  // SSE Stream
  useEffect(() => {
    let eventSource;
    let currentTraffic = 0;
    let currentAnomalies = 0;
    
    const tickInterval = setInterval(() => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setChartData(prev => {
        const newData = [...prev, { time: timeStr, Traffic: currentTraffic, Anomalies: currentAnomalies }];
        return newData.slice(-60);
      });
      currentTraffic = 0;
      currentAnomalies = 0;
    }, 1000);
    
    const connect = () => {
      setConnectionStatus("CONNECTING...");
      eventSource = new EventSource(`${agentUrl}/stream`);
      
      eventSource.onopen = () => {
        setConnectionStatus("ONLINE");
        setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: "Agent Connected" }].slice(-20));
      };

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'STATUS' || data.type === 'UPDATE') {
          if (data.config) setNetworkConfig(prev => ({ ...prev, ...data.config }));
          if (data.status) setStatus(data.status);
          if (data.hash && data.hash !== hash) {
            setHash(data.hash);
            if (data.cid) setCid(data.cid);
          }
          if (data.anomalies !== undefined) setAnomalies(data.anomalies);
          
          if (data.event) {
            setLatestEvent(data.event);
            
            if (data.event.raw_line) {
              setRawLogs(prev => [...prev, data.event].slice(-50));
            }
            setTotalRequests(prev => prev + 1);
            currentTraffic++;
            if (data.event.is_anomaly) {
              currentAnomalies++;
            }
          }
          
          if (data.log) {
            const newLog = { 
              time: new Date().toLocaleTimeString(), 
              msg: data.log,
              raw_line: data.event?.raw_line || null
            };
            setLogs(prev => [...prev, newLog].slice(-20));
            
            if (data.log.includes('🚨')) {
              setThreatsList(prev => [...prev, newLog].slice(-100));
            }
          }
        } else if (data.type === 'BATCH_ANCHORED') {
          const newBatch = {
            id: data.batchId ? data.batchId.toString() : Date.now().toString().slice(-4),
            batchId: data.batchId,
            time: new Date().toLocaleTimeString(),
            timestamp: new Date().toISOString(),
            cid: data.cid,
            root: data.hash || data.root,
            hash: data.hash || data.root,
            status: "VERIFIED",
            eventsCount: data.eventsCount,
            anomaliesCount: data.anomaliesCount,
            eventsData: data.eventsData || [],
            previousRoot: data.previousRoot,
            chainedCustodyHash: data.chainedCustodyHash,
            txHash: null
          };
          setEvidenceBatches(prev => [newBatch, ...prev.filter(b => b.id !== newBatch.id)].slice(0, 50));
          if (data.eventsData && data.eventsData.length > 0) {
            setRawLogs(prev => prev.map(item => {
              const matched = data.eventsData.find(e => e.raw_line === item.raw_line);
              if (matched) {
                return { ...item, ...matched, root: data.hash || data.root, batchId: data.batchId };
              }
              return item;
            }));
          }
        } else if (data.type === 'TX_UPDATE') {
          setEvidenceBatches(prev => 
            prev.map(b => b.id === data.batchId.toString() || b.id === data.batchId ? { ...b, txHash: data.txHash } : b)
          );
        }
      };

      eventSource.onerror = (err) => {
        setConnectionStatus("DISCONNECTED");
        eventSource.close();
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(tickInterval);
    };
  }, [agentUrl]);

  const value = {
    status,
    setStatus,
    hash,
    cid,
    anomalies,
    latestEvent,
    logs,
    rawLogs,
    threatsList,
    connectionStatus,
    totalRequests,
    chartData,
    evidenceBatches,
    networkConfig,
    tokenBalance,
    refreshBalance,
    account,
    setAccount,
    networkInfo,
    blockchainStatus,
    ipfsStatus,
    mlStatus,
    agentUrl
  };

  return (
    <SSEContext.Provider value={value}>
      {children}
    </SSEContext.Provider>
  );
}
