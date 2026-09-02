create DATABASE lannent
USE lannent;

-- USERS
CREATE TABLE USERS (
  user_id       INT NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  role          ENUM('client','worker','expert') NOT NULL,
  portfolio     VARCHAR(1000),
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
);

-- PROJECTS
CREATE TABLE PROJECTS (
  project_id           INT NOT NULL AUTO_INCREMENT,
  client_id            INT NOT NULL,
  gig_worker_id        INT NOT NULL,
  title                VARCHAR(200) NOT NULL,
  description          VARCHAR(1000),
  category             VARCHAR(100),
  total_budget         DECIMAL(10,2) NOT NULL CHECK (total_budget >= 0),
  deadline             DATE,
  status               ENUM('open','in_progress','completed','cancelled') NOT NULL,
  need_technical_audit BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id),
  FOREIGN KEY (client_id)     REFERENCES USERS(user_id),
  FOREIGN KEY (gig_worker_id) REFERENCES USERS(user_id)
);

-- PROPOSALS
CREATE TABLE PROPOSALS (
  proposal_id   INT NOT NULL AUTO_INCREMENT,
  project_id    INT NOT NULL,
  worker_id     INT NOT NULL,
  bid_amount    DECIMAL(10,2) NOT NULL CHECK (bid_amount >= 0),
  timeline_days INT NOT NULL CHECK (timeline_days > 0),
  status        ENUM('pending','accepted','rejected') NOT NULL,
  submitted_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (proposal_id),
  FOREIGN KEY (project_id) REFERENCES PROJECTS(project_id),
  FOREIGN KEY (worker_id)  REFERENCES USERS(user_id)
);

-- MILESTONES 
CREATE TABLE MILESTONES (
  milestone_id INT NOT NULL AUTO_INCREMENT,
  project_id   INT NOT NULL,
  title        VARCHAR(200) NOT NULL,
  description  VARCHAR(1000),
  budget       DECIMAL(10,2) NOT NULL CHECK (budget >= 0),
  deadline     DATE,
  status       ENUM('pending','in_progress','submitted','approved','disputed') NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (milestone_id),
  FOREIGN KEY (project_id) REFERENCES PROJECTS(project_id)
);

-- ESCROW 
CREATE TABLE ESCROW (
  escrow_id    INT NOT NULL AUTO_INCREMENT,
  milestone_id INT NOT NULL UNIQUE,
  amount       DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  status       ENUM('held','released','refunded','disputed') NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  released_at  DATETIME,
  PRIMARY KEY (escrow_id),
  FOREIGN KEY (milestone_id) REFERENCES MILESTONES(milestone_id)
);

-- TECHNICAL_AUDITS
CREATE TABLE TECHNICAL_AUDITS (
  audit_id     INT NOT NULL AUTO_INCREMENT,
  milestone_id INT NOT NULL,
  expert_id    INT NOT NULL,
  audit_status ENUM('pending','in_progress','completed') NOT NULL,
  work_score   DECIMAL(5,2) CHECK (work_score BETWEEN 0 AND 100),
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (audit_id),
  FOREIGN KEY (milestone_id) REFERENCES MILESTONES(milestone_id),
  FOREIGN KEY (expert_id)    REFERENCES USERS(user_id)
);

-- DISPUTES
CREATE TABLE DISPUTES (
  dispute_id        INT NOT NULL AUTO_INCREMENT,
  milestone_id      INT NOT NULL,
  raised_by_user_id INT NOT NULL,
  expert_id         INT,
  reason            VARCHAR(1000) NOT NULL,
  status            ENUM('open','under_review','resolved','closed') NOT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at       DATETIME,
  PRIMARY KEY (dispute_id),
  FOREIGN KEY (milestone_id)      REFERENCES MILESTONES(milestone_id),
  FOREIGN KEY (raised_by_user_id) REFERENCES USERS(user_id),
  FOREIGN KEY (expert_id)         REFERENCES USERS(user_id)
);

-- REPORTS_AUDIT
CREATE TABLE REPORTS_AUDIT (
  report_id       INT NOT NULL AUTO_INCREMENT,
  audit_id        INT NOT NULL,
  summary         VARCHAR(2000),
  recommendations VARCHAR(2000),
  final_decision  VARCHAR(2000),
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (report_id),
  FOREIGN KEY (audit_id) REFERENCES TECHNICAL_AUDITS(audit_id)
);

-- REPORTS_DISPUTE
CREATE TABLE REPORTS_DISPUTE (
  report_id       INT NOT NULL AUTO_INCREMENT,
  dispute_id      INT NOT NULL,
  summary         VARCHAR(2000),
  recommendations VARCHAR(2000),
  final_decision  VARCHAR(2000),
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (report_id),
  FOREIGN KEY (dispute_id) REFERENCES DISPUTES(dispute_id)
);

-- WALLETS
CREATE TABLE WALLETS (
  wallet_id  INT NOT NULL AUTO_INCREMENT,
  user_id    INT NOT NULL UNIQUE,
  balance    DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (wallet_id),
  FOREIGN KEY (user_id) REFERENCES USERS(user_id)
);

-- TRANSACTIONS
CREATE TABLE TRANSACTIONS (
  transaction_id   INT NOT NULL AUTO_INCREMENT,
  wallet_id        INT NOT NULL,
  escrow_id        INT,
  amount           DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  transaction_type ENUM('deposit','withdrawal','escrow_hold','escrow_release','refund') NOT NULL,
  status           ENUM('pending','completed','failed') NOT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (transaction_id),
  FOREIGN KEY (wallet_id) REFERENCES WALLETS(wallet_id),
  FOREIGN KEY (escrow_id) REFERENCES ESCROW(escrow_id)
);

-- MESSAGES
CREATE TABLE MESSAGES (
  message_id  INT NOT NULL AUTO_INCREMENT,
  sender_id   INT NOT NULL,
  receiver_id INT NOT NULL,
  project_id  INT,
  content     VARCHAR(2000) NOT NULL,
  sent_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id),
  FOREIGN KEY (sender_id)   REFERENCES USERS(user_id),
  FOREIGN KEY (receiver_id) REFERENCES USERS(user_id),
  FOREIGN KEY (project_id)  REFERENCES PROJECTS(project_id)
);

-- FILES
CREATE TABLE FILES (
  file_id      INT NOT NULL AUTO_INCREMENT,
  milestone_id INT NOT NULL,
  uploaded_by  INT NOT NULL,
  file_name    VARCHAR(255) NOT NULL,
  file_path    VARCHAR(500) NOT NULL,
  uploaded_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (file_id),
  FOREIGN KEY (milestone_id) REFERENCES MILESTONES(milestone_id),
  FOREIGN KEY (uploaded_by)  REFERENCES USERS(user_id)
);

-- NOTIFICATIONS
CREATE TABLE NOTIFICATIONS (
  notification_id INT NOT NULL AUTO_INCREMENT,
  user_id         INT NOT NULL,
  message         TEXT NOT NULL,
  type            VARCHAR(50) NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id),
  FOREIGN KEY (user_id) REFERENCES USERS(user_id)

);