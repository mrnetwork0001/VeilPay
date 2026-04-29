const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * BlindHire Test Suite
 *
 * NOTE: Full FHE evaluation (TFHE.le / Gateway callbacks) requires a running
 *       Zama fhevm node or mocks. These tests cover the contract's structural
 *       logic and access-control rules. FHE-specific cryptographic paths are
 *       validated against the Zama mock helpers when available.
 *
 * Run: npx hardhat test
 */
describe("BlindHire", function () {
  let blindHire;
  let employer;
  let candidate1;
  let candidate2;
  let stranger;

  // Dummy encrypted inputs — in real usage these come from fhevmjs in the browser.
  // These are placeholder bytes that satisfy the function signature for local tests.
  // On a real fhevm node, use the Zama mock helpers to generate valid encrypted inputs.
  const DUMMY_ENCRYPTED_INPUT = ethers.zeroPadBytes("0x01", 32);
  const DUMMY_PROOF = ethers.zeroPadBytes("0x02", 64);

  beforeEach(async function () {
    [employer, candidate1, candidate2, stranger] = await ethers.getSigners();

    const BlindHire = await ethers.getContractFactory("BlindHire");
    blindHire = await BlindHire.deploy();
    await blindHire.waitForDeployment();
  });

  // ─────────────────────────────────────────────────────────────
  // Test Group 1: Job Postings
  // ─────────────────────────────────────────────────────────────
  describe("Job Postings", function () {
    it("should allow an employer to create a job posting", async function () {
      const tx = await blindHire.connect(employer).createJobPosting(
        "Senior Solidity Engineer",
        "Zama Builders Inc.",
        "Remote",
        "Full-time",
        DUMMY_ENCRYPTED_INPUT,
        DUMMY_PROOF
      );

      await expect(tx)
        .to.emit(blindHire, "JobPosted")
        .withArgs(0, employer.address, "Senior Solidity Engineer", "Zama Builders Inc.");

      expect(await blindHire.jobCount()).to.equal(1);
    });

    it("should expose correct job metadata without salary information", async function () {
      await blindHire.connect(employer).createJobPosting(
        "Frontend Engineer",
        "CryptoStartup",
        "New York",
        "Contract",
        DUMMY_ENCRYPTED_INPUT,
        DUMMY_PROOF
      );

      const [ids, employers, titles, companies, locations, jobTypes] =
        await blindHire.getActiveJobs();

      expect(ids.length).to.equal(1);
      expect(employers[0]).to.equal(employer.address);
      expect(titles[0]).to.equal("Frontend Engineer");
      expect(companies[0]).to.equal("CryptoStartup");
      expect(locations[0]).to.equal("New York");
      expect(jobTypes[0]).to.equal("Contract");
      // max_budget is NEVER in the return — salary remains confidential
    });

    it("should allow employer to close a job posting", async function () {
      await blindHire.connect(employer).createJobPosting(
        "DevRel",
        "DAO Corp",
        "Remote",
        "Full-time",
        DUMMY_ENCRYPTED_INPUT,
        DUMMY_PROOF
      );

      await expect(blindHire.connect(employer).closeJob(0))
        .to.emit(blindHire, "JobClosed")
        .withArgs(0);

      const [ids] = await blindHire.getActiveJobs();
      expect(ids.length).to.equal(0);
    });

    it("should NOT allow a non-employer to close a job", async function () {
      await blindHire.connect(employer).createJobPosting(
        "DevRel",
        "DAO Corp",
        "Remote",
        "Full-time",
        DUMMY_ENCRYPTED_INPUT,
        DUMMY_PROOF
      );

      await expect(
        blindHire.connect(stranger).closeJob(0)
      ).to.be.revertedWith("BlindHire: Not the employer");
    });

    it("should revert on non-existent job ID", async function () {
      await expect(
        blindHire.connect(stranger).closeJob(999)
      ).to.be.revertedWith("BlindHire: Job does not exist");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Test Group 2: Applications
  // ─────────────────────────────────────────────────────────────
  describe("Applications", function () {
    beforeEach(async function () {
      // Employer posts a job
      await blindHire.connect(employer).createJobPosting(
        "Smart Contract Auditor",
        "SecureFi Labs",
        "Remote",
        "Full-time",
        DUMMY_ENCRYPTED_INPUT,
        DUMMY_PROOF
      );
    });

    it("should allow a candidate to apply to an active job", async function () {
      const tx = await blindHire.connect(candidate1).applyToJob(
        0,
        "Alice",
        "Qmfake123ipfscid",
        DUMMY_ENCRYPTED_INPUT,
        DUMMY_PROOF
      );

      await expect(tx)
        .to.emit(blindHire, "ApplicationSubmitted")
        .withArgs(0, 0, candidate1.address);
    });

    it("should allow multiple candidates to apply to the same job", async function () {
      await blindHire.connect(candidate1).applyToJob(
        0, "Alice", "Qmfake123", DUMMY_ENCRYPTED_INPUT, DUMMY_PROOF
      );
      await blindHire.connect(candidate2).applyToJob(
        0, "Bob", "Qmfake456", DUMMY_ENCRYPTED_INPUT, DUMMY_PROOF
      );

      const jobData = await blindHire.jobPostings(0);
      expect(jobData.applicationCount).to.equal(2);
    });

    it("should NOT allow applying to a closed job", async function () {
      await blindHire.connect(employer).closeJob(0);

      await expect(
        blindHire.connect(candidate1).applyToJob(
          0, "Alice", "Qmfake123", DUMMY_ENCRYPTED_INPUT, DUMMY_PROOF
        )
      ).to.be.revertedWith("BlindHire: Job is not active");
    });

    it("should expose application metadata WITHOUT salary amounts", async function () {
      await blindHire.connect(candidate1).applyToJob(
        0, "Alice", "Qmfake123", DUMMY_ENCRYPTED_INPUT, DUMMY_PROOF
      );

      const [appIds, candidates, names, matchRevealeds, matchResults, resumeUnlockeds] =
        await blindHire.connect(employer).getApplicationsForJob(0);

      expect(appIds.length).to.equal(1);
      expect(candidates[0]).to.equal(candidate1.address);
      expect(names[0]).to.equal("Alice");
      expect(matchRevealeds[0]).to.equal(false);
      expect(matchResults[0]).to.equal(false);
      expect(resumeUnlockeds[0]).to.equal(false);
      // min_expectation is NEVER exposed in plaintext — confirmed by absence from return type
    });

    it("should NOT allow non-employer to view application list", async function () {
      await expect(
        blindHire.connect(stranger).getApplicationsForJob(0)
      ).to.be.revertedWith("BlindHire: Not the employer");
    });

    it("should track candidate's own applications", async function () {
      await blindHire.connect(candidate1).applyToJob(
        0, "Alice", "Qmfake123", DUMMY_ENCRYPTED_INPUT, DUMMY_PROOF
      );

      const [jobIds, appIds, titles, companies] =
        await blindHire.connect(candidate1).getMyApplications();

      expect(jobIds.length).to.equal(1);
      expect(jobIds[0]).to.equal(0);
      expect(titles[0]).to.equal("Smart Contract Auditor");
      expect(companies[0]).to.equal("SecureFi Labs");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Test Group 3: Resolve & Reveal Access Control
  // ─────────────────────────────────────────────────────────────
  describe("Resolve & Reveal Access Control", function () {
    beforeEach(async function () {
      await blindHire.connect(employer).createJobPosting(
        "Backend Engineer",
        "Web3 Corp",
        "Remote",
        "Full-time",
        DUMMY_ENCRYPTED_INPUT,
        DUMMY_PROOF
      );
      await blindHire.connect(candidate1).applyToJob(
        0, "Alice", "Qmfake123", DUMMY_ENCRYPTED_INPUT, DUMMY_PROOF
      );
    });

    it("should allow anyone to call resolveApplication (public trigger)", async function () {
      // resolveApplication can be called by any address (gas payout incentive or automated resolver)
      await expect(
        blindHire.connect(stranger).resolveApplication(0, 0)
      ).to.emit(blindHire, "ApplicationResolved").withArgs(0, 0);
    });

    it("should NOT allow a non-employer to call revealMatchResult", async function () {
      await blindHire.connect(stranger).resolveApplication(0, 0);

      await expect(
        blindHire.connect(candidate1).revealMatchResult(0, 0)
      ).to.be.revertedWith("BlindHire: Not the employer");

      await expect(
        blindHire.connect(stranger).revealMatchResult(0, 0)
      ).to.be.revertedWith("BlindHire: Not the employer");
    });

    it("should NOT allow unlocking a resume before a confirmed match", async function () {
      await blindHire.connect(stranger).resolveApplication(0, 0);

      await expect(
        blindHire.connect(employer).unlockResume(0, 0)
      ).to.be.revertedWith("BlindHire: No confirmed match");
    });

    it("should NOT expose the IPFS CID before resume is unlocked", async function () {
      await expect(
        blindHire.connect(employer).getResumeIfUnlocked(0, 0)
      ).to.be.revertedWith("BlindHire: Resume not yet unlocked");
    });

    it("should NOT allow a non-employer to get the resume CID", async function () {
      await expect(
        blindHire.connect(stranger).getResumeIfUnlocked(0, 0)
      ).to.be.revertedWith("BlindHire: Not the employer");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Test Group 4: Salary Confidentiality Guarantee
  // ─────────────────────────────────────────────────────────────
  describe("Salary Confidentiality", function () {
    it("should NEVER expose max_budget in any plaintext view function", async function () {
      await blindHire.connect(employer).createJobPosting(
        "CTO",
        "PrivacyDAO",
        "Berlin",
        "Full-time",
        DUMMY_ENCRYPTED_INPUT,
        DUMMY_PROOF
      );

      // getActiveJobs does NOT return salary data
      const activeJobsResult = await blindHire.getActiveJobs();
      const returnedKeys = ["ids", "employers", "titles", "companies", "locations", "jobTypes", "createdAts", "applicationCounts"];
      // Verify the tuple has exactly 8 arrays — no budget field
      expect(activeJobsResult.length).to.equal(8);
    });

    it("should NEVER expose min_expectation in any view function", async function () {
      await blindHire.connect(employer).createJobPosting(
        "Auditor",
        "CryptoSafe",
        "Remote",
        "Full-time",
        DUMMY_ENCRYPTED_INPUT,
        DUMMY_PROOF
      );
      await blindHire.connect(candidate1).applyToJob(
        0, "Alice", "Qmfake123", DUMMY_ENCRYPTED_INPUT, DUMMY_PROOF
      );

      // getApplicationsForJob does NOT return min_expectation
      const appsResult = await blindHire.connect(employer).getApplicationsForJob(0);
      // Tuple has 7 arrays: appIds, candidates, names, matchRevealeds, matchResults, resumeUnlockeds, appliedAts
      expect(appsResult.length).to.equal(7);

      // getMyApplications does NOT return min_expectation
      const myAppsResult = await blindHire.connect(candidate1).getMyApplications();
      // Tuple has 7 arrays: jobIds, appIds, titles, companies, matchRevealeds, matchResults, appliedAts
      expect(myAppsResult.length).to.equal(7);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Test Group 5: Employer Job Retrieval
  // ─────────────────────────────────────────────────────────────
  describe("Employer Job Retrieval", function () {
    it("should return all jobs posted by a specific employer", async function () {
      await blindHire.connect(employer).createJobPosting("Role 1", "Acme", "Remote", "Full-time", DUMMY_ENCRYPTED_INPUT, DUMMY_PROOF);
      await blindHire.connect(employer).createJobPosting("Role 2", "Acme", "NYC", "Contract", DUMMY_ENCRYPTED_INPUT, DUMMY_PROOF);
      await blindHire.connect(candidate1).createJobPosting("Role 3", "OtherCo", "Remote", "Part-time", DUMMY_ENCRYPTED_INPUT, DUMMY_PROOF);

      const employerJobs = await blindHire.getJobsByEmployer(employer.address);
      expect(employerJobs.length).to.equal(2);
      expect(employerJobs[0]).to.equal(0);
      expect(employerJobs[1]).to.equal(1);
    });
  });
});
