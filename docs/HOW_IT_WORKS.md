# How BlindHire Works — A Plain English Explanation for Everyone

This document is written for non-technical judges, investors, and anyone who wants to understand what BlindHire does **without needing to know anything about blockchain or cryptography**.

---

## The Universal Problem

Imagine you're applying for a job. The company posted the role with "competitive salary," which means nothing. They want to pay $130,000 — but they're hoping you'll say $110,000. You're willing to accept $120,000 — but you're hoping they'll say $150,000.

Neither of you is lying. But neither of you is telling the full truth. And the result? Hours of negotiation, bruised feelings, and sometimes deals that fall apart because both sides played the anchoring game and neither budged.

This happens **a billion times a year**. In every country. At every salary level.

## The BlindHire Solution

BlindHire is like hiring a completely neutral robot referee that knows only one rule:

> **"Is the candidate's minimum lower than the employer's maximum?"**

That's the only question it answers. And here's what makes it special: **the robot never opens the envelopes**. It checks mathematically — without ever seeing the actual numbers — whether a match is possible.

### The Sealed Envelope Analogy

Picture it like this:

- The employer writes their max budget on a piece of paper, seals it in a **locked envelope**, and hands it to the robot.
- The candidate writes their minimum expectation, seals it in a **different locked envelope**, and also hands it to the robot.
- The robot **checks** whether one number is larger than the other — using a special mathematical trick — and announces: **"Match"** or **"No match."**
- The robot **never opens either envelope**. Nobody ever sees either number.

If it's a match: the candidate and employer can start talking. The employer might reach out at $140,000, the candidate might ask for $135,000. The actual negotiation still happens — but now they know it's worth starting.

If it's not a match: both parties move on. No awkwardness. No wasted interviews. And most importantly — the candidate's minimum is **never revealed**, even in a failed match.

## What Makes This Different from a Recruiter?

You might say: "Can't a recruiter do this?"

A recruiter **could** do this. But:
- You have to trust them not to share your information
- They might tell the company "the candidate will accept less" to close the deal faster (and earn their commission)
- They're a human who can be pressured, bribed, or simply make mistakes

BlindHire is a **smart contract** on the Ethereum blockchain. It's code. It has no feelings, no incentives, no boss. It cannot lie. It cannot share your information. It automatically follows its rules — and those rules are publicly auditable by anyone.

## The Technology Behind It (Simply Explained)

The mathematical trick the robot uses is called **Fully Homomorphic Encryption (FHE)**, developed by a company called **Zama**.

Here's the simple version:

Normal encryption is like a locked box. To do anything with what's inside, you have to open the box first, do your work, then lock it back up. This means someone has to briefly see the contents.

**Homomorphic Encryption is a magic box that lets you work on it while it's still locked.** You can run calculations on a locked box and get a real answer — without ever opening it.

This is what BlindHire does:
1. Your salary number gets "locked" in your browser before it's sent anywhere
2. The locked number goes to the blockchain
3. The blockchain runs a special comparison: "Is number A smaller than number B?" — on the locked versions of both numbers
4. The answer comes back: Yes (match) or No (no match)
5. Your actual numbers are **never unlocked by anyone** during this process

## What Happens on a Match?

When a match is detected:
1. The employer clicks "Reveal Match Result" — only they can do this
2. The Zama Gateway (a trusted decryption oracle) confirms: "Yes, it's a match"
3. The employer can then click "Unlock Resume" — and the candidate's CV appears
4. Full negotiation can begin

**Critically:** Even on a match, the candidate's exact minimum is never revealed. The employer just knows "this person is affordable." They still don't know if the candidate would have accepted $5,000 less.

## What Happens on No Match?

Nothing. Both parties move on. The candidate's minimum is never revealed. The employer's maximum is never revealed. There's no way to even guess what the numbers were.

## Why Does This Matter?

Salary negotiation is broken worldwide because it rewards people who lie well. BlindHire creates a system where:

- **Honesty is optimal** — there's no benefit to inflating or deflating your number
- **Privacy is absolute** — your financial floor is your most personal professional information; it should stay private
- **The outcome is fair** — the result is mathematically verifiable and tamper-proof

BlindHire isn't just a hackathon project. It's a protocol that any company, DAO, or hiring platform can integrate — and it can work for freelance rate negotiation, rental price matching, auction systems, or any situation where two private numbers need to be compared without revealing either one.

---

## In One Sentence

**BlindHire is a smart contract that tells you whether two numbers are compatible — without ever telling you what either number is.**

That's it. That's the whole idea.

---

*Built for the Zama Builder Track Hackathon · Deployed on Ethereum Sepolia Testnet*
