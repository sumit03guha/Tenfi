const { expect } = require('chai');
const { ethers } = require('hardhat');
const csv = require('csv-parser');
const fs = require('fs');
const Web3 = require('web3');
const abi = require('../scripts/old_contract_ABI');

describe('TenLots', () => {
  let TenLots, tenLots;
  let owner, user1, user2, user3;
  const singleStakingVault = 14;
  const coolDownPeriod = 43200;
  const precisionMultiplier = ethers.BigNumber.from('10').pow(40);
  const tenfi = '0xd15C444F1199Ae72795eba15E8C1db44E47abF62';
  const BUSD = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
  const tenFarm = '0x264A1b3F6db28De4D3dD4eD23Ab31A468B0C1A96';
  const tenFinance = '0x393c7C3EbCBFf2c1138D123df5827e215458F0c4';

  before(async () => {
    const accounts = await ethers.getSigners();
    owner = accounts[0];
    user1 = accounts[1];
    user2 = accounts[2];
    user3 = accounts[2];
  });

  describe('Sanity checks', async () => {
    before(async () => {
      TenLots = await hre.ethers.getContractFactory('TenLots');
      tenLots = await TenLots.connect(owner).deploy();
      await tenLots.deployed();
    });
    it('should deploy', async () => {
      console.log('TenLots deployed : ', tenLots.address);
      expect(tenLots.address).to.not.be.undefined;
    });
  });

  describe('Deploy proxy', async () => {
    let contract;
    let addresses = [];
    let data2 = [];
    let userReward = [];

    before(async () => {
      const web3 = new Web3('http://127.0.0.1:8545/');

      contract = new web3.eth.Contract(
        abi,
        '0x5123631036e563aEdfd9D9EfB35F2Ce25729783c'
      );

      TenLots = await hre.ethers.getContractFactory('TenLots');
      tenLots = await upgrades.deployProxy(
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

      await tenLots
        .connect(owner)
        .addLevel(
          ethers.BigNumber.from('2500000000000000000000'),
          ethers.BigNumber.from('50000000000000000000000'),
          300,
          30000
        );
      await tenLots
        .connect(owner)
        .addLevel(
          ethers.BigNumber.from('50000000000000000000000'),
          ethers.BigNumber.from('250000000000000000000000'),
          400,
          1500
        );
      await tenLots
        .connect(owner)
        .addLevel(
          ethers.BigNumber.from('250000000000000000000000'),
          ethers.BigNumber.from(
            '10000000000000000000000000000000000000000000000000000000000000000'
          ),
          300,
          200
        );

      await tenLots
        .connect(owner)
        .setAccRewardPerLot([
          '19146046309380222227',
          '81206084128536710372',
          '137000462220996996429',
        ]);

      fs.createReadStream('./data/extracted2.csv')
        .pipe(csv())
        .on('data', (data) => {
          userReward.push(data.userReward);
          addresses.push(data.Address);
          data2.push({
            balance: ethers.BigNumber.from(`${data.Balance}`),
            timestamp: `${data.TimeStamp}`,
            level: `${data.Level}`,
            claimTimeStamp: `${0}`,
            pendingFee: `${0}`,
            rewardDebt: ethers.BigNumber.from(`${data.RewardDebt}`),
          });
        });
    });
    it('should deploy', async () => {
      console.log('TenLots proxy deployed : ', tenLots.address);
      expect(tenLots.address).to.not.be.undefined;
    });
    it('should enter into staking', async () => {
      console.log('data: ', data2[0]);
      console.log('address: ', addresses[0]);
      const dummy = [data2[0]];
      await tenLots.enterUserIntoStaking([addresses[0]], dummy);

      // addresses.forEach(async (address, index) => {
      //   await expect(tenLots.userRewardPerLot(address)).to.eq(
      //     userReward[index]
      //   );
      // });
      // console.log(await tenLots.userRewardPerLot(addresses[0]));

      // console.log('userReward', userReward[0]);
      // console.log(await tenLots.userRewardPerLot[addresses[0]]);
      // console.log('res: ', res);

      expect(await tenLots.userRewardPerLot(addresses[0])).to.eq(
        await contract.methods.userRewardPerLot(addresses[0]).call()
      );
      console.log(1, await tenLots.userRewardPerLot(addresses[0]));
      console.log(
        2,
        await contract.methods.userRewardPerLot(addresses[0]).call()
      );
    });
  });
});
