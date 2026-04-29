// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FheType} from "@fhevm/solidity/lib/FheType.sol";
import {Impl} from "@fhevm/solidity/lib/Impl.sol";

/**
 * @title BlindHire
 * @notice Confidential, trustless salary-matching protocol powered by Zama's FHE.
 * @dev Employers post jobs with encrypted max budgets. Candidates apply with encrypted
 *      minimum salary expectations. The Zama fhevm evaluates FHE.le(min, max) 
 *      without revealing either value — ever.
 *
 *      Built with fhevm-solidity v0.11.x + zama-fhe/relayer-sdk v0.4.x
 */
contract BlindHire is ZamaEthereumConfig {
    // ─────────────────────────────────────────────────────────────
    // Data Structures
    // ─────────────────────────────────────────────────────────────

    struct JobPosting {
        address employer;
        string title;
        string company;
        string location;
        string jobType;      // "Full-time", "Contract", "Part-time", "Remote"
        euint64 max_budget;  // Encrypted by employer in browser via relayer-sdk
        bool isActive;
        bool isResolved;
        uint256 createdAt;
        uint256 applicationCount;
    }

    struct Application {
        address candidate;
        string candidateName;
        string resumeIpfsCid;    // IPFS CID, revealed only on match
        euint64 min_expectation; // Encrypted by candidate in browser via relayer-sdk
        ebool isMatched;         // Result of FHE.le — still encrypted
        bool matchRevealed;      // Has the result been decrypted?
        bool matchResult;        // Plaintext result after public decryption
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

    // ─────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────

    event JobPosted(uint256 indexed jobId, address indexed employer, string title, string company);
    event ApplicationSubmitted(uint256 indexed jobId, uint256 indexed applicationId, address indexed candidate);
    event ApplicationResolved(uint256 indexed jobId, uint256 indexed applicationId);
    event MatchRevealed(uint256 indexed jobId, uint256 indexed applicationId, bool isMatch);
    event ResumeUnlocked(uint256 indexed jobId, uint256 indexed applicationId, address indexed employer);
    event JobClosed(uint256 indexed jobId);

    // ─────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────

    modifier onlyEmployer(uint256 jobId) {
        require(msg.sender == jobPostings[jobId].employer, "BlindHire: Not the employer");
        _;
    }

    modifier jobExists(uint256 jobId) {
        require(jobId < jobCount, "BlindHire: Job does not exist");
        _;
    }

    modifier jobIsActive(uint256 jobId) {
        require(jobPostings[jobId].isActive, "BlindHire: Job is not active");
        _;
    }

    modifier appExists(uint256 jobId, uint256 appId) {
        require(appId < jobPostings[jobId].applicationCount, "BlindHire: Application does not exist");
        _;
    }

    // ─────────────────────────────────────────────────────────────
    // Core Functions
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice EMPLOYER: Post a new job with an encrypted maximum budget.
     * @param title         Job title (e.g., "Senior Solidity Engineer")
     * @param company       Company name
     * @param location      Job location or "Remote"
     * @param jobType       "Full-time", "Contract", "Part-time", "Remote"
     * @param encryptedBudget  Handle produced by relayer-sdk in the browser
     * @param inputProof    ZKP proof accompanying the ciphertext
     * @return jobId        The created job's ID
     */
    function createJobPosting(
        string calldata title,
        string calldata company,
        string calldata location,
        string calldata jobType,
        bytes32 encryptedBudget,
        bytes calldata inputProof
    ) external returns (uint256 jobId) {
        jobId = jobCount++;

        // Verify the encrypted input and convert to euint64
        euint64 budget = euint64.wrap(Impl.verify(encryptedBudget, inputProof, FheType.Uint64));
        // Allow this contract to use the ciphertext
        FHE.allowThis(budget);

        jobPostings[jobId] = JobPosting({
            employer: msg.sender,
            title: title,
            company: company,
            location: location,
            jobType: jobType,
            max_budget: budget,
            isActive: true,
            isResolved: false,
            createdAt: block.timestamp,
            applicationCount: 0
        });

        emit JobPosted(jobId, msg.sender, title, company);
    }

    /**
     * @notice CANDIDATE: Apply to a job with an encrypted minimum salary expectation.
     * @param jobId                Job identifier
     * @param candidateName        Full name shown to employer on match
     * @param resumeIpfsCid        IPFS CID of the candidate's resume — revealed only on match
     * @param encryptedExpectation Handle produced by relayer-sdk in the browser
     * @param inputProof           ZKP proof accompanying the ciphertext
     * @return applicationId       The created application's ID
     */
    function applyToJob(
        uint256 jobId,
        string calldata candidateName,
        string calldata resumeIpfsCid,
        bytes32 encryptedExpectation,
        bytes calldata inputProof
    ) external jobExists(jobId) jobIsActive(jobId) returns (uint256 applicationId) {
        require(
            candidateApplicationId[msg.sender][jobId] == 0 &&
            !(jobApplicationIds[jobId].length > 0 &&
              applications[jobId][0].candidate == msg.sender),
            "BlindHire: Already applied"
        );

        applicationId = jobPostings[jobId].applicationCount++;

        // Verify the encrypted input and convert to euint64
        euint64 expectation = euint64.wrap(Impl.verify(encryptedExpectation, inputProof, FheType.Uint64));
        FHE.allowThis(expectation);

        // Initialize with a default ebool (false) — will be set in resolveApplication
        ebool defaultMatch = FHE.asEbool(false);
        FHE.allowThis(defaultMatch);

        applications[jobId][applicationId] = Application({
            candidate: msg.sender,
            candidateName: candidateName,
            resumeIpfsCid: resumeIpfsCid,
            min_expectation: expectation,
            isMatched: defaultMatch,
            matchRevealed: false,
            matchResult: false,
            resumeUnlocked: false,
            appliedAt: block.timestamp
        });

        jobApplicationIds[jobId].push(applicationId);
        candidateJobIds[msg.sender].push(jobId);
        candidateApplicationId[msg.sender][jobId] = applicationId;

        emit ApplicationSubmitted(jobId, applicationId, msg.sender);
    }

    /**
     * @notice RESOLVER (anyone can call): Triggers FHE evaluation for one application.
     *         Uses FHE.le() to compare encrypted values and stores encrypted ebool result.
     * @dev    The matching result stays encrypted. Call revealMatchResult() to decrypt.
     * @param jobId         Job identifier
     * @param applicationId Application identifier
     */
    function resolveApplication(
        uint256 jobId,
        uint256 applicationId
    ) external jobExists(jobId) appExists(jobId, applicationId) {
        Application storage app = applications[jobId][applicationId];
        JobPosting storage posting = jobPostings[jobId];

        require(!app.matchRevealed, "BlindHire: Already resolved and revealed");

        // THE CORE FHE COMPUTATION:
        // Is the candidate's minimum expectation <= the employer's maximum budget?
        // Both values remain encrypted throughout. No salary data is ever exposed.
        ebool matched = FHE.le(app.min_expectation, posting.max_budget);

        // Store the encrypted result and grant access to this contract
        app.isMatched = matched;
        FHE.allowThis(matched);

        // Also allow the employer to later request decryption
        FHE.allow(matched, posting.employer);

        // Mark as publicly decryptable so anyone can verify the result via checkSignatures
        FHE.makePubliclyDecryptable(matched);

        emit ApplicationResolved(jobId, applicationId);
    }

    /**
     * @notice EMPLOYER ONLY: Reveal the match result by providing KMS decryption proof.
     *         Uses FHE.checkSignatures() to verify the KMS proof and set the plaintext result.
     * @param jobId            Job identifier
     * @param applicationId    Application identifier
     * @param decryptedResult  The ABI-encoded decrypted boolean value
     * @param decryptionProof  The KMS public decryption proof
     */
    function revealMatchResult(
        uint256 jobId,
        uint256 applicationId,
        bytes memory decryptedResult,
        bytes memory decryptionProof
    ) external jobExists(jobId) appExists(jobId, applicationId) onlyEmployer(jobId) {
        Application storage app = applications[jobId][applicationId];
        require(!app.matchRevealed, "BlindHire: Match already revealed");

        // Build the handles list for verification
        bytes32[] memory handlesList = new bytes32[](1);
        handlesList[0] = FHE.toBytes32(app.isMatched);

        // Verify the KMS decryption proof on-chain
        FHE.checkSignatures(handlesList, decryptedResult, decryptionProof);

        // Decode the decrypted boolean
        bool matchResult = abi.decode(decryptedResult, (bool));

        app.matchRevealed = true;
        app.matchResult = matchResult;

        emit MatchRevealed(jobId, applicationId, matchResult);
    }

    /**
     * @notice EMPLOYER ONLY: Unlock the candidate's resume on a successful match.
     * @param jobId         Job identifier
     * @param applicationId Application identifier
     */
    function unlockResume(
        uint256 jobId,
        uint256 applicationId
    ) external jobExists(jobId) appExists(jobId, applicationId) onlyEmployer(jobId) {
        Application storage app = applications[jobId][applicationId];
        require(app.matchRevealed && app.matchResult, "BlindHire: No confirmed match");
        app.resumeUnlocked = true;
        emit ResumeUnlocked(jobId, applicationId, msg.sender);
    }

    /**
     * @notice EMPLOYER ONLY: Close a job posting to stop new applications.
     */
    function closeJob(uint256 jobId) external jobExists(jobId) onlyEmployer(jobId) {
        jobPostings[jobId].isActive = false;
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
        uint256[] memory createdAts,
        uint256[] memory applicationCounts
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
        createdAts = new uint256[](activeCount);
        applicationCounts = new uint256[](activeCount);

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
                createdAts[idx] = j.createdAt;
                applicationCounts[idx] = j.applicationCount;
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
        resumeUnlockeds = new bool[](count);
        appliedAts = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            Application storage app = applications[jobId][i];
            appIds[i] = i;
            candidates[i] = app.candidate;
            names[i] = app.candidateName;
            matchRevealeds[i] = app.matchRevealed;
            matchResults[i] = app.matchResult;
            resumeUnlockeds[i] = app.resumeUnlocked;
            appliedAts[i] = app.appliedAt;
            // Note: resumeIpfsCid is only returned if resume is unlocked
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
        require(app.resumeUnlocked, "BlindHire: Resume not yet unlocked");
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
}
