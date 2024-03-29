const { expect } = require('chai');
const { ethers, network } = require('hardhat');
const csv = require('csv-parser');
const fs = require('fs');
const Web3 = require('web3');
const abi1 = require('../scripts/old_contract_ABI');
const abi2 = require('../scripts/TERC20Delegator_ABI');
const abi3 = require('../scripts/Tenfi_ABI');
const { address, abi } = require('../build/deploy.json');

const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545/');

describe('TenLots', () => {
  let TenLots, tenLots, BUSDt, busdt;
  let contract;
  let addresses = [];
  let data2 = [];
  let userReward = [];
  let owner, user1, user2, user3, supplier;

  const singleStakingVault = 14;
  const unitShare = 100;
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
    supplier = accounts[3];

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

  // describe('Deploy proxy and end to end testing', async () => {
  //   beforeEach(async () => {
  //     const web3 = new Web3(
  //       'https://speedy-nodes-nyc.moralis.io/f19381e84e5c8dde5935ae3e/bsc/mainnet/archive'
  //     );

  //     contract = new web3.eth.Contract(
  //       abi,
  //       '0x5123631036e563aEdfd9D9EfB35F2Ce25729783c'
  //     );

  //     BUSDt = await hre.ethers.getContractFactory('BUSDt');
  //     busdt = await BUSDt.connect(owner).deploy();
  //     await busdt.deployed();

  //     const BUSD_addr = busdt.address;

  //     TenLots = await hre.ethers.getContractFactory('TenLotsV2');
  //     tenLots = await upgrades.deployProxy(
  //       TenLots,
  //       [
  //         singleStakingVault,
  //         unitShare,
  //         coolDownPeriod,
  //         precisionMultiplier,
  //         tenfi,
  //         BUSD_addr,
  //         tenFarm,
  //         tenFinance,
  //       ],
  //       {
  //         initializer: 'initialize',
  //       }
  //     );
  //     await tenLots.deployed();
  //     console.log('TenLots deployed');

  //     await busdt.transfer(
  //       supplier.address,
  //       ethers.BigNumber.from('50000000000000000000')
  //     );

  //     await busdt
  //       .connect(supplier)
  //       .approve(
  //         tenLots.address,
  //         ethers.BigNumber.from('50000000000000000000')
  //       );

  //     await tenLots.addLevel(
  //       ethers.BigNumber.from('5000000000000000000'),
  //       ethers.BigNumber.from('10000000000000000000'),
  //       300,
  //       30000
  //     );
  //     await tenLots.addLevel(
  //       ethers.BigNumber.from('10000000000000000000'),
  //       ethers.BigNumber.from('15000000000000000000'),
  //       400,
  //       1500
  //     );
  //     await tenLots.addLevel(
  //       ethers.BigNumber.from('15000000000000000000'),
  //       ethers.BigNumber.from(
  //         '10000000000000000000000000000000000000000000000000000000000000000'
  //       ),
  //       300,
  //       200
  //     );

  //     await tenLots.addVault(
  //       [61, 95],
  //       [
  //         '0xf9FAdb9222848Cde36c0C06cF88776DC41937083',
  //         '0x84123de7279Ee0F745631B8769993C6A61e29515',
  //       ]
  //     );

  //     await tenLots.connect(owner).addVestingPeriod(0, 7776000, 250);
  //     await tenLots.connect(owner).addVestingPeriod(7776000, 15552000, 500);
  //     await tenLots.connect(owner).addVestingPeriod(15552000, 31104000, 750);
  //     await tenLots.connect(owner).addVestingPeriod(31104000, 62208000, 1000);

  //     await tenLots.setAccRewardPerLot([
  //       ethers.BigNumber.from('19146046309380222227'),
  //       ethers.BigNumber.from('81206084128536710372'),
  //       ethers.BigNumber.from('137000462220996996429'),
  //     ]);

  //     await tenLots.editCoolDownPeriod(0);

  //     await tenLots.changeSupplier(supplier.address);

  //     console.log('Values set');
  //   });

  //   it('should deploy', async () => {
  //     console.log('TenLots proxy deployed : ', tenLots.address);
  //     expect(tenLots.address).to.not.be.undefined;
  //   });

  //   it('should enter users into staking', async () => {
  //     const len = data2.length;
  //     let start = 0;
  //     console.log('entering users into staking...');
  //     for (let index = 1; index <= Math.ceil(len / 100); index++) {
  //       if (index <= Math.floor(len / 100)) {
  //         await tenLots
  //           .connect(owner)
  //           .enterUserIntoStaking(
  //             addresses.slice(start, start + 100),
  //             data2.slice(start, start + 100)
  //           );
  //         start += 100;
  //       } else {
  //         await tenLots
  //           .connect(owner)
  //           .enterUserIntoStaking(
  //             addresses.slice(start, len + 1),
  //             data2.slice(start, len + 1)
  //           );
  //       }
  //     }
  //     console.log('entered users into staking');
  //     // const bal = await tenLots.getBalance(addresses[50]);
  //     // console.log('bal..', bal);
  //     console.log('validating balance...');
  //     // for (let i = 0; i < addresses.length; i++) {
  //     //   const actual = (
  //     //     await tenLots.enterStakingStats(addresses[i])
  //     //   ).balance.toString();
  //     //   const expected = (
  //     //     await contract.methods.enterStakingStats(addresses[i]).call()
  //     //   ).balance;

  //     //   if (actual != expected) {
  //     //     console.log('address : ', addresses[i]);
  //     //     console.log('index : ', i);
  //     //   }

  //     //   expect(actual).to.equal(expected);
  //     // }
  //     console.log('validating userEntered...');

  //     for (let i = 0; i < addresses.length; i++) {
  //       const res = await tenLots.userEntered(addresses[i]);
  //       expect(res).to.be.true;
  //     }
  //     // console.log('validating userRewardPerLot...');

  //     // for (let i = 0; i < addresses.length; i++) {
  //     //   const actual = (
  //     //     await tenLots.userRewardPerLot(addresses[i])
  //     //   ).toString();
  //     //   const expected = await contract.methods
  //     //     .userRewardPerLot(addresses[i])
  //     //     .call();
  //     //   if (actual != expected) {
  //     //     console.log('address : ', addresses[i]);
  //     //     console.log('index : ', i);
  //     //   }

  //     //   expect(actual).to.equal(expected);
  //     // }
  //   });

  //   it('should edit user claim timestamp with penalty', async () => {
  //     await tenLots
  //       .connect(owner)
  //       .enterUserIntoStaking([addresses[3]], [data2[3]]);
  //     let user;
  //     let amount;
  //     await network.provider.request({
  //       method: 'hardhat_impersonateAccount',
  //       params: [addresses[3]],
  //     });
  //     user = await ethers.getSigner(addresses[3]);
  //     amount = (await tenLots.userRewardPerLot(addresses[3])).toString();
  //     await tenLots.connect(owner).editUserClaimTimeStamp(addresses[3], true);
  //     expect(await tenLots.userEntered(addresses[3])).to.equal(false);
  //     expect(await tenLots.totalPenalties()).to.eq(amount);
  //   });

  //   it('should let the entered users to claim 25%', async () => {
  //     const blockNumBefore = await ethers.provider.getBlockNumber();
  //     const blockBefore = await ethers.provider.getBlock(blockNumBefore);
  //     const timestampBefore = blockBefore.timestamp;
  //     const testData = {
  //       balance: data2[13].balance,
  //       timestamp: timestampBefore,
  //       level: data2[13].level,
  //       claimTimeStamp: data2[13].claimTimeStamp,
  //       pendingFee: data2[13].pendingFee,
  //       rewardDebt: data2[13].rewardDebt,
  //     };
  //     await tenLots
  //       .connect(owner)
  //       .enterUserIntoStaking([addresses[13]], [testData]);
  //     console.log('done');
  //     let user;
  //     await network.provider.request({
  //       method: 'hardhat_impersonateAccount',
  //       params: [addresses[13]],
  //     });
  //     user = await ethers.getSigner(addresses[13]);

  //     await tenLots
  //       .connect(supplier)
  //       .updateAccPerShare(ethers.BigNumber.from('50000000000000000000'));

  //     await tenLots.connect(owner).editUserClaimTimeStamp(addresses[13], false);

  //     await network.provider.send('evm_increaseTime', [7773000]);
  //     await network.provider.send('evm_mine');

  //     const obj = await tenLots.enterStakingStats(addresses[13]);
  //     console.log(obj.pendingFee.toString());

  //     await user1.sendTransaction({
  //       to: addresses[13],
  //       value: ethers.utils.parseEther('100.0'),
  //     });

  //     const busdBal = await busdt.balanceOf(addresses[13]);
  //     const userReward = await tenLots.userRewardPerLot(addresses[13]);
  //     console.log(`userReward : ${ethers.utils.formatEther(userReward)}`);
  //     console.log(
  //       `BUSD balance before : ${ethers.utils.formatEther(busdBal)} BUSD`
  //     );

  //     await tenLots.connect(user).claim({
  //       value: ethers.utils.parseUnits(obj.pendingFee.toString(), 'wei'),
  //     });

  //     const busdBal2 = await busdt.balanceOf(addresses[13]);
  //     console.log(
  //       `BUSD balance after : ${ethers.utils.formatEther(busdBal2)} BUSD`
  //     );

  //     const returnValue = busdBal2 / userReward;
  //     expect(returnValue).to.be.eq(0.25);

  //     const res = await tenLots.userEntered(addresses[13]);
  //     expect(res).to.be.false;
  //   });

  //   it('should let the entered users to claim 50%', async () => {
  //     const blockNumBefore = await ethers.provider.getBlockNumber();
  //     const blockBefore = await ethers.provider.getBlock(blockNumBefore);
  //     const timestampBefore = blockBefore.timestamp;
  //     const testData = {
  //       balance: data2[14].balance,
  //       timestamp: timestampBefore,
  //       level: data2[14].level,
  //       claimTimeStamp: data2[14].claimTimeStamp,
  //       pendingFee: data2[14].pendingFee,
  //       rewardDebt: data2[14].rewardDebt,
  //     };
  //     await tenLots
  //       .connect(owner)
  //       .enterUserIntoStaking([addresses[14]], [testData]);
  //     console.log('done');
  //     let user;
  //     await network.provider.request({
  //       method: 'hardhat_impersonateAccount',
  //       params: [addresses[14]],
  //     });
  //     user = await ethers.getSigner(addresses[14]);

  //     await tenLots
  //       .connect(supplier)
  //       .updateAccPerShare(ethers.BigNumber.from('50000000000000000000'));

  //     await tenLots.connect(owner).editUserClaimTimeStamp(addresses[14], false);

  //     await network.provider.send('evm_increaseTime', [7776000]);
  //     await network.provider.send('evm_mine');

  //     const obj = await tenLots.enterStakingStats(addresses[14]);
  //     console.log(obj.pendingFee.toString());

  //     await user1.sendTransaction({
  //       to: addresses[14],
  //       value: ethers.utils.parseEther('100.0'),
  //     });

  //     const busdBal = await busdt.balanceOf(addresses[14]);
  //     const userReward = await tenLots.userRewardPerLot(addresses[14]);
  //     console.log(`userReward : ${ethers.utils.formatEther(userReward)}`);
  //     console.log(
  //       `BUSD balance before : ${ethers.utils.formatEther(busdBal)} BUSD`
  //     );

  //     await tenLots.connect(user).claim({
  //       value: ethers.utils.parseUnits(obj.pendingFee.toString(), 'wei'),
  //     });

  //     const busdBal2 = await busdt.balanceOf(addresses[14]);
  //     console.log(
  //       `BUSD balance after : ${ethers.utils.formatEther(busdBal2)} BUSD`
  //     );

  //     const returnValue = busdBal2 / userReward;
  //     expect(returnValue).to.be.eq(0.5);

  //     const res = await tenLots.userEntered(addresses[14]);
  //     expect(res).to.be.false;
  //   });

  //   it('should let the entered users to claim 75%', async () => {
  //     const blockNumBefore = await ethers.provider.getBlockNumber();
  //     const blockBefore = await ethers.provider.getBlock(blockNumBefore);
  //     const timestampBefore = blockBefore.timestamp;
  //     const testData = {
  //       balance: data2[16].balance,
  //       timestamp: timestampBefore,
  //       level: data2[16].level,
  //       claimTimeStamp: data2[16].claimTimeStamp,
  //       pendingFee: data2[16].pendingFee,
  //       rewardDebt: data2[16].rewardDebt,
  //     };
  //     await tenLots
  //       .connect(owner)
  //       .enterUserIntoStaking([addresses[16]], [testData]);
  //     console.log('done');
  //     let user;
  //     await network.provider.request({
  //       method: 'hardhat_impersonateAccount',
  //       params: [addresses[16]],
  //     });
  //     user = await ethers.getSigner(addresses[16]);

  //     await tenLots
  //       .connect(supplier)
  //       .updateAccPerShare(ethers.BigNumber.from('50000000000000000000'));

  //     await tenLots.connect(owner).editUserClaimTimeStamp(addresses[16], false);

  //     await network.provider.send('evm_increaseTime', [15552000]);
  //     await network.provider.send('evm_mine');

  //     const obj = await tenLots.enterStakingStats(addresses[16]);
  //     console.log(obj.pendingFee.toString());

  //     await user1.sendTransaction({
  //       to: addresses[16],
  //       value: ethers.utils.parseEther('100.0'),
  //     });

  //     const busdBal = await busdt.balanceOf(addresses[16]);
  //     const userReward = await tenLots.userRewardPerLot(addresses[16]);
  //     console.log(`userReward : ${ethers.utils.formatEther(userReward)}`);
  //     console.log(
  //       `BUSD balance before : ${ethers.utils.formatEther(busdBal)} BUSD`
  //     );

  //     await tenLots.connect(user).claim({
  //       value: ethers.utils.parseUnits(obj.pendingFee.toString(), 'wei'),
  //     });

  //     const busdBal2 = await busdt.balanceOf(addresses[16]);
  //     console.log(
  //       `BUSD balance after : ${ethers.utils.formatEther(busdBal2)} BUSD`
  //     );

  //     const returnValue = busdBal2 / userReward;
  //     expect(returnValue).to.be.eq(0.75);

  //     const res = await tenLots.userEntered(addresses[16]);
  //     expect(res).to.be.false;
  //   });

  //   it('should let the entered users to claim 100%', async () => {
  //     const blockNumBefore = await ethers.provider.getBlockNumber();
  //     const blockBefore = await ethers.provider.getBlock(blockNumBefore);
  //     const timestampBefore = blockBefore.timestamp;
  //     const testData = {
  //       balance: data2[45].balance,
  //       timestamp: timestampBefore,
  //       level: data2[45].level,
  //       claimTimeStamp: data2[45].claimTimeStamp,
  //       pendingFee: data2[45].pendingFee,
  //       rewardDebt: data2[45].rewardDebt,
  //     };
  //     await tenLots
  //       .connect(owner)
  //       .enterUserIntoStaking([addresses[45]], [testData]);
  //     console.log('done');
  //     let user;
  //     await network.provider.request({
  //       method: 'hardhat_impersonateAccount',
  //       params: [addresses[45]],
  //     });
  //     user = await ethers.getSigner(addresses[45]);

  //     await tenLots
  //       .connect(supplier)
  //       .updateAccPerShare(ethers.BigNumber.from('50000000000000000000'));

  //     await tenLots.connect(owner).editUserClaimTimeStamp(addresses[45], false);

  //     await network.provider.send('evm_increaseTime', [31104000]);
  //     await network.provider.send('evm_mine');

  //     const obj = await tenLots.enterStakingStats(addresses[45]);
  //     console.log(obj.pendingFee.toString());

  //     await user1.sendTransaction({
  //       to: addresses[45],
  //       value: ethers.utils.parseEther('100.0'),
  //     });

  //     const busdBal = await busdt.balanceOf(addresses[45]);
  //     const userReward = await tenLots.userRewardPerLot(addresses[45]);
  //     console.log(`userReward : ${ethers.utils.formatEther(userReward)}`);
  //     console.log(
  //       `BUSD balance before : ${ethers.utils.formatEther(busdBal)} BUSD`
  //     );

  //     await tenLots.connect(user).claim({
  //       value: ethers.utils.parseUnits(obj.pendingFee.toString(), 'wei'),
  //     });

  //     const busdBal2 = await busdt.balanceOf(addresses[45]);
  //     console.log(
  //       `BUSD balance after : ${ethers.utils.formatEther(busdBal2)} BUSD`
  //     );

  //     const returnValue = busdBal2 / userReward;
  //     expect(returnValue).to.be.eq(1);

  //     const res = await tenLots.userEntered(addresses[45]);
  //     expect(res).to.be.false;
  //   });

  //   it('should let the entered users to claim 100% when vestedperiod > maxvestingperiod', async () => {
  //     const blockNumBefore = await ethers.provider.getBlockNumber();
  //     const blockBefore = await ethers.provider.getBlock(blockNumBefore);
  //     const timestampBefore = blockBefore.timestamp;
  //     const testData = {
  //       balance: data2[247].balance,
  //       timestamp: timestampBefore,
  //       level: data2[247].level,
  //       claimTimeStamp: data2[247].claimTimeStamp,
  //       pendingFee: data2[247].pendingFee,
  //       rewardDebt: data2[247].rewardDebt,
  //     };
  //     await tenLots
  //       .connect(owner)
  //       .enterUserIntoStaking([addresses[247]], [testData]);
  //     console.log('done');
  //     let user;
  //     await network.provider.request({
  //       method: 'hardhat_impersonateAccount',
  //       params: [addresses[247]],
  //     });
  //     user = await ethers.getSigner(addresses[247]);

  //     await tenLots
  //       .connect(supplier)
  //       .updateAccPerShare(ethers.BigNumber.from('50000000000000000000'));

  //     await tenLots
  //       .connect(owner)
  //       .editUserClaimTimeStamp(addresses[247], false);

  //     await network.provider.send('evm_increaseTime', [622080000]);
  //     await network.provider.send('evm_mine');

  //     const obj = await tenLots.enterStakingStats(addresses[247]);
  //     console.log(obj.pendingFee.toString());

  //     await user1.sendTransaction({
  //       to: addresses[247],
  //       value: ethers.utils.parseEther('100.0'),
  //     });

  //     const busdBal = await busdt.balanceOf(addresses[247]);
  //     const userReward = await tenLots.userRewardPerLot(addresses[247]);
  //     console.log(`userReward : ${ethers.utils.formatEther(userReward)}`);
  //     console.log(
  //       `BUSD balance before : ${ethers.utils.formatEther(busdBal)} BUSD`
  //     );

  //     await tenLots.connect(user).claim({
  //       value: ethers.utils.parseUnits(obj.pendingFee.toString(), 'wei'),
  //     });

  //     const busdBal2 = await busdt.balanceOf(addresses[247]);
  //     console.log(
  //       `BUSD balance after : ${ethers.utils.formatEther(busdBal2)} BUSD`
  //     );

  //     const returnValue = busdBal2 / userReward;
  //     expect(returnValue).to.be.eq(1);

  //     const res = await tenLots.userEntered(addresses[247]);
  //     expect(res).to.be.false;
  //   });

  //   it('should check TenLend market function', async () => {
  //     await tenLots.connect(owner).setTToken(TToken);
  //     expect(await tenLots.cTTokenSet()).to.be.true;
  //   });

  //   it('should check for the added cToken balanceOfUnderlying', async () => {
  //     await tenLots.connect(owner).setTToken(TToken);
  //     let newUser;
  //     await network.provider.request({
  //       method: 'hardhat_impersonateAccount',
  //       params: ['0x86D52FE9c8B32Dc6E2644e9b0837b86e927ebFA0'],
  //     });
  //     newUser = await ethers.getSigner(
  //       '0x86D52FE9c8B32Dc6E2644e9b0837b86e927ebFA0'
  //     );

  //     await user1.sendTransaction({
  //       to: newUser.address,
  //       value: ethers.utils.parseEther('100.0'),
  //     });

  //     const tToken = new ethers.Contract(
  //       '0x7B205e1a4cBFb96Dda4f94013158C5500981f128',
  //       abi2,
  //       newUser
  //     );

  //     // const tenfiContract = new ethers.Contract(tenfi, abi3, newUser);
  //     // const amountToMint = ethers.utils.parseEther('30');

  //     // await tenfiContract
  //     //   .connect(newUser)
  //     //   .approve(tToken.address, amountToMint);

  //     // const allowance = await tenfiContract.allowance(
  //     //   newUser.address,
  //     //   tToken.address
  //     // );
  //     // console.log('allowance: ', allowance);

  //     // expect(allowance).to.equal(amountToMint);

  //     // await tToken.connect(newUser).mint(amountToMint);

  //     // const balance = await tToken.balanceOf(newUser.address);
  //     // console.log('BAL : ', balance);

  //     // const bal = await tenLots.getBalance(newUser.address);
  //     // console.log('BAL : ', bal);

  //     await tenLots.connect(newUser).enterStaking();
  //     const response = await tenLots.enterStakingStats(newUser.address);
  //     console.log('enterStakingStats: ', response);
  //   });

  //   it('should enter staking', async () => {
  //     const len = data2.length;
  //     let start = 0;
  //     console.log('entering users into staking...');
  //     for (let index = 1; index <= Math.ceil(len / 100); index++) {
  //       if (index <= Math.floor(len / 100)) {
  //         await tenLots
  //           .connect(owner)
  //           .enterUserIntoStaking(
  //             addresses.slice(start, start + 100),
  //             data2.slice(start, start + 100)
  //           );
  //         start += 100;
  //       } else {
  //         await tenLots
  //           .connect(owner)
  //           .enterUserIntoStaking(
  //             addresses.slice(start, len + 1),
  //             data2.slice(start, len + 1)
  //           );
  //       }
  //     }
  //     console.log('entered users into staking');

  //     let newUser;
  //     await network.provider.request({
  //       method: 'hardhat_impersonateAccount',
  //       params: ['0xaDC83042Db3a395E8e580A785eB0310B9aF9a6a3'],
  //     });
  //     newUser = await ethers.getSigner(
  //       '0xaDC83042Db3a395E8e580A785eB0310B9aF9a6a3'
  //     );

  //     await user1.sendTransaction({
  //       to: newUser.address,
  //       value: ethers.utils.parseEther('100.0'),
  //     });
  //     await tenLots.connect(owner).setTToken(TToken);

  //     await tenLots.connect(newUser).enterStaking();
  //     await tenLots
  //       .connect(supplier)
  //       .updateAccPerShare(ethers.BigNumber.from('50000000000000000000'));
  //     await tenLots
  //       .connect(owner)
  //       .editUserClaimTimeStamp(newUser.address, false);

  //     await network.provider.send('evm_increaseTime', [15552000]);
  //     await network.provider.send('evm_mine');

  //     // const response = await tenLots.getBalance(newUser.address);
  //     // console.log('getBalance: ', response);

  //     const obj = await tenLots.enterStakingStats(newUser.address);
  //     console.log('enterStakingStats : ', obj);

  //     const busdBal = await busdt.balanceOf(newUser.address);
  //     const userReward = await tenLots.userRewardPerLot(newUser.address);
  //     console.log(`userReward : ${ethers.utils.formatEther(userReward)}`);
  //     console.log(
  //       `BUSD balance before : ${ethers.utils.formatEther(busdBal)} BUSD`
  //     );

  //     await tenLots.connect(newUser).claim({
  //       value: ethers.utils.parseUnits(obj.pendingFee.toString(), 'wei'),
  //     });

  //     const busdBal2 = await busdt.balanceOf(newUser.address);
  //     console.log(
  //       `BUSD balance after : ${ethers.utils.formatEther(busdBal2)} BUSD`
  //     );

  //     const res = await tenLots.userEntered(newUser.address);
  //     expect(res).to.be.false;
  //   });
  // });

  // describe('NEGATIVE ASSERTIONS', () => {
  //   beforeEach(async () => {
  //     const web3 = new Web3(
  //       'https://speedy-nodes-nyc.moralis.io/f19381e84e5c8dde5935ae3e/bsc/mainnet/archive'
  //     );

  //     contract = new web3.eth.Contract(
  //       abi,
  //       '0x5123631036e563aEdfd9D9EfB35F2Ce25729783c'
  //     );

  //     BUSDt = await hre.ethers.getContractFactory('BUSDt');
  //     busdt = await BUSDt.connect(owner).deploy();
  //     await busdt.deployed();

  //     const BUSD_addr = busdt.address;

  //     TenLots = await hre.ethers.getContractFactory('TenLotsV2');
  //     tenLots = await upgrades.deployProxy(
  //       TenLots,
  //       [
  //         singleStakingVault,
  //         unitShare,
  //         coolDownPeriod,
  //         precisionMultiplier,
  //         tenfi,
  //         BUSD_addr,
  //         tenFarm,
  //         tenFinance,
  //       ],
  //       {
  //         initializer: 'initialize',
  //       }
  //     );
  //     await tenLots.deployed();
  //     console.log('TenLots deployed');

  //     await busdt.transfer(
  //       supplier.address,
  //       ethers.BigNumber.from('50000000000000000000')
  //     );

  //     await busdt
  //       .connect(supplier)
  //       .approve(
  //         tenLots.address,
  //         ethers.BigNumber.from('50000000000000000000')
  //       );

  //     await tenLots.addLevel(
  //       ethers.BigNumber.from('5000000000000000000'),
  //       ethers.BigNumber.from('10000000000000000000'),
  //       300,
  //       30000
  //     );
  //     await tenLots.addLevel(
  //       ethers.BigNumber.from('10000000000000000000'),
  //       ethers.BigNumber.from('15000000000000000000'),
  //       400,
  //       1500
  //     );
  //     await tenLots.addLevel(
  //       ethers.BigNumber.from('15000000000000000000'),
  //       ethers.BigNumber.from(
  //         '10000000000000000000000000000000000000000000000000000000000000000'
  //       ),
  //       300,
  //       200
  //     );

  //     await tenLots.addVault(
  //       [61, 95],
  //       [
  //         '0xf9FAdb9222848Cde36c0C06cF88776DC41937083',
  //         '0x84123de7279Ee0F745631B8769993C6A61e29515',
  //       ]
  //     );

  //     await tenLots.connect(owner).addVestingPeriod(0, 7776000, 250);
  //     await tenLots.connect(owner).addVestingPeriod(7776000, 15552000, 500);
  //     await tenLots.connect(owner).addVestingPeriod(15552000, 31104000, 750);
  //     await tenLots.connect(owner).addVestingPeriod(31104000, 62208000, 1000);

  //     await tenLots.setAccRewardPerLot([
  //       ethers.BigNumber.from('19146046309380222227'),
  //       ethers.BigNumber.from('81206084128536710372'),
  //       ethers.BigNumber.from('137000462220996996429'),
  //     ]);

  //     await tenLots.editCoolDownPeriod(0);

  //     await tenLots.changeSupplier(supplier.address);

  //     console.log('Values set');
  //   });

  //   it('should not allow to enter user to claim if msg.value < enterStakingStats[msg.sender].pendingFee', async () => {
  //     const blockNumBefore = await ethers.provider.getBlockNumber();
  //     const blockBefore = await ethers.provider.getBlock(blockNumBefore);
  //     const timestampBefore = blockBefore.timestamp;
  //     const testData = {
  //       balance: data2[18].balance,
  //       timestamp: timestampBefore,
  //       level: data2[18].level,
  //       claimTimeStamp: data2[18].claimTimeStamp,
  //       pendingFee: data2[18].pendingFee,
  //       rewardDebt: data2[18].rewardDebt,
  //     };
  //     await tenLots
  //       .connect(owner)
  //       .enterUserIntoStaking([addresses[18]], [testData]);

  //     let user;
  //     await network.provider.request({
  //       method: 'hardhat_impersonateAccount',
  //       params: [addresses[18]],
  //     });
  //     user = await ethers.getSigner(addresses[18]);
  //     await tenLots.connect(owner).editUserClaimTimeStamp(addresses[18], false);

  //     await network.provider.send('evm_increaseTime', [4110400000]);
  //     await network.provider.send('evm_mine');

  //     const obj = await tenLots.enterStakingStats(addresses[18]);

  //     await user1.sendTransaction({
  //       to: addresses[18],
  //       value: ethers.utils.parseEther('100.0'),
  //     });

  //     await expect(
  //       tenLots.connect(user).claim({
  //         value: ethers.utils.parseUnits(
  //           (obj.pendingFee.toNumber() - 1).toString(),
  //           'wei'
  //         ),
  //       })
  //     ).to.be.revertedWith('TenLots : claim fees');
  //   });

  //   it('should not allow to enter user to claim if user is not entered', async () => {
  //     const testData = {
  //       balance: data2[19].balance,
  //       timestamp: (Date.now() / 1000).toFixed(0),
  //       level: data2[19].level,
  //       claimTimeStamp: data2[19].claimTimeStamp,
  //       pendingFee: data2[19].pendingFee,
  //       rewardDebt: data2[19].rewardDebt,
  //     };
  //     await tenLots
  //       .connect(owner)
  //       .enterUserIntoStaking([addresses[19]], [testData]);

  //     await network.provider.send('evm_increaseTime', [4110400000]);
  //     await network.provider.send('evm_mine');

  //     const obj = await tenLots.enterStakingStats(addresses[19]);

  //     await expect(
  //       tenLots.connect(user3).claim({
  //         value: ethers.utils.parseUnits(obj.pendingFee.toString(), 'wei'),
  //       })
  //     ).to.be.revertedWith('TenLots : User not allowed');
  //   });

  //   it('should not allow to enter user if user is entered', async () => {
  //     let user;
  //     await network.provider.request({
  //       method: 'hardhat_impersonateAccount',
  //       params: [addresses[20]],
  //     });
  //     user = await ethers.getSigner(addresses[20]);
  //     await user1.sendTransaction({
  //       to: addresses[20],
  //       value: ethers.utils.parseEther('100.0'),
  //     });
  //     await tenLots
  //       .connect(owner)
  //       .enterUserIntoStaking([addresses[20]], [data2[20]]);
  //     await expect(tenLots.connect(user).enterStaking()).to.be.revertedWith(
  //       'TenLots : One TenLot per user'
  //     );
  //   });

  //   it('should not return reward if user !entered', async () => {
  //     console.log(user3.address);
  //     await expect(tenLots.userRewardPerLot(user3.address)).to.be.reverted;
  //   });
  // });

  describe('Mainnet fork test', async () => {
    let owner_;
    beforeEach(async () => {
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: ['0x6F00C5E578D440c6c7F4d837dE5AFADf1d7d9F12'],
      });
      owner_ = await ethers.getSigner(
        '0x6F00C5E578D440c6c7F4d837dE5AFADf1d7d9F12'
      );
      await user1.sendTransaction({
        to: owner_.address,
        value: ethers.utils.parseEther('100.0'),
      });

      const web3 = new Web3(
        'https://speedy-nodes-nyc.moralis.io/f19381e84e5c8dde5935ae3e/bsc/mainnet/archive'
      );

      contract = new web3.eth.Contract(
        abi1,
        '0x5123631036e563aEdfd9D9EfB35F2Ce25729783c'
      );

      const BUSD_addr = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
      busdt = new ethers.Contract(BUSD_addr, abi3, owner_);
      tenLots = new ethers.Contract(address, abi, owner_);

      console.log('TenLots deployed');

      // let hodler;
      // await network.provider.request({
      //   method: 'hardhat_impersonateAccount',
      //   params: ['0xCFA81127798848a783f456B640E224AdbD83C3b3'],
      // });
      // hodler = await ethers.getSigner(
      //   '0xCFA81127798848a783f456B640E224AdbD83C3b3'
      // );
      // await user1.sendTransaction({
      //   to: hodler.address,
      //   value: ethers.utils.parseEther('100.0'),
      // });

      // await busdt
      //   .connect(hodler)
      //   .transfer(
      //     supplier.address,
      //     ethers.BigNumber.from('50000000000000000000')
      //   );

      // await busdt
      //   .connect(supplier)
      //   .approve(
      //     tenLots.address,
      //     ethers.BigNumber.from('50000000000000000000')
      //   );

      console.log('Values set');
    });

    it('checks', async () => {
      console.log('validating balance...');
      for (let i = 600; i < addresses.length; i++) {
        const actual = (
          await tenLots.enterStakingStats(addresses[i])
        ).balance.toString();
        const expected = (
          await contract.methods.enterStakingStats(addresses[i]).call()
        ).balance;

        if (actual != expected) {
          console.log('address : ', addresses[i]);
          console.log('index : ', i);
        }

        // expect(actual).to.equal(expected);
      }
      console.log('validating userEntered...');

      for (let i = 600; i < addresses.length; i++) {
        const res = await tenLots.userEntered(addresses[i]);
        expect(res).to.be.true;
      }
      console.log('validating userRewardPerLot...');

      for (let i = 600; i < addresses.length; i++) {
        console.log(addresses[i]);
        const actual = (
          await tenLots.userRewardPerLot(addresses[i])
        ).toString();
        const expected = await contract.methods
          .userRewardPerLot(addresses[i])
          .call();
        if (actual != expected) {
          console.log('address : ', addresses[i]);
          console.log('index : ', i);
          console.log('actual : ', actual);
          console.log('expected : ', expected);
        }

        // expect(actual).to.equal(expected);
      }
    });

    // it('withdraws BUSD', async () => {
    //   console.log('owner address : ', owner_.address);

    //   const balance = await busdt.balanceOf(tenLots.address);
    //   console.log('BALANCE...', balance.toString());

    //   await tenLots.connect(owner_).withdrawBUSD(balance);

    //   const balance2 = await busdt.balanceOf(tenLots.address);
    //   console.log('BALANCE AFTER...', balance2.toString());
    // });
  });
});
