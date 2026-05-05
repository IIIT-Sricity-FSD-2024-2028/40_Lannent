CREATE DATABASE IF NOT EXISTS lannent;
USE lannent;

-- ============================================================================
-- LANNENT DATABASE SCHEMA
-- Derived from Chen ER Diagram — 13 tables
-- Updated: 2026-05-05
-- ============================================================================
-- KEY DESIGN DECISIONS:
--   • TRANSACTIONS_WALLET: handles personal wallet deposit/withdraw only
--       – Clients can deposit AND withdraw
--       – Workers can only withdraw
--   • TRANSACTIONS: handles platform/project-level financial flows
--       – Types: escrow-lock, milestone-release, refund, dispute-release
--   • USERS → CLIENTS / WORKERS / EXPERTS: EER Total Specialization
--   • All dates use DATE or DATETIME (not VARCHAR)
--   • All monetary values use DECIMAL(10,2) (not VARCHAR)
--   • Denormalized snapshot columns (report titles/names) are auto-populated
--     by triggers — application does not need to supply them
--   • AUDIT_REQUESTS.project/worker/milestone removed — derivable via JOIN
--   • DISPUTES.project/milestone removed — derivable via JOIN
-- ============================================================================


-- ──────────────────────────────────────────────────────────────────────────────
-- 1. USERS (Base — shared attributes for ALL roles)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE USERS (
  userId        VARCHAR(50)   PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  password      VARCHAR(255)  NOT NULL,
  role          ENUM('client','worker','expert','superuser') NOT NULL,
  avatar        VARCHAR(10),
  avatarColor   VARCHAR(200),
  status        VARCHAR(20)   DEFAULT 'active',
  joinDate      DATE,
  walletBalance DECIMAL(10,2) DEFAULT 0.00
);


-- ──────────────────────────────────────────────────────────────────────────────
-- 1a. CLIENTS (EER Specialization — 1:1 with USERS where role='client')
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE CLIENTS (
  clientId  VARCHAR(50)  PRIMARY KEY,
  company   VARCHAR(200),
  location  VARCHAR(200),
  FOREIGN KEY (clientId) REFERENCES USERS(userId) ON DELETE CASCADE
);


-- ──────────────────────────────────────────────────────────────────────────────
-- 1b. WORKERS (EER Specialization — 1:1 with USERS where role='worker')
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE WORKERS (
  workerId          VARCHAR(50)  PRIMARY KEY,
  location          VARCHAR(200),
  skills            JSON,
  rating            DECIMAL(3,1) DEFAULT 0.0,
  completedProjects INT          DEFAULT 0,
  FOREIGN KEY (workerId) REFERENCES USERS(userId) ON DELETE CASCADE
);


-- ──────────────────────────────────────────────────────────────────────────────
-- 1c. EXPERTS (EER Specialization — 1:1 with USERS where role='expert')
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE EXPERTS (
  expertId       VARCHAR(50)  PRIMARY KEY,
  specialization VARCHAR(200),
  reviewsDone    INT DEFAULT 0,
  FOREIGN KEY (expertId) REFERENCES USERS(userId) ON DELETE CASCADE
);


-- ──────────────────────────────────────────────────────────────────────────────
-- 2. TASKS (Projects — created by Clients, assigned to Workers)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE TASKS (
  taskId       VARCHAR(50)   PRIMARY KEY,
  title        VARCHAR(200)  NOT NULL,
  description  TEXT          NOT NULL,
  category     VARCHAR(100)  NOT NULL,
  budget       DECIMAL(10,2) NOT NULL CHECK (budget >= 1),
  currency     VARCHAR(10)   DEFAULT 'USD',
  deadline     DATE,
  skills       JSON,
  clientId     VARCHAR(50)   NOT NULL,
  workerId     VARCHAR(50),
  status       ENUM('open','in-progress','completed','cancelled') DEFAULT 'open',
  auditEnabled BOOLEAN       DEFAULT FALSE,
  progress     INT           DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  createdAt    DATETIME      NOT NULL DEFAULT NOW(),
  FOREIGN KEY (clientId) REFERENCES CLIENTS(clientId),
  FOREIGN KEY (workerId) REFERENCES WORKERS(workerId)
);
CREATE INDEX idx_tasks_clientId ON TASKS(clientId);
CREATE INDEX idx_tasks_workerId ON TASKS(workerId);


