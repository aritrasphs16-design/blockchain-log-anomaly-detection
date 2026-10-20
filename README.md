# BLAD: Blockchain Log Anomaly Detection & Decentralized Defense Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.4-black)](https://nextjs.org/)
[![Ethereum](https://img.shields.io/badge/Ethereum-Hardhat-purple)](https://hardhat.org/)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-yellow.svg)](https://www.python.org/)
[![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED)](https://www.docker.com/)

**BLAD** (Blockchain Log Anomaly Detection) is an end-to-end decentralized cybersecurity framework that combines real-time machine learning anomaly detection, cryptographic Merkle tree integrity proofs, immutable IPFS decentralized storage, and Ethereum smart contract stake-and-slash governance for autonomous defense against cyber attacks.

---

## Architecture Overview

```
                      ┌─────────────────────────────────────────┐
                      │          Incoming User Traffic          │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │    Target Web Application (:8080)       │
                      │  - Express REST & Attack Simulator      │
                      │  - Autonomous Dynamic IP Firewall       │
                      └────────────────────┬────────────────────┘
                                           │ Structured Log Stream
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │   Monitoring Agent Daemon (:4000)       │
                      └─────┬─────────────────────────────┬─────┘
                            │                             │
               (Batch Logs) │                             │ (Analyze Request)
                            ▼                             ▼
  ┌───────────────────────────────┐             ┌───────────────────────────────┐
  │   Cryptographic Pipeline      │             │  Tri-Model ML Engine (:5000)  │
  │  - Keccak256 Hashing          │             │  - Random Forest (Supervised) │
  │  - Merkle Tree Batching       │             │  - Isolation Forest (Unsup.)  │
  │  - IPFS Content ID (CID)      │             │  - MLP Temporal Sequence      │
  └───────────────┬───────────────┘             └───────────────┬───────────────┘
                  │                                             │
                  ▼                                             ▼
  ┌───────────────────────────────┐             ┌───────────────────────────────┐
  │   Smart Contract Layer (:8545)│             │  Decentralized Frontend (:3000)│
  │  - AdvancedLogAnchor.sol      │◄────────────┤  - Real-time Cyber Radar      │
  │  - $LOG ERC-20 Staking Escrow │             │  - Interactive Merkle Verifier│
  │  - On-Chain Merkle Proof Slash│             │  - MetaMask Slashing Terminal │
  └───────────────────────────────┘             └───────────────────────────────┘
```

---

## Core Features

- **Tri-Model Ensemble Machine Learning Engine**:
  - **Random Forest**: Supervised signature identification for SQL Injection, XSS, and Path Traversal.
  - **Isolation Forest**: Unsupervised structural and behavioral anomaly detection establishing dynamic traffic baselines.
  - **MLP Sequence Model**: Rolling temporal window analysis to detect distributed and low-and-slow brute force attacks.
  - **Score Fusion**: Weighted averaging preventing single-model false positives.

- **Cryptographic Chain-of-Custody**:
  - Every access log entry is hashed into a Keccak256 leaf.
  - Leaves are compiled into an OpenZeppelin-compatible Merkle tree.
  - Batch evidence is archived and pinned to IPFS, yielding an immutable Content Identifier (CID).
  - Merkle roots are anchored on-chain with preceding root hashes, creating an unbreakable chain-of-custody.

- **On-Chain Staking & Autonomous Slashing Governance**:
  - Edge servers lock 500 `$LOG` tokens in escrow via the `AdvancedLogAnchor` smart contract.
  - When an unmitigated attack occurs, independent auditors can submit cryptographic Merkle proofs to the contract.
  - The smart contract verifies the proof on-chain, slashes the server's stake, mints a 100 `$LOG` bounty reward to the auditor, and instructs the gateway firewall to block the attacker IP immediately.

- **Next.js 16 Security Command Center**:
  - Real-time Server-Sent Events (SSE) streaming telemetry.
  - Live Cyber Threat Radar and Recharts streaming activity metrics.
  - Interactive in-browser Merkle tree recalculation engine and leaf editor (simulate tampering in real-time).
  - ISO/IEC 27037 Digital Forensic Chain-of-Custody Certificate generator.

---

## Directory Structure

```
blad_project/
├── contracts_layer/      # Hardhat project, Solidity smart contracts ($LOG, Anchor)
├── ml_engine/            # Python Flask ML microservice (RF, IF, Sequence)
├── server_agent/         # Node.js monitor daemon, IPFS archiver, Merkle builder
├── target_website/       # Protected application, attack simulator, firewall
├── frontend/             # Next.js 16 React 19 cybernetic control center
├── docker-compose.yml    # Orchestration configuration for all 5 microservices
├── demo_start.bat        # Local Windows native launcher (starts services in parallel)
├── start.bat             # Docker Compose background startup script
├── stop.bat              # Docker Compose shutdown script
└── .env.example          # Environment variable template
```

---

## Quick Start

### Option A: Docker Compose (Recommended)

Ensure Docker Desktop is running, then run:

```bash
docker compose up --build -d
```

To stop all services:
```bash
docker compose down
```

### Option B: Local Development (Windows)

1. **Prerequisites**: Node.js 18+, Python 3.10+, MetaMask extension installed in your browser.
2. Run the automated demo launcher:
   ```cmd
   demo_start.bat
   ```
3. Open your browser and navigate to:
   - **Dashboard**: [http://localhost:3000](http://localhost:3000)
   - **Target Web Application**: [http://localhost:8080](http://localhost:8080)
   - **Agent API**: [http://localhost:4000](http://localhost:4000)
   - **ML Engine**: [http://localhost:5000](http://localhost:5000)
   - **Hardhat RPC**: [http://localhost:8545](http://localhost:8545)

---

## Interacting with the Platform

1. **Connect MetaMask**:
   - In the top right corner of the dashboard, connect your MetaMask wallet.
   - Set network RPC to `http://127.0.0.1:8545` (Chain ID: `31337`).
   - Click **+ Faucet** on the top bar to claim demo ETH (for gas) and 200 `$LOG` tokens.

2. **Trigger Simulated Cyber Attacks**:
   - On the Overview Dashboard, use the **Attack Simulator** to trigger SQL Injection, Brute Force, XSS, or Path Traversal.
   - Watch the **Threat Radar** intercept vectors in real-time and observe the **ML Confidence Engine** score anomaly risk.

3. **Verify Merkle Proofs & Slashing**:
   - Navigate to **Merkle Verification** (`/verification`) to edit log leaves and verify cryptographic divergence in browser.
   - Navigate to **Live Events** (`/audit`) to authorize an on-chain slashing penalty with MetaMask.

---

## License

This project is released under the [MIT License](LICENSE).
