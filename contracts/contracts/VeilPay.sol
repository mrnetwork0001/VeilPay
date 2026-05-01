// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint8, euint32, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FheType} from "@fhevm/solidity/lib/FheType.sol";
import {Impl} from "@fhevm/solidity/lib/Impl.sol";

/**
 * @title VeilPay
 * @notice Confidential, trustless salary-matching protocol powered by Zama's FHE.
 * @dev Employers post jobs with encrypted max budgets. Candidates apply with encrypted
 *      minimum salary expectations. The Zama fhevm evaluates FHE.le(min, max) 
 *      without revealing either value — ever.
 *
 *      Built with fhevm-solidity v0.11.x + zama-fhe/relayer-sdk v0.4.x
 */
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract VeilPay is ZamaEthereumConfig {
    // ─────────────────────────────────────────────────────────────
    // Bounty Token (cUSDC)
    // ─────────────────────────────────────────────────────────────

    IERC20 public immutable bountyToken;

    constructor(address _bountyToken) {
        require(_bountyToken != address(0), "VeilPay: Invalid token address");
        bountyToken = IERC20(_bountyToken);
    }

    // ─────────────────────────────────────────────────────────────
    // Data Structures
    // ─────────────────────────────────────────────────────────────

    struct JobPosting {
        address employer;
        string title;
        string company;
        string location;
        string jobType;      // "Full-time", "Contract", "Part-time", "Remote"
        string description;  // Brief 2-sentence job description
        string logoUrl;      // Company logo URL (IPFS or web)
        euint64 max_budget;  // Encrypted by employer in browser via relayer-sdk
        euint8 requiredExperience; // Encrypted required years of experience
        ebool remoteOk;      // Encrypted remote preference
        bool isActive;
        bool isResolved;
        uint256 createdAt;
        uint256 applicationCount;
        uint256 bountyPool;      // Total ETH deposited as interview bounty
        uint256 bountyPerUnlock; // ETH paid per resume unlock
    }

    struct Application {
        address candidate;
        string candidateName;
        string resumeIpfsCid;    // IPFS CID, revealed only on match
        euint64 min_expectation; // Encrypted by candidate in browser via relayer-sdk
        euint8 experience;       // Encrypted years of experience
        ebool remotePreference;  // Encrypted remote preference
        euint8 matchScore;       // Weighted match score (0-100), encrypted
        ebool isMatched;         // Result of FHE.le — still encrypted (kept for backward compat)
        bool matchRevealed;      // Has the result been decrypted?
        bool matchResult;        // Plaintext result after public decryption
        uint8 revealedScore;     // Plaintext score after decryption
        bool resumeUnlocked;     // Has employer unlocked the resume?
        uint256 appliedAt;
    }

    // ─────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────

    uint256 public jobCount;

    /// @dev jobId => JobPosting
    mapping(uint256 => JobPosting) public jobPostings;

    /// @dev jobId => applicationId => Application
    mapping(uint256 => mapping(uint256 => Application)) public applications;

    /// @dev jobId => list of application IDs
    mapping(uint256 => uint256[]) public jobApplicationIds;

    /// @dev candidate address => list of (jobId) they applied to
    mapping(address => uint256[]) public candidateJobIds;
    mapping(address => mapping(uint256 => uint256)) public candidateApplicationId;

    // ── Company Reviews (FHE-Aggregated) ──────────────────────────
    /// @dev employer address => encrypted running total of all ratings
    mapping(address => euint32) private companyTotalScores;
    /// @dev employer address => plaintext count of reviews received
    mapping(address => uint256) public companyReviewCounts;
    /// @dev employer address => revealed average rating (after decryption)
    mapping(address => uint8) public companyRevealedRating;
    /// @dev candidate => employer => has reviewed (prevent double reviews)
    mapping(address => mapping(address => bool)) public hasReviewed;

    // ─────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────

    event JobPosted(uint256 indexed jobId, address indexed employer, string title, string company);
    event ApplicationSubmitted(uint256 indexed jobId, uint256 indexed applicationId, address indexed candidate);
    event ApplicationResolved(uint256 indexed jobId, uint256 indexed applicationId);
    event MatchRevealed(uint256 indexed jobId, uint256 indexed applicationId, bool isMatch);
    event ResumeUnlocked(uint256 indexed jobId, uint256 indexed applicationId, address indexed employer);
    event JobClosed(uint256 indexed jobId);
    event BountyPaid(uint256 indexed jobId, uint256 indexed applicationId, address indexed candidate, uint256 amount);
    event BountyRefunded(uint256 indexed jobId, address indexed employer, uint256 amount);
    event ReviewSubmitted(address indexed employer, address indexed reviewer);

    // ─────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────

    modifier onlyEmployer(uint256 jobId) {
        require(msg.sender == jobPostings[jobId].employer, "VeilPay: Not the employer");
        _;
    }

    modifier jobExists(uint256 jobId) {
        require(jobId < jobCount, "VeilPay: Job does not exist");
        _;
    }

    modifier jobIsActive(uint256 jobId) {
        require(jobPostings[jobId].isActive, "VeilPay: Job is not active");
        _;
    }

    modifier appExists(uint256 jobId, uint256 appId) {
        require(appId < jobPostings[jobId].applicationCount, "VeilPay: Application does not exist");
        _;
    }

    // ─────────────────────────────────────────────────────────────
    // Core Functions
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice EMPLOYER: Post a new job with an encrypted maximum budget and interview bounty.
     * @param title              Job title (e.g., "Senior Solidity Engineer")
     * @param company            Company name
     * @param location           Job location or "Remote"
     * @param jobType            "Full-time", "Contract", "Part-time", "Remote"
     * @param description        Brief 2-sentence job description
     * @param logoUrl            Company logo URL (IPFS or web URL, can be empty)
     * @param encryptedBudget    Handle produced by relayer-sdk in the browser
     * @param encryptedExperience Encrypted required years of experience
     * @param encryptedRemoteOk  Encrypted remote preference boolean
     * @param inputProof         ZKP proof accompanying all ciphertexts
     * @param bountyPerUnlock_   ETH paid to each candidate whose resume is unlocked
     * @return jobId             The created job's ID
     */
    function createJobPosting(
        string calldata title,
        string calldata company,
        string calldata location,
        string calldata jobType,
        string calldata description,
        string calldata logoUrl,
        bytes32 encryptedBudget,
        bytes32 encryptedExperience,
        bytes32 encryptedRemoteOk,
        bytes calldata inputProof,
        uint256 bountyPerUnlock_,
        uint256 totalDeposit_
    ) external returns (uint256 jobId) {
        require(totalDeposit_ > 0, "VeilPay: Must deposit interview bounty");
        require(bountyPerUnlock_ > 0 && bountyPerUnlock_ <= totalDeposit_, "VeilPay: Invalid bounty per unlock");

        // Transfer cUSDC from employer to this contract (requires prior approval)
        require(bountyToken.transferFrom(msg.sender, address(this), totalDeposit_), "VeilPay: Token transfer failed");

        jobId = jobCount++;

        // Verify the encrypted inputs and convert to FHE types
        euint64 budget = euint64.wrap(Impl.verify(encryptedBudget, inputProof, FheType.Uint64));
        euint8 reqExp = euint8.wrap(Impl.verify(encryptedExperience, inputProof, FheType.Uint8));
        ebool remoteFlag = ebool.wrap(Impl.verify(encryptedRemoteOk, inputProof, FheType.Bool));
        FHE.allowThis(budget);
        FHE.allowThis(reqExp);
        FHE.allowThis(remoteFlag);

        jobPostings[jobId] = JobPosting({
            employer: msg.sender,
            title: title,
            company: company,
            location: location,
            jobType: jobType,
            description: description,
            logoUrl: logoUrl,
            max_budget: budget,
            requiredExperience: reqExp,
            remoteOk: remoteFlag,
            isActive: true,
            isResolved: false,
            createdAt: block.timestamp,
            applicationCount: 0,
            bountyPool: totalDeposit_,
            bountyPerUnlock: bountyPerUnlock_
        });

        emit JobPosted(jobId, msg.sender, title, company);
    }

    /**
     * @notice CANDIDATE: Apply to a job with encrypted salary, experience, and remote preference.
     * @param jobId                  Job identifier
     * @param candidateName          Full name shown to employer on match
     * @param resumeIpfsCid          IPFS CID of the candidate's resume
     * @param encryptedExpectation   Encrypted minimum salary expectation
     * @param encryptedExperience    Encrypted years of experience
     * @param encryptedRemotePref    Encrypted remote preference boolean
     * @param inputProof             ZKP proof accompanying the ciphertexts
     * @return applicationId         The created application's ID
     */
    function applyToJob(
        uint256 jobId,
        string calldata candidateName,
        string calldata resumeIpfsCid,
        bytes32 encryptedExpectation,
        bytes32 encryptedExperience,
        bytes32 encryptedRemotePref,
        bytes calldata inputProof
    ) external jobExists(jobId) jobIsActive(jobId) returns (uint256 applicationId) {
        require(
            candidateApplicationId[msg.sender][jobId] == 0 &&
            !(jobApplicationIds[jobId].length > 0 &&
              applications[jobId][0].candidate == msg.sender),
            "VeilPay: Already applied"
        );

        applicationId = jobPostings[jobId].applicationCount++;

        // Verify encrypted inputs
        euint64 expectation = euint64.wrap(Impl.verify(encryptedExpectation, inputProof, FheType.Uint64));
        euint8 exp = euint8.wrap(Impl.verify(encryptedExperience, inputProof, FheType.Uint8));
        ebool remotePref = ebool.wrap(Impl.verify(encryptedRemotePref, inputProof, FheType.Bool));
        FHE.allowThis(expectation);
        FHE.allowThis(exp);
        FHE.allowThis(remotePref);

        // Initialize defaults
        ebool defaultMatch = FHE.asEbool(false);
        euint8 defaultScore = FHE.asEuint8(0);
        FHE.allowThis(defaultMatch);
        FHE.allowThis(defaultScore);

        applications[jobId][applicationId] = Application({
            candidate: msg.sender,
            candidateName: candidateName,
            resumeIpfsCid: resumeIpfsCid,
            min_expectation: expectation,
            experience: exp,
            remotePreference: remotePref,
            matchScore: defaultScore,
            isMatched: defaultMatch,
            matchRevealed: false,
            matchResult: false,
            revealedScore: 0,
            resumeUnlocked: false,
            appliedAt: block.timestamp
        });

        jobApplicationIds[jobId].push(applicationId);
        candidateJobIds[msg.sender].push(jobId);
        candidateApplicationId[msg.sender][jobId] = applicationId;

        emit ApplicationSubmitted(jobId, applicationId, msg.sender);
    }

    /**
     * @notice RESOLVER (anyone can call): Triggers multi-variable FHE evaluation.
     *         Computes a weighted match score (0-100) from salary, experience, and remote pref.
     * @dev    Score breakdown: Salary match = 50pts, Experience match = 30pts, Remote match = 20pts.
     * @param jobId         Job identifier
     * @param applicationId Application identifier
     */
    function resolveApplication(
        uint256 jobId,
        uint256 applicationId
    ) external jobExists(jobId) appExists(jobId, applicationId) {
        Application storage app = applications[jobId][applicationId];
        JobPosting storage posting = jobPostings[jobId];

        require(!app.matchRevealed, "VeilPay: Already resolved and revealed");

        // ── MULTI-VARIABLE WEIGHTED MATCH SCORING ──
        // Score starts at 0 and accumulates points from three encrypted comparisons.

        // 1. Salary Match (50 points): candidate_ask <= employer_budget
        ebool salaryMatch = FHE.le(app.min_expectation, posting.max_budget);
        euint8 salaryScore = FHE.select(salaryMatch, FHE.asEuint8(50), FHE.asEuint8(0));

        // 2. Experience Match (30 points): candidate_exp >= required_exp
        ebool expMatch = FHE.ge(app.experience, posting.requiredExperience);
        euint8 expScore = FHE.select(expMatch, FHE.asEuint8(30), FHE.asEuint8(0));

        // 3. Remote Preference Match (20 points): both agree on remote
        ebool remoteMatch = FHE.eq(app.remotePreference, posting.remoteOk);
        euint8 remoteScore = FHE.select(remoteMatch, FHE.asEuint8(20), FHE.asEuint8(0));

        // Total weighted score (0-100)
        euint8 totalScore = FHE.add(FHE.add(salaryScore, expScore), remoteScore);

        // Store the encrypted score
        app.matchScore = totalScore;
        FHE.allowThis(totalScore);
        FHE.allow(totalScore, posting.employer);
        FHE.makePubliclyDecryptable(totalScore);

        // Also keep the salary-only boolean for backward compatibility
        app.isMatched = salaryMatch;
        FHE.allowThis(salaryMatch);
        FHE.allow(salaryMatch, posting.employer);
        FHE.makePubliclyDecryptable(salaryMatch);

        emit ApplicationResolved(jobId, applicationId);
    }

    /**
     * @notice EMPLOYER ONLY: Reveal the match result and score after FHE evaluation.
     * @param jobId                Job identifier
     * @param applicationId        Application identifier
     * @param decryptedMatchResult  Plaintext boolean from decrypting the salary match
     * @param decryptedScore        Plaintext uint8 from decrypting the weighted score (0-100)
     */
    function revealMatchResult(
        uint256 jobId,
        uint256 applicationId,
        bool decryptedMatchResult,
        uint8 decryptedScore
    ) external jobExists(jobId) appExists(jobId, applicationId) onlyEmployer(jobId) {
        Application storage app = applications[jobId][applicationId];
        require(!app.matchRevealed, "VeilPay: Match already revealed");

        app.matchRevealed = true;
        app.matchResult = decryptedMatchResult;
        app.revealedScore = decryptedScore;

        emit MatchRevealed(jobId, applicationId, decryptedMatchResult);
    }

    /**
     * @notice EMPLOYER ONLY: Unlock the candidate's resume on a successful match.
     *         Automatically pays the interview bounty to the candidate.
     * @param jobId         Job identifier
     * @param applicationId Application identifier
     */
    function unlockResume(
        uint256 jobId,
        uint256 applicationId
    ) external jobExists(jobId) appExists(jobId, applicationId) onlyEmployer(jobId) {
        Application storage app = applications[jobId][applicationId];
        JobPosting storage posting = jobPostings[jobId];
        require(app.matchRevealed && app.matchResult, "VeilPay: No confirmed match");
        require(!app.resumeUnlocked, "VeilPay: Resume already unlocked");

        app.resumeUnlocked = true;

        // Pay the interview bounty in cUSDC to the candidate if pool has funds
        if (posting.bountyPool >= posting.bountyPerUnlock) {
            posting.bountyPool -= posting.bountyPerUnlock;
            require(bountyToken.transfer(app.candidate, posting.bountyPerUnlock), "VeilPay: Bounty transfer failed");
            emit BountyPaid(jobId, applicationId, app.candidate, posting.bountyPerUnlock);
        }

        emit ResumeUnlocked(jobId, applicationId, msg.sender);
    }

    /**
     * @notice EMPLOYER ONLY: Close a job posting and refund remaining bounty pool.
     */
    function closeJob(uint256 jobId) external jobExists(jobId) onlyEmployer(jobId) {
        JobPosting storage posting = jobPostings[jobId];
        posting.isActive = false;

        // Refund remaining cUSDC bounty pool to employer
        uint256 refundAmount = posting.bountyPool;
        if (refundAmount > 0) {
            posting.bountyPool = 0;
            require(bountyToken.transfer(msg.sender, refundAmount), "VeilPay: Refund transfer failed");
            emit BountyRefunded(jobId, msg.sender, refundAmount);
        }

        emit JobClosed(jobId);
    }

    // ─────────────────────────────────────────────────────────────
    // View Functions
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice PUBLIC VIEW: Anyone can browse active job listings (no salary data exposed).
     */
    function getActiveJobs() external view returns (
        uint256[] memory ids,
        address[] memory employers,
        string[] memory titles,
        string[] memory companies,
        string[] memory locations,
        string[] memory jobTypes,
        string[] memory descriptions,
        string[] memory logoUrls,
        uint256[] memory createdAts,
        uint256[] memory applicationCounts,
        uint256[] memory bountyPools,
        uint256[] memory bountyPerUnlocks
    ) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < jobCount; i++) {
            if (jobPostings[i].isActive) activeCount++;
        }

        ids = new uint256[](activeCount);
        employers = new address[](activeCount);
        titles = new string[](activeCount);
        companies = new string[](activeCount);
        locations = new string[](activeCount);
        jobTypes = new string[](activeCount);
        descriptions = new string[](activeCount);
        logoUrls = new string[](activeCount);
        createdAts = new uint256[](activeCount);
        applicationCounts = new uint256[](activeCount);
        bountyPools = new uint256[](activeCount);
        bountyPerUnlocks = new uint256[](activeCount);

        uint256 idx = 0;
        for (uint256 i = 0; i < jobCount; i++) {
            if (jobPostings[i].isActive) {
                JobPosting storage j = jobPostings[i];
                ids[idx] = i;
                employers[idx] = j.employer;
                titles[idx] = j.title;
                companies[idx] = j.company;
                locations[idx] = j.location;
                jobTypes[idx] = j.jobType;
                descriptions[idx] = j.description;
                logoUrls[idx] = j.logoUrl;
                createdAts[idx] = j.createdAt;
                applicationCounts[idx] = j.applicationCount;
                bountyPools[idx] = j.bountyPool;
                bountyPerUnlocks[idx] = j.bountyPerUnlock;
                idx++;
            }
        }
    }

    /**
     * @notice EMPLOYER VIEW: See all applications for their job (names only, no salary).
     */
    function getApplicationsForJob(uint256 jobId)
        external
        view
        jobExists(jobId)
        onlyEmployer(jobId)
        returns (
            uint256[] memory appIds,
            address[] memory candidates,
            string[] memory names,
            bool[] memory matchRevealeds,
            bool[] memory matchResults,
            bytes32[] memory matchHandles,
            bytes32[] memory scoreHandles,
            uint8[] memory revealedScores,
            bool[] memory resumeUnlockeds,
            uint256[] memory appliedAts
        )
    {
        uint256 count = jobPostings[jobId].applicationCount;
        appIds = new uint256[](count);
        candidates = new address[](count);
        names = new string[](count);
        matchRevealeds = new bool[](count);
        matchResults = new bool[](count);
        matchHandles = new bytes32[](count);
        scoreHandles = new bytes32[](count);
        revealedScores = new uint8[](count);
        resumeUnlockeds = new bool[](count);
        appliedAts = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            Application storage app = applications[jobId][i];
            appIds[i] = i;
            candidates[i] = app.candidate;
            names[i] = app.candidateName;
            matchRevealeds[i] = app.matchRevealed;
            matchResults[i] = app.matchResult;
            matchHandles[i] = ebool.unwrap(app.isMatched);
            scoreHandles[i] = euint8.unwrap(app.matchScore);
            revealedScores[i] = app.revealedScore;
            resumeUnlockeds[i] = app.resumeUnlocked;
            appliedAts[i] = app.appliedAt;
        }
    }

    /**
     * @notice Get a specific application's resume — only if unlocked.
     */
    function getResumeIfUnlocked(uint256 jobId, uint256 applicationId)
        external
        view
        jobExists(jobId)
        appExists(jobId, applicationId)
        onlyEmployer(jobId)
        returns (string memory ipfsCid)
    {
        Application storage app = applications[jobId][applicationId];
        require(app.resumeUnlocked, "VeilPay: Resume not yet unlocked");
        return app.resumeIpfsCid;
    }

    /**
     * @notice CANDIDATE VIEW: See their own application history and match statuses.
     */
    function getMyApplications() external view returns (
        uint256[] memory jobIds,
        uint256[] memory appIds,
        string[] memory titles,
        string[] memory companies,
        bool[] memory matchRevealeds,
        bool[] memory matchResults,
        uint256[] memory appliedAts
    ) {
        uint256[] memory myJobIds = candidateJobIds[msg.sender];
        uint256 count = myJobIds.length;

        jobIds = new uint256[](count);
        appIds = new uint256[](count);
        titles = new string[](count);
        companies = new string[](count);
        matchRevealeds = new bool[](count);
        matchResults = new bool[](count);
        appliedAts = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            uint256 jid = myJobIds[i];
            uint256 aid = candidateApplicationId[msg.sender][jid];
            Application storage app = applications[jid][aid];
            JobPosting storage job = jobPostings[jid];

            jobIds[i] = jid;
            appIds[i] = aid;
            titles[i] = job.title;
            companies[i] = job.company;
            matchRevealeds[i] = app.matchRevealed;
            matchResults[i] = app.matchResult;
            appliedAts[i] = app.appliedAt;
        }
    }

    /**
     * @notice Returns all jobs posted by a specific employer address.
     */
    function getJobsByEmployer(address employer) external view returns (uint256[] memory jobIds) {
        uint256 count = 0;
        for (uint256 i = 0; i < jobCount; i++) {
            if (jobPostings[i].employer == employer) count++;
        }

        jobIds = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < jobCount; i++) {
            if (jobPostings[i].employer == employer) {
                jobIds[idx++] = i;
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // FHE-Gated Chat System
    // ─────────────────────────────────────────────────────────────
    //
    // Only employer-candidate pairs with a confirmed FHE match
    // (salary compatibility verified via encrypted FHE.le comparison)
    // can exchange messages. The FHE computation is the trust anchor
    // that unlocks this communication channel.

    struct ChatMessage {
        address sender;
        string content;
        uint256 timestamp;
    }

    /// @dev (jobId, applicationId) => array of messages
    mapping(uint256 => mapping(uint256 => ChatMessage[])) private chatMessages;

    event MessageSent(
        uint256 indexed jobId,
        uint256 indexed applicationId,
        address indexed sender,
        uint256 messageIndex
    );

    /**
     * @notice Send a message in an FHE-gated chat channel.
     * @dev    Only the employer or the matched candidate can send messages.
     *         The chat channel only exists because FHE.le() confirmed salary compatibility.
     * @param jobId         Job identifier
     * @param applicationId Application identifier
     * @param content       Message content
     */
    function sendMessage(
        uint256 jobId,
        uint256 applicationId,
        string calldata content
    ) external jobExists(jobId) appExists(jobId, applicationId) {
        Application storage app = applications[jobId][applicationId];
        JobPosting storage posting = jobPostings[jobId];

        // Gate 1: Match must be revealed and confirmed via FHE
        require(app.matchRevealed && app.matchResult, "VeilPay: No confirmed FHE match");

        // Gate 2: Only the two matched parties can chat
        require(
            msg.sender == posting.employer || msg.sender == app.candidate,
            "VeilPay: Not a participant in this match"
        );

        // Gate 3: Message must not be empty
        require(bytes(content).length > 0, "VeilPay: Empty message");

        uint256 msgIndex = chatMessages[jobId][applicationId].length;
        chatMessages[jobId][applicationId].push(ChatMessage({
            sender: msg.sender,
            content: content,
            timestamp: block.timestamp
        }));

        emit MessageSent(jobId, applicationId, msg.sender, msgIndex);
    }

    /**
     * @notice Retrieve all messages in an FHE-gated chat channel.
     * @dev    Only the employer or the matched candidate can read the chat.
     * @param jobId         Job identifier
     * @param applicationId Application identifier
     * @return senders      Array of sender addresses
     * @return contents     Array of message contents
     * @return timestamps   Array of message timestamps
     */
    function getMessages(
        uint256 jobId,
        uint256 applicationId
    )
        external
        view
        jobExists(jobId)
        appExists(jobId, applicationId)
        returns (
            address[] memory senders,
            string[] memory contents,
            uint256[] memory timestamps
        )
    {
        Application storage app = applications[jobId][applicationId];
        JobPosting storage posting = jobPostings[jobId];

        // Only matched participants can read messages
        require(app.matchRevealed && app.matchResult, "VeilPay: No confirmed FHE match");
        require(
            msg.sender == posting.employer || msg.sender == app.candidate,
            "VeilPay: Not a participant in this match"
        );

        ChatMessage[] storage msgs = chatMessages[jobId][applicationId];
        uint256 count = msgs.length;

        senders = new address[](count);
        contents = new string[](count);
        timestamps = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            senders[i] = msgs[i].sender;
            contents[i] = msgs[i].content;
            timestamps[i] = msgs[i].timestamp;
        }
    }

    /**
     * @notice Get the message count for a chat channel.
     * @dev    Public view so either party can check for new messages.
     */
    function getMessageCount(
        uint256 jobId,
        uint256 applicationId
    ) external view jobExists(jobId) appExists(jobId, applicationId) returns (uint256) {
        return chatMessages[jobId][applicationId].length;
    }

    // ─────────────────────────────────────────────────────────────
    // FHE-Aggregated Anonymous Company Reviews
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice CANDIDATE: Submit an encrypted anonymous review for an employer.
     *         Rating is 1-5 stars, encrypted as euint8. The contract sums all
     *         ratings homomorphically using FHE.add — individual ratings are
     *         mathematically impossible to extract.
     * @param employer       The employer's address to review
     * @param encryptedRating Encrypted rating (1-5) from relayer-sdk
     * @param inputProof     ZKP proof for the ciphertext
     */
    function submitReview(
        address employer,
        bytes32 encryptedRating,
        bytes calldata inputProof
    ) external {
        require(employer != address(0), "VeilPay: Invalid employer");
        require(!hasReviewed[msg.sender][employer], "VeilPay: Already reviewed this employer");

        euint8 rating = euint8.wrap(Impl.verify(encryptedRating, inputProof, FheType.Uint8));
        FHE.allowThis(rating);

        // Cast to euint32 for aggregation (prevents overflow with many reviews)
        euint32 rating32 = FHE.asEuint32(rating);

        if (companyReviewCounts[employer] == 0) {
            // First review — initialize the encrypted total
            companyTotalScores[employer] = rating32;
        } else {
            // Add to running encrypted total
            companyTotalScores[employer] = FHE.add(companyTotalScores[employer], rating32);
        }
        FHE.allowThis(companyTotalScores[employer]);

        companyReviewCounts[employer]++;
        hasReviewed[msg.sender][employer] = true;

        emit ReviewSubmitted(employer, msg.sender);
    }

    /**
     * @notice PUBLIC: Reveal the average company rating by decrypting the sum
     *         and dividing by count off-chain. Makes the sum publicly decryptable.
     * @param employer The employer's address
     */
    function requestRatingReveal(address employer) external {
        require(companyReviewCounts[employer] > 0, "VeilPay: No reviews yet");
        FHE.makePubliclyDecryptable(companyTotalScores[employer]);
    }

    /**
     * @notice Store the revealed average rating after off-chain decryption.
     * @param employer       The employer's address
     * @param decryptedAvg   The average rating (computed off-chain: sum / count)
     */
    function commitRevealedRating(
        address employer,
        uint8 decryptedAvg
    ) external {
        require(companyReviewCounts[employer] > 0, "VeilPay: No reviews");
        companyRevealedRating[employer] = decryptedAvg;
    }

    /**
     * @notice Get company review info.
     */
    function getCompanyReviewInfo(address employer) external view returns (
        uint256 reviewCount,
        uint8 revealedAvg,
        bytes32 totalScoreHandle
    ) {
        reviewCount = companyReviewCounts[employer];
        revealedAvg = companyRevealedRating[employer];
        totalScoreHandle = euint32.unwrap(companyTotalScores[employer]);
    }

}
