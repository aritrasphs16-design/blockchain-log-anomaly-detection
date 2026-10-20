

const TARGET_URL = 'http://localhost:8080';

const SQLI_PAYLOADS = ["' OR 1=1--", "'; DROP TABLE users--", "admin' #"];
const XSS_PAYLOADS = ["<script>alert(1)</script>", "<img src=x onerror=alert(1)>"];
const PATH_TRAVERSAL = ["../../../../etc/passwd", "../config.json"];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function sendRequest(method, endpoint, data = null) {
    try {
        const options = { method };
        if (data && method === 'POST') {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify(data);
        }
        await fetch(`${TARGET_URL}${endpoint}`, options);
        process.stdout.write('.');
    } catch (error) {
        process.stdout.write('!');
    }
}

async function simulateNormalTraffic() {
    console.log("\n[Simulator] Simulating Normal Traffic...");
    for (let i = 0; i < 5; i++) {
        await sendRequest('GET', '/');
        await sleep(500);
        await sendRequest('GET', '/api/users');
        await sleep(1000);
    }
}

async function simulateSQLi() {
    console.log("\n[Simulator] Simulating SQL Injection...");
    const payload = SQLI_PAYLOADS[Math.floor(Math.random() * SQLI_PAYLOADS.length)];
    await sendRequest('GET', `/api/users?id=${encodeURIComponent(payload)}`);
}

async function simulateXSS() {
    console.log("\n[Simulator] Simulating XSS...");
    const payload = XSS_PAYLOADS[Math.floor(Math.random() * XSS_PAYLOADS.length)];
    await sendRequest('GET', `/?q=${encodeURIComponent(payload)}`);
}

async function simulatePathTraversal() {
    console.log("\n[Simulator] Simulating Path Traversal...");
    const payload = PATH_TRAVERSAL[Math.floor(Math.random() * PATH_TRAVERSAL.length)];
    await sendRequest('GET', `/${payload}`);
}

async function simulateBruteForce() {
    console.log("\n[Simulator] Simulating Fast Brute Force...");
    for (let i = 0; i < 15; i++) {
        await sendRequest('POST', '/login', { username: 'admin', password: `pass${i}` });
        await sleep(50); // fast
    }
}

async function simulateSlowBruteForce() {
    console.log("\n[Simulator] Simulating Slow Brute Force...");
    for (let i = 0; i < 12; i++) {
        await sendRequest('POST', '/login', { username: 'admin', password: `slow${i}` });
        await sleep(1500); // slow enough to evade simple rate limits, but LSTM might catch it
    }
}

async function runScenario(scenario) {
    switch(scenario) {
        case 'normal': await simulateNormalTraffic(); break;
        case 'sqli': await simulateSQLi(); break;
        case 'xss': await simulateXSS(); break;
        case 'traversal': await simulatePathTraversal(); break;
        case 'bruteforce': await simulateBruteForce(); break;
        case 'slowbruteforce': await simulateSlowBruteForce(); break;
        case 'all':
            await simulateNormalTraffic();
            await sleep(2000);
            await simulateSQLi();
            await sleep(2000);
            await simulateBruteForce();
            break;
        default:
            console.log("Unknown scenario");
    }
    console.log("\n[Simulator] Done.");
}

const arg = process.argv[2] || 'normal';
runScenario(arg);
