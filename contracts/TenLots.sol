// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "./IcTToken.sol";
import "./ITenFarm.sol";
import "./IPancakePair.sol";
import "hardhat/console.sol";

contract TenLots is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
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
        uint256 rewardAllocation;
    }

    VestingPeriods[] public vestingPeriods;

    uint8 public singleStakingVault;
    uint8 public unitShare;
    uint256 public coolDownPeriod;
    uint256[] public pID;
    uint256 public totalStaked;
    uint256 public totalPenalties;
    uint256 public precisionMultiplier;

    bool public cTTokenSet;

    address public _supplier;
    address public tenfi;
    address public cTToken;
    address public BUSD;
    address public tenFarm;
    address public tenFinance;
    address[] public LP;
    address[] public registeredUsers;

    mapping(address => UserInfo) public enterStakingStats;
    mapping(address => bool) public userEntered;
    mapping(address => uint256) public index;
    mapping(uint256 => uint256) public accRewardPerLot;
    mapping(address => uint256) public userPenalty;
    mapping(address => bool) public userAllowed;

    event StakingEntered(address indexed user, uint256 indexed timestamp);
    event RewardClaim(address indexed user, uint256 indexed reward);

    modifier onlySupplier() {
        require(_supplier == _msgSender(), "TenLots : caller != supplier");
        _;
    }

    /**
     * @notice Function to initialize the TenLots contract via hardhat proxy plugin script.
     * @dev It sets the owner to the deployer of the proxy contract.
     * @dev It sets the pausable state to false.
     * @param _singleStakingVault The pid of the vault to be used for staking.
     * @param _coolDownPeriod The cool down period withdrawing from the farm.
     * @param _precisionMultiplier The precision multiplier for certain calculations (1e40).
     * @param _tenfi The address of the TenFi token.
     * @param _BUSD The address of the BUSD token.
     * @param _tenFarm The address of the TenFarm contract.
     * @param _tenFinance The address of the TenFinance contract.
     */
    function initialize(
        uint8 _singleStakingVault,
        uint8 _unitShare,
        uint256 _coolDownPeriod,
        uint256 _precisionMultiplier,
        address _tenfi,
        address _BUSD,
        address _tenFarm,
        address _tenFinance
    ) external initializer {
        __Ownable_init();
        __Pausable_init();
        singleStakingVault = _singleStakingVault;
        unitShare = _unitShare;
        coolDownPeriod = _coolDownPeriod;
        precisionMultiplier = _precisionMultiplier;
        tenfi = _tenfi;
        BUSD = _BUSD;
        tenFarm = _tenFarm;
        tenFinance = _tenFinance;
    }

    /**
     * @notice Function to let the eligible user to enter into staking.
     * @dev It checks for the staked balance in the respective vaults
     * and also the supplied balance in the lending platform.
     */
    function enterStaking() external whenNotPaused nonReentrant {
        require(!userEntered[msg.sender], "TenLots : One TenLot per user");

        uint256 _balance = getBalance(msg.sender);

        for (uint8 i = 0; i < levels.length; ++i) {
            require(
                levels[i].userCount <= levels[i].maxAllowedUser,
                "Error: maxAllowedUser limit reached"
            );
            uint256 balance_ = _balance;
            if (
                balance_ >= levels[i].minBalance &&
                balance_ < levels[i].maxBalance
            ) {
                enterStakingStats[msg.sender] = UserInfo({
                    balance: balance_,
                    timestamp: block.timestamp,
                    level: i,
                    claimTimeStamp: 0,
                    pendingFee: 0,
                    rewardDebt: accRewardPerLot[i].mul(unitShare)
                });
                totalStaked += balance_;
                levels[i].userCount++;
                userEntered[msg.sender] = true;
                registeredUsers.push(msg.sender);
                index[msg.sender] = registeredUsers.length - 1;
                break;
            }
        }
        emit StakingEntered(msg.sender, block.timestamp);
    }

    /**
     * @notice Function to claim the user's rewards based on the vesting period.
     */
    function claim() external payable whenNotPaused nonReentrant {
        require(userAllowed[msg.sender], "TenLots : User not allowed");
        require(
            msg.value >= enterStakingStats[msg.sender].pendingFee,
            "TenLots : claim fees"
        );

        uint256 vestedPeriod = block.timestamp.sub(
            enterStakingStats[msg.sender].timestamp
        );

        console.log("vestedPeriod : ", vestedPeriod);

        for (uint8 i = 0; i < vestingPeriods.length; ++i) {
            if (
                (vestedPeriod >= vestingPeriods[i].minVestingPeriod &&
                    vestedPeriod < vestingPeriods[i].maxVestingPeriod)
            ) {
                uint256 userReward = userRewardPerLot(msg.sender);
                uint256 userActualShare = userReward
                    .mul(vestingPeriods[i].rewardAllocation)
                    .div(1000);
                uint256 TenfinanceShare = userReward.sub(userActualShare);

                levels[enterStakingStats[msg.sender].level].userCount--;
                userEntered[msg.sender] = false;

                totalStaked -= enterStakingStats[msg.sender].balance;

                uint256 pos = index[msg.sender];
                registeredUsers[pos] = registeredUsers[
                    registeredUsers.length - 1
                ];
                registeredUsers.pop();
                delete (index[msg.sender]);
                delete (enterStakingStats[msg.sender]);

                IERC20Upgradeable(BUSD).safeTransfer(
                    msg.sender,
                    userActualShare
                );
                IERC20Upgradeable(BUSD).safeTransfer(
                    tenFinance,
                    TenfinanceShare
                );
                AddressUpgradeable.sendValue(payable(owner()), msg.value);

                emit RewardClaim(msg.sender, userActualShare);
                break;
            } else if (
                vestedPeriod >
                vestingPeriods[vestingPeriods.length.sub(1)].maxVestingPeriod
            ) {
                uint256 userReward = userRewardPerLot(msg.sender);
                levels[enterStakingStats[msg.sender].level].userCount--;
                userEntered[msg.sender] = false;

                totalStaked -= enterStakingStats[msg.sender].balance;

                uint256 pos = index[msg.sender];
                registeredUsers[pos] = registeredUsers[
                    registeredUsers.length - 1
                ];
                registeredUsers.pop();
                delete (index[msg.sender]);
                delete (enterStakingStats[msg.sender]);

                IERC20Upgradeable(BUSD).safeTransfer(msg.sender, userReward);
                AddressUpgradeable.sendValue(payable(owner()), msg.value);

                emit RewardClaim(msg.sender, userReward);
                break;
            }
        }
    }

    /**
     * @notice Function to edit the cool down period.
     */
    function editCoolDownPeriod(uint256 time) external onlyOwner {
        coolDownPeriod = time;
    }

    /**
     * @notice Function to the set/change the supplier of the BUSD token.
     * @dev The address refers to the TransferReward contract.
     */
    function changeSupplier(address supplier) external onlyOwner {
        require(supplier != address(0), "TenLots : zero address");
        _supplier = supplier;
    }

    /**
     * @notice Function to update the accumulated reward per lot for the users.
     */
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

    /**
     * @notice Function to add the details of each vesting period.
     * @param _minVestingPeriod - The minimum vesting period.
     * @param _maxVestingPeriod - The maximum vesting period.
     * @param _rewardAllocation - The percentage of the reward to be returned to the user.
     */
    function addVestingPeriod(
        uint256 _minVestingPeriod,
        uint256 _maxVestingPeriod,
        uint256 _rewardAllocation
    ) external onlyOwner {
        vestingPeriods.push(
            VestingPeriods({
                minVestingPeriod: _minVestingPeriod,
                maxVestingPeriod: _maxVestingPeriod,
                rewardAllocation: _rewardAllocation
            })
        );
    }

    /**
     * @notice Function to edit the details of each vesting period.
     * @param _index - The index of the vesting period in the vestingPeriods array.
     * @param _minVestingPeriod - The minimum vesting period.
     * @param _maxVestingPeriod - The maximum vesting period.
     * @param _rewardAllocation - The percentage of the reward to be returned to the user.
     */
    function editVestingPeriod(
        uint256 _index,
        uint256 _minVestingPeriod,
        uint256 _maxVestingPeriod,
        uint256 _rewardAllocation
    ) external onlyOwner {
        vestingPeriods[_index].minVestingPeriod = _minVestingPeriod;
        vestingPeriods[_index].maxVestingPeriod = _maxVestingPeriod;
        vestingPeriods[_index].rewardAllocation = _rewardAllocation;
    }

    /**
     * @notice Function to add the details of each TenLots level.
     * @param _minBalance - The minimum balance required to enter the level.
     * @param _maxBalance - The maximum balance required to enter the level.
     * @param _percentage - The percentage of the reward to be returned to the user.
     * @param _maxAllowedUser - The maximum number of users allowed to enter the level.
     */
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

    /**
     * @notice Function to edit the details of each TenLots level.
     * @param _index - The index of the level in the levels array.
     * @param _percentage - The percentage of the reward to be returned to the user.
     * @param _maxAllowedUser - The maximum number of users allowed to enter the level.
     * @param _maxBalance - The maximum balance required to enter the level.
     * @param _minBalance - The minimum balance required to enter the level.
     */
    function editLevel(
        uint256 _index,
        uint256 _percentage,
        uint256 _maxAllowedUser,
        uint256 _maxBalance,
        uint256 _minBalance
    ) external onlyOwner {
        levels[_index].sharePercent = _percentage;
        levels[_index].maxAllowedUser = _maxAllowedUser;
        levels[_index].maxBalance = _maxBalance;
        levels[_index].minBalance = _minBalance;
    }

    /**
     * @notice Function to add the pool ids and the corresponding LP token addresses.
     * @param _pID - The pool id array.
     * @param lp - The LP token address array.
     */
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

    /**
     * @notice Function to edit the user's rewards claiming timestamp.
     * @dev This function will automatically be trigerred, from the backend, whenever
     * the user withdraws from the farm.
     */
    function editUserClaimTimeStamp(
        address user,
        bool penalty,
        uint256 amount
    ) external onlyOwner {
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
            totalPenalties += amount;
            userEntered[user] = false;
            levels[enterStakingStats[user].level].userCount--;
            totalStaked -= enterStakingStats[user].balance;
            uint256 pos = index[user];
            registeredUsers[pos] = registeredUsers[registeredUsers.length - 1];
            registeredUsers.pop();

            delete (index[user]);
            delete (enterStakingStats[user]);
        }
    }

    /**
     * @notice Function to remove the pool ids and the corresponding LP token addresses.
     * @param _pID - The pool id array.
     * @param lp - The LP token address array.
     */
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

    /**
     * @notice Function to set the total reward amounts to be distributed for each lot.
     */
    function setAccRewardPerLot(uint256[] memory values) external onlyOwner {
        require(values.length == levels.length, "TenLots : values != levels");

        for (uint i = 0; i < levels.length; ++i) {
            accRewardPerLot[i] = values[i];
        }
    }

    /**
     * @notice Function to enter the user's details in the contract.
     * @dev This function migrates the user's data from the old contract to the new contract.
     */
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

    /**
     * @notice Function to set the TToken address from the TenLend protocol.
     * @dev This function also sets the tTokenSet to true, which enables the cTToken balance
     * to be calculated for the user during the enterStaking function .
     */
    function setTToken(address _TToken) external onlyOwner {
        require(_TToken != address(0), "TenLots : zero address");
        cTToken = _TToken;
        cTTokenSet = true;
    }

    /**
     * @notice Function to trigger the state of the tTokenSet.
     * @dev This function should be used if wrong address is set for TToken.
     */
    function toggleTTokenState(bool _state) external onlyOwner {
        cTTokenSet = _state;
    }

    /**
     * @notice Function to change the tenFinance address.
     */
    function editTenFinance(address _tenFinance) external onlyOwner {
        require(_tenFinance != address(0), "TenLots : zero address");
        tenFinance = _tenFinance;
    }

    /**
     * @notice Function to pause certain functions in the contract.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Function to unpause certain functions in the contract.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Function to retrieve the Tenfi balance of the @param _user
     */

    function getBalance(address _user) public view returns (uint256) {
        uint256 _balance = 0;
        for (uint8 i = 0; i < pID.length; ++i) {
            uint256 stakedWantTokens = TenFarm(tenFarm)
                .stakedWantTokens(pID[i], _user)
                .mul(precisionMultiplier);
            address token0 = IPancakePair(LP[i]).token0();
            address token1 = IPancakePair(LP[i]).token1();

            if (token0 == tenfi) {
                (uint256 reserve0, , ) = IPancakePair(LP[i]).getReserves();
                uint256 totalSupply = IPancakePair(LP[i]).totalSupply();
                _balance +=
                    (reserve0.mul(stakedWantTokens.div(totalSupply))) *
                    2;
            } else if (token1 == tenfi) {
                (, uint256 reserve1, ) = IPancakePair(LP[i]).getReserves();
                uint256 totalSupply = IPancakePair(LP[i]).totalSupply();
                _balance +=
                    (reserve1.mul(stakedWantTokens.div(totalSupply))) *
                    2;
            }
        }

        _balance += TenFarm(tenFarm)
            .stakedWantTokens(singleStakingVault, _user)
            .mul(precisionMultiplier);

        if (cTTokenSet) {
            (
                ,
                uint256 cTokenBalance,
                ,
                uint256 exchangeRateMantissa
            ) = IcTToken(cTToken).getAccountSnapshot(_user);
            _balance += (cTokenBalance.mul(exchangeRateMantissa).div(1e18)).mul(
                    precisionMultiplier
                );
        }

        return _balance.div(precisionMultiplier);
    }

    /**
     * @notice Function to calculate the reward of the user.
     */
    function userRewardPerLot(address user) public view returns (uint256) {
        require(userEntered[user], "TenLots: staking !entered");

        uint256 _level = enterStakingStats[user].level;

        uint256 _rewardPerLot = accRewardPerLot[_level].mul(unitShare).sub(
            (enterStakingStats[user].rewardDebt)
        );

        return _rewardPerLot.div(unitShare);
    }
}
