//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

error NotOwner();
error NotCreator();
error NotValidAddress();
error ContractPaused();

contract Fundraise {

    /* ========== EVENTS ========== */

    event CampaignCreated(uint campaignId, string name, string description, uint goalFund, uint campaignTime);
    event CampaignFunded(uint campaignId, address contributor, uint amount);
    event CampaignClosed(uint campaignId, uint raisedFunds);
    
    /* ========== DATA STRUCTURES ========== */

    struct Campaign {
        address fundraiser;
        string name;
        string description;
        uint raisedFunds;
        uint goalFund;
        uint endAt;
        address[] contributors;
        uint256[] donations;
        bool closed; // 0 - campaign live, 1 - closed
    }

    /* ========== VARIABLES ========== */

    address public owner;
    uint public fee;
    uint public minFund; // minimum amount to fund campaigns
    uint internal treasury;
    bool public _paused;
    bool internal locked;
    
    
    
    mapping(uint => Campaign) internal campaigns;
    uint public campaignsNum; // keep track of number campaigns
    

    /* ========== MODIFIERS ========== */

    modifier onlyOwner(){
        if (msg.sender != owner) {
            revert NotOwner();
        }
        _;
    }

    modifier validAddress(address _addr) {
        if(_addr == address(0)){
            revert NotValidAddress();
        }
        _;
    }

    // In case of emergency sets contract on pause
    modifier onlyWhenNotPaused() {
        if(_paused){
            revert ContractPaused();
        }
        _;
    }

    // prevents reentrancy 
    modifier onlyFundraiserNoReentrant() {
        if (!isFundraiser(msg.sender)) {
            revert NotCreator();
        }
        require(!locked, "No re-entrancy");
        locked = true;
        _;
        locked = false;
    }


    /* ========== CONSTRUCTOR ========== */

    constructor(uint _fee, uint _minFund) {
        owner = msg.sender;
        fee = _fee;
        minFund = _minFund;
    }


    /* ========== FUNCTIONS ========== */


    /**
     * @dev To prevent spam small fee added for creators to pay, owner of smart contract decides how much to pay.
     *      Users can only create one campaign at the time. 
     * 
     * params:  _goalFund - in Ether, _campaignTime - in minutes
     */

    function createCampaign(string memory _name, 
                            string memory _description, 
                            uint _goalFund, 
                            uint _campaignTime) 
                            public payable onlyWhenNotPaused {
        
        require(!isLive(msg.sender), "You already have live fundraising campaign");
        require(msg.value == fee, "Error: incorrect fee amount");
        require( _goalFund >= 1 ether);
        require(_campaignTime > 0);

        // fee payment
        treasury += msg.value;
        
        campaigns[campaignsNum].fundraiser = msg.sender;
        campaigns[campaignsNum].name = _name;
        campaigns[campaignsNum].description = _description;
        campaigns[campaignsNum].goalFund = _goalFund;
        campaigns[campaignsNum].endAt = block.timestamp + (_campaignTime * 60);
        campaigns[campaignsNum].closed = false;

        campaignsNum++;

        emit CampaignCreated(campaignsNum, _name, _description, _goalFund, _campaignTime);
    }


    /**
     * @dev allows anyone to fund Live campaigns
     */

    function fundCampaign(uint campaignId) public payable onlyWhenNotPaused {
        require(msg.value >= minFund, "Not enough to fund");
        require(!isEnded(campaignId), "Fundraising finished");
        
        // add donation to campaign
        campaigns[campaignId].raisedFunds += msg.value;
        
        // add contributor to donation list
        campaigns[campaignId].contributors.push(msg.sender);
        campaigns[campaignId].donations.push(msg.value);

        emit CampaignFunded(campaignId, msg.sender, msg.value);
    }


    /**
     * @dev Allows fundraiser to withdraw funds, if deadline is reached.
     *      Old campaign will get a new status (Finished or Failed), 
     *      after that fundraiser can start a new one.
     */

    function closeCampaign(uint campaignId) public onlyFundraiserNoReentrant onlyWhenNotPaused{
        
        require(isEnded(campaignId), "Fundraising is still active");
        require(campaigns[campaignId].closed == false, "Already closed");
    
        uint raised = campaigns[campaignId].raisedFunds;

        if (raised > 0){
            (bool success, ) = msg.sender.call{value: raised}("");
            require(success, "Failed to withdraw");   
        }

        campaigns[campaignId].closed = true;

        emit CampaignClosed(campaignId, raised);

    }


    /* ========== READ-ONLY ========== */

    // check if user is a fundraiser
    function isFundraiser(address _fundraiser) internal view returns (bool) {
        for (uint i = 0; i < campaignsNum; i++){
            if (campaigns[i].fundraiser == _fundraiser) {
                return true;
            }
        }
        return false;
    }

    // check if user have active fundraising campaign
    function isLive(address _fundraiser) internal view returns (bool) {
        for (uint i = 0; i < campaignsNum; i++){
            if (campaigns[i].fundraiser == _fundraiser) {
                return (campaigns[i].closed == false) ? true : false;
            }
        }
        return false;
    }

    // check if campaign ended 
    // return true if campaign reached deadline
    function isEnded(uint _campaignId) internal view returns(bool) {
        return (block.timestamp >= campaigns[_campaignId].endAt);
    }

    /* ========== GETTERS ========== */

    // get campaigns info
    function getCampaignsInfo() public view returns (Campaign[] memory) {
        Campaign[] memory _campaigns = new Campaign[](campaignsNum);

        for(uint i = 0; i < campaignsNum; i++) {
            Campaign storage campaignInfo = campaigns[i];

            _campaigns[i] = campaignInfo;
        }

        return _campaigns;
    }

    // get donation info
    function getDonations(uint campaignId) public view returns (address[] memory, uint256[] memory) {
        return (campaigns[campaignId].contributors, campaigns[campaignId].donations);
    }

    // returns the time left before the deadline for the frontend
    function timeLeft(uint campaignId) public view returns (uint256) {
        return 
            block.timestamp < campaigns[campaignId].endAt ? 
                campaigns[campaignId].endAt - block.timestamp : 0;
    }

    /* ========== ONLY-OWNER ========== */

    // pause contract in case of emergency
    function setPaused(bool val) public onlyOwner {
        _paused = val;
    }

    // change fee for creators to pay
    function changeFee(uint _fee) public onlyOwner {
        fee = _fee;
    }

    // change minimum amount to fund campaign
    function changeMinFund(uint _minFund) public onlyOwner {
        minFund = _minFund;
    }

    function changeOwner(address newOwner) public onlyOwner validAddress(newOwner) {
        owner = newOwner;
    }

    function collectFee() public onlyOwner {
        require (treasury > 0, "Treasury is empty");
        (bool success, ) = msg.sender.call{value: treasury}("");
        require(success, "Failed to withdraw");
    }

    // TODO: in case fundraisers forget to close campaign, 
    //       send raised funds to them and change campaign status


    // special function that receives eth
    receive() external payable {}
}