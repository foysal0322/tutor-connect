'use client';

import React from 'react';

/**
 * Shared bKash / Nagad / Rocket provider picker.
 *
 * Replaces three near-identical copy-pasted blocks in:
 *   - src/app/student/StudentRequestList.tsx (payment)
 *   - src/app/tutor/earnings/EarningsClient.tsx (withdrawal)
 *   - src/app/wallet/WalletClient.tsx (recharge)
 *
 * Brand colors are centralized here so a future redesign is one edit.
 * See FRONTEND_AUDIT.md E2.
 */

export type MfsProvider = 'BKASH' | 'NAGAD' | 'ROCKET';

export interface MfsProviderMeta {
  id: MfsProvider;
  label: string;
  /** Primary brand color, used for selected border + text. */
  brand: string;
  /** Soft brand tint, used for selected background. */
  brandSoft: string;
}

export const MFS_PROVIDERS: readonly MfsProviderMeta[] = [
  { id: 'BKASH', label: 'bKash', brand: '#d1417a', brandSoft: '#fdf2f7' },
  { id: 'NAGAD', label: 'Nagad', brand: '#f67221', brandSoft: '#fff7ed' },
  { id: 'ROCKET', label: 'Rocket', brand: '#8c2a8c', brandSoft: '#faf5ff' },
] as const;

/** Display name for a provider id, e.g. BKASH → "bKash" (for dynamic labels). */
export const MFS_LABEL: Record<MfsProvider, string> = {
  BKASH: 'bKash',
  NAGAD: 'Nagad',
  ROCKET: 'Rocket',
};

interface Props {
  value: MfsProvider | null;
  onChange: (provider: MfsProvider) => void;
  /** Optional id-prefix so multiple instances on one page don't collide. */
  idPrefix?: string;
}

export function MfsProviderSelect({ value, onChange, idPrefix = 'mfs' }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Mobile financial service provider"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}
    >
      {MFS_PROVIDERS.map((provider) => {
        const selected = value === provider.id;
        const btnId = `${idPrefix}-${provider.id}`;
        return (
          <button
            key={provider.id}
            id={btnId}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(provider.id)}
            style={{
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              border: selected ? `2px solid ${provider.brand}` : '1px solid var(--border-color)',
              background: selected ? provider.brandSoft : 'var(--card-bg)',
              color: selected ? provider.brand : 'var(--text-main)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: `border-color var(--duration-fast) var(--ease-standard), background var(--duration-fast) var(--ease-standard)`,
            }}
          >
            {provider.label}
          </button>
        );
      })}
    </div>
  );
}
