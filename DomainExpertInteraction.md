# Summary of the interaction

## Basic information
* **Domain:** Gig Economy, Freelance Marketplace, Creator Economy
* **Problem statement:** Developing a web platform connecting clients and creators with a unique supervisor layer for quality assurance and a milestone-based point payment system.
* **Date of interaction:** 30 JANUARY 2026
* **Mode of interaction:** ZOOM
* **Duration (in-minutes):** 46 minnutes
* **Publicly accessible Video link:** [expert_interaction.mp4](https://www.canva.com/design/DAHAE_z2wKc/B0WvmZAnUzyp3MmqsPntvA/watch?utm_content=DAHAE_z2wKc&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h0fecc90a79)

## Domain Expert Details
* **Experience in the domain:** Senior product designer, 5 years as senior product designer, And 6 months as freelancer.
* **Nature of work:** Operational/Managerial

## Domain Context and Terminology

- **How would you describe the overall purpose of this problem statement in your daily work?**
  - "The expert highlighted that for small businesses, the gig economy is a critical tool for maintaining operational agility and budget control. Unlike traditional HR hiring, which involves long-term commitments and annual contracts, utilizing freelancers allows the company to execute short-term projects without inflating wage costs. However, the hiring process remains manual and challenging due to the high volume of applicants. After posting a project brief and deadline, the expert struggles to filter through candidates efficiently, as validation is decentralized; they must leave the platform to manually verify portfolios on external sites like Behance before shortlisting candidates."

- **What are the primary goals or outcomes of this problem statement?**
  1. Standardize workflow through atomic Milestones.
  2. Reduce dispute resolution time using domain-specific Supervisors.
  3. Gamify the work process to increase worker engagement and reliability.

- **List key terms used by the domain expert and their meanings (Copy these to definition.yml)**

| Term | Meaning as explained by the expert |
|---|---|
| **Milestone** | A specific, smaller unit of a larger task (e.g., "Design Login Page" vs. "Build Website"). Payments are released only upon completion of these units. |
| **Expert Reviewer** | A specialized troubleshooter (e.g., UI Expert, Video Lead) who intervenes only when technical validation is needed or a dispute arises. |
| **Wallet/Points** | The internal currency system. Workers earn points per milestone which are accumulated in a digital wallet and later converted to real currency. |
| **Rating Threshold** | A system constraint where workers must have a certain score/rating to be eligible to "pick" high-value tasks. |
| **Scope Creep** | A situation where the Client asks for work outside the defined milestone description; a common trigger for Supervisor intervention. |

## Actors and Responsibilities

- **Identify the different roles involved and what they do in practice.**

| Actor / Role | Responsibilities |
|---|---|
| **Client** | Posts project requirements, defines budget/points, breaks projects into milestones, and approves delivered work to release payments. |
| **Gig Worker (Creator)** | Browses tasks, accepts jobs based on eligibility, submits proofs of work for milestones, and manages their earnings wallet. |
| **Expert Reviewer** | Assigned based on domain expertise (Video, UI, Dev). Reviews escalated milestones, resolves disputes, and ensures quality standards are met. |
| **Admin** | Manages the ecosystem health, verifies Supervisor credentials, handles financial withdrawals/deposits, and bans bad actors. |

## Core workflows

**Description of at least 2-3 real workflows as explained by the domain expert**

- **Workflow 1: Task Assignment & Picking**
  - **Trigger/start condition:** Client posts a new requirement (e.g., "Edit a 10-minute vlog").
  - **Steps involved (in order):**
    1. Client defines the domain (Video Editing), budget (Points), and Milestones.
    2. System filters tasks based on the Worker's current rating/points level.
    3. Worker views the "Available Tasks" dashboard.
    4. Worker clicks "Pick Task."
  - **Outcome / End condition:** Task is locked to that Worker; Client is notified.

- **Workflow 2: The Milestone Loop (Standard Flow)**
  - **Trigger/start condition:** Worker completes a specific part of the job.
  - **Steps involved (in order):**
    1. Worker uploads files/link as proof of completion for "Milestone 1".
    2. Client receives a notification to review.
    3. Client checks the work and clicks "Approve."
    4. System automatically transfers Points from Client hold to Worker Wallet.
  - **Outcome / End condition:** Milestone marked "Complete," Worker balance increases.

- **Workflow 3: Troubleshooting/Dispute Resolution**
  - **Trigger/start condition:** Client rejects a milestone OR Worker flags "Unreasonable Request."
  - **Steps involved (in order):**
    1. User clicks "Request Supervisor."
    2. System alerts a Supervisor matching the task Domain (e.g., a UI Supervisor).
    3. Supervisor reviews the milestone requirements vs. the submitted work.
    4. Supervisor enters a verdict (e.g., "Worker needs to fix padding" or "Client must release payment").
  - **Outcome / End condition:** Dispute resolved; points are either released or the worker is forced to revise.

## Rules, Constraints, and Exceptions

**Document rules that govern how the domain operates.**
- **Mandatory rules or policies:**
  - Clients cannot cancel a task once a milestone has been started without a Supervisor's approval.
  - Workers cannot withdraw points until they reach a minimum threshold in their wallet.
- **Constraints or limitations:**
  - A Worker cannot pick a new task if they have too many "Pending" or "Overdue" milestones (Concurrency limit).
  - Supervisors can only troubleshoot tasks within their tagged domain expertise.
- **Common exceptions or edge cases:**
  - **Worker Abandonment:** If a worker picks a task but goes silent for 48 hours, auto troubleshoot can be called by the client.
  - **Client Ghosting:** If a client doesn't review a submission within X days, the system may auto-approve it to protect the worker.
- **Situations where things usually go wrong:**
  - Vague milestone descriptions (e.g., "Make it pop") leading to subjective arguments.

## Current challenges and pain points
- **What parts of this process are most difficult or inefficient?**
  - Waiting for clients to approve work manually is the biggest bottleneck for workers' cash flow.
  - Finding qualified Supervisors who are actually available to resolve disputes in real-time.
- **Where do delays, errors, or misunderstandings usually occur?**
  - The "Handoff" phase: When a worker thinks they are done, but the client thinks the work is incomplete.
- **What information is hardest to track or manage today?**
  - The granular history of *why* a rating was low (Was it bad code? Or just bad communication?). The Supervisor's notes solve this.

## Assumptions & Clarifications
- **What assumptions made by the team that were confirmed**
  - Confirmed that the "Wallet" needs to support a conversion rate (Points -> Currency) and isn't just "fake internet points."
  - Confirmed that Supervisors are a distinct user role, not just a permission flag on a normal user.
- **What assumptions that were corrected**
  - Initially thought Supervisors would approve *every* task. Corrected: They only intervene on *disputes* or *random QC checks* to prevent bottlenecks.
- **Open questions that need follow-up**
  - Does the Supervisor get paid? If so, do they get a cut of the transaction points? (Logic needs to be defined).

## New Features Proposed by Expert

During the discussion, the Domain Expert strongly recommended two specific innovations to address the core problems of trust and quality:

### 1. Milestone-Based Point & Wallet System
Instead of a traditional flat-fee project payment, the expert proposed a granular **Point System**:
* **Mechanism:** Projects are broken into milestones, each worth a specific number of points.
* **Validation:** Points are held in escrow by the system when a task starts and are only released to the worker's "Wallet" upon milestone approval.
* **Gamification:** These points serve a dual purpose: they are redeemable for currency (Earnings) and they contribute to the worker's "Skill Score," unlocking higher-tier jobs.

### 2. The Expert Reviewer "Troubleshooting" Layer
To solve the issue of non-technical clients judging technical work, the expert proposed the **Supervisor Role**:
* **On-Demand Arbitration:** Supervisors do not micromanage every task. They are triggered only when a "Troubleshoot" request is raised by a Client (unhappy with quality) or a Worker (unhappy with requirements).
* **Domain Expertise:** The system must route disputes to specific experts (e.g., a React dispute goes to a Coding Supervisor, not a Video Editor).
* **Verdict Power:** The Supervisor has the admin-level authority to override a Client's rejection or a Worker's submission to force a resolution.
### 3. Unified Platform Integration
To bridge the gap between a creator's resume and their actual market performance, the expert suggested **API-Level Integration**:
* **Mechanism:** Workers connect their external profiles (GitHub, Dribbble, YouTube, Instagram) directly to the platform via OAuth or API keys.
* **Validation:** The system automatically fetches real-time metrics (e.g., commit history, subscriber count, engagement rates) to verify the authenticity of the portfolio, preventing "fake" work submissions.
* **Gamification:** External achievements (like a "Viral Video" or "Top Contributor" badge) translate into internal "Trust Points," instantly boosting a new worker's ranking without starting from zero.
