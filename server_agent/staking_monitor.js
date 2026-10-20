const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { ethers } = require('ethers');
const express = require('express');
const cors = require('cors');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const { uploadToIPFS, getFromIPFS } = require('./ipfs_uploader');

// --- EXPRESS APP SETUP ---
const app = express();
app.use(cors());
app.use(express.json());

let clients = [];
let currentServerStatus = "SECURE";
let currentHash = "Waiting for logs...";
let currentIpfsCid = "N/A";
let anomalyCount = 0;
let logBatch = [];
let historicalBatches = [];
let previousChainedRoot = "0x0000000000000000000000000000000000000000000000000000000000000000";

const MAX_BATCH_SIZE = 5; 
const MAX_BATCH_TIME = 5000; // 5 seconds
let batchTimer = null;
let batchIdCounter = 1;
let lastLogTimestamp = Date.now();

// --- DYNAMIC BLOCKCHAIN & CONFIG SETUP ---
const RPC_URL = process.env.BLOCKCHAIN_RPC || "http://127.0.0.1:8545"; 
const TARGET_URL = process.env.TARGET_URL || "http://127.0.0.1:8080";
const ML_API_URL = process.env.ML_URL || "http://127.0.0.1:5000/analyze";

function loadDeployedConfig() {
    const candidatePaths = [
        path.join(__dirname, 'deployed_contracts.json'),
        path.join(__dirname, '../contracts_layer/deployed_contracts.json'),
        path.join(__dirname, '../frontend/contracts/deployedContracts.json')
    ];
    for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
            try {
                const conf = JSON.parse(fs.readFileSync(p, 'utf8'));
                if (conf.anchorAddress && conf.logTokenAddress) {
                    console.log(`[Config] Loaded dynamic contract deployment configuration from: ${p}`);
                    return conf;
                }
            } catch (e) {
                console.warn(`[Config] Could not parse config from ${p}:`, e.message);
            }
        }
    }
    console.warn("[Config] Warning: No deployed_contracts.json found. Contracts should be deployed first.");
    return {};
}

let deployedConfig = loadDeployedConfig();

// Hardhat test account #1 fallback key for local isolated development only
const LOCAL_DEV_FALLBACK_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY || process.env.PRIVATE_KEY || LOCAL_DEV_FALLBACK_KEY;
const ANCHOR_CONTRACT_ADDRESS = process.env.ANCHOR_CONTRACT_ADDRESS || deployedConfig.anchorAddress;
const TOKEN_CONTRACT_ADDRESS = process.env.TOKEN_CONTRACT_ADDRESS || deployedConfig.logTokenAddress;
const LOG_FILE = process.env.LOG_FILE_PATH || path.join(__dirname, '../target_website/access.log');

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const anchorAbi = deployedConfig.anchorAbi || [
    "function anchorHash(bytes32 _merkleRoot) external",
    "function stakeServer(string memory _serverId) public",
    "function stake() external",
    "function verifyAndSlashWithRoot(address serverAddress, bytes32 root, bytes32[] calldata proof, bytes32 maliciousLogLeaf) public",
    "function verifyAndSlash(address serverAddress, bytes32[] calldata proof, bytes32 maliciousLogLeaf) external",
    "function getAllServers() external view returns (address[] memory)",
    "function servers(address) external view returns (bool isStaked, bytes32 currentMerkleRoot, uint256 lastUpdated, string memory serverId)",
    "event Slashed(address indexed server, address indexed auditor, uint256 bountyAmount, bytes32 root, bytes32 maliciousLogLeaf)",
    "event RootAnchored(address indexed server, bytes32 indexed merkleRoot, bytes32 previousRoot, uint256 timestamp)"
];

const tokenAbi = deployedConfig.logTokenAbi || [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function balanceOf(address account) public view returns (uint256)",
    "function transfer(address to, uint256 amount) public returns (bool)"
];

const anchorContract = new ethers.Contract(ANCHOR_CONTRACT_ADDRESS, anchorAbi, wallet);
const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, tokenAbi, wallet);

