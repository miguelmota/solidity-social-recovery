const Account = artifacts.require('./Account.sol')

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    await deployer.deploy(Account)
  })
}
