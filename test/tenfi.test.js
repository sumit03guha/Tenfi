const { expect } = require('chai');
const { ethers, network } = require('hardhat');
const csv = require('csv-parser');
const fs = require('fs');
const Web3 = require('web3');
const abi = require('../scripts/old_contract_ABI');

const timer = (ms) => new Promise((res) => setTimeout(res, ms));

describe('TenLots', () => {
  let TenLots, tenLots, BUSDt;
  let contract;
  let addresses = [];
  let data2 = [];
  let userReward = [];
  let owner, user1, user2, user3;
  const singleStakingVault = 14;
  const coolDownPeriod = 43200;
  const precisionMultiplier = ethers.BigNumber.from('10').pow(40);
  const tenfi = '0xd15C444F1199Ae72795eba15E8C1db44E47abF62';
  let BUSD;
  const tenFarm = '0x264A1b3F6db28De4D3dD4eD23Ab31A468B0C1A96';
  const tenFinance = '0x393c7C3EbCBFf2c1138D123df5827e215458F0c4';

  before(async () => {
    const accounts = await ethers.getSigners();
    owner = accounts[0];
    user1 = accounts[1];
    user2 = accounts[2];
    user3 = accounts[2];

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

  // describe('Sanity checks', async () => {
  //   before(async () => {
  //     TenLots = await hre.ethers.getContractFactory('TenLots');
  //     tenLots = await TenLots.connect(owner).deploy();
  //     await tenLots.deployed();
  //   });
  //   it('should deploy', async () => {
  //     console.log('TenLots deployed : ', tenLots.address);
  //     expect(tenLots.address).to.not.be.undefined;
  //   });
  // });

  describe('Deploy proxy', async () => {
    before(async () => {
      const web3 = new Web3(
        'https://speedy-nodes-nyc.moralis.io/f19381e84e5c8dde5935ae3e/bsc/mainnet/archive'
      );

      contract = new web3.eth.Contract(
        abi,
        '0x5123631036e563aEdfd9D9EfB35F2Ce25729783c'
      );

      BUSDt = await hre.ethers.getContractFactory('BUSDt');
      BUSD = await BUSDt.connect(owner).deploy();
      await BUSD.deployed();

      BUSD_addr = BUSD.address;

      TenLots = await hre.ethers.getContractFactory('TenLots');
      tenLots = await upgrades.deployProxy(
        TenLots,
        [
          singleStakingVault,
          coolDownPeriod,
          precisionMultiplier,
          tenfi,
          BUSD_addr,
          tenFarm,
          tenFinance,
        ],
        {
          initializer: 'initialize',
        }
      );
      await tenLots.deployed();

      await BUSD.transfer(
        tenLots.address,
        ethers.BigNumber.from('100000000000000000000000000')
      );

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

      await tenLots.connect(owner).addVestingPeriod(0, 1, 250);
      await tenLots.connect(owner).addVestingPeriod(1, 2, 500);
      await tenLots.connect(owner).addVestingPeriod(2, 3, 750);
      await tenLots.connect(owner).addVestingPeriod(3, 4, 1000);

      await tenLots
        .connect(owner)
        .setAccRewardPerLot([
          '19146046309380222227',
          '81206084128536710372',
          '137000462220996996429',
        ]);

      await tenLots.connect(owner).editCoolDownPeriod(5);
    });
    it('should deploy', async () => {
      console.log('TenLots proxy deployed : ', tenLots.address);
      expect(tenLots.address).to.not.be.undefined;
    });
    it('should enter users into staking', async () => {
      const len = data2.length;
      let start = 0;
      for (let index = 1; index <= Math.ceil(len / 100); index++) {
        if (index <= Math.floor(len / 100)) {
          await tenLots
            .connect(owner)
            .enterUserIntoStaking(
              addresses.slice(start, start + 100),
              data2.slice(start, start + 100)
            );
          start += 100;
        } else {
          await tenLots
            .connect(owner)
            .enterUserIntoStaking(
              addresses.slice(start, len + 1),
              data2.slice(start, len + 1)
            );
        }
        // console.log(`${index} done`);
        // console.log(`${start} done`);
      }

      // await tenLots
      //   .connect(owner)
      //   .enterUserIntoStaking([addresses[13]], [data2[13]]);
      // console.log('done');

      // expect(await tenLots.totalStaked()).to.eq(
      //   await contract.methods.totalStaked.call()
      // );
      // console.log(1, await tenLots.totalStaked());
      // console.log(2, await contract.methods.totalStaked().call());
    });
    it('should return true for users entered', async () => {
      for (let i = 0; i < addresses.length; i++) {
        const res = await tenLots.userEntered(addresses[i]);
        expect(res).to.be.true;
      }
    });
    it('should let the entered users to claim', async () => {
      let user;
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [addresses[13]],
      });
      user = await ethers.getSigner(addresses[13]);
      await tenLots
        .connect(owner)
        .editUserClaimTimeStamp(addresses[13], false, 0);
      timer(1000);
      const obj = await tenLots.enterStakingStats(addresses[13]);
      console.log(obj.pendingFee.toString());

      await tenLots.connect(user).claim({
        value: ethers.utils.parseUnits(obj.pendingFee.toString(), 'wei'),
      });

      // const res = await tenLots.userEntered(addresses[13]);
      // expect(res).to.be.false;
    });
  });
});
