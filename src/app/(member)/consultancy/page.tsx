import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { MessageSquareText, LogIn, CheckCircle2, IdCard, Tags, Wallet } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { sendSupportEmail } from '@/lib/mail';
import { notifyAdmins } from '@/lib/notifications/admin';
import { dispatch } from '@/lib/notifications/service';
import { getPlatformSettings } from '@/lib/cache';
import { redeemCoupon } from '@/lib/coupon';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import {
  FormPage,
  FormCard,
  FormSection,
  FormSubmit,
  fieldClass,
  gridFullClass,
} from '@/components/forms';
import ConsultancySuccessToast from './ConsultancySuccessToast';
import FormSubmitOverlay from '@/components/ui/FormSubmitOverlay';
import { formatBDT } from '@/lib/format';

/** Fallback free-quota if PlatformSetting row is missing. */
const FALLBACK_FREE_QUOTA = 2;
/** Fallback paid-session price if PlatformSetting row is missing. */
const FALLBACK_PAID_PRICE = 100;

export const metadata: Metadata = {
  title: 'Academic Consultancy — nsuOne',
  description:
    'Book a one-on-one academic consultancy session with experienced NSU seniors and tutors for course selection, career guidance, and study planning.',
  alternates: { canonical: '/consultancy' },
};

