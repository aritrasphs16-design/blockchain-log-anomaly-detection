const hre = require('hardhat');
const path = require('path');
const { MerkleTree } = require(path.join(__dirname, '../../server_agent/node_modules/merkletreejs'));
const keccak256 = require(path.join(__dirname, '../../server_agent/node_modules/keccak256'));

async function test() {
  const [deployer, server, auditor] = await hre.ethers.getSigners();
  
  const LogToken = await hre.ethers.getContractFactory('LogToken');
  const token = await LogToken.deploy();
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();

  const AdvancedLogAnchor = await hre.ethers.getContractFactory('AdvancedLogAnchor');
  const anchor = await AdvancedLogAnchor.deploy(tokenAddr);
  await anchor.waitForDeployment();
  const anchorAddr = await anchor.getAddress();

  // Give server tokens and stake
  await token.transfer(server.address, hre.ethers.parseEther('1000'));
  await token.connect(server).approve(anchorAddr, hre.ethers.parseEther('500'));
  await anchor.connect(server).stakeServer('node-1');

  // Logs
  const rawLogs = [
    '127.0.0.1 - - [2026-10-18T16:00:00Z] "GET /api/users HTTP/1.1" 200 450 "-"',
    '127.0.0.1 - - [2026-10-18T16:00:01Z] "POST /login HTTP/1.1" 401 500 "MALICIOUS_SQLI"',
    '127.0.0.1 - - [2026-10-18T16:00:02Z] "GET / HTTP/1.1" 200 600 "-"'
  ];

  const leaves = rawLogs.map(x => keccak256(x));
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = '0x' + tree.getRoot().toString('hex');
  const maliciousLeaf = '0x' + leaves[1].toString('hex');
  const proof = tree.getHexProof(leaves[1]);

  console.log('Root:', root);
  console.log('Leaf:', maliciousLeaf);
  console.log('Proof:', proof);

  // Anchor
  await anchor.connect(server).anchorHash(root);
  console.log('Anchor success!');

  // Verify and Slash
  try {
    const tx = await anchor.connect(auditor).verifyAndSlashWithRoot(server.address, root, proof, maliciousLeaf);
    await tx.wait();
    console.log('>>> VERIFY AND SLASH SUCCEEDED ON EVM CONTRACT! <<<');
  } catch (err) {
    console.error('SLASH FAILED:', err.message);
  }
}

test().catch(console.error);
