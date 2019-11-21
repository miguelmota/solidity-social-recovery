const Account = artifacts.require('Account')
const { MerkleTree } = require('merkletreejs')
const keccak256 = require('keccak256')

const buf2hex = x => '0x' + x.toString('hex')

contract('Contracts', (accounts) => {
  let contract

  // owner
  const alice = '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1'

  // new proposed owner
  const bob = '0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0'

  // address book
  const charlie = '0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b'
  const diana = '0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d'
  const eddy = '0xd03ea8624C8C5987235048901fB614fDcA89b117'
  const frank = '0x95cED938F7991cd0dFcb48F0a06a40FA1aF46EBC'
  const gina = '0x3E5e9111Ae8eB78Fe1CC3bb8915d5D461F3Ef9A9'
  const hank = '0x28a8746e75304c0780E011BEd21C72cD78cd535E'

  const addressBook = [charlie, diana, eddy, frank, gina, hank]

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
      const recoveryKey = frank
      const currentOwner = alice
      const newOwner = bob

      const leaves = addressBook.map(x => keccak256(x))
      const tree = new MerkleTree(leaves, keccak256, { sort: true })
      const leaf = keccak256(recoveryKey)
      const proof = tree.getHexProof(leaf)

      const msg = '0x' + keccak256(newOwner).toString('hex')
      let sig = await web3.eth.sign(msg, recoveryKey)
      sig = sig.substr(0, 130) + (sig.substr(130) === '00' ? '1b' : '1c')

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
      const recoveryKey1 = frank
      const recoveryKey2 = diana
      const currentOwner = alice
      const newOwner = bob

      const leaves = addressBook.map(x => keccak256(x))
      const tree = new MerkleTree(leaves, keccak256, { sort: true })

      const root = tree.getHexRoot()
      await contract.setRecoveryRoot(root)
      await contract.setSigsRequired(2)
      assert.equal(await contract.sigsRequired.call(), 2)

      const msg = '0x' + keccak256(newOwner).toString('hex')

      let sig1 = await web3.eth.sign(msg, recoveryKey1)
      sig1 = sig1.substr(0, 130) + (sig1.substr(130) === '00' ? '1b' : '1c')

      let sig2 = await web3.eth.sign(msg, recoveryKey2)
      sig2 = sig2.substr(0, 130) + (sig2.substr(130) === '00' ? '1b' : '1c')

      assert.equal(await contract.owner.call(), currentOwner)

      const proof1 = tree.getHexProof(keccak256(recoveryKey1))
      await contract.recover(proof1, sig1, newOwner)

      assert.equal(await contract.owner.call(), currentOwner)

      const proof2 = tree.getHexProof(keccak256(recoveryKey2))
      await contract.recover(proof2, sig2, newOwner)

      assert.equal(await contract.owner.call(), newOwner)
    })
  })
})
