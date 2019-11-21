const Account = artifacts.require('Account')
const { MerkleTree } = require('merkletreejs')
const keccak256 = require('keccak256')

const buf2hex = x => '0x' + x.toString('hex')

contract('Contracts', (accounts) => {
  let contract

  // owner
  const alice = accounts[0]

  // new proposed owner
  const aliceNewKey = accounts[1]

  // address book
  const bob = accounts[2]
  const charlie = accounts[3]
  const dave = accounts[4]
  const eve = accounts[5]
  const frank = accounts[6]

  const addressBook = [bob, charlie, dave, eve]

  const sign = async (msg, account) => {
    let sig = await web3.eth.sign(msg, account)
    return sig.substr(0, 130) + (sig.substr(130) === '00' ? '1b' : '1c')
  }

  before('setup', async () => {
    contract = await Account.new()
  })

  describe('should recover account with 1/n signatures', () => {
    it('should set recovery root', async () => {
      const leaves = addressBook.map(x => keccak256(x))

      const tree = new MerkleTree(leaves, keccak256, { sort: true })
      const root = tree.getHexRoot()

      await contract.setRecoveryRoot(root)
      assert.equal(await contract.recoveryRoot.call(), root)
    })

    it('should recover account given merkle proof', async () => {
      const recoveryKey = eve
      const currentOwner = alice
      const newOwner = aliceNewKey

      const leaves = addressBook.map(x => keccak256(x))
      const tree = new MerkleTree(leaves, keccak256, { sort: true })
      const leaf = keccak256(recoveryKey)
      const proof = tree.getHexProof(leaf)

      const msg = '0x' + keccak256(newOwner).toString('hex')
      const sig = await sign(msg, recoveryKey)

      assert.equal(await contract.owner.call(), currentOwner)
      await contract.recover(proof, sig, newOwner)
      assert.equal(await contract.owner.call(), newOwner)
    })
  })

  describe('should recover account with 2/n signatures', () => {
    before('setup', async () => {
      contract = await Account.new()
    })

    it('should recover account given merkle proof', async () => {
      const recoveryKey1 = eve
      const recoveryKey2 = bob
      const invalidRecoveryKey = frank
      const currentOwner = alice
      const newOwner = aliceNewKey

      const leaves = addressBook.map(x => keccak256(x))
      const tree = new MerkleTree(leaves, keccak256, { sort: true })

      const root = tree.getHexRoot()
      await contract.setRecoveryRoot(root)
      await contract.setSigsRequired(2)
      assert.equal(await contract.sigsRequired.call(), 2)

      const msg = '0x' + keccak256(newOwner).toString('hex')

      const sig1 = await sign(msg, recoveryKey1)
      const proof1 = tree.getHexProof(keccak256(recoveryKey1))

      assert.equal(await contract.owner.call(), currentOwner)
      await contract.recover(proof1, sig1, newOwner)

      const sigInvalidAccount = await sign(msg, invalidRecoveryKey)
      const proofInvalidAccount = tree.getHexProof(keccak256(invalidRecoveryKey))

      try {
        await contract.recover(proofInvalidAccount, sigInvalidAccount, newOwner)
        assert.ok(false)
      } catch(err) {
        assert.ok(err)
      }


      const sig2 = await sign(msg, recoveryKey2)
      const proof2 = tree.getHexProof(keccak256(recoveryKey2))

      assert.equal(await contract.owner.call(), currentOwner)
      await contract.recover(proof2, sig2, newOwner)

      assert.equal(await contract.owner.call(), newOwner)
    })
  })
})


