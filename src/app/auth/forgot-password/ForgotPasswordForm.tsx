'use client';

import { useState } from 'react';
import Link from 'next/link';
import { requestPasswordReset, verifyAndResetPassword } from '../actions/passwordReset';
import Spinner from '@/components/Spinner';
import { Input } from '@/components/ui/Input';
import { KeyRound, ShieldCheck, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordForm() {
  const [step, setStep] = useState<'REQUEST' | 'VERIFY' | 'SUCCESS'>('REQUEST');
  const [identifier, setIdentifier] = useState('');
  const [userId, setUserId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

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

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6 bg-gray-50/50 animate-fade-in">
      <div className="card w-full max-w-md p-8 sm:p-10 shadow-lg border-t-4 border-t-primary transition-all duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-light/50 text-primary mb-4 shadow-sm">
            {step === 'REQUEST' && <KeyRound size={24} />}
            {step === 'VERIFY' && <ShieldCheck size={24} className="text-primary animate-pulse" />}
            {step === 'SUCCESS' && <CheckCircle2 size={28} className="text-success" />}
          </div>
          <h2 className="text-2xl font-bold text-main">
            {step === 'REQUEST' && 'Forgot Password'}
            {step === 'VERIFY' && 'Verify & Reset'}
            {step === 'SUCCESS' && 'Password Reset!'}
          </h2>
          <p className="text-muted text-sm mt-2 px-2">
            {step === 'REQUEST' && 'Enter your registered email address or NSU ID to receive an automated verification code.'}
            {step === 'VERIFY' && `Enter the 6-digit code sent to ${maskedEmail} along with your new password.`}
            {step === 'SUCCESS' && 'Your password has been successfully changed. You can now access your account.'}
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg font-medium mb-6 text-sm text-center transition-all ${
            message.type === 'error' 
              ? 'bg-danger-light text-danger-hover border border-danger/20' 
              : 'bg-success-light text-success-hover border border-success/20'
          }`}>
            {message.text}
          </div>
        )}

        {step === 'REQUEST' && (
          <form onSubmit={handleRequestCode} className="flex flex-col gap-5">
            <Input
              name="identifier"
              type="text"
              label="Email or NSU ID"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              disabled={loading}
            />

            <button type="submit" className="btn bg-primary text-white hover:bg-primary-hover px-4 py-3 font-semibold rounded-lg transition-colors w-full flex items-center justify-center gap-2 mt-2 shadow-sm" disabled={loading || !identifier}>
              {loading ? <><Spinner size={18} /> Sending Code...</> : 'Send Verification Code'}
            </button>
          </form>
        )}

        {step === 'VERIFY' && (
          <form onSubmit={handleVerifyAndReset} className="flex flex-col gap-4 animate-fade-in">
            <Input
              name="otp"
              type="text"
              label="Verification Code"
              hint="6-digit code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required
              disabled={loading}
              className="text-center tracking-[0.4em] font-bold text-xl"
            />

            <Input
              name="newPassword"
              type="password"
              label="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={loading}
            />

            <Input
              name="confirmPassword"
              type="password"
              label="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />

            <div className="flex flex-col gap-3 mt-3">
              <button type="submit" className="btn bg-primary text-white hover:bg-primary-hover px-4 py-3 font-semibold rounded-lg transition-colors w-full flex items-center justify-center gap-2 shadow-sm" disabled={loading || !otp || !newPassword || !confirmPassword}>
                {loading ? <><Spinner size={18} /> Resetting Password...</> : 'Reset Password'}
              </button>

              <button 
                type="button" 
                onClick={() => { setStep('REQUEST'); setMessage(null); }}
                disabled={loading}
                className="text-muted hover:text-primary text-xs font-semibold py-2 transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeft size={14} /> Use a different email or NSU ID
              </button>
            </div>
          </form>
        )}

        {step === 'SUCCESS' && (
          <div className="flex flex-col gap-4 animate-fade-in text-center">
            <Link 
              href="/auth/student-signin" 
              className="btn bg-primary text-white hover:bg-primary-hover px-4 py-3 font-semibold rounded-lg transition-colors w-full flex items-center justify-center gap-2 shadow-sm"
            >
              Sign In Now
            </Link>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-color text-center flex flex-col gap-3 text-sm">
          <Link href="/auth/student-signin" className="text-primary hover:text-primary-hover font-semibold transition-colors">Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
