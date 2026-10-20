const axios = require('axios');

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:8080';

console.log("=========================================");
console.log("💀 INITIATING FULL PENETRATION ATTACK SUITE...");
console.log("Targeting:", TARGET_URL);
console.log("=========================================\n");

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runAttack() {
    try {
        console.log("[*] Phase 1: Initiating Brute Force Login Attack...");
        for (let i = 0; i < 5; i++) {
            axios.post(`${TARGET_URL}/login`, { username: 'admin', password: `password${i}` }).catch(() => {});
            await sleep(100);
        }
        console.log("   -> Sent 5 rapid failed login requests.\n");
        await sleep(1000);

        console.log("[*] Phase 2: Launching SQL Injection (Authentication Bypass)...");
        const sqliPayload = "admin' OR 1=1 --";
        axios.get(`${TARGET_URL}/api/users?id=${encodeURIComponent(sqliPayload)}`).catch(() => {});
        console.log(`   -> Requested: /api/users?id=${sqliPayload}\n`);
        await sleep(1000);

        console.log("[*] Phase 3: Launching Cross-Site Scripting (XSS)...");
        const xssPayload = "<script>alert(document.cookie)</script>";
        axios.get(`${TARGET_URL}/api/users?search=${encodeURIComponent(xssPayload)}`).catch(() => {});
        console.log(`   -> Injected XSS payload: ${xssPayload}\n`);
        await sleep(1000);

        console.log("[*] Phase 4: Path Traversal (Arbitrary File Read)...");
        axios.get(`${TARGET_URL}/api/users?file=../../../../etc/passwd`).catch(() => {});
        console.log("   -> Requested directory traversal payload.\n");
        await sleep(1000);

        console.log("[*] Phase 5: Triggering Honeypot / Canary Tokens...");
        axios.get(`${TARGET_URL}/.env`).catch(() => {});
        axios.get(`${TARGET_URL}/admin/wp-config.php`).catch(() => {});
        console.log("   -> Accessed honeypot canary endpoints.\n");
        await sleep(1000);

        console.log("[*] Phase 6: Massive Data Exfiltration (Payload Spike)...");
        const hugePayload = "A".repeat(10000);
        axios.post(`${TARGET_URL}/api/upload`, { data: hugePayload }).catch(() => {});
        console.log("   -> Uploaded 10KB payload. Network byte spike registered.\n");
        
        await sleep(1000);
        console.log("===============================================================");
        console.log("✅ Attack sequence completed.");
        console.log("Open http://localhost:3000 to see:");
        console.log("1. Live AI Anomaly Detection in the ML Analytics view");
        console.log("2. Merkle Root Generation & IPFS Archival");
        console.log("3. Ethereum Smart Contract Anchoring");
        console.log("4. Execute Slashing on the Audit Page to claim the 100 $LOG bounty!");
        console.log("===============================================================");

    } catch (err) {
        console.error("Target server is down! Make sure it is running on port 8080.");
    }
}

runAttack();
