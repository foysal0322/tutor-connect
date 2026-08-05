import { describe, it, expect } from 'vitest';
import {
  filterChannelsByPreference,
  isCategoryLocked,
  MUTABLE_CHANNELS,
  PREFERENCE_CHANNELS,
  type PreferenceRow,
} from '../preferences';

// Unit tests for the preferences resolver's pure filter. These cover the
// critical bypass rules (blueprint §XVI #10) which must NEVER regress:
//
//   - CRITICAL priority events always deliver
//   - AUTH and SECURITY categories always deliver
//   - IN_APP is never muted (it's the audit surface)
//   - EMAIL and PUSH are the user-mutable channels
//
// A regression here could silently suppress security notifications, which
// is the one outcome this system must prevent.

const IN_APP = 'IN_APP' as const;
const EMAIL = 'EMAIL' as const;
const PUSH = 'PUSH' as const;
const DISCORD = 'DISCORD' as const;

const allChannels = [IN_APP, EMAIL, PUSH];

const row = (overrides: Partial<PreferenceRow> = {}): PreferenceRow => ({
  category: 'PAYMENT',
  channelInApp: true,
  channelEmail: true,
  channelPush: true,
  ...overrides,
});

describe('filterChannelsByPreference — bypass rules', () => {
  it('returns every requested channel when priority is CRITICAL', () => {
    // User muted every mutable channel — CRITICAL must override.
    const mutedRow = row({ channelEmail: false, channelPush: false });
    const result = filterChannelsByPreference({
      category: 'PAYMENT',
      priority: 'CRITICAL',
      requested: allChannels,
      row: mutedRow,
    });
    expect(result).toEqual(allChannels);
  });

  it('returns every requested channel for AUTH category regardless of stored preferences', () => {
    const mutedRow = row({
      category: 'AUTH',
      channelEmail: false,
      channelPush: false,
    });
    const result = filterChannelsByPreference({
      category: 'AUTH',
      priority: 'MEDIUM',
      requested: allChannels,
      row: mutedRow,
    });
    expect(result).toEqual(allChannels);
  });

  it('returns every requested channel for SECURITY category regardless of stored preferences', () => {
    const mutedRow = row({
      category: 'SECURITY',
      channelEmail: false,
      channelPush: false,
    });
    const result = filterChannelsByPreference({
      category: 'SECURITY',
      priority: 'HIGH',
      requested: allChannels,
      row: mutedRow,
    });
    expect(result).toEqual(allChannels);
  });

  it('honors CRITICAL bypass even over AUTH category (belt and suspenders)', () => {
    const result = filterChannelsByPreference({
      category: 'AUTH',
      priority: 'CRITICAL',
      requested: allChannels,
      row: row({ channelEmail: false, channelPush: false, category: 'AUTH' }),
    });
    expect(result).toEqual(allChannels);
  });
});

describe('filterChannelsByPreference — default state', () => {
  it('returns every channel when no preference row exists', () => {
    const result = filterChannelsByPreference({
      category: 'PAYMENT',
      priority: 'MEDIUM',
      requested: allChannels,
      row: undefined,
    });
    expect(result).toEqual(allChannels);
  });

  it('returns every channel when the row has all flags true', () => {
    const result = filterChannelsByPreference({
      category: 'PAYMENT',
      priority: 'MEDIUM',
      requested: allChannels,
      row: row(),
    });
    expect(result).toEqual(allChannels);
  });
});

describe('filterChannelsByPreference — muting', () => {
  it('removes only EMAIL when channelEmail is false', () => {
    const result = filterChannelsByPreference({
      category: 'PAYMENT',
      priority: 'MEDIUM',
      requested: allChannels,
      row: row({ channelEmail: false }),
    });
    expect(result).toEqual([IN_APP, PUSH]);
  });

  it('removes only PUSH when channelPush is false', () => {
    const result = filterChannelsByPreference({
      category: 'BOOKING',
      priority: 'LOW',
      requested: allChannels,
      row: row({ category: 'BOOKING', channelPush: false }),
    });
    expect(result).toEqual([IN_APP, EMAIL]);
  });

  it('removes both EMAIL and PUSH when both are false (audit-only row)', () => {
    const result = filterChannelsByPreference({
      category: 'SYSTEM',
      priority: 'LOW',
      requested: allChannels,
      row: row({ category: 'SYSTEM', channelEmail: false, channelPush: false }),
    });
    expect(result).toEqual([IN_APP]);
  });

  it('NEVER removes IN_APP even when channelInApp is false on the row', () => {
    // The schema column exists for forward-compat but the resolver treats
    // IN_APP as non-mutable. This is the contract that protects the audit
    // surface — verifying it explicitly so a future refactor doesn't break it.
    const result = filterChannelsByPreference({
      category: 'PAYMENT',
      priority: 'MEDIUM',
      requested: allChannels,
      row: row({ channelInApp: false, channelEmail: false, channelPush: false }),
    });
    expect(result).toEqual([IN_APP]);
  });
});

describe('filterChannelsByPreference — unknown channels', () => {
  it('keeps DISCORD (and any unknown channel) — never user-mutable', () => {
    const result = filterChannelsByPreference({
      category: 'PAYMENT',
      priority: 'MEDIUM',
      requested: [IN_APP, EMAIL, PUSH, DISCORD],
      row: row({ channelEmail: false, channelPush: false }),
    });
    // DISCORD is the admin/ops channel; user prefs must not suppress it.
    expect(result).toEqual([IN_APP, DISCORD]);
  });
});

describe('preferences module exports', () => {
  it('excludes IN_APP from MUTABLE_CHANNELS', () => {
    expect(MUTABLE_CHANNELS).toEqual(['EMAIL', 'PUSH']);
    expect(MUTABLE_CHANNELS).not.toContain('IN_APP');
  });

  it('includes IN_APP in PREFERENCE_CHANNELS (rendered as read-only)', () => {
    expect(PREFERENCE_CHANNELS).toContain('IN_APP');
    expect(PREFERENCE_CHANNELS).toContain('EMAIL');
    expect(PREFERENCE_CHANNELS).toContain('PUSH');
  });

  it('marks AUTH and SECURITY as locked', () => {
    expect(isCategoryLocked('AUTH')).toBe(true);
    expect(isCategoryLocked('SECURITY')).toBe(true);
  });

  it('does not lock any non-security category', () => {
    for (const category of [
      'PAYMENT',
      'BOOKING',
      'WALLET',
      'WITHDRAWAL',
      'REFUND',
      'CONSULTANCY',
      'SUPPORT',
      'SYSTEM',
      'TUTOR_REQUEST',
      'COURSE',
    ]) {
      expect(isCategoryLocked(category)).toBe(false);
    }
  });
});
