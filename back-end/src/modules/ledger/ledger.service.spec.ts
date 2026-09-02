import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { LedgerRepository } from './ledger.repository';
import { UsersModule } from '../users/users.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersService } from '../users/users.service';
import { TransactionsService } from '../transactions/transactions.service';
import { round2 } from './fee-config';

/**
 * The books must balance:
 *
 *   money in (deposits, gross) - money out (withdrawals, gross)
 *     = wallet balances + escrow held + platform revenue
 *
 * The pre-ledger code violated this — funding never debited the client and
 * approving a milestone credited the worker with no matching debit, so the
 * system minted money. These tests fail against that implementation.
 */
describe('LedgerService', () => {
  let ledger: LedgerService;
  let users: UsersService;
  let transactions: TransactionsService;
  let repo: LedgerRepository;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      imports: [UsersModule, TransactionsModule],
      providers: [LedgerRepository, LedgerService],
    }).compile();

    ledger = mod.get(LedgerService);
    users = mod.get(UsersService);
    transactions = mod.get(TransactionsService);
    repo = mod.get(LedgerRepository);

    users.resetToSeed();
    transactions.resetToSeed();
    ledger.resetToSeed();
  });

  const walletTotal = () =>
    round2(users.findAll().reduce((a: number, u: any) => a + (u.walletBalance || 0), 0));

  /** Everything the platform is holding or has kept, plus everyone's wallets. */
  const systemTotal = () => round2(walletTotal() + ledger.totalHeld() + ledger.totalRevenue());

  describe('the books balance', () => {
    it('conserves value across a full project lifecycle', () => {
      const opening = systemTotal();

      // A deposit adds new outside money; everything after only moves it around.
      const dep = ledger.deposit('u1', 5000);
      expect(round2(systemTotal())).toBe(round2(opening + 5000));

      // The deposit fee is revenue, not lost value.
      expect(dep.fee).toBe(round2(5000 * 0.029 + 0.3));
      expect(dep.net).toBe(round2(5000 - dep.fee));

      const afterDeposit = systemTotal();

      ledger.fundProjectEscrow('t3', 'u1', 1200, 'API Integration Project');
      expect(systemTotal()).toBe(afterDeposit);

      ledger.releaseMilestone({
        milestoneId: 'm13', taskId: 't3', clientId: 'u1', workerId: 'u5', amount: 500,
      });
      expect(systemTotal()).toBe(afterDeposit);

      ledger.refundToClient({ taskId: 't3', clientId: 'u1', amount: 200 });
      expect(systemTotal()).toBe(afterDeposit);

      // A withdrawal removes outside money: gross leaves, fee stays as revenue.
      const w = ledger.withdraw('u5', 300);
      expect(round2(systemTotal())).toBe(round2(afterDeposit - w.net));
    });

    it('routes every fee into revenue rather than losing it', () => {
      const before = ledger.totalRevenue();
      ledger.deposit('u1', 1000);
      ledger.fundProjectEscrow('t3', 'u1', 1000, 'test');
      ledger.releaseMilestone({
        milestoneId: 'm13', taskId: 't3', clientId: 'u1', workerId: 'u5', amount: 400,
      });
      const kinds = ledger.getRevenue().map((r) => r.feeType);
      expect(kinds).toContain('deposit-processing');
      expect(kinds).toContain('client-marketplace');
      expect(kinds).toContain('contract-initiation');
      expect(kinds).toContain('worker-service');
      expect(ledger.totalRevenue()).toBeGreaterThan(before);
    });
  });

  describe('escrow can never go negative', () => {
    it('refuses a milestone release larger than the held balance', () => {
      ledger.fundProjectEscrow('t3', 'u1', 1200, 'test');
      expect(() =>
        ledger.releaseMilestone({
          milestoneId: 'm13', taskId: 't3', clientId: 'u1', workerId: 'u5', amount: 5000,
        }),
      ).toThrow(BadRequestException);
      expect(ledger.getEscrow('t3').projectHeld).toBe(1200);
    });

    it('refuses a refund larger than the held balance', () => {
      ledger.fundProjectEscrow('t3', 'u1', 1200, 'test');
      expect(() =>
        ledger.refundToClient({ taskId: 't3', clientId: 'u1', amount: 9999 }),
      ).toThrow(BadRequestException);
    });

    it('refuses to fund escrow the client cannot afford', () => {
      const before = users.findById('u8').walletBalance;
      expect(() => ledger.fundProjectEscrow('t5', 'u8', 100000, 'test')).toThrow(BadRequestException);
      expect(users.findById('u8').walletBalance).toBe(before);
      expect(ledger.getEscrow('t5').projectHeld).toBe(0);
    });
  });

  describe('releases are idempotent', () => {
    it('pays a milestone once even if approved twice', () => {
      ledger.fundProjectEscrow('t3', 'u1', 1200, 'test');
      const first = ledger.releaseMilestone({
        milestoneId: 'm13', taskId: 't3', clientId: 'u1', workerId: 'u5', amount: 500,
      });
      const balanceAfterFirst = users.findById('u5').walletBalance;

      const second = ledger.releaseMilestone({
        milestoneId: 'm13', taskId: 't3', clientId: 'u1', workerId: 'u5', amount: 500,
      });

      expect(first.alreadyReleased).toBe(false);
      expect(second.alreadyReleased).toBe(true);
      expect(users.findById('u5').walletBalance).toBe(balanceAfterFirst);
      expect(ledger.getEscrow('t3').projectHeld).toBe(700);
    });

    it('pays an expert once even if the report is submitted twice', () => {
      ledger.fundAuditEscrow('t3', 'u1', 400);
      const a = ledger.releaseAuditFee({ auditRequestId: 'ar9', taskId: 't3', expertId: 'u3', amount: 400 });
      const balance = users.findById('u3').walletBalance;
      const b = ledger.releaseAuditFee({ auditRequestId: 'ar9', taskId: 't3', expertId: 'u3', amount: 400 });

      expect(a.alreadyPaid).toBe(false);
      expect(b.alreadyPaid).toBe(true);
      expect(users.findById('u3').walletBalance).toBe(balance);
    });
  });

  describe('fee arithmetic', () => {
    it('charges the client budget plus marketplace and initiation fees', () => {
      const before = users.findById('u1').walletBalance;
      const r = ledger.fundProjectEscrow('t3', 'u1', 2500, 'test');

      expect(r.marketplace).toBe(125);   // 5%
      expect(r.initiation).toBe(9.99);   // $2,000–$10,000 band
      expect(r.totalCharged).toBe(2634.99);
      expect(users.findById('u1').walletBalance).toBe(round2(before - 2634.99));
      expect(ledger.getEscrow('t3').projectHeld).toBe(2500); // only the budget is held
    });

    it('tiers the worker fee by lifetime billings with that client', () => {
      // u1<->u5 already has $1,800 of seeded billings, so the second tier applies.
      expect(ledger.getBillings('u1', 'u5')).toBe(1800);
      ledger.fundProjectEscrow('t3', 'u1', 1200, 'test');
      const r = ledger.releaseMilestone({
        milestoneId: 'm13', taskId: 't3', clientId: 'u1', workerId: 'u5', amount: 500,
      });
      expect(r.rate).toBe(10);
      expect(r.fee).toBe(50);
      expect(r.net).toBe(450);

      // A brand-new pair starts in the 20% tier.
      expect(ledger.getBillings('u8', 'u2')).toBe(0);
      ledger.fundProjectEscrow('t5', 'u8', 400, 'test');
      const fresh = ledger.releaseMilestone({
        milestoneId: 'm16', taskId: 't5', clientId: 'u8', workerId: 'u2', amount: 400,
      });
      expect(fresh.rate).toBe(20);
      expect(fresh.net).toBe(320);
    });

    it('takes 10% commission from the expert payout', () => {
      ledger.fundAuditEscrow('t3', 'u1', 300);
      const before = users.findById('u3').walletBalance;
      const r = ledger.releaseAuditFee({ auditRequestId: 'ar9', taskId: 't3', expertId: 'u3', amount: 300 });
      expect(r.fee).toBe(30);
      expect(r.net).toBe(270);
      expect(users.findById('u3').walletBalance).toBe(round2(before + 270));
    });

    it('applies the withdrawal minimum on small amounts', () => {
      const r = ledger.withdraw('u2', 50);
      expect(r.fee).toBe(0.38); // 0.25% + $0.25
      expect(r.net).toBe(49.62);
    });
  });

  describe('seeded state is internally consistent', () => {
    it('holds enough escrow to cover every unpaid milestone', () => {
      // t1: 2500 funded - 1800 released; t4: 3500 - 2800; t6: 2200 - 0
      expect(ledger.getEscrow('t1').projectHeld).toBe(700);
      expect(ledger.getEscrow('t4').projectHeld).toBe(700);
      expect(ledger.getEscrow('t6').projectHeld).toBe(2200);
    });

    it('does not re-pay milestones the seed already released', () => {
      expect(repo.isMilestoneReleased('m1')).toBe(true);
      expect(repo.isMilestoneReleased('m3')).toBe(false);
    });
  });
});
