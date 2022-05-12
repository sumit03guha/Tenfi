const { ethers, upgrades } = require('hardhat');
const fs = require('fs');

const main = async () => {
  await hre.run('compile');

  const singleStakingVault = 14;
  const unitShare = 100;
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
      unitShare,
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

  const address = tenLots.address;
  const abi = JSON.parse(tenLots.interface.format('json'));

  const output = {
    address,
    abi,
  };

  fs.mkdir('./build', { recursive: true }, (err) => {
    if (err) console.error(err);
  });

  fs.writeFileSync('./build/deploy.json', JSON.stringify(output), (err) => {
    if (err) console.error(err);
  });

  console.log('TenLots proxy deployed : ', tenLots.address);
  const addr = await upgrades.erc1967.getImplementationAddress(tenLots.address);
  console.log('TenLots implementation : ', addr);

  await tenLots.addLevel(
    ethers.BigNumber.from('5000000000000000000'),
    ethers.BigNumber.from('10000000000000000000'),
    300,
    30000
  );
  await tenLots.addLevel(
    ethers.BigNumber.from('10000000000000000000'),
    ethers.BigNumber.from('15000000000000000000'),
    400,
    1500
  );
  await tenLots.addLevel(
    ethers.BigNumber.from('15000000000000000000'),
    ethers.BigNumber.from(
      '10000000000000000000000000000000000000000000000000000000000000000'
    ),
    300,
    200
  );

  console.log('TenLots levels added');

  await tenLots.addVault(
    [61, 95],
    [
      '0xf9FAdb9222848Cde36c0C06cF88776DC41937083',
      '0x84123de7279Ee0F745631B8769993C6A61e29515',
    ]
  );

  console.log('TenLots vaults added');

  await tenLots.addVestingPeriod(0, 60, 250);
  await tenLots.addVestingPeriod(60, 120, 500);
  await tenLots.addVestingPeriod(120, 180, 750);
  await tenLots.addVestingPeriod(180, 240, 1000);

  console.log('TenLots vesting periods added');
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
