'use client';

import { useState } from 'react';
import { updatePlatformSettings } from '@/app/actions/admin';
import { Input } from '@/components/ui/Input';
import { FormSubmit, FormAlert, FormCard, FormSection, fieldClass } from '@/components/forms';
import { format } from 'date-fns';
import { Percent, Wallet, Gift, MessageSquareText } from 'lucide-react';

type Settings = {
  id: string;
  withdrawalFeePercent: number;
  paymentFeePercent: number;
  promoDiscountPercent: number;
  consultancyFreeQuota: number;
  updatedAt: string;
};

export default function SettingsManager({ settings }: { settings: Settings }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError('');
    setSuccess('');
    const res = (await updatePlatformSettings(formData)) as { error?: string; success?: boolean };
    if (res?.error) setError(res.error);
    else setSuccess('Settings saved. New transactions use the updated rates.');
    setLoading(false);
  }

  // Live preview of effective student fee = paymentFee * (1 - promo/100).
  // Read from form on submit; for preview we approximate using current settings.
  const effectiveStudentFee = settings.paymentFeePercent * (1 - settings.promoDiscountPercent / 100);

  return (
    <FormCard
      surface="embedded"
      icon={<Percent size={28} />}
      title="Platform Fees & Quotas"
      subtitle={`Last updated ${format(new Date(settings.updatedAt), 'MMM d, yyyy h:mm a')}`}
    >
      {error && <FormAlert>{error}</FormAlert>}
      {success && <FormAlert tone="success">{success}</FormAlert>}

      <form action={handleSubmit} className="flex flex-col gap-5">
        <FormSection label="Tutor Withdrawal" icon={<Wallet size={14} />}>
          <Input
            containerClassName={fieldClass}
            name="withdrawalFeePercent"
            type="number"
            step="any"
            min="0"
            max="100"
            label="Withdrawal Fee (%)"
            defaultValue={settings.withdrawalFeePercent}
            required
          />
          <p className="text-xs text-muted" style={{ gridColumn: '1 / -1' }}>
            Deducted from each tutor withdrawal request. Default: 5%.
          </p>
        </FormSection>

        <FormSection label="Student Payment Fee" icon={<Percent size={14} />}>
          <Input
            containerClassName={fieldClass}
            name="paymentFeePercent"
            type="number"
            step="any"
            min="0"
            max="100"
            label="Payment Fee (%)"
            defaultValue={settings.paymentFeePercent}
            required
          />
          <Input
            containerClassName={fieldClass}
            name="promoDiscountPercent"
            type="number"
            step="any"
            min="0"
            max="100"
            label="Promo Discount on Fee (%)"
            defaultValue={settings.promoDiscountPercent}
            required
          />
          <p className="text-xs text-muted" style={{ gridColumn: '1 / -1' }}>
            <Gift size={12} className="inline mr-1" />
            Effective student fee:{' '}
            <strong>
              {effectiveStudentFee.toFixed(2)}% on top of tuition
            </strong>{' '}
            (paymentFee × (1 − promo)). Default: 10% × 50% promo = 5%.
          </p>
        </FormSection>

        <FormSection label="Consultancy" icon={<MessageSquareText size={14} />}>
          <Input
            containerClassName={fieldClass}
            name="consultancyFreeQuota"
            type="number"
            step="1"
            min="0"
            max="100"
            label="Free Sessions per Student"
            defaultValue={settings.consultancyFreeQuota}
            required
          />
          <p className="text-xs text-muted" style={{ gridColumn: '1 / -1' }}>
            Number of free (price = 0) consultancy sessions each student can claim. Paid topics are
            unaffected.
          </p>
        </FormSection>

        <FormSubmit loading={loading} loadingText="Saving..." icon={<Percent size={18} />}>
          Save Settings
        </FormSubmit>
      </form>
    </FormCard>
  );
}
