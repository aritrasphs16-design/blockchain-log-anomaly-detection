// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title AdvancedLogAnchor
 * @notice Cryptoeconomic forensic audit anchor contract with Merkle proof verification,
 *         stake-and-slash mechanism, and historical chain-of-custody tracking.
 */
contract AdvancedLogAnchor {
    IERC20 public logToken;
    uint256 public constant STAKE_AMOUNT = 500 * 10**18;
    uint256 public constant BOUNTY_REWARD = 100 * 10**18;

    struct Server {
        bool isStaked;
        bytes32 currentMerkleRoot;
        uint256 lastUpdated;
        string serverId;
    }

    mapping(address => Server) public servers;
    address[] public serverAddresses;
    mapping(address => bool) private hasRegistered;

    // Historical roots per server to allow auditing any anchored batch
    mapping(address => mapping(bytes32 => bool)) public isServerRoot;
    mapping(bytes32 => uint256) public rootAnchoredTimestamp;
    
    // Hash chain for forensic chain-of-custody (prevRoot -> currentRoot)
    mapping(bytes32 => bytes32) public previousRoot;

    // Events
    event Staked(address indexed server, string serverId, uint256 amount);
    event RootAnchored(address indexed server, bytes32 indexed merkleRoot, bytes32 previousRoot, uint256 timestamp);
    event Slashed(address indexed server, address indexed auditor, uint256 bountyAmount, bytes32 root, bytes32 maliciousLogLeaf);
    event Unstaked(address indexed server, uint256 amount);

    constructor(address _tokenAddress) {
        logToken = IERC20(_tokenAddress);
    }

    function stakeServer(string memory _serverId) public {
        require(!servers[msg.sender].isStaked, "Already staked");
        
        require(logToken.transferFrom(msg.sender, address(this), STAKE_AMOUNT), "Stake transfer failed");
        
        if (!hasRegistered[msg.sender]) {
            serverAddresses.push(msg.sender);
            hasRegistered[msg.sender] = true;
        }

        string memory id = bytes(_serverId).length > 0 ? _serverId : "alpha-node-production";

        servers[msg.sender] = Server({
            isStaked: true,
            currentMerkleRoot: bytes32(0),
            lastUpdated: block.timestamp,
            serverId: id
        });

        emit Staked(msg.sender, id, STAKE_AMOUNT);
    }

    function stake() external {
        stakeServer("alpha-node-production");
    }

    function anchorHash(bytes32 _merkleRoot) external {
        require(servers[msg.sender].isStaked, "Must be staked");
        require(_merkleRoot != bytes32(0), "Invalid Merkle root");

        bytes32 prev = servers[msg.sender].currentMerkleRoot;
        previousRoot[_merkleRoot] = prev;
        
        servers[msg.sender].currentMerkleRoot = _merkleRoot;
        servers[msg.sender].lastUpdated = block.timestamp;
        
        isServerRoot[msg.sender][_merkleRoot] = true;
        rootAnchoredTimestamp[_merkleRoot] = block.timestamp;

        emit RootAnchored(msg.sender, _merkleRoot, prev, block.timestamp);
    }

    /**
     * @notice Verifies a Merkle proof against a specific historical root and slashes the server if valid.
     */
    function verifyAndSlashWithRoot(
        address serverAddress,
        bytes32 root,
        bytes32[] calldata proof,
        bytes32 maliciousLogLeaf
    ) public {
        Server storage targetServer = servers[serverAddress];
        require(targetServer.isStaked, "Server not staked");
        require(
            isServerRoot[serverAddress][root] || targetServer.currentMerkleRoot == root,
            "Root not anchored by server"
        );
        
        // Verify the Merkle Proof
        bool isValid = MerkleProof.verify(proof, root, maliciousLogLeaf);
        require(isValid, "Invalid Merkle Proof");
        
        targetServer.isStaked = false;
        targetServer.currentMerkleRoot = bytes32(0);
        
        require(logToken.transfer(msg.sender, BOUNTY_REWARD), "Bounty transfer failed");

        emit Slashed(serverAddress, msg.sender, BOUNTY_REWARD, root, maliciousLogLeaf);
    }

    /**
     * @notice Verifies against currentMerkleRoot and slashes if valid.
     */
    function verifyAndSlash(
        address serverAddress,
        bytes32[] calldata proof,
        bytes32 maliciousLogLeaf
    ) external {
        verifyAndSlashWithRoot(serverAddress, servers[serverAddress].currentMerkleRoot, proof, maliciousLogLeaf);
    }

    function unstake() external {
        require(servers[msg.sender].isStaked, "Not staked");
        
        servers[msg.sender].isStaked = false;
        servers[msg.sender].currentMerkleRoot = bytes32(0);
        
        require(logToken.transfer(msg.sender, STAKE_AMOUNT), "Unstake transfer failed");

        emit Unstaked(msg.sender, STAKE_AMOUNT);
    }

    function getAllServers() external view returns (address[] memory) {
        return serverAddresses;
    }

    function getServerCount() external view returns (uint256) {
        return serverAddresses.length;
    }

    function isRootValid(address serverAddress, bytes32 root) external view returns (bool) {
        return isServerRoot[serverAddress][root] || servers[serverAddress].currentMerkleRoot == root;
    }
}
