const { ethers, upgrades } = require('hardhat');
const deployed = require('../build/deploy.json');

const PROXY_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';

const main = async () => {
  const TenLotsV2 = await ethers.getContractFactory('TenLots');
  await upgrades.upgradeProxy(PROXY_ADDRESS, TenLotsV2);
  console.log('Proxy upgraded');

  const addr = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
  console.log('TenLots implementation : ', addr);
};

main()
  .then(async () => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
