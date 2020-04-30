const { accounts, contract } = require('@openzeppelin/test-environment');
const { assert, expect } = require('chai');

// Import utilities from Test Helpers
const { BN, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');

const VerifiedExistence = contract.fromArtifact('VerifiedExistence');

describe('VerifiedExistence', function () {
  const [ owner, other ] = accounts;  
  const proofHash1 = "0x1111111111111111111111111111111111111111111111111111111111111111";
  const proofHash2 = "0x2222222222222222222222222222222222222222222222222222222222222222";
  const proofHash3 = "0x3333333333333333333333333333333333333333333333333333333333333333";
  const description1 = "Taxation is theft";
  const description2 = "Nothing to see here";
  // role hashes as in consts in the contract
  const proofRole = "0xf555e1ec80c58c7664dc73d872d3ef6e07bdd9c5ba6b3bf7a91ffaa413b8dac5"
  const confirmRole = "0x53eebd7fe83ace838d6b0a9d4f111237deb02359c62b25f1025613d537b2379b"

  // Use large integers ('big numbers')
  const value = new BN('42');

  beforeEach(async function () {
    this.contract = await VerifiedExistence.new({ from: owner });
  });
  

  it('Role hashes are correct', async function () {
    expect(await this.contract.PROOF_WHITELISTED()).to.equal(proofRole);
    expect(await this.contract.CONFIRM_WHITELISTED()).to.equal(confirmRole);
  });

  
  it('Batch role granting', async function () {
    await expectRevert(
      this.contract.batchGrantRole(proofRole, [owner, other], { from: other }),
      "AccessControl: sender must be an admin to grant."
    );

    assert.isNotOk(await this.contract.hasRole(proofRole, owner));
    assert.isNotOk(await this.contract.hasRole(proofRole, other));
    this.contract.batchGrantRole(proofRole, [owner, other], { from: owner });    
    assert.isOk(await this.contract.hasRole(proofRole, owner));
    assert.isOk(await this.contract.hasRole(proofRole, other));
  });  

  
  it('Only owner can whitelist', async function () {
    await expectRevert(
      this.contract.grantRole(proofRole, owner, { from: other }),
      "AccessControl: sender must be an admin to grant."
    );
    await expectRevert(
      this.contract.grantRole(confirmRole, owner, { from: other }),
      "AccessControl: sender must be an admin to grant."
    );
    
    this.contract.grantRole(confirmRole, other, { from: owner });
    assert.isOk(await this.contract.hasRole(confirmRole, other));
    assert.isNotOk(await this.contract.hasRole(proofRole, other));
    this.contract.grantRole(proofRole, other, { from: owner });
    assert.isOk(await this.contract.hasRole(confirmRole, other));
    assert.isOk(await this.contract.hasRole(proofRole, other));
  });
  
  
  it('Whitelisting to add proofs', async function () {
    await expectRevert(
      this.contract.addProof(other, proofHash1, description1, { from: owner }),
      "VerifiedExistence: you are not permitted to add a proof"
    );
    
    this.contract.grantRole(proofRole, other, { from: owner });
    await this.contract.addProof(other, proofHash1, description1, { from: other });
    expect(await this.contract.totalSupply()).to.be.bignumber.equal("1");
  });
  
  
  it('Adding proof emits an event', async function () {
    this.contract.grantRole(proofRole, owner, { from: owner });
    const receipt = await this.contract.addProof(owner, proofHash1, description1, { from: owner });
    
    id = new BN(1); // it requires big number
    // does not check timestamp, there is another test for its value
    expectEvent(receipt, 'ProofAdded', { hash: proofHash1, description: description1, proofId: id, owner: owner });
  });  
  
  
  it('Proof metadata', async function () {
    this.contract.grantRole(proofRole, owner, { from: owner });
    await expectRevert(
      this.contract.addProof(other, "0x00", "", { from: owner }),
      "VerifiedExistence: proof hash can't be zero"
    );
    
    await this.contract.addProof(owner, proofHash1, description1, { from: owner });
    time1 = await time.latest()
    
    // same hash again
    await expectRevert(
      this.contract.addProof(other, proofHash1, description2, { from: owner }),
      "VerifiedExistence: this proof hash already exists"
    );
    
    // different hash passes
    await time.increase(3); // let some time pass to check timestamps
    await this.contract.addProof(owner, proofHash2, "", { from: owner });
    time2 = await time.latest()
    expect(await this.contract.totalSupply()).to.be.bignumber.equal("2");
    
    //response = [hash, timestamp, description]
    response1 = await this.contract.getProofData(1, { from: owner });
    assert.equal(response1[0], proofHash1);
    expect(time1).to.be.bignumber.equal(response1[1]);
    assert.equal(response1[2], description1);

    response2 = await this.contract.getProofData(2, { from: owner });
    assert.equal(response2[0], proofHash2);
    expect(time2).to.be.bignumber.greaterThan(time1);
    expect(time2).to.be.bignumber.equal(response2[1]);
    assert.equal(response2[2], "");
  });
  
  
  it('Transfer', async function () {
    // This test is just a quick check, all should work since the OpenZeppelin code was not modified.
    this.contract.grantRole(proofRole, owner, { from: owner });
    await this.contract.addProof(owner, proofHash1, description1, { from: owner });
    expect(await this.contract.balanceOf(owner)).to.be.bignumber.equal("1");
    expect(await this.contract.balanceOf(other)).to.be.bignumber.equal("0");    
    
    await this.contract.safeTransferFrom(owner, other, 1, { from: owner });
    expect(await this.contract.balanceOf(owner)).to.be.bignumber.equal("0");
    expect(await this.contract.balanceOf(other)).to.be.bignumber.equal("1");
  });
    
    
  it('Retrieve user\'s tokens', async function () {
    this.contract.grantRole(proofRole, owner, { from: owner });
    await this.contract.addProof(owner, proofHash1, description1, { from: owner });
    await this.contract.addProof(owner, proofHash2, description2, { from: owner });
    await this.contract.addProof(owner, proofHash3, "", { from: owner });    
    expect(await this.contract.balanceOf(owner)).to.be.bignumber.equal("3");
    // to misalign the token id and index in user token array
    await this.contract.safeTransferFrom(owner, other, 2, { from: owner });
    await this.contract.safeTransferFrom(owner, other, 3, { from: owner });
    expect(await this.contract.balanceOf(owner)).to.be.bignumber.equal("1");
    expect(await this.contract.balanceOf(other)).to.be.bignumber.equal("2");    
    
    expect(await this.contract.tokenOfOwnerByIndex(other, 0)).to.be.bignumber.equal("2");
    expect(await this.contract.tokenOfOwnerByIndex(other, 1)).to.be.bignumber.equal("3");
  });
  
  
  it('Find by hash', async function () {
    this.contract.grantRole(proofRole, owner, { from: owner });
    await this.contract.addProof(owner, proofHash1, description1, { from: owner });
    await this.contract.addProof(owner, proofHash2, description2, { from: owner });
    
    expect(await this.contract.getProofIdByHash(proofHash2)).to.be.bignumber.equal("2");
  });

  
  it('Burning', async function () {
    this.contract.grantRole(proofRole, owner, { from: owner });
    await this.contract.addProof(owner, proofHash1, description1, { from: owner });
    await this.contract.addProof(owner, proofHash2, description2, { from: owner });
    expect(await this.contract.totalSupply()).to.be.bignumber.equal("2");
    expect(await this.contract.balanceOf(owner)).to.be.bignumber.equal("2");

    await expectRevert(
      this.contract.deleteProof(2, { from: other }),
      "VerifiedExistence: burn caller is not owner nor approved"
    );

    await this.contract.deleteProof(2, { from: owner });
    expect(await this.contract.totalSupply()).to.be.bignumber.equal("1");
    expect(await this.contract.balanceOf(owner)).to.be.bignumber.equal("1");
    // data can't be retrieved anymore
    await expectRevert(
      this.contract.getProofData(2, { from: other }),
      "VerifiedExistence: proof by this id does not exist"
    );
    expect(await this.contract.getProofIdByHash(proofHash2)).to.be.bignumber.equal("0");

    // the other record is still ok
    await this.contract.getProofData(1, { from: other });
    expect(await this.contract.getProofIdByHash(proofHash1)).to.be.bignumber.equal("1");
  });  


  it('Can\'t confirm non-existent proof', async function () {
    await expectRevert(
      this.contract.addConfirmation(1, { from: owner }),
      "VerifiedExistence: proof by this id does not exist"
    );
  });
  
  
  it('Whitelisting to add confirmations', async function () {
    this.contract.grantRole(proofRole, owner, { from: owner });
    await this.contract.addProof(owner, proofHash1, description1, { from: owner });
    await expectRevert(
      this.contract.addConfirmation(1, { from: owner }),
      "VerifiedExistence: you are not permitted to confirm a proof"
    );
    
    this.contract.grantRole(confirmRole, owner, { from: owner });
    await this.contract.addConfirmation(1, { from: owner });
  });


  it('Counting confirmations', async function () {
    this.contract.grantRole(proofRole, owner, { from: owner });
    this.contract.grantRole(confirmRole, owner, { from: owner });
        
    await this.contract.addProof(owner, proofHash1, description1, { from: owner });
    expect(await this.contract.getProofConfirmationCount(1)).to.be.bignumber.equal("0");
    
    await this.contract.addConfirmation(1, { from: owner });
    expect(await this.contract.getProofConfirmationCount(1)).to.be.bignumber.equal("1");
    
    await expectRevert(
      this.contract.getProofConfirmationCount(2, { from: owner }),
      "VerifiedExistence: proof by this id does not exist"
    );
  });    
  
  
  it('Adding confirmations', async function () {
    this.contract.grantRole(proofRole, owner, { from: owner });
    this.contract.grantRole(confirmRole, owner, { from: owner });
    
    await this.contract.addProof(owner, proofHash1, description1, { from: owner });
    expect(await this.contract.getProofConfirmationCount(1)).to.be.bignumber.equal("0");
    
    await this.contract.addConfirmation(1, { from: owner });
    expect(await this.contract.getProofConfirmationCount(1)).to.be.bignumber.equal("1");
    
    await expectRevert(
      this.contract.addConfirmation(1, { from: owner }),
      "VerifiedExistence: you have already confirmed this proof"
    );
    
    this.contract.grantRole(confirmRole, other, { from: owner });
    await this.contract.addConfirmation(1, { from: other });
    expect(await this.contract.getProofConfirmationCount(1)).to.be.bignumber.equal("2");    
  });
  
  
  it('Checking confirmer', async function () {
    this.contract.grantRole(proofRole, owner, { from: owner });
    this.contract.grantRole(confirmRole, owner, { from: owner });
    
    await this.contract.addProof(owner, proofHash1, description1, { from: owner });
    await this.contract.addConfirmation(1, { from: owner });
    expect(await this.contract.getProofConfirmationCount(1)).to.be.bignumber.equal("1");
    
    await expectRevert(
      this.contract.isConfirmedBy(2, owner, { from: owner }),
      "VerifiedExistence: proof by this id does not exist"
    );
    
    assert.isOk(await this.contract.isConfirmedBy(1, owner));    
    assert.isNotOk(await this.contract.isConfirmedBy(1, other));
  });    

  
  it('Confirmation emits an event', async function () {
    this.contract.grantRole(proofRole, owner, { from: owner });
    this.contract.grantRole(confirmRole, owner, { from: owner });    
    await this.contract.addProof(owner, proofHash1, description1, { from: owner });
    
    const receipt = await this.contract.addConfirmation(1, { from: owner });
    id = new BN(1); // it requires big number
    expectEvent(receipt, 'ProofConfirmed', { proofId: id, confirmer: owner });
  });
});
