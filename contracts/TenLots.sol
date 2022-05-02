// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./ITenFarm.sol";
import "./IPancakePair.sol";

contract TenLots is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Address for address;

    struct UserInfo {
        uint256 balance;
        uint256 timestamp;
        uint256 level;
        uint256 claimTimeStamp;
        uint256 pendingFee;
        uint256 rewardDebt;
    }

    struct Levels {
        uint256 sharePercent;
        uint256 minBalance;
        uint256 maxBalance;
        uint256 userCount;
        uint256 maxAllowedUser;
    }

    Levels[] public levels;

    struct VestingPeriods {
        uint256 minVestingPeriod;
        uint256 maxVestingPeriod;
        uint256 percentReturn;
    }

    VestingPeriods[] public vestingPeriods;

    // 14
    uint8 singleStakingVault;
    // 43200
    uint256 coolDownPeriod;
    uint256[] public pID;
    uint256 public totalStaked;
    uint256 public totalPenalties;
    // 1e40
    uint256 precisionMultiplier;

    address public _supplier;
    // 0xd15C444F1199Ae72795eba15E8C1db44E47abF62
    address tenfi;
    // 0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56
    address BUSD;
    // 0x264A1b3F6db28De4D3dD4eD23Ab31A468B0C1A96
    address tenFarm;
    // 0x393c7C3EbCBFf2c1138D123df5827e215458F0c4
    address tenFinance;
    address[] public LP;
    address[] public registeredUsers;

    mapping(address => UserInfo) public enterStakingStats;
    mapping(address => bool) public userEntered;
    mapping(address => uint256) public index;
    mapping(uint256 => uint256) public accRewardPerLot;
    mapping(address => uint256) public userPenalty;
    mapping(address => uint256) public claimCoolDown;

    event stakingEntered(address indexed user, uint256 indexed timestamp);
    event rewardClaim(address indexed user, uint256 indexed reward);
    event rewardTransfered(address indexed user, uint256 indexed reward);

    modifier onlySupplier() {
        require(
            _supplier == _msgSender(),
            "Ownable: caller is not the supplier"
        );
        _;
    }

    // function initialize() {}

    function enterStaking() external nonReentrant {
        require(!userEntered[msg.sender], "Error:One TenLot Per User");
        uint256 _balance = 0;
        for (uint8 i = 0; i < pID.length; ++i) {
            uint256 stakedWantTokens = TenFarm(tenFarm)
                .stakedWantTokens(pID[i], msg.sender)
                .mul(precisionMultiplier);
            address token0 = IPancakePair(LP[i]).token0();
            address token1 = IPancakePair(LP[i]).token1(); ///

            if (token0 == tenfi) {
                (uint256 reserve0, uint256 reserve1, uint256 _x) = IPancakePair(
                    LP[i]
                ).getReserves();
                uint256 totalSupply = IPancakePair(LP[i]).totalSupply();
                _balance +=
                    (reserve0.mul(stakedWantTokens.div(totalSupply))) *
                    2;
            } else if (token1 == tenfi) {
                (uint256 reserve0, uint256 reserve1, uint256 _x) = IPancakePair(
                    LP[i]
                ).getReserves();
                uint256 totalSupply = IPancakePair(LP[i]).totalSupply();
                _balance +=
                    (reserve1.mul(stakedWantTokens.div(totalSupply))) *
                    2;
            }
        }

        _balance += TenFarm(tenFarm)
            .stakedWantTokens(singleStakingVault, msg.sender)
            .mul(precisionMultiplier);

        for (uint8 i = 0; i < levels.length; ++i) {
            require(
                levels[i].userCount <= levels[i].maxAllowedUser,
                "Error: maxAllowedUser limit reached"
            );
            if (
                _balance.div(precisionMultiplier) >= levels[i].minBalance &&
                _balance.div(precisionMultiplier) < levels[i].maxBalance
            ) {
                enterStakingStats[msg.sender] = UserInfo({
                    balance: _balance.div(precisionMultiplier),
                    timestamp: block.timestamp,
                    level: i,
                    claimTimeStamp: 0,
                    pendingFee: 0,
                    rewardDebt: accRewardPerLot[i].mul(precisionMultiplier)
                });
                totalStaked += _balance.div(precisionMultiplier);
                levels[i].userCount++;
                userEntered[msg.sender] = true;
                registeredUsers.push(msg.sender);
                index[msg.sender] = registeredUsers.length - 1;
                break;
            }
        }
        emit stakingEntered(msg.sender, block.timestamp);
    }

    function claim() external payable {
        require(userEntered[msg.sender], "Error: Enter staking first");
        require(
            enterStakingStats[msg.sender].claimTimeStamp.add(600) >
                block.timestamp,
            "Error: Claim CoolDown Remaining"
        );
        require(
            msg.value >= enterStakingStats[msg.sender].pendingFee,
            "Error : Require Claim Fees"
        );
        uint256 vestedPeriod = block.timestamp.sub(
            enterStakingStats[msg.sender].timestamp
        );
        for (uint8 i = 0; i < vestingPeriods.length; ++i) {
            if (
                (vestedPeriod >= vestingPeriods[i].minVestingPeriod &&
                    vestedPeriod < vestingPeriods[i].maxVestingPeriod)
            ) {
                uint256 userReward = userRewardPerLot(msg.sender);
                uint256 userActualShare = userReward
                    .mul(vestingPeriods[i].percentReturn)
                    .div(1000);
                uint256 TenfinanceShare = userReward - userActualShare;

                levels[enterStakingStats[msg.sender].level].userCount--;
                userEntered[msg.sender] = false;

                totalStaked -= enterStakingStats[msg.sender].balance;

                IERC20(BUSD).safeTransfer(msg.sender, userActualShare);
                IERC20(BUSD).safeTransfer(tenFinance, TenfinanceShare);
                Address.sendValue(payable(owner()), msg.value);
                uint256 pos = index[msg.sender];
                registeredUsers[pos] = registeredUsers[
                    registeredUsers.length - 1
                ];
                registeredUsers.pop();
                delete (index[msg.sender]);
                delete (enterStakingStats[msg.sender]);

                emit rewardClaim(msg.sender, userActualShare);
                break;
            } else if (
                vestedPeriod >
                vestingPeriods[vestingPeriods.length.sub(1)].maxVestingPeriod
            ) {
                uint256 userReward = userRewardPerLot(msg.sender);
                levels[enterStakingStats[msg.sender].level].userCount--;
                userEntered[msg.sender] = false;

                totalStaked -= enterStakingStats[msg.sender].balance;

                IERC20(BUSD).safeTransfer(msg.sender, userReward);
                uint256 pos = index[msg.sender];
                registeredUsers[pos] = registeredUsers[
                    registeredUsers.length - 1
                ];
                registeredUsers.pop();
                delete (index[msg.sender]);
                delete (enterStakingStats[msg.sender]);

                emit rewardClaim(msg.sender, userReward);
                break;
            }
        }
    }

    function editCoolDownPeriod(uint8 time) external onlyOwner {
        coolDownPeriod = time;
    }

    function changeSupplier(address supplier) external onlyOwner {
        require(
            supplier != address(0),
            "Error : Supplier cannot be zero address"
        );
        _supplier = supplier;
    }

    //  this function updates the rewardPerShare of the pool
    function updateAccPerShare(uint256 amount) external onlySupplier {
        IERC20(BUSD).safeTransferFrom(msg.sender, address(this), amount);
        for (uint8 i = 0; i < levels.length; ++i) {
            if (levels[i].userCount > 0) {
                accRewardPerLot[i] += amount
                    .mul(levels[i].sharePercent)
                    .div(levels[i].userCount)
                    .div(1000);
            }
        }
    }

    function addVestingPeriod(
        uint256 _minVestingPeriod,
        uint256 _maxVestingPeriod,
        uint256 _percentReturn
    ) external onlyOwner {
        vestingPeriods.push(
            VestingPeriods({
                minVestingPeriod: _minVestingPeriod,
                maxVestingPeriod: _maxVestingPeriod,
                percentReturn: _percentReturn
            })
        );
    }

    function editVestingPeriod(
        uint256 pos,
        uint256 _minVestingPeriod,
        uint256 _maxVestingPeriod,
        uint256 _percentReturn
    ) external onlyOwner {
        vestingPeriods[pos].minVestingPeriod = _minVestingPeriod;
        vestingPeriods[pos].maxVestingPeriod = _maxVestingPeriod;
        vestingPeriods[pos].percentReturn = _percentReturn;
    }

    function addLevel(
        uint256 _minBalance,
        uint256 _maxBalance,
        uint256 _percentage,
        uint256 _maxAllowedUser
    ) external onlyOwner {
        levels.push(
            Levels({
                sharePercent: _percentage,
                minBalance: _minBalance,
                maxBalance: _maxBalance,
                userCount: 0,
                maxAllowedUser: _maxAllowedUser
            })
        );
    }

    function editLevel(
        uint256 _level,
        uint256 _percentage,
        uint256 _maxAllowedUser,
        uint256 _maxBalance,
        uint256 _minBalance
    ) external onlyOwner {
        levels[_level].sharePercent = _percentage;
        levels[_level].maxAllowedUser = _maxAllowedUser;
        levels[_level].maxBalance = _maxBalance;
        levels[_level].minBalance = _minBalance;
    }

    function addVault(uint256[] memory _pID, address[] memory lp)
        external
        onlyOwner
    {
        for (uint8 i = 0; i < _pID.length; ++i) {
            require(_pID.length == lp.length, "Error wrong Input");
            require(lp[i] != address(0), "Error Enter a valid address");
            pID.push(_pID[i]);
            LP.push(lp[i]);
        }
    }

    function editUserClaimTimeStamp(
        address user,
        bool penalty,
        uint256 amount
    ) external onlyOwner {
        require(userEntered[user], "Error: Enter staking first");
        require(
            block.timestamp.sub(claimCoolDown[user]) >= coolDownPeriod,
            "Error: Claim once in 12hrs"
        );
        if (!penalty) {
            enterStakingStats[user].claimTimeStamp = block.timestamp;
            enterStakingStats[user].pendingFee += 716338000000000;
            claimCoolDown[user] = block.timestamp;
        } else {
            totalPenalties += amount;
            userEntered[user] = false;
            levels[enterStakingStats[user].level].userCount--;
            totalStaked -= enterStakingStats[user].balance;
            claimCoolDown[user] = block.timestamp;
            enterStakingStats[user].rewardDebt = 0;
            enterStakingStats[user].timestamp = 0;
            enterStakingStats[user].balance = 0;
        }
    }

    function removeLP(uint256[] memory _pID, address[] memory lp)
        external
        onlyOwner
    {
        require(_pID.length == lp.length, "Error wrong Input");
        uint256 temp1;
        address temp2;
        for (uint8 j = 0; j < _pID.length; ++j) {
            for (uint8 i = 0; i < pID.length; ++i) {
                if (pID[i] == _pID[j]) {
                    temp1 = pID[i];
                    temp2 = lp[i];
                    pID[i] = pID[pID.length - 1];
                    LP[i] = LP[LP.length - 1];
                    pID[pID.length - 1] = temp1;
                    LP[LP.length - 1] = temp2;
                    break;
                }
            }
            pID.pop();
            LP.pop();
        }
    }

    function transferPenalty() external onlyOwner {
        uint256 fundsTransferred = totalPenalties;
        totalPenalties = 0;
        IERC20(BUSD).safeTransfer(tenFinance, fundsTransferred);
    }

    function enterUserIntoStaking(
        address[] memory users,
        UserInfo[] memory data
    ) external onlyOwner {
        for (uint256 i = 0; i < users.length; ++i) {
            enterStakingStats[users[i]] = data[i];
        }
    }

    function userRewardPerLot(address user) public view returns (uint256) {
        require(userEntered[user], "Error: Enter Staking");
        uint256 _level = enterStakingStats[user].level;
        uint256 _rewardPerLot = accRewardPerLot[_level].mul(100).sub(
            enterStakingStats[user].rewardDebt
        );
        return _rewardPerLot.div(100);
    }
}
