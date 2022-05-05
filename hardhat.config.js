require('@nomiclabs/hardhat-waffle');
require('@openzeppelin/hardhat-upgrades');
require('@nomiclabs/hardhat-etherscan');
require('solidity-coverage');
const secrets = require('./secrets.json');

const BSCSCAN_API_KEY = secrets.BSCSCAN_API_KEY;
const POLYGONSCAN_API_KEY = secrets.POLYGONSCAN_API_KEY;

module.exports = {
  solidity: {
    version: '0.8.12',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  mocha: {
    timeout: 100000000,
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    bsc: {
      url: 'https://bsc-dataseed.binance.org/',
      chainId: 56,
    },
    testnet: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      chainId: 97,
    },
    rinkeby: {
      url: 'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      chainId: 4,
    },
    mumbai: {
      url: 'https://matic-mumbai.chainstacklabs.com',
      chainId: 80001,
    },
    truffle: {
      url: 'http://localhost:24012/rpc',
    },
  },
  etherscan: {
    apiKey: BSCSCAN_API_KEY,
  },
};
