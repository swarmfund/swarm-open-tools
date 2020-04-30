pragma solidity ^0.6.0;

import "./ERC721.sol";
import "./AccessControl.sol";

/**
 * @title Proof of existence by storing hashes. Based on ERC721.
 * The proof record is an ERC721 token, therefore it is referred to as token or proof.
 */
contract VerifiedExistence is ERC721, AccessControl {
    using EnumerableSet for EnumerableSet.AddressSet;

    struct ProofMetadata {
        bytes32 hash; // hash of the proof
        uint256 timestamp; // time of adding it
        string description; // user given description
    }
    
    bytes32 public constant PROOF_WHITELISTED = keccak256("PROOF_WHITELISTED");
    bytes32 public constant CONFIRM_WHITELISTED = keccak256("CONFIRM_WHITELISTED");
    
    /* highest issued ID, used for minting. Ever increasing.
     * @dev ID 0 is not used and signifies non-existent token.
    */
    uint256 private _highestID;
    
    // Mapping from proof ID to the proof  metadata
    mapping (uint256 => ProofMetadata) private _proofMetadata;
    
    // Mapping from proof ID to the proof confirmations
    mapping (uint256 => EnumerableSet.AddressSet) private _proofConfirmations;
    
    // Mapping from hash in token metadata to token ID
    mapping (bytes32 => uint256) private _hashesToTokens;

    event ProofAdded(bytes32 hash, string description, uint256 timestamp, uint256 proofId, address owner);   
    event ProofConfirmed(uint256 proofId, address confirmer);

    constructor () public {
        // make the contarct deployer the admin of all user access.
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @dev Batch role assignment
     * @param role bytes32 The role to grant
     * @param accounts address[] array of recipients of the role
     */
    function batchGrantRole(bytes32 role, address[] memory accounts) public {
        // right checks are done in the grantRole of AccessControl
        for (uint256 i = 0; i < accounts.length; i++)
            grantRole(role, accounts[i]);
    }

    /**
     * @dev Mints a new token and adds provided metadata
     * @param proofHash bytes32 the proof has to store. Must not be 0 or already exist.
     * @param description string description of the proof
     * @return uint256 id of the new proof/token
     */
    function addProof(address to, bytes32 proofHash, string memory description) public returns (uint256) {
        require(hasRole(PROOF_WHITELISTED, msg.sender), "VerifiedExistence: you are not permitted to add a proof");        
        require(proofHash != 0x0, "VerifiedExistence: proof hash can't be zero");
        require(getProofIdByHash(proofHash) == 0, "VerifiedExistence: this proof hash already exists");
        // does not require SafeMath as the increment is the only operation on _highestID
        _highestID++;
        _safeMint(to, _highestID);
        uint256 timestamp = now;
        _proofMetadata[_highestID] = ProofMetadata(proofHash, timestamp, description);
        _hashesToTokens[proofHash] = _highestID;
        emit ProofAdded(proofHash, description, timestamp, _highestID, to);
        return _highestID;
    }

    /**
     * @dev Burns a specific ERC721 token.
     * @param tokenId uint256 id of the ERC721 token to be burned.
     */
    function deleteProof(uint256 tokenId) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "VerifiedExistence: burn caller is not owner nor approved");
        _burn(tokenId);
        delete _hashesToTokens[_proofMetadata[tokenId].hash];
        delete _proofMetadata[tokenId];
        delete _proofConfirmations[tokenId];
    }
    
    /**
     * @dev Finds ID of a proof by its hash.
     * @param proofHash bytes32 the proof hash the find.
     * @return uint256 token ID. 0 if it does not exist.
     */
    function getProofIdByHash(bytes32 proofHash) public view returns (uint256) {
        return _hashesToTokens[proofHash];
    }    
    
    /**
     * @dev Returns metadata of a proof
     * @param tokenId uint256 id of the ERC721 token.
     * @return (bytes32, uint256, string memory)(bytes32, uint256, string) hash, timestamp, description of the proof
     */
    function getProofData(uint256 tokenId) public view returns (bytes32, uint256, string memory) {
        require(_exists(tokenId), "VerifiedExistence: proof by this id does not exist");
        ProofMetadata storage data = _proofMetadata[tokenId];
        return (data.hash, data.timestamp, data.description);
    }

    /**
     * @dev Adds a confirmation to a proof. Address needs to be whitelisted for it. Can only confirm once.
     * @param tokenId uint256 id of the ERC721 token
     */
    function addConfirmation(uint256 tokenId) public {
        require(_exists(tokenId), "VerifiedExistence: proof by this id does not exist");
        require(hasRole(CONFIRM_WHITELISTED, msg.sender), "VerifiedExistence: you are not permitted to confirm a proof");        
        require(_proofConfirmations[tokenId].contains(msg.sender) == false, "VerifiedExistence: you have already confirmed this proof");
        _proofConfirmations[tokenId].add(msg.sender);
        emit ProofConfirmed(tokenId, msg.sender);
    }

    /**
     * @dev Returns number of confirmations of a proof
     * @param tokenId uint256 id of the ERC721 token.
     * @return uint256 number of confirmations on the proof
     */
    function getProofConfirmationCount(uint256 tokenId) public view returns (uint256) {
        require(_exists(tokenId), "VerifiedExistence: proof by this id does not exist");
        return _proofConfirmations[tokenId].length();
    }
    
    /**
     * @dev Check whether an address confirmed given proof
     * @param tokenId uint256 id of the ERC721 token
     * @param confirmer address the address being inquired about
     * @return bool true if address confirmed proof with tokenId
     */
    function isConfirmedBy(uint256 tokenId, address confirmer) public view returns (bool) {
        require(_exists(tokenId), "VerifiedExistence: proof by this id does not exist");
        return _proofConfirmations[tokenId].contains(confirmer);
    }
}
