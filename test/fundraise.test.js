const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { moveBlocks } = require("../utils/move-blocks")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Fundraise Unit Tests", function () {
          let fundraise, fundraiseContract
          const fee = ethers.utils.parseEther("0.01")
          const minFund = ethers.utils.parseEther("0.1")
          const campaignTime = 1
          const goalFund = ethers.utils.parseEther("10")
          const newValue = ethers.utils.parseEther("1")

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              user1 = accounts[1]
              user2 = accounts[2]

              await deployments.fixture(["all"])

              fundraiseContract = await ethers.getContractFactory("Fundraise")
              fundraise = await fundraiseContract.deploy(fee, minFund)
          })

          describe("createCampaign()", function () {
              it("can create fundraising campaign and emits an event", async () => {
                  const tx = await fundraise
                      .connect(user1)
                      .createCampaign("Test", "Test", goalFund, campaignTime, { value: fee })
                  expect(tx).to.emit(fundraise, "CampaignCreated")
              })
              it("can't create a new campaign without paying fee", async () => {
                  const tx = fundraise
                      .connect(user1)
                      .createCampaign("Test", "Test", goalFund, campaignTime)
                  await expect(tx).to.be.revertedWith("Error: incorrect fee amount")
              })

              it("can't create a new campaign, if its goal fund less than 1 ether", async () => {
                  const tx = fundraise.connect(user1).createCampaign("Test", "Test", 1, 0, {
                      value: fee,
                  })
                  await expect(tx).to.be.reverted
              })

              it("can't have 2 live campaign at the same time", async () => {
                  const tx1 = await fundraise
                      .connect(user1)
                      .createCampaign("Test", "Test", goalFund, campaignTime, {
                          value: fee,
                      })
                  const tx2 = fundraise
                      .connect(user1)
                      .createCampaign("Test", "Test", goalFund, campaignTime, {
                          value: fee,
                      })
                  await expect(tx2).to.be.reverted
              })
          })
          describe("fundCampaign()", () => {
              beforeEach(async () => {
                  await fundraise
                      .connect(user1)
                      .createCampaign("Test", "Test", goalFund, campaignTime, { value: fee })
              })
              it("can fund campaign and emits an event", async () => {
                  const tx = await fundraise.connect(user2).fundCampaign(0, { value: minFund })
                  expect(tx).to.emit(fundraise, "CampaignFunded")
              })

              it("can't fund campaign less than minimum value", async () => {
                  const fundraiseConnectedContract = await fundraise.connect(user2)
                  await expect(
                      fundraiseConnectedContract.fundCampaign(0, {
                          value: ethers.utils.parseEther("0.01"),
                      })
                  ).to.be.revertedWith("Not enough to fund")
              })
              //   it("shows correct donation info", async () => {
              //       const tx1 = await fundraise
              //           .connect(user2)
              //           .fundCampaign(0, { value: ethers.utils.parseEther("0.5") })
              //       const tx2 = await fundraise.connect(user2).fundCampaign(0, { value: minFund })

              //       // checks donation info
              //       const donationInfo = await fundraise.connect(user2).getDonation(0)
              //       assert.equal(donationInfo[1], user2.address)
              //       assert.equal(ethers.utils.formatEther(donationInfo[2]), 0.5)
              //   })
          })

          describe("closeCampaign()", () => {
              beforeEach(async () => {
                  await fundraise
                      .connect(user1)
                      .createCampaign("Test", "Test", goalFund, campaignTime, { value: fee })
              })
              it("can't call closeCampaign() if not the creator", async () => {
                  const fundraiseConnectedContract = await fundraise.connect(user2)
                  await expect(fundraiseConnectedContract.closeCampaign(0)).to.be.revertedWith(
                      "NotCreator()"
                  )
              })

              it("can't close if campaign is still active", async () => {
                  const fundraiseConnectedContract = await fundraise.connect(user1)
                  await expect(fundraiseConnectedContract.closeCampaign(0)).to.be.revertedWith(
                      "Fundraising is still active"
                  )
              })

              it("can close campaign and emits an event", async () => {
                  if ((network.config.chainId = "31337")) {
                      await moveBlocks(1, (sleepAmount = 10))
                  }
                  const tx = fundraise.connect(user1).closeCampaign(0)
                  expect(tx).to.emit(fundraise, "CampaignClosed")
              })
          })

          describe("onlyOwner functions", () => {
              it("collectFee()", async () => {
                  await fundraise
                      .connect(user1)
                      .createCampaign("Test", "Test", goalFund, campaignTime, { value: fee })

                  const contractBalanceBefore = await fundraise.provider.getBalance(
                      fundraise.address
                  )
                  assert.equal(ethers.utils.formatEther(contractBalanceBefore), 0.01)
                  // can't access function if not the owner
                  const fundraiseConnectedContract = await fundraise.connect(user2)
                  await expect(fundraiseConnectedContract.collectFee()).to.be.revertedWith(
                      "NotOwner()"
                  )
                  // if owner, can withdraw fee from contract
                  const tx = await fundraise.connect(deployer).collectFee()
                  const contractBalanceAfter = await fundraise.provider.getBalance(
                      fundraise.address
                  )
                  assert.equal(contractBalanceAfter, 0)
              })
              it("changeFee()", async () => {
                  const fundraiseConnectedContract = await fundraise.connect(user2)
                  // can't access function if not the owner
                  await expect(fundraiseConnectedContract.changeFee(newValue)).to.be.revertedWith(
                      "NotOwner()"
                  )
                  // if owner, can change value
                  const tx = await fundraise.connect(deployer).changeFee(newValue)
                  const contractFee = await fundraise.fee()
                  assert.equal(
                      ethers.utils.formatEther(contractFee),
                      ethers.utils.formatEther(newValue)
                  )
              })
              it("changeMinFund()", async () => {
                  const fundraiseConnectedContract = await fundraise.connect(user2)
                  // can't access function if not the owner
                  await expect(
                      fundraiseConnectedContract.changeMinFund(newValue)
                  ).to.be.revertedWith("NotOwner()")

                  // if owner, can change value
                  const tx = await fundraise.connect(deployer).changeMinFund(newValue)
                  const contractMinFund = await fundraise.minFund()
                  assert.equal(
                      ethers.utils.formatEther(contractMinFund),
                      ethers.utils.formatEther(newValue)
                  )
              })
              it("changeOwner()", async () => {
                  const fundraiseConnectedContract = await fundraise.connect(user2)
                  // can't access function if not the owner
                  await expect(
                      fundraiseConnectedContract.changeOwner(user1.address)
                  ).to.be.revertedWith("NotOwner()")
                  // if owner, can set new owner of contract
                  const tx = await fundraise.connect(deployer).changeOwner(user1.address)
                  const contractOwner = await fundraise.owner()
                  assert.equal(contractOwner, user1.address)
              })
              it("setPaused()", async () => {
                  const fundraiseConnectedContract = await fundraise.connect(user2)
                  await expect(fundraiseConnectedContract.setPaused(true)).to.be.revertedWith(
                      "NotOwner()"
                  )
                  // if owner, can set pause if case of emergency
                  const tx = await fundraise.connect(deployer).setPaused(true)
                  const contractPause = await fundraise._paused()
                  assert.equal(contractPause, true)
              })
          })
      })