-- ──────────────────────────────────────────────────────────────────────────────
-- 3. MILESTONES (Checkpoints within a Task)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE MILESTONES (
  milestoneId VARCHAR(50)   PRIMARY KEY,
  taskId      VARCHAR(50)   NOT NULL,
  title       VARCHAR(200)  NOT NULL,
  description TEXT,
  budget      DECIMAL(10,2) NOT NULL CHECK (budget >= 1),
  status      ENUM('pending','in-progress','submitted','completed') DEFAULT 'pending',
  dueDate     DATE,
  priority    ENUM('High','Medium','Low') DEFAULT 'Medium',
  progress    INT           DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  submittedAt DATETIME,
  approvedAt  DATETIME,
  deliverable JSON,
  FOREIGN KEY (taskId) REFERENCES TASKS(taskId)
);
CREATE INDEX idx_milestones_taskId ON MILESTONES(taskId);


-- ──────────────────────────────────────────────────────────────────────────────
-- 4. PROPOSALS (Bids from Workers on Tasks)
-- Worker profile columns are intentional snapshots captured at bid time
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE PROPOSALS (
  proposalId        VARCHAR(50)   PRIMARY KEY,
  taskId            VARCHAR(50)   NOT NULL,
  workerId          VARCHAR(50)   NOT NULL,
  workerName        VARCHAR(100),
  avatar            VARCHAR(10),
  avatarColor       VARCHAR(200),
  rating            DECIMAL(3,1),
  reviewCount       INT,
  location          VARCHAR(200),
  bidPrice          DECIMAL(10,2),
  timeline          VARCHAR(50),
  coverLetter       TEXT,
  skills            JSON,
  completedProjects INT,
  successRate       INT,
  hourlyRate        DECIMAL(10,2),
  responseTime      VARCHAR(50),
  status            ENUM('pending','hired','rejected') DEFAULT 'pending',
  type              ENUM('proposal','invitation')      DEFAULT 'proposal',
  createdAt         DATETIME      NOT NULL DEFAULT NOW(),
  FOREIGN KEY (taskId)   REFERENCES TASKS(taskId),
  FOREIGN KEY (workerId) REFERENCES WORKERS(workerId)
);
CREATE INDEX idx_proposals_taskId   ON PROPOSALS(taskId);
CREATE INDEX idx_proposals_workerId ON PROPOSALS(workerId);


-- ──────────────────────────────────────────────────────────────────────────────
-- 5. AUDIT_REQUESTS
--    project/worker/milestone columns removed — use JOIN to derive them
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE AUDIT_REQUESTS (
  auditRequestId VARCHAR(50)  PRIMARY KEY,
  milestoneId    VARCHAR(50)  NOT NULL,
  expertId       VARCHAR(50),
  status         VARCHAR(20)  DEFAULT 'Pending'
                              CHECK (status IN ('Pending','In-Progress','Completed')),
  severity       ENUM('High','Medium','Low'),
  createdAt      DATETIME     NOT NULL DEFAULT NOW(),
  dueDate        DATE,
  FOREIGN KEY (milestoneId) REFERENCES MILESTONES(milestoneId),
  FOREIGN KEY (expertId)    REFERENCES EXPERTS(expertId)
);
CREATE INDEX idx_audit_requests_milestoneId ON AUDIT_REQUESTS(milestoneId);
CREATE INDEX idx_audit_requests_expertId    ON AUDIT_REQUESTS(expertId);