export default async function ConsultancyPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; nsuId?: string; name?: string | null } | undefined;

  // Active topics shown on the public page.
  const topics = await prisma.consultancyTopic.findMany({
    where: { isActive: true },
    orderBy: [{ price: 'asc' }, { title: 'asc' }],
  });

  // Configurable free quota (admin-set via /admin/settings).
  const settings = await getPlatformSettings();
  const freeQuota = settings.consultancyFreeQuota ?? FALLBACK_FREE_QUOTA;

  // Free quota counts ALL past sessions (free + paid). Once the student has
  // booked `freeQuota` times, every subsequent session is paid at the flat
  // fee (or the topic's explicit price if higher).
  const totalBookedCount = sessionUser?.id
    ? await prisma.consultancyRequest.count({
        where: { studentId: sessionUser.id },
      })
    : 0;
  const remainingFree = Math.max(0, freeQuota - totalBookedCount);
  const paidSessionPrice = settings.consultancyPaidSessionPrice ?? FALLBACK_PAID_PRICE;

  // Fetch the student's wallet balance so the pricing card can show whether
  // they have enough for a paid session and prompt a recharge if not.
  const userRow = sessionUser?.id
    ? await prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: { balance: true },
      })
    : null;
  const walletBalance = userRow?.balance ?? 0;
  const needsRecharge = remainingFree === 0 && walletBalance < paidSessionPrice;

  async function submitConsultancy(formData: FormData) {
    'use server';

    const submittingSession = await getServerSession(authOptions);
    const user = submittingSession?.user as { id?: string } | undefined;
    if (!user?.id) {
      redirect('/auth/signin?callbackUrl=/consultancy');
    }

    const student = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, nsuId: true, email: true, balance: true },
    });
    if (!student) throw new Error('Account not found. Please register first.');

    const topicId = (formData.get('topicId') as string) || null;
    const details = (formData.get('details') as string)?.trim();
    const couponCode = ((formData.get('couponCode') as string) || '').trim();

    // Resolve the linked topic (or fall back to legacy free-text behavior).
    const topic = topicId
      ? await prisma.consultancyTopic.findUnique({ where: { id: topicId } })
      : null;

    if (topicId && !topic) throw new Error('Selected topic no longer exists.');
    if (!details) throw new Error('Please describe what you need help with.');

    // ---- Pricing decision (unified model) ----
    // Free quota counts ALL past sessions (free + paid), so once a student
    // has booked N times, every subsequent session is paid. Paid price is
    // the topic's explicit price if set; otherwise the admin-configured
    // flat fee (consultancyPaidSessionPrice, default 100 BDT).
    const quota = settings.consultancyFreeQuota ?? FALLBACK_FREE_QUOTA;
    const totalUsed = await prisma.consultancyRequest.count({
      where: { studentId: student.id },
    });
    const isFree = totalUsed < quota;
    const basePrice =
      topic && topic.price > 0
        ? topic.price
        : (settings.consultancyPaidSessionPrice ?? FALLBACK_PAID_PRICE);
    const chargeAmountBase = isFree ? 0 : basePrice;

    // Atomically: debit wallet (if paid) + create the request. Reuses the
    // pattern from adjustUserBalance — server-authoritative balance check
    // inside a transaction so two concurrent bookings can't drain a wallet.
    try {
      const result = await prisma.$transaction(async (tx) => {
        let chargeAmount = chargeAmountBase;
        let couponDiscount = 0;

        // Optional CONSULTANCY coupon — redeem inside the transaction so
        // the discount + debit + booking are atomic. Coupon errors throw
        // user-facing messages caught below.
        if (couponCode && chargeAmount > 0) {
          couponDiscount = await redeemCoupon(tx, {
            code: couponCode,
            scope: 'CONSULTANCY',
            amount: chargeAmount,
            userId: student.id,
          });
          chargeAmount = Math.max(0, chargeAmount - couponDiscount);
        }

        if (chargeAmount > 0) {
          const fresh = await tx.user.findUnique({
            where: { id: student.id },
            select: { balance: true },
          });
          if (!fresh || fresh.balance < chargeAmount) {
            throw new Error(
              `INSUFFICIENT:${fresh?.balance ?? 0}:${chargeAmount}`,
            );
          }
          await tx.user.update({
            where: { id: student.id },
            data: { balance: { decrement: chargeAmount } },
          });
          await tx.walletTransaction.create({
            data: {
              userId: student.id,
              amount: -chargeAmount,
              type: 'CONSULTANCY_PAYMENT',
              description: `Consultancy booking: ${topic?.title ?? 'General Consultancy'}${couponDiscount > 0 ? ` (coupon saved ${couponDiscount} BDT)` : ''}`,
              referenceId: topic?.id ?? null,
            },
          });
        }

        const request = await tx.consultancyRequest.create({
          data: {
            studentId: student.id,
            topic: topic?.title ?? 'General Consultancy',
            details,
            topicId: topic?.id ?? null,
            pricePaid: chargeAmount > 0 ? chargeAmount : null,
          },
        });

        // Stamp the redemption with the consultancy request id.
        if (couponCode && couponDiscount > 0) {
          await tx.couponRedemption.updateMany({
            where: {
              coupon: { code: couponCode.toUpperCase() },
              userId: student.id,
              reference: null,
            },
            data: { reference: request.id },
          });
        }

        return { request, chargeAmount, couponDiscount };
      });

      // Booking confirmation email (fire-and-forget).
      try {
        await sendSupportEmail({
          to: student.email,
          subject: `Consultancy Request Confirmed: ${result.request.topic} - NSUone`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #4f46e5;">We Received Your Consultancy Request!</h2>
              <p>Hello ${student.name},</p>
              <p>We have received your request for ${result.chargeAmount > 0 ? 'a paid' : 'a free'} consultation on <strong>${result.request.topic}</strong>.</p>
              ${result.chargeAmount > 0 ? `<p><strong>Amount paid:</strong> ${formatBDT(result.chargeAmount)} BDT (debited from your Campus Wallet).${result.couponDiscount > 0 ? ` Coupon saved ${formatBDT(result.couponDiscount)} BDT.` : ''}</p>` : ''}
              <p style="background: #f8fafc; padding: 12px; border-left: 4px solid #4f46e5; border-radius: 4px;"><em>"${details}"</em></p>
              <p>One of our senior mentors will review your request and contact you shortly via email or phone.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #64748b; font-size: 0.9em;">NSUone Mentorship & Consultancy Team</p>
            </div>
          `,
        });
      } catch (mailErr) {
        console.error('Failed to send consultancy confirmation email:', mailErr);
      }

      try {
        await dispatch({
          event: 'consultancy.booked',
          userId: student.id,
          title: 'Consultancy Booked',
          message: `Your ${isFree ? 'free' : 'paid'} consultancy request for "${result.request.topic}" was received.`,
          actionUrl: '/consultancy',
          type: 'SUCCESS',
          category: 'CONSULTANCY',
          priority: 'HIGH',
          actorUserId: student.id,
          recipientRoleHint: 'STUDENT',
          metadata: { requestId: result.request.id, topic: result.request.topic, paid: !isFree },
        });
      } catch (err) {
        console.error('Failed to notify user of consultancy booking:', err);
      }

      // Phase 5: in-app admin notification (additive — student notification
      // above and Discord ping from the parent try block are unchanged).
      try {
        await notifyAdmins({
          event: 'consultancy.submitted',
          title: 'New Consultancy Request',
          message: `${student.name} booked a ${isFree ? 'free' : 'paid'} consultancy: "${result.request.topic}".`,
          actionUrl: '/admin/consultancy',
          type: 'ACTION_REQUIRED',
          category: 'CONSULTANCY',
          priority: 'HIGH',
          actorUserId: student.id,
          metadata: { requestId: result.request.id, topic: result.request.topic, paid: !isFree },
        });
      } catch (err) {
        console.error('Failed to notify admins of consultancy booking:', err);
      }

      redirect('/consultancy?success=true');
    } catch (err: any) {
      // Insufficient wallet balance: surface as an inline error on the page
      // (not a global error boundary). Mirrors the ?success=true pattern.
      if (err?.message?.startsWith('INSUFFICIENT:')) {
        const [, balance, price] = err.message.split(':');
        redirect(`/consultancy?error=insufficient&balance=${encodeURIComponent(balance)}&price=${encodeURIComponent(price)}`);
      }
      // Next.js uses redirect() by throwing a digest — rethrow so navigation fires.
      if (err?.digest?.startsWith('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT') {
        throw err;
      }
      console.error('Consultancy booking error:', err);
      redirect('/consultancy?error=failed');
    }
  }

  // -------- Guest state: gate behind login --------
  if (!sessionUser?.id) {
    return (
      <FormPage>
        <FormCard
          icon={<MessageSquareText size={28} />}
          title="Get Free Consultancy"
          subtitle="Book a one-on-one session with a senior mentor for course selection, semester planning, or career guidance."
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              padding: '2rem 1rem',
              textAlign: 'center',
            }}
          >
            <p style={{ color: 'var(--text-muted, #64748b)', margin: 0 }}>
              Please log in first to claim your {freeQuota} free consultancy sessions or book a premium topic.
            </p>
            <Link
              href={`/auth/signin?callbackUrl=${encodeURIComponent('/consultancy')}`}
              className="btn-primary"
            >
              <LogIn size={18} /> Login to continue
            </Link>
          </div>
        </FormCard>
      </FormPage>
    );
  }

  const quotaBadgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    alignSelf: 'flex-start',
    padding: '0.35rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: 600,
    background:
      remainingFree > 0 ? 'rgba(79, 70, 229, 0.1)' : 'rgba(239, 68, 68, 0.1)',
    color: remainingFree > 0 ? 'var(--primary)' : 'var(--danger)',
  };

  const hasUsableTopics = topics.length > 0;

  return (
    <FormPage>
      <FormCard
        icon={<MessageSquareText size={28} />}
        title="Book a Consultancy Session"
        subtitle={`Your first ${freeQuota} session${freeQuota === 1 ? '' : 's'} ${freeQuota === 1 ? 'is' : 'are'} free. After that, each session costs ${formatBDT(paidSessionPrice)} BDT from your Campus Wallet.`}
      >
        <ConsultancySuccessToast />
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={quotaBadgeStyle}>
            <MessageSquareText size={14} />
            {remainingFree} of {freeQuota} free sessions remaining
          </span>
        </div>

        {/* ---------- Pricing summary ---------- */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.25rem',
            padding: '1rem 1.25rem',
            background: 'var(--primary-light)',
            border: '1px solid var(--primary)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div>
            <div className="text-xs text-muted" style={{ marginBottom: '0.15rem' }}>Free quota</div>
            <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
              {freeQuota} session{freeQuota === 1 ? '' : 's'} / student
            </div>
          </div>
          <div>
            <div className="text-xs text-muted" style={{ marginBottom: '0.15rem' }}>After quota</div>
            <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
              {formatBDT(paidSessionPrice)} BDT / session
            </div>
          </div>
          <div>
            <div className="text-xs text-muted" style={{ marginBottom: '0.15rem' }}>Your wallet</div>
            <div style={{ fontWeight: 600, color: needsRecharge ? 'var(--danger)' : 'var(--text-main)' }}>
              {formatBDT(walletBalance)} BDT
            </div>
          </div>
        </div>

        {needsRecharge && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              padding: '0.85rem 1rem',
              marginBottom: '1.75rem',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <span className="text-sm" style={{ color: 'var(--danger)', fontWeight: 500 }}>
              You&apos;ve used your free quota and your wallet balance is below {formatBDT(paidSessionPrice)} BDT — recharge to book another session.
            </span>
            <Link href="/wallet" className="btn-primary" style={{ flexShrink: 0 }}>
              <Wallet size={16} /> Recharge Wallet
            </Link>
          </div>
        )}

        {!hasUsableTopics && (
          <p className="text-muted text-center text-sm" style={{ marginBottom: '1rem' }}>
            No consultancy topics are available right now. Please check back soon.
          </p>
        )}

        <form action={submitConsultancy} noValidate>
          <FormSubmitOverlay
            title="Booking your session"
            message="Reserving your consultancy slot — hang tight…"
          />
          <FormSection columns={1}>
            <Input
              containerClassName={fieldClass}
              name="nsuId"
              type="text"
              label="Your NSU ID"
              labelIcon={<IdCard size={14} />}
              defaultValue={sessionUser.nsuId}
              readOnly
              required
            />
          </FormSection>

          <FormSection>
            {hasUsableTopics ? (
              <Select
                containerClassName={fieldClass}
                name="topicId"
                label="Topic"
                labelIcon={<Tags size={14} />}
                required
                placeholderOption="Select a topic"
                options={topics.map((t) => ({ value: t.id, label: t.title }))}
              />
            ) : null}
            <Textarea
              containerClassName={`${fieldClass} ${gridFullClass}`}
              name="details"
              label="Additional Details"
              labelIcon={<MessageSquareText size={14} />}
              required
              rows={4}
              placeholder="Briefly describe what you need help with..."
            />
            <Input
              containerClassName={`${fieldClass} ${gridFullClass}`}
              name="couponCode"
              type="text"
              label="Coupon Code (optional, paid topics only)"
              placeholder="e.g. WELCOME50"
            />
          </FormSection>

          <div
            className="text-xs text-muted"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '-0.5rem', marginBottom: '1rem' }}
          >
            <Wallet size={12} /> Sessions past your free quota are debited from your Campus Wallet at booking.
            See our{' '}
            <Link href="/consultancy-policy" className="text-primary font-semibold">
              Consultancy Policy
            </Link>
            .
          </div>

          <FormSubmit
            icon={<MessageSquareText size={18} />}
            disabled={!hasUsableTopics || needsRecharge}
            loadingText={needsRecharge ? 'Recharge required' : 'Submitting...'}
          >
            Submit Request
          </FormSubmit>
        </form>
      </FormCard>
    </FormPage>
  );
}
