const Web3 = require('web3');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');
const abi = require('./old_contract_ABI');

const web3 = new Web3(
  'https://speedy-nodes-nyc.moralis.io/f19381e84e5c8dde5935ae3e/bsc/mainnet/archive'
);

const csvWriter = createObjectCsvWriter({
  path: './data/extracted.csv',
  header: [
    { id: 'address', title: 'Address' },
    { id: 'timestamp', title: 'TimeStamp' },
    { id: 'level', title: 'Level' },
    { id: 'rewardDebt', title: 'RewardDebt' },
    { id: 'userReward', title: 'userReward' },
  ],
});
const obj = {};
let results = [];
const contract = new web3.eth.Contract(
  abi,
  '0x5123631036e563aEdfd9D9EfB35F2Ce25729783c'
);
const timer = (ms) => new Promise((res) => setTimeout(res, ms));
fs.createReadStream('./data/data.csv')
  .pipe(csv({}))
  .on('data', (data) => {
    if (data.Method == 'Enter Staking') results.push(data.From);
  })
  .on('end', async () => {
    console.log(results.length);
    for (let i = 0; i < results.length; ++i) {
      let blockchainCall;
      try {
        blockchainCall = await contract.methods.userEntered(results[i]).call();
      } catch (error) {
        await timer(5000);
      }
      if (blockchainCall && !obj[results[i]]) {
        obj[results[i]] = true;
        const data = await contract.methods
          .enterStakingStats(results[i])
          .call();
        const userReward = await contract.methods
          .userRewardPerLot(results[i])
          .call();
        csvWriter.writeRecords([
          {
            address: `${results[i]}`,
            timestamp: `${data.timestamp}`,
            level: `${data.level}`,
            rewardDebt: `${data.rewardDebt}`,
            userReward: `${userReward}`,
          },
        ]);
        // 	fs.appendFile('message.txt', results[i] + '\r\n', (err) => {
        // 	if (err) throw err;
        // });
      }
    }
  });