-- ──────────────────────────────────────────────────────────────────────────────
-- 6. AUDIT_REPORTS (1:1 with AUDIT_REQUESTS)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE AUDIT_REPORTS (
  auditreportsId VARCHAR(50)  PRIMARY KEY,
  auditRequestId VARCHAR(50)  NOT NULL UNIQUE,
  verdict        ENUM('pass','fail','conditional'),
  overall        VARCHAR(20),
  findings       TEXT,
  codequality    INT CHECK (codequality   BETWEEN 0 AND 5),
  security       INT CHECK (security      BETWEEN 0 AND 5),
  performance    INT CHECK (performance   BETWEEN 0 AND 5),
  documentation  INT CHECK (documentation BETWEEN 0 AND 5),
  createdAt      DATETIME     NOT NULL DEFAULT NOW(),
  milestoneTitle VARCHAR(200),
  projectTitle   VARCHAR(200),
  workerName     VARCHAR(100),
  FOREIGN KEY (auditRequestId) REFERENCES AUDIT_REQUESTS(auditRequestId)
);


-- ──────────────────────────────────────────────────────────────────────────────
-- 7. DISPUTES (raised on Tasks/Milestones; resolved by Expert)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE DISPUTES (
  disputeId    VARCHAR(50)   PRIMARY KEY,
  taskId       VARCHAR(50)   NOT NULL,
  milestoneId  VARCHAR(50),
  raisedBy     VARCHAR(50)   NOT NULL,
  raisedByName VARCHAR(100),
  againstId    VARCHAR(50)   NOT NULL,
  againstName  VARCHAR(100),
  status       ENUM('open','resolved') DEFAULT 'open',
  reason       TEXT          NOT NULL,
  expertId     VARCHAR(50),
  verdict      ENUM('worker-favour','client-favour','split'),
  resolution   TEXT,
  amount       DECIMAL(10,2),
  createdAt    DATETIME      NOT NULL DEFAULT NOW(),
  resolvedAt   DATETIME,
  FOREIGN KEY (taskId)      REFERENCES TASKS(taskId),
  FOREIGN KEY (milestoneId) REFERENCES MILESTONES(milestoneId),
  FOREIGN KEY (raisedBy)    REFERENCES USERS(userId),
  FOREIGN KEY (againstId)   REFERENCES USERS(userId),
  FOREIGN KEY (expertId)    REFERENCES EXPERTS(expertId)
);
CREATE INDEX idx_disputes_taskId   ON DISPUTES(taskId);
CREATE INDEX idx_disputes_raisedBy ON DISPUTES(raisedBy);


-- ──────────────────────────────────────────────────────────────────────────────
-- 8. DISPUTE_REPORTS (1:1 with DISPUTES)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE DISPUTE_REPORTS (
  disputereportid VARCHAR(50)  PRIMARY KEY,
  disputeId       VARCHAR(50)  NOT NULL UNIQUE,
  verdict         ENUM('worker-favour','client-favour','split') NOT NULL,
  findings        TEXT,
  codequality     INT CHECK (codequality   BETWEEN 0 AND 5),
  security        INT CHECK (security      BETWEEN 0 AND 5),
  performance     INT CHECK (performance   BETWEEN 0 AND 5),
  documentation   INT CHECK (documentation BETWEEN 0 AND 5),
  overall         VARCHAR(20),
  createdAt       DATETIME     NOT NULL DEFAULT NOW(),
  milestoneTitle  VARCHAR(200),
  projectTitle    VARCHAR(200),
  workerName      VARCHAR(100),
  FOREIGN KEY (disputeId) REFERENCES DISPUTES(disputeId)
);