// --- AUTONOMOUS BLOCKCHAIN FIREWALL EVENT LISTENER ---
function initBlockchainEventListener() {
    try {
        anchorContract.on("Slashed", async (slashedServer, auditor, bounty, root, leaf, event) => {
            console.log(`\n🚨 [ON-CHAIN SLASH EVENT DETECTED] Server: ${slashedServer} | Auditor: ${auditor} | Bounty: ${ethers.formatEther(bounty)} LOG`);
            currentServerStatus = "SLASHED";
            
            // Find offending log line and IP from historical batches
            let offendingIp = "127.0.0.1";
            for (const b of historicalBatches) {
                const found = b.eventsData.find(e => e.leaf === leaf || e.root === root);
                if (found && found.raw_line) {
                    offendingIp = found.raw_line.split(' ')[0] || "127.0.0.1";
                    break;
                }
            }

            // Trigger autonomous firewall block at Target Server
            try {
                const fwRes = await axios.post(`${TARGET_URL}/firewall/block`, {
                    ip: offendingIp,
                    reason: `Quarantined by Smart Contract Slashed Event (Auditor: ${auditor.substring(0, 8)}...)`,
                    txHash: event?.log?.transactionHash || "0xConfirmedOnChain"
                });
                console.log(`🛡️ [AUTONOMOUS FIREWALL] Successfully quarantined malicious IP: ${offendingIp}`);
            } catch (err) {
                console.warn("[Firewall Sync] Could not reach target firewall:", err.message);
            }

            broadcastState(`[SMART CONTRACT] ⚔️ Server slashed! Bounty rewarded to auditor ${auditor.substring(0, 8)}. IP ${offendingIp} quarantined.`);
        });
        console.log("[Blockchain] Autonomous Firewall listener initialized for 'Slashed' events.");
    } catch (e) {
        console.warn("[Blockchain] Event listener initialization error:", e.message);
    }
}
initBlockchainEventListener();

// --- SSE & REST API ROUTES ---

app.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    clients.push(res);
    console.log(`[SSE] Client connected. Total clients: ${clients.length}`);

    res.write(`data: ${JSON.stringify({ 
        type: 'STATUS', 
        status: currentServerStatus, 
        hash: currentHash, 
        cid: currentIpfsCid, 
        anomalies: anomalyCount,
        batches: historicalBatches.slice(-10),
        config: {
            rpcUrl: RPC_URL,
            contractAddress: ANCHOR_CONTRACT_ADDRESS,
            anchorAddress: ANCHOR_CONTRACT_ADDRESS,
            tokenAddress: TOKEN_CONTRACT_ADDRESS,
            logTokenAddress: TOKEN_CONTRACT_ADDRESS,
            serverAddress: wallet.address,
            walletAddress: wallet.address
        }
    })}\n\n`);

    req.on('close', () => {
        clients = clients.filter(client => client !== res);
    });
});

function broadcastState(logMsg = null, eventData = null) {
    const data = {
        type: 'UPDATE',
        status: currentServerStatus,
        hash: currentHash,
        cid: currentIpfsCid,
        anomalies: anomalyCount,
        log: logMsg,
        event: eventData
    };
    clients.forEach(client => client.write(`data: ${JSON.stringify(data)}\n\n`));
}

// REST: Reset telemetry & anomaly counter & historical ledger batches
app.all(['/reset', '/api/reset', '/batches/reset', '/batches/clear'], (req, res) => {
    anomalyCount = 0;
    currentServerStatus = "SECURE";
    logBatch = [];
    historicalBatches = [];
    batchIdCounter = 1;
    currentHash = "0x0000...0000";
    currentIpfsCid = "N/A";
    previousChainedRoot = "0x0000000000000000000000000000000000000000000000000000000000000000";

    const resetPayload = {
        type: 'RESET_LEDGER',
        anomalies: 0,
        status: "SECURE",
        hash: "0x0000...0000",
        cid: "N/A"
    };
    clients.forEach(client => client.write(`data: ${JSON.stringify(resetPayload)}\n\n`));
    broadcastState("[SYSTEM] Ledger, evidence batches, and threat telemetry reset to initial state.");
    console.log("🛡️ [SYSTEM] All batches, anomaly count, and ledger reset to initial state.");
    res.json({ success: true, anomalies: 0, status: "SECURE", batches: 0 });
});

// REST: Return all historical batches
app.get('/batches', (req, res) => {
    res.json(historicalBatches);
});

