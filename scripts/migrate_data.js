const fs = require('fs');
const csv = require('csv-parser');
const { ethers, network } = require('hardhat');
const { address, abi } = require('../build/deploy.json');

const main = async () => {
  let user1;
  let tenLots;
  let addresses = [];
  let data2 = [];

  fs.createReadStream('./data/extracted2.csv')
    .pipe(csv())
    .on('data', (data) => {
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
  const accounts = await ethers.getSigners();
  user1 = accounts[0];

  tenLots = new ethers.Contract(address, abi, user1);

  const len = data2.length;
  console.log(len);

  console.log('entering users into staking...');

  // let newUser;
  // await network.provider.request({
  //   method: 'hardhat_impersonateAccount',
  //   params: ['0x6F00C5E578D440c6c7F4d837dE5AFADf1d7d9F12'],
  // });
  // newUser = await ethers.getSigner(
  //   '0x6F00C5E578D440c6c7F4d837dE5AFADf1d7d9F12'
  // );
  // await user1.sendTransaction({
  //   to: newUser.address,
  //   value: ethers.utils.parseEther('100.0'),
  // });
  let start = 0;
  for (let index = 1; index <= Math.ceil(len / 100); index++) {
    if (index <= Math.floor(len / 100)) {
      await tenLots
        // .connect(newUser)
        .enterUserIntoStaking(
          addresses.slice(start, start + 100),
          data2.slice(start, start + 100)
        );
      start += 100;
      console.log(`${index} users entered into staking`);
    } else {
      await tenLots
        // .connect(newUser)
        .enterUserIntoStaking(
          addresses.slice(start, len + 1),
          data2.slice(start, len + 1)
        );
      console.log(`${index} users entered into staking`);
    }
  }

  const bal = await tenLots.getBalance(addresses[0]);
  console.log('bal..', bal);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
