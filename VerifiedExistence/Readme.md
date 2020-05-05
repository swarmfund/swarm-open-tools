# VerifiedExistence.sol

## Intro
This smart contract is meant to:
##### Create proofs of the existence of a Hash (representing some document or text), thus verify their existence
- Owner (and whitelisted others) can create new proofs
- Contract creates proofs as NFT/ERC721, which can be provided to recipients
- Data updates can be done by writing new hash+data being written on the same DocID
##### Roles:
- ``default_admin``: contract deployer, can be transferred; is allowed to grant/revoke all roles (admins+whitelists)
- ``proof_whitelisted``: add/delete proofs
- ``confirm_whitelisted``: add/delete confirmations of proofs
##### Note:
- Recipient wallets need to be able to handle ER721. For safety reasons, it is not possible to send a token to a contract that does not explicitly support it.
    

  

## Notable Functions
###   Proof specific:
##### Write:
- addProof - write proofHash (0x{hash}); hash of a document, file, string, etc.), string (any description of the hash; length only affects gas), address (where the NFT/ERC721 is being sent to); contract returns id (tokenId); Fails if hash already exists; Requires being whitelisted; creates an ERC721 and a custom event
- deleteProof - write tokenId, deletes proof/token
- addConfirmation - write tokenId add confirmation of the data; requires being whitelisted; creates an event
##### Read:
- getProofIdByHash - query with (proofHash) and get (tokenId)
- getProofData - query with (tokenId) and get (proofHash, timestamp, description)
- getProofConfirmationCount - query with (tokenId) and get (confirmation count)
- isConfirmedBy - check whether a specific (address) confirmed a proof (tokenId)
### NFT Token / Proof specific:
##### Write
- transferFrom - (address from, address to, uint256 tokenId) // do not use, unsafe
- Approve - (address to, uint256 tokenId) // give “address to" the right to transfer ownership of a proof the contract owns
- setApprovalForAll - (address operator, bool _approved) // gives "address to" the right to transfer ownership of all proofs the sender owns
##### Read:
- balanceOf - number of tokens the (address) owns
- ownerOf - get the (address) who owns a (tokenId uint256)
- safeTransferFrom - transfer Proofs (address from, address to, tokenId uint256)
- tokenOfOwnerByIndex - (address owner, index uint256) - index is a 1..n numbering of proofes owned by the address. Use this to get all proofes owned by an address, in combination with balanceOf to get the count
### Whitelisting
Three roles exist:
- Default_Admin_Role - can grant/revoke all roles to add more admins and whitelist people; contract deployer has the Default_Admin_Role (attention: owner also revoke his admin role which would be irreversible if he is the only one!)
- Proof_Whitelisted - can create/delete Proofs; admins are automatically whitelisted, so that needs to be added if desired
- Confirm_Whitelisted - can create Confirmations against Proofs
##### Write:
- grantRole - (hash of role, addresses ["0x...", "0x..."])) to grant certain role to certain address; hashes of the roles are const in the contract::
> ``Default_Admin_Role`` with ``0x0000000000000000000000000000000000000000000000000000000000000000``

> ``Proof_Whitelisted`` with ``0xf555e1ec80c58c7664dc73d872d3ef6e07bdd9c5ba6b3bf7a91ffaa413b8dac5``

> ``Confirm_Whitelisted`` with ``0x53eebd7fe83ace838d6b0a9d4f111237deb02359c62b25f1025613d537b2379b``

-----
- batchGrantRole - (hash of role, addresses [0x..., 0x...])) to grant certain role to multiple address
- revokeRole - same as grantRole only reverse

## Swarm - Example Use Cases
### Core initial use case
The Swarm Council can publish protocols of decisions taken on GitHub and verify the Hash via VerifiedExistence:
- Dedicated contract for VerifiedExistence for Swarm Network
- Contract owner and ``proof_whitelisted`` is multisig with council members
- Council published documents / minutes, with hashes ([example here](https://raw.githubusercontent.com/swarmfund/swarm-network-governance/master/SCVs/SCV_1587031154_Decision%20regarding_April_Voting_Period.md))
- Create Proof (Hash + meta data) and proof NFT / ERC721 is sent to dedicated wallet (e.g. Gnosis Safe, which allows ERC721 to be kept as “Collectibles”)

### Other potential use cases:
##### Proof of Masternode
- Smart contract, which tracks verified Masternodes, could be added to ``proof_whitelisted`` of a contract put in place by council
- A smart contract / person / process could keep track of active masternodes and create/delete corresponding Proofs and send Proof NFTs to masternode wallets
- Masternode distributions could be using NFTs held as basis for reward distribution
- Masternodes could be confirming various actions of the Council contract
##### Masternodes could be added as ``confirm_whitelisted``
- Can then add supporting votes (confirmations) to certain actions
