const { network, ethers } = require("hardhat")
const { developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS } = require("../helper-hardhat-config")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const fee = ethers.utils.parseEther("0.01")
    const minFund = ethers.utils.parseEther("0.1")
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    log("----------------------------------------------------")
    const arguments = [fee, minFund]
    await deploy("Fundraise", {
        from: deployer,
        args: arguments,
        log: true,
        waitConfirmations: waitBlockConfirmations,
    })
}

module.exports.tags = ["all", "fundraise"]
