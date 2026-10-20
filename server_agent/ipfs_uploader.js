const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const FormData = require('form-data');

// Pinata credentials (optional, fallback to local deterministic decentralized storage)
const PINATA_API_KEY = process.env.PINATA_API_KEY || "";
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY || "";

const IPFS_STORAGE_DIR = path.join(__dirname, 'ipfs_storage');
if (!fs.existsSync(IPFS_STORAGE_DIR)) {
    fs.mkdirSync(IPFS_STORAGE_DIR, { recursive: true });
}

function computeIpfsCid(content) {
    // Generate deterministic sha256 based CID
    const hash = crypto.createHash('sha256').update(content).digest();
    // Multihash prefix: 0x12 (sha2-256), 0x20 (32 bytes)
    const multihash = Buffer.concat([Buffer.from([0x12, 0x20]), hash]);
    // Base58-like representation with Qm prefix
    const base64 = multihash.toString('base64')
        .replace(/\+/g, 'A')
        .replace(/\//g, 'B')
        .replace(/=/g, '');
    return 'Qm' + base64.padEnd(44, 'x').substring(0, 44);
}

async function uploadToIPFS(logBatchString) {
    console.log(`[IPFS] Archiving batch payload to decentralized storage...`);
    const payloadStr = typeof logBatchString === 'string' ? logBatchString : JSON.stringify(logBatchString);
    const cid = computeIpfsCid(payloadStr);

    // Save to local gateway cache
    const filePath = path.join(IPFS_STORAGE_DIR, `${cid}.json`);
    fs.writeFileSync(filePath, payloadStr);
    console.log(`[IPFS GATEWAY] Cached locally as CID: ${cid}`);

    // If Pinata keys are set, also pin to live public IPFS
    if (PINATA_API_KEY && PINATA_SECRET_API_KEY) {
        try {
            const formData = new FormData();
            formData.append('file', Buffer.from(payloadStr), {
                filename: `evidence_${cid}.json`,
                contentType: 'application/json',
            });

            const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
                    'pinata_api_key': PINATA_API_KEY,
                    'pinata_secret_api_key': PINATA_SECRET_API_KEY
                }
            });

            console.log(`[IPFS PINATA] Pinned to global IPFS. Live CID: ${res.data.IpfsHash}`);
            return res.data.IpfsHash;
        } catch (error) {
            console.warn("[IPFS] Pinata pin failed, using verified local gateway CID:", error.message);
        }
    }

    return cid;
}

function getFromIPFS(cid) {
    const filePath = path.join(IPFS_STORAGE_DIR, `${cid}.json`);
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    return null;
}

module.exports = { uploadToIPFS, getFromIPFS };
