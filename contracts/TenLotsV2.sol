// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "./ITenFarm.sol";
import "./IPancakePair.sol";
import "hardhat/console.sol";

contract TenLotsV2 is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using AddressUpgradeable for address;

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

    uint8 singleStakingVault;
    uint256 coolDownPeriod;
    uint256[] public pID;
    uint256 public totalStaked;
    uint256 public totalPenalties;
    uint256 precisionMultiplier;

    address public _supplier;
    address tenfi;
    address BUSD;
    address tenFarm;
    address tenFinance;
    address[] public LP;
    address[] public registeredUsers;

    mapping(address => UserInfo) public enterStakingStats;
    mapping(address => bool) public userEntered;
    mapping(address => uint256) public index;
    mapping(uint256 => uint256) public accRewardPerLot;
    mapping(address => uint256) public userPenalty;
    mapping(address => bool) public userAllowed;

    event stakingEntered(address indexed user, uint256 indexed timestamp);
    event rewardClaim(address indexed user, uint256 indexed reward);
    event rewardTransfered(address indexed user, uint256 indexed reward);

    modifier onlySupplier() {
        require(_supplier == _msgSender(), "TenLots : caller != supplier");
        _;
    }

    function initialize(
        uint8 _singleStakingVault,
        uint256 _coolDownPeriod,
        uint256 _precisionMultiplier,
        address _tenfi,
        address _BUSD,
        address _tenFarm,
        address _tenFianance
    ) external initializer {
        __Ownable_init();
        singleStakingVault = _singleStakingVault;
        coolDownPeriod = _coolDownPeriod;
        precisionMultiplier = _precisionMultiplier;
        tenfi = _tenfi;
        BUSD = _BUSD;
        tenFarm = _tenFarm;
        tenFinance = _tenFianance;
    }

    function enterStaking() external nonReentrant {
        require(!userEntered[msg.sender], "TenLots : One TenLot per user");
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
        require(userAllowed[msg.sender], "TenLots : User not allowed");
        require(
            msg.value >= enterStakingStats[msg.sender].pendingFee,
            "TenLots : claim fees"
        );
        uint256 vestedPeriod = block.timestamp.sub(
            enterStakingStats[msg.sender].timestamp
        );
        console.log("timestamp", block.timestamp);
        console.log(
            "enterStakingStats[msg.sender].timestamp",
            enterStakingStats[msg.sender].timestamp
        );
        console.log("vested: ", vestedPeriod);
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

                IERC20Upgradeable(BUSD).safeTransfer(
                    msg.sender,
                    userActualShare
                );
                IERC20Upgradeable(BUSD).safeTransfer(
                    tenFinance,
                    TenfinanceShare
                );
                AddressUpgradeable.sendValue(payable(owner()), msg.value);
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

                IERC20Upgradeable(BUSD).safeTransfer(msg.sender, userReward);
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
        require(supplier != address(0), "TenLots : zero address");
        _supplier = supplier;
    }

    //  this function updates the rewardPerShare of the pool
    function updateAccPerShare(uint256 amount) external onlySupplier {
        IERC20Upgradeable(BUSD).safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );
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

    function addVault(uint256[] calldata _pID, address[] calldata lp)
        external
        onlyOwner
    {
        for (uint8 i = 0; i < _pID.length; ++i) {
            require(_pID.length == lp.length, "TenLots : _pID != lp");
            require(lp[i] != address(0), "TenLots : zero address lp");
            pID.push(_pID[i]);
            LP.push(lp[i]);
        }
    }

    function editUserClaimTimeStamp(address user, bool penalty)
        external
        // uint256 amount
        onlyOwner
    {
        require(userEntered[user], "TenLots: staking !entered");
        require(
            block.timestamp.sub(enterStakingStats[user].claimTimeStamp) >=
                coolDownPeriod,
            "TenLots: Claim cooldown"
        );
        if (!penalty) {
            enterStakingStats[user].claimTimeStamp = block.timestamp;
            enterStakingStats[user].pendingFee += 716338000000000;
            userAllowed[user] = true;
        } else {
            totalPenalties += userRewardPerLot(user);
            userEntered[user] = false;
            levels[enterStakingStats[user].level].userCount--;
            totalStaked -= enterStakingStats[user].balance;
            uint256 pos = index[msg.sender];
            registeredUsers[pos] = registeredUsers[registeredUsers.length - 1];
            registeredUsers.pop();

            delete (index[msg.sender]);
            delete (enterStakingStats[msg.sender]);
        }
    }

    function removeLP(uint256[] calldata _pID, address[] calldata lp)
        external
        onlyOwner
    {
        require(_pID.length == lp.length, "TenLots : _pID != lp");
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
        IERC20Upgradeable(BUSD).safeTransfer(tenFinance, fundsTransferred);
    }

    function setAccRewardPerLot(uint256[] calldata values) external onlyOwner {
        for (uint i = 0; i < levels.length; ++i) {
            accRewardPerLot[i] = values[i];
        }
    }

    function enterUserIntoStaking(
        address[] calldata users,
        UserInfo[] calldata data
    ) external onlyOwner {
        for (uint256 i = 0; i < users.length; ++i) {
            enterStakingStats[users[i]] = data[i];
            totalStaked += data[i].balance;
            levels[data[i].level].userCount++;
            userEntered[users[i]] = true;
            registeredUsers.push(users[i]);
            index[users[i]] = registeredUsers.length - 1;
        }
    }

    function userRewardPerLot(address user) public view returns (uint256) {
        require(userEntered[user], "TenLots: staking !entered");
        uint256 _level = enterStakingStats[user].level;
        uint256 _rewardPerLot = accRewardPerLot[_level].mul(100).sub(
            enterStakingStats[user].rewardDebt
        );
        return _rewardPerLot.div(100);
    }
}
