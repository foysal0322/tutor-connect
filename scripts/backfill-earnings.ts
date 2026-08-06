/**
 * One-off backfill: fold tutor lifetime earnings (net of pending/approved
 * withdrawals) into User.balance so the unified-wallet model matches what
 * the old derived formula produced.
 *
 * Run with:  npx tsx scripts/backfill-earnings.ts [--dry-run]
 *
 * Idempotent: every tutor gets a marker WalletTransaction with
 * referenceId = `backfill:<userId>`. Re-runs skip tutors that already
 * have the marker. DO NOT manually delete the marker — re-running after
 * deletion would double-credit.
 *
 * Math invariant per tutor:
 *   newBalance = oldBalance + (lifetimeCompletedEarnings − reservedWithdrawals)
 * where reservedWithdrawals = sum of WithdrawalRequest.amount with status
 * in (PENDING, APPROVED). This is exactly what the new model would
 * produce: lifetime earnings minus already-reserved withdrawals.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

type Summary = {
  tutorId: string;
  name: string | null;
  balanceBefore: number;
  lifetime: number;
  reserved: number;
  credit: number;
  balanceAfter: number;
  skipped: boolean;
};

async function backfillTutor(tutorId: string, name: string | null, balanceBefore: number): Promise<Summary> {
  return prisma.$transaction(async (tx) => {
    // Idempotency: if a backfill marker exists, skip.
    const marker = await tx.walletTransaction.findFirst({
      where: { userId: tutorId, referenceId: `backfill:${tutorId}` },
      select: { id: true },
    });
    if (marker) {
      return { tutorId, name, balanceBefore, lifetime: 0, reserved: 0, credit: 0, balanceAfter: balanceBefore, skipped: true };
    }

    const completed = await tx.tutorRequest.findMany({
      where: { assignedTutorId: tutorId, status: 'COMPLETED' },
      select: { budget: true },
    });
    const lifetime = completed.reduce((s, r) => s + r.budget, 0);

    const reservedRows = await tx.withdrawalRequest.findMany({
      where: { tutorId, status: { in: ['PENDING', 'APPROVED'] } },
      select: { amount: true },
    });
    const reserved = reservedRows.reduce((s, w) => s + w.amount, 0);

    const credit = Math.max(0, lifetime - reserved);
    const balanceAfter = balanceBefore + credit;

    if (!DRY_RUN) {
      if (credit > 0) {
        await tx.user.update({
          where: { id: tutorId },
          data: { balance: { increment: credit } },
        });
      }
      // Always create the marker — even when credit is 0 — so re-runs
      // skip this tutor instead of recomputing.
      await tx.walletTransaction.create({
        data: {
          userId: tutorId,
          amount: credit,
          type: 'EARNING_CREDIT',
          referenceId: `backfill:${tutorId}`,
          description: `Backfill: lifetime completed-session earnings (lifetime=${lifetime.toFixed(2)}, reserved=${reserved.toFixed(2)})`,
        },
      });
    }

    return { tutorId, name, balanceBefore, lifetime, reserved, credit, balanceAfter, skipped: false };
  });
}

async function main() {
  console.log(`Backfill mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'APPLY'}`);
  const tutors = await prisma.user.findMany({
    where: { role: 'TUTOR' },
    select: { id: true, name: true, balance: true },
  });
  console.log(`Found ${tutors.length} tutor(s).`);

  const summaries: Summary[] = [];
  for (const t of tutors) {
    try {
      summaries.push(await backfillTutor(t.id, t.name, t.balance));
    } catch (err) {
      console.error(`Failed for tutor ${t.id}:`, err);
    }
  }

  const applied = summaries.filter((s) => !s.skipped && s.credit > 0);
  const zeroCredit = summaries.filter((s) => !s.skipped && s.credit === 0);
  const skipped = summaries.filter((s) => s.skipped);
  const totalCredit = applied.reduce((s, x) => s + x.credit, 0);

  console.log('');
  console.log('--- Per-tutor detail ---');
  for (const s of summaries) {
    const tag = s.skipped ? 'SKIP ' : s.credit > 0 ? 'CREDIT' : 'ZERO  ';
    console.log(
      `${tag} ${s.name ?? s.tutorId}  before=${s.balanceBefore.toFixed(2)}  lifetime=${s.lifetime.toFixed(2)}  reserved=${s.reserved.toFixed(2)}  credit=${s.credit.toFixed(2)}  after=${s.balanceAfter.toFixed(2)}`,
    );
  }

  console.log('');
  console.log('--- Summary ---');
  console.log(`Tutors processed: ${summaries.length}`);
  console.log(`  Credited (credit > 0): ${applied.length}`);
  console.log(`  Zero credit:           ${zeroCredit.length}`);
  console.log(`  Skipped (marker):      ${skipped.length}`);
  console.log(`Total credit applied:   ${totalCredit.toFixed(2)} BDT`);
  if (DRY_RUN) {
    console.log('Dry run — no rows were written. Re-run without --dry-run to apply.');
  } else {
    console.log('Applied. Re-run the script to verify all tutors report SKIP.');
  }
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
