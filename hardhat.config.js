require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("dotenv").config();

const ALFAJORES_RPC_URL = process.env.ALFAJORES_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const REPORT_GAS = process.env.REPORT_GAS || false;

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 1337,
      // uncomment, if forking needed, after that, run command 'yarn fork'
      //   forking: {
      //     url: MAINNET_RPC_URL,
      // },
    },
    alfajores: {
      // https://explorer.celo.org/alfajores
      // https://celo.org/developers/faucet
      
      // to verify contract use:
      // hardhat --network alfajores sourcify
      url: ALFAJORES_RPC_URL,
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
      chainId: 44787,
    },
  },
  
  gasReporter: {
    enabled: REPORT_GAS,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
    // coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  namedAccounts: {
    deployer: {
      default: 0, // by default take the first account as deployer
      1: 0, // on mainnet it will take the first account as deployer
    },
  },
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  mocha: {
    timeout: 200000, // 200 seconds max for running tests
  },
};
