const { ethers, upgrades } = require('hardhat');
const deployed = require('../build/deploy.json');

const PROXY_ADDRESS = '0x756B66Dd6DB315547Eaf72dF57c4a899Ff2FE9a2';

const main = async () => {
  const TenLotsV2 = await ethers.getContractFactory('TenLots');
  await upgrades.upgradeProxy(PROXY_ADDRESS, TenLotsV2);
  console.log('Proxy upgraded');
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
