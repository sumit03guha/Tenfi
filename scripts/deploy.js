const { ethers, upgrades } = require('hardhat');

const main = async () => {
  const singleStakingVault = 14;
  const coolDownPeriod = 43200;
  const precisionMultiplier = ethers.BigNumber.from('10').pow(40);
  const tenfi = '0xd15C444F1199Ae72795eba15E8C1db44E47abF62';
  const BUSD = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
  const tenFarm = '0x264A1b3F6db28De4D3dD4eD23Ab31A468B0C1A96';
  const tenFinance = '0x393c7C3EbCBFf2c1138D123df5827e215458F0c4';

  const TenLots = await hre.ethers.getContractFactory('TenLots');
  const tenLots = await upgrades.deployProxy(
    TenLots,
    [
      singleStakingVault,
      coolDownPeriod,
      precisionMultiplier,
      tenfi,
      BUSD,
      tenFarm,
      tenFinance,
    ],
    {
      initializer: 'initialize',
    }
  );
  await tenLots.deployed();
  console.log('TenLots deployed : ', tenLots.address);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
