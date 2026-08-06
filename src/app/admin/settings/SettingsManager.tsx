'use client';

import { useMemo, useState } from 'react';
import { updatePlatformSettings } from '@/app/actions/admin';
import { Input } from '@/components/ui/Input';
import Tabs from '@/components/ui/Tabs';
import { FormSubmit, FormAlert, FormCard, FormSection, fieldClass } from '@/components/forms';
import { format } from 'date-fns';
import { Percent, Wallet, Gift, MessageSquareText, Sliders, AlertCircle } from 'lucide-react';

type Settings = {
  id: string;
  withdrawalFeePercent: number;
  paymentFeePercent: number;
  promoDiscountPercent: number;
  consultancyFreeQuota: number;
  consultancyPaidSessionPrice: number;
  updatedAt: string;
};

type FieldKey =
  | 'withdrawalFeePercent'
  | 'paymentFeePercent'
  | 'promoDiscountPercent'
  | 'consultancyFreeQuota'
  | 'consultancyPaidSessionPrice';

const NUMERIC_FIELDS: FieldKey[] = [
  'withdrawalFeePercent',
  'paymentFeePercent',
  'promoDiscountPercent',
  'consultancyFreeQuota',
  'consultancyPaidSessionPrice',
];

export default function SettingsManager({ settings }: { settings: Settings }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const initial = useMemo(
    () => ({
      withdrawalFeePercent: String(settings.withdrawalFeePercent),
      paymentFeePercent: String(settings.paymentFeePercent),
      promoDiscountPercent: String(settings.promoDiscountPercent),
      consultancyFreeQuota: String(settings.consultancyFreeQuota),
      consultancyPaidSessionPrice: String(settings.consultancyPaidSessionPrice),
    }),
    [settings],
  );

  const [values, setValues] = useState(initial);

  const isDirty = NUMERIC_FIELDS.some((k) => values[k] !== initial[k]);

  // Live preview of effective student fee = paymentFee * (1 - promo/100).
  const paymentFee = parseFloat(values.paymentFeePercent);
  const promo = parseFloat(values.promoDiscountPercent);
  const effectiveStudentFee =
    Number.isFinite(paymentFee) && Number.isFinite(promo)
      ? paymentFee * (1 - promo / 100)
      : Number.NaN;

  function handleChange(field: FieldKey, raw: string) {
    setValues((v) => ({ ...v, [field]: raw }));
    if (success) setSuccess('');
    if (error) setError('');
  }

  function resetDirty() {
    setValues(initial);
    setError('');
    setSuccess('');
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError('');
    setSuccess('');
    const res = (await updatePlatformSettings(formData)) as { error?: string; success?: boolean };
    if (res?.error) setError(res.error);
    else {
      setSuccess('Settings saved. New transactions use the updated rates.');
      // Sync local state to whatever was submitted (form fields are the source
      // of truth here — they are still uncontrolled via defaultValue for the
      // actual form submission, but we mirror them as the new clean baseline).
      setValues({
        withdrawalFeePercent: (formData.get('withdrawalFeePercent') as string) || initial.withdrawalFeePercent,
        paymentFeePercent: (formData.get('paymentFeePercent') as string) || initial.paymentFeePercent,
        promoDiscountPercent: (formData.get('promoDiscountPercent') as string) || initial.promoDiscountPercent,
        consultancyFreeQuota: (formData.get('consultancyFreeQuota') as string) || initial.consultancyFreeQuota,
        consultancyPaidSessionPrice:
          (formData.get('consultancyPaidSessionPrice') as string) || initial.consultancyPaidSessionPrice,
      });
    }
    setLoading(false);
  }

  const updatedAtLabel = format(new Date(settings.updatedAt), 'MMM d, yyyy h:mm a');

  const panels = {
    withdrawal: (
      <FormSection label='Tutor Withdrawal' icon={<Wallet size={14} />}>
        <Input
          containerClassName={fieldClass}
          name='withdrawalFeePercent'
          type='number'
          step='any'
          min='0'
          max='100'
          label='Withdrawal Fee (%)'
          value={values.withdrawalFeePercent}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            handleChange('withdrawalFeePercent', e.target.value)
          }
          required
        />
        <p className='text-xs text-muted' style={{ gridColumn: '1 / -1' }}>
          Deducted from each tutor withdrawal request. Default: 5%.
        </p>
      </FormSection>
    ),
    payment: (
      <FormSection label='Student Payment Fee' icon={<Percent size={14} />}>
        <Input
          containerClassName={fieldClass}
          name='paymentFeePercent'
          type='number'
          step='any'
          min='0'
          max='100'
          label='Payment Fee (%)'
          value={values.paymentFeePercent}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            handleChange('paymentFeePercent', e.target.value)
          }
          required
        />
        <Input
          containerClassName={fieldClass}
          name='promoDiscountPercent'
          type='number'
          step='any'
          min='0'
          max='100'
          label='Promo Discount on Fee (%)'
          value={values.promoDiscountPercent}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            handleChange('promoDiscountPercent', e.target.value)
          }
          required
        />
        <p className='text-xs text-muted' style={{ gridColumn: '1 / -1' }}>
          <Gift size={12} className='inline mr-1' />
          Effective student fee:{' '}
          <strong>
            {Number.isFinite(effectiveStudentFee)
              ? `${effectiveStudentFee.toFixed(2)}% on top of tuition`
              : '—'}
          </strong>{' '}
          (paymentFee × (1 − promo)). Default: 10% × 50% promo = 5%.
        </p>
      </FormSection>
    ),
    consultancy: (
      <FormSection label='Consultancy' icon={<MessageSquareText size={14} />}>
        <Input
          containerClassName={fieldClass}
          name='consultancyFreeQuota'
          type='number'
          step='1'
          min='0'
          max='100'
          label='Free Sessions per Student'
          value={values.consultancyFreeQuota}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            handleChange('consultancyFreeQuota', e.target.value)
          }
          required
        />
        <Input
          containerClassName={fieldClass}
          name='consultancyPaidSessionPrice'
          type='number'
          step='any'
          min='0'
          max='100000'
          label='Paid Session Price (BDT)'
          hint='Charged from the student wallet once the free quota is used up. A topic with its own explicit price still overrides this.'
          value={values.consultancyPaidSessionPrice}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            handleChange('consultancyPaidSessionPrice', e.target.value)
          }
          required
        />
        <p className='text-xs text-muted' style={{ gridColumn: '1 / -1' }}>
          Each student&apos;s first <em>N</em> sessions are free (counting all past bookings). After that,
          every session costs the price above — debited from the student&apos;s Campus Wallet at booking.
        </p>
      </FormSection>
    ),
    advanced: (
      <FormSection label='Live Preview & Audit' icon={<Sliders size={14} />}>
        <div
          className='flex flex-col gap-3'
          style={{ gridColumn: '1 / -1' }}
        >
          <div
            style={{
              padding: '0.875rem 1rem',
              border: '1px solid var(--border-color)',
              borderRadius: '0.75rem',
              background: 'var(--surface-2)',
            }}
          >
            <div className='text-xs text-muted' style={{ marginBottom: '0.25rem' }}>
              Effective student fee (live)
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {Number.isFinite(effectiveStudentFee)
                ? `${effectiveStudentFee.toFixed(2)}%`
                : '—'}
            </div>
            <div className='text-xs text-muted' style={{ marginTop: '0.25rem' }}>
              = paymentFee ({values.paymentFeePercent || '0'}%) × (1 − promo ({values.promoDiscountPercent || '0'}%))
            </div>
          </div>
          <div className='text-xs text-muted'>
            <strong>Last updated:</strong> {updatedAtLabel}
          </div>
          <div className='text-xs text-muted'>
            <strong>Record ID:</strong> <code>{settings.id}</code>
          </div>
        </div>
      </FormSection>
    ),
  };

  return (
    <FormCard
      surface='embedded'
      icon={<Percent size={28} />}
      title='Platform Fees & Quotas'
      subtitle={`Last updated ${updatedAtLabel}`}
    >
      {error && <FormAlert>{error}</FormAlert>}
      {success && <FormAlert tone='success'>{success}</FormAlert>}

      <form action={handleSubmit} className='flex flex-col gap-5'>
        <div className='flex items-center justify-between gap-3 flex-wrap'>
          {isDirty ? (
            <span
              className='inline-flex items-center gap-1.5 text-xs font-semibold'
              style={{
                padding: '0.3rem 0.7rem',
                borderRadius: '999px',
                background: 'var(--warning-bg, #fff7ed)',
                color: 'var(--warning-text, #b45309)',
                border: '1px solid var(--warning-border, #fdba74)',
              }}
              role='status'
            >
              <AlertCircle size={12} /> Unsaved changes
            </span>
          ) : (
            <span
              className='inline-flex items-center gap-1.5 text-xs font-semibold text-muted'
              style={{
                padding: '0.3rem 0.7rem',
                borderRadius: '999px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-color)',
              }}
            >
              All changes saved
            </span>
          )}
          {isDirty && (
            <button
              type='button'
              onClick={resetDirty}
              className='text-xs font-semibold text-muted hover:text-main transition-colors'
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Revert
            </button>
          )}
        </div>

        <Tabs
          tabs={[
            { id: 'withdrawal', label: 'Withdrawal' },
            { id: 'payment', label: 'Payment' },
            { id: 'consultancy', label: 'Consultancy' },
            { id: 'advanced', label: 'Advanced' },
          ]}
          panels={panels}
        />

        <FormSubmit loading={loading} loadingText='Saving...' icon={<Percent size={18} />}>
          Save Settings
        </FormSubmit>
      </form>
    </FormCard>
  );
}
