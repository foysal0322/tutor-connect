'use client';

import { useState } from 'react';
import styles from './PreferencesMatrix.module.css';
import { ShieldCheck, Save, RotateCcw, CheckCircle2 } from 'lucide-react';

export type CategoryPreference = {
  category: string;
  locked: boolean;
  channelInApp: boolean;
  channelEmail: boolean;
  channelPush: boolean;
};

interface Props {
  initialCategories: CategoryPreference[];
}

// Friendly labels + one-line descriptions per category. The category string
// is what's stored; the label is what the user sees.
const CATEGORY_META: Record<string, { label: string; hint: string }> = {
  TUTOR_REQUEST: { label: 'Tutor Requests', hint: 'New requests, allocations, and cancellations' },
  BOOKING: { label: 'Sessions', hint: 'Session completion and reviews' },
  PAYMENT: { label: 'Payments', hint: 'Payment submission, verification, and rejection' },
  WALLET: { label: 'Wallet', hint: 'Credits, debits, and admin adjustments' },
  WITHDRAWAL: { label: 'Withdrawals', hint: 'Withdrawal submission and approval status' },
  REFUND: { label: 'Refunds', hint: 'Refund submission, approval, and rejection' },
  CONSULTANCY: { label: 'Consultancy', hint: 'Bookings and status changes' },
  SUPPORT: { label: 'Support Tickets', hint: 'Ticket submissions and resolutions' },
  COURSE: { label: 'Courses & Expertise', hint: 'Admin edits to your tutor expertise' },
  SYSTEM: { label: 'System', hint: 'Platform-wide announcements and receipts' },
  AUTH: { label: 'Account & Login', hint: 'Role changes — always on for security' },
  SECURITY: { label: 'Security', hint: 'Block/unblock and access changes — always on' },
};

const CHANNEL_LABELS: Record<string, string> = {
  IN_APP: 'In-App',
  EMAIL: 'Email',
  PUSH: 'Push',
};

export default function PreferencesMatrix({ initialCategories }: Props) {
  const [categories, setCategories] = useState<CategoryPreference[]>(initialCategories);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = (category: string, channel: 'channelEmail' | 'channelPush') => {
    setCategories((cur) =>
      cur.map((c) =>
        c.category === category && !c.locked
          ? { ...c, [channel]: !c[channel] }
          : c,
      ),
    );
    setDirty(true);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const preferences = categories
        .filter((c) => !c.locked)
        .map((c) => ({
          category: c.category,
          channelEmail: c.channelEmail,
          channelPush: c.channelPush,
        }));
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      if (!data.success) throw new Error('Save failed');
      setDirty(false);
      setSavedAt(new Date());
    } catch (e) {
      console.error('Failed to save preferences', e);
      setError('Could not save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setCategories(initialCategories);
    setDirty(false);
    setError(null);
  };

  return (
    <div className={styles.container}>
      {/* Explanatory banner */}
      <div className={styles.banner} role='note'>
        <ShieldCheck size={18} aria-hidden='true' />
        <div>
          <strong>Critical events always deliver.</strong> Auth and Security
          categories are locked because muting them could hide account-block
          and role-change alerts. Every other category is yours to tune.
        </div>
      </div>

      {/* Matrix header */}
      <div
        className={styles.matrixWrapper}
        role='group'
        aria-label='Notification preference matrix'
      >
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope='col' className={styles.categoryHeader}>
                Category
              </th>
              <th scope='col' className={styles.channelHeader}>
                {CHANNEL_LABELS.IN_APP}
                <span className={styles.channelHint}>always on</span>
              </th>
              <th scope='col' className={styles.channelHeader}>
                {CHANNEL_LABELS.EMAIL}
              </th>
              <th scope='col' className={styles.channelHeader}>
                {CHANNEL_LABELS.PUSH}
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => {
              const meta = CATEGORY_META[c.category] ?? {
                label: c.category,
                hint: '',
              };
              return (
                <tr key={c.category} className={c.locked ? styles.rowLocked : ''}>
                  <th scope='row' className={styles.categoryCell}>
                    <div className={styles.categoryLabel}>
                      {meta.label}
                      {c.locked && (
                        <span className={styles.lockBadge} title='Always on — security'>
                          <ShieldCheck size={12} aria-hidden='true' /> locked
                        </span>
                      )}
                    </div>
                    {meta.hint && <div className={styles.categoryHint}>{meta.hint}</div>}
                  </th>
                  <td className={styles.toggleCell}>
                    {/* IN_APP is always on; rendered as a disabled-on toggle
                        so the column reads consistently across rows. */}
                    <ToggleSwitch
                      checked
                      disabled
                      ariaLabel={`${meta.label} in-app (always on)`}
                    />
                  </td>
                  <td className={styles.toggleCell}>
                    <ToggleSwitch
                      checked={c.channelEmail}
                      disabled={c.locked}
                      onChange={() => toggle(c.category, 'channelEmail')}
                      ariaLabel={`${meta.label} email`}
                    />
                  </td>
                  <td className={styles.toggleCell}>
                    <ToggleSwitch
                      checked={c.channelPush}
                      disabled={c.locked}
                      onChange={() => toggle(c.category, 'channelPush')}
                      ariaLabel={`${meta.label} push`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action bar */}
      <div className={styles.actions}>
        <div className={styles.status} aria-live='polite'>
          {error && (
            <span className={styles.errorText} role='alert'>
              {error}
            </span>
          )}
          {!error && savedAt && !dirty && (
            <span className={styles.savedText}>
              <CheckCircle2 size={14} aria-hidden='true' /> Saved
            </span>
          )}
          {!error && !savedAt && dirty && (
            <span className={styles.dirtyText}>Unsaved changes</span>
          )}
        </div>
        <div className={styles.buttons}>
          <button
            type='button'
            className={styles.resetButton}
            onClick={reset}
            disabled={!dirty || saving}
          >
            <RotateCcw size={14} aria-hidden='true' /> Reset
          </button>
          <button
            type='button'
            className={styles.saveButton}
            onClick={save}
            disabled={!dirty || saving}
            aria-busy={saving}
          >
            <Save size={14} aria-hidden='true' /> {saving ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toggle switch ──────────────────────────────────────────────────────
// Custom switch built on a real checkbox so keyboard + screen-reader users
// get the native semantics for free. focus-visible ring is enforced in CSS.

interface ToggleSwitchProps {
  checked: boolean;
  disabled?: boolean;
  onChange?: () => void;
  ariaLabel: string;
}

function ToggleSwitch({ checked, disabled, onChange, ariaLabel }: ToggleSwitchProps) {
  return (
    <label className={`${styles.switch} ${disabled ? styles.switchDisabled : ''}`}>
      <input
        type='checkbox'
        className={styles.switchInput}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={ariaLabel}
      />
      <span
        className={`${styles.switchTrack} ${checked ? styles.switchTrackOn : ''}`}
        aria-hidden='true'
      >
        <span className={`${styles.switchThumb} ${checked ? styles.switchThumbOn : ''}`} />
      </span>
    </label>
  );
}