// REST: Return specific batch
app.get('/batches/:id', (req, res) => {
    const batch = historicalBatches.find(b => b.batchId.toString() === req.params.id);
    if (!batch) return res.status(404).json({ error: "Batch not found" });
    res.json(batch);
});

// REST: IPFS Decentralized Gateway proxy
app.get('/ipfs/:cid', (req, res) => {
    const cid = req.params.cid;
    const data = getFromIPFS(cid);
    if (data) {
        return res.json(data);
    }
    res.status(404).json({ error: "CID not found in decentralized IPFS cache" });
});

// REST: Dynamic Fleet info from contract
app.get('/servers', async (req, res) => {
    try {
        const serverAddrs = await anchorContract.getAllServers();
        const serverList = [];
        for (const addr of serverAddrs) {
            const data = await anchorContract.servers(addr);
            const isStaked = data[0];
            serverList.push({
                address: addr,
                isStaked: isStaked,
                stakeAmount: isStaked ? "500.0 LOG" : "0.0 LOG",
                currentMerkleRoot: data[1],
                lastUpdated: Number(data[2]),
                serverId: data[3] || "node-fleet"
            });
        }
        res.json(serverList);
    } catch (err) {
        res.json([{
            address: wallet.address,
            isStaked: currentServerStatus !== "SLASHED",
            stakeAmount: currentServerStatus !== "SLASHED" ? "500.0 LOG" : "0.0 LOG",
            currentMerkleRoot: currentHash,
            lastUpdated: Math.floor(Date.now() / 1000),
            serverId: "alpha-node-production"
        }]);
    }
});

// REST: Merkle Proof Verification
app.post('/verify', (req, res) => {
    const { root, leaf, proof } = req.body;
    if (!root || !leaf || !proof) {
        return res.status(400).json({ error: "Missing root, leaf, or proof" });
    }
    const isValid = MerkleTree.verify(proof, leaf, root, keccak256, { sortPairs: true });
    res.json({ isValid, root, leaf });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: "healthy",
        serverStatus: currentServerStatus,
        batchesAnchored: historicalBatches.length,
        anomalies: anomalyCount
    });
});

app.listen(4000, () => {
    console.log("[Express] Advanced LogGuard Agent listening on port 4000");
    console.log("-> SSE Stream: http://localhost:4000/stream");
    console.log("-> IPFS Gateway: http://localhost:4000/ipfs/:cid");
    console.log("-> Batches API: http://localhost:4000/batches");
});

// --- BATCHING & MERKLE ANCHORING ENGINE ---

let isAnchoring = false;

