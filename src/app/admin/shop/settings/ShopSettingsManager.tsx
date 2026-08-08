'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import { Percent, Clock, Image as ImageIcon, Zap, Sliders, AlertCircle } from 'lucide-react';
import { FormCard, FormSection, FormSubmit, FormAlert, fieldClass } from '@/components/forms';
import { Input } from '@/components/ui/Input';
import Tabs from '@/components/ui/Tabs';
import { updateShopSettings } from './actions';

interface Settings {
  id: string;
  shopCommissionRateDefault: number;
  shopAutoFinalizeHours: number;
  shopDisputeWindowHours: number;
  shopListingMaxImages: number;
  shopBoostFeeBdt: number;
  shopBoostDays: number;
  shopModerationMode: string;
  shopMinPriceBdt: number;
  shopMaxPriceBdt: number;
  shopMaxActiveListingsPerSeller: number;
  updatedAt: string;
}

export default function ShopSettingsManager({ settings }: { settings: Settings }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [, startTransition] = useTransition();

  // Values are strings for input binding.
  const initial = {
    shopCommissionRateDefault: String(settings.shopCommissionRateDefault * 100),
    shopAutoFinalizeHours: String(settings.shopAutoFinalizeHours),
    shopDisputeWindowHours: String(settings.shopDisputeWindowHours),
    shopListingMaxImages: String(settings.shopListingMaxImages),
    shopBoostFeeBdt: String(settings.shopBoostFeeBdt),
    shopBoostDays: String(settings.shopBoostDays),
    shopModerationMode: settings.shopModerationMode,
    shopMinPriceBdt: String(settings.shopMinPriceBdt),
    shopMaxPriceBdt: String(settings.shopMaxPriceBdt),
    shopMaxActiveListingsPerSeller: String(settings.shopMaxActiveListingsPerSeller),
  };
  const [values, setValues] = useState(initial);
  const isDirty = Object.keys(initial).some((k) => values[k as keyof typeof values] !== initial[k as keyof typeof initial]);

  function set(key: keyof typeof values, val: string) {
    setValues((v) => ({ ...v, [key]: val }));
    if (success) setSuccess('');
    if (error) setError('');
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError('');
    setSuccess('');
    // Mirror current values into formData (the inputs use defaultValue).
    Object.entries(values).forEach(([k, v]) => formData.set(k, String(v)));
    startTransition(async () => {
      const res = await updateShopSettings(formData);
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
      } else {
        setSuccess('Shop settings saved. New transactions use the updated rates.');
      }
    });
  }

  const updatedAtLabel = format(new Date(settings.updatedAt), 'MMM d, yyyy h:mm a');

  const commission = parseFloat(values.shopCommissionRateDefault) / 100;

  const panels = {
    economics: (
      <FormSection label='Economics' icon={<Percent size={14} />}>
        <Input
          containerClassName={fieldClass}
          name='shopCommissionRateDefault'
          type='number'
          step='any'
          min='0'
          max='20'
          label='Default commission (%)'
          value={values.shopCommissionRateDefault}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            set('shopCommissionRateDefault', e.target.value)
          }
          required
          hint={`Effective rate: ${Number.isFinite(commission) ? (commission * 100).toFixed(1) + '%' : '—'}`}
        />
        <Input
          containerClassName={fieldClass}
          name='shopMinPriceBdt'
          type='number'
          step='any'
          min='0'
          label='Minimum listing price (BDT)'
          value={values.shopMinPriceBdt}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            set('shopMinPriceBdt', e.target.value)
          }
          required
        />
        <Input
          containerClassName={fieldClass}
          name='shopMaxPriceBdt'
          type='number'
          step='any'
          min='1'
          label='Maximum listing price (BDT)'
          value={values.shopMaxPriceBdt}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            set('shopMaxPriceBdt', e.target.value)
          }
          required
          hint='AML guardrail. Admins can raise per request.'
        />
      </FormSection>
    ),
    lifecycle: (
      <FormSection label='Order lifecycle' icon={<Clock size={14} />}>
        <Input
          containerClassName={fieldClass}
          name='shopAutoFinalizeHours'
          type='number'
          min='1'
          max='720'
          label='Auto-finalize window (hours)'
          value={values.shopAutoFinalizeHours}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            set('shopAutoFinalizeHours', e.target.value)
          }
          required
          hint='Time after delivery before the order auto-completes and pays the seller.'
        />
        <Input
          containerClassName={fieldClass}
          name='shopDisputeWindowHours'
          type='number'
          min='1'
          max='720'
          label='Dispute window (hours)'
          value={values.shopDisputeWindowHours}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            set('shopDisputeWindowHours', e.target.value)
          }
          required
          hint='Time after delivery during which the buyer can open a dispute.'
        />
        <Input
          containerClassName={fieldClass}
          name='shopMaxActiveListingsPerSeller'
          type='number'
          min='1'
          max='1000'
          label='Max active listings per seller'
          value={values.shopMaxActiveListingsPerSeller}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            set('shopMaxActiveListingsPerSeller', e.target.value)
          }
          required
        />
        <label className={fieldClass} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
            Moderation mode
          </span>
          <select
            name='shopModerationMode'
            value={values.shopModerationMode}
            onChange={(e) => set('shopModerationMode', e.target.value)}
            className={fieldClass}
            style={{ padding: '0.55rem 0.65rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-color)', color: 'var(--text-main)', font: 'inherit', fontSize: 'var(--text-sm)' }}
          >
            <option value='AUTO'>AUTO — listings go live immediately; moderation is reactive</option>
            <option value='MANUAL'>MANUAL — listings await admin approval</option>
          </select>
        </label>
      </FormSection>
    ),
    media: (
      <FormSection label='Media' icon={<ImageIcon size={14} />}>
        <Input
          containerClassName={fieldClass}
          name='shopListingMaxImages'
          type='number'
          min='1'
          max='20'
          label='Max images per listing'
          value={values.shopListingMaxImages}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            set('shopListingMaxImages', e.target.value)
          }
          required
        />
      </FormSection>
    ),
    boost: (
      <FormSection label='Boost (optional visibility)' icon={<Zap size={14} />}>
        <Input
          containerClassName={fieldClass}
          name='shopBoostFeeBdt'
          type='number'
          step='any'
          min='0'
          label='Boost fee (BDT)'
          value={values.shopBoostFeeBdt}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            set('shopBoostFeeBdt', e.target.value)
          }
          required
          hint='Flat fee a seller pays to pin a listing for the boost duration.'
        />
        <Input
          containerClassName={fieldClass}
          name='shopBoostDays'
          type='number'
          min='1'
          max='90'
          label='Boost duration (days)'
          value={values.shopBoostDays}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            set('shopBoostDays', e.target.value)
          }
          required
        />
      </FormSection>
    ),
  };

  return (
    <FormCard
      surface='embedded'
      icon={<Sliders size={28} />}
      title='Shop configuration'
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
              onClick={() => {
                setValues(initial);
                setError('');
                setSuccess('');
              }}
              className='text-xs font-semibold text-muted hover:text-main transition-colors'
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Revert
            </button>
          )}
        </div>

        <Tabs
          tabs={[
            { id: 'economics', label: 'Economics' },
            { id: 'lifecycle', label: 'Lifecycle' },
            { id: 'media', label: 'Media' },
            { id: 'boost', label: 'Boost' },
          ]}
          panels={panels}
        />

        <FormSubmit loading={loading} loadingText='Saving...' icon={<Percent size={18} />}>
          Save settings
        </FormSubmit>
      </form>
    </FormCard>
  );
}
