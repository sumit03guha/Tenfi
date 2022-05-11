const { expect } = require('chai');
const { ethers, network } = require('hardhat');
const csv = require('csv-parser');
const fs = require('fs');
const Web3 = require('web3');
const abi = require('../scripts/old_contract_ABI');
const abi2 = require('../scripts/TERC20Delegator_ABI');
const abi3 = require('../scripts/Tenfi_ABI');

const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545/');

describe('TenLots', () => {
  let TenLots, tenLots, BUSDt, busdt;
  let contract;
  let addresses = [];
  let data2 = [];
  let userReward = [];
  let owner, user1, user2, user3;

  const singleStakingVault = 14;
  const coolDownPeriod = 43200;
  const precisionMultiplier = ethers.BigNumber.from('10').pow(40);
  const tenfi = '0xd15C444F1199Ae72795eba15E8C1db44E47abF62';
  const tenFarm = '0x264A1b3F6db28De4D3dD4eD23Ab31A468B0C1A96';
  const tenFinance = '0x393c7C3EbCBFf2c1138D123df5827e215458F0c4';
  const TToken = '0x7b205e1a4cbfb96dda4f94013158c5500981f128';

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

  describe('Deploy proxy and end to end testing', async () => {
    before(async () => {
      const web3 = new Web3(
        'https://speedy-nodes-nyc.moralis.io/f19381e84e5c8dde5935ae3e/bsc/mainnet/archive'
      );

      contract = new web3.eth.Contract(
        abi,
        '0x5123631036e563aEdfd9D9EfB35F2Ce25729783c'
      );

      BUSDt = await hre.ethers.getContractFactory('BUSDt');
      busdt = await BUSDt.connect(owner).deploy();
      await busdt.deployed();

      const BUSD_addr = busdt.address;

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

      await busdt.transfer(
        tenLots.address,
        ethers.BigNumber.from('100000000000000000000000000')
      );

      await tenLots
        .connect(owner)
        .addLevel(
          ethers.BigNumber.from('5000000000000000000'),
          ethers.BigNumber.from('10000000000000000000'),
          300,
          30000
        );
      await tenLots
        .connect(owner)
        .addLevel(
          ethers.BigNumber.from('10000000000000000000'),
          ethers.BigNumber.from('15000000000000000000'),
          400,
          1500
        );
      await tenLots
        .connect(owner)
        .addLevel(
          ethers.BigNumber.from('15000000000000000000'),
          ethers.BigNumber.from(
            '10000000000000000000000000000000000000000000000000000000000000000'
          ),
          300,
          200
        );

      await tenLots
        .connect(owner)
        .addVault(
          [61, 95],
          [
            '0xf9FAdb9222848Cde36c0C06cF88776DC41937083',
            '0x84123de7279Ee0F745631B8769993C6A61e29515',
          ]
        );

      await tenLots.connect(owner).addVestingPeriod(0, 7776000, 250);
      await tenLots.connect(owner).addVestingPeriod(7776000, 15552000, 500);
      await tenLots.connect(owner).addVestingPeriod(15552000, 31104000, 750);
      await tenLots.connect(owner).addVestingPeriod(31104000, 62208000, 1000);

      await tenLots
        .connect(owner)
        .setAccRewardPerLot([
          '19146046309380222227',
          '81206084128536710372',
          '137000462220996996429',
        ]);

      //     await tenLots.connect(owner).editCoolDownPeriod(5);
    });

    it('should deploy', async () => {
      console.log('TenLots proxy deployed : ', tenLots.address);
      expect(tenLots.address).to.not.be.undefined;
    });

    it('should enter users into staking', async () => {
      const len = data2.length;
      let start = 0;
      console.log('entering users into staking...');
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
      }
      console.log('entered users into staking');
      console.log('validating balance...');
      for (let i = 0; i < addresses.length; i++) {
        // console.log('index : ', i);
        // expect(
        //   (await tenLots.enterStakingStats(addresses[i])).balance.toString()
        // ).to.equal(
        //   (await contract.methods.enterStakingStats(addresses[i]).call())
        //     .balance
        // );
        if (
          (await tenLots.enterStakingStats(addresses[i])).balance.toString() !=
          (await contract.methods.enterStakingStats(addresses[i]).call())
            .balance
        ) {
          console.log('address : ', addresses[i]);
          console.log('index : ', i);
        }
      }
    });

    it('validate user rewards', async () => {
      for (let i = 0; i < addresses.length; i++) {
        const res = await tenLots.userRewardPerLot(addresses[i]);
        expect(res.toString()).to.equal(
          await contract.methods.userRewardPerLot(addresses[i]).call()
        );
        console.log('RES..', res);
      }
    });

    it('should return true for users entered', async () => {
      for (let i = 0; i < addresses.length; i++) {
        const res = await tenLots.userEntered(addresses[i]);
        expect(res).to.be.true;
      }
    });

    it('should edit user claim timestamp with penalty', async () => {
      await tenLots
        .connect(owner)
        .enterUserIntoStaking([addresses[3]], [data2[3]]);
      let user;
      let amount;
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [addresses[3]],
      });
      user = await ethers.getSigner(addresses[3]);
      amount = (await tenLots.enterStakingStats(addresses[3])).balance;
      await tenLots
        .connect(owner)
        .editUserClaimTimeStamp(addresses[3], true, amount.toString());
      expect(await tenLots.userEntered(addresses[3])).to.equal(false);
      expect(await tenLots.totalPenalties()).to.eq(amount.toString());
    });

    it('should let the entered users to claim 25%', async () => {
      const testData = {
        balance: data2[13].balance,
        timestamp: (Date.now() / 1000).toFixed(0),
        level: data2[13].level,
        claimTimeStamp: data2[13].claimTimeStamp,
        pendingFee: data2[13].pendingFee,
        rewardDebt: data2[13].rewardDebt,
      };
      await tenLots
        .connect(owner)
        .enterUserIntoStaking([addresses[13]], [testData]);
      console.log('done');
      let user;
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [addresses[13]],
      });
      user = await ethers.getSigner(addresses[13]);
      await tenLots
        .connect(owner)
        .editUserClaimTimeStamp(addresses[13], false, 0);

      await network.provider.send('evm_increaseTime', [500]);
      await network.provider.send('evm_mine');

      const obj = await tenLots.enterStakingStats(addresses[13]);
      console.log(obj.pendingFee.toString());

      await user1.sendTransaction({
        to: addresses[13],
        value: ethers.utils.parseEther('100.0'),
      });

      const bal = await provider.getBalance(addresses[13]);
      const busdBal = await busdt.balanceOf(addresses[13]);
      const userReward = await tenLots.userRewardPerLot(addresses[13]);
      console.log(`userReward : ${ethers.utils.formatEther(userReward)}`);
      console.log(`account balance: ${ethers.utils.formatEther(bal)} Eth`);
      console.log(`BUSD balance: ${ethers.utils.formatEther(busdBal)} BUSD`);
      await tenLots.connect(user).claim({
        value: ethers.utils.parseUnits(obj.pendingFee.toString(), 'wei'),
      });
      const busdBal2 = await busdt.balanceOf(addresses[13]);
      console.log(
        `BUSD balance after: ${ethers.utils.formatEther(busdBal2)} BUSD`
      );

      const res = await tenLots.userEntered(addresses[13]);
      expect(res).to.be.false;
    });

    it('should let the entered users to claim 50%', async () => {
      const testData = {
        balance: data2[14].balance,
        timestamp: (Date.now() / 1000).toFixed(0),
        level: data2[14].level,
        claimTimeStamp: data2[14].claimTimeStamp,
        pendingFee: data2[14].pendingFee,
        rewardDebt: data2[14].rewardDebt,
      };
      await tenLots
        .connect(owner)
        .enterUserIntoStaking([addresses[14]], [testData]);
      console.log('done');
      let user;
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [addresses[14]],
      });
      user = await ethers.getSigner(addresses[14]);
      await tenLots
        .connect(owner)
        .editUserClaimTimeStamp(addresses[14], false, 0);

      await network.provider.send('evm_increaseTime', [7776000]);
      await network.provider.send('evm_mine');

      const obj = await tenLots.enterStakingStats(addresses[14]);
      console.log(obj.pendingFee.toString());

      await user1.sendTransaction({
        to: addresses[14],
        value: ethers.utils.parseEther('100.0'),
      });

      const bal = await provider.getBalance(addresses[14]);
      const busdBal = await busdt.balanceOf(addresses[14]);
      const userReward = await tenLots.userRewardPerLot(addresses[14]);
      console.log(`userReward : ${ethers.utils.formatEther(userReward)}`);
      console.log(`account balance: ${ethers.utils.formatEther(bal)} Eth`);
      console.log(`BUSD balance: ${ethers.utils.formatEther(busdBal)} BUSD`);
      await tenLots.connect(user).claim({
        value: ethers.utils.parseUnits(obj.pendingFee.toString(), 'wei'),
      });
      const busdBal2 = await busdt.balanceOf(addresses[14]);
      console.log(
        `BUSD balance after: ${ethers.utils.formatEther(busdBal2)} BUSD`
      );

      const res = await tenLots.userEntered(addresses[14]);
      expect(res).to.be.false;
    });

    it('should let the entered users to claim 75%', async () => {
      const testData = {
        balance: data2[15].balance,
        timestamp: (Date.now() / 1000).toFixed(0),
        level: data2[15].level,
        claimTimeStamp: data2[15].claimTimeStamp,
        pendingFee: data2[15].pendingFee,
        rewardDebt: data2[15].rewardDebt,
      };
      await tenLots
        .connect(owner)
        .enterUserIntoStaking([addresses[15]], [testData]);
      console.log('done');
      let user;
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [addresses[15]],
      });
      user = await ethers.getSigner(addresses[15]);
      await tenLots
        .connect(owner)
        .editUserClaimTimeStamp(addresses[15], false, 0);

      await network.provider.send('evm_increaseTime', [15552000]);
      await network.provider.send('evm_mine');

      const obj = await tenLots.enterStakingStats(addresses[15]);
      console.log(obj.pendingFee.toString());

      await user1.sendTransaction({
        to: addresses[15],
        value: ethers.utils.parseEther('100.0'),
      });

      const bal = await provider.getBalance(addresses[15]);
      const busdBal = await busdt.balanceOf(addresses[15]);
      const userReward = await tenLots.userRewardPerLot(addresses[15]);
      console.log(`userReward : ${ethers.utils.formatEther(userReward)}`);
      console.log(`account balance: ${ethers.utils.formatEther(bal)} Eth`);
      console.log(`BUSD balance: ${ethers.utils.formatEther(busdBal)} BUSD`);
      await tenLots.connect(user).claim({
        value: ethers.utils.parseUnits(obj.pendingFee.toString(), 'wei'),
      });
      const busdBal2 = await busdt.balanceOf(addresses[15]);
      console.log(
        `BUSD balance after: ${ethers.utils.formatEther(busdBal2)} BUSD`
      );

      const res = await tenLots.userEntered(addresses[15]);
      expect(res).to.be.false;
    });

    it('should let the entered users to claim 100%', async () => {
      const testData = {
        balance: data2[16].balance,
        timestamp: (Date.now() / 1000).toFixed(0),
        level: data2[16].level,
        claimTimeStamp: data2[16].claimTimeStamp,
        pendingFee: data2[16].pendingFee,
        rewardDebt: data2[16].rewardDebt,
      };
      await tenLots
        .connect(owner)
        .enterUserIntoStaking([addresses[16]], [testData]);
      console.log('done');
      let user;
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [addresses[16]],
      });
      user = await ethers.getSigner(addresses[16]);
      await tenLots
        .connect(owner)
        .editUserClaimTimeStamp(addresses[16], false, 0);

      await network.provider.send('evm_increaseTime', [31104000]);
      await network.provider.send('evm_mine');

      const obj = await tenLots.enterStakingStats(addresses[16]);
      console.log(obj.pendingFee.toString());

      await user1.sendTransaction({
        to: addresses[16],
        value: ethers.utils.parseEther('100.0'),
      });

      const bal = await provider.getBalance(addresses[16]);
      const busdBal = await busdt.balanceOf(addresses[16]);
      const userReward = await tenLots.userRewardPerLot(addresses[16]);
      console.log(`userReward : ${ethers.utils.formatEther(userReward)}`);
      console.log(`account balance: ${ethers.utils.formatEther(bal)} Eth`);
      console.log(`BUSD balance: ${ethers.utils.formatEther(busdBal)} BUSD`);
      await tenLots.connect(user).claim({
        value: ethers.utils.parseUnits(obj.pendingFee.toString(), 'wei'),
      });
      const busdBal2 = await busdt.balanceOf(addresses[16]);
      console.log(
        `BUSD balance after: ${ethers.utils.formatEther(busdBal2)} BUSD`
      );

      const res = await tenLots.userEntered(addresses[16]);
      expect(res).to.be.false;
    });

    it('should let the entered users to claim 100% when vestedperiod > maxvestingperiod', async () => {
      const testData = {
        balance: data2[17].balance,
        timestamp: (Date.now() / 1000).toFixed(0),
        level: data2[17].level,
        claimTimeStamp: data2[17].claimTimeStamp,
        pendingFee: data2[17].pendingFee,
        rewardDebt: data2[17].rewardDebt,
      };
      await tenLots
        .connect(owner)
        .enterUserIntoStaking([addresses[17]], [testData]);
      console.log('done');
      let user;
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [addresses[17]],
      });
      user = await ethers.getSigner(addresses[17]);
      await tenLots
        .connect(owner)
        .editUserClaimTimeStamp(addresses[17], false, 0);

      await network.provider.send('evm_increaseTime', [4110400000]);
      await network.provider.send('evm_mine');

      const obj = await tenLots.enterStakingStats(addresses[17]);
      console.log(obj.pendingFee.toString());

      await user1.sendTransaction({
        to: addresses[17],
        value: ethers.utils.parseEther('100.0'),
      });

      const bal = await provider.getBalance(addresses[17]);
      const busdBal = await busdt.balanceOf(addresses[17]);
      const userReward = await tenLots.userRewardPerLot(addresses[17]);
      console.log(`userReward : ${ethers.utils.formatEther(userReward)}`);
      console.log(`account balance: ${ethers.utils.formatEther(bal)} Eth`);
      console.log(`BUSD balance: ${ethers.utils.formatEther(busdBal)} BUSD`);
      await tenLots.connect(user).claim({
        value: ethers.utils.parseUnits(obj.pendingFee.toString(), 'wei'),
      });
      const busdBal2 = await busdt.balanceOf(addresses[17]);
      console.log(
        `BUSD balance after: ${ethers.utils.formatEther(busdBal2)} BUSD`
      );

      const res = await tenLots.userEntered(addresses[17]);
      expect(res).to.be.false;
    });

    it('should check TenLend market function', async () => {
      await tenLots.connect(owner).setTToken(TToken);
      expect(await tenLots.cTTokenSet()).to.be.true;
    });

    it('should check for the added cToken balanceOfUnderlying', async () => {
      let newUser;
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: ['0xaDC83042Db3a395E8e580A785eB0310B9aF9a6a3'],
      });
      newUser = await ethers.getSigner(
        '0xaDC83042Db3a395E8e580A785eB0310B9aF9a6a3'
      );

      await user1.sendTransaction({
        to: '0xaDC83042Db3a395E8e580A785eB0310B9aF9a6a3',
        value: ethers.utils.parseEther('100.0'),
      });

      const tToken = new ethers.Contract(
        '0x7B205e1a4cBFb96Dda4f94013158C5500981f128',
        abi2,
        newUser
      );

      const tenfiContract = new ethers.Contract(tenfi, abi3, newUser);
      const amountToMint = ethers.utils.parseEther('30');

      await tenfiContract
        .connect(newUser)
        .approve(tToken.address, amountToMint);

      const allowance = await tenfiContract.allowance(
        newUser.address,
        tToken.address
      );
      console.log('allowance: ', allowance);

      expect(allowance).to.equal(amountToMint);

      await tToken.connect(newUser).mint(amountToMint);

      const balance = await tToken.balanceOf(newUser.address);
      console.log('BAL : ', balance);

      await tenLots.connect(newUser).enterStaking();
      const response = await tenLots.enterStakingStats(newUser.address);
      console.log('response: ', response);
    });
  });

  describe('NEGATIVE ASSERTIONS', () => {
    before(async () => {
      const web3 = new Web3(
        'https://speedy-nodes-nyc.moralis.io/f19381e84e5c8dde5935ae3e/bsc/mainnet/archive'
      );

      contract = new web3.eth.Contract(
        abi,
        '0x5123631036e563aEdfd9D9EfB35F2Ce25729783c'
      );

      BUSDt = await hre.ethers.getContractFactory('BUSDt');
      busdt = await BUSDt.connect(owner).deploy();
      await busdt.deployed();

      const BUSD_addr = busdt.address;

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

      await busdt.transfer(
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

      await tenLots
        .connect(owner)
        .addVault(
          [61, 95],
          [
            '0xf9FAdb9222848Cde36c0C06cF88776DC41937083',
            '0x84123de7279Ee0F745631B8769993C6A61e29515',
          ]
        );

      await tenLots.connect(owner).addVestingPeriod(0, 7776000, 250);
      await tenLots.connect(owner).addVestingPeriod(7776000, 15552000, 500);
      await tenLots.connect(owner).addVestingPeriod(15552000, 31104000, 750);
      await tenLots.connect(owner).addVestingPeriod(31104000, 62208000, 1000);

      await tenLots
        .connect(owner)
        .setAccRewardPerLot([
          '19146046309380222227',
          '81206084128536710372',
          '137000462220996996429',
        ]);

      await tenLots.connect(owner).editCoolDownPeriod(5);
    });

    it('should not allow to enter user to claim if msg.value < enterStakingStats[msg.sender].pendingFee', async () => {
      const testData = {
        balance: data2[18].balance,
        timestamp: (Date.now() / 1000).toFixed(0),
        level: data2[18].level,
        claimTimeStamp: data2[18].claimTimeStamp,
        pendingFee: data2[18].pendingFee,
        rewardDebt: data2[18].rewardDebt,
      };
      await tenLots
        .connect(owner)
        .enterUserIntoStaking([addresses[18]], [testData]);

      let user;
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [addresses[18]],
      });
      user = await ethers.getSigner(addresses[18]);
      await tenLots
        .connect(owner)
        .editUserClaimTimeStamp(addresses[18], false, 0);

      await network.provider.send('evm_increaseTime', [4110400000]);
      await network.provider.send('evm_mine');

      const obj = await tenLots.enterStakingStats(addresses[18]);

      await user1.sendTransaction({
        to: addresses[18],
        value: ethers.utils.parseEther('100.0'),
      });

      await expect(
        tenLots.connect(user).claim({
          value: ethers.utils.parseUnits(
            (obj.pendingFee.toNumber() - 1).toString(),
            'wei'
          ),
        })
      ).to.be.revertedWith('TenLots : claim fees');
    });

    it('should not allow to enter user to claim if user is not entered', async () => {
      const testData = {
        balance: data2[19].balance,
        timestamp: (Date.now() / 1000).toFixed(0),
        level: data2[19].level,
        claimTimeStamp: data2[19].claimTimeStamp,
        pendingFee: data2[19].pendingFee,
        rewardDebt: data2[19].rewardDebt,
      };
      await tenLots
        .connect(owner)
        .enterUserIntoStaking([addresses[19]], [testData]);

      await network.provider.send('evm_increaseTime', [4110400000]);
      await network.provider.send('evm_mine');

      const obj = await tenLots.enterStakingStats(addresses[19]);

      await expect(
        tenLots.connect(user3).claim({
          value: ethers.utils.parseUnits(obj.pendingFee.toString(), 'wei'),
        })
      ).to.be.revertedWith('TenLots : User not allowed');
    });

    it('should not allow to enter user if user is entered', async () => {
      let user;
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [addresses[20]],
      });
      user = await ethers.getSigner(addresses[20]);
      await user1.sendTransaction({
        to: addresses[20],
        value: ethers.utils.parseEther('100.0'),
      });
      await tenLots
        .connect(owner)
        .enterUserIntoStaking([addresses[20]], [data2[20]]);
      await expect(tenLots.connect(user).enterStaking()).to.be.revertedWith(
        'TenLots : One TenLot per user'
      );
    });

    it('should not return reward if user !entered', async () => {
      console.log(user3.address);
      await expect(tenLots.userRewardPerLot(user3.address)).to.be.reverted;
    });
  });
});
