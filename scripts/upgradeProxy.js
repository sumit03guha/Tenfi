const { ethers, upgrades } = require('hardhat');
const deployed = require('../build/deploy.json');

const PROXY_ADDRESS = '0xCf87825B8a215Cb78e7515819cBC279a7Bbc052b';

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
