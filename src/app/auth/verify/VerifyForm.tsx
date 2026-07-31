'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MailCheck, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { requestEmailVerification, verifyEmail } from '../actions/emailVerification';
import { Input } from '@/components/ui/Input';
import {
  FormPage,
  FormCard,
  FormSection,
  FormSubmit,
  FormAlert,
  fieldClass,
  footerLinkClass,
  homeLinkClass,
} from '@/components/forms';

export default function VerifyForm({ userId }: { userId: string }) {
  const [step, setStep] = useState<'VERIFY' | 'SUCCESS'>('VERIFY');
  const [otp, setOtp] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  // Cooldown (seconds) before the user can request another code. Reset to
  // RESEND_COOLDOWN_SEC on every send — including the initial auto-send —
  // so the button can't be spammed and the mailbox doesn't get flooded.
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const sentOnMount = useRef(false);

  const RESEND_COOLDOWN_SEC = 60;

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // Auto-send a code on first mount so every entry path (registration,
  // sign-in redirect, manual link) gets exactly one email.
  useEffect(() => {
    if (sentOnMount.current) return;
    sentOnMount.current = true;
    void send();
  }, []);

  async function send() {
    setResending(true);
    const res = await requestEmailVerification(userId);
    if (res.maskedEmail) setMaskedEmail(res.maskedEmail);
    setMessage(res.success ? { type: 'success', text: res.message } : { type: 'error', text: res.message });
    // Only arm the cooldown when a code was actually sent — otherwise a
    // server-side failure would lock the button for a minute for nothing.
    if (res.success) setCooldown(RESEND_COOLDOWN_SEC);
    setResending(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter the 6-digit code.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    const res = await verifyEmail(userId, otp);
    if (res.success) {
      setStep('SUCCESS');
      setMessage({ type: 'success', text: res.message });
    } else {
      setMessage({ type: 'error', text: res.message });
    }
    setLoading(false);
  }

  return (
    <FormPage maxWidth="narrow">
      <FormCard
        icon={step === 'VERIFY' ? <ShieldCheck size={28} /> : <CheckCircle2 size={28} />}
        title={step === 'VERIFY' ? 'Verify Your Email' : 'Email Verified!'}
        subtitle={
          step === 'VERIFY'
            ? maskedEmail
              ? `Enter the 6-digit code sent to ${maskedEmail}.`
              : 'Enter the 6-digit code we sent to your email.'
            : 'Your account is now active. You can sign in to continue.'
        }
        footer={
          step !== 'SUCCESS' ? (
            <Link href="/auth/signin" className={footerLinkClass}>
              Back to Sign In
            </Link>
          ) : undefined
        }
      >
        {message && <FormAlert tone={message.type === 'error' ? 'error' : 'success'}>{message.text}</FormAlert>}

        {step === 'VERIFY' && (
          <form onSubmit={handleSubmit} noValidate>
            <FormSection label="Verification" icon={<MailCheck size={14} />} columns={1}>
              <Input
                containerClassName={fieldClass}
                name="otp"
                type="text"
                label="Verification Code"
                hint="6-digit code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                required
                disabled={loading}
                style={{ textAlign: 'center', letterSpacing: '0.4em', fontWeight: 700, fontSize: '1.25rem' }}
              />
            </FormSection>

            <FormSubmit
              loading={loading}
              loadingText="Verifying..."
              icon={<ShieldCheck size={18} />}
              disabled={otp.length !== 6}
            >
              Verify Email
            </FormSubmit>

            <button
              type="button"
              onClick={send}
              disabled={resending || cooldown > 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.375rem',
                margin: '0.75rem auto 0',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: resending || cooldown > 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {resending
                ? 'Sending...'
                : cooldown > 0
                  ? `Resend code in ${cooldown}s`
                  : 'Resend code'}
            </button>
          </form>
        )}

        {step === 'SUCCESS' && (
          <div style={{ textAlign: 'center' }}>
            <Link href="/auth/signin" className={homeLinkClass}>
              Sign In Now
            </Link>
          </div>
        )}
      </FormCard>
    </FormPage>
  );
}
