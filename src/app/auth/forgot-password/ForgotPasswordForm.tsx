'use client';

import { useState } from 'react';
import Link from 'next/link';
import { requestPasswordReset, verifyAndResetPassword } from '../actions/passwordReset';
import { Input } from '@/components/ui/Input';
import { KeyRound, ShieldCheck, CheckCircle2, ArrowLeft } from 'lucide-react';
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

export default function ForgotPasswordForm() {
  const [step, setStep] = useState<'REQUEST' | 'VERIFY' | 'SUCCESS'>('REQUEST');
  const [identifier, setIdentifier] = useState('');
  const [userId, setUserId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier) return;

    setLoading(true);
    setMessage(null);

    const res = await requestPasswordReset(identifier);
    if (res.success && res.userId) {
      setUserId(res.userId);
      setMaskedEmail(res.maskedEmail || '');
      setStep('VERIFY');
      setMessage({ type: 'success', text: res.message });
    } else {
      setMessage({ type: 'error', text: res.message });
    }

    setLoading(false);
  }

  async function handleVerifyAndReset(e: React.FormEvent) {
    e.preventDefault();
    if (!otp || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill in all fields.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const res = await verifyAndResetPassword(userId, otp, newPassword);
    if (res.success) {
      setStep('SUCCESS');
      setMessage({ type: 'success', text: res.message });
    } else {
      setMessage({ type: 'error', text: res.message });
    }

    setLoading(false);
  }

  const icon =
    step === 'REQUEST' ? (
      <KeyRound size={28} />
    ) : step === 'VERIFY' ? (
      <ShieldCheck size={28} />
    ) : (
      <CheckCircle2 size={28} />
    );

  const title = step === 'REQUEST' ? 'Forgot Password' : step === 'VERIFY' ? 'Verify & Reset' : 'Password Reset!';

  const subtitle =
    step === 'REQUEST'
      ? 'Enter your registered email address or NSU ID to receive an automated verification code.'
      : step === 'VERIFY'
        ? `Enter the 6-digit code sent to ${maskedEmail} along with your new password.`
        : 'Your password has been successfully changed. You can now access your account.';

  return (
    <FormPage maxWidth="narrow">
      <FormCard
        icon={icon}
        title={title}
        subtitle={subtitle}
        footer={
          step !== 'SUCCESS' ? (
            <Link href="/auth/student-signin" className={footerLinkClass}>
              Back to Sign In
            </Link>
          ) : undefined
        }
      >
        {message && <FormAlert tone={message.type === 'error' ? 'error' : 'success'}>{message.text}</FormAlert>}

        {step === 'REQUEST' && (
          <form onSubmit={handleRequestCode} noValidate>
            <FormSection label="Account" icon={<KeyRound size={14} />} columns={1}>
              <Input
                containerClassName={fieldClass}
                name="identifier"
                type="text"
                label="Email or NSU ID"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={loading}
              />
            </FormSection>

            <FormSubmit
              loading={loading}
              loadingText="Sending Code..."
              icon={<KeyRound size={18} />}
              disabled={!identifier}
            >
              Send Verification Code
            </FormSubmit>
          </form>
        )}

        {step === 'VERIFY' && (
          <form onSubmit={handleVerifyAndReset} noValidate>
            <FormSection label="Verification" icon={<ShieldCheck size={14} />} columns={1}>
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
              <Input
                containerClassName={fieldClass}
                name="newPassword"
                type="password"
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
              />
              <Input
                containerClassName={fieldClass}
                name="confirmPassword"
                type="password"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </FormSection>

            <FormSubmit
              loading={loading}
              loadingText="Resetting Password..."
              icon={<ShieldCheck size={18} />}
              disabled={!otp || !newPassword || !confirmPassword}
            >
              Reset Password
            </FormSubmit>

            <button
              type="button"
              onClick={() => {
                setStep('REQUEST');
                setMessage(null);
              }}
              disabled={loading}
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
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} /> Use a different email or NSU ID
            </button>
          </form>
        )}

        {step === 'SUCCESS' && (
          <div style={{ textAlign: 'center' }}>
            <Link href="/auth/student-signin" className={homeLinkClass}>
              Sign In Now
            </Link>
          </div>
        )}
      </FormCard>
    </FormPage>
  );
}
