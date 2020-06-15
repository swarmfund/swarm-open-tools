# VerifiedExistence.sol

## Intro
This smart contract is meant to:
##### Create proofs of the existence of a Hash (representing some document or text), thus verify their existence
- Owner (and whitelisted others) can create new `proofs`
- Contract creates `proofs` as NFT/ERC721, which can be sent to a recipient address
- Whitelisted others can add confirmations for `proofs`
##### Roles:
- `default_admin`: contract deployer set as default, can be transferred; is allowed to grant/revoke all roles (admins + whitelists)
- `proof_whitelisted`: add/delete proofs; admins are not automatically whitelisted, so that needs to be added if desired
- `confirm_whitelisted`: add/delete confirmations of proofs
##### Note:
- Recipient wallets need to be able to handle ER721. For safety reasons, it is not possible to send a token to a contract that does not explicitly support it.

## tl/dr instructions
* Tools:
  * Deploy contract via [Remix](https://remix.ethereum.org/)
  * Use contract interaction via [Etherscan](https://etherscan.io)
  * Create doc/string hashes using [Hash Calculator](https://www.pelock.com/products/hash-calculator)
* `proofs`
  * whitelist deployment address plus any group of addresses with `grantRole()` as `Proof_Whitelisted` using `0xf555e1ec80c58c7664dc73d872d3ef6e07bdd9c5ba6b3bf7a91ffaa413b8dac5`
  * create new proof with `addProof()` using `proofHash` (hash of a document, file, string, etc.), `string` (any description of the hash) and the `address` where the `proofHash` shall be sent to
  * (If you hold the `proof` in your address) you can delete it by using `deleteProof()` 
* `confirmation of proofs`
  * whitelist any group of addresses with `grantRole()` as `Confirm_Whitelisted` with `0x53eebd7fe83ace838d6b0a9d4f111237deb02359c62b25f1025613d537b2379b`
  * create new `confirmation of a proof` with `addConfirmation()` using `tokenId`
* Review `proof` data
  * Query either using `getProofData()` and/or `getProofIdByHash() to get `proofHash, timestamp, description`

## Notable Functions

**Read Functions**

| Function | Description |
| :--- | :--- |
| `getProofIdByHash()` | query with `proofHash` and get `tokenId` |
| `getProofData()` | query with `tokenId` and get `proofHash, timestamp, description` |
| `getProofConfirmationCount()` | query with `tokenId` and get `confirmation count` |
| `getProofIdByHash()` | query with `proofHash` and get `tokenId` |
| `isConfirmedBy()` | check whether a specific `address` confirmed a `proof` / `tokenId` |
| `balanceOf()` | number of tokens the `address` owns |
| `ownerOf()` | get the `address` who owns a `tokenId` |
| `safeTransferFrom()` | transfer Proofs `address from`, `address to`, `tokenId` |
| `tokenOfOwnerByIndex()` | `address owner`, `index (uint256)` // index is a 1..n numbering of proofs owned by the address. Use this to get all `proofs` owned by an address, in combination with `balanceOf` to get the count |
| `totalSupply()` | get the current supply of `proofs` in existence; burnt/deleted not included |

**Write Functions**

| Function | Description |
| :--- | :--- |
| `addProof()` | write `proofHash (0x{hash})` (hash of a document, file, string, etc.), `string` (any description of the hash; length only affects gas), `address` (where the NFT/ERC721 is being sent to); contract returns `tokenId`; Fails if hash already exists; Requires being whitelisted; creates an ERC721 and a custom event |
| `deleteProof()` | write `tokenId`, deletes proof/token; only the address holding a proof token can burn it, not any `default_admin` or `proof_whitelisted` |
| `addConfirmation()` | write `tokenId` add confirmation of the data; requires being whitelisted; creates an event |
| `transferFrom()` | `address from`, `address to`, `tokenId` // do not use, unsafe |
| `approve()` | `address to`, `tokenId`) // give “address to" the right to transfer ownership of a proof the contract owns |
| `setApprovalForAll()` | `address operator`, `bool _approved` // gives "address to" the right to transfer ownership of all proofs the sender owns |
| `grantRole()` | `hash of role`, `addresses ["0x...", "0x..."]` to grant certain role to certain address; hashes of the roles are const in the contract: `Default_Admin_Role` with`0x0000000000000000000000000000000000000000000000000000000000000000`, `Proof_Whitelisted` with `0xf555e1ec80c58c7664dc73d872d3ef6e07bdd9c5ba6b3bf7a91ffaa413b8dac5`, `Confirm_Whitelisted` with `0x53eebd7fe83ace838d6b0a9d4f111237deb02359c62b25f1025613d537b2379b` |
| `batchGrantRole()` | `hash of role`, `addresses [0x..., 0x...]` to grant certain role to multiple addresses |
| `revokeRole()` | same as `grantRole` only reverse | 

## Swarm - Example Use Cases
### Core initial use case
The Swarm Council can publish protocols of decisions taken on GitHub and verify the Hash via VerifiedExistence:
* [Dedicated contract](https://etherscan.io/address/0xdc95ed11e88d44f4e6ece3c959034646e7917b15#code) for `VerifiedExistence` for Swarm Network
* Contract owner and `proof_whitelisted` is multisig with council members (tbd)
* Council published documents with hashes;
* Create Proof (Hash + meta data) and proof NFT / ERC721 is sent to dedicated wallet (e.g. Gnosis Safe, which allows ERC721 to be kept as “Collectibles”)
* Example: Swarm Council Votes (SCVs)
    * listed in this [repo](https://github.com/swarmfund/swarm-network-governance/tree/master/SCVs); text between <hash-start> and  </hash-end> tags is hashed
    * create `proofs` using hash and title; send it to a Swarm Council wallet; e.g [`proof (SCV_1587031154_Decision regarding_April_Voting_Period.md)`](https://etherscan.io/tx/0xf9363a3dc08a1927cdbe5e90c83c96bfd80012296bdad6821193a15a4f08460e) 


### Other potential use cases:
##### Proof of Masternode
* Smart contract, which tracks verified Masternodes, could be added to `proof_whitelisted` of a contract put in place by council
* A smart contract / person / process could keep track of active masternodes and create/delete corresponding `proofs` and send `proof` NFTs to masternode wallets
* Masternode distributions could be using NFTs held as basis for reward distribution
* Masternodes could be confirming various actions of the Council contract
##### Masternodes could be added as `confirm_whitelisted`
* Can then add supporting votes (confirmations) to certain actions
