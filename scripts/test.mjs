import Web3 from 'web3';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
const web3 = new Web3(
  'https://speedy-nodes-nyc.moralis.io/f19381e84e5c8dde5935ae3e/bsc/mainnet/archive'
);
const abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'reward',
        type: 'uint256',
      },
    ],
    name: 'rewardClaim',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'reward',
        type: 'uint256',
      },
    ],
    name: 'rewardTransfered',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'stakingEntered',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'LP',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: '_supplier',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'accRewardPerLot',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_minBalance',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_maxBalance',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_percentage',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_maxAllowedUser',
        type: 'uint256',
      },
    ],
    name: 'addLevel',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256[]',
        name: '_pID',
        type: 'uint256[]',
      },
      {
        internalType: 'address[]',
        name: 'lp',
        type: 'address[]',
      },
    ],
    name: 'addVault',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_minVestingPeriod',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_maxVestingPeriod',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_percentReturn',
        type: 'uint256',
      },
    ],
    name: 'addVestingPeriod',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'supplier',
        type: 'address',
      },
    ],
    name: 'changeSupplier',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claim',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'claimCoolDown',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'time',
        type: 'uint256',
      },
    ],
    name: 'editCoolDownPeriod',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_level',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_percentage',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_maxAllowedUser',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_maxBalance',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_minBalance',
        type: 'uint256',
      },
    ],
    name: 'editLevel',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
      {
        internalType: 'bool',
        name: 'penalty',
        type: 'bool',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'editUserClaimTimeStamp',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'pos',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_minVestingPeriod',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_maxVestingPeriod',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_percentReturn',
        type: 'uint256',
      },
    ],
    name: 'editVestingPeriod',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'enterStaking',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'enterStakingStats',
    outputs: [
      {
        internalType: 'uint256',
        name: 'balance',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'level',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'claimTimeStamp',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'pendingFee',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'share',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'rewardDebt',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address[]',
        name: 'user',
        type: 'address[]',
      },
    ],
    name: 'enterUserIntoStaking',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'levels',
    outputs: [
      {
        internalType: 'uint256',
        name: 'sharePercent',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'minBalance',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'maxBalance',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'userCount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'maxAllowedUser',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'pID',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256[]',
        name: '_pID',
        type: 'uint256[]',
      },
      {
        internalType: 'address[]',
        name: 'lp',
        type: 'address[]',
      },
    ],
    name: 'removeLP',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalPenalties',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'totalSharePerLevel',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalStaked',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'transferPenalty',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'updateAccPerShare',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'userEntered',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'userPenalty',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
    ],
    name: 'userRewardPerLot',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'vestingPeriods',
    outputs: [
      {
        internalType: 'uint256',
        name: 'minVestingPeriod',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'maxVestingPeriod',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'percentReturn',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];
const csvWriter = createObjectCsvWriter({
  path: 'extracted.csv',
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
fs.createReadStream('data.csv')
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
