# Fundraising Dapp (hardhat) 

[Verified smart contract (Celo Alfajores Testnet)](https://alfajores.celoscan.io/address/0xaA9B91e4A68b20Be036eBde9369704c39D1Cd3ae)

### How to install and use

To set up the repository, run the below

```bash

git clone https://github.com/AnastasiaMenshikova/fundraising-dapp

cd fundraising-dapp

yarn install

```
Create the `.env` file and add your own API keys and private key by using `.example.env`. 

To deploy and verify smart contract to Celo alfajores testnet use:

 ```bash
 
 yarn deploy

 yarn verify

 ```
Verified smart contracts can be find [here](https://alfajores-blockscout.celo-testnet.org/).


For testing added static analyzer [Slither](https://github.com/crytic/slither) for Solidity code. Run following command:

```bash

yarn slither

```
If you want to write unit tests for your solidity code and check coverage of tests, run command:

```bash

yarn coverage

```