-- ──────────────────────────────────────────────────────────────────────────────
-- 9. TRANSACTIONS (Platform-level financial flows)
--    Types: escrow-lock, milestone-release, refund, dispute-release
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE TRANSACTIONS (
  transactionId VARCHAR(50)   PRIMARY KEY,
  type          ENUM('escrow-lock','milestone-release','refund','dispute-release') NOT NULL,
  amount        DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  fromId        VARCHAR(50)   NOT NULL,
  toId          VARCHAR(50)   NOT NULL,
  taskId        VARCHAR(50),
  milestoneId   VARCHAR(50),
  status        ENUM('pending','completed','failed') DEFAULT 'completed',
  createdAt     DATETIME      NOT NULL DEFAULT NOW(),
  FOREIGN KEY (fromId)      REFERENCES USERS(userId),
  FOREIGN KEY (toId)        REFERENCES USERS(userId),
  FOREIGN KEY (taskId)      REFERENCES TASKS(taskId),
  FOREIGN KEY (milestoneId) REFERENCES MILESTONES(milestoneId)
);
CREATE INDEX idx_transactions_fromId ON TRANSACTIONS(fromId);
CREATE INDEX idx_transactions_toId   ON TRANSACTIONS(toId);
CREATE INDEX idx_transactions_taskId ON TRANSACTIONS(taskId);


-- ──────────────────────────────────────────────────────────────────────────────
-- 10. TRANSACTIONS_WALLET (Personal wallet deposit / withdraw)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE TRANSACTIONS_WALLET (
  transactionwalletId VARCHAR(50)   PRIMARY KEY,
  type                ENUM('deposit','withdraw') NOT NULL,
  amount              DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  toId                VARCHAR(50)   NOT NULL,
  status              ENUM('pending','completed','failed') DEFAULT 'completed',
  createdAt           DATETIME      NOT NULL DEFAULT NOW(),
  FOREIGN KEY (toId) REFERENCES USERS(userId)
);
CREATE INDEX idx_wallet_toId ON TRANSACTIONS_WALLET(toId);


-- ──────────────────────────────────────────────────────────────────────────────
-- 11. NOTIFICATIONS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE NOTIFICATIONS (
  notificationid VARCHAR(50)  PRIMARY KEY,
  userId         VARCHAR(50)  NOT NULL,
  type           VARCHAR(50)  NOT NULL,
  text           TEXT         NOT NULL,
  subtext        TEXT,
  read_status    BOOLEAN      DEFAULT FALSE,
  createdAt      DATETIME     NOT NULL DEFAULT NOW(),
  FOREIGN KEY (userId) REFERENCES USERS(userId)
);
CREATE INDEX idx_notifications_userId ON NOTIFICATIONS(userId);


-- ──────────────────────────────────────────────────────────────────────────────
-- 12. MESSAGES (Scoped to a Task workroom — Client ↔ Worker only)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE MESSAGES (
  messageid         VARCHAR(50)  PRIMARY KEY,
  taskId            VARCHAR(50)  NOT NULL,
  senderId          VARCHAR(50)  NOT NULL,
  receiverId        VARCHAR(50)  NOT NULL,
  content           TEXT         NOT NULL,
  senderName        VARCHAR(100),
  senderAvatar      VARCHAR(10),
  senderAvatarColor VARCHAR(200),
  createdAt         DATETIME     NOT NULL DEFAULT NOW(),
  FOREIGN KEY (taskId)     REFERENCES TASKS(taskId),
  FOREIGN KEY (senderId)   REFERENCES USERS(userId),
  FOREIGN KEY (receiverId) REFERENCES USERS(userId)
);
CREATE INDEX idx_messages_taskId   ON MESSAGES(taskId);
CREATE INDEX idx_messages_senderId ON MESSAGES(senderId);


-- ──────────────────────────────────────────────────────────────────────────────
-- 13. EXPERT_APPLICATIONS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE EXPERT_APPLICATIONS (
  id           VARCHAR(50)  PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(150) NOT NULL,
  phone        VARCHAR(20),
  phoneCountry VARCHAR(5),
  country      VARCHAR(100),
  expertise    VARCHAR(200),
  experience   VARCHAR(20),
  linkedin     VARCHAR(500),
  github       VARCHAR(500),
  motivation   TEXT,
  status       ENUM('pending','approved','rejected') DEFAULT 'pending',
  appliedAt    DATETIME     NOT NULL DEFAULT NOW(),
  reviewedAt   DATETIME,
  reviewedBy   VARCHAR(50),
  FOREIGN KEY (reviewedBy) REFERENCES USERS(userId)
);

