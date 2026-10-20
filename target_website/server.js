const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dynamic Autonomous Firewall State
const blockedIPs = new Set();
const firewallEvents = [];

// Custom logging middleware to write to access.log
const logFilePath = process.env.LOG_FILE_PATH || path.join(__dirname, 'access.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// 1. Dynamic Firewall Inspection Middleware
app.use((req, res, next) => {
    // Control & simulation endpoints must never be blocked by firewall
    if (
        req.path.startsWith('/simulate') || 
        req.path.startsWith('/stop') || 
        req.path.startsWith('/firewall') || 
        req.path.startsWith('/health') ||
        req.path.startsWith('/reset')
    ) {
        return next();
    }

    const clientIp = req.ip || req.connection.remoteAddress || "127.0.0.1";
    // Check if IP is blocked by smart contract slash event
    if (blockedIPs.has(clientIp) || blockedIPs.has(clientIp.replace('::ffff:', ''))) {
        const logLine = `${clientIp} - - [${new Date().toISOString()}] "${req.method} ${req.originalUrl} HTTP/1.1" 403 0 "BLOCKED_BY_AUTONOMOUS_FIREWALL"\n`;
        logStream.write(logLine);
        return res.status(403).json({
            error: "Access Denied: IP address quarantined by LogGuard Autonomous Blockchain Firewall.",
            ip: clientIp,
            timestamp: new Date().toISOString()
        });
    }
    next();
});

// Reset firewall quarantine
app.all(['/reset', '/firewall/reset'], (req, res) => {
    blockedIPs.clear();
    console.log("🛡️ [Target Server] Firewall blacklist cleared by administrator.");
    res.json({ success: true, message: "Firewall reset. All IPs unblocked." });
});

// 2. Logging and telemetry middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const clientIp = req.ip || req.connection.remoteAddress || "127.0.0.1";
        const bytes = req.method === 'POST' && req.body && JSON.stringify(req.body).length > 500 ? 9999 : Math.floor(Math.random() * 200) + 400;
        
        // Flag indicators for ML extraction
        const isSQLi = req.url.includes("OR") || req.url.includes("1=1") || req.url.includes("SELECT");
        const isCanary = req.url.includes(".env") || req.url.includes("wp-config") || req.url.includes("database.sql");
        const reportedBytes = (isSQLi || isCanary) ? 8888 : bytes;

        const logLine = `${clientIp} - - [${new Date().toISOString()}] "${req.method} ${req.originalUrl} HTTP/1.1" ${res.statusCode} ${reportedBytes} "${req.get('user-agent') || '-'}"\n`;
        
        logStream.write(logLine);
        process.stdout.write(logLine);
    });
    next();
});

// --- Dynamic Autonomous Firewall Endpoints ---

app.post('/firewall/block', (req, res) => {
    const { ip, reason, txHash } = req.body;
    if (!ip) return res.status(400).json({ error: "Missing ip" });

    blockedIPs.add(ip);
    const event = {
        action: "QUARANTINE_IP",
        ip,
        reason: reason || "Smart Contract Slashing Proof Confirmed",
        txHash: txHash || "0x...",
        timestamp: new Date().toISOString()
    };
    firewallEvents.unshift(event);
    console.log(`\n🛡️ [AUTONOMOUS FIREWALL] Quarantined IP: ${ip} (Reason: ${reason || 'Slashing Proof'})`);

    res.json({ success: true, message: `IP ${ip} quarantined`, event });
});

app.post('/firewall/unblock', (req, res) => {
    const { ip } = req.body;
    blockedIPs.delete(ip);
    res.json({ success: true, message: `IP ${ip} unblocked` });
});

app.get('/firewall/status', (req, res) => {
    res.json({
        active: true,
        quarantinedCount: blockedIPs.size,
        quarantinedIPs: Array.from(blockedIPs),
        history: firewallEvents.slice(0, 20)
    });
});

// --- Honeypot / Canary Routes ---
app.get(['/.env', '/admin/wp-config.php', '/admin/database.sql'], (req, res) => {
    console.error(`🚨 [HONEYPOT TRIGGERED] Canary endpoint accessed: ${req.url}`);
    res.status(404).json({ error: "Not Found" });
});

// --- Dummy Corporate Routes ---

app.get('/', (req, res) => {
    res.send(`
        <html>
            <body style="font-family: sans-serif; background: #f4f4f5; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
                <h1>Global Finance Corp</h1>
                <p>Internal Employee Portal — Monitored by Advanced LogGuard</p>
                <form action="/login" method="POST">
                    <input type="text" name="username" placeholder="Username" /><br/><br/>
                    <input type="password" name="password" placeholder="Password" /><br/><br/>
                    <button type="submit">Login</button>
                </form>
            </body>
        </html>
    `);
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
        res.status(200).send("Welcome, Admin.");
    } else {
        res.status(401).send("Unauthorized");
    }
});

app.get('/api/users', (req, res) => {
    res.json([{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]);
});

app.post('/api/upload', (req, res) => {
    res.status(200).send("File uploaded successfully.");
});

app.get('/health', (req, res) => {
    res.json({ 
        status: "healthy",
        service: "target_website",
        firewallBlocked: blockedIPs.size
    });
});

let activeSimulations = new Set();

app.post('/simulate', (req, res) => {
    const { attack } = req.body;
    const allowed = ['sqli', 'bruteforce', 'slowbruteforce', 'xss', 'path', 'normal'];
    if (!allowed.includes(attack)) {
        return res.status(400).send("Invalid scenario");
    }

    const child = spawn('node', ['attack_simulator.js', attack], { cwd: __dirname });
    child.on('exit', () => {
        activeSimulations.delete(child);
    });
    child.on('error', (error) => {
        console.error(`Simulation error: ${error.message}`);
    });
    activeSimulations.add(child);
    
    res.status(200).send(`Started simulation: ${attack}`);
});

app.post('/stop', async (req, res) => {
    activeSimulations.forEach(child => {
        try {
            child.kill('SIGKILL');
        } catch(e) {
            console.error("Failed to kill simulation process:", e);
        }
    });
    activeSimulations.clear();
    blockedIPs.clear();

    // Notify server agent to reset anomaly count & restore SECURE status
    try {
        const agentUrl = process.env.AGENT_URL || "http://127.0.0.1:4000";
        await fetch(`${agentUrl}/reset`, { method: 'POST' }).catch(() => {});
    } catch (e) {}

    res.status(200).send("Stopped all active simulations and reset firewall.");
});

app.listen(PORT, () => {
    console.log(`[Target Server] Live on http://localhost:${PORT}`);
    console.log(`[Target Server] Logging traffic to access.log...`);
});