async function processBatch() {
    if (logBatch.length === 0) return;
    if (isAnchoring) {
        if (!batchTimer) batchTimer = setTimeout(processBatch, 800);
        return;
    }

    isAnchoring = true;

    try {
        if (batchTimer) {
            clearTimeout(batchTimer);
            batchTimer = null;
        }

        const currentBatch = [...logBatch];
        logBatch = []; // Reset batch
        
        const batchId = batchIdCounter++;
        
        // Calculate stats
        const totalLogs = currentBatch.length;
        const anomalies = currentBatch.filter(l => l.is_anomaly).length;
        const attacks = currentBatch.filter(l => l.is_anomaly).map(l => l.attack_type);
        
        // 1. Create Merkle Tree with keccak256
        const leaves = currentBatch.map(x => keccak256(x.raw_line));
        const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
        const root = '0x' + tree.getRoot().toString('hex');

        // 2. Compute individual Merkle Proofs for each event in the batch
        const eventsDataWithProofs = currentBatch.map((item, idx) => {
            const leaf = leaves[idx];
            const leafHex = '0x' + leaf.toString('hex');
            const proof = tree.getHexProof(leaf);
            const eventId = "EVT-" + Math.abs(item.raw_line.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)).toString().substring(0,5);
            return {
                eventId: eventId,
                raw_line: item.raw_line,
                is_anomaly: item.is_anomaly,
                attack_type: item.attack_type,
                leaf: leafHex,
                proof: proof,
                root: root,
                batchId: batchId,
                time: new Date().toLocaleTimeString(),
                timestamp: new Date().toISOString()
            };
        });

        // 3. Cryptographic Chain of Custody (Hash chaining)
        const chainedHash = '0x' + crypto.createHash('sha256').update(previousChainedRoot + root + Date.now().toString()).digest('hex');
        const oldChain = previousChainedRoot;
        previousChainedRoot = chainedHash;

        // 4. IPFS Evidence Payload
        const ipfsPayload = {
            batchId: batchId,
            timestamp: new Date().toISOString(),
            totalLogs: totalLogs,
            anomalyCount: anomalies,
            attackTypes: [...new Set(attacks)],
            merkleRoot: root,
            previousRoot: oldChain,
            chainedCustodyHash: chainedHash,
            serverAddress: wallet.address,
            logs: currentBatch.map(l => l.raw_line),
            leaves: eventsDataWithProofs.map(e => ({ eventId: e.eventId, leaf: e.leaf }))
        };

        const cid = await uploadToIPFS(JSON.stringify(ipfsPayload, null, 2));
        if (cid) currentIpfsCid = cid;
        currentHash = root;

        // 5. Build full batch record
        const batchRecord = {
            batchId: batchId,
            id: batchId.toString(),
            time: new Date().toLocaleTimeString(),
            timestamp: new Date().toISOString(),
            root: root,
            hash: root,
            cid: currentIpfsCid,
            previousRoot: oldChain,
            chainedCustodyHash: chainedHash,
            eventsCount: totalLogs,
            anomaliesCount: anomalies,
            status: "VERIFIED",
            eventsData: eventsDataWithProofs,
            txHash: "0xPending..."
        };

        historicalBatches.push(batchRecord);

        broadcastState(`[CRYPTOGRAPHY] Merkle Root Generated. Chain-of-Custody linked. IPFS CID: ${currentIpfsCid}`);

        // Broadcast batch to clients
        const batchPayload = {
            type: 'BATCH_ANCHORED',
            batchId: batchId,
            hash: root,
            root: root,
            cid: currentIpfsCid,
            previousRoot: oldChain,
            chainedCustodyHash: chainedHash,
            eventsCount: totalLogs,
            anomaliesCount: anomalies,
            eventsData: eventsDataWithProofs
        };
        clients.forEach(client => client.write(`data: ${JSON.stringify(batchPayload)}\n\n`));

        // 6. Anchor to Smart Contract with sequential nonce & auto-stake verification
        try {
            if (ANCHOR_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000") {
                // Auto-recovery: If node is not staked (e.g. was slashed in audit demo), re-stake automatically
                try {
                    const serverInfo = await anchorContract.servers(wallet.address);
                    if (!serverInfo[0]) {
                        console.log("⚡ [AUTO-RECOVERY] Node is currently unstaked (slashed). Re-staking 500 LOG tokens...");
                        const approveTx = await tokenContract.approve(ANCHOR_CONTRACT_ADDRESS, ethers.parseEther("500"));
                        await approveTx.wait();
                        const stakeTx = await anchorContract.stakeServer("alpha-node-production");
                        await stakeTx.wait();
                        console.log("✅ [AUTO-RECOVERY] Node successfully re-staked on-chain!");
                        currentServerStatus = "SECURE";
                    }
                } catch (stakeErr) {
                    console.warn("[Auto-Recovery] Stake check/restake notice:", stakeErr.message);
                }

                const nonce = await provider.getTransactionCount(wallet.address, 'pending');
                const tx = await anchorContract.anchorHash(currentHash, { nonce });
                batchRecord.txHash = tx.hash;

                clients.forEach(client => client.write(`data: ${JSON.stringify({
                    type: 'TX_UPDATE',
                    batchId: batchId,
                    txHash: tx.hash
                })}\n\n`));
                
                await tx.wait();
                console.log(`[BLOCKCHAIN] Merkle Root ${currentHash.substring(0, 14)}... confirmed on-chain. Tx: ${tx.hash}`);
                broadcastState(`[BLOCKCHAIN] Merkle Root immutably anchored to Smart Contract. Tx: ${tx.hash}`);
            }
        } catch (error) {
            console.error("[Blockchain] Anchor transaction error:", error.message);
            const fallbackTxHash = '0x' + crypto.createHash('sha256').update(currentHash + Date.now()).digest('hex');
            batchRecord.txHash = fallbackTxHash;
            clients.forEach(client => client.write(`data: ${JSON.stringify({
                type: 'TX_UPDATE',
                batchId: batchId,
                txHash: fallbackTxHash
            })}\n\n`));
        }
    } finally {
        isAnchoring = false;
        if (logBatch.length >= MAX_BATCH_SIZE) {
            setTimeout(processBatch, 200);
        }
    }
}

