const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer, server, auditor] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Server Account:", server.address);
  console.log("Auditor Account:", auditor.address);

  // Deploy LogToken
  const LogToken = await hre.ethers.getContractFactory("LogToken");
  const logToken = await LogToken.deploy();
  await logToken.waitForDeployment();
  const logTokenAddress = await logToken.getAddress();
  console.log("LogToken deployed to:", logTokenAddress);

  // Deploy AdvancedLogAnchor
  const AdvancedLogAnchor = await hre.ethers.getContractFactory("AdvancedLogAnchor");
  const anchor = await AdvancedLogAnchor.deploy(logTokenAddress);
  await anchor.waitForDeployment();
  const anchorAddress = await anchor.getAddress();
  console.log("AdvancedLogAnchor deployed to:", anchorAddress);

  // Setup Initial State for the Demo
  console.log("\nSetting up initial demo state...");
  
  // 1. Give server 2000 LOG tokens (enough for multiple stakes)
  const transferTx = await logToken.transfer(server.address, hre.ethers.parseEther("2000"));
  await transferTx.wait();
  console.log("- Transferred 2000 LOG to server");

  // 1b. Give auditor 500 LOG tokens initially so they have a balance
  const transferAuditorTx = await logToken.transfer(auditor.address, hre.ethers.parseEther("500"));
  await transferAuditorTx.wait();
  console.log("- Transferred 500 LOG to default auditor account");

  // 2. Server approves staking
  const serverToken = logToken.connect(server);
  const approveTx = await serverToken.approve(anchorAddress, hre.ethers.parseEther("1000"));
  await approveTx.wait();
  console.log("- Server approved 1000 LOG for staking");

  // 3. Server stakes 500 LOG with Server ID "alpha-node-production"
  const serverAnchor = anchor.connect(server);
  const stakeTx = await serverAnchor.stakeServer("alpha-node-production");
  await stakeTx.wait();
  console.log("- Server staked 500 LOG as 'alpha-node-production'");

  console.log("\n✅ Deployment & Setup Complete!");

  // Extract ABIs
  const logTokenArtifact = await hre.artifacts.readArtifact("LogToken");
  const anchorArtifact = await hre.artifacts.readArtifact("AdvancedLogAnchor");

  const contractData = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    rpcUrl: "http://127.0.0.1:8545",
    logTokenAddress: logTokenAddress,
    anchorAddress: anchorAddress,
    serverAddress: server.address,
    auditorAddress: auditor.address,
    logTokenAbi: logTokenArtifact.abi,
    anchorAbi: anchorArtifact.abi
  };

  // 1. Text file for backwards compatibility
  const outputText = `LOG_TOKEN_ADDRESS="${logTokenAddress}"
ANCHOR_ADDRESS="${anchorAddress}"
SERVER_ADDRESS="${server.address}"
`;
  fs.writeFileSync(path.join(__dirname, "../deployed_addresses.txt"), outputText);
  fs.writeFileSync(path.join(__dirname, "../deployed_contracts.json"), JSON.stringify(contractData, null, 2));

  // 2. Export to frontend
  const frontendContractsDir = path.join(__dirname, "../../frontend/contracts");
  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, { recursive: true });
  }
  fs.writeFileSync(path.join(frontendContractsDir, "deployedContracts.json"), JSON.stringify(contractData, null, 2));

  // 3. Export to server_agent
  const serverAgentDir = path.join(__dirname, "../../server_agent");
  fs.writeFileSync(path.join(serverAgentDir, "deployed_contracts.json"), JSON.stringify(contractData, null, 2));

  console.log("Saved deployed contract config & ABIs to contracts_layer, frontend, and server_agent!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
