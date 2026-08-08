'use client';

import { useState, useTransition } from 'react';
import { Bookmark } from 'lucide-react';
import {
  saveListingAction,
  unsaveListingAction,
} from '@/app/(member)/shop/actions';
import styles from './SaveButton.module.css';

interface Props {
  listingId: string;
  initiallySaved: boolean;
}

export default function SaveButton({ listingId, initiallySaved }: Props) {
  const [saved, setSaved] = useState(initiallySaved);
  const [, startTransition] = useTransition();

  function toggle() {
    const fd = new FormData();
    fd.set('listingId', listingId);
    const next = !saved;
    setSaved(next); // optimistic
    startTransition(async () => {
      const res = next
        ? await saveListingAction(fd)
        : await unsaveListingAction(fd);
      if (!res.ok) setSaved(!next); // roll back on failure
    });
  }

  return (
    <button
      type='button'
      onClick={toggle}
      className={`${styles.btn} ${saved ? styles.saved : ''}`}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved' : 'Save this listing'}
    >
      <Bookmark size={14} aria-hidden='true' fill={saved ? 'currentColor' : 'none'} />
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}