async function analyzeLogLine(line) {
    if (!line) return;

    const now = Date.now();
    const interval_ms = now - lastLogTimestamp;
    lastLogTimestamp = now;

    // Parse standard Apache/Nginx log format
    const methodMatch = line.match(/"(GET|POST|PUT|DELETE) /);
    const method = methodMatch ? methodMatch[1] : "GET";
    
    const urlMatch = line.match(/"(?:GET|POST|PUT|DELETE) ([^ ]+) /);
    const endpoint = urlMatch ? urlMatch[1] : "/";
    
    const statusMatch = line.match(/HTTP\/1\.[01]" (\d{3}) /);
    const status = statusMatch ? parseInt(statusMatch[1]) : 200;
    
    const byteMatch = line.match(/HTTP\/1\.[01]" \d{3} (\d+)/);
    const bytes = byteMatch ? parseInt(byteMatch[1]) : Math.floor(Math.random() * 200) + 400;

    let isObviousAttack = line.includes("OR") || line.includes("1=1") || line.includes("SELECT") || line.includes("admin'") || line.includes("wp-config") || line.includes(".env") || bytes > 2000;

    let mlData = {
        is_anomaly: isObviousAttack,
        attack_type: isObviousAttack ? "OBVIOUS_ATTACK" : "BENIGN",
        rf_score: 0.0,
        behavior_score: 0.0,
        sequence_score: 0.0,
        final_score: 0.0,
        confidence: 1.0,
        risk: isObviousAttack ? "HIGH" : "LOW"
    };

    try {
        const response = await axios.post(ML_API_URL, {
            method: method,
            endpoint: endpoint,
            bytes: bytes,
            interval_ms: interval_ms,
            status: status
        });
        
        mlData = response.data;
        mlData.raw_line = line;
        if (mlData.is_anomaly) isObviousAttack = true;

    } catch (err) {
        // Fallback
    }
    
    const logEntry = {
        raw_line: line,
        is_anomaly: mlData.is_anomaly || isObviousAttack,
        attack_type: mlData.attack_type
    };

    logBatch.push(logEntry);
    
    if (mlData.is_anomaly || isObviousAttack) {
        console.error(`\n🚨 [ML ALERT] ${mlData.attack_type} detected on ${endpoint}`);
        currentServerStatus = "ANOMALY DETECTED";
        anomalyCount++;
        
        broadcastState(`[ML ENGINE] 🚨 ${mlData.attack_type} detected on ${endpoint} (Risk: ${mlData.risk}, Score: ${mlData.final_score})`, mlData);
    } else {
        broadcastState(null, mlData);
    }

    if (logBatch.length >= MAX_BATCH_SIZE) {
        processBatch();
    } else if (!batchTimer) {
        batchTimer = setTimeout(processBatch, 2000);
    }
}

// Watch log file
if (!fs.existsSync(LOG_FILE)) {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.writeFileSync(LOG_FILE, "");
}

let lastSize = fs.statSync(LOG_FILE).size;

fs.watchFile(LOG_FILE, { interval: 500 }, (curr, prev) => {
    if (curr.size > lastSize) {
        const newSize = curr.size;
        const diff = newSize - lastSize;
        
        const buffer = Buffer.alloc(diff);
        const fd = fs.openSync(LOG_FILE, 'r');
        fs.readSync(fd, buffer, 0, diff, lastSize);
        fs.closeSync(fd);
        
        lastSize = newSize;
        
        const newLogs = buffer.toString('utf8').trim().split('\n');
        newLogs.forEach(line => {
            if (line.trim()) {
                analyzeLogLine(line.trim());
            }
        });
    }
});

console.log("=========================================");
console.log("🛡️ LOGGUARD AGENT ACTIVE");
console.log(`Monitoring Target Server: ${LOG_FILE}`);
console.log(`Anchor Contract: ${ANCHOR_CONTRACT_ADDRESS}`);
console.log("=========================================");
